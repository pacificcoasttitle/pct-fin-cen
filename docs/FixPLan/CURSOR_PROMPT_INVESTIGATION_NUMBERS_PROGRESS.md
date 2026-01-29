# CURSOR PROMPT: Investigation - Confirmation Numbers & Wizard Progress

## 🦈 THREE SHARKS TO KILL

| # | Issue | Location | Symptom |
|---|-------|----------|---------|
| 1 | **Confirmation Number** | Client submission success screen | Is it real or fake? |
| 2 | **Order Number Hardcoded** | Wizard header/display | Shows fake number, not from request |
| 3 | **Progress Shows 100%** | Wizard Step 1 (Residential/Commercial) | Should be 0% or early progress |

---

## INVESTIGATION 1: Client Confirmation Number

### The Question:
When a client submits a new request, the success screen shows a confirmation number. Is this the REAL ID from the database, or a fake/placeholder?

**File:** `web/app/(app)/app/requests/new/page.tsx`

### Questions:

1. After `POST /submission-requests` succeeds, what is stored?
2. What is displayed on the success screen?
3. Is it from the API response or generated on frontend?

### Look for:
```typescript
// After submission
const response = await fetch(`${API_URL}/submission-requests`, {
  method: "POST",
  body: JSON.stringify(formData),
});
const result = await response.json();

// What gets displayed?
setConfirmationNumber(result.id);  // Real from API?
// OR
setConfirmationNumber("REQ-" + Math.random());  // Fake generated?
```

4. Show the success screen JSX that displays the number

**File:** `api/app/routes/submission_requests.py`

5. What does `POST /submission-requests` return?
6. Is there a `confirmation_number` field, or just `id`?
7. Show the response structure

---

## INVESTIGATION 2: Wizard Order Number Hardcoded

### The Problem:
When PCT staff opens the wizard for a request, there's an order/escrow number displayed that is HARDCODED, not pulled from the actual request.

**File:** `web/app/(app)/app/reports/[id]/wizard/page.tsx`

### Questions:

1. Where is the order/escrow number displayed in the wizard?
2. Is it pulled from the report data or hardcoded?
3. Show the code that renders the order number

### Look for hardcoded values:
```typescript
// BAD - Hardcoded
<span>Order #: 12345</span>
<span>Escrow: ESC-2024-001</span>

// GOOD - From data
<span>Order #: {report.escrow_number}</span>
<span>Escrow: {report.escrow_number || submission.escrow_number}</span>
```

**File:** `web/components/rrer-questionnaire.tsx`

4. Is there a header or info bar showing order details?
5. Where does it get the escrow/order number from?
6. Show the relevant code

**Also check:** Is the Report model receiving `escrow_number` from SubmissionRequest when created?

**File:** `api/app/routes/submission_requests.py` - `create_report_from_submission` endpoint

7. Is `escrow_number` being copied from SubmissionRequest to Report?

---

## INVESTIGATION 3: Wizard Progress Shows 100% on Step 1

### The Problem:
On Step 1 of the wizard (Residential/Commercial determination), the progress indicator shows 100% complete. It should show early progress (like 10% or "Step 1 of 7").

**File:** `web/components/rrer-questionnaire.tsx`

### Questions:

1. How is progress calculated?
2. What determines the percentage shown?
3. Is there a progress bar or step indicator component?
4. Show the progress calculation logic

### Look for:
```typescript
// Possible issues:

// 1. Hardcoded progress
const progress = 100;  // Always 100!

// 2. Wrong calculation
const progress = (currentStep / totalSteps) * 100;
// If currentStep = 1 and totalSteps = 1, progress = 100%

// 3. Using wrong variable
const progress = completedSteps.length / steps.length;
// If completedSteps includes all, progress = 100%

// 4. Determination phase not counted
// If wizard thinks determination is "complete" already
```

5. What are the wizard phases and steps?
   - Determination phase: Which steps?
   - Collection phase: Which steps?
   - Party setup phase: Which steps?

6. Is progress calculated per-phase or overall?

**File:** Wizard progress bar component (might be separate)

7. Show the progress bar component code
8. What props does it receive?
9. How does it render the percentage?

---

## OUTPUT FORMAT

```markdown
## Investigation Findings

### Issue 1: Confirmation Number

**Success Screen Code:**
```typescript
[show relevant code]
```

**API Response:**
```json
[show what API returns]
```

**Finding:**
- Real from API: [yes/no]
- What's displayed: [actual value or pattern]
- Gap: [if any]

---

### Issue 2: Order Number in Wizard

**Wizard Header Code:**
```typescript
[show relevant code]
```

**Data Source:**
- From report.escrow_number: [yes/no]
- Hardcoded value: [yes/no]
- Value shown: [actual value]

**Report Creation Code:**
```python
[show escrow_number transfer]
```

**Gap:** [what's wrong]

---

### Issue 3: Progress at 100%

**Progress Calculation:**
```typescript
[show calculation code]
```

**Current Logic:**
- Total steps: [number]
- Current step: [number]
- Calculation: [formula]
- Result: [why it's 100%]

**Progress Component:**
```typescript
[show component code]
```

**Gap:** [why it shows 100% on step 1]

---

## Recommended Fixes

### Fix 1: Confirmation Number
[solution]

### Fix 2: Order Number
[solution]

### Fix 3: Progress Calculation
[solution]
```

---

## EXPECTED BEHAVIOR

### Confirmation Number:
```
Client submits → API creates with id = "abc-123-def"
Success screen shows: "Your confirmation number: ABC123DE"
(Could be full UUID, shortened UUID, or formatted ID)
```

### Order Number in Wizard:
```
Request has escrow_number = "2024-ESC-00142"
Report copies escrow_number from request
Wizard displays: "Escrow #: 2024-ESC-00142"
```

### Wizard Progress:
```
Step 1: Property Type      → Progress: 14% (1/7)
Step 2: Residential Check  → Progress: 28% (2/7)
Step 3: Financing Type     → Progress: 42% (3/7)
...and so on
```

---

## QUICK CHECKS

### Confirmation Number:
1. Submit a new request
2. Note the confirmation number shown
3. Check database or API - does that ID exist?
4. Do they match?

### Order Number:
1. Create a request with escrow "TEST-123"
2. Start wizard for that request
3. Does wizard show "TEST-123" or something else?

### Progress:
1. Open wizard on Step 1
2. What percentage is shown?
3. Advance to Step 2 - does percentage change?

---

## LIKELY CAUSES

### Confirmation Number:
- Frontend generates fake number instead of using API response
- API returns `id` but frontend shows something else

### Order Number:
- Hardcoded placeholder never replaced
- `escrow_number` not copied from SubmissionRequest to Report
- Wizard not reading from correct field

### Progress 100%:
- Determination phase incorrectly marked complete
- Progress calculation uses wrong total
- Initial state sets progress to 100
- `completedSteps` array initialized with all steps

---

**Investigate all three - these affect demo quality!**
