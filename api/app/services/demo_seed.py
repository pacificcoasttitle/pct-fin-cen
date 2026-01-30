"""
Demo Seed Service - Complete Data Chains
Every scenario is fully linked and traceable.
"""

from datetime import datetime, date, timedelta
from uuid import uuid4
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Dict, Any

from app.models.company import Company
from app.models.user import User
from app.models.submission_request import SubmissionRequest
from app.models.report import Report
from app.models.report_party import ReportParty
from app.models.party_link import PartyLink
from app.models.billing_event import BillingEvent
from app.models.invoice import Invoice


# Re-export for easy import
__all__ = [
    "reset_demo_data",
    "seed_demo_data",
]


def reset_demo_data(db: Session) -> None:
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


def seed_demo_data(db: Session) -> Dict[str, Any]:
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
            name="FinClear Solutions",
            code="FINCLEAR",
            company_type="internal",
            billing_email="billing@finclear.com",
            status="active",
        )
        db.add(finclear_company)
        db.flush()
        print(f"   🏢 Created FinClear company: {finclear_company.id}")
    
    # Demo client company
    demo_company = db.query(Company).filter(Company.code == "DEMO").first()
    if not demo_company:
        demo_company = Company(
            name="Pacific Coast Title",
            code="DEMO",
            company_type="client",
            billing_email="billing@demo.com",
            status="active",
        )
        db.add(demo_company)
        db.flush()
        print(f"   🏢 Created Demo company: {demo_company.id}")
    
    # =========================================================================
    # GET OR CREATE SECOND CLIENT COMPANY (for variety)
    # =========================================================================
    
    acme_company = db.query(Company).filter(Company.code == "ACME").first()
    if not acme_company:
        acme_company = Company(
            name="Acme Title & Escrow",
            code="ACME",
            company_type="client",
            billing_email="billing@acmetitle.com",
            billing_contact_name="Robert Johnson",
            address={
                "street": "456 Commerce Blvd",
                "city": "San Diego",
                "state": "CA",
                "zip": "92101"
            },
            phone="(619) 555-0199",
            status="active",
            settings={},
            created_at=datetime.utcnow() - timedelta(days=45),
            updated_at=datetime.utcnow(),
        )
        db.add(acme_company)
        db.flush()
        print(f"   🏢 Created Acme company: {acme_company.name}")
    
    # =========================================================================
    # GET OR CREATE USERS - All 5 Demo Roles
    # =========================================================================
    
    print("👤 Seeding demo users...")
    
    # 1. COO (Internal - no company)
    coo_user = db.query(User).filter(User.email == "coo@pct.com").first()
    if not coo_user:
        coo_user = User(
            email="coo@pct.com",
            name="James Richardson",
            company_id=None,  # Internal
            role="coo",
            status="active",
            settings={},
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(coo_user)
        db.flush()
        print(f"   👤 COO: {coo_user.email}")
    
    # 2. FinClear Admin (Internal - no company)
    admin_user = db.query(User).filter(User.email == "admin@pctfincen.com").first()
    if not admin_user:
        admin_user = User(
            email="admin@pctfincen.com",
            name="Sarah Mitchell",
            company_id=None,  # Internal
            role="pct_admin",
            status="active",
            settings={},
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(admin_user)
        db.flush()
        print(f"   👤 FinClear Admin: {admin_user.email}")
    
    # 3. FinClear Staff (Internal - no company)
    staff_user = db.query(User).filter(User.email == "staff@pctfincen.com").first()
    if not staff_user:
        staff_user = User(
            email="staff@pctfincen.com",
            name="Michael Chen",
            company_id=None,  # Internal
            role="pct_staff",
            status="active",
            settings={},
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(staff_user)
        db.flush()
        print(f"   👤 FinClear Staff: {staff_user.email}")
    
    # 4. Client Admin (Demo company - Pacific Coast Title)
    client_admin = db.query(User).filter(User.email == "admin@demotitle.com").first()
    if not client_admin:
        client_admin = User(
            email="admin@demotitle.com",
            name="Jennifer Walsh",
            company_id=demo_company.id,  # Linked to Demo company
            role="client_admin",
            status="active",
            settings={},
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(client_admin)
        db.flush()
        print(f"   👤 Client Admin: {client_admin.email} (Pacific Coast Title)")
    
    # 5. Client User (Demo company - Pacific Coast Title)
    client_user = db.query(User).filter(User.email == "user@demotitle.com").first()
    if not client_user:
        client_user = User(
            email="user@demotitle.com",
            name="David Park",
            company_id=demo_company.id,  # Linked to Demo company
            role="client_user",
            status="active",
            settings={},
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(client_user)
        db.flush()
        print(f"   👤 Client User: {client_user.email} (Pacific Coast Title)")
    
    # 6. Acme Admin (Second demo company)
    acme_admin = db.query(User).filter(User.email == "admin@acmetitle.com").first()
    if not acme_admin:
        acme_admin = User(
            email="admin@acmetitle.com",
            name="Robert Johnson",
            company_id=acme_company.id,
            role="client_admin",
            status="active",
            settings={},
            created_at=datetime.utcnow() - timedelta(days=45),
            updated_at=datetime.utcnow(),
        )
        db.add(acme_admin)
        db.flush()
        print(f"   👤 Acme Admin: {acme_admin.email} (Acme Title & Escrow)")
    
    db.flush()
    
    # Track portal links for output
    active_portal_link = None
    
    # =========================================================================
    # SCENARIO 1: Fresh Pending Request (No Report Yet)
    # Client just submitted, staff hasn't started wizard
    # =========================================================================
    
    request_1 = SubmissionRequest(
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
    
    report_2 = Report(
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
    db.flush()
    
    request_2 = SubmissionRequest(
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
        report_id=report_2.id,  # LINKED!
        created_at=datetime.utcnow() - timedelta(days=1),
    )
    db.add(request_2)
    
    # Update report with submission_request_id
    report_2.submission_request_id = request_2.id
    print(f"   📊 Scenario 2: In determination - 221B Baker Street")
    
    # =========================================================================
    # SCENARIO 3: Collecting - Waiting on Parties (1 of 2 submitted)
    # Determination done, party links sent, seller submitted, buyer pending
    # =========================================================================
    
    report_3 = Report(
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
    db.flush()
    
    request_3 = SubmissionRequest(
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
        report_id=report_3.id,
        created_at=datetime.utcnow() - timedelta(days=3),
    )
    db.add(request_3)
    report_3.submission_request_id = request_3.id
    db.flush()
    
    # Seller - SUBMITTED
    party3_seller = ReportParty(
        report_id=report_3.id,
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
    db.flush()
    
    # Buyer - PENDING (has link, hasn't submitted yet)
    party3_buyer = ReportParty(
        report_id=report_3.id,
        party_role="transferee",
        entity_type="entity",
        display_name="Empire State Holdings LLC",
        email="legal@empireholdings.com",
        status="pending",
        party_data={},
    )
    db.add(party3_buyer)
    db.flush()
    
    # Active link for pending buyer
    link3_buyer = PartyLink(
        report_party_id=party3_buyer.id,
        expires_at=datetime.utcnow() + timedelta(days=28),
        status="active",
        created_at=datetime.utcnow() - timedelta(days=2),
    )
    db.add(link3_buyer)
    db.flush()
    active_portal_link = link3_buyer.token
    
    print(f"   📊 Scenario 3: Collecting (1/2) - 350 Fifth Avenue")
    print(f"      🔗 Active buyer portal: /p/{active_portal_link}")
    
    # =========================================================================
    # SCENARIO 4: Ready to File - All Parties Submitted
    # All info collected, ready for staff to review and file
    # =========================================================================
    
    report_4 = Report(
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
    db.flush()
    
    request_4 = SubmissionRequest(
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
        report_id=report_4.id,
        created_at=datetime.utcnow() - timedelta(days=5),
    )
    db.add(request_4)
    report_4.submission_request_id = request_4.id
    db.flush()
    
    # Seller - Submitted
    party4_seller = ReportParty(
        report_id=report_4.id,
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
        report_id=report_4.id,
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
    
    report_5 = Report(
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
    db.flush()
    
    request_5 = SubmissionRequest(
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
        report_id=report_5.id,
        created_at=datetime.utcnow() - timedelta(days=15),
    )
    db.add(request_5)
    report_5.submission_request_id = request_5.id
    db.flush()
    
    # Add parties for filed report
    party5_seller = ReportParty(
        report_id=report_5.id,
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
        report_id=report_5.id,
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
    
    # Create billing event and invoice for the filed report
    # Use company's configured filing fee (default: $75.00 / 7500 cents)
    filing_fee = demo_company.filing_fee_cents if hasattr(demo_company, 'filing_fee_cents') and demo_company.filing_fee_cents else 7500
    
    billing_event_1 = BillingEvent(
        company_id=demo_company.id,
        report_id=report_5.id,
        submission_request_id=request_5.id,
        event_type="filing_accepted",
        description=f"FinCEN filing for 8842 Sunset Boulevard, West Hollywood, CA 90069",
        amount_cents=filing_fee,  # Use company's configured rate
        quantity=1,
        bsa_id="BSA-20260118-A1B2C3D4",
        created_at=datetime.utcnow() - timedelta(days=8),
    )
    db.add(billing_event_1)
    db.flush()
    
    # Create a sample paid invoice
    invoice_1 = Invoice(
        company_id=demo_company.id,
        invoice_number="INV-2026-01-0001",
        period_start=date.today().replace(day=1),
        period_end=date.today(),
        subtotal_cents=filing_fee,
        tax_cents=0,
        discount_cents=0,
        total_cents=filing_fee,
        status="paid",
        due_date=date.today() + timedelta(days=30),
        sent_at=datetime.utcnow() - timedelta(days=7),
        paid_at=datetime.utcnow() - timedelta(days=5),
        payment_method="ach",
        payment_reference="ACH-12345",
        created_at=datetime.utcnow() - timedelta(days=8),
    )
    db.add(invoice_1)
    db.flush()
    
    # Link billing event to invoice
    billing_event_1.invoice_id = invoice_1.id
    billing_event_1.invoiced_at = datetime.utcnow() - timedelta(days=7)
    
    print(f"   💰 Invoice created: {invoice_1.invoice_number} (${filing_fee/100:.2f}, Paid)")
    
    # =========================================================================
    # SCENARIO 6: Exempt - No Filing Required
    # Completed determination, found exemption applies
    # =========================================================================
    
    report_6 = Report(
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
    db.flush()
    
    request_6 = SubmissionRequest(
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
        report_id=report_6.id,
        created_at=datetime.utcnow() - timedelta(days=10),
    )
    db.add(request_6)
    report_6.submission_request_id = request_6.id
    
    print(f"   ⚪ Scenario 6: Exempt (financed) - 500 Corporate Plaza")
    
    # =========================================================================
    # SCENARIO 7-10: AUTO-EXEMPT VIA EARLY DETERMINATION
    # These showcase the new early determination system with various reasons
    # =========================================================================
    
    # --- SCENARIO 7: Auto-Exempt - Financed Transaction ---
    request_7 = SubmissionRequest(
        company_id=demo_company.id,
        requested_by_user_id=client_admin.id,
        status="exempt",  # Auto-determined exempt
        property_address={
            "street": "1500 Main Street",
            "city": "Denver",
            "state": "CO",
            "zip": "80202",
        },
        purchase_price_cents=350000000,  # $3,500,000
        expected_closing_date=date.today() + timedelta(days=20),
        escrow_number="ESC-2026-0975",
        financing_type="mortgage",  # Financed = Exempt
        buyer_name="Johnson Properties LLC",
        buyer_email="legal@johnsonprop.com",
        buyer_type="entity",
        seller_name="Mountain View Realty",
        seller_email="sales@mvrealty.com",
        # Early determination fields
        determination_result="exempt",
        exemption_reasons=["financed_transaction"],
        determination_timestamp=datetime.utcnow() - timedelta(days=3),
        determination_method="auto",
        exemption_certificate_id="EXM-2026-0001-FC",
        exemption_certificate_generated_at=datetime.utcnow() - timedelta(days=3),
        created_at=datetime.utcnow() - timedelta(days=3),
    )
    db.add(request_7)
    print(f"   ⚪ Scenario 7: Auto-Exempt (financed_transaction) - 1500 Main Street")
    
    # --- SCENARIO 8: Auto-Exempt - SEC Reporting Company ---
    request_8 = SubmissionRequest(
        company_id=demo_company.id,
        requested_by_user_id=client_admin.id,
        status="exempt",
        property_address={
            "street": "200 Park Avenue",
            "city": "New York",
            "state": "NY",
            "zip": "10166",
        },
        purchase_price_cents=1200000000,  # $12,000,000
        expected_closing_date=date.today() + timedelta(days=45),
        escrow_number="ESC-2026-0970",
        financing_type="cash",
        buyer_name="Fortune 500 Corp (NYSE: F5C)",
        buyer_email="legal@fortune500corp.com",
        buyer_type="entity",
        property_type="commercial",
        entity_subtype="public_company",  # SEC reporting = Exempt
        seller_name="Manhattan Holdings Trust",
        seller_email="trustee@manhattanholdings.com",
        # Early determination fields
        determination_result="exempt",
        exemption_reasons=["public_company"],
        determination_timestamp=datetime.utcnow() - timedelta(days=7),
        determination_method="auto",
        exemption_certificate_id="EXM-2026-0002-PC",
        exemption_certificate_generated_at=datetime.utcnow() - timedelta(days=7),
        created_at=datetime.utcnow() - timedelta(days=7),
    )
    db.add(request_8)
    print(f"   ⚪ Scenario 8: Auto-Exempt (public_company) - 200 Park Avenue")
    
    # --- SCENARIO 9: Auto-Exempt - Government Entity ---
    request_9 = SubmissionRequest(
        company_id=acme_company.id,  # Different company for variety
        requested_by_user_id=acme_admin.id,
        status="exempt",
        property_address={
            "street": "100 Government Plaza",
            "city": "Sacramento",
            "state": "CA",
            "zip": "95814",
        },
        purchase_price_cents=890000000,  # $8,900,000
        expected_closing_date=date.today() + timedelta(days=60),
        escrow_number="ACME-2026-0100",
        financing_type="cash",
        buyer_name="State of California - General Services",
        buyer_email="procurement@ca.gov",
        buyer_type="entity",
        property_type="commercial",
        entity_subtype="government",  # Government = Exempt
        seller_name="California Office Partners LLC",
        seller_email="legal@caoffice.com",
        # Early determination fields
        determination_result="exempt",
        exemption_reasons=["government_entity"],
        determination_timestamp=datetime.utcnow() - timedelta(days=5),
        determination_method="auto",
        exemption_certificate_id="EXM-2026-0003-GV",
        exemption_certificate_generated_at=datetime.utcnow() - timedelta(days=5),
        created_at=datetime.utcnow() - timedelta(days=5),
    )
    db.add(request_9)
    print(f"   ⚪ Scenario 9: Auto-Exempt (government_entity) - 100 Government Plaza")
    
    # --- SCENARIO 10: Auto-Exempt - Individual Buyer (Non-Entity) ---
    request_10 = SubmissionRequest(
        company_id=demo_company.id,
        requested_by_user_id=client_user.id,  # Different user
        status="exempt",
        property_address={
            "street": "456 Residential Lane",
            "city": "Austin",
            "state": "TX",
            "zip": "78701",
        },
        purchase_price_cents=75000000,  # $750,000
        expected_closing_date=date.today() + timedelta(days=30),
        escrow_number="ESC-2026-0965",
        financing_type="cash",
        buyer_name="Robert Smith",  # Individual buyer
        buyer_email="rsmith@personal.com",
        buyer_type="individual",  # Individual = Exempt from FinCEN (for this rule)
        seller_name="Austin Investments LLC",
        seller_email="sales@austinenvestments.com",
        # Early determination fields
        determination_result="exempt",
        exemption_reasons=["individual_buyer"],
        determination_timestamp=datetime.utcnow() - timedelta(days=2),
        determination_method="auto",
        exemption_certificate_id="EXM-2026-0004-IB",
        exemption_certificate_generated_at=datetime.utcnow() - timedelta(days=2),
        created_at=datetime.utcnow() - timedelta(days=2),
    )
    db.add(request_10)
    print(f"   ⚪ Scenario 10: Auto-Exempt (individual_buyer) - 456 Residential Lane")
    
    # --- SCENARIO 11: Reportable - Requires Filing ---
    request_11 = SubmissionRequest(
        company_id=demo_company.id,
        requested_by_user_id=client_admin.id,
        status="reportable",  # Determined as reportable
        property_address={
            "street": "999 Investment Drive",
            "city": "Phoenix",
            "state": "AZ",
            "zip": "85001",
        },
        purchase_price_cents=135000000,  # $1,350,000
        expected_closing_date=date.today() + timedelta(days=25),
        escrow_number="ESC-2026-0960",
        financing_type="cash",
        buyer_name="Desert Holdings LLC",
        buyer_email="acquisitions@desertholdings.com",
        buyer_type="entity",
        property_type="residential",
        entity_subtype="llc",  # Private LLC = Reportable
        seller_name="Arizona Properties Inc",
        seller_email="legal@azproperties.com",
        # Early determination fields
        determination_result="reportable",
        exemption_reasons=None,  # No exemption
        determination_timestamp=datetime.utcnow() - timedelta(days=1),
        determination_method="auto",
        exemption_certificate_id=None,
        created_at=datetime.utcnow() - timedelta(days=1),
    )
    db.add(request_11)
    print(f"   📋 Scenario 11: Reportable (no exemption) - 999 Investment Drive")
    
    # =========================================================================
    # COMMIT ALL
    # =========================================================================
    
    db.commit()
    
    print("")
    print("✅ Demo seed complete!")
    print("")
    print("📊 Summary:")
    print(f"   • 11 SubmissionRequests:")
    print(f"      - 1 pending (no report yet)")
    print(f"      - 3 in_progress (linked to reports)")
    print(f"      - 2 completed (filed/exempt with manual review)")
    print(f"      - 4 auto-exempt (early determination)")
    print(f"      - 1 reportable (awaiting wizard start)")
    print(f"   • 5 Reports (1 draft, 1 collecting, 1 ready_to_file, 1 filed, 1 exempt)")
    print(f"   • All requests properly linked to their reports")
    print(f"   • 1 active party portal link for testing")
    print(f"   • Early Exemption Reasons Showcased:")
    print(f"      - financed_transaction")
    print(f"      - public_company")
    print(f"      - government_entity")
    print(f"      - individual_buyer")
    print("")
    if active_portal_link:
        print(f"🔗 Demo portal link: /p/{active_portal_link}")
    
    return {
        "requests_created": 11,
        "reports_created": 5,
        "parties_created": 6,
        "filed_reports": 1,
        "exempt_reports": 1,
        "auto_exempt_submissions": 4,
        "reportable_submissions": 1,
        "active_portal_link": f"/p/{active_portal_link}" if active_portal_link else None,
    }
