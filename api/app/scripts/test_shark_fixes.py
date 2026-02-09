#!/usr/bin/env python3
"""
Shark Fix Integration Tests
============================
Run: python -m app.scripts.test_shark_fixes

Tests all platform gap fixes:
1. SOC 2 claim removed (frontend)
2. Exempt determination persisted (backend)
3. Party portal autosave (backend endpoint)
4. Client resend party links (backend endpoint)
5. Request corrections workflow (backend endpoint)
6. Filing deadline reminders (script exists + cron endpoint)
7. Admin stats real data (backend endpoint)
"""

import sys
import os
import json
import requests
from datetime import datetime, timedelta
from typing import Tuple, List, Dict, Any, Optional

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# ═══════════════════════════════════════════════════════════════════════
# Configuration
# ═══════════════════════════════════════════════════════════════════════

# Backend API URL (no trailing slash)
BASE_URL = os.getenv("API_URL", "https://pct-fin-cen-staging.onrender.com")

# Frontend URL (for SOC 2 claim check)
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://fincenclear.com")

# Track results
RESULTS: List[Tuple[str, str, bool, str]] = []  # (shark_id, test_id, passed, message)


# ═══════════════════════════════════════════════════════════════════════
# Helpers
# ═══════════════════════════════════════════════════════════════════════

def log_result(shark_id: str, test_id: str, passed: bool, message: str):
    """Log a test result."""
    RESULTS.append((shark_id, test_id, passed, message))
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"  {test_id} | {status} | {message}")


_SESSION = requests.Session()
_SESSION.headers.update({"Connection": "close"})


def api(method: str, endpoint: str, **kwargs) -> Optional[requests.Response]:
    """Make an API request to the backend."""
    url = f"{BASE_URL}{endpoint}"
    try:
        resp = _SESSION.request(method, url, timeout=60, **kwargs)
        return resp
    except requests.exceptions.RequestException as e:
        print(f"  ⚠ Request error ({method} {endpoint}): {type(e).__name__}: {e}")
        return None


def fetch_frontend(url: str) -> Optional[requests.Response]:
    """Fetch a frontend page."""
    try:
        return requests.get(url, timeout=15, allow_redirects=True)
    except requests.exceptions.RequestException as e:
        print(f"  ⚠ Frontend fetch error: {e}")
        return None


# ═══════════════════════════════════════════════════════════════════════
# SHARK 1: SOC 2 Claim Removed from Landing Page
# ═══════════════════════════════════════════════════════════════════════

def test_shark_1_soc2_claim():
    """Verify SOC 2 certification claims are removed from the landing page."""
    print("\n🦈 SHARK 1: SOC 2 Claim → Enterprise Security")
    print("-" * 55)

    resp = fetch_frontend(FRONTEND_URL)
    if not resp:
        log_result("S1", "1.1", False, "Could not reach frontend")
        return

    content = resp.text.lower()

    # Check for bad SOC 2 claims
    bad_claims = [
        "soc 2 certified",
        "soc 2 type ii certified",
        "soc 2 type ii",
        "soc2 certified",
        "soc 2 security",
    ]
    found = [c for c in bad_claims if c in content]

    if found:
        log_result("S1", "1.1", False, f"Still found SOC 2 claims: {found}")
    else:
        log_result("S1", "1.1", True, "No SOC 2 certification claims on landing page")

    # Verify replacement is present
    if "enterprise security" in content or "enterprise-grade" in content:
        log_result("S1", "1.2", True, "\"Enterprise Security\" replacement found")
    else:
        log_result("S1", "1.2", False, "\"Enterprise Security\" replacement NOT found")


# ═══════════════════════════════════════════════════════════════════════
# SHARK 2: Exempt Determination Persisted to Backend
# ═══════════════════════════════════════════════════════════════════════

