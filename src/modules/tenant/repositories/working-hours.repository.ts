import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service.js';
import type { PrismaClient } from '../../../../generated/prisma/client.js'
import { Status } from '../../../../generated/prisma/client.js';

type TX = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

@Injectable()
export class WorkingHoursRepository {
  constructor(private prisma: PrismaService) {}

  private client(tx?: TX) {
    return tx ?? this.prisma;
  }

  async findByTenantId(tenantId: string, tx?: TX) {
    return this.client(tx).workingHours.findFirst({
      where: { tenantId, tenant: { status: { not: Status.DELETED } } },
    });
  }

  async create(data: any, tx?: TX) {
    return this.client(tx).workingHours.create({ data });
  }

  async update(tenantId: string, data: any, tx?: TX) {
    return this.client(tx).workingHours.update({
      where: { tenantId },
      data,
    });
  }

  async upsert(tenantId: string, data: any, tx?: TX) {
    return this.client(tx).workingHours.upsert({
      where: { tenantId },
      create: { tenantId, ...data },
      update: data,
    });
  }
}
