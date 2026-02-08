# Triple Shark Kill: Email Wiring + Client Permissions + Landing Page Cleanup

## Overview

Three coordinated changes to complete the client-driven flow:

1. **Shark A: Wire Email Notifications** — Events are logged but emails aren't sent
2. **Shark B: Client User Permissions** — Open wizard access to escrow officers
3. **Shark C: Landing Page Cleanup** — Remove FNF references + claims→facts

---

## SHARK A: Wire Email Notifications

### Problem
Notification events are being logged to `notification_events` table, but actual emails aren't being sent. The email functions exist but aren't called.

### Investigation First

Run this to see what's already wired:
```bash
# Check if send_party_submitted_notification is called anywhere
grep -rn "send_party_submitted_notification" api/app/ --include="*.py"

# Check if filing notification functions exist
grep -rn "send_filing_accepted\|send_filing_rejected\|send_filing_submitted" api/app/ --include="*.py"

# Check party submit handler
grep -n "status.*submitted\|party.*submit" api/app/routes/parties.py | head -20
```

### A.1 Wire Party Submission Notifications

**File:** `api/app/routes/parties.py`

Find the party submit endpoint (likely `POST /parties/{token}/submit` or similar).

After the party status is updated to `submitted`, add:
```python
from app.services.email_service import send_party_submitted_notification

# After: party.status = "submitted"
# After: db.commit()

# Check if all parties are complete
all_parties = db.query(ReportParty).filter(ReportParty.report_id == report.id).all()
all_complete = all(p.status == "submitted" for p in all_parties)

# Send notification to staff
try:
    staff_email = settings.STAFF_NOTIFICATION_EMAIL or "staff@fincenclear.com"
    send_party_submitted_notification(
        staff_email=staff_email,
        party_name=party.display_name,
        party_role=party.party_role,
        report_id=str(report.id),
        property_address=_get_property_address(report),
        all_complete=all_complete
    )
except Exception as e:
    # Log but don't fail the request
    logger.error(f"Failed to send party submitted notification: {e}")

# If report has initiated_by user, notify them too
if report.initiated_by and report.initiated_by.email:
    try:
        send_party_submitted_notification(
            staff_email=report.initiated_by.email,
            party_name=party.display_name,
            party_role=party.party_role,
            report_id=str(report.id),
            property_address=_get_property_address(report),
            all_complete=all_complete
        )
    except Exception as e:
        logger.error(f"Failed to send initiator notification: {e}")
```

Add helper if not exists:
```python
def _get_property_address(report: Report) -> str:
    """Extract property address string from report wizard_data."""
    try:
        addr = report.wizard_data.get("collection", {}).get("propertyAddress", {})
        street = addr.get("street", "")
        city = addr.get("city", "")
        state = addr.get("state", "")
        return f"{street}, {city}, {state}".strip(", ")
    except:
        return "Unknown Property"
```

### A.2 Wire Filing Status Notifications

**File:** `api/app/services/filing_lifecycle.py`

#### In `mark_accepted()`:
```python
from app.services.email_service import send_filing_accepted_notification

def mark_accepted(db: Session, report_id: UUID, receipt_id: str):
    """Mark filing as accepted and notify stakeholders."""
    submission = get_submission(db, report_id)
    submission.status = "accepted"
    submission.receipt_id = receipt_id
    submission.accepted_at = datetime.utcnow()
    
    report = submission.report
    report.receipt_id = receipt_id
    report.filed_at = datetime.utcnow()
    report.filing_status = "filed_live"
    report.status = "filed"
    
    db.commit()
    
    # Send notifications
    try:
        send_filing_accepted_notification(
            db=db,
            report=report,
            bsa_id=receipt_id
        )
    except Exception as e:
        logger.error(f"Failed to send filing accepted notification: {e}")
    
    # Existing audit log...
```

#### In `mark_rejected()`:
```python
from app.services.email_service import send_filing_rejected_notification

def mark_rejected(db: Session, report_id: UUID, code: str, message: str):
    """Mark filing as rejected and notify stakeholders urgently."""
    submission = get_submission(db, report_id)
    submission.status = "rejected"
    submission.rejection_code = code
    submission.rejection_message = message
    
    report = submission.report
    report.filing_status = "rejected"
    
    db.commit()
    
    # Send URGENT notifications
    try:
        send_filing_rejected_notification(
            db=db,
            report=report,
            code=code,
            message=message
        )
    except Exception as e:
        logger.error(f"Failed to send filing rejected notification: {e}")
```

### A.3 Add Missing Email Functions (if not exist)

**File:** `api/app/services/email_service.py`

