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


def get_party_invite_html(
    party_name: str,
    party_role: str,
    property_address: str,
    portal_link: str,
    company_name: Optional[str] = None,
) -> str:
    """Generate HTML for party invitation email."""
    
    role_display = party_role.replace("_", " ").title()
    greeting = party_name if party_name else "Property Transaction Party"
    company_line = f" on behalf of {company_name}" if company_name else ""
    
    return f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Information Request</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; background-color: #f4f4f5;">
    
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                
                <!-- Main Container -->
                <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
                    
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 40px 40px 30px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">
                                Information Request
                            </h1>
                            <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0; font-size: 16px;">
                                FinCEN Real Estate Reporting Requirement
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Body -->
                    <tr>
                        <td style="padding: 40px;">
                            
                            <p style="margin: 0 0 20px; color: #374151; font-size: 16px;">
                                Dear {greeting},
                            </p>
                            
                            <p style="margin: 0 0 20px; color: #374151; font-size: 16px;">
                                You are receiving this email because you are listed as the <strong style="color: #1e40af;">{role_display}</strong> in a real estate transaction{company_line}.
                            </p>
                            
                            <!-- Property Card -->
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 25px 0;">
                                <tr>
                                    <td style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 20px; border-radius: 0 8px 8px 0;">
                                        <p style="margin: 0 0 5px; color: #1e40af; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                                            Property Address
                                        </p>
                                        <p style="margin: 0; color: #1e3a8a; font-size: 18px; font-weight: 600;">
                                            📍 {property_address}
                                        </p>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="margin: 0 0 25px; color: #374151; font-size: 16px;">
                                Under federal regulations, we are required to collect certain information from all parties involved in this transaction. This is a secure process and your information will only be used for compliance purposes.
                            </p>
                            
                            <!-- CTA Button -->
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 30px 0;">
                                <tr>
                                    <td align="center">
                                        <a href="{portal_link}" style="display: inline-block; background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(59, 130, 246, 0.4);">
                                            Complete Your Information →
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Warning Box -->
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 25px 0;">
                                <tr>
                                    <td style="background-color: #fef3c7; border: 1px solid #fbbf24; padding: 16px 20px; border-radius: 8px;">
                                        <p style="margin: 0; color: #92400e; font-size: 14px;">
                                            <strong>⏰ Time Sensitive:</strong> Please complete this form within <strong>7 days</strong>. The secure link will expire after that time.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- FAQ Section -->
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 30px 0 0; border-top: 1px solid #e5e7eb; padding-top: 25px;">
                                <tr>
                                    <td>
                                        <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px;">
                                            <strong style="color: #374151;">Why am I receiving this?</strong><br>
                                            The Financial Crimes Enforcement Network (FinCEN) requires reporting on certain real estate transactions to prevent money laundering.
                                        </p>
                                        <p style="margin: 15px 0 0; color: #6b7280; font-size: 14px;">
                                            <strong style="color: #374151;">Is this legitimate?</strong><br>
                                            Yes. This request is part of the legal compliance process for your real estate transaction. If you have concerns, please contact your title company representative.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                            
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #1e293b; padding: 25px 40px; text-align: center;">
                            <p style="margin: 0 0 10px; color: #94a3b8; font-size: 12px;">
                                Powered by {BRAND_NAME} • {BRAND_TAGLINE}
                            </p>
                            <p style="margin: 0; color: #64748b; font-size: 11px;">
                                Please do not reply directly to this email. If you need assistance, contact your title company.
                            </p>
                        </td>
                    </tr>
                    
                </table>
                
            </td>
        </tr>
    </table>
    
</body>
</html>
"""


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
INFORMATION REQUEST - FinCEN Real Estate Reporting

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
"""


