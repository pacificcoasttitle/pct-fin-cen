"""
SendGrid Email Service

Sends transactional emails for party invitations and confirmations.
All emails are logged to NotificationEvent outbox first.
"""

import os
import logging
from typing import Optional
from datetime import datetime

logger = logging.getLogger(__name__)

# Brand Configuration
BRAND_NAME = "FinClear"
BRAND_TAGLINE = "FinCEN Compliance Made Simple"
BRAND_SUPPORT_EMAIL = "support@fincenclear.com"

# Configuration
SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY")
SENDGRID_FROM_EMAIL = os.getenv("SENDGRID_FROM_EMAIL", "clear@fincenclear.com")
SENDGRID_FROM_NAME = os.getenv("SENDGRID_FROM_NAME", BRAND_NAME)
SENDGRID_ENABLED = os.getenv("SENDGRID_ENABLED", "false").lower() == "true"
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://fincenclear.com")
LOGO_URL = f"{FRONTEND_URL}/logo.png"

# ============================================================================
# Design System — Color Palette
# ============================================================================
# Background:       #f8fafc  (slate-50)
# Card:             #ffffff
# Header text:      #0f172a  (slate-900)
# Body text:        #334155  (slate-700)
# Muted text:       #64748b  (slate-500)
# Primary btn:      #2563eb  (blue-600)
# Success accent:   #059669  (emerald-600)
# Warning accent:   #d97706  (amber-600)
# Error accent:     #dc2626  (red-600)
# Divider:          #e2e8f0  (slate-200)
# ============================================================================


class EmailResult:
    """Result of an email send attempt."""
    def __init__(self, success: bool, message_id: Optional[str] = None, error: Optional[str] = None):
        self.success = success
        self.message_id = message_id
        self.error = error
    
    def to_dict(self):
        return {
            "success": self.success,
            "message_id": self.message_id,
            "error": self.error
        }


def send_email(
    to_email: str,
    subject: str,
    html_content: str,
    text_content: Optional[str] = None,
) -> EmailResult:
    """
    Send an email via SendGrid.
    
    If SENDGRID_ENABLED is false, logs the email but doesn't send.
    """
    # Check if sending is disabled
    if not SENDGRID_ENABLED:
        logger.info(f"[EMAIL DISABLED] Would send to {to_email}: {subject}")
        return EmailResult(success=True, message_id="disabled-mode")
    
    # Check for API key
    if not SENDGRID_API_KEY:
        logger.error("SENDGRID_API_KEY not configured")
        return EmailResult(success=False, error="API key not configured")
    
    # Check for valid recipient
    if not to_email or "@" not in to_email:
        logger.warning(f"Invalid email address: {to_email}")
        return EmailResult(success=False, error="Invalid email address")
    
    try:
        from sendgrid import SendGridAPIClient
        from sendgrid.helpers.mail import Mail, Email, To, Content
        
        message = Mail(
            from_email=Email(SENDGRID_FROM_EMAIL, SENDGRID_FROM_NAME),
            to_emails=To(to_email),
            subject=subject,
        )
        message.add_content(Content("text/html", html_content))
        
        if text_content:
            message.add_content(Content("text/plain", text_content))
        
        sg = SendGridAPIClient(SENDGRID_API_KEY)
        response = sg.send(message)
        
        message_id = response.headers.get("X-Message-Id", f"sg-{datetime.utcnow().timestamp()}")
        
        logger.info(f"[EMAIL SENT] to={to_email} subject='{subject}' message_id={message_id} status={response.status_code}")
        
        return EmailResult(success=True, message_id=message_id)
        
    except Exception as e:
        logger.error(f"[EMAIL FAILED] to={to_email} error={str(e)}")
        return EmailResult(success=False, error=str(e))


# ============================================================================
# SHARED EMAIL WRAPPER — Consistent Design System
# ============================================================================

