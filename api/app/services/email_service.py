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
SENDGRID_FROM_EMAIL = os.getenv("SENDGRID_FROM_EMAIL", "noreply@fincenclear.com")
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
