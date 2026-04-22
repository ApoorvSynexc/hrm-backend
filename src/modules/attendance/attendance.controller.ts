import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { AttendanceService } from './attendance.service.js';
import { AttendancePolicyService } from './services/attendance-policy.service.js';
import { CreateRegularizationDto, ReviewRegularizationDto, CheckInDto, CheckOutDto, CreateAttendancePolicyDto, UpdateAttendancePolicyDto } from './dto/index.js';
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

  // Get current user's attendance records
  @Get('me')
  @Permissions('read:attendance')
  async getMyAttendance(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('sub') userId: string,
  ) {
    const records = await this.attendanceService.getMyAttendance(tenantId, userId);
    return { message: 'common.fetched', data: records };
  }

  // Get all attendance records OR specific record by ID
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

  // Get all regularization requests OR specific request by ID
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

  // Get attendance policy (STRICT = IP/Geolocation required, FLEXIBLE = no validation)
  @Get('policy')
  @Permissions('read:attendance')
  async getPolicy(@CurrentUser('tenantId') tenantId: string) {
    const policy = await this.policyService.getPolicyOrDefault(tenantId);
    return { message: 'common.fetched', data: policy };
  }

  // Create or update attendance policy for tenant
  @Post('policy')
  @HttpCode(HttpStatus.CREATED)
  @Permissions('manage:attendance')
  async createOrUpdatePolicy(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: CreateAttendancePolicyDto,
  ) {
    const policy = await this.policyService.upsertPolicy(tenantId, dto);
    return { message: 'common.updated', data: policy };
  }

  // Update specific policy fields (partial update)
  @Patch('policy')
  @HttpCode(HttpStatus.OK)
  @Permissions('manage:attendance')
  async updatePolicy(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: UpdateAttendancePolicyDto,
  ) {
    const policy = await this.policyService.updatePolicy(tenantId, dto);
    return { message: 'common.updated', data: policy };
  }
}
