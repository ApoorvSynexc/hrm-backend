import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { LeaveRepository } from './repositories/leave.repository.js';
import { CreateLeaveDto, UpdateLeaveDto, ApproveLeaveDto } from './dto/index.js';

@Injectable()
export class LeaveService {
  constructor(private leaveRepository: LeaveRepository) {}

  async createLeave(tenantId: string, userId: string, dto: CreateLeaveDto) {
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (startDate > endDate) {
      throw new BadRequestException('Start date must be before end date');
    }

    const existingLeave = await this.leaveRepository.find({
      tenantId,
      userId,
      status: { in: ['PENDING', 'APPROVED'] },
      startDate: { lte: endDate },
      endDate: { gte: startDate },
    });

    if (existingLeave) {
      throw new BadRequestException('Leave request already exists for this date range');
    }

    return this.leaveRepository.create({
      tenantId,
      userId,
      type: dto.type,
      startDate,
      endDate,
      reason: dto.reason,
      status: 'PENDING',
      recordStatus: 'ACTIVE',
    });
  }

  async getMyLeaves(tenantId: string, userId: string, options?: { limit?: number; page?: number }) {
    return this.leaveRepository.findAll(
      { tenantId, userId },
      options,
    );
  }

  async getAllLeaves(tenantId: string, options?: { limit?: number; page?: number }) {
    return this.leaveRepository.findAll(
      { tenantId },
      options,
    );
  }

  async getLeaveById(tenantId: string, id: string) {
    const leave = await this.leaveRepository.find({ tenantId, id });
    if (!leave) {
      throw new NotFoundException('Leave request not found');
    }
    return leave;
  }

  async updateLeave(tenantId: string, userId: string, id: string, dto: UpdateLeaveDto) {
    const leave = await this.getLeaveById(tenantId, id);

    if (leave.userId !== userId) {
      throw new BadRequestException('You can only update your own leave requests');
    }

    if (leave.status !== 'PENDING') {
      throw new BadRequestException('Can only update leave requests with PENDING status');
    }

    const startDate = dto.startDate ? new Date(dto.startDate) : leave.startDate;
    const endDate = dto.endDate ? new Date(dto.endDate) : leave.endDate;

    if (startDate > endDate) {
      throw new BadRequestException('Start date must be before end date');
    }

    const existingLeave = await this.leaveRepository.find({
      tenantId,
      userId,
      id: { not: id },
      status: { in: ['PENDING', 'APPROVED'] },
      startDate: { lte: endDate },
      endDate: { gte: startDate },
    });

    if (existingLeave) {
      throw new BadRequestException('Another leave request exists for this date range');
    }

    await this.leaveRepository.update(
      { id, tenantId },
      {
        type: dto.type || leave.type,
        startDate,
        endDate,
        reason: dto.reason !== undefined ? dto.reason : leave.reason,
      },
    );

    return this.getLeaveById(tenantId, id);
  }

  async deleteLeave(tenantId: string, userId: string, id: string) {
    const leave = await this.getLeaveById(tenantId, id);

    if (leave.userId !== userId) {
      throw new BadRequestException('You can only delete your own leave requests');
    }

    if (leave.status !== 'PENDING') {
      throw new BadRequestException('Can only delete leave requests with PENDING status');
    }

    await this.leaveRepository.delete({ id, tenantId });
    return { message: 'Leave request deleted successfully' };
  }

  async approveLeave(tenantId: string, id: string, dto: ApproveLeaveDto) {
    const leave = await this.getLeaveById(tenantId, id);

    if (leave.status !== 'PENDING') {
      throw new BadRequestException('Can only approve/reject PENDING leave requests');
    }

    await this.leaveRepository.update(
      { id, tenantId },
      {
        status: dto.status,
        ...(dto.status === 'REJECTED' && { rejectionReason: dto.rejectionReason }),
      },
    );

    return this.getLeaveById(tenantId, id);
  }

  async getSuperAdminLeaves(filters?: { tenantId?: string; status?: string }, options?: { limit?: number; page?: number }) {
    const where: any = {};
    if (filters?.tenantId) where.tenantId = filters.tenantId;
    if (filters?.status) where.status = filters.status;

    return this.leaveRepository.findAll(where, options);
  }
}
