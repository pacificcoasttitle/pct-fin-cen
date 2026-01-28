# CURSOR PROMPT: Demo Data & Dashboard Fixes - Heavy Artillery

## 🦈 MISSION BRIEF

Based on our investigation, we have **critical gaps** that will break the demo. This prompt fixes them ALL.

**Investigation findings:** See `INVESTIGATION_REPORT.md` for full details.

---

## STRIKE 1: Fix Seed Data - Complete Linked Chains

### Problem
- SubmissionRequests exist but are NOT linked to Reports
- Reports exist but have no `company_id`
- No filed Reports with `receipt_id`
- No complete lifecycle demo data

### File: `api/app/services/demo_seed.py`

**Replace the entire file with this comprehensive seed:**

```python
"""
Demo Seed Service - Complete Data Chains
Every scenario is fully linked and traceable.
"""

from datetime import datetime, date, timedelta
from uuid import uuid4
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.models.company import Company
from app.models.user import User
from app.models.submission_request import SubmissionRequest
from app.models.report import Report
from app.models.report_party import ReportParty
from app.models.party_link import PartyLink


def reset_demo_data(db: Session):
    """Clear all demo data in correct FK order."""
    print("🗑️ Clearing existing demo data...")
    
    # Delete in FK dependency order
    db.execute(text("DELETE FROM party_links"))
    db.execute(text("DELETE FROM report_parties"))
    db.execute(text("DELETE FROM reports"))
    db.execute(text("DELETE FROM submission_requests"))
    # Don't delete companies/users - they're needed for auth
    
    db.commit()
    print("✅ Demo data cleared")


def seed_demo_data(db: Session):
    """
    Create comprehensive demo data with COMPLETE linked chains.
    
    Scenarios:
    1. Fresh pending request (no report yet)
    2. In-progress: Request + Report in determination
    3. Collecting: Request + Report + Parties (1/2 submitted)
    4. Ready to file: Request + Report + All parties submitted
    5. FILED: Complete chain with receipt ID
    6. Exempt: Request + Report marked exempt
    """
    
    print("🌱 Seeding comprehensive demo data...")
    
    # =========================================================================
    # GET OR CREATE COMPANIES
    # =========================================================================
    
    # FinClear internal company (for staff/admin users)
    finclear_company = db.query(Company).filter(Company.code == "FINCLEAR").first()
    if not finclear_company:
        finclear_company = db.query(Company).filter(Company.code == "PCT").first()
    if not finclear_company:
        finclear_company = Company(
            id=str(uuid4()),
            name="FinClear Solutions",
            code="FINCLEAR",
            is_active=True,
        )
        db.add(finclear_company)
        db.flush()
        print(f"   🏢 Created FinClear company: {finclear_company.id}")
    
    # Demo client company
    demo_company = db.query(Company).filter(Company.code == "DEMO").first()
    if not demo_company:
        demo_company = Company(
            id=str(uuid4()),
            name="Pacific Coast Title",
            code="DEMO",
            is_active=True,
        )
        db.add(demo_company)
        db.flush()
        print(f"   🏢 Created Demo company: {demo_company.id}")
    
    # =========================================================================
    # GET OR CREATE USERS
    # =========================================================================
    
    # FinClear Staff
    staff_user = db.query(User).filter(User.email == "staff@finclear.com").first()
    if not staff_user:
        staff_user = db.query(User).filter(User.role == "pct_staff").first()
    if not staff_user:
        staff_user = User(
            id=str(uuid4()),
            email="staff@finclear.com",
            name="Sarah Mitchell",
            company_id=finclear_company.id,
            role="pct_staff",
            is_active=True,
        )
        db.add(staff_user)
        db.flush()
    
    # FinClear Admin
    admin_user = db.query(User).filter(User.email == "admin@finclear.com").first()
    if not admin_user:
        admin_user = db.query(User).filter(User.role == "pct_admin").first()
    if not admin_user:
        admin_user = User(
            id=str(uuid4()),
            email="admin@finclear.com",
            name="Michael Chen",
            company_id=finclear_company.id,
            role="pct_admin",
            is_active=True,
        )
        db.add(admin_user)
        db.flush()
    
    # Client Admin
    client_admin = db.query(User).filter(User.email == "client@demo.com").first()
    if not client_admin:
        client_admin = db.query(User).filter(User.role == "client_admin").first()
    if not client_admin:
        client_admin = User(
            id=str(uuid4()),
            email="client@demo.com",
            name="Jennifer Walsh",
            company_id=demo_company.id,
            role="client_admin",
            is_active=True,
        )
        db.add(client_admin)
        db.flush()
    
    db.flush()
    
    # =========================================================================
    # SCENARIO 1: Fresh Pending Request (No Report Yet)
    # Client just submitted, staff hasn't started wizard
    # =========================================================================
    
    req1_id = str(uuid4())
    request_1 = SubmissionRequest(
        id=req1_id,
        company_id=demo_company.id,
        requested_by_user_id=client_admin.id,
        status="pending",
        property_address={
            "street": "742 Evergreen Terrace",
            "city": "Springfield",
            "state": "CA",
            "zip": "90210",
            "county": "Los Angeles"
        },
        purchase_price_cents=85000000,  # $850,000
        expected_closing_date=date.today() + timedelta(days=14),
        escrow_number="ESC-2026-1001",
        financing_type="cash",
        buyer_name="Acme Investments LLC",
        buyer_email="contact@acmeinvest.com",
        buyer_type="entity",
        seller_name="Homer Simpson",
        seller_email="homer@springfield.net",
        notes="Urgent - client needs fast turnaround",
        created_at=datetime.utcnow() - timedelta(hours=3),
    )
    db.add(request_1)
    print(f"   📋 Scenario 1: Pending request - 742 Evergreen Terrace")
    
    # =========================================================================
    # SCENARIO 2: In Progress - Determination Phase
    # Staff started wizard, working through determination questions
    # =========================================================================
    
    req2_id = str(uuid4())
    report2_id = str(uuid4())
    
    request_2 = SubmissionRequest(
        id=req2_id,
        company_id=demo_company.id,
        requested_by_user_id=client_admin.id,
        status="in_progress",
        assigned_to_user_id=staff_user.id,
        property_address={
            "street": "221B Baker Street",
            "city": "Los Angeles",
            "state": "CA",
            "zip": "90028",
        },
        purchase_price_cents=72500000,  # $725,000
        expected_closing_date=date.today() + timedelta(days=10),
        escrow_number="ESC-2026-0998",
        financing_type="cash",
        buyer_name="Watson Enterprises LLC",
        buyer_email="jwatson@watson-ent.com",
        buyer_type="entity",
        seller_name="Sherlock Holdings Trust",
        seller_email="trustee@sherlockholdings.com",
        report_id=report2_id,  # LINKED!
        created_at=datetime.utcnow() - timedelta(days=1),
    )
    db.add(request_2)
    
    report_2 = Report(
        id=report2_id,
        submission_request_id=req2_id,  # LINKED BACK!
        company_id=demo_company.id,
        created_by_user_id=staff_user.id,
        property_address_text="221B Baker Street, Los Angeles, CA 90028",
        closing_date=date.today() + timedelta(days=10),
        filing_deadline=date.today() + timedelta(days=40),
        status="draft",
        wizard_step=4,
        wizard_data={
            "phase": "determination",
            "determinationStep": "buyer-type",
            "determination": {
                "isResidential": "yes",
                "isNonFinanced": "yes",
            },
            "collection": {
                "purchasePrice": 725000,
                "escrowNumber": "ESC-2026-0998",
            }
        },
        created_at=datetime.utcnow() - timedelta(hours=6),
    )
    db.add(report_2)
    print(f"   📊 Scenario 2: In determination - 221B Baker Street")
    
    # =========================================================================
    # SCENARIO 3: Collecting - Waiting on Parties (1 of 2 submitted)
    # Determination done, party links sent, seller submitted, buyer pending
    # =========================================================================
    
    req3_id = str(uuid4())
    report3_id = str(uuid4())
    party3_seller_id = str(uuid4())
    party3_buyer_id = str(uuid4())
    
    request_3 = SubmissionRequest(
        id=req3_id,
        company_id=demo_company.id,
        requested_by_user_id=client_admin.id,
        status="in_progress",
        assigned_to_user_id=staff_user.id,
        property_address={
            "street": "350 Fifth Avenue",
            "city": "New York",
            "state": "NY",
            "zip": "10118",
        },
        purchase_price_cents=125000000,  # $1,250,000
        expected_closing_date=date.today() + timedelta(days=7),
        escrow_number="ESC-2026-0995",
        financing_type="cash",
        buyer_name="Empire State Holdings LLC",
        buyer_email="legal@empireholdings.com",
        buyer_type="entity",
        seller_name="Margaret Chen",
        seller_email="mchen@email.com",
        report_id=report3_id,
        created_at=datetime.utcnow() - timedelta(days=3),
    )
    db.add(request_3)
    
    report_3 = Report(
        id=report3_id,
        submission_request_id=req3_id,
        company_id=demo_company.id,
        created_by_user_id=staff_user.id,
        property_address_text="350 Fifth Avenue, New York, NY 10118",
        closing_date=date.today() + timedelta(days=7),
        filing_deadline=date.today() + timedelta(days=37),
        status="collecting",
        wizard_step=8,
        determination={
            "final_result": "reportable",
            "reason": "Non-financed transfer to entity, no exemptions apply",
            "buyer_type": "entity",
        },
        wizard_data={
            "phase": "collection",
            "collectionStep": "monitor-progress",
        },
        created_at=datetime.utcnow() - timedelta(days=2),
    )
    db.add(report_3)
    
    # Seller - SUBMITTED
    party3_seller = ReportParty(
        id=party3_seller_id,
        report_id=report3_id,
        party_role="transferor",
        entity_type="individual",
        display_name="Margaret Chen",
        email="mchen@email.com",
        status="submitted",
        submitted_at=datetime.utcnow() - timedelta(hours=12),
        party_data={
            "first_name": "Margaret",
            "last_name": "Chen",
            "date_of_birth": "1968-03-15",
            "ssn_last_four": "6789",
            "citizenship": "us_citizen",
            "certified": True,
        },
    )
    db.add(party3_seller)
    
    # Buyer - PENDING (has link, hasn't submitted yet)
    party3_buyer = ReportParty(
        id=party3_buyer_id,
        report_id=report3_id,
        party_role="transferee",
        entity_type="entity",
        display_name="Empire State Holdings LLC",
        email="legal@empireholdings.com",
        status="pending",
        party_data={},
    )
    db.add(party3_buyer)
    
    # Active link for pending buyer
    buyer3_token = f"demo-buyer-{uuid4().hex[:8]}"
    link3_buyer = PartyLink(
        id=str(uuid4()),
        party_id=party3_buyer_id,
        token=buyer3_token,
        expires_at=datetime.utcnow() + timedelta(days=28),
        created_at=datetime.utcnow() - timedelta(days=2),
    )
    db.add(link3_buyer)
    
    print(f"   📊 Scenario 3: Collecting (1/2) - 350 Fifth Avenue")
    print(f"      🔗 Active buyer portal: /p/{buyer3_token}")
    
    # =========================================================================
    # SCENARIO 4: Ready to File - All Parties Submitted
    # All info collected, ready for staff to review and file
    # =========================================================================
    
    req4_id = str(uuid4())
    report4_id = str(uuid4())
    
    request_4 = SubmissionRequest(
        id=req4_id,
        company_id=demo_company.id,
        requested_by_user_id=client_admin.id,
        status="in_progress",
        assigned_to_user_id=staff_user.id,
        property_address={
            "street": "123 Ocean Drive",
            "city": "Miami Beach",
            "state": "FL",
            "zip": "33139",
        },
        purchase_price_cents=195000000,  # $1,950,000
        expected_closing_date=date.today() + timedelta(days=3),
        escrow_number="ESC-2026-0990",
        financing_type="cash",
        buyer_name="Sunshine Ventures LLC",
        buyer_email="acquisitions@sunshineventures.com",
        buyer_type="entity",
        seller_name="Carlos Rodriguez",
        seller_email="crodriguez@email.com",
        report_id=report4_id,
        created_at=datetime.utcnow() - timedelta(days=5),
    )
    db.add(request_4)
    
    report_4 = Report(
        id=report4_id,
        submission_request_id=req4_id,
        company_id=demo_company.id,
        created_by_user_id=staff_user.id,
        property_address_text="123 Ocean Drive, Miami Beach, FL 33139",
        closing_date=date.today() + timedelta(days=3),
        filing_deadline=date.today() + timedelta(days=33),
        status="ready_to_file",
        wizard_step=9,
        determination={
            "final_result": "reportable",
            "reason": "Non-financed transfer to entity, no exemptions apply",
            "buyer_type": "entity",
        },
        wizard_data={
            "phase": "collection",
            "collectionStep": "file-report",
        },
        created_at=datetime.utcnow() - timedelta(days=4),
    )
    db.add(report_4)
    
    # Seller - Submitted
    party4_seller = ReportParty(
        id=str(uuid4()),
        report_id=report4_id,
        party_role="transferor",
        entity_type="individual",
        display_name="Carlos Rodriguez",
        email="crodriguez@email.com",
        status="submitted",
        submitted_at=datetime.utcnow() - timedelta(days=2),
        party_data={
            "first_name": "Carlos",
            "last_name": "Rodriguez",
            "certified": True,
        },
    )
    db.add(party4_seller)
    
    # Buyer - Submitted
    party4_buyer = ReportParty(
        id=str(uuid4()),
        report_id=report4_id,
        party_role="transferee",
        entity_type="entity",
        display_name="Sunshine Ventures LLC",
        email="acquisitions@sunshineventures.com",
        status="submitted",
        submitted_at=datetime.utcnow() - timedelta(days=1),
        party_data={
            "entity_name": "Sunshine Ventures LLC",
            "ein": "87-1234567",
            "certified": True,
        },
    )
    db.add(party4_buyer)
    
    print(f"   📊 Scenario 4: Ready to file - 123 Ocean Drive")
    
    # =========================================================================
    # SCENARIO 5: FILED - Complete Success Story
    # Full lifecycle complete with receipt ID
    # =========================================================================
    
    req5_id = str(uuid4())
    report5_id = str(uuid4())
    
    request_5 = SubmissionRequest(
        id=req5_id,
        company_id=demo_company.id,
        requested_by_user_id=client_admin.id,
        status="completed",  # COMPLETED!
        assigned_to_user_id=staff_user.id,
        property_address={
            "street": "8842 Sunset Boulevard",
            "city": "West Hollywood",
            "state": "CA",
            "zip": "90069",
        },
        purchase_price_cents=275000000,  # $2,750,000
        expected_closing_date=date.today() - timedelta(days=10),
        escrow_number="ESC-2026-0985",
        financing_type="cash",
        buyer_name="Sunset Entertainment Group",
        buyer_email="legal@sunsetent.com",
        buyer_type="entity",
        seller_name="Jennifer Walsh",
        seller_email="jwalsh@email.com",
        report_id=report5_id,
        created_at=datetime.utcnow() - timedelta(days=15),
    )
    db.add(request_5)
    
    report_5 = Report(
        id=report5_id,
        submission_request_id=req5_id,
        company_id=demo_company.id,
        created_by_user_id=staff_user.id,
        property_address_text="8842 Sunset Boulevard, West Hollywood, CA 90069",
        closing_date=date.today() - timedelta(days=10),
        filing_deadline=date.today() + timedelta(days=20),
        status="filed",  # FILED!
        filing_status="filed_mock",
        receipt_id="BSA-20260118-A1B2C3D4",  # HAS RECEIPT!
        wizard_step=10,
        determination={
            "final_result": "reportable",
            "reason": "Non-financed transfer to entity, no exemptions apply",
            "buyer_type": "entity",
        },
        filed_at=datetime.utcnow() - timedelta(days=8),
        created_at=datetime.utcnow() - timedelta(days=14),
    )
    db.add(report_5)
    
    # Add parties for filed report
    party5_seller = ReportParty(
        id=str(uuid4()),
        report_id=report5_id,
        party_role="transferor",
        entity_type="individual",
        display_name="Jennifer Walsh",
        email="jwalsh@email.com",
        status="submitted",
        submitted_at=datetime.utcnow() - timedelta(days=10),
        party_data={"first_name": "Jennifer", "last_name": "Walsh", "certified": True},
    )
    db.add(party5_seller)
    
    party5_buyer = ReportParty(
        id=str(uuid4()),
        report_id=report5_id,
        party_role="transferee",
        entity_type="entity",
        display_name="Sunset Entertainment Group",
        email="legal@sunsetent.com",
        status="submitted",
        submitted_at=datetime.utcnow() - timedelta(days=9),
        party_data={"entity_name": "Sunset Entertainment Group", "certified": True},
    )
    db.add(party5_buyer)
    
    print(f"   ✅ Scenario 5: FILED - 8842 Sunset Boulevard (Receipt: BSA-20260118-A1B2C3D4)")
    
    # =========================================================================
    # SCENARIO 6: Exempt - No Filing Required
    # Completed determination, found exemption applies
    # =========================================================================
    
    req6_id = str(uuid4())
    report6_id = str(uuid4())
    
    request_6 = SubmissionRequest(
        id=req6_id,
        company_id=demo_company.id,
        requested_by_user_id=client_admin.id,
        status="completed",
        assigned_to_user_id=staff_user.id,
        property_address={
            "street": "500 Corporate Plaza",
            "city": "San Francisco",
            "state": "CA",
            "zip": "94105",
        },
        purchase_price_cents=450000000,  # $4,500,000
        expected_closing_date=date.today() - timedelta(days=5),
        escrow_number="ESC-2026-0980",
        financing_type="financed",  # Has mortgage!
        buyer_name="BigCorp Inc",
        buyer_email="legal@bigcorp.com",
        buyer_type="entity",
        seller_name="Previous Owner LLC",
        seller_email="sales@previousowner.com",
        report_id=report6_id,
        created_at=datetime.utcnow() - timedelta(days=10),
    )
    db.add(request_6)
    
    report_6 = Report(
        id=report6_id,
        submission_request_id=req6_id,
        company_id=demo_company.id,
        created_by_user_id=staff_user.id,
        property_address_text="500 Corporate Plaza, San Francisco, CA 94105",
        closing_date=date.today() - timedelta(days=5),
        status="exempt",  # EXEMPT!
        wizard_step=6,
        determination={
            "final_result": "exempt",
            "reason": "Transaction is financed - has mortgage from qualified lender",
            "exemption_type": "financed_transaction",
        },
        created_at=datetime.utcnow() - timedelta(days=9),
    )
    db.add(report_6)
    
    print(f"   ⚪ Scenario 6: Exempt (financed) - 500 Corporate Plaza")
    
    # =========================================================================
    # COMMIT ALL
    # =========================================================================
    
    db.commit()
    
    print("")
    print("✅ Demo seed complete!")
    print("")
    print("📊 Summary:")
    print(f"   • 6 SubmissionRequests (1 pending, 3 in_progress, 2 completed)")
    print(f"   • 5 Reports (1 draft, 1 collecting, 1 ready_to_file, 1 filed, 1 exempt)")
    print(f"   • All requests properly linked to their reports")
    print(f"   • 1 active party portal link for testing")
    print("")
    print("🔗 Demo portal link: /p/{buyer3_token}")
    
    return {
        "requests_created": 6,
        "reports_created": 5,
        "parties_created": 6,
        "filed_reports": 1,
        "exempt_reports": 1,
        "active_portal_link": f"/p/{buyer3_token}",
    }
```

