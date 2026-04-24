# Frontend Migration Guide — Regularization Module

## Context

You previously implemented the regularization feature. The backend has been significantly updated.
This guide covers every change you need to make — broken down by what's new, what changed,
what broke, and what each role's UI should look like.

Read this fully before touching any code.

---

## Quick Summary of What Changed

| Area | Before | Now |
|---|---|---|
| Review body | `{ status, rejectionReason }` | `{ action, comment, rejectionReason }` |
| Employee cancel | Not supported | `DELETE /regularizations?id=xxx` |
| RM list endpoint | Used `/list` (saw everyone's data — was a bug) | New `/team` endpoint (sees only direct reports) |
| `/list` access | All roles | ADMIN and HR only (403 for others) |
| Regularization response | No approval info | Now includes full `approvalInstance` object |
| Admin override | Not supported | `PATCH /regularizations/override?id=xxx` |
| Workflow management | Not supported | New `/approval-workflows` CRUD for ADMIN |
| Step statuses | None | `NOT_STARTED \| PENDING \| APPROVED \| REJECTED \| SKIPPED` |

---

## 1. Breaking Changes (Fix These First)

### 1a. Review Endpoint — Body Changed

The approve/reject body has changed. **Your existing code will silently fail if not updated.**

**Before:**
```json
PATCH /regularizations?id=xxx
{
  "status": "APPROVED",
  "rejectionReason": "..."
}
```

**Now:**
```json
PATCH /regularizations?id=xxx
{
  "action": "APPROVED",
  "comment": "optional comment for any action",
  "rejectionReason": "required when action is REJECTED"
}
```

- `status` → renamed to `action`
- `comment` is a new optional field (shown to employee in the trail)
- `rejectionReason` still optional, but only relevant when `action = "REJECTED"`

---

### 1b. `/list` Now Returns 403 for RM

If you previously called `GET /regularizations/list` for the RM role, it will now return `403 Forbidden`.

RM must use `GET /regularizations/team` instead.

Update your role-based API call logic:

```
Role = EMPLOYEE  →  GET /regularizations/me
Role = RM        →  GET /regularizations/team        ← use this, not /list
Role = HR        →  GET /regularizations/list
Role = ADMIN     →  GET /regularizations/list
```

---

### 1c. Regularization Response Now Includes Approval Data

Every regularization object now includes an `approvalInstance` field. Your existing type definitions
need to be updated to include this, otherwise TypeScript will complain or data will be ignored silently.

---

## 2. Updated Type Definitions

Replace or extend your existing regularization types with these:

```typescript
// ─── Enums ───────────────────────────────────────────────────────────────────

type RegularizationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

type ApprovalInstanceStatus = 'IN_PROGRESS' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

type StepInstanceStatus = 'NOT_STARTED' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'SKIPPED';

type ApproverType = 'DIRECT_MANAGER' | 'ROLE' | 'SPECIFIC_USER';

// ─── Approval trail (nested inside Regularization) ───────────────────────────

interface ApprovalStepInstance {
  stepNumber: number;
  status: StepInstanceStatus;
  pendingSince: string | null;   // ISO datetime — when this step became PENDING
  reviewedAt: string | null;     // ISO datetime — when approver acted
  comment: string | null;
  rejectionReason: string | null;
  approver: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
}

interface ApprovalInstance {
  id: string;
  status: ApprovalInstanceStatus;
  currentStep: number;
  stepInstances: ApprovalStepInstance[];
}

// ─── Main Regularization type ─────────────────────────────────────────────────

interface Regularization {
  id: string;
  userId: string;
  tenantId: string;
  date: string;                      // ISO date
  requestedCheckIn: string | null;   // ISO datetime
  requestedCheckOut: string | null;  // ISO datetime
  reason: string;
  status: RegularizationStatus;
  reviewedByUserId: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  approvalInstanceId: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  approvalInstance: ApprovalInstance | null;
}

// ─── Paginated response ───────────────────────────────────────────────────────

interface PaginatedRegularizations {
  data: Regularization[];
  meta: {
    totalRecords: number;
    totalPages: number;
    page: number;
    limit: number;
  };
}

// ─── Request bodies ───────────────────────────────────────────────────────────

interface CreateRegularizationDto {
  date: string;                    // ISO date e.g. "2026-04-20"
  requestedCheckIn?: string;       // ISO datetime e.g. "2026-04-20T09:00:00Z"
  requestedCheckOut?: string;      // ISO datetime
  reason: string;                  // max 500 chars
}

interface ReviewRegularizationDto {
  action: 'APPROVED' | 'REJECTED'; // ← was "status" before
  comment?: string;                // optional for any action, max 500 chars
  rejectionReason?: string;        // required when action = REJECTED
}

interface ForceReviewDto {
  action: 'APPROVED' | 'REJECTED'; // admin override
  reason?: string;                 // optional reason, shown in audit trail
}
```

---

## 3. All API Endpoints (Complete Reference)

### Regularization Endpoints

#### `POST /regularizations`
Employee submits a new request.

```
Access: EMPLOYEE
Body:   CreateRegularizationDto
Response: { message: string, data: Regularization }
```

The response `data.approvalInstance` will be populated if a workflow is configured.
The `data.status` will always be `"PENDING"` on creation.

---

#### `GET /regularizations/me`
Employee views their own requests with the full approval trail.

```
Access: EMPLOYEE
Response: { message: string, data: Regularization[] }
```

Each item includes `approvalInstance.stepInstances[]` so the employee can see which step
is currently pending and who has already approved.

---

#### `GET /regularizations/team` ← NEW
RM views their direct reports' regularization requests.

```
Access: RM only (403 for all other roles)
Query:  ?limit=10&page=1
Response: {
  message: string,
  data: Regularization[],
  meta: { totalRecords, totalPages, page, limit }
}
```

The RM is identified by their JWT. The backend filters by `user.reportingManagerId = RM's userId`.
Do not show this page/tab to non-RM users.

---

#### `GET /regularizations/list`
ADMIN or HR views all tenant regularization requests.

```
Access: ADMIN, HR only (403 for RM and EMPLOYEE)
Query:  ?limit=10&page=1
Response: {
  message: string,
  data: Regularization[],
  meta: { totalRecords, totalPages, page, limit }
}
```

---

#### `GET /regularizations?id=xxx`
Get a single regularization by ID with full approval trail.

```
Access: Any authenticated user
        EMPLOYEE → can only see their own (403 for others' requests)
        RM / HR / ADMIN → can see any
Response: { message: string, data: Regularization }
```

The `data.approvalInstance.stepInstances` array is fully populated here.

---

#### `PATCH /regularizations?id=xxx`
RM or HR approves/rejects the current pending step.

```
Access: RM, HR (approve:attendance_regularization permission)
Body:   ReviewRegularizationDto  ← { action, comment?, rejectionReason? }
Response: { message: string, data: Regularization }
```

The backend validates that the caller is the correct approver for the current step.
If the RM tries to approve an HR step (or vice versa), they get `403`.
If the request is already approved/rejected, they get `400`.

---

#### `PATCH /regularizations/override?id=xxx` ← NEW
Admin force-approves or force-rejects any stuck request.

```
Access: ADMIN only (manage:attendance_regularization permission)
Body:   ForceReviewDto  ← { action, reason? }
Response: { message: string, data: Regularization }
```

No approver validation is done. Use this when the normal approver is unreachable.
The action is recorded with `comment: "Forced by admin"` for the audit trail.

---

#### `DELETE /regularizations?id=xxx` ← NEW
Employee cancels their own pending request.

```
Access: EMPLOYEE (update:attendance_regularization permission)
Response: { message: string, data: Regularization }
```

Only works when `status = "PENDING"`. Returns `400` if already approved/rejected/cancelled.

---

### Approval Workflow Endpoints (Admin Management) ← ALL NEW

These endpoints are for the ADMIN to configure approval workflows per module.

#### `POST /approval-workflows`
Create a new workflow with steps.

```
Access: ADMIN
Body: {
  name: string,
  module: "REGULARIZATION" | "LEAVE",
  description?: string,
  isDefault?: boolean,
  steps: [
    {
      stepNumber: number,        // 1, 2, 3...
      name?: string,
      approverType: "DIRECT_MANAGER" | "ROLE" | "SPECIFIC_USER",
      approverRoleId?: string,   // required if approverType = "ROLE"
      approverUserId?: string,   // required if approverType = "SPECIFIC_USER"
      isSkippable?: boolean
    }
  ]
}
```

---

#### `GET /approval-workflows?module=REGULARIZATION`
List all workflows for a module.

```
Access: ADMIN, HR
Query: ?module=REGULARIZATION  (optional filter)
Response: { message: string, data: ApprovalWorkflow[] }
```

---

#### `GET /approval-workflows/detail?id=xxx`
Get a single workflow with all its steps.

```
Access: ADMIN, HR
Response: { message: string, data: ApprovalWorkflow }
```

---

#### `PATCH /approval-workflows?id=xxx`
Update workflow metadata (not steps — steps are immutable after creation).

```
Access: ADMIN
Body: { name?, description?, isDefault?, status? }
```

---

#### `DELETE /approval-workflows?id=xxx`
Soft-delete a workflow.

```
Access: ADMIN
```

---

#### `GET /approval-workflows/my-queue`
Pending steps assigned to the current user (RM or HR).

```
Access: RM, HR (approve:attendance_regularization permission)
Response: { message: string, data: PendingStepInstance[] }
```

This returns raw step instance records with their linked `instance.requestId` (the regularizationId).
Use this to build a "pending approvals" badge count or queue view.

---

## 4. Role-Based UI Changes

### EMPLOYEE

| Feature | Before | Now |
|---|---|---|
| Submit request | ✅ same | ✅ no change |
| View own requests | ✅ basic list | ✅ now shows approval trail per request |
| Cancel request | ❌ not possible | ✅ Cancel button (only if status=PENDING) |
| See who approved | ❌ | ✅ show step-by-step trail |

**What to build:**
- Add a "Cancel" button on PENDING requests → `DELETE /regularizations?id=xxx`
- Show an approval trail section on each request card/detail page. Use `approvalInstance.stepInstances[]`

**Approval trail display example:**
```
Step 1 — Reporting Manager
  Status: APPROVED
  Approver: John Smith
  Approved on: 20 Apr 2026, 10:30 AM
  Comment: "Verified"

Step 2 — HR
  Status: PENDING
  Waiting since: 20 Apr 2026, 10:30 AM
```

---

### RM (Reporting Manager)

| Feature | Before | Now |
|---|---|---|
| View team requests | Was calling `/list` (saw everyone — bug) | ✅ `GET /regularizations/team` (own team only) |
| Approve/Reject | ✅ worked | ✅ same endpoint, but body changed |
| See who else approved | ❌ | ✅ now shows full trail |

**What to build:**
- Change the API call from `/list` to `/team`
- Update review modal/form body: `status` → `action`, add optional `comment` field
- Add approval trail display on each request detail

**Approve/Reject modal fields:**
```
Action:  [Approve] [Reject]          ← was "Status"
Comment: [text input - optional]     ← NEW field
Rejection reason: [text - required if Reject selected]
```

---

### HR

| Feature | Before | Now |
|---|---|---|
| View all requests | ✅ `/list` | ✅ same, no change |
| Approve/Reject | ✅ worked | ✅ same endpoint, but body changed |
| Pending queue | ❌ | ✅ `GET /approval-workflows/my-queue` |

**What to build:**
- Update review modal: `status` → `action`, add `comment` field
- Add a badge/indicator for pending count using `/approval-workflows/my-queue`

---

### ADMIN

| Feature | Before | Now |
|---|---|---|
| View all requests | ✅ `/list` | ✅ same |
| Approve/Reject | ✅ worked | ✅ same endpoint, body changed |
| Override stuck requests | ❌ | ✅ `PATCH /regularizations/override` |
| Manage workflows | ❌ | ✅ Full CRUD at `/approval-workflows` |

**What to build:**
- Update review modal: `status` → `action`, add `comment` field
- Add "Force Approve" / "Force Reject" buttons on requests where the workflow is stuck
  - Show these buttons only when `approvalInstance.status === 'IN_PROGRESS'`
  - Opens a separate confirmation modal with a reason field
  - Calls `PATCH /regularizations/override?id=xxx`
- Build a Workflow Management page (see Section 6)

---

## 5. Displaying the Approval Trail

Every regularization detail view should now show the approval trail.
Use `approvalInstance.stepInstances` sorted by `stepNumber`.

**Status badge colours (suggested):**

| Status | Colour |
|---|---|
| `NOT_STARTED` | Grey |
| `PENDING` | Yellow / Amber |
| `APPROVED` | Green |
| `REJECTED` | Red |
| `SKIPPED` | Light grey / Strikethrough |

**What to show per step:**

```
Step {stepNumber} — {step.name or "Step N"}
  Status: {status badge}
  Approver: {approver.firstName} {approver.lastName}  (show "—" if null = role-based, not pre-assigned)
  Waiting since: {pendingSince}    (only if status = PENDING)
  Reviewed at:   {reviewedAt}      (only if status = APPROVED / REJECTED / SKIPPED)
  Comment:       {comment}         (only if present)
  Rejection reason: {rejectionReason}  (only if status = REJECTED)
```

**Special case — SKIPPED step:**
Show it with a tooltip: `"Auto-skipped: no approver assigned"` or the comment text.
Do not hide skipped steps — they are part of the audit trail.

**When `approvalInstance` is null:**
The request has no workflow configured. Show no trail. Do not show any approve/reject buttons.

---

## 6. Workflow Management Page (Admin Only)

Build a new settings page: **Settings → Approval Workflows**

### List page
- Call `GET /approval-workflows?module=REGULARIZATION` (tab) and `?module=LEAVE` (tab)
- Show name, module, isDefault, status, step count
- "Set as Default" button → `PATCH /approval-workflows?id=xxx` `{ isDefault: true }`
- "Delete" button → `DELETE /approval-workflows?id=xxx`

### Create workflow form
Fields:
```
Name:        text input (required)
Module:      select — REGULARIZATION | LEAVE
Description: textarea (optional)
Set as default: checkbox

Steps (dynamic list — add/remove rows):
  Step 1:
    Name:          text (optional, e.g. "Reporting Manager")
    Approver type: select — DIRECT_MANAGER | ROLE | SPECIFIC_USER
    Role:          role picker (shown only if approverType = ROLE)
    User:          user picker (shown only if approverType = SPECIFIC_USER)
    Skippable:     checkbox
  [+ Add Step]
```

### Approver type explanations (show as helper text):
- `DIRECT_MANAGER` — The employee's assigned reporting manager approves
- `ROLE` — Any user with the selected role can approve
- `SPECIFIC_USER` — One specific person always approves

---

## 7. Handling Escalation State in the UI

The backend auto-escalates overdue RM steps after 48 hours (configurable). From the UI perspective:

- A step that was `PENDING` (RM) will appear as `SKIPPED` after escalation
- The step's `comment` will say: `"Auto-escalated: no action taken within 48h"`
- The next step (HR) will then be `PENDING`

You do not need to do anything special — just render `SKIPPED` with the grey badge and show the comment.

**Tip:** On the RM's "My Team" page, if they open a request and see their step is SKIPPED with the escalation comment, it means the cron already moved it to HR. Inform them in the UI: "This request has been escalated to HR."

---

## 8. Error Handling

These new error responses need to be handled gracefully:

| HTTP | Message | When it happens | UI response |
|---|---|---|---|
| `400` | `"Approval is already approved/rejected"` | Calling review on a closed request | Refresh the page, show toast |
| `400` | `"No pending step found for current workflow position"` | Race condition, someone else approved first | Refresh the page |
| `400` | `"No approver resolved for this step..."` | Employee has no RM assigned | Show admin alert: "Assign a reporting manager" |
| `400` | `"Only pending requests can be cancelled"` | Employee tries to cancel non-pending | Disable cancel button if status ≠ PENDING |
| `403` | `"You are not the designated approver for this step"` | Wrong person trying to approve | Hide approve button for that request |
| `403` | `"Your role is not authorized to approve this step"` | HR tries to approve RM step or vice versa | Show correct step label |
| `403` | `"Only Reporting Managers can access team regularizations"` | Non-RM calling /team | Redirect to correct endpoint |
| `403` | `"Only ADMIN or HR can access the full regularization list"` | RM calling /list | Redirect to /team |

---

## 9. Page / Component Checklist

Go through each item and tick it off:

### All roles
- [ ] Update `ReviewRegularizationDto` type: `status` → `action`, add `comment`
- [ ] Add `approvalInstance` to `Regularization` type definition
- [ ] Update approve/reject modal: rename field, add comment input
- [ ] Show approval trail on regularization detail view

### Employee
- [ ] Add Cancel button (only visible when `status === 'PENDING'`)
- [ ] Call `DELETE /regularizations?id=xxx` on cancel
- [ ] Confirm dialog before cancel
- [ ] Show full step trail on each request

### RM
- [ ] Change API call from `/regularizations/list` to `/regularizations/team`
- [ ] Handle pagination (`meta.totalRecords`, `meta.totalPages`)
- [ ] Show approval trail including which step is waiting for them
- [ ] Disable/hide approve button if `currentStep` is not the RM's step

### HR
- [ ] Add pending queue badge using `GET /approval-workflows/my-queue`
- [ ] Update review modal body

### Admin
- [ ] Update review modal body
- [ ] Add "Force Approve" / "Force Reject" buttons (visible when `approvalInstance.status === 'IN_PROGRESS'`)
- [ ] Force action confirmation modal with reason field
- [ ] Call `PATCH /regularizations/override?id=xxx`
- [ ] Build Workflow Management page (Settings → Approval Workflows)
  - [ ] List workflows with tabs by module
  - [ ] Create workflow form with dynamic steps
  - [ ] Set default workflow
  - [ ] Delete workflow

---

## 10. Quick API Cheat Sheet

```
# Employee
POST   /regularizations                        create request
GET    /regularizations/me                     my requests
GET    /regularizations?id=xxx                 single request
DELETE /regularizations?id=xxx                 cancel (PENDING only)

# RM
GET    /regularizations/team?limit=10&page=1   team requests
GET    /regularizations?id=xxx                 single request
PATCH  /regularizations?id=xxx                 approve / reject step
GET    /approval-workflows/my-queue            pending steps for me

# HR
GET    /regularizations/list?limit=10&page=1   all requests
GET    /regularizations?id=xxx                 single request
PATCH  /regularizations?id=xxx                 approve / reject step
GET    /approval-workflows/my-queue            pending steps for me

# Admin
GET    /regularizations/list?limit=10&page=1   all requests
PATCH  /regularizations?id=xxx                 approve / reject step
PATCH  /regularizations/override?id=xxx        force approve / reject
POST   /approval-workflows                     create workflow
GET    /approval-workflows                     list workflows
GET    /approval-workflows/detail?id=xxx       single workflow
PATCH  /approval-workflows?id=xxx             update workflow
DELETE /approval-workflows?id=xxx             delete workflow
```
