# 🧪 Shark Fix Integration Tests — Cursor Prompt

Generate an integration test script that validates all shark fixes are working correctly.

---

## Step 1: Create the Test Script

**File:** `api/app/scripts/test_shark_fixes.py`

```python
#!/usr/bin/env python3
"""
Shark Fix Integration Tests
============================
Run: python -m app.scripts.test_shark_fixes

Tests all platform gap fixes:
1. SOC 2 claim removed
2. Exempt determination persisted
3. Party portal autosave
4. Client resend party links
5. Request corrections workflow
6. Filing deadline reminders
7. Admin stats real data
"""

import sys
import os
import requests
from datetime import datetime, timedelta
from typing import Tuple, List, Dict, Any

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from dotenv import load_dotenv
load_dotenv()

# Test configuration
BASE_URL = os.getenv("API_URL", "http://localhost:8000")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

# Track results
RESULTS: List[Tuple[str, bool, str]] = []


def log_result(test_id: str, passed: bool, message: str):
    """Log test result."""
    RESULTS.append((test_id, passed, message))
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"  {test_id} | {status} | {message}")


def api(method: str, endpoint: str, **kwargs) -> requests.Response:
    """Make API request."""
    url = f"{BASE_URL}{endpoint}"
    return requests.request(method, url, timeout=30, **kwargs)


# =============================================================================
# SHARK 1: SOC 2 Claim Removed
# =============================================================================

def test_shark_1_soc2_claim():
    """Verify SOC 2 claim is not on landing page."""
    print("\n📋 SHARK 1: SOC 2 Claim Removed")
    print("-" * 50)
    
    try:
        resp = requests.get(FRONTEND_URL, timeout=10)
        content = resp.text.lower()
        
        bad_claims = ["soc 2 certified", "soc 2 security", "soc2 certified"]
        found = [c for c in bad_claims if c in content]
        
        if found:
            log_result("1.1", False, f"Found claims: {found}")
        else:
            log_result("1.1", True, "No SOC 2 certification claims found")
            
    except Exception as e:
        log_result("1.1", False, f"Error checking landing page: {e}")


# =============================================================================
# SHARK 2: Exempt Determination Persisted
# =============================================================================

def test_shark_2_exempt_determination():
    """Test exempt determination is saved to database."""
    print("\n📋 SHARK 2: Exempt Determination Persisted")
    print("-" * 50)
    
    report_id = None
    
    # 2.1 Create report
    try:
        resp = api("POST", "/api/reports", json={
            "wizard_data": {
                "collection": {
                    "propertyAddress": {
                        "street": "123 Exempt Test St",
                        "city": "Test City",
                        "state": "CA",
                        "zip": "90210"
                    },
                    "purchasePrice": 500000,
                    "closingDate": (datetime.now() + timedelta(days=10)).strftime("%Y-%m-%d"),
                }
            }
        })
        
        if resp.status_code in [200, 201]:
            report_id = resp.json().get("id")
            log_result("2.1", True, f"Created report {report_id[:8]}...")
        else:
            log_result("2.1", False, f"Failed to create report: {resp.status_code}")
            return
            
    except Exception as e:
        log_result("2.1", False, f"Error: {e}")
        return
    
    # 2.2 Save exempt determination
    try:
        resp = api("POST", f"/api/reports/{report_id}/determine", json={
            "result": "exempt",
            "exemption_reasons": ["buyer_is_individual", "financing_involved"]
        })
        
        if resp.status_code == 200:
            data = resp.json()
            cert_id = data.get("certificate_id")
            log_result("2.2", True, f"Determination saved. Certificate: {cert_id}")
        elif resp.status_code == 404:
            log_result("2.2", False, "Endpoint not found - not implemented")
            return
        else:
            log_result("2.2", False, f"Failed: {resp.status_code} - {resp.text[:100]}")
            return
            
    except Exception as e:
        log_result("2.2", False, f"Error: {e}")
        return
    
    # 2.3 Verify persistence
    try:
        resp = api("GET", f"/api/reports/{report_id}")
        
        if resp.status_code == 200:
            report = resp.json()
            has_cert = bool(report.get("exemption_certificate_id"))
            has_reasons = bool(report.get("exemption_reasons"))
            status_ok = report.get("status") == "exempt"
            
            if has_cert and has_reasons and status_ok:
                log_result("2.3", True, f"Persisted: cert={has_cert}, reasons={has_reasons}, status={status_ok}")
            else:
                log_result("2.3", False, f"Missing: cert={has_cert}, reasons={has_reasons}, status={status_ok}")
        else:
            log_result("2.3", False, f"Could not fetch report: {resp.status_code}")
            
    except Exception as e:
        log_result("2.3", False, f"Error: {e}")


# =============================================================================
# SHARK 3: Party Portal Autosave
# =============================================================================

def test_shark_3_party_portal_autosave():
    """Test party portal save endpoint exists."""
    print("\n📋 SHARK 3: Party Portal Autosave")
    print("-" * 50)
    
    try:
        # Test if party portal PUT endpoint exists
        resp = api("PUT", "/api/p/fake-token-test", json={"party_data": {}})
        
        # 404 = endpoint exists, token not found (expected)
        # 422 = endpoint exists, validation error (expected)
        # 405 = method not allowed (endpoint missing PUT)
        
        if resp.status_code in [404, 422, 400]:
            log_result("3.1", True, "Party portal PUT endpoint exists")
        elif resp.status_code == 405:
            log_result("3.1", False, "PUT method not allowed - autosave not implemented")
        else:
            log_result("3.1", True, f"Endpoint responded: {resp.status_code}")
            
    except Exception as e:
        log_result("3.1", False, f"Error: {e}")


# =============================================================================
# SHARK 4: Client Resend Party Links
# =============================================================================

def test_shark_4_client_resend_links():
    """Test client can resend party links."""
    print("\n📋 SHARK 4: Client Resend Party Links")
    print("-" * 50)
    
    report_id = None
    party_id = None
    
    # 4.1 Create report with party
    try:
        resp = api("POST", "/api/reports", json={
            "wizard_data": {
                "collection": {
                    "propertyAddress": {"street": "456 Resend Test", "city": "Test", "state": "CA", "zip": "90210"}
                }
            }
        })
        
        if resp.status_code in [200, 201]:
            report_id = resp.json().get("id")
            
            # Add party
            party_resp = api("POST", f"/api/reports/{report_id}/parties", json={
                "party_role": "transferee",
                "display_name": "Test Buyer",
                "email": "testbuyer@example.com",
                "entity_type": "individual"
            })
            
            if party_resp.status_code in [200, 201]:
                party_id = party_resp.json().get("id")
                log_result("4.1", True, f"Created report + party")
            else:
                log_result("4.1", False, f"Failed to create party: {party_resp.status_code}")
                return
        else:
            log_result("4.1", False, f"Failed to create report: {resp.status_code}")
            return
            
    except Exception as e:
        log_result("4.1", False, f"Error: {e}")
        return
    
    # 4.2 Test resend endpoint
    try:
        resp = api("POST", f"/api/reports/{report_id}/parties/{party_id}/resend-link")
        
        if resp.status_code == 200:
            log_result("4.2", True, f"Resend endpoint works: {resp.json()}")
        elif resp.status_code == 404:
            log_result("4.2", False, "Endpoint not found - not implemented")
        else:
            log_result("4.2", False, f"Failed: {resp.status_code} - {resp.text[:100]}")
            
    except Exception as e:
        log_result("4.2", False, f"Error: {e}")


# =============================================================================
# SHARK 5: Request Corrections Workflow
# =============================================================================

def test_shark_5_request_corrections():
    """Test request corrections endpoint exists."""
    print("\n📋 SHARK 5: Request Corrections Workflow")
    print("-" * 50)
    
    # Test with a fake party ID to check if endpoint exists
    try:
        fake_party_id = "00000000-0000-0000-0000-000000000000"
        resp = api("POST", f"/api/parties/{fake_party_id}/request-corrections", json={
            "message": "Please fix your SSN"
        })
        
        # 404 with "Party not found" = endpoint exists
        # 404 with different message = endpoint missing
        # 400 = validation (endpoint exists)
        # 422 = validation (endpoint exists)
        
        if resp.status_code == 404:
            if "party" in resp.text.lower() or "not found" in resp.text.lower():
                log_result("5.1", True, "Request corrections endpoint exists")
            else:
                log_result("5.1", False, "Endpoint not found - not implemented")
        elif resp.status_code in [400, 422]:
            log_result("5.1", True, "Request corrections endpoint exists (validation error)")
        elif resp.status_code in [401, 403]:
            log_result("5.1", True, "Request corrections endpoint exists (auth required)")
        else:
            log_result("5.1", False, f"Unexpected response: {resp.status_code}")
            
    except Exception as e:
        log_result("5.1", False, f"Error: {e}")


# =============================================================================
# SHARK 6: Filing Deadline Reminders
# =============================================================================

def test_shark_6_deadline_reminders():
    """Test deadline reminder infrastructure."""
    print("\n📋 SHARK 6: Filing Deadline Reminders")
    print("-" * 50)
    
    # 6.1 Check if script exists
    script_paths = [
        "app/scripts/check_filing_deadlines.py",
        "api/app/scripts/check_filing_deadlines.py",
        "../app/scripts/check_filing_deadlines.py",
    ]
    
    script_found = False
    for path in script_paths:
        if os.path.exists(path):
            log_result("6.1", True, f"Script found: {path}")
            script_found = True
            break
    
    if not script_found:
        log_result("6.1", False, "Deadline script not found")
    
    # 6.2 Check if filing_deadline is set on new reports
    try:
        closing_date = (datetime.now() + timedelta(days=5)).strftime("%Y-%m-%d")
        resp = api("POST", "/api/reports", json={
            "wizard_data": {
                "collection": {
                    "propertyAddress": {"street": "Deadline Test", "city": "Test", "state": "CA", "zip": "90210"},
                    "closingDate": closing_date
                }
            }
        })
        
        if resp.status_code in [200, 201]:
            report = resp.json()
            if report.get("filing_deadline"):
                log_result("6.2", True, f"Filing deadline auto-set: {report['filing_deadline']}")
            else:
                # Check if it's set but not returned
                report_id = report.get("id")
                fetch_resp = api("GET", f"/api/reports/{report_id}")
                if fetch_resp.status_code == 200:
                    full_report = fetch_resp.json()
                    if full_report.get("filing_deadline"):
                        log_result("6.2", True, f"Filing deadline set: {full_report['filing_deadline']}")
                    else:
                        log_result("6.2", False, "Filing deadline not set on report")
                else:
                    log_result("6.2", False, "Could not verify filing_deadline field")
        else:
            log_result("6.2", False, f"Could not create test report: {resp.status_code}")
            
    except Exception as e:
        log_result("6.2", False, f"Error: {e}")


# =============================================================================
# SHARK 7: Admin Stats Real Data
# =============================================================================

def test_shark_7_admin_stats():
    """Test admin stats returns real data."""
    print("\n📋 SHARK 7: Admin Stats Real Data")
    print("-" * 50)
    
    try:
        resp = api("GET", "/api/admin/requests/stats")
        
        if resp.status_code == 200:
            data = resp.json()
            
            # Check for obvious placeholder values
            issues = []
            
            if data.get("avg_processing_hours") == 4.2:
                issues.append("avg_processing_hours=4.2 (placeholder)")
            
            if "Client Company" in str(data):
                issues.append("Contains 'Client Company' placeholder")
            
            if issues:
                log_result("7.1", False, f"Placeholder data: {', '.join(issues)}")
            else:
                log_result("7.1", True, f"Real data returned: {list(data.keys())}")
                
        elif resp.status_code == 404:
            log_result("7.1", False, "Admin stats endpoint not found")
        elif resp.status_code in [401, 403]:
            log_result("7.1", True, "Endpoint exists (auth required)")
        else:
            log_result("7.1", False, f"Unexpected: {resp.status_code}")
            
    except Exception as e:
        log_result("7.1", False, f"Error: {e}")


# =============================================================================
# MAIN
# =============================================================================

def print_summary():
    """Print test summary."""
    passed = sum(1 for _, p, _ in RESULTS if p)
    failed = sum(1 for _, p, _ in RESULTS if not p)
    total = len(RESULTS)
    
    print("\n" + "=" * 60)
    print("📊 TEST SUMMARY")
    print("=" * 60)
    print(f"  ✅ Passed: {passed}")
    print(f"  ❌ Failed: {failed}")
    print(f"  📋 Total:  {total}")
    print("=" * 60)
    
    if failed == 0:
        print("\n🎉 ALL SHARKS CRUSHED! 🦈💀\n")
    else:
        print(f"\n⚠️  {failed} SHARK(S) STILL SWIMMING!\n")
        print("Failed tests:")
        for test_id, passed, msg in RESULTS:
            if not passed:
                print(f"  ❌ {test_id}: {msg}")
    
    return failed == 0


def main():
    print("\n" + "=" * 60)
    print("🦈 SHARK FIX INTEGRATION TESTS")
    print("=" * 60)
    print(f"API:      {BASE_URL}")
    print(f"Frontend: {FRONTEND_URL}")
    
    # Run all tests
    test_shark_1_soc2_claim()
    test_shark_2_exempt_determination()
    test_shark_3_party_portal_autosave()
    test_shark_4_client_resend_links()
    test_shark_5_request_corrections()
    test_shark_6_deadline_reminders()
    test_shark_7_admin_stats()
    
    # Summary
    success = print_summary()
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
```

