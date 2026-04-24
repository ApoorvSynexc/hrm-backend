import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import { ApprovalWorkflowRepository, ApprovalInstanceRepository } from './repositories/index.js';
import { ProcessStepDto } from './dto/index.js';

@Injectable()
export class ApprovalEngineService {
  constructor(
    private prisma: PrismaService,
    private workflowRepository: ApprovalWorkflowRepository,
    private instanceRepository: ApprovalInstanceRepository,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────────
  // PUBLIC API
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Start an approval instance for a new request.
   * Skippable steps with no resolved approver are immediately marked SKIPPED.
   * Returns instance ID, or null if no workflow configured (no approval required).
   */
  async startInstance(
    tenantId: string,
    module: 'REGULARIZATION' | 'LEAVE',
    requestId: string,
    requestorId: string,
    tx?: any,
  ): Promise<string | null> {
    const workflow = await this.workflowRepository.find(
      { tenantId, module, isDefault: true, status: 'ACTIVE' },
      tx,
    );

    if (!workflow || workflow.steps.length === 0) return null;

    const sortedSteps = [...workflow.steps].sort((a: any, b: any) => a.stepNumber - b.stepNumber);

    const instance = await this.instanceRepository.create(
      {
        tenantId,
        workflowId: workflow.id,
        module,
        requestId,
        currentStep: sortedSteps[0].stepNumber,
        status: 'IN_PROGRESS',
      },
      tx,
    );

    // Create all step instances as NOT_STARTED first, then activate
    for (const step of sortedSteps) {
      const approverId = await this.resolveApproverId(step, requestorId);
      await this.instanceRepository.createStepInstance(
        {
          instanceId: instance.id,
          stepId: step.id,
          stepNumber: step.stepNumber,
          approverId,
          status: 'NOT_STARTED',
        },
        tx,
      );
    }

    // Reload the instance with step instances to run activation
    const freshInstance = await this.instanceRepository.findById(instance.id, tx);
    const result = await this.activateNextStep(freshInstance!, 0, tx);

    if (result === 'ALL_SKIPPED') {
      // Nothing to approve — mark auto-approved
      await this.instanceRepository.update(instance.id, { status: 'APPROVED' }, tx);
    }

    return instance.id;
  }

  /**
   * Process a step (approve or reject) by the designated approver.
   * The caller's roleId is resolved from DB — only userId is required.
   */
  async processStep(
    tenantId: string,
    requestId: string,
    caller: { userId: string },
    dto: ProcessStepDto,
  ): Promise<{ outcome: 'IN_PROGRESS' | 'APPROVED' | 'REJECTED'; instanceId: string }> {
    const callerUser = await this.prisma.user.findUnique({
      where: { id: caller.userId },
      select: { roleId: true },
    });
    const callerWithRole = { userId: caller.userId, roleId: callerUser?.roleId ?? '' };

    const instance = await this.instanceRepository.findByRequestId(requestId);
    if (!instance) throw new NotFoundException('No approval instance found for this request');
    if (instance.tenantId !== tenantId) throw new ForbiddenException('Access denied');
    if (instance.status !== 'IN_PROGRESS') {
      throw new BadRequestException(`Approval is already ${(instance.status as string).toLowerCase()}`);
    }

    const currentSI = (instance.stepInstances as any[]).find(
      (si: any) => si.stepNumber === instance.currentStep && si.status === 'PENDING',
    );
    if (!currentSI) throw new BadRequestException('No pending step found for current workflow position');

    await this.validateCaller(currentSI, callerWithRole);

    return this.prisma.$transaction(async (tx) => {
      if (dto.action === 'REJECTED') {
        await this.instanceRepository.updateStepInstance(currentSI.id, {
          status: 'REJECTED',
          approverId: caller.userId,
          reviewedAt: new Date(),
          rejectionReason: dto.rejectionReason ?? null,
          comment: dto.comment ?? null,
        }, tx);
        await this.instanceRepository.update(instance.id, { status: 'REJECTED' }, tx);
        return { outcome: 'REJECTED' as const, instanceId: instance.id };
      }

      // Mark current step APPROVED
      await this.instanceRepository.updateStepInstance(currentSI.id, {
        status: 'APPROVED',
        approverId: caller.userId,
        reviewedAt: new Date(),
        comment: dto.comment ?? null,
      }, tx);

      return this.advanceWorkflow(instance, tx);
    });
  }

  /**
   * Force-advance the current pending step on behalf of an admin.
   * Bypasses all approver validation — admin override.
   */
  async forceAdvanceStep(
    tenantId: string,
    requestId: string,
    adminUserId: string,
    dto: { action: 'APPROVED' | 'REJECTED'; reason?: string },
  ): Promise<{ outcome: 'IN_PROGRESS' | 'APPROVED' | 'REJECTED'; instanceId: string }> {
    const instance = await this.instanceRepository.findByRequestId(requestId);
    if (!instance) throw new NotFoundException('No approval instance found for this request');
    if (instance.tenantId !== tenantId) throw new ForbiddenException('Access denied');
    if (instance.status !== 'IN_PROGRESS') {
      throw new BadRequestException(`Approval is already ${(instance.status as string).toLowerCase()}`);
    }

    const currentSI = (instance.stepInstances as any[]).find(
      (si: any) => si.stepNumber === instance.currentStep && si.status === 'PENDING',
    );
    if (!currentSI) throw new BadRequestException('No pending step to override');

    return this.prisma.$transaction(async (tx) => {
      if (dto.action === 'REJECTED') {
        await this.instanceRepository.updateStepInstance(currentSI.id, {
          status: 'REJECTED',
          approverId: adminUserId,
          reviewedAt: new Date(),
          rejectionReason: dto.reason ?? 'Admin override — rejected',
          comment: 'Forced by admin',
        }, tx);
        await this.instanceRepository.update(instance.id, { status: 'REJECTED' }, tx);
        return { outcome: 'REJECTED' as const, instanceId: instance.id };
      }

      await this.instanceRepository.updateStepInstance(currentSI.id, {
        status: 'APPROVED',
        approverId: adminUserId,
        reviewedAt: new Date(),
        comment: 'Forced by admin',
      }, tx);

      return this.advanceWorkflow(instance, tx);
    });
  }

  /**
   * Escalate a single overdue pending step — called by the cron job.
   * Skips the step if isSkippable, otherwise marks it as timed out (still PENDING).
   * Returns true if the step was escalated (skipped), false if it was left pending.
   */
  async escalateStep(stepInstanceId: string): Promise<boolean> {
    const stepInstance = await (this.prisma as any).requestApprovalStepInstance.findUnique({
      where: { id: stepInstanceId },
      include: {
        step: true,
        instance: true,
      },
    });

    if (!stepInstance || stepInstance.status !== 'PENDING') return false;
    if (stepInstance.instance.status !== 'IN_PROGRESS') return false;

    if (!stepInstance.step.isSkippable) {
      // Cannot auto-skip — leave it pending (cron will retry next hour)
      return false;
    }

    return this.prisma.$transaction(async (tx) => {
      await this.instanceRepository.updateStepInstance(stepInstanceId, {
        status: 'SKIPPED',
        reviewedAt: new Date(),
        comment: `Auto-escalated: no action taken within ${stepInstance.step.escalationAfterHours}h`,
      }, tx);

      const freshInstance = await this.instanceRepository.findById(stepInstance.instanceId, tx);
      const result = await this.advanceWorkflow(freshInstance!, tx);

      return result.outcome !== 'IN_PROGRESS' || true;
    });
  }

  /**
   * Get all pending step instances for an approver across all modules.
   */
  async getPendingForApprover(tenantId: string, userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { roleId: true },
    });
    if (!user?.roleId) return [];
    return this.instanceRepository.findPendingStepForApprover(tenantId, userId, user.roleId);
  }

  /**
   * Get all overdue pending step instances across all tenants (used by cron).
   */
  async getOverdueStepInstances() {
    const pendingSteps = await (this.prisma as any).requestApprovalStepInstance.findMany({
      where: {
        status: 'PENDING',
        pendingSince: { not: null },
        step: { escalationAfterHours: { not: null } },
        instance: { status: 'IN_PROGRESS' },
      },
      include: {
        step: { select: { escalationAfterHours: true, isSkippable: true } },
      },
    });

    const now = Date.now();
    return (pendingSteps as any[]).filter((si: any) => {
      const hoursElapsed = (now - new Date(si.pendingSince).getTime()) / (1000 * 60 * 60);
      return hoursElapsed >= si.step.escalationAfterHours;
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PRIVATE HELPERS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * After a step is approved, find and activate the next step.
   * Automatically skips over steps that are skippable with no resolved approver.
   * Returns the outcome.
   */
  private async advanceWorkflow(
    instance: any,
    tx: any,
  ): Promise<{ outcome: 'IN_PROGRESS' | 'APPROVED' | 'REJECTED'; instanceId: string }> {
    const result = await this.activateNextStep(instance, instance.currentStep, tx);

    if (result === 'ALL_SKIPPED' || result === 'DONE') {
      await this.instanceRepository.update(instance.id, { status: 'APPROVED' }, tx);
      return { outcome: 'APPROVED', instanceId: instance.id };
    }

    return { outcome: 'IN_PROGRESS', instanceId: instance.id };
  }

  /**
   * Scan forward from `afterStep` and activate the first non-skippable pending step.
   * Steps with no approver that are skippable are auto-marked SKIPPED.
   * Returns 'ACTIVATED' | 'DONE' | 'ALL_SKIPPED'.
   */
  private async activateNextStep(
    instance: any,
    afterStep: number,
    tx?: any,
  ): Promise<'ACTIVATED' | 'DONE' | 'ALL_SKIPPED'> {
    const remaining = [...(instance.stepInstances as any[])]
      .sort((a: any, b: any) => a.stepNumber - b.stepNumber)
      .filter((si: any) => si.stepNumber > afterStep && si.status === 'NOT_STARTED');

    if (remaining.length === 0) return 'DONE';

    for (const si of remaining) {
      const step = await (this.prisma as any).approvalStep.findUnique({ where: { id: si.stepId } });
      if (!step) continue;

      // Resolve approverId if not already set (lazy resolution for steps 2+)
      let approverId = si.approverId;
      if (!approverId && step.approverType !== 'ROLE') {
        approverId = await this.resolveApproverIdForNextStep(step, instance.requestId);
        if (approverId) {
          await this.instanceRepository.updateStepInstance(si.id, { approverId }, tx);
        }
      }

      const hasNoApprover = !approverId && step.approverType !== 'ROLE';

      if (hasNoApprover && step.isSkippable) {
        await this.instanceRepository.updateStepInstance(si.id, {
          status: 'SKIPPED',
          reviewedAt: new Date(),
          comment: 'Auto-skipped: no approver assigned',
        }, tx);
        continue; // Try the next step
      }

      // Activate this step
      await this.instanceRepository.updateStepInstance(si.id, {
        status: 'PENDING',
        pendingSince: new Date(),
        approverId: approverId ?? null,
      }, tx);
      await this.instanceRepository.update(instance.id, { currentStep: si.stepNumber }, tx);
      return 'ACTIVATED';
    }

    return 'ALL_SKIPPED';
  }

  private async resolveApproverId(step: any, requestorId: string): Promise<string | null> {
    if (step.approverType === 'DIRECT_MANAGER') {
      const requestor = await (this.prisma.user.findUnique as any)({
        where: { id: requestorId },
        select: { reportingManagerId: true },
      });
      return (requestor as any)?.reportingManagerId ?? null;
    }
    if (step.approverType === 'SPECIFIC_USER') return step.approverUserId ?? null;
    return null; // ROLE — resolved at approval time
  }

  private async resolveApproverIdForNextStep(step: any, requestId: string): Promise<string | null> {
    if (step.approverType === 'DIRECT_MANAGER') {
      const reg = await this.prisma.attendanceRegularization.findUnique({
        where: { id: requestId },
        select: { userId: true },
      });
      if (!reg) return null;
      const requestor = await (this.prisma.user.findUnique as any)({
        where: { id: reg.userId },
        select: { reportingManagerId: true },
      });
      return (requestor as any)?.reportingManagerId ?? null;
    }
    if (step.approverType === 'SPECIFIC_USER') return step.approverUserId ?? null;
    return null;
  }

  private async validateCaller(stepInstance: any, caller: { userId: string; roleId: string }) {
    const stepType: string = stepInstance.step?.approverType ?? stepInstance.approverType;

    if (stepType === 'ROLE') {
      const requiredRoleId: string | undefined = stepInstance.step?.approverRoleId;
      if (requiredRoleId && caller.roleId !== requiredRoleId) {
        throw new ForbiddenException('Your role is not authorized to approve this step');
      }
      return;
    }

    if (!stepInstance.approverId) {
      throw new BadRequestException(
        'No approver resolved for this step. Ensure the employee has a reporting manager assigned.',
      );
    }
    if (stepInstance.approverId !== caller.userId) {
      throw new ForbiddenException('You are not the designated approver for this step');
    }
  }
}
