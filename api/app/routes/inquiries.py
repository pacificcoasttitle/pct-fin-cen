"""
Inquiry handling routes.

Public endpoint for receiving client inquiries from the website.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime, timedelta
from collections import defaultdict
import logging

from app.services.email_service import send_email, BRAND_NAME

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/inquiries", tags=["inquiries"])

# Simple in-memory rate limit (resets on deploy)
_inquiry_timestamps: dict[str, list[datetime]] = defaultdict(list)
MAX_INQUIRIES_PER_EMAIL = 3  # per hour


class InquiryRequest(BaseModel):
    name: str
    email: EmailStr
    company: str
    phone: Optional[str] = None
    monthly_transactions: Optional[str] = None
    message: Optional[str] = None


def get_inquiry_notification_html(inquiry: InquiryRequest) -> str:
    """Generate HTML email for team notification."""
    
    message_section = ""
    if inquiry.message:
        message_section = f"""
            <div style="margin-top: 16px; padding: 16px; background: #f8fafc; border-radius: 6px;">
                <p style="color: #64748b; font-size: 13px; margin: 0 0 4px;">Message</p>
                <p style="font-size: 14px; margin: 0; white-space: pre-wrap;">{inquiry.message}</p>
            </div>
        """
    
    return f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1e293b; color: white; padding: 20px 24px; border-radius: 8px 8px 0 0;">
            <h2 style="margin: 0; font-size: 18px;">🔔 New Client Inquiry</h2>
        </div>
        <div style="border: 1px solid #e2e8f0; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 8px 0; color: #64748b; font-size: 14px; width: 160px;">Name</td>
                    <td style="padding: 8px 0; font-size: 14px; font-weight: 600;">{inquiry.name}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Email</td>
                    <td style="padding: 8px 0; font-size: 14px;">
                        <a href="mailto:{inquiry.email}" style="color: #2563eb;">{inquiry.email}</a>
                    </td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Company</td>
                    <td style="padding: 8px 0; font-size: 14px; font-weight: 600;">{inquiry.company}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Phone</td>
                    <td style="padding: 8px 0; font-size: 14px;">{inquiry.phone or '—'}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Est. Monthly Volume</td>
                    <td style="padding: 8px 0; font-size: 14px;">{inquiry.monthly_transactions or '—'}</td>
                </tr>
            </table>
            
            {message_section}
            
            <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
                <a href="mailto:{inquiry.email}?subject=Re: FinClear Inquiry from {inquiry.company}" 
                   style="display: inline-block; background: #2563eb; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 500;">
                    Reply to {inquiry.name.split()[0]}
                </a>
            </div>
        </div>
    </div>
    """


def get_inquiry_notification_text(inquiry: InquiryRequest) -> str:
    """Generate plain text email for team notification."""
    
    return f"""
New FinClear Inquiry

Name: {inquiry.name}
Email: {inquiry.email}
Company: {inquiry.company}
Phone: {inquiry.phone or 'Not provided'}
Monthly Transactions: {inquiry.monthly_transactions or 'Not provided'}

Message:
{inquiry.message or 'No message provided'}

---
Reply to this inquiry: mailto:{inquiry.email}
"""


def get_inquiry_confirmation_html(inquiry: InquiryRequest) -> str:
    """Generate HTML confirmation email for the inquirer."""
    
    first_name = inquiry.name.split()[0] if inquiry.name else "there"
    
    return f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="padding: 32px 24px;">
            <h2 style="color: #1e293b; margin: 0 0 16px;">Hi {first_name},</h2>
            <p style="color: #475569; font-size: 15px; line-height: 1.6;">
                Thank you for your interest in FinClear. We've received your inquiry 
                and a member of our team will be in touch within one business day.
            </p>
            <p style="color: #475569; font-size: 15px; line-height: 1.6;">
                In the meantime, if you have any questions, don't hesitate to reply 
                to this email or reach us at 
                <a href="mailto:clear@fincenclear.com" style="color: #2563eb;">clear@fincenclear.com</a>.
            </p>
            <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                <p style="color: #94a3b8; font-size: 13px; margin: 0;">
                    PCT FinCEN Solutions — A subsidiary of Pacific Coast Title Company<br>
                    <a href="https://www.fincenclear.com" style="color: #2563eb;">www.fincenclear.com</a>
                </p>
            </div>
        </div>
    </div>
    """


async def send_inquiry_notification(inquiry: InquiryRequest):
    """Send notification email to the team."""
    
    subject = f"New FinClear Inquiry: {inquiry.company}"
    
    html_content = get_inquiry_notification_html(inquiry)
    text_content = get_inquiry_notification_text(inquiry)
    
    result = send_email(
        to_email="clear@fincenclear.com",
        subject=subject,
        html_content=html_content,
        text_content=text_content,
    )
    
    if not result.success:
        logger.error(f"Failed to send inquiry notification: {result.error}")
        raise Exception(f"Email send failed: {result.error}")
    
    return result


async def send_inquiry_confirmation(inquiry: InquiryRequest):
    """Send confirmation email to the inquirer."""
    
    subject = f"We received your inquiry — {BRAND_NAME}"
    
    html_content = get_inquiry_confirmation_html(inquiry)
    
    result = send_email(
        to_email=inquiry.email,
        subject=subject,
        html_content=html_content,
    )
    
    if not result.success:
        logger.warning(f"Failed to send inquiry confirmation: {result.error}")
    
    return result


@router.post("")
async def submit_inquiry(inquiry: InquiryRequest):
    """
    Receive a client inquiry and send notification email to clear@fincenclear.com.
    No auth required — this is a public endpoint.
    """
    # Basic rate limit by email
    now = datetime.utcnow()
    hour_ago = now - timedelta(hours=1)
    
    # Clean old entries
    _inquiry_timestamps[inquiry.email] = [
        t for t in _inquiry_timestamps[inquiry.email] if t > hour_ago
    ]
    
    if len(_inquiry_timestamps[inquiry.email]) >= MAX_INQUIRIES_PER_EMAIL:
        logger.warning(f"Rate limited inquiry from {inquiry.email}")
        # Still return success — don't reveal rate limiting to potential abusers
        return {"success": True, "message": "Inquiry received"}
    
    _inquiry_timestamps[inquiry.email].append(now)
    
    try:
        # Send notification to the team
        await send_inquiry_notification(inquiry)
        
        # Send confirmation to the inquirer (optional - don't fail if this fails)
        try:
            await send_inquiry_confirmation(inquiry)
        except Exception as e:
            logger.warning(f"Failed to send confirmation email: {e}")
        
        logger.info(f"Inquiry received: {inquiry.company} ({inquiry.email})")
        
        return {"success": True, "message": "Inquiry received"}
    except Exception as e:
        logger.error(f"Failed to process inquiry: {e}")
        # Still return success to user — we don't want to lose the lead
        # Log the error for manual follow-up
        return {"success": True, "message": "Inquiry received"}
