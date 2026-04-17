import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service.js';
import type { PrismaClient } from '../../../../generated/prisma/index.js';

type TX = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

@Injectable()
export class UserRepository {
  constructor(private prisma: PrismaService) {}

  private client(tx?: TX) {
    return tx ?? this.prisma;
  }

  /**
   * Find a SUPER_ADMIN user (tenantId = null) by email
   */
  async findSuperAdmin(email: string, tx?: TX) {
    return this.client(tx).user.findFirst({
      where: { tenantId: null, email },
      include: { role: true },
    });
  }

  /**
   * Find a user by tenant and email, includes role
   */
  async findByTenantAndEmail(tenantId: string, email: string, tx?: TX) {
    return this.client(tx).user.findFirst({
      where: { tenantId, email },
      include: { role: true },
    });
  }

  /**
   * Find a user by ID with role and permissions (no tenant filter)
   */
  async findByIdWithRole(id: string, tx?: TX) {
    return this.client(tx).user.findUnique({
      where: { id },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: { permission: true },
            },
          },
        },
      },
    });
  }

  /**
   * Find a user by tenant and ID, includes role and department
   */
  async findByTenantAndId(tenantId: string, userId: string, tx?: TX) {
    return this.client(tx).user.findFirst({
      where: { id: userId, tenantId },
      include: { role: true, department: true },
    });
  }

  /**
   * Find a user by employee code in a tenant
   */
  async findByEmployeeCode(tenantId: string, employeeCode: string, tx?: TX) {
    return this.client(tx).user.findFirst({
      where: { tenantId, employeeCode },
    });
  }

  /**
   * Find many users in a tenant with optional filters
   */
  async findManyByTenant(tenantId: string, where?: any, tx?: TX) {
    return this.client(tx).user.findMany({
      where: { tenantId, ...where },
      include: { role: true, department: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Generic findFirst with custom where clause
   */
  async findFirst(where: any, tx?: TX) {
    return this.client(tx).user.findFirst({ where });
  }

  /**
   * Create a new user
   */
  async create(data: any, tx?: TX) {
    return this.client(tx).user.create({
      data,
      include: { role: true, department: true },
    });
  }

  /**
   * Update a user
   */
  async update(id: string, data: any, tx?: TX) {
    return this.client(tx).user.update({
      where: { id },
      data,
      include: { role: true, department: true },
    });
  }
}
