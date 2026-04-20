import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import { TenantRepository } from '../tenant/repositories/index.js';
import { ConfigureWorkingHoursDto } from './dto/index.js';
import { WorkingScheduleRepository } from './repositories/index.js';

const VALID_DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

@Injectable()
export class WorkingScheduleService {
  constructor(
    private prisma: PrismaService,
    private tenantRepository: TenantRepository,
    private workingScheduleRepository: WorkingScheduleRepository,
  ) {}

  async configureWorkingSchedule(
    tenantId: string,
    name: string,
    dto: ConfigureWorkingHoursDto,
  ) {
    const tenant = await this.tenantRepository.find({ id: tenantId });
    if (!tenant) {
      throw new BadRequestException('Tenant not found');
    }

    if (dto.workingDays) {
      this.validateWorkingDays(dto.workingDays);
    }

    const schedule = await this.workingScheduleRepository.findOne({
      tenantId,
      name,
    });

    const scheduleData = {
      tenantId,
      name,
      workingDays: dto.workingDays || schedule?.workingDays || ['MON', 'TUE', 'WED', 'THU', 'FRI'],
      startTime: dto.startTime || schedule?.startTime || '09:00',
      endTime: dto.endTime || schedule?.endTime || '17:00',
      breakDuration: dto.breakDuration ?? (schedule?.breakDuration || 1),
      workingHoursPerDay: dto.workingHoursPerDay ?? schedule?.workingHoursPerDay ?? 480,
    };

    if (schedule) {
      return await this.workingScheduleRepository.update(
        { tenantId, name },
        scheduleData,
      );
    }

    return await this.workingScheduleRepository.create(scheduleData);
  }

  async getWorkingSchedules(tenantId: string) {
    return await this.workingScheduleRepository.findAll({ tenantId });
  }

  async getWorkingSchedule(tenantId: string, name: string = 'Standard') {
    const schedule = await this.workingScheduleRepository.findOne({
      tenantId,
      name,
    });

    if (!schedule) {
      throw new NotFoundException('Working schedule not found');
    }

    return schedule;
  }

  async deleteWorkingSchedule(tenantId: string, name: string = 'Standard') {
    await this.getWorkingSchedule(tenantId, name);
    await this.workingScheduleRepository.delete({ tenantId, name });
    return { name };
  }

  private validateWorkingDays(workingDays: string[]) {
    if (!Array.isArray(workingDays) || workingDays.length === 0) {
      throw new BadRequestException('workingDays must be a non-empty array');
    }

    for (const day of workingDays) {
      if (!VALID_DAYS.includes(day)) {
        throw new BadRequestException(
          `Invalid day: ${day}. Must be one of: ${VALID_DAYS.join(', ')}`,
        );
      }
    }
  }
}