def _build_email_wrapper(
    body_content: str,
    company_logo_url: Optional[str] = None,
    header_text: str = "",
    header_subtext: str = "",
    action_url: Optional[str] = None,
    action_text: Optional[str] = None,
    footer_note: Optional[str] = None,
    header_accent: str = "blue",
    button_color: Optional[str] = None,
    logo_mode: str = "finclear",
    company_name: Optional[str] = None,
) -> str:
    """
    Build a complete HTML email with consistent branding.

    Args:
        body_content: The unique HTML body for this email type.
        company_logo_url: Optional pre-signed URL for company logo (only used when logo_mode="company").
        header_text: Bold header title (e.g. "Transaction Exempt").
        header_subtext: Smaller text below header.
        action_url: Optional CTA button URL.
        action_text: Optional CTA button label.
        footer_note: Optional small footer note above the brand line.
        header_accent: "blue" | "green" | "amber" | "red" for header bg.
        button_color: Override button bg color (hex). Defaults based on accent.
        logo_mode: "finclear" (officer/staff emails) or "company" (party-facing emails).
        company_name: Fallback text when logo_mode="company" but no logo image uploaded.
    """
    # Accent color mapping
    accent_map = {
        "blue":  {"bg": "#2563eb", "bg2": "#1d4ed8"},
        "green": {"bg": "#059669", "bg2": "#047857"},
        "amber": {"bg": "#d97706", "bg2": "#b45309"},
        "red":   {"bg": "#dc2626", "bg2": "#b91c1c"},
    }
    accent = accent_map.get(header_accent, accent_map["blue"])
    btn_bg = button_color or accent["bg"]

    # Logo block — determined by logo_mode
    if logo_mode == "company" and company_logo_url:
        # Party-facing: show the escrow/title company's uploaded logo
        logo_html = f'''
                                <img src="{company_logo_url}" alt="Company Logo"
                                     style="max-height:60px; max-width:200px; display:block; margin:0 auto; object-fit:contain;" />
'''
    elif logo_mode == "company" and not company_logo_url:
        # Party-facing but no logo uploaded: show company name as styled text fallback
        display_name = company_name or "Your Escrow Company"
        logo_html = f'''
                                <div style="text-align:center;">
                                    <span style="font-size:20px; font-weight:700; color:#0f172a;">{display_name}</span>
                                    <div style="font-size:12px; color:#64748b; margin-top:4px;">FinCEN Compliance Portal</div>
                                </div>
'''
    else:
        # logo_mode == "finclear" (default) — officer/staff emails: show FinClear branding
        logo_html = f'''
                                <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto;">
                                    <tr>
                                        <td style="vertical-align:middle; padding-right:10px;">
                                            <div style="width:36px; height:36px; background:{accent["bg"]}; border-radius:8px; text-align:center; line-height:36px;">
                                                <span style="color:#ffffff; font-size:18px; font-weight:bold;">F</span>
                                            </div>
                                        </td>
                                        <td style="vertical-align:middle;">
                                            <span style="font-size:20px; font-weight:700; color:#0f172a; letter-spacing:-0.3px;">{BRAND_NAME}</span>
                                        </td>
                                    </tr>
                                </table>
'''

    # Header subtext
    subtext_html = ""
    if header_subtext:
        subtext_html = f'<p style="color:#64748b; margin:6px 0 0; font-size:14px;">{header_subtext}</p>'

    # Action button
    button_html = ""
    if action_url and action_text:
        button_html = f'''
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:28px 0 8px;">
                                <tr>
                                    <td align="center">
                                        <a href="{action_url}"
                                           style="display:inline-block; background-color:{btn_bg}; color:#ffffff; padding:12px 32px; border-radius:8px; font-weight:600; font-size:15px; text-decoration:none;">
                                            {action_text}
                                        </a>
                                    </td>
                                </tr>
                            </table>
'''

    # Footer note
    footer_note_html = ""
    if footer_note:
        footer_note_html = f'<p style="margin:0 0 12px; color:#94a3b8; font-size:12px;">{footer_note}</p>'

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{header_text}</title>
</head>
<body style="margin:0; padding:0; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height:1.6; background-color:#f8fafc;">

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f8fafc;">
        <tr>
            <td align="center" style="padding:40px 20px;">

                <!-- Main Card -->
                <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,0.08);">

                    <!-- Logo Area -->
                    <tr>
                        <td style="padding:28px 40px 16px; text-align:center;">
                            {logo_html}
                        </td>
                    </tr>

                    <!-- Divider -->
                    <tr>
                        <td style="padding:0 40px;">
                            <div style="border-top:1px solid #e2e8f0;"></div>
                        </td>
                    </tr>

                    <!-- Header Text -->
                    <tr>
                        <td style="padding:20px 40px 8px; text-align:center;">
                            <h1 style="margin:0; font-size:24px; font-weight:700; color:#0f172a;">
                                {header_text}
                            </h1>
                            {subtext_html}
                        </td>
                    </tr>

                    <!-- Body Content -->
                    <tr>
                        <td style="padding:16px 40px 32px;">
                            {body_content}
                            {button_html}
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color:#f8fafc; border-top:1px solid #e2e8f0; padding:20px 40px; text-align:center;">
                            {footer_note_html}
                            <p style="margin:0; color:#64748b; font-size:12px;">
                                Powered by {BRAND_NAME} &middot; {BRAND_TAGLINE}
                            </p>
                            <p style="margin:6px 0 0; color:#94a3b8; font-size:11px;">
                                This is an automated message. Please do not reply directly.
                            </p>
                        </td>
                    </tr>

                </table>

            </td>
        </tr>
    </table>

