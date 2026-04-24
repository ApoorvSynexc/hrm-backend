# Frontend Implementation Guide — Employee Management & Approval Workflow

> **Context:** This HRM backend uses NestJS + Prisma. All requests require a JWT Bearer token.  
> The token payload contains: `sub` (userId), `email`, `tenantId`, `role` (ADMIN | HR | RM | EMPLOYEE).  
> All responses follow the shape `{ message: string, data: any, meta?: PaginationMeta }`.

---

## Role Hierarchy & Who Creates Whom

```
SUPER_ADMIN  (global, not tenant-scoped)
     │
   ADMIN      ← created at tenant creation time (auto-seeded)
     │  creates ↓
    HR         ← Admin creates HR. HR's reportingManagerId = Admin (auto-set)
     │  creates ↓
    RM         ← HR creates RM.  RM's reportingManagerId = HR (auto-set)
     │  creates ↓
EMPLOYEE      ← HR/Admin creates Employee. Must explicitly pass reportingManagerId
```

**Key rule for `reportingManagerId`:**

| Who is being created | `reportingManagerId` omitted | `reportingManagerId` provided |
|----------------------|------------------------------|-------------------------------|
| **HR** role | Auto-set to creator (Admin) | Use the provided value |
| **RM** role | Auto-set to creator (HR) | Use the provided value |
| **EMPLOYEE** role | `null` — no manager assigned | Use the provided value |

- Admin creates HR → omit `reportingManagerId`; backend auto-sets it to Admin's userId
- HR creates RM → omit `reportingManagerId`; backend auto-sets it to HR's userId
- HR/Admin creates Employee → **always pass `reportingManagerId`** from the dropdown; omitting it leaves the employee with no RM

**Admin's own RM:** Admin has no RM (`reportingManagerId = null`). When Admin submits a regularization request, the DIRECT_MANAGER approval step is automatically skipped and goes straight to HR.

---

## TypeScript Types

```typescript
// Roles that can be assigned as Reporting Manager
type ManagerRole = 'ADMIN' | 'HR' | 'RM';

interface Manager {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  employeeCode: string;
  role: { id: string; name: ManagerRole };
}

interface Employee {
  id: string;
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
  employeeCode: string;
  departmentId: string;
  designationId: string;
  workingScheduleId: string | null;
  roleId: string;
  hireDate: string; // ISO date
  salary: string | null;
  reportingManagerId: string | null;
  employmentStatus: 'ACTIVE' | 'INACTIVE' | 'TERMINATED';
  status: 'ACTIVE' | 'INACTIVE' | 'DELETED';
  createdAt: string;
  updatedAt: string;
}

interface CreateEmployeeBody {
  email: string;
  password: string;          // min 8 chars
  firstName: string;
  lastName: string;
  departmentId: string;
  designationId: string;
  workingScheduleId?: string;
  roleId?: string;
  hireDate: string;          // ISO 8601 date e.g. "2024-01-15"
  salary?: string;           // decimal string e.g. "50000.00"
  reportingManagerId?: string; // omit → creator becomes RM; pass explicitly for Employee
}

interface UpdateEmployeeBody {
  email?: string;
  firstName?: string;
  lastName?: string;
  departmentId?: string;
  designationId?: string;
  workingScheduleId?: string;
  roleId?: string;
  hireDate?: string;
  salary?: string;
  reportingManagerId?: string | null; // null = remove RM assignment
}

// Approval workflow types
type ApprovalModule = 'REGULARIZATION' | 'LEAVE';
type ApproverType = 'DIRECT_MANAGER' | 'ROLE' | 'SPECIFIC_USER';
type ApprovalInstanceStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
type StepInstanceStatus = 'NOT_STARTED' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'SKIPPED';

interface ApprovalStep {
  id: string;
  stepNumber: number;
  name: string | null;
  approverType: ApproverType;
  approverRoleId: string | null;
  approverUserId: string | null;
  isSkippable: boolean;
  escalationAfterHours: number | null;
  approverRole?: { id: string; name: string };
  approverUser?: { id: string; firstName: string; lastName: string; email: string };
}

interface ApprovalWorkflow {
  id: string;
  name: string;
  module: ApprovalModule;
  description: string | null;
  isDefault: boolean;
  isSystem: boolean;   // true = system-generated, cannot be deleted
  status: 'ACTIVE' | 'INACTIVE' | 'DELETED';
  steps: ApprovalStep[];
  createdAt: string;
  updatedAt: string;
}

interface StepInstance {
  id: string;
  stepNumber: number;
  stepName: string | null;
  approverType: ApproverType;
  status: StepInstanceStatus;
  approverId: string | null;
  approver?: { id: string; firstName: string; lastName: string; email: string };
  comment: string | null;
  rejectionReason: string | null;
  actedAt: string | null;
  pendingSince: string | null;
}

interface ApprovalInstance {
  id: string;
  status: ApprovalInstanceStatus;
  currentStep: number | null;
  stepInstances: StepInstance[];
}

interface Regularization {
  id: string;
  userId: string;
  tenantId: string;
  attendanceId: string | null;
  attendanceDate: string;
  requestedCheckIn: string | null;
  requestedCheckOut: string | null;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  approvalInstanceId: string | null;
  approvalInstance?: ApprovalInstance;
  createdAt: string;
  updatedAt: string;
}

interface ProcessStepBody {
  action: 'APPROVED' | 'REJECTED';
  comment?: string;
  rejectionReason?: string;
}

interface ForceReviewBody {
  action: 'APPROVED' | 'REJECTED';
  reason?: string;
}
```

