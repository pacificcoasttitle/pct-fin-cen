#!/usr/bin/env python
"""
Seed script to create 6 demo reports (3 exempt, 3 reportable).

Usage:
    python -m scripts.seed_demo
    
Or via make:
    make seed
"""
import sys
import os
from datetime import datetime, timedelta

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models import Report, ReportParty, PartyLink, AuditLog
from app.services.determination import determine_reportability


def create_demo_reports(db=None):
    """Create 6 demo reports for testing.
    
    Args:
        db: Optional SQLAlchemy session. If not provided, creates a new one.
    """
    close_db = False
    if db is None:
        db = SessionLocal()
        close_db = True
        # Clear existing demo data (optional - comment out to keep)
        print("Clearing existing reports...")
        db.query(AuditLog).delete()
        db.query(PartyLink).delete()
        db.query(ReportParty).delete()
        db.query(Report).delete()
        db.commit()
    
    try:
        reports_created = []
        
        # ===== EXEMPT REPORTS =====
        
        # 1. Exempt: Commercial property
        print("\n1. Creating exempt report: Commercial property...")
        r1 = Report(
            status="exempt",
            property_address_text="500 Commerce Drive, Suite 200, Business City, CA 90210",
            closing_date=datetime.utcnow().date() + timedelta(days=14),
            filing_deadline=datetime.utcnow().date() + timedelta(days=44),
            wizard_step=5,
            wizard_data={
                "step1": {"is_residential": False, "property_type": "commercial"},
            },
            determination={
                "final_result": "exempt",
                "exemption_reason": "non_residential",
                "checks_performed": [{"check": "residential_property", "result": "exempt"}],
            },
        )
        db.add(r1)
        db.flush()
        reports_created.append(("Commercial Property (Exempt)", r1.id))
        
        # 2. Exempt: Conventional mortgage
        print("2. Creating exempt report: Conventional mortgage...")
        r2 = Report(
            status="exempt",
            property_address_text="123 Maple Street, Suburbia, CA 91001",
            closing_date=datetime.utcnow().date() + timedelta(days=7),
            filing_deadline=datetime.utcnow().date() + timedelta(days=37),
            wizard_step=5,
            wizard_data={
                "step1": {"is_residential": True},
                "step2": {"is_cash_transaction": False, "financing_type": "conventional"},
            },
            determination={
                "final_result": "exempt",
                "exemption_reason": "regulated_financing",
                "checks_performed": [
                    {"check": "residential_property", "result": "pass"},
                    {"check": "financing_type", "result": "exempt"},
                ],
            },
        )
        db.add(r2)
        db.flush()
        reports_created.append(("Conventional Mortgage (Exempt)", r2.id))
        
        # 3. Exempt: Government entity buyer
        print("3. Creating exempt report: Government entity...")
        r3 = Report(
            status="exempt",
            property_address_text="789 Federal Way, Government Heights, CA 92001",
            closing_date=datetime.utcnow().date() + timedelta(days=21),
            filing_deadline=datetime.utcnow().date() + timedelta(days=51),
            wizard_step=5,
            wizard_data={
                "step1": {"is_residential": True},
                "step2": {"is_cash_transaction": True},
                "step3": {"transferee_type": "other", "transferee_count": 1},
                "step4": {"exemptions": {"is_government_entity": True}},
            },
            determination={
                "final_result": "exempt",
                "exemption_reason": "is_government_entity",
                "exemptions_checked": [
                    {"exemption": "is_government_entity", "value": True},
                ],
            },
        )
        db.add(r3)
        db.flush()
        reports_created.append(("Government Entity (Exempt)", r3.id))
        
        # ===== REPORTABLE REPORTS =====
        
        # 4. Reportable: Cash individual buyer (ready to collect)
        print("4. Creating reportable report: Cash individual buyer...")
        r4 = Report(
            status="determination_complete",
            property_address_text="456 Oak Avenue, Richville, CA 90402",
            closing_date=datetime.utcnow().date() + timedelta(days=10),
            filing_deadline=datetime.utcnow().date() + timedelta(days=40),
            wizard_step=5,
            wizard_data={
                "step1": {"is_residential": True},
                "step2": {"is_cash_transaction": True},
                "step3": {"transferee_type": "individual", "transferee_count": 1},
                "step4": {"exemptions": {}},
            },
            determination={
                "final_result": "reportable",
                "checks_performed": [
                    {"check": "residential_property", "result": "pass"},
                    {"check": "financing_type", "result": "pass"},
                    {"check": "transferee_type", "result": "check_exemptions"},
                ],
                "exemptions_checked": [],
                "required_parties": [
                    {"party_role": "transferee", "entity_type": "individual", "description": "Transferee (Buyer)"}
                ],
            },
        )
        db.add(r4)
        db.flush()
        reports_created.append(("Cash Individual Buyer (Reportable)", r4.id))
        
        # 5. Reportable: Cash LLC buyer with beneficial owners (collecting)
        print("5. Creating reportable report: Cash LLC with BOs...")
        r5 = Report(
            status="collecting",
            property_address_text="999 Investment Blvd, Wealthton, CA 94301",
            closing_date=datetime.utcnow().date() + timedelta(days=5),
            filing_deadline=datetime.utcnow().date() + timedelta(days=35),
            wizard_step=5,
            wizard_data={
                "step1": {"is_residential": True},
                "step2": {"is_cash_transaction": True},
                "step3": {"transferee_type": "llc", "transferee_count": 1, "beneficial_owner_count": 2},
                "step4": {"exemptions": {}},
            },
            determination={
                "final_result": "reportable",
                "required_parties": [
                    {"party_role": "transferee", "entity_type": "llc", "description": "Transferee (Buyer)"},
                    {"party_role": "beneficial_owner", "entity_type": "individual", "description": "Beneficial Owner 1"},
                    {"party_role": "beneficial_owner", "entity_type": "individual", "description": "Beneficial Owner 2"},
                ],
            },
        )
        db.add(r5)
        db.flush()
        
        # Add parties and links for this report
        llc_party = ReportParty(
            report_id=r5.id,
            party_role="transferee",
            entity_type="llc",
            display_name="Sunset Holdings LLC",
            status="submitted",
            party_data={
                "entity_name": "Sunset Holdings LLC",
                "ein": "12-3456789",
                "formation_state": "Delaware",
                "address": "999 Investment Blvd, Wealthton, CA 94301",
            },
        )
        db.add(llc_party)
        db.flush()
        
        bo1 = ReportParty(
            report_id=r5.id,
            party_role="beneficial_owner",
            entity_type="individual",
            display_name="Alice Johnson",
            status="submitted",
            party_data={
                "first_name": "Alice",
                "last_name": "Johnson",
                "dob": "1975-03-15",
                "ssn_last4": "1234",
                "address": "100 Rich Lane, Wealthton, CA 94301",
            },
        )
        db.add(bo1)
        db.flush()
        
        bo2 = ReportParty(
            report_id=r5.id,
            party_role="beneficial_owner",
            entity_type="individual",
            display_name="Bob Smith",
            status="in_progress",
            party_data={
                "first_name": "Bob",
                "last_name": "Smith",
            },
        )
        db.add(bo2)
        db.flush()
        
        # Create active link for Bob
        bo2_link = PartyLink(
            report_party_id=bo2.id,
            expires_at=datetime.utcnow() + timedelta(days=7),
            status="active",
        )
        db.add(bo2_link)
        db.flush()
        
        reports_created.append(("Cash LLC with BOs (Collecting)", r5.id))
        
        # 6. Reportable: Seller financing trust buyer (ready to file)
        print("6. Creating reportable report: Seller financing trust...")
        r6 = Report(
            status="ready_to_file",
            property_address_text="777 Trust Lane, Estate Hills, CA 94027",
            closing_date=datetime.utcnow().date() + timedelta(days=3),
            filing_deadline=datetime.utcnow().date() + timedelta(days=33),
            wizard_step=5,
            wizard_data={
                "step1": {"is_residential": True},
                "step2": {"is_cash_transaction": False, "financing_type": "seller_financing"},
                "step3": {"transferee_type": "trust", "transferee_count": 1, "beneficial_owner_count": 1},
                "step4": {"exemptions": {}},
            },
            determination={
                "final_result": "reportable",
                "required_parties": [
                    {"party_role": "transferee", "entity_type": "trust", "description": "Transferee (Buyer)"},
                    {"party_role": "beneficial_owner", "entity_type": "individual", "description": "Beneficial Owner 1"},
                ],
            },
        )
        db.add(r6)
        db.flush()
        
        # Add submitted parties
        trust_party = ReportParty(
            report_id=r6.id,
            party_role="transferee",
            entity_type="trust",
            display_name="The Johnson Family Trust",
            status="submitted",
            party_data={
                "entity_name": "The Johnson Family Trust",
                "trust_date": "2015-06-01",
                "trustee_name": "First National Bank",
                "address": "777 Trust Lane, Estate Hills, CA 94027",
            },
        )
        db.add(trust_party)
        db.flush()
        
        trust_bo = ReportParty(
            report_id=r6.id,
            party_role="beneficial_owner",
            entity_type="individual",
            display_name="Charles Johnson",
            status="submitted",
            party_data={
                "first_name": "Charles",
                "last_name": "Johnson",
                "dob": "1960-11-22",
                "ssn_last4": "5678",
                "id_type": "drivers_license",
                "id_number": "D1234567",
                "id_state": "CA",
                "address": "777 Trust Lane, Estate Hills, CA 94027",
            },
        )
        db.add(trust_bo)
        db.flush()
        
        reports_created.append(("Seller Financing Trust (Ready to File)", r6.id))
        
        # Commit all changes
        db.commit()
        
        print("\n" + "=" * 60)
        print("✅ Demo data created successfully!")
        print("=" * 60)
        print("\nReports created:")
        for name, report_id in reports_created:
            print(f"  - {name}")
            print(f"    ID: {report_id}")
        
        # Print the active link for testing
        print(f"\n📎 Active party link for testing:")
        print(f"   Token: {bo2_link.token}")
        print(f"   Party: Bob Smith (Beneficial Owner)")
        print(f"   Expires: {bo2_link.expires_at}")
        
        print("\n" + "=" * 60)
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error creating demo data: {e}")
        raise
    finally:
        if close_db:
            db.close()


if __name__ == "__main__":
    create_demo_reports()
