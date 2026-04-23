import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Query,
  Param,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { AttendanceService } from './attendance.service.js';
import { AttendancePolicyService } from './services/attendance-policy.service.js';
import { CreateRegularizationDto, ReviewRegularizationDto, CheckInDto, CheckOutDto, CreateAttendancePolicyDto, UpdateAttendancePolicyDto, AttendanceCalendarQueryDto } from './dto/index.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Permissions } from '../../common/decorators/permissions.decorator.js';

@Controller('attendance')
export class AttendanceController {
  constructor(
    private attendanceService: AttendanceService,
    private policyService: AttendancePolicyService,
  ) {}

  // Check in for the day - validates STRICT policy (IP range or geolocation required)
  @Post('check-in')
  @HttpCode(HttpStatus.CREATED)
  @Permissions('create:attendance')
  async checkIn(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: CheckInDto,
    @Req() req: any,
  ) {
    const attendance = await this.attendanceService.checkIn(tenantId, userId, dto, req);
    return { message: 'common.created', data: attendance };
  }

  // Check out for the day - validates STRICT policy before allowing checkout
  @Post('check-out')
  @HttpCode(HttpStatus.CREATED)
  @Permissions('create:attendance')
  async checkOut(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: CheckOutDto,
    @Req() req: any,
  ) {
    const attendance = await this.attendanceService.checkOut(tenantId, userId, dto, req);
    return { message: 'common.updated', data: attendance };
  }

  // Get current user's attendance records with pagination
  @Get('me/list')
  @Permissions('read:attendance')
  async getMyAttendance(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('sub') userId: string,
    @Query('limit') limit?: number,
    @Query('page') page?: number,
  ) {
    const result = await this.attendanceService.getMyAttendance(tenantId, userId, {
      limit: limit ? Number(limit) : 10,
      page: page ? Number(page) : 1,
    });
    return { message: 'common.fetched', data: result.data, meta: result.meta };
  }

  // Get today's attendance record with logs (for check-in/check-out UI)
  @Get('today')
  @Permissions('read:attendance')
  async getTodayAttendance(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('sub') userId: string,
  ) {
    const record = await this.attendanceService.getTodayAttendance(tenantId, userId);
    return { message: 'common.fetched', data: record };
  }

  // Get attendance logs for a specific attendance record
  @Get('logs/list')
  @Permissions('read:attendance')
  async getAttendanceLogs(
    @CurrentUser('tenantId') tenantId: string,
    @Query('id') id: string,
    @Query('limit') limit?: number,
    @Query('page') page?: number,
  ) {
    const result = await this.attendanceService.getAttendanceLogs(tenantId, id, {
      limit: limit ? Number(limit) : 10,
      page: page ? Number(page) : 1,
    });
    return { message: 'common.fetched', data: result.data, meta: result.meta };
  }

  // Get monthly attendance calendar
  @Get('calendar/month')
  @Permissions('read:attendance')
  async getMonthlyCalendar(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('sub') userId: string,
    @Query() queryDto: AttendanceCalendarQueryDto,
  ) {
    const calendar = await this.attendanceService.getMonthlyCalendar(
      tenantId,
      userId,
      queryDto.month,
      queryDto.year,
    );
    return { message: 'common.fetched', data: calendar };
  }

  // Get all attendance records with pagination
  @Get('list')
  @Permissions('read:attendance')
  async list(
    @CurrentUser('tenantId') tenantId: string,
    @Query('limit') limit?: number,
    @Query('page') page?: number,
  ) {
    const result = await this.attendanceService.getAllAttendance(tenantId, {
      limit: limit ? Number(limit) : 10,
      page: page ? Number(page) : 1,
    });
    return { message: 'common.fetched', data: result.data, meta: result.meta };
  }

  // Get specific attendance record by ID
  @Get()
  @Permissions('read:attendance')
  async getById(
    @CurrentUser('tenantId') tenantId: string,
    @Query('id') id: string,
  ) {
    const record = await this.attendanceService.getAttendanceById(tenantId, id);
    return { message: 'common.fetched', data: record };
  }

  // Request regularization for missing check-in/check-out
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

  // Get current user's regularization requests
  @Get('regularizations/me')
  @Permissions('read:attendance_regularization')
  async getMyRegularizations(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('sub') userId: string,
  ) {
    const records = await this.attendanceService.getMyRegularizations(tenantId, userId);
    return { message: 'common.fetched', data: records };
  }

  // Get all regularization requests with pagination
  @Get('regularizations/list')
  @Permissions('read:attendance_regularization')
  async listRegularizations(
    @CurrentUser('tenantId') tenantId: string,
    @Query('limit') limit?: number,
    @Query('page') page?: number,
  ) {
    const result = await this.attendanceService.getAllRegularizations(tenantId, {
      limit: limit ? Number(limit) : 10,
      page: page ? Number(page) : 1,
    });
    return { message: 'common.fetched', data: result.data, meta: result.meta };
  }

  // Get specific regularization request by ID
  @Get('regularizations')
  @Permissions('read:attendance_regularization')
  async getRegularizationById(
    @CurrentUser('tenantId') tenantId: string,
    @Query('id') id: string,
  ) {
    const regularization = await this.attendanceService.getRegularizationById(tenantId, id);
    return { message: 'common.fetched', data: regularization };
  }

  // Approve/Reject regularization request (HR/Manager only)
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

  // Get applied policy for current user (resolves hierarchy)
  @Get('policy/me')
  @Permissions('read:attendance')
  async getMyPolicy(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('sub') userId: string,
  ) {
    const policy = await this.policyService.getPolicyForUser(tenantId, userId);
    return { message: 'common.fetched', data: policy };
  }

  // List all policies for tenant (optionally filtered)
  @Get('policy/list')
  @Permissions('read:attendance')
  async listPolicies(
    @CurrentUser('tenantId') tenantId: string,
    @Query() queryDto: any, // QueryAttendancePolicyDto - with all optional fields
  ) {
    const policies = await this.policyService.listPolicies(tenantId, queryDto);
    return { message: 'common.fetched', data: policies };
  }

  // Create a new attendance policy
  @Post('policy')
  @HttpCode(HttpStatus.CREATED)
  @Permissions('manage:attendance')
  async createPolicy(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateAttendancePolicyDto,
  ) {
    const policy = await this.policyService.createPolicy(tenantId, userId, dto);
    return { message: 'common.created', data: policy };
  }

  // Update a policy (partial update)
  @Patch('policy/:id')
  @HttpCode(HttpStatus.OK)
  @Permissions('manage:attendance')
  async updatePolicy(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('sub') userId: string,
    @Param('id') policyId: string,
    @Body() dto: UpdateAttendancePolicyDto,
  ) {
    const policy = await this.policyService.updatePolicy(tenantId, policyId, userId, dto);
    return { message: 'common.updated', data: policy };
  }

  // Delete a policy
  @Delete('policy/:id')
  @HttpCode(HttpStatus.OK)
  @Permissions('manage:attendance')
  async deletePolicy(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') policyId: string,
  ) {
    await this.policyService.deletePolicy(tenantId, policyId);
    return { message: 'common.deleted', data: null };
  }
}
