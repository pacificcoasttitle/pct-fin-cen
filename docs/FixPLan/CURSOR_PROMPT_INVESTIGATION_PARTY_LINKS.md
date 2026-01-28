# CURSOR PROMPT: Investigation - Party Links & Report Status Flow

## 🔴 CRITICAL ISSUES FOUND

### Issue 1: Can't Send Party Links in Draft Status
```
Error: Cannot create party links for report in 'draft' status
Endpoint: POST /reports/{id}/party-links
```

### Issue 2: Entity Type Not Carrying Over
Buyer type from submission (entity/trust/individual) not populating in wizard.

### Issue 3: Session Cookie Parse Error (Minor)
```
Failed to parse session cookie: InvalidCharacterError: Failed to execute 'atob'
```

---

## INVESTIGATION 1: Party Links Endpoint

**File:** `api/app/routes/reports.py`

### Questions:

1. Find the endpoint `POST /reports/{id}/party-links`
2. Show the FULL code for this endpoint
3. What status check is blocking the request?
4. What statuses ARE allowed?

### Expected Logic:
```python
# CURRENT (broken):
if report.status != "collecting":
    raise HTTPException(400, "Cannot create party links for report in 'draft' status")

# EXPECTED (should be):
# Option A: Auto-transition to collecting when sending links
if report.status == "draft":
    report.status = "collecting"
    
# Option B: Allow draft status to send links
if report.status not in ("draft", "collecting"):
    raise HTTPException(400, "...")
```

---

## INVESTIGATION 2: Report Status Transitions

### Questions:

1. What are ALL valid report statuses?
   - `draft`, `collecting`, `ready_to_file`, `filed`, `exempt`?

2. When should status transition from `draft` → `collecting`?
   - When wizard reaches party setup?
   - When "Send Links" is clicked?
   - Manually by staff?

3. Is there an endpoint to change report status?
   - `PATCH /reports/{id}/status`?

4. Show the Report model status field and any comments about valid values.

---

## INVESTIGATION 3: Party Setup Step - Frontend

**File:** `web/components/rrer-questionnaire.tsx` or party setup component

### Questions:

1. What happens when "Send Links" is clicked?
2. Does it call an API endpoint?
3. Does it check report status first?
4. Show the `onSendPartyLinks` function code

---

## INVESTIGATION 4: Wizard Step Navigation

**File:** `web/components/rrer-questionnaire.tsx`

### Questions:

1. When staff moves from Collection → Party Setup, does anything change?
2. Is there supposed to be a status update at this transition?
3. What's the expected wizard flow:
   ```
   Determination → Collection → Party Setup → Summary → File
   ```

---

## INVESTIGATION 5: Entity Type Flow

**File:** `api/app/routes/submission_requests.py` (create-report endpoint)

### Questions:

1. Is `buyer_type` being included in `initialParties`?
   ```python
   "initialParties": {
       "buyers": [{
           "name": submission.buyer_name,
           "email": submission.buyer_email,
           "type": submission.buyer_type,  # <-- Is this here?
       }],
   }
   ```

2. Check the SubmissionRequest model - does `buyer_type` field exist?

**File:** `web/components/rrer-questionnaire.tsx`

3. In party setup initialization, is `type` being read from `initialParties`?

---

## INVESTIGATION 6: Session Cookie Issue

**File:** `web/context/sidebar-badge-context.tsx` (or wherever session is parsed)

### Questions:

1. Show the code that parses the session cookie
2. Is it using `atob()` directly?
3. What's the cookie format expected?

The error suggests the cookie value isn't valid base64. Could be:
- Cookie is URL-encoded and needs decoding first
- Cookie has special characters
- Cookie is empty or malformed

---

## OUTPUT FORMAT

```markdown
## Party Links Flow Findings

### Current Endpoint Code
**File:** [path]
```python
[show the party-links endpoint]
```

### Status Check Logic
- Current check: [what it checks]
- Allowed statuses: [list]
- Draft allowed: [yes/no]

### Root Cause
[Why can't draft status send links]

---

## Status Transition Findings

### Valid Statuses
1. draft - [when/what]
2. collecting - [when/what]
3. ready_to_file - [when/what]
4. filed - [when/what]
5. exempt - [when/what]

### Transition Triggers
- draft → collecting: [what triggers this]
- collecting → ready_to_file: [what triggers this]

---

## Entity Type Findings

### In create-report endpoint
- buyer_type included: [yes/no]
- Code: [snippet]

### In wizard initialization
- type being read: [yes/no]
- Code: [snippet]

---

## Session Cookie Findings

### Parse Code
```typescript
[show the code]
```

### Issue
[Why atob is failing]

---

## Recommended Fixes

### Fix 1: Allow Party Links in Draft (or auto-transition)
[recommendation]

### Fix 2: Entity Type Transfer
[recommendation]

### Fix 3: Session Cookie Parsing
[recommendation]
```

---

## THE EXPECTED WORKFLOW

```
1. Client submits request (status: pending)
         ↓
2. Staff clicks "Start Wizard" 
   → Report created (status: DRAFT)
         ↓
3. Staff completes Determination phase
         ↓
4. Staff completes Collection phase
         ↓
5. Staff reaches Party Setup
   → Sees buyer/seller from submission
         ↓
6. Staff clicks "Send Party Links"
   → Report status: DRAFT → COLLECTING  ← THIS TRANSITION IS MISSING
   → Party links generated
   → Emails sent
         ↓
7. Parties complete their forms
         ↓
8. Staff reviews, clicks "Ready to File"
   → Report status: COLLECTING → READY_TO_FILE
         ↓
9. Staff files to FinCEN
   → Report status: READY_TO_FILE → FILED
```

**Step 6 is broken - the status transition isn't happening.**

---

**Investigate and report back so we can fix this critical workflow blocker.**

---

## INVESTIGATION 7: Confirmation Number on Submit

**Issue:** When client submits a request, the confirmation screen shows a number that doesn't match the actual created request.

### Questions:

**File:** `api/app/routes/submission_requests.py`

1. What does `POST /submission-requests` return?
2. Is there a `confirmation_number` or `request_number` field?
3. What's the format? (e.g., "SR-2026-00042")
4. Show the response structure

**File:** `web/app/(app)/app/requests/new/page.tsx` (or wherever success is shown)

5. After successful submission, what does the frontend display?
6. Is it reading from the API response?
7. Or is it generating a fake/placeholder number?

**File:** `api/app/models/submission_request.py`

8. Is there a `confirmation_number` field on the model?
9. Is it auto-generated on create?

### Expected Behavior:
```
Client clicks "Submit"
    ↓
POST /submission-requests
    ↓
Backend creates request with confirmation_number = "SR-2026-00042"
    ↓
Backend returns { id, confirmation_number, ... }
    ↓
Frontend reads response.confirmation_number
    ↓
Shows: "Your request SR-2026-00042 has been submitted!"
```

### Add to Output:
```markdown
## Confirmation Number Findings

### API Response
- Returns confirmation_number: [yes/no]
- Field name: [confirmation_number / request_number / id]
- Format: [example]

### Frontend Display
- Reads from response: [yes/no]
- Currently shows: [what it displays]
- Source: [response field / hardcoded / generated]

### Model
- Has confirmation_number field: [yes/no]
- Auto-generated: [yes/no]
- Generation logic: [if exists]

### Gap
[What's broken]
```
