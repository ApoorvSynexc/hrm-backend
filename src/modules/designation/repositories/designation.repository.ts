import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service.js';
import type { PrismaClient } from '../../../../generated/prisma/client.js'
import { Status } from '../../../../generated/prisma/client.js';

type TX = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

@Injectable()
export class DesignationRepository {
  constructor(private prisma: PrismaService) {}

  private client(tx?: TX) {
    return tx ?? this.prisma;
  }

  /**
   * Find a designation by ID (excludes deleted)
   */
  async findById(id: string, tx?: TX) {
    return this.client(tx).designation.findFirst({
      where: {
        id,
        status: { not: Status.DELETED },
      },
    });
  }

  /**
   * Find a designation by name (excludes deleted)
   */
  async findByName(name: string, tx?: TX) {
    return this.client(tx).designation.findFirst({
      where: {
        name,
        status: { not: Status.DELETED },
      },
    });
  }

  /**
   * Find all designations (excluding deleted)
   */
  async findMany(tx?: TX) {
    return this.client(tx).designation.findMany({
      where: {
        status: { not: Status.DELETED },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Create a new designation
   */
  async create(data: any, tx?: TX) {
    return this.client(tx).designation.create({ data });
  }

  /**
   * Update a designation
   */
  async update(id: string, data: any, tx?: TX) {
    return this.client(tx).designation.update({
      where: { id },
      data,
    });
  }

  /**
   * Soft delete (set status to DELETED)
   */
  async softDelete(id: string, tx?: TX) {
    return this.client(tx).designation.update({
      where: { id },
      data: { status: 'DELETED' },
    });
  }
}
