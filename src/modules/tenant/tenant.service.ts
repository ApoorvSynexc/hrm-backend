import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import { UserRepository } from '../account/repositories/user.repository.js';
import {
  TenantRepository,
  RoleRepository,
  PermissionRepository,
  RolePermissionRepository,
  WorkingHoursRepository,
  WorkingDayRepository,
} from './repositories/index.js';
import { CreateTenantDto } from './dto/create-tenant.dto.js';
import { ConfigureWorkingHoursDto, ConfigureWorkingDaysDto } from './dto/configure-working-hours.dto.js';
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
    private workingHoursRepository: WorkingHoursRepository,
    private workingDayRepository: WorkingDayRepository,
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
   * Ensure slug is unique by appending a number if needed
   */
  private async ensureUniqueSlug(baseSlug: string): Promise<string> {
    let slug = baseSlug;
    let counter = 1;

    while (await this.tenantRepository.find({ slug })) {
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
    const existingAdmin = await this.userRepository.findFirst({
      email: dto.adminEmail,
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
    return await this.prisma.$transaction(
      async (tx) => {
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

      // 2. Get tenant roles from constants (exclude SUPER_ADMIN which is global-only)
      const tenantRolesToCreate = DEFAULT_ROLES.filter(
        (role) => role.name !== 'SUPER_ADMIN',
      );

      // 3. Fetch global permissions
      // Exclude: all, user, role, permission (system-only perms that should not be mapped to tenant roles)
      const globalPermissions = await this.permissionRepository.findMany(
        {
          subject: { notIn: ['all', 'user', 'role', 'permission'] },
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
          for (const permKey of defaultPermsForRole) {
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
            // Skip system-only permissions that don't exist in globalPermissionMap
          }
        }
      }

      // 6. Create initial admin user
      const adminRole = await this.roleRepository.findFirstByTenantAndName(
        newTenant.id,
        'ADMIN',
        tx,
      );

      if (!adminRole) {
        throw new BadRequestException('ADMIN role not found for tenant');
      }

      const passwordHash = await bcrypt.hash(dto.adminPassword, 10);
      const createdUser = await this.userRepository.create(
        {
          email: dto.adminEmail,
          passwordHash,
          firstName: 'Admin',
          lastName: 'User',
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
      },
      {
        timeout: 10000,
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

  async configureWorkingHours(tenantId: string, dto: ConfigureWorkingHoursDto) {
    const tenant = await this.tenantRepository.find({ id: tenantId });
    if (!tenant) {
      throw new BadRequestException('Tenant not found');
    }

    return await this.workingHoursRepository.upsert(tenantId, {
      workingHoursPerDay: dto.workingHoursPerDay,
    });
  }

  async configureWorkingDays(tenantId: string, dto: ConfigureWorkingDaysDto) {
    const tenant = await this.tenantRepository.find({ id: tenantId });
    if (!tenant) {
      throw new BadRequestException('Tenant not found');
    }

    const validDays = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
    for (const day of dto.workingDays) {
      if (!validDays.includes(day)) {
        throw new BadRequestException(`Invalid day: ${day}. Must be one of: ${validDays.join(', ')}`);
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await this.workingDayRepository.deleteByTenant(tenantId, tx);

      const workingDaysData = validDays.map((day) => ({
        tenantId,
        day,
        isWorking: dto.workingDays.includes(day),
      }));

      await this.workingDayRepository.createMany(workingDaysData, tx);
    });

    return await this.workingDayRepository.findByTenantId(tenantId);
  }

  async getWorkingHoursConfig(tenantId: string) {
    return await this.workingHoursRepository.findByTenantId(tenantId);
  }

  async getWorkingDaysConfig(tenantId: string) {
    return await this.workingDayRepository.findByTenantId(tenantId);
  }

  async listTenants(options: {
    pagination?: boolean;
    limit?: number;
    page?: number;
    search?: string;
  }) {
    return await this.tenantRepository.findAll(undefined, options);
  }
}