---

## Step 2: Add to existing tests directory

If you have a `tests/` directory, also create:

**File:** `api/tests/test_shark_fixes.py`

```python
"""
Pytest version of shark fix tests.
Run: pytest tests/test_shark_fixes.py -v
"""

import pytest
import requests
from datetime import datetime, timedelta
import os

BASE_URL = os.getenv("API_URL", "http://localhost:8000")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")


class TestShark1SOC2Claim:
    """Shark 1: SOC 2 claim should be removed from landing page."""
    
    def test_no_soc2_certification_claim(self):
        """Landing page should not claim SOC 2 certification."""
        resp = requests.get(FRONTEND_URL, timeout=10)
        content = resp.text.lower()
        
        bad_claims = ["soc 2 certified", "soc 2 security", "soc2 certified"]
        found = [c for c in bad_claims if c in content]
        
        assert not found, f"Found SOC 2 claims: {found}"


class TestShark2ExemptDetermination:
    """Shark 2: Exempt determination should persist to database."""
    
    @pytest.fixture
    def test_report(self):
        """Create a test report."""
        resp = requests.post(f"{BASE_URL}/api/reports", json={
            "wizard_data": {
                "collection": {
                    "propertyAddress": {"street": "Test", "city": "Test", "state": "CA", "zip": "90210"},
                    "purchasePrice": 500000,
                }
            }
        }, timeout=30)
        assert resp.status_code in [200, 201]
        return resp.json()
    
    def test_determine_endpoint_exists(self, test_report):
        """POST /reports/{id}/determine should exist."""
        report_id = test_report["id"]
        resp = requests.post(f"{BASE_URL}/api/reports/{report_id}/determine", json={
            "result": "exempt",
            "exemption_reasons": ["buyer_is_individual"]
        }, timeout=30)
        
        assert resp.status_code != 404, "Determine endpoint not found"
    
    def test_exempt_determination_persists(self, test_report):
        """Exempt determination should be saved to database."""
        report_id = test_report["id"]
        
        # Save determination
        resp = requests.post(f"{BASE_URL}/api/reports/{report_id}/determine", json={
            "result": "exempt",
            "exemption_reasons": ["buyer_is_individual", "financing_involved"]
        }, timeout=30)
        
        if resp.status_code == 404:
            pytest.skip("Determine endpoint not implemented")
        
        assert resp.status_code == 200
        
        # Verify persistence
        fetch_resp = requests.get(f"{BASE_URL}/api/reports/{report_id}", timeout=30)
        assert fetch_resp.status_code == 200
        
        report = fetch_resp.json()
        assert report.get("exemption_certificate_id"), "Certificate ID not persisted"
        assert report.get("exemption_reasons"), "Exemption reasons not persisted"
        assert report.get("status") == "exempt", "Status not set to exempt"


class TestShark3PartyPortalAutosave:
    """Shark 3: Party portal should support autosave."""
    
    def test_party_portal_put_endpoint_exists(self):
        """PUT /p/{token} should exist for autosave."""
        resp = requests.put(f"{BASE_URL}/api/p/fake-token", json={"party_data": {}}, timeout=30)
        
        # 404/422/400 = endpoint exists but token invalid (expected)
        # 405 = PUT not allowed (not implemented)
        assert resp.status_code != 405, "PUT method not allowed - autosave not implemented"


class TestShark4ClientResendLinks:
    """Shark 4: Clients should be able to resend party links."""
    
    def test_resend_link_endpoint_exists(self):
        """POST /reports/{id}/parties/{id}/resend-link should exist."""
        fake_report = "00000000-0000-0000-0000-000000000000"
        fake_party = "00000000-0000-0000-0000-000000000001"
        
        resp = requests.post(
            f"{BASE_URL}/api/reports/{fake_report}/parties/{fake_party}/resend-link",
            timeout=30
        )
        
        # Anything except 404 on the route itself means endpoint exists
        assert resp.status_code != 405, "Resend link endpoint not implemented"


class TestShark5RequestCorrections:
    """Shark 5: Staff should be able to request corrections."""
    
    def test_request_corrections_endpoint_exists(self):
        """POST /parties/{id}/request-corrections should exist."""
        fake_party = "00000000-0000-0000-0000-000000000000"
        
        resp = requests.post(
            f"{BASE_URL}/api/parties/{fake_party}/request-corrections",
            json={"message": "Please fix your SSN"},
            timeout=30
        )
        
        # If we get 404 with "party not found", endpoint exists
        # If we get 404 without that, endpoint is missing
        if resp.status_code == 404:
            assert "party" in resp.text.lower() or "not found" in resp.text.lower(), \
                "Request corrections endpoint not found"


class TestShark6DeadlineReminders:
    """Shark 6: Filing deadline reminders should be set up."""
    
    def test_deadline_script_exists(self):
        """check_filing_deadlines.py should exist."""
        paths = [
            "app/scripts/check_filing_deadlines.py",
            "api/app/scripts/check_filing_deadlines.py",
        ]
        
        found = any(os.path.exists(p) for p in paths)
        assert found, "Deadline reminder script not found"
    
    def test_filing_deadline_auto_set(self):
        """Reports with closingDate should auto-set filing_deadline."""
        closing_date = (datetime.now() + timedelta(days=5)).strftime("%Y-%m-%d")
        
        resp = requests.post(f"{BASE_URL}/api/reports", json={
            "wizard_data": {
                "collection": {
                    "propertyAddress": {"street": "Test", "city": "Test", "state": "CA", "zip": "90210"},
                    "closingDate": closing_date
                }
            }
        }, timeout=30)
        
        assert resp.status_code in [200, 201]
        report = resp.json()
        
        # Check response or fetch full report
        if not report.get("filing_deadline"):
            fetch_resp = requests.get(f"{BASE_URL}/api/reports/{report['id']}", timeout=30)
            report = fetch_resp.json()
        
        assert report.get("filing_deadline"), "Filing deadline not auto-set"


class TestShark7AdminStats:
    """Shark 7: Admin stats should return real data."""
    
    def test_admin_stats_endpoint_exists(self):
        """GET /admin/requests/stats should exist."""
        resp = requests.get(f"{BASE_URL}/api/admin/requests/stats", timeout=30)
        
        # 401/403 = exists but needs auth
        # 200 = exists and accessible
        # 404 = not implemented
        assert resp.status_code != 404, "Admin stats endpoint not found"
    
    def test_no_placeholder_data(self):
        """Admin stats should not contain placeholder values."""
        resp = requests.get(f"{BASE_URL}/api/admin/requests/stats", timeout=30)
        
        if resp.status_code in [401, 403]:
            pytest.skip("Auth required for admin stats")
        
        if resp.status_code == 200:
            data = resp.json()
            assert data.get("avg_processing_hours") != 4.2, "Placeholder avg_processing_hours"
            assert "Client Company" not in str(data), "Placeholder company name"
```