---

## STRIKE 2: Wire Client Dashboard to Real Data

### Problem
`/app/dashboard` has 100% hardcoded stats

### File: `api/app/routes/submission_requests.py`

**Add stats endpoint:**

```python
@router.get("/stats")
async def get_submission_stats(
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user),  # When auth ready
):
    """Get submission statistics for dashboard."""
    
    # For demo, get demo company
    demo_company = db.query(Company).filter(Company.code == "DEMO").first()
    if not demo_company:
        return {
            "total": 0,
            "pending": 0,
            "in_progress": 0,
            "completed": 0,
            "this_month": 0,
        }
    
    company_id = demo_company.id
    
    # Get counts
    total = db.query(SubmissionRequest).filter(
        SubmissionRequest.company_id == company_id
    ).count()
    
    pending = db.query(SubmissionRequest).filter(
        SubmissionRequest.company_id == company_id,
        SubmissionRequest.status == "pending"
    ).count()
    
    in_progress = db.query(SubmissionRequest).filter(
        SubmissionRequest.company_id == company_id,
        SubmissionRequest.status == "in_progress"
    ).count()
    
    completed = db.query(SubmissionRequest).filter(
        SubmissionRequest.company_id == company_id,
        SubmissionRequest.status == "completed"
    ).count()
    
    # This month
    start_of_month = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    this_month = db.query(SubmissionRequest).filter(
        SubmissionRequest.company_id == company_id,
        SubmissionRequest.created_at >= start_of_month
    ).count()
    
    return {
        "total": total,
        "pending": pending,
        "in_progress": in_progress,
        "completed": completed,
        "this_month": this_month,
    }
```

