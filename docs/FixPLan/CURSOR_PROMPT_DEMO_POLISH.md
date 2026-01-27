# CURSOR PROMPT: Demo Mode Polish & Seed Data

## OBJECTIVE

Prepare the application for the January 29th sales demo with:
1. Clear "Demo Mode" indicator for filing (not hitting real FinCEN)
2. Seed data showing various stages of the workflow

---

## PART 1: Demo Mode Filing Indicator

### Backend: Verify Mock Filing Behavior

**File:** `api/app/routes/reports.py` (or wherever the file endpoint is)

Ensure the `POST /reports/{id}/file` endpoint:
1. Checks for `ENVIRONMENT` or `FILING_MODE` environment variable
2. In demo/staging mode, returns mock data WITHOUT calling real FinCEN
3. Logs clearly that it's in mock mode

**Example implementation:**
```python
import os
from datetime import datetime
import uuid

@router.post("/{report_id}/file")
async def file_report(report_id: str, db: Session = Depends(get_db)):
    report = get_report_or_404(report_id, db)
    
    # Check environment
    is_demo_mode = os.getenv("ENVIRONMENT", "staging") in ["staging", "demo", "development"]
    
    if is_demo_mode:
        # MOCK FILING - Don't hit real FinCEN
        print(f"🎭 DEMO MODE: Mock filing for report {report_id} - NOT submitting to FinCEN")
        
        # Generate mock receipt
        mock_receipt_id = f"BSA-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:8].upper()}"
        
        # Update report
        report.status = "filed"
        report.filed_at = datetime.utcnow()
        report.filing_receipt_id = mock_receipt_id
        report.filing_response = {
            "mode": "demo",
            "status": "accepted",
            "receipt_id": mock_receipt_id,
            "message": "Mock filing accepted (demo mode)",
            "filed_at": datetime.utcnow().isoformat(),
        }
        
        db.commit()
        
        return {
            "status": "accepted",
            "receipt_id": mock_receipt_id,
            "message": "Report filed successfully (demo mode)",
            "demo_mode": True,
        }
    
    else:
        # PRODUCTION - Real FinCEN submission
        # ... actual SDTM implementation ...
        pass
```

### Frontend: Demo Mode Indicator

**File:** `web/components/rrer-questionnaire.tsx` (file-report step)

Add a subtle indicator that this is demo mode:

```tsx
{/* Demo Mode Banner - only show in non-production */}
{process.env.NEXT_PUBLIC_DEMO_MODE === "true" && (
  <div className="mb-4 px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-amber-800 text-sm">
    <span className="text-lg">🎭</span>
    <span>Demo Mode - Filing will be simulated (not submitted to FinCEN)</span>
  </div>
)}
```

**File:** `web/.env.local` (or `.env.staging`)
```
NEXT_PUBLIC_DEMO_MODE=true
```

### Optional: Filing Result Shows Demo Mode

In the success state after filing:
```tsx
{filingResult?.demo_mode && (
  <Badge variant="outline" className="mt-2 text-amber-600 border-amber-300">
    Demo Mode
  </Badge>
)}
```

---

## PART 2: Demo Seed Data

### File to Modify: `api/app/services/demo_seed.py` (or create if doesn't exist)

Create comprehensive seed data that showcases all workflow stages:

