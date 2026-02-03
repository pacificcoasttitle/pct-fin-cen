# CURSOR PROMPT: Filing Status Display — Full System Remediation

## Context

We completed an investigation of how filing status and receipt IDs are displayed across all user roles in FinClear. The findings revealed significant gaps in visibility, consistency, and accuracy. This prompt addresses **every issue found** plus forward-thinking improvements before the March 1, 2026 launch.

**Rule: Do NOT modify SDTM transport, RERX builder, filing lifecycle, or polling logic. This is UI/display work only.**

---

## TASK 1: Create Shared Status Badge Component

### Problem
Status badges are duplicated 16+ times across the codebase. Each page has its own `statusConfig` / `STATUS_MAP` with different labels, colors, and vocabulary. This causes drift and inconsistency.

### Solution
Create ONE shared component used everywhere.

**Create:** `web/components/ui/StatusBadge.tsx`

```tsx
// StatusBadge.tsx — Single source of truth for all status display in FinClear
//
// USAGE:
//   <StatusBadge type="report" status="filed" />
//   <StatusBadge type="filing" status="accepted" />
//   <StatusBadge type="request" status="completed" />
//   <StatusBadge type="invoice" status="paid" />
//   <StatusBadge type="party" status="submitted" />
```

**Status types and their vocabularies:**

### Report Status (internal workflow)
| Status | Label | Color | Description |
|--------|-------|-------|-------------|
| `draft` | Draft | Slate/Gray | Just created |
| `determination_complete` | Determined | Blue | Determination phase done |
| `awaiting_parties` | Awaiting Parties | Amber | Party portal links sent |
| `collecting` | Collecting | Amber | Collection in progress |
| `ready_to_file` | Ready to File | Green light | All data collected |
| `filed` | Filed | Emerald | Successfully filed with FinCEN |
| `exempt` | Exempt | Purple | Determined exempt |
| `cancelled` | Cancelled | Red | Cancelled |

### Filing Status (SDTM submission lifecycle)
| Status | Label | Color | Description |
|--------|-------|-------|-------------|
| `not_started` | Not Started | Slate | No filing attempted |
| `queued` | Queued | Blue | In queue for submission |
| `submitted` | Submitted | Amber | Uploaded to FinCEN, awaiting response |
| `accepted` | Accepted | Emerald | FinCEN accepted, BSA ID received |
| `rejected` | Rejected | Red | FinCEN rejected |
| `needs_review` | Needs Review | Orange | Warnings or timeout, staff must review |

### Request Status (client-facing)
| Status | Label | Color | Description |
|--------|-------|-------|-------------|
| `pending` | Pending Review | Amber | Awaiting staff review |
| `exempt` | Exempt | Purple | No filing required |
| `reportable` | Reportable | Blue | Requires filing |
| `in_progress` | In Progress | Amber | Filing in progress |
| `completed` | Completed | Emerald | Filing complete |
| `cancelled` | Cancelled | Red | Cancelled |

### Invoice Status
| Status | Label | Color |
|--------|-------|-------|
| `draft` | Draft | Slate |
| `pending` | Pending | Amber |
| `paid` | Paid | Emerald |
| `overdue` | Overdue | Red |

### Party Status
| Status | Label | Color |
|--------|-------|-------|
| `invited` | Invited | Blue |
| `in_progress` | In Progress | Amber |
| `submitted` | Submitted | Emerald |
| `needs_correction` | Needs Correction | Orange |

### Component Requirements
- Accept props: `type` (report|filing|request|invoice|party), `status` (string), optional `size` (sm|md)
- Render consistent pill/badge with correct color and label
- Export the status config maps so other components can access labels/colors if needed
- Handle unknown statuses gracefully (show raw status in gray badge)

### Replacement Plan
After creating the component, replace inline status definitions in ALL of these files:

