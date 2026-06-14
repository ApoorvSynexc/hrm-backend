import { Module } from '@nestjs/common';
import { RequestController } from './request.controller.js';
import { RequestService } from './request.service.js';
import { RequestRepository } from './repositories/request.repository.js';
import { ApprovalWorkflowModule } from '../approval-workflow/approval-workflow.module.js';

@Module({
  imports: [ApprovalWorkflowModule],
  controllers: [RequestController],
  providers: [RequestService, RequestRepository],
  exports: [RequestService],
})
export class RequestModule {}
