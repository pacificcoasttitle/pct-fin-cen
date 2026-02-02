# Investigation: FinCEN Filing Transmission, Response Handling & User Visibility

**Investigation Date:** February 2, 2026  
**Days to Deadline:** 27 days (March 1, 2026)  
**Status:** INVESTIGATION COMPLETE

---

## PART 1: Filing Transmission — What Exists Today

### Button → API Path

| Component | Location | Description |
|-----------|----------|-------------|
| **Frontend Button** | `web/components/rrer-questionnaire.tsx:4318` | "Submit to FinCEN" button in `file-report` step |
| **Handler Function** | `web/components/rrer-questionnaire.tsx:535-587` | `handleFileToFinCEN()` async handler |
| **onFileReport prop** | `web/components/rrer-questionnaire.tsx:337` | Passed from parent wizard page |
| **Wizard Page Caller** | `web/app/(app)/app/reports/[id]/wizard/page.tsx:425-439` | Calls `fileReport(reportId)` from API |
| **API Function** | `web/lib/api.ts` | `fileReport()` → `POST /reports/{id}/file` |
| **Backend Endpoint** | `api/app/routes/reports.py:787-929` | `@router.post("/{report_id}/file")` |

### Real FinCEN Integration

| Check | Status | Details |
|-------|--------|---------|
| **SDTM/SFTP code exists** | ❌ **NO** | No SDTM, SFTP, or BSA E-Filing code found |
| **XML generation exists** | ❌ **NO** | Only comment mentioning XML: "Format data to FinCEN XML schema" in mock |
| **FinCEN service file** | ❌ **NONE** | Only `api/app/services/filing.py` (mock provider) |
| **SFTP libraries installed** | ❌ **NO** | No paramiko, pysftp, or fabric in `requirements.txt` |
| **References found** | ✅ Comments only | Various UI text and comments reference FinCEN |

**Libraries in `requirements.txt`:**
```
fastapi, uvicorn, pydantic, psycopg2-binary, sqlalchemy, alembic, boto3, sendgrid, pytest, httpx
```

**No SFTP/SDTM libraries present.**

### Mock Filing Logic

**Implementation File:** `api/app/services/filing_lifecycle.py`

**What it does (step by step):**

1. **`get_or_create_submission()`** (lines 25-43)
   - Retrieves existing `FilingSubmission` or creates new one
   - Sets initial status to `not_started`

2. **`enqueue_submission()`** (lines 46-79)
   - Sets status to `queued`
   - Increments attempt count
   - Stores payload snapshot (property address, closing date, party roles)
   - Clears previous rejection info
   - Creates audit log entry

3. **`perform_mock_submit()`** (lines 82-127)
   - Transitions to `submitted` status
   - Checks `demo_outcome` field (default: `accept`)
   - Routes to: `mark_accepted()`, `mark_rejected()`, or `mark_needs_review()`

4. **`mark_accepted()`** (lines 130-185)
   - Generates receipt ID via `generate_receipt_id()`
   - Updates FilingSubmission: status=`accepted`, receipt_id=generated
   - Updates Report: status=`filed`, filing_status=`filed_mock`, filed_at, receipt_id
   - Creates audit log
   - Creates notification (type: `filing_receipt`)

5. **`mark_rejected()`** (lines 188-240)
   - Updates FilingSubmission: status=`rejected`, rejection_code, rejection_message
   - Updates Report: filing_status=`rejected`
   - Creates audit log
   - Creates notification (type: `internal_alert`)

**Receipt ID Format:**
```python
def generate_receipt_id(report_id: UUID) -> str:
    hash_input = str(report_id).encode()
    short_hash = hashlib.sha256(hash_input).hexdigest()[:8].upper()
    return f"RER-DEMO-{short_hash}"  # Example: RER-DEMO-A1B2C3D4
```

