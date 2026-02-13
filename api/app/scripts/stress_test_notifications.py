#!/usr/bin/env python3
"""
STRESS TEST: Notification Templates
=====================================
Tests every email template in email_service.py:
  1. Generates HTML (no emails sent)
  2. Validates valid HTML structure
  3. Checks correct content is embedded
  4. Verifies logo mode (FinClear vs Company)
  5. Checks accent colors and CTA buttons

Usage:
    python -m app.scripts.stress_test_notifications
    python -m app.scripts.stress_test_notifications --verbose
"""

import os
import sys
import re
import argparse
from datetime import datetime
from typing import Any, Dict, List, Optional

# ══════════════════════════════════════════════════════════════════════════════
# ENV SETUP
# ══════════════════════════════════════════════════════════════════════════════

os.environ.setdefault("DATABASE_URL", "postgresql://test:test@localhost:5432/testdb")

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# ══════════════════════════════════════════════════════════════════════════════
# APP IMPORTS — Template generators only (no SendGrid needed)
# ══════════════════════════════════════════════════════════════════════════════

from app.services.email_service import (
    # Template generators (HTML only, no send)
    get_party_invite_html,
    get_party_invite_text,
    get_confirmation_html,
    get_confirmation_text,
    get_invoice_email_html,
    get_invoice_email_text,
    get_exempt_notification_html,
    get_exempt_notification_text,
    get_links_sent_confirmation_html,
    get_links_sent_confirmation_text,
    get_party_nudge_html,
    get_party_nudge_text,
    # Wrapper + helpers
    _build_email_wrapper,
    _info_card,
    _text,
    _muted,
    _warning_box,
    BRAND_NAME,
    BRAND_TAGLINE,
    BRAND_SUPPORT_EMAIL,
)

# For filing templates, they call send_email internally, so we test
# the _build_email_wrapper directly for those + verify content inline.


# ══════════════════════════════════════════════════════════════════════════════
# VALIDATION HELPERS
# ══════════════════════════════════════════════════════════════════════════════

def check_html_valid(html: str, checks: list) -> bool:
    """Check that the HTML has required structural elements."""
    ok = True
    
    if "<!DOCTYPE html>" in html:
        checks.append("OK: has <!DOCTYPE html>")
    else:
        checks.append("FAIL: missing <!DOCTYPE html>")
        ok = False
    
    if "<html" in html and "</html>" in html:
        checks.append("OK: has <html>...</html>")
    else:
        checks.append("FAIL: missing <html> tags")
        ok = False
    
    if "<body" in html and "</body>" in html:
        checks.append("OK: has <body>...</body>")
    else:
        checks.append("FAIL: missing <body> tags")
        ok = False
    
    if "<head" in html and "</head>" in html:
        checks.append("OK: has <head>...</head>")
    else:
        checks.append("FAIL: missing <head> tags")
        ok = False
    
    if 'charset="utf-8"' in html or "charset=utf-8" in html:
        checks.append("OK: has charset=utf-8")
    else:
        checks.append("FAIL: missing charset=utf-8")
        ok = False
    
    return ok


def check_contains(html: str, needle: str, label: str, checks: list) -> bool:
    """Check that HTML contains a specific string."""
    if needle in html:
        checks.append(f"OK: contains {label}")
        return True
    else:
        checks.append(f"FAIL: missing {label} (searched: {repr(needle)[:50]})")
        return False


def check_not_contains(html: str, needle: str, label: str, checks: list) -> bool:
    """Check that HTML does NOT contain a specific string."""
    if needle not in html:
        checks.append(f"OK: does NOT contain {label}")
        return True
    else:
        checks.append(f"FAIL: should not contain {label}")
        return False


