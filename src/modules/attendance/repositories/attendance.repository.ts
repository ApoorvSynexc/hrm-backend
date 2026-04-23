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

  private baseWhere() {
    return {
      user: { status: { not: Status.DELETED } },
      tenant: { status: { not: Status.DELETED } },
    };
  }

  /**
   * Find a single attendance record by flexible where clause
   */
  async find(where: Record<string, any>, include?: Record<string, any>, tx?: TX) {
    return this.client(tx).attendance.findFirst({
      where: { ...this.baseWhere(), ...where },
      include,
    });
  }

  /**
   * Find multiple attendance records with optional pagination
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
      this.client(tx).attendance.findMany({
        where: { ...this.baseWhere(), ...(where || {}) },
        include,
        orderBy: { date: 'desc' },
        skip: pagination ? skip : undefined,
        take: pagination ? limit : undefined,
      }),
      this.client(tx).attendance.count({
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
   * Create a new attendance record
   */
  async create(data: any, tx?: TX) {
    return this.client(tx).attendance.create({ data });
  }

  /**
   * Update attendance by flexible where clause
   */
  async update(where: Record<string, any>, data: any, tx?: TX) {
    return this.client(tx).attendance.update({
      where: where as any,
      data,
    });
  }


  /**
   * Find attendance records by date range (for calendar and reports)
   */
  async findByDateRange(
    tenantId: string,
    userId: string,
    startDate: Date,
    endDate: Date,
    tx?: TX,
  ) {
    return this.client(tx).attendance.findMany({
      where: {
        tenantId,
        userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
        ...this.baseWhere(),
      },
      orderBy: { date: 'asc' },
    });
  }

  /**
   * Find unfinalized attendance records by date (for batch processing)
   */
  async findUnfinalizedByDate(date: Date, tx?: TX) {
    return this.client(tx).attendance.findMany({
      where: {
        date: { gte: new Date(date.toDateString()), lt: new Date(new Date(date).getTime() + 86400000) },
        isFinalStatus: false,
        ...this.baseWhere(),
      },
      include: {
        logs: { orderBy: { checkIn: 'asc' } },
        user: {
          select: {
            id: true,
            workingSchedule: {
              select: {
                fullDayMinimumMinutes: true,
                halfDayMinimumMinutes: true,
                lateMarkAfter: true,
                graceTimeInMinutes: true,
                timezone: true,
              },
            },
          },
        },
      },
    });
  }
}