| File | Current Implementation |
|------|----------------------|
| `web/app/(app)/app/admin/reports/page.tsx` | `STATUS_MAP` + `FILING_STATUS_MAP` |
| `web/app/(app)/app/admin/filings/page.tsx` | Inline status colors |
| `web/app/(app)/app/admin/reports/[id]/page.tsx` | Inline status rendering |
| `web/app/(app)/app/staff/queue/page.tsx` | `statusConfig` object |
| `web/app/(app)/app/staff/reports/page.tsx` | Status config if present |
| `web/app/(app)/app/requests/page.tsx` | `statusConfig` object |
| `web/app/(app)/app/requests/[id]/page.tsx` | Inline status card |
| `web/app/(app)/app/billing/page.tsx` | Invoice status definitions |
| `web/app/(app)/app/admin/billing/page.tsx` | Invoice/billing status definitions |
| `web/app/(app)/app/admin/invoices/page.tsx` | Invoice status definitions |
| `web/app/(app)/app/admin/companies/page.tsx` | Status definitions |
| `web/app/(app)/app/invoices/page.tsx` | Status definitions |
| `web/app/(app)/app/settings/team/page.tsx` | User status definitions |
| `web/app/(app)/app/admin/users/page.tsx` | User status definitions |
| `web/app/(app)/app/admin/overview/page.tsx` | Status definitions |

**Keep** `web/components/party/PartyStatusBadge.tsx` — it can either be refactored to use the shared component or remain as-is since it's already shared.

---

## TASK 2: Fix COO Executive Dashboard

### File: `web/app/(app)/app/executive/page.tsx`

### Problem 1: Revenue hardcoded at $75
The dashboard shows "Revenue Per Filing: $75.00" which ignores the per-company billing rates implemented in Shark #48.

**Fix:** The `/reports/executive-stats` endpoint must return `actual_revenue` calculated from real BillingEvent records, not `filed_count * 7500`.

**Backend change needed:** `api/app/routes/reports.py` (or wherever `executive-stats` is served)
- Calculate MTD revenue from `sum(BillingEvent.amount_cents)` for the current month
- Calculate average revenue per filing from actual billing events
- Return `avg_revenue_per_filing` alongside `mtd_revenue_cents`

**Frontend change:** Replace hardcoded `$75.00` with the value from the API.

### Problem 2: No filing failure/rejection visibility
If filings are getting rejected by FinCEN, the COO has no idea.

**Fix:** Add to the executive stats endpoint and dashboard:
- `rejected_filings_count` — filings rejected by FinCEN
- `needs_review_count` — filings flagged for review
- `pending_filings_count` — filings submitted but not yet accepted

**Frontend:** Add an "Attention Required" section or alert banner:
```
⚠️ 2 filings need review  |  1 filing rejected this month
```

Only show this section if counts > 0. Link to `/app/admin/filings?status=needs_review`.

### Problem 3: No individual filing drill-down
COO sees "12 filed this month" but can't click through to see which ones.

**Fix:** Make the "Filed This Month" stat clickable, linking to `/app/admin/reports?filing_status=accepted&period=month`.

### Problem 4: No receipt ID visibility
COO should be able to see recent filings with BSA IDs at a glance.

**Fix:** Add a "Recent Filings" mini-table below the stats cards showing the last 5 accepted filings:

| Report | Company | Filed | Receipt ID |
|--------|---------|-------|------------|
| #1234 | ABC Title | 2h ago | BSA-31000123456789 |

Limit to 5 rows with a "View All" link to `/app/admin/filings`.

---

## TASK 3: Fix Wizard "Demo" Badge

### File: `web/app/(app)/app/reports/[id]/wizard/page.tsx`

### Problem
After filing, the wizard success card always shows a "Demo" badge even when the filing was submitted via live SDTM to FinCEN.

### Fix
The filing response should include a field indicating whether this was a demo/mock filing or a live SDTM filing. 

**Check the `/reports/{id}/file` response:**
- It already returns `is_demo` (boolean) in the `FileResponse`
- The wizard should use this to conditionally render the badge:

```tsx
// BEFORE (always shows Demo)
<span className="...">Demo</span>

// AFTER
{fileResult?.is_demo ? (
  <span className="bg-amber-100 text-amber-700 ...">Demo</span>
) : (
  <span className="bg-emerald-100 text-emerald-700 ...">Live Filing</span>
)}
```

**Also update the messaging:**
- Demo: "This is a simulated filing for testing purposes."
- Live: "Your report has been submitted to FinCEN via SDTM. You will receive a BSA ID once FinCEN processes the filing."

**For live filings in "submitted" state (not yet accepted):**
Show a different card:
```
✅ Report Submitted to FinCEN
Status: Awaiting FinCEN Response
Submitted: Feb 3, 2026 at 2:30 PM

FinCEN typically responds within 5 hours. Your BSA receipt ID will appear 
here once the filing is accepted. Check back or view status in the reports page.
```