</body>
</html>"""


# ============================================================================
# Shared HTML helpers for body_content
# ============================================================================

def _info_card(label: str, value: str, accent: str = "#2563eb") -> str:
    """A styled info callout (property address, status, etc.)."""
    bg_map = {
        "#2563eb": "#eff6ff",   # blue
        "#059669": "#ecfdf5",   # green
        "#d97706": "#fffbeb",   # amber
        "#dc2626": "#fef2f2",   # red
    }
    text_map = {
        "#2563eb": "#1e3a8a",
        "#059669": "#065f46",
        "#d97706": "#92400e",
        "#dc2626": "#991b1b",
    }
    bg = bg_map.get(accent, "#eff6ff")
    txt = text_map.get(accent, "#1e3a8a")
    return f'''
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:16px 0;">
                                <tr>
                                    <td style="background-color:{bg}; border-left:4px solid {accent}; padding:16px 20px; border-radius:0 8px 8px 0;">
                                        <p style="margin:0 0 4px; color:{txt}; font-size:12px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">
                                            {label}
                                        </p>
                                        <p style="margin:0; color:{txt}; font-size:17px; font-weight:600;">
                                            {value}
                                        </p>
                                    </td>
                                </tr>
                            </table>'''


def _detail_row(label: str, value: str, accent: str = "#065f46") -> str:
    """A single key-value line inside a detail block."""
    return f'<p style="margin:0 0 8px; color:{accent};"><strong>{label}:</strong> {value}</p>'


def _detail_block(rows_html: str, accent: str = "#059669") -> str:
    """Wraps detail rows in a styled block."""
    bg_map = {
        "#059669": "#ecfdf5",
        "#2563eb": "#eff6ff",
        "#d97706": "#fffbeb",
        "#dc2626": "#fef2f2",
    }
    bg = bg_map.get(accent, "#ecfdf5")
    return f'''
                            <div style="background:{bg}; border-left:4px solid {accent}; padding:16px 20px; margin:16px 0; border-radius:0 8px 8px 0;">
                                {rows_html}
                            </div>'''


def _text(content: str) -> str:
    """Standard body paragraph."""
    return f'<p style="margin:0 0 16px; color:#334155; font-size:15px; line-height:1.6;">{content}</p>'


def _muted(content: str) -> str:
    """Small muted paragraph."""
    return f'<p style="margin:16px 0 0; color:#64748b; font-size:13px;">{content}</p>'


def _warning_box(content: str) -> str:
    """Amber warning callout."""
    return f'''
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:16px 0;">
                                <tr>
                                    <td style="background-color:#fffbeb; border:1px solid #fbbf24; padding:14px 18px; border-radius:8px;">
                                        <p style="margin:0; color:#92400e; font-size:14px;">{content}</p>
                                    </td>
                                </tr>
                            </table>'''


# ============================================================================
# TEMPLATE 1: Party Invite  (buyer/seller portal link)
# ============================================================================

def get_party_invite_html(
    party_name: str,
    party_role: str,
    property_address: str,
    portal_link: str,
    company_name: Optional[str] = None,
    company_logo_url: Optional[str] = None,
) -> str:
    """Generate HTML for party invitation email with optional company logo."""
    
    role_display = party_role.replace("_", " ").title()
    greeting = party_name if party_name else "Property Transaction Party"
    company_line = f" on behalf of <strong>{company_name}</strong>" if company_name else ""

    body = (
        _text(f"Dear {greeting},")
        + _text(
            f'You are receiving this email because you are listed as the '
            f'<strong style="color:#2563eb;">{role_display}</strong> '
            f'in a real estate transaction{company_line}.'
        )
        + _info_card("Property Address", property_address, "#2563eb")
        + _text(
            "Under federal regulations, we are required to collect certain information "
            "from all parties involved in this transaction. This is a secure process and "
            "your information will only be used for compliance purposes."
        )
        + _warning_box(
            "<strong>Time Sensitive:</strong> Please complete this form within "
            "<strong>7 days</strong>. The secure link will expire after that time."
        )
        + f'''
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:24px 0 0; border-top:1px solid #e2e8f0; padding-top:20px;">
                                <tr>
                                    <td>
                                        <p style="margin:0 0 8px; color:#64748b; font-size:13px;">
                                            <strong style="color:#334155;">Why am I receiving this?</strong><br>
                                            The Financial Crimes Enforcement Network (FinCEN) requires reporting on certain real estate transactions to prevent money laundering.
                                        </p>
                                        <p style="margin:12px 0 0; color:#64748b; font-size:13px;">
                                            <strong style="color:#334155;">Is this legitimate?</strong><br>
                                            Yes. This request is part of the legal compliance process for your real estate transaction. If you have concerns, please contact your title company representative.
                                        </p>
                                    </td>
                                </tr>
                            </table>'''
    )
    
    return _build_email_wrapper(
        body_content=body,
        company_logo_url=company_logo_url,
        header_text="Action Required",
        header_subtext="Submit Your Transaction Information",
        action_url=portal_link,
        action_text="Open Secure Portal",
        header_accent="blue",
        logo_mode="company",
        company_name=company_name,
    )


def get_party_invite_text(
    party_name: str,
    party_role: str,
    property_address: str,
    portal_link: str,
) -> str:
    """Generate plain text for party invitation email."""
    
    role_display = party_role.replace("_", " ").title()
    greeting = party_name if party_name else "Property Transaction Party"
    
    return f"""
ACTION REQUIRED — Submit Your Transaction Information

Dear {greeting},

You are receiving this email because you are listed as the {role_display} in a real estate transaction for:

{property_address}

Under federal regulations, we are required to collect certain information from all parties involved in this transaction.

Please complete your information by visiting this secure link:
{portal_link}

TIME SENSITIVE: Please complete this form within 7 days.

---

Why am I receiving this?
The Financial Crimes Enforcement Network (FinCEN) requires reporting on certain real estate transactions to prevent money laundering.

Is this legitimate?
Yes. This request is part of the legal compliance process for your real estate transaction. If you have concerns, please contact your title company representative.

---

