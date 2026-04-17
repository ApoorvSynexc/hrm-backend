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
import { AttendanceService } from './attendance.service.js';
import { CreateRegularizationDto, ReviewRegularizationDto } from './dto/index.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Permissions } from '../../common/decorators/permissions.decorator.js';

@Controller('attendance')
export class AttendanceController {
  constructor(private attendanceService: AttendanceService) {}

  @Post('check-in')
  @HttpCode(HttpStatus.CREATED)
  @Permissions('create:attendance')
  async checkIn(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('sub') userId: string,
  ) {
    const attendance = await this.attendanceService.checkIn(tenantId, userId);
    return { message: 'common.created', data: attendance };
  }

  @Post('check-out')
  @HttpCode(HttpStatus.CREATED)
  @Permissions('create:attendance')
  async checkOut(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('sub') userId: string,
  ) {
    const attendance = await this.attendanceService.checkOut(tenantId, userId);
    return { message: 'common.updated', data: attendance };
  }

  @Get('me')
  @Permissions('read:attendance')
  async getMyAttendance(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('sub') userId: string,
  ) {
    const records = await this.attendanceService.getMyAttendance(tenantId, userId);
    return { message: 'common.fetched', data: records };
  }

  @Get()
  @Permissions('read:attendance')
  async list(
    @CurrentUser('tenantId') tenantId: string,
    @Query('id') id?: string,
  ) {
    if (id) {
      const record = await this.attendanceService.getAttendanceById(tenantId, id);
      return { message: 'common.fetched', data: record };
    }

    const records = await this.attendanceService.getAllAttendance(tenantId);
    return { message: 'common.fetched', data: records };
  }

  @Post('regularizations')
  @HttpCode(HttpStatus.CREATED)
  @Permissions('create:attendance_regularization')
  async createRegularization(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateRegularizationDto,
  ) {
    const regularization = await this.attendanceService.createRegularization(tenantId, userId, dto);
    return { message: 'common.created', data: regularization };
  }

  @Get('regularizations/me')
  @Permissions('read:attendance_regularization')
  async getMyRegularizations(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('sub') userId: string,
  ) {
    const records = await this.attendanceService.getMyRegularizations(tenantId, userId);
    return { message: 'common.fetched', data: records };
  }

  @Get('regularizations')
  @Permissions('read:attendance_regularization')
  async listRegularizations(
    @CurrentUser('tenantId') tenantId: string,
    @Query('id') id?: string,
  ) {
    if (id) {
      const regularization = await this.attendanceService.getRegularizationById(tenantId, id);
      return { message: 'common.fetched', data: regularization };
    }

    const records = await this.attendanceService.getAllRegularizations(tenantId);
    return { message: 'common.fetched', data: records };
  }

  @Patch('regularizations')
  @HttpCode(HttpStatus.OK)
  @Permissions('approve:attendance_regularization')
  async reviewRegularization(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('sub') reviewerId: string,
    @Query('id') id: string,
    @Body() dto: ReviewRegularizationDto,
  ) {
    const regularization = await this.attendanceService.reviewRegularization(
      tenantId,
      reviewerId,
      id,
      dto,
    );
    return { message: 'common.updated', data: regularization };
  }
}