---

## API Reference

### Employee APIs

#### `GET /employee/managers`
Returns ADMIN, HR, and RM users — use this to populate the "Select Reporting Manager" dropdown.

- **Access:** ADMIN, HR (anyone with `read:employee`)
- **Response:** `{ data: Manager[] }`

```typescript
// Example response
{
  data: [
    { id: "cm...", firstName: "John", lastName: "Smith", email: "john@co.com", employeeCode: "EMP001", role: { id: "...", name: "ADMIN" } },
    { id: "cm...", firstName: "Sarah", lastName: "Lee",  email: "sarah@co.com", employeeCode: "EMP002", role: { id: "...", name: "HR" } },
    { id: "cm...", firstName: "Mike", lastName: "Ray",   email: "mike@co.com",  employeeCode: "EMP003", role: { id: "...", name: "RM" } }
  ]
}
```

#### `POST /employee`
Create a new employee.

- **Access:** ADMIN, HR (`create:employee`)
- **Body:** `CreateEmployeeBody`
- **Note:** `reportingManagerId` auto-defaults to caller's userId if omitted. For Employee role, always pass it explicitly from the managers dropdown.

```typescript
// Admin creating HR — no reportingManagerId needed (auto = Admin)
POST /employee
{ "email": "hr@co.com", "password": "Pass1234", "firstName": "Sara", "lastName": "Jones",
  "departmentId": "...", "designationId": "...", "roleId": "<HR_role_id>", "hireDate": "2024-01-15" }

// HR creating Employee — must pass reportingManagerId explicitly
POST /employee
{ "email": "emp@co.com", "password": "Pass1234", "firstName": "Tom", "lastName": "Brown",
  "departmentId": "...", "designationId": "...", "roleId": "<EMPLOYEE_role_id>",
  "hireDate": "2024-01-15", "reportingManagerId": "<RM_user_id>" }
```

#### `GET /employee/list`
List all employees in the tenant.

- **Access:** ADMIN, HR, RM (`read:employee`)
- **Response:** `{ data: Employee[] }`

#### `GET /employee?id=<userId>`
Get a single employee by ID.

- **Access:** ADMIN, HR, RM (`read:employee`)

#### `PUT /employee?id=<userId>`
Update employee details including reassigning RM.

- **Access:** ADMIN, HR (`update:employee`)
- **Body:** `UpdateEmployeeBody`

```typescript
// Reassign RM
PUT /employee?id=<employeeId>
{ "reportingManagerId": "<new_rm_user_id>" }

// Remove RM assignment
PUT /employee?id=<employeeId>
{ "reportingManagerId": null }
```