def check_logo_mode(html: str, expected_mode: str, checks: list) -> bool:
    """
    Verify the correct logo mode is used:
    - "finclear": Should show FinClear brand block (the 'F' icon + brand name)
    - "company": Should show company logo or company name fallback
    """
    has_finclear_icon = 'font-weight:bold;">F</span>' in html
    has_company_img = 'alt="Company Logo"' in html
    has_company_text_fallback = "FinCEN Compliance Portal" in html
    
    if expected_mode == "finclear":
        if has_finclear_icon:
            checks.append("OK: logo_mode=finclear (F icon present)")
            return True
        else:
            checks.append("FAIL: logo_mode=finclear expected but F icon not found")
            return False
    elif expected_mode == "company_logo":
        if has_company_img:
            checks.append("OK: logo_mode=company (company logo img present)")
            return True
        else:
            checks.append("FAIL: logo_mode=company_logo expected but img not found")
            return False
    elif expected_mode == "company_text":
        if has_company_text_fallback and not has_company_img:
            checks.append("OK: logo_mode=company (text fallback, no img)")
            return True
        else:
            checks.append("FAIL: logo_mode=company_text expected but fallback not found")
            return False
    
    checks.append(f"FAIL: unknown expected logo mode: {expected_mode}")
    return False


def check_accent_color(html: str, expected_accent: str, checks: list) -> bool:
    """Check that the expected accent color hex appears in the HTML."""
    color_map = {
        "blue":  "#2563eb",
        "green": "#059669",
        "amber": "#d97706",
        "red":   "#dc2626",
    }
    hex_color = color_map.get(expected_accent, expected_accent)
    
    if hex_color in html:
        checks.append(f"OK: accent color {expected_accent} ({hex_color}) present")
        return True
    else:
        checks.append(f"FAIL: accent color {expected_accent} ({hex_color}) not found")
        return False


def check_cta_button(html: str, expected_url: str, expected_label: str, checks: list) -> bool:
    """Check that the CTA button has the correct URL and label."""
    ok = True
    
    if expected_url and expected_url in html:
        checks.append(f"OK: CTA URL present ({expected_url[:40]}...)")
    elif expected_url:
        checks.append(f"FAIL: CTA URL missing ({expected_url[:40]}...)")
        ok = False
    
    if expected_label and expected_label in html:
        checks.append(f"OK: CTA label '{expected_label}'")
    elif expected_label:
        checks.append(f"FAIL: CTA label '{expected_label}' missing")
        ok = False
    
    return ok


def check_text_version(text: str, needles: List[str], checks: list) -> bool:
    """Check that the plain text version contains key strings."""
    ok = True
    for needle in needles:
        if needle in text:
            checks.append(f"OK: text contains '{needle[:30]}'")
        else:
            checks.append(f"FAIL: text missing '{needle[:30]}'")
            ok = False
    return ok


# ══════════════════════════════════════════════════════════════════════════════
# SCENARIOS
# ══════════════════════════════════════════════════════════════════════════════

def get_scenarios() -> List[dict]:
    return [
        # 1. Party Invite — with company logo
        {"name": "Party Invite (company logo)", "group": "Party", "test": "party_invite_logo"},
        # 2. Party Invite — company name text fallback
        {"name": "Party Invite (company text)", "group": "Party", "test": "party_invite_text_fallback"},
        # 3. Party Invite — no company info
        {"name": "Party Invite (no company)", "group": "Party", "test": "party_invite_no_company"},
        # 4. Submission Confirmation — to party
        {"name": "Submission Confirmation", "group": "Party", "test": "confirmation"},
        # 5. Party Nudge — with company logo
        {"name": "Party Nudge (company logo)", "group": "Party", "test": "nudge_logo"},
        # 6. Party Nudge — text fallback
        {"name": "Party Nudge (company text)", "group": "Party", "test": "nudge_text_fallback"},
        # 7. Party Submitted — officer notification
        {"name": "Party Submitted (officer)", "group": "Officer", "test": "party_submitted"},
        # 8. Party Submitted — all complete
        {"name": "All Parties Complete (officer)", "group": "Officer", "test": "all_complete"},
        # 9. Links Sent — officer confirmation
        {"name": "Links Sent Confirmation", "group": "Officer", "test": "links_sent"},
        # 10. Exempt Notification
        {"name": "Exempt Notification", "group": "Officer", "test": "exempt"},
        # 11. Invoice
        {"name": "Invoice Email", "group": "Officer", "test": "invoice"},
        # 12. Filing Submitted
        {"name": "Filing Submitted", "group": "Filing", "test": "filing_submitted"},
        # 13. Filing Accepted
        {"name": "Filing Accepted (BSA ID)", "group": "Filing", "test": "filing_accepted"},
        # 14. Filing Rejected
        {"name": "Filing Rejected", "group": "Filing", "test": "filing_rejected"},
        # 15. Filing Needs Review
        {"name": "Filing Needs Review", "group": "Filing", "test": "filing_needs_review"},
    ]


