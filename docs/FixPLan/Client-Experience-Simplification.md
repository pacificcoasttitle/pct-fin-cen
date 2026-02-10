# 🎯 Client Experience Simplification — Complete Overhaul

## Overview

Simplify the client (escrow officer) experience with:
1. Clean, minimal navigation
2. Tab-based request organization by status
3. Simplified dashboard with action-oriented counts
4. Consistent "Requests" terminology
5. Profile page

**Scope:** Client User + Client Admin roles only. Staff/Admin views remain unchanged.

---

## Target Navigation Structure

```
┌─────────────────────────────────────────┐
│  [Logo] FinClear                        │
├─────────────────────────────────────────┤
│                                         │
│  📊 Dashboard                           │
│                                         │
│  📋 Requests                            │
│     └─ Ready to File (3)                │
│     └─ Pending (7)                      │
│     └─ Drafts (2)                       │
│     └─ Exempt (45)                      │
│                                         │
│  ➕ New Request                         │
│                                         │
│  ─────────────────────                  │
│                                         │
│  👤 My Profile                          │
│  ⚙️ Settings (Admin only)              │
│     └─ Company                          │
│     └─ Team                             │
│     └─ Branches                         │
│     └─ Branding                         │
│     └─ Billing                          │
│                                         │
└─────────────────────────────────────────┘
```

---

## Status Definitions

| Tab | Internal Status | Description | Action |
|-----|-----------------|-------------|--------|
| **Ready to File** | `ready_to_file` | All parties submitted, ready for review & filing | Review → Certify → File |
| **Pending** | `collecting`, `awaiting_parties` | Waiting for buyer/seller to complete portal | Monitor progress |
| **Drafts** | `draft`, `determination_complete` | Started but not sent to parties | Continue wizard |
| **Exempt** | `exempt` | No filing required | View certificate |

---

## Implementation

### Step 1: Update Navigation Config

**File:** `web/lib/navigation.ts`

Replace client navigation with simplified structure:

```typescript
import {
  LayoutDashboard,
  FileText,
  Plus,
  User,
  Settings,
  Building,
  Users,
  Palette,
  CreditCard,
  CheckCircle,
  Clock,
  FileEdit,
  Shield,
} from "lucide-react";

export interface NavItem {
  name: string;
  href: string;
  icon: any;
  badge?: number;
  children?: NavItem[];
}

export interface NavigationConfig {
  main: NavItem[];
  secondary: NavItem[];
}

// Client navigation (client_user + client_admin)
export function getClientNavigation(counts: {
  ready_to_file: number;
  pending: number;
  drafts: number;
  exempt: number;
}): NavigationConfig {
  return {
    main: [
      {
        name: "Dashboard",
        href: "/app/dashboard",
        icon: LayoutDashboard,
      },
      {
        name: "Requests",
        href: "/app/requests",
        icon: FileText,
        children: [
          {
            name: "Ready to File",
            href: "/app/requests?status=ready",
            icon: CheckCircle,
            badge: counts.ready_to_file,
          },
          {
            name: "Pending",
            href: "/app/requests?status=pending",
            icon: Clock,
            badge: counts.pending,
          },
          {
            name: "Drafts",
            href: "/app/requests?status=drafts",
            icon: FileEdit,
            badge: counts.drafts,
          },
          {
            name: "Exempt",
            href: "/app/requests?status=exempt",
            icon: Shield,
          },
        ],
      },
      {
        name: "New Request",
        href: "/app/requests/new",
        icon: Plus,
      },
    ],
    secondary: [
      {
        name: "My Profile",
        href: "/app/profile",
        icon: User,
      },
    ],
  };
}

// Client Admin gets settings too
export function getClientAdminNavigation(counts: {
  ready_to_file: number;
  pending: number;
  drafts: number;
  exempt: number;
}): NavigationConfig {
  const base = getClientNavigation(counts);
  
  return {
    ...base,
    secondary: [
      ...base.secondary,
      {
        name: "Settings",
        href: "/app/settings",
        icon: Settings,
        children: [
          { name: "Company", href: "/app/settings/company", icon: Building },
          { name: "Team", href: "/app/settings/team", icon: Users },
          { name: "Branches", href: "/app/settings/branches", icon: Building },
          { name: "Branding", href: "/app/settings/branding", icon: Palette },
          { name: "Billing", href: "/app/billing", icon: CreditCard },
        ],
      },
    ],
  };
}
```

