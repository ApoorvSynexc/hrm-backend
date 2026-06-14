import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import { RegularizationRepository } from './repositories/index.js';
import { ApprovalEngineService } from '../approval-workflow/approval-engine.service.js';
import { CreateRegularizationDto } from './dto/index.js';

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
