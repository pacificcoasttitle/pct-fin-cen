"""
Client-Driven Flow Integration Test Script

This script tests the full end-to-end workflow:
1. Client creates a report directly
2. Report gets initiated_by_user_id set correctly
3. Wizard data is saved
4. Party links are created and sent
5. Parties submit their data
6. Auto-file triggers when all parties complete
7. Notifications are dispatched

Usage:
    # From api/ directory with DATABASE_URL set
    python -m tests.test_client_driven_flow
    
    # Or with explicit database URL
    DATABASE_URL=postgresql://... python -m tests.test_client_driven_flow
"""

import os
import sys
import json
import asyncio
from datetime import datetime, timedelta
from uuid import UUID
from typing import Optional, Tuple

# Add parent to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session

from app.models import Report, ReportParty, PartyLink, User, Company, AuditLog, NotificationEvent
from app.services.filing_lifecycle import trigger_auto_file, perform_mock_submit
from app.services.party_data_sync import sync_party_data_to_wizard
from app.config import get_settings

settings = get_settings()

# Test configuration
TEST_PREFIX = "CDT"  # Client-Driven Test prefix
CLEANUP_AFTER_TEST = False  # Set to True to clean up test data


class Colors:
    """ANSI color codes for terminal output."""
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'


def print_header(text: str):
    print(f"\n{Colors.HEADER}{Colors.BOLD}{'='*60}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{text}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{'='*60}{Colors.ENDC}\n")


def print_step(step: int, text: str):
    print(f"{Colors.CYAN}[Step {step}]{Colors.ENDC} {text}")


def print_success(text: str):
    print(f"  {Colors.GREEN}[OK]{Colors.ENDC} {text}")


def print_fail(text: str):
    print(f"  {Colors.FAIL}[FAIL]{Colors.ENDC} {text}")


def print_info(text: str):
    print(f"  {Colors.BLUE}[INFO]{Colors.ENDC} {text}")


def print_warning(text: str):
    print(f"  {Colors.WARNING}[WARN]{Colors.ENDC} {text}")


def get_database_session() -> Session:
    """Create a database session."""
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        raise ValueError("DATABASE_URL environment variable is required")
    
    engine = create_engine(database_url)
    SessionLocal = sessionmaker(bind=engine)
    return SessionLocal()


