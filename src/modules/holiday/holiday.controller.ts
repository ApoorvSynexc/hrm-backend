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
} from '@nestjs/common';
import { HolidayService } from './holiday.service.js';
import { CreateHolidayDto, UpdateHolidayDto } from './dto/index.js';
import { Permissions } from '../../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@Controller('holidays')
export class HolidayController {
  constructor(private holidayService: HolidayService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Permissions('manage:all')
  async createHoliday(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: CreateHolidayDto,
  ) {
    const holiday = await this.holidayService.createHoliday(tenantId, dto);
    return { message: 'common.created', data: holiday };
  }

  @Get()
  @Permissions('manage:all')
  async getHolidays(
    @CurrentUser('tenantId') tenantId: string,
    @Query('id') id?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: number,
    @Query('page') page?: number,
  ) {
    if (id) {
      const holiday = await this.holidayService.getHolidayById(tenantId, id);
      return { message: 'common.fetched', data: holiday };
    }

    if (startDate && endDate) {
      const result = await this.holidayService.getHolidaysByDateRange(tenantId, startDate, endDate);
      return { message: 'common.fetched', data: result.data, meta: result.meta };
    }

    const result = await this.holidayService.getHolidays(tenantId, {
      limit: limit ? Number(limit) : 10,
      page: page ? Number(page) : 1,
    });
    return { message: 'common.fetched', data: result.data, meta: result.meta };
  }

  @Patch()
  @HttpCode(HttpStatus.OK)
  @Permissions('manage:all')
  async updateHoliday(
    @CurrentUser('tenantId') tenantId: string,
    @Query('id') id: string,
    @Body() dto: UpdateHolidayDto,
  ) {
    const holiday = await this.holidayService.updateHoliday(tenantId, id, dto);
    return { message: 'common.updated', data: holiday };
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  @Permissions('manage:all')
  async deleteHoliday(
    @CurrentUser('tenantId') tenantId: string,
    @Query('id') id: string,
  ) {
    return this.holidayService.deleteHoliday(tenantId, id);
  }
}
