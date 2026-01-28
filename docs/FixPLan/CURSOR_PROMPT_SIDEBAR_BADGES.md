# CURSOR PROMPT: Sidebar Badge System - Dynamic Counts & Color Coding

## 🦈 MISSION

Fix the sidebar badge system to show real-time, meaningful notifications.

**Current State:** All badges are hardcoded static numbers
**Target State:** Dynamic badges with color-coded urgency

---

## BADGE DESIGN SPECIFICATION

### Badge Types & Colors

| Badge Type | Color | CSS Classes | Meaning |
|------------|-------|-------------|---------|
| 🔴 **Alert** | Red | `bg-red-500 text-white` | NEW items need attention |
| 🟡 **Active** | Amber | `bg-amber-500 text-white` | Work in progress |
| 🔵 **Info** | Blue | `bg-blue-500 text-white` | General count (clients) |

### Badge Logic by Role

| Role | Nav Item | Badge Color | Count Query |
|------|----------|-------------|-------------|
| `coo` | Requests | 🔴 Red | `SubmissionRequest.status == "pending"` (all) |
| `pct_admin` | Requests | 🔴 Red | `SubmissionRequest.status == "pending"` (all) |
| `pct_staff` | All Requests | 🔴 Red | `SubmissionRequest.status == "pending"` (all) |
| `pct_staff` | My Queue | 🟡 Amber | `Report.status IN ("collecting", "ready_to_file")` (all) |
| `client_admin` | Requests | 🔵 Blue | `SubmissionRequest.status IN ("pending", "in_progress")` (their company) |
| `client_user` | Requests | 🔵 Blue | `SubmissionRequest.status IN ("pending", "in_progress")` (their company) |

### Badge Display Rules