**For live filings that are immediately accepted (if ACKED comes back fast):**
```
✅ FinCEN Filing Accepted
Receipt ID: 31000123456789
Filed: Feb 3, 2026 at 2:30 PM
```

---

## TASK 4: Fix Staff Queue Filing Visibility

### File: `web/app/(app)/app/staff/queue/page.tsx`

### Problem
Staff queue shows report status but not filing status. No receipt ID visible. Staff can't see if a filing was rejected without going to admin.

### Fix

**Add filing status column to the queue table:**
- Show filing status badge (from shared StatusBadge component) next to report status
- Only show for reports in `filed`, `ready_to_file` status

**Add receipt ID to filed reports:**
- Show receipt ID in monospace under the filing status when available
- Show "Awaiting Response" in amber when status is `submitted`
- Show "Rejected" in red when status is `rejected` with a tooltip showing the reason

**Add attention indicators:**
- If any reports in the queue have `filing_status = rejected` or `needs_review`, show a count badge on the queue tab or a banner at the top:
```
⚠️ 1 filing needs attention — click to view
```

**This requires the staff queue API to include filing status data.** Check if `/staff/queue` or `/reports` endpoint already returns `filing_status` and `receipt_id`. If not, add these fields to the response.

---

## TASK 5: Fix Client Receipt ID Display

### File: `web/app/(app)/app/requests/page.tsx`

### Problem 1: Receipt ID in interface but not rendered
The TypeScript interface includes `receipt_id` but the JSX table doesn't display it.

**Fix:** Add a receipt ID column (or inline display) to the requests table for completed requests:
```tsx
{request.status === "completed" && request.receipt_id && (
  <span className="text-xs font-mono text-emerald-600">
    {request.receipt_id}
  </span>
)}
```

Show it under the status badge or as a separate subtle column. Clients should be able to see their BSA receipt ID at a glance without clicking into the detail page.

### Problem 2: Inconsistent field naming
Client-side uses `filing_receipt_id` in the request detail page but `receipt_id` elsewhere.

**Fix:** Standardize on one name. Check the API response for `/requests` and `/requests/{id}`:
- If the API returns `filing_receipt_id`, use that consistently on the client side
- If the API returns `receipt_id`, use that consistently
- Update both the list page and detail page to use the same field name
- Update the TypeScript interface to match

### File: `web/app/(app)/app/requests/[id]/page.tsx`

### Problem 3: Receipt ID only shows when status is "completed"
If a filing is accepted but the request status hasn't transitioned to "completed" yet (timing gap), the receipt ID won't show.

**Fix:** Show receipt ID whenever it's present, regardless of request status:
```tsx
{request.filing_receipt_id && (
  <Card className="mb-6 border-green-200 bg-green-50">
    ...
  </Card>
)}
```

---

## TASK 6: Client Dashboard Filing Summary

### File: `web/app/(app)/app/dashboard/page.tsx`

### Problem
Client dashboard shows recent requests but no filing-specific information. Clients have no at-a-glance view of their filing status.

### Fix
Add a "Filing Summary" card to the client dashboard:

```
📋 Filing Summary
  Filed: 3          Exempt: 2
  In Progress: 1    Pending: 0
  
  Most Recent Filing:
  123 Main St, Huntington Beach — Filed Feb 3, 2026
  Receipt ID: 31000123456789
```

**This requires a client-facing stats endpoint.** Check if one exists. If not, add to the billing or requests API:
- `GET /billing/my/filing-stats` or `GET /requests/my/stats`
- Returns: `{ filed: N, exempt: N, in_progress: N, pending: N, most_recent_filing: { address, date, receipt_id } }`

---

## TASK 7: Forward-Thinking Additions

These aren't bugs but will be needed very soon after launch.

### 7A: Receipt ID Search
Add a search/filter capability for receipt IDs:
- **Admin reports page:** Add a search box that filters by receipt ID (exact or partial match)
- **Admin filings page:** Same
- **Client requests page:** Same (client can only search their own)

This is critical for when clients call asking about a specific filing. Staff needs to look it up instantly.

### 7B: Filing Timeline on Report Detail
**Admin report detail page** (`/app/admin/reports/[id]`):
Add a visual timeline showing:
```
Created → Determination Complete → Collecting → Ready to File → Submitted → Accepted
  Jan 15      Jan 16                  Jan 20        Jan 25         Jan 25      Jan 25
```

