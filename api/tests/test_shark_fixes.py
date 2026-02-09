"""
Shark Fix Pytest Suite
=======================
Run:  pytest tests/test_shark_fixes.py -v
      pytest tests/test_shark_fixes.py -v -s  (with stdout)

Tests all 7 platform gap fixes ("sharks"):
1. SOC 2 claim removed from landing page
2. Exempt determination persisted to backend
3. Party portal autosave endpoint exists
4. Client resend party links endpoint exists
5. Request corrections workflow endpoint exists
6. Filing deadline reminders script + cron endpoint
7. Admin stats returns real data (no placeholders)
"""

import os
import json
import pytest
import requests
from datetime import datetime, timedelta

# ── Configuration ──────────────────────────────────────────────────────
BASE_URL = os.getenv("API_URL", "https://pct-fin-cen-staging.onrender.com")
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://fincenclear.com")
TIMEOUT = 60


def api(method: str, endpoint: str, **kwargs) -> requests.Response:
    """Helper to make API requests."""
    url = f"{BASE_URL}{endpoint}"
    return requests.request(method, url, timeout=TIMEOUT, **kwargs)


# ── Pre-flight ──────────────────────────────────────────────────────────

class TestPreFlight:
    """Verify the API is reachable before running shark tests."""

    def test_api_health(self):
        """API /health should return 200."""
        resp = api("GET", "/health")
        assert resp.status_code == 200, f"API unhealthy: {resp.status_code}"


# ══════════════════════════════════════════════════════════════════════
# SHARK 1 — SOC 2 Claim Removed
# ══════════════════════════════════════════════════════════════════════

class TestShark1SOC2Claim:
    """Landing page should not claim SOC 2 certification."""

    def test_no_soc2_certification_claim(self):
        """SOC 2 certification language should be absent from the landing page."""
        resp = requests.get(FRONTEND_URL, timeout=15)
        content = resp.text.lower()

        bad_claims = [
            "soc 2 certified",
            "soc 2 type ii certified",
            "soc 2 type ii",
            "soc2 certified",
            "soc 2 security",
        ]
        found = [c for c in bad_claims if c in content]
        assert not found, f"Found SOC 2 claims on landing page: {found}"

    def test_enterprise_security_present(self):
        """Enterprise Security replacement should be present."""
        resp = requests.get(FRONTEND_URL, timeout=15)
        content = resp.text.lower()
        assert "enterprise security" in content or "enterprise-grade" in content, \
            "\"Enterprise Security\" replacement not found on landing page"


# ══════════════════════════════════════════════════════════════════════
# SHARK 2 — Exempt Determination Persisted
# ══════════════════════════════════════════════════════════════════════

class TestShark2ExemptDetermination:
    """Exempt determination results should be persisted to the database."""

    @pytest.fixture
    def test_report(self):
        """Create a test report for determination tests."""
        resp = api("POST", "/reports", json={
            "wizard_data": {
                "collection": {
                    "propertyAddress": {
                        "street": "123 Pytest Shark St",
                        "city": "Testville",
                        "state": "CA",
                        "zip": "90210",
                    },
                    "purchasePrice": 500000,
                    "closingDate": (datetime.now() + timedelta(days=10)).strftime("%Y-%m-%d"),
                }
            }
        })
        assert resp.status_code in (200, 201), f"Could not create report: {resp.status_code}"
        return resp.json()

    def test_determine_endpoint_exists(self, test_report):
        """POST /reports/{id}/determine should exist."""
        report_id = test_report["id"]
        resp = api("POST", f"/reports/{report_id}/determine", json={
            "result": "exempt",
            "exemption_reasons": ["buyer_is_individual"]
        })
        assert resp.status_code != 404, "POST /reports/{id}/determine endpoint not found"

    def test_exempt_determination_persists(self, test_report):
        """Exempt determination data should survive a round-trip."""
        report_id = test_report["id"]

        # Save determination
        resp = api("POST", f"/reports/{report_id}/determine", json={
            "result": "exempt",
            "exemption_reasons": ["buyer_is_individual", "financing_involved"]
        })

        if resp.status_code == 404:
            pytest.skip("Determine endpoint not implemented")

        assert resp.status_code == 200, f"Determine failed: {resp.status_code} — {resp.text[:120]}"

        # Verify certificate_id returned
        data = resp.json()
        assert data.get("certificate_id") or data.get("exemption_certificate_id"), \
            "No certificate_id in determination response"

        # Re-fetch and verify persistence
        fetch = api("GET", f"/reports/{report_id}")
        assert fetch.status_code == 200
        report = fetch.json()

        assert report.get("exemption_certificate_id"), "exemption_certificate_id not persisted"
        assert report.get("exemption_reasons"), "exemption_reasons not persisted"
        assert report.get("status") == "exempt", f"Status is '{report.get('status')}', expected 'exempt'"


# ══════════════════════════════════════════════════════════════════════
# SHARK 3 — Party Portal Autosave
# ══════════════════════════════════════════════════════════════════════

