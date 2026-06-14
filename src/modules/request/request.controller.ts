import {
  Controller,
  Get,
  Patch,
  Delete,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { RequestService } from './request.service.js';
import { ProcessRequestDto } from './dto/process-request.dto.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Permissions } from '../../common/decorators/permissions.decorator.js';

@Controller('requests')
export class RequestController {
  constructor(private requestService: RequestService) {}

  /**
   * GET /requests
   * Get all requests based on user role
   * - RM: only pending requests assigned to them
   * - HR: only pending requests assigned to them
   * - ADMIN: all requests
   * - EMPLOYEE: only their own requests
   */
  @Get()
  @Permissions('read:attendance_regularization', 'read:leave')
  async getAll(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: string,
    @Query('limit') limit?: number,
    @Query('page') page?: number,
    @Query('module') module?: string,
    @Query('status') status?: string,
  ) {
    const result = await this.requestService.getRequests(
      tenantId,
      userId,
      role,
      {
        limit: limit ? Number(limit) : 10,
        page: page ? Number(page) : 1,
        module,
        status,
      },
    );
    return { message: 'common.fetched', data: result.data, meta: result.meta };
  }

  /**
   * GET /requests?id=xxx
   * Get single request with full approval trail
   */
  @Get()
  @Permissions('read:attendance_regularization', 'read:leave')
  async getById(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: string,
    @Query('id') id: string,
  ) {
    const request = await this.requestService.getRequestById(
      tenantId,
      id,
      userId,
      role,
    );
    return { message: 'common.fetched', data: request };
  }

  /**
   * PATCH /requests?id=xxx
   * Approve or reject a request step
   * - RM, HR: can approve/reject their assigned steps
   */
  @Patch()
  @HttpCode(HttpStatus.OK)
  @Permissions('approve:attendance_regularization', 'approve:leave')
  async process(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('sub') userId: string,
    @Query('id') id: string,
    @Body() dto: ProcessRequestDto,
  ) {
    const request = await this.requestService.processRequest(
      tenantId,
      id,
      { userId },
      dto,
    );
    return { message: 'common.updated', data: request };
  }

  /**
   * DELETE /requests?id=xxx
   * Cancel request (employee only, if PENDING)
   */
  @Delete()
  @HttpCode(HttpStatus.OK)
  @Permissions('update:attendance_regularization', 'update:leave')
  async cancel(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('sub') userId: string,
    @Query('id') id: string,
  ) {
    const request = await this.requestService.cancelRequest(
      tenantId,
      id,
      userId,
    );
    return { message: 'common.updated', data: request };
  }

  /**
   * PATCH /requests/override?id=xxx
   * Admin force-approve/reject (admin only)
   */
  @Patch('override')
  @HttpCode(HttpStatus.OK)
  @Permissions('manage:attendance_regularization', 'manage:leave')
  async override(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('sub') adminUserId: string,
    @Query('id') id: string,
    @Body() dto: { action: 'APPROVED' | 'REJECTED'; reason?: string },
  ) {
    const request = await this.requestService.overrideRequest(
      tenantId,
      id,
      adminUserId,
      dto,
    );
    return { message: 'common.updated', data: request };
  }
}
