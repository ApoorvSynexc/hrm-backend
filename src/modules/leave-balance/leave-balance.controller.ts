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
import { LeaveBalanceService } from './leave-balance.service.js';
import { AllocateLeaveDto } from './dto/index.js';
import { Permissions } from '../../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@Controller('leave-balance')
export class LeaveBalanceController {
  constructor(private leaveBalanceService: LeaveBalanceService) {}

  @Post('allocate')
  @HttpCode(HttpStatus.CREATED)
  @Permissions('manage:all')
  async allocateLeaveBalance(
    @CurrentUser('tenantId') tenantId: string,
    @Query('userId') userId: string,
    @Body() dto: AllocateLeaveDto,
  ) {
    const balance = await this.leaveBalanceService.allocateLeaveBalance(tenantId, userId, dto);
    return { message: 'common.created', data: balance };
  }

  @Get('me')
  @Permissions('read:leave')
  async getMyLeaveBalance(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('sub') userId: string,
    @Query('year') year?: number,
  ) {
    const currentYear = year || new Date().getFullYear();
    const result = await this.leaveBalanceService.getMyLeaveBalance(tenantId, userId, Number(currentYear));
    return { message: 'common.fetched', data: result.data, meta: result.meta };
  }

  @Get()
  @Permissions('read:leave')
  async getLeaveBalance(
    @CurrentUser('tenantId') tenantId: string,
    @Query('userId') userId?: string,
    @Query('year') year?: number,
    @Query('leaveType') leaveType?: string,
    @Query('limit') limit?: number,
    @Query('page') page?: number,
  ) {
    const currentYear = year || new Date().getFullYear();

    if (userId) {
      const result = await this.leaveBalanceService.getLeaveBalance(
        tenantId,
        userId,
        Number(currentYear),
        leaveType,
      );
      if (result && typeof result === 'object' && 'data' in result) {
        return { message: 'common.fetched', data: result.data, meta: result.meta };
      }
      return { message: 'common.fetched', data: result };
    }

    const result = await this.leaveBalanceService.getAllBalances(tenantId, Number(currentYear), {
      limit: limit ? Number(limit) : 10,
      page: page ? Number(page) : 1,
    });
    return { message: 'common.fetched', data: result.data, meta: result.meta };
  }

  @Patch()
  @HttpCode(HttpStatus.OK)
  @Permissions('manage:all')
  async updateLeaveBalance(
    @CurrentUser('tenantId') tenantId: string,
    @Query('userId') userId: string,
    @Query('year') year: number,
    @Query('leaveType') leaveType: string,
    @Body() body: { totalDays: number },
  ) {
    const balance = await this.leaveBalanceService.updateLeaveBalance(
      tenantId,
      userId,
      Number(year),
      leaveType,
      body.totalDays,
    );
    return { message: 'common.updated', data: balance };
  }
}