This is an automated message. Please do not reply directly to this email.
Powered by {BRAND_NAME} - {BRAND_TAGLINE}
"""


def send_party_invite(
    to_email: str,
    party_name: str,
    party_role: str,
    property_address: str,
    portal_link: str,
    company_name: Optional[str] = None,
    company_logo_url: Optional[str] = None,
) -> EmailResult:
    """
    Send party invitation email.
    """
    subject = "Action Required: Information Needed for Real Estate Transaction"
    
    html_content = get_party_invite_html(
        party_name=party_name,
        party_role=party_role,
        property_address=property_address,
        portal_link=portal_link,
        company_name=company_name,
        company_logo_url=company_logo_url,
    )
    
    text_content = get_party_invite_text(
        party_name=party_name,
        party_role=party_role,
        property_address=property_address,
        portal_link=portal_link,
    )
    
    return send_email(to_email, subject, html_content, text_content)


# ============================================================================
# TEMPLATE 2: Submission Confirmation  (to the party who just submitted)
# ============================================================================

def get_confirmation_html(
    party_name: str,
    confirmation_id: str,
    property_address: str,
) -> str:
    """Generate HTML for submission confirmation email."""
    
    greeting = party_name if party_name else "Valued Party"
    
    body = (
        _text(f"Dear {greeting},")
        + _text("We have successfully received your information for the real estate transaction at:")
        + _info_card("Property Address", property_address, "#059669")
        + f'''
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0;">
                                <tr>
                                    <td style="background-color:#ecfdf5; border:2px solid #86efac; padding:24px; border-radius:12px; text-align:center;">
                                        <p style="margin:0 0 6px; color:#166534; font-size:12px; font-weight:600; text-transform:uppercase; letter-spacing:1px;">
                                            Your Confirmation ID
                                        </p>
                                        <p style="margin:0; color:#15803d; font-size:26px; font-weight:700; font-family:'SF Mono', Monaco, 'Courier New', monospace; letter-spacing:2px;">
                                            {confirmation_id}
                                        </p>
                                    </td>
                                </tr>
                            </table>'''
        + _text("<strong>Please save this confirmation ID for your records.</strong>")
        + _muted("No further action is required from you at this time. If you have any questions about the transaction, please contact your title company representative.")
    )

    return _build_email_wrapper(
        body_content=body,
        header_text="Information Received",
        header_subtext="Thank you for your submission",
        header_accent="green",
    )


def get_confirmation_text(
    party_name: str,
    confirmation_id: str,
    property_address: str,
) -> str:
    """Generate plain text for submission confirmation email."""
    
    greeting = party_name if party_name else "Valued Party"
    
    return f"""
INFORMATION RECEIVED

Dear {greeting},

We have successfully received your information for the real estate transaction at:

{property_address}

YOUR CONFIRMATION ID: {confirmation_id}

Please save this confirmation ID for your records.

No further action is required from you at this time. If you have any questions about the transaction, please contact your title company representative.

---

Powered by {BRAND_NAME} - {BRAND_TAGLINE}
"""


def send_party_confirmation(
    to_email: str,
    party_name: str,
    confirmation_id: str,
    property_address: str,
) -> EmailResult:
    """
    Send submission confirmation email.
    """
    subject = "Confirmed: Your Information Has Been Received"
    
    html_content = get_confirmation_html(
        party_name=party_name,
        confirmation_id=confirmation_id,
        property_address=property_address,
    )
    
    text_content = get_confirmation_text(
        party_name=party_name,
        confirmation_id=confirmation_id,
        property_address=property_address,
    )
    
    return send_email(to_email, subject, html_content, text_content)


# ============================================================================
# TEMPLATE 3: Party Submitted  (notify escrow officer)
# ============================================================================

def send_party_submitted_notification(
    staff_email: str,
    party_name: str,
    party_role: str,
    property_address: str,
    report_id: str,
    all_complete: bool = False,
    company_logo_url: Optional[str] = None,
) -> EmailResult:
    """
    Notify staff when a party submits their portal form.
    """
    role_display = "Buyer" if party_role == "transferee" else "Seller"
    
    if all_complete:
        subject = f"All Parties Complete -- Ready for Review: {property_address}"
        h_text = "All Parties Complete"
        h_sub = property_address
        accent = "green"
    else:
        subject = f"Party Submitted: {party_name} ({role_display})"
        h_text = "Party Submission Received"
        h_sub = f"{party_name} -- {role_display}"
        accent = "blue"

    status_line = ""
    if all_complete:
        status_line = _text('<strong style="color:#059669;">All parties have now submitted. This report is ready for review and filing.</strong>')

    body = (
        _text(f"<strong>{party_name}</strong> ({role_display}) has submitted their information for:")
        + _info_card("Property Address", property_address, "#059669" if all_complete else "#2563eb")
        + status_line
    )

    report_url = f"{FRONTEND_URL}/app/staff/requests/{report_id}"

    html_content = _build_email_wrapper(
        body_content=body,
        header_text=h_text,
        header_subtext=h_sub,
        action_url=report_url,
        action_text="View Report",
        header_accent=accent,
        logo_mode="finclear",
    )

    text_content = f"""
Party Submitted: {party_name}

{party_name} ({role_display}) has submitted their information for:
{property_address}

{"ALL PARTIES COMPLETE -- Ready for review and filing." if all_complete else ""}

View the report: {report_url}

