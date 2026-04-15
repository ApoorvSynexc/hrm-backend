import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import { CreateTenantDto } from './dto/create-tenant.dto.js';
import { DEFAULT_ROLE_PERMISSIONS } from '../../assets/default/index.js';
import bcrypt from 'bcrypt';

@Injectable()
export class TenantService {
  constructor(private prisma: PrismaService) {}

  /**
   * Generate a slug from tenant name
   * Converts to lowercase, removes spaces and special chars, replaces with hyphens
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
  }

  /**
   * Ensure slug is unique by appending a number if needed
   */
  private async ensureUniqueSlug(baseSlug: string): Promise<string> {
    let slug = baseSlug;
    let counter = 1;

    while (await this.prisma.tenant.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }

  /**
   * Extract domain from email
   * e.g., "apoorv@google.com" → "google.com"
   */
  private extractDomain(email: string): string {
    const parts = email.split('@');
    return parts[1]?.toLowerCase() || '';
  }

  async createTenant(dto: CreateTenantDto) {
    // 1. Verify admin email doesn't already exist
    const existingAdmin = await this.prisma.user.findFirst({
      where: { email: dto.adminEmail },
    });
    if (existingAdmin) {
      throw new BadRequestException(
        `Admin email "${dto.adminEmail}" is already registered in another tenant`,
      );
    }

    // 2. Generate slug from name and ensure uniqueness
    const baseSlug = this.generateSlug(dto.name);
    const slug = await this.ensureUniqueSlug(baseSlug);

    // 3. Determine domain: use provided or extract from admin email
    const domain = dto.domain || this.extractDomain(dto.adminEmail);
    if (!domain) {
      throw new BadRequestException('Could not determine tenant domain');
    }

    // 4. Verify domain doesn't already exist
    const existingDomain = await this.prisma.tenantDomain.findUnique({
      where: { domain },
    });
    if (existingDomain) {
      throw new BadRequestException(
        `Domain "${domain}" is already registered to another tenant`,
      );
    }

    // Run entire operation in a transaction
    return await this.prisma.$transaction(async (tx) => {
      // 1. Create the tenant with domain
      const newTenant = await tx.tenant.create({
        data: {
          name: dto.name,
          slug,
          domains: {
            create: [{ domain }],
          },
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

      // 6. Create initial admin user
      const adminRole = await tx.role.findFirst({
        where: {
          tenantId: newTenant.id,
          name: 'ADMIN',
        },
      });

      if (!adminRole) {
        throw new BadRequestException('ADMIN role not found for tenant');
      }

      const passwordHash = await bcrypt.hash(dto.adminPassword, 10);
      const createdUser = await tx.user.create({
        data: {
          email: dto.adminEmail,
          passwordHash,
          tenantId: newTenant.id,
          roleId: adminRole.id,
          isActive: true,
        },
      });

      const adminUser: { id: string; email: string } = {
        id: createdUser.id,
        email: createdUser.email,
      };

      // 7. Fetch and return complete tenant with domains
      const completeTenant = await tx.tenant.findUnique({
        where: { id: newTenant.id },
        include: {
          domains: {
            select: {
              id: true,
              domain: true,
              createdAt: true,
            },
          },
          roles: {
            select: {
              id: true,
              name: true,
              description: true,
              isSystem: true,
            },
          },
        },
      });

      return {
        ...completeTenant,
        adminUser,
      };
    });
  }
}
