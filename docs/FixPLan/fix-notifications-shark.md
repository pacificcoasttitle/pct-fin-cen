Notification System — Fill All Gaps + Company Logo Branding

7 fixes. All in one push.

====================================================================
FIX 1: Exempt Complete Email to Escrow Officer
====================================================================

When _evaluate_determination() in api/app/routes/reports.py sets report status to "exempt", send an email to the escrow officer (report initiator).

Diagnose first:
  grep -n "_evaluate_determination\|status.*exempt\|exempt.*status" api/app/routes/reports.py | head -10

Add after the audit log creation for exempt result:

1. Create email template function in api/app/services/email_service.py:
   - get_exempt_notification_html(report, company_logo_url=None)
   - Subject: "Exempt Determination — [property_address]"
   - Body: Clear message that the transaction has been determined EXEMPT from FinCEN reporting
   - Include: property address, determination date, exemption reason(s), report ID
   - Include company logo if provided
   - Include link to view the exemption certificate: {FRONTEND_URL}/app/reports/{report_id}/review
   - Professional tone: "No further action is required for this transaction."

2. Create send function:
   - send_exempt_notification(db, report, initiator_email, company_logo_url=None)
   - Log to notification outbox with type="exempt_complete"
   - Send via send_email()

3. Wire the trigger in _evaluate_determination():
   - After setting status to exempt and creating audit log
   - Fetch initiator email from report or session headers
   - Generate company logo pre-signed URL (same pattern as reports.py line 896)
   - Call send_exempt_notification()

====================================================================
FIX 2: Links Sent Confirmation to Escrow Officer
====================================================================

When party links are created (reports.py line ~948), the invite goes to the parties. Add a SEPARATE confirmation email to the escrow officer.

1. Create template in email_service.py:
   - get_links_sent_confirmation_html(report, parties_list, company_logo_url=None)
   - Subject: "Party Links Sent — [property_address]"
   - Body: Confirmation that portal links have been sent
   - Include: list of parties (name, role, email), property address
   - Message: "You will be notified when each party submits their information."
   - Include link back to report: {FRONTEND_URL}/app/reports/{report_id}/wizard?step=party-status

2. Create send function:
   - send_links_sent_confirmation(db, report, initiator_email, parties, company_logo_url=None)
   - Log to outbox with type="links_sent_confirmation"
   - Send via send_email()

3. Wire in reports.py after the party invite loop:
   - After all party invites are sent
   - Send ONE confirmation to the officer with the full party list

====================================================================
FIX 3: Party Nudge Email (7 Days No Submission)
====================================================================

Create a new script or extend check_filing_deadlines.py to nudge PARTIES (not officers) who haven't submitted.

1. Create api/app/scripts/nudge_unresponsive_parties.py:
   - Query ReportParty where status != "submitted" AND created_at < now - 7 days
   - For each, check if a nudge was already sent (check notification_events for type="party_nudge" and party_id)
   - If no nudge sent yet, send reminder email TO THE PARTY (not the officer)

2. Create template in email_service.py:
   - get_party_nudge_html(party_name, party_role, report_address, portal_url, company_logo_url=None)
   - Subject: "Reminder: Your Information is Needed — [property_address]"
   - Body: Friendly reminder that their portal submission is still pending
   - Include direct portal link
   - Professional but urgent: "Your prompt response helps ensure a smooth closing process."

3. Create send function:
   - send_party_nudge(db, party, portal_url, company_logo_url=None)
   - Log to outbox with type="party_nudge"

4. Script should be runnable as: python -m app.scripts.nudge_unresponsive_parties
   - Note in output: "Add to Render cron: 0 9 * * * python -m app.scripts.nudge_unresponsive_parties"

====================================================================
FIX 4: Party Portal Logo — Remove Hardcoded None
====================================================================

File: api/app/routes/parties.py line ~214

Currently: company_logo = None

Fix: Generate pre-signed R2 URL for the company logo, same pattern used in reports.py lines 886-899.

Diagnose:
  grep -B 5 -A 10 "company_logo.*None\|logo.*None\|# Logo" api/app/routes/parties.py | head -20
  grep -B 2 -A 15 "logo_url\|pre.*sign\|generate.*url" api/app/routes/reports.py | head -30

Replace the hardcoded None with:
  - Fetch party.report.company (or however company is accessed from the party context)
  - If company.logo_url exists, generate pre-signed R2 URL with 7-day expiry
  - Pass to the response

====================================================================
FIX 5: Company Logo in ALL Email Templates
====================================================================

Currently only party_invite has logo support. Add company_logo_url parameter to:

1. send_party_submitted_notification() — add logo param, update inline template
2. send_filing_submitted_notification() — add logo param, update template
3. send_filing_accepted_notification() — add logo param, update template  
4. send_filing_rejected_notification() — add logo param (if exists)
5. send_filing_needs_review_notification() — add logo param (if exists)

For each template, add this block at the top of the email body (after the header):
  - If company_logo_url: <img src="{url}" alt="Company Logo" style="max-height:60px; margin-bottom:16px;">
  - Else: no logo shown (FinClear branding only)

Update ALL callers to pass company_logo_url:
  - filing_lifecycle.py send_filing_notifications() — fetch company logo, generate pre-signed URL, pass to each notification
  - parties.py _send_party_submitted_notifications() — same pattern

The pre-signed URL generation pattern (from reports.py):
  grep -A 15 "logo_url" api/app/routes/reports.py | head -20

====================================================================
FIX 6: Resend Link — Actually Send Email
====================================================================

File: api/app/routes/parties.py

Diagnose:
  grep -n "TODO.*email\|resend.*link\|client_resend" api/app/routes/parties.py | head -10

Find the resend endpoint(s) with TODO comments. Replace TODO with actual email send:
  - Use send_party_invite_notification() (same as initial invite)
  - Pass the new/existing token URL
  - Log to outbox with type="party_invite_resend"

====================================================================
FIX 7: Register Cron Jobs Documentation
====================================================================

Create or update a file: docs/CRON_JOBS.md

Contents:
  - check_filing_deadlines.py: `0 9 * * * python -m app.scripts.check_filing_deadlines`
    Purpose: Send 7/3/1 day filing deadline reminders to staff
  - nudge_unresponsive_parties.py: `0 9 * * * python -m app.scripts.nudge_unresponsive_parties`  
    Purpose: Send reminder to parties who haven't submitted after 7 days
  - poll_fincen_sdtm.py: `*/15 * * * * python -m app.scripts.poll_fincen_sdtm`
    Purpose: Poll FinCEN SDTM for response files

Note: These need to be added as Render Cron Jobs manually.

====================================================================
DO NOT
====================================================================

- Do not change the notification outbox pattern (always log NotificationEvent first)
- Do not change SendGrid integration or config
- Do not change existing working templates (party_invite, filing_submitted, filing_accepted)
- Do not change the party portal form or submission logic
- Do not remove SENDGRID_ENABLED check — emails should still gracefully degrade
- Do not hardcode any email addresses — always use report initiator or party email
- Do not log secrets or API keys

====================================================================
TEMPLATE STYLE GUIDE
====================================================================

All new email templates should follow the existing pattern in email_service.py:
- Inline CSS (no external stylesheets)
- Max-width 600px centered container
- FinClear header bar (dark blue #1e293b)
- Company logo below header if provided
- Clear subject line with property address
- Action button (blue #2563eb) linking to relevant page
- Footer with "This is an automated message from FinClear"
- Both HTML and plain text versions
