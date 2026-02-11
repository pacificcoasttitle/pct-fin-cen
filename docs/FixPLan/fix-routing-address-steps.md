# Fix: Requests Routing, Address Sync, and Step Restoration

Based on the microscopic investigation. 7 issues, all with confirmed root causes and line numbers.

---

## Fix 1: Filed Reports → Review Page (Not Wizard)

### File: `web/app/(app)/app/requests/page.tsx`

**Line ~249** — Action button for `filed` status. Find where it renders the action button for filed reports. Change the navigation from `/wizard` to `/review`:

```tsx
// BEFORE (around line 249)
// filed status sends to wizard
router.push(`/app/reports/${id}/wizard`)

// AFTER
router.push(`/app/reports/${id}/review`)
```

**Line ~528** — Row click fallback. Find the row click handler. Add `filed` to the status routing:

```tsx
// In the row click handler, add filed alongside ready_to_file
if (report.status === "ready_to_file" || report.status === "filed") {
  router.push(`/app/reports/${report.id}/review`);
} else if (report.status === "exempt") {
  router.push(`/app/reports/${report.id}/certificate`);
} else {
  router.push(`/app/reports/${report.id}/wizard`);
}
```

Also update the action button label for filed reports — instead of "View", use "View Filing":

```tsx
// For filed status action button label
"View Filing"
```

---

## Fix 2: Wizard Step Restoration — Resume Where User Left Off

### File: `web/components/wizard/hooks/useWizardNavigation.ts`

**Line 11** — `currentStepIndex` always starts at 0. Change it to compute the correct starting step.

```tsx
// BEFORE (line 11)
const [currentStepIndex, setCurrentStepIndex] = useState(0);

// AFTER — start at the last meaningful step
const [currentStepIndex, setCurrentStepIndex] = useState(() => {
  // If a specific step was requested (e.g., from URL), use it
  if (initialStep) {
    const idx = visibleSteps.indexOf(initialStep);
    if (idx !== -1) return idx;
  }
  
  // Otherwise, find the last step that has data (resume logic)
  // For determination phase: find the furthest step that has an answer
  // For collection phase: start at the first collection step
  return 0; // Will be overridden below
});
```

Actually, a cleaner approach: add an `initialStep` prop and compute on mount.

**Step A:** Add `initialStep` parameter to `useWizardNavigation`:

```tsx
export function useWizardNavigation(
  state: WizardState,
  reportStatus: string,
  initialStep?: StepId  // NEW parameter
) {
```

**Step B:** Compute starting index:

```tsx
const [currentStepIndex, setCurrentStepIndex] = useState(() => {
  if (!initialStep) return 0;
  // visibleSteps may not be ready yet on first render, so we return 0
  // and handle it in an effect
  return 0;
});

// Effect to set initial step once visibleSteps are computed
useEffect(() => {
  if (initialStep && visibleSteps.length > 0) {
    const idx = visibleSteps.indexOf(initialStep);
    if (idx !== -1) {
      setCurrentStepIndex(idx);
    }
  }
  // Only run once on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
```

Wait — `visibleSteps` is computed from `useMemo` which depends on `state.determination` and `reportStatus`. On first render those are already available from the loaded report. So `visibleSteps` should be correct on mount.

Better approach — compute it directly in the initial state:

```tsx
// Replace the useState(0) with a computed initial value
const getInitialStepIndex = (): number => {
  if (initialStep) {
    // visibleSteps is already computed by useMemo above, but we can't reference it here
    // So duplicate the logic or use a ref
    return 0; // Will fix with effect
  }
  return 0;
};
```

Simplest correct approach — use an effect that only runs once:

```tsx
const [currentStepIndex, setCurrentStepIndex] = useState(0);
const initialStepApplied = useRef(false);

useEffect(() => {
  if (!initialStepApplied.current && initialStep && visibleSteps.length > 0) {
    const idx = visibleSteps.indexOf(initialStep);
    if (idx !== -1) {
      setCurrentStepIndex(idx);
    }
    initialStepApplied.current = true;
  }
}, [initialStep, visibleSteps]);
```

