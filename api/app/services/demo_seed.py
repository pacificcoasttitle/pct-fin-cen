"""
Demo seed service for staging environment.

Provides functions to reset and seed demo data safely.
"""
from datetime import datetime, timedelta
from typing import Dict, Any, Tuple, List, Optional
from sqlalchemy.orm import Session

from app.models import (
    Report, ReportParty, PartyLink, Document, AuditLog, FilingSubmission,
    NotificationEvent, Company, User, SubmissionRequest, BillingEvent, Invoice,
)


def reset_demo_data(db: Session) -> None:
    """
    Delete all demo data in correct FK order to avoid constraint errors.
    
    Order: billing_events → invoices → submission_requests → documents → party_links → 
           filing_submissions → report_parties → audit_log → reports → users → companies
    
    Note: We preserve the PCT company and its users since those are foundational.
    """
    # Delete billing/invoices first
    db.query(BillingEvent).delete()
    db.query(Invoice).delete()
    
    # Delete submission requests (they reference reports)
    db.query(SubmissionRequest).delete()
    
    # Delete report-related data
    db.query(NotificationEvent).delete()
    db.query(Document).delete()
    db.query(PartyLink).delete()
    db.query(FilingSubmission).delete()
    db.query(ReportParty).delete()
    db.query(AuditLog).delete()
    db.query(Report).delete()
    
    # Note: We don't delete Companies or Users - those are foundational
    db.flush()


def seed_pct_company(db: Session) -> Company:
    """
    Seed Pacific Coast Title as the internal company.
    
    This is idempotent - if PCT already exists, returns the existing record.
    """
    pct = db.query(Company).filter(Company.code == "PCT").first()
    if not pct:
        pct = Company(
            name="Pacific Coast Title Company",
            code="PCT",
            company_type="internal",
            billing_email="billing@pacificcoasttitle.com",
            billing_contact_name="Accounting Department",
            phone="(555) 123-4567",
            address={
                "street": "1234 Title Way",
                "city": "Los Angeles",
                "state": "CA",
                "zip": "90001",
            },
            status="active",
            settings={
                "default_filing_fee_cents": 15000,  # $150 per filing
                "expedite_fee_cents": 7500,  # $75 expedite fee
            },
        )
        db.add(pct)
        db.flush()
    return pct


def seed_demo_users(db: Session, pct_company: Optional[Company] = None) -> List[User]:
    """
    Seed demo users for PCT.
    
    PCT internal staff have company_id = NULL (they're not a client).
    This is idempotent - only creates users that don't exist.
    """
    users = []
    demo_users = [
        {
            "email": "admin@pctfincen.com",
            "name": "Demo Admin",
            "role": "pct_admin",
            "company_id": None,  # PCT staff have NULL company_id
        },
        {
            "email": "staff@pctfincen.com",
            "name": "Demo Staff",
            "role": "pct_staff",
            "company_id": None,
        },
    ]
    
    for user_data in demo_users:
        user = db.query(User).filter(User.email == user_data["email"]).first()
        if not user:
            user = User(**user_data)
            db.add(user)
        users.append(user)
    
    db.flush()
    return users


def seed_demo_client_company(db: Session) -> Tuple[Company, List[User]]:
    """
    Seed a demo client company with users for testing multi-tenancy.
    
    Returns: (company, users)
    """
    # Create demo client company
    client = db.query(Company).filter(Company.code == "DEMO").first()
    if not client:
        client = Company(
            name="Demo Title & Escrow",
            code="DEMO",
            company_type="client",
            billing_email="billing@demotitle.com",
            billing_contact_name="Jane Billing",
            phone="(555) 987-6543",
            address={
                "street": "100 Escrow Blvd",
                "city": "San Diego",
                "state": "CA",
                "zip": "92101",
            },
            status="active",
        )
        db.add(client)
        db.flush()
    
    # Create client users
    client_users = []
    client_user_data = [
        {
            "email": "admin@demotitle.com",
            "name": "Client Admin",
            "role": "client_admin",
            "company_id": client.id,
        },
        {
            "email": "user@demotitle.com",
            "name": "Client User",
            "role": "client_user",
            "company_id": client.id,
        },
    ]
    
    for user_data in client_user_data:
        user = db.query(User).filter(User.email == user_data["email"]).first()
        if not user:
            user = User(**user_data)
            db.add(user)
        client_users.append(user)
    
    db.flush()
    return client, client_users


def seed_foundation_data(db: Session) -> Dict[str, Any]:
    """
    Seed all foundation data: PCT company, demo users, demo client.
    
    Call this once after migration to set up the base data.
    Returns dict with created entities.
    """
    pct = seed_pct_company(db)
    pct_users = seed_demo_users(db, pct)
    demo_client, client_users = seed_demo_client_company(db)
    
    db.commit()
    
    return {
        "pct_company": pct,
        "pct_users": pct_users,
        "demo_client": demo_client,
        "client_users": client_users,
    }