# ══════════════════════════════════════════════════════════════════════════════
# TEST IMPLEMENTATIONS
# ══════════════════════════════════════════════════════════════════════════════

def run_test(scenario: dict, verbose: bool) -> dict:
    test_fn = TEST_REGISTRY.get(scenario["test"])
    if not test_fn:
        return _fail(f"Unknown test: {scenario['test']}")
    try:
        return test_fn(verbose)
    except Exception as e:
        return _fail(f"{type(e).__name__}: {e}")


def _fail(msg: str) -> dict:
    return {"passed": False, "checks_ok": 0, "checks_total": 0, "details": msg, "checks": [], "errors": [msg]}


def _make_result(checks: list, details: str = "") -> dict:
    ok_count = sum(1 for c in checks if c.startswith("OK:"))
    total = len(checks)
    all_ok = all(c.startswith("OK:") for c in checks) and total > 0
    return {"passed": all_ok, "checks_ok": ok_count, "checks_total": total, "details": details, "checks": checks, "errors": []}


# ── Party Invite (company logo) ──────────────────────────────────────────────

def test_party_invite_logo(verbose: bool) -> dict:
    checks = []
    html = get_party_invite_html(
        party_name="Michael Chen",
        party_role="transferee",
        property_address="456 Oak Avenue, Pasadena, CA 91101",
        portal_link="https://fincenclear.com/p/abc123",
        company_name="Pacific Coast Title",
        company_logo_url="https://r2.example.com/logos/pct-logo.png",
    )
    text = get_party_invite_text(
        party_name="Michael Chen",
        party_role="transferee",
        property_address="456 Oak Avenue, Pasadena, CA 91101",
        portal_link="https://fincenclear.com/p/abc123",
    )
    
    check_html_valid(html, checks)
    check_logo_mode(html, "company_logo", checks)
    check_contains(html, "Michael Chen", "party name", checks)
    check_contains(html, "Transferee", "role display", checks)
    check_contains(html, "456 Oak Avenue", "property address", checks)
    check_contains(html, "https://fincenclear.com/p/abc123", "portal link", checks)
    check_contains(html, "Pacific Coast Title", "company name (on behalf)", checks)
    check_contains(html, "Action Required", "header text", checks)
    check_contains(html, "Open Secure Portal", "CTA label", checks)
    check_contains(html, "7 days", "time sensitive warning", checks)
    check_accent_color(html, "blue", checks)
    check_text_version(text, ["Michael Chen", "456 Oak Avenue", "https://fincenclear.com/p/abc123"], checks)
    
    return _make_result(checks, f"HTML={len(html)} chars")


# ── Party Invite (company text fallback) ─────────────────────────────────────

def test_party_invite_text_fallback(verbose: bool) -> dict:
    checks = []
    html = get_party_invite_html(
        party_name="Sarah Williams",
        party_role="transferor",
        property_address="742 Evergreen Terrace, Glendora, CA 91740",
        portal_link="https://fincenclear.com/p/def456",
        company_name="ABC Escrow Services",
        company_logo_url=None,  # No logo uploaded
    )
    
    check_html_valid(html, checks)
    check_logo_mode(html, "company_text", checks)  # Text fallback
    check_contains(html, "ABC Escrow Services", "company name fallback", checks)
    check_contains(html, "FinCEN Compliance Portal", "portal tagline", checks)
    check_contains(html, "Sarah Williams", "party name", checks)
    check_contains(html, "Transferor", "role display", checks)
    check_not_contains(html, 'alt="Company Logo"', "no <img> tag", checks)
    
    return _make_result(checks, "Text fallback (no logo)")


# ── Party Invite (no company info at all) ────────────────────────────────────

def test_party_invite_no_company(verbose: bool) -> dict:
    checks = []
    html = get_party_invite_html(
        party_name="John Smith",
        party_role="transferee",
        property_address="100 Main St, LA, CA 90001",
        portal_link="https://fincenclear.com/p/ghi789",
        company_name=None,
        company_logo_url=None,
    )
    
    check_html_valid(html, checks)
    check_logo_mode(html, "company_text", checks)  # Falls back to "Your Escrow Company"
    check_contains(html, "Your Escrow Company", "default company fallback", checks)
    check_contains(html, "John Smith", "party name", checks)
    
    return _make_result(checks, "Default fallback")


