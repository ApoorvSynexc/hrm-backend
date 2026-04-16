import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { RolePermissionRepository } from '../../tenant/repositories/role-permission.repository.js';
import {
  PERMISSIONS_KEY,
} from '../../../common/decorators/permissions.decorator.js';
import { JwtPayload } from '../../../common/decorators/current-user.decorator.js';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private rolePermissionRepository: RolePermissionRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get required permissions from route metadata
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no permissions required, allow (authenticated-only route)
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as JwtPayload;

    if (!user) {
      throw new ForbiddenException('Access denied');
    }

    // Convert empty string tenantId to null for SUPER_ADMIN
    const tenantId = user.tenantId || null;

    // Fetch user's role permissions from database
    const rolePermissions = await this.rolePermissionRepository.findManyWithPermission(
      tenantId,
      user.role,
    );

    // Build a Set of user's permissions in "action:subject" format
    const userPermissions = new Set(
      rolePermissions.map(
        (rp) => `${rp.permission.action}:${rp.permission.subject}`,
      ),
    );

    // SUPER_ADMIN check - manage:all grants access to everything
    if (userPermissions.has('manage:all')) {
      return true;
    }

    // Check if user has all required permissions
    const hasAllPermissions = requiredPermissions.every((perm) =>
      userPermissions.has(perm),
    );

    if (!hasAllPermissions) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
