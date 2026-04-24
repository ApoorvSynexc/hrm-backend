import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import { RegularizationRepository } from './repositories/index.js';
import { ApprovalEngineService } from '../approval-workflow/approval-engine.service.js';
import { CreateRegularizationDto } from './dto/index.js';
import { ProcessStepDto } from '../approval-workflow/dto/index.js';

@Injectable()
export class RegularizationService {
  constructor(
    private regularizationRepository: RegularizationRepository,
    private approvalEngineService: ApprovalEngineService,
    private prisma: PrismaService,
  ) {}

  /**
   * Create a new regularization request and start its approval workflow.
   */
  async create(tenantId: string, userId: string, dto: CreateRegularizationDto) {
    const date = new Date(dto.date);

    const existing = await this.regularizationRepository.find({
      tenantId,
      userId,
      date: {
        gte: new Date(date.toDateString()),
        lt: new Date(new Date(date).getTime() + 86400000),
      },
      status: 'PENDING',
    });

    if (existing) {
      throw new BadRequestException(
        'Pending regularization request already exists for this date',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const regularization = await this.regularizationRepository.create(
        {
          tenantId,
          userId,
          date,
          requestedCheckIn: dto.requestedCheckIn ? new Date(dto.requestedCheckIn) : null,
          requestedCheckOut: dto.requestedCheckOut ? new Date(dto.requestedCheckOut) : null,
          reason: dto.reason,
          status: 'PENDING',
        },
        tx as any,
      );

      const instanceId = await this.approvalEngineService.startInstance(
        tenantId,
        'REGULARIZATION',
        regularization.id,
        userId,
        tx,
      );

      if (instanceId) {
        await (tx as any).attendanceRegularization.update({
          where: { id: regularization.id },
          data: { approvalInstanceId: instanceId },
        });
        return { ...regularization, approvalInstanceId: instanceId };
      }

      return regularization;
    });
  }

  /**
   * Get the current user's own regularization requests.
   */
  async getMyRegularizations(tenantId: string, userId: string) {
    const result = await this.regularizationRepository.findAll(
      { tenantId, userId },
      { pagination: false },
      {
        approvalInstance: {
          select: {
            id: true,
            status: true,
            currentStep: true,
            stepInstances: {
              orderBy: { stepNumber: 'asc' as const },
              select: {
                stepNumber: true,
                status: true,
                reviewedAt: true,
                comment: true,
                rejectionReason: true,
                approver: {
                  select: { id: true, firstName: true, lastName: true },
                },
              },
            },
          },
        },
      },
    );
    return result.data;
  }

  /**
   * Get all regularization requests for the RM's direct reports.
   */
  async getTeamRegularizations(
    tenantId: string,
    managerId: string,
    options?: { limit?: number; page?: number },
  ) {
    const teamMembers = await this.prisma.user.findMany({
      where: { tenantId, reportingManagerId: managerId, status: { not: 'DELETED' } } as any,
      select: { id: true },
    });

    if (teamMembers.length === 0) {
      return { data: [], meta: { totalRecords: 0, totalPages: 0, page: 1, limit: 10 } };
    }

    const userIds = teamMembers.map((u) => u.id);

    return this.regularizationRepository.findAll(
      { tenantId, userId: { in: userIds } },
      {
        pagination: true,
        limit: options?.limit || 10,
        page: options?.page || 1,
      },
      {
        approvalInstance: {
          select: {
            id: true,
            status: true,
            currentStep: true,
            stepInstances: {
              orderBy: { stepNumber: 'asc' as const },
              select: {
                stepNumber: true,
                status: true,
                reviewedAt: true,
                approverId: true,
              },
            },
          },
        },
      },
    );
  }

  /**
   * Get all regularization requests for the tenant (ADMIN / HR only).
   */
  async getAllRegularizations(tenantId: string, options?: { limit?: number; page?: number }) {
    return this.regularizationRepository.findAll(
      { tenantId },
      {
        pagination: true,
        limit: options?.limit || 10,
        page: options?.page || 1,
      },
      { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
    );
  }

  /**
   * Get a single regularization request by ID with ownership check.
   */
  async getById(tenantId: string, id: string, callerId?: string, callerRole?: string) {
    const record = await this.regularizationRepository.find(
      { tenantId, id },
      {
        approvalInstance: {
          include: {
            stepInstances: {
              orderBy: { stepNumber: 'asc' as const },
              include: {
                step: { include: { approverRole: { select: { id: true, name: true } } } },
                approver: { select: { id: true, firstName: true, lastName: true, email: true } },
              },
            },
          },
        },
      },
    );

    if (!record) throw new NotFoundException('Regularization request not found');

    // Employees can only see their own
    if (callerRole === 'EMPLOYEE' && record.userId !== callerId) {
      throw new ForbiddenException('Access denied');
    }

    return record;
  }

  /**
   * Process an approval step (approve or reject).
   * Delegates entirely to the engine which validates the approver and advances state.
   */
  async review(
    tenantId: string,
    caller: { userId: string },
    regularizationId: string,
    dto: ProcessStepDto,
  ) {
    const { outcome } = await this.approvalEngineService.processStep(
      tenantId,
      regularizationId,
      caller,
      dto,
    );

    if (outcome !== 'IN_PROGRESS') {
      await this.regularizationRepository.update(
        { id: regularizationId },
        {
          status: outcome,
          reviewedByUserId: caller.userId,
          reviewedAt: new Date(),
          ...(outcome === 'REJECTED' && dto.rejectionReason
            ? { rejectionReason: dto.rejectionReason }
            : {}),
        },
      );
    }

    return this.getById(tenantId, regularizationId);
  }

  /**
   * Admin force-approve or force-reject the current pending step.
   * Bypasses all approver validation — use only when a step is stuck.
   */
  async forceReview(
    tenantId: string,
    adminUserId: string,
    regularizationId: string,
    dto: { action: 'APPROVED' | 'REJECTED'; reason?: string },
  ) {
    const { outcome } = await this.approvalEngineService.forceAdvanceStep(
      tenantId,
      regularizationId,
      adminUserId,
      dto,
    );

    if (outcome !== 'IN_PROGRESS') {
      await this.regularizationRepository.update(
        { id: regularizationId },
        {
          status: outcome,
          reviewedByUserId: adminUserId,
          reviewedAt: new Date(),
          ...(outcome === 'REJECTED' && dto.reason ? { rejectionReason: dto.reason } : {}),
        },
      );
    }

    return this.getById(tenantId, regularizationId);
  }

  /**
   * Cancel a regularization request (employee self-cancel, PENDING only).
   */
  async cancel(tenantId: string, userId: string, id: string) {
    const record = await this.regularizationRepository.find({ tenantId, id, userId });
    if (!record) throw new NotFoundException('Regularization request not found');
    if (record.status !== 'PENDING') {
      throw new BadRequestException('Only pending requests can be cancelled');
    }
    return this.regularizationRepository.update(
      { id },
      { status: 'CANCELLED' },
    );
  }
}
