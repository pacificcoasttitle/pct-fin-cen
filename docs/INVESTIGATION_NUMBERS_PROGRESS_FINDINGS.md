# Investigation Findings: Confirmation Numbers & Wizard Progress

## Summary

| # | Issue | Status | Finding |
|---|-------|--------|---------|
| 1 | Confirmation Number | ✅ WORKING | Real UUID from API, displayed as first 8 chars |
| 2 | Order Number in Wizard | ✅ WORKING | Correctly reads from `report.escrow_number` |
| 3 | Progress Shows 100% | 🐛 BUG | Dynamic step array causes misleading progress |

---

## Issue 1: Client Confirmation Number ✅

### Success Screen Code

```typescript
// web/app/(app)/app/requests/new/page.tsx

// After submission - stores real API response
const result = await response.json();
console.log("Success! Request ID:", result.id);
setRequestId(result.id);

// Display - shows first 8 characters uppercased
<p className="text-xl font-mono font-bold text-green-700">
  {requestId?.slice(0, 8).toUpperCase() || "..."}
</p>
```

### API Response

```typescript
// api/app/routes/submission_requests.py
class SubmissionRequestResponse(BaseModel):
    id: str  // Full UUID returned
    status: str
    property_address: Optional[dict]
    // ... other fields
```

### Finding

✅ **WORKING CORRECTLY**

- The confirmation number IS real
- It's the actual database UUID
- Displayed as first 8 chars (e.g., `A1B2C3D4`) for user-friendliness
- Full UUID is stored for reference

### Optional Enhancement

Could add a human-readable confirmation number format:
```typescript
// Instead of: A1B2C3D4
// Could be: REQ-2026-00142 (year + sequential)
```

---

## Issue 2: Order Number in Wizard ✅

### Wizard Header Code

```tsx
// web/app/(app)/app/reports/[id]/wizard/page.tsx

<div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
  {/* Escrow Number from submission */}
  {report?.escrow_number && (
    <span className="font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-xs">
      {report.escrow_number}
    </span>
  )}
  // ...
</div>
```

### Data Flow Verification

**1. SubmissionRequest has escrow_number:**
```python
# api/app/models/submission_request.py
escrow_number = Column(String(100), nullable=True)
```

**2. Report creation copies escrow_number:**
```python
# api/app/routes/submission_requests.py - create_report_from_submission
report = Report(
    # ...
    escrow_number=submission.escrow_number,  # ✅ Copied!
    # ...
)
```

**3. Wizard reads from report:**
```tsx
{report?.escrow_number && (
  <span>{report.escrow_number}</span>
)}
```

### Finding

✅ **WORKING CORRECTLY**

- Escrow number flows correctly: Client Form → SubmissionRequest → Report → Wizard
- No hardcoded values found
- Displays properly in wizard header

---

## Issue 3: Progress Shows 100% on Step 1 🐛

### Progress Calculation Code

```typescript
// web/components/rrer-questionnaire.tsx

// Dynamic steps array - changes based on user answers!
const relevantDeterminationSteps = useMemo(() => {
  const steps: DeterminationStepId[] = ["property"]
  
  if (determination.isResidential === "no") {
    steps.push("intent-to-build")
    if (determination.hasIntentToBuild === "yes") {
      steps.push("financing")
      // ... more conditional steps
    }
  }
  
  return steps
}, [determination])

// Progress calculation
const determinationProgress = useMemo(() => {
  const currentIndex = relevantDeterminationSteps.indexOf(determinationStep)
  return ((currentIndex + 1) / relevantDeterminationSteps.length) * 100
}, [determinationStep, relevantDeterminationSteps])
```

### The Bug

At step 1 ("property"), BEFORE answering any questions:

```
relevantDeterminationSteps = ["property"]  // Only 1 step!
currentIndex = 0
Progress = (0 + 1) / 1 * 100 = 100%  // BUG!
```

The array is dynamically built based on answers, so:
- **Initial state:** Only "property" step exists → 100% complete
- **After answering "yes" to residential:** Still only "property" → 100%
- **After answering "no" to residential:** "property" + "intent-to-build" → 50%

### Root Cause

Progress is calculated based on **currently known steps**, not **total potential steps**.

### Display Code

```tsx
{/* Progress indicator badge */}
<div className="flex items-center justify-between mt-3">
  <div className="flex items-center gap-2">
    <span className="text-sm font-medium">
      Step {relevantDeterminationSteps.indexOf(determinationStep) + 1}
    </span>
    <span className="text-sm text-muted-foreground">
      of {relevantDeterminationSteps.length}  // Shows "of 1" at start!
    </span>
  </div>
  <div>
    <span className="text-sm font-semibold text-primary">
      {Math.round(determinationProgress)}%  // Shows 100%!
    </span>
  </div>
</div>
```

### Finding

🐛 **BUG CONFIRMED**

Progress shows 100% because:
1. Step array is dynamically calculated
2. At start, only 1 step is known
3. Being on step 1 of 1 = 100%

---

## Recommended Fixes

### Fix 1: Confirmation Number (Optional Enhancement)

No fix needed - working correctly. But could enhance:

```typescript
// Generate human-readable ID on API side
const confirmationNumber = `REQ-${new Date().getFullYear()}-${padStart(sequentialId, 5, '0')}`;
// Returns: REQ-2026-00142
```

### Fix 2: Order Number

✅ No fix needed - working correctly.

### Fix 3: Progress Calculation 🐛

**Option A: Remove percentage, show step X of Y**

Since total steps are unknown, hide the percentage:

```tsx
// Remove the percentage display for determination phase
{phase === "determination" && (
  <div className="flex items-center gap-2">
    <span className="text-sm font-medium">
      Question {relevantDeterminationSteps.indexOf(determinationStep) + 1}
    </span>
    <span className="text-sm text-muted-foreground">
      {/* Don't show "of X" since X is unknown */}
    </span>
  </div>
)}
```

**Option B: Calculate based on maximum possible steps**

```typescript
// Maximum determination steps
const MAX_DETERMINATION_STEPS = 7; // property, intent, financing, lender-aml, buyer-type, exemptions, result

const determinationProgress = useMemo(() => {
  const currentIndex = relevantDeterminationSteps.indexOf(determinationStep);
  // Use max steps, but cap at 100%
  const progressPercent = Math.min(((currentIndex + 1) / MAX_DETERMINATION_STEPS) * 100, 100);
  return progressPercent;
}, [determinationStep, relevantDeterminationSteps]);
```

**Option C: Show completion status instead**

```tsx
<Badge variant="outline">
  {determinationResult ? "Complete" : "In Progress"}
</Badge>
```

**Recommended: Option B (max steps)**

This gives meaningful progress feedback:
- Step 1/7 = 14%
- Step 2/7 = 28%
- etc.

---

## Implementation Priority

| Fix | Priority | Effort | Impact |
|-----|----------|--------|--------|
| Confirmation Number | Low | Medium | Nice to have |
| Order Number | N/A | N/A | Already working |
| Progress Calculation | Medium | Low | UX improvement |

---

## Files to Modify

For Fix 3 (Progress):

```
web/components/rrer-questionnaire.tsx
- Line ~736: Update determinationProgress calculation
- Line ~1022-1039: Update progress display (optional)
```
