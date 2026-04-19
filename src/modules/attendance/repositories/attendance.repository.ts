import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service.js';
import type { PrismaClient } from '../../../../generated/prisma/client.js'
import { Status } from '../../../../generated/prisma/client.js';

type TX = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

@Injectable()
export class AttendanceRepository {
  constructor(private prisma: PrismaService) {}

  private client(tx?: TX) {
    return tx ?? this.prisma;
  }

  async findByTenantAndId(tenantId: string, id: string, tx?: TX) {
    return this.client(tx).attendance.findFirst({
      where: { id, tenantId, user: { status: { not: Status.DELETED } }, tenant: { status: { not: Status.DELETED } } },
    });
  }

  async findByUserAndDate(tenantId: string, userId: string, date: Date, tx?: TX) {
    return this.client(tx).attendance.findFirst({
      where: { tenantId, userId, date: { gte: new Date(date.toDateString()), lt: new Date(new Date(date).getTime() + 86400000) }, user: { status: { not: Status.DELETED } }, tenant: { status: { not: Status.DELETED } } },
    });
  }

  async findManyByTenant(tenantId: string, tx?: TX) {
    return this.client(tx).attendance.findMany({
      where: { tenantId, user: { status: { not: Status.DELETED } }, tenant: { status: { not: Status.DELETED } } },
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
      orderBy: { date: 'desc' },
    });
  }

  async findManyByUser(tenantId: string, userId: string, tx?: TX) {
    return this.client(tx).attendance.findMany({
      where: { tenantId, userId, user: { status: { not: Status.DELETED } }, tenant: { status: { not: Status.DELETED } } },
      orderBy: { date: 'desc' },
    });
  }

  async create(data: any, tx?: TX) {
    return this.client(tx).attendance.create({ data });
  }

  async update(id: string, data: any, tx?: TX) {
    return this.client(tx).attendance.update({
      where: { id },
      data,
    });
  }
}
