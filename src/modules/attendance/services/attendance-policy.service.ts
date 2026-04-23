import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service.js';
import {
  CreateAttendancePolicyDto,
  UpdateAttendancePolicyDto,
  QueryAttendancePolicyDto,
} from '../dto/index.js';
import {
  Prisma,
  Status,
  AttendancePolicyType as PrismaAttendancePolicyType,
} from '../../../../generated/prisma/client.js';

@Injectable()
export class AttendancePolicyService {
  constructor(private prisma: PrismaService) {}

  private async ensureSingleActiveTenantPolicy(
    tenantId: string,
    excludePolicyId?: string,
  ) {
    const existingTenantPolicy = await this.prisma.attendancePolicy.findFirst({
      where: {
        tenantId,
        scopeLevel: 'TENANT',
        isActive: true,
        status: Status.ACTIVE,
        ...(excludePolicyId ? { id: { not: excludePolicyId } } : {}),
      },
      select: { id: true, name: true },
    });

    if (existingTenantPolicy) {
      throw new BadRequestException(
        `An active tenant attendance policy already exists: "${existingTenantPolicy.name}"`,
      );
    }
  }

  async createPolicy(tenantId: string, userId: string, dto: CreateAttendancePolicyDto) {
    const scopeLevel = dto.scopeLevel ?? 'TENANT';

    // Validate scope fields
    if (scopeLevel === 'DEPARTMENT' && !dto.departmentId) {
      throw new BadRequestException('departmentId is required for DEPARTMENT scope');
    }
    if (scopeLevel === 'ROLE' && !dto.roleId) {
      throw new BadRequestException('roleId is required for ROLE scope');
    }
    if (scopeLevel === 'USER' && !dto.userId) {
      throw new BadRequestException('userId is required for USER scope');
    }
    if (scopeLevel === 'TEAM' && !dto.teamId) {
      throw new BadRequestException('teamId is required for TEAM scope');
    }

    const isActive = dto.isActive ?? true;

    if (scopeLevel === 'TENANT' && isActive) {
      await this.ensureSingleActiveTenantPolicy(tenantId);
    }

    const data: Prisma.AttendancePolicyUncheckedCreateInput = this.sanitizePolicy({
      tenantId,
      name: dto.name,
      description: dto.description,
      scopeLevel,
      departmentId: dto.departmentId,
      roleId: dto.roleId,
      userId: dto.userId,
      teamId: dto.teamId,
      policyType: (dto.policyType ?? 'FLEXIBLE') as PrismaAttendancePolicyType,
      ipRanges: this.toInputJson(dto.ipRanges),
      radiusMeters: dto.radiusMeters ?? 100,
      wifiSsids: dto.wifiSsids,
      validFrom: dto.validFrom ? new Date(dto.validFrom) : new Date(),
      validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
      isActive,
      status: Status.ACTIVE,
      createdBy: userId,
    });

    return await this.prisma.attendancePolicy.create({ data });
  }

  async updatePolicy(tenantId: string, policyId: string, userId: string, dto: UpdateAttendancePolicyDto) {
    const policy = await this.prisma.attendancePolicy.findUnique({
      where: { id: policyId },
    });

    if (!policy || policy.tenantId !== tenantId) {
      throw new NotFoundException('Policy not found');
    }

    const nextIsActive = dto.isActive ?? policy.isActive;
    if (policy.scopeLevel === 'TENANT' && nextIsActive) {
      await this.ensureSingleActiveTenantPolicy(tenantId, policyId);
    }

    const data: Prisma.AttendancePolicyUncheckedUpdateInput = this.sanitizePolicy({
      name: dto.name,
      description: dto.description,
      policyType: dto.policyType as PrismaAttendancePolicyType | undefined,
      ipRanges: this.toInputJson(dto.ipRanges),
      radiusMeters: dto.radiusMeters,
      wifiSsids: dto.wifiSsids,
      validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
      isActive: dto.isActive,
      updatedBy: userId,
    });

    return await this.prisma.attendancePolicy.update({
      where: { id: policyId },
      data,
    });
  }

