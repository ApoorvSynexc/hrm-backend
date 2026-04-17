import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import type { PrismaClient } from '../../../generated/prisma/index.js';

type TX = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

@Injectable()
export class CounterRepository {
  constructor(private prisma: PrismaService) {}

  private client(tx?: TX) {
    return tx ?? this.prisma;
  }

  /**
   * Get next sequence number for a counter
   * Auto-creates the counter if it doesn't exist
   * Returns the next incremented value
   */
  async getNextSequence(tenantId: string, counterName: string, tx?: TX): Promise<number> {
    const counter = await this.client(tx).counter.findFirst({
      where: { tenantId, name: counterName },
    });

    if (counter) {
      return await this.client(tx).counter.update({
        where: { id: counter.id },
        data: { count: { increment: 1 } },
      }).then(c => c.count);
    }

    const newCounter = await this.client(tx).counter.create({
      data: {
        tenantId,
        name: counterName,
        count: 1,
      },
    });

    return newCounter.count;
  }

  /**
   * Get current counter value without incrementing
   */
  async getCount(tenantId: string, counterName: string, tx?: TX): Promise<number | null> {
    const counter = await this.client(tx).counter.findFirst({
      where: { tenantId, name: counterName },
    });

    return counter?.count ?? null;
  }

  /**
   * Reset counter to initial value
   */
  async resetCounter(tenantId: string, counterName: string, tx?: TX): Promise<void> {
    const counter = await this.client(tx).counter.findFirst({
      where: { tenantId, name: counterName },
    });

    if (counter) {
      await this.client(tx).counter.update({
        where: { id: counter.id },
        data: { count: 0 },
      });
    } else {
      await this.client(tx).counter.create({
        data: {
          tenantId,
          name: counterName,
          count: 0,
        },
      });
    }
  }
}
