import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service.js';
import type { PrismaClient } from '../../../../generated/prisma/client.js';

type TX = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

@Injectable()
export class WorkingScheduleRepository {
  constructor(private prisma: PrismaService) {}

  private client(tx?: TX) {
    return tx ?? this.prisma;
  }

  async find(where: Record<string, any>, tx?: TX) {
    return this.client(tx).workingSchedule.findMany({
      where,
      orderBy: { day: 'asc' },
    });
  }

  async findAll(where?: Record<string, any>, tx?: TX) {
    return this.client(tx).workingSchedule.findMany({
      where,
      orderBy: [{ name: 'asc' }, { day: 'asc' }],
    });
  }

  async createMany(data: any[], tx?: TX) {
    return this.client(tx).workingSchedule.createMany({ data });
  }

  async delete(where: Record<string, any>, tx?: TX) {
    return this.client(tx).workingSchedule.deleteMany({ where });
  }
}