def get_confirmation_html(
    party_name: str,
    confirmation_id: str,
    property_address: str,
) -> str:
    """Generate HTML for submission confirmation email."""
    
    greeting = party_name if party_name else "Valued Party"
    
    return f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Submission Confirmed</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; background-color: #f4f4f5;">
    
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                
                <!-- Main Container -->
                <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
                    
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 40px; text-align: center;">
                            <div style="width: 70px; height: 70px; background-color: rgba(255, 255, 255, 0.2); border-radius: 50%; margin: 0 auto 20px; line-height: 70px;">
                                <span style="font-size: 36px;">✓</span>
                            </div>
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">
                                Information Received
                            </h1>
                            <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0; font-size: 16px;">
                                Thank you for your submission
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Body -->
                    <tr>
                        <td style="padding: 40px;">
                            
                            <p style="margin: 0 0 20px; color: #374151; font-size: 16px;">
                                Dear {greeting},
                            </p>
                            
                            <p style="margin: 0 0 20px; color: #374151; font-size: 16px;">
                                We have successfully received your information for the real estate transaction at:
                            </p>
                            
                            <!-- Property Card -->
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 20px 0;">
                                <tr>
                                    <td style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 16px 20px; border-radius: 0 8px 8px 0;">
                                        <p style="margin: 0; color: #065f46; font-size: 16px; font-weight: 600;">
                                            📍 {property_address}
                                        </p>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Confirmation ID Box -->
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 30px 0;">
                                <tr>
                                    <td style="background-color: #f0fdf4; border: 2px solid #86efac; padding: 25px; border-radius: 12px; text-align: center;">
                                        <p style="margin: 0 0 8px; color: #166534; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                                            Your Confirmation ID
                                        </p>
                                        <p style="margin: 0; color: #15803d; font-size: 28px; font-weight: 700; font-family: 'SF Mono', Monaco, 'Courier New', monospace; letter-spacing: 2px;">
                                            {confirmation_id}
                                        </p>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="margin: 0 0 15px; color: #374151; font-size: 16px;">
                                <strong>Please save this confirmation ID for your records.</strong>
                            </p>
                            
                            <p style="margin: 0; color: #6b7280; font-size: 15px;">
                                No further action is required from you at this time. If you have any questions about the transaction, please contact your title company representative.
                            </p>
                            
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #1e293b; padding: 25px 40px; text-align: center;">
                            <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                                Powered by {BRAND_NAME} • {BRAND_TAGLINE}
                            </p>
                        </td>
                    </tr>
                    
                </table>
                
            </td>
        </tr>
    </table>
    
</body>
</html>
"""


def get_confirmation_text(
    party_name: str,
    confirmation_id: str,
    property_address: str,
) -> str:
    """Generate plain text for submission confirmation email."""
    
    greeting = party_name if party_name else "Valued Party"
    
    return f"""
SUBMISSION CONFIRMED

Dear {greeting},

We have successfully received your information for the real estate transaction at:

{property_address}

YOUR CONFIRMATION ID: {confirmation_id}

Please save this confirmation ID for your records.

No further action is required from you at this time. If you have any questions about the transaction, please contact your title company representative.

---

