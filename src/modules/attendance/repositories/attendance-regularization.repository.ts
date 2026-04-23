import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service.js';
import type { PrismaClient } from '../../../../generated/prisma/client.js'
import { Status } from '../../../../generated/prisma/client.js';

type TX = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

@Injectable()
export class AttendanceRegularizationRepository {
  constructor(private prisma: PrismaService) {}

  private client(tx?: TX) {
    return tx ?? this.prisma;
  }

  private baseWhere() {
    return {
      user: { status: { not: Status.DELETED } },
      tenant: { status: { not: Status.DELETED } },
    };
  }

  /**
   * Find a single regularization record by flexible where clause
   */
  async find(where: Record<string, any>, include?: Record<string, any>, tx?: TX) {
    return this.client(tx).attendanceRegularization.findFirst({
      where: { ...this.baseWhere(), ...where },
      include,
    });
  }

  /**
   * Find multiple regularization records with optional pagination
   */
  async findAll(
    where?: Record<string, any>,
    options?: {
      pagination?: boolean;
      limit?: number;
      page?: number;
    },
    include?: Record<string, any>,
    tx?: TX,
  ) {
    const {
      pagination = true,
      limit = 10,
      page = 1,
    } = options || {};

    const skip = pagination ? (page - 1) * limit : 0;

    const [records, total] = await Promise.all([
      this.client(tx).attendanceRegularization.findMany({
        where: { ...this.baseWhere(), ...(where || {}) },
        include,
        orderBy: { createdAt: 'desc' },
        skip: pagination ? skip : undefined,
        take: pagination ? limit : undefined,
      }),
      this.client(tx).attendanceRegularization.count({
        where: { ...this.baseWhere(), ...(where || {}) },
      }),
    ]);

    const result: any = {
      data: records,
    };

    if (pagination) {
      result.meta = {
        totalRecords: total,
        totalPages: Math.ceil(total / limit),
        page,
        limit,
      };
    }

    return result;
  }

  /**
   * Create a new regularization record
   */
  async create(data: any, tx?: TX) {
    return this.client(tx).attendanceRegularization.create({
      data,
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
    });
  }

  /**
   * Update regularization by flexible where clause
   */
  async update(where: Record<string, any>, data: any, tx?: TX) {
    return this.client(tx).attendanceRegularization.update({
      where: where as any,
      data,
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
    });
  }
}