# ── Submission Confirmation ──────────────────────────────────────────────────

def test_confirmation(verbose: bool) -> dict:
    checks = []
    html = get_confirmation_html(
        party_name="Michael Chen",
        confirmation_id="CONF-20260210-ABC1",
        property_address="456 Oak Avenue, Pasadena, CA 91101",
    )
    text = get_confirmation_text(
        party_name="Michael Chen",
        confirmation_id="CONF-20260210-ABC1",
        property_address="456 Oak Avenue, Pasadena, CA 91101",
    )
    
    check_html_valid(html, checks)
    check_logo_mode(html, "finclear", checks)  # Default logo (no logo_mode passed)
    check_contains(html, "Michael Chen", "party name", checks)
    check_contains(html, "CONF-20260210-ABC1", "confirmation ID", checks)
    check_contains(html, "456 Oak Avenue", "property address", checks)
    check_contains(html, "Information Received", "header text", checks)
    check_accent_color(html, "green", checks)
    check_text_version(text, ["CONF-20260210-ABC1", "456 Oak Avenue"], checks)
    
    return _make_result(checks, f"HTML={len(html)} chars")


# ── Party Nudge (company logo) ───────────────────────────────────────────────

def test_nudge_logo(verbose: bool) -> dict:
    checks = []
    html = get_party_nudge_html(
        party_name="Jane Doe",
        party_role="transferee",
        property_address="200 Beach Blvd, Huntington Beach, CA 92648",
        portal_url="https://fincenclear.com/p/nudge123",
        company_logo_url="https://r2.example.com/logos/xyz-logo.png",
        company_name="XYZ Title",
    )
    
    check_html_valid(html, checks)
    check_logo_mode(html, "company_logo", checks)
    check_contains(html, "Jane Doe", "party name", checks)
    check_contains(html, "Friendly Reminder", "header text", checks)
    check_contains(html, "Complete Your Submission", "CTA label", checks)
    check_contains(html, "200 Beach Blvd", "property address", checks)
    check_accent_color(html, "amber", checks)  # Nudge uses amber header
    
    return _make_result(checks, "Nudge + company logo")


# ── Party Nudge (text fallback) ──────────────────────────────────────────────

def test_nudge_text_fallback(verbose: bool) -> dict:
    checks = []
    html = get_party_nudge_html(
        party_name="Bob Builder",
        party_role="transferor",
        property_address="55 Oak St, Portland, OR 97201",
        portal_url="https://fincenclear.com/p/nudge456",
        company_logo_url=None,
        company_name="Oregon Escrow Inc.",
    )
    text = get_party_nudge_text(
        party_name="Bob Builder",
        party_role="transferor",
        property_address="55 Oak St, Portland, OR 97201",
        portal_url="https://fincenclear.com/p/nudge456",
    )
    
    check_html_valid(html, checks)
    check_logo_mode(html, "company_text", checks)
    check_contains(html, "Oregon Escrow Inc.", "company name text", checks)
    check_contains(html, "Bob Builder", "party name", checks)
    check_text_version(text, ["Bob Builder", "55 Oak St", "https://fincenclear.com/p/nudge456"], checks)
    
    return _make_result(checks, "Nudge text fallback")


# ── Party Submitted (officer) ────────────────────────────────────────────────