**Alternative format in mock service:**
```python
# api/app/services/filing.py
f"{RRER}-{year}-{random_8_chars}"  # Example: RRER-2026-XYZ12345
```

**Response Structure (success):**
```json
{
  "ok": true,
  "report_id": "uuid",
  "status": "accepted",
  "receipt_id": "RER-DEMO-A1B2C3D4",
  "filed_at": "2026-02-02T12:00:00Z",
  "message": "Filed successfully (demo)",
  "is_demo": true
}
```

**Success/Failure Logic:**
- Determined by `FilingSubmission.demo_outcome` field
- Default: `accept` (always succeeds in demo mode)
- Can be overridden via `POST /demo/reports/{id}/set-filing-outcome`

### FilingSubmission Model

**File:** `api/app/models/filing_submission.py`

**Fields:**

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `report_id` | UUID (FK) | Report being filed (1:1) |
| `created_at` | DateTime | Creation timestamp |
| `updated_at` | DateTime | Last update |
| `environment` | String(20) | `staging` or `prod` |
| `status` | String(50) | Filing status (indexed) |
| `receipt_id` | String(100) | BSA receipt ID (indexed) |
| `rejection_code` | String(50) | Error code if rejected |
| `rejection_message` | String(500) | Error message if rejected |
| `demo_outcome` | String(20) | `accept`, `reject`, `needs_review` |
| `demo_rejection_code` | String(50) | Demo rejection code |
| `demo_rejection_message` | String(500) | Demo rejection message |
| `payload_snapshot` | JSONB | Safe summary of filed data |
| `attempts` | Integer | Retry count |

**Statuses:**
- `not_started` - No filing attempt made
- `queued` - Filing request queued
- `submitted` - Sent to FinCEN (mock in staging)
- `accepted` - Filing accepted with receipt
- `rejected` - Filing rejected with error code
- `needs_review` - Requires internal review

**Relationships:**
- `report` → Report (back_populates `filing_submission`)

### Background Processing

| Feature | Status | Details |
|---------|--------|---------|
| **Queue system** | ❌ **NONE** | No Celery, RQ, or async task queue |
| **Retry logic** | ✅ **YES** | `retry_submission()` function exists |
| **Async handling** | ❌ **NONE** | Synchronous request/response cycle |

Filing is handled inline - when staff clicks "Submit", the entire flow executes synchronously before the API returns.

### Demo Endpoint

**Endpoint:** `POST /demo/reports/{report_id}/set-filing-outcome`

**File:** `api/app/routes/demo.py:216-273`

**Purpose:** Allows demo control of filing behavior

**Request Body:**
```json
{
  "outcome": "accept" | "reject" | "needs_review",
  "code": "MISSING_FIELD",
  "message": "Required field X is missing"
}
```

**Security:**
- Requires `ENVIRONMENT=staging`
- Requires `X-DEMO-SECRET` header matching `DEMO_SECRET` env var
- Returns 404 if requirements not met (to avoid discovery)

---

## PART 2: Response Handling — What Happens With FinCEN's Answer

### Status Transitions on Success

| Model | Before | After | Code Location |
|-------|--------|-------|---------------|
| Report.status | `ready_to_file` | `filed` | `filing_lifecycle.py:150` |
| Report.filing_status | `null` | `filed_mock` | `filing_lifecycle.py:151` |
| Report.filed_at | `null` | `datetime.utcnow()` | `filing_lifecycle.py:152` |
| Report.receipt_id | `null` | `RER-DEMO-{hash}` | `filing_lifecycle.py:153` |
| FilingSubmission.status | `submitted` | `accepted` | `filing_lifecycle.py:144` |
| FilingSubmission.receipt_id | `null` | `RER-DEMO-{hash}` | `filing_lifecycle.py:145` |
| SubmissionRequest.status | `in_progress` | `completed` | `reports.py:896-903` |
| BillingEvent | N/A | Created | `reports.py:854-891` |

### Status Transitions on Failure/Rejection