Powered by {BRAND_NAME} • {BRAND_TAGLINE}
"""


def send_party_invite(
    to_email: str,
    party_name: str,
    party_role: str,
    property_address: str,
    portal_link: str,
    company_name: Optional[str] = None,
) -> EmailResult:
    """
    Send party invitation email.
    
    Args:
        to_email: Recipient email address
        party_name: Name of the party (buyer/seller/etc)
        party_role: Role in transaction (buyer, seller, beneficial_owner)
        property_address: Full property address string
        portal_link: Complete URL to party portal
        company_name: Optional title company name
    
    Returns:
        EmailResult with success status and message_id
    """
    subject = "Action Required: Information Needed for Real Estate Transaction"
    
    html_content = get_party_invite_html(
        party_name=party_name,
        party_role=party_role,
        property_address=property_address,
        portal_link=portal_link,
        company_name=company_name,
    )
    
    text_content = get_party_invite_text(
        party_name=party_name,
        party_role=party_role,
        property_address=property_address,
        portal_link=portal_link,
    )
    
    return send_email(to_email, subject, html_content, text_content)


def get_invoice_email_html(
    company_name: str,
    invoice_number: str,
    total_dollars: float,
    due_date: str,
    period_start: str,
    period_end: str,
    view_link: str,
) -> str:
    """Generate HTML for invoice email."""
    
    return f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice {invoice_number}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; background-color: #f4f4f5;">
    
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                
                <!-- Main Container -->
                <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
                    
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 40px 40px 30px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">
                                Invoice Ready
                            </h1>
                            <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0; font-size: 16px;">
                                {invoice_number}
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Body -->
                    <tr>
                        <td style="padding: 40px;">
                            
                            <p style="margin: 0 0 20px; color: #374151; font-size: 16px;">
                                Dear {company_name},
                            </p>
                            
                            <p style="margin: 0 0 20px; color: #374151; font-size: 16px;">
                                Your invoice for FinCEN filing services is now available.
                            </p>
                            
                            <!-- Invoice Summary Card -->
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 25px 0;">
                                <tr>
                                    <td style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 20px; border-radius: 0 8px 8px 0;">
                                        <table width="100%" cellspacing="0" cellpadding="0">
                                            <tr>
                                                <td style="padding: 8px 0;">
                                                    <span style="color: #6b7280; font-size: 14px;">Invoice Number:</span>
                                                    <span style="color: #1e3a8a; font-size: 14px; font-weight: 600; float: right; font-family: monospace;">{invoice_number}</span>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0;">
                                                    <span style="color: #6b7280; font-size: 14px;">Billing Period:</span>
                                                    <span style="color: #1e3a8a; font-size: 14px; font-weight: 500; float: right;">{period_start} - {period_end}</span>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; border-top: 1px solid #bfdbfe;">
                                                    <span style="color: #6b7280; font-size: 14px;">Due Date:</span>
                                                    <span style="color: #1e3a8a; font-size: 14px; font-weight: 600; float: right;">{due_date}</span>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 12px 0; border-top: 2px solid #3b82f6;">
                                                    <span style="color: #1e3a8a; font-size: 16px; font-weight: 600;">Amount Due:</span>
                                                    <span style="color: #1e40af; font-size: 24px; font-weight: 700; float: right;">${total_dollars:,.2f}</span>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- CTA Button -->
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 30px 0;">
                                <tr>
                                    <td align="center">
                                        <a href="{view_link}" style="display: inline-block; background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(59, 130, 246, 0.4);">
                                            View Invoice →
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Payment Info Box -->
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 25px 0;">
                                <tr>
                                    <td style="background-color: #f0fdf4; border: 1px solid #86efac; padding: 16px 20px; border-radius: 8px;">
                                        <p style="margin: 0 0 8px; color: #166534; font-size: 14px; font-weight: 600;">
                                            Payment Options:
                                        </p>
                                        <p style="margin: 0; color: #15803d; font-size: 14px;">
                                            ACH Transfer • Wire Transfer • Check<br>
                                            <span style="font-size: 12px; color: #4ade80;">Please reference invoice number with your payment.</span>
                                        </p>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="margin: 25px 0 0; color: #6b7280; font-size: 14px;">
                                If you have any questions about this invoice, please contact our billing team.
                            </p>
                            
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #1e293b; padding: 25px 40px; text-align: center;">
                            <p style="margin: 0 0 10px; color: #94a3b8; font-size: 12px;">
                                Powered by {BRAND_NAME} • {BRAND_TAGLINE}
                            </p>
                            <p style="margin: 0; color: #64748b; font-size: 11px;">
                                Questions? Contact billing@pctitle.com
                            </p>
                        </td>
                    </tr>
                    
                </table>
                
            </td>
        </tr>
    </table>
    
</body>
</html>
"""


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
INVOICE READY - {invoice_number}

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
• ACH Transfer
• Wire Transfer
• Check

Please reference invoice number {invoice_number} with your payment.

---

Questions? Contact billing@pctitle.com

