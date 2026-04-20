import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Permissions } from '../../common/decorators/permissions.decorator.js';
import { ConfigureWorkingHoursDto } from './dto/index.js';
import { WorkingScheduleService } from './working-schedule.service.js';

@Controller('work-schedule')
export class WorkingScheduleController {
  constructor(private workingScheduleService: WorkingScheduleService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Permissions('create:working_schedule')
  async create(
    @CurrentUser('tenantId') tenantId: string,
    @Query('name') name: string = 'Standard',
    @Body() dto: ConfigureWorkingHoursDto,
  ) {
    const config = await this.workingScheduleService.configureWorkingSchedule(
      tenantId,
      name,
      dto,
    );
    return { message: 'common.created', data: config };
  }

  @Get('list')
  @Permissions('read:working_schedule')
  async list(
    @CurrentUser('tenantId') tenantId: string,
    @Query('name') name?: string,
  ) {
    if (name) {
      const config = await this.workingScheduleService.getWorkingSchedule(
        tenantId,
        name,
      );
      return { message: 'common.fetched', data: config };
    }

    const config = await this.workingScheduleService.getWorkingSchedules(tenantId);
    return { message: 'common.fetched', data: config };
  }

  @Get()
  @Permissions('read:working_schedule')
  async workingSchedule(
    @CurrentUser('tenantId') tenantId: string,
    @Query('name') name: string = 'Standard',
  ) {

    if(!tenantId) {
      return { message: 'Tenant ID is required', data: null };
    }

    const config = await this.workingScheduleService.getWorkingSchedule(
      tenantId,
      name,
    );
    return { message: 'common.fetched', data: config };
  }

  @Put()
  @HttpCode(HttpStatus.OK)
  @Permissions('update:working_schedule')
  async update(
    @CurrentUser('tenantId') tenantId: string,
    @Query('name') name: string = 'Standard',
    @Body() dto: ConfigureWorkingHoursDto,
  ) {
    const config = await this.workingScheduleService.configureWorkingSchedule(
      tenantId,
      name,
      dto,
    );
    return { message: 'common.updated', data: config };
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  @Permissions('delete:working_schedule')
  async delete(
    @CurrentUser('tenantId') tenantId: string,
    @Query('name') name: string = 'Standard',
  ) {
    const config = await this.workingScheduleService.deleteWorkingSchedule(
      tenantId,
      name,
    );
    return { message: 'common.deleted', data: config };
  }
}
