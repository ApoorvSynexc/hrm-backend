import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Declare required permissions for a route.
 * Used by PermissionsGuard (Step 5).
 *
 * Format: '<resource>:<action>'
 *
 * @example
 * @Permissions('employee:read', 'employee:write')
 * @Get('employees')
 * getEmployees() { ... }
 */
export const Permissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