Add `import { useRef } from "react"` if not already imported.

### File: `web/components/wizard/WizardContainer.tsx`

Pass `initialStep` to the hook. Read it from URL query params:

```tsx
import { useSearchParams } from "next/navigation";

// Inside WizardContainer component:
const searchParams = useSearchParams();
const initialStepParam = searchParams.get("step") as StepId | null;

// Pass to hook:
const {
  currentStep,
  // ...
} = useWizardNavigation(state, report.status, initialStepParam || undefined);
```

### File: `web/components/wizard/WizardContainer.tsx`

**Line ~57** — `wizard_step` is always saved as `0`. Fix it to save the actual step index:

```tsx
// BEFORE (line ~57)
await saveWizard(reportId, 0, wizardState);

// AFTER
await saveWizard(reportId, currentStepIndex, wizardState);
```

This means on reload, the backend has the last step. But since we're using `?step=` query params for deep linking and the hook's initialStep, the saved `wizard_step` is mainly for analytics/tracking. The real restoration comes from the `?step=` param.

### File: `web/app/(app)/app/requests/page.tsx`

Update the "collecting" action buttons to link to the correct step:

```tsx
// For collecting status with no parties — keep as-is, party-setup is correct
router.push(`/app/reports/${id}/wizard?step=party-setup`)

// For collecting status with parties — use party-status
router.push(`/app/reports/${id}/wizard?step=party-status`)
```

These will now work because the wizard reads `?step=` and jumps to it.

For **drafts**, the wizard starts at Step 0 which is correct — a draft hasn't gotten past transaction entry.

For **determination_complete** status, the action should resume at the first collection step:

```tsx
// For determination_complete
router.push(`/app/reports/${id}/wizard?step=party-setup`)
```

---

## Fix 3: Sync property_address_text from wizard_data

### File: `api/app/routes/reports.py`

**Lines 608-647** — The `update_wizard` endpoint. After updating `wizard_data`, sync key fields to the Report's top-level columns:

Find the section that does:
```python
report.wizard_step = wizard_update.wizard_step
report.wizard_data = existing_data
report.updated_at = datetime.utcnow()
```

Add after it:

```python
# Sync top-level fields from wizard_data for display/search
collection = existing_data.get("collection", {})
prop_addr = collection.get("propertyAddress", {})

if prop_addr.get("street"):
    parts = [prop_addr.get("street", "")]
    if prop_addr.get("unit"):
        parts.append(prop_addr["unit"])
    parts.append(f"{prop_addr.get('city', '')}, {prop_addr.get('state', '')} {prop_addr.get('zip', '')}")
    report.property_address_text = ", ".join(p for p in parts if p.strip())

if collection.get("closingDate"):
    try:
        from datetime import datetime as dt
        report.closing_date = dt.strptime(collection["closingDate"], "%Y-%m-%d").date()
    except (ValueError, TypeError):
        pass

if collection.get("escrowNumber"):
    report.escrow_number = collection["escrowNumber"]
```

This runs on every auto-save, so once the user enters an address in Step 0, the next save will sync it to `property_address_text` and it will show in the requests table.

**Also check:** Does the Report model have these columns?

```bash
grep -n "property_address_text\|closing_date\|escrow_number" api/app/models/report.py
```

If `escrow_number` doesn't exist as a column, skip that line. Only sync fields that have columns.

---

## Fix 4: Wizard Filed Redirect — Go to Review, Not Non-Existent Root

### File: `web/app/(app)/app/reports/[id]/wizard/page.tsx`

**Lines 59-61** — Filed report redirects to a route that doesn't exist.

