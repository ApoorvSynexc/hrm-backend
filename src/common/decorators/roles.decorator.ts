import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Declare required roles for a route.
 * Used by RolesGuard (Step 5).
 *
 * @example
 * @Roles('HR_MANAGER', 'SUPER_ADMIN')
 * @Delete('employees/:id')
 * deleteEmployee(@Param('id') id: string) { ... }
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
