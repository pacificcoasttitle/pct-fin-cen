# 🔧 Fix Bugs + Simplify Dashboard — 3 Tasks

Run these in order. Each section is a separate task.

---

# TASK 1: Fix Broken Email Links (#5)

## Problem
Party portal email links are not working. Users click the link in their email and something breaks.

## Diagnostic Steps

### 1.1 Check Email Template
Find where party portal emails are sent:

```bash
# Search for email sending related to party links
grep -r "party" --include="*.py" api/app/services/email_service.py
grep -r "portal" --include="*.py" api/app/services/
```

### 1.2 Check the Portal URL Construction
Find where the portal URL is built:

```python
# Should be something like:
portal_url = f"{settings.FRONTEND_URL}/p/{link.token}"
```

**Verify:**
- Is `FRONTEND_URL` set correctly in production? Should be `https://www.fincenclear.com`
- Is the token being generated and stored correctly?
- Is the route `/p/[token]` working?

### 1.3 Test the Portal Route

```bash
# Check if the portal route exists
ls -la web/app/p/
# or
ls -la web/app/\(public\)/p/
```

The route should be at `web/app/p/[token]/page.tsx` or similar.

### 1.4 Check PartyLink Model and Token Generation

```bash
grep -r "PartyLink" --include="*.py" api/app/models/
grep -r "token" --include="*.py" api/app/routes/parties.py
```

### 1.5 Common Issues to Check

**Issue A: Wrong FRONTEND_URL**
```python
# In api/app/config.py, check:
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
```
For production, this should be `https://www.fincenclear.com`

**Issue B: Token not in database**
The link might be generated but not saved:
```python
# After creating PartyLink, make sure:
db.add(link)
db.commit()  # <-- Must commit!
```

**Issue C: Route doesn't exist or is misconfigured**
```typescript
// web/app/p/[token]/page.tsx should exist and handle the token
export default function PartyPortalPage({ params }: { params: { token: string } }) {
  // ...
}
```

**Issue D: API endpoint for token validation is broken**
```bash
# Check if there's a validation endpoint
grep -r "token" --include="*.py" api/app/routes/parties.py | grep -i "get\|validate"
```

### 1.6 Fix: Ensure Email Contains Correct URL

In `api/app/services/email_service.py`, find the party portal email function and verify:

```python
def send_party_portal_email(
    to_email: str,
    party_name: str,
    party_role: str,
    property_address: str,
    portal_url: str,  # This should be the full URL
):
    # Email template should use portal_url directly
    # Example: "Click here to access your portal: {portal_url}"
```

### 1.7 Test Locally

```bash
# Check the party links endpoint
curl -X GET "http://localhost:8000/parties/link/{some_token}" -v
```

---

# TASK 2: Fix Wizard Not Displaying (#6)

## Problem
The new wizard flow changes (LinksSentConfirmation screen) are not appearing despite being pushed.

## Diagnostic Steps

### 2.1 Verify Component Exists

```bash
ls -la web/components/wizard/LinksSentConfirmation.tsx
cat web/components/wizard/LinksSentConfirmation.tsx | head -30
```

If the file doesn't exist, create it (full component code below).

### 2.2 Verify Import in Questionnaire

```bash
grep -n "LinksSentConfirmation" web/components/rrer-questionnaire.tsx
```

Should find:
- An import statement
- A render usage

### 2.3 Verify State Variable

```bash
grep -n "showLinksSentConfirmation" web/components/rrer-questionnaire.tsx
```

Should find:
- `useState` declaration
- `setShowLinksSentConfirmation(true)` in handler
- Conditional render `{showLinksSentConfirmation && ...}`

### 2.4 If Missing, Implement These Changes

**Step A: Create component (if missing)**

Create `web/components/wizard/LinksSentConfirmation.tsx`:

