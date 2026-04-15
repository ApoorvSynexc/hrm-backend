# HRM Backend - Permissions & Role Mapping Guide

## Overview

This document describes the comprehensive permission system and role-based access control (RBAC) implemented in the HRM backend.

### Permission Structure

Permissions consist of two components:
- **Action**: The operation type (create, read, update, delete, approve, manage)
- **Subject**: The resource being accessed (employee, leave, payroll, etc.)

Permission format: `{action}:{subject}` (e.g., `create:employee`, `approve:leave`)

---

## Global System Permissions (Super Admin Only)

These permissions are tied to `tenantId: null` and are **NOT** copied to individual tenants.

| ID | Action | Subject | Description |
|----|--------|---------|-------------|
| 660e8400-e29b-41d4-a716-446655440000 | manage | all | Full system access |

### System-Only Permissions

These permissions manage system infrastructure and are excluded from tenant copies:

| ID Range | Action | Subject | Description | Notes |
|-----------|--------|---------|-------------|-------|
| 660e8400-e29b-41d4-a716-446655440001-004 | CRUD | user | User management | System-wide, not copied |
| 660e8400-e29b-41d4-a716-446655440005 | manage | role | Role management | System-wide, not copied |
| 660e8400-e29b-41d4-a716-446655440006 | manage | permission | Permission management | System-wide, not copied |

---

## Tenant-Scoped Permissions

These permissions are created as copies for each new tenant and can be assigned to tenant roles.

### Employee Module

| Action | Description |
|--------|-------------|
| create:employee | Create new employee records |
| read:employee | View employee information |
| update:employee | Modify employee records |
| delete:employee | Remove employee records |

### Department Module

| Action | Description |
|--------|-------------|
| create:department | Create new departments |
| read:department | View department information |
| update:department | Modify department details |
| delete:department | Remove departments |

### Leave Module

| Action | Description |
|--------|-------------|
| create:leave | Create/request leave |
| read:leave | View leave requests |
| update:leave | Modify leave requests |
| delete:leave | Cancel leave requests |
| approve:leave | Approve/reject leave requests |

### Payroll Module

| Action | Description |
|--------|-------------|
| create:payroll | Create payroll records |
| read:payroll | View payroll information |
| update:payroll | Modify payroll records |
| delete:payroll | Remove payroll records |
| approve:payroll | Process and approve payroll |

### Attendance Module

| Action | Description |
|--------|-------------|
| create:attendance | Create attendance records |
| read:attendance | View attendance logs |
| update:attendance | Modify attendance entries |
| delete:attendance | Remove attendance records |

### Attendance Regularization Module

| Action | Description |
|--------|-------------|
| create:attendance_regularization | Request attendance correction |
| read:attendance_regularization | View regularization requests |
| update:attendance_regularization | Modify requests |
| delete:attendance_regularization | Cancel requests |
| approve:attendance_regularization | Approve/reject corrections |

---

## Role-Based Permission Mapping

### 1. SUPER_ADMIN (Global System Administrator)

**Scope**: Global system access
**Tenant Association**: None (`tenantId: null`)

| Permission | Purpose |
|------------|---------|
| manage:all | Complete system access including tenant creation, user management, role/permission management |

**Key Capabilities**:
- Create and manage tenants
- Create super admin users
- Manage all system-level configurations
- Access all tenant data (if needed)

---

### 2. ADMIN (Tenant Organization Administrator)

**Scope**: Full control within a single tenant
**Typical User**: Organization admin, department head

| Module | Permissions |
|--------|------------|
| Employee | ✅ create, read, update, delete |
| Department | ✅ create, read, update, delete |
| Leave | ✅ create, read, update, delete, **approve** |
| Payroll | ✅ create, read, update, delete, **approve** |
| Attendance | ✅ create, read, update, delete |
| Attendance Regularization | ✅ create, read, update, delete, **approve** |

**Key Capabilities**:
- Full resource management across all modules
- Approval authority for leaves, payroll, and attendance corrections
- Employee and department management
- Cannot manage users, roles, or permissions (system-level)

---

### 3. HR (Human Resources)

**Scope**: Employee, leave, and attendance management
**Typical User**: HR specialist, HR manager

| Module | Permissions |
|--------|------------|
| Employee | ✅ create, read, update, delete |
| Department | ✅ create, read, update, delete |
| Leave | ✅ create, read, update, delete, **approve** |
| Payroll | 🔒 read only, **approve** |
| Attendance | ✅ create, read, update, delete |
| Attendance Regularization | ✅ create, read, update, delete, **approve** |

**Key Capabilities**:
- Full employee lifecycle management
- Leave request processing and approval
- Attendance tracking and regularization
- Payroll visibility and approval (no creation/modification)
- Cannot manage departments (optional based on org structure)

---

### 4. RM (Reporting Manager)

**Scope**: Team member visibility and approval authority
**Typical User**: Department manager, team lead

