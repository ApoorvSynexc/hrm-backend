import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import { UserRepository } from '../account/repositories/user.repository.js';
import { EmployeeRepository } from '../employee/repositories/employee.repository.js';
import { CounterRepository } from '../../common/repositories/counter.repository.js';
import { TenantRepository } from './repositories/index.js';
import {
  RoleRepository,
  PermissionRepository,
  RolePermissionRepository,
} from '../role/repositories/index.js';
import { CreateTenantDto } from './dto/create-tenant.dto.js';
import { DEFAULT_ROLE_PERMISSIONS, DEFAULT_ROLES } from '../../assets/default/index.js';
import bcrypt from 'bcrypt';

@Injectable()
export class TenantService {
  constructor(
    private prisma: PrismaService,
    private tenantRepository: TenantRepository,
    private roleRepository: RoleRepository,
    private permissionRepository: PermissionRepository,
    private rolePermissionRepository: RolePermissionRepository,
    private userRepository: UserRepository,
    private employeeRepository: EmployeeRepository,
    private counterRepository: CounterRepository,
  ) {}

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
   * Generate unique tenant slug using counter table
   * Pattern: base-slug or base-slug-{counter}
   * Example: "acme", "acme-1", "acme-2", etc.
   */
  private async generateUniqueSlug(
    baseSlug: string,
    tenantId: string,
    tx?: any
  ): Promise<string> {
    // First try: check if base slug is available
    const existingBase = await this.prisma.tenant.findFirst({
      where: { slug: baseSlug },
    });
    if (!existingBase) {
      return baseSlug;
    }

    // If base slug taken, use counter to generate unique variant
    const nextNum = await this.counterRepository.getNextSequence(
      tenantId,
      'slug-variant',
      tx
    );

    return `${baseSlug}-${nextNum}`;
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
    const existingAdmin = await this.userRepository.find({
      email: dto.adminEmail,
    });
    if (existingAdmin) {
      throw new BadRequestException(
        `Admin email "${dto.adminEmail}" is already registered in another tenant`,
      );
    }

    // 2. Generate base slug from name
    const baseSlug = this.generateSlug(dto.name);

    // 3. Determine domain: use provided or extract from admin email
    const domain = dto.domain || this.extractDomain(dto.adminEmail);
    if (!domain) {
      throw new BadRequestException('Could not determine tenant domain');
    }

    // 4. Verify domain doesn't already exist (on active tenants only)
    const existingDomain = await this.prisma.tenantDomain.findFirst({
      where: {
        domain,
        tenant: { status: { not: 'DELETED' } },
      },
    });
    if (existingDomain) {
      throw new BadRequestException(
        `Domain "${domain}" is already registered to another tenant`,
      );
    }

    // Run entire operation in a transaction
    return await this.prisma.$transaction(
      async (tx) => {
        // 1. Create the tenant WITHOUT slug first
        const newTenant = await tx.tenant.create({
          data: {
            name: dto.name,
            domains: {
              create: [{ domain }],
            },
          },
        });

        // 2. Generate unique slug using counter with tenant ID
        const uniqueSlug = await this.generateUniqueSlug(baseSlug, newTenant.id, tx);

        // 3. Update tenant with the unique slug
        await tx.tenant.update({
          where: { id: newTenant.id },
          data: { slug: uniqueSlug },
        });
        newTenant.slug = uniqueSlug;

        // 4. Create default FLEXIBLE attendance policy for the new tenant
        await tx.attendancePolicy.create({
          data: {
            tenantId: newTenant.id,
            name: 'Default Flexible Policy',
            scopeLevel: 'TENANT',
            policyType: 'FLEXIBLE',
            radiusMeters: 100,
            status: 'ACTIVE',
          },
        });

      // 2. Get tenant roles from constants (exclude SUPER_ADMIN which is global-only)
      const tenantRolesToCreate = DEFAULT_ROLES.filter(
        (role) => role.name !== 'SUPER_ADMIN',
      );

      // 3. Fetch global permissions
      // Exclude: all, user (system-only perms that should not be mapped to tenant roles)
      const globalPermissions = await this.permissionRepository.findMany(
        {
          subject: { notIn: ['all', 'user'] },
        },
        tx,
      );

      // 4. Build a map of global permissions for quick lookup
      const globalPermissionMap = new Map<string, string>(); // key -> permissionId
      for (const perm of globalPermissions) {
        const key = `${perm.action}:${perm.subject}`;
        globalPermissionMap.set(key, perm.id);
      }

      // 5. Create tenant-scoped roles and map them to global permissions
      for (const roleDefinition of tenantRolesToCreate) {
        // Create tenant-scoped role
        const newRole = await this.roleRepository.create(
          {
            tenantId: newTenant.id,
            name: roleDefinition.name,
            description: roleDefinition.description,
            isSystem: true,
          },
          tx,
        );

        // Get role permissions from DEFAULT_ROLE_PERMISSIONS
        const defaultPermsForRole =
          DEFAULT_ROLE_PERMISSIONS[roleDefinition.name as keyof typeof DEFAULT_ROLE_PERMISSIONS];

        if (defaultPermsForRole && Array.isArray(defaultPermsForRole)) {
          // For non-ADMIN roles, filter out create/update/delete/manage for role and permission
          const permissionsToAssign = roleDefinition.name === 'ADMIN'
            ? defaultPermsForRole
            : defaultPermsForRole.filter((perm) => {
                // Allow read permissions for role and permission
                if (perm === 'read:role') {
                  return true;
                }
                // Block all other role and permission management
                return !perm.includes(':role') && !perm.includes(':permission');
              });

          for (const permKey of permissionsToAssign) {
            const permissionId = globalPermissionMap.get(permKey);

            if (permissionId) {
              // Map global permission to this tenant's role
              await this.rolePermissionRepository.create(
                {
                  tenantId: newTenant.id,
                  roleId: newRole.id,
                  permissionId, // Reference the global permission
                },
                tx,
              );
            }
            // Skip permissions that don't exist in globalPermissionMap
          }
        }
      }

      // 6. Create initial admin user
      const adminRole = await this.roleRepository.find(
        { tenantId: newTenant.id, name: 'ADMIN' },
        tx,
      );

      if (!adminRole) {
        throw new BadRequestException('ADMIN role not found for tenant');
      }

      const passwordHash = await bcrypt.hash(dto.adminPassword, 10);
      const adminEmployeeCode = await this.employeeRepository.getNextEmployeeCode(
        newTenant.id,
        'employee',
        tx,
      );
      const createdUser = await this.userRepository.create(
        {
          email: dto.adminEmail,
          passwordHash,
          firstName: 'Admin',
          lastName: 'User',
          employeeCode: adminEmployeeCode,
          tenantId: newTenant.id,
          roleId: adminRole.id,
          status: 'ACTIVE',
        },
        tx,
      );

      const adminUser: { id: string; email: string } = {
        id: createdUser.id,
        email: createdUser.email,
      };

      return {
        tenantId: newTenant.id,
        adminUser,
      };
      },
      {
        timeout: 60000,
      }
    );
  }

