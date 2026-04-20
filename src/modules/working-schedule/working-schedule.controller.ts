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
    @Body() dto: ConfigureWorkingHoursDto,
  ) {
    const result = await this.workingScheduleService.create(tenantId, dto);
    return { message: 'common.created', data: result };
  }

  @Get("list")
  @Permissions('read:working_schedule')
  async list(
    @CurrentUser('tenantId') tenantId: string,
    @Query('name') name?: string,
  ) {
    const result = await this.workingScheduleService.list(tenantId, name);
    return { message: 'common.fetched', data: result };
  }

  @Put()
  @HttpCode(HttpStatus.OK)
  @Permissions('update:working_schedule')
  async update(
    @CurrentUser('tenantId') tenantId: string,
    @Query('id') id: string,
    @Body() dto: ConfigureWorkingHoursDto,
  ) {
    const result = await this.workingScheduleService.update(tenantId, id, dto);
    return { message: 'common.updated', data: result };
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  @Permissions('delete:working_schedule')
  async delete(
    @CurrentUser('tenantId') tenantId: string,
    @Query('id') id: string,
  ) {
    const result = await this.workingScheduleService.delete(tenantId, id);
    return { message: 'common.deleted', data: result };
  }
}
