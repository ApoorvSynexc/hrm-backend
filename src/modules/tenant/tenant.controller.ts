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
import { TenantService } from './tenant.service.js';
import { CreateTenantDto, UpdateTenantDto } from './dto/index.js';
import { Permissions } from '../../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@Controller('tenant')
export class TenantController {
  constructor(private tenantService: TenantService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Permissions('manage:all')
  create(@Body() dto: CreateTenantDto) {
    return this.tenantService.createTenant(dto);
  }

  @Get("list")
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

  @Delete()
  @HttpCode(HttpStatus.OK)
  @Permissions('manage:all')
  async deleteTenant(@Query('id') tenantId: string) {
    await this.tenantService.deleteTenant(tenantId);
    return { message: 'common.deleted' };
  }
}
