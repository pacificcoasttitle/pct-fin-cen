Email Preview Script — Send All Templates to gerardoh@gmail.com

Create a script that sends ONE sample of each email template to gerardoh@gmail.com
using real-looking mock data so Jerry can visually inspect every template.

====================================================================
CREATE: api/app/scripts/send_test_emails.py
====================================================================

The script should:
1. Import all email send functions from email_service.py
2. Import send_email directly for raw sends
3. Use settings for SendGrid config
4. Send each email with a 2-second delay between them (avoid rate limits)
5. Print status after each send

Diagnose first to get exact function signatures:
  grep -n "^def send_\|^async def send_\|^def get_.*_html" api/app/services/email_service.py | head -30
  grep -n "SENDGRID\|FROM_EMAIL\|FROM_NAME" api/app/config.py | head -10

The script should send these 8 emails (one for each template):

EMAIL 1: Exempt Complete
  - To: gerardoh@gmail.com
  - Subject: "Exempt Determination — 742 Evergreen Terrace, Springfield IL 62704"
  - Use get_exempt_notification_html() with mock data:
    - property_address: "742 Evergreen Terrace, Springfield, IL 62704"
    - exemption_reasons: ["Transfer between spouses", "Consideration below $300,000"]
    - report_id: "test-report-001"
    - determination_date: today's date

EMAIL 2: Party Invite (to buyer/seller)
  - To: gerardoh@gmail.com
  - Subject: "Action Required: Submit Your Information — 742 Evergreen Terrace"
  - Use get_party_invite_html() with mock data:
    - party_name: "John Smith"
    - party_role: "Buyer"
    - property_address: "742 Evergreen Terrace, Springfield, IL 62704"
    - portal_url: "https://fincenclear.com/p/test-token-abc123"
    - company_name: "Pacific Coast Title Company"
    - officer_name: "Jennifer Walsh"
    - company_logo_url: None (test without logo first)

EMAIL 3: Links Sent Confirmation (to escrow officer)
  - To: gerardoh@gmail.com
  - Subject: "Party Links Sent — 742 Evergreen Terrace"
  - Use get_links_sent_confirmation_html() with mock data:
    - property_address: "742 Evergreen Terrace, Springfield, IL 62704"
    - parties: [
        {"name": "John Smith", "role": "Buyer", "email": "john@example.com"},
        {"name": "Jane Doe", "role": "Seller", "email": "jane@example.com"}
      ]
    - report_id: "test-report-001"

EMAIL 4: Party Submitted (notify escrow officer)
  - To: gerardoh@gmail.com
  - Subject: "Party Submission Complete — John Smith (Buyer)"
  - Use the party_submitted template/function with mock data:
    - party_name: "John Smith"
    - party_role: "Buyer"
    - property_address: "742 Evergreen Terrace, Springfield, IL 62704"
    - all_complete: False (1 of 2 parties done)

EMAIL 5: Party Nudge (7-day reminder to party)
  - To: gerardoh@gmail.com
  - Subject: "Reminder: Your Information is Needed — 742 Evergreen Terrace"
  - Use get_party_nudge_html() with mock data:
    - party_name: "Jane Doe"
    - party_role: "Seller"
    - property_address: "742 Evergreen Terrace, Springfield, IL 62704"
    - portal_url: "https://fincenclear.com/p/test-token-xyz789"
    - days_waiting: 7

EMAIL 6: Filing Submitted
  - To: gerardoh@gmail.com
  - Subject: "Filing Submitted to FinCEN — 742 Evergreen Terrace"
  - Use the filing_submitted template with mock data:
    - property_address: "742 Evergreen Terrace, Springfield, IL 62704"
    - filing_date: today's date
    - status: "submitted"
    - report_id: "test-report-001"

EMAIL 7: Filing Accepted (BSA ID Receipt)
  - To: gerardoh@gmail.com
  - Subject: "FinCEN Filing Accepted — BSA ID: 31000123456789"
  - Use the filing_accepted template with mock data:
    - property_address: "742 Evergreen Terrace, Springfield, IL 62704"
    - bsa_id: "31000123456789"
    - filed_date: today's date
    - report_id: "test-report-001"

EMAIL 8: Invoice
  - To: gerardoh@gmail.com
  - Subject: "Invoice #INV-2026-001 — Pacific Coast Title Company"
  - Use the invoice template with mock data (if it exists):
    - company_name: "Pacific Coast Title Company"
    - invoice_number: "INV-2026-001"
    - amount: "$75.00"
    - due_date: 30 days from today

====================================================================
SCRIPT STRUCTURE
====================================================================

```python
#!/usr/bin/env python
"""Send test emails for all notification templates."""
import sys
import os
import time
from datetime import datetime, timedelta

# Auto-load .env
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '..', '..', '.env'))

# Setup path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from app.config import settings
from app.services.email_service import send_email, get_xxx_html, ...

TEST_EMAIL = "gerardoh@gmail.com"

def main():
    print(f"Sending test emails to {TEST_EMAIL}")
    print(f"SendGrid enabled: {settings.SENDGRID_ENABLED}")
    print(f"From: {settings.SENDGRID_FROM_EMAIL}")
    print()
    
    if not settings.sendgrid_configured:
        print("ERROR: SendGrid not configured. Set SENDGRID_API_KEY and SENDGRID_ENABLED=true")
        sys.exit(1)
    
    results = []
    
    # Email 1: Exempt Complete
    print("1/8 Sending: Exempt Complete...")
    html = get_exempt_notification_html(...)
    result = send_email(to=TEST_EMAIL, subject="...", html=html, text="Test")
    results.append(("Exempt Complete", result))
    print(f"  -> {result}")
    time.sleep(2)
    
    # ... repeat for all 8 ...
    
    print("\n" + "="*60)
    print("RESULTS:")
    for name, result in results:
        status = "✅" if result.success else "❌"
        print(f"  {status} {name}: {result.message_id or result.error}")

if __name__ == "__main__":
    main()
```

====================================================================
IMPORTANT
====================================================================

- MUST use the ACTUAL template functions from email_service.py — match exact signatures
- If a function requires a db session, mock it or skip the outbox logging (just send the email directly)
- If a function requires a Report object, create a minimal mock with the needed fields
- Do NOT create a database connection — this script just sends emails
- Use send_email() directly with the HTML output from template functions
- Auto-load .env so it works locally
- Print clear output showing which emails succeeded/failed
- Run with: python -m app.scripts.send_test_emails

====================================================================
VERIFY SENDGRID IS ENABLED ON RENDER
====================================================================

After creating the script, remind Jerry to verify these env vars on Render:
  SENDGRID_API_KEY = (must be set)
  SENDGRID_ENABLED = true (MUST be "true" — defaults to "false")

The script can also be run locally if .env has SendGrid credentials.
