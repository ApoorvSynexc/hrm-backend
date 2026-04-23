import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { RegularizationService } from './regularization.service.js';
import { CreateRegularizationDto, ReviewRegularizationDto } from './dto/index.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Permissions } from '../../common/decorators/permissions.decorator.js';

@Controller('regularizations')
export class RegularizationController {
  constructor(private regularizationService: RegularizationService) {}

  /**
   * Create a new regularization request
   * POST /regularizations
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
   * Get current user's regularization requests
   * GET /regularizations/me
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
   * Get all regularization requests with pagination
   * GET /regularizations/list
   */
  @Get('list')
  @Permissions('read:attendance_regularization')
  async list(
    @CurrentUser('tenantId') tenantId: string,
    @Query('limit') limit?: number,
    @Query('page') page?: number,
  ) {
    const result = await this.regularizationService.getAllRegularizations(tenantId, {
      limit: limit ? Number(limit) : 10,
      page: page ? Number(page) : 1,
    });
    return { message: 'common.fetched', data: result.data, meta: result.meta };
  }

  /**
   * Get specific regularization request by ID
   * GET /regularizations?id=xxx
   */
  @Get()
  @Permissions('read:attendance_regularization')
  async getById(
    @CurrentUser('tenantId') tenantId: string,
    @Query('id') id: string,
  ) {
    const regularization = await this.regularizationService.getById(tenantId, id);
    return { message: 'common.fetched', data: regularization };
  }

  /**
   * Approve/Reject regularization request
   * PATCH /regularizations?id=xxx
   */
  @Patch()
  @HttpCode(HttpStatus.OK)
  @Permissions('approve:attendance_regularization')
  async review(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('sub') reviewerId: string,
    @Query('id') id: string,
    @Body() dto: ReviewRegularizationDto,
  ) {
    const regularization = await this.regularizationService.review(tenantId, reviewerId, id, dto);
    return { message: 'common.updated', data: regularization };
  }
}
