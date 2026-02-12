Email Template Standardization — Consistent Branding + Logo Hero

ALL email templates must use ONE consistent design system.
Currently templates have different colors, layouts, and logo handling.

====================================================================
STEP 1: DIAGNOSE CURRENT STATE
====================================================================

# Show ALL template functions and their HTML structure
grep -n "def get_.*_html\|background.*#\|color.*#\|bgcolor\|<img.*logo\|company_logo" api/app/services/email_service.py | head -50

# Show the full party_invite template (best current template) as reference
grep -n -A 3 "def get_party_invite_html" api/app/services/email_service.py | head -5

# Count how many distinct color values are used
grep -oP '#[0-9a-fA-F]{6}' api/app/services/email_service.py | sort | uniq -c | sort -rn | head -20

====================================================================
STEP 2: DEFINE THE STANDARD DESIGN SYSTEM
====================================================================

Create a shared template builder function at the TOP of email_service.py:

def _build_email_wrapper(
    body_content: str,
    company_logo_url: str = None,
    header_text: str = "",
    header_subtext: str = "",
    action_url: str = None,
    action_text: str = None,
    footer_note: str = None
) -> str:

This function returns the FULL HTML email with consistent structure:

LAYOUT (top to bottom):
  ┌─────────────────────────────────────┐
  │         [Company Logo]              │  ← Centered, max-height 60px
  │      or [FinClear Logo/Text]        │     If no company logo, show "FinClear" text
  │                                     │
  │  ─────────────────────────────────  │  ← Thin divider line
  │                                     │
  │         HEADER TEXT                 │  ← Bold, 24px, centered
  │         header subtext              │  ← Muted, 14px, centered
  │                                     │
  │  ┌─────────────────────────────┐    │
  │  │                             │    │
  │  │     body_content            │    │  ← Left-aligned body content
  │  │     (passed in by each      │    │
  │  │      template function)     │    │
  │  │                             │    │
  │  │   [ Action Button ]         │    │  ← Optional centered button
  │  │                             │    │
  │  └─────────────────────────────┘    │
  │                                     │
  │  footer note                        │  ← Small muted text
  │  "This is an automated message      │
  │   from FinClear"                    │
  └─────────────────────────────────────┘

COLOR PALETTE (use ONLY these):
  - Background: #f8fafc (light gray page background)
  - Card background: #ffffff
  - Header text: #0f172a (slate-900)
  - Body text: #334155 (slate-700)
  - Muted text: #64748b (slate-500)
  - Primary button: #2563eb (blue-600)
  - Primary button hover: #1d4ed8 (blue-700)
  - Success accent: #059669 (emerald-600) — for accepted/complete states
  - Warning accent: #d97706 (amber-600) — for reminders/nudges
  - Error accent: #dc2626 (red-600) — for rejections
  - Divider: #e2e8f0 (slate-200)
  - Logo area background: #ffffff (clean white, no colored bar)