Powered by {BRAND_NAME} • {BRAND_TAGLINE}
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
) -> EmailResult:
    """
    Send invoice email to company billing contact.
    
    Args:
        to_email: Recipient email address
        company_name: Company name
        invoice_number: Invoice number (e.g., INV-2026-02-0001)
        total_dollars: Total amount in dollars
        due_date: Formatted due date string
        period_start: Formatted period start date
        period_end: Formatted period end date
        view_link: Link to view invoice online
    
    Returns:
        EmailResult with success status and message_id
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


def send_party_confirmation(
    to_email: str,
    party_name: str,
    confirmation_id: str,
    property_address: str,
) -> EmailResult:
    """
    Send submission confirmation email.
    
    Args:
        to_email: Recipient email address
        party_name: Name of the party
        confirmation_id: Generated confirmation ID
        property_address: Full property address string
    
    Returns:
        EmailResult with success status and message_id
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


def send_party_submitted_notification(
    staff_email: str,
    party_name: str,
    party_role: str,
    property_address: str,
    report_id: str,
    all_complete: bool = False,
) -> EmailResult:
    """
    Notify staff when a party submits their portal form.
    
    Args:
        staff_email: Staff member's email address
        party_name: Name of the party who submitted
        party_role: Role (transferee/transferor)
        property_address: Property address for context
        report_id: Report ID for linking to admin UI
        all_complete: If true, ALL parties for this report are now submitted
    
    Returns:
        EmailResult with success status and message_id
    """
    role_display = "Buyer" if party_role == "transferee" else "Seller"
    
    if all_complete:
        subject = f"✅ All Parties Complete — Ready for Review: {property_address}"
    else:
        subject = f"Party Submitted: {party_name} ({role_display})"
    
    # HTML email content
    html_content = f'''
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.5; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; border-radius: 12px 12px 0 0;">
            <h1 style="color: #fff; margin: 0; font-size: 24px;">
                {"✅ All Parties Complete" if all_complete else "Party Submitted"}
            </h1>
        </div>
        
        <div style="background: #fff; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="font-size: 16px; margin-bottom: 20px;">
                <strong>{party_name}</strong> ({role_display}) has submitted their information for:
            </p>
            
            <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <p style="margin: 0; font-weight: 600;">{property_address}</p>
            </div>
            
            {"<p style='color: #059669; font-weight: 600;'>🎉 All parties have now submitted. This report is ready for review and filing.</p>" if all_complete else ""}
            
            <a href="https://fincenclear.com/app/staff/requests/{report_id}" 
               style="display: inline-block; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 10px;">
                View Report →
            </a>
        </div>
        
        <div style="text-align: center; padding: 20px; color: #64748b; font-size: 12px;">
            <p>FinClear Solutions — Automated notification</p>
        </div>
    </body>
    </html>
    '''
    
    # Plain text version
    text_content = f'''
Party Submitted: {party_name}

{party_name} ({role_display}) has submitted their information for:
{property_address}

{"✅ ALL PARTIES COMPLETE — Ready for review and filing." if all_complete else ""}

View the report: https://fincenclear.com/app/staff/requests/{report_id}

---
FinClear Solutions — Automated notification
    '''
    
    return send_email(staff_email, subject, html_content, text_content)


# ============================================================================
# FILING STATUS NOTIFICATIONS (Client-Driven Flow)
# ============================================================================

