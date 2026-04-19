import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service.js';
import type { PrismaClient } from '../../../../generated/prisma/client.js'
import { Status } from '../../../../generated/prisma/client.js';

type TX = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

@Injectable()
export class LeaveRepository {
  constructor(private prisma: PrismaService) {}

  private client(tx?: TX) {
    return tx ?? this.prisma;
  }

  async find(where: Record<string, any>, include?: Record<string, any>, tx?: TX) {
    return this.client(tx).leave.findFirst({
      where: { recordStatus: Status.ACTIVE, user: { status: { not: Status.DELETED } }, tenant: { status: { not: Status.DELETED } }, ...where },
      include: {
        user: true,
        tenant: true,
        ...(include && include),
      },
    });
  }

  async findAll(where?: Record<string, any>, options?: { limit?: number; page?: number }, include?: Record<string, any>, tx?: TX) {
    const limit = options?.limit || 10;
    const page = options?.page || 1;
    const skip = (page - 1) * limit;

    const finalWhere = where
      ? { AND: [{ recordStatus: Status.ACTIVE, user: { status: { not: Status.DELETED } }, tenant: { status: { not: Status.DELETED } } }, where] }
      : { recordStatus: Status.ACTIVE, user: { status: { not: Status.DELETED } }, tenant: { status: { not: Status.DELETED } } };

    const [data, total] = await Promise.all([
      this.client(tx).leave.findMany({
        where: finalWhere,
        include: {
          user: true,
          tenant: true,
          ...(include && include),
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.client(tx).leave.count({
        where: finalWhere,
      }),
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
    return this.client(tx).leave.create({
      data,
      include: {
        user: true,
        tenant: true,
      },
    });
  }

  async update(where: Record<string, any>, data: any, tx?: TX) {
    return this.client(tx).leave.updateMany({
      where: { recordStatus: Status.ACTIVE, user: { status: { not: Status.DELETED } }, tenant: { status: { not: Status.DELETED } }, ...where },
      data,
    });
  }

  async delete(where: Record<string, any>, tx?: TX) {
    return this.client(tx).leave.updateMany({
      where: { recordStatus: Status.ACTIVE, user: { status: { not: Status.DELETED } }, tenant: { status: { not: Status.DELETED } }, ...where },
      data: { recordStatus: Status.DELETED },
    });
  }
}
