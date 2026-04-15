# User-Employee Unified Model

## Overview

The User and Employee models have been merged into a **single User table**. This eliminates confusion and ensures every user has login credentials.

## Architecture

```
User (Unified Model)
├── Authentication Fields (Required for all users)
│   ├── email
│   ├── passwordHash
│   └── status (ACTIVE, INACTIVE, DELETED)
│
└── Employee Fields (Optional - only for actual employees)
    ├── employeeCode
    ├── designation
    ├── hireDate
    ├── employmentStatus (ACTIVE, INACTIVE, TERMINATED)
    ├── salary
    └── department relationship
```

## User Categories

### 1. **Admin/System Users** (No employee data)
These users have login but are NOT employees:
- Super Admin (global system admin)
- Tenant Admin (organization admin)
- HR Staff (may be external contractors)

```typescript
// Example: Admin User
{
  id: "...",
  tenantId: "tenant-id",
  email: "admin@company.com",
  passwordHash: "...",
  firstName: "John",
  lastName: "Doe",
  status: "ACTIVE",
  roleId: "admin-role-id",
  
  // Employee fields are NULL/undefined
  employeeCode: null,
  designation: null,
  hireDate: null,
  employmentStatus: "ACTIVE",
  salary: null,
  departmentId: null,
}
```

### 2. **Employee Users** (Have employee data + login)
These are regular employees who have both login credentials and employee records:

```typescript
// Example: Employee User
{
  id: "...",
  tenantId: "tenant-id",
  email: "employee@company.com",
  passwordHash: "...",
  firstName: "Jane",
  lastName: "Smith",
  status: "ACTIVE",
  roleId: "employee-role-id",
  
  // Employee fields are POPULATED
  employeeCode: "EMP-001",
  designation: "Software Engineer",
  hireDate: "2024-01-15",
  employmentStatus: "ACTIVE",
  salary: 5000.00,
  departmentId: "dept-id",
}
```

## Database Schema

### User Table

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| **id** | String | ✅ | Primary key (CUID) |
| **tenantId** | String | ❌ | Foreign key to Tenant (null for super admin) |
| **email** | String | ✅ | Login email (unique per tenant) |
| **passwordHash** | String | ✅ | Bcrypt hashed password |
| **firstName** | String | ✅ | First name |
| **lastName** | String | ✅ | Last name |
| **phone** | String | ❌ | Phone number |
| **status** | Enum | ✅ | ACTIVE \| INACTIVE \| DELETED |
| **roleId** | String | ❌ | Foreign key to Role |
| **employeeCode** | String | ❌ | Unique identifier (only for employees) |
| **departmentId** | String | ❌ | Foreign key to Department |
| **designation** | String | ❌ | Job title (only for employees) |
| **hireDate** | DateTime | ❌ | Employment start date |
| **employmentStatus** | Enum | ✅ | ACTIVE \| INACTIVE \| TERMINATED |
| **salary** | Decimal | ❌ | Monthly/annual salary |
| **createdAt** | DateTime | ✅ | Creation timestamp |
| **updatedAt** | DateTime | ✅ | Last update timestamp |

### Unique Constraints

```sql
-- One email per tenant (allows same email in different tenants)
UNIQUE(tenantId, email)

-- One employee code per tenant (for actual employees only)
UNIQUE(tenantId, employeeCode)

-- Composite key for data consistency
UNIQUE(id, tenantId)
```

## Relationships

### User → Department
- **Type**: Many-to-One
- **Nullable**: Yes (admins don't have a department)
- **FK**: `(departmentId, tenantId)`

### User → Role
- **Type**: Many-to-One
- **Nullable**: Yes
- **FK**: `roleId`

### User → Tenant
- **Type**: Many-to-One
- **Nullable**: Yes (super admin has tenantId = null)
- **FK**: `tenantId`

### User → Leave
- **Type**: One-to-Many
- **References**: Leave.userId

### User → Payroll
- **Type**: One-to-Many
- **References**: Payroll.userId

### User → Attendance
- **Type**: One-to-Many
- **References**: Attendance.userId

### User → AttendanceRegularization
- **Type**: One-to-Many
- **References**: AttendanceRegularization.userId

### User → AttendanceRegularization (Reviewed)
- **Type**: One-to-Many
- **Relation**: "ReviewedBy"
- **References**: AttendanceRegularization.reviewedByUserId

## Usage Examples

### Creating an Admin User
```typescript
const adminUser = await prisma.user.create({
  data: {
    tenantId: "tenant-123",
    email: "admin@org.com",
    passwordHash: await bcrypt.hash("password", 10),
    firstName: "Admin",
    lastName: "User",
    status: "ACTIVE",
    roleId: "admin-role-id",
    // Employee fields left null - this is an admin, not an employee
  },
});
```

### Creating an Employee User
```typescript
const employeeUser = await prisma.user.create({
  data: {
    tenantId: "tenant-123",
    email: "john@org.com",
    passwordHash: await bcrypt.hash("password", 10),
    firstName: "John",
    lastName: "Smith",
    phone: "555-1234",
    status: "ACTIVE",
    roleId: "employee-role-id",
    // Employee-specific data
    employeeCode: "EMP-0001",
    designation: "Senior Developer",
    hireDate: new Date("2023-06-01"),
    employmentStatus: "ACTIVE",
    salary: new Decimal("75000"),
    departmentId: "dept-456",
  },
});
```

### Querying Employees Only
```typescript
// Get all employees (users with employeeCode set)
const employees = await prisma.user.findMany({
  where: {
    tenantId: "tenant-123",
    employeeCode: { not: null },
  },
});

// Get admin users only (no employeeCode)
const admins = await prisma.user.findMany({
  where: {
    tenantId: "tenant-123",
    employeeCode: null,
  },
});
```

### Creating Leave Request
```typescript
const leave = await prisma.leave.create({
  data: {
    tenantId: "tenant-123",
    userId: "user-id", // Direct reference to User
    type: "ANNUAL",
    startDate: new Date("2024-06-01"),
    endDate: new Date("2024-06-05"),
    reason: "Vacation",
    status: "PENDING",
  },
});
```

## Migration Path

When upgrading to this model:

1. **Back up database**
2. **Run migration**: `npx prisma migrate dev --name merge_employee_into_user`
3. **Data migration**: Copy Employee data into User fields
4. **Update application code**: 
   - Replace `employee` references with `user`
   - Use `user.employeeCode` instead of `employee.employeeCode`
   - Use `user.employmentStatus` instead of `employee.status`
5. **Delete old Employee model**
6. **Run tests and validation**

## Benefits

✅ **Simplified**: One User table instead of two
✅ **Clear**: Every login has one record
✅ **Flexible**: Supports admins and employees in one model
✅ **Consistent**: All user relationships go through User
✅ **Scalable**: Easy to add more user types (contractors, vendors)

## Notes

- `status` field is for account status (ACTIVE, INACTIVE, DELETED)
- `employmentStatus` field is for employment status (ACTIVE, INACTIVE, TERMINATED)
- A user can be status=ACTIVE but employmentStatus=TERMINATED (former employee)
- Admin users don't need `employeeCode`, `designation`, or `hireDate`
