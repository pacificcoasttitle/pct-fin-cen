"""
Tests for filing lifecycle and admin endpoints.
"""
import pytest
from unittest.mock import patch
from datetime import date


class TestSetFilingOutcomeEndpoint:
    """Tests for POST /demo/reports/{id}/set-filing-outcome."""
    
    def test_set_outcome_returns_404_when_not_staging(self, client, db_session):
        """Should return 404 in non-staging environments."""
        from app.models import Report
        
        report = Report(
            status="ready_to_file",
            property_address_text="123 Test St",
        )
        db_session.add(report)
        db_session.commit()
        
        with patch("app.routes.demo.settings") as mock_settings:
            mock_settings.ENVIRONMENT = "production"
            mock_settings.DEMO_SECRET = "test_secret"
            
            response = client.post(
                f"/demo/reports/{report.id}/set-filing-outcome",
                headers={"X-DEMO-SECRET": "test_secret"},
                json={"outcome": "reject", "code": "TEST_CODE", "message": "Test message"}
            )
            assert response.status_code == 404
    
    def test_set_outcome_returns_404_without_secret(self, client, db_session):
        """Should return 404 when X-DEMO-SECRET header is missing."""
        from app.models import Report
        
        report = Report(
            status="ready_to_file",
            property_address_text="123 Test St",
        )
        db_session.add(report)
        db_session.commit()
        
        with patch("app.routes.demo.settings") as mock_settings:
            mock_settings.ENVIRONMENT = "staging"
            mock_settings.DEMO_SECRET = "test_secret"
            
            response = client.post(
                f"/demo/reports/{report.id}/set-filing-outcome",
                json={"outcome": "reject"}
            )
            assert response.status_code == 404
    
    def test_set_outcome_returns_404_with_wrong_secret(self, client, db_session):
        """Should return 404 when X-DEMO-SECRET is incorrect."""
        from app.models import Report
        
        report = Report(
            status="ready_to_file",
            property_address_text="123 Test St",
        )
        db_session.add(report)
        db_session.commit()
        
        with patch("app.routes.demo.settings") as mock_settings:
            mock_settings.ENVIRONMENT = "staging"
            mock_settings.DEMO_SECRET = "correct_secret"
            
            response = client.post(
                f"/demo/reports/{report.id}/set-filing-outcome",
                headers={"X-DEMO-SECRET": "wrong_secret"},
                json={"outcome": "accept"}
            )
            assert response.status_code == 404
    
    def test_set_outcome_success(self, client, db_session):
        """Should set demo outcome when all conditions are met."""
        from app.models import Report, FilingSubmission
        
        report = Report(
            status="ready_to_file",
            property_address_text="456 Success St",
        )
        db_session.add(report)
        db_session.commit()
        
        with patch("app.routes.demo.settings") as mock_settings:
            mock_settings.ENVIRONMENT = "staging"
            mock_settings.DEMO_SECRET = "test_secret"
            
            response = client.post(
                f"/demo/reports/{report.id}/set-filing-outcome",
                headers={"X-DEMO-SECRET": "test_secret"},
                json={"outcome": "reject", "code": "BAD_FORMAT", "message": "Invalid format"}
            )
            assert response.status_code == 200
            data = response.json()
            assert data["ok"] is True
            assert data["outcome"] == "reject"
            assert data["rejection_code"] == "BAD_FORMAT"
            
            # Verify submission was created/updated
            submission = db_session.query(FilingSubmission).filter(
                FilingSubmission.report_id == report.id
            ).first()
            assert submission is not None
            assert submission.demo_outcome == "reject"
            assert submission.demo_rejection_code == "BAD_FORMAT"


