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
  ForbiddenException,
} from '@nestjs/common';
import { RegularizationService } from './regularization.service.js';
import { CreateRegularizationDto, ForceReviewDto } from './dto/index.js';
import { ProcessStepDto } from '../approval-workflow/dto/index.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Permissions } from '../../common/decorators/permissions.decorator.js';

@Controller('regularizations')
export class RegularizationController {
  constructor(private regularizationService: RegularizationService) {}

  /**
   * POST /regularizations
   * Employee submits a new regularization request.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Permissions('create:attendance_regularization')
  async create(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateRegularizationDto,
  ) {
    const regularization = await this.regularizationService.create(tenantId, userId, dto);
    return { message: 'common.created', data: regularization };
  }

  /**
   * GET /regularizations/me
   * Employee views their own regularization requests with full approval trail.
   */
  @Get('me')
  @Permissions('read:attendance_regularization')
  async getMyRegularizations(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('sub') userId: string,
  ) {
    const records = await this.regularizationService.getMyRegularizations(tenantId, userId);
    return { message: 'common.fetched', data: records };
  }

  /**
   * GET /regularizations/team
   * RM views their direct reports' regularization requests.
   * Scoped strictly to RM role — other roles get 403.
   */
  @Get('team')
  @Permissions('read:attendance_regularization')
  async getTeamRegularizations(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: string,
    @Query('limit') limit?: number,
    @Query('page') page?: number,
  ) {
    if (role !== 'RM') {
      throw new ForbiddenException('Only Reporting Managers can access team regularizations');
    }
    const result = await this.regularizationService.getTeamRegularizations(tenantId, userId, {
      limit: limit ? Number(limit) : 10,
      page: page ? Number(page) : 1,
    });
    return { message: 'common.fetched', data: result.data, meta: result.meta };
  }

  /**
   * GET /regularizations/list
   * ADMIN / HR views all tenant regularization requests (paginated).
   * Scoped to ADMIN and HR roles only — RM must use /team.
   */
  @Get('list')
  @Permissions('read:attendance_regularization')
  async list(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('role') role: string,
    @Query('limit') limit?: number,
    @Query('page') page?: number,
  ) {
    if (role !== 'ADMIN' && role !== 'HR' && role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Only ADMIN or HR can access the full regularization list');
    }
    const result = await this.regularizationService.getAllRegularizations(tenantId, {
      limit: limit ? Number(limit) : 10,
      page: page ? Number(page) : 1,
    });
    return { message: 'common.fetched', data: result.data, meta: result.meta };
  }

  /**
   * GET /regularizations?id=xxx
   * Get a single regularization request by ID.
   * Employees can only view their own; RM/HR/ADMIN can view any.
   */
  @Get()
  @Permissions('read:attendance_regularization')
  async getById(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: string,
    @Query('id') id: string,
  ) {
    const regularization = await this.regularizationService.getById(tenantId, id, userId, role);
    return { message: 'common.fetched', data: regularization };
  }

  /**
   * PATCH /regularizations?id=xxx
   * RM or HR approves / rejects a regularization request via the workflow engine.
   * The engine validates which step the caller is authorized to act on.
   */
  @Patch()
  @HttpCode(HttpStatus.OK)
  @Permissions('approve:attendance_regularization')
  async review(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('sub') userId: string,
    @Query('id') id: string,
    @Body() dto: ProcessStepDto,
  ) {
    const regularization = await this.regularizationService.review(
      tenantId,
      { userId },
      id,
      dto,
    );
    return { message: 'common.updated', data: regularization };
  }

  /**
   * PATCH /regularizations/override?id=xxx
   * ADMIN force-approves or force-rejects the current pending step on any stuck request.
   * Bypasses all approver checks — use when RM/HR is unavailable or unresponsive.
   */
  @Patch('override')
  @HttpCode(HttpStatus.OK)
  @Permissions('manage:attendance_regularization')
  async forceReview(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('sub') adminUserId: string,
    @Query('id') id: string,
    @Body() dto: ForceReviewDto,
  ) {
    const regularization = await this.regularizationService.forceReview(
      tenantId,
      adminUserId,
      id,
      dto,
    );
    return { message: 'common.updated', data: regularization };
  }

  /**
   * DELETE /regularizations?id=xxx
   * Employee cancels their own pending regularization request.
   */
  @Delete()
  @HttpCode(HttpStatus.OK)
  @Permissions('update:attendance_regularization')
  async cancel(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('sub') userId: string,
    @Query('id') id: string,
  ) {
    const regularization = await this.regularizationService.cancel(tenantId, userId, id);
    return { message: 'common.updated', data: regularization };
  }
}
