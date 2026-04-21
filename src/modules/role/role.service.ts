import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { RoleRepository, PermissionRepository, RolePermissionRepository } from './repositories/index.js';
import { CreateRoleDto, UpdateRoleDto, AssignPermissionDto } from './dto/index.js';

@Injectable()
export class RoleService {
  constructor(
    private roleRepository: RoleRepository,
    private permissionRepository: PermissionRepository,
    private rolePermissionRepository: RolePermissionRepository,
  ) {}

  async createRole(tenantId: string, dto: CreateRoleDto) {
    // Check if role name already exists for this tenant
    const existingRole = await this.roleRepository.findFirstByTenantAndName(
      tenantId,
      dto.name,
    );

    if (existingRole) {
      throw new BadRequestException(
        `Role "${dto.name}" already exists`,
      );
    }

    return await this.roleRepository.create({
      tenantId,
      name: dto.name,
      description: dto.description,
      isSystem: false,
    });
  }

  async getRoles(tenantId: string) {
    const roles = await this.roleRepository.findManyByTenant(tenantId);
    return roles.filter(role => role.name !== 'ADMIN');
  }

  async getRoleById(tenantId: string, id: string) {
    const role = await this.roleRepository.findByTenantAndId(tenantId, id);

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return role;
  }

  async updateRole(
    tenantId: string,
    id: string,
    dto: UpdateRoleDto,
  ) {
    const role = await this.getRoleById(tenantId, id);

    // Block updating system roles entirely
    if (role.isSystem) {
      throw new BadRequestException('Cannot update system role');
    }

    // Check name uniqueness if name is being changed
    if (dto.name && dto.name !== role.name) {
      const existingRole = await this.roleRepository.findFirstByTenantAndName(
        tenantId,
        dto.name,
      );

      if (existingRole) {
        throw new BadRequestException(
          `Role "${dto.name}" already exists`,
        );
      }
    }

    return await this.roleRepository.update(id, {
      name: dto.name,
      description: dto.description,
    });
  }

  async deleteRole(tenantId: string, id: string) {
    const role = await this.getRoleById(tenantId, id);

    // Block deleting system roles
    if (role.isSystem) {
      throw new BadRequestException('Cannot delete system role');
    }

    return await this.roleRepository.delete(id);
  }

  async getPermissions() {
    return await this.permissionRepository.findMany();
  }

  async getRolePermissions(tenantId: string, roleId: string) {
    const role = await this.getRoleById(tenantId, roleId);
    const rolePermissions = await this.rolePermissionRepository.findManyByRole(tenantId, roleId);
    return rolePermissions.map(rp => rp.permission);
  }

  async assignPermission(
    tenantId: string,
    roleId: string,
    dto: AssignPermissionDto,
  ) {
    // Check role exists
    const role = await this.getRoleById(tenantId, roleId);

    // Block assigning permissions to system roles
    if (role.isSystem) {
      throw new BadRequestException('Cannot modify permissions for system role');
    }

    // Check permission exists
    const permission = await this.permissionRepository.findMany({
      id: dto.permissionId,
    });

    if (!permission || permission.length === 0) {
      throw new NotFoundException('Permission not found');
    }

    // Check if assignment already exists
    const existing = await this.rolePermissionRepository.findByRoleAndPermission(
      tenantId,
      roleId,
      dto.permissionId,
    );

    if (existing) {
      throw new BadRequestException(
        'Permission already assigned to this role',
      );
    }

    return await this.rolePermissionRepository.create({
      tenantId,
      roleId,
      permissionId: dto.permissionId,
    });
  }

  async removePermission(
    tenantId: string,
    roleId: string,
    permissionId: string,
  ) {
    // Check role exists
    const role = await this.getRoleById(tenantId, roleId);

    // Block removing permissions from system roles
    if (role.isSystem) {
      throw new BadRequestException('Cannot modify permissions for system role');
    }

    // Check assignment exists
    const existing = await this.rolePermissionRepository.findByRoleAndPermission(
      tenantId,
      roleId,
      permissionId,
    );

    if (!existing) {
      throw new NotFoundException('Permission not assigned to this role');
    }

    return await this.rolePermissionRepository.deleteByRoleAndPermission(
      tenantId,
      roleId,
      permissionId,
    );
  }
}
