const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function seed() {
  const client = await pool.connect();

  try {
    console.log('🌱 Seeding database...\n');

    // Seed SUPER_ADMIN role
    await client.query(`
      INSERT INTO "Role" (id, name, description, "isSystem", "tenantId", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, true, NULL, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
    `, ['550e8400-e29b-41d4-a716-446655440001', 'SUPER_ADMIN', 'Global application owner with full access']);
    console.log('✓ SUPER_ADMIN role created');

    // Seed permissions
    const permissions = [
      ['660e8400-e29b-41d4-a716-446655440000', 'manage', 'all', 'Full system access (SUPER_ADMIN only)'],
      ['660e8400-e29b-41d4-a716-446655440001', 'create', 'employee', 'Create employees'],
      ['660e8400-e29b-41d4-a716-446655440002', 'read', 'employee', 'View employees'],
      ['660e8400-e29b-41d4-a716-446655440003', 'update', 'employee', 'Update employees'],
      ['660e8400-e29b-41d4-a716-446655440004', 'delete', 'employee', 'Delete employees'],
      ['660e8400-e29b-41d4-a716-446655440005', 'create', 'department', 'Create departments'],
      ['660e8400-e29b-41d4-a716-446655440006', 'read', 'department', 'View departments'],
      ['660e8400-e29b-41d4-a716-446655440007', 'update', 'department', 'Update departments'],
      ['660e8400-e29b-41d4-a716-446655440008', 'delete', 'department', 'Delete departments'],
      ['660e8400-e29b-41d4-a716-446655440009', 'create', 'role', 'Create roles'],
      ['660e8400-e29b-41d4-a716-446655440010', 'read', 'role', 'View roles'],
      ['660e8400-e29b-41d4-a716-446655440011', 'update', 'role', 'Update roles'],
      ['660e8400-e29b-41d4-a716-446655440012', 'delete', 'role', 'Delete roles'],
      ['660e8400-e29b-41d4-a716-446655440013', 'manage', 'role', 'Manage role permissions'],
      ['660e8400-e29b-41d4-a716-446655440014', 'read', 'permission', 'View permissions'],
      ['660e8400-e29b-41d4-a716-446655440015', 'create', 'attendance', 'Create attendance records'],
      ['660e8400-e29b-41d4-a716-446655440016', 'read', 'attendance', 'View attendance records'],
      ['660e8400-e29b-41d4-a716-446655440017', 'create', 'attendance_regularization', 'Create regularization requests'],
      ['660e8400-e29b-41d4-a716-446655440018', 'read', 'attendance_regularization', 'View regularization requests'],
      ['660e8400-e29b-41d4-a716-446655440019', 'approve', 'attendance_regularization', 'Approve regularization requests'],
      ['660e8400-e29b-41d4-a716-446655440020', 'read', 'tenant', 'View tenant config'],
      ['660e8400-e29b-41d4-a716-446655440021', 'manage', 'tenant', 'Manage tenant config'],
    ];

    for (const [id, action, subject, desc] of permissions) {
      await client.query(`
        INSERT INTO "Permission" (id, action, subject, description, "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET action = EXCLUDED.action;
      `, [id, action, subject, desc]);
    }
    console.log(`✓ ${permissions.length} permissions created`);

    // Link SUPER_ADMIN to manage:all
    const crypto = require('crypto');
    const rpId = crypto.randomUUID();
    await client.query(`
      INSERT INTO "RolePermission" (id, "tenantId", "roleId", "permissionId")
      VALUES ($1, NULL, $2, $3)
      ON CONFLICT DO NOTHING;
    `, [rpId, '550e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440000']);
    console.log('✓ SUPER_ADMIN role linked to manage:all permission');

    // Hash password
    const passwordHash = await bcrypt.hash('12345678', 12);

    // Seed SUPER_ADMIN user
    await client.query(`
      INSERT INTO "User" (id, email, "passwordHash", "firstName", "lastName", status, "tenantId", "roleId")
      VALUES ($1, $2, $3, $4, $5, $6, NULL, $7)
      ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
    `, ['550e8400-e29b-41d4-a716-446655440000', 'apoorv@yopmail.com', passwordHash, 'Super', 'Admin', 'ACTIVE', '550e8400-e29b-41d4-a716-446655440001']);
    console.log('✓ SUPER_ADMIN user created (apoorv@yopmail.com / 12345678)');

    console.log('\n✅ Database seeded successfully!\n');
  } catch (error) {
    console.error('❌ Seed error:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
