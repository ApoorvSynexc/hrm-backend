import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service.js';
import type { PrismaClient } from '../../../../generated/prisma/client.js';

type TX = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

@Injectable()
export class PermissionRepository {
  constructor(private prisma: PrismaService) {}

  private client(tx?: TX) {
    return tx ?? this.prisma;
  }

  /**
   * Find many permissions with optional filters
   */
  async findMany(where?: any, tx?: TX) {
    const baseWhere = where || {};
    return this.client(tx).permission.findMany({
      where: {
        AND: [
          baseWhere,
          {
            NOT: {
              OR: [
                { subject: 'tenant' },
                { subject: 'user' },
                { subject: 'all' },
              ],
            },
          },
        ],
      },
    });
  }
}