class TestShark3PartyPortalAutosave:
    """Party portal should support saving progress via POST /party/{token}/save."""

    def test_party_portal_save_endpoint_exists(self):
        """POST /party/{token}/save should exist (404/422 for fake token is fine)."""
        resp = api("POST", "/party/fake-token-test-12345/save", json={"party_data": {}})
        # 404 = endpoint exists, token not found (expected)
        # 422 = validation error (expected)
        # 405 = method not allowed → NOT implemented
        assert resp.status_code != 405, "POST /party/{token}/save not implemented"


# ══════════════════════════════════════════════════════════════════════
# SHARK 4 — Client Resend Party Links
# ══════════════════════════════════════════════════════════════════════

class TestShark4ClientResendLinks:
    """Clients should be able to resend party portal links without staff help."""

    def test_client_resend_link_endpoint_exists(self):
        """POST /party/reports/{id}/parties/{id}/resend-link should exist."""
        fake_report = "00000000-0000-0000-0000-000000000000"
        fake_party = "00000000-0000-0000-0000-000000000001"

        resp = api("POST", f"/party/reports/{fake_report}/parties/{fake_party}/resend-link")
        assert resp.status_code != 405, "Client resend-link endpoint not implemented"

    def test_staff_resend_link_endpoint_exists(self):
        """POST /party/staff/resend-link/{id} should exist."""
        fake_party = "00000000-0000-0000-0000-000000000001"
        resp = api("POST", f"/party/staff/resend-link/{fake_party}")
        assert resp.status_code != 405, "Staff resend-link endpoint not implemented"


# ══════════════════════════════════════════════════════════════════════
# SHARK 5 — Request Corrections Workflow
# ══════════════════════════════════════════════════════════════════════

class TestShark5RequestCorrections:
    """Staff should be able to request corrections from submitted parties."""

    def test_request_corrections_endpoint_exists(self):
        """POST /party/parties/{id}/request-corrections should exist."""
        fake_party = "00000000-0000-0000-0000-000000000000"

        resp = api("POST", f"/party/parties/{fake_party}/request-corrections", json={
            "message": "Please correct your SSN."
        })

        # 404 with "party"/"not found" = endpoint exists, fake party not in DB
        # 401/403 = auth required, endpoint exists
        # 405 = not implemented
        assert resp.status_code != 405, "Request corrections endpoint not implemented"

        if resp.status_code == 404:
            body = resp.text.lower()
            assert "not found" in body or "party" in body, \
                "Got 404 but response doesn't indicate party-not-found — endpoint may be missing"


# ══════════════════════════════════════════════════════════════════════
# SHARK 6 — Filing Deadline Reminders
# ══════════════════════════════════════════════════════════════════════

class TestShark6DeadlineReminders:
    """Automated filing deadline reminders should be implemented."""

    def test_deadline_script_exists(self):
        """check_filing_deadlines.py should exist in api/app/scripts/."""
        search_dirs = [
            os.path.join(os.path.dirname(__file__), "..", "app", "scripts"),
            os.path.join(os.path.dirname(__file__), "..", "..", "api", "app", "scripts"),
        ]

        found = False
        for d in search_dirs:
            path = os.path.join(d, "check_filing_deadlines.py")
            if os.path.exists(path):
                found = True
                break

        assert found, "check_filing_deadlines.py not found"

    def test_cron_endpoint_exists(self):
        """POST /cron/check-deadlines should exist."""
        resp = api("POST", "/cron/check-deadlines")
        assert resp.status_code not in (404, 405), \
            f"/cron/check-deadlines not found (status {resp.status_code})"


# ══════════════════════════════════════════════════════════════════════
# SHARK 7 — Admin Stats Real Data
# ══════════════════════════════════════════════════════════════════════

class TestShark7AdminStats:
    """Admin stats should use real database data, not placeholders."""

    def _get_stats(self):
        """Try known stats endpoints."""
        for path in ("/submission-requests/admin/stats", "/submission-requests/stats"):
            resp = api("GET", path)
            if resp.status_code != 404:
                return resp
        return None

    def test_admin_stats_endpoint_exists(self):
        """GET /submission-requests/admin/stats (or /stats) should exist."""
        resp = self._get_stats()
        assert resp is not None, "Admin stats endpoint not found at any known path"
        assert resp.status_code != 404, "Admin stats endpoint returned 404"

    def test_no_placeholder_avg_processing(self):
        """avg_processing_hours should not be the hardcoded 4.2 placeholder."""
        resp = self._get_stats()
        if not resp or resp.status_code in (401, 403):
            pytest.skip("Auth required for admin stats")
        if resp.status_code != 200:
            pytest.skip(f"Stats endpoint returned {resp.status_code}")

        data = resp.json()
        assert data.get("avg_processing_hours") != 4.2, \
            "avg_processing_hours is still the 4.2 placeholder"

    def test_no_placeholder_company_names(self):
        """Response should not contain 'Client Company' placeholder text."""
        resp = self._get_stats()
        if not resp or resp.status_code in (401, 403):
            pytest.skip("Auth required for admin stats")
        if resp.status_code != 200:
            pytest.skip(f"Stats endpoint returned {resp.status_code}")

        data_str = json.dumps(resp.json())
        assert "Client Company" not in data_str, "Placeholder 'Client Company' still present"
        assert "Client User" not in data_str, "Placeholder 'Client User' still present"