Use the existing `updated_at` timestamps from Report + FilingSubmission status transitions. If the timestamps aren't stored per-transition, use `created_at` and `filed_at` as bookends.

### 7C: Filing Status Notifications Display
When filing status changes (submitted → accepted, submitted → rejected), users should see this reflected without refreshing. While real-time websockets are post-launch, at minimum:
- Client request detail page should auto-refresh filing status every 60 seconds if status is "in_progress" or "submitted"
- Staff wizard should poll for updated status after filing

Add a simple polling hook:
```tsx
// usePollFilingStatus.ts
// Polls /reports/{id}/filing-status every 60s while status is pending
// Stops polling when accepted/rejected
```

### 7D: Copyable Receipt ID
Everywhere a receipt ID is displayed, make it clickable to copy:
```tsx
<button onClick={() => navigator.clipboard.writeText(receiptId)} title="Copy Receipt ID">
  <span className="font-mono">{receiptId}</span>
  <CopyIcon className="h-3 w-3 ml-1" />
</button>
```

Create a shared `<ReceiptId value={id} />` component that handles:
- Monospace font display
- Click-to-copy
- Truncation with tooltip for long IDs
- Consistent styling everywhere

---

## TASK 8: Document in KilledSharks-2.md

**Append** the following section to `docs/KilledSharks-2.md` (do NOT remove or rewrite existing content):

```markdown
### 51. Filing Status Display — Full System Remediation ✅

**Date:** February 3, 2026

**Problem:** Investigation revealed significant gaps in how filing status and receipt IDs are displayed across all user roles:

- COO dashboard: No individual filing visibility, revenue hardcoded at $75, no rejection alerts
- Staff queue: No filing status column, no receipt ID, no rejection visibility
- Wizard: Always showed "Demo" badge even for live SDTM filings
- Client requests: Receipt ID in interface but not rendered in table, inconsistent field naming
- Client dashboard: No filing summary at all
- Status badges duplicated 16+ times with inconsistent vocabulary
- No shared status component
- No receipt ID search capability

**Solution:** Comprehensive remediation across all user-facing pages.

#### Shared Components Created

| Component | Purpose |
|-----------|---------|
| `StatusBadge.tsx` | Universal status badge with type-specific vocabularies |
| `ReceiptId.tsx` | Copyable receipt ID display with consistent styling |
| `usePollFilingStatus.ts` | Auto-refresh hook for pending filing status |

#### Status Vocabulary Standardization

| Type | Statuses |
|------|----------|
| Report | draft, determination_complete, awaiting_parties, collecting, ready_to_file, filed, exempt, cancelled |
| Filing | not_started, queued, submitted, accepted, rejected, needs_review |
| Request (client) | pending, exempt, reportable, in_progress, completed, cancelled |

#### Changes by Role

**COO (/app/executive):**
- Revenue now calculated from actual BillingEvent records, not hardcoded $75
- Added rejection/needs_review alert banner
- Added "Recent Filings" mini-table with receipt IDs
- Stats are clickable, linking to filtered admin views

**PCT Admin:**
- Replaced inline status maps with shared StatusBadge component
- Receipt ID search/filter added to reports and filings pages
- No functional changes (admin was already in good shape)

**PCT Staff:**
- Queue now shows filing status column alongside report status
- Receipt ID visible for filed reports
- Rejection/needs_review indicators in queue
- Wizard shows "Live Filing" vs "Demo" based on actual transport mode
- Wizard shows contextual messaging for submitted-but-pending state

**Client Admin/User:**
- Receipt ID now rendered in requests table for completed requests
- Field naming standardized (filing_receipt_id → consistent everywhere)
- Receipt ID shows whenever present regardless of request status
- Dashboard now includes filing summary card with recent filing info

**Party Portal:**
- No changes (correctly shows only party submission confirmation)

#### Files Created

| File | Purpose |
|------|---------|
| `web/components/ui/StatusBadge.tsx` | Shared status badge component |
| `web/components/ui/ReceiptId.tsx` | Copyable receipt ID component |
| `web/hooks/usePollFilingStatus.ts` | Filing status polling hook |

#### Files Modified

| File | Change |
|------|--------|
| `web/app/(app)/app/executive/page.tsx` | Real revenue, alert banner, recent filings table |
| `web/app/(app)/app/staff/queue/page.tsx` | Filing status column, receipt ID, attention indicators |
| `web/app/(app)/app/reports/[id]/wizard/page.tsx` | Demo vs Live badge, contextual post-filing messaging |
| `web/app/(app)/app/requests/page.tsx` | Receipt ID rendered in table, standardized field name |
| `web/app/(app)/app/requests/[id]/page.tsx` | Receipt ID shows when present (not status-gated) |
| `web/app/(app)/app/dashboard/page.tsx` | Filing summary card added |
| `web/app/(app)/app/admin/reports/page.tsx` | Uses shared StatusBadge, receipt ID search |
| `web/app/(app)/app/admin/filings/page.tsx` | Uses shared StatusBadge, receipt ID search |
| `web/app/(app)/app/admin/reports/[id]/page.tsx` | Uses shared StatusBadge |
| `web/app/(app)/app/admin/billing/page.tsx` | Uses shared StatusBadge |
| `web/app/(app)/app/billing/page.tsx` | Uses shared StatusBadge |
| `web/app/(app)/app/admin/invoices/page.tsx` | Uses shared StatusBadge |
| `web/app/(app)/app/admin/companies/page.tsx` | Uses shared StatusBadge |
| `web/app/(app)/app/invoices/page.tsx` | Uses shared StatusBadge |
| `web/app/(app)/app/settings/team/page.tsx` | Uses shared StatusBadge |
| `web/app/(app)/app/admin/users/page.tsx` | Uses shared StatusBadge |
| `web/app/(app)/app/admin/overview/page.tsx` | Uses shared StatusBadge |
| `api/app/routes/reports.py` | Executive stats: real revenue, rejection counts |

**Status:** ✅ Killed (VISIBILITY SHARK 🦈)
```