### File: `web/lib/api.ts`

**Add API function:**

```typescript
export async function getSubmissionStats(): Promise<{
  total: number;
  pending: number;
  in_progress: number;
  completed: number;
  this_month: number;
}> {
  const response = await fetch(`${API_BASE_URL}/submission-requests/stats`);
  if (!response.ok) {
    throw new Error("Failed to fetch submission stats");
  }
  return response.json();
}
```

### File: `web/app/(app)/app/dashboard/page.tsx`

**Replace hardcoded stats with API call:**

```tsx
"use client";

import { useState, useEffect } from "react";
import { getSubmissionStats, getMyRequests } from "@/lib/api";
// ... other imports

export default function ClientDashboard() {
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    in_progress: 0,
    completed: 0,
    this_month: 0,
  });
  const [recentRequests, setRecentRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsData, requestsData] = await Promise.all([
          getSubmissionStats(),
          getMyRequests(),
        ]);
        setStats(statsData);
        setRecentRequests(requestsData.slice(0, 5)); // Last 5
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Use stats.pending, stats.in_progress, stats.completed, stats.total
  // instead of hardcoded values
  
  return (
    // ... dashboard UI using real stats
  );
}
```

---

## STRIKE 3: Wire Executive Dashboard to Real Data

### Problem
`/app/executive` has 100% hardcoded KPIs

