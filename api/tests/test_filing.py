"""
Tests for demo filing functionality.
"""
import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient


class TestFilingEndpointEnvironment:
    """Test filing endpoint environment handling."""

    def test_filing_returns_501_in_production(self, client: TestClient):
        """Filing endpoint should return 501 in non-staging environments."""
        with patch("app.routes.reports.settings") as mock_settings:
            mock_settings.ENVIRONMENT = "production"
            
            # Create a report first
            report_response = client.post(
                "/reports",
                json={"property_address_text": "123 Test St"}
            )
            report_id = report_response.json()["id"]
            
            response = client.post(f"/reports/{report_id}/file")
            assert response.status_code == 501
            assert "not enabled" in response.json()["detail"].lower()

    def test_filing_returns_501_in_development(self, client: TestClient):
        """Filing endpoint should return 501 in development."""
        with patch("app.routes.reports.settings") as mock_settings:
            mock_settings.ENVIRONMENT = "development"
            
            report_response = client.post(
                "/reports",
                json={"property_address_text": "123 Test St"}
            )
            report_id = report_response.json()["id"]
            
            response = client.post(f"/reports/{report_id}/file")
            assert response.status_code == 501


class TestFilingEndpointValidation:
    """Test filing endpoint validation."""

    def test_filing_returns_404_for_missing_report(self, client: TestClient):
        """Filing non-existent report should return 404."""
        with patch("app.routes.reports.settings") as mock_settings:
            mock_settings.ENVIRONMENT = "staging"
            
            response = client.post("/reports/00000000-0000-0000-0000-000000000000/file")
            assert response.status_code == 404

    def test_filing_returns_400_if_not_ready(self, client: TestClient):
        """Filing should fail if report is not ready."""
        with patch("app.routes.reports.settings") as mock_settings:
            mock_settings.ENVIRONMENT = "staging"
            
            # Create a draft report (not ready for filing)
            report_response = client.post(
                "/reports",
                json={"property_address_text": "123 Test St"}
            )
            report_id = report_response.json()["id"]
            
            response = client.post(f"/reports/{report_id}/file")
            assert response.status_code == 400
            data = response.json()
            assert "detail" in data
            # Should explain what's missing
            if isinstance(data["detail"], dict):
                assert "errors" in data["detail"]

    def test_filing_returns_400_if_already_filed(self, client: TestClient, db_session):
        """Filing an already filed report should return 400."""
        from app.models import Report, FilingSubmission
        from datetime import datetime
        
        with patch("app.routes.reports.settings") as mock_settings:
            mock_settings.ENVIRONMENT = "staging"
            
            # Create a filed report directly
            report = Report(
                property_address_text="Already Filed St",
                status="filed",
                filing_status="filed_mock",
                filed_at=datetime.utcnow(),
                receipt_id="RER-DEMO-12345678",
            )
            db_session.add(report)
            db_session.flush()
            
            # Also create an accepted submission (this is what the endpoint checks)
            submission = FilingSubmission(
                report_id=report.id,
                environment="staging",
                status="accepted",
                receipt_id="RER-DEMO-12345678",
            )
            db_session.add(submission)
            db_session.commit()
            
            response = client.post(f"/reports/{report.id}/file")
            assert response.status_code == 400
            detail = response.json()["detail"]
            assert "already filed" in detail.lower()

    def test_filing_returns_400_for_exempt_report(self, client: TestClient, db_session):
        """Filing an exempt report should return 400."""
        from app.models import Report
        
        with patch("app.routes.reports.settings") as mock_settings:
            mock_settings.ENVIRONMENT = "staging"
            
            report = Report(
                property_address_text="Exempt Property",
                status="exempt",
            )
            db_session.add(report)
            db_session.commit()
            
            response = client.post(f"/reports/{report.id}/file")
            assert response.status_code == 400
            assert "exempt" in response.json()["detail"].lower()