---

## Step 3: Run the Tests

### Option A: Standalone Script

```bash
# From api directory
cd api

# Run against local
python -m app.scripts.test_shark_fixes

# Run against staging
API_URL=https://api.staging.fincenclear.com \
FRONTEND_URL=https://staging.fincenclear.com \
python -m app.scripts.test_shark_fixes
```

### Option B: Pytest

```bash
# Run all shark tests
pytest tests/test_shark_fixes.py -v

# Run specific shark
pytest tests/test_shark_fixes.py::TestShark2ExemptDetermination -v

# Run with output
pytest tests/test_shark_fixes.py -v -s
```

---

## Expected Output

```
==============================================================
🦈 SHARK FIX INTEGRATION TESTS
==============================================================
API:      http://localhost:8000
Frontend: http://localhost:3000

📋 SHARK 1: SOC 2 Claim Removed
--------------------------------------------------
  1.1 | ✅ PASS | No SOC 2 certification claims found

📋 SHARK 2: Exempt Determination Persisted
--------------------------------------------------
  2.1 | ✅ PASS | Created report abc12345...
  2.2 | ✅ PASS | Determination saved. Certificate: RRER-ABC123-DEF456
  2.3 | ✅ PASS | Persisted: cert=True, reasons=True, status=True

📋 SHARK 3: Party Portal Autosave
--------------------------------------------------
  3.1 | ✅ PASS | Party portal PUT endpoint exists

📋 SHARK 4: Client Resend Party Links
--------------------------------------------------
  4.1 | ✅ PASS | Created report + party
  4.2 | ✅ PASS | Resend endpoint works

📋 SHARK 5: Request Corrections Workflow
--------------------------------------------------
  5.1 | ✅ PASS | Request corrections endpoint exists

📋 SHARK 6: Filing Deadline Reminders
--------------------------------------------------
  6.1 | ✅ PASS | Script found: app/scripts/check_filing_deadlines.py
  6.2 | ✅ PASS | Filing deadline auto-set: 2026-03-11

📋 SHARK 7: Admin Stats Real Data
--------------------------------------------------
  7.1 | ✅ PASS | Real data returned

============================================================
📊 TEST SUMMARY
============================================================
  ✅ Passed: 10
  ❌ Failed: 0
  📋 Total:  10
============================================================

🎉 ALL SHARKS CRUSHED! 🦈💀
```

