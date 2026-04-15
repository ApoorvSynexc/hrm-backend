export const DEFAULT_PERMISSIONS = [
  // System-wide permissions (Global - only for SUPER_ADMIN)
  {
    id: '660e8400-e29b-41d4-a716-446655440000',
    action: 'manage',
    subject: 'all',
    description: 'Full system access',
    tenantId: null,
  },

  // User management (System-only, not copied to tenants)
  {
    id: '660e8400-e29b-41d4-a716-446655440001',
    action: 'create',
    subject: 'user',
    description: 'Create users',
    tenantId: null,
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440002',
    action: 'read',
    subject: 'user',
    description: 'View users',
    tenantId: null,
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440003',
    action: 'update',
    subject: 'user',
    description: 'Update users',
    tenantId: null,
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440004',
    action: 'delete',
    subject: 'user',
    description: 'Delete users',
    tenantId: null,
  },

  // Role management (System-only, not copied to tenants)
  {
    id: '660e8400-e29b-41d4-a716-446655440005',
    action: 'manage',
    subject: 'role',
    description: 'Manage roles',
    tenantId: null,
  },

  // Permission management (System-only, not copied to tenants)
  {
    id: '660e8400-e29b-41d4-a716-446655440006',
    action: 'manage',
    subject: 'permission',
    description: 'Manage permissions',
    tenantId: null,
  },

  // Employee management (Copied to each tenant)
  {
    id: '660e8400-e29b-41d4-a716-446655440007',
    action: 'create',
    subject: 'employee',
    description: 'Create employees',
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440008',
    action: 'read',
    subject: 'employee',
    description: 'View employees',
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440009',
    action: 'update',
    subject: 'employee',
    description: 'Update employees',
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440010',
    action: 'delete',
    subject: 'employee',
    description: 'Delete employees',
  },

  // Department management (Copied to each tenant)
  {
    id: '660e8400-e29b-41d4-a716-446655440011',
    action: 'create',
    subject: 'department',
    description: 'Create departments',
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440012',
    action: 'read',
    subject: 'department',
    description: 'View departments',
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440013',
    action: 'update',
    subject: 'department',
    description: 'Update departments',
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440014',
    action: 'delete',
    subject: 'department',
    description: 'Delete departments',
  },

  // Leave management (Copied to each tenant)
  {
    id: '660e8400-e29b-41d4-a716-446655440015',
    action: 'create',
    subject: 'leave',
    description: 'Create leave requests',
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440016',
    action: 'read',
    subject: 'leave',
    description: 'View leave requests',
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440017',
    action: 'update',
    subject: 'leave',
    description: 'Update leave requests',
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440018',
    action: 'delete',
    subject: 'leave',
    description: 'Delete leave requests',
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440019',
    action: 'approve',
    subject: 'leave',
    description: 'Approve leave requests',
  },

  // Payroll management (Copied to each tenant)
  {
    id: '660e8400-e29b-41d4-a716-446655440020',
    action: 'create',
    subject: 'payroll',
    description: 'Create payroll records',
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440021',
    action: 'read',
    subject: 'payroll',
    description: 'View payroll records',
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440022',
    action: 'update',
    subject: 'payroll',
    description: 'Update payroll records',
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440023',
    action: 'delete',
    subject: 'payroll',
    description: 'Delete payroll records',
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440024',
    action: 'approve',
    subject: 'payroll',
    description: 'Approve payroll',
  },

  // Attendance management (Copied to each tenant)
  {
    id: '660e8400-e29b-41d4-a716-446655440025',
    action: 'create',
    subject: 'attendance',
    description: 'Create attendance records',
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440026',
    action: 'read',
    subject: 'attendance',
    description: 'View attendance records',
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440027',
    action: 'update',
    subject: 'attendance',
    description: 'Update attendance records',
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440028',
    action: 'delete',
    subject: 'attendance',
    description: 'Delete attendance records',
  },

  // Attendance regularization (Copied to each tenant)
  {
    id: '660e8400-e29b-41d4-a716-446655440029',
    action: 'create',
    subject: 'attendance_regularization',
    description: 'Request attendance regularization',
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440030',
    action: 'read',
    subject: 'attendance_regularization',
    description: 'View attendance regularization requests',
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440031',
    action: 'update',
    subject: 'attendance_regularization',
    description: 'Update attendance regularization requests',
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440032',
    action: 'delete',
    subject: 'attendance_regularization',
    description: 'Delete attendance regularization requests',
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440033',
    action: 'approve',
    subject: 'attendance_regularization',
    description: 'Approve attendance regularization requests',
  },
] as const;

