# Prisma Migration Workflow - Complete Guide

**Last Updated:** 2026-06-14  
**Purpose:** Prevent database reset issues by following correct migration workflow  
**Author:** Team  

---

## 📌 **CRITICAL: Read This First**

🚨 **NEVER DO THIS:**
- ❌ `npx prisma db push` (in team/production)
- ❌ `npx prisma migrate reset` (in production)
- ❌ Modify schema.prisma without creating migration first
- ❌ Skip committing migration files

✅ **ALWAYS DO THIS:**
- ✅ Use `npx prisma migrate dev` (development)
- ✅ Use `npx prisma migrate deploy` (production)
- ✅ Create migration BEFORE modifying schema
- ✅ Commit migration files to git

---

## 🔄 **Correct Workflow - Step by Step**

### **Scenario 1: Adding a Column to Existing Table**

#### Step 1: Create Migration (Development Only)
```bash
npx prisma migrate dev --name add_user_phone_field
```

**Output:**
```
✔ Name of migration ... add_user_phone_field
✔ Database reset
✔ Generated Prisma Client
```

#### Step 2: Modify Schema
Edit `prisma/schema.prisma`:
```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  firstName String
  lastName  String
+ phone     String?  // ← NEW FIELD
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

#### Step 3: Regenerate Client
```bash
npx prisma generate
```

#### Step 4: Verify TypeScript
```bash
npx tsc --noEmit
# Should show: 0 errors
```

#### Step 5: Commit Migration File
```bash
git add prisma/migrations/
git commit -m "Add phone field to User model"
```

#### Step 6: Test Locally
```bash
npm run start:dev
# Test the feature with the new field
```

#### Step 7: Deploy to Production
```bash
# Production server only
npx prisma migrate deploy
```

---

### **Scenario 2: Adding an Index to Existing Table**

#### Step 1: Create Migration
```bash
npx prisma migrate dev --name add_user_email_index
```

#### Step 2: Modify Schema
```prisma
model User {
  id    String @id @default(cuid())
  email String @unique
  
  @@index([email])  // ← NEW INDEX
}
```

#### Step 3: Regenerate & Test
```bash
npx prisma generate
npx tsc --noEmit
npm run start:dev
```

#### Step 4: Commit
```bash
git add prisma/migrations/
git commit -m "Add email index for faster lookups"
```

---

### **Scenario 3: Adding a New Table**

#### Step 1: Create Migration
```bash
npx prisma migrate dev --name create_audit_log_table
```

#### Step 2: Modify Schema
```prisma
model AuditLog {
  id        String   @id @default(cuid())
  userId    String
  action    String
  changes   Json
  
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  createdAt DateTime @default(now())
  
  @@index([userId])
}

model User {
  // ... existing fields ...
  auditLogs AuditLog[]  // ← ADD RELATION
}
```

#### Step 3: Regenerate, Test, Commit
```bash
npx prisma generate
npx tsc --noEmit
npm run start:dev
git add prisma/migrations/
git commit -m "Create AuditLog table for tracking changes"
```

---

## 🚀 **Production Deployment Process**

### **Before Deploying to Production:**

1. **Create migration in development**
   ```bash
   npx prisma migrate dev --name <description>
   ```

2. **Test locally** - Make sure feature works

3. **Commit migration file**
   ```bash
   git add prisma/migrations/
   git commit -m "Migration: <description>"
   ```

4. **Push to git**
   ```bash
   git push origin <branch>
   ```

5. **Create PR** - Let team review

### **Deploying to Production:**

```bash
# SSH into production server
ssh user@production-server

# Navigate to project
cd /app/hrm-backend

# Pull latest code (includes migration files)
git pull origin main

# Deploy pending migrations
npx prisma migrate deploy

# Verify no errors
echo "Migration complete"
```

**That's it!** No reset, no data loss. ✅

---

## ⚠️ **Common Mistakes & How to Avoid**

### **Mistake 1: Using `db push` Instead of `migrate dev`**

```bash
# ❌ WRONG
npx prisma db push

