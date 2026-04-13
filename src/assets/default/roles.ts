export const DEFAULT_ROLES = [
  {
    id: 'role_super_admin',
    name: 'SUPER_ADMIN',
    description: 'Global application owner with full access',
    isSystem: true,
    tenantId: null,
  },
  {
    id: 'role_admin',
    name: 'ADMIN',
    description: 'Organization admin',
    isSystem: true,
  },
  {
    id: 'role_hr',
    name: 'HR',
    description: 'Human resources user',
    isSystem: true,
  },
  {
    id: 'role_rm',
    name: 'RM',
    description: 'Reporting manager',
    isSystem: true,
  },
  {
    id: 'role_employee',
    name: 'EMPLOYEE',
    description: 'Employee self-service user',
    isSystem: true,
  },
] as const;