def send_filing_submitted_notification(
    to_email: str,
    recipient_name: str,
    property_address: str,
    report_url: str,
) -> EmailResult:
    """
    Notify when filing is submitted to FinCEN (pending acceptance).
    """
    from datetime import datetime
    submitted_at = datetime.utcnow()
    
    subject = f"Filing Submitted to FinCEN: {property_address}"
    
    html_content = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5;">
        <table width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5;">
            <tr>
                <td align="center" style="padding: 40px 20px;">
                    <table width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden;">
                        <tr>
                            <td style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px; text-align: center;">
                                <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Filing Submitted to FinCEN</h1>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 30px;">
                                <p style="margin: 0 0 20px; color: #374151; font-size: 16px;">
                                    Hi {recipient_name},
                                </p>
                                <p style="margin: 0 0 20px; color: #374151; font-size: 16px;">
                                    Your FinCEN Real Estate Report has been submitted for processing.
                                </p>
                                <div style="background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 16px; margin: 20px 0; border-radius: 0 8px 8px 0;">
                                    <p style="margin: 0 0 8px; color: #1e3a8a;"><strong>Property:</strong> {property_address}</p>
                                    <p style="margin: 0 0 8px; color: #1e3a8a;"><strong>Submitted:</strong> {submitted_at.strftime('%B %d, %Y at %I:%M %p')} UTC</p>
                                    <p style="margin: 0; color: #1e3a8a;"><strong>Status:</strong> Awaiting FinCEN Response</p>
                                </div>
                                <p style="margin: 0 0 20px; color: #374151; font-size: 16px;">
                                    You'll receive another email once FinCEN processes your filing (typically within 24-48 hours).
                                </p>
                                <table width="100%" cellspacing="0" cellpadding="0" style="margin: 20px 0;">
                                    <tr>
                                        <td align="center">
                                            <a href="{report_url}" style="display: inline-block; background: #2563eb; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600;">
                                                View Report Status →
                                            </a>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        <tr>
                            <td style="background: #1e293b; padding: 20px; text-align: center;">
                                <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                                    {BRAND_NAME} — {BRAND_TAGLINE}
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """
    
    return send_email(to_email, subject, html_content)


def send_filing_accepted_notification(
    to_email: str,
    recipient_name: str,
    property_address: str,
    bsa_id: str,
    filed_at_str: str,
    report_url: str,
) -> EmailResult:
    """
    Notify when filing is accepted by FinCEN with BSA ID.
    """
    subject = f"✅ FinCEN Filing Complete: {property_address}"
    
    html_content = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5;">
        <table width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5;">
            <tr>
                <td align="center" style="padding: 40px 20px;">
                    <table width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden;">
                        <tr>
                            <td style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 30px; text-align: center;">
                                <h1 style="color: #ffffff; margin: 0; font-size: 24px;">✅ FinCEN Filing Complete</h1>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 30px;">
                                <p style="margin: 0 0 20px; color: #374151; font-size: 16px;">
                                    Hi {recipient_name},
                                </p>
                                <p style="margin: 0 0 20px; color: #374151; font-size: 16px;">
                                    Great news! Your FinCEN Real Estate Report has been accepted.
                                </p>
                                <div style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 16px; margin: 20px 0; border-radius: 0 8px 8px 0;">
                                    <p style="margin: 0 0 8px; color: #065f46;"><strong>Property:</strong> {property_address}</p>
                                    <p style="margin: 0 0 8px; color: #065f46;"><strong>BSA ID:</strong> <code style="background: #d1fae5; padding: 2px 8px; border-radius: 4px; font-family: monospace;">{bsa_id}</code></p>
                                    <p style="margin: 0; color: #065f46;"><strong>Filed:</strong> {filed_at_str}</p>
                                </div>
                                <p style="margin: 0 0 20px; color: #374151; font-size: 16px; font-weight: 600;">
                                    ⚠️ Save this BSA ID for your records. This is your official FinCEN receipt number.
                                </p>
                                <table width="100%" cellspacing="0" cellpadding="0" style="margin: 20px 0;">
                                    <tr>
                                        <td align="center">
                                            <a href="{report_url}" style="display: inline-block; background: #059669; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600;">
                                                View Filing Details →
                                            </a>
                                        </td>
                                    </tr>
                                </table>
                                <p style="margin: 20px 0 0; color: #6b7280; font-size: 14px;">
                                    This filing will be stored securely for 5 years per FinCEN requirements.
                                </p>
                            </td>
                        </tr>
                        <tr>
                            <td style="background: #1e293b; padding: 20px; text-align: center;">
                                <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                                    {BRAND_NAME} — {BRAND_TAGLINE}
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """
    
    return send_email(to_email, subject, html_content)


