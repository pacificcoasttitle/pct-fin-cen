#!/usr/bin/env python3
"""
Send Test Emails -- All 8 Notification Templates
=================================================
Sends one sample of each email template to a test address
so the team can visually inspect every template in their inbox.

Run:
    python -m app.scripts.send_test_emails

Requires:
    SENDGRID_API_KEY  (must be set)
    SENDGRID_ENABLED  = true

To test with company logo:
    Set COMPANY_LOGO_TEST_URL env var to a public image URL.
    If not set, emails will show the FinClear text fallback.
"""

import sys
import os
import time
from datetime import datetime, timedelta

# Auto-load .env (works locally)
try:
    from dotenv import load_dotenv
    env_path = os.path.join(os.path.dirname(__file__), "..", "..", "..", ".env")
    load_dotenv(env_path)
except ImportError:
    pass

# Ensure project root is on path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from app.services.email_service import (
    send_email,
    # Template generators
    get_exempt_notification_html,
    get_party_invite_html,
    get_links_sent_confirmation_html,
    get_party_nudge_html,
    get_invoice_email_html,
    # Complete send functions (generate + send)
    send_party_submitted_notification,
    send_filing_submitted_notification,
    send_filing_accepted_notification,
    send_invoice_email,
    # Config values
    SENDGRID_ENABLED,
    SENDGRID_API_KEY,
    SENDGRID_FROM_EMAIL,
    FRONTEND_URL,
)

# ===================================================================
# Configuration
# ===================================================================

TEST_EMAIL = "gerardoh@gmail.com"
DELAY_SECONDS = 2  # Pause between sends to avoid rate limits

# Optional: set COMPANY_LOGO_TEST_URL env var to test with a real logo
COMPANY_LOGO_URL = os.getenv("COMPANY_LOGO_TEST_URL", None)

PROPERTY_ADDRESS = "742 Evergreen Terrace, Springfield, IL 62704"
COMPANY_NAME = "Pacific Coast Title Company"
MOCK_REPORT_ID = "test-report-001"
MOCK_REPORT_URL = f"{FRONTEND_URL}/app/reports/{MOCK_REPORT_ID}"

TODAY = datetime.utcnow().strftime("%B %d, %Y")


# ===================================================================
# Helpers
# ===================================================================

results = []


def record(name, result):
    """Record and print a send result."""
    results.append((name, result))
    status = "OK" if result.success else "FAIL"
    detail = result.message_id or result.error or "no detail"
    print(f"  {status} {name}: {detail}")


# ===================================================================
# Email 1: Exempt Complete
# ===================================================================

def send_email_1():
    print("1/8  Exempt Complete (officer-facing -> FinClear logo) ...")
    html = get_exempt_notification_html(
        recipient_name="Jennifer Walsh",
        property_address=PROPERTY_ADDRESS,
        determination_date=TODAY,
        exemption_reasons=[
            "Transfer between spouses",
            "Consideration below $300,000",
        ],
        certificate_id="CERT-2026-00042",
        report_url=f"{MOCK_REPORT_URL}/certificate",
        # Officer-facing: no company_logo_url — uses FinClear branding
    )
    result = send_email(
        to_email=TEST_EMAIL,
        subject=f"Exempt Determination -- {PROPERTY_ADDRESS}",
        html_content=html,
        text_content="This transaction has been determined EXEMPT from FinCEN reporting.",
    )
    record("Exempt Complete", result)


# ===================================================================
# Email 2: Party Invite (buyer/seller)
# ===================================================================

def send_email_2():
    print("2/8  Party Invite (party-facing -> company branding) ...")
    html = get_party_invite_html(
        party_name="John Smith",
        party_role="transferee",
        property_address=PROPERTY_ADDRESS,
        portal_link=f"{FRONTEND_URL}/p/test-token-abc123",
        company_name=COMPANY_NAME,
        company_logo_url=COMPANY_LOGO_URL,  # None = shows company name text fallback
    )
    result = send_email(
        to_email=TEST_EMAIL,
        subject=f"Action Required: Submit Your Information -- {PROPERTY_ADDRESS}",
        html_content=html,
        text_content="You are required to submit your information for a real estate transaction.",
    )
    record("Party Invite", result)


# ===================================================================
# Email 3: Links Sent Confirmation (to escrow officer)
# ===================================================================

def send_email_3():
    print("3/8  Links Sent Confirmation (officer-facing -> FinClear logo) ...")
    html = get_links_sent_confirmation_html(
        recipient_name="Jennifer Walsh",
        property_address=PROPERTY_ADDRESS,
        parties=[
            {"name": "John Smith", "role": "transferee", "email": "john@example.com"},
            {"name": "Jane Doe", "role": "transferor", "email": "jane@example.com"},
        ],
        report_url=f"{MOCK_REPORT_URL}/wizard?step=party-status",
        # Officer-facing: no company_logo_url — uses FinClear branding
    )
    result = send_email(
        to_email=TEST_EMAIL,
        subject=f"Party Links Sent -- {PROPERTY_ADDRESS}",
        html_content=html,
        text_content="Portal invitation links have been sent to 2 parties.",
    )
    record("Links Sent Confirmation", result)


# ===================================================================
# Email 4: Party Submitted (notify escrow officer)
# ===================================================================