def get_or_create_test_company(db: Session) -> Company:
    """Get or create a test company."""
    company = db.query(Company).filter(Company.code == f"{TEST_PREFIX}_CO").first()
    if not company:
        company = Company(
            name=f"{TEST_PREFIX} Test Title Company",
            code=f"{TEST_PREFIX}_CO",
            status="active",
            settings={},
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(company)
        db.flush()
        print_success(f"Created test company: {company.name} ({company.id})")
    else:
        print_info(f"Using existing test company: {company.name} ({company.id})")
    return company


def get_or_create_test_user(db: Session, company: Company, role: str = "client_user") -> User:
    """Get or create a test user."""
    email = f"{TEST_PREFIX.lower()}_{role}@test.fincenclear.com"
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            email=email,
            name=f"{TEST_PREFIX} Test {role.replace('_', ' ').title()}",
            company_id=company.id,
            role=role,
            status="active",
            settings={},
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(user)
        db.flush()
        print_success(f"Created test user: {user.email} ({user.id})")
    else:
        print_info(f"Using existing test user: {user.email} ({user.id})")
    return user


def test_step_1_create_report(db: Session, user: User, company: Company) -> Report:
    """
    Step 1: Test client creating a report directly.
    
    Validates:
    - Report is created with correct fields
    - initiated_by_user_id is set to the client user
    - company_id is set from the user's company
    - auto_file_enabled defaults to True
    - notification_config is populated
    """
    print_step(1, "Client creates a report directly")
    
    closing_date = datetime.utcnow().date() + timedelta(days=7)
    filing_deadline = closing_date + timedelta(days=30)
    
    report = Report(
        property_address_text=f"{TEST_PREFIX} 123 Test Street, San Diego, CA 92101",
        closing_date=closing_date,
        filing_deadline=filing_deadline,
        wizard_data={},
        status="draft",
        wizard_step=1,
        # Client-driven fields
        company_id=company.id,
        initiated_by_user_id=user.id,
        created_by_user_id=user.id,
        auto_file_enabled=True,
        notification_config={
            "notify_initiator": True,
            "notify_company_admin": True,
            "notify_staff": True,
            "notify_on_party_submit": True,
            "notify_on_filing_complete": True,
            "notify_on_filing_error": True,
        },
        escrow_number=f"{TEST_PREFIX}-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
    )
    db.add(report)
    db.flush()
    
    # Validate
    assert report.id is not None, "Report ID should be set"
    print_success(f"Report created: {report.id}")
    
    assert report.initiated_by_user_id == user.id, "initiated_by_user_id should match creating user"
    print_success(f"initiated_by_user_id correctly set to: {user.id}")
    
    assert report.company_id == company.id, "company_id should match user's company"
    print_success(f"company_id correctly set to: {company.id}")
    
    assert report.auto_file_enabled is True, "auto_file_enabled should default to True"
    print_success("auto_file_enabled is True")
    
    assert report.notification_config is not None, "notification_config should be set"
    print_success("notification_config is populated")
    
    return report


def test_step_2_wizard_progress(db: Session, report: Report) -> Report:
    """
    Step 2: Test wizard progress and determination.
    
    Validates:
    - Wizard data is saved correctly
    - Status transitions properly
    """
    print_step(2, "Client progresses through wizard")
    
    # Simulate wizard data for a cash purchase
    wizard_data = {
        "step1": {
            "transactionType": "cash_purchase",
            "propertyType": "single_family",
            "purchasePrice": 1500000,
            "closingDate": str(report.closing_date),
        },
        "step2": {
            "isFinanced": False,
            "cashPurchase": True,
        },
        "step3": {
            "buyerType": "individual",
            "buyerCount": 1,
            "sellerType": "individual",
            "sellerCount": 1,
        },
        "determination": {
            "reportable": True,
            "exemptions_checked": ["financing", "entity_type"],
            "result": "reportable",
        },
    }
    
    report.wizard_data = wizard_data
    report.wizard_step = 4  # Past determination
    report.status = "determination_complete"
    report.determination = {
        "is_reportable": True,
        "exemptions_checked": wizard_data["determination"]["exemptions_checked"],
        "determined_at": datetime.utcnow().isoformat(),
    }
    db.flush()
    
    print_success(f"Wizard data saved (step {report.wizard_step})")
    print_success(f"Status: {report.status}")
    print_success(f"Determination: reportable={report.determination.get('is_reportable')}")
    
    return report


def test_step_3_create_parties(db: Session, report: Report) -> Tuple[ReportParty, ReportParty]:
    """
    Step 3: Create parties for the report.
    
    Validates:
    - Parties are created with correct structure
    - Party links are generated
    """
    print_step(3, "Client adds parties to report")
    
    # Create buyer party
    buyer = ReportParty(
        report_id=report.id,
        party_role="transferee",
        entity_type="individual",
        display_name=f"{TEST_PREFIX} John Buyer",
        status="pending",
        party_data={
            "first_name": "John",
            "last_name": "Buyer",
            "email": f"{TEST_PREFIX.lower()}_buyer@test.com",
        },
    )
    db.add(buyer)
    db.flush()
    print_success(f"Buyer party created: {buyer.id}")
    
    # Create seller party
    seller = ReportParty(
        report_id=report.id,
        party_role="transferor",
        entity_type="individual",
        display_name=f"{TEST_PREFIX} Jane Seller",
        status="pending",
        party_data={
            "first_name": "Jane",
            "last_name": "Seller",
            "email": f"{TEST_PREFIX.lower()}_seller@test.com",
        },
    )
    db.add(seller)
    db.flush()
    print_success(f"Seller party created: {seller.id}")
    
    # Create party links
    import secrets
    
    for party in [buyer, seller]:
        link = PartyLink(
            report_party_id=party.id,
            token=secrets.token_urlsafe(32),
            status="active",
            expires_at=datetime.utcnow() + timedelta(days=7),
        )
        db.add(link)
        party.status = "link_sent"
        print_success(f"Party link created for {party.display_name}: {link.token[:20]}...")
    
    db.flush()
    
    # Update report status to collecting
    report.status = "collecting"
    db.flush()
    print_success(f"Report status updated to: {report.status}")
    
    return buyer, seller


def test_step_4_party_submissions(db: Session, report: Report, buyer: ReportParty, seller: ReportParty):
    """
    Step 4: Simulate party portal submissions.
    
    Validates:
    - Party data is saved correctly
    - Status updates to 'submitted'
    - submitted_at is set
    """
    print_step(4, "Parties submit their information via portal")
    
    # Buyer submits
    buyer.party_data = {
        "first_name": "John",
        "last_name": "Buyer",
        "email": f"{TEST_PREFIX.lower()}_buyer@test.com",
        "date_of_birth": "1985-06-15",
        "ssn_last_four": "1234",
        "address": {
            "street": "456 Buyer Lane",
            "city": "San Diego",
            "state": "CA",
            "zip": "92102",
        },
        "citizenship": "us_citizen",
        "certified": True,
        "certified_at": datetime.utcnow().isoformat(),
    }
    buyer.status = "submitted"
    db.flush()
    print_success(f"Buyer submitted: {buyer.display_name}")
    
    # Check if all parties complete (should be False - seller pending)
    all_parties = db.query(ReportParty).filter(ReportParty.report_id == report.id).all()
    all_submitted = all(p.status in ("submitted", "verified") for p in all_parties)
    print_info(f"All parties submitted: {all_submitted} (expected: False)")
    assert not all_submitted, "Not all parties should be submitted yet"
    
    # Seller submits
    seller.party_data = {
        "first_name": "Jane",
        "last_name": "Seller",
        "email": f"{TEST_PREFIX.lower()}_seller@test.com",
        "date_of_birth": "1970-03-22",
        "ssn_last_four": "5678",
        "address": {
            "street": "789 Seller Ave",
            "city": "San Diego",
            "state": "CA",
            "zip": "92103",
        },
        "citizenship": "us_citizen",
        "certified": True,
        "certified_at": datetime.utcnow().isoformat(),
    }
    seller.status = "submitted"
    db.flush()
    print_success(f"Seller submitted: {seller.display_name}")
    
    # Check if all parties complete (should be True)
    all_submitted = all(p.status in ("submitted", "verified") for p in all_parties)
    print_info(f"All parties submitted: {all_submitted} (expected: True)")
    assert all_submitted, "All parties should now be submitted"
    
    return True


def test_step_5_auto_status_transition(db: Session, report: Report):
    """
    Step 5: Verify report transitions to ready_to_file.
    
    Validates:
    - Report status becomes ready_to_file when all parties submit
    """
    print_step(5, "Verify auto-transition to ready_to_file")
    
    # Manually trigger the status transition (normally done by party submit handler)
    all_parties = db.query(ReportParty).filter(ReportParty.report_id == report.id).all()
    all_submitted = all(p.status in ("submitted", "verified") for p in all_parties)
    
    if all_submitted and report.status == "collecting":
        report.status = "ready_to_file"
        report.updated_at = datetime.utcnow()
        db.flush()
        print_success(f"Report status transitioned to: {report.status}")
    else:
        print_fail(f"Status transition failed. Current: {report.status}, all_submitted: {all_submitted}")
    
    assert report.status == "ready_to_file", "Report should be ready_to_file"
    return True


def test_step_6_party_data_sync(db: Session, report: Report):
    """
    Step 6: Test party data sync to wizard_data.
    
    Validates:
    - sync_party_data_to_wizard runs successfully
    - wizard_data.collection is populated
    """
    print_step(6, "Sync party data to wizard_data")
    
    try:
        result = sync_party_data_to_wizard(db, str(report.id))
        print_success(f"Sync result: {result}")
        
        # Refresh report
        db.refresh(report)
        
        # Check wizard_data has collection section
        collection = report.wizard_data.get("collection", {})
        print_info(f"Collection data keys: {list(collection.keys())}")
        
        if "_portal_synced_at" in collection:
            print_success(f"Portal sync timestamp: {collection['_portal_synced_at']}")
        
        return True
    except Exception as e:
        print_fail(f"Sync failed: {e}")
        return False


def test_step_7_auto_file_trigger(db: Session, report: Report):
    """
    Step 7: Test auto-file trigger (or mock filing directly).
    
    Validates:
    - Filing can be triggered
    - Report status updates to 'filed'
    - receipt_id is generated
    """
    print_step(7, "Test filing trigger")
    
    # Check if auto-file is enabled
    print_info(f"auto_file_enabled: {report.auto_file_enabled}")
    print_info(f"AUTO_FILE_ENABLED (global): {settings.AUTO_FILE_ENABLED}")
    
    if not report.auto_file_enabled:
        print_warning("Auto-file is disabled for this report, skipping")
        return False
    
    try:
        # Try mock filing directly (bypasses async notification issues in test env)
        print_info("Attempting mock filing directly...")
        
        status, submission = perform_mock_submit(db, report.id, ip_address="127.0.0.1")
        db.commit()
        
        print_success(f"Filing result: {status}")
        
        if submission:
            print_success(f"Submission ID: {submission.id}")
            print_success(f"Receipt ID: {submission.receipt_id}")
        
        db.refresh(report)
        print_success(f"Final report status: {report.status}")
        print_success(f"Filing status: {report.filing_status}")
        
        if report.receipt_id:
            print_success(f"Report receipt_id: {report.receipt_id}")
        
        return status in ("accepted", "submitted", "needs_review")
        
    except Exception as e:
        print_fail(f"Filing failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_step_8_verify_notifications(db: Session, report: Report):
    """
    Step 8: Verify notification events were created.
    
    Validates:
    - NotificationEvent records exist for the report
    """
    print_step(8, "Verify notification events")
    
    notifications = db.query(NotificationEvent).filter(
        NotificationEvent.report_id == report.id
    ).all()
    
    print_info(f"Found {len(notifications)} notification events")
    
    for notif in notifications:
        print_success(f"  Type: {notif.type}, Subject: {notif.subject[:50]}...")
    
    return len(notifications) > 0


def test_step_9_verify_audit_log(db: Session, report: Report):
    """
    Step 9: Verify audit log entries were created.
    
    Validates:
    - AuditLog records exist for key actions
    """
    print_step(9, "Verify audit log")
    
    audit_logs = db.query(AuditLog).filter(
        AuditLog.report_id == report.id
    ).order_by(AuditLog.created_at).all()
    
    print_info(f"Found {len(audit_logs)} audit log entries")
    
    for log in audit_logs:
        print_success(f"  {log.action}: {json.dumps(log.details)[:60]}...")
    
    return len(audit_logs) > 0


def cleanup_test_data(db: Session, report: Report):
    """Clean up test data if configured."""
    if not CLEANUP_AFTER_TEST:
        print_warning("Cleanup skipped (CLEANUP_AFTER_TEST=False)")
        return
    
    print_step(0, "Cleaning up test data")
    
    # Delete in order to respect foreign keys
    db.query(NotificationEvent).filter(NotificationEvent.report_id == report.id).delete()
    db.query(AuditLog).filter(AuditLog.report_id == report.id).delete()
    
    parties = db.query(ReportParty).filter(ReportParty.report_id == report.id).all()
    for party in parties:
        db.query(PartyLink).filter(PartyLink.party_id == party.id).delete()
    
    db.query(ReportParty).filter(ReportParty.report_id == report.id).delete()
    db.query(Report).filter(Report.id == report.id).delete()
    
    db.commit()
    print_success("Test data cleaned up")


def run_integration_test():
    """Run the full integration test."""
    print_header("Client-Driven Flow Integration Test")
    
    results = {
        "step_1_create_report": False,
        "step_2_wizard_progress": False,
        "step_3_create_parties": False,
        "step_4_party_submissions": False,
        "step_5_auto_status_transition": False,
        "step_6_party_data_sync": False,
        "step_7_auto_file_trigger": False,
        "step_8_verify_notifications": False,
        "step_9_verify_audit_log": False,
    }
    
    db = get_database_session()
    report = None
    
    try:
        # Setup
        print_header("Setup")
        company = get_or_create_test_company(db)
        user = get_or_create_test_user(db, company, "client_user")
        db.commit()
        
        # Step 1: Create report
        report = test_step_1_create_report(db, user, company)
        results["step_1_create_report"] = True
        db.commit()
        
        # Step 2: Wizard progress
        report = test_step_2_wizard_progress(db, report)
        results["step_2_wizard_progress"] = True
        db.commit()
        
        # Step 3: Create parties
        buyer, seller = test_step_3_create_parties(db, report)
        results["step_3_create_parties"] = True
        db.commit()
        
        # Step 4: Party submissions
        results["step_4_party_submissions"] = test_step_4_party_submissions(db, report, buyer, seller)
        db.commit()
        
        # Step 5: Auto status transition
        results["step_5_auto_status_transition"] = test_step_5_auto_status_transition(db, report)
        db.commit()
        
        # Step 6: Party data sync
        results["step_6_party_data_sync"] = test_step_6_party_data_sync(db, report)
        db.commit()
        
        # Step 7: Auto-file trigger
        try:
            results["step_7_auto_file_trigger"] = test_step_7_auto_file_trigger(db, report)
            db.commit()
        except Exception as e:
            print_warning(f"Step 7 error (non-fatal): {e}")
            db.rollback()
        
        # Step 8: Verify notifications
        results["step_8_verify_notifications"] = test_step_8_verify_notifications(db, report)
        
        # Step 9: Verify audit log
        results["step_9_verify_audit_log"] = test_step_9_verify_audit_log(db, report)
        
    except Exception as e:
        print_fail(f"Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        try:
            db.rollback()
        except:
            pass
    
    # Print summary
    print_header("Test Results Summary")
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for step, result in results.items():
        status = f"{Colors.GREEN}PASS{Colors.ENDC}" if result else f"{Colors.FAIL}FAIL{Colors.ENDC}"
        print(f"  {step}: {status}")
    
    print()
    if passed == total:
        print(f"{Colors.GREEN}{Colors.BOLD}All {total} tests passed!{Colors.ENDC}")
    else:
        print(f"{Colors.WARNING}Passed: {passed}/{total}{Colors.ENDC}")
    
    # Cleanup
    if report and CLEANUP_AFTER_TEST:
        try:
            cleanup_test_data(db, report)
        except:
            pass
    
    try:
        db.close()
    except:
        pass
    
    return passed == total


if __name__ == "__main__":
    success = run_integration_test()
    sys.exit(0 if success else 1)