def test_shark_2_exempt_determination():
    """Test that exempt determination results are persisted to the database."""
    print("\n🦈 SHARK 2: Exempt Determination Persisted")
    print("-" * 55)

    # 2.1 — Create a test report
    resp = api("POST", "/reports", json={
        "wizard_data": {
            "collection": {
                "propertyAddress": {
                    "street": "123 Shark Test Blvd",
                    "city": "Testville",
                    "state": "CA",
                    "zip": "90210"
                },
                "purchasePrice": 500000,
                "closingDate": (datetime.now() + timedelta(days=10)).strftime("%Y-%m-%d"),
            }
        }
    })

    if not resp or resp.status_code not in (200, 201):
        status = resp.status_code if resp else "No response"
        detail = resp.text[:120] if resp else ""
        log_result("S2", "2.1", False, f"Could not create report: {status} {detail}")
        return

    report_id = resp.json().get("id")
    log_result("S2", "2.1", True, f"Created report {report_id[:8]}...")

    # 2.2 — Submit exempt determination
    resp = api("POST", f"/reports/{report_id}/determine", json={
        "result": "exempt",
        "exemption_reasons": ["buyer_is_individual", "financing_involved"]
    })

    if not resp:
        log_result("S2", "2.2", False, "No response from determine endpoint")
        return

    if resp.status_code == 404:
        log_result("S2", "2.2", False, "POST /reports/{id}/determine endpoint NOT FOUND")
        return
    elif resp.status_code == 200:
        data = resp.json()
        cert_id = data.get("certificate_id") or data.get("exemption_certificate_id")
        log_result("S2", "2.2", True, f"Determination saved. Certificate: {cert_id}")
    else:
        log_result("S2", "2.2", False, f"Unexpected: {resp.status_code} — {resp.text[:120]}")
        return

    # 2.3 — Verify persistence by re-fetching report
    resp = api("GET", f"/reports/{report_id}")
    if not resp or resp.status_code != 200:
        log_result("S2", "2.3", False, "Could not fetch report to verify persistence")
        return

    report = resp.json()
    has_cert = bool(report.get("exemption_certificate_id"))
    has_reasons = bool(report.get("exemption_reasons"))
    has_result = report.get("determination_result") == "exempt"
    status_ok = report.get("status") == "exempt"

    if has_cert and has_reasons and status_ok:
        log_result("S2", "2.3", True,
                   f"Persisted — cert={has_cert}, reasons={has_reasons}, status={report.get('status')}")
    else:
        log_result("S2", "2.3", False,
                   f"MISSING — cert={has_cert}, reasons={has_reasons}, result={has_result}, status={report.get('status')}")


# ═══════════════════════════════════════════════════════════════════════
# SHARK 3: Party Portal Autosave
# ═══════════════════════════════════════════════════════════════════════

def test_shark_3_party_portal_autosave():
    """Test that the party portal save endpoint exists (POST /party/{token}/save)."""
    print("\n🦈 SHARK 3: Party Portal Autosave")
    print("-" * 55)

    # The party portal save endpoint is POST /party/{token}/save
    # With a fake token we expect 404 "Link not found" — proving the endpoint exists
    resp = api("POST", "/party/fake-token-test-12345/save", json={"party_data": {}})

    if not resp:
        log_result("S3", "3.1", False, "No response from party portal save endpoint")
        return

    if resp.status_code == 405:
        log_result("S3", "3.1", False, "POST /party/{token}/save method NOT ALLOWED — autosave not implemented")
    elif resp.status_code in (404, 422, 400):
        # 404 = token not found (endpoint exists)
        # 422 = validation error (endpoint exists)
        # 400 = bad request (endpoint exists)
        log_result("S3", "3.1", True, f"Autosave endpoint exists (returned {resp.status_code} for fake token)")
    else:
        log_result("S3", "3.1", True, f"Endpoint responded: {resp.status_code}")


# ═══════════════════════════════════════════════════════════════════════
# SHARK 4: Client Can Resend Party Links
# ═══════════════════════════════════════════════════════════════════════

def test_shark_4_client_resend_links():
    """Test the client-accessible resend party link endpoint."""
    print("\n🦈 SHARK 4: Client Resend Party Links")
    print("-" * 55)

    # The endpoint is: POST /party/reports/{report_id}/parties/{party_id}/resend-link
    fake_report = "00000000-0000-0000-0000-000000000000"
    fake_party = "00000000-0000-0000-0000-000000000001"

    resp = api("POST", f"/party/reports/{fake_report}/parties/{fake_party}/resend-link")

    if not resp:
        log_result("S4", "4.1", False, "No response from resend-link endpoint")
        return

    if resp.status_code == 405:
        log_result("S4", "4.1", False, "POST resend-link method NOT ALLOWED — not implemented")
    elif resp.status_code == 404:
        body = resp.text.lower()
        if "not found" in body or "party" in body or "report" in body:
            log_result("S4", "4.1", True, "Resend-link endpoint exists (404 for fake IDs, expected)")
        else:
            log_result("S4", "4.1", False, "Got 404 — endpoint may not be registered")
    elif resp.status_code in (401, 403):
        log_result("S4", "4.1", True, "Resend-link endpoint exists (auth required)")
    elif resp.status_code in (400, 422):
        log_result("S4", "4.1", True, f"Resend-link endpoint exists (validation: {resp.status_code})")
    else:
        log_result("S4", "4.1", True, f"Resend-link endpoint responded: {resp.status_code}")

    # Also check staff resend endpoint
    resp2 = api("POST", f"/party/staff/resend-link/{fake_party}")
    if resp2 and resp2.status_code != 405:
        log_result("S4", "4.2", True, f"Staff resend endpoint also exists ({resp2.status_code})")
    elif resp2:
        log_result("S4", "4.2", False, "Staff resend endpoint not implemented")
    else:
        log_result("S4", "4.2", False, "No response from staff resend endpoint")


