import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TenantService } from './tenant.service.js';
import { CreateTenantDto } from './dto/create-tenant.dto.js';
import { Permissions } from '../../common/decorators/permissions.decorator.js';

@Controller('tenants')
export class TenantController {
  constructor(private tenantService: TenantService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Permissions('manage:all')
  create(@Body() dto: CreateTenantDto) {
    return this.tenantService.createTenant(dto);
  }
}
