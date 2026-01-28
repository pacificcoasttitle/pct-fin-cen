# Sidebar Badge Investigation Findings

> Investigation Date: January 28, 2026
> Status: ✅ Complete

---

## Sidebar Badge Findings

### Component Structure
- **Sidebar file:** `web/components/app-sidebar.tsx`
- **Nav items defined in:** `web/lib/navigation.ts`
- **Badge component:** Uses shadcn `Badge` component, rendered inline when `item.badge` exists
- **Badge rendering location:** Lines 180-192 in `app-sidebar.tsx`

```tsx
{item.badge && (
  <Badge
    variant="secondary"
    className={cn(
      "h-5 px-1.5 text-xs",
      isActive
        ? "bg-blue-500/30 text-blue-300"
        : "bg-slate-700 text-slate-300"
    )}
  >
    {item.badge}
  </Badge>
)}
```

### Current Badge Implementation

#### My Queue Badge (pct_staff)
- **Nav Item:** "My Queue" (`/app/staff/queue`)
- **Shows:** Static `3` (hardcoded)
- **Source:** Defined inline in `pctStaffNavigation` array in `navigation.ts`
- **Trigger:** Always shows "3" regardless of actual data
- **Code Location:** `web/lib/navigation.ts` line 169

```typescript
{
  label: "My Queue",
  href: "/app/staff/queue",
  icon: Inbox,
  badge: 3,  // ❌ HARDCODED
}
```

#### Requests Badge (coo, pct_admin)
- **Nav Item:** "Requests" (`/app/admin/requests`)
- **Shows:** Static `8` (hardcoded)
- **Source:** Defined in `cooNavigation` and `pctAdminNavigation` arrays
- **Code Locations:** 
  - `navigation.ts` line 52 (COO)
  - `navigation.ts` line 118 (pct_admin)

#### All Requests Badge (pct_staff)
- **Exists:** ❌ NO - This is the bug!
- **Nav Item:** "All Requests" (`/app/admin/requests`)
- **Current State:** No badge property defined
- **Expected:** Should show count of pending submission requests
- **Code Location:** `navigation.ts` line 173-175

```typescript
{
  label: "All Requests",
  href: "/app/admin/requests",
  icon: ClipboardList,
  // ❌ NO BADGE PROPERTY!
}
```

#### Client Requests Badges (client_admin, client_user)
- **Exists:** ❌ NO
- **Nav Item:** "Requests" / "All Requests" (`/app/requests`)
- **Expected:** Should show their company's pending requests

---

### API Endpoints for Counts

| Endpoint | Returns | Used By | Scope |
|----------|---------|---------|-------|
| `GET /submission-requests/stats` | `{ total, pending, in_progress, completed, this_month }` | Client Dashboard | Demo Company ONLY |
| `GET /reports/executive-stats` | `{ total_reports, filed_reports, exempt_reports, ... }` | Executive Dashboard | All Companies |
| `GET /reports/queue/with-parties` | Reports with party status | Staff Queue Page | All (with status filter) |

**Missing Endpoints:**
- ❌ `GET /submission-requests/admin/stats` - Global pending count for admin/staff
- ❌ `GET /reports/queue/stats` - Count of reports in collecting status
- ❌ `GET /sidebar/counts` - Unified counts endpoint for all roles

---

### Badge Refresh Logic

- **Method:** ❌ NONE - Badges are static
- **Interval:** N/A
- **State management:** None - values hardcoded in `navigation.ts`

**Current Flow:**
```
App loads → getNavigationForRole(role) → Returns static NavSection[] → Badge values are hardcoded
```

**Expected Flow:**
```
App loads → Fetch badge counts from API → Store in context/state → 
Poll every 30-60 seconds → Update badges dynamically
```

---

### Identified Gaps

| # | Gap | Severity | Impact |
|---|-----|----------|--------|
| 1 | **Badges are 100% static** - No API calls | 🔴 Critical | Users see fake numbers |
| 2 | **"All Requests" has no badge** for pct_staff | 🔴 Critical | Staff don't know when new requests arrive |
| 3 | **No global pending count endpoint** | 🟠 Major | Can't show admin-level pending count |
| 4 | **No sidebar-specific counts API** | 🟠 Major | Each page fetches its own stats |
| 5 | **No polling/refresh for badges** | 🟠 Major | Counts never update without page refresh |
| 6 | **Client role badges missing** | 🟡 Minor | Clients don't see their pending count |
| 7 | **No state management for badges** | 🟠 Major | No React context or store |

