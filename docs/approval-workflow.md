# Approval Workflow Engine

## Overview

The Approval Workflow Engine is a configurable, multi-level approval system built into the HRM backend. It allows each tenant (company) to define their own approval chain for modules like Regularization and Leave.

Instead of hardcoding "RM approves, then HR approves", an admin can configure any number of steps, assign any role or specific user as approver, and change the workflow at any time without touching code.

### What makes it production-ready

| Feature | What it solves |
|---|---|
| **Configurable workflows** | Each tenant sets their own approval chain |
| **Skippable steps** | If employee has no RM, request goes straight to HR |
| **Auto-escalation (cron)** | If RM ignores for 48h, cron auto-skips to HR |
| **Admin override** | Admin can force-approve/reject any stuck request |
| **Lazy approver resolution** | Step 2+ approvers are resolved only when needed |
| **Full audit trail** | Every action stamped with who, when, and why |

---

## Core Concepts

### Workflow vs Instance

| Concept | What it is | Created by | Created when |
|---|---|---|---|
| **ApprovalWorkflow** | The template — defines what steps are needed | Admin | Once, during setup |
| **ApprovalStep** | Each step inside a workflow template | Admin | Once, during setup |
| **RequestApprovalInstance** | The actual running approval for one request | Engine (automatic) | Every time an employee submits |
| **RequestApprovalStepInstance** | The status of each step for one request | Engine (automatic) | Every time an employee submits |

Think of it like this:

```
ApprovalWorkflow  =  Stamp form template kept in the drawer
ApprovalStep      =  The boxes printed on that template (Box 1: RM, Box 2: HR)

RequestApprovalInstance      =  One filled-out form submitted by an employee
RequestApprovalStepInstance  =  Each box on that specific submitted form
```

---

## The 4 Database Tables

### 1. `ApprovalWorkflow`

Stores the template for a module. Each tenant can have multiple workflows per module but only one marked as `isDefault = true` — that one is used automatically for every new request.

```
id          → unique ID
tenantId    → which company this belongs to
module      → REGULARIZATION | LEAVE
name        → "Default Regularization Approval"
isDefault   → true/false (only one default per module per tenant)
isSystem    → true = auto-created at tenant setup; cannot be deleted by admin
status      → ACTIVE | INACTIVE | DELETED
```

> **System workflow protection:** `isSystem: true` workflows are created automatically when a tenant is provisioned (one per module). Admins can create custom workflows and set them as default, but the system workflow can never be deleted. If an admin deletes the current default (custom) workflow, the system workflow is automatically restored as the default for that module. This guarantees there is always a fallback approval chain.

### 2. `ApprovalStep`

Each step inside a workflow. Steps are ordered by `stepNumber` (1, 2, 3...).

```
id                   → unique ID
workflowId           → which workflow this step belongs to
stepNumber           → 1, 2, 3... (order of approval)
name                 → "Reporting Manager Approval"
approverType         → DIRECT_MANAGER | ROLE | SPECIFIC_USER
approverRoleId       → (if ROLE) — any user with this role can approve
approverUserId       → (if SPECIFIC_USER) — only this user can approve
isSkippable          → if true, engine auto-skips this step when no approver is found
escalationAfterHours → hours before cron auto-escalates (null = never escalate)
```

**Approver Types Explained:**

| Type | Meaning | Example |
|---|---|---|
| `DIRECT_MANAGER` | The employee's reporting manager (from `reportingManagerId`) | RM assigned to the employee |
| `ROLE` | Any user in the tenant who has the specified role | Any HR user can approve |
| `SPECIFIC_USER` | One fixed user regardless of role | CEO always approves overtime requests |

**`isSkippable` vs `escalationAfterHours`:**

| Field | Triggers when | Behaviour |
|---|---|---|
| `isSkippable: true` | **At submission** — no approver found for this step | Engine immediately skips to next step |
| `escalationAfterHours: 48` | **After 48 hours** — cron detects overdue PENDING step | Cron auto-skips (if skippable) or logs warning |

### 3. `RequestApprovalInstance`

One record per submitted request. Tracks where the request is in the workflow.

```
id          → unique ID
tenantId    → which company
workflowId  → which workflow template was used
module      → REGULARIZATION | LEAVE
requestId   → ID of the regularization or leave request
currentStep → which step number is currently active (1, 2, 3...)
status      → IN_PROGRESS | APPROVED | REJECTED | CANCELLED
```

### 4. `RequestApprovalStepInstance`

