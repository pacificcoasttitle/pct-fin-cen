"""
Tests for SQLAlchemy models.
"""
import uuid
from datetime import datetime, timedelta

from app.models import Report, ReportParty, PartyLink, Document, AuditLog


def test_report_model_import():
    """Test that Report model can be imported."""
    assert Report is not None
    assert Report.__tablename__ == "reports"


def test_report_party_model_import():
    """Test that ReportParty model can be imported."""
    assert ReportParty is not None
    assert ReportParty.__tablename__ == "report_parties"


def test_party_link_model_import():
    """Test that PartyLink model can be imported."""
    assert PartyLink is not None
    assert PartyLink.__tablename__ == "party_links"


def test_document_model_import():
    """Test that Document model can be imported."""
    assert Document is not None
    assert Document.__tablename__ == "documents"


def test_audit_log_model_import():
    """Test that AuditLog model can be imported."""
    assert AuditLog is not None
    assert AuditLog.__tablename__ == "audit_log"


def test_create_report(db_session):
    """Test creating a Report instance."""
    report = Report(
        status="draft",
        property_address_text="123 Main St, Anytown, CA 90210",
        wizard_step=1,
        wizard_data={"step1": {"is_residential": True}},
    )
    db_session.add(report)
    db_session.commit()
    db_session.refresh(report)
    
    assert report.id is not None
    assert report.status == "draft"
    assert report.wizard_step == 1
    assert report.wizard_data["step1"]["is_residential"] is True
    assert report.created_at is not None


def test_create_report_party(db_session):
    """Test creating a ReportParty linked to a Report."""
    # First create a report
    report = Report(status="draft", wizard_step=1)
    db_session.add(report)
    db_session.commit()
    
    # Create a party
    party = ReportParty(
        report_id=report.id,
        party_role="transferee",
        entity_type="individual",
        display_name="John Doe",
        party_data={"first_name": "John", "last_name": "Doe"},
        status="pending",
    )
    db_session.add(party)
    db_session.commit()
    db_session.refresh(party)
    
    assert party.id is not None
    assert party.report_id == report.id
    assert party.party_role == "transferee"
    assert party.entity_type == "individual"


def test_create_party_link(db_session):
    """Test creating a PartyLink for a ReportParty."""
    # Create report and party
    report = Report(status="draft", wizard_step=1)
    db_session.add(report)
    db_session.commit()
    
    party = ReportParty(
        report_id=report.id,
        party_role="transferee",
        entity_type="individual",
        status="pending",
    )
    db_session.add(party)
    db_session.commit()
    
    # Create link
    link = PartyLink(
        report_party_id=party.id,
        expires_at=datetime.utcnow() + timedelta(days=7),
        status="active",
    )
    db_session.add(link)
    db_session.commit()
    db_session.refresh(link)
    
    assert link.id is not None
    assert link.token is not None
    assert len(link.token) > 20  # Secure token should be reasonably long
    assert link.is_valid is True


def test_party_link_expiration(db_session):
    """Test that expired links are marked as invalid."""
    # Create report and party
    report = Report(status="draft", wizard_step=1)
    db_session.add(report)
    db_session.commit()
    
    party = ReportParty(
        report_id=report.id,
        party_role="transferee",
        entity_type="individual",
        status="pending",
    )
    db_session.add(party)
    db_session.commit()
    
    # Create expired link
    link = PartyLink(
        report_party_id=party.id,
        expires_at=datetime.utcnow() - timedelta(days=1),  # Already expired
        status="active",
    )
    db_session.add(link)
    db_session.commit()
    db_session.refresh(link)
    
    assert link.is_valid is False


def test_create_document(db_session):
    """Test creating a Document for a ReportParty."""
    # Create report and party
    report = Report(status="draft", wizard_step=1)
    db_session.add(report)
    db_session.commit()
    
    party = ReportParty(
        report_id=report.id,
        party_role="transferee",
        entity_type="individual",
        status="pending",
    )
    db_session.add(party)
    db_session.commit()
    
    # Create document
    doc = Document(
        report_party_id=party.id,
        document_type="drivers_license",
        file_url="s3://bucket/documents/dl_123.jpg",
        file_name="drivers_license.jpg",
        mime_type="image/jpeg",
        size_bytes=1024000,
    )
    db_session.add(doc)
    db_session.commit()
    db_session.refresh(doc)
    
    assert doc.id is not None
    assert doc.document_type == "drivers_license"
    assert doc.uploaded_at is not None


def test_create_audit_log(db_session):
    """Test creating an AuditLog entry."""
    # Create report
    report = Report(status="draft", wizard_step=1)
    db_session.add(report)
    db_session.commit()
    
    # Create audit log
    log = AuditLog(
        report_id=report.id,
        actor_type="system",
        action="report.created",
        details={"source": "api", "version": "1.0"},
        ip_address="192.168.1.1",
    )
    db_session.add(log)
    db_session.commit()
    db_session.refresh(log)
    
    assert log.id is not None
    assert log.action == "report.created"
    assert log.created_at is not None


def test_report_party_relationship(db_session):
    """Test that Report has parties relationship."""
    report = Report(status="draft", wizard_step=1)
    db_session.add(report)
    db_session.commit()
    
    party1 = ReportParty(
        report_id=report.id,
        party_role="transferee",
        entity_type="individual",
        status="pending",
    )
    party2 = ReportParty(
        report_id=report.id,
        party_role="transferor",
        entity_type="llc",
        status="pending",
    )
    db_session.add_all([party1, party2])
    db_session.commit()
    
    # Refresh report to load relationships
    db_session.refresh(report)
    
    assert len(report.parties) == 2
    roles = {p.party_role for p in report.parties}
    assert roles == {"transferee", "transferor"}
