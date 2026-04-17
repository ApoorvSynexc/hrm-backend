import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service.js';
import type { PrismaClient } from '../../../../generated/prisma/index.js';

type TX = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

@Injectable()
export class AttendanceRegularizationRepository {
  constructor(private prisma: PrismaService) {}

  private client(tx?: TX) {
    return tx ?? this.prisma;
  }

  async findByTenantAndId(tenantId: string, id: string, tx?: TX) {
    return this.client(tx).attendanceRegularization.findFirst({
      where: { id, tenantId },
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
    });
  }

  async findManyByTenant(tenantId: string, tx?: TX) {
    return this.client(tx).attendanceRegularization.findMany({
      where: { tenantId },
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findManyByUser(tenantId: string, userId: string, tx?: TX) {
    return this.client(tx).attendanceRegularization.findMany({
      where: { tenantId, userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByUserAndDate(tenantId: string, userId: string, date: Date, tx?: TX) {
    return this.client(tx).attendanceRegularization.findFirst({
      where: { tenantId, userId, date: { gte: new Date(date.toDateString()), lt: new Date(new Date(date).getTime() + 86400000) }, status: 'PENDING' },
    });
  }

  async create(data: any, tx?: TX) {
    return this.client(tx).attendanceRegularization.create({
      data,
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
    });
  }

  async update(id: string, data: any, tx?: TX) {
    return this.client(tx).attendanceRegularization.update({
      where: { id },
      data,
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
    });
  }
}
