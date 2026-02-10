# 🧹 Wizard Cleanup — Remove Debug UI & Polish

## Status: ✅ IMPLEMENTED (2026-02-10)

## Problem

The wizard had accumulated development cruft and inconsistencies:

1. **"Backend Actions" box** — Debug UI visible to users (Run Determination, Sync Party Data, etc.)
2. **Step indicators didn't match sections** — Teal dots inconsistent with actual wizard steps
3. **Back/Continue buttons showing where they don't apply** — Visible on Certify & Review when not relevant
4. **Console.log/console.error statements** — Debug logging left in production code
5. **Unused state variables and imports** — Orphaned code from removed features

---

## What Was Cleaned Up

### Task 1: Remove "Backend Actions" Box ✅

**File:** `web/app/(app)/app/reports/[id]/wizard/page.tsx`

The entire "Backend Actions" section was removed from the wizard page. This included:
- "Run Determination" button and handler
- "Generate Party Links" button and handler
- "Check Ready" button and handler
- "File Report" button and handler
- Copy-to-clipboard functionality for party links
- All related `useState` variables: `partyLinks`, `readyResult`, `fileResult`, `copied`
- Handler functions: `handleGenerateLinks`, `handleReadyCheck`, `handleFile`, `copyToClipboard`

These operations are now handled exclusively through the `RRERQuestionnaire` component's prop callbacks (`onSendPartyLinks`, `onReadyCheck`, `onFileReport`, `onDetermine`).

---

### Task 2: Remove Debug/Dev UI ✅

**Files:** `web/components/rrer-questionnaire.tsx`, `web/app/(app)/app/reports/[id]/wizard/page.tsx`

Removed:
- All `console.log` statements from the questionnaire component
- All `console.error` statements from handler functions (`handleFile`, `handleCertify`, `onDetermine`)
- No `process.env.NODE_ENV` debug panels were present

---

### Task 3: Fix Step Indicators ✅

**File:** `web/components/rrer-questionnaire.tsx`

The step indicators were updated to a **3-stage progress model**:

```tsx
const stages = [
  { id: "setup", label: "Setup", steps: ["transaction-property", "party-setup"] },
  { id: "collecting", label: "Collecting", steps: ["monitor-progress", "review-submissions"] },
  { id: "file", label: "Review & File", steps: ["reporting-person", "file-report"] },
]
```

Each stage renders as a numbered circle (1, 2, 3) with:
- **Complete stages:** Teal background with white checkmark
- **Current stage:** Teal background with ring highlight (`ring-4 ring-teal-100`)
- **Future stages:** Gray background with gray text

Connecting lines between stages change from gray to teal as stages complete.

This indicator appears in two locations:
1. **Header area** — Above the collection phase content
2. **Card footer** — Between Back/Continue navigation buttons (hidden on mobile via `hidden sm:flex`)

---

### Task 4: Conditional Back/Continue Buttons ✅

**File:** `web/components/rrer-questionnaire.tsx`

A `navConfig` object was implemented to control navigation per step:

| Step | Back | Continue |
|------|------|----------|
| `transaction-property` | ❌ Hidden | ✅ "Continue" |
| `party-setup` | ✅ "Back" | ❌ Hidden (links-sent confirmation handles this) |
| `monitor-progress` | ✅ "Back to Parties" | ❌ Hidden (inline "Continue to Review" handled separately) |
| `review-submissions` | ✅ "Back" | ✅ "Continue" |
| `reporting-person` | ✅ "Back" | ✅ "Continue to Review & File" |
| `file-report` | ❌ Hidden | ❌ Hidden (filing handled inline) |

Implementation:

```tsx
const navConfig: Record<string, { 
  showBack: boolean; backLabel?: string; onBack?: () => void;
  showContinue: boolean; continueLabel?: string; onContinue?: () => void;
}> = {
  "transaction-property": { showBack: false, showContinue: true, continueLabel: "Continue", onContinue: goToNextCollectionStep },
  "party-setup": { showBack: true, backLabel: "Back", onBack: goToPreviousCollectionStep, showContinue: false },
  "monitor-progress": { showBack: true, backLabel: "Back to Parties", onBack: () => setCollectionStep("party-setup"), showContinue: false },
  "review-submissions": { showBack: true, backLabel: "Back", onBack: () => setCollectionStep("monitor-progress"), showContinue: true, continueLabel: "Continue", onContinue: () => setCollectionStep("reporting-person") },
  "reporting-person": { showBack: true, backLabel: "Back", onBack: goToPreviousCollectionStep, showContinue: true, continueLabel: "Continue to Review & File", onContinue: goToNextCollectionStep },
  "file-report": { showBack: false, showContinue: false },
}
```

When both `showBack` and `showContinue` are false, the footer is not rendered at all.

---

### Task 5: Remove Orphaned/Unused Code ✅

**File:** `web/app/(app)/app/reports/[id]/wizard/page.tsx`

Removed unused state variables and their setters:
- `partyLinks` / `setPartyLinks` (no longer stored locally)
- `readyResult` / `setReadyResult` (result used inline)
- `fileResult` / `setFileResult` (result used inline)
- `copied` / `setCopied` (copy-to-clipboard removed)
- `lastPartyUpdate` / `setLastPartyUpdate` (not used)
- `partyStatusLoading` / `setPartyStatusLoading` (set but never read)

Removed unused type imports:
- `PartyLink` (no longer stored in state)
- `ReadyCheckResult` (used inline only)
- `FileResult` (used inline only)

Removed unused icon imports:
- Verified all remaining imports (`Loader2`, `AlertTriangle`, `ArrowLeft`, `Check`, `FileText`) are used

**File:** `web/components/rrer-questionnaire.tsx`

- Removed all `console.log` statements
- Removed all `console.error` statements from catch blocks
- `collectionSteps` array restructured (removed `monitor-progress` and `review-submissions` from linear flow)

---

### Task 6: Clean Up Status Display ✅

The "Backend Actions" box that showed raw determination results was completely removed. Determination results are now shown only:
- In the determination phase (Step "determination-result") with a clean card UI
- In the wizard header badge showing report status

---

## Files Modified

| File | Changes |
|------|---------|
| `web/app/(app)/app/reports/[id]/wizard/page.tsx` | Removed Backend Actions section, unused state/handlers/imports, added `useSearchParams` |
| `web/components/rrer-questionnaire.tsx` | Removed `console.log`/`console.error`, added `navConfig` for conditional buttons, 3-stage progress indicator, restructured `collectionSteps` |

---

## Verification Checklist

- [x] No "Backend Actions" box visible anywhere
- [x] No "Run Determination" or "Sync" buttons visible to users
- [x] No debug panels or dev tools visible
- [x] Step indicators match actual wizard stages (3-stage: Setup, Collecting, Review & File)
- [x] Back button only shows where it makes sense
- [x] Continue button has appropriate label per step
- [x] No buttons on file-report step footer (filing handled inline)
- [x] No console.log/console.error statements in wizard code
- [x] No unused state variables or imports remaining
- [x] Wizard flows smoothly without "what do I click?" moments
