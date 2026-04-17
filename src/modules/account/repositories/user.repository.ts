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
   * Find a single user by flexible where clause
   * Example: find({ id: '123' }, include?) or find({ email: 'test@example.com' }, include?)
   */
  async find(
    where: Record<string, any>,
    include?: Record<string, any>,
    tx?: TX,
  ) {
    return this.client(tx).user.findFirst({
      where,
      include: {
        role: true,
        department: true,
        ...(include && include),
      },
    });
  }

  /**
   * Find a user by ID with role and permissions (includes all relationships)
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
        department: true,
      },
    });
  }

  /**
   * Find multiple users with optional pagination, filters, and search
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
            { firstName: { contains: search, mode: 'insensitive' as const } },
            { lastName: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
            { employeeCode: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const finalWhere = where
      ? { AND: [where, searchWhere] }
      : searchWhere;

    const [users, total] = await Promise.all([
      this.client(tx).user.findMany({
        where: Object.keys(finalWhere).length > 0 ? finalWhere : undefined,
        include: {
          role: true,
          department: true,
          tenant: { select: { id: true, name: true, slug: true } },
          ...(include && include),
        },
        skip: pagination ? skip : undefined,
        take: pagination ? limit : undefined,
        orderBy: { createdAt: 'desc' },
      }),
      this.client(tx).user.count({
        where: Object.keys(finalWhere).length > 0 ? finalWhere : undefined,
      }),
    ]);

    const result: any = {
      data: users,
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
   * Create a new user
   */
  async create(data: any, tx?: TX) {
    return this.client(tx).user.create({
      data,
      include: { role: true, department: true },
    });
  }

  /**
   * Update user by flexible where clause
   */
  async update(where: Record<string, any>, data: any, tx?: TX) {
    return this.client(tx).user.update({
      where: where as any,
      data,
      include: { role: true, department: true },
    });
  }

  /**
   * Delete user by flexible where clause
   */
  async delete(where: Record<string, any>, tx?: TX) {
    return this.client(tx).user.delete({
      where: where as any,
    });
  }
}