def send_email_4():
    print("4/8  Party Submitted (officer-facing -> FinClear logo) ...")
    result = send_party_submitted_notification(
        staff_email=TEST_EMAIL,
        party_name="John Smith",
        party_role="transferee",
        property_address=PROPERTY_ADDRESS,
        report_id=MOCK_REPORT_ID,
        all_complete=False,
        # Officer-facing: no company_logo_url — uses FinClear branding
    )
    record("Party Submitted", result)


# ===================================================================
# Email 5: Party Nudge (7-day reminder)
# ===================================================================

def send_email_5():
    print("5/8  Party Nudge (party-facing -> company branding) ...")
    html = get_party_nudge_html(
        party_name="Jane Doe",
        party_role="transferor",
        property_address=PROPERTY_ADDRESS,
        portal_url=f"{FRONTEND_URL}/p/test-token-xyz789",
        company_logo_url=COMPANY_LOGO_URL,  # None = shows company name text fallback
        company_name=COMPANY_NAME,
    )
    result = send_email(
        to_email=TEST_EMAIL,
        subject=f"Reminder: Your Information is Needed -- {PROPERTY_ADDRESS}",
        html_content=html,
        text_content="This is a friendly reminder that your information is still needed.",
    )
    record("Party Nudge", result)


# ===================================================================
# Email 6: Filing Submitted
# ===================================================================

def send_email_6():
    print("6/8  Filing Submitted (officer-facing -> FinClear logo) ...")
    result = send_filing_submitted_notification(
        to_email=TEST_EMAIL,
        recipient_name="Jennifer Walsh",
        property_address=PROPERTY_ADDRESS,
        report_url=MOCK_REPORT_URL,
        # Officer-facing: no company_logo_url — uses FinClear branding
    )
    record("Filing Submitted", result)


# ===================================================================
# Email 7: Filing Accepted (BSA ID Receipt)
# ===================================================================

def send_email_7():
    print("7/8  Filing Accepted (officer-facing -> FinClear logo) ...")
    result = send_filing_accepted_notification(
        to_email=TEST_EMAIL,
        recipient_name="Jennifer Walsh",
        property_address=PROPERTY_ADDRESS,
        bsa_id="31000123456789",
        filed_at_str=TODAY,
        report_url=MOCK_REPORT_URL,
        # Officer-facing: no company_logo_url — uses FinClear branding
    )
    record("Filing Accepted", result)


# ===================================================================
# Email 8: Invoice
# ===================================================================

def send_email_8():
    print("8/8  Invoice (officer-facing -> FinClear logo) ...")
    due = (datetime.utcnow() + timedelta(days=30)).strftime("%B %d, %Y")
    result = send_invoice_email(
        to_email=TEST_EMAIL,
        company_name=COMPANY_NAME,
        invoice_number="INV-2026-001",
        total_dollars=75.00,
        due_date=due,
        period_start="January 1, 2026",
        period_end="January 31, 2026",
        view_link=f"{FRONTEND_URL}/app/billing/invoices/INV-2026-001",
        # Officer-facing: no company_logo_url — uses FinClear branding
    )
    record("Invoice", result)


# ===================================================================
# Main
# ===================================================================

def main():
    print()
    print("=" * 60)
    print("TEST ALL EMAIL TEMPLATES")
    print("=" * 60)
    print(f"  To:            {TEST_EMAIL}")
    print(f"  SendGrid:      {'ENABLED' if SENDGRID_ENABLED else 'DISABLED (dry-run)'}")
    print(f"  From:          {SENDGRID_FROM_EMAIL}")
    print(f"  API Key:       {'***' + SENDGRID_API_KEY[-4:] if SENDGRID_API_KEY else 'NOT SET'}")
    print(f"  Frontend URL:  {FRONTEND_URL}")
    print(f"  Company Logo:  {COMPANY_LOGO_URL or '(none -- company-name text fallback for party emails)'}")
    print(f"  Time:          {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}")
    print("=" * 60)
    print()

    if not SENDGRID_ENABLED:
        print("WARNING: SENDGRID_ENABLED is false -- emails will be logged but NOT sent.")
        print("   Set SENDGRID_ENABLED=true to actually send.")
        print()

    if not SENDGRID_API_KEY:
        print("ERROR: SENDGRID_API_KEY is not set. Cannot send emails.")
        print("   Set the env var and re-run.")
        sys.exit(1)

    senders = [
        send_email_1,
        send_email_2,
        send_email_3,
        send_email_4,
        send_email_5,
        send_email_6,
        send_email_7,
        send_email_8,
    ]

    for i, fn in enumerate(senders):
        fn()
        if i < len(senders) - 1:
            time.sleep(DELAY_SECONDS)

    # -- Summary --
    print()
    print("=" * 60)
    print("RESULTS SUMMARY")
    print("=" * 60)

    passed = sum(1 for _, r in results if r.success)
    failed = sum(1 for _, r in results if not r.success)

    for name, r in results:
        icon = "OK" if r.success else "FAIL"
        detail = r.message_id or r.error or ""
        print(f"  {icon}  {name:<30s} {detail}")

    print()
    print(f"  Passed: {passed}/{len(results)}")
    if failed:
        print(f"  FAILED: {failed}/{len(results)}")
    print()

    if failed:
        print("FAILED: Some emails failed. Check output above.")
        print()
        sys.exit(1)
    else:
        print(f"SUCCESS: All {len(results)} emails sent to {TEST_EMAIL}!")
        print("   Check your inbox (and spam folder) for the test messages.")
        print()
        sys.exit(0)


if __name__ == "__main__":
    main()