def seed_demo_reports(db: Session) -> int:
    """
    Create 6 demo reports with varied statuses.
    
    Returns the number of reports created.
    """
    reports_created = 0
    
    # ===== EXEMPT REPORTS =====
    
    # 1. Exempt: Commercial property
    r1 = Report(
        status="exempt",
        property_address_text="500 Commerce Drive, Suite 200, Business City, CA 90210",
        closing_date=datetime.utcnow().date() + timedelta(days=14),
        filing_deadline=datetime.utcnow().date() + timedelta(days=44),
        wizard_step=5,
        wizard_data={
            "phase": "determination",
            "determinationStep": "determination-result",
            "determination": {
                "isResidential": "no",
                "hasIntentToBuild": "no",
            },
        },
        determination={
            "reportable": False,
            "reason_code": "non_residential",
            "reason_text": "Non-residential property with no intent to build residential",
            "required_sections": [],
            "required_certifications": [],
            "path_trace": ["residential_check", "non_residential_exempt"],
        },
    )
    db.add(r1)
    reports_created += 1
    
    # 2. Exempt: Conventional mortgage
    r2 = Report(
        status="exempt",
        property_address_text="123 Maple Street, Suburbia, CA 91001",
        closing_date=datetime.utcnow().date() + timedelta(days=7),
        filing_deadline=datetime.utcnow().date() + timedelta(days=37),
        wizard_step=5,
        wizard_data={
            "phase": "determination",
            "determinationStep": "determination-result",
            "determination": {
                "isResidential": "yes",
                "isNonFinanced": "no",
                "lenderHasAml": "yes",
            },
        },
        determination={
            "reportable": False,
            "reason_code": "lender_aml",
            "reason_text": "Lender has active AML program covering this transaction",
            "required_sections": [],
            "required_certifications": [],
            "path_trace": ["residential_check", "financing_check", "lender_aml_exempt"],
        },
    )
    db.add(r2)
    reports_created += 1
    
    # 3. Exempt: Government entity buyer
    r3 = Report(
        status="exempt",
        property_address_text="789 Federal Way, Government Heights, CA 92001",
        closing_date=datetime.utcnow().date() + timedelta(days=21),
        filing_deadline=datetime.utcnow().date() + timedelta(days=51),
        wizard_step=5,
        wizard_data={
            "phase": "determination",
            "determinationStep": "determination-result",
            "determination": {
                "isResidential": "yes",
                "isNonFinanced": "yes",
                "buyerType": "entity",
                "entityExemptions": ["government"],
            },
        },
        determination={
            "reportable": False,
            "reason_code": "exempt_entity_government",
            "reason_text": "Buyer is a governmental authority (exempt entity)",
            "required_sections": [],
            "required_certifications": [],
            "path_trace": ["residential_check", "cash_transaction", "entity_exemption_government"],
        },
    )
    db.add(r3)
    reports_created += 1
    
    # ===== REPORTABLE REPORTS =====
    
    # 4. Reportable: Cash LLC buyer (draft/awaiting parties)
    r4 = Report(
        status="awaiting_parties",
        property_address_text="456 Oak Avenue, Richville, CA 90402",
        closing_date=datetime.utcnow().date() + timedelta(days=10),
        filing_deadline=datetime.utcnow().date() + timedelta(days=40),
        wizard_step=5,
        wizard_data={
            "phase": "collection",
            "determinationStep": "determination-result",
            "collectionStep": "buyer-info",
            "determination": {
                "isResidential": "yes",
                "isNonFinanced": "yes",
                "buyerType": "entity",
                "entityExemptions": ["none"],
            },
        },
        determination={
            "reportable": True,
            "reason_code": "reportable_entity",
            "reason_text": "Cash purchase by non-exempt entity - FinCEN report required",
            "required_sections": ["buyer", "seller", "transaction"],
            "required_certifications": ["buyer_certification"],
            "path_trace": ["residential_check", "cash_transaction", "entity_no_exemption"],
        },
    )
    db.add(r4)
    db.flush()
    
    # Add parties for r4
    buyer_party = ReportParty(
        report_id=r4.id,
        party_role="buyer",
        entity_type="llc",
        display_name="Oak Investments LLC",
        status="pending",
        party_data={},
    )
    db.add(buyer_party)
    db.flush()
    
    buyer_link = PartyLink(
        report_party_id=buyer_party.id,
        expires_at=datetime.utcnow() + timedelta(days=30),
        status="active",
    )
    db.add(buyer_link)
    
    seller_party = ReportParty(
        report_id=r4.id,
        party_role="seller",
        entity_type="individual",
        display_name="Jane Seller",
        status="pending",
        party_data={},
    )
    db.add(seller_party)
    db.flush()
    
    seller_link = PartyLink(
        report_party_id=seller_party.id,
        expires_at=datetime.utcnow() + timedelta(days=30),
        status="active",
    )
    db.add(seller_link)
    reports_created += 1
    
    # 5. Reportable: Trust buyer (collecting - parties partially submitted)
    r5 = Report(
        status="awaiting_parties",
        property_address_text="999 Investment Blvd, Wealthton, CA 94301",
        closing_date=datetime.utcnow().date() + timedelta(days=5),
        filing_deadline=datetime.utcnow().date() + timedelta(days=35),
        wizard_step=5,
        wizard_data={
            "phase": "collection",
            "determinationStep": "determination-result",
            "collectionStep": "certifications",
            "determination": {
                "isResidential": "yes",
                "isNonFinanced": "yes",
                "buyerType": "trust",
                "trustExemptions": ["none"],
            },
        },
        determination={
            "reportable": True,
            "reason_code": "reportable_trust",
            "reason_text": "Cash purchase by non-exempt trust - FinCEN report required",
            "required_sections": ["buyer", "seller", "transaction", "beneficial_owner"],
            "required_certifications": ["buyer_certification", "seller_certification"],
            "path_trace": ["residential_check", "cash_transaction", "trust_no_exemption"],
        },
    )
    db.add(r5)
    db.flush()
    
    # Add submitted buyer party
    trust_party = ReportParty(
        report_id=r5.id,
        party_role="buyer",
        entity_type="trust",
        display_name="Sunset Family Trust",
        status="submitted",
        party_data={
            "entity_name": "Sunset Family Trust",
            "trust_date": "2015-06-01",
            "trustee_name": "First National Bank",
            "email": "trust@example.com",
            "address_line1": "999 Investment Blvd",
            "city": "Wealthton",
            "state": "CA",
            "zip_code": "94301",
        },
    )
    db.add(trust_party)
    db.flush()
    
    # Add pending seller party
    seller5 = ReportParty(
        report_id=r5.id,
        party_role="seller",
        entity_type="individual",
        display_name="Robert Previous Owner",
        status="pending",
        party_data={"first_name": "Robert", "last_name": "Previous Owner"},
    )
    db.add(seller5)
    db.flush()
    
    seller5_link = PartyLink(
        report_party_id=seller5.id,
        expires_at=datetime.utcnow() + timedelta(days=14),
        status="active",
    )
    db.add(seller5_link)
    reports_created += 1
    
    # 6. Reportable: Ready to file (all parties submitted)
    r6 = Report(
        status="ready_to_file",
        property_address_text="777 Trust Lane, Estate Hills, CA 94027",
        closing_date=datetime.utcnow().date() + timedelta(days=3),
        filing_deadline=datetime.utcnow().date() + timedelta(days=33),
        wizard_step=5,
        wizard_data={
            "phase": "summary",
            "determinationStep": "determination-result",
            "collectionStep": "certifications",
            "determination": {
                "isResidential": "yes",
                "isNonFinanced": "yes",
                "buyerType": "entity",
                "entityExemptions": ["none"],
            },
            "collection": {
                "closingDate": (datetime.utcnow().date() + timedelta(days=3)).isoformat(),
                "purchasePrice": 2500000,
            },
        },
        determination={
            "reportable": True,
            "reason_code": "reportable_entity",
            "reason_text": "Cash purchase by non-exempt LLC - FinCEN report required",
            "required_sections": ["buyer", "seller", "transaction"],
            "required_certifications": ["buyer_certification"],
            "path_trace": ["residential_check", "cash_transaction", "entity_no_exemption"],
        },
    )
    db.add(r6)
    db.flush()
    
    # Add submitted parties for r6
    buyer6 = ReportParty(
        report_id=r6.id,
        party_role="buyer",
        entity_type="llc",
        display_name="Estate Holdings LLC",
        status="submitted",
        party_data={
            "entity_name": "Estate Holdings LLC",
            "ein": "12-3456789",
            "formation_state": "Delaware",
            "email": "contact@estateholdings.com",
            "address_line1": "777 Trust Lane",
            "city": "Estate Hills",
            "state": "CA",
            "zip_code": "94027",
        },
    )
    db.add(buyer6)
    
    seller6 = ReportParty(
        report_id=r6.id,
        party_role="seller",
        entity_type="individual",
        display_name="Charles Johnson",
        status="submitted",
        party_data={
            "first_name": "Charles",
            "last_name": "Johnson",
            "date_of_birth": "1960-11-22",
            "email": "charles@example.com",
            "address_line1": "100 Previous Home Dr",
            "city": "Estate Hills",
            "state": "CA",
            "zip_code": "94027",
        },
    )
    db.add(seller6)
    reports_created += 1
    
    db.flush()
    return reports_created


def create_single_demo_report(db: Session) -> Tuple[str, str]:
    """
    Create a single demo report with minimal data for quick testing.
    
    Returns tuple of (report_id, wizard_url_path).
    """
    from app.config import get_settings
    settings = get_settings()
    
    report = Report(
        status="draft",
        property_address_text=f"Demo Property {datetime.utcnow().strftime('%H:%M:%S')}",
        closing_date=datetime.utcnow().date() + timedelta(days=14),
        wizard_step=1,
        wizard_data={
            "phase": "determination",
            "determinationStep": "property",
            "determination": {
                "isResidential": "yes",
                "isNonFinanced": "yes",
                "buyerType": "entity",
            },
        },
    )
    db.add(report)
    db.flush()
    
    wizard_url = f"{settings.APP_BASE_URL}/app/reports/{report.id}/wizard"
    
    return str(report.id), wizard_url
