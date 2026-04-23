import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service.js';
import type { PrismaClient } from '../../../../generated/prisma/client.js';

type TX = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

@Injectable()
export class AttendanceLogRepository {
  constructor(private prisma: PrismaService) {}

  private client(tx?: TX) {
    return tx ?? this.prisma;
  }

  /**
   * Find a single log by flexible where clause
   */
  async find(where: Record<string, any>, tx?: TX) {
    return this.client(tx).attendanceLog.findFirst({
      where,
    });
  }

  /**
   * Find multiple logs with optional pagination
   */
  async findAll(
    where?: Record<string, any>,
    options?: {
      pagination?: boolean;
      limit?: number;
      page?: number;
    },
    tx?: TX,
  ) {
    const {
      pagination = false,
      limit = 10,
      page = 1,
    } = options || {};

    const skip = pagination ? (page - 1) * limit : 0;

    const [records, total] = await Promise.all([
      this.client(tx).attendanceLog.findMany({
        where: where || {},
        orderBy: { checkIn: 'asc' },
        skip: pagination ? skip : undefined,
        take: pagination ? limit : undefined,
      }),
      this.client(tx).attendanceLog.count({
        where: where || {},
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
   * Create a new log
   */
  async create(data: any, tx?: TX) {
    return this.client(tx).attendanceLog.create({ data });
  }

  /**
   * Update log by flexible where clause
   */
  async update(where: Record<string, any>, data: any, tx?: TX) {
    return this.client(tx).attendanceLog.update({ where: where as any, data });
  }

  /**
   * Find open log (no checkout) for an attendance record
   */
  async findOpenLog(attendanceId: string, tx?: TX) {
    return this.client(tx).attendanceLog.findFirst({
      where: { attendanceId, checkOut: null },
      orderBy: { checkIn: 'desc' },
    });
  }

  /**
   * Find logs by attendance ID with pagination
   */
  async findByAttendanceWithPagination(
    attendanceId: string,
    options?: { limit?: number; page?: number },
    tx?: TX,
  ) {
    const limit = options?.limit || 10;
    const page = options?.page || 1;
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      this.client(tx).attendanceLog.findMany({
        where: { attendanceId },
        orderBy: { checkIn: 'asc' },
        skip,
        take: limit,
      }),
      this.client(tx).attendanceLog.count({
        where: { attendanceId },
      }),
    ]);

    return {
      data: logs,
      meta: {
        totalRecords: total,
        totalPages: Math.ceil(total / limit),
        page,
        limit,
      },
    };
  }
}
