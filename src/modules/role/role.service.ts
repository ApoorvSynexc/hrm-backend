import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service.js';
import { RoleRepository, PermissionRepository, RolePermissionRepository } from './repositories/index.js';
import { CreateRoleDto, UpdateRoleDto, AssignPermissionDto, SetRolePermissionsDto } from './dto/index.js';

@Injectable()
export class RoleService {
  constructor(
    private roleRepository: RoleRepository,
    private permissionRepository: PermissionRepository,
    private rolePermissionRepository: RolePermissionRepository,
    private prisma: PrismaService,
  ) {}

  async createRole(tenantId: string, dto: CreateRoleDto) {
    // Check if role name already exists for this tenant
    const existingRole = await this.roleRepository.find({
      tenantId,
      name: dto.name,
    });

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
    const roles = await this.roleRepository.findAll({ tenantId });
    return roles.filter(role => role.name !== 'ADMIN');
  }

  async getRoleById(tenantId: string, id: string) {
    const role = await this.roleRepository.find({ id, tenantId });

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
      const existingRole = await this.roleRepository.find({
        tenantId,
        name: dto.name,
      });

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

  async getRolePermissions() {
    // Return all permissions from Permission table
    return await this.permissionRepository.findMany();
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

  /**
   * Set all permissions for a role (replaces existing)
   */
  async setRolePermissions(tenantId: string, dto: SetRolePermissionsDto) {
    // Verify role exists
    const role = await this.getRoleById(tenantId, dto.roleId);

    // Block modifying system roles
    if (role.isSystem) {
      throw new BadRequestException('Cannot modify permissions for system role');
    }

    // Verify all permissions exist
    for (const permissionId of dto.permissionIds) {
      const permission = await this.permissionRepository.findMany({
        id: permissionId,
      });

      if (!permission || permission.length === 0) {
        throw new NotFoundException(`Permission not found: ${permissionId}`);
      }
    }

    // Run in transaction: delete old and create new
    return await this.prisma.$transaction(async (tx) => {
      // Delete all existing permissions for this role
      await tx.rolePermission.deleteMany({
        where: {
          tenantId,
          roleId: dto.roleId,
        },
      });

      // Create new permissions
      const rolePermissions = await Promise.all(
        dto.permissionIds.map((permissionId) =>
          tx.rolePermission.create({
            data: {
              tenantId,
              roleId: dto.roleId,
              permissionId,
            },
          }),
        ),
      );

      return rolePermissions;
    });
  }
}
