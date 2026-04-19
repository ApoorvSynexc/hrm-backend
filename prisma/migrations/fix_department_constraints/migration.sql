-- FixDepartmentConstraints
-- Drop old unique constraints that block soft delete reuse
ALTER TABLE "Department" DROP CONSTRAINT IF EXISTS "Department_tenantId_name_status_key";
ALTER TABLE "Department" DROP CONSTRAINT IF EXISTS "Department_tenantId_name_key";

-- Drop old index if it exists
DROP INDEX IF EXISTS idx_department_tenant_active_name;

-- Create partial unique index (only enforces uniqueness for ACTIVE records)
CREATE UNIQUE INDEX idx_department_tenant_active_name ON "Department"("tenantId", name) WHERE status = 'ACTIVE';