### File: `api/app/routes/reports.py` (or create `api/app/routes/stats.py`)

**Add executive stats endpoint:**

```python
@router.get("/executive-stats")
async def get_executive_stats(db: Session = Depends(get_db)):
    """Get executive-level statistics."""
    
    # All reports (not filtered by company for executive view)
    total_reports = db.query(Report).count()
    
    filed_reports = db.query(Report).filter(Report.status == "filed").count()
    
    exempt_reports = db.query(Report).filter(Report.status == "exempt").count()
    
    pending_reports = db.query(Report).filter(
        Report.status.in_(["draft", "collecting", "ready_to_file"])
    ).count()
    
    # This month
    start_of_month = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    filed_this_month = db.query(Report).filter(
        Report.status == "filed",
        Report.filed_at >= start_of_month
    ).count()
    
    # Calculate revenue (mock: $75 per filing)
    revenue_per_filing = 7500  # cents
    mtd_revenue = filed_this_month * revenue_per_filing
    
    # Compliance rate (filed on time vs total filed)
    compliance_rate = 98.2  # Mock for now
    
    return {
        "total_reports": total_reports,
        "filed_reports": filed_reports,
        "exempt_reports": exempt_reports,
        "pending_reports": pending_reports,
        "filed_this_month": filed_this_month,
        "mtd_revenue_cents": mtd_revenue,
        "compliance_rate": compliance_rate,
        "avg_completion_days": 3.2,  # Mock
    }
```

