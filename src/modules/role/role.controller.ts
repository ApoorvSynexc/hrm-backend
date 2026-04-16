import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { RoleService } from './role.service.js';
import { CreateRoleDto, UpdateRoleDto, AssignPermissionDto } from './dto/index.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Permissions } from '../../common/decorators/permissions.decorator.js';

@Controller('roles')
export class RoleController {
  constructor(private roleService: RoleService) {}

  /**
   * Get all available permissions
   * GET /permissions
   */
  @Get('permissions')
  @Permissions('read:permission')
  async getPermissions() {
    const permissions = await this.roleService.getPermissions();
    return { message: 'common.fetched', data: permissions };
  }

  /**
   * Create a new role
   * POST /roles
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Permissions('create:role')
  async create(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: CreateRoleDto,
  ) {
    const role = await this.roleService.createRole(tenantId, dto);
    return { message: 'common.created', data: role };
  }

  /**
   * Get all roles or a specific role
   * GET /roles (list all)
   * GET /roles?id=xxx (get single role)
   */
  @Get()
  @Permissions('read:role')
  async list(
    @CurrentUser('tenantId') tenantId: string,
    @Query('id') id?: string,
  ) {
    if (id) {
      const role = await this.roleService.getRoleById(tenantId, id);
      return { message: 'common.fetched', data: role };
    }

    const roles = await this.roleService.getRoles(tenantId);
    return { message: 'common.fetched', data: roles };
  }

  /**
   * Update a role
   * PATCH /roles?id=xxx
   */
  @Patch()
  @HttpCode(HttpStatus.OK)
  @Permissions('update:role')
  async update(
    @CurrentUser('tenantId') tenantId: string,
    @Query('id') id: string,
    @Body() dto: UpdateRoleDto,
  ) {
    const role = await this.roleService.updateRole(tenantId, id, dto);
    return { message: 'common.updated', data: role };
  }

  /**
   * Delete a role
   * DELETE /roles?id=xxx
   */
  @Delete()
  @HttpCode(HttpStatus.OK)
  @Permissions('delete:role')
  async delete(
    @CurrentUser('tenantId') tenantId: string,
    @Query('id') id: string,
  ) {
    const role = await this.roleService.deleteRole(tenantId, id);
    return { message: 'common.deleted', data: role };
  }

  /**
   * Assign a permission to a role
   * POST /roles/permissions?roleId=xxx
   */
  @Post('permissions')
  @HttpCode(HttpStatus.CREATED)
  @Permissions('manage:role')
  async assignPermission(
    @CurrentUser('tenantId') tenantId: string,
    @Query('roleId') roleId: string,
    @Body() dto: AssignPermissionDto,
  ) {
    const rolePermission = await this.roleService.assignPermission(
      tenantId,
      roleId,
      dto,
    );
    return { message: 'common.created', data: rolePermission };
  }

  /**
   * Remove a permission from a role
   * DELETE /roles/permissions?roleId=xxx&permId=xxx
   */
  @Delete('permissions')
  @HttpCode(HttpStatus.OK)
  @Permissions('manage:role')
  async removePermission(
    @CurrentUser('tenantId') tenantId: string,
    @Query('roleId') roleId: string,
    @Query('permId') permId: string,
  ) {
    await this.roleService.removePermission(tenantId, roleId, permId);
    return { message: 'common.deleted', data: null };
  }
}