One record per step per submitted request. Tracks what each approver did.

```
id              → unique ID
instanceId      → which approval instance this belongs to
stepId          → which step template this came from
stepNumber      → 1, 2, 3...
approverId      → resolved user ID of the approver (null for ROLE type)
status          → NOT_STARTED | PENDING | APPROVED | REJECTED | SKIPPED
pendingSince    → timestamp when this step became PENDING (used by escalation cron)
comment         → optional comment from approver
rejectionReason → filled when action is REJECTED
reviewedAt      → timestamp when the approver acted
```

---

## Approver Type Resolution

When a request is submitted, the engine resolves the approver for **Step 1 immediately**. Steps 2, 3... are resolved **lazily** — only when the previous step is approved and the next step activates.

| Step Type | How approverId is resolved |
|---|---|
| `DIRECT_MANAGER` | Look up `employee.reportingManagerId` at step activation time |
| `ROLE` | Not pre-assigned — any user with the matching role can act at approval time |
| `SPECIFIC_USER` | Directly copied from `step.approverUserId` |

---

## Status Flows

### ApprovalInstance Status

```
                  ┌──────────────┐
    submitted ──▶ │  IN_PROGRESS │
                  └──────┬───────┘
                         │
              ┌──────────┴──────────┐
              ▼                     ▼
        ┌──────────┐          ┌──────────┐
        │ APPROVED │          │ REJECTED │
        └──────────┘          └──────────┘
```

### StepInstance Status

```
created ──▶ NOT_STARTED ──▶ PENDING ──▶ APPROVED ──▶ (next step activates)
                                    └──▶ REJECTED ──▶ (whole instance rejected)
                                    └──▶ SKIPPED  ──▶ (no approver + isSkippable=true)
                                                       OR (escalation cron fires)
```

### Regularization Status

The regularization's own `status` field stays `PENDING` until the **last step is approved** or **any step is rejected**:

```
PENDING  →  APPROVED   (all steps approved)
PENDING  →  REJECTED   (rejected at any step, or admin force-rejects)
PENDING  →  CANCELLED  (employee cancels before any approval)
```

---

## Full Flow — Step by Step

### Step 0: One-Time Setup (Auto-seeded)

When a new tenant is created, the system automatically seeds two default workflows. Admin does not need to do anything.

**Default Regularization Workflow (auto-created):**

```
Step 1 → approverType: DIRECT_MANAGER
         isSkippable: true
         escalationAfterHours: 48

Step 2 → approverType: ROLE (HR)
         isSkippable: false
         escalationAfterHours: null
```

Admin can modify this or create additional workflows via the API:

```
POST /approval-workflows
{
  "name": "Custom 3-Level Approval",
  "module": "REGULARIZATION",
  "isDefault": false,
  "steps": [
    { "stepNumber": 1, "name": "Team Lead", "approverType": "DIRECT_MANAGER",
      "isSkippable": true, "escalationAfterHours": 24 },
    { "stepNumber": 2, "name": "HR Review", "approverType": "ROLE",
      "approverRoleId": "<hr-role-id>", "isSkippable": false },
    { "stepNumber": 3, "name": "Final Sign-off", "approverType": "SPECIFIC_USER",
      "approverUserId": "<ceo-user-id>", "isSkippable": true }
  ]
}
```

---

### Step 1: Assign Reporting Manager (Admin/HR)

Before employees can submit requests, each employee needs a reporting manager assigned.

```
PATCH /employees?id=<employee-id>
{
  "reportingManagerId": "<rm-user-id>"
}
```

> **Note:** If this is not set and Step 1 is `isSkippable: true`, the engine automatically skips Step 1 and goes to HR. If `isSkippable: false`, the request will get stuck.

---

### Step 2: Employee Submits Regularization

```
POST /regularizations
{
  "date": "2026-04-20",
  "requestedCheckIn": "2026-04-20T09:00:00Z",
  "requestedCheckOut": "2026-04-20T18:00:00Z",
  "reason": "Forgot to punch in"
}
```

**What the engine does automatically:**

```
1. Creates AttendanceRegularization record
   └── status: PENDING

2. Finds the default workflow for REGULARIZATION in this tenant

3. Creates RequestApprovalInstance
   └── requestId: <regularization-id>
   └── status: IN_PROGRESS

4. Creates RequestApprovalStepInstance for EVERY step (all as NOT_STARTED)
   ├── Step 1: approverId=<rm-user-id>  (resolved from reportingManagerId)
   └── Step 2: approverId=null          (ROLE type — resolved at approval time)

5. Runs activateNextStep from position 0:
   ├── If Step 1 has approverId → set Step 1 = PENDING, pendingSince = now
   └── If Step 1 has NO approverId AND isSkippable=true → set Step 1 = SKIPPED,
       then check Step 2 → set Step 2 = PENDING

6. Links instance to regularization
   └── AttendanceRegularization.approvalInstanceId = <instance-id>
```