---

### Badge Requirements by Role

| Role | Nav Item | Expected Badge Logic |
|------|----------|---------------------|
| COO | Requests | ALL pending submission requests (across all companies) |
| pct_admin | Requests | ALL pending submission requests (across all companies) |
| pct_staff | All Requests | ALL pending submission requests |
| pct_staff | My Queue | Reports in `collecting` status assigned to them (or all) |
| client_admin | Requests | Company's pending + in_progress requests |
| client_user | Requests | Company's pending + in_progress requests |

---

### Recommended Fix

**Phase 1: Create Sidebar Counts API**

```python
# api/app/routes/sidebar.py
@router.get("/counts")
def get_sidebar_counts(
    role: str = Query(...),
    company_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Returns badge counts based on user role.
    """
    if role in ["coo", "pct_admin", "pct_staff"]:
        # Global pending requests
        pending_requests = db.query(SubmissionRequest).filter(
            SubmissionRequest.status == "pending"
        ).count()
        
        # Reports in collecting status
        queue_count = db.query(Report).filter(
            Report.status == "collecting"
        ).count()
        
        return {
            "requests": pending_requests,
            "queue": queue_count,
        }
    else:
        # Client counts - scoped to their company
        pending = db.query(SubmissionRequest).filter(
            SubmissionRequest.company_id == company_id,
            SubmissionRequest.status.in_(["pending", "in_progress"])
        ).count()
        
        return {
            "requests": pending,
        }
```

**Phase 2: Create SidebarBadgeProvider Context**

```tsx
// web/context/sidebar-badge-context.tsx
interface BadgeCounts {
  requests: number;
  queue: number;
}

export const SidebarBadgeContext = createContext<BadgeCounts>({
  requests: 0,
  queue: 0,
});

export function SidebarBadgeProvider({ children, role, companyId }) {
  const [counts, setCounts] = useState({ requests: 0, queue: 0 });

  useEffect(() => {
    const fetchCounts = async () => {
      const res = await fetch(`/api/sidebar/counts?role=${role}&company_id=${companyId}`);
      const data = await res.json();
      setCounts(data);
    };

    fetchCounts();
    const interval = setInterval(fetchCounts, 60000); // Poll every 60s
    return () => clearInterval(interval);
  }, [role, companyId]);

  return (
    <SidebarBadgeContext.Provider value={counts}>
      {children}
    </SidebarBadgeContext.Provider>
  );
}
```

**Phase 3: Update Navigation to Accept Dynamic Badges**

```typescript
// web/lib/navigation.ts
export function getNavigationForRole(role: UserRole, badgeCounts?: BadgeCounts): NavSection[] {
  // Use badgeCounts.requests instead of hardcoded "8"
  // Use badgeCounts.queue instead of hardcoded "3"
}
```

**Phase 4: Update AppSidebar to Use Context**

```tsx
// web/components/app-sidebar.tsx
const { requests, queue } = useSidebarBadges();
const navigation = getNavigationForRole(role, { requests, queue });
```

---

### Expected Behavior After Fix

```
                   NEW Request Submitted
                          ↓
        Badge on "All Requests" lights up (🔴 +1)
                          ↓
           Staff sees notification, clicks in
                          ↓
        Clicks "Start Wizard" → Creates Report
                          ↓
          "All Requests" badge decrements
                          ↓
         "My Queue" badge increments (collecting)
                          ↓
          Staff monitors parties, files report
                          ↓
            "My Queue" badge decrements
```

---

### Files That Need Changes

| File | Change |
|------|--------|
| `api/app/routes/sidebar.py` | NEW - Create counts endpoint |
| `api/app/main.py` | Register sidebar router |
| `web/context/sidebar-badge-context.tsx` | NEW - Context provider |
| `web/lib/navigation.ts` | Accept dynamic badge values |
| `web/components/app-sidebar.tsx` | Use badge context |
| `web/app/(app)/layout.tsx` | Wrap with SidebarBadgeProvider |

---

### Estimated Effort

| Task | Estimate |
|------|----------|
| Create API endpoint | 30 min |
| Create React context | 30 min |
| Update navigation.ts | 15 min |
| Update app-sidebar.tsx | 15 min |
| Wire up in layout | 10 min |
| Testing | 30 min |
| **Total** | **~2 hours** |

---

*Investigation completed by analyzing source code in `web/components/app-sidebar.tsx`, `web/lib/navigation.ts`, `api/app/routes/submission_requests.py`, and `api/app/routes/reports.py`.*