#### `DELETE /employee?id=<userId>`
Soft-delete (terminate) an employee.

- **Access:** ADMIN, HR (`delete:employee`)

---

### Regularization APIs

#### `POST /regularizations`
Employee submits a regularization request. Backend creates an approval instance automatically using the tenant's default workflow.

- **Access:** Any authenticated user (`create:attendance_regularization`)
- **Body:**
```typescript
{
  attendanceDate: string;          // ISO date "2024-01-15"
  requestedCheckIn?: string;       // ISO datetime
  requestedCheckOut?: string;      // ISO datetime
  reason: string;
}
```
- **Response:** `{ data: Regularization }` — includes `approvalInstance` with all steps

#### `GET /regularizations/me`
Employee views their own requests with full approval trail.

- **Access:** Any authenticated user

#### `GET /regularizations/team?limit=10&page=1`
RM views their direct reports' pending regularizations.

- **Access:** RM only (403 for others)

#### `GET /regularizations/list?limit=10&page=1`
ADMIN/HR views all tenant regularizations.

- **Access:** ADMIN, HR, SUPER_ADMIN only (403 for RM/EMPLOYEE)

#### `GET /regularizations?id=<id>`
Get a single regularization with full approval trail.

- **Access:** Any role; employees only see their own

#### `PATCH /regularizations?id=<id>`
RM or HR approves/rejects via the workflow engine. The engine validates the caller's role against the current step.

- **Access:** `approve:attendance_regularization` (RM, HR, ADMIN)
- **Body:** `ProcessStepBody`

```typescript
// Approve
PATCH /regularizations?id=<id>
{ "action": "APPROVED", "comment": "Looks good" }

// Reject
PATCH /regularizations?id=<id>
{ "action": "REJECTED", "rejectionReason": "No valid reason provided" }
```

#### `PATCH /regularizations/override?id=<id>`
ADMIN force-approves or force-rejects any stuck regularization, bypassing all approver checks.

- **Access:** ADMIN only (`manage:attendance_regularization`)
- **Body:** `ForceReviewBody`

```typescript
PATCH /regularizations/override?id=<id>
{ "action": "APPROVED", "reason": "Manager is on leave, approving on behalf" }
```

#### `DELETE /regularizations?id=<id>`
Employee cancels their own PENDING request.

- **Access:** Owner only (`update:attendance_regularization`)

---

### Approval Workflow APIs (Admin Only)

#### `GET /approval-workflows?module=REGULARIZATION`
List all workflows for a module.

- **Access:** `read:approval_workflow` (ADMIN, HR)

#### `GET /approval-workflows/detail?id=<id>`
Get a single workflow with all steps.

- **Access:** `read:approval_workflow`

#### `POST /approval-workflows`
Create a custom workflow.

- **Access:** `manage:approval_workflow` (ADMIN only)
- **Body:**
```typescript
{
  name: string;
  module: 'REGULARIZATION' | 'LEAVE';
  description?: string;
  isDefault?: boolean;    // set this as the default for the module
  steps: Array<{
    stepNumber: number;
    name?: string;
    approverType: 'DIRECT_MANAGER' | 'ROLE' | 'SPECIFIC_USER';
    approverRoleId?: string;   // required if approverType === 'ROLE'
    approverUserId?: string;   // required if approverType === 'SPECIFIC_USER'
    isSkippable?: boolean;
    escalationAfterHours?: number;
  }>;
}
```

#### `PATCH /approval-workflows?id=<id>`
Update workflow name, description, or set as default.

- **Access:** `manage:approval_workflow` (ADMIN)

#### `DELETE /approval-workflows?id=<id>`
Delete a custom workflow.

- **Access:** `manage:approval_workflow` (ADMIN)
- **Note:** System-generated workflows (`isSystem: true`) **cannot be deleted** — returns 400. If the deleted workflow was the default, the system workflow is automatically restored as default.

#### `GET /approval-workflows/my-queue`
RM/HR sees all regularizations pending their action.

- **Access:** `approve:attendance_regularization`

---

## UI Implementation Guide

