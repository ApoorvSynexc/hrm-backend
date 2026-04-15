import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma/prisma.service.js';
import { CreateTenantDto } from './dto/create-tenant.dto.js';
import { DEFAULT_ROLE_PERMISSIONS } from '../assets/default/index.js';

@Injectable()
export class TenantService {
  constructor(private prisma: PrismaService) {}

  async createTenant(dto: CreateTenantDto) {
    // Run entire operation in a transaction
    return await this.prisma.$transaction(async (tx) => {
      // 1. Create the tenant
      const newTenant = await tx.tenant.create({
        data: {
          name: dto.name,
          slug: dto.slug,
        },
      });

      // 2. Fetch system roles to copy (ADMIN, HR, RM, EMPLOYEE — exclude SUPER_ADMIN)
      const systemRolesToCopy = await tx.role.findMany({
        where: {
          tenantId: null,
          name: { in: ['ADMIN', 'HR', 'RM', 'EMPLOYEE'] },
        },
      });

      // 3. Fetch tenant-scoped permissions to copy
      // Exclude: all, tenant (all variants), user, role, permission (system-only perms)
      const permissionsToCopy = await tx.permission.findMany({
        where: {
          tenantId: null,
          subject: { notIn: ['all', 'tenant', 'user', 'role', 'permission'] },
        },
      });

      // 4. Create tenant-scoped copies of permissions
      const newPermissionMap = new Map<string, string>(); // key -> permissionId
      for (const perm of permissionsToCopy) {
        const newPerm = await tx.permission.create({
          data: {
            tenantId: newTenant.id,
            action: perm.action,
            subject: perm.subject,
            description: perm.description,
          },
        });
        const key = `${perm.action}:${perm.subject}`;
        newPermissionMap.set(key, newPerm.id);
      }

      // 5. Create tenant-scoped roles and link permissions
      for (const systemRole of systemRolesToCopy) {
        // Create tenant-scoped role
        const newRole = await tx.role.create({
          data: {
            tenantId: newTenant.id,
            name: systemRole.name,
            description: systemRole.description,
            isSystem: true,
          },
        });

        // Get role permissions from DEFAULT_ROLE_PERMISSIONS
        const defaultPermsForRole =
          DEFAULT_ROLE_PERMISSIONS[systemRole.name as keyof typeof DEFAULT_ROLE_PERMISSIONS];

        if (defaultPermsForRole && Array.isArray(defaultPermsForRole)) {
          for (const permKey of defaultPermsForRole) {
            const permissionId = newPermissionMap.get(permKey);

            if (permissionId) {
              // Only link if the permission exists in our tenant-scoped permissions
              await tx.rolePermission.create({
                data: {
                  tenantId: newTenant.id,
                  roleId: newRole.id,
                  permissionId,
                },
              });
            }
            // Skip system-only permissions that don't exist in newPermissionMap
          }
        }
      }

      return newTenant;
    });
  }
}