---

### Step 2: Create Sidebar Component

**File:** `web/components/layout/ClientSidebar.tsx`

```tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useDemo } from "@/hooks/use-demo";
import { getClientNavigation, getClientAdminNavigation, NavItem } from "@/lib/navigation";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface RequestCounts {
  ready_to_file: number;
  pending: number;
  drafts: number;
  exempt: number;
}

export function ClientSidebar() {
  const pathname = usePathname();
  const { user } = useDemo();
  const [counts, setCounts] = useState<RequestCounts>({
    ready_to_file: 0,
    pending: 0,
    drafts: 0,
    exempt: 0,
  });
  const [expandedItems, setExpandedItems] = useState<string[]>(["Requests"]);

  // Fetch counts
  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const res = await fetch("/api/requests/counts", { credentials: "include" });
        if (res.ok) {
          setCounts(await res.json());
        }
      } catch (error) {
        console.error("Failed to fetch counts");
      }
    };
    fetchCounts();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchCounts, 30000);
    return () => clearInterval(interval);
  }, []);

  const navigation = user?.role === "client_admin" 
    ? getClientAdminNavigation(counts)
    : getClientNavigation(counts);

  const toggleExpand = (name: string) => {
    setExpandedItems(prev => 
      prev.includes(name) 
        ? prev.filter(n => n !== name)
        : [...prev, name]
    );
  };

  const isActive = (href: string) => {
    if (href.includes("?")) {
      return pathname === href.split("?")[0] && 
             window.location.search.includes(href.split("?")[1]);
    }
    return pathname === href || pathname.startsWith(href + "/");
  };

  const renderNavItem = (item: NavItem, depth = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.name);
    const active = isActive(item.href);

    return (
      <div key={item.href}>
        <Link
          href={hasChildren ? "#" : item.href}
          onClick={(e) => {
            if (hasChildren) {
              e.preventDefault();
              toggleExpand(item.name);
            }
          }}
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
            depth > 0 && "ml-6 text-xs",
            active
              ? "bg-teal-50 text-teal-700"
              : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
          )}
        >
          <item.icon className={cn("w-5 h-5", depth > 0 && "w-4 h-4")} />
          <span className="flex-1">{item.name}</span>
          
          {item.badge !== undefined && item.badge > 0 && (
            <Badge 
              variant="secondary" 
              className={cn(
                "text-xs px-2",
                item.name === "Ready to File" && "bg-green-100 text-green-700",
                item.name === "Pending" && "bg-amber-100 text-amber-700"
              )}
            >
              {item.badge}
            </Badge>
          )}
          
          {hasChildren && (
            isExpanded 
              ? <ChevronDown className="w-4 h-4" />
              : <ChevronRight className="w-4 h-4" />
          )}
        </Link>
        
        {hasChildren && isExpanded && (
          <div className="mt-1 space-y-1">
            {item.children!.map(child => renderNavItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className="w-64 border-r bg-white h-screen sticky top-0 flex flex-col">
      {/* Logo */}
      <div className="p-4 border-b">
        <Link href="/app/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">FC</span>
          </div>
          <span className="font-semibold text-gray-900">FinClear</span>
        </Link>
      </div>

      {/* Main Nav */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navigation.main.map(item => renderNavItem(item))}
      </nav>

      {/* Secondary Nav */}
      <div className="p-4 border-t space-y-1">
        {navigation.secondary.map(item => renderNavItem(item))}
      </div>

      {/* User Info */}
      <div className="p-4 border-t bg-gray-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center">
            <span className="text-teal-700 font-medium text-sm">
              {user?.name?.charAt(0) || "U"}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user?.name || "User"}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {user?.company_name || "Company"}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
```