```tsx
// BEFORE (line 59-61)
if (report.status === "filed") {
  router.push(`/app/reports/${reportId}`);  // 🚨 Doesn't exist!
  return null;
}

// AFTER
if (report.status === "filed") {
  router.push(`/app/reports/${reportId}/review`);
  return null;
}
```

Also add a redirect for exempt reports that somehow land on the wizard:

```tsx
if (report.status === "exempt") {
  router.push(`/app/reports/${reportId}/certificate`);
  return null;
}
```

---

## Fix 5: Include `awaiting_parties` in Fetch and Tab Mapping

### File: `web/app/(app)/app/requests/page.tsx`

Find where the API call fetches reports with specific statuses:

```tsx
// BEFORE
statuses: "draft,determination_complete,collecting,ready_to_file,filed,exempt"

// AFTER
statuses: "draft,determination_complete,collecting,awaiting_parties,ready_to_file,filed,exempt"
```

And in the tab filtering, include `awaiting_parties` in the Active tab:

```tsx
// In the Active tab filter
case "active":
  return report.status === "collecting" || report.status === "determination_complete" || report.status === "awaiting_parties";
```

---

## Fix 6: Address Display Fallback — Use wizard_data if property_address_text is null

### File: `web/app/(app)/app/requests/page.tsx`

**Line ~534** — Currently shows:
```tsx
{report.property_address_text || "Address pending"}
```

Replace with a smarter fallback that checks wizard_data:

```tsx
{report.property_address_text 
  || (() => {
    const addr = report.wizard_data?.collection?.propertyAddress;
    if (addr?.street) {
      return `${addr.street}, ${addr.city || ""} ${addr.state || ""} ${addr.zip || ""}`.trim();
    }
    return report.status === "draft" ? "New report" : "Address not entered";
  })()
}
```

Or if you prefer cleaner code, extract a helper:

```tsx
// Add near the top of the component
const getAddressDisplay = (report: Report): string => {
  if (report.property_address_text) return report.property_address_text;
  
  const addr = report.wizard_data?.collection?.propertyAddress;
  if (addr?.street) {
    return `${addr.street}, ${addr.city || ""} ${addr.state || ""} ${addr.zip || ""}`.trim();
  }
  
  return report.status === "draft" ? "New report" : "Address not entered";
};

// Then in the JSX:
{getAddressDisplay(report)}
```

This way addresses show immediately from wizard_data even before the backend sync runs, and the label is status-appropriate instead of always "Address pending."

---

## Summary — All Fixes

| # | Issue | Fix | File(s) |
|---|-------|-----|---------|
| 1 | Filed → wizard | Route to `/review` instead | `requests/page.tsx` |
| 2 | Step not restored | Read `?step=` param, initialStep in hook | `useWizardNavigation.ts`, `WizardContainer.tsx` |
| 3 | Address always null | Sync `propertyAddress` → `property_address_text` on auto-save | `reports.py` |
| 4 | Filed wizard redirect broken | Redirect to `/review` not `/` | `wizard/page.tsx` |
| 5 | `awaiting_parties` missing | Add to fetch + Active tab | `requests/page.tsx` |
| 6 | "Address pending" label | Fallback to wizard_data, then status-appropriate label | `requests/page.tsx` |

## Priority Order

1. Fix 3 (address sync) — most visible user-facing issue
2. Fix 1 (filed → review) — wrong navigation
3. Fix 4 (wizard redirect) — broken redirect
4. Fix 2 (step restoration) — UX improvement
5. Fix 6 (address display fallback) — immediate improvement while sync propagates
6. Fix 5 (awaiting_parties) — completeness

## DO NOT

- ❌ Change the auto-save debounce timing
- ❌ Change determination logic
- ❌ Change filing lifecycle or status transitions
- ❌ Add new database columns (only sync to existing ones)
- ❌ Change the review page (already fixed in previous commit)
- ❌ Change the certificate page
- ❌ Remove the `?step=` query params from action buttons — they'll now work
