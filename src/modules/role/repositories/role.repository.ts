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
   * Find a single role by flexible where clause (excludes deleted)
   */
  async find(where: Record<string, any>, tx?: TX) {
    return this.client(tx).role.findFirst({
      where: {
        status: { not: Status.DELETED },
        ...where,
      },
      include: {
        rolePermissions: {
          include: { permission: true },
        },
        _count: { select: { rolePermissions: true } },
      },
    });
  }

  /**
   * Find all roles (excluding deleted) with flexible where clause
   */
  async findAll(where?: Record<string, any>, tx?: TX) {
    return this.client(tx).role.findMany({
      where: {
        status: { not: Status.DELETED },
        ...(where || {}),
      },
      include: {
        _count: { select: { rolePermissions: true } },
      },
      orderBy: { createdAt: 'desc' },
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
   * Update a role
   */
  async update(id: string, data: any, tx?: TX) {
    return this.client(tx).role.update({
      where: { id },
      data,
    });
  }

  /**
   * Hard delete a role
   */
  async delete(id: string, tx?: TX) {
    return this.client(tx).role.delete({
      where: { id },
    });
  }

  /**
   * Soft delete (set status to DELETED)
   */
  async softDelete(id: string, tx?: TX) {
    return this.client(tx).role.update({
      where: { id },
      data: { status: 'DELETED' },
    });
  }
}