```python
"""
Demo Seed Service
Creates sample data for sales demonstrations
"""

from datetime import datetime, date, timedelta
from uuid import uuid4
from sqlalchemy.orm import Session

from app.models.submission_request import SubmissionRequest
from app.models.report import Report
from app.models.report_party import ReportParty
from app.models.party_link import PartyLink


def seed_demo_data(db: Session):
    """
    Creates demo data showing various workflow stages.
    Call this from POST /demo/reset or a separate POST /demo/seed endpoint.
    """
    
    print("🌱 Seeding demo data...")
    
    # =========================================================================
    # SCENARIO 1: New Request in Queue (Pending)
    # Shows: What clients submit, waiting for staff to start wizard
    # =========================================================================
    
    request_1 = SubmissionRequest(
        id=str(uuid4()),
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
        created_at=datetime.utcnow() - timedelta(hours=2),
    )
    db.add(request_1)
    
    # =========================================================================
    # SCENARIO 2: Another Pending Request (Different Property Type)
    # Shows: Volume in queue
    # =========================================================================
    
    request_2 = SubmissionRequest(
        id=str(uuid4()),
        status="pending",
        property_address={
            "street": "1600 Pennsylvania Avenue",
            "city": "Washington",
            "state": "DC",
            "zip": "20500",
        },
        purchase_price_cents=250000000,  # $2,500,000
        expected_closing_date=date.today() + timedelta(days=21),
        escrow_number="ESC-2026-1002",
        financing_type="cash",
        buyer_name="Capitol Trust Holdings",
        buyer_email="legal@capitoltrust.com",
        buyer_type="trust",
        seller_name="Federal Properties Inc",
        seller_email="sales@fedprops.com",
        created_at=datetime.utcnow() - timedelta(hours=5),
    )
    db.add(request_2)
    
    # =========================================================================
    # SCENARIO 3: In-Progress Request (Staff Started Wizard)
    # Shows: Request being processed, links to partial wizard
    # =========================================================================
    
    request_3 = SubmissionRequest(
        id=str(uuid4()),
        status="in_progress",
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
        created_at=datetime.utcnow() - timedelta(days=1),
    )
    db.add(request_3)
    
    # Create associated report (wizard in progress)
    report_3 = Report(
        id=str(uuid4()),
        submission_request_id=request_3.id,
        property_address_text="221B Baker Street, Los Angeles, CA 90028",
        closing_date=date.today() + timedelta(days=10),
        filing_deadline=date.today() + timedelta(days=40),
        status="draft",
        wizard_step=4,  # Partway through determination
        wizard_data={
            "phase": "determination",
            "determinationStep": "buyer-type",
            "determination": {
                "isResidential": "yes",
                "isNonFinanced": "yes",
                "buyerType": None,  # Not yet selected
            },
            "collection": {
                "purchasePrice": 725000,
                "escrowNumber": "ESC-2026-0998",
            }
        },
        created_at=datetime.utcnow() - timedelta(hours=3),
    )
    db.add(report_3)
    
    # =========================================================================
    # SCENARIO 4: Collecting - Waiting on Parties (1 of 2 Submitted)
    # Shows: Party monitoring, pending vs submitted status
    # =========================================================================
    
    report_4_id = str(uuid4())
    report_4 = Report(
        id=report_4_id,
        property_address_text="350 Fifth Avenue, New York, NY 10118",
        closing_date=date.today() + timedelta(days=7),
        filing_deadline=date.today() + timedelta(days=37),
        status="collecting",
        wizard_step=7,
        determination={
            "final_result": "reportable",
            "reason": "Non-financed transfer to entity, no exemptions apply",
            "buyer_type": "entity",
        },
        wizard_data={
            "phase": "collection",
            "collectionStep": "monitor-progress",
            "determination": {
                "isResidential": "yes",
                "isNonFinanced": "yes",
                "buyerType": "entity",
                "entityExemptions": ["none"],
            },
            "collection": {
                "purchasePrice": 1250000,
                "closingDate": (date.today() + timedelta(days=7)).isoformat(),
            }
        },
        created_at=datetime.utcnow() - timedelta(days=2),
    )
    db.add(report_4)
    
    # Seller - SUBMITTED
    party_4_seller = ReportParty(
        id=str(uuid4()),
        report_id=report_4_id,
        party_role="transferor",
        entity_type="individual",
        display_name="Margaret Chen",
        email="mchen@email.com",
        status="submitted",
        submitted_at=datetime.utcnow() - timedelta(hours=6),
        party_data={
            "first_name": "Margaret",
            "last_name": "Chen",
            "date_of_birth": "1968-03-15",
            "ssn": "123-45-6789",
            "citizenship": "us_citizen",
            "address_street": "350 Fifth Avenue, Apt 42B",
            "address_city": "New York",
            "address_state": "NY",
            "address_zip": "10118",
            "id_type": "drivers_license",
            "id_number": "D12345678",
            "id_jurisdiction": "New York",
            "certified": True,
            "certification_signature": "Margaret Chen",
            "certification_date": (datetime.utcnow() - timedelta(hours=6)).isoformat(),
        },
    )
    db.add(party_4_seller)
    
    # Create expired link for seller (already submitted)
    link_4_seller = PartyLink(
        id=str(uuid4()),
        party_id=party_4_seller.id,
        token=f"demo-seller-{uuid4().hex[:12]}",
        expires_at=datetime.utcnow() + timedelta(days=28),
        created_at=datetime.utcnow() - timedelta(days=2),
    )
    db.add(link_4_seller)
    
    # Buyer - PENDING (not yet submitted)
    party_4_buyer = ReportParty(
        id=str(uuid4()),
        report_id=report_4_id,
        party_role="transferee",
        entity_type="entity",
        display_name="Empire State Holdings LLC",
        email="legal@empireholdings.com",
        status="pending",
        party_data={},  # Empty - not submitted yet
    )
    db.add(party_4_buyer)
    
    # Active link for buyer
    buyer_token = f"demo-buyer-{uuid4().hex[:12]}"
    link_4_buyer = PartyLink(
        id=str(uuid4()),
        party_id=party_4_buyer.id,
        token=buyer_token,
        expires_at=datetime.utcnow() + timedelta(days=28),
        created_at=datetime.utcnow() - timedelta(days=2),
    )
    db.add(link_4_buyer)
    
    print(f"   📧 Buyer portal link: /p/{buyer_token}")
    
    # =========================================================================
    # SCENARIO 5: Ready to File (All Parties Submitted)
    # Shows: Review screen with full data, ready for filing
    # =========================================================================
    
    report_5_id = str(uuid4())
    report_5 = Report(
        id=report_5_id,
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
            "determination": {
                "isResidential": "yes",
                "isNonFinanced": "yes",
                "buyerType": "entity",
                "entityExemptions": ["none"],
            },
        },
        created_at=datetime.utcnow() - timedelta(days=5),
    )
    db.add(report_5)
    
    # Seller - Individual - SUBMITTED
    party_5_seller = ReportParty(
        id=str(uuid4()),
        report_id=report_5_id,
        party_role="transferor",
        entity_type="individual",
        display_name="Carlos Rodriguez",
        email="crodriguez@email.com",
        status="submitted",
        submitted_at=datetime.utcnow() - timedelta(days=2),
        party_data={
            "first_name": "Carlos",
            "middle_name": "Miguel",
            "last_name": "Rodriguez",
            "date_of_birth": "1972-08-22",
            "ssn": "987-65-4321",
            "citizenship": "us_citizen",
            "address_street": "456 Palm Avenue",
            "address_city": "Miami",
            "address_state": "FL",
            "address_zip": "33139",
            "id_type": "drivers_license",
            "id_number": "R123456789",
            "id_jurisdiction": "Florida",
            "certified": True,
            "certification_signature": "Carlos M Rodriguez",
            "certification_date": (datetime.utcnow() - timedelta(days=2)).isoformat(),
        },
    )
    db.add(party_5_seller)
    
    # Buyer - Entity with Beneficial Owners - SUBMITTED
    party_5_buyer = ReportParty(
        id=str(uuid4()),
        report_id=report_5_id,
        party_role="transferee",
        entity_type="entity",
        display_name="Sunshine Ventures LLC",
        email="acquisitions@sunshineventures.com",
        status="submitted",
        submitted_at=datetime.utcnow() - timedelta(days=1),
        party_data={
            "entity_name": "Sunshine Ventures LLC",
            "entity_type": "llc_multi",
            "ein": "87-1234567",
            "formation_state": "Delaware",
            "formation_date": "2019-06-15",
            "address_street": "789 Brickell Avenue, Suite 2000",
            "address_city": "Miami",
            "address_state": "FL",
            "address_zip": "33131",
            "beneficial_owners": [
                {
                    "first_name": "Alexandra",
                    "last_name": "Vance",
                    "date_of_birth": "1980-04-12",
                    "ssn": "111-22-3333",
                    "citizenship": "us_citizen",
                    "address_street": "100 Sunny Isles Blvd",
                    "address_city": "Sunny Isles Beach",
                    "address_state": "FL",
                    "address_zip": "33160",
                    "id_type": "us_passport",
                    "id_number": "P12345678",
                    "ownership_percentage": 60,
                    "control_type": ["senior_officer"],
                },
                {
                    "first_name": "Michael",
                    "last_name": "Torres",
                    "date_of_birth": "1975-11-30",
                    "ssn": "444-55-6666",
                    "citizenship": "us_citizen",
                    "address_street": "200 Collins Avenue",
                    "address_city": "Miami Beach",
                    "address_state": "FL",
                    "address_zip": "33139",
                    "id_type": "drivers_license",
                    "id_number": "T987654321",
                    "id_jurisdiction": "Florida",
                    "ownership_percentage": 40,
                },
            ],
            "signing_individual": {
                "first_name": "Alexandra",
                "last_name": "Vance",
                "title": "Managing Member",
            },
            "payment_sources": [
                {
                    "source_type": "business_funds",
                    "amount": 950000,
                    "payment_method": "wire_transfer",
                    "institution_name": "JPMorgan Chase",
                    "account_last_four": "4567",
                },
            ],
            "certified": True,
            "certification_signature": "Alexandra Vance",
            "certification_date": (datetime.utcnow() - timedelta(days=1)).isoformat(),
        },
    )
    db.add(party_5_buyer)
    
    # =========================================================================
    # SCENARIO 6: Already Filed (Completed)
    # Shows: Filing history, receipt ID, success state
    # =========================================================================
    
    report_6 = Report(
        id=str(uuid4()),
        property_address_text="8842 Sunset Boulevard, West Hollywood, CA 90069",
        closing_date=date.today() - timedelta(days=15),
        filing_deadline=date.today() + timedelta(days=15),
        status="filed",
        wizard_step=10,
        determination={
            "final_result": "reportable",
            "reason": "Non-financed transfer to entity, no exemptions apply",
            "buyer_type": "entity",
        },
        filed_at=datetime.utcnow() - timedelta(days=10),
        filing_receipt_id="BSA-20260117-A1B2C3D4",
        filing_response={
            "status": "accepted",
            "receipt_id": "BSA-20260117-A1B2C3D4",
            "message": "Report accepted by FinCEN",
            "mode": "demo",
        },
        created_at=datetime.utcnow() - timedelta(days=20),
    )
    db.add(report_6)
    
    # Add parties for the filed report (abbreviated)
    party_6_seller = ReportParty(
        id=str(uuid4()),
        report_id=report_6.id,
        party_role="transferor",
        entity_type="individual",
        display_name="Jennifer Walsh",
        email="jwalsh@email.com",
        status="submitted",
        submitted_at=datetime.utcnow() - timedelta(days=12),
        party_data={"first_name": "Jennifer", "last_name": "Walsh", "certified": True},
    )
    db.add(party_6_seller)
    
    party_6_buyer = ReportParty(
        id=str(uuid4()),
        report_id=report_6.id,
        party_role="transferee",
        entity_type="entity",
        display_name="Sunset Entertainment Group",
        email="legal@sunsetent.com",
        status="submitted",
        submitted_at=datetime.utcnow() - timedelta(days=11),
        party_data={"entity_name": "Sunset Entertainment Group", "ein": "95-7654321", "certified": True},
    )
    db.add(party_6_buyer)
    
    # =========================================================================
    # COMMIT ALL
    # =========================================================================
    
    db.commit()
    
    print("✅ Demo seed data created:")
    print("   📋 2 pending requests in queue")
    print("   📋 1 in-progress request (wizard started)")
    print("   📊 1 report collecting (1/2 parties submitted)")
    print("   📊 1 report ready to file (all parties done)")
    print("   📊 1 report already filed (with receipt ID)")
    print("")
    print("🎯 Demo scenarios ready:")
    print("   • Show client submission → Queue")
    print("   • Resume partial wizard")
    print("   • Monitor party progress (show pending buyer)")
    print("   • Review submitted data")
    print("   • File a report")
    print("   • View filing history")
    
    return {
        "requests_created": 3,
        "reports_created": 4,
        "parties_created": 6,
        "active_portal_link": f"/p/{buyer_token}",
    }
```

