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

  /**
   * Find many tenants with pagination and search
   */
  async findMany(
    options: {
      pagination?: boolean;
      limit?: number;
      page?: number;
      search?: string;
    },
    tx?: TX,
  ) {
    const {
      pagination = true,
      limit = 10,
      page = 1,
      search = '',
    } = options;

    const skip = pagination ? (page - 1) * limit : 0;
    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { slug: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [tenants, total] = await Promise.all([
      this.client(tx).tenant.findMany({
        where,
        include: {
          domains: {
            select: {
              domain: true,
            },
          }
        },
        skip: pagination ? skip : undefined,
        take: pagination ? limit : undefined,
        orderBy: { createdAt: 'desc' },
      }),
      this.client(tx).tenant.count({ where }),
    ]);

    const result: any = {
      data: tenants,
    };

    if (pagination) {
      result.meta = {
        totalRecords: total,
        totalPages: Math.ceil(total / limit),
        page,
        limit,
      };
    }

    return result;
  }
}