| Model | Before | After | Code Location |
|-------|--------|-------|---------------|
| Report.filing_status | `null` | `rejected` | `filing_lifecycle.py:208-209` |
| FilingSubmission.status | `submitted` | `rejected` | `filing_lifecycle.py:201` |
| FilingSubmission.rejection_code | `null` | Error code | `filing_lifecycle.py:202` |
| FilingSubmission.rejection_message | `null` | Error message | `filing_lifecycle.py:203` |

**Note:** Report.status does NOT revert on rejection - remains at last status.

### Acknowledgement Lifecycle

| Feature | Status | Details |
|---------|--------|---------|
| **Polling exists** | ❌ **NO** | No background job to check FinCEN |
| **MESSAGES.XML parser** | ❌ **NO** | No XML parsing code |
| **Intermediate statuses tracked** | ✅ **YES** | `queued` → `submitted` → `accepted/rejected/needs_review` |
| **BSA statuses in code** | ✅ **PARTIAL** | Only mock statuses, no real BSA acknowledgement statuses |

### Rejection Flow

| Feature | Status | Details |
|---------|--------|---------|
| **Re-filing supported** | ✅ **YES** | `retry_submission()` function exists |
| **Status reversion** | ❌ **NO** | Report.status stays same |
| **Rejection UI** | ✅ **YES** | Wizard shows rejection card with code/message |
| **Rejection reason display** | ✅ **YES** | `wizard/page.tsx:862-888` shows rejection code and message |

### Notifications

| Event | Email Sent | Recipients | Code Location |
|-------|------------|------------|---------------|
| Filing Accepted | ✅ Logged | Internal | `filing_lifecycle.py:169-183` |
| Filing Rejected | ✅ Logged | Internal | `filing_lifecycle.py:225-238` |
| Party Invited | ✅ Yes | Party | `notifications.py:100-150` |
| Party Submitted | ✅ Yes | Party | `notifications.py:153-192` |

**Note:** Filing notifications are logged to `NotificationEvent` but use type `filing_receipt` and `internal_alert` - they don't appear to send actual emails to clients.

### Audit Trail

| Event Type | Data Captured | Code Location |
|------------|---------------|---------------|
| `filing_queued` | attempt count, environment | `filing_lifecycle.py:67-77` |
| `filing_submitted` | attempt count | `filing_lifecycle.py:101-108` |
| `filing_accepted` | receipt_id, attempt count | `filing_lifecycle.py:157-167` |
| `filing_rejected` | rejection_code, rejection_message, attempt count | `filing_lifecycle.py:212-223` |
| `filing_needs_review` | attempt count | `filing_lifecycle.py:263-270` |
| `billing_event.created` | event_type, amount_cents, company_id, report_id, bsa_id | `reports.py:875-890` |

**Audit event types defined in:** `api/app/services/audit.py:88-95`

---

## PART 3: User-Facing Display — What Every Role Sees

### COO (`coo`) — Executive Dashboard

**Page:** `/app/executive`
**Component:** `web/app/(app)/app/executive/page.tsx`
**API Data Source:** `GET /reports/executive-stats`

**What's Rendered:**

| Metric | Field | Source | Real/Mock |
|--------|-------|--------|-----------|
| Month to Date Revenue | `mtd_revenue_cents` | `filed_this_month * 7500` | **CALCULATED** (hardcoded $75) |
| Revenue Per Filing | N/A | Hardcoded `$75.00` | **HARDCODED** |
| Filings This Month | `filed_this_month` | `Report.filed_at >= start_of_month` | **REAL** |
| Total Reports | `total_reports` | `Report.count()` | **REAL** |
| Total Filed | `filed_reports` | `Report.status == "filed"` | **REAL** |
| Exempt | `exempt_reports` | `Report.status == "exempt"` | **REAL** |
| In Progress | `pending_reports` | Statuses: draft, collecting, ready_to_file | **REAL** |
| Compliance Rate | `compliance_rate` | **Hardcoded** `98.2` | **MOCK** |
| Avg Completion | `avg_completion_days` | **Hardcoded** `3.2` | **MOCK** |

