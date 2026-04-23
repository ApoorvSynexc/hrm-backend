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

  async findOpenLog(attendanceId: string, tx?: TX) {
    return this.client(tx).attendanceLog.findFirst({
      where: { attendanceId, checkOut: null },
      orderBy: { checkIn: 'desc' },
    });
  }

  async findAllByAttendance(attendanceId: string, tx?: TX) {
    return this.client(tx).attendanceLog.findMany({
      where: { attendanceId },
      orderBy: { checkIn: 'asc' },
    });
  }

  async create(data: any, tx?: TX) {
    return this.client(tx).attendanceLog.create({ data });
  }

  async update(id: string, data: any, tx?: TX) {
    return this.client(tx).attendanceLog.update({ where: { id }, data });
  }
}
