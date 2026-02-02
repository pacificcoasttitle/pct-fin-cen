# CURSOR PROMPT: Investigation — FinCEN Filing Transmission, Response Handling & User Visibility

## Context

We are 27 days from the March 1, 2026 FinCEN RRER compliance deadline. We need a complete picture of what we actually have in place for transmitting filings to FinCEN, how we handle their responses, and how filing status is displayed to every user role in the system. This is the most critical path item — everything else is useless if we can't actually file.

---

## PART 1: Filing Transmission — What Exists Today

### Questions

1. **What happens when staff clicks "Submit to FinCEN" in the wizard?**
   - Trace the exact code path from the frontend button click through to the API response
   - Show the frontend handler (which component, which callback)
   - Show the API endpoint that receives the request (`POST /reports/{id}/file`)
   - Show the full implementation of that endpoint — every line

2. **Is there ANY real FinCEN/SDTM integration code?**
   - Search the entire codebase for references to: `SDTM`, `SFTP`, `BSA`, `FinCEN`, `e-filing`, `XML`, `MESSAGES.XML`, `sdtm.fincen.gov`
   - Is there a FinCEN client service file? (e.g., `fincen_client.py`, `filing_service.py`, `sdtm_service.py`)
   - Are there any XML generation utilities for the RRER format?
   - Are there any SFTP connection configs or libraries installed (paramiko, pysftp, etc.)?

3. **What does the mock filing actually do?**
   - Show the complete mock filing logic
   - What data does it use from the Report?
   - What does it return? (receipt_id format, response structure)
   - How does it determine success vs failure?
   - Show the `FilingSubmission` model — all fields, all statuses

4. **What is the `demo/reports/{id}/set-filing-outcome` endpoint doing?**
   - Show the full implementation
   - What outcomes are supported? (accepted, rejected, needs_review)
   - How does this interact with the Report and SubmissionRequest status?

5. **Is there a filing queue or is it synchronous?**
   - Is filing handled inline in the request/response cycle?
   - Is there any background job/task/worker infrastructure? (Celery, RQ, asyncio tasks)
   - Is there any retry logic?

### Output Format for Part 1

```
## Filing Transmission Findings

### Button → API Path
- Frontend component: [file path + line numbers]
- API handler called: [function name]
- Endpoint: [method + path]

### Real FinCEN Integration
- SDTM/SFTP code exists: YES/NO
- XML generation exists: YES/NO
- FinCEN service file: [path or "NONE"]
- SFTP libraries installed: YES/NO (list them)
- References found: [list all files with FinCEN/SDTM/BSA references]

### Mock Filing Logic
- Implementation file: [path + line numbers]
- What it does: [step by step]
- Receipt ID format: [pattern]
- Response structure: [JSON shape]
- Success/failure logic: [how determined]

### FilingSubmission Model
- File: [path]
- Fields: [all columns with types]
- Statuses: [all possible values]
- Relationships: [linked models]

### Background Processing
- Queue system: [what exists or "NONE"]
- Retry logic: [what exists or "NONE"]
- Async handling: [what exists or "NONE"]
```

---

## PART 2: Response Handling — What Do We Do With FinCEN's Answer

### Questions

1. **After filing, what status transitions happen?**
   - Walk through every model that gets updated when filing succeeds
   - Walk through every model that gets updated when filing fails/is rejected
   - Show the exact code for each transition
   - Include: Report, SubmissionRequest, FilingSubmission, BillingEvent, AuditLog

2. **Is there any acknowledgement/tracking lifecycle?**
   - Does the system poll for FinCEN acknowledgements?
   - Is there a `MESSAGES.XML` parser?
   - Is there any concept of "filed but awaiting acknowledgement" vs "filed and accepted"?
   - What BSA statuses do we track? (submitted, acknowledged, accepted, rejected, etc.)

3. **What happens on rejection?**
   - Is there a rejection handling flow?
   - Can staff re-file after a rejection?
   - Does the Report status revert?
   - Is there UI for viewing rejection reasons?

4. **What notifications fire on filing events?**
   - Are emails sent when a report is filed?
   - Are emails sent when accepted/rejected?
   - Who gets notified? (staff, client admin, client user?)
   - Show the notification/email code for filing events

5. **What audit trail is created?**
   - What audit events are logged during the filing flow?
   - Show the audit service calls in the filing endpoint
   - What data is captured in each audit entry?

### Output Format for Part 2

```
## Response Handling Findings

### Status Transitions on Success
| Model | Before | After | Code Location |
|-------|--------|-------|---------------|
| Report | ? | ? | file:line |
| SubmissionRequest | ? | ? | file:line |
| FilingSubmission | ? | ? | file:line |
| BillingEvent | ? | ? | file:line |

### Status Transitions on Failure/Rejection
| Model | Before | After | Code Location |
|-------|--------|-------|---------------|

### Acknowledgement Lifecycle
- Polling exists: YES/NO
- MESSAGES.XML parser: YES/NO
- Intermediate statuses tracked: [list]
- BSA statuses in code: [list all]

### Rejection Flow
- Re-filing supported: YES/NO
- Status reversion: YES/NO
- Rejection UI: YES/NO
- Rejection reason display: [where shown or "NOWHERE"]

### Notifications
| Event | Email Sent | Recipients | Code Location |
|-------|------------|------------|---------------|

### Audit Trail
| Event Type | Data Captured | Code Location |
|------------|---------------|---------------|
```

---

