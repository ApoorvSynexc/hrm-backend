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

  async findOne(where: Record<string, any>, tx?: TX) {
    return this.client(tx).workingSchedule.findUnique({
      where: {
        tenantId_name: {
          tenantId: where.tenantId,
          name: where.name,
        },
      },
    });
  }

  async find(where: Record<string, any>, tx?: TX) {
    return this.client(tx).workingSchedule.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  async findAll(where?: Record<string, any>, tx?: TX) {
    return this.client(tx).workingSchedule.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  async create(data: Record<string, any>, tx?: TX) {
    return this.client(tx).workingSchedule.create({ data: data as any });
  }

  async createMany(data: any[], tx?: TX) {
    return this.client(tx).workingSchedule.createMany({ data });
  }

  async update(
    where: Record<string, any>,
    data: Record<string, any>,
    tx?: TX,
  ) {
    return this.client(tx).workingSchedule.update({
      where: where as any,
      data: data as any,
    });
  }

  async upsert(
    where: Record<string, any>,
    data: Record<string, any>,
    tx?: TX,
  ) {
    return this.client(tx).workingSchedule.upsert({
      where: {
        tenantId_name: {
          tenantId: where.tenantId,
          name: where.name,
        },
      },
      update: data as any,
      create: data as any,
    });
  }

  async delete(where: Record<string, any>, tx?: TX) {
    return this.client(tx).workingSchedule.delete({
      where: where as any,
    });
  }
}