**Also update the Summary table at the top of KilledSharks-2.md:**

```markdown
| Category | Count |
|----------|-------|
| 🔴 Critical Features | 4 |
| 🟠 Major Features | 1 |
| 🎨 UX/Design | 2 |
| 🔧 Configuration | 2 |
| 📄 Documentation | 3 |

**Total Sharks Killed (Vol 2): 10 🦈 + 1 Hardening Addendum**
```

---

## EXECUTION ORDER

1. **Task 1 first** — Create shared StatusBadge and ReceiptId components
2. **Task 5** — Fix client receipt ID (quick win, high impact)
3. **Task 3** — Fix wizard Demo badge (quick win, staff-facing)
4. **Task 4** — Fix staff queue (medium effort)
5. **Task 2** — Fix COO dashboard (requires backend + frontend)
6. **Task 6** — Client dashboard filing summary (requires new endpoint)
7. **Task 7** — Forward-thinking additions (receipt search, timeline, polling, copyable IDs)
8. **Task 8** — Document in KilledSharks-2.md (always last)

---

## VERIFICATION CHECKLIST

After all tasks complete, verify:

- [ ] `StatusBadge` component exists and is used in 15+ files
- [ ] No more inline `statusConfig` / `STATUS_MAP` objects in page components
- [ ] COO dashboard shows real revenue from BillingEvent, not $75
- [ ] COO dashboard shows rejection/needs_review alert when applicable
- [ ] COO dashboard has "Recent Filings" table with receipt IDs
- [ ] Staff queue shows filing status column
- [ ] Staff queue shows receipt ID for filed reports
- [ ] Wizard shows "Live Filing" for SDTM submissions, "Demo" for mock only
- [ ] Wizard shows "Awaiting FinCEN Response" for submitted-but-pending state
- [ ] Client requests table renders receipt ID for completed requests
- [ ] Client request detail shows receipt ID whenever present
- [ ] Field naming consistent: same field name for receipt ID everywhere
- [ ] Client dashboard has filing summary card
- [ ] Receipt IDs are copyable everywhere they appear
- [ ] Receipt ID search works on admin reports and filings pages
- [ ] KilledSharks-2.md updated with Shark #51
- [ ] Summary counts updated at top of KilledSharks-2.md
- [ ] TypeScript compiles without errors
- [ ] No linter errors in modified files

---

## DO NOT
- ❌ Do not modify SDTM client, RERX builder, or filing lifecycle code
- ❌ Do not change filing status transition logic
- ❌ Do not modify database models or create migrations (display-layer only)
- ❌ Do not remove or rewrite existing KilledSharks entries — append only
- ❌ Do not change the Party Portal display (it's correct as-is)
