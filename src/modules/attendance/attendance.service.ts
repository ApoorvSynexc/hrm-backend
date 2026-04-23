import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import { AttendanceRepository, AttendanceRegularizationRepository, AttendanceLogRepository } from './repositories/index.js';
import { CreateRegularizationDto, ReviewRegularizationDto, CheckInDto, CheckOutDto } from './dto/index.js';
import { AttendancePolicyService } from './services/attendance-policy.service.js';
import { GeolocationUtil } from '../../common/utils/geolocation.util.js';
import { NetworkUtil } from '../../common/utils/network.util.js';
import { startOfMonth, endOfMonth, format, getDaysInMonth } from 'date-fns';

@Injectable()
export class AttendanceService {
  constructor(
    private attendanceRepository: AttendanceRepository,
    private attendanceLogRepository: AttendanceLogRepository,
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

    if (policy.ipRanges && Array.isArray(policy.ipRanges) && policy.ipRanges.length > 0) {
      if (NetworkUtil.isIpInMultipleRanges(clientIp, policy.ipRanges)) {
        return true;
      }
    }

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

    if (policy.ipRanges && Array.isArray(policy.ipRanges) && policy.ipRanges.length > 0) {
      if (NetworkUtil.isIpInMultipleRanges(clientIp, policy.ipRanges)) {
        return true;
      }
    }

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
    const now = new Date();

    const policy = await this.policyService.getPolicyForUser(tenantId, userId);
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });

    if (policy.policyType === 'STRICT') {
      const validCheckIn = await this.validateCheckIn(tenant, policy, dto, request);
      if (!validCheckIn) {
        throw new BadRequestException(
          'You are not allowed to check in. You must be near the office or connected to office network (Strict policy enabled).',
        );
      }
    }

    const existing = await this.attendanceRepository.find(
      {
        tenantId,
        userId,
        date: { gte: new Date(today.toDateString()), lt: new Date(new Date(today).getTime() + 86400000) },
      },
    );

    if (existing) {
      const openLog = await this.attendanceLogRepository.findOpenLog(existing.id);
      if (openLog) {
        throw new BadRequestException('Already checked in. Please check out before checking in again.');
      }
    }

    const logData: any = {
      tenantId,
      userId,
      checkIn: now,
      checkInIp: NetworkUtil.getClientIp(request),
      checkInMethod: dto.latitude && dto.longitude ? 'GEOLOCATION' : 'IP_RANGE',
    };

    if (dto.latitude && dto.longitude) {
      logData.checkInLatitude = dto.latitude;
      logData.checkInLongitude = dto.longitude;
    }

    return await this.prisma.$transaction(async (tx) => {
      let attendanceRecord: any;

      if (!existing) {
        attendanceRecord = await this.attendanceRepository.create(
          {
            tenantId,
            userId,
            date: today,
            firstCheckIn: now,
            status: 'MISSING_CHECKOUT',
            isFinalStatus: false,
            isLate: false,
          },
          tx as any,
        );
      } else {
        attendanceRecord = existing;
      }

      await this.attendanceLogRepository.create({ ...logData, attendanceId: attendanceRecord.id }, tx as any);

      return attendanceRecord;
    });
  }

  async checkOut(tenantId: string, userId: string, dto: CheckOutDto, request: any) {
    const today = this.getToday();
    const now = new Date();

    const policy = await this.policyService.getPolicyForUser(tenantId, userId);
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });

    if (policy.policyType === 'STRICT') {
      const validCheckOut = await this.validateCheckOut(tenant, policy, dto, request);
      if (!validCheckOut) {
        throw new BadRequestException(
          'You are not allowed to check out. You must be near the office or connected to office network (Strict policy enabled).',
        );
      }
    }

    const record = await this.attendanceRepository.find(
      {
        tenantId,
        userId,
        date: { gte: new Date(today.toDateString()), lt: new Date(new Date(today).getTime() + 86400000) },
      },
    );
    if (!record) {
      throw new BadRequestException('No check-in found for today');
    }

    const openLog = await this.attendanceLogRepository.findOpenLog(record.id);
    if (!openLog) {
      throw new BadRequestException('No open check-in session found. Please check in first.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { workingSchedule: { select: { fullDayMinimumMinutes: true } } },
    });

    const fullDayThreshold = user?.workingSchedule?.fullDayMinimumMinutes ?? 480;
    const sessionMinutes = Math.floor((now.getTime() - new Date(openLog.checkIn).getTime()) / 60000);

    const checkOutLogData: any = {
      checkOut: now,
      durationMinutes: sessionMinutes,
      checkOutIp: NetworkUtil.getClientIp(request),
      checkOutMethod: dto.latitude && dto.longitude ? 'GEOLOCATION' : 'IP_RANGE',
    };

    if (dto.latitude && dto.longitude) {
      checkOutLogData.checkOutLatitude = dto.latitude;
      checkOutLogData.checkOutLongitude = dto.longitude;
    }

    return await this.prisma.$transaction(async (tx) => {
      await this.attendanceLogRepository.update({ id: openLog.id }, checkOutLogData, tx as any);

      const logsResult = await this.attendanceLogRepository.findAll({ attendanceId: record.id }, { pagination: false }, tx as any);
      const allLogs = logsResult.data;
      const totalMinutes = allLogs.reduce((sum, log) => {
        if (log.id === openLog.id) return sum + sessionMinutes;
        return sum + (log.durationMinutes ?? 0);
      }, 0);

      const attendanceUpdate: any = {
        totalMinutes,
        lastCheckOut: now,
      };

      if (totalMinutes >= fullDayThreshold) {
        attendanceUpdate.status = 'PRESENT';
        attendanceUpdate.isFinalStatus = true;
      }

      return await this.attendanceRepository.update({ id: record.id }, attendanceUpdate, tx as any);
    });
  }

  async getMyAttendance(
    tenantId: string,
    userId: string,
    options?: { limit?: number; page?: number },
  ) {
    return this.attendanceRepository.findAll(
      { tenantId, userId },
      {
        pagination: true,
        limit: options?.limit || 10,
        page: options?.page || 1,
      },
    );
  }

  async getTodayAttendance(tenantId: string, userId: string) {
    const today = this.getToday();
    return this.attendanceRepository.find(
      {
        tenantId,
        userId,
        date: { gte: new Date(today.toDateString()), lt: new Date(new Date(today).getTime() + 86400000) },
      },
      { logs: { orderBy: { checkIn: 'asc' } } },
    );
  }

  async getAllAttendance(
    tenantId: string,
    options?: { limit?: number; page?: number },
  ) {
    return this.attendanceRepository.findAll(
      { tenantId },
      {
        pagination: true,
        limit: options?.limit || 10,
        page: options?.page || 1,
      },
      { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
    );
  }

  async getAttendanceById(tenantId: string, id: string) {
    const record = await this.attendanceRepository.find({ tenantId, id });
    if (!record) {
      throw new NotFoundException('Attendance record not found');
    }
    return record;
  }

  async getAttendanceLogs(
    tenantId: string,
    attendanceId: string,
    options?: { limit?: number; page?: number },
  ) {
    const record = await this.attendanceRepository.find({ tenantId, id: attendanceId });
    if (!record) {
      throw new NotFoundException('Attendance record not found');
    }
    return this.attendanceLogRepository.findByAttendanceWithPagination(attendanceId, options);
  }

  async createRegularization(tenantId: string, userId: string, dto: CreateRegularizationDto) {
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

  async getMyRegularizations(tenantId: string, userId: string) {
    const result = await this.regularizationRepository.findAll(
      { tenantId, userId },
      { pagination: false },
    );
    return result.data;
  }

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

  async getRegularizationById(tenantId: string, id: string) {
    const record = await this.regularizationRepository.find({ tenantId, id });
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

    return await this.regularizationRepository.update({ id }, updateData);
  }

  async getMonthlyCalendar(tenantId: string, userId: string, month?: number, year?: number) {
    const now = new Date();
    const targetMonth = month ?? now.getMonth() + 1;
    const targetYear = year ?? now.getFullYear();

    const startDate = startOfMonth(new Date(targetYear, targetMonth - 1, 1));
    const endDate = endOfMonth(startDate);

    const attendanceRecords = await this.attendanceRepository.findByDateRange(
      tenantId,
      userId,
      startDate,
      endDate,
    );

    const monthMap = new Map();
    attendanceRecords.forEach((record: any) => {
      const dateKey = format(record.date, 'yyyy-MM-dd');
      monthMap.set(dateKey, record);
    });

    const daysInMonth = getDaysInMonth(startDate);
    const days: any[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(targetYear, targetMonth - 1, day);
      const dateKey = format(date, 'yyyy-MM-dd');
      const record = monthMap.get(dateKey);

      days.push({
        date: day,
        dayOfWeek: format(date, 'EEE'),
        status: record?.status ?? null,
        totalMinutes: record?.totalMinutes ?? null,
        isLate: record?.isLate ?? false,
        isFinalStatus: record?.isFinalStatus ?? false,
      });
    }

    const monthName = format(startDate, 'MMMM');

    return {
      month: monthName,
      monthNumber: targetMonth,
      year: targetYear,
      daysInMonth,
      days,
    };
  }
}