---

### Step 3: Create Unified Requests Page with Tabs

**File:** `web/app/(app)/app/requests/page.tsx`

```tsx
"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Search,
  CheckCircle,
  Clock,
  FileEdit,
  Shield,
  ArrowRight,
  Loader2,
  FileText,
  Users,
  MapPin,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Request {
  id: string;
  property_address: string;
  escrow_number: string;
  status: string;
  buyer_name: string;
  parties_submitted: number;
  parties_total: number;
  created_at: string;
  updated_at: string;
  closing_date?: string;
  receipt_id?: string;
}

interface TabConfig {
  value: string;
  label: string;
  icon: any;
  statuses: string[];
  emptyMessage: string;
  emptyAction?: string;
}

const TABS: TabConfig[] = [
  {
    value: "ready",
    label: "Ready to File",
    icon: CheckCircle,
    statuses: ["ready_to_file"],
    emptyMessage: "No requests ready to file",
    emptyAction: "Requests move here when all parties have submitted their information.",
  },
  {
    value: "pending",
    label: "Pending",
    icon: Clock,
    statuses: ["collecting", "awaiting_parties"],
    emptyMessage: "No pending requests",
    emptyAction: "Requests waiting for buyer/seller responses appear here.",
  },
  {
    value: "drafts",
    label: "Drafts",
    icon: FileEdit,
    statuses: ["draft", "determination_complete"],
    emptyMessage: "No drafts",
    emptyAction: "Unfinished requests will appear here.",
  },
  {
    value: "exempt",
    label: "Exempt",
    icon: Shield,
    statuses: ["exempt"],
    emptyMessage: "No exempt requests",
    emptyAction: "Transactions that don't require FinCEN filing appear here.",
  },
];

export default function RequestsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("status") || "ready";
  
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchRequests();
    fetchCounts();
  }, [currentTab]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const tab = TABS.find(t => t.value === currentTab);
      const statuses = tab?.statuses.join(",") || "";
      
      const res = await fetch(
        `/api/requests?statuses=${statuses}&search=${searchQuery}`,
        { credentials: "include" }
      );
      
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests || data);
      }
    } catch (error) {
      console.error("Failed to fetch requests");
    } finally {
      setLoading(false);
    }
  };

  const fetchCounts = async () => {
    try {
      const res = await fetch("/api/requests/counts", { credentials: "include" });
      if (res.ok) {
        setCounts(await res.json());
      }
    } catch (error) {
      console.error("Failed to fetch counts");
    }
  };

  const handleTabChange = (value: string) => {
    router.push(`/app/requests?status=${value}`);
  };

  const getActionButton = (request: Request) => {
    switch (currentTab) {
      case "ready":
        return (
          <Button size="sm" className="bg-green-600 hover:bg-green-700" asChild>
            <Link href={`/app/reports/${request.id}/wizard?step=file-report`}>
              Review & File
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </Button>
        );
      case "pending":
        return (
          <Button size="sm" variant="outline" asChild>
            <Link href={`/app/reports/${request.id}/wizard?step=monitor-progress`}>
              View Progress
            </Link>
          </Button>
        );
      case "drafts":
        return (
          <Button size="sm" variant="outline" asChild>
            <Link href={`/app/reports/${request.id}/wizard`}>
              Continue
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </Button>
        );
      case "exempt":
        return (
          <Button size="sm" variant="ghost" asChild>
            <Link href={`/app/reports/${request.id}/certificate`}>
              View Certificate
            </Link>
          </Button>
        );
      default:
        return null;
    }
  };

  const currentTabConfig = TABS.find(t => t.value === currentTab);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Requests</h1>
          <p className="text-gray-500">Manage your FinCEN filing requests</p>
        </div>
        <Button asChild className="bg-gradient-to-r from-teal-500 to-cyan-600">
          <Link href="/app/requests/new">
            <Plus className="w-4 h-4 mr-2" />
            New Request
          </Link>
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={currentTab} onValueChange={handleTabChange}>
        <div className="flex items-center justify-between mb-4">
          <TabsList className="bg-gray-100">
            {TABS.map(tab => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="flex items-center gap-2 data-[state=active]:bg-white"
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {counts[tab.value] > 0 && (
                  <Badge 
                    variant="secondary" 
                    className={
                      tab.value === "ready" ? "bg-green-100 text-green-700" :
                      tab.value === "pending" ? "bg-amber-100 text-amber-700" :
                      ""
                    }
                  >
                    {counts[tab.value]}
                  </Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Search */}
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search address, escrow #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchRequests()}
              className="pl-9"
            />
          </div>
        </div>

        {/* Content */}
        {TABS.map(tab => (
          <TabsContent key={tab.value} value={tab.value} className="mt-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
              </div>
            ) : requests.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <tab.icon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-900 font-medium mb-1">
                    {currentTabConfig?.emptyMessage}
                  </p>
                  <p className="text-sm text-gray-500 mb-4">
                    {currentTabConfig?.emptyAction}
                  </p>
                  {tab.value === "drafts" && (
                    <Button asChild>
                      <Link href="/app/requests/new">Start New Request</Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Property</TableHead>
                      <TableHead>Escrow #</TableHead>
                      {tab.value === "pending" && <TableHead>Parties</TableHead>}
                      {tab.value === "ready" && <TableHead>Closing Date</TableHead>}
                      <TableHead>Updated</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map(request => (
                      <TableRow key={request.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                              <MapPin className="w-5 h-5 text-gray-400" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">
                                {request.property_address || "No address"}
                              </p>
                              <p className="text-sm text-gray-500">
                                {request.buyer_name}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-sm">
                            {request.escrow_number || "—"}
                          </span>
                        </TableCell>
                        {tab.value === "pending" && (
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-gray-400" />
                              <span>
                                {request.parties_submitted}/{request.parties_total}
                              </span>
                              {request.parties_submitted === request.parties_total && (
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              )}
                            </div>
                          </TableCell>
                        )}
                        {tab.value === "ready" && (
                          <TableCell>
                            {request.closing_date || "—"}
                          </TableCell>
                        )}
                        <TableCell className="text-gray-500 text-sm">
                          {formatDistanceToNow(new Date(request.updated_at), { addSuffix: true })}
                        </TableCell>
                        <TableCell className="text-right">
                          {getActionButton(request)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
```

