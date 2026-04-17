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
import { TenantService } from './tenant.service.js';
import { CreateTenantDto, UpdateTenantDto, ConfigureWorkingHoursDto, ConfigureWorkingDaysDto } from './dto/index.js';
import { Permissions } from '../../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@Controller('tenants')
export class TenantController {
  constructor(private tenantService: TenantService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Permissions('manage:all')
  create(@Body() dto: CreateTenantDto) {
    return this.tenantService.createTenant(dto);
  }

  @Get()
  @Permissions('read:tenant')
  async list(
    @Query('pagination') pagination?: boolean,
    @Query('limit') limit?: number,
    @Query('page') page?: number,
    @Query('search') search?: string,
  ) {
    const result = await this.tenantService.listTenants({
      pagination: pagination !== false,
      limit: limit ? Number(limit) : 10,
      page: page ? Number(page) : 1,
      search: search || '',
    });
    return { message: 'common.fetched', data: result.data, meta: result.meta };
  }

  @Patch()
  @HttpCode(HttpStatus.OK)
  @Permissions('manage:tenant')
  update(@CurrentUser('tenantId') tenantId: string, @Body() dto: UpdateTenantDto) {
    return this.tenantService.updateTenant(tenantId, dto);
  }

  @Get('working-hours')
  @Permissions('read:tenant')
  async getWorkingHours(@CurrentUser('tenantId') tenantId: string) {
    const config = await this.tenantService.getWorkingHoursConfig(tenantId);
    return { message: 'common.fetched', data: config };
  }

  @Post('working-hours')
  @HttpCode(HttpStatus.OK)
  @Permissions('manage:tenant')
  async configureWorkingHours(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: ConfigureWorkingHoursDto,
  ) {
    const config = await this.tenantService.configureWorkingHours(tenantId, dto);
    return { message: 'common.updated', data: config };
  }

  @Get('working-days')
  @Permissions('read:tenant')
  async getWorkingDays(@CurrentUser('tenantId') tenantId: string) {
    const config = await this.tenantService.getWorkingDaysConfig(tenantId);
    return { message: 'common.fetched', data: config };
  }

  @Post('working-days')
  @HttpCode(HttpStatus.OK)
  @Permissions('manage:tenant')
  async configureWorkingDays(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: ConfigureWorkingDaysDto,
  ) {
    const config = await this.tenantService.configureWorkingDays(tenantId, dto);
    return { message: 'common.updated', data: config };
  }
}