**Case A — Employee has RM assigned:**
```
Step 1: PENDING      ← RM must act
Step 2: NOT_STARTED  ← not active yet
currentStep: 1
```

**Case B — Employee has NO RM assigned (isSkippable=true):**
```
Step 1: SKIPPED      ← auto-skipped at submission
Step 2: PENDING      ← HR gets it directly
currentStep: 2
```

---

### Step 3: RM Views Their Team's Requests

```
GET /regularizations/team
```

Returns all regularization requests for employees whose `reportingManagerId` matches the RM's user ID.

```json
{
  "data": [
    {
      "id": "reg-123",
      "status": "PENDING",
      "reason": "Forgot to punch in",
      "approvalInstance": {
        "status": "IN_PROGRESS",
        "currentStep": 1,
        "stepInstances": [
          { "stepNumber": 1, "status": "PENDING",      "pendingSince": "2026-04-20T09:00:00Z" },
          { "stepNumber": 2, "status": "NOT_STARTED",  "pendingSince": null }
        ]
      }
    }
  ]
}
```

---

### Step 4: RM Approves (Step 1)

```
PATCH /regularizations?id=reg-123
{
  "action": "APPROVED",
  "comment": "Verified, employee was present"
}
```

**What the engine does:**

```
1. Finds instance for reg-123
2. Finds Step 1 (status=PENDING)
3. Validates: Step1.approverId === RM's userId  ✓
4. Marks Step 1 → APPROVED, reviewedAt = now
5. Calls activateNextStep from position 1:
   └── Finds Step 2 (NOT_STARTED)
   └── Step 2 is ROLE type → approverId stays null
   └── Sets Step 2 → PENDING, pendingSince = now
   └── Updates instance.currentStep = 2
6. Regularization status stays PENDING (still in progress)
```

---

### Step 5: HR Views All Pending Requests

```
GET /regularizations/list                   ← all tenant requests
GET /approval-workflows/my-queue            ← only steps pending for HR role
```

---

### Step 6: HR Approves (Step 2 — Final Step)

```
PATCH /regularizations?id=reg-123
{
  "action": "APPROVED",
  "comment": "Approved after RM confirmation"
}
```

**What the engine does:**

```
1. Finds instance for reg-123
2. Finds Step 2 (status=PENDING)
3. Validates: Step2.approverType=ROLE, HR's roleId matches step.approverRoleId  ✓
4. Marks Step 2 → APPROVED, reviewedAt = now
5. activateNextStep finds no more NOT_STARTED steps → returns DONE
6. Instance status → APPROVED
7. Regularization:
   └── status: APPROVED
   └── reviewedByUserId: <hr-user-id>
   └── reviewedAt: now
```

---

### Rejection Flow (Any Step)

```
PATCH /regularizations?id=reg-123
{
  "action": "REJECTED",
  "rejectionReason": "No valid reason provided"
}
```

```
1. Marks current step → REJECTED
2. Instance status → REJECTED
3. Regularization status → REJECTED
4. All remaining NOT_STARTED steps stay unchanged (never activated)
```

---

### Cancellation Flow (Employee Only)

```
DELETE /regularizations?id=reg-123
```

```
1. Validates regularization.userId === caller's userId
2. Validates regularization.status === PENDING
3. Updates regularization.status → CANCELLED
```

---

## Production Safety Features

### Feature 1: Auto-Skip When No RM Assigned

**Trigger:** At submission time, if `reportingManagerId` is null and Step 1 has `isSkippable: true`.

**Behaviour:** Engine marks Step 1 as `SKIPPED` and activates Step 2 immediately. No manual action needed.

```
Employee submits → RM step auto-skipped → HR gets it directly
```

---

### Feature 2: Auto-Escalation (Cron Job)

**File:** `src/modules/approval-workflow/approval-escalation.service.ts`

**Schedule:** Runs **every hour** automatically via NestJS `@Cron`.

**Trigger:** Step instance has been `PENDING` longer than `step.escalationAfterHours`.