---
{BRAND_NAME} - {BRAND_TAGLINE}
"""
    
    return send_email(staff_email, subject, html_content, text_content)


# ============================================================================
# TEMPLATE 4: Invoice
# ============================================================================

def get_invoice_email_html(
    company_name: str,
    invoice_number: str,
    total_dollars: float,
    due_date: str,
    period_start: str,
    period_end: str,
    view_link: str,
    company_logo_url: Optional[str] = None,
) -> str:
    """Generate HTML for invoice email."""

    body = (
        _text(f"Dear {company_name},")
        + _text("Your invoice for FinCEN filing services is now available.")
        + f'''
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:16px 0;">
                                <tr>
                                    <td style="background-color:#eff6ff; border-left:4px solid #2563eb; padding:20px; border-radius:0 8px 8px 0;">
                                        <table width="100%" cellspacing="0" cellpadding="0">
                                            <tr>
                                                <td style="padding:6px 0;">
                                                    <span style="color:#64748b; font-size:14px;">Invoice Number:</span>
                                                    <span style="color:#1e3a8a; font-size:14px; font-weight:600; float:right; font-family:monospace;">{invoice_number}</span>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding:6px 0;">
                                                    <span style="color:#64748b; font-size:14px;">Billing Period:</span>
                                                    <span style="color:#1e3a8a; font-size:14px; font-weight:500; float:right;">{period_start} - {period_end}</span>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding:6px 0; border-top:1px solid #bfdbfe;">
                                                    <span style="color:#64748b; font-size:14px;">Due Date:</span>
                                                    <span style="color:#1e3a8a; font-size:14px; font-weight:600; float:right;">{due_date}</span>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding:10px 0; border-top:2px solid #2563eb;">
                                                    <span style="color:#1e3a8a; font-size:16px; font-weight:600;">Amount Due:</span>
                                                    <span style="color:#2563eb; font-size:24px; font-weight:700; float:right;">${total_dollars:,.2f}</span>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>'''
        + f'''
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:16px 0;">
                                <tr>
                                    <td style="background-color:#ecfdf5; border:1px solid #86efac; padding:14px 18px; border-radius:8px;">
                                        <p style="margin:0 0 6px; color:#166534; font-size:14px; font-weight:600;">
                                            Payment Options:
                                        </p>
                                        <p style="margin:0; color:#15803d; font-size:13px;">
                                            ACH Transfer &bull; Wire Transfer &bull; Check<br>
                                            <span style="font-size:12px; color:#64748b;">Please reference invoice number with your payment.</span>
                                        </p>
                                    </td>
                                </tr>
                            </table>'''
        + _muted("If you have any questions about this invoice, please contact our billing team.")
    )

    return _build_email_wrapper(
        body_content=body,
        header_text="Invoice",
        header_subtext=invoice_number,
        action_url=view_link,
        action_text="View Invoice",
        header_accent="blue",
        footer_note=f"Questions? Contact {BRAND_SUPPORT_EMAIL}",
        logo_mode="finclear",
    )


def get_invoice_email_text(
    company_name: str,
    invoice_number: str,
    total_dollars: float,
    due_date: str,
    period_start: str,
    period_end: str,
    view_link: str,
) -> str:
    """Generate plain text for invoice email."""
    
    return f"""
INVOICE — {invoice_number}

Dear {company_name},

Your invoice for FinCEN filing services is now available.

---
INVOICE SUMMARY
---
Invoice Number: {invoice_number}
Billing Period: {period_start} - {period_end}
Due Date: {due_date}
Amount Due: ${total_dollars:,.2f}

View your invoice online: {view_link}

---
PAYMENT OPTIONS
---
- ACH Transfer
- Wire Transfer
- Check

Please reference invoice number {invoice_number} with your payment.

---

Questions? Contact {BRAND_SUPPORT_EMAIL}