def send_filing_rejected_notification(
    to_email: str,
    recipient_name: str,
    property_address: str,
    rejection_code: str,
    rejection_message: str,
    report_url: str,
) -> EmailResult:
    """
    Notify when filing is rejected by FinCEN — URGENT.
    """
    subject = f"⚠️ Action Required: FinCEN Filing Rejected — {property_address}"
    
    html_content = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5;">
        <table width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5;">
            <tr>
                <td align="center" style="padding: 40px 20px;">
                    <table width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden;">
                        <tr>
                            <td style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); padding: 30px; text-align: center;">
                                <h1 style="color: #ffffff; margin: 0; font-size: 24px;">⚠️ Filing Rejected</h1>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 30px;">
                                <p style="margin: 0 0 20px; color: #374151; font-size: 16px;">
                                    Hi {recipient_name},
                                </p>
                                <p style="margin: 0 0 20px; color: #374151; font-size: 16px;">
                                    Your FinCEN Real Estate Report was rejected and requires attention.
                                </p>
                                <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 20px 0; border-radius: 0 8px 8px 0;">
                                    <p style="margin: 0 0 8px; color: #991b1b;"><strong>Property:</strong> {property_address}</p>
                                    <p style="margin: 0 0 8px; color: #991b1b;"><strong>Error Code:</strong> <code style="background: #fee2e2; padding: 2px 8px; border-radius: 4px;">{rejection_code}</code></p>
                                    <p style="margin: 0; color: #991b1b;"><strong>Reason:</strong> {rejection_message}</p>
                                </div>
                                <p style="margin: 20px 0; color: #374151; font-size: 16px; font-weight: 600;">
                                    What to do:
                                </p>
                                <ol style="margin: 0 0 20px; color: #374151; font-size: 15px; padding-left: 20px;">
                                    <li style="margin-bottom: 8px;">Review the error details above</li>
                                    <li style="margin-bottom: 8px;">Correct the information in the report</li>
                                    <li>Re-submit the filing</li>
                                </ol>
                                <table width="100%" cellspacing="0" cellpadding="0" style="margin: 20px 0;">
                                    <tr>
                                        <td align="center">
                                            <a href="{report_url}" style="display: inline-block; background: #dc2626; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600;">
                                                Fix and Resubmit →
                                            </a>
                                        </td>
                                    </tr>
                                </table>
                                <p style="margin: 20px 0 0; color: #6b7280; font-size: 14px;">
                                    Need help? Contact {BRAND_SUPPORT_EMAIL}
                                </p>
                            </td>
                        </tr>
                        <tr>
                            <td style="background: #1e293b; padding: 20px; text-align: center;">
                                <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                                    {BRAND_NAME} — {BRAND_TAGLINE}
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """
    
    return send_email(to_email, subject, html_content)


def send_filing_needs_review_notification(
    to_email: str,
    recipient_name: str,
    property_address: str,
    reason: str,
    report_url: str,
) -> EmailResult:
    """
    Notify when filing needs manual review.
    """
    subject = f"Review Required: FinCEN Filing — {property_address}"
    
    html_content = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5;">
        <table width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5;">
            <tr>
                <td align="center" style="padding: 40px 20px;">
                    <table width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden;">
                        <tr>
                            <td style="background: linear-gradient(135deg, #d97706 0%, #f59e0b 100%); padding: 30px; text-align: center;">
                                <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Review Required</h1>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 30px;">
                                <p style="margin: 0 0 20px; color: #374151; font-size: 16px;">
                                    Hi {recipient_name},
                                </p>
                                <p style="margin: 0 0 20px; color: #374151; font-size: 16px;">
                                    Your FinCEN Real Estate Report requires review before it can be filed.
                                </p>
                                <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0; border-radius: 0 8px 8px 0;">
                                    <p style="margin: 0 0 8px; color: #92400e;"><strong>Property:</strong> {property_address}</p>
                                    <p style="margin: 0; color: #92400e;"><strong>Reason:</strong> {reason}</p>
                                </div>
                                <table width="100%" cellspacing="0" cellpadding="0" style="margin: 20px 0;">
                                    <tr>
                                        <td align="center">
                                            <a href="{report_url}" style="display: inline-block; background: #d97706; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600;">
                                                Review Report →
                                            </a>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        <tr>
                            <td style="background: #1e293b; padding: 20px; text-align: center;">
                                <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                                    {BRAND_NAME} — {BRAND_TAGLINE}
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """
    
    return send_email(to_email, subject, html_content)
