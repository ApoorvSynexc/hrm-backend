import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { RegularizationRepository } from './repositories/index.js';
import { CreateRegularizationDto, ReviewRegularizationDto } from './dto/index.js';

@Injectable()
export class RegularizationService {
  constructor(private regularizationRepository: RegularizationRepository) {}

  /**
   * Create a new regularization request
   */
  async create(tenantId: string, userId: string, dto: CreateRegularizationDto) {
    const date = new Date(dto.date);

    const existing = await this.regularizationRepository.find({
      tenantId,
      userId,
      date: { gte: new Date(date.toDateString()), lt: new Date(new Date(date).getTime() + 86400000) },
      status: 'PENDING',
    });

    if (existing) {
      throw new BadRequestException('Pending regularization request already exists for this date');
    }

    return await this.regularizationRepository.create({
      tenantId,
      userId,
      date,
      requestedCheckIn: dto.requestedCheckIn ? new Date(dto.requestedCheckIn) : null,
      requestedCheckOut: dto.requestedCheckOut ? new Date(dto.requestedCheckOut) : null,
      reason: dto.reason,
      status: 'PENDING',
    });
  }

  /**
   * Get user's own regularization requests
   */
  async getMyRegularizations(tenantId: string, userId: string) {
    const result = await this.regularizationRepository.findAll(
      { tenantId, userId },
      { pagination: false },
    );
    return result.data;
  }

  /**
   * Get all regularization requests with pagination
   */
  async getAllRegularizations(
    tenantId: string,
    options?: { limit?: number; page?: number },
  ) {
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
   * Get single regularization request by ID
   */
  async getById(tenantId: string, id: string) {
    const record = await this.regularizationRepository.find({ tenantId, id });
    if (!record) {
      throw new NotFoundException('Regularization request not found');
    }
    return record;
  }

  /**
   * Approve or reject a regularization request
   */
  async review(tenantId: string, reviewerId: string, id: string, dto: ReviewRegularizationDto) {
    const regularization = await this.getById(tenantId, id);

    if (regularization.status !== 'PENDING') {
      throw new BadRequestException('Regularization is not pending review');
    }

    const updateData: any = {
      status: dto.status,
      reviewedByUserId: reviewerId,
      reviewedAt: new Date(),
    };

    if (dto.status === 'REJECTED' && dto.rejectionReason) {
      updateData.rejectionReason = dto.rejectionReason;
    }

    return await this.regularizationRepository.update({ id }, updateData);
  }
}
