export const DEFAULT_ROLES = [
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    name: 'SUPER_ADMIN',
    description: 'Global application owner with full access',
    isSystem: true,
    tenantId: null,
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    name: 'ADMIN',
    description: 'Organization admin',
    isSystem: true,
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440003',
    name: 'HR',
    description: 'Human resources user',
    isSystem: true,
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440004',
    name: 'RM',
    description: 'Reporting manager',
    isSystem: true,
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440005',
    name: 'EMPLOYEE',
    description: 'Employee self-service user',
    isSystem: true,
  },
] as const;