### Update Demo Reset Endpoint

**File:** `api/app/routes/demo.py`

Ensure `/demo/reset` calls the seed function:

```python
from app.services.demo_seed import seed_demo_data

@router.post("/reset")
async def reset_demo(request: Request, db: Session = Depends(get_db)):
    # Verify demo secret
    verify_demo_secret(request)
    
    # Clear all data
    db.execute(text("DELETE FROM party_links"))
    db.execute(text("DELETE FROM report_parties"))
    db.execute(text("DELETE FROM reports"))
    db.execute(text("DELETE FROM submission_requests"))
    db.commit()
    
    # Seed fresh demo data
    result = seed_demo_data(db)
    
    return {
        "status": "reset_complete",
        "message": "Demo data cleared and re-seeded",
        **result,
    }
```

### Optional: Separate Seed Endpoint

```python
@router.post("/seed")
async def seed_demo(request: Request, db: Session = Depends(get_db)):
    """Add demo data WITHOUT clearing existing data"""
    verify_demo_secret(request)
    result = seed_demo_data(db)
    return {"status": "seeded", **result}
```

---

## PART 3: Update KilledSharks.md

After implementing, add this entry:

```markdown
---

### 8. Demo Mode Polish & Seed Data ✅

**Problem:** 
1. Filing endpoint didn't clearly indicate demo mode (could confuse sales team)
2. Empty database makes demo awkward - no visual examples

**Solution:**

**Demo Mode Filing:**
- Added `FILING_MODE` / `ENVIRONMENT` check in filing endpoint
- Mock mode returns fake BSA receipt ID without hitting FinCEN
- Added "🎭 Demo Mode" banner in file-report step
- Console logs clearly indicate mock filing

**Demo Seed Data:**
Created comprehensive seed data showing all workflow stages:

| Scenario | Status | Purpose |
|----------|--------|---------|
| Request 1 | `pending` | Show queue with client submissions |
| Request 2 | `pending` | Show volume (different property) |
| Request 3 | `in_progress` | Show wizard can be resumed |
| Report 1 | `collecting` (1/2) | Show party monitoring |
| Report 2 | `ready_to_file` | Show review screen with data |
| Report 3 | `filed` | Show completed filing history |

**Files Created/Changed:**
- `api/app/services/demo_seed.py` (NEW - comprehensive seed data)
- `api/app/routes/demo.py` (integrate seed into reset)
- `api/app/routes/reports.py` (demo mode check in filing)
- `web/components/rrer-questionnaire.tsx` (demo mode banner)

**Test:** 
- Call `POST /demo/reset` 
- Check admin queue shows 2+ pending requests
- Check reports list shows reports at various stages
- File a report → see "Demo Mode" indicator

**Status:** ✅ Killed
```