# ✅ CORRECT
npx prisma migrate dev --name <description>
```

**Why:** `db push` bypasses migration history. In a team, this causes drift.

---

### **Mistake 2: Modifying Schema Without Creating Migration First**

```bash
# ❌ WRONG - Modify schema first
# Edit schema.prisma
# Then: npx prisma migrate dev --name ...

# ✅ CORRECT - Create migration first
npx prisma migrate dev --name my_change
# Then modify schema.prisma based on migration
```

**Why:** Prisma needs to track what changed. Creating migration first ensures proper history.

---

### **Mistake 3: Not Committing Migration Files**

```bash
# ❌ WRONG
npx prisma migrate dev --name add_field
# Don't commit migration files
git commit -m "Add field" # ← Migration files missing!

# ✅ CORRECT
npx prisma migrate dev --name add_field
git add prisma/migrations/
git commit -m "Add field to User"
```

**Why:** Migration files are part of your codebase. Without them, teammates can't sync database.

---

### **Mistake 4: Resetting Database in Development**

```bash
# ❌ Only use if truly stuck
npx prisma migrate reset

# ✅ First try
npx prisma migrate deploy

# ✅ If still broken
npx prisma migrate resolve --rolled-back <migration-name>
```

**Why:** Reset deletes ALL data. Use it only as last resort.

---

## 🔍 **Troubleshooting**

### **Error: "Drift detected: Your database schema is not in sync"**

```bash
# Check status
npx prisma migrate status

# Fix option 1: Deploy pending migrations
npx prisma migrate deploy

# Fix option 2: Mark migration as resolved
npx prisma migrate resolve --rolled-back <migration-name>

# Fix option 3 (development only): Reset
npx prisma migrate reset
```

---

### **Error: "Migration failed"**

```bash
# Check what went wrong
npx prisma migrate status

# Review the migration file
cat prisma/migrations/<migration-folder>/migration.sql

# If it's development, reset and try again
npx prisma migrate reset
npx prisma migrate dev --name <name>
```

---

### **Error: "Cannot apply migration in production"**

```bash
# In production, use deploy (not dev)
npx prisma migrate deploy

# Do NOT use
npx prisma migrate dev  # ❌ This resets database!
```

---

## 📋 **Command Reference**

| Task | Command | When to Use |
|------|---------|------------|
| Create migration | `npx prisma migrate dev --name <name>` | Development |
| Apply migration | `npx prisma migrate deploy` | Production/Staging |
| Check status | `npx prisma migrate status` | Anytime |
| Regenerate client | `npx prisma generate` | After schema change |
| Reset DB | `npx prisma migrate reset` | Development (emergency) |
| Resolve drift | `npx prisma migrate resolve --rolled-back <name>` | If drift occurs |

---

## ✅ **Checklist: Before Every Schema Change**

- [ ] I will create migration FIRST: `npx prisma migrate dev --name <description>`
- [ ] I will modify schema.prisma AFTER migration
- [ ] I will run `npx prisma generate`
- [ ] I will run `npx tsc --noEmit` (0 errors)
- [ ] I will test locally with `npm run start:dev`
- [ ] I will commit migration files: `git add prisma/migrations/`
- [ ] I will NOT use `npx prisma db push`
- [ ] I will use `npx prisma migrate deploy` in production

---

## 🎯 **The Golden Rule**

```
┌─────────────────────────────────────────┐
│  MIGRATIONS FIRST, SCHEMA SECOND        │
│                                         │
│  1. npx prisma migrate dev --name ...  │
│  2. Edit schema.prisma                 │
│  3. npx prisma generate                │
│  4. Test locally                       │
│  5. git add + commit migrations        │
│  6. Deploy to production               │
└─────────────────────────────────────────┘
```

---

## 📞 **Need Help?**

If you're unsure, ask:
1. "Did I create a migration before changing schema?" → If NO, start over
2. "Are my migration files committed?" → If NO, commit them
3. "Am I in production?" → If YES, use `migrate deploy` only

---

## 📖 **Related Links**

- [Prisma Migrations Docs](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Schema Reference](../approval-workflow.md)
- [Database Setup Guide](../database-setup.md)

---

**Remember: Migrations are permanent. Think before you create!** 🚀
