import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service.js';
import type { PrismaClient } from '../../../../generated/prisma/index.js';

type TX = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

@Injectable()
export class WorkingDayRepository {
  constructor(private prisma: PrismaService) {}

  private client(tx?: TX) {
    return tx ?? this.prisma;
  }

  async findByTenantId(tenantId: string, tx?: TX) {
    return this.client(tx).workingDay.findMany({
      where: { tenantId, tenant: { status: { not: 'DELETED' } } },
      orderBy: { day: 'asc' },
    });
  }

  async findByTenantAndDay(tenantId: string, day: string, tx?: TX) {
    return this.client(tx).workingDay.findFirst({
      where: { tenantId, day, tenant: { status: { not: 'DELETED' } } },
    });
  }

  async create(data: any, tx?: TX) {
    return this.client(tx).workingDay.create({ data });
  }

  async createMany(data: any[], tx?: TX) {
    return this.client(tx).workingDay.createMany({ data });
  }

  async update(tenantId: string, day: string, data: any, tx?: TX) {
    return this.client(tx).workingDay.update({
      where: { tenantId_day: { tenantId, day } },
      data,
    });
  }

  async deleteByTenant(tenantId: string, tx?: TX) {
    return this.client(tx).workingDay.deleteMany({
      where: { tenantId },
    });
  }
}