| Module | Permissions |
|--------|------------|
| Employee | 🔒 read only |
| Leave | 🔒 read only + **approve** |
| Attendance | 🔒 read only |
| Attendance Regularization | 🔒 read only + **approve** |

**Key Capabilities**:
- View team member information (limited)
- Approve/reject subordinates' leave requests
- Review team attendance records
- Approve attendance regularization requests from team members
- No creation or modification rights

---

### 5. EMPLOYEE (Regular Employee)

**Scope**: Self-service operations
**Typical User**: Regular employee, contractor

| Module | Permissions |
|--------|------------|
| Employee | 🔒 read only (own profile) |
| Leave | ✅ create, read, update |
| Attendance | 🔒 read only (own records) |
| Attendance Regularization | ✅ create, read, update |

**Key Capabilities**:
- View own profile and records
- Create and manage own leave requests
- View personal attendance history
- Request attendance corrections
- Cannot delete records
- Cannot manage other employees

---

## Permission Filtering Rules

### Global Permissions (tenantId: null)
- Only used for `SUPER_ADMIN` role
- Include: `manage:all`, `create:user`, `read:user`, `update:user`, `delete:user`, `manage:role`, `manage:permission`
- Excluded from tenant copies: `all`, `user`, `role`, `permission`

### Tenant-Scoped Permissions (copied per tenant)
- Subjects: `employee`, `department`, `leave`, `payroll`, `attendance`, `attendance_regularization`
- Actions: `create`, `read`, `update`, `delete`, `approve` (where applicable)
- Created automatically when a tenant is onboarded
- Linked to tenant-specific roles (`ADMIN`, `HR`, `RM`, `EMPLOYEE`)

---

## Access Control Examples

### Scenario 1: Employee Requests Leave
1. Employee has `create:leave` permission
2. Employee creates leave request (stored with `status: PENDING`)
3. Reporting Manager has `approve:leave` permission
4. RM reviews and approves/rejects

### Scenario 2: HR Manages Attendance
1. HR has `create:attendance` and `update:attendance` permissions
2. HR updates employee attendance records
3. Employee with `create:attendance_regularization` can request correction
4. HR (or RM) with `approve:attendance_regularization` approves correction

### Scenario 3: New Tenant Onboarding
1. Super Admin creates tenant
2. Tenant service automatically:
   - Creates 4 roles: `ADMIN`, `HR`, `RM`, `EMPLOYEE`
   - Copies all tenant-scoped permissions
   - Links appropriate permissions to each role
   - Creates initial admin user with `ADMIN` role

---

## Implementation Details

### Permission Seeding
- System permissions are seeded once during initial setup
- Each permission has a unique ID for stable references
- Tenant permissions are created dynamically per tenant

### Role Permission Linking
- Linked via `RolePermission` join table
- Composite unique constraint: `(tenantId, roleId, permissionId)`
- System roles (`SUPER_ADMIN`) tied to `tenantId: null`
- Tenant roles (`ADMIN`, `HR`, `RM`, `EMPLOYEE`) tied to specific tenant

### Dynamic Tenant Setup
When creating a tenant:
1. Tenant record created
2. Domain(s) associated
3. Default roles created (except SUPER_ADMIN)
4. Permissions copied from global definitions
5. Role-permission mappings established
6. Initial admin user created with `ADMIN` role

---

## Best Practices

1. **Least Privilege**: Assign minimal permissions needed for role
2. **Role Clarity**: Keep role definitions stable and predictable
3. **Approval Flow**: Use approval permissions for sensitive operations
4. **Audit Trail**: Log permission-based actions for compliance
5. **Regular Review**: Audit role-permission mappings quarterly

---

## Future Enhancements

- [ ] Resource-level permissions (own records vs. all)
- [ ] Conditional permissions (time-based, status-based)
- [ ] Custom role creation at tenant level
- [ ] Permission audit logging
- [ ] Role inheritance/composition
- [ ] Team-based permissions

---

## Quick Reference

| Role | Employee | Department | Leave | Payroll | Attendance | Att. Reg. |
|------|----------|-----------|-------|---------|-----------|----------|
| **SUPER_ADMIN** | All ✅ | All ✅ | All ✅ | All ✅ | All ✅ | All ✅ |
| **ADMIN** | CRUD ✅ | CRUD ✅ | CRUD + Approve ✅ | CRUD + Approve ✅ | CRUD ✅ | CRUD + Approve ✅ |
| **HR** | CRUD ✅ | CRUD ✅ | CRUD + Approve ✅ | Read + Approve ✅ | CRUD ✅ | CRUD + Approve ✅ |
| **RM** | Read 🔒 | - | Read + Approve ✅ | - | Read 🔒 | Read + Approve ✅ |
| **EMPLOYEE** | Read 🔒 | - | Create + Read + Update | - | Read 🔒 | Create + Read + Update |

Legend: ✅ Has access | 🔒 Read-only | - No access
