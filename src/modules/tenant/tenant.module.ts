import { Module } from '@nestjs/common';
import { TenantService } from './tenant.service.js';
import { TenantController } from './tenant.controller.js';
import { TenantRepository } from './repositories/tenant.repository.js';
import { RoleRepository } from './repositories/role.repository.js';
import { PermissionRepository } from './repositories/permission.repository.js';
import { RolePermissionRepository } from './repositories/role-permission.repository.js';
import { WorkingHoursRepository } from './repositories/working-hours.repository.js';
import { WorkingDayRepository } from './repositories/working-day.repository.js';
import { AccountModule } from '../account/account.module.js';

@Module({
  imports: [AccountModule],
  controllers: [TenantController],
  providers: [
    TenantService,
    TenantRepository,
    RoleRepository,
    PermissionRepository,
    RolePermissionRepository,
    WorkingHoursRepository,
    WorkingDayRepository,
  ],
  exports: [
    TenantRepository,
    RoleRepository,
    PermissionRepository,
    RolePermissionRepository,
    WorkingHoursRepository,
    WorkingDayRepository,
  ],
})
export class TenantModule {}