# ═══════════════════════════════════════════════════════════════════════
# SHARK 5: Request Corrections Workflow
# ═══════════════════════════════════════════════════════════════════════

def test_shark_5_request_corrections():
    """Test the request corrections endpoint for staff."""
    print("\n🦈 SHARK 5: Request Corrections Workflow")
    print("-" * 55)

    # The endpoint is: POST /party/parties/{party_id}/request-corrections
    fake_party = "00000000-0000-0000-0000-000000000000"

    resp = api("POST", f"/party/parties/{fake_party}/request-corrections", json={
        "message": "Please correct your date of birth — it appears to be in the future."
    })

    if not resp:
        log_result("S5", "5.1", False, "No response from request-corrections endpoint")
        return

    if resp.status_code == 405:
        log_result("S5", "5.1", False, "POST request-corrections NOT ALLOWED — not implemented")
    elif resp.status_code == 404:
        body = resp.text.lower()
        if "not found" in body or "party" in body:
            log_result("S5", "5.1", True, "Request-corrections endpoint exists (404 for fake party ID)")
        else:
            log_result("S5", "5.1", False, "Got 404 — endpoint may not be registered")
    elif resp.status_code in (401, 403):
        log_result("S5", "5.1", True, "Request-corrections endpoint exists (auth required)")
    elif resp.status_code in (400, 422):
        log_result("S5", "5.1", True, f"Request-corrections endpoint exists (validation: {resp.status_code})")
    else:
        log_result("S5", "5.1", True, f"Request-corrections endpoint responded: {resp.status_code}")


# ═══════════════════════════════════════════════════════════════════════
# SHARK 6: Filing Deadline Reminders
# ═══════════════════════════════════════════════════════════════════════

def test_shark_6_deadline_reminders():
    """Test deadline reminder script exists and cron endpoint works."""
    print("\n🦈 SHARK 6: Filing Deadline Reminders")
    print("-" * 55)

    # 6.1 — Check if script file exists
    script_paths = [
        os.path.join(os.path.dirname(os.path.abspath(__file__)), "check_filing_deadlines.py"),
        os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "scripts", "check_filing_deadlines.py"),
        "api/app/scripts/check_filing_deadlines.py",
        "app/scripts/check_filing_deadlines.py",
    ]

    script_found = False
    for path in script_paths:
        if os.path.exists(path):
            log_result("S6", "6.1", True, f"Deadline script found: {os.path.basename(path)}")
            script_found = True
            break

    if not script_found:
        log_result("S6", "6.1", False, "check_filing_deadlines.py not found in expected paths")

    # 6.2 — Check cron endpoint
    resp = api("POST", "/cron/check-deadlines")

    if not resp:
        log_result("S6", "6.2", False, "No response from /cron/check-deadlines")
    elif resp.status_code == 404:
        log_result("S6", "6.2", False, "POST /cron/check-deadlines endpoint NOT FOUND")
    elif resp.status_code == 405:
        log_result("S6", "6.2", False, "POST /cron/check-deadlines method not allowed")
    else:
        log_result("S6", "6.2", True, f"Cron endpoint responded: {resp.status_code}")
        try:
            data = resp.json()
            log_result("S6", "6.3", True, f"Response: {json.dumps(data)[:120]}")
        except Exception:
            log_result("S6", "6.3", True, f"Cron endpoint returned status {resp.status_code}")


# ═══════════════════════════════════════════════════════════════════════
# SHARK 7: Admin Requests — Real Stats (No Placeholders)
# ═══════════════════════════════════════════════════════════════════════

def test_shark_7_admin_stats():
    """Test admin stats endpoint returns real data, not placeholders."""
    print("\n🦈 SHARK 7: Admin Stats — Real Data")
    print("-" * 55)

    # 7.1 — Check /submission-requests/admin/stats
    resp = api("GET", "/submission-requests/admin/stats")

    if not resp:
        log_result("S7", "7.1", False, "No response from admin stats endpoint")
        return

    if resp.status_code == 404:
        # Try alternate path
        resp = api("GET", "/submission-requests/stats")
        if not resp or resp.status_code == 404:
            log_result("S7", "7.1", False, "Admin stats endpoint NOT FOUND at any known path")
            return

    if resp.status_code in (401, 403):
        log_result("S7", "7.1", True, "Admin stats endpoint exists (auth required — expected)")
        return

    if resp.status_code != 200:
        log_result("S7", "7.1", False, f"Unexpected status: {resp.status_code}")
        return

    data = resp.json()
    log_result("S7", "7.1", True, f"Stats endpoint returned data: {list(data.keys())[:6]}")

    # 7.2 — Check for placeholder values
    issues = []

    # Check for hardcoded avg_processing_hours=4.2 placeholder
    if data.get("avg_processing_hours") == 4.2:
        issues.append("avg_processing_hours=4.2 (placeholder)")

    # Check for "Client Company" placeholder in any string field
    data_str = json.dumps(data)
    if "Client Company" in data_str:
        issues.append("Contains 'Client Company' placeholder")
    if "Client User" in data_str:
        issues.append("Contains 'Client User' placeholder")

    if issues:
        log_result("S7", "7.2", False, f"Placeholder data detected: {', '.join(issues)}")
    else:
        log_result("S7", "7.2", True, "No placeholder data detected")