Check if these functions exist. If not, add them:
```python
def send_filing_accepted_notification(db: Session, report: Report, bsa_id: str):
    """Send filing accepted notification to initiator and staff."""
    property_address = _get_property_address_from_report(report)
    
    # Notify initiator (escrow officer)
    if report.initiated_by and report.initiated_by.email:
        send_email(
            to_email=report.initiated_by.email,
            subject=f"✅ FinCEN Filing Complete: {property_address}",
            html=f"""
            <h2 style="color: #059669;">Filing Accepted</h2>
            <p>Your FinCEN Real Estate Report has been accepted.</p>
            <div style="background: #ecfdf5; padding: 16px; border-left: 4px solid #10b981; margin: 16px 0;">
                <p><strong>Property:</strong> {property_address}</p>
                <p><strong>BSA ID:</strong> <code>{bsa_id}</code></p>
                <p><strong>Filed:</strong> {datetime.utcnow().strftime('%B %d, %Y')}</p>
            </div>
            <p>Save this BSA ID for your records.</p>
            """
        )
    
    # Notify staff
    staff_email = settings.STAFF_NOTIFICATION_EMAIL
    if staff_email:
        send_email(
            to_email=staff_email,
            subject=f"Filing Accepted: {property_address} — BSA ID: {bsa_id}",
            html=f"""
            <p>Filing accepted for {report.company.name if report.company else 'Unknown Company'}</p>
            <p><strong>Property:</strong> {property_address}</p>
            <p><strong>BSA ID:</strong> {bsa_id}</p>
            """
        )


def send_filing_rejected_notification(db: Session, report: Report, code: str, message: str):
    """Send URGENT filing rejected notification."""
    property_address = _get_property_address_from_report(report)
    
    # Notify initiator
    if report.initiated_by and report.initiated_by.email:
        send_email(
            to_email=report.initiated_by.email,
            subject=f"⚠️ Action Required: Filing Rejected — {property_address}",
            html=f"""
            <h2 style="color: #dc2626;">Filing Rejected</h2>
            <p>Your FinCEN filing was rejected and requires attention.</p>
            <div style="background: #fef2f2; padding: 16px; border-left: 4px solid #ef4444; margin: 16px 0;">
                <p><strong>Property:</strong> {property_address}</p>
                <p><strong>Error Code:</strong> {code}</p>
                <p><strong>Reason:</strong> {message}</p>
            </div>
            <p>Please review and resubmit.</p>
            """
        )
    
    # Notify staff urgently
    staff_email = settings.STAFF_NOTIFICATION_EMAIL
    if staff_email:
        send_email(
            to_email=staff_email,
            subject=f"🚨 Filing Rejected: {property_address} — Code: {code}",
            html=f"""
            <p><strong>Company:</strong> {report.company.name if report.company else 'Unknown'}</p>
            <p><strong>Property:</strong> {property_address}</p>
            <p><strong>Error:</strong> {code} — {message}</p>
            """
        )


def _get_property_address_from_report(report: Report) -> str:
    """Extract property address from report."""
    try:
        addr = report.wizard_data.get("collection", {}).get("propertyAddress", {})
        parts = [addr.get("street", ""), addr.get("city", ""), addr.get("state", "")]
        return ", ".join(p for p in parts if p)
    except:
        return "Unknown Property"
```

### A.4 Add Config Variable

**File:** `api/app/config.py`
```python
# Notification recipients
STAFF_NOTIFICATION_EMAIL: str = os.getenv("STAFF_NOTIFICATION_EMAIL", "staff@fincenclear.com")
ADMIN_NOTIFICATION_EMAIL: str = os.getenv("ADMIN_NOTIFICATION_EMAIL", "admin@fincenclear.com")
```

---

## SHARK B: Client User Permissions

### Problem
Client users (`client_user`) cannot access the wizard or create reports — only staff can.

### B.1 Update Route Guards

**File:** `api/app/routes/reports.py`

Find each endpoint and update the role check:
```python
# Pattern to find:
require_role(current_user, ["pct_staff", "pct_admin"])

# Replace with:
require_role(current_user, ["pct_staff", "pct_admin", "client_admin", "client_user"])
```

**Endpoints to update:**

| Endpoint | Add Roles | Ownership Check |
|----------|-----------|-----------------|
| `POST /reports` | client_admin, client_user | Set company_id from user |
| `GET /reports/{id}` | client_admin, client_user | Must be own company |
| `PATCH /reports/{id}` | client_admin, client_user | Must be own company |
| `GET /reports/{id}/wizard-data` | client_admin, client_user | Must be own company |
| `PATCH /reports/{id}/wizard-data` | client_admin, client_user | Must be own company |
| `POST /reports/{id}/party-links` | client_admin, client_user | Must be own company |
| `POST /reports/{id}/file` | client_admin, client_user | Must be own company |

### B.2 Add Ownership Check Helper

