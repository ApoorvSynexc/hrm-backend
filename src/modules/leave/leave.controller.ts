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
import { LeaveService } from './leave.service.js';
import { CreateLeaveDto, UpdateLeaveDto, ApproveLeaveDto } from './dto/index.js';
import { Permissions } from '../../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../common/decorators/current-user.decorator.js';

@Controller('leaves')
export class LeaveController {
  constructor(private leaveService: LeaveService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Permissions('create:leave')
  async createLeave(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateLeaveDto,
  ) {
    const leave = await this.leaveService.createLeave(tenantId, userId, dto);
    return { message: 'common.created', data: leave };
  }

  @Get('me')
  @Permissions('read:leave')
  async getMyLeaves(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('sub') userId: string,
    @Query('limit') limit?: number,
    @Query('page') page?: number,
  ) {
    const result = await this.leaveService.getMyLeaves(tenantId, userId, {
      limit: limit ? Number(limit) : 10,
      page: page ? Number(page) : 1,
    });
    return { message: 'common.fetched', data: result.data, meta: result.meta };
  }

  @Get('all')
  @Permissions('manage:all')
  async getAllLeavesForSuperAdmin(
    @CurrentUser() user: JwtPayload,
    @Query('tenantId') tenantId?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: number,
    @Query('page') page?: number,
  ) {
    if (user.tenantId !== null && user.tenantId !== undefined) {
      throw new ForbiddenException('Only super admin can access this endpoint');
    }

    const filters: any = {};
    if (tenantId) filters.tenantId = tenantId;
    if (status) filters.status = status;

    const result = await this.leaveService.getSuperAdminLeaves(filters, {
      limit: limit ? Number(limit) : 10,
      page: page ? Number(page) : 1,
    });
    return { message: 'common.fetched', data: result.data, meta: result.meta };
  }

  @Get()
  @Permissions('read:leave')
  async getAllLeaves(
    @CurrentUser('tenantId') tenantId: string,
    @Query('id') id?: string,
    @Query('limit') limit?: number,
    @Query('page') page?: number,
  ) {
    if (id) {
      const leave = await this.leaveService.getLeaveById(tenantId, id);
      return { message: 'common.fetched', data: leave };
    }

    const result = await this.leaveService.getAllLeaves(tenantId, {
      limit: limit ? Number(limit) : 10,
      page: page ? Number(page) : 1,
    });
    return { message: 'common.fetched', data: result.data, meta: result.meta };
  }

  @Patch()
  @HttpCode(HttpStatus.OK)
  @Permissions('update:leave')
  async updateLeave(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('sub') userId: string,
    @Query('id') id: string,
    @Body() dto: UpdateLeaveDto,
  ) {
    const leave = await this.leaveService.updateLeave(tenantId, userId, id, dto);
    return { message: 'common.updated', data: leave };
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  @Permissions('delete:leave')
  async deleteLeave(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('sub') userId: string,
    @Query('id') id: string,
  ) {
    return this.leaveService.deleteLeave(tenantId, userId, id);
  }

  @Patch('approve')
  @HttpCode(HttpStatus.OK)
  @Permissions('approve:leave')
  async approveLeave(
    @CurrentUser('tenantId') tenantId: string,
    @Query('id') id: string,
    @Body() dto: ApproveLeaveDto,
  ) {
    const leave = await this.leaveService.approveLeave(tenantId, id, dto);
    return { message: 'common.updated', data: leave };
  }
}