Powered by {BRAND_NAME} - {BRAND_TAGLINE}
"""


def send_invoice_email(
    to_email: str,
    company_name: str,
    invoice_number: str,
    total_dollars: float,
    due_date: str,
    period_start: str,
    period_end: str,
    view_link: str,
    company_logo_url: Optional[str] = None,
) -> EmailResult:
    """
    Send invoice email to company billing contact.
    """
    subject = f"Invoice {invoice_number} - ${total_dollars:,.2f} Due {due_date}"
    
    html_content = get_invoice_email_html(
        company_name=company_name,
        invoice_number=invoice_number,
        total_dollars=total_dollars,
        due_date=due_date,
        period_start=period_start,
        period_end=period_end,
        view_link=view_link,
        company_logo_url=company_logo_url,
    )
    
    text_content = get_invoice_email_text(
        company_name=company_name,
        invoice_number=invoice_number,
        total_dollars=total_dollars,
        due_date=due_date,
        period_start=period_start,
        period_end=period_end,
        view_link=view_link,
    )
    
    return send_email(to_email, subject, html_content, text_content)


# ============================================================================
# FILING STATUS NOTIFICATIONS (Client-Driven Flow)
# ============================================================================

def send_filing_submitted_notification(
    to_email: str,
    recipient_name: str,
    property_address: str,
    report_url: str,
    company_logo_url: Optional[str] = None,
) -> EmailResult:
    """
    Notify when filing is submitted to FinCEN (pending acceptance).
    """
    from datetime import datetime
    submitted_at = datetime.utcnow()

    subject = f"Filing Submitted to FinCEN: {property_address}"

    details = (
        _detail_row("Property", property_address)
        + _detail_row("Submitted", submitted_at.strftime('%B %d, %Y at %I:%M %p') + " UTC")
        + _detail_row("Status", "Awaiting FinCEN Response").rstrip("</p>").rstrip()
    )
    # Fix last row to not have trailing margin
    details = (
        _detail_row("Property", property_address, "#1e3a8a")
        + _detail_row("Submitted", submitted_at.strftime('%B %d, %Y at %I:%M %p') + " UTC", "#1e3a8a")
        + f'<p style="margin:0; color:#1e3a8a;"><strong>Status:</strong> Awaiting FinCEN Response</p>'
    )

    body = (
        _text(f"Hi {recipient_name},")
        + _text("Your FinCEN Real Estate Report has been submitted for processing.")
        + _detail_block(details, "#2563eb")
        + _text("You'll receive another email once FinCEN processes your filing (typically within 24-48 hours).")
    )

    html_content = _build_email_wrapper(
        body_content=body,
        header_text="Filing Submitted",
        header_subtext=property_address,
        action_url=report_url,
        action_text="View Filing Status",
        header_accent="blue",
        logo_mode="finclear",
    )
    
    return send_email(to_email, subject, html_content)


def send_filing_accepted_notification(
    to_email: str,
    recipient_name: str,
    property_address: str,
    bsa_id: str,
    filed_at_str: str,
    report_url: str,
    company_logo_url: Optional[str] = None,
) -> EmailResult:
    """
    Notify when filing is accepted by FinCEN with BSA ID.
    """
    subject = f"FinCEN Filing Complete: {property_address}"

    details = (
        _detail_row("Property", property_address)
        + f'<p style="margin:0 0 8px; color:#065f46;"><strong>BSA ID:</strong> <code style="background:#d1fae5; padding:2px 8px; border-radius:4px; font-family:monospace; font-size:15px;">{bsa_id}</code></p>'
        + _detail_row("Filed", filed_at_str)
    )

    body = (
        _text(f"Hi {recipient_name},")
        + _text("Great news! Your FinCEN Real Estate Report has been <strong>accepted</strong>.")
        + _detail_block(details, "#059669")
        + _text('<strong style="color:#d97706;">Save this BSA ID for your records.</strong> This is your official FinCEN receipt number.')
        + _muted("This filing will be stored securely for 5 years per FinCEN requirements.")
    )

    html_content = _build_email_wrapper(
        body_content=body,
        header_text="Filing Complete",
        header_subtext=f"BSA ID: {bsa_id}",
        action_url=report_url,
        action_text="View Filing Details",
        header_accent="green",
        button_color="#059669",
        logo_mode="finclear",
    )
    
    return send_email(to_email, subject, html_content)


def send_filing_rejected_notification(
    to_email: str,
    recipient_name: str,
    property_address: str,
    rejection_code: str,
    rejection_message: str,
    report_url: str,
    company_logo_url: Optional[str] = None,
) -> EmailResult:
    """
    Notify when filing is rejected by FinCEN -- URGENT.
    """
    subject = f"Action Required: FinCEN Filing Rejected -- {property_address}"

    details = (
        _detail_row("Property", property_address, "#991b1b")
        + f'<p style="margin:0 0 8px; color:#991b1b;"><strong>Error Code:</strong> <code style="background:#fee2e2; padding:2px 8px; border-radius:4px;">{rejection_code}</code></p>'
        + f'<p style="margin:0; color:#991b1b;"><strong>Reason:</strong> {rejection_message}</p>'
    )

    body = (
        _text(f"Hi {recipient_name},")
        + _text("Your FinCEN Real Estate Report was <strong>rejected</strong> and requires attention.")
        + _detail_block(details, "#dc2626")
        + _text("<strong>What to do:</strong>")
        + f'''
                            <ol style="margin:0 0 16px; color:#334155; font-size:15px; padding-left:20px;">
                                <li style="margin-bottom:6px;">Review the error details above</li>
                                <li style="margin-bottom:6px;">Correct the information in the report</li>
                                <li>Re-submit the filing</li>
                            </ol>'''
        + _muted(f"Need help? Contact {BRAND_SUPPORT_EMAIL}")
    )

    html_content = _build_email_wrapper(
        body_content=body,
        header_text="Filing Rejected",
        header_subtext=property_address,
        action_url=report_url,
        action_text="Fix and Resubmit",
        header_accent="red",
        button_color="#dc2626",
        logo_mode="finclear",
    )
    
    return send_email(to_email, subject, html_content)


def send_filing_needs_review_notification(
    to_email: str,
    recipient_name: str,
    property_address: str,
    reason: str,
    report_url: str,
    company_logo_url: Optional[str] = None,
) -> EmailResult:
    """
    Notify when filing needs manual review.
    """
    subject = f"Review Required: FinCEN Filing -- {property_address}"

    details = (
        _detail_row("Property", property_address, "#92400e")
        + f'<p style="margin:0; color:#92400e;"><strong>Reason:</strong> {reason}</p>'
    )

    body = (
        _text(f"Hi {recipient_name},")
        + _text("Your FinCEN Real Estate Report requires review before it can be filed.")
        + _detail_block(details, "#d97706")
    )

    html_content = _build_email_wrapper(
        body_content=body,
        header_text="Review Required",
        header_subtext=property_address,
        action_url=report_url,
        action_text="Review Report",
        header_accent="amber",
        button_color="#d97706",
        logo_mode="finclear",
    )
    
    return send_email(to_email, subject, html_content)


# ============================================================================
# EXEMPT DETERMINATION NOTIFICATION
# ============================================================================

def get_exempt_notification_html(
    recipient_name: str,
    property_address: str,
    determination_date: str,
    exemption_reasons: list,
    certificate_id: str,
    report_url: str,
    company_logo_url: Optional[str] = None,
) -> str:
    """Generate HTML for exempt determination notification email."""
    
    reasons_html = ""
    if exemption_reasons:
        items = "".join(
            f'<li style="margin-bottom:4px; color:#065f46;">{r}</li>'
            for r in exemption_reasons if r
        )
        reasons_html = f'<ul style="margin:8px 0 0; padding-left:20px;">{items}</ul>'
    else:
        reasons_html = '<p style="margin:8px 0 0; color:#065f46;">Transaction qualifies for exemption under FinCEN regulations.</p>'

    details = (
        _detail_row("Property", property_address)
        + _detail_row("Determination Date", determination_date)
        + f'<p style="margin:0 0 8px; color:#065f46;"><strong>Certificate ID:</strong> <code style="background:#d1fae5; padding:2px 8px; border-radius:4px; font-family:monospace;">{certificate_id}</code></p>'
        + f'<p style="margin:0; color:#065f46;"><strong>Exemption Reason(s):</strong></p>'
        + reasons_html
    )

    body = (
        _text(f"Hi {recipient_name},")
        + _text('The real estate transaction below has been determined <strong style="color:#059669;">EXEMPT</strong> from FinCEN reporting requirements.')
        + _detail_block(details, "#059669")
        + _text("<strong>No further action is required for this transaction.</strong>")
        + _muted("This exemption certificate is stored securely and can be accessed at any time from your dashboard.")
    )

    return _build_email_wrapper(
        body_content=body,
        header_text="Transaction Exempt",
        header_subtext=property_address,
        action_url=report_url,
        action_text="Download Exemption Certificate",
        header_accent="green",
        button_color="#059669",
        logo_mode="finclear",
    )


def get_exempt_notification_text(
    recipient_name: str,
    property_address: str,
    determination_date: str,
    exemption_reasons: list,
    certificate_id: str,
    report_url: str,
) -> str:
    """Generate plain text for exempt determination notification email."""
    reasons_text = "\n".join(f"  - {r}" for r in exemption_reasons if r) if exemption_reasons else "  - Transaction qualifies for exemption under FinCEN regulations."
    
    return f"""
