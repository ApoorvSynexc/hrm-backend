import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { TenantRepository } from '../tenant/repositories/index.js';
import { ConfigureWorkingHoursDto } from './dto/index.js';
import { WorkingScheduleRepository } from './repositories/index.js';

const VALID_DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

@Injectable()
export class WorkingScheduleService {
  constructor(
    private tenantRepository: TenantRepository,
    private workingScheduleRepository: WorkingScheduleRepository,
  ) {}

  async create(tenantId: string, dto: ConfigureWorkingHoursDto) {
    await this.validateTenant(tenantId);
    const { name, workingDays = [], startTime, endTime, breakDuration, workingHoursPerDay, status } = dto;
    this.validateWorkingDays(workingDays || []);

    return await this.workingScheduleRepository.create({
      tenantId,
      name,
      workingDays,
      startTime,
      endTime,
      breakDuration,
      workingHoursPerDay,
      status: status || 'ACTIVE',
    });
  }

  async update(tenantId: string, id: string, dto: ConfigureWorkingHoursDto) {
    await this.validateTenant(tenantId);
    const { name, workingDays, startTime, endTime, breakDuration, workingHoursPerDay, status } = dto;

    if (workingDays && workingDays.length > 0) {
      this.validateWorkingDays(workingDays);
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (workingDays && workingDays.length > 0) updateData.workingDays = workingDays;
    if (startTime) updateData.startTime = startTime;
    if (endTime) updateData.endTime = endTime;
    if (breakDuration !== undefined) updateData.breakDuration = breakDuration;
    if (workingHoursPerDay !== undefined) updateData.workingHoursPerDay = workingHoursPerDay;
    if (status) updateData.status = status;

    return await this.workingScheduleRepository.updateById(id, updateData);
  }

  async list(tenantId: string, name?: string) {
    if (name) {
      return await this.get(tenantId, name);
    }
    return await this.workingScheduleRepository.findAll({ tenantId });
  }

  async get(tenantId: string, name: string = 'Standard') {
    const schedule = await this.workingScheduleRepository.findOne({
      tenantId,
      name,
    });

    if (!schedule) {
      throw new NotFoundException('Working schedule not found');
    }

    return schedule;
  }

  async delete(tenantId: string, id: string) {
    await this.workingScheduleRepository.deleteById(id);
    return { message: 'Working schedule deleted', id };
  }

  private async validateTenant(tenantId: string) {
    const tenant = await this.tenantRepository.find({ id: tenantId });
    if (!tenant) {
      throw new BadRequestException('Tenant not found');
    }
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