- **Show badge:** When count > 0
- **Hide badge:** When count = 0 (don't show "0")
- **Refresh:** Every 60 seconds via polling
- **No assignment filtering:** Show ALL items, not just assigned to user

---

## PART 1: CREATE SIDEBAR COUNTS API

**File:** `api/app/routes/sidebar.py` (NEW)

```python
"""
Sidebar Badge Counts API
Provides real-time badge counts for navigation.
"""

from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models.submission_request import SubmissionRequest
from app.models.report import Report
from app.models.company import Company

router = APIRouter(prefix="/sidebar", tags=["sidebar"])


@router.get("/counts")
async def get_sidebar_counts(
    role: str = Query(..., description="User role"),
    company_id: Optional[str] = Query(None, description="Company ID for client roles"),
    db: Session = Depends(get_db),
):
    """
    Get badge counts based on user role.
    
    Returns different counts depending on role:
    - Internal roles (coo, pct_admin, pct_staff): Global counts
    - Client roles: Company-scoped counts
    """
    
    # Internal roles see global counts
    if role in ("coo", "pct_admin", "pct_staff"):
        # Count: Pending submission requests (needs attention - RED badge)
        pending_requests = db.query(SubmissionRequest).filter(
            SubmissionRequest.status == "pending"
        ).count()
        
        # Count: Reports in collecting or ready_to_file (active work - AMBER badge)
        queue_count = db.query(Report).filter(
            Report.status.in_(["collecting", "ready_to_file"])
        ).count()
        
        return {
            "requests_pending": pending_requests,  # For "All Requests" / "Requests" badge
            "queue_active": queue_count,           # For "My Queue" badge
        }
    
    # Client roles see their company's counts
    elif role in ("client_admin", "client_user"):
        if not company_id:
            # Try to get demo company as fallback
            demo_company = db.query(Company).filter(Company.code == "DEMO").first()
            if demo_company:
                company_id = demo_company.id
            else:
                return {"requests_active": 0}
        
        # Count: Their pending + in_progress requests (BLUE badge)
        active_requests = db.query(SubmissionRequest).filter(
            SubmissionRequest.company_id == company_id,
            SubmissionRequest.status.in_(["pending", "in_progress"])
        ).count()
        
        return {
            "requests_active": active_requests,  # For client "Requests" badge
        }
    
    # Unknown role
    return {
        "requests_pending": 0,
        "queue_active": 0,
        "requests_active": 0,
    }
```

**File:** `api/app/main.py`

Add to imports and registration:

```python
from app.routes.sidebar import router as sidebar_router

# In router registration section:
app.include_router(sidebar_router)
```

---

## PART 2: CREATE SIDEBAR BADGE CONTEXT

**File:** `web/context/sidebar-badge-context.tsx` (NEW)

```tsx
"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

interface BadgeCounts {
  requestsPending: number;   // For internal: pending requests (RED)
  queueActive: number;       // For staff: collecting + ready_to_file (AMBER)
  requestsActive: number;    // For clients: pending + in_progress (BLUE)
  loading: boolean;
}

interface SidebarBadgeContextType extends BadgeCounts {
  refreshCounts: () => Promise<void>;
}

const SidebarBadgeContext = createContext<SidebarBadgeContextType>({
  requestsPending: 0,
  queueActive: 0,
  requestsActive: 0,
  loading: true,
  refreshCounts: async () => {},
});

export function useSidebarBadges() {
  return useContext(SidebarBadgeContext);
}

interface ProviderProps {
  children: ReactNode;
  role: string;
  companyId: string | null;
}

export function SidebarBadgeProvider({ children, role, companyId }: ProviderProps) {
  const [counts, setCounts] = useState<BadgeCounts>({
    requestsPending: 0,
    queueActive: 0,
    requestsActive: 0,
    loading: true,
  });

  const fetchCounts = async () => {
    try {
      const params = new URLSearchParams({ role });
      if (companyId) {
        params.set("company_id", companyId);
      }

      const response = await fetch(`${API_BASE_URL}/sidebar/counts?${params}`);
      
      if (response.ok) {
        const data = await response.json();
        setCounts({
          requestsPending: data.requests_pending || 0,
          queueActive: data.queue_active || 0,
          requestsActive: data.requests_active || 0,
          loading: false,
        });
      }
    } catch (error) {
      console.error("Failed to fetch sidebar counts:", error);
      setCounts((prev) => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchCounts();

    // Poll every 60 seconds
    const interval = setInterval(fetchCounts, 60000);

    return () => clearInterval(interval);
  }, [role, companyId]);

  return (
    <SidebarBadgeContext.Provider
      value={{
        ...counts,
        refreshCounts: fetchCounts,
      }}
    >
      {children}
    </SidebarBadgeContext.Provider>
  );
}
```

---

## PART 3: UPDATE NAVIGATION TYPES

**File:** `web/lib/navigation.ts`

Update the NavItem type and navigation functions:

```typescript
import {
  LayoutDashboard,
  FileText,
  Users,
  Building2,
  Settings,
  Inbox,
  ClipboardList,
  DollarSign,
  BarChart3,
  Shield,
  Receipt,
  UserCog,
  // ... other icons
} from "lucide-react";

// Badge type with color variant
export interface BadgeConfig {
  count: number;
  variant: "alert" | "active" | "info";  // red, amber, blue
}

export interface NavItem {
  label: string;
  href: string;
  icon: any;
  badge?: BadgeConfig;  // Changed from number to BadgeConfig
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export type UserRole = "coo" | "pct_admin" | "pct_staff" | "client_admin" | "client_user";

// Badge counts passed from context
export interface BadgeCounts {
  requestsPending: number;
  queueActive: number;
  requestsActive: number;
}

/**
 * Get navigation items for a role with dynamic badge counts
 */
export function getNavigationForRole(
  role: UserRole,
  badgeCounts?: BadgeCounts
): NavSection[] {
  const counts = badgeCounts || { requestsPending: 0, queueActive: 0, requestsActive: 0 };

  switch (role) {
    case "coo":
      return getCOONavigation(counts);
    case "pct_admin":
      return getPCTAdminNavigation(counts);
    case "pct_staff":
      return getPCTStaffNavigation(counts);
    case "client_admin":
      return getClientAdminNavigation(counts);
    case "client_user":
      return getClientUserNavigation(counts);
    default:
      return [];
  }
}

// ============================================================================
// COO NAVIGATION
// ============================================================================

function getCOONavigation(counts: BadgeCounts): NavSection[] {
  return [
    {
      title: "Executive",
      items: [
        { label: "Dashboard", href: "/app/executive", icon: BarChart3 },
      ],
    },
    {
      title: "Operations",
      items: [
        {
          label: "Requests",
          href: "/app/admin/requests",
          icon: ClipboardList,
          badge: counts.requestsPending > 0
            ? { count: counts.requestsPending, variant: "alert" }
            : undefined,
        },
        { label: "Reports", href: "/app/reports", icon: FileText },
        { label: "Companies", href: "/app/admin/companies", icon: Building2 },
        { label: "Users", href: "/app/admin/users", icon: Users },
      ],
    },
    {
      title: "Finance",
      items: [
        { label: "Billing", href: "/app/admin/billing", icon: DollarSign },
        { label: "Invoices", href: "/app/invoices", icon: Receipt },
      ],
    },
    {
      title: "Settings",
      items: [
        { label: "Settings", href: "/app/settings", icon: Settings },
      ],
    },
  ];
}

// ============================================================================
// PCT ADMIN NAVIGATION
// ============================================================================

function getPCTAdminNavigation(counts: BadgeCounts): NavSection[] {
  return [
    {
      title: "Overview",
      items: [
        { label: "Dashboard", href: "/app/admin/overview", icon: LayoutDashboard },
      ],
    },
    {
      title: "Operations",
      items: [
        {
          label: "Requests",
          href: "/app/admin/requests",
          icon: ClipboardList,
          badge: counts.requestsPending > 0
            ? { count: counts.requestsPending, variant: "alert" }
            : undefined,
        },
        { label: "Reports", href: "/app/reports", icon: FileText },
        { label: "Companies", href: "/app/admin/companies", icon: Building2 },
        { label: "Users", href: "/app/admin/users", icon: Users },
      ],
    },
    {
      title: "Settings",
      items: [
        { label: "Team", href: "/app/settings/team", icon: UserCog },
        { label: "Settings", href: "/app/settings", icon: Settings },
      ],
    },
  ];
}

// ============================================================================
// PCT STAFF NAVIGATION
// ============================================================================

function getPCTStaffNavigation(counts: BadgeCounts): NavSection[] {
  return [
    {
      title: "Work",
      items: [
        {
          label: "My Queue",
          href: "/app/staff/queue",
          icon: Inbox,
          badge: counts.queueActive > 0
            ? { count: counts.queueActive, variant: "active" }  // AMBER
            : undefined,
        },
        {
          label: "All Requests",
          href: "/app/admin/requests",
          icon: ClipboardList,
          badge: counts.requestsPending > 0
            ? { count: counts.requestsPending, variant: "alert" }  // RED
            : undefined,
        },
      ],
    },
    {
      title: "Reference",
      items: [
        { label: "Reports", href: "/app/reports", icon: FileText },
      ],
    },
    {
      title: "Settings",
      items: [
        { label: "Settings", href: "/app/settings", icon: Settings },
      ],
    },
  ];
}

// ============================================================================
// CLIENT ADMIN NAVIGATION
// ============================================================================

function getClientAdminNavigation(counts: BadgeCounts): NavSection[] {
  return [
    {
      title: "Overview",
      items: [
        { label: "Dashboard", href: "/app/dashboard", icon: LayoutDashboard },
      ],
    },
    {
      title: "Compliance",
      items: [
        {
          label: "Requests",
          href: "/app/requests",
          icon: ClipboardList,
          badge: counts.requestsActive > 0
            ? { count: counts.requestsActive, variant: "info" }  // BLUE
            : undefined,
        },
        { label: "Reports", href: "/app/reports", icon: FileText },
      ],
    },
    {
      title: "Billing",
      items: [
        { label: "Invoices", href: "/app/invoices", icon: Receipt },
      ],
    },
    {
      title: "Settings",
      items: [
        { label: "Team", href: "/app/settings/team", icon: UserCog },
        { label: "Settings", href: "/app/settings", icon: Settings },
      ],
    },
  ];
}

// ============================================================================
// CLIENT USER NAVIGATION
// ============================================================================

function getClientUserNavigation(counts: BadgeCounts): NavSection[] {
  return [
    {
      title: "Overview",
      items: [
        { label: "Dashboard", href: "/app/dashboard", icon: LayoutDashboard },
      ],
    },
    {
      title: "Compliance",
      items: [
        {
          label: "Requests",
          href: "/app/requests",
          icon: ClipboardList,
          badge: counts.requestsActive > 0
            ? { count: counts.requestsActive, variant: "info" }  // BLUE
            : undefined,
        },
        { label: "Reports", href: "/app/reports", icon: FileText },
      ],
    },
    {
      title: "Settings",
      items: [
        { label: "Settings", href: "/app/settings", icon: Settings },
      ],
    },
  ];
}

// Helper to get home path for role
export function getHomePathForRole(role: UserRole): string {
  switch (role) {
    case "coo":
      return "/app/executive";
    case "pct_admin":
      return "/app/admin/overview";
    case "pct_staff":
      return "/app/staff/queue";
    case "client_admin":
    case "client_user":
      return "/app/dashboard";
    default:
      return "/app/dashboard";
  }
}
```

---

## PART 4: UPDATE APP SIDEBAR COMPONENT

**File:** `web/components/app-sidebar.tsx`

Update the badge rendering to use the new BadgeConfig with colors:

```tsx
// Add import at top
import { useSidebarBadges } from "@/context/sidebar-badge-context";
import { getNavigationForRole, BadgeConfig } from "@/lib/navigation";
import { cn } from "@/lib/utils";

// Inside the component, get badge counts from context
export function AppSidebar() {
  const { requestsPending, queueActive, requestsActive } = useSidebarBadges();
  
  // Get session/role from cookie (existing logic)
  const session = getSession(); // Your existing session getter
  const role = session?.role || "client_user";
  const companyId = session?.companyId;

  // Get navigation with dynamic badge counts
  const navigation = getNavigationForRole(role, {
    requestsPending,
    queueActive,
    requestsActive,
  });

  // ... rest of component

  // Update the badge rendering section (find where badges are rendered):
  return (
    // ... sidebar structure
    {navigation.map((section) => (
      <div key={section.title}>
        <h3 className="...">{section.title}</h3>
        <nav>
          {section.items.map((item) => (
            <Link key={item.href} href={item.href} className="...">
              <item.icon className="..." />
              <span>{item.label}</span>
              
              {/* UPDATED BADGE RENDERING */}
              {item.badge && item.badge.count > 0 && (
                <Badge
                  className={cn(
                    "h-5 min-w-[20px] px-1.5 text-xs font-semibold",
                    // Color variants
                    item.badge.variant === "alert" && "bg-red-500 text-white hover:bg-red-600",
                    item.badge.variant === "active" && "bg-amber-500 text-white hover:bg-amber-600",
                    item.badge.variant === "info" && "bg-blue-500 text-white hover:bg-blue-600",
                  )}
                >
                  {item.badge.count}
                </Badge>
              )}
            </Link>
          ))}
        </nav>
      </div>
    ))}
  );
}
```

**Full badge rendering replacement:**

Find the existing badge code (around line 180-192) and replace with:

```tsx
{/* Dynamic Badge with Color Variants */}
{item.badge && item.badge.count > 0 && (
  <span
    className={cn(
      "ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-xs font-semibold",
      // Alert (Red) - Needs attention
      item.badge.variant === "alert" && "bg-red-500 text-white",
      // Active (Amber) - Work in progress
      item.badge.variant === "active" && "bg-amber-500 text-white",
      // Info (Blue) - General count
      item.badge.variant === "info" && "bg-blue-500 text-white",
      // Hover states
      "transition-colors"
    )}
  >
    {item.badge.count > 99 ? "99+" : item.badge.count}
  </span>
)}
```

---

## PART 5: WRAP APP LAYOUT WITH PROVIDER

**File:** `web/app/(app)/layout.tsx`

Add the SidebarBadgeProvider:

```tsx
import { SidebarBadgeProvider } from "@/context/sidebar-badge-context";

// Inside the layout component, get session info
export default function AppLayout({ children }: { children: React.ReactNode }) {
  // Get session from cookie (existing logic)
  // This might need to be a client component or use server-side cookie reading
  
  return (
    <SidebarBadgeProvider 
      role={session?.role || "client_user"} 
      companyId={session?.companyId || null}
    >
      <div className="flex h-screen">
        <AppSidebar />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </SidebarBadgeProvider>
  );
}
```

**If layout is a server component, create a client wrapper:**

```tsx
// web/components/app-layout-client.tsx
"use client";

import { SidebarBadgeProvider } from "@/context/sidebar-badge-context";
import { AppSidebar } from "@/components/app-sidebar";
import { useEffect, useState } from "react";

interface Session {
  role: string;
  companyId: string | null;
}

export function AppLayoutClient({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    // Read session from cookie
    const cookie = document.cookie
      .split("; ")
      .find((row) => row.startsWith("pct_demo_session="));
    
    if (cookie) {
      try {
        const data = JSON.parse(atob(cookie.split("=")[1]));
        setSession({
          role: data.role,
          companyId: data.companyId,
        });
      } catch (e) {
        console.error("Failed to parse session:", e);
      }
    }
  }, []);

  if (!session) {
    return <div>Loading...</div>;
  }

  return (
    <SidebarBadgeProvider role={session.role} companyId={session.companyId}>
      <div className="flex h-screen">
        <AppSidebar />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </SidebarBadgeProvider>
  );
}
```

---

## PART 6: TRIGGER BADGE REFRESH ON ACTIONS

When certain actions happen, refresh the badge counts immediately:

**File:** `web/app/(app)/app/admin/requests/page.tsx`

After starting a wizard (which changes a request from pending to in_progress):

```tsx
import { useSidebarBadges } from "@/context/sidebar-badge-context";

// Inside component
const { refreshCounts } = useSidebarBadges();

// After successfully starting wizard:
const handleStartWizard = async (requestId: string) => {
  const response = await fetch(`${API_BASE_URL}/submission-requests/${requestId}/create-report`, {
    method: "POST",
  });
  
  if (response.ok) {
    // Refresh badge counts immediately
    await refreshCounts();
    
    // Navigate to wizard
    router.push(`/app/reports/${data.report_id}/wizard`);
  }
};
```

**Similarly, add `refreshCounts()` calls after:**
- Filing a report (queue count decreases)
- Client submitting a new request (would need WebSocket for real-time, but polling handles it)

---

## VERIFICATION CHECKLIST

### API
- [ ] `GET /sidebar/counts?role=pct_staff` returns `requests_pending` and `queue_active`
- [ ] `GET /sidebar/counts?role=client_admin&company_id=xxx` returns `requests_active`
- [ ] Counts match actual database state

### Frontend
- [ ] SidebarBadgeProvider wraps the app layout
- [ ] useSidebarBadges hook returns counts
- [ ] Navigation items have correct badge configs
- [ ] Badges render with correct colors:
  - [ ] 🔴 Red for "All Requests" / "Requests" (pending)
  - [ ] 🟡 Amber for "My Queue" (collecting/ready)
  - [ ] 🔵 Blue for client "Requests" (active)
- [ ] Badges hide when count is 0
- [ ] Badges show "99+" when count > 99
- [ ] Counts refresh every 60 seconds
- [ ] `refreshCounts()` works after actions

### User Experience Flow
- [ ] New request submitted → "All Requests" badge appears/increments (🔴)
- [ ] Staff starts wizard → "All Requests" decrements, "My Queue" increments (🟡)
- [ ] Staff files report → "My Queue" decrements
- [ ] Client sees their active request count (🔵)

---

## UPDATE KILLEDSHARKS.MD

```markdown
---

### 22. Sidebar Badge System - Dynamic & Color-Coded ✅

**Problem:** All sidebar badges were hardcoded static numbers
- "My Queue" always showed "3"
- "Requests" always showed "8"  
- "All Requests" had NO badge at all
- Staff couldn't see when new requests arrived

**Solution:**

**1. Created Sidebar Counts API** (`api/app/routes/sidebar.py`)
```
GET /sidebar/counts?role={role}&company_id={id}

Returns:
- Internal roles: { requests_pending, queue_active }
- Client roles: { requests_active }
```

**2. Created SidebarBadgeProvider Context**
- Fetches counts on mount
- Polls every 60 seconds
- Provides `refreshCounts()` for immediate updates

**3. Color-Coded Badge System**
| Color | Variant | Meaning | Used For |
|-------|---------|---------|----------|
| 🔴 Red | `alert` | Needs attention | Pending requests |
| 🟡 Amber | `active` | Work in progress | Queue items |
| 🔵 Blue | `info` | General count | Client requests |

**4. Badge Logic by Role**
| Role | Nav Item | Badge | Color |
|------|----------|-------|-------|
| COO | Requests | Pending count | 🔴 Red |
| pct_admin | Requests | Pending count | 🔴 Red |
| pct_staff | All Requests | Pending count | 🔴 Red |
| pct_staff | My Queue | Collecting + Ready | 🟡 Amber |
| client_admin | Requests | Pending + In Progress | 🔵 Blue |
| client_user | Requests | Pending + In Progress | 🔵 Blue |

**5. Real-Time Updates**
- Polls every 60 seconds automatically
- Immediate refresh after starting wizard
- Immediate refresh after filing report

**Files Created:**
- `api/app/routes/sidebar.py` (NEW)
- `web/context/sidebar-badge-context.tsx` (NEW)

**Files Changed:**
- `api/app/main.py` (register router)
- `web/lib/navigation.ts` (BadgeConfig type, dynamic nav functions)
- `web/components/app-sidebar.tsx` (color-coded badge rendering)
- `web/app/(app)/layout.tsx` (wrap with provider)

**Status:** ✅ Killed
```

---

**This creates a proper notification system. Staff will immediately see when new work arrives!** 🔴🟡🔵