**Filing-specific display:**
- Shows "Filed with FinCEN" count in green card
- Does NOT show individual receipt IDs
- Does NOT show filing success/failure rate (mock 98.2% always)

**Gaps:**
- 🔴 Revenue uses hardcoded $75, not company-specific rates
- 🔴 Compliance rate is always 98.2% (hardcoded)
- 🟡 No drilling down to individual filings

### FinClear Admin (`pct_admin`)

**Page:** `/app/admin/requests`
**Component:** `web/app/(app)/app/admin/requests/page.tsx`

**What's Rendered:**
- Request status badges (pending, in_progress, completed, exempt, reportable)
- Property address
- Buyer name/type
- Time since submission

**Filing-specific display:**
- ❌ Receipt ID NOT shown in list
- ✅ Can see which requests are completed
- ✅ Early determination (exempt/reportable) shown

**Page:** `/app/admin/filings`
**Component:** `web/app/(app)/app/admin/filings/page.tsx`

**What's Rendered:**
- Full filing status: not_started, queued, submitted, accepted, rejected, needs_review
- ✅ Receipt ID shown (copyable)
- ✅ Property address
- ✅ Filing timestamp
- ✅ Retry button for rejected filings
- ✅ Status filtering

**Page:** `/app/admin/reports/[id]`
**Component:** `web/app/(app)/app/admin/reports/[id]/page.tsx`

**What's Rendered:**
- Full filing submission details
- ✅ Receipt ID (if accepted)
- ✅ Filing status
- ✅ Timestamps

### FinClear Staff (`pct_staff`)

**Page:** `/app/staff/queue`
**Component:** `web/app/(app)/app/staff/queue/page.tsx`

**What's Rendered:**
- Reports grouped by status: Needs Setup, Collecting, Ready to File
- Party completion progress
- Filing deadline
- Action buttons: "Continue Setup", "View Progress", "Review & File"

**Filing-specific display:**
- ❌ Filed reports NOT shown (disappear from queue)
- ❌ Receipt ID NOT visible in queue
- Queue only shows active work items

**Page:** `/app/reports/[id]/wizard` (File Report Step)
**Component:** `web/components/rrer-questionnaire.tsx:4147-4339`

**During Filing (loading state):**
```jsx
{filing && (
  <>
    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
    Submitting to FinCEN...
  </>
)}
```

**After Success:**
```jsx
<div className="text-center py-8">
  <CheckCircle2 className="h-8 w-8 text-green-600" />
  <h3>Report Filed Successfully!</h3>
  <p>Your report has been submitted to FinCEN.</p>
  <Card className="bg-green-50">
    <p>Receipt ID</p>
    <p className="font-mono font-bold text-xl">{filingResult.receiptId}</p>
  </Card>
  <Button href="/app/reports">Back to Reports Dashboard</Button>
</div>
```

**After Failure:**
```jsx
<Alert variant="destructive">
  <XCircle className="w-4 h-4" />
  <AlertTitle>Filing Failed</AlertTitle>
  <AlertDescription>{filingResult.error}</AlertDescription>
</Alert>
```

**Wizard Page (Action Area):**
- Shows filing result with receipt ID in green box
- Shows rejection with code/message in red box
- Receipt ID displayed in monospace font

### Client Admin (`client_admin`)

**Page:** `/app/dashboard`
**Component:** `web/app/(app)/app/dashboard/page.tsx`

**What's Rendered:**
- Pending, In Progress, Completed counts
- Recent requests list

**Filing-specific display:**
- ❌ Receipt ID NOT shown on dashboard
- ✅ "Completed" count includes filed reports
- ❌ No direct filing status display