---

### Step 4: Create API Endpoint for Counts

**File:** `api/app/routes/requests.py` (add to existing or create)

```python
@router.get("/requests/counts")
async def get_request_counts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get request counts by status for sidebar badges."""
    
    # Base query - filter by company for clients
    base_query = db.query(Report).filter(Report.company_id == current_user.company_id)
    
    counts = {
        "ready_to_file": base_query.filter(Report.status == "ready_to_file").count(),
        "pending": base_query.filter(Report.status.in_(["collecting", "awaiting_parties"])).count(),
        "drafts": base_query.filter(Report.status.in_(["draft", "determination_complete"])).count(),
        "exempt": base_query.filter(Report.status == "exempt").count(),
    }
    
    return counts


@router.get("/requests")
async def list_requests(
    statuses: str = Query(None),  # Comma-separated statuses
    search: str = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List requests filtered by status and search."""
    
    query = db.query(Report).filter(Report.company_id == current_user.company_id)
    
    # Filter by statuses
    if statuses:
        status_list = [s.strip() for s in statuses.split(",")]
        query = query.filter(Report.status.in_(status_list))
    
    # Search
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Report.property_address.ilike(search_term),
                Report.escrow_number.ilike(search_term),
            )
        )
    
    # Order by updated_at desc
    query = query.order_by(Report.updated_at.desc())
    
    reports = query.limit(100).all()
    
    # Get party counts for each report
    result = []
    for report in reports:
        parties = db.query(ReportParty).filter(ReportParty.report_id == report.id).all()
        parties_total = len(parties)
        parties_submitted = len([p for p in parties if p.status == "submitted"])
        
        # Extract data from wizard_data
        wizard_data = report.wizard_data or {}
        collection = wizard_data.get("collection", {})
        property_addr = collection.get("propertyAddress", {})
        
        result.append({
            "id": str(report.id),
            "property_address": f"{property_addr.get('street', '')}, {property_addr.get('city', '')}".strip(", "),
            "escrow_number": report.escrow_number,
            "status": report.status,
            "buyer_name": collection.get("buyerEntity", {}).get("entity", {}).get("legalName", "") or "TBD",
            "parties_submitted": parties_submitted,
            "parties_total": parties_total,
            "created_at": report.created_at.isoformat() if report.created_at else None,
            "updated_at": report.updated_at.isoformat() if report.updated_at else None,
            "closing_date": collection.get("closingDate"),
            "receipt_id": report.receipt_id,
        })
    
    return {"requests": result}
```