### Pages & Components to Build

#### 1. Employee Create/Edit Form

**Fields:**
- Email, Password (create only), First Name, Last Name
- Department (dropdown from departments API)
- Designation (dropdown from designations API)
- Working Schedule (optional dropdown)
- Role (dropdown from roles API)
- Hire Date (date picker)
- Salary (optional)
- **Reporting Manager** (dropdown from `GET /employee/managers`)

**RM Dropdown behavior:**
- Call `GET /employee/managers` on form mount
- Display as: `"{firstName} {lastName} ({role.name}) — {employeeCode}"`
- Group by role: ADMIN first, then HR, then RM
- For HR/RM creation → pre-select the current user as RM (matches backend auto-assign) but still allow override
- For Employee creation → show as required field (or at least prompt to select)
- Allow "No Manager" option (sends `reportingManagerId: null` or omits it)

**Auto-assign note for UX:** Show a helper text:  
*"If no manager is selected, the creator will be assigned as the reporting manager."*

---

#### 2. Employee List Page

Show `reportingManagerId` resolved as a name. Since the API returns the ID, you may need to either:
- Eagerly load manager info by fetching their profile, OR
- Ask the backend to include `reportingManager` in the employee list (the `employeeRepository.findAll` includes this if the Prisma `include` has it — check if the response already includes a `reportingManager` object)

Display each employee row:
```
EMP001 | Tom Brown | EMPLOYEE | Dept: Engineering | Manager: Mike Ray (RM)
```

---

#### 3. Regularization — Employee View (`/regularizations/me`)

Show each request with full approval trail:

```
Request: 2024-01-15 | Reason: "System issue"
Status: PENDING

Approval Trail:
  Step 1 — Reporting Manager Approval  [PENDING]
    Assigned to: Mike Ray (RM)
    Waiting since: 2024-01-16 10:00 AM
    Auto-escalates in: 36 hours

  Step 2 — HR Approval               [NOT_STARTED]
    Assigned to: HR Role (any HR user)
```

**Status badge colors:**
- `PENDING` → yellow
- `APPROVED` → green  
- `REJECTED` → red
- `CANCELLED` → grey
- `SKIPPED` → blue/muted (step was auto-skipped — no RM assigned or escalated)
- `NOT_STARTED` → grey (waiting for previous step)

---

#### 4. Regularization — RM View (`/regularizations/team`)

RM sees only their direct reports' requests. Show paginated list.

On each row:
- Employee name, attendance date, reason
- Current step status and who needs to act
- Action buttons: **Approve** / **Reject** (only if the current step is assigned to this RM)

**Check if RM can act:** Look at `approvalInstance.stepInstances`. Find the step with `status === 'PENDING'`. Check if that step's `approverType === 'DIRECT_MANAGER'` OR `approverId === currentUserId`. If yes, show action buttons.

---

#### 5. Regularization — HR/Admin View (`/regularizations/list`)

Shows all tenant regularizations. Same as RM view but HR acts on step 2 (ROLE type where approverRole = HR).

**HR can act** when: current PENDING step has `approverType === 'ROLE'` and `approverRole.name === 'HR'`.

**Admin override:** Show an "Override" button (only for ADMIN role) on any PENDING request. Uses `PATCH /regularizations/override?id=<id>`.

---

#### 6. Workflow Management Page (ADMIN only)

List all workflows grouped by module (REGULARIZATION / LEAVE).

**Table columns:**
```
Name | Module | Default | System | Steps | Status | Actions
```

**Rules for the Actions column:**
- `isSystem: true` → show "System" badge, hide Delete button, show "Set as Default" only if not already default
- `isDefault: true` → show "Default" badge, hide "Set as Default" button
- Custom workflows → show Edit, Delete, "Set as Default" buttons

**Create Workflow form:**
- Name, Module (select), Description
- Steps builder: add/remove steps, each step has:
  - Step Number (auto-increment)
  - Approver Type (DIRECT_MANAGER | ROLE | SPECIFIC_USER)
  - If ROLE → show role dropdown (from tenant roles)
  - If SPECIFIC_USER → show user search
  - Is Skippable toggle
  - Escalation Hours (optional number field)
