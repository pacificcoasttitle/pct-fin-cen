"""
Tests for ready-check endpoint - 8 scenarios per spec.
"""
import pytest
from datetime import datetime, timedelta
from uuid import uuid4

from app.models import Report, ReportParty


class TestReadyCheckScenarios:
    """Test ready check scenarios."""
    
    def test_scenario_1_empty_report_not_ready(self, client, db_session):
        """Empty report is not ready."""
        # Create minimal report
        report = Report(status="draft", wizard_step=1)
        db_session.add(report)
        db_session.commit()
        
        response = client.post(f"/reports/{report.id}/ready-check")
        assert response.status_code == 200
        
        data = response.json()
        assert data["is_ready"] is False
        assert len(data["missing_items"]) > 0
        
        # Check specific missing items
        missing_fields = [item["field"] for item in data["missing_items"]]
        assert "property_address_text" in missing_fields
        assert "closing_date" in missing_fields
    
    def test_scenario_2_no_determination_not_ready(self, client, db_session):
        """Report without determination is not ready."""
        report = Report(
            status="draft",
            wizard_step=5,
            property_address_text="123 Main St",
            closing_date=datetime.utcnow().date(),
        )
        db_session.add(report)
        db_session.commit()
        
        response = client.post(f"/reports/{report.id}/ready-check")
        data = response.json()
        
        assert data["is_ready"] is False
        missing_fields = [item["field"] for item in data["missing_items"]]
        assert "determination" in missing_fields
    
    def test_scenario_3_exempt_not_ready(self, client, db_session):
        """Exempt report is not ready to file."""
        report = Report(
            status="exempt",
            wizard_step=5,
            property_address_text="123 Main St",
            closing_date=datetime.utcnow().date(),
            determination={"final_result": "exempt"},
        )
        db_session.add(report)
        db_session.commit()
        
        response = client.post(f"/reports/{report.id}/ready-check")
        data = response.json()
        
        assert data["is_ready"] is False
        # Determination must be reportable
        missing_fields = [item["field"] for item in data["missing_items"]]
        assert "determination" in missing_fields
    
    def test_scenario_4_no_parties_not_ready(self, client, db_session):
        """Report without parties is not ready."""
        report = Report(
            status="determination_complete",
            wizard_step=5,
            property_address_text="123 Main St",
            closing_date=datetime.utcnow().date(),
            determination={"final_result": "reportable"},
        )
        db_session.add(report)
        db_session.commit()
        
        response = client.post(f"/reports/{report.id}/ready-check")
        data = response.json()
        
        assert data["is_ready"] is False
        assert data["parties_total"] == 0
        missing_fields = [item["field"] for item in data["missing_items"]]
        assert "parties" in missing_fields
    
    def test_scenario_5_party_not_submitted(self, client, db_session):
        """Report with pending party is not ready."""
        report = Report(
            status="collecting",
            wizard_step=5,
            property_address_text="123 Main St",
            closing_date=datetime.utcnow().date(),
            determination={"final_result": "reportable"},
        )
        db_session.add(report)
        db_session.commit()
        
        party = ReportParty(
            report_id=report.id,
            party_role="transferee",
            entity_type="individual",
            display_name="John Doe",
            status="pending",
        )
        db_session.add(party)
        db_session.commit()
        
        response = client.post(f"/reports/{report.id}/ready-check")
        data = response.json()
        
        assert data["is_ready"] is False
        assert data["parties_complete"] == 0
        assert data["parties_total"] == 1
    
    def test_scenario_6_party_in_progress(self, client, db_session):
        """Report with in-progress party is not ready."""
        report = Report(
            status="collecting",
            wizard_step=5,
            property_address_text="123 Main St",
            closing_date=datetime.utcnow().date(),
            determination={"final_result": "reportable"},
        )
        db_session.add(report)
        db_session.commit()
        
        party = ReportParty(
            report_id=report.id,
            party_role="transferee",
            entity_type="individual",
            display_name="John Doe",
            status="in_progress",
        )
        db_session.add(party)
        db_session.commit()
        
        response = client.post(f"/reports/{report.id}/ready-check")
        data = response.json()
        
        assert data["is_ready"] is False
        assert data["parties_complete"] == 0
    
    def test_scenario_7_some_parties_submitted(self, client, db_session):
        """Report with some submitted parties is not ready."""
        report = Report(
            status="collecting",
            wizard_step=5,
            property_address_text="123 Main St",
            closing_date=datetime.utcnow().date(),
            determination={"final_result": "reportable"},
        )
        db_session.add(report)
        db_session.commit()
        
        party1 = ReportParty(
            report_id=report.id,
            party_role="transferee",
            entity_type="individual",
            display_name="John Doe",
            status="submitted",
        )
        party2 = ReportParty(
            report_id=report.id,
            party_role="beneficial_owner",
            entity_type="individual",
            display_name="Jane Doe",
            status="pending",
        )
        db_session.add_all([party1, party2])
        db_session.commit()
        
        response = client.post(f"/reports/{report.id}/ready-check")
        data = response.json()
        
        assert data["is_ready"] is False
        assert data["parties_complete"] == 1
        assert data["parties_total"] == 2
    
    def test_scenario_8_all_complete_is_ready(self, client, db_session):
        """Complete report is ready."""
        report = Report(
            status="collecting",
            wizard_step=5,
            property_address_text="123 Main St, Anytown, CA 90210",
            closing_date=datetime.utcnow().date(),
            determination={"final_result": "reportable"},
        )
        db_session.add(report)
        db_session.commit()
        
        party = ReportParty(
            report_id=report.id,
            party_role="transferee",
            entity_type="individual",
            display_name="John Doe",
            status="submitted",
            party_data={"first_name": "John", "last_name": "Doe"},
        )
        db_session.add(party)
        db_session.commit()
        
        response = client.post(f"/reports/{report.id}/ready-check")
        data = response.json()
        
        assert data["is_ready"] is True
        assert data["missing_items"] == []
        assert data["parties_complete"] == 1
        assert data["parties_total"] == 1
        
        # Check report status was updated
        db_session.refresh(report)
        assert report.status == "ready_to_file"
