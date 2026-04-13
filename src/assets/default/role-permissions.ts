export const DEFAULT_ROLE_PERMISSIONS = {
  SUPER_ADMIN: ['manage:all'],
  ADMIN: [
    'manage:user',
    'manage:role',
    'manage:permission',
    'manage:employee',
    'manage:department',
    'manage:leave',
    'manage:payroll',
    'manage:attendance',
    'manage:attendance_regularization',
  ],
  HR: [
    'manage:employee',
    'manage:department',
    'manage:leave',
    'read:payroll',
    'manage:attendance',
    'manage:attendance_regularization',
  ],
  RM: [
    'read:employee',
    'approve:leave',
    'read:attendance',
    'approve:attendance_regularization',
  ],
  EMPLOYEE: [
    'read:employee',
    'read:attendance',
  ],
} as const;

