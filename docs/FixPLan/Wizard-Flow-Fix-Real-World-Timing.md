# 🔄 Wizard Flow Fix — Match Real-World Timing

## Status: ✅ IMPLEMENTED (2026-02-10)

## Problem

The current wizard treats the filing process as a **single continuous session**, but in reality it's **two separate sessions with days in between**.

**Current (broken) flow:**
```
Start → Determination → Add Parties → Send Links → Monitor Progress (STUCK!)
                                                    ↓
                                        User stares at empty progress
                                        screen for days waiting...
```

**Real-world flow:**
```
SESSION 1 (Day 1):
  Start → Add Parties → Send Links → Return to Dashboard ✓

  [2-5 DAYS PASS — parties complete portal forms]

SESSION 2 (Days later):
  Dashboard "Ready to File" → Review & Certify → File ✓
```

---

## Solution — What Was Implemented

### Change 1: Exit After Sending Links ✅

After the escrow officer sends party links, they are shown a **Links Sent Confirmation** screen with "Return to Dashboard" as the primary action.

**File:** `web/components/wizard/LinksSentConfirmation.tsx`

A dedicated component was created with:
- Success header with green checkmark
- List of all parties emailed (separated by buyers/sellers)
- "What Happens Next" info card with numbered steps
- **Primary CTA:** "Return to Dashboard" → links to `/app/requests?status=active`
- **Secondary CTA:** "View Party Status" → triggers `onViewStatus` callback
- Reassurance text: "You can safely close this page."

---

### Change 2: "Links Sent" Confirmation Screen ✅

**File:** `web/components/rrer-questionnaire.tsx`

After successfully sending party links in the "party-setup" step, a `showLinksSentConfirmation` state flag triggers the `LinksSentConfirmation` component to render in place of the normal party-setup content. The component receives:
- `sellers` and `buyers` arrays from the collection state
- `propertyAddress` from the property address text
- `onViewStatus` callback to navigate to `monitor-progress`

---

### Change 3: Direct Entry to Review & Certify ✅

**File:** `web/app/(app)/app/requests/page.tsx`

The "Ready to File" action button now links directly to the file step:

```tsx
onClick={(e) => { 
  e.stopPropagation(); 
  router.push(`/app/reports/${id}/wizard?step=file-report`); 
}}
```

---

### Change 4: Wizard Detects State and Auto-Navigates ✅

**File:** `web/app/(app)/app/reports/[id]/wizard/page.tsx`

The wizard page reads the `?step=` URL parameter via `useSearchParams()` and implements a `getAutoDetectedStep()` function:

```tsx
const getAutoDetectedStep = () => {
  // 1. URL param takes highest priority
  if (urlStep) return { phase: "collection", collectionStep: urlStep }
  
  // 2. Auto-detect based on report status
  switch (report.status) {
    case "draft": return { phase: "determination" }
    case "determination_complete": return { phase: "collection", collectionStep: "party-setup" }
    case "collecting": return { phase: "collection", collectionStep: "party-setup" }
    case "ready_to_file": return { phase: "collection", collectionStep: "file-report" }
    case "filed": return { phase: "summary" }
    case "exempt": return { phase: "determination" }
  }
  
  // 3. Fall back to saved wizard data
  return {}
}
```

This is passed as `initialData` to `RRERQuestionnaire`.

---

### Change 5: Remove "Monitor Progress" as a Required Step ✅

**File:** `web/components/rrer-questionnaire.tsx`

The `collectionSteps` array was restructured to remove `monitor-progress` and `review-submissions` from the linear flow:

```tsx
const collectionSteps: CollectionStepId[] = [
  "transaction-property",  // PCT enters closing date, price, property details
  "party-setup",           // Add parties (name, email, type), send links
  "reporting-person",      // FinClear internal info (reporting person designation)
  "file-report",           // Review, certify, and file with FinCEN
]
```

`monitor-progress` and `review-submissions` remain accessible as optional views but are **not** part of the linear wizard progression.

---

### Change 6: Updated Progress Indicator to 3 Stages ✅

**File:** `web/components/rrer-questionnaire.tsx`

The progress indicator was replaced with a simplified 3-stage display:

```tsx
const stages = [
  { id: "setup", label: "Setup", steps: ["transaction-property", "party-setup"] },
  { id: "collecting", label: "Collecting", steps: ["monitor-progress", "review-submissions"] },
  { id: "file", label: "Review & File", steps: ["reporting-person", "file-report"] },
]
```

Visual rendering:
```
[✓ Setup] ——— [● Collecting] ——— [○ Review & File]
```

This appears both:
1. At the top of the collection phase (header area)
2. In the card footer navigation area (for smaller screens)

---

## Files Modified

| File | Change |
|------|--------|
| `web/components/wizard/LinksSentConfirmation.tsx` | **NEW** — Dedicated confirmation component |
| `web/components/rrer-questionnaire.tsx` | Restructured `collectionSteps`, added 3-stage progress, links-sent confirmation integration |
| `web/app/(app)/app/reports/[id]/wizard/page.tsx` | Added `useSearchParams`, `getAutoDetectedStep()` for status-based auto-navigation |
| `web/app/(app)/app/requests/page.tsx` | "Ready to File" button links to `?step=file-report` |
| `web/lib/rrer-types.ts` | `CollectionStepId` type includes `monitor-progress` and `review-submissions` as valid IDs (for optional access) |

---

## User Experience After Fix

**Session 1 (Escrow Officer starts request):**
1. Clicks "New Request"
2. Fills in transaction basics (Determination phase)
3. Adds buyer and seller (name + email)
4. Clicks "Send Links"
5. Sees: "Party Links Sent Successfully! ✓" with party list and "What Happens Next" card
6. Clicks "Return to Dashboard"
7. **Goes about their day**

**Session 2 (Days later):**
1. Gets notification "All parties have submitted"
2. Opens dashboard, sees "Ready to File" badge
3. Clicks the request
4. **Goes directly to Review & Certify screen** (via `?step=file-report`)
5. Reviews all party data
6. Checks certification boxes
7. Files with FinCEN
8. **Done**

---

## Testing Checklist

- [x] Sending links shows confirmation screen (`LinksSentConfirmation`)
- [x] "Return to Dashboard" goes to `/app/requests?status=active`
- [x] "View Party Status" navigates to `monitor-progress` view
- [x] When status is `ready_to_file`, clicking from dashboard goes to `file-report` step
- [x] Progress indicator shows 3 simple stages (Setup, Collecting, Review & File)
- [x] `monitor-progress` is NOT a forced step in linear flow
- [x] Auto-detection works for `draft`, `determination_complete`, `collecting`, `ready_to_file`, `filed`, `exempt`
