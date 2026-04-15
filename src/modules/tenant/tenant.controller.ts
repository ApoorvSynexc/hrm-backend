import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import type { JwtPayload } from '../common/decorators/current-user.decorator.js';
import { TenantService } from './tenant.service.js';
import { CreateTenantDto } from './dto/create-tenant.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';

@Controller('tenants')
export class TenantController {
  constructor(private tenantService: TenantService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles('SUPER_ADMIN')
  create(
    @Body() dto: CreateTenantDto,
    @CurrentUser() user: JwtPayload,
  ) {
    // Manual SUPER_ADMIN check (until RolesGuard is implemented)
    if (user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Only SUPER_ADMIN can create tenants');
    }

    return this.tenantService.createTenant(dto);
  }
}
