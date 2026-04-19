import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service.js';
import type { PrismaClient } from '../../../../generated/prisma/client.js'
import { Status } from '../../../../generated/prisma/client.js';

type TX = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

@Injectable()
export class LeaveBalanceRepository {
  constructor(private prisma: PrismaService) {}

  private client(tx?: TX) {
    return tx ?? this.prisma;
  }

  async find(where: Record<string, any>, tx?: TX) {
    return this.client(tx).leaveBalance.findFirst({
      where: { user: { status: { not: Status.DELETED } }, tenant: { status: { not: Status.DELETED } }, ...where },
      include: { user: true, tenant: true },
    });
  }

  async findAll(where?: Record<string, any>, options?: { limit?: number; page?: number }, tx?: TX) {
    const limit = options?.limit || 10;
    const page = options?.page || 1;
    const skip = (page - 1) * limit;

    const finalWhere = where
      ? { AND: [where, { user: { status: { not: Status.DELETED } }, tenant: { status: { not: Status.DELETED } } }] }
      : { user: { status: { not: Status.DELETED } }, tenant: { status: { not: Status.DELETED } } };

    const [data, total] = await Promise.all([
      this.client(tx).leaveBalance.findMany({
        where: finalWhere,
        include: { user: true, tenant: true },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.client(tx).leaveBalance.count({ where: finalWhere }),
    ]);

    return {
      data,
      meta: {
        totalRecords: total,
        totalPages: Math.ceil(total / limit),
        page,
        limit,
      },
    };
  }

  async create(data: any, tx?: TX) {
    return this.client(tx).leaveBalance.create({
      data,
      include: { user: true, tenant: true },
    });
  }

  async update(where: Record<string, any>, data: any, tx?: TX) {
    return this.client(tx).leaveBalance.updateMany({
      where,
      data,
    });
  }

  async delete(where: Record<string, any>, tx?: TX) {
    return this.client(tx).leaveBalance.deleteMany({ where });
  }

  async upsert(unique: any, create: any, update: any, tx?: TX) {
    return this.client(tx).leaveBalance.upsert({
      where: {
        tenantId_userId_year_leaveType: unique,
      },
      create,
      update,
      include: { user: true, tenant: true },
    });
  }
}