**File:** `api/app/routes/reports.py` (or a shared utils file)
```python
def require_report_access(current_user: User, report: Report):
    """
    Verify user can access this report.
    Staff/Admin can access all. Clients can only access their company's reports.
    """
    if current_user.role in ["pct_staff", "pct_admin", "coo"]:
        return True  # Staff can access all
    
    if current_user.role in ["client_admin", "client_user"]:
        if report.company_id != current_user.company_id:
            raise HTTPException(
                status_code=403,
                detail="You can only access your company's reports"
            )
        return True
    
    raise HTTPException(status_code=403, detail="Insufficient permissions")
```

### B.3 Update Report Creation

**File:** `api/app/routes/reports.py`

When a client creates a report, set `initiated_by_user_id`:
```python
@router.post("/reports")
async def create_report(
    data: ReportCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_role(current_user, ["pct_staff", "pct_admin", "client_admin", "client_user"])
    
    # For client users, force company_id to their own company
    if current_user.role in ["client_admin", "client_user"]:
        company_id = current_user.company_id
    else:
        company_id = data.company_id  # Staff can specify
    
    report = Report(
        id=uuid.uuid4(),
        company_id=company_id,
        status="draft",
        wizard_data=data.wizard_data or {},
        initiated_by_user_id=current_user.id,  # Track who created it
        auto_file_enabled=True,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    
    db.add(report)
    db.commit()
    
    return report
```

### B.4 Update Frontend Navigation

**File:** `web/lib/navigation.ts`

Add wizard access for client roles:
```typescript
// Find the navigation config and add these items for client roles:

{
  name: "New Report",
  href: "/app/reports/new",
  icon: PlusCircle,
  roles: ["client_admin", "client_user"],
},
{
  name: "My Reports",
  href: "/app/reports",
  icon: FileText,
  roles: ["client_admin", "client_user"],
},
```

### B.5 Create Client Reports List Page (if not exists)

**File:** `web/app/(app)/app/reports/page.tsx`
```tsx
"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlusCircle } from "lucide-react";
import Link from "next/link";

interface Report {
  id: string;
  status: string;
  filing_status?: string;
  receipt_id?: string;
  created_at: string;
  wizard_data?: {
    collection?: {
      propertyAddress?: {
        street?: string;
        city?: string;
        state?: string;
      };
    };
  };
}

export default function ClientReportsPage() {
  const { user } = useSession();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const res = await fetch("/api/reports?my_company=true");
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports || data);
      }
    } catch (error) {
      console.error("Failed to fetch reports:", error);
    } finally {
      setLoading(false);
    }
  };

  const getPropertyAddress = (report: Report) => {
    const addr = report.wizard_data?.collection?.propertyAddress;
    if (!addr) return "No address";
    return `${addr.street || ""}, ${addr.city || ""} ${addr.state || ""}`.trim();
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      draft: "bg-gray-100 text-gray-700",
      collecting: "bg-blue-100 text-blue-700",
      ready_to_file: "bg-yellow-100 text-yellow-700",
      filed: "bg-green-100 text-green-700",
      exempt: "bg-purple-100 text-purple-700",
    };
    return <Badge className={colors[status] || "bg-gray-100"}>{status}</Badge>;
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">My Reports</h1>
        <Link href="/app/reports/new">
          <Button>
            <PlusCircle className="w-4 h-4 mr-2" />
            New Report
          </Button>
        </Link>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : reports.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500 mb-4">No reports yet</p>
            <Link href="/app/reports/new">
              <Button>Start Your First Report</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <Card key={report.id}>
              <CardContent className="py-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">{getPropertyAddress(report)}</p>
                    <p className="text-sm text-gray-500">
                      Created {new Date(report.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    {getStatusBadge(report.status)}
                    {report.receipt_id && (
                      <span className="text-sm font-mono text-green-600">
                        {report.receipt_id}
                      </span>
                    )}
                    <Link href={`/app/reports/${report.id}/wizard`}>
                      <Button variant="outline" size="sm">
                        {report.status === "draft" ? "Continue" : "View"}
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## SHARK C: Landing Page Cleanup

### Problem
Landing page contains FNF references and unverifiable marketing claims.

### C.1 Remove FNF References

**File:** `web/app/page.tsx` (or wherever the landing page lives)

**Find and remove/replace:**
```
FIND:
Our platform is built on the FNF compliance flowchart—the industry standard—ensuring
you're aligned with how the largest title underwriter interprets the regulation.

REPLACE WITH:
Our platform implements the complete FinCEN Real Estate Report determination logic—all 
23 entity exemptions, 4 trust exemptions, and 8 transaction exemptions—ensuring every 
filing decision is documented and defensible.
```
```
FIND:
100%
FNF Flowchart Coverage