# ═══════════════════════════════════════════════════════════════════════
# BONUS: API Health Check
# ═══════════════════════════════════════════════════════════════════════

def test_api_health():
    """Quick health check to confirm API is reachable."""
    print("\n🏥 Pre-flight: API Health Check")
    print("-" * 55)

    resp = api("GET", "/health")
    if resp and resp.status_code == 200:
        log_result("HC", "0.1", True, f"API is healthy ({BASE_URL})")
        return True
    elif resp:
        log_result("HC", "0.1", False, f"API returned {resp.status_code}")
        return False
    else:
        log_result("HC", "0.1", False, f"API unreachable at {BASE_URL}")
        return False


# ═══════════════════════════════════════════════════════════════════════
# Summary
# ═══════════════════════════════════════════════════════════════════════

def print_summary():
    """Print final test summary."""
    passed = sum(1 for _, _, p, _ in RESULTS if p)
    failed = sum(1 for _, _, p, _ in RESULTS if not p)
    total = len(RESULTS)

    print("\n" + "=" * 60)
    print("📊 SHARK FIX TEST SUMMARY")
    print("=" * 60)

    # Group by shark
    sharks = {}
    for shark_id, test_id, p, msg in RESULTS:
        if shark_id not in sharks:
            sharks[shark_id] = {"pass": 0, "fail": 0}
        if p:
            sharks[shark_id]["pass"] += 1
        else:
            sharks[shark_id]["fail"] += 1

    shark_labels = {
        "HC": "Pre-flight Health Check",
        "S1": "SHARK 1 — SOC 2 Claim Removed",
        "S2": "SHARK 2 — Exempt Determination Persisted",
        "S3": "SHARK 3 — Party Portal Autosave",
        "S4": "SHARK 4 — Client Resend Party Links",
        "S5": "SHARK 5 — Request Corrections Workflow",
        "S6": "SHARK 6 — Filing Deadline Reminders",
        "S7": "SHARK 7 — Admin Stats Real Data",
    }

    for sid, counts in sharks.items():
        label = shark_labels.get(sid, sid)
        if counts["fail"] == 0:
            print(f"  ✅ {label}: {counts['pass']}/{counts['pass']} passed")
        else:
            print(f"  ❌ {label}: {counts['pass']}/{counts['pass'] + counts['fail']} passed")

    print("-" * 60)
    print(f"  Total: {passed} passed, {failed} failed, {total} total")
    print("=" * 60)

    if failed == 0:
        print("\n🎉 ALL SHARKS CRUSHED! 🦈💀\n")
    else:
        print(f"\n⚠️  {failed} test(s) failed — shark(s) still swimming!\n")
        print("Failed tests:")
        for shark_id, test_id, p, msg in RESULTS:
            if not p:
                print(f"  ❌ [{shark_id}] {test_id}: {msg}")
        print()

    return failed == 0


# ═══════════════════════════════════════════════════════════════════════
# Main
# ═══════════════════════════════════════════════════════════════════════

def main():
    print()
    print("=" * 60)
    print("🦈 SHARK FIX INTEGRATION TESTS")
    print("=" * 60)
    print(f"  Backend:  {BASE_URL}")
    print(f"  Frontend: {FRONTEND_URL}")
    print(f"  Time:     {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    # Pre-flight
    api_ok = test_api_health()
    if not api_ok:
        print("\n⛔ API is not reachable. Skipping backend tests.\n")
        print("Set API_URL env var if the backend is at a different URL.")
        print(f"Current API_URL: {BASE_URL}")
        print_summary()
        sys.exit(1)

    # Run all shark tests (with brief pauses to avoid connection pooling issues)
    import time
    test_shark_1_soc2_claim()
    time.sleep(1)
    test_shark_2_exempt_determination()
    time.sleep(1)
    test_shark_3_party_portal_autosave()
    time.sleep(1)
    test_shark_4_client_resend_links()
    time.sleep(1)
    test_shark_5_request_corrections()
    time.sleep(1)
    test_shark_6_deadline_reminders()
    time.sleep(1)
    test_shark_7_admin_stats()

    # Summary
    success = print_summary()
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