```tsx
"use client";

import { CheckCircle, Mail, Clock, ArrowRight, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

interface Party {
  name: string;
  email: string;
  type: string;
}

interface LinksSentConfirmationProps {
  sellers: Party[];
  buyers: Party[];
  propertyAddress: string;
  onViewStatus: () => void;
}

export function LinksSentConfirmation({
  sellers,
  buyers,
  propertyAddress,
  onViewStatus,
}: LinksSentConfirmationProps) {
  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      {/* Success Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Party Links Sent Successfully!
        </h1>
        <p className="text-gray-600">
          Secure portal links have been emailed for{" "}
          <span className="font-medium">{propertyAddress}</span>
        </p>
      </div>

      {/* Parties List */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Mail className="w-5 h-5 text-blue-600" />
            <h2 className="font-semibold">Emails Sent To:</h2>
          </div>

          {buyers.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-500 mb-2">BUYERS</p>
              {buyers.map((party, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium">{party.name}</p>
                    <p className="text-sm text-gray-500">{party.email}</p>
                  </div>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                    ✓ Link Sent
                  </span>
                </div>
              ))}
            </div>
          )}

          {sellers.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-500 mb-2">SELLERS</p>
              {sellers.map((party, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium">{party.name}</p>
                    <p className="text-sm text-gray-500">{party.email}</p>
                  </div>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                    ✓ Link Sent
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* What Happens Next */}
      <Card className="mb-6 border-amber-200 bg-amber-50">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-5 h-5 text-amber-600" />
            <h2 className="font-semibold text-amber-900">What Happens Next</h2>
          </div>
          <ol className="space-y-3 text-sm text-amber-900">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-amber-200 rounded-full flex items-center justify-center text-xs font-bold">1</span>
              <span>Each party receives an email with a secure link to their portal</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-amber-200 rounded-full flex items-center justify-center text-xs font-bold">2</span>
              <span>They fill out their required information (typically 5-10 minutes each)</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-amber-200 rounded-full flex items-center justify-center text-xs font-bold">3</span>
              <span><strong>You'll receive an email</strong> when all parties have submitted</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-amber-200 rounded-full flex items-center justify-center text-xs font-bold">4</span>
              <span>Return here to review their submissions and file with FinCEN</span>
            </li>
          </ol>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button variant="outline" className="flex-1" asChild>
          <Link href="/app/dashboard">
            <Home className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
        </Button>
        
        <Button
          className="flex-1 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700"
          onClick={onViewStatus}
        >
          View Party Status
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>

      <p className="text-center text-sm text-gray-500 mt-6">
        You can safely close this page. We'll email you when all parties complete their submissions.
      </p>
    </div>
  );
}
```

**Step B: Add import to rrer-questionnaire.tsx**

Find imports section and add:
```typescript
import { LinksSentConfirmation } from "@/components/wizard/LinksSentConfirmation"
```

**Step C: Add state variable**

Find where other `useState` are declared and add:
```typescript
const [showLinksSentConfirmation, setShowLinksSentConfirmation] = useState(false)
```

**Step D: Update handleSendPartyLinks**

Find `handleSendPartyLinks` function. Find where it calls `setCollectionStep("monitor-progress")`.

Add this line RIGHT BEFORE it:
```typescript
setShowLinksSentConfirmation(true)
```

**Step E: Add conditional render**

Find where `collectionStep === "party-setup"` renders. Wrap the content:

```tsx
{/* Links Sent Confirmation */}
{collectionStep === "party-setup" && showLinksSentConfirmation && (
  <LinksSentConfirmation
    sellers={partySetup.sellers}
    buyers={partySetup.buyers}
    propertyAddress={`${collection.propertyAddress?.street || ''}, ${collection.propertyAddress?.city || ''}`}
    onViewStatus={() => {
      setShowLinksSentConfirmation(false)
      setCollectionStep("monitor-progress")
    }}
  />
)}

{/* Normal party-setup - only when NOT showing confirmation */}
{collectionStep === "party-setup" && !showLinksSentConfirmation && (
  // ... existing party-setup JSX ...
)}
```

### 2.5 Build and Deploy

```bash
cd web
npm run build  # Check for errors
git add .
git commit -m "fix: properly wire LinksSentConfirmation into wizard"
git push
```

---

# TASK 3: Simplify Dashboard (#7)

## Problem
The dashboard is overwhelming. Need a cleaner, simpler layout.

## Current State Analysis

First, show me the current dashboard:
```bash
cat web/app/\(app\)/app/dashboard/page.tsx
```

## Simplification Strategy

### 3.1 Design Goals

- **Reduce cognitive load** — fewer boxes, cleaner hierarchy
- **Action-oriented** — what do I need to do NOW?
- **Progressive disclosure** — summary first, details on demand

### 3.2 Simplified Layout

Replace complex dashboard with this clean structure:

```
┌─────────────────────────────────────────────────────────────┐
│  Welcome back, [Name]                    [+ New Report]     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🔔 ACTION REQUIRED (if any)                         │   │
│  │   • 2 reports awaiting party responses              │   │
│  │   • 1 report ready to file                          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │    12    │  │    3     │  │    2     │  │    45    │   │
│  │  Active  │  │ Awaiting │  │  Ready   │  │  Filed   │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│                                                             │
│  RECENT ACTIVITY                                            │
│  ────────────────────────────────────────────────────────  │
│  • 123 Main St — Filed 2 hours ago                         │
│  • 456 Oak Ave — Awaiting 2/3 parties                      │
│  • 789 Pine Rd — Ready to file                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 3.3 Implementation

Create simplified dashboard:

```tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Plus, 
  FileText, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  ArrowRight,
  Bell
} from "lucide-react";
import { useDemo } from "@/hooks/use-demo";

interface DashboardStats {
  active: number;
  awaiting_parties: number;
  ready_to_file: number;
  filed: number;
}

interface RecentReport {
  id: string;
  property_address: string;
  status: string;
  updated_at: string;
  parties_submitted?: number;
  parties_total?: number;
}

