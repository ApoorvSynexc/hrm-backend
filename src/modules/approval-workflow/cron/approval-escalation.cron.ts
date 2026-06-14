import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ApprovalEngineService } from '../approval-engine.service.js';

@Injectable()
export class ApprovalEscalationService {
  private readonly logger = new Logger(ApprovalEscalationService.name);

  constructor(private approvalEngineService: ApprovalEngineService) {}

  /**
   * Runs every hour.
   * Finds all PENDING step instances that have exceeded their escalation window
   * and auto-escalates them (skips if isSkippable, leaves pending otherwise).
   *
   * Example: Step 1 has escalationAfterHours=48 and isSkippable=true.
   * If the RM hasn't approved in 48 hours, the engine auto-skips Step 1
   * and activates Step 2 (HR), so the request keeps moving.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async escalateOverdueApprovals() {
    this.logger.log('Running approval escalation check...');

    let escalated = 0;
    let skipped = 0;

    try {
      const overdueSteps = await this.approvalEngineService.getOverdueStepInstances();

      if (overdueSteps.length === 0) {
        this.logger.log('No overdue approval steps found.');
        return;
      }

      this.logger.log(`Found ${overdueSteps.length} overdue step(s). Processing...`);

      for (const stepInstance of overdueSteps) {
        try {
          const wasEscalated = await this.approvalEngineService.escalateStep(stepInstance.id);
          if (wasEscalated) {
            escalated++;
            this.logger.log(
              `Escalated step instance ${stepInstance.id} ` +
              `(overdue by ${this.getHoursOverdue(stepInstance.pendingSince, stepInstance.step.escalationAfterHours)}h)`,
            );
          } else {
            skipped++;
            this.logger.warn(
              `Step instance ${stepInstance.id} is overdue but not skippable — left pending.`,
            );
          }
        } catch (err: any) {
          this.logger.error(`Failed to escalate step instance ${stepInstance.id}: ${err.message}`);
        }
      }

      this.logger.log(
        `Escalation complete. Escalated: ${escalated}, Left pending (not skippable): ${skipped}`,
      );
    } catch (err: any) {
      this.logger.error(`Escalation cron failed: ${err.message}`);
    }
  }

  private getHoursOverdue(pendingSince: Date, escalationAfterHours: number): number {
    const elapsed = (Date.now() - new Date(pendingSince).getTime()) / (1000 * 60 * 60);
    return Math.round(elapsed - escalationAfterHours);
  }
}
