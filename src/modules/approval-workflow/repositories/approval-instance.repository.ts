import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service.js';
import type { PrismaClient } from '../../../../generated/prisma/client.js';

type TX = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

@Injectable()
export class ApprovalInstanceRepository {
  constructor(private prisma: PrismaService) {}

  private client(tx?: TX) {
    return tx ?? this.prisma;
  }

  async findById(id: string, tx?: TX) {
    return this.client(tx).requestApprovalInstance.findUnique({
      where: { id },
      include: {
        stepInstances: {
          orderBy: { stepNumber: 'asc' },
          include: {
            step: {
              include: {
                approverRole: { select: { id: true, name: true } },
              },
            },
            approver: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        },
        workflow: { select: { id: true, name: true, module: true } },
      },
    });
  }

  async findByRequestId(requestId: string, tx?: TX) {
    return this.client(tx).requestApprovalInstance.findFirst({
      where: { requestId },
      include: {
        stepInstances: {
          orderBy: { stepNumber: 'asc' },
          include: {
            step: {
              include: {
                approverRole: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });
  }

  async create(data: any, tx?: TX) {
    return this.client(tx).requestApprovalInstance.create({ data });
  }

  async update(id: string, data: any, tx?: TX) {
    return this.client(tx).requestApprovalInstance.update({ where: { id }, data });
  }

  async createStepInstance(data: any, tx?: TX) {
    return this.client(tx).requestApprovalStepInstance.create({ data });
  }

  async updateStepInstance(id: string, data: any, tx?: TX) {
    return this.client(tx).requestApprovalStepInstance.update({ where: { id }, data });
  }

  async findPendingStepForApprover(tenantId: string, approverId: string, userRoleId: string) {
    return this.prisma.requestApprovalStepInstance.findMany({
      where: {
        status: 'PENDING',
        instance: { tenantId, status: 'IN_PROGRESS' },
        OR: [
          { approverId },
          {
            approverId: null,
            step: { approverType: 'ROLE', approverRoleId: userRoleId },
          },
        ],
      },
      include: {
        instance: {
          select: { id: true, module: true, requestId: true, currentStep: true },
        },
        step: {
          include: { approverRole: { select: { id: true, name: true } } },
        },
      },
    });
  }
}
