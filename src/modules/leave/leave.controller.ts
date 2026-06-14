import {
  Controller,
  Post,
  Delete,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { LeaveService } from './leave.service.js';
import { CreateLeaveDto } from './dto/index.js';
import { Permissions } from '../../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@Controller('leaves')
export class LeaveController {
  constructor(private leaveService: LeaveService) {}

  /**
   * POST /leaves
   * Employee submits a new leave request.
   * The approval workflow is automatically started by the service.
   */
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

  /**
   * DELETE /leaves?id=xxx
   * Employee cancels their own pending leave request.
   * All other viewing and approval is done through GET /requests
   */
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
}
