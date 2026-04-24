import 'dotenv/config';
import bcrypt from 'bcrypt';
import pg from 'pg';
import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { DEFAULT_PERMISSIONS } from '../src/assets/default/permissions.js';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const prisma = new PrismaClient({
  adapter: new PrismaPg(pool),
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
  const permissions = DEFAULT_PERMISSIONS.map((defaultPermission) => {
    const { tenantId: _tenantId, ...permission } = defaultPermission as typeof defaultPermission & {
      tenantId?: string | null;
    };

    return permission;
  });

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
