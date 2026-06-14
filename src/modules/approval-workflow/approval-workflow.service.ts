import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import { ApprovalWorkflowRepository } from './repositories/index.js';
import { CreateWorkflowDto, UpdateWorkflowDto } from './dto/index.js';

@Injectable()
export class ApprovalWorkflowService {
  constructor(
    private workflowRepository: ApprovalWorkflowRepository,
    private prisma: PrismaService,
  ) {}

  async createWorkflow(tenantId: string, dto: CreateWorkflowDto) {
    const existing = await this.workflowRepository.find({ tenantId, name: dto.name });
    if (existing) {
      throw new BadRequestException(`Workflow named "${dto.name}" already exists`);
    }

    this.validateSteps(dto.steps);
    await this.validateStepApprovers(tenantId, dto.steps);

    return this.prisma.$transaction(async (tx) => {
      // If this is the new default, clear the old default for the same module
      if (dto.isDefault) {
        await this.workflowRepository.clearDefaultForModule(tenantId, dto.module, tx as any);
      }

      return this.workflowRepository.create(
        {
          tenantId,
          name: dto.name,
          module: dto.module,
          description: dto.description,
          isDefault: dto.isDefault ?? false,
          steps: {
            create: dto.steps.map((s) => ({
              stepNumber: s.stepNumber,
              approverType: s.approverType,
              approverRoleId: s.approverRoleId ?? null,
              approverUserId: s.approverUserId ?? null,
              actionMode: s.actionMode ?? 'INTIMATION_ONLY',
              escalationThresholdHours: s.escalationThresholdHours ?? null,
            })),
          },
        },
        tx as any,
      );
    });
  }

  async listWorkflows(tenantId: string, module?: string) {
    const where: any = { tenantId };
    if (module) where.module = module;
    return this.workflowRepository.findAll(where);
  }

  async getWorkflow(tenantId: string, id: string) {
    const workflow = await this.workflowRepository.find({ tenantId, id });
    if (!workflow) throw new NotFoundException('Approval workflow not found');
    return workflow;
  }

  async updateWorkflow(tenantId: string, id: string, dto: UpdateWorkflowDto) {
    await this.getWorkflow(tenantId, id);

    if (dto.name) {
      const duplicate = await this.workflowRepository.find({ tenantId, name: dto.name });
      if (duplicate && duplicate.id !== id) {
        throw new BadRequestException(`Workflow named "${dto.name}" already exists`);
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const workflow = await this.workflowRepository.find({ tenantId, id }, tx as any);
      if (dto.isDefault) {
        await this.workflowRepository.clearDefaultForModule(tenantId, workflow!.module, tx as any);
      }
      return this.workflowRepository.update({ id }, dto, tx as any);
    });
  }

  async deleteWorkflow(tenantId: string, id: string) {
    const workflow = await this.getWorkflow(tenantId, id);

    if ((workflow as any).isSystem) {
      throw new BadRequestException('System-generated workflows cannot be deleted');
    }

    return this.prisma.$transaction(async (tx) => {
      await this.workflowRepository.update({ id }, { status: 'DELETED' }, tx as any);

      // If deleted workflow was the default, restore the system workflow as default
      if ((workflow as any).isDefault) {
        await this.workflowRepository.restoreSystemDefault(
          tenantId,
          (workflow as any).module,
          tx as any,
        );
      }

      return { id };
    });
  }

  async getDefaultWorkflow(tenantId: string, module: string) {
    return this.workflowRepository.find({ tenantId, module, isDefault: true, status: 'ACTIVE' });
  }

  private validateSteps(steps: CreateWorkflowDto['steps']) {
    if (!steps || steps.length === 0) {
      throw new BadRequestException('Workflow must have at least one step');
    }
    const numbers = steps.map((s) => s.stepNumber);
    const unique = new Set(numbers);
    if (unique.size !== numbers.length) {
      throw new BadRequestException('Step numbers must be unique');
    }
    for (const step of steps) {
      if (step.approverType === 'ROLE' && !step.approverRoleId) {
        throw new BadRequestException(`Step ${step.stepNumber}: approverRoleId is required for ROLE type`);
      }
      if (step.approverType === 'SPECIFIC_USER' && !step.approverUserId) {
        throw new BadRequestException(`Step ${step.stepNumber}: approverUserId is required for SPECIFIC_USER type`);
      }
    }
  }

  private async validateStepApprovers(tenantId: string, steps: CreateWorkflowDto['steps']) {
    for (const step of steps) {
      if (step.approverRoleId) {
        const role = await this.prisma.role.findFirst({
          where: { id: step.approverRoleId, tenantId },
        });
        if (!role) {
          throw new BadRequestException(`Step ${step.stepNumber}: role not found in this tenant`);
        }
      }
      if (step.approverUserId) {
        const user = await this.prisma.user.findFirst({
          where: { id: step.approverUserId, tenantId, status: { not: 'DELETED' } },
        });
        if (!user) {
          throw new BadRequestException(`Step ${step.stepNumber}: user not found in this tenant`);
        }
      }
    }
  }
}