**Page:** `/app/requests/[id]`
**Component:** `web/app/(app)/app/requests/[id]/page.tsx`

**What's Rendered (for completed requests):**
```jsx
{request.status === "completed" && request.filing_receipt_id && (
  <Card className="border-green-200 bg-green-50">
    <CheckCircle2 className="h-8 w-8 text-green-600" />
    <h3>FinCEN Filing Complete</h3>
    <p>Receipt ID: <span className="font-mono">{request.filing_receipt_id}</span></p>
  </Card>
)}
```

**Filing-specific display:**
- ✅ Receipt ID shown when status = completed
- ✅ Green success card displayed
- ✅ Receipt in monospace font

**Page:** `/app/invoices`
**Component:** `web/app/(app)/app/invoices/page.tsx`

**What's Rendered:**
- Invoice list with status, amount, dates
- Line items with descriptions

**Filing-specific display:**
- ❌ BSA receipt ID NOT shown on invoices
- Line item description includes property address only

### Client User (`client_user`)

Same pages as client_admin but with identical views.

### Party Portal (`/p/{token}`)

**Component:** `web/app/p/[token]/page.tsx`

**After party submits:**
- Shows confirmation page with confirmation ID
- ❌ No filing status reference
- ❌ No way to check back on filing status

---

## PART 4: Cross-Cutting Concerns

### Status Consistency

| Page | Component | Status Display Text | Badge Component |
|------|-----------|--------------------|--------------------|
| Wizard (success) | rrer-questionnaire.tsx | "Report Filed Successfully!" | N/A |
| Wizard page (success) | wizard/page.tsx | "Successfully Filed!" | Demo badge |
| Admin filings | admin/filings/page.tsx | "Accepted" | Custom FILING_STATUS_MAP |
| Admin requests | admin/requests/page.tsx | "completed" | RequestStatusBadge |
| Client requests | requests/[id]/page.tsx | "FinCEN Filing Complete" | N/A |
| Executive | executive/page.tsx | "Filed with FinCEN" | Badge |

**Inconsistencies Found:**
- "Filed", "Accepted", "completed", "FinCEN Filing Complete" all mean same thing
- No single status badge component for filing status

### Receipt ID Display

| Page | Role | Shown | Copyable | Format |
|------|------|-------|----------|--------|
| Wizard (rrer-questionnaire) | Staff | ✅ | ❌ | `RER-DEMO-{hash}` |
| Wizard page (action area) | Staff | ✅ | ❌ | Monospace |
| Admin filings | Admin | ✅ | ✅ | Monospace |
| Admin report detail | Admin | ✅ | ❌ | Monospace |
| Admin reports list | Admin | ✅ | ❌ | Truncated |
| Client request detail | Client | ✅ | ❌ | Monospace |
| Client dashboard | Client | ❌ | N/A | N/A |
| Client invoices | Client | ❌ | N/A | N/A |
| Executive | COO | ❌ | N/A | N/A |

**Receipt ID Searchable:** Only in `/app/admin/filings` page

### Timeline/History

| Page | Role | Timeline Shown | Filing Timestamp |
|------|------|---------------|-----------------|
| Wizard page | Staff | ❌ | ✅ `filed_at` shown |
| Admin report detail | Admin | ❌ | ✅ In submission details |
| Client request detail | Client | ❌ | ❌ |
| Audit logs | Admin | ✅ | ✅ In event details |

**No visual timeline component showing:**
- created → determination → collecting → filed

### Error Handling

| Scenario | UI Response | Retry Available | Code Location |
|----------|-------------|-----------------|---------------|
| API error during filing | Toast "Filing Failed" + error message | ❌ No | rrer-questionnaire.tsx:577-583 |
| Rejected filing | Red card with code/message | ✅ Via admin filings | wizard/page.tsx:862-888 |
| Ready check failed | Red box with errors list | ❌ Must fix and retry | rrer-questionnaire.tsx:4254-4264 |
| Network error | Generic error in console | ❌ Must refresh | Error boundary if exists |

