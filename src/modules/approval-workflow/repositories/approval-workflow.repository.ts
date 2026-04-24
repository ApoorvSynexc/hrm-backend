import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service.js';
import type { PrismaClient } from '../../../../generated/prisma/client.js';
import { Status } from '../../../../generated/prisma/client.js';

type TX = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

@Injectable()
export class ApprovalWorkflowRepository {
  constructor(private prisma: PrismaService) {}

  private client(tx?: TX) {
    return tx ?? this.prisma;
  }

  async find(where: Record<string, any>, tx?: TX) {
    return this.client(tx).approvalWorkflow.findFirst({
      where: { status: { not: Status.DELETED }, ...where },
      include: {
        steps: {
          orderBy: { stepNumber: 'asc' },
          include: {
            approverRole: { select: { id: true, name: true } },
            approverUser: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        },
      },
    });
  }

  async findAll(where?: Record<string, any>, tx?: TX) {
    return this.client(tx).approvalWorkflow.findMany({
      where: { status: { not: Status.DELETED }, ...(where || {}) },
      include: {
        steps: {
          orderBy: { stepNumber: 'asc' },
          include: {
            approverRole: { select: { id: true, name: true } },
            approverUser: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: any, tx?: TX) {
    return this.client(tx).approvalWorkflow.create({
      data,
      include: { steps: { orderBy: { stepNumber: 'asc' } } },
    });
  }

  async update(where: Record<string, any>, data: any, tx?: TX) {
    return this.client(tx).approvalWorkflow.update({
      where: where as any,
      data,
      include: { steps: { orderBy: { stepNumber: 'asc' } } },
    });
  }

  async clearDefaultForModule(tenantId: string, module: string, tx?: TX) {
    return this.client(tx).approvalWorkflow.updateMany({
      where: { tenantId, module: module as any, isDefault: true },
      data: { isDefault: false },
    });
  }
}
