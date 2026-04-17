import { Module } from '@nestjs/common';
import { RoleService } from './role.service.js';
import { RoleController } from './role.controller.js';
import { PermissionRepository, RoleRepository, RolePermissionRepository } from './repositories/index.js';

@Module({
  controllers: [RoleController],
  providers: [RoleService, PermissionRepository, RoleRepository, RolePermissionRepository],
  exports: [PermissionRepository, RoleRepository, RolePermissionRepository],
})
export class RoleModule {}
