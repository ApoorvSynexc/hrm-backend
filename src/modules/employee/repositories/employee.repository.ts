import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service.js';
import { CounterRepository } from '../../../common/repositories/counter.repository.js';
import type { PrismaClient } from '../../../../generated/prisma/index.js';
import { Status } from '../../../../generated/prisma/index.js';

type TX = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

@Injectable()
export class EmployeeRepository {
  constructor(
    private prisma: PrismaService,
    private counterRepository: CounterRepository,
  ) {}

  private client(tx?: TX) {
    return tx ?? this.prisma;
  }

  /**
   * Find a single employee by flexible where clause (excludes deleted)
   * Example: find({ id: '123', tenantId: 'abc' }) or find({ employeeCode: 'EMP001' })
   */
  async find(
    where: Record<string, any>,
    include?: Record<string, any>,
    tx?: TX,
  ) {
    return this.client(tx).user.findFirst({
      where: { employeeCode: { not: null }, status: { not: Status.DELETED }, ...where },
      include: {
        role: true,
        department: true,
        ...(include && include),
      },
    });
  }

  /**
   * Find multiple employees with optional pagination and search
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
      ? { AND: [{ employeeCode: { not: null }, status: { not: Status.DELETED }, ...where }, searchWhere] }
      : { AND: [{ employeeCode: { not: null }, status: { not: Status.DELETED } }, searchWhere] };

    const [employees, total] = await Promise.all([
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
      data: employees,
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
   * Create a new employee
   */
  async create(data: any, tx?: TX) {
    return this.client(tx).user.create({
      data,
      include: { role: true, department: true },
    });
  }

  /**
   * Update employee by flexible where clause
   */
  async update(where: Record<string, any>, data: any, tx?: TX) {
    return this.client(tx).user.update({
      where: where as any,
      data,
      include: { role: true, department: true },
    });
  }

  /**
   * Delete employee by flexible where clause
   */
  async delete(where: Record<string, any>, tx?: TX) {
    return this.client(tx).user.delete({
      where: where as any,
    });
  }

  /**
   * Generate next employee code for a tenant (format: ORG001, ORG002, etc.)
   * Takes tenantId and tableName, fetches tenant name internally
   */
  async getNextEmployeeCode(tenantId: string, tableName: string, tx?: TX): Promise<string> {
    const tenant = await this.client(tx).tenant.findUnique({
      where: { id: tenantId },
      select: { name: true },
    });

    if (!tenant) {
      throw new Error('Tenant not found');
    }

    const prefix = tenant.name.substring(0, 3).toUpperCase();
    const nextSequence = await this.counterRepository.getNextSequence(tenantId, tableName, tx);

    return `${prefix}${String(nextSequence).padStart(3, '0')}`;
  }
}
