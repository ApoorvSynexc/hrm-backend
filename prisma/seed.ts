import 'dotenv/config';
import bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import {
  DEFAULT_PERMISSIONS,
  DEFAULT_ROLE_PERMISSIONS,
  DEFAULT_ROLES,
  DEFAULT_SUPER_ADMIN,
} from '../src/assets/default/index.js';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const permissionKey = (action: string, subject: string) => `${action}:${subject}`;

async function seedGlobalRoles() {
  // Only seed SUPER_ADMIN role (global-only)
  // Other tenant roles (ADMIN, HR, RM, EMPLOYEE) are created on-the-fly when creating a tenant
  const superAdminRole = DEFAULT_ROLES.find((role) => role.name === 'SUPER_ADMIN');

  if (superAdminRole) {
    await prisma.role.upsert({
      where: { id: superAdminRole.id },
      update: {
        name: superAdminRole.name,
        description: superAdminRole.description,
        isSystem: superAdminRole.isSystem,
      },
      create: superAdminRole,
    });
  }
}

async function seedGlobalPermissions() {
  // All permissions are global (no tenantId)
  for (const permission of DEFAULT_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { id: permission.id },
      update: {
        action: permission.action,
        subject: permission.subject,
        description: permission.description,
      },
      create: {
        id: permission.id,
        action: permission.action,
        subject: permission.subject,
        description: permission.description,
      },
    });
  }
}

async function seedSuperAdminRolePermissions() {
  const superAdminRole = DEFAULT_ROLES.find((r) => r.name === 'SUPER_ADMIN');
  if (!superAdminRole) {
    throw new Error('SUPER_ADMIN role not found in DEFAULT_ROLES');
  }

  const permissions = await prisma.permission.findMany();
  const permissionByKey = new Map(
    permissions.map((permission) => [
      permissionKey(permission.action, permission.subject),
      permission,
    ]),
  );

  for (const permissionName of DEFAULT_ROLE_PERMISSIONS.SUPER_ADMIN) {
    const permission = permissionByKey.get(permissionName);

    if (!permission) {
      throw new Error(`Missing permission: ${permissionName}`);
    }

    const existingRolePermission = await prisma.rolePermission.findFirst({
      where: {
        tenantId: null,
        roleId: superAdminRole.id,
        permissionId: permission.id,
      },
    });

    if (!existingRolePermission) {
      await prisma.rolePermission.create({
        data: {
          tenantId: null,
          roleId: superAdminRole.id,
          permissionId: permission.id,
        },
      });
    }
  }
}

async function seedSuperAdminUser() {
  const superAdminRole = DEFAULT_ROLES.find((r) => r.name === 'SUPER_ADMIN');
  if (!superAdminRole) {
    throw new Error('SUPER_ADMIN role not found in DEFAULT_ROLES');
  }

  // Hash the plain-text password with bcrypt
  const hashedPassword = await bcrypt.hash(DEFAULT_SUPER_ADMIN.passwordHash, 12);

  await prisma.user.upsert({
    where: { id: DEFAULT_SUPER_ADMIN.id },
    update: {
      email: DEFAULT_SUPER_ADMIN.email,
      passwordHash: hashedPassword,
      firstName: DEFAULT_SUPER_ADMIN.firstName,
      lastName: DEFAULT_SUPER_ADMIN.lastName,
      status: DEFAULT_SUPER_ADMIN.status,
      roleId: superAdminRole.id,
    },
    create: {
      id: DEFAULT_SUPER_ADMIN.id,
      tenantId: DEFAULT_SUPER_ADMIN.tenantId,
      email: DEFAULT_SUPER_ADMIN.email,
      passwordHash: hashedPassword,
      firstName: DEFAULT_SUPER_ADMIN.firstName,
      lastName: DEFAULT_SUPER_ADMIN.lastName,
      status: DEFAULT_SUPER_ADMIN.status,
      roleId: superAdminRole.id,
    },
  });
}

async function main() {
  await seedGlobalRoles();
  await seedGlobalPermissions();
  await seedSuperAdminRolePermissions();
  await seedSuperAdminUser();
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log('Default seed data inserted.');
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
