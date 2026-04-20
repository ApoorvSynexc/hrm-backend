import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service.js';
import type { PrismaClient } from '../../../../generated/prisma/client.js'
import { Status } from '../../../../generated/prisma/client.js';

type TX = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

@Injectable()
export class WorkingScheduleRepository {
  constructor(private prisma: PrismaService) {}

  private client(tx?: TX) {
    return tx ?? this.prisma;
  }

  /**
   * Find all schedules for a tenant with a specific name
   */
  async findByTenantAndName(tenantId: string, name: string, tx?: TX) {
    return this.client(tx).workingSchedule.findMany({
      where: { tenantId, name },
      orderBy: { day: 'asc' },
    });
  }

  /**
   * Find working hours for a specific day in a schedule
   */
  async findByTenantNameAndDay(tenantId: string, name: string, day: string, tx?: TX) {
    return this.client(tx).workingSchedule.findUnique({
      where: { tenantId_name_day: { tenantId, name, day } },
    });
  }

  /**
   * Create multiple schedule entries (one per day)
   */
  async createMany(data: any[], tx?: TX) {
    return this.client(tx).workingSchedule.createMany({ data });
  }

  /**
   * Update schedule entry for a specific day
   */
  async update(tenantId: string, name: string, day: string, data: any, tx?: TX) {
    return this.client(tx).workingSchedule.update({
      where: { tenantId_name_day: { tenantId, name, day } },
      data,
    });
  }

  /**
   * Delete all entries for a tenant's schedule
   */
  async deleteByTenantAndName(tenantId: string, name: string, tx?: TX) {
    return this.client(tx).workingSchedule.deleteMany({
      where: { tenantId, name },
    });
  }

  /**
   * Get average working hours for a schedule
   */
  async getAverageWorkingHours(tenantId: string, name: string, tx?: TX) {
    const schedules = await this.client(tx).workingSchedule.findMany({
      where: { tenantId, name, isWorking: true },
    });

    if (schedules.length === 0) return 480; // default 8 hours

    const total = schedules.reduce((sum, s) => sum + s.workingHoursPerDay, 0);
    return Math.round(total / schedules.length);
  }
}
