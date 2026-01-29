# CURSOR PROMPT: Fix Wizard Progress Calculation

## 🦈 SHARK: Progress Shows 100% on Step 1

### Summary of Investigation

| Issue | Status |
|-------|--------|
| Confirmation Number | ✅ Working (real UUID, first 8 chars) |
| Order Number in Wizard | ✅ Working (reads from `report.escrow_number`) |
| **Progress Shows 100%** | 🐛 **BUG - Needs Fix** |

---

## THE BUG

### Current Behavior:
```
Step 1 (Property Type): Progress shows 100%
```

### Expected Behavior:
```
Step 1 (Property Type): Progress shows ~14% (1 of 7)
```

### Root Cause:

The progress calculation uses a **dynamic step array** that only contains steps based on current answers:

```typescript
// At start, only 1 step is known
relevantDeterminationSteps = ["property"]  // Length: 1

// Progress calculation
currentIndex = 0
Progress = (0 + 1) / 1 * 100 = 100%  // BUG!
```

The array grows as user answers questions, but at the start there's only 1 step, so being on step 1 of 1 = 100%.

---

## THE FIX

**File:** `web/components/rrer-questionnaire.tsx`

### Step 1: Define Maximum Steps Constant

Near the top of the component (around line 50-100), add:

```typescript
// Maximum possible determination steps for progress calculation
const MAX_DETERMINATION_STEPS = 7;
// Steps: property, intent-to-build, financing, lender-aml, buyer-type, exemptions, result
```

### Step 2: Update Progress Calculation

Find the `determinationProgress` calculation (around line ~736) and update:

```typescript
// BEFORE (buggy):
const determinationProgress = useMemo(() => {
  const currentIndex = relevantDeterminationSteps.indexOf(determinationStep)
  return ((currentIndex + 1) / relevantDeterminationSteps.length) * 100
}, [determinationStep, relevantDeterminationSteps])

// AFTER (fixed):
const determinationProgress = useMemo(() => {
  const currentIndex = relevantDeterminationSteps.indexOf(determinationStep)
  // Use max possible steps for consistent progress display
  // This gives meaningful feedback: step 1 = 14%, step 2 = 28%, etc.
  return Math.round(((currentIndex + 1) / MAX_DETERMINATION_STEPS) * 100)
}, [determinationStep, relevantDeterminationSteps])
```

### Step 3: Update Step Display (Optional but Recommended)

Find the progress display section (around line ~1022-1039) and update to not show misleading "of X":

```tsx
// BEFORE:
<div className="flex items-center gap-2">
  <span className="text-sm font-medium">
    Step {relevantDeterminationSteps.indexOf(determinationStep) + 1}
  </span>
  <span className="text-sm text-muted-foreground">
    of {relevantDeterminationSteps.length}  // Misleading!
  </span>
</div>

// AFTER (Option A - Remove "of X"):
<div className="flex items-center gap-2">
  <span className="text-sm font-medium">
    Step {relevantDeterminationSteps.indexOf(determinationStep) + 1}
  </span>
  <span className="text-sm text-muted-foreground">
    Determination
  </span>
</div>

// AFTER (Option B - Show phase progress):
<div className="flex items-center gap-2">
  <span className="text-sm font-medium">
    Determination
  </span>
  <span className="text-sm text-muted-foreground">
    {determinationProgress}% complete
  </span>
</div>
```

---

## ALTERNATIVE: Phase-Based Progress

If you want to show progress across ALL phases (determination + collection + party setup), use this approach:

```typescript
// Define phase weights
const PHASE_WEIGHTS = {
  determination: 30,  // 30% of total wizard
  collection: 50,     // 50% of total wizard
  partySetup: 20,     // 20% of total wizard
};

// Calculate overall wizard progress
const overallProgress = useMemo(() => {
  if (phase === "determination") {
    const stepProgress = (relevantDeterminationSteps.indexOf(determinationStep) + 1) / MAX_DETERMINATION_STEPS;
    return Math.round(stepProgress * PHASE_WEIGHTS.determination);
  }
  
  if (phase === "collection") {
    const collectionStepIndex = COLLECTION_STEPS.indexOf(collectionStep);
    const stepProgress = (collectionStepIndex + 1) / COLLECTION_STEPS.length;
    return PHASE_WEIGHTS.determination + Math.round(stepProgress * PHASE_WEIGHTS.collection);
  }
  
  if (phase === "partySetup") {
    // Party setup is near the end
    return PHASE_WEIGHTS.determination + PHASE_WEIGHTS.collection + 10;
  }
  
  return 0;
}, [phase, determinationStep, collectionStep, relevantDeterminationSteps]);
```

This gives:
- Determination: 0-30%
- Collection: 30-80%
- Party Setup: 80-100%

---

## VERIFICATION

After the fix:

| Step | Expected Progress |
|------|-------------------|
| Property (Step 1) | ~14% |
| Intent to Build (Step 2) | ~28% |
| Financing (Step 3) | ~42% |
| Lender AML (Step 4) | ~57% |
| Buyer Type (Step 5) | ~71% |
| Exemptions (Step 6) | ~85% |
| Result (Step 7) | 100% |

### Test Steps:
- [ ] Open wizard on Step 1
- [ ] Verify progress shows ~14% (not 100%)
- [ ] Advance through steps
- [ ] Verify progress increases appropriately
- [ ] Complete determination
- [ ] Verify shows 100% at result step

---

## SUMMARY

| What | Action |
|------|--------|
| Confirmation Number | ✅ No change needed |
| Order Number | ✅ No change needed |
| **Progress Calculation** | 🔧 Use `MAX_DETERMINATION_STEPS` constant |

**One file to change:** `web/components/rrer-questionnaire.tsx`

**Lines to modify:** ~736 (progress calculation), optionally ~1022-1039 (display)
