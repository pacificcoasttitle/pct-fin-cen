# Remove Old Client Request Flow — Client-Driven Only

## Goal

Remove the old "Submit Request → Staff Queue → Staff creates Report" flow entirely.
Replace with direct "Start New Report → Wizard" flow for clients.

**Old Flow (REMOVE):**
```
Client → /app/requests/new → SubmissionRequest → Staff Queue → Staff creates Report
```

**New Flow (KEEP):**
```
Client → /app/reports/new → Report created → Wizard immediately
```

---

## Phase 1: Update Navigation

**File:** `web/lib/navigation.ts` (or wherever nav is defined)

### Find and REMOVE these items for client roles:
```typescript
// REMOVE - Old flow
{
  name: "Submit New Request",  // or "New Request"
  href: "/app/requests/new",
  roles: ["client_admin", "client_user"],
},
```

### REPLACE with:
```typescript
// NEW - Client-driven flow
{
  name: "Start New Report",
  href: "/app/reports/new",
  icon: PlusCircle,  // import from lucide-react
  roles: ["client_admin", "client_user"],
},
{
  name: "My Reports",
  href: "/app/reports",
  icon: FileText,  // import from lucide-react
  roles: ["client_admin", "client_user"],
},
```

### Keep "My Requests" as read-only history (optional)
```typescript
// KEEP - For viewing old/legacy requests only
{
  name: "Request History",  // Renamed from "My Requests"
  href: "/app/requests",
  icon: Archive,
  roles: ["client_admin", "client_user"],
},
```

---

## Phase 2: Remove Old Request Form Page

**DELETE or redirect:** `web/app/(app)/app/requests/new/page.tsx`

Option A: Delete the file entirely
```bash
rm web/app/\(app\)/app/requests/new/page.tsx
```

Option B: Redirect to new flow (safer - handles bookmarks/links)
```typescript
// web/app/(app)/app/requests/new/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LegacyRequestRedirect() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect old URLs to new flow
    router.replace("/app/reports/new");
  }, [router]);

  return (
    <div className="flex items-center justify-center h-64">
      <p>Redirecting to new report form...</p>
    </div>
  );
}
```

---

## Phase 3: Update Staff Queue (Optional)

The staff queue (`/app/staff/queue`) may still show old SubmissionRequests.

**Option A:** Keep it for legacy requests that haven't been processed
**Option B:** Transform it into a "Review Queue" for all reports

If keeping for legacy, update the heading:
```typescript
// web/app/(app)/app/staff/queue/page.tsx

// Change title from "Work Queue" to something clearer
<h1>Legacy Requests</h1>
<p className="text-gray-500">
  Requests submitted before the new client-driven flow. 
  New reports are created directly by clients.
</p>
```

---

## Phase 4: Remove/Deprecate Backend Endpoints (Optional)

These endpoints supported the old flow. You can deprecate them later:

| Endpoint | Old Purpose | Action |
|----------|-------------|--------|
| `POST /submission-requests` | Client submits request | Deprecate (return 410 Gone) |
| `POST /submission-requests/{id}/create-report` | Staff creates report from request | Keep for legacy processing |
| `GET /submission-requests` | List requests | Keep for history |

**Deprecation response (optional):**
```python
# api/app/routes/submission_requests.py

@router.post("/submission-requests")
async def create_submission_request(...):
    # Return deprecation notice
    raise HTTPException(
        status_code=410,
        detail="This endpoint is deprecated. Use POST /reports to create reports directly."
    )
```

---

## Phase 5: Update Dashboard

The client dashboard may show "pending requests" stats. Update to show reports instead.

**File:** `web/app/(app)/app/dashboard/page.tsx`

```typescript
// REMOVE references to:
// - "Pending Requests"
// - "Requests Submitted"
// - submission_requests API calls

// REPLACE with:
// - "Active Reports"
// - "Reports in Progress"
// - reports API calls filtered by company
```

---

## Phase 6: Clean Up Imports and Dead Code

After removing the old flow, clean up:

```bash
# Find unused imports related to submission requests
grep -rn "SubmissionRequest\|submission-request\|requests/new" web/ --include="*.tsx" --include="*.ts"

# Remove any unused components
# - SubmissionRequestForm
# - NewRequestPage
# - etc.
```

---

## Final Navigation Structure for Clients

```typescript
// Client users (client_admin, client_user) see:
[
  { name: "Dashboard", href: "/app/dashboard" },
  { name: "Start New Report", href: "/app/reports/new" },  // NEW - Primary action
  { name: "My Reports", href: "/app/reports" },            // NEW - Their reports
  { name: "Request History", href: "/app/requests" },      // Legacy - Read only
  { name: "Billing", href: "/app/billing" },               // If client_admin
  { name: "Settings", href: "/app/settings" },
]
```

---

## Verification Checklist

After changes:

- [ ] Log in as `client_user`
- [ ] Sidebar shows "Start New Report" (not "Submit New Request")
- [ ] Sidebar shows "My Reports"
- [ ] Click "Start New Report" → goes to `/app/reports/new`
- [ ] Fill form → creates Report → redirects to wizard
- [ ] `/app/requests/new` redirects to `/app/reports/new` (if kept as redirect)
- [ ] Old requests still visible in "Request History" (read-only)

---

## Summary of Changes

| File | Action |
|------|--------|
| `web/lib/navigation.ts` | Replace request links with report links |
| `web/app/(app)/app/requests/new/page.tsx` | Delete or redirect |
| `web/app/(app)/app/dashboard/page.tsx` | Update stats to show reports |
| `web/app/(app)/app/staff/queue/page.tsx` | Rename/clarify as legacy (optional) |
| `api/app/routes/submission_requests.py` | Deprecate POST endpoint (optional) |

---

## One-Liner Summary

**Remove "Submit New Request" from nav, add "Start New Report" pointing to `/app/reports/new`. Delete or redirect the old form page. Done.**
