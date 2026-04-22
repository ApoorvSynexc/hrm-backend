import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import { AttendanceRepository, AttendanceRegularizationRepository } from './repositories/index.js';
import { CreateRegularizationDto, ReviewRegularizationDto, CheckInDto, CheckOutDto } from './dto/index.js';
import { AttendancePolicyService } from './services/attendance-policy.service.js';
import { GeolocationUtil } from '../../common/utils/geolocation.util.js';
import { NetworkUtil } from '../../common/utils/network.util.js';

@Injectable()
export class AttendanceService {
  constructor(
    private attendanceRepository: AttendanceRepository,
    private regularizationRepository: AttendanceRegularizationRepository,
    private prisma: PrismaService,
    private policyService: AttendancePolicyService,
  ) {}

  private getToday(): Date {
    const today = new Date();
    return new Date(today.toDateString());
  }

  private async validateCheckIn(tenant: any, policy: any, dto: CheckInDto, request: any): Promise<boolean> {
    const clientIp = NetworkUtil.getClientIp(request);

    // Check multiple IP ranges if configured
    if (policy.ipRanges && Array.isArray(policy.ipRanges) && policy.ipRanges.length > 0) {
      if (NetworkUtil.isIpInMultipleRanges(clientIp, policy.ipRanges)) {
        return true;
      }
    }

    // Check geolocation if provided and office location is set
    if (dto.latitude && dto.longitude && tenant.officeLatitude && tenant.officeLogitude) {
      if (
        GeolocationUtil.isWithinRadius(
          parseFloat(tenant.officeLatitude.toString()),
          parseFloat(tenant.officeLogitude.toString()),
          dto.latitude,
          dto.longitude,
          policy.radiusMeters,
        )
      ) {
        return true;
      }
    }

    return false;
  }

  private async validateCheckOut(tenant: any, policy: any, dto: CheckOutDto, request: any): Promise<boolean> {
    const clientIp = NetworkUtil.getClientIp(request);

    // Check multiple IP ranges if configured
    if (policy.ipRanges && Array.isArray(policy.ipRanges) && policy.ipRanges.length > 0) {
      if (NetworkUtil.isIpInMultipleRanges(clientIp, policy.ipRanges)) {
        return true;
      }
    }

    // Check geolocation if provided and office location is set
    if (dto.latitude && dto.longitude && tenant.officeLatitude && tenant.officeLogitude) {
      if (
        GeolocationUtil.isWithinRadius(
          parseFloat(tenant.officeLatitude.toString()),
          parseFloat(tenant.officeLogitude.toString()),
          dto.latitude,
          dto.longitude,
          policy.radiusMeters,
        )
      ) {
        return true;
      }
    }

    return false;
  }

  async checkIn(tenantId: string, userId: string, dto: CheckInDto, request: any) {
    const today = this.getToday();

    // Get attendance policy
    const policy = await this.policyService.getPolicyOrDefault(tenantId);
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    // Validate policy if strict
    if (policy.policyType === 'STRICT') {
      const validCheckIn = await this.validateCheckIn(tenant, policy, dto, request);
      if (!validCheckIn) {
        throw new BadRequestException(
          'You are not allowed to check in. You must be near the office or connected to office network (Strict policy enabled).',
        );
      }
    }

    const existing = await this.attendanceRepository.findByUserAndDate(tenantId, userId, today);
    if (existing && existing.checkIn) {
      throw new BadRequestException('Already checked in today');
    }

    const checkInData: any = {
      checkIn: new Date(),
      checkInIp: NetworkUtil.getClientIp(request),
      status: 'PRESENT',
    };

    if (dto.latitude && dto.longitude) {
      checkInData.checkInLatitude = dto.latitude;
      checkInData.checkInLongitude = dto.longitude;
      checkInData.checkInMethod = 'GEOLOCATION';
    } else {
      checkInData.checkInMethod = 'IP_RANGE';
    }

    if (existing) {
      return await this.attendanceRepository.update(existing.id, checkInData);
    }

    return await this.attendanceRepository.create({
      tenantId,
      userId,
      date: today,
      ...checkInData,
    });
  }

  async checkOut(tenantId: string, userId: string, dto: CheckOutDto, request: any) {
    const today = this.getToday();

    // Get attendance policy
    const policy = await this.policyService.getPolicyOrDefault(tenantId);
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    // Validate policy if strict
    if (policy.policyType === 'STRICT') {
      const validCheckOut = await this.validateCheckOut(tenant, policy, dto, request);
      if (!validCheckOut) {
        throw new BadRequestException(
          'You are not allowed to check out. You must be near the office or connected to office network (Strict policy enabled).',
        );
      }
    }

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

    const workingSchedule = await this.prisma.workingSchedule.findUnique({
      where: { tenantId_name: { tenantId, name: 'Standard' } },
    });

    const checkOut = new Date();
    const totalMinutes = Math.floor((checkOut.getTime() - new Date(record.checkIn).getTime()) / 60000);
    const avgHours = workingSchedule
      ? workingSchedule.workingHoursPerDay
      : 480;
    const halfDayThreshold = avgHours * 0.5;
    const status = totalMinutes < halfDayThreshold ? 'HALF_DAY' : record.status;

    const checkOutData: any = {
      checkOut,
      checkOutIp: NetworkUtil.getClientIp(request),
      totalMinutes,
      status,
    };

    if (dto.latitude && dto.longitude) {
      checkOutData.checkOutLatitude = dto.latitude;
      checkOutData.checkOutLongitude = dto.longitude;
      checkOutData.checkOutMethod = 'GEOLOCATION';
    } else {
      checkOutData.checkOutMethod = 'IP_RANGE';
    }

    return await this.attendanceRepository.update(record.id, checkOutData);
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