def test_party_submitted(verbose: bool) -> dict:
    """Build the same HTML that send_party_submitted_notification would."""
    from app.services.email_service import _build_email_wrapper, _text, _info_card, FRONTEND_URL
    
    checks = []
    party_name = "Michael Chen"
    party_role = "transferee"
    property_address = "456 Oak Avenue, Pasadena, CA 91101"
    report_id = "rpt-abc-123"
    
    role_display = "Buyer"
    body = (
        _text(f"<strong>{party_name}</strong> ({role_display}) has submitted their information for:")
        + _info_card("Property Address", property_address, "#2563eb")
    )
    report_url = f"{FRONTEND_URL}/app/staff/requests/{report_id}"
    
    html = _build_email_wrapper(
        body_content=body,
        header_text="Party Submission Received",
        header_subtext=f"{party_name} -- {role_display}",
        action_url=report_url,
        action_text="View Report",
        header_accent="blue",
        logo_mode="finclear",
    )
    
    check_html_valid(html, checks)
    check_logo_mode(html, "finclear", checks)
    check_contains(html, "Michael Chen", "party name", checks)
    check_contains(html, "Buyer", "role display", checks)
    check_contains(html, "456 Oak Avenue", "property address", checks)
    check_contains(html, "View Report", "CTA label", checks)
    check_accent_color(html, "blue", checks)
    
    return _make_result(checks, "Officer notification")


# ── All Parties Complete ─────────────────────────────────────────────────────

def test_all_complete(verbose: bool) -> dict:
    from app.services.email_service import _build_email_wrapper, _text, _info_card, FRONTEND_URL
    
    checks = []
    property_address = "456 Oak Avenue, Pasadena, CA 91101"
    
    body = (
        _text(f"<strong>Lisa Park</strong> (Seller) has submitted their information for:")
        + _info_card("Property Address", property_address, "#059669")
        + _text('<strong style="color:#059669;">All parties have now submitted. This report is ready for review and filing.</strong>')
    )
    
    html = _build_email_wrapper(
        body_content=body,
        header_text="All Parties Complete",
        header_subtext=property_address,
        action_url=f"{FRONTEND_URL}/app/staff/requests/rpt-123",
        action_text="View Report",
        header_accent="green",
        logo_mode="finclear",
    )
    
    check_html_valid(html, checks)
    check_logo_mode(html, "finclear", checks)
    check_contains(html, "All Parties Complete", "header text", checks)
    check_contains(html, "ready for review", "ready message", checks)
    check_accent_color(html, "green", checks)
    
    return _make_result(checks, "All complete notification")


# ── Links Sent ───────────────────────────────────────────────────────────────

def test_links_sent(verbose: bool) -> dict:
    checks = []
    parties = [
        {"name": "Michael Chen", "role": "transferee", "email": "michael@example.com"},
        {"name": "Sarah Williams", "role": "transferor", "email": "sarah@example.com"},
        {"name": "No Email Party", "role": "transferor", "email": None},
    ]
    
    html = get_links_sent_confirmation_html(
        recipient_name="Officer Jane",
        property_address="456 Oak Avenue, Pasadena, CA 91101",
        parties=parties,
        report_url="https://fincenclear.com/app/staff/requests/rpt-123",
    )
    text = get_links_sent_confirmation_text(
        recipient_name="Officer Jane",
        property_address="456 Oak Avenue, Pasadena, CA 91101",
        parties=parties,
        report_url="https://fincenclear.com/app/staff/requests/rpt-123",
    )
    
    check_html_valid(html, checks)
    check_logo_mode(html, "finclear", checks)
    check_contains(html, "Michael Chen", "party 1 name", checks)
    check_contains(html, "Sarah Williams", "party 2 name", checks)
    check_contains(html, "No Email Party", "party 3 name", checks)
    check_contains(html, "Buyer", "role Buyer", checks)
    check_contains(html, "Seller", "role Seller", checks)
    check_contains(html, "michael@example.com", "party 1 email", checks)
    check_contains(html, "No email", "no-email badge", checks)
    check_contains(html, "Party Links Sent", "header text", checks)
    check_contains(html, "View Status", "CTA label", checks)
    check_text_version(text, ["Michael Chen", "Sarah Williams", "No Email Party"], checks)
    
    return _make_result(checks, f"3 parties listed")


# ── Exempt Notification ──────────────────────────────────────────────────────

