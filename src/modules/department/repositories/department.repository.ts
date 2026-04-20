import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service.js';
import type { PrismaClient } from '../../../../generated/prisma/client.js'
import { Status } from '../../../../generated/prisma/client.js';

type TX = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

@Injectable()
export class DepartmentRepository {
  constructor(private prisma: PrismaService) {}

  private client(tx?: TX) {
    return tx ?? this.prisma;
  }

  /**
   * Find a single department by flexible where clause (excludes deleted)
   */
  async find(where: Record<string, any>, tx?: TX) {
    return this.client(tx).department.findFirst({
      where: {
        status: { not: Status.DELETED },
        ...where,
      },
    });
  }

  /**
   * Find all departments for a tenant (excluding deleted)
   */
  async findAll(where?: Record<string, any>, tx?: TX) {
    return this.client(tx).department.findMany({
      where: {
        status: { not: Status.DELETED },
        ...(where || {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Create a new department
   */
  async create(data: any, tx?: TX) {
    return this.client(tx).department.create({ data });
  }

  /**
   * Update a department
   */
  async update(id: string, data: any, tx?: TX) {
    return this.client(tx).department.update({
      where: { id },
      data,
    });
  }

  /**
   * Soft delete (set status to DELETED)
   */
  async softDelete(id: string, tx?: TX) {
    return this.client(tx).department.update({
      where: { id },
      data: { status: 'DELETED' },
    });
  }
}
