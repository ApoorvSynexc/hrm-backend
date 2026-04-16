import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service.js';
import type { PrismaClient } from '../../../../generated/prisma/index.js';

type TX = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

@Injectable()
export class TenantRepository {
  constructor(private prisma: PrismaService) {}

  private client(tx?: TX) {
    return tx ?? this.prisma;
  }

  /**
   * Find a tenant by slug
   */
  async findBySlug(slug: string, tx?: TX) {
    return this.client(tx).tenant.findUnique({
      where: { slug },
    });
  }

  /**
   * Find a tenant by ID
   */
  async findById(id: string, tx?: TX) {
    return this.client(tx).tenant.findUnique({
      where: { id },
    });
  }

  /**
   * Find a tenant by ID with domains and roles included
   */
  async findByIdWithDetails(id: string, tx?: TX) {
    return this.client(tx).tenant.findUnique({
      where: { id },
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
  }

  /**
   * Create a new tenant
   */
  async create(data: any, tx?: TX) {
    return this.client(tx).tenant.create({
      data,
    });
  }

  /**
   * Update tenant details
   */
  async update(id: string, data: any, tx?: TX) {
    return this.client(tx).tenant.update({
      where: { id },
      data,
    });
  }
}