**Logic:**
```
For each overdue PENDING step:
  IF step.isSkippable = true
    → Mark step SKIPPED
    → Activate next step
    → Log: "Auto-escalated: no action taken within 48h"

  IF step.isSkippable = false
    → Leave it PENDING (cannot auto-skip)
    → Log warning: "overdue but not skippable"
```

**Default configuration (seeded):**
- Step 1 (RM): `escalationAfterHours: 48`, `isSkippable: true` → auto-skips after 2 days
- Step 2 (HR): `escalationAfterHours: null` → never auto-skips (HR must always act)

**Timeline example:**
```
Day 0, 09:00  →  Employee submits, Step 1 PENDING (RM assigned)
Day 2, 09:00  →  48h elapsed, cron fires (at next hour tick)
Day 2, 10:00  →  Cron detects overdue step, auto-skips Step 1
Day 2, 10:00  →  Step 2 (HR) becomes PENDING
```

---

### Feature 3: Admin Override

**Trigger:** Any step is stuck (RM on leave, HR unreachable, etc.) and admin needs to unblock.

**Endpoint:**

```
PATCH /regularizations/override?id=<regularization-id>
Body:  { "action": "APPROVED" | "REJECTED", "reason": "optional reason" }
Permission: manage:attendance_regularization  (ADMIN role only)
```

**Behaviour:**
- Completely bypasses approver validation
- Records `approverId = adminUserId` for audit trail
- Adds `comment: "Forced by admin"` on the step instance
- If `APPROVED` → advances to the next step (or fully approves if last step)
- If `REJECTED` → immediately closes the whole request as REJECTED

**Audit trail after admin override:**
```json
{
  "stepNumber": 1,
  "status": "APPROVED",
  "approverId": "<admin-user-id>",
  "comment": "Forced by admin",
  "reviewedAt": "2026-04-22T10:00:00Z"
}
```

---

## Decision Flow Summary

When a request is submitted, the engine follows this logic:

```
Employee submits
       │
       ▼
Does employee have reportingManagerId?
       │
   YES │                          NO │
       ▼                             ▼
Step 1 → PENDING          isSkippable=true?
(RM must act)               │          │
                         YES │       NO │
                             ▼          ▼
                    Step 1 → SKIPPED  Step 1 → PENDING
                    Step 2 → PENDING  (stuck until RM assigned
                    (HR gets it)       or admin overrides)
```

When a step is PENDING:

```
Wait for approver action
       │
   48h pass with no action?
       │
   YES │ (escalationAfterHours reached)
       ▼
isSkippable=true?
   │          │
YES │       NO │
   ▼           ▼
Auto-skip   Log warning
next step   (admin must
activates   use /override)
```

---

## API Reference

### Approval Workflow Management

| Method | Route | Access | Description |
|---|---|---|---|
| `POST` | `/approval-workflows` | ADMIN | Create a workflow with steps |
| `GET` | `/approval-workflows` | ADMIN, HR | List all workflows (`?module=REGULARIZATION`) |
| `GET` | `/approval-workflows/detail?id=xxx` | ADMIN, HR | Get single workflow with all steps |
| `PATCH` | `/approval-workflows?id=xxx` | ADMIN | Update name, description, isDefault, status |
| `DELETE` | `/approval-workflows?id=xxx` | ADMIN | Soft-delete a workflow |
| `GET` | `/approval-workflows/my-queue` | RM, HR | Pending steps assigned to current user |

### Regularization

| Method | Route | Access | Description |
|---|---|---|---|
| `POST` | `/regularizations` | EMPLOYEE | Submit request → engine starts automatically |
| `GET` | `/regularizations/me` | EMPLOYEE | Own requests with full approval trail |
| `GET` | `/regularizations/team` | RM only | Direct reports' requests |
| `GET` | `/regularizations/list` | ADMIN, HR | All tenant requests (paginated) |
| `GET` | `/regularizations?id=xxx` | Any | Single request (employees restricted to own) |
| `PATCH` | `/regularizations?id=xxx` | RM, HR | Approve or reject current step |
| `PATCH` | `/regularizations/override?id=xxx` | ADMIN only | Force-approve or force-reject any stuck step |
| `DELETE` | `/regularizations?id=xxx` | EMPLOYEE | Cancel own pending request |

---

## Edge Cases

