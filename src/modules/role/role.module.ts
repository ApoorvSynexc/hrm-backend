import { Module } from '@nestjs/common';
import { TenantModule } from '../tenant/tenant.module.js';
import { RoleService } from './role.service.js';
import { RoleController } from './role.controller.js';

@Module({
  imports: [TenantModule],
  controllers: [RoleController],
  providers: [RoleService],
})
export class RoleModule {}