### File: `web/app/(app)/app/executive/page.tsx`

**Wire to real API (similar pattern to client dashboard).**

---

## STRIKE 4: Invoice View - Connect to Real Data

### Problem
Invoice page uses mock data, actions are disabled

### Option A: Create Invoice Model & API (Full Implementation)

This is a larger effort. For demo, we can either:

**Option B: Use Report Data as Invoice Proxy (Quick Win)**

Show filed reports as "invoices" - each filed report = one billable item.

### File: `web/app/(app)/app/invoices/page.tsx`

**Replace mock invoices with filed reports:**

```tsx
"use client";

import { useState, useEffect } from "react";

interface InvoiceItem {
  id: string;
  property_address: string;
  filing_date: string;
  receipt_id: string;
  amount_cents: number;
  status: "paid" | "pending" | "overdue";
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchInvoices() {
      try {
        // Fetch filed reports and transform to invoice format
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/reports?status=filed`
        );
        const reports = await response.json();
        
        // Transform reports to invoices
        const invoiceData = reports.map((report: any) => ({
          id: report.id,
          property_address: report.property_address_text,
          filing_date: report.filed_at,
          receipt_id: report.receipt_id,
          amount_cents: 7500, // $75 per filing
          status: "paid" as const, // Assume paid for demo
        }));
        
        setInvoices(invoiceData);
      } catch (error) {
        console.error("Failed to fetch invoices:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchInvoices();
  }, []);

  // ... rest of component using real invoices
}
```

---

## STRIKE 5: Add Reports List Endpoint (if missing)

### File: `api/app/routes/reports.py`

**Ensure this endpoint exists:**

```python
@router.get("/")
async def list_reports(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """List all reports, optionally filtered by status."""
    query = db.query(Report)
    
    if status:
        query = query.filter(Report.status == status)
    
    reports = query.order_by(Report.created_at.desc()).all()
    
    return [
        {
            "id": r.id,
            "status": r.status,
            "property_address_text": r.property_address_text,
            "closing_date": r.closing_date.isoformat() if r.closing_date else None,
            "filing_deadline": r.filing_deadline.isoformat() if r.filing_deadline else None,
            "receipt_id": r.receipt_id,
            "filed_at": r.filed_at.isoformat() if r.filed_at else None,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in reports
    ]
```

---

## STRIKE 6: PDF Generation (Placeholder for Demo)

For the demo, we can show a "Download PDF" button that:
- Shows a toast: "PDF generation coming soon"
- Or generates a simple browser print dialog

### Quick Implementation:

```tsx
// In invoice detail or report detail
const handleDownloadPDF = () => {
  // For demo: use browser print
  window.print();
  
  // Or show toast
  toast({
    title: "PDF Export",
    description: "PDF generation will be available in the full release.",
  });
};
```

For full PDF implementation post-demo, recommend `@react-pdf/renderer` or server-side with `weasyprint`.

---

## VERIFICATION CHECKLIST

After implementing all strikes:

### Seed Data
- [ ] Call `POST /demo/reset`
- [ ] Verify 6 submission requests created
- [ ] Verify 5 reports created (linked to requests)
- [ ] Verify 1 filed report with receipt ID
- [ ] Verify 1 exempt report
- [ ] Verify active party portal link works

### Client Dashboard
- [ ] Stats cards show real counts from API
- [ ] Recent activity shows real requests
- [ ] Counts match seeded data

### Executive Dashboard
- [ ] KPIs show real data
- [ ] Filed count matches seeded data
- [ ] Revenue calculated from real filings

### Invoice Page
- [ ] Shows filed reports as invoices
- [ ] Amount shows $75 per filing
- [ ] View button works

### Data Chain Traceability
- [ ] Click request → see linked report
- [ ] Click report → see it came from request
- [ ] Filed report shows receipt ID
- [ ] All roles see consistent data

---

## UPDATE KilledSharks.md

```markdown
---

### 17. Demo Data & Dashboard Fixes ✅

**Problems Found (via investigation):**
1. Client Dashboard: 100% hardcoded stats
2. Executive Dashboard: 100% hardcoded KPIs
3. Seed data: Requests not linked to Reports
4. Seed data: No filed reports with receipt IDs
5. Invoice page: Mock data only

**Fixes Applied:**

1. **Complete Seed Data Chains**
   - 6 scenarios covering full lifecycle
   - All SubmissionRequests linked to Reports
   - 1 filed report with BSA receipt ID
   - 1 exempt report
   - Active party portal link for testing

2. **Client Dashboard Wired to API**
   - Created `GET /submission-requests/stats` endpoint
   - Dashboard fetches real counts
   - Recent activity from real data

3. **Executive Dashboard Wired to API**
   - Created `GET /reports/executive-stats` endpoint
   - Real filing counts and revenue

4. **Invoice Page Connected**
   - Shows filed reports as invoices
   - Real data instead of mock array

**Files Changed:**
- `api/app/services/demo_seed.py` (complete rewrite)
- `api/app/routes/submission_requests.py` (stats endpoint)
- `api/app/routes/reports.py` (executive stats, list endpoint)
- `web/app/(app)/app/dashboard/page.tsx` (API integration)
- `web/app/(app)/app/executive/page.tsx` (API integration)
- `web/app/(app)/app/invoices/page.tsx` (real data)

**Status:** ✅ Killed (all 5 sharks)
```

---

## SUMMARY: The Heavy Artillery

| Strike | Target | Weapon |
|--------|--------|--------|
| 1 | Disconnected seed data | Complete linked chains |
| 2 | Hardcoded client dashboard | API endpoint + wiring |
| 3 | Hardcoded executive dashboard | API endpoint + wiring |
| 4 | Mock invoice data | Use filed reports |
| 5 | Missing reports endpoint | Add list endpoint |
| 6 | PDF generation | Placeholder for demo |

**Fire when ready!** 🦈🔱