class TestFilingEndpointWithLifecycle:
    """Tests for POST /reports/{id}/file with new submission lifecycle."""
    
    def test_file_returns_501_in_non_staging(self, client, db_session):
        """Filing endpoint should return 501 in non-staging."""
        from app.models import Report
        
        report = Report(
            status="ready_to_file",
            property_address_text="123 Prod St",
        )
        db_session.add(report)
        db_session.commit()
        
        with patch("app.routes.reports.settings") as mock_settings:
            mock_settings.ENVIRONMENT = "production"
            
            response = client.post(f"/reports/{report.id}/file")
            assert response.status_code == 501
            assert "not enabled" in response.json()["detail"].lower()
    
    def test_file_accepted_by_default(self, client, db_session):
        """Filing should accept by default (no demo_outcome set)."""
        from app.models import Report, ReportParty, FilingSubmission
        
        report = Report(
            status="ready_to_file",
            property_address_text="789 Accept St",
            closing_date=date.today(),
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
        
        with patch("app.routes.reports.settings") as mock_settings:
            mock_settings.ENVIRONMENT = "staging"
            
            response = client.post(f"/reports/{report.id}/file")
            assert response.status_code == 200
            
            data = response.json()
            assert data["ok"] is True
            assert data["status"] == "accepted"
            assert data["receipt_id"].startswith("RER-DEMO-")
            assert data["is_demo"] is True
    
    def test_file_rejected_when_outcome_set(self, client, db_session):
        """Filing should reject when demo_outcome is set to reject."""
        from app.models import Report, ReportParty, FilingSubmission
        
        report = Report(
            status="ready_to_file",
            property_address_text="321 Reject Ave",
            closing_date=date.today(),
            determination={"final_result": "reportable"},
        )
        db_session.add(report)
        db_session.flush()
        
        party = ReportParty(
            report_id=report.id,
            party_role="transferee",
            entity_type="individual",
            status="submitted",
            party_data={"first_name": "Test", "last_name": "Reject"},
        )
        db_session.add(party)
        
        # Set demo outcome to reject
        submission = FilingSubmission(
            report_id=report.id,
            environment="staging",
            status="not_started",
            demo_outcome="reject",
            demo_rejection_code="MISSING_FIELD",
            demo_rejection_message="Required field missing",
        )
        db_session.add(submission)
        db_session.commit()
        
        with patch("app.routes.reports.settings") as mock_settings:
            mock_settings.ENVIRONMENT = "staging"
            
            response = client.post(f"/reports/{report.id}/file")
            assert response.status_code == 400
            
            data = response.json()["detail"]
            assert data["ok"] is False
            assert data["status"] == "rejected"
            assert data["rejection_code"] == "MISSING_FIELD"
    
    def test_file_needs_review(self, client, db_session):
        """Filing should return 202 when demo_outcome is needs_review."""
        from app.models import Report, ReportParty, FilingSubmission
        
        report = Report(
            status="ready_to_file",
            property_address_text="555 Review Blvd",
            closing_date=date.today(),
            determination={"final_result": "reportable"},
        )
        db_session.add(report)
        db_session.flush()
        
        party = ReportParty(
            report_id=report.id,
            party_role="transferee",
            entity_type="individual",
            status="submitted",
            party_data={"first_name": "Review", "last_name": "User"},
        )
        db_session.add(party)
        
        # Set demo outcome to needs_review
        submission = FilingSubmission(
            report_id=report.id,
            environment="staging",
            status="not_started",
            demo_outcome="needs_review",
        )
        db_session.add(submission)
        db_session.commit()
        
        with patch("app.routes.reports.settings") as mock_settings:
            mock_settings.ENVIRONMENT = "staging"
            
            response = client.post(f"/reports/{report.id}/file")
            assert response.status_code == 202
            
            data = response.json()
            assert data["ok"] is True
            assert data["status"] == "needs_review"


class TestRetryFilingEndpoint:
    """Tests for POST /admin/reports/{id}/retry-filing."""
    
    def test_retry_allowed_when_rejected(self, client, db_session):
        """Should allow retry when submission is rejected."""
        from app.models import Report, FilingSubmission
        
        report = Report(
            status="ready_to_file",
            property_address_text="100 Retry St",
        )
        db_session.add(report)
        db_session.flush()
        
        submission = FilingSubmission(
            report_id=report.id,
            environment="staging",
            status="rejected",
            rejection_code="TEST_ERROR",
            attempts=1,
        )
        db_session.add(submission)
        db_session.commit()
        
        response = client.post(f"/admin/reports/{report.id}/retry-filing")
        assert response.status_code == 200
        
        data = response.json()
        assert data["ok"] is True
        assert data["submission_status"] == "queued"
        assert data["attempts"] == 2
    
    def test_retry_allowed_when_needs_review(self, client, db_session):
        """Should allow retry when submission needs review."""
        from app.models import Report, FilingSubmission
        
        report = Report(
            status="ready_to_file",
            property_address_text="200 Review Retry St",
        )
        db_session.add(report)
        db_session.flush()
        
        submission = FilingSubmission(
            report_id=report.id,
            environment="staging",
            status="needs_review",
            attempts=1,
        )
        db_session.add(submission)
        db_session.commit()
        
        response = client.post(f"/admin/reports/{report.id}/retry-filing")
        assert response.status_code == 200
        
        data = response.json()
        assert data["ok"] is True
    
    def test_retry_not_allowed_when_accepted(self, client, db_session):
        """Should not allow retry when submission is accepted."""
        from app.models import Report, FilingSubmission
        
        report = Report(
            status="filed",
            property_address_text="300 Accepted St",
        )
        db_session.add(report)
        db_session.flush()
        
        submission = FilingSubmission(
            report_id=report.id,
            environment="staging",
            status="accepted",
            receipt_id="RER-DEMO-12345678",
            attempts=1,
        )
        db_session.add(submission)
        db_session.commit()
        
        response = client.post(f"/admin/reports/{report.id}/retry-filing")
        assert response.status_code == 400


class TestAdminEndpoints:
    """Tests for admin API endpoints."""
    
    def test_get_stats(self, client, db_session):
        """Should return aggregate statistics."""
        response = client.get("/admin/stats")
        assert response.status_code == 200
        
        data = response.json()
        assert "total_reports" in data
        assert "pending_parties" in data
        assert "filings_accepted" in data
    
    def test_list_reports(self, client, db_session):
        """Should list reports with pagination."""
        from app.models import Report
        
        # Create some test reports
        for i in range(3):
            report = Report(
                status="draft",
                property_address_text=f"Test Address {i}",
            )
            db_session.add(report)
        db_session.commit()
        
        response = client.get("/admin/reports?limit=10")
        assert response.status_code == 200
        
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert len(data["items"]) >= 3
    
    def test_get_report_detail(self, client, db_session):
        """Should return detailed report info."""
        from app.models import Report
        
        report = Report(
            status="draft",
            property_address_text="Detail Test Address",
        )
        db_session.add(report)
        db_session.commit()
        
        response = client.get(f"/admin/reports/{report.id}")
        assert response.status_code == 200
        
        data = response.json()
        assert "report" in data
        assert "parties" in data
        assert "audit_log" in data
        assert data["report"]["property_address_text"] == "Detail Test Address"
    
    def test_list_filings(self, client, db_session):
        """Should list filing submissions."""
        response = client.get("/admin/filings")
        assert response.status_code == 200
        
        data = response.json()
        assert "items" in data
        assert "total" in data
    
    def test_get_recent_activity(self, client, db_session):
        """Should return recent audit log entries."""
        response = client.get("/admin/activity")
        assert response.status_code == 200
        
        data = response.json()
        assert "items" in data