TRANSACTION EXEMPT -- No FinCEN Filing Required

Hi {recipient_name},

The real estate transaction below has been determined EXEMPT from FinCEN reporting requirements.

Property: {property_address}
Determination Date: {determination_date}
Certificate ID: {certificate_id}

Exemption Reason(s):
{reasons_text}

No further action is required for this transaction.

View Exemption Certificate: {report_url}

---
{BRAND_NAME} - {BRAND_TAGLINE}
"""


def send_exempt_notification(
    to_email: str,
    recipient_name: str,
    property_address: str,
    determination_date: str,
    exemption_reasons: list,
    certificate_id: str,
    report_url: str,
    company_logo_url: Optional[str] = None,
) -> EmailResult:
    """Send exempt determination notification to escrow officer."""
    subject = f"Exempt Determination -- {property_address}"
    
    html_content = get_exempt_notification_html(
        recipient_name=recipient_name,
        property_address=property_address,
        determination_date=determination_date,
        exemption_reasons=exemption_reasons,
        certificate_id=certificate_id,
        report_url=report_url,
        company_logo_url=company_logo_url,
    )
    
    text_content = get_exempt_notification_text(
        recipient_name=recipient_name,
        property_address=property_address,
        determination_date=determination_date,
        exemption_reasons=exemption_reasons,
        certificate_id=certificate_id,
        report_url=report_url,
    )
    
    return send_email(to_email, subject, html_content, text_content)


# ============================================================================
# LINKS SENT CONFIRMATION TO ESCROW OFFICER
# ============================================================================

def get_links_sent_confirmation_html(
    recipient_name: str,
    property_address: str,
    parties: list,
    report_url: str,
    company_logo_url: Optional[str] = None,
) -> str:
    """Generate HTML for links-sent confirmation email to escrow officer."""
    
    # Build party list table rows
    party_rows = ""
    for p in parties:
        role_display = (
            "Buyer" if p.get("role") == "transferee"
            else "Seller" if p.get("role") == "transferor"
            else p.get("role", "Party").replace("_", " ").title()
        )
        email_display = p.get("email", "No email")
        name_display = p.get("name", "Unnamed")
        sent_badge = (
            '<span style="color:#059669; font-weight:600;">Sent</span>'
            if p.get("email")
            else '<span style="color:#d97706;">No email</span>'
        )
        party_rows += f"""
                                    <tr>
                                        <td style="padding:10px 12px; border-bottom:1px solid #e2e8f0;">{name_display}</td>
                                        <td style="padding:10px 12px; border-bottom:1px solid #e2e8f0;">{role_display}</td>
                                        <td style="padding:10px 12px; border-bottom:1px solid #e2e8f0;">{email_display}</td>
                                        <td style="padding:10px 12px; border-bottom:1px solid #e2e8f0; text-align:center;">{sent_badge}</td>
                                    </tr>"""

    body = (
        _text(f"Hi {recipient_name},")
        + _text("Portal invitation links have been sent to the following parties for:")
        + _info_card("Property Address", property_address, "#2563eb")
        + f'''
                            <table width="100%" cellspacing="0" cellpadding="0" style="margin:16px 0; font-size:13px; border:1px solid #e2e8f0; border-radius:8px; overflow:hidden;">
                                <tr style="background:#f8fafc;">
                                    <th style="padding:10px 12px; text-align:left; color:#334155; font-weight:600; border-bottom:2px solid #e2e8f0;">Name</th>
                                    <th style="padding:10px 12px; text-align:left; color:#334155; font-weight:600; border-bottom:2px solid #e2e8f0;">Role</th>
                                    <th style="padding:10px 12px; text-align:left; color:#334155; font-weight:600; border-bottom:2px solid #e2e8f0;">Email</th>
                                    <th style="padding:10px 12px; text-align:center; color:#334155; font-weight:600; border-bottom:2px solid #e2e8f0;">Status</th>
                                </tr>
                                {party_rows}
                            </table>'''
        + _text("You will be notified when each party submits their information. You can also monitor progress from your dashboard.")
    )

    return _build_email_wrapper(
        body_content=body,
        header_text="Party Links Sent",
        header_subtext=property_address,
        action_url=report_url,
        action_text="View Status",
        header_accent="blue",
        logo_mode="finclear",
    )


def get_links_sent_confirmation_text(
    recipient_name: str,
    property_address: str,
    parties: list,
    report_url: str,
) -> str:
    """Generate plain text for links-sent confirmation email."""
    party_lines = ""
    for p in parties:
        role = "Buyer" if p.get("role") == "transferee" else "Seller" if p.get("role") == "transferor" else p.get("role", "Party")
        party_lines += f"  - {p.get('name', 'Unnamed')} ({role}) -- {p.get('email', 'No email')}\n"
    
    return f"""
