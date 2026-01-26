"""
Tests for party token behavior - expiry and invalid token handling.
"""
import pytest
from datetime import datetime, timedelta
from uuid import uuid4

from app.models import Report, ReportParty, PartyLink


class TestPartyTokenValidation:
    """Test token validation behavior."""
    
    def test_invalid_token_returns_404(self, client):
        """Non-existent token returns 404."""
        response = client.get("/party/invalid-token-that-does-not-exist")
        assert response.status_code == 404
        assert response.json()["detail"] == "Link not found"
    
    def test_expired_token_returns_410(self, client, db_session):
        """Expired token returns 410 Gone."""
        # Create report and party
        report = Report(status="collecting", wizard_step=5)
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
        
        response = client.get(f"/party/{link.token}")
        assert response.status_code == 410
        assert "expired" in response.json()["detail"].lower()
    
    def test_revoked_token_returns_410(self, client, db_session):
        """Revoked token returns 410 Gone."""
        report = Report(status="collecting", wizard_step=5)
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
        
        link = PartyLink(
            report_party_id=party.id,
            expires_at=datetime.utcnow() + timedelta(days=7),
            status="revoked",
        )
        db_session.add(link)
        db_session.commit()
        
        response = client.get(f"/party/{link.token}")
        assert response.status_code == 410
        assert "revoked" in response.json()["detail"].lower()
    
    def test_used_token_returns_410(self, client, db_session):
        """Already used token returns 410 Gone."""
        report = Report(status="collecting", wizard_step=5)
        db_session.add(report)
        db_session.commit()
        
        party = ReportParty(
            report_id=report.id,
            party_role="transferee",
            entity_type="individual",
            status="submitted",
        )
        db_session.add(party)
        db_session.commit()
        
        link = PartyLink(
            report_party_id=party.id,
            expires_at=datetime.utcnow() + timedelta(days=7),
            status="used",
            submitted_at=datetime.utcnow(),
        )
        db_session.add(link)
        db_session.commit()
        
        response = client.get(f"/party/{link.token}")
        assert response.status_code == 410
        assert "used" in response.json()["detail"].lower()
    
    def test_valid_token_returns_party_data(self, client, db_session):
        """Valid token returns party information."""
        report = Report(
            status="collecting",
            wizard_step=5,
            property_address_text="123 Main St",
            closing_date=datetime.utcnow().date(),
        )
        db_session.add(report)
        db_session.commit()
        
        party = ReportParty(
            report_id=report.id,
            party_role="transferee",
            entity_type="individual",
            display_name="John Doe",
            status="pending",
            party_data={"first_name": "John"},
        )
        db_session.add(party)
        db_session.commit()
        
        link = PartyLink(
            report_party_id=party.id,
            expires_at=datetime.utcnow() + timedelta(days=7),
            status="active",
        )
        db_session.add(link)
        db_session.commit()
        
        response = client.get(f"/party/{link.token}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["party_role"] == "transferee"
        assert data["entity_type"] == "individual"
        assert data["party_data"]["first_name"] == "John"
        assert data["is_submitted"] is False
        assert data["report_summary"]["property_address"] == "123 Main St"


class TestPartySaveAndSubmit:
    """Test party save and submit flows."""
    
    def test_save_updates_party_data(self, client, db_session):
        """Save endpoint updates party data."""
        report = Report(status="collecting", wizard_step=5)
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
        
        link = PartyLink(
            report_party_id=party.id,
            expires_at=datetime.utcnow() + timedelta(days=7),
            status="active",
        )
        db_session.add(link)
        db_session.commit()
        
        response = client.post(
            f"/party/{link.token}/save",
            json={"party_data": {"first_name": "John", "last_name": "Doe"}}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["party_data"]["first_name"] == "John"
        assert data["party_data"]["last_name"] == "Doe"
        assert data["status"] == "in_progress"
    
    def test_save_merges_existing_data(self, client, db_session):
        """Save merges with existing party data."""
        report = Report(status="collecting", wizard_step=5)
        db_session.add(report)
        db_session.commit()
        
        party = ReportParty(
            report_id=report.id,
            party_role="transferee",
            entity_type="individual",
            status="pending",
            party_data={"first_name": "John"},
        )
        db_session.add(party)
        db_session.commit()
        
        link = PartyLink(
            report_party_id=party.id,
            expires_at=datetime.utcnow() + timedelta(days=7),
            status="active",
        )
        db_session.add(link)
        db_session.commit()
        
        response = client.post(
            f"/party/{link.token}/save",
            json={"party_data": {"last_name": "Doe", "email": "john@example.com"}}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["party_data"]["first_name"] == "John"  # Preserved
        assert data["party_data"]["last_name"] == "Doe"  # Added
        assert data["party_data"]["email"] == "john@example.com"  # Added
    
    def test_submit_requires_minimum_data(self, client, db_session):
        """Submit requires minimum required fields."""
        report = Report(status="collecting", wizard_step=5)
        db_session.add(report)
        db_session.commit()
        
        party = ReportParty(
            report_id=report.id,
            party_role="transferee",
            entity_type="individual",
            status="in_progress",
            party_data={},  # Missing required fields
        )
        db_session.add(party)
        db_session.commit()
        
        link = PartyLink(
            report_party_id=party.id,
            expires_at=datetime.utcnow() + timedelta(days=7),
            status="active",
        )
        db_session.add(link)
        db_session.commit()
        
        response = client.post(f"/party/{link.token}/submit")
        assert response.status_code == 400
        assert "Missing required fields" in response.json()["detail"]
    
    def test_submit_locks_party_and_link(self, client, db_session):
        """Submit marks party as submitted and link as used."""
        report = Report(status="collecting", wizard_step=5)
        db_session.add(report)
        db_session.commit()
        
        party = ReportParty(
            report_id=report.id,
            party_role="transferee",
            entity_type="individual",
            status="in_progress",
            party_data={"first_name": "John", "last_name": "Doe"},
        )
        db_session.add(party)
        db_session.commit()
        
        link = PartyLink(
            report_party_id=party.id,
            expires_at=datetime.utcnow() + timedelta(days=7),
            status="active",
        )
        db_session.add(link)
        db_session.commit()
        
        response = client.post(f"/party/{link.token}/submit")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "submitted"
        assert data["submitted_at"] is not None
        
        # Verify database state
        db_session.refresh(party)
        db_session.refresh(link)
        assert party.status == "submitted"
        assert link.status == "used"
    
    def test_cannot_submit_twice(self, client, db_session):
        """Cannot submit after already submitted."""
        report = Report(status="collecting", wizard_step=5)
        db_session.add(report)
        db_session.commit()
        
        party = ReportParty(
            report_id=report.id,
            party_role="transferee",
            entity_type="individual",
            status="submitted",
            party_data={"first_name": "John", "last_name": "Doe"},
        )
        db_session.add(party)
        db_session.commit()
        
        link = PartyLink(
            report_party_id=party.id,
            expires_at=datetime.utcnow() + timedelta(days=7),
            status="used",
            submitted_at=datetime.utcnow(),
        )
        db_session.add(link)
        db_session.commit()
        
        response = client.post(f"/party/{link.token}/submit")
        assert response.status_code == 410  # Link is used


class TestEntityTypeSubmission:
    """Test different entity type submission requirements."""
    
    def test_entity_requires_entity_name(self, client, db_session):
        """Entity type requires entity_name field."""
        report = Report(status="collecting", wizard_step=5)
        db_session.add(report)
        db_session.commit()
        
        party = ReportParty(
            report_id=report.id,
            party_role="transferee",
            entity_type="llc",
            status="in_progress",
            party_data={"first_name": "Should not work"},  # Wrong fields for entity
        )
        db_session.add(party)
        db_session.commit()
        
        link = PartyLink(
            report_party_id=party.id,
            expires_at=datetime.utcnow() + timedelta(days=7),
            status="active",
        )
        db_session.add(link)
        db_session.commit()
        
        response = client.post(f"/party/{link.token}/submit")
        assert response.status_code == 400
        assert "entity_name" in response.json()["detail"]
    
    def test_entity_submits_with_entity_name(self, client, db_session):
        """Entity type submits successfully with entity_name."""
        report = Report(status="collecting", wizard_step=5)
        db_session.add(report)
        db_session.commit()
        
        party = ReportParty(
            report_id=report.id,
            party_role="transferee",
            entity_type="llc",
            status="in_progress",
            party_data={"entity_name": "ACME Holdings LLC"},
        )
        db_session.add(party)
        db_session.commit()
        
        link = PartyLink(
            report_party_id=party.id,
            expires_at=datetime.utcnow() + timedelta(days=7),
            status="active",
        )
        db_session.add(link)
        db_session.commit()
        
        response = client.post(f"/party/{link.token}/submit")
        assert response.status_code == 200
        assert response.json()["status"] == "submitted"
