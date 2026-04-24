import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApprovalWorkflowService } from './approval-workflow.service.js';
import { ApprovalEngineService } from './approval-engine.service.js';
import { CreateWorkflowDto, UpdateWorkflowDto } from './dto/index.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Permissions } from '../../common/decorators/permissions.decorator.js';

@Controller('approval-workflows')
export class ApprovalWorkflowController {
  constructor(
    private workflowService: ApprovalWorkflowService,
    private approvalEngineService: ApprovalEngineService,
  ) {}

  /**
   * Create a new approval workflow with steps
   * POST /approval-workflows
   * Access: ADMIN only
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Permissions('manage:approval_workflow')
  async create(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: CreateWorkflowDto,
  ) {
    const workflow = await this.workflowService.createWorkflow(tenantId, dto);
    return { message: 'common.created', data: workflow };
  }

  /**
   * List all approval workflows for the tenant
   * GET /approval-workflows
   * GET /approval-workflows?module=REGULARIZATION
   * Access: ADMIN, HR
   */
  @Get()
  @Permissions('read:approval_workflow')
  async list(
    @CurrentUser('tenantId') tenantId: string,
    @Query('module') module?: string,
  ) {
    const workflows = await this.workflowService.listWorkflows(tenantId, module);
    return { message: 'common.fetched', data: workflows };
  }

  /**
   * Get a single workflow by ID
   * GET /approval-workflows/:id  →  GET /approval-workflows?id=xxx
   * Access: ADMIN, HR
   */
  @Get('detail')
  @Permissions('read:approval_workflow')
  async getById(
    @CurrentUser('tenantId') tenantId: string,
    @Query('id') id: string,
  ) {
    const workflow = await this.workflowService.getWorkflow(tenantId, id);
    return { message: 'common.fetched', data: workflow };
  }

  /**
   * Update workflow metadata (name, description, isDefault, status)
   * PATCH /approval-workflows?id=xxx
   * Access: ADMIN only
   */
  @Patch()
  @HttpCode(HttpStatus.OK)
  @Permissions('manage:approval_workflow')
  async update(
    @CurrentUser('tenantId') tenantId: string,
    @Query('id') id: string,
    @Body() dto: UpdateWorkflowDto,
  ) {
    const workflow = await this.workflowService.updateWorkflow(tenantId, id, dto);
    return { message: 'common.updated', data: workflow };
  }

  /**
   * Soft-delete a workflow
   * DELETE /approval-workflows?id=xxx
   * Access: ADMIN only
   */
  @Delete()
  @HttpCode(HttpStatus.OK)
  @Permissions('manage:approval_workflow')
  async remove(
    @CurrentUser('tenantId') tenantId: string,
    @Query('id') id: string,
  ) {
    await this.workflowService.deleteWorkflow(tenantId, id);
    return { message: 'common.deleted' };
  }

  /**
   * Get all pending approval steps for the current user (RM/HR review queue)
   * GET /approval-workflows/my-queue
   * Access: Any approver role (RM, HR)
   */
  @Get('my-queue')
  @Permissions('approve:attendance_regularization')
  async myQueue(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('sub') userId: string,
  ) {
    const pending = await this.approvalEngineService.getPendingForApprover(tenantId, userId);
    return { message: 'common.fetched', data: pending };
  }
}
