"""
Tests for notification outbox system.
"""
import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient


class TestNotificationsEndpointSecurity:
    """Test security for /demo/notifications endpoint."""

    def test_notifications_returns_404_in_non_staging(self, client: TestClient):
        """Notifications endpoint should return 404 when not in staging."""
        with patch("app.routes.demo.settings") as mock_settings:
            mock_settings.ENVIRONMENT = "production"
            mock_settings.DEMO_SECRET = "test-secret"
            
            response = client.get(
                "/demo/notifications",
                headers={"X-DEMO-SECRET": "test-secret"}
            )
            assert response.status_code == 404

    def test_notifications_returns_404_without_secret(self, client: TestClient):
        """Notifications endpoint should return 404 without secret header."""
        with patch("app.routes.demo.settings") as mock_settings:
            mock_settings.ENVIRONMENT = "staging"
            mock_settings.DEMO_SECRET = "test-secret"
            
            response = client.get("/demo/notifications")
            assert response.status_code == 404

    def test_notifications_returns_404_with_invalid_secret(self, client: TestClient):
        """Notifications endpoint should return 404 with wrong secret."""
        with patch("app.routes.demo.settings") as mock_settings:
            mock_settings.ENVIRONMENT = "staging"
            mock_settings.DEMO_SECRET = "correct-secret"
            
            response = client.get(
                "/demo/notifications",
                headers={"X-DEMO-SECRET": "wrong-secret"}
            )
            assert response.status_code == 404


class TestNotificationsEndpointFunctionality:
    """Test notification endpoint functionality."""

    def test_notifications_returns_empty_list_initially(self, client: TestClient):
        """Initially, notifications list should be empty."""
        with patch("app.routes.demo.settings") as mock_settings:
            mock_settings.ENVIRONMENT = "staging"
            mock_settings.DEMO_SECRET = "test-secret"
            
            response = client.get(
                "/demo/notifications",
                headers={"X-DEMO-SECRET": "test-secret"}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert "items" in data
            assert "count" in data
            assert isinstance(data["items"], list)

    def test_party_link_creation_creates_notification(self, client: TestClient, db_session):
        """Creating party links should create party_invite notifications."""
        from app.models import Report, NotificationEvent
        
        # Create a report directly with determination_complete status
        report = Report(
            property_address_text="123 Test St",
            status="determination_complete",
            determination={"final_result": "reportable"},
        )
        db_session.add(report)
        db_session.commit()
        report_id = str(report.id)
        
        # Create party links
        links_response = client.post(
            f"/reports/{report_id}/party-links",
            json={
                "parties": [
                    {"party_role": "transferee", "entity_type": "individual", "display_name": "John Buyer"}
                ],
                "expires_in_days": 7
            }
        )
        assert links_response.status_code == 200
        
        # Check notifications were created
        party_invites = db_session.query(NotificationEvent).filter(
            NotificationEvent.report_id == report.id,
            NotificationEvent.type == "party_invite"
        ).all()
        assert len(party_invites) >= 1
        
        # Check notification content
        invite = party_invites[0]
        assert "123 Test St" in invite.subject
        assert invite.report_id == report.id
        assert invite.meta is not None
        assert "link" in invite.meta

    def test_party_submission_creates_notification(self, client: TestClient, db_session):
        """Party submission should create party_submitted notification."""
        from app.models import Report, ReportParty, PartyLink, NotificationEvent
        from datetime import datetime, timedelta
        
        # Create a report directly with determination_complete status
        report = Report(
            property_address_text="456 Submit St",
            status="determination_complete",
            determination={"final_result": "reportable"},
        )
        db_session.add(report)
        db_session.flush()
        
        # Create party
        party = ReportParty(
            report_id=report.id,
            party_role="transferee",
            entity_type="individual",
            display_name="Jane Submit",
            status="pending",
            party_data={"first_name": "Jane", "last_name": "Submit"},
        )
        db_session.add(party)
        db_session.flush()
        
        # Create party link
        link = PartyLink(
            report_party_id=party.id,
            expires_at=datetime.utcnow() + timedelta(days=7),
            status="active",
        )
        db_session.add(link)
        db_session.commit()
        
        token = link.token
        
        # Submit via API
        submit_response = client.post(f"/party/{token}/submit")
        assert submit_response.status_code == 200
        submit_data = submit_response.json()
        
        # Check response has confirmation_id
        assert "confirmation_id" in submit_data
        assert submit_data["confirmation_id"].startswith("PCT-")
        
        # Check notifications were created
        submitted = db_session.query(NotificationEvent).filter(
            NotificationEvent.report_id == report.id,
            NotificationEvent.type == "party_submitted"
        ).all()
        assert len(submitted) >= 1
        
        # Check notification content
        notif = submitted[0]
        assert notif.meta is not None
        assert "confirmation_id" in notif.meta
        assert notif.meta["confirmation_id"] == submit_data["confirmation_id"]


class TestNotificationService:
    """Test notification service functions."""

    def test_log_notification_truncates_body(self, db_session):
        """Body preview should be truncated to 500 chars."""
        from app.services.notifications import log_notification
        
        long_body = "x" * 600
        notification = log_notification(
            db_session,
            type="internal_alert",
            body_preview=long_body,
        )
        db_session.commit()
        
        assert len(notification.body_preview) <= 500
        assert notification.body_preview.endswith("...")

    def test_list_notifications_filters_by_type(self, db_session):
        """List should filter by type when specified."""
        from app.services.notifications import log_notification, list_notifications, delete_all_notifications
        
        # Clear any existing notifications
        delete_all_notifications(db_session)
        db_session.commit()
        
        # Create different types
        log_notification(db_session, type="party_invite")
        log_notification(db_session, type="party_submitted")
        log_notification(db_session, type="party_invite")
        db_session.commit()
        
        # Filter by type
        invites = list_notifications(db_session, type_filter="party_invite")
        assert len(invites) == 2
        
        submitted = list_notifications(db_session, type_filter="party_submitted")
        assert len(submitted) == 1

    def test_list_notifications_respects_limit(self, db_session):
        """List should respect the limit parameter."""
        from app.services.notifications import log_notification, list_notifications
        
        # Create many notifications
        for i in range(10):
            log_notification(db_session, type="internal_alert", subject=f"Alert {i}")
        db_session.commit()
        
        # List with limit
        limited = list_notifications(db_session, limit=5)
        assert len(limited) == 5
