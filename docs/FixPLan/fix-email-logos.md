Email Logo Logic — Company Logo vs FinClear Logo

Simple rule:
- Emails TO PARTIES (buyers/sellers) → Show their ESCROW COMPANY logo
- Emails TO ESCROW OFFICERS/STAFF → Show FINCLEAR logo

====================================================================
DIAGNOSE
====================================================================

# See how _build_email_wrapper handles logo currently
grep -B 2 -A 20 "def _build_email_wrapper\|company_logo\|logo_url\|FinClear" api/app/services/email_service.py | head -50

# See which templates pass company_logo_url
grep -n "company_logo_url\|logo_url" api/app/services/email_service.py | head -20

# Check if there's a FinClear logo asset or URL
grep -rn "finclear.*logo\|FINCLEAR.*LOGO\|finclear.*png\|finclear.*svg" api/ web/ | head -10

====================================================================
CHANGES
====================================================================

1. Update _build_email_wrapper to accept a logo_mode parameter:

   def _build_email_wrapper(
       body_content: str,
       header_text: str = "",
       header_subtext: str = "",
       company_logo_url: str = None,  # R2 pre-signed URL for company logo
       logo_mode: str = "finclear",   # "finclear" or "company"
       ...
   ) -> str:

   Logo rendering logic:
   
   if logo_mode == "company" and company_logo_url:
       # Show company logo image (escrow/title company branding)
       <img src="{company_logo_url}" alt="Company Logo" style="max-height:60px; margin:24px auto 16px; display:block;">
   elif logo_mode == "company" and not company_logo_url:
       # Company logo not uploaded — show company name as text fallback
       # The company_name should be passed as well for this fallback
       <div style="font-size:20px; font-weight:700; color:#0f172a; text-align:center; margin:24px 0 16px;">
           {company_name or "Your Escrow Company"}
       </div>
   else:
       # logo_mode == "finclear" — show FinClear branding
       # Use text-based logo (no external image dependency):
       <div style="text-align:center; margin:24px 0 16px;">
           <span style="font-size:24px; font-weight:700; color:#2563eb;">Fin</span><span style="font-size:24px; font-weight:700; color:#0f172a;">Clear</span>
           <div style="font-size:12px; color:#64748b; margin-top:4px;">Compliance Made Simple</div>
       </div>

2. Update each template to use the correct logo_mode:

   PARTY-FACING EMAILS (logo_mode="company", pass company_logo_url):
   - get_party_invite_html() → logo_mode="company"
   - get_party_nudge_html() → logo_mode="company"

   OFFICER/STAFF-FACING EMAILS (logo_mode="finclear", ignore company_logo_url):
   - get_exempt_notification_html() → logo_mode="finclear"
   - get_links_sent_confirmation_html() → logo_mode="finclear"
   - get_party_submitted_html() → logo_mode="finclear"
   - get_filing_submitted_html() → logo_mode="finclear"
   - get_filing_accepted_html() → logo_mode="finclear"
   - Invoice template → logo_mode="finclear"

3. Update callers:
   - Party invite and nudge callers should still fetch and pass company_logo_url
   - Officer-facing callers do NOT need to fetch company logo at all
   - Remove any company_logo_url fetching from officer-facing notification calls (saves an R2 call)

4. Add company_name as fallback parameter to _build_email_wrapper:
   - Used when logo_mode="company" but no logo image uploaded
   - Shows company name as styled text instead of broken image

====================================================================
UPDATE TEST SCRIPT
====================================================================

Update send_test_emails.py to demonstrate both modes:
- Party-facing emails: pass company_logo_url=None (shows text fallback "Pacific Coast Title Company")
- Officer-facing emails: shows FinClear text logo automatically

====================================================================
DO NOT
====================================================================

- Do not require an external FinClear logo image file — use styled text
- Do not change when notifications are triggered
- Do not change email sending logic
- Do not remove company_logo_url support — it stays for party-facing emails
- Do not change function signatures in a breaking way (add params with defaults)