| Scenario | Behaviour |
|---|---|
| Employee has no `reportingManagerId`, Step 1 `isSkippable=true` | Step 1 auto-skipped at submission → HR gets it directly |
| Employee has no `reportingManagerId`, Step 1 `isSkippable=false` | Step 1 stuck with `approverId=null` → admin must assign RM or use `/override` |
| RM ignores for 48h, Step 1 `isSkippable=true` | Cron auto-escalates → Step 2 (HR) activated |
| HR ignores (no escalation set) | Admin uses `PATCH /regularizations/override` |
| RM tries to approve HR step | Engine checks roleId → 403 "Your role is not authorized" |
| HR tries to approve RM step | Engine checks approverId → 403 "You are not the designated approver" |
| Request already approved/rejected | Engine throws 400 "Approval is already approved/rejected" |
| Employee cancels an approved request | Service throws 400 "Only pending requests can be cancelled" |
| Admin overrides a request | Step stamped with adminUserId + "Forced by admin" for audit |

---

## Default Workflow Configuration (Auto-seeded per Tenant)

Every new tenant gets two default workflows:

**Regularization Workflow**

| Step | Approver Type | Skippable | Escalation |
|---|---|---|---|
| 1 | DIRECT_MANAGER (RM) | Yes | 48 hours |
| 2 | ROLE: HR | No | None |

**Leave Workflow**

| Step | Approver Type | Skippable | Escalation |
|---|---|---|---|
| 1 | DIRECT_MANAGER (RM) | Yes | 48 hours |
| 2 | ROLE: HR | No | None |

Admin can modify these or create entirely new workflows per module at any time.

---

## Future Improvements

### Circular RM Reference Not Prevented

**What it is:** If HR updates Employee A's `reportingManagerId` to Employee B, and then someone updates Employee B's `reportingManagerId` to Employee A, a circular reference is formed (A → B → A). The backend does not currently detect this.

**Why it doesn't crash today:** The approval engine only resolves the RM one level up — it reads `user.reportingManagerId` once to find who should approve Step 1. It never walks the chain recursively, so the cycle is never traversed.

**Why it's still a problem:** It's a data inconsistency. Org chart views and any future feature that walks the reporting chain (e.g., bulk escalation, hierarchy reports) would loop infinitely or produce wrong results.

**Where to fix:** `PUT /employee` in `src/modules/employee/employee.service.ts` — add a cycle-detection check before saving `reportingManagerId`. Walk the chain upward from the new manager's `reportingManagerId` until you hit `null` or the employee's own ID (which means a cycle exists).

```typescript
// Pseudocode for cycle detection
async function wouldCreateCycle(tenantId, employeeId, newManagerId): boolean {
  let currentId = newManagerId;
  while (currentId !== null) {
    if (currentId === employeeId) return true; // cycle detected
    const manager = await prisma.user.findFirst({ where: { id: currentId, tenantId } });
    currentId = manager?.reportingManagerId ?? null;
  }
  return false;
}
```

**Priority:** Low — not a blocker for current use cases, but worth implementing before adding any org-chart or hierarchy traversal features.

---

## Files Reference

| File | Purpose |
|---|---|
| `src/modules/approval-workflow/approval-engine.service.ts` | Core engine — `startInstance`, `processStep`, `forceAdvanceStep`, `escalateStep`, `activateNextStep` |
| `src/modules/approval-workflow/approval-workflow.service.ts` | Admin CRUD for managing workflow templates |
| `src/modules/approval-workflow/approval-escalation.service.ts` | Hourly cron — auto-escalates overdue pending steps |
| `src/modules/approval-workflow/approval-workflow.controller.ts` | HTTP routes for workflow management + `/my-queue` |
| `src/modules/approval-workflow/repositories/approval-workflow.repository.ts` | DB queries for workflows and steps |
| `src/modules/approval-workflow/repositories/approval-instance.repository.ts` | DB queries for instances and step instances |
| `src/modules/approval-workflow/dto/create-workflow.dto.ts` | Validation for creating workflows with steps |
| `src/modules/approval-workflow/dto/process-step.dto.ts` | Validation for approve/reject action |
| `src/modules/regularization/regularization.service.ts` | Regularization logic — calls engine on create, review, forceReview |
| `src/modules/regularization/regularization.controller.ts` | Routes including `/override` for admin |
| `src/modules/regularization/dto/force-review.dto.ts` | Validation for admin override action |
| `src/modules/employee/employee.service.ts` | Supports `reportingManagerId` in create/update |
| `src/modules/tenant/tenant.service.ts` | Seeds default workflows on tenant creation |
| `prisma/schema.prisma` | All 4 workflow models + new fields (`escalationAfterHours`, `pendingSince`, `reportingManagerId`, `approvalInstanceId`) |
