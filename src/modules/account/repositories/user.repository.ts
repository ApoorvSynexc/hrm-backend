import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service.js';
import type { PrismaClient } from '../../../../generated/prisma/client.js';
import { Status } from '../../../../generated/prisma/client.js';

type TX = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

@Injectable()
export class UserRepository {
  constructor(private prisma: PrismaService) {}

  private client(tx?: TX) {
    return tx ?? this.prisma;
  }

  /**
   * Find a single user by flexible where clause (excludes deleted)
   * Example: find({ id: '123' }, include?) or find({ email: 'test@example.com' }, include?)
   */
  async find(
    where: Record<string, any>,
    include?: Record<string, any>,
    tx?: TX,
  ) {
    return this.client(tx).user.findFirst({
      where: { status: { not: Status.DELETED }, ...where },
      include: {
        role: true,
        department: true,
        ...(include && include),
      },
    });
  }

  /**
   * Find a user by ID with role and permissions (includes all relationships, excludes deleted)
   */
  async findByIdWithRole(id: string, tx?: TX) {
    return this.client(tx).user.findFirst({
      where: { id, status: { not: Status.DELETED } },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: { permission: true },
            },
          },
        },
        department: true,
        contact: {
          include: {
            mobileNumber: true,
          },
        },
      },
    });
  }

  /**
   * Find multiple users with optional pagination, filters, and search (excludes deleted)
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
      ? { AND: [where, { status: { not: Status.DELETED } }, searchWhere] }
      : { AND: [{ status: { not: Status.DELETED } }, searchWhere] };

    const [users, total] = await Promise.all([
      this.client(tx).user.findMany({
        where: finalWhere,
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
        where: finalWhere,
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
      include: {
        role: true,
        department: true,
        contact: {
          include: {
            mobileNumber: true,
          },
        },
      },
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
