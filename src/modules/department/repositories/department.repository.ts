import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service.js';
import type { PrismaClient } from '../../../../generated/prisma/index.js';

type TX = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

@Injectable()
export class DepartmentRepository {
  constructor(private prisma: PrismaService) {}

  private client(tx?: TX) {
    return tx ?? this.prisma;
  }

  /**
   * Find a department by tenant and ID (excludes deleted)
   */
  async findByTenantAndId(tenantId: string, id: string, tx?: TX) {
    return this.client(tx).department.findFirst({
      where: {
        id,
        tenantId,
        status: { not: 'DELETED' },
      },
    });
  }

  /**
   * Find a department by tenant and name (excludes deleted)
   */
  async findByTenantAndName(tenantId: string, name: string, tx?: TX) {
    return this.client(tx).department.findFirst({
      where: {
        tenantId,
        name,
        status: { not: 'DELETED' },
      },
    });
  }

  /**
   * Find all departments for a tenant (excluding deleted)
   */
  async findManyByTenant(tenantId: string, tx?: TX) {
    return this.client(tx).department.findMany({
      where: {
        tenantId,
        status: { not: 'DELETED' },
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