---

## VERIFICATION CHECKLIST

After implementation:

### Demo Mode
- [ ] Filing endpoint checks `ENVIRONMENT` variable
- [ ] Mock filing returns fake BSA receipt ID
- [ ] Console logs show "DEMO MODE" message
- [ ] UI shows demo mode indicator (optional)

### Seed Data
- [ ] `POST /demo/reset` clears and re-seeds data
- [ ] Admin queue shows 2+ pending requests
- [ ] Reports list shows reports at different stages
- [ ] At least one report has partial party submissions
- [ ] At least one report is fully ready to file
- [ ] At least one report shows as already filed
- [ ] Buyer portal link works for pending party

### Demo Walkthrough Ready
- [ ] Can show client submission flow
- [ ] Can show admin queue with pending items
- [ ] Can resume partial wizard
- [ ] Can show party monitoring (pending vs submitted)
- [ ] Can show review screen with real data
- [ ] Can file and see receipt ID
- [ ] Can show filing history

---

## DEMO SCRIPT SCENARIOS

With this seed data, the sales demo can show:

1. **"Here's what your clients see"**
   - Show client submission form
   - Submit a new request
   - "See? It appears in your queue immediately"

2. **"Your team's workflow"**
   - Show admin queue with pending items
   - Click "Start Wizard" on one
   - Run through determination
   - "Look, we can also resume this one that's in progress"

3. **"Parties fill out their own info"**
   - Show party monitoring (1/2 complete)
   - Open the buyer portal link
   - "See how easy it is for them?"
   - Fill out a few fields

4. **"Review before filing"**
   - Show the ready-to-file report
   - Open review screen
   - "You can see everything they submitted, SSNs masked for security"

5. **"One click to file"**
   - Click "Submit to FinCEN"
   - Show receipt ID
   - "That's it! FinCEN filing complete"

6. **"Track everything"**
   - Show the already-filed report
   - "Full audit trail, receipt IDs, history"