---

### Step 5: Simplified Dashboard

**File:** `web/app/(app)/app/dashboard/page.tsx`

```tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useDemo } from "@/hooks/use-demo";
import {
  Plus,
  CheckCircle,
  Clock,
  FileEdit,
  Shield,
  ArrowRight,
  Loader2,
  FileText,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface DashboardData {
  counts: {
    ready_to_file: number;
    pending: number;
    drafts: number;
    exempt: number;
  };
  recent: Array<{
    id: string;
    property_address: string;
    status: string;
    updated_at: string;
  }>;
}

export default function DashboardPage() {
  const { user } = useDemo();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [countsRes, recentRes] = await Promise.all([
          fetch("/api/requests/counts", { credentials: "include" }),
          fetch("/api/requests?limit=5", { credentials: "include" }),
        ]);

        const counts = countsRes.ok ? await countsRes.json() : {};
        const recentData = recentRes.ok ? await recentRes.json() : { requests: [] };

        setData({
          counts,
          recent: recentData.requests?.slice(0, 5) || [],
        });
      } catch (error) {
        console.error("Failed to fetch dashboard data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  const statCards = [
    {
      label: "Ready to File",
      count: data?.counts.ready_to_file || 0,
      icon: CheckCircle,
      color: "green",
      href: "/app/requests?status=ready",
      description: "Review and submit",
    },
    {
      label: "Pending",
      count: data?.counts.pending || 0,
      icon: Clock,
      color: "amber",
      href: "/app/requests?status=pending",
      description: "Awaiting parties",
    },
    {
      label: "Drafts",
      count: data?.counts.drafts || 0,
      icon: FileEdit,
      color: "gray",
      href: "/app/requests?status=drafts",
      description: "Continue working",
    },
    {
      label: "Exempt",
      count: data?.counts.exempt || 0,
      icon: Shield,
      color: "blue",
      href: "/app/requests?status=exempt",
      description: "No filing needed",
    },
  ];

  const getColorClasses = (color: string) => ({
    green: "bg-green-50 border-green-200 text-green-700",
    amber: "bg-amber-50 border-amber-200 text-amber-700",
    gray: "bg-gray-50 border-gray-200 text-gray-700",
    blue: "bg-blue-50 border-blue-200 text-blue-700",
  }[color] || "");

  const getIconClasses = (color: string) => ({
    green: "text-green-500",
    amber: "text-amber-500",
    gray: "text-gray-400",
    blue: "text-blue-500",
  }[color] || "");

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
          </h1>
          <p className="text-gray-500">Here's what needs your attention</p>
        </div>
        <Button asChild className="bg-gradient-to-r from-teal-500 to-cyan-600">
          <Link href="/app/requests/new">
            <Plus className="w-4 h-4 mr-2" />
            New Request
          </Link>
        </Button>
      </div>

      {/* Action Required Banner */}
      {(data?.counts.ready_to_file || 0) > 0 && (
        <Card className="mb-6 border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <div>
                  <p className="font-medium text-green-900">
                    {data?.counts.ready_to_file} request{data?.counts.ready_to_file !== 1 ? "s" : ""} ready to file
                  </p>
                  <p className="text-sm text-green-700">
                    All parties have submitted. Review and file with FinCEN.
                  </p>
                </div>
              </div>
              <Button asChild className="bg-green-600 hover:bg-green-700">
                <Link href="/app/requests?status=ready">
                  Review Now
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {statCards.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card className={`hover:shadow-md transition cursor-pointer border ${getColorClasses(stat.color)}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <stat.icon className={`w-5 h-5 ${getIconClasses(stat.color)}`} />
                </div>
                <p className="text-3xl font-bold">{stat.count}</p>
                <p className="text-sm font-medium">{stat.label}</p>
                <p className="text-xs opacity-75">{stat.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Recent Activity */}
      {data?.recent && data.recent.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
            <Link href="/app/requests" className="text-sm text-teal-600 hover:text-teal-700">
              View all →
            </Link>
          </div>
          <div className="space-y-2">
            {data.recent.map((request) => (
              <Link
                key={request.id}
                href={`/app/reports/${request.id}/wizard`}
                className="flex items-center justify-between p-4 bg-white border rounded-lg hover:border-teal-300 hover:shadow-sm transition"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">
                      {request.property_address || "No address"}
                    </p>
                    <p className="text-sm text-gray-500">
                      Updated {formatDistanceToNow(new Date(request.updated_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {(!data?.recent || data.recent.length === 0) && (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-900 font-medium mb-1">No requests yet</p>
            <p className="text-sm text-gray-500 mb-4">
              Start by creating your first FinCEN filing request.
            </p>
            <Button asChild>
              <Link href="/app/requests/new">Create First Request</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

---

### Step 6: Create Profile Page

**File:** `web/app/(app)/app/profile/page.tsx`

```tsx
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDemo } from "@/hooks/use-demo";
import { User, Mail, Phone, Building, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function ProfilePage() {
  const { user } = useDemo();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
      });
    }
  }, [user]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast.success("Profile updated");
      } else {
        toast.error("Failed to update profile");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-gray-500">Manage your personal information</p>
      </div>

      {/* Profile Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-teal-600" />
            Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="John Smith"
            />
          </div>

          <div>
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="john@company.com"
            />
          </div>

          <div>
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="(555) 123-4567"
            />
          </div>

          <Button onClick={handleSave} disabled={loading} className="mt-4">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Company Info (Read Only) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="w-5 h-5 text-teal-600" />
            Company
          </CardTitle>
          <CardDescription>
            Contact your administrator to update company information.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="font-medium text-gray-900">{user?.company_name || "—"}</p>
            <p className="text-sm text-gray-500">
              Role: {user?.role === "client_admin" ? "Administrator" : "User"}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

### Step 7: Update Terminology Throughout

Search and replace in all client-facing UI text:

| Old Term | New Term | Context |
|----------|----------|---------|
| "Report" | "Request" | List titles, empty states |
| "Create Report" | "New Request" | Buttons |
| "Reports" (nav) | "Requests" | Navigation |
| "Filing" | "Request" | Where appropriate |

**Files to update:**
- Navigation components
- Dashboard text
- Empty state messages
- Button labels
- Page titles

---

## Summary

| Component | File | Purpose |
|-----------|------|---------|
| Navigation config | `web/lib/navigation.ts` | Define client nav structure |
| Client Sidebar | `web/components/layout/ClientSidebar.tsx` | Render nav with counts |
| Requests page | `web/app/(app)/app/requests/page.tsx` | Tab-based request list |
| Dashboard | `web/app/(app)/app/dashboard/page.tsx` | Clean overview |
| Profile | `web/app/(app)/app/profile/page.tsx` | User profile page |
| API counts | `api/app/routes/requests.py` | Endpoint for sidebar badges |
| API list | `api/app/routes/requests.py` | Filtered request list |

**Key Changes:**
- ✅ Simplified 5-item navigation
- ✅ Tab-based request organization
- ✅ Status counts in sidebar
- ✅ Action-oriented dashboard
- ✅ "Requests" terminology
- ✅ Profile page
- ✅ Staff view unchanged
