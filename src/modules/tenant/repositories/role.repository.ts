import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service.js';
import type { PrismaClient } from '../../../../generated/prisma/index.js';

type TX = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

@Injectable()
export class RoleRepository {
  constructor(private prisma: PrismaService) {}

  private client(tx?: TX) {
    return tx ?? this.prisma;
  }

  /**
   * Find a role by tenant and name
   */
  async findFirstByTenantAndName(tenantId: string | null, name: string, tx?: TX) {
    return this.client(tx).role.findFirst({
      where: { tenantId, name },
    });
  }

  /**
   * Create a new role
   */
  async create(data: any, tx?: TX) {
    return this.client(tx).role.create({
      data,
    });
  }
}