  /**
   * Update tenant details (name, logo, domains)
   */
  async updateTenant(tenantId: string, dto: any) {
    // Validate tenant exists
    const tenant = await this.tenantRepository.find({ id: tenantId });
    if (!tenant) {
      throw new BadRequestException('Tenant not found');
    }

    // Update name if provided
    if (dto.name) {
      await this.tenantRepository.update({ id: tenantId }, { name: dto.name });
    }

    // Update logo if provided
    if (dto.logo) {
      await this.tenantRepository.update({ id: tenantId }, { logo: dto.logo });
    }

    // Update domains if provided
    if (dto.domains && Array.isArray(dto.domains) && dto.domains.length > 0) {
      await this.prisma.$transaction(async (tx) => {
        // Delete existing domains
        await tx.tenantDomain.deleteMany({
          where: { tenantId },
        });

        // Create new domains
        for (const domain of dto.domains) {
          const existingDomain = await tx.tenantDomain.findUnique({
            where: { domain },
          });
          if (existingDomain && existingDomain.tenantId !== tenantId) {
            throw new BadRequestException(
              `Domain "${domain}" is already registered to another tenant`,
            );
          }

          await tx.tenantDomain.create({
            data: {
              domain,
              tenantId,
            },
          });
        }
      });
    }

    // Return updated tenant
    return this.tenantRepository.find(
      { id: tenantId },
      {
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
      }
    );
  }