def test_exempt(verbose: bool) -> dict:
    checks = []
    html = get_exempt_notification_html(
        recipient_name="Officer Jane",
        property_address="456 Oak Avenue, Pasadena, CA 91101",
        determination_date="February 10, 2026",
        exemption_reasons=["Individual buyer - natural person", "No reporting required"],
        certificate_id="EX-2026-00042",
        report_url="https://fincenclear.com/app/staff/requests/rpt-123",
    )
    text = get_exempt_notification_text(
        recipient_name="Officer Jane",
        property_address="456 Oak Avenue, Pasadena, CA 91101",
        determination_date="February 10, 2026",
        exemption_reasons=["Individual buyer - natural person", "No reporting required"],
        certificate_id="EX-2026-00042",
        report_url="https://fincenclear.com/app/staff/requests/rpt-123",
    )
    
    check_html_valid(html, checks)
    check_logo_mode(html, "finclear", checks)
    check_contains(html, "Transaction Exempt", "header text", checks)
    check_contains(html, "EXEMPT", "EXEMPT keyword", checks)
    check_contains(html, "EX-2026-00042", "certificate ID", checks)
    check_contains(html, "February 10, 2026", "determination date", checks)
    check_contains(html, "Individual buyer", "exemption reason", checks)
    check_contains(html, "Download Exemption Certificate", "CTA label", checks)
    check_accent_color(html, "green", checks)
    check_text_version(text, ["EX-2026-00042", "Individual buyer", "February 10, 2026"], checks)
    
    return _make_result(checks, "Exempt cert email")


# ── Invoice ──────────────────────────────────────────────────────────────────

def test_invoice(verbose: bool) -> dict:
    checks = []
    html = get_invoice_email_html(
        company_name="Pacific Coast Title Company",
        invoice_number="INV-2026-0042",
        total_dollars=2500.00,
        due_date="March 15, 2026",
        period_start="Jan 1, 2026",
        period_end="Jan 31, 2026",
        view_link="https://fincenclear.com/app/billing/INV-2026-0042",
    )
    text = get_invoice_email_text(
        company_name="Pacific Coast Title Company",
        invoice_number="INV-2026-0042",
        total_dollars=2500.00,
        due_date="March 15, 2026",
        period_start="Jan 1, 2026",
        period_end="Jan 31, 2026",
        view_link="https://fincenclear.com/app/billing/INV-2026-0042",
    )
    
    check_html_valid(html, checks)
    check_logo_mode(html, "finclear", checks)
    check_contains(html, "INV-2026-0042", "invoice number", checks)
    check_contains(html, "$2,500.00", "total amount", checks)
    check_contains(html, "March 15, 2026", "due date", checks)
    check_contains(html, "Jan 1, 2026", "period start", checks)
    check_contains(html, "Jan 31, 2026", "period end", checks)
    check_contains(html, "Pacific Coast Title", "company name", checks)
    check_contains(html, "View Invoice", "CTA label", checks)
    check_contains(html, "ACH Transfer", "payment option", checks)
    check_contains(html, BRAND_SUPPORT_EMAIL, "support email", checks)
    check_text_version(text, ["INV-2026-0042", "$2,500.00", "March 15, 2026"], checks)
    
    return _make_result(checks, f"Invoice HTML={len(html)} chars")


# ── Filing Submitted ─────────────────────────────────────────────────────────

def test_filing_submitted(verbose: bool) -> dict:
    checks = []
    body = (
        _text("Hi Officer Jane,")
        + _text("Your FinCEN Real Estate Report has been submitted for processing.")
    )
    
    html = _build_email_wrapper(
        body_content=body,
        header_text="Filing Submitted",
        header_subtext="456 Oak Avenue, Pasadena, CA",
        action_url="https://fincenclear.com/app/staff/requests/rpt-123",
        action_text="View Filing Status",
        header_accent="blue",
        logo_mode="finclear",
    )
    
    check_html_valid(html, checks)
    check_logo_mode(html, "finclear", checks)
    check_contains(html, "Filing Submitted", "header text", checks)
    check_contains(html, "View Filing Status", "CTA label", checks)
    check_accent_color(html, "blue", checks)
    
    return _make_result(checks, "Filing submitted")


# ── Filing Accepted ──────────────────────────────────────────────────────────

