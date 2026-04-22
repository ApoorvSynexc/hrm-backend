import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service.js';
import {
  CreateAttendancePolicyDto,
  UpdateAttendancePolicyDto,
} from '../dto/index.js';
import { Status } from '../../../../generated/prisma/client.js';

@Injectable()
export class AttendancePolicyService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get attendance policy for a tenant
   */
  async getPolicyByTenantId(tenantId: string) {
    const policy = await this.prisma.attendancePolicy.findUnique({
      where: { tenantId },
    });

    if (!policy) {
      throw new NotFoundException('Attendance policy not found for this tenant');
    }

    return policy;
  }

  /**
   * Create or update attendance policy for a tenant
   */
  async upsertPolicy(tenantId: string, dto: CreateAttendancePolicyDto) {
    const data = this.sanitizePolicy(dto);
    return await this.prisma.attendancePolicy.upsert({
      where: { tenantId },
      create: {
        tenantId,
        ...data,
      },
      update: data,
    });
  }

  /**
   * Update attendance policy
   */
  async updatePolicy(tenantId: string, dto: UpdateAttendancePolicyDto) {
    const policy = await this.getPolicyByTenantId(tenantId);
    const data = this.sanitizePolicy(dto);

    return await this.prisma.attendancePolicy.update({
      where: { id: policy.id },
      data,
    });
  }

  /**
   * Convert DTO objects to plain JSON for Prisma
   */
  private sanitizePolicy(dto: any) {
    const sanitized: any = { ...dto };

    if (sanitized.ipRanges && Array.isArray(sanitized.ipRanges)) {
      sanitized.ipRanges = JSON.parse(JSON.stringify(sanitized.ipRanges));
    }

    return sanitized;
  }

  /**
   * Get policy or create default flexible policy
   */
  async getPolicyOrDefault(tenantId: string) {
    let policy = await this.prisma.attendancePolicy.findUnique({
      where: { tenantId },
    });

    if (!policy) {
      policy = await this.prisma.attendancePolicy.create({
        data: {
          tenantId,
          policyType: 'FLEXIBLE',
          radiusMeters: 100,
          status: Status.ACTIVE,
        },
      });
    }

    return policy;
  }
}