## PART 3: User-Facing Display — What Every Role Sees

For EACH role below, trace through every page and component where filing status or filing-related information is displayed. Don't just tell me what SHOULD show — tell me what the code ACTUALLY renders.

### COO (`coo`) — Executive Dashboard & Beyond

1. **Executive Dashboard (`/app/executive`)**
   - What filing-related KPIs/stats are shown?
   - Where does the data come from? (which API endpoint, which fields)
   - Is "filed this month" a real count or hardcoded?
   - Is revenue calculated from actual filings?
   - Is there a filing success/failure rate shown?
   - Show the exact JSX that renders filing info

2. **Does the COO see filing status anywhere else?**
   - Reports list?
   - Request detail?
   - Any filing history/log page?

### FinClear Admin (`pct_admin`)

1. **Admin Requests Page (`/app/admin/requests`)**
   - How is filing status shown for completed requests?
   - Is the receipt ID displayed?
   - Can admin see which reports are filed vs exempt?

2. **Admin Reports Page (if exists)**
   - Is there a reports list for admin?
   - Does it show filing status?
   - Can admin filter by filing status?

3. **Admin Billing/Invoices**
   - How are filed reports reflected in billing?
   - Does the invoice show the BSA receipt ID?

### FinClear Staff (`pct_staff`)

1. **My Queue (`/app/staff/queue`)**
   - What does a "filed" report look like in the queue?
   - Does it disappear from the queue or show as complete?
   - Is the receipt ID visible?

2. **Wizard — File Report Step**
   - What does the UI show DURING filing? (loading state)
   - What does the UI show AFTER successful filing? (success state)
   - What does the UI show AFTER failed filing? (error state)
   - Is the receipt ID displayed?
   - Is there a "Back to Dashboard" or next action?
   - Show the exact JSX for all three states

3. **Report Detail / Review Page**
   - After filing, what does the report detail show?
   - Is there a filing history section?
   - Can staff see the FilingSubmission record?

### Client Admin (`client_admin`)

1. **Client Dashboard (`/app/dashboard`)**
   - Does the dashboard show filing completion?
   - Is the receipt ID visible to clients?
   - What stats reflect filed reports?

2. **Client Requests Page (`/app/requests`)**
   - How does a "completed" request appear?
   - Is there any filing confirmation info?
   - What does the request detail page show for filed reports?

3. **Client Invoices (`/app/invoices`)**
   - Do invoices reference the filed report?
   - Is the BSA receipt ID on the invoice?

### Client User (`client_user`)

1. **Same pages as client_admin but with reduced access**
   - What filing info can client_user see?
   - Any differences from client_admin view?

### Party Portal (`/p/{token}`)

1. **After party submits their info**
   - Does the confirmation page reference filing status?
   - Is there any way for parties to check back on status?

### Output Format for Part 3

For EACH role, produce:

```
## [ROLE NAME] — Filing Visibility

### Page: [page path]
**Component:** [file path]
**API Data Source:** [endpoint]
**What's Rendered:**
- [exact fields/elements shown related to filing]
- [receipt ID shown: YES/NO, where]
- [filing status shown: YES/NO, how]
**Screenshot-worthy JSX:** [key rendering code block]

### Gaps Found:
- [anything missing or broken for this role]
```

---

## PART 4: Cross-Cutting Concerns

1. **Filing Status Consistency**
   - Is the filing status string consistent across all pages? (e.g., "Filed", "filed", "FILED", "Submitted")
   - Is the status badge component reused or duplicated?
   - Are there any pages showing stale/wrong filing status?

2. **Receipt ID Format & Display**
   - What format is the receipt ID? (e.g., `BSA-20260118-A1B2C3D4`)
   - Is it displayed consistently everywhere?
   - Is it copyable?
   - Is it searchable from any page?

3. **Filing Timeline/History**
   - Is there a timeline showing: created → determination → collecting → filed?
   - Where is this shown? (which pages, which roles)
   - Is the filing timestamp displayed?

4. **Error States**
   - What happens if the filing API returns an error?
   - Is there a generic error handler or filing-specific error UI?
   - Can the user retry?

### Output Format for Part 4

```
## Cross-Cutting Findings

### Status Consistency
| Page | Component | Status Display Text | Badge Component Used |
|------|-----------|--------------------|--------------------|

### Receipt ID Display
| Page | Role | Shown | Copyable | Format |
|------|------|-------|----------|--------|

### Timeline/History
| Page | Role | Timeline Shown | Filing Timestamp |
|------|------|---------------|-----------------|

### Error Handling
| Scenario | UI Response | Retry Available | Code Location |
|----------|-------------|-----------------|---------------|
```

---

## DELIVERABLE

After completing this investigation, produce a single document:

**`docs/INVESTIGATION_FILING_TRANSMISSION_FINDINGS.md`**

That contains ALL findings from Parts 1-4 in the formats specified above, plus a final section:

```
## CRITICAL GAPS SUMMARY

### 🔴 Blockers (Must fix before March 1)
| Gap | Impact | Estimated Effort |
|-----|--------|-----------------|

### 🟡 Important (Should fix before March 1)  
| Gap | Impact | Estimated Effort |
|-----|--------|-----------------|

### 🟢 Nice to Have (Post-launch)
| Gap | Impact | Estimated Effort |
|-----|--------|-----------------|
```

**DO NOT FIX ANYTHING. INVESTIGATION ONLY.** We need the full picture before we start building.
