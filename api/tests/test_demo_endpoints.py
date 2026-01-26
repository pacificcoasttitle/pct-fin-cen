"""
Tests for demo endpoints.

These tests verify:
- Endpoints return 404 in non-staging environment
- Endpoints return 404 with missing/invalid X-DEMO-SECRET
- Endpoints work correctly with valid credentials in staging
"""
import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient


class TestDemoEndpointsSecurity:
    """Test security constraints on demo endpoints."""

    def test_reset_returns_404_in_non_staging(self, client: TestClient):
        """Demo reset should return 404 when not in staging environment."""
        with patch("app.routes.demo.settings") as mock_settings:
            mock_settings.ENVIRONMENT = "production"
            mock_settings.DEMO_SECRET = "test-secret"
            
            response = client.post(
                "/demo/reset",
                headers={"X-DEMO-SECRET": "test-secret"}
            )
            assert response.status_code == 404

    def test_reset_returns_404_without_secret_header(self, client: TestClient):
        """Demo reset should return 404 when X-DEMO-SECRET header is missing."""
        with patch("app.routes.demo.settings") as mock_settings:
            mock_settings.ENVIRONMENT = "staging"
            mock_settings.DEMO_SECRET = "test-secret"
            
            response = client.post("/demo/reset")
            assert response.status_code == 404

    def test_reset_returns_404_with_invalid_secret(self, client: TestClient):
        """Demo reset should return 404 when X-DEMO-SECRET is wrong."""
        with patch("app.routes.demo.settings") as mock_settings:
            mock_settings.ENVIRONMENT = "staging"
            mock_settings.DEMO_SECRET = "correct-secret"
            
            response = client.post(
                "/demo/reset",
                headers={"X-DEMO-SECRET": "wrong-secret"}
            )
            assert response.status_code == 404

    def test_reset_returns_404_when_demo_secret_not_configured(self, client: TestClient):
        """Demo reset should return 404 when DEMO_SECRET is not set."""
        with patch("app.routes.demo.settings") as mock_settings:
            mock_settings.ENVIRONMENT = "staging"
            mock_settings.DEMO_SECRET = ""
            
            response = client.post(
                "/demo/reset",
                headers={"X-DEMO-SECRET": "any-secret"}
            )
            assert response.status_code == 404

    def test_create_report_returns_404_in_non_staging(self, client: TestClient):
        """Demo create-report should return 404 when not in staging."""
        with patch("app.routes.demo.settings") as mock_settings:
            mock_settings.ENVIRONMENT = "development"
            mock_settings.DEMO_SECRET = "test-secret"
            
            response = client.post(
                "/demo/create-report",
                headers={"X-DEMO-SECRET": "test-secret"}
            )
            assert response.status_code == 404

    def test_create_report_returns_404_without_secret(self, client: TestClient):
        """Demo create-report should return 404 without secret header."""
        with patch("app.routes.demo.settings") as mock_settings:
            mock_settings.ENVIRONMENT = "staging"
            mock_settings.DEMO_SECRET = "test-secret"
            
            response = client.post("/demo/create-report")
            assert response.status_code == 404


class TestDemoEndpointsFunctionality:
    """Test demo endpoint functionality when properly authenticated."""

    def test_reset_success_in_staging(self, client: TestClient):
        """Demo reset should work with valid credentials in staging."""
        with patch("app.routes.demo.settings") as mock_settings:
            mock_settings.ENVIRONMENT = "staging"
            mock_settings.DEMO_SECRET = "test-secret"
            
            response = client.post(
                "/demo/reset",
                headers={"X-DEMO-SECRET": "test-secret"}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["ok"] is True
            assert data["reports_created"] == 6
            assert data["environment"] == "staging"
            assert "timestamp" in data

    def test_reset_is_idempotent(self, client: TestClient):
        """Demo reset should be safe to call multiple times."""
        with patch("app.routes.demo.settings") as mock_settings:
            mock_settings.ENVIRONMENT = "staging"
            mock_settings.DEMO_SECRET = "test-secret"
            
            # Call twice
            response1 = client.post(
                "/demo/reset",
                headers={"X-DEMO-SECRET": "test-secret"}
            )
            response2 = client.post(
                "/demo/reset",
                headers={"X-DEMO-SECRET": "test-secret"}
            )
            
            assert response1.status_code == 200
            assert response2.status_code == 200
            assert response1.json()["reports_created"] == response2.json()["reports_created"]

    def test_create_report_success_in_staging(self, client: TestClient):
        """Demo create-report should return report_id and wizard_url."""
        with patch("app.routes.demo.settings") as mock_settings:
            mock_settings.ENVIRONMENT = "staging"
            mock_settings.DEMO_SECRET = "test-secret"
            mock_settings.APP_BASE_URL = "https://test.example.com"
            
            # Patch settings in the config module where demo_seed imports from
            with patch("app.config.get_settings") as mock_get_settings:
                mock_get_settings.return_value = mock_settings
                
                response = client.post(
                    "/demo/create-report",
                    headers={"X-DEMO-SECRET": "test-secret"}
                )
                
                assert response.status_code == 200
                data = response.json()
                assert data["ok"] is True
                assert "report_id" in data
                assert "wizard_url" in data
                assert "timestamp" in data
                # Verify wizard_url format
                assert "/app/reports/" in data["wizard_url"]
                assert "/wizard" in data["wizard_url"]
                assert data["report_id"] in data["wizard_url"]

    def test_create_report_creates_unique_reports(self, client: TestClient):
        """Each call to create-report should create a new report."""
        with patch("app.routes.demo.settings") as mock_settings:
            mock_settings.ENVIRONMENT = "staging"
            mock_settings.DEMO_SECRET = "test-secret"
            mock_settings.APP_BASE_URL = "https://test.example.com"
            
            with patch("app.config.get_settings") as mock_get_settings:
                mock_get_settings.return_value = mock_settings
                
                response1 = client.post(
                    "/demo/create-report",
                    headers={"X-DEMO-SECRET": "test-secret"}
                )
                response2 = client.post(
                    "/demo/create-report",
                    headers={"X-DEMO-SECRET": "test-secret"}
                )
                
                assert response1.status_code == 200
                assert response2.status_code == 200
                # Reports should have different IDs
                assert response1.json()["report_id"] != response2.json()["report_id"]