def test_filing_accepted(verbose: bool) -> dict:
    from app.services.email_service import _detail_row, _detail_block
    
    checks = []
    bsa_id = "31000000123456"
    
    details = (
        _detail_row("Property", "456 Oak Avenue, Pasadena, CA 91101")
        + f'<p style="margin:0 0 8px; color:#065f46;"><strong>BSA ID:</strong> <code>{bsa_id}</code></p>'
        + _detail_row("Filed", "February 10, 2026")
    )
    body = (
        _text("Hi Officer Jane,")
        + _text("Great news! Your FinCEN Real Estate Report has been <strong>accepted</strong>.")
        + _detail_block(details, "#059669")
    )
    
    html = _build_email_wrapper(
        body_content=body,
        header_text="Filing Complete",
        header_subtext=f"BSA ID: {bsa_id}",
        action_url="https://fincenclear.com/app/staff/requests/rpt-123",
        action_text="View Filing Details",
        header_accent="green",
        button_color="#059669",
        logo_mode="finclear",
    )
    
    check_html_valid(html, checks)
    check_logo_mode(html, "finclear", checks)
    check_contains(html, "Filing Complete", "header text", checks)
    check_contains(html, bsa_id, "BSA ID in body", checks)
    check_contains(html, "accepted", "accepted text", checks)
    check_contains(html, "View Filing Details", "CTA label", checks)
    check_accent_color(html, "green", checks)
    
    return _make_result(checks, f"BSA ID={bsa_id}")


# ── Filing Rejected ──────────────────────────────────────────────────────────

def test_filing_rejected(verbose: bool) -> dict:
    from app.services.email_service import _detail_row, _detail_block
    
    checks = []
    
    details = (
        _detail_row("Property", "456 Oak Avenue", "#991b1b")
        + f'<p style="margin:0 0 8px; color:#991b1b;"><strong>Error Code:</strong> <code>ERR-4012</code></p>'
        + f'<p style="margin:0; color:#991b1b;"><strong>Reason:</strong> Missing beneficial owner SSN</p>'
    )
    body = (
        _text("Hi Officer Jane,")
        + _text("Your FinCEN Real Estate Report was <strong>rejected</strong> and requires attention.")
        + _detail_block(details, "#dc2626")
    )
    
    html = _build_email_wrapper(
        body_content=body,
        header_text="Filing Rejected",
        header_subtext="456 Oak Avenue",
        action_url="https://fincenclear.com/app/staff/requests/rpt-123",
        action_text="Fix and Resubmit",
        header_accent="red",
        button_color="#dc2626",
        logo_mode="finclear",
    )
    
    check_html_valid(html, checks)
    check_logo_mode(html, "finclear", checks)
    check_contains(html, "Filing Rejected", "header text", checks)
    check_contains(html, "ERR-4012", "error code", checks)
    check_contains(html, "Missing beneficial owner SSN", "rejection reason", checks)
    check_contains(html, "rejected", "rejected keyword", checks)
    check_contains(html, "Fix and Resubmit", "CTA label", checks)
    check_accent_color(html, "red", checks)
    
    return _make_result(checks, "Rejected + error code")


# ── Filing Needs Review ──────────────────────────────────────────────────────

def test_filing_needs_review(verbose: bool) -> dict:
    from app.services.email_service import _detail_row, _detail_block
    
    checks = []
    
    details = (
        _detail_row("Property", "789 Sunset Blvd", "#92400e")
        + f'<p style="margin:0; color:#92400e;"><strong>Reason:</strong> Multiple payment sources require manual verification</p>'
    )
    body = (
        _text("Hi Officer Jane,")
        + _text("Your FinCEN Real Estate Report requires review before it can be filed.")
        + _detail_block(details, "#d97706")
    )
    
    html = _build_email_wrapper(
        body_content=body,
        header_text="Review Required",
        header_subtext="789 Sunset Blvd",
        action_url="https://fincenclear.com/app/staff/requests/rpt-456",
        action_text="Review Report",
        header_accent="amber",
        button_color="#d97706",
        logo_mode="finclear",
    )
    
    check_html_valid(html, checks)
    check_logo_mode(html, "finclear", checks)
    check_contains(html, "Review Required", "header text", checks)
    check_contains(html, "manual verification", "review reason", checks)
    check_contains(html, "Review Report", "CTA label", checks)
    check_accent_color(html, "amber", checks)
    
    return _make_result(checks, "Amber accent review")


# ══════════════════════════════════════════════════════════════════════════════
# TEST REGISTRY
# ══════════════════════════════════════════════════════════════════════════════

