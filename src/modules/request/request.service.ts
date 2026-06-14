import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import { RequestRepository } from './repositories/request.repository.js';
import { ApprovalEngineService } from '../approval-workflow/approval-engine.service.js';
import { ProcessRequestDto } from './dto/process-request.dto.js';

@Injectable()
export class RequestService {
  constructor(
    private requestRepository: RequestRepository,
    private approvalEngineService: ApprovalEngineService,
    private prisma: PrismaService,
  ) {}

  /**
   * Get requests based on user role
   * - RM: only PENDING steps assigned to them
   * - HR: only PENDING steps assigned to them
   * - ADMIN: all requests
   * - EMPLOYEE: only their own
   */
  async getRequests(
    tenantId: string,
    userId: string,
    role: string,
    options: {
      limit: number;
      page: number;
      module?: string;
      status?: string;
    },
  ) {
    if (role === 'RM') {
      return this.requestRepository.getRequestsForRM(tenantId, userId, options);
    }

    if (role === 'HR') {
      return this.requestRepository.getRequestsForHR(tenantId, userId, options);
    }

    if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
      return this.requestRepository.getAllRequests(tenantId, options);
    }

    if (role === 'EMPLOYEE') {
      return this.requestRepository.getRequestsForEmployee(tenantId, userId, options);
    }

    throw new ForbiddenException('Invalid role');
  }

  /**
   * Get single request by ID with full approval trail
   */
  async getRequestById(
    tenantId: string,
    requestId: string,
    userId: string,
    role: string,
  ) {
    const request = await this.requestRepository.findRequestById(requestId);

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    if (request.tenantId !== tenantId) {
      throw new ForbiddenException('Access denied');
    }

    // Employees can only see their own
    if (role === 'EMPLOYEE' && request.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return request;
  }

  /**
   * Process request (approve/reject) via approval engine
   */
  async processRequest(
    tenantId: string,
    requestId: string,
    caller: { userId: string },
    dto: ProcessRequestDto,
  ) {
    const { outcome } = await this.approvalEngineService.processStep(
      tenantId,
      requestId,
      caller,
      dto,
    );

    // Update the actual request record
    if (outcome !== 'IN_PROGRESS') {
      await this.updateRequestStatus(requestId, outcome, caller.userId, dto);
    }

    return this.getRequestById(tenantId, requestId, caller.userId, 'ADMIN');
  }

  /**
   * Cancel request (employee only)
   */
  async cancelRequest(tenantId: string, requestId: string, userId: string) {
    const request = await this.requestRepository.findRequestById(requestId);

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    if (request.tenantId !== tenantId) {
      throw new ForbiddenException('Access denied');
    }

    if (request.userId !== userId) {
      throw new ForbiddenException('Can only cancel own requests');
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestException('Only pending requests can be cancelled');
    }

    // Update based on module type
    await this.requestRepository.updateRequestStatus(requestId, 'CANCELLED');

    return this.getRequestById(tenantId, requestId, userId, 'EMPLOYEE');
  }

  /**
   * Admin override (force approve/reject)
   */
  async overrideRequest(
    tenantId: string,
    requestId: string,
    adminUserId: string,
    dto: { action: 'APPROVED' | 'REJECTED'; reason?: string },
  ) {
    const { outcome } = await this.approvalEngineService.forceAdvanceStep(
      tenantId,
      requestId,
      adminUserId,
      dto,
    );

    if (outcome !== 'IN_PROGRESS') {
      await this.updateRequestStatus(requestId, outcome, adminUserId, {
        action: dto.action,
        rejectionReason: dto.reason,
      });
    }

    return this.getRequestById(tenantId, requestId, adminUserId, 'ADMIN');
  }

  /**
   * Helper: Update request status based on approval outcome
   */
  private async updateRequestStatus(
    requestId: string,
    status: 'APPROVED' | 'REJECTED',
    userId: string,
    dto: any,
  ) {
    // Determine module type and update accordingly
    const instance = await this.prisma.requestApprovalInstance.findFirst({
      where: { requestId },
      select: { module: true },
    });

    if (!instance) return;

    if (instance.module === 'REGULARIZATION') {
      await this.prisma.attendanceRegularization.update({
        where: { id: requestId },
        data: {
          status: status as any,
          reviewedByUserId: userId,
          reviewedAt: new Date(),
          ...(status === 'REJECTED' && dto.rejectionReason
            ? { rejectionReason: dto.rejectionReason }
            : {}),
        },
      });
    }
    // TODO: Handle LEAVE module when leave integration is complete
  }
}
