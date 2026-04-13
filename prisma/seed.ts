import 'dotenv/config';
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
  const globalRoles = DEFAULT_ROLES.filter(
    (role) => 'tenantId' in role && role.tenantId === null,
  );

  for (const role of globalRoles) {
    await prisma.role.upsert({
      where: { id: role.id },
      update: {
        name: role.name,
        description: role.description,
        isSystem: role.isSystem,
      },
      create: role,
    });
  }
}

async function seedGlobalPermissions() {
  const globalPermissions = DEFAULT_PERMISSIONS.filter(
    (permission) => 'tenantId' in permission && permission.tenantId === null,
  );

  for (const permission of globalPermissions) {
    await prisma.permission.upsert({
      where: { id: permission.id },
      update: {
        action: permission.action,
        subject: permission.subject,
        description: permission.description,
      },
      create: permission,
    });
  }
}

async function seedSuperAdminRolePermissions() {
  const permissions = await prisma.permission.findMany({
    where: { tenantId: null },
  });
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
        roleId: 'role_super_admin',
        permissionId: permission.id,
      },
    });

    if (!existingRolePermission) {
      await prisma.rolePermission.create({
        data: {
          id: `rp_super_admin_${permission.id}`,
          tenantId: null,
          roleId: 'role_super_admin',
          permissionId: permission.id,
        },
      });
    } else {
      await prisma.rolePermission.update({
        where: { id: existingRolePermission.id },
        data: {
          id: `rp_super_admin_${permission.id}`,
          tenantId: null,
          roleId: 'role_super_admin',
          permissionId: permission.id,
        },
      });
    }
  }
}

async function seedSuperAdminUser() {
  await prisma.user.upsert({
    where: { id: DEFAULT_SUPER_ADMIN.id },
    update: {
      email: DEFAULT_SUPER_ADMIN.email,
      passwordHash: DEFAULT_SUPER_ADMIN.passwordHash,
      firstName: DEFAULT_SUPER_ADMIN.firstName,
      lastName: DEFAULT_SUPER_ADMIN.lastName,
      isActive: DEFAULT_SUPER_ADMIN.isActive,
      roleId: 'role_super_admin',
    },
    create: {
      id: DEFAULT_SUPER_ADMIN.id,
      tenantId: DEFAULT_SUPER_ADMIN.tenantId,
      email: DEFAULT_SUPER_ADMIN.email,
      passwordHash: DEFAULT_SUPER_ADMIN.passwordHash,
      firstName: DEFAULT_SUPER_ADMIN.firstName,
      lastName: DEFAULT_SUPER_ADMIN.lastName,
      isActive: DEFAULT_SUPER_ADMIN.isActive,
      roleId: 'role_super_admin',
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