export default function DashboardPage() {
  const { user } = useDemo();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentReports, setRecentReports] = useState<RecentReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch dashboard data
    const fetchData = async () => {
      try {
        // Replace with your actual API calls
        const [statsRes, reportsRes] = await Promise.all([
          fetch('/api/dashboard/stats'),
          fetch('/api/reports?limit=5&sort=updated_at:desc')
        ]);
        
        if (statsRes.ok) setStats(await statsRes.json());
        if (reportsRes.ok) {
          const data = await reportsRes.json();
          setRecentReports(data.reports || []);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const actionItems = [
    stats?.awaiting_parties && stats.awaiting_parties > 0 && {
      message: `${stats.awaiting_parties} report${stats.awaiting_parties > 1 ? 's' : ''} awaiting party responses`,
      href: "/app/reports?status=collecting",
      color: "amber"
    },
    stats?.ready_to_file && stats.ready_to_file > 0 && {
      message: `${stats.ready_to_file} report${stats.ready_to_file > 1 ? 's' : ''} ready to file`,
      href: "/app/reports?status=ready_to_file",
      color: "green"
    }
  ].filter(Boolean);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'filed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'ready_to_file': return <AlertCircle className="w-4 h-4 text-blue-500" />;
      case 'collecting': 
      case 'awaiting_parties': return <Clock className="w-4 h-4 text-amber-500" />;
      default: return <FileText className="w-4 h-4 text-gray-400" />;
    }
  };

  const formatStatus = (report: RecentReport) => {
    switch (report.status) {
      case 'filed': return 'Filed';
      case 'ready_to_file': return 'Ready to file';
      case 'collecting':
      case 'awaiting_parties': 
        return `Awaiting ${report.parties_submitted || 0}/${report.parties_total || 0} parties`;
      case 'exempt': return 'Exempt';
      default: return 'In progress';
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-48"></div>
          <div className="grid grid-cols-4 gap-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Here's what's happening with your reports
          </p>
        </div>
        <Button asChild className="bg-gradient-to-r from-teal-500 to-cyan-600">
          <Link href="/app/reports/new">
            <Plus className="w-4 h-4 mr-2" />
            New Report
          </Link>
        </Button>
      </div>

      {/* Action Required Banner */}
      {actionItems.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Bell className="w-5 h-5 text-amber-600" />
              <span className="font-semibold text-amber-900">Action Required</span>
            </div>
            <ul className="space-y-2">
              {actionItems.map((item: any, i) => (
                <li key={i}>
                  <Link 
                    href={item.href}
                    className="text-amber-800 hover:text-amber-900 flex items-center gap-2 group"
                  >
                    <span>• {item.message}</span>
                    <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition" />
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition cursor-pointer" onClick={() => {}}>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-gray-900">{stats?.active || 0}</p>
            <p className="text-sm text-gray-500 mt-1">Active</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition cursor-pointer border-amber-200">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-amber-600">{stats?.awaiting_parties || 0}</p>
            <p className="text-sm text-gray-500 mt-1">Awaiting Parties</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition cursor-pointer border-blue-200">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-blue-600">{stats?.ready_to_file || 0}</p>
            <p className="text-sm text-gray-500 mt-1">Ready to File</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition cursor-pointer border-green-200">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-green-600">{stats?.filed || 0}</p>
            <p className="text-sm text-gray-500 mt-1">Filed</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
          <Link href="/app/reports" className="text-sm text-teal-600 hover:text-teal-700">
            View all →
          </Link>
        </div>
        
        {recentReports.length > 0 ? (
          <div className="space-y-2">
            {recentReports.map(report => (
              <Link
                key={report.id}
                href={`/app/reports/${report.id}/wizard`}
                className="flex items-center justify-between p-4 bg-white border rounded-lg hover:border-teal-300 hover:shadow-sm transition"
              >
                <div className="flex items-center gap-3">
                  {getStatusIcon(report.status)}
                  <div>
                    <p className="font-medium text-gray-900">
                      {report.property_address || 'No address'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatStatus(report)}
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </Link>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No reports yet</p>
              <Button asChild className="mt-4" variant="outline">
                <Link href="/app/reports/new">Create your first report</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
```

### 3.4 Key Simplifications Made

| Before | After |
|--------|-------|
| Multiple card sections | Single flow layout |
| Detailed stats everywhere | 4 key numbers only |
| Complex filing summary | Simple "Recent Activity" list |
| Awaiting parties separate | Integrated into action banner |
| Overwhelming at first glance | Scannable in 3 seconds |

### 3.5 Deploy

```bash
git add .
git commit -m "feat: simplify dashboard for cleaner UX"
git push
```

---

# Summary

Run these in order:
1. **Task 1** — Diagnose and fix email links
2. **Task 2** — Wire up LinksSentConfirmation properly
3. **Task 3** — Replace dashboard with simplified version

After each, build and test locally before pushing.