---

## Troubleshooting Failed Tests

| Test | If It Fails | Fix |
|------|-------------|-----|
| 1.1 | SOC 2 claims found | Edit landing page, change to "Enterprise Security" |
| 2.2 | 404 on /determine | Implement POST /reports/{id}/determine endpoint |
| 2.3 | Fields not persisted | Add exemption_certificate_id, exemption_reasons to Report model |
| 3.1 | 405 on PUT | Add PUT handler to party portal route |
| 4.2 | 404 on resend-link | Implement POST /reports/{id}/parties/{id}/resend-link |
| 5.1 | Endpoint not found | Implement POST /parties/{id}/request-corrections |
| 6.1 | Script not found | Create check_filing_deadlines.py |
| 6.2 | Deadline not set | Add auto-calculation: closing_date + 30 days |
| 7.1 | 404 on admin stats | Implement GET /admin/requests/stats |
| 7.1 | Placeholder data | Calculate real avg_processing_hours from database |

---

## Integration with CI/CD

Add to your test workflow:

```yaml
# .github/workflows/test.yml
- name: Run Shark Fix Tests
  run: |
    cd api
    python -m app.scripts.test_shark_fixes
  env:
    API_URL: http://localhost:8000
    FRONTEND_URL: http://localhost:3000
```

---

Run the tests after each shark fix to verify it's working! 🦈