LOGO RULES:
  - Company logo is ALWAYS centered above the header text
  - If company_logo_url provided: <img src="{url}" alt="Company Logo" style="max-height:60px; margin: 24px auto 16px; display:block;">
  - If NO company_logo_url: Show "FinClear" in bold 20px text with a small shield icon (use text, not image)
  - Below logo: thin 1px divider (#e2e8f0)
  - Below divider: header text

BUTTON STYLE:
  - background-color: #2563eb
  - color: #ffffff
  - padding: 12px 32px
  - border-radius: 8px
  - font-weight: 600
  - text-decoration: none
  - display: inline-block
  - Centered in container

====================================================================
STEP 3: REFACTOR ALL TEMPLATES TO USE _build_email_wrapper
====================================================================

Each template function should ONLY generate its unique body_content HTML,
then pass it to _build_email_wrapper(). This ensures 100% consistency.

Refactor these templates:

1. get_exempt_notification_html()
   - header_text: "Transaction Exempt"
   - header_subtext: property_address
   - body: exemption reasons list, determination date, report reference
   - action_url: Direct PDF download link (see STEP 4)
   - action_text: "Download Exemption Certificate"
   - Accent: success green for the status indicator

2. get_party_invite_html()
   - header_text: "Action Required"
   - header_subtext: "Submit Your Transaction Information"
   - body: greeting, property address, what's needed, who requested
   - action_url: portal_url
   - action_text: "Open Secure Portal"

3. get_links_sent_confirmation_html()
   - header_text: "Party Links Sent"
   - header_subtext: property_address
   - body: table of parties (name, role, email), next steps message
   - action_url: report wizard party-status URL
   - action_text: "View Status"

4. get_party_submitted_html() (or however it's named)
   - header_text: "Party Submission Received"
   - header_subtext: party_name + " — " + party_role
   - body: what was submitted, remaining parties count, property address
   - action_url: report URL
   - action_text: "View Report"

5. get_party_nudge_html()
   - header_text: "Friendly Reminder"
   - header_subtext: "Your Information is Still Needed"
   - body: property address, how long it's been, what's needed
   - action_url: portal_url
   - action_text: "Complete Your Submission"
   - Accent: warning amber for the reminder indicator

6. get_filing_submitted_html() (or however named)
   - header_text: "Filing Submitted"
   - header_subtext: property_address
   - body: filed date, status, what happens next
   - action_url: report URL
   - action_text: "View Filing Status"

7. get_filing_accepted_html() (or however named)
   - header_text: "Filing Complete"
   - header_subtext: "BSA ID: " + bsa_id
   - body: BSA ID prominently displayed, filed date, save instructions
   - action_url: report URL
   - action_text: "View Filing Details"
   - Accent: success green

8. Invoice email template (if exists)
   - header_text: "Invoice"
   - header_subtext: invoice_number
   - body: amount, due date, line items summary
   - action_url: invoice view URL
   - action_text: "View Invoice"

====================================================================
STEP 4: EXEMPT CERTIFICATE — DIRECT DOWNLOAD LINK
====================================================================

Instead of linking to the app (requiring login), include a time-limited
direct download link for the exemption certificate PDF.

Diagnose the certificate PDF endpoint:
  grep -n "certificate.*pdf\|pdf.*certificate" api/app/routes/reports.py | head -10

Option A (preferred): Generate a pre-signed URL or token-based download link
  - Create endpoint: GET /reports/{report_id}/certificate/pdf?token={hmac_token}
  - Token = HMAC-SHA256(report_id + expiry_timestamp, secret_key)
  - Token valid for 7 days
  - No auth required if token is valid

Option B (simpler): Use existing endpoint with a one-time download token
  - Generate a UUID token, store in DB with report_id and expiry
  - GET /reports/certificate/download/{token} — validates token, returns PDF

Implement whichever is simpler. The email should have a button that
directly downloads the PDF without requiring login.

====================================================================
STEP 5: UPDATE TEST EMAIL SCRIPT
====================================================================

Update api/app/scripts/send_test_emails.py to:
1. Use the refactored templates
2. Pass company_logo_url=None for all tests (tests FinClear fallback branding)
3. Add a note: "To test with company logo, set COMPANY_LOGO_TEST_URL env var"

====================================================================
STEP 6: USE REAL EXEMPT DATA FOR TEST
====================================================================

Instead of dummy 742 Evergreen Terrace data, pull a real exempt report:

  # Find an exempt report in the database
  # In the test script, try to load real data first:
  
  from app.database import get_db
  from app.models.report import Report
  
  db = next(get_db())
  exempt_report = db.query(Report).filter(Report.status == "exempt").first()
  
  if exempt_report:
      # Use real property address from exempt_report.wizard_data
      property_address = exempt_report.wizard_data.get("collection", {}).get("propertyAddress", {})
      # Format: "street, city, state zip"
  else:
      # Fallback to mock data
      property_address = "742 Evergreen Terrace, Springfield, IL 62704"

====================================================================
DO NOT
====================================================================

- Do not change email sending logic (SendGrid integration stays same)
- Do not change notification outbox pattern
- Do not change when/where notifications are triggered
- Do not remove any template functions — refactor them to use the wrapper
- Do not change function signatures (add params only, keep backward compatible)
- Do not hardcode gerardoh@gmail.com anywhere except the test script
- Keep plain text versions updated alongside HTML versions
