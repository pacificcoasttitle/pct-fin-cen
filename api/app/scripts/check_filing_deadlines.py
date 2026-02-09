#!/usr/bin/env python3
"""
Check for approaching filing deadlines and send reminders.
Run daily via cron: 0 9 * * * python -m app.scripts.check_filing_deadlines

FinCEN requires reports to be filed within 30 days of closing.
This script sends reminders at 7, 3, and 1 day before deadline.
"""

import sys
import os
import logging
from datetime import datetime, timedelta

# Ensure app root is on path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.report import Report
from app.models.user import User
from app.models.notification_event import NotificationEvent
from app.services.email_service import send_email

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

REMINDER_DAYS = [7, 3, 1]
PORTAL_BASE_URL = os.getenv("PORTAL_BASE_URL", "https://fincenclear.com")


def get_property_address(report: Report) -> str:
    """Extract property address from wizard_data or text field."""
    if report.property_address_text:
        return report.property_address_text
    try:
        addr = (report.wizard_data or {}).get("collection", {}).get("propertyAddress", {})
        parts = [addr.get("street", ""), addr.get("city", ""), addr.get("state", "")]
        return ", ".join(p for p in parts if p) or "Unknown Property"
    except Exception:
        return "Unknown Property"


def send_deadline_reminder(
    report: Report,
    days_until: int,
    recipient_email: str,
    recipient_name: str,
):
    """Send deadline reminder email."""
    property_address = get_property_address(report)
    deadline_date = report.filing_deadline.strftime("%B %d, %Y") if report.filing_deadline else "Unknown"

    urgency = "⚠️" if days_until <= 3 else "📅"

    subject = f"{urgency} Filing Deadline in {days_until} day{'s' if days_until != 1 else ''} — {property_address}"

    html = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #0d9488, #0f766e); padding: 24px; border-radius: 12px 12px 0 0;">
            <h2 style="color: white; margin: 0; font-size: 20px;">Filing Deadline Approaching</h2>
        </div>
        
        <div style="padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="color: #374151; font-size: 16px;">Hi {recipient_name},</p>
            
            <p style="color: #374151;">Your FinCEN Real Estate Report for 
               <strong>{property_address}</strong> 
               is due in <strong>{days_until} day{'s' if days_until != 1 else ''}</strong>.</p>
            
            <div style="background: {'#fef2f2' if days_until <= 3 else '#fffbeb'}; 
                        border-left: 4px solid {'#dc2626' if days_until <= 3 else '#f59e0b'}; 
                        padding: 16px; margin: 20px 0; border-radius: 0 8px 8px 0;">
                <p style="margin: 0;"><strong>Filing Deadline:</strong> {deadline_date}</p>
                <p style="margin: 8px 0 0 0;"><strong>Current Status:</strong> {report.status.replace('_', ' ').title()}</p>
            </div>
            
            <div style="text-align: center; margin: 24px 0;">
                <a href="{PORTAL_BASE_URL}/app/reports/{report.id}/wizard" 
                   style="display: inline-block; background: linear-gradient(135deg, #0d9488, #0f766e); 
                          color: white; padding: 14px 32px; text-decoration: none; border-radius: 10px;
                          font-weight: 600; font-size: 16px;">
                    Complete Filing Now →
                </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
                FinCEN requires Real Estate Reports to be filed within 30 days of closing. 
                Late filings may result in penalties.
            </p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
            <p style="color: #9ca3af; font-size: 12px; text-align: center;">
                FinClear — Complete FinCEN Real Estate Reporting
            </p>
        </div>
    </div>
    """

    text_content = (
        f"Filing Deadline Reminder\n\n"
        f"Hi {recipient_name},\n\n"
        f"Your FinCEN Real Estate Report for {property_address} is due in {days_until} day(s).\n"
        f"Filing Deadline: {deadline_date}\n"
        f"Current Status: {report.status}\n\n"
        f"Complete your filing at: {PORTAL_BASE_URL}/app/reports/{report.id}/wizard\n\n"
        f"FinCEN requires reports to be filed within 30 days of closing.\n"
    )

    return send_email(recipient_email, subject, html, text_content)


def check_deadlines(db: Session) -> int:
    """Check all reports for approaching deadlines and send reminders."""
    today = datetime.utcnow().date()
    reminders_sent = 0

    for days in REMINDER_DAYS:
        target_date = today + timedelta(days=days)

        # Find reports with deadline on target date that aren't filed or exempt
        reports = db.query(Report).filter(
            Report.status.in_(["draft", "collecting", "ready_to_file", "determination_complete"]),
            Report.filing_deadline == target_date,
        ).all()

        logger.info(f"Found {len(reports)} reports with deadline in {days} days ({target_date})")

        for report in reports:
            # Check if we already sent this reminder today
            reminder_type = f"deadline_reminder_{days}d"
            existing = db.query(NotificationEvent).filter(
                NotificationEvent.report_id == report.id,
                NotificationEvent.type == reminder_type,
                NotificationEvent.created_at >= datetime.combine(today, datetime.min.time()),
            ).first()

            if existing:
                logger.debug(f"Already sent {days}-day reminder for report {report.id}")
                continue

            # Get recipient (report initiator or company admin)
            recipient = None
            if report.initiated_by_user_id:
                recipient = db.query(User).filter(User.id == report.initiated_by_user_id).first()

            if not recipient and report.created_by_user_id:
                recipient = db.query(User).filter(User.id == report.created_by_user_id).first()

            if not recipient and report.company_id:
                # Get company admin
                recipient = db.query(User).filter(
                    User.company_id == report.company_id,
                    User.role == "client_admin",
                ).first()

            if not recipient:
                logger.warning(f"No recipient found for report {report.id}")
                continue

            # Send reminder
            try:
                result = send_deadline_reminder(
                    report=report,
                    days_until=days,
                    recipient_email=recipient.email,
                    recipient_name=recipient.name or recipient.email,
                )

                # Log the notification using NotificationEvent's actual schema
                notification = NotificationEvent(
                    report_id=report.id,
                    type=reminder_type,
                    to_email=recipient.email,
                    subject=f"Filing Deadline in {days} day{'s' if days != 1 else ''}",
                    body_preview=f"FinCEN filing deadline for {get_property_address(report)} is in {days} day(s).",
                    delivery_status="sent" if result.success else "failed",
                    provider_message_id=result.message_id if result.success else None,
                    sent_at=datetime.utcnow() if result.success else None,
                    error_message=result.error if not result.success else None,
                    meta={
                        "days_until_deadline": days,
                        "deadline_date": str(target_date),
                        "recipient_name": recipient.name,
                    },
                )
                db.add(notification)

                reminders_sent += 1
                logger.info(f"Sent {days}-day reminder for report {report.id} to {recipient.email}")

            except Exception as e:
                logger.error(f"Failed to send reminder for report {report.id}: {e}")

    db.commit()
    return reminders_sent


def main():
    logger.info(f"=== Filing Deadline Check @ {datetime.utcnow().isoformat()} ===")

    db = SessionLocal()
    try:
        count = check_deadlines(db)
        logger.info(f"=== Complete: Sent {count} deadline reminders ===")
    except Exception as e:
        logger.error(f"Deadline check failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
