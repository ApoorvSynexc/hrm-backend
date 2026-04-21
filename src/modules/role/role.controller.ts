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
  Put,
} from '@nestjs/common';
import { RoleService } from './role.service.js';
import { CreateRoleDto, UpdateRoleDto, AssignPermissionDto, SetRolePermissionsDto } from './dto/index.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Permissions } from '../../common/decorators/permissions.decorator.js';

@Controller('role')
export class RoleController {
  constructor(private roleService: RoleService) { }

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
   * Get all roles
   * GET /roles
   */
  @Get("list")
  @Permissions('read:role')
  async list(
    @CurrentUser('tenantId') tenantId: string,
  ) {
    const roles = await this.roleService.getRoles(tenantId);
    return { message: 'common.fetched', data: roles };
  }

  /**
   * Get a specific role by ID
   * GET /roles/single?id=xxx
   */
  @Get()
  @Permissions('read:role')
  async getById(
    @CurrentUser('tenantId') tenantId: string,
    @Query('id') id: string,
  ) {
    const role = await this.roleService.getRoleById(tenantId, id);
    return { message: 'common.fetched', data: role };
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
   * Get all permissions
   * GET /role/permissions
   */
  @Get('permission/list')
  @Permissions('read:permission')
  async getRolePermissions() {
    const permissions = await this.roleService.getRolePermissions();
    return { message: 'common.fetched', data: permissions };
  }

  /**
   * Set all permissions for a role (bulk update)
   * PATCH /role/permissions
   */
  @Put('permission')
  @HttpCode(HttpStatus.OK)
  @Permissions('manage:role')
  async setRolePermissions(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: SetRolePermissionsDto,
  ) {
    const rolePermissions = await this.roleService.setRolePermissions(tenantId, dto);
    return { message: 'common.updated', data: rolePermissions };
  }
}
