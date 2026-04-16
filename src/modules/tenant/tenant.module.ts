import { Module } from '@nestjs/common';
import { TenantService } from './tenant.service.js';
import { TenantController } from './tenant.controller.js';
import { TenantRepository } from './repositories/tenant.repository.js';
import { RoleRepository } from './repositories/role.repository.js';
import { PermissionRepository } from './repositories/permission.repository.js';
import { RolePermissionRepository } from './repositories/role-permission.repository.js';
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
  ],
  exports: [
    TenantRepository,
    RoleRepository,
    PermissionRepository,
    RolePermissionRepository,
  ],
})
export class TenantModule {}
