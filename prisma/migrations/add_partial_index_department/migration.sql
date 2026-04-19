-- AddPartialUniqueIndex
-- Drop old constraints first
ALTER TABLE "Department" DROP CONSTRAINT IF EXISTS "Department_tenantId_name_status_key";
ALTER TABLE "Department" DROP CONSTRAINT IF EXISTS "Department_tenantId_name_key";

-- Create partial unique index (only for ACTIVE records)
CREATE UNIQUE INDEX idx_department_tenant_active_name ON "Department"("tenantId", name) WHERE status = 'ACTIVE';
