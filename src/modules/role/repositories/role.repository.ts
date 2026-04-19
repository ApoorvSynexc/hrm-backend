import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service.js';
import type { PrismaClient } from '../../../../generated/prisma/client.js'
import { Status } from '../../../../generated/prisma/client.js';

type TX = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

@Injectable()
export class RoleRepository {
  constructor(private prisma: PrismaService) {}

  private client(tx?: TX) {
    return tx ?? this.prisma;
  }

  /**
   * Find a role by tenant and name (excludes deleted)
   */
  async findFirstByTenantAndName(tenantId: string | null, name: string, tx?: TX) {
    return this.client(tx).role.findFirst({
      where: { tenantId, name, status: { not: Status.DELETED } },
    });
  }

  /**
   * Create a new role
   */
  async create(data: any, tx?: TX) {
    return this.client(tx).role.create({
      data,
    });
  }

  /**
   * Find many roles for a tenant
   */
  async findManyByTenant(tenantId: string, tx?: TX) {
    return this.client(tx).role.findMany({
      where: { tenantId, status: 'ACTIVE' },
      include: {
        _count: { select: { rolePermissions: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Find a role by tenant and ID with permissions (excludes deleted)
   */
  async findByTenantAndId(tenantId: string, id: string, tx?: TX) {
    return this.client(tx).role.findFirst({
      where: { id, tenantId, status: { not: Status.DELETED } },
      include: {
        rolePermissions: {
          include: { permission: true },
        },
      },
    });
  }

  /**
   * Update a role
   */
  async update(id: string, data: any, tx?: TX) {
    return this.client(tx).role.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete a role
   */
  async delete(id: string, tx?: TX) {
    return this.client(tx).role.delete({
      where: { id },
    });
  }
}
