import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service.js';
import type { PrismaClient } from '../../../../generated/prisma/client.js'
import { Status } from '../../../../generated/prisma/client.js';

type TX = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

@Injectable()
export class RolePermissionRepository {
  constructor(private prisma: PrismaService) {}

  private client(tx?: TX) {
    return tx ?? this.prisma;
  }

  /**
   * Find role permissions with included permission details (excludes deleted roles)
   * Used by PermissionsGuard to check user permissions
   */
  async findManyWithPermission(tenantId: string | null, roleName: string, tx?: TX) {
    return this.client(tx).rolePermission.findMany({
      where: {
        tenantId,
        role: {
          name: roleName,
          status: { not: Status.DELETED },
        },
      },
      include: {
        permission: true,
      },
    });
  }

  /**
   * Create a new role permission mapping
   */
  async create(data: any, tx?: TX) {
    return this.client(tx).rolePermission.create({
      data,
    });
  }

  /**
   * Find role permission by role and permission
   */
  async findByRoleAndPermission(tenantId: string, roleId: string, permissionId: string, tx?: TX) {
    return this.client(tx).rolePermission.findUnique({
      where: {
        tenantId_roleId_permissionId: {
          tenantId,
          roleId,
          permissionId,
        },
      },
    });
  }

  /**
   * Find all permissions assigned to a role
   */
  async findManyByRole(tenantId: string, roleId: string, tx?: TX) {
    return this.client(tx).rolePermission.findMany({
      where: {
        tenantId,
        roleId,
      },
      include: {
        permission: true,
      },
    });
  }

  /**
   * Delete role permission by role and permission
   */
  async deleteByRoleAndPermission(tenantId: string, roleId: string, permissionId: string, tx?: TX) {
    return this.client(tx).rolePermission.deleteMany({
      where: {
        tenantId,
        roleId,
        permissionId,
      },
    });
  }
}
