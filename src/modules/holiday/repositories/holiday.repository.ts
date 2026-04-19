import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service.js';
import type { PrismaClient } from '../../../../generated/prisma/index.js';

type TX = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

@Injectable()
export class HolidayRepository {
  constructor(private prisma: PrismaService) {}

  private client(tx?: TX) {
    return tx ?? this.prisma;
  }

  async find(where: Record<string, any>, tx?: TX) {
    return this.client(tx).holiday.findFirst({
      where: { tenant: { status: { not: 'DELETED' } }, ...where },
      include: { tenant: true },
    });
  }

  async findAll(where?: Record<string, any>, options?: { limit?: number; page?: number }, tx?: TX) {
    const limit = options?.limit || 10;
    const page = options?.page || 1;
    const skip = (page - 1) * limit;

    const finalWhere = where
      ? { AND: [where, { tenant: { status: { not: 'DELETED' } } }] }
      : { tenant: { status: { not: 'DELETED' } } };

    const [data, total] = await Promise.all([
      this.client(tx).holiday.findMany({
        where: finalWhere,
        include: { tenant: true },
        skip,
        take: limit,
        orderBy: { date: 'asc' },
      }),
      this.client(tx).holiday.count({ where: finalWhere }),
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
    return this.client(tx).holiday.create({
      data,
      include: { tenant: true },
    });
  }

  async update(where: Record<string, any>, data: any, tx?: TX) {
    return this.client(tx).holiday.updateMany({
      where,
      data,
    });
  }

  async delete(where: Record<string, any>, tx?: TX) {
    return this.client(tx).holiday.deleteMany({ where });
  }
}