  async listTenants(options: {
    pagination?: boolean;
    limit?: number;
    page?: number;
    search?: string;
  }) {
    return await this.tenantRepository.findAll(undefined, options);
  }

  async deleteTenant(tenantId: string) {
    const tenant = await this.tenantRepository.find({ id: tenantId });
    if (!tenant) {
      throw new BadRequestException('Tenant not found');
    }

    await this.prisma.$transaction(async (tx) => {
      // Soft delete all users
      await tx.user.updateMany({
        where: { tenantId },
        data: { status: 'DELETED' },
      });

      // Soft delete all roles
      await tx.role.updateMany({
        where: { tenantId },
        data: { status: 'DELETED' },
      });

      // Soft delete all departments
      await tx.department.updateMany({
        where: { tenantId },
        data: { status: 'DELETED' },
      });

      // Soft delete all leaves
      await tx.leave.updateMany({
        where: { tenantId },
        data: { recordStatus: 'DELETED' },
      });

      // Soft delete all payrolls
      await tx.payroll.updateMany({
        where: { tenantId },
        data: { recordStatus: 'DELETED' },
      });

      // Delete refresh tokens
      await tx.refreshToken.deleteMany({
        where: { tenantId },
      });

      // Delete role permissions
      await tx.rolePermission.deleteMany({
        where: { tenantId },
      });

      // Delete tenant domains
      await tx.tenantDomain.deleteMany({
        where: { tenantId },
      });

      // Delete working schedules
      await tx.workingSchedule.deleteMany({
        where: { tenantId },
      });

      // Delete holidays
      await tx.holiday.deleteMany({
        where: { tenantId },
      });

      // Delete leave balances
      await tx.leaveBalance.deleteMany({
        where: { tenantId },
      });

      // Delete counters
      await tx.counter.deleteMany({
        where: { tenantId },
      });

      // Delete attendances
      await tx.attendance.deleteMany({
        where: { tenantId },
      });

      // Delete attendance regularizations
      await tx.attendanceRegularization.deleteMany({
        where: { tenantId },
      });

      // Delete attendance policies
      await tx.attendancePolicy.deleteMany({
        where: { tenantId },
      });

      // Soft delete the tenant itself
      await tx.tenant.update({
        where: { id: tenantId },
        data: { status: 'DELETED' },
      });
    });
  }

  /**
   * Get tenant configuration (name, logo, office location, attendance policy)
   */
  async getConfig(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        logo: true,
        officeLatitude: true,
        officeLogitude: true,
        officeAddress: true,
      },
    });

    if (!tenant) {
      throw new BadRequestException('Tenant not found');
    }

    // Fetch default attendance policy for tenant
    const policy = await this.prisma.attendancePolicy.findFirst({
      where: {
        tenantId,
        scopeLevel: 'TENANT',
      },
    });

    return {
      tenant: {
        id: tenant.id,
        name: tenant.name,
        logo: tenant.logo,
        officeLocation: {
          latitude: tenant.officeLatitude,
          longitude: tenant.officeLogitude,
          address: tenant.officeAddress,
        },
      },
      attendancePolicy: policy
        ? {
            policyType: policy.policyType,
            radiusMeters: policy.radiusMeters,
            ipRanges: policy.ipRanges,
            wifiSsids: policy.wifiSsids,
            status: policy.status,
          }
        : null,
    };
  }
}
