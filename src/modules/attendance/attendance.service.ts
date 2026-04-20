import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import { AttendanceRepository, AttendanceRegularizationRepository } from './repositories/index.js';
import { CreateRegularizationDto, ReviewRegularizationDto } from './dto/index.js';

@Injectable()
export class AttendanceService {
  constructor(
    private attendanceRepository: AttendanceRepository,
    private regularizationRepository: AttendanceRegularizationRepository,
    private prisma: PrismaService,
  ) {}

  private getToday(): Date {
    const today = new Date();
    return new Date(today.toDateString());
  }

  async checkIn(tenantId: string, userId: string) {
    const today = this.getToday();

    const existing = await this.attendanceRepository.findByUserAndDate(tenantId, userId, today);
    if (existing && existing.checkIn) {
      throw new BadRequestException('Already checked in today');
    }

    if (existing) {
      return await this.attendanceRepository.update(existing.id, {
        checkIn: new Date(),
      });
    }

    return await this.attendanceRepository.create({
      tenantId,
      userId,
      date: today,
      checkIn: new Date(),
      status: 'PRESENT',
    });
  }

  async checkOut(tenantId: string, userId: string) {
    const today = this.getToday();

    const record = await this.attendanceRepository.findByUserAndDate(tenantId, userId, today);
    if (!record) {
      throw new BadRequestException('No check-in found for today');
    }

    if (!record.checkIn) {
      throw new BadRequestException('Please check in first');
    }

    if (record.checkOut) {
      throw new BadRequestException('Already checked out today');
    }

    const workingSchedule = await this.prisma.workingSchedule.findMany({
      where: { tenantId, name: 'Standard', isWorking: true },
    });

    const checkOut = new Date();
    const totalMinutes = Math.floor((checkOut.getTime() - new Date(record.checkIn).getTime()) / 60000);
    const avgHours = workingSchedule.length > 0
      ? Math.round(workingSchedule.reduce((sum, s) => sum + s.workingHoursPerDay, 0) / workingSchedule.length)
      : 480;
    const halfDayThreshold = avgHours * 0.5;
    const status = totalMinutes < halfDayThreshold ? 'HALF_DAY' : record.status;

    return await this.attendanceRepository.update(record.id, {
      checkOut,
      totalMinutes,
      status,
    });
  }

  async getMyAttendance(tenantId: string, userId: string) {
    return this.attendanceRepository.findManyByUser(tenantId, userId);
  }

  async getAllAttendance(tenantId: string) {
    return this.attendanceRepository.findManyByTenant(tenantId);
  }

  async getAttendanceById(tenantId: string, id: string) {
    const record = await this.attendanceRepository.findByTenantAndId(tenantId, id);
    if (!record) {
      throw new NotFoundException('Attendance record not found');
    }
    return record;
  }

  async createRegularization(tenantId: string, userId: string, dto: CreateRegularizationDto) {
    const date = new Date(dto.date);

    const existing = await this.regularizationRepository.findByUserAndDate(tenantId, userId, date);
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

  async getMyRegularizations(tenantId: string, userId: string) {
    return this.regularizationRepository.findManyByUser(tenantId, userId);
  }

  async getAllRegularizations(tenantId: string) {
    return this.regularizationRepository.findManyByTenant(tenantId);
  }

  async getRegularizationById(tenantId: string, id: string) {
    const record = await this.regularizationRepository.findByTenantAndId(tenantId, id);
    if (!record) {
      throw new NotFoundException('Regularization request not found');
    }
    return record;
  }

  async reviewRegularization(tenantId: string, reviewerId: string, id: string, dto: ReviewRegularizationDto) {
    const regularization = await this.getRegularizationById(tenantId, id);

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

    return await this.regularizationRepository.update(id, updateData);
  }
}
