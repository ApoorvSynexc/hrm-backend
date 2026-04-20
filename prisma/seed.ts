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
    // Employee management
    { id: '660e8400-e29b-41d4-a716-446655440001', action: 'create', subject: 'employee', description: 'Create employees' },
    { id: '660e8400-e29b-41d4-a716-446655440002', action: 'read', subject: 'employee', description: 'View employees' },
    { id: '660e8400-e29b-41d4-a716-446655440003', action: 'update', subject: 'employee', description: 'Update employees' },
    { id: '660e8400-e29b-41d4-a716-446655440004', action: 'delete', subject: 'employee', description: 'Delete employees' },
    // Role management
    { id: '660e8400-e29b-41d4-a716-446655440005', action: 'create', subject: 'role', description: 'Create roles' },
    { id: '660e8400-e29b-41d4-a716-446655440032', action: 'read', subject: 'role', description: 'View roles' },
    { id: '660e8400-e29b-41d4-a716-446655440033', action: 'update', subject: 'role', description: 'Update roles' },
    { id: '660e8400-e29b-41d4-a716-446655440034', action: 'delete', subject: 'role', description: 'Delete roles' },
    { id: '660e8400-e29b-41d4-a716-446655440035', action: 'manage', subject: 'role', description: 'Manage role permissions' },
    // Permission management
    { id: '660e8400-e29b-41d4-a716-446655440036', action: 'read', subject: 'permission', description: 'View permissions' },
    // Department management
    { id: '660e8400-e29b-41d4-a716-446655440037', action: 'create', subject: 'department', description: 'Create departments' },
    { id: '660e8400-e29b-41d4-a716-446655440038', action: 'read', subject: 'department', description: 'View departments' },
    { id: '660e8400-e29b-41d4-a716-446655440039', action: 'update', subject: 'department', description: 'Update departments' },
    { id: '660e8400-e29b-41d4-a716-446655440040', action: 'delete', subject: 'department', description: 'Delete departments' },
    // Designation management
    { id: '660e8400-e29b-41d4-a716-446655440064', action: 'create', subject: 'designation', description: 'Create designations' },
    { id: '660e8400-e29b-41d4-a716-446655440065', action: 'read', subject: 'designation', description: 'View designations' },
    { id: '660e8400-e29b-41d4-a716-446655440066', action: 'update', subject: 'designation', description: 'Update designations' },
    { id: '660e8400-e29b-41d4-a716-446655440067', action: 'delete', subject: 'designation', description: 'Delete designations' },
    // Leave management
    { id: '660e8400-e29b-41d4-a716-446655440041', action: 'create', subject: 'leave', description: 'Create leave requests' },
    { id: '660e8400-e29b-41d4-a716-446655440042', action: 'read', subject: 'leave', description: 'View leave requests' },
    { id: '660e8400-e29b-41d4-a716-446655440043', action: 'update', subject: 'leave', description: 'Update leave requests' },
    { id: '660e8400-e29b-41d4-a716-446655440044', action: 'delete', subject: 'leave', description: 'Delete leave requests' },
    { id: '660e8400-e29b-41d4-a716-446655440045', action: 'approve', subject: 'leave', description: 'Approve leave requests' },
    // Payroll management
    { id: '660e8400-e29b-41d4-a716-446655440046', action: 'create', subject: 'payroll', description: 'Create payroll records' },
    { id: '660e8400-e29b-41d4-a716-446655440047', action: 'read', subject: 'payroll', description: 'View payroll records' },
    { id: '660e8400-e29b-41d4-a716-446655440048', action: 'update', subject: 'payroll', description: 'Update payroll records' },
    { id: '660e8400-e29b-41d4-a716-446655440049', action: 'delete', subject: 'payroll', description: 'Delete payroll records' },
    { id: '660e8400-e29b-41d4-a716-446655440050', action: 'approve', subject: 'payroll', description: 'Approve payroll' },
    // Attendance management
    { id: '660e8400-e29b-41d4-a716-446655440051', action: 'create', subject: 'attendance', description: 'Create attendance records' },
    { id: '660e8400-e29b-41d4-a716-446655440052', action: 'read', subject: 'attendance', description: 'View attendance records' },
    { id: '660e8400-e29b-41d4-a716-446655440053', action: 'update', subject: 'attendance', description: 'Update attendance records' },
    { id: '660e8400-e29b-41d4-a716-446655440054', action: 'delete', subject: 'attendance', description: 'Delete attendance records' },
    // Attendance regularization
    { id: '660e8400-e29b-41d4-a716-446655440055', action: 'create', subject: 'attendance_regularization', description: 'Request attendance regularization' },
    { id: '660e8400-e29b-41d4-a716-446655440056', action: 'read', subject: 'attendance_regularization', description: 'View attendance regularization requests' },
    { id: '660e8400-e29b-41d4-a716-446655440057', action: 'update', subject: 'attendance_regularization', description: 'Update attendance regularization requests' },
    { id: '660e8400-e29b-41d4-a716-446655440058', action: 'delete', subject: 'attendance_regularization', description: 'Delete attendance regularization requests' },
    { id: '660e8400-e29b-41d4-a716-446655440059', action: 'approve', subject: 'attendance_regularization', description: 'Approve attendance regularization requests' },
    // Working schedule management
    { id: '660e8400-e29b-41d4-a716-446655440068', action: 'create', subject: 'working_schedule', description: 'Create working schedules' },
    { id: '660e8400-e29b-41d4-a716-446655440069', action: 'read', subject: 'working_schedule', description: 'View working schedules' },
    { id: '660e8400-e29b-41d4-a716-446655440070', action: 'update', subject: 'working_schedule', description: 'Update working schedules' },
    { id: '660e8400-e29b-41d4-a716-446655440071', action: 'delete', subject: 'working_schedule', description: 'Delete working schedules' },
  ];

  for (const perm of permissions) {
    const existing = await prisma.permission.findFirst({
      where: { action: perm.action as any, subject: perm.subject as any },
    });

    if (existing) {
      await prisma.permission.update({
        where: { id: existing.id },
        data: { description: perm.description },
      });
    } else {
      await prisma.permission.create({
        data: { ...perm, action: perm.action as any, subject: perm.subject as any },
      });
    }
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
