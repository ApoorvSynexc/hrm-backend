export const DEFAULT_PERMISSIONS = [
  // SUPER_ADMIN permission (covers everything - all actions on all subjects)
  {
    id: '660e8400-e29b-41d4-a716-446655440000',
    action: 'manage',
    subject: 'all',
    description: 'Full system access (SUPER_ADMIN only)',
  },

  // === GLOBAL PERMISSIONS (Same across all tenants, created once via seed) ===
  // These are NOT available to SUPER_ADMIN (not needed - has manage:all)
  // These are for ADMIN, HR, RM, EMPLOYEE roles within a tenant
  // Note: tenantId: null means global - each tenant will map these to their roles

  // Employee management
  {
    id: '660e8400-e29b-41d4-a716-446655440001',
    action: 'create',
    subject: 'employee',
    description: 'Create employees',
    tenantId: null,
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440002',
    action: 'read',
    subject: 'employee',
    description: 'View employees',
    tenantId: null,
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440003',
    action: 'update',
    subject: 'employee',
    description: 'Update employees',
    tenantId: null,
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440004',
    action: 'delete',
    subject: 'employee',
    description: 'Delete employees',
    tenantId: null,
  },

  // Department management
  {
    id: '660e8400-e29b-41d4-a716-446655440005',
    action: 'create',
    subject: 'department',
    description: 'Create departments',
    tenantId: null,
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440006',
    action: 'read',
    subject: 'department',
    description: 'View departments',
    tenantId: null,
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440007',
    action: 'update',
    subject: 'department',
    description: 'Update departments',
    tenantId: null,
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440008',
    action: 'delete',
    subject: 'department',
    description: 'Delete departments',
    tenantId: null,
  },

  // Leave management
  {
    id: '660e8400-e29b-41d4-a716-446655440009',
    action: 'create',
    subject: 'leave',
    description: 'Create leave requests',
    tenantId: null,
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440010',
    action: 'read',
    subject: 'leave',
    description: 'View leave requests',
    tenantId: null,
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440011',
    action: 'update',
    subject: 'leave',
    description: 'Update leave requests',
    tenantId: null,
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440012',
    action: 'delete',
    subject: 'leave',
    description: 'Delete leave requests',
    tenantId: null,
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440013',
    action: 'approve',
    subject: 'leave',
    description: 'Approve leave requests',
    tenantId: null,
  },

  // Payroll management
  {
    id: '660e8400-e29b-41d4-a716-446655440014',
    action: 'create',
    subject: 'payroll',
    description: 'Create payroll records',
    tenantId: null,
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440015',
    action: 'read',
    subject: 'payroll',
    description: 'View payroll records',
    tenantId: null,
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440016',
    action: 'update',
    subject: 'payroll',
    description: 'Update payroll records',
    tenantId: null,
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440017',
    action: 'delete',
    subject: 'payroll',
    description: 'Delete payroll records',
    tenantId: null,
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440018',
    action: 'approve',
    subject: 'payroll',
    description: 'Approve payroll',
    tenantId: null,
  },

  // Attendance management
  {
    id: '660e8400-e29b-41d4-a716-446655440019',
    action: 'create',
    subject: 'attendance',
    description: 'Create attendance records',
    tenantId: null,
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440020',
    action: 'read',
    subject: 'attendance',
    description: 'View attendance records',
    tenantId: null,
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440021',
    action: 'update',
    subject: 'attendance',
    description: 'Update attendance records',
    tenantId: null,
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440022',
    action: 'delete',
    subject: 'attendance',
    description: 'Delete attendance records',
    tenantId: null,
  },

  // Attendance regularization
  {
    id: '660e8400-e29b-41d4-a716-446655440023',
    action: 'create',
    subject: 'attendance_regularization',
    description: 'Request attendance regularization',
    tenantId: null,
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440024',
    action: 'read',
    subject: 'attendance_regularization',
    description: 'View attendance regularization requests',
    tenantId: null,
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440025',
    action: 'update',
    subject: 'attendance_regularization',
    description: 'Update attendance regularization requests',
    tenantId: null,
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440026',
    action: 'delete',
    subject: 'attendance_regularization',
    description: 'Delete attendance regularization requests',
    tenantId: null,
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440027',
    action: 'approve',
    subject: 'attendance_regularization',
    description: 'Approve attendance regularization requests',
    tenantId: null,
  },

  // Working hours configuration
  {
    id: '660e8400-e29b-41d4-a716-446655440028',
    action: 'read',
    subject: 'working_hours',
    description: 'View working hours configuration',
    tenantId: null,
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440029',
    action: 'update',
    subject: 'working_hours',
    description: 'Configure working hours',
    tenantId: null,
  },

  // Working days configuration
  {
    id: '660e8400-e29b-41d4-a716-446655440030',
    action: 'read',
    subject: 'working_days',
    description: 'View working days configuration',
    tenantId: null,
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440031',
    action: 'update',
    subject: 'working_days',
    description: 'Configure working days',
    tenantId: null,
  },
] as const;