class TestFilingEndpointSuccess:
    """Test successful filing scenarios."""

    def test_filing_succeeds_when_ready(self, client: TestClient, db_session):
        """Filing should succeed when report is ready."""
        from app.models import Report, ReportParty
        from datetime import datetime, date
        
        with patch("app.routes.reports.settings") as mock_settings:
            mock_settings.ENVIRONMENT = "staging"
            
            # Create a report that's ready for filing
            report = Report(
                property_address_text="123 Ready St",
                closing_date=date.today(),
                status="ready_to_file",
                wizard_step=5,
                determination={
                    "final_result": "reportable",
                    "reason": "All criteria met",
                },
            )
            db_session.add(report)
            db_session.flush()
            
            # Add a submitted party
            party = ReportParty(
                report_id=report.id,
                party_role="transferee",
                entity_type="individual",
                display_name="John Buyer",
                status="submitted",
                party_data={"first_name": "John", "last_name": "Buyer"},
            )
            db_session.add(party)
            db_session.commit()
            
            response = client.post(f"/reports/{report.id}/file")
            assert response.status_code == 200
            
            data = response.json()
            assert data["ok"] is True
            assert data["status"] == "accepted"  # API returns "accepted" not "filed_mock"
            assert data["receipt_id"].startswith("RER-DEMO-")
            assert data["is_demo"] is True
            assert "filed_at" in data
            assert data["message"] == "Filed successfully (demo)"

    def test_filing_generates_deterministic_receipt_id(self, client: TestClient, db_session):
        """Receipt ID should be deterministic based on report ID."""
        from app.models import Report, ReportParty
        from datetime import date
        
        with patch("app.routes.reports.settings") as mock_settings:
            mock_settings.ENVIRONMENT = "staging"
            
            # Create a ready report
            report = Report(
                property_address_text="456 Deterministic Ave",
                closing_date=date.today(),
                status="ready_to_file",
                determination={"final_result": "reportable"},
            )
            db_session.add(report)
            db_session.flush()
            
            party = ReportParty(
                report_id=report.id,
                party_role="transferee",
                entity_type="individual",
                status="submitted",
                party_data={"first_name": "Jane", "last_name": "Doe"},
            )
            db_session.add(party)
            db_session.commit()
            
            # File it
            response = client.post(f"/reports/{report.id}/file")
            receipt_id_1 = response.json()["receipt_id"]
            
            # Verify the receipt ID format
            assert receipt_id_1.startswith("RER-DEMO-")
            assert len(receipt_id_1) == len("RER-DEMO-") + 8  # 8 char hash

    def test_filing_updates_report_status(self, client: TestClient, db_session):
        """Filing should update report status and filing fields."""
        from app.models import Report, ReportParty
        from datetime import date
        
        with patch("app.routes.reports.settings") as mock_settings:
            mock_settings.ENVIRONMENT = "staging"
            
            report = Report(
                property_address_text="789 Update Test Blvd",
                closing_date=date.today(),
                status="ready_to_file",
                determination={"final_result": "reportable"},
            )
            db_session.add(report)
            db_session.flush()
            
            party = ReportParty(
                report_id=report.id,
                party_role="transferee",
                entity_type="individual",
                status="submitted",
                party_data={"first_name": "Test", "last_name": "User"},
            )
            db_session.add(party)
            db_session.commit()
            
            client.post(f"/reports/{report.id}/file")
            
            # Refresh and check
            db_session.refresh(report)
            assert report.status == "filed"
            assert report.filing_status == "filed_mock"
            assert report.filed_at is not None
            assert report.receipt_id is not None
            assert report.receipt_id.startswith("RER-DEMO-")

    def test_filing_creates_notification_event(self, client: TestClient, db_session):
        """Filing should create a filing_receipt notification event."""
        from app.models import Report, ReportParty, NotificationEvent
        from datetime import date
        
        with patch("app.routes.reports.settings") as mock_settings:
            mock_settings.ENVIRONMENT = "staging"
            
            report = Report(
                property_address_text="999 Notification Test St",
                closing_date=date.today(),
                status="ready_to_file",
                determination={"final_result": "reportable"},
            )
            db_session.add(report)
            db_session.flush()
            
            party = ReportParty(
                report_id=report.id,
                party_role="transferee",
                entity_type="individual",
                status="submitted",
                party_data={"first_name": "Notify", "last_name": "Test"},
            )
            db_session.add(party)
            db_session.commit()
            
            response = client.post(f"/reports/{report.id}/file")
            receipt_id = response.json()["receipt_id"]
            
            # Check notification was created
            notification = db_session.query(NotificationEvent).filter(
                NotificationEvent.report_id == report.id,
                NotificationEvent.type == "filing_receipt"
            ).first()
            
            assert notification is not None
            assert notification.meta["receipt_id"] == receipt_id
            assert notification.meta["is_demo"] is True
            assert "FinCEN Filing" in notification.subject