TEST_REGISTRY = {
    "party_invite_logo": test_party_invite_logo,
    "party_invite_text_fallback": test_party_invite_text_fallback,
    "party_invite_no_company": test_party_invite_no_company,
    "confirmation": test_confirmation,
    "nudge_logo": test_nudge_logo,
    "nudge_text_fallback": test_nudge_text_fallback,
    "party_submitted": test_party_submitted,
    "all_complete": test_all_complete,
    "links_sent": test_links_sent,
    "exempt": test_exempt,
    "invoice": test_invoice,
    "filing_submitted": test_filing_submitted,
    "filing_accepted": test_filing_accepted,
    "filing_rejected": test_filing_rejected,
    "filing_needs_review": test_filing_needs_review,
}


# ══════════════════════════════════════════════════════════════════════════════
# TABLE OUTPUT
# ══════════════════════════════════════════════════════════════════════════════

def ok(val: bool) -> str:
    return " OK " if val else "FAIL"


def print_results(results: List[dict]) -> None:
    now = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
    total = len(results)
    passed = sum(1 for r in results if r["result"]["passed"])
    
    print()
    print("=" * 90)
    print(f"  NOTIFICATION TEMPLATES STRESS TEST RESULTS")
    print(f"  Date: {now}")
    print(f"  Templates tested: {total}")
    print("=" * 90)
    print()
    
    hdr = (
        f"  {'#':>3}  "
        f"{'Grp':^7}  "
        f"{'Template':<34}  "
        f"{'HTML':^6}  "
        f"{'Checks':^8}  "
        f"{'Details':<26}"
    )
    sep = "  " + "-" * 86
    
    print(hdr)
    print(sep)
    
    for r in results:
        res = r["result"]
        checks_str = f"{res['checks_ok']}/{res['checks_total']}"
        
        row = (
            f"  {r['num']:>3}  "
            f"{r['group']:^7}  "
            f"{r['name']:<34}  "
            f"{ok(res['passed']):^6}  "
            f"{checks_str:^8}  "
            f"{res['details']:<26}"
        )
        print(row)
    
    print(sep)
    print()
    print(f"  PASSED: {passed}/{total}")
    
    failed = [r for r in results if not r["result"]["passed"]]
    if failed:
        print(f"  FAILED: {len(failed)}")
        for r in failed:
            print(f"\n  FAIL #{r['num']} ({r['name']}):")
            for c in r["result"]["checks"]:
                if c.startswith("FAIL:"):
                    print(f"    {c}")
    
    print()
    print("=" * 90)


# ══════════════════════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(description="Notification Templates Stress Test")
    parser.add_argument("--verbose", "-v", action="store_true", help="Show detailed checks")
    parser.add_argument("--scenario", "-s", type=int, help="Run only scenario N")
    args = parser.parse_args()
    
    print()
    print("  NOTIFICATION TEMPLATES STRESS TEST")
    print("  Validates every email template: HTML structure, content, logo mode, accents")
    print("  No actual emails sent -- template generation only")
    print()
    
    scenarios = get_scenarios()
    
    if args.scenario:
        if 1 <= args.scenario <= len(scenarios):
            scenarios = [scenarios[args.scenario - 1]]
        else:
            print(f"  Invalid scenario: {args.scenario} (valid: 1-{len(scenarios)})")
            return 1
    
    results = []
    for i, s in enumerate(scenarios):
        actual_idx = (args.scenario - 1) if args.scenario else i
        
        if args.verbose:
            print(f"\n  [{actual_idx + 1}] {s['name']} (Group: {s['group']})")
        else:
            print(f"  Running {actual_idx + 1:>2}: {s['name']:<36}", end="", flush=True)
        
        test_result = run_test(s, verbose=args.verbose)
        
        entry = {
            "num": actual_idx + 1,
            "name": s["name"],
            "group": s["group"],
            "result": test_result,
        }
        results.append(entry)
        
        if args.verbose:
            for c in test_result["checks"]:
                status = "  OK " if c.startswith("OK:") else " FAIL"
                print(f"    [{status}] {c}")
        else:
            print(f"  {'OK' if test_result['passed'] else 'FAIL'}")
    
    print_results(results)
    
    all_pass = all(r["result"]["passed"] for r in results)
    return 0 if all_pass else 1


if __name__ == "__main__":
    sys.exit(main())