PARTY LINKS SENT -- {property_address}

Hi {recipient_name},

Portal invitation links have been sent to the following parties:

{party_lines}
You will be notified when each party submits their information.

View party status: {report_url}

---
{BRAND_NAME} - {BRAND_TAGLINE}
"""


def send_links_sent_confirmation(
    to_email: str,
    recipient_name: str,
    property_address: str,
    parties: list,
    report_url: str,
    company_logo_url: Optional[str] = None,
) -> EmailResult:
    """Send links-sent confirmation to escrow officer."""
    subject = f"Party Links Sent -- {property_address}"
    
    html_content = get_links_sent_confirmation_html(
        recipient_name=recipient_name,
        property_address=property_address,
        parties=parties,
        report_url=report_url,
        company_logo_url=company_logo_url,
    )
    
    text_content = get_links_sent_confirmation_text(
        recipient_name=recipient_name,
        property_address=property_address,
        parties=parties,
        report_url=report_url,
    )
    
    return send_email(to_email, subject, html_content, text_content)


# ============================================================================
# PARTY NUDGE (7-DAY REMINDER)
# ============================================================================

def get_party_nudge_html(
    party_name: str,
    party_role: str,
    property_address: str,
    portal_url: str,
    company_logo_url: Optional[str] = None,
    company_name: Optional[str] = None,
) -> str:
    """Generate HTML for party nudge reminder email."""
    role_display = party_role.replace("_", " ").title()
    greeting = party_name if party_name else "Property Transaction Party"

    details = (
        _detail_row("Property", property_address, "#92400e")
        + f'<p style="margin:0; color:#92400e;"><strong>Your Role:</strong> {role_display}</p>'
    )

    body = (
        _text(f"Dear {greeting},")
        + _text(
            "This is a friendly reminder that we still need your information for a real estate transaction. "
            "You were previously sent a secure portal link, but we haven't received your submission yet."
        )
        + _detail_block(details, "#d97706")
        + _text("Your prompt response helps ensure a smooth closing process. Please complete the secure form at your earliest convenience.")
        + _muted("If you have already completed this form, please disregard this email. If you need a new link, please contact your title company representative.")
    )

    return _build_email_wrapper(
        body_content=body,
        company_logo_url=company_logo_url,
        header_text="Friendly Reminder",
        header_subtext="Your Information is Still Needed",
        action_url=portal_url,
        action_text="Complete Your Submission",
        header_accent="amber",
        button_color="#2563eb",
        logo_mode="company",
        company_name=company_name,
    )


def get_party_nudge_text(
    party_name: str,
    party_role: str,
    property_address: str,
    portal_url: str,
) -> str:
    """Generate plain text for party nudge reminder email."""
    role_display = party_role.replace("_", " ").title()
    greeting = party_name if party_name else "Property Transaction Party"
    
    return f"""
REMINDER: Your Information is Still Needed

Dear {greeting},

This is a friendly reminder that we still need your information for a real estate transaction.

Property: {property_address}
Your Role: {role_display}

Please complete the secure form at your earliest convenience:
{portal_url}

Your prompt response helps ensure a smooth closing process.

If you have already completed this form, please disregard this email.

---
{BRAND_NAME} - {BRAND_TAGLINE}
"""


def send_party_nudge(
    to_email: str,
    party_name: str,
    party_role: str,
    property_address: str,
    portal_url: str,
    company_logo_url: Optional[str] = None,
    company_name: Optional[str] = None,
) -> EmailResult:
    """Send party nudge reminder email."""
    subject = f"Reminder: Your Information is Needed -- {property_address}"
    
    html_content = get_party_nudge_html(
        party_name=party_name,
        party_role=party_role,
        property_address=property_address,
        portal_url=portal_url,
        company_logo_url=company_logo_url,
        company_name=company_name,
    )
    
    text_content = get_party_nudge_text(
        party_name=party_name,
        party_role=party_role,
        property_address=property_address,
        portal_url=portal_url,
    )
    
    return send_email(to_email, subject, html_content, text_content)


# ============================================================================
# Legacy helper — kept for backward compatibility
# ============================================================================

def _build_company_logo_block(company_logo_url: Optional[str] = None) -> str:
    """Build a reusable company logo HTML block for email templates.
    
    NOTE: This is kept for backward compatibility only. All templates now
    use _build_email_wrapper() which handles logo display natively.
    """
    if not company_logo_url:
        return ""
    return f'''
            <div style="text-align: center; margin-bottom: 20px;">
                <img src="{company_logo_url}" alt="Company Logo" style="max-height: 60px; max-width: 200px; object-fit: contain;" />
            </div>'''