- Set as Default toggle

---

#### 7. Approval Queue Page (RM / HR)

`GET /approval-workflows/my-queue` — shows all requests currently waiting for this user's action.

Useful for a notification badge: `queue.length` pending items.

---

## Workflow Logic Explained (for correct UI behavior)

### What "default workflow" means
When an employee submits a regularization, the backend looks for the workflow where `isDefault: true` and `module: 'REGULARIZATION'` for that tenant. That workflow's steps become the approval chain for that request. **One and only one workflow can be default per module.**

### isSystem workflow
- Created automatically when the tenant is set up
- Has two steps: Step 1 = Direct Manager (skippable, 48h escalation), Step 2 = HR Role (not skippable)
- Can **never be deleted** (backend returns 400)
- If admin deletes all custom workflows, the system workflow automatically becomes default again
- Show a lock icon or "System" badge next to these

### What happens if employee has no RM
- Step 1 (DIRECT_MANAGER) is `isSkippable: true`
- Backend auto-skips step 1 at submission time
- Request goes directly to HR for step 2
- In the approval trail, step 1 shows `status: 'SKIPPED'`

### Escalation (auto-skip after 48h)
- If RM doesn't act within `escalationAfterHours` (48h by default)
- A backend cron runs hourly and auto-skips the step
- Step shows `status: 'SKIPPED'` in the trail
- Request advances to HR

### Admin override
- Available to ADMIN role on any PENDING request
- Bypasses all step validation
- Forces the current pending step to APPROVED/REJECTED
- Audit trail shows: approver = admin, comment = "Forced by admin"
- Use this when RM/HR is unavailable and request is stuck

---

## Error Handling

| HTTP | Code | Meaning | UI Action |
|------|------|---------|-----------|
| 400 | — | Validation error / bad data | Show field error or toast |
| 400 | `isSystem workflow` | Tried to delete system workflow | Show "Cannot delete system workflow" |
| 403 | — | Wrong role for this endpoint | Redirect or hide the button |
| 403 | RM trying `/list` | RM must use `/team` | Route to team page |
| 404 | — | Resource not found | Show 404 message |
| 409 | — | Duplicate name (workflow) | Show inline error |

**Common approval errors (400):**
- `"No active default workflow found for REGULARIZATION"` → admin hasn't set a default workflow; prompt admin to configure one
- `"No pending step found for this request"` → request already fully processed
- `"You are not authorized to act on this step"` → wrong user is trying to approve; show "Not your turn"
- `"Cannot delete system-generated workflows"` → show lock badge and hide delete button

---

## Quick Reference

| Action | Who | Endpoint | Method |
|--------|-----|----------|--------|
| Create HR | ADMIN | `POST /employee` | POST |
| Create RM | HR, ADMIN | `POST /employee` | POST |
| Create Employee | HR, ADMIN | `POST /employee` | POST |
| Get RM dropdown | HR, ADMIN | `GET /employee/managers` | GET |
| Assign/change RM | HR, ADMIN | `PUT /employee?id=` | PUT |
| Submit regularization | Any | `POST /regularizations` | POST |
| View my requests | Any | `GET /regularizations/me` | GET |
| View team requests | RM | `GET /regularizations/team` | GET |
| View all requests | HR, ADMIN | `GET /regularizations/list` | GET |
| Approve/Reject step | RM, HR | `PATCH /regularizations?id=` | PATCH |
| Force override | ADMIN | `PATCH /regularizations/override?id=` | PATCH |
| Cancel request | Owner | `DELETE /regularizations?id=` | DELETE |
| List workflows | ADMIN, HR | `GET /approval-workflows` | GET |
| Create workflow | ADMIN | `POST /approval-workflows` | POST |
| Set default | ADMIN | `PATCH /approval-workflows?id=` + `{isDefault:true}` | PATCH |
| Delete workflow | ADMIN | `DELETE /approval-workflows?id=` | DELETE |
| My approval queue | RM, HR | `GET /approval-workflows/my-queue` | GET |
