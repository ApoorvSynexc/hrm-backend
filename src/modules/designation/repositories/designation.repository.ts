import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service.js';
import type { PrismaClient } from '../../../../generated/prisma/client.js'
import { Status } from '../../../../generated/prisma/client.js';

type TX = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

@Injectable()
export class DesignationRepository {
  constructor(private prisma: PrismaService) {}

  private client(tx?: TX) {
    return tx ?? this.prisma;
  }

  /**
   * Find a designation by tenant and ID (excludes deleted)
   */
  async findByTenantAndId(tenantId: string, id: string, tx?: TX) {
    return this.client(tx).designation.findFirst({
      where: {
        id,
        tenantId,
        status: { not: Status.DELETED },
      },
    });
  }

  /**
   * Find a designation by tenant and name (excludes deleted)
   */
  async findByTenantAndName(tenantId: string, name: string, tx?: TX) {
    return this.client(tx).designation.findFirst({
      where: {
        tenantId,
        name,
        status: { not: Status.DELETED },
      },
    });
  }

  /**
   * Find all designations for a tenant (excluding deleted)
   */
  async findManyByTenant(tenantId: string, tx?: TX) {
    return this.client(tx).designation.findMany({
      where: {
        tenantId,
        status: { not: Status.DELETED },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Create a new designation
   */
  async create(data: any, tx?: TX) {
    return this.client(tx).designation.create({ data });
  }

  /**
   * Update a designation
   */
  async update(id: string, data: any, tx?: TX) {
    return this.client(tx).designation.update({
      where: { id },
      data,
    });
  }

  /**
   * Soft delete (set status to DELETED)
   */
  async softDelete(id: string, tx?: TX) {
    return this.client(tx).designation.update({
      where: { id },
      data: { status: 'DELETED' },
    });
  }
}
