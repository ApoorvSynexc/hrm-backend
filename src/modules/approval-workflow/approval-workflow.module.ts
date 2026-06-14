import { Module } from '@nestjs/common';
import { ApprovalWorkflowController } from './approval-workflow.controller.js';
import { ApprovalWorkflowService } from './approval-workflow.service.js';
import { ApprovalEngineService } from './approval-engine.service.js';
import { ApprovalEscalationService } from './cron/approval-escalation.cron.js';
import { ApprovalWorkflowRepository, ApprovalInstanceRepository } from './repositories/index.js';

@Module({
  controllers: [ApprovalWorkflowController],
  providers: [
    ApprovalWorkflowService,
    ApprovalEngineService,
    ApprovalEscalationService,
    ApprovalWorkflowRepository,
    ApprovalInstanceRepository,
  ],
  exports: [ApprovalWorkflowService, ApprovalEngineService],
})
export class ApprovalWorkflowModule {}