  async deletePolicy(tenantId: string, policyId: string) {
    const policy = await this.prisma.attendancePolicy.findUnique({
      where: { id: policyId },
    });

    if (!policy || policy.tenantId !== tenantId) {
      throw new NotFoundException('Policy not found');
    }

    return await this.prisma.attendancePolicy.delete({
      where: { id: policyId },
    });
  }

  async listPolicies(tenantId: string, query?: QueryAttendancePolicyDto) {
    const where: any = {
      tenantId,
      status: Status.ACTIVE,
    };

    if (query?.scopeLevel) where.scopeLevel = query.scopeLevel;
    if (query?.departmentId) where.departmentId = query.departmentId;
    if (query?.roleId) where.roleId = query.roleId;
    if (query?.userId) where.userId = query.userId;
    if (query?.teamId) where.teamId = query.teamId;
    if (query?.name) where.name = { contains: query.name, mode: 'insensitive' };

    return await this.prisma.attendancePolicy.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get policy for a specific user (policy resolution with hierarchy)
   * Hierarchy: USER > TEAM > ROLE > DEPARTMENT > TENANT
   */
  async getPolicyForUser(tenantId: string, userId: string) {
    const now = new Date();

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        department: true,
        role: true,
      },
    });

    if (!user || user.tenantId !== tenantId) {
      throw new NotFoundException('User not found');
    }

    // Fetch all active policies; resolution is determined by scope hierarchy.
    const policies = await this.prisma.attendancePolicy.findMany({
      where: {
        tenantId,
        isActive: true,
        status: Status.ACTIVE,
        validFrom: { lte: now },
        OR: [{ validUntil: null }, { validUntil: { gte: now } }],
      },
      orderBy: [{ validFrom: 'desc' }, { createdAt: 'desc' }],
    });

    // Check user-level policy first
    const userPolicy = policies.find((p) => p.scopeLevel === 'USER' && p.userId === userId);
    if (userPolicy) return userPolicy;

    // Check team-level policy (if needed, fetch teams separately)
    // For now, skip team level

    // Check role-level policy
    if (user.roleId) {
      const rolePolicy = policies.find((p) => p.scopeLevel === 'ROLE' && p.roleId === user.roleId);
      if (rolePolicy) return rolePolicy;
    }

    // Check department-level policy
    if (user.departmentId) {
      const deptPolicy = policies.find((p) => p.scopeLevel === 'DEPARTMENT' && p.departmentId === user.departmentId);
      if (deptPolicy) return deptPolicy;
    }

    // Fall back to tenant-level policy
    const tenantPolicy = policies.find((p) => p.scopeLevel === 'TENANT');
    if (tenantPolicy) return tenantPolicy;

    // If no policy exists, create and return default
    return await this.getDefaultPolicy(tenantId);
  }

  /**
   * Get or create default tenant policy
   */
  private async getDefaultPolicy(tenantId: string) {
    let policy = await this.prisma.attendancePolicy.findFirst({
      where: {
        tenantId,
        scopeLevel: 'TENANT',
        status: Status.ACTIVE,
      },
    });

    if (!policy) {
      policy = await this.prisma.attendancePolicy.create({
        data: {
          tenantId,
          name: 'Default Flexible Policy',
          scopeLevel: 'TENANT',
          policyType: 'FLEXIBLE',
          radiusMeters: 100,
          status: Status.ACTIVE,
        },
      });
    }

    return policy;
  }

  /**
   * Convert DTO objects to plain JSON for Prisma
   */
  private toInputJson(value: unknown): Prisma.InputJsonValue | undefined {
    if (value === undefined) {
      return undefined;
    }

    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }

  private sanitizePolicy<T extends Record<string, unknown>>(dto: T): T {
    const sanitized = { ...dto } as T;

    // Remove undefined fields
    (Object.keys(sanitized) as Array<keyof T>).forEach((key) => {
      if (sanitized[key] === undefined) {
        delete sanitized[key];
      }
    });

    return sanitized as T;
  }
}