REPLACE WITH:
35
Exemption Types Covered
```

**Search entire codebase:**
```bash
grep -rn "FNF" web/ --include="*.tsx" --include="*.ts"
```

Remove ALL instances.

### C.2 Claims → Facts Rewrites

**Hero section:**
```
FIND:
The most comprehensive compliance platform for title companies.

REPLACE WITH:
Complete FinCEN Real Estate Reporting — from determination through filing.
```

**Trust banner:**
```
FIND:
Trusted by title companies across California

REPLACE WITH:
Built for California title companies
```

**CTA section:**
```
FIND:
Join hundreds of title companies who trust FinClear

REPLACE WITH:
Get started with FinClear
```

### C.3 Remove/Verify Stats

**Find these in the stats section and handle:**

| Stat | Action |
|------|--------|
| "6 Office Locations" | REMOVE (unless verifiable) |
| "1000s Transactions Processed" | REMOVE (unless verifiable) |
| "100% FNF Flowchart Coverage" | Already handled above |

**Replace stats block with:**
```tsx
<div className="grid grid-cols-4 gap-8">
  <Stat number="35" label="Exemption Types" />
  <Stat number="5" label="Year Record Storage" />
  <Stat number="10" label="Minute Filing Time" />
  <Stat number="SOC 2" label="Security Certified" />
</div>
```

### C.4 Remove Fake Testimonial

**Find and REMOVE the Sarah Mitchell / Golden State Title Company testimonial block entirely.**

If you want a placeholder:
```tsx
<div className="bg-gray-50 p-8 rounded-lg text-center">
  <p className="text-gray-600">
    Ready to see how it works? 
    <a href="#get-started" className="text-blue-600 font-medium ml-1">
      Schedule a demo
    </a>
  </p>
</div>
```

### C.5 Verification Checklist

After changes, run:
```bash
# Should return 0 results
grep -rn "FNF" web/ --include="*.tsx" --include="*.ts"
grep -rn "most comprehensive" web/ --include="*.tsx" --include="*.ts"
grep -rn "hundreds of" web/ --include="*.tsx" --include="*.ts"
grep -rn "1000s\|thousands" web/ --include="*.tsx" --include="*.ts"
grep -rn "Sarah Mitchell\|Golden State Title" web/ --include="*.tsx" --include="*.ts"
```

---

## Verification Test Script

After all changes, run the integration test:
```bash
python -m app.scripts.test_client_driven_flow --verbose
```

Then manually verify:
1. Log in as `client_user` (e.g., `user@demotitle.com`)
2. Navigate to `/app/reports/new` — should be accessible
3. Create a report, complete wizard, add parties
4. Check email logs for notifications
5. Visit landing page — no FNF, no inflated claims

---

## Files Changed Summary

### Shark A: Email Wiring
| File | Change |
|------|--------|
| `api/app/routes/parties.py` | Wire `send_party_submitted_notification()` |
| `api/app/services/filing_lifecycle.py` | Wire `send_filing_accepted/rejected_notification()` |
| `api/app/services/email_service.py` | Add filing notification functions if missing |
| `api/app/config.py` | Add `STAFF_NOTIFICATION_EMAIL` |

### Shark B: Client Permissions
| File | Change |
|------|--------|
| `api/app/routes/reports.py` | Update role checks, add ownership validation |
| `web/lib/navigation.ts` | Add client report routes |
| `web/app/(app)/app/reports/page.tsx` | New client reports list page |

### Shark C: Landing Page
| File | Change |
|------|--------|
| `web/app/page.tsx` | Remove FNF, rewrite claims, remove fake stats/testimonial |

---

## KilledSharks Entry

After completion, add to `docs/KilledSharks-2.md`:
```markdown
### 59. Triple Shark Kill: Emails + Permissions + Landing Page ✅

**Date:** February 8, 2026

**Problem:** 
- Email notification events logged but not sent
- Client users couldn't access wizard
- Landing page had FNF references and unverifiable claims

**Solution:**
- **Shark A:** Wired `send_party_submitted_notification()` in party submit handler, added filing accepted/rejected notifications in lifecycle
- **Shark B:** Updated route guards to allow client_user/client_admin, added ownership checks, created client reports list page
- **Shark C:** Removed all FNF references, rewrote marketing claims to facts, removed fake testimonial

**Files Modified:**
- `api/app/routes/parties.py` — Email wiring
- `api/app/services/filing_lifecycle.py` — Filing notifications
- `api/app/services/email_service.py` — New notification functions
- `api/app/routes/reports.py` — Permission updates
- `web/lib/navigation.ts` — Client navigation
- `web/app/(app)/app/reports/page.tsx` — New client reports page
- `web/app/page.tsx` — Landing page cleanup

**Status:** ✅ Killed (TRIPLE SHARK 🦈🦈🦈)
```