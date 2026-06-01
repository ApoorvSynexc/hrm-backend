import { Module } from '@nestjs/common';
import { RegularizationController } from './regularization.controller.js';
import { RegularizationService } from './regularization.service.js';
import { RegularizationRepository } from './repositories/index.js';
import { ApprovalWorkflowModule } from '../approval-workflow/approval-workflow.module.js';

@Module({
  imports: [ApprovalWorkflowModule],
  controllers: [RegularizationController],
  providers: [RegularizationService, RegularizationRepository],
  exports: [RegularizationRepository],
})
export class RegularizationModule {}
