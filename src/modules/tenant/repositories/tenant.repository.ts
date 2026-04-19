import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service.js';
import type { PrismaClient } from '../../../../generated/prisma/index.js'
import { Status } from '../../../../generated/prisma/index.js';

type TX = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

@Injectable()
export class TenantRepository {
  constructor(private prisma: PrismaService) {}

  private client(tx?: TX) {
    return tx ?? this.prisma;
  }

  /**
   * Find a single tenant by flexible where clause (excludes deleted)
   * Example: find({ id: '123' }) or find({ slug: 'acme' })
   */
  async find(
    where: Record<string, any>,
    include?: Record<string, any>,
    tx?: TX,
  ) {
    return this.client(tx).tenant.findFirst({
      where: { status: { not: Status.DELETED }, ...where },
      ...(include && { include }),
    });
  }

  /**
   * Find multiple tenants with optional pagination and search (excludes deleted)
   */
  async findAll(
    where?: Record<string, any>,
    options?: {
      pagination?: boolean;
      limit?: number;
      page?: number;
      search?: string;
    },
    include?: Record<string, any>,
    tx?: TX,
  ) {
    const {
      pagination = true,
      limit = 10,
      page = 1,
      search = '',
    } = options || {};

    const skip = pagination ? (page - 1) * limit : 0;

    // Build where clause combining provided where and search
    const searchWhere = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { slug: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const finalWhere = where
      ? { AND: [{ status: { not: Status.DELETED } }, where, searchWhere] }
      : { AND: [{ status: { not: Status.DELETED } }, searchWhere] };

    const [tenants, total] = await Promise.all([
      this.client(tx).tenant.findMany({
        where: finalWhere,
        include: {
          domains: {
            select: {
              id: true,
              domain: true,
              createdAt: true,
            },
          },
          ...(include && include),
        },
        skip: pagination ? skip : undefined,
        take: pagination ? limit : undefined,
        orderBy: { createdAt: 'desc' },
      }),
      this.client(tx).tenant.count({
        where: finalWhere,
      }),
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

  /**
   * Create a new tenant
   */
  async create(data: any, tx?: TX) {
    return this.client(tx).tenant.create({
      data,
    });
  }

  /**
   * Update tenant by flexible where clause
   */
  async update(where: Record<string, any>, data: any, tx?: TX) {
    return this.client(tx).tenant.update({
      where: where as any,
      data,
    });
  }

  /**
   * Delete tenant by flexible where clause
   */
  async delete(where: Record<string, any>, tx?: TX) {
    return this.client(tx).tenant.delete({
      where: where as any,
    });
  }
}
