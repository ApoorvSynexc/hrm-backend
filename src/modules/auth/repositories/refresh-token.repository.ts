import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service.js';
import type { PrismaClient } from '../../../../generated/prisma/index.js';

type TX = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

@Injectable()
export class RefreshTokenRepository {
  constructor(private prisma: PrismaService) {}

  private client(tx?: TX) {
    return tx ?? this.prisma;
  }

  /**
   * Find a refresh token by ID
   */
  async findById(id: string, tx?: TX) {
    return this.client(tx).refreshToken.findUnique({
      where: { id },
    });
  }

  /**
   * Create a new refresh token
   */
  async create(data: any, tx?: TX) {
    return this.client(tx).refreshToken.create({
      data,
    });
  }

  /**
   * Revoke a refresh token by setting revokedAt
   */
  async revoke(id: string, tx?: TX) {
    return this.client(tx).refreshToken.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }
}
