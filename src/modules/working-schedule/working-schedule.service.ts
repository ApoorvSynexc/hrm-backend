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

    this.validateWorkingDays(dto.workingDays);

    await this.prisma.$transaction(async (tx) => {
      await this.workingScheduleRepository.delete({ tenantId, name }, tx);

      const scheduleData = VALID_DAYS.map((day) => ({
        tenantId,
        name,
        day,
        isWorking: dto.workingDays.includes(day),
        workingHoursPerDay: dto.workingHoursPerDay || 480,
      }));

      await this.workingScheduleRepository.createMany(scheduleData, tx);
    });

    return await this.getWorkingSchedule(tenantId, name);
  }

  async getWorkingSchedules(tenantId: string) {
    return await this.workingScheduleRepository.findAll({ tenantId });
  }

  async getWorkingSchedule(tenantId: string, name: string = 'Standard') {
    const schedule = await this.workingScheduleRepository.find({ tenantId, name });

    if (!schedule.length) {
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
    for (const day of workingDays) {
      if (!VALID_DAYS.includes(day)) {
        throw new BadRequestException(
          `Invalid day: ${day}. Must be one of: ${VALID_DAYS.join(', ')}`,
        );
      }
    }
  }
}