---

## CRITICAL GAPS SUMMARY

### 🔴 Blockers (Must fix before March 1)

| Gap | Impact | Estimated Effort |
|-----|--------|-----------------|
| **No real FinCEN/SDTM integration** | Cannot actually file with FinCEN | 5-10 days |
| **No XML generation** | Cannot create FinCEN-compliant filing format | 3-5 days |
| **No SFTP client** | Cannot transmit to BSA E-Filing system | 1-2 days |
| **No MESSAGES.XML parser** | Cannot receive/process acknowledgements | 2-3 days |
| **No background queue** | Filing blocks UI, no retry on timeout | 2-3 days |

### 🟡 Important (Should fix before March 1)

| Gap | Impact | Estimated Effort |
|-----|--------|-----------------|
| **Receipt ID not on client invoices** | Clients can't match filings to bills | 2 hours |
| **No filing status on client dashboard** | Clients don't see clear filing completion | 2 hours |
| **No visual timeline** | Hard to track report lifecycle | 4 hours |
| **Inconsistent status text** | Confusing UX across pages | 2 hours |
| **Client can't see filing history** | No transparency on what was filed | 4 hours |
| **Hardcoded compliance rate (98.2%)** | Misleading executive metrics | 1 hour |
| **Hardcoded revenue per filing ($75)** | Doesn't use company-specific rates | 30 min (already fixed in billing) |

### 🟢 Nice to Have (Post-launch)

| Gap | Impact | Estimated Effort |
|-----|--------|-----------------|
| **No PDF receipt generation** | Can't provide printable confirmation | 4-8 hours |
| **No bulk filing** | Must file one at a time | 1-2 days |
| **No filing queue dashboard** | Can't monitor queue depth | 4 hours |
| **Party portal can't check status** | Parties have no visibility | 2-4 hours |
| **No scheduled auto-filing** | Must manually trigger each filing | 1 day |
| **No filing status webhooks** | Can't notify external systems | 4-8 hours |

---

## FILE INVENTORY

### Backend - Filing

| File | Lines | Purpose |
|------|-------|---------|
| `api/app/routes/reports.py` | ~940 | Main file endpoint (line 787) |
| `api/app/services/filing_lifecycle.py` | 396 | Mock submission state machine |
| `api/app/services/filing.py` | 84 | MockFilingProvider class |
| `api/app/models/filing_submission.py` | 102 | FilingSubmission SQLAlchemy model |
| `api/app/routes/demo.py` | 320 | Demo outcome endpoint (line 216) |
| `api/app/services/audit.py` | 336 | Audit logging with filing events |
| `api/app/services/notifications.py` | 258 | Notification logging |

### Frontend - Filing UI

| File | Lines | Purpose |
|------|-------|---------|
| `web/components/rrer-questionnaire.tsx` | ~4700 | Wizard with file-report step |
| `web/app/(app)/app/reports/[id]/wizard/page.tsx` | ~920 | Wizard page with file action |
| `web/app/(app)/app/admin/filings/page.tsx` | ~325 | Admin filings management |
| `web/app/(app)/app/admin/reports/[id]/page.tsx` | ~380 | Admin report detail |
| `web/app/(app)/app/requests/[id]/page.tsx` | ~480 | Client request detail (shows receipt) |

---

## CONCLUSION

The current system has a **complete mock filing infrastructure** that works well for demo purposes, but has **no real FinCEN integration code**. The most critical path to production readiness is:

1. **Build SDTM/BSA E-Filing integration** (XML generation + SFTP transmission)
2. **Build MESSAGES.XML acknowledgement processor** (polling + status updates)
3. **Add background queue** (so filing doesn't block UI and can retry)

The UI and data models are largely ready - they just need to be connected to real FinCEN infrastructure instead of the mock provider.
