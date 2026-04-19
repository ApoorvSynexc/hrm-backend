import 'dotenv/config';
import bcrypt from 'bcrypt';
import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function seedGlobalRoles() {
  const superAdminRole = {
    id: '550e8400-e29b-41d4-a716-446655440001',
    name: 'SUPER_ADMIN',
    description: 'Global application owner with full access',
    isSystem: true,
    tenantId: null,
  };

  await prisma.role.upsert({
    where: { id: superAdminRole.id },
    update: {
      name: superAdminRole.name,
      description: superAdminRole.description,
      isSystem: superAdminRole.isSystem,
    },
    create: superAdminRole,
  });

  console.log('✓ Global roles seeded');
}

async function seedGlobalPermissions() {
  const permissions = [
    { id: '660e8400-e29b-41d4-a716-446655440000', action: 'manage', subject: 'all', description: 'Full system access (SUPER_ADMIN only)' },
    { id: '660e8400-e29b-41d4-a716-446655440001', action: 'create', subject: 'employee', description: 'Create employees' },
    { id: '660e8400-e29b-41d4-a716-446655440002', action: 'read', subject: 'employee', description: 'View employees' },
    { id: '660e8400-e29b-41d4-a716-446655440003', action: 'update', subject: 'employee', description: 'Update employees' },
    { id: '660e8400-e29b-41d4-a716-446655440004', action: 'delete', subject: 'employee', description: 'Delete employees' },
    { id: '660e8400-e29b-41d4-a716-446655440005', action: 'create', subject: 'department', description: 'Create departments' },
    { id: '660e8400-e29b-41d4-a716-446655440006', action: 'read', subject: 'department', description: 'View departments' },
    { id: '660e8400-e29b-41d4-a716-446655440007', action: 'update', subject: 'department', description: 'Update departments' },
    { id: '660e8400-e29b-41d4-a716-446655440008', action: 'delete', subject: 'department', description: 'Delete departments' },
    { id: '660e8400-e29b-41d4-a716-446655440009', action: 'create', subject: 'role', description: 'Create roles' },
    { id: '660e8400-e29b-41d4-a716-446655440010', action: 'read', subject: 'role', description: 'View roles' },
    { id: '660e8400-e29b-41d4-a716-446655440011', action: 'update', subject: 'role', description: 'Update roles' },
    { id: '660e8400-e29b-41d4-a716-446655440012', action: 'delete', subject: 'role', description: 'Delete roles' },
    { id: '660e8400-e29b-41d4-a716-446655440013', action: 'manage', subject: 'role', description: 'Manage role permissions' },
    { id: '660e8400-e29b-41d4-a716-446655440014', action: 'read', subject: 'permission', description: 'View permissions' },
    { id: '660e8400-e29b-41d4-a716-446655440015', action: 'create', subject: 'attendance', description: 'Create attendance records' },
    { id: '660e8400-e29b-41d4-a716-446655440016', action: 'read', subject: 'attendance', description: 'View attendance records' },
    { id: '660e8400-e29b-41d4-a716-446655440017', action: 'create', subject: 'attendance_regularization', description: 'Create attendance regularization requests' },
    { id: '660e8400-e29b-41d4-a716-446655440018', action: 'read', subject: 'attendance_regularization', description: 'View regularization requests' },
    { id: '660e8400-e29b-41d4-a716-446655440019', action: 'approve', subject: 'attendance_regularization', description: 'Approve regularization requests' },
    { id: '660e8400-e29b-41d4-a716-446655440020', action: 'read', subject: 'tenant', description: 'View tenant config' },
    { id: '660e8400-e29b-41d4-a716-446655440021', action: 'manage', subject: 'tenant', description: 'Manage tenant config' },
  ];

  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: { id: perm.id },
      update: { action: perm.action as any, subject: perm.subject as any, description: perm.description },
      create: { ...perm, action: perm.action as any, subject: perm.subject as any },
    });
  }

  console.log(`✓ ${permissions.length} permissions seeded`);
}

async function seedSuperAdminRolePermissions() {
  const superAdminRole = { id: '550e8400-e29b-41d4-a716-446655440001' };
  const allPermission = { id: '660e8400-e29b-41d4-a716-446655440000' };

  const existing = await prisma.rolePermission.findFirst({
    where: {
      tenantId: null,
      roleId: superAdminRole.id,
      permissionId: allPermission.id,
    },
  });

  if (!existing) {
    await prisma.rolePermission.create({
      data: {
        tenantId: null,
        roleId: superAdminRole.id,
        permissionId: allPermission.id,
      },
    });
  }

  console.log('✓ SUPER_ADMIN role permissions seeded');
}

async function seedSuperAdminUser() {
  const superAdminRole = { id: '550e8400-e29b-41d4-a716-446655440001' };
  const hashedPassword = await bcrypt.hash('12345678', 12);

  await prisma.user.upsert({
    where: { id: '550e8400-e29b-41d4-a716-446655440000' },
    update: {
      email: 'apoorv@yopmail.com',
      passwordHash: hashedPassword,
      firstName: 'Super',
      lastName: 'Admin',
      status: 'ACTIVE',
      roleId: superAdminRole.id,
    },
    create: {
      id: '550e8400-e29b-41d4-a716-446655440000',
      tenantId: null,
      email: 'apoorv@yopmail.com',
      passwordHash: hashedPassword,
      firstName: 'Super',
      lastName: 'Admin',
      status: 'ACTIVE',
      roleId: superAdminRole.id,
    },
  });

  console.log('✓ SUPER_ADMIN user seeded (apoorv@yopmail.com / 12345678)');
}

async function main() {
  await seedGlobalRoles();
  await seedGlobalPermissions();
  await seedSuperAdminRolePermissions();
  await seedSuperAdminUser();
  console.log('\n✅ Database seeding complete!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error('❌ Seed error:', error);
    await prisma.$disconnect();
    process.exit(1);
  });
