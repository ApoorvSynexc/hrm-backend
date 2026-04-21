/**
 * Role-Permission Mapping
 *
 * SUPER_ADMIN: Global application owner - Full access to all system operations
 * ADMIN: Tenant organization admin - Full control over tenant resources
 * HR: Human Resources - Employee, leave, and attendance management
 * RM: Reporting Manager - Approval authority and team visibility
 * EMPLOYEE: Regular employee - Self-service and personal data access
 */
export const DEFAULT_ROLE_PERMISSIONS = {
  SUPER_ADMIN: [
    'manage:all', // Has all permissions globally
  ],

  ADMIN: [
    // Role Management
    'create:role',
    'read:role',
    'update:role',
    'delete:role',
    'manage:role',

    // Permission Management (Read-only)
    'read:permission',

    // Employee Management
    'create:employee',
    'read:employee',
    'update:employee',
    'delete:employee',

    // Department Management
    'create:department',
    'read:department',
    'update:department',
    'delete:department',

    // Designation Management
    'create:designation',
    'read:designation',
    'update:designation',
    'delete:designation',

    // Working Schedule Management
    'create:working_schedule',
    'read:working_schedule',
    'update:working_schedule',
    'delete:working_schedule',

    // Leave Management
    'create:leave',
    'read:leave',
    'update:leave',
    'delete:leave',
    'approve:leave',

    // Payroll Management
    'create:payroll',
    'read:payroll',
    'update:payroll',
    'delete:payroll',
    'approve:payroll',

    // Attendance Management
    'create:attendance',
    'read:attendance',
    'update:attendance',
    'delete:attendance',

    // Attendance Regularization Management
    'create:attendance_regularization',
    'read:attendance_regularization',
    'update:attendance_regularization',
    'delete:attendance_regularization',
    'approve:attendance_regularization',
  ],

  HR: [
    // Role Management (Read-only)
    'read:role',

    // Employee Management
    'create:employee',
    'read:employee',
    'update:employee',
    'delete:employee',

    // Department Management
    'create:department',
    'read:department',
    'update:department',
    'delete:department',

    // Designation Management
    'create:designation',
    'read:designation',
    'update:designation',
    'delete:designation',

    // Working Schedule Management (Read/Update only)
    'create:working_schedule',
    'read:working_schedule',
    'update:working_schedule',
    'delete:working_schedule',

    // Leave Management
    'create:leave',
    'read:leave',
    'update:leave',
    'delete:leave',
    'approve:leave',

    // Payroll (Read-only, can approve processed payroll)
    'read:payroll',
    'approve:payroll',

    // Attendance Management
    'create:attendance',
    'read:attendance',
    'update:attendance',
    'delete:attendance',

    // Attendance Regularization
    'create:attendance_regularization',
    'read:attendance_regularization',
    'update:attendance_regularization',
    'delete:attendance_regularization',
    'approve:attendance_regularization',
  ],

  RM: [
    // Employee (Read-only - to see team members)
    'read:employee',

    // Working Schedule (Read-only)
    'read:working_schedule',

    // Leave (Approve requests from team members)
    'approve:leave',
    'read:leave',

    // Attendance (Read-only - to view team attendance)
    'read:attendance',

    // Attendance Regularization (Approve requests from team members)
    'read:attendance_regularization',
    'approve:attendance_regularization',
  ],

  EMPLOYEE: [
    // Employee (Read-only - own profile)
    'read:employee',

    // Working Schedule (Read-only)
    'read:working_schedule',

    // Leave (Self-service)
    'create:leave',
    'read:leave',
    'update:leave',

    // Attendance (Read-only - own attendance)
    'read:attendance',

    // Attendance Regularization (Self-service)
    'create:attendance_regularization',
    'read:attendance_regularization',
    'update:attendance_regularization',
  ],
} as const;

