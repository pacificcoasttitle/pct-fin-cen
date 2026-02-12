#!/usr/bin/env python3
"""
Nudge unresponsive parties who haven't submitted after 7 days.
Run daily via cron: 0 9 * * * python -m app.scripts.nudge_unresponsive_parties

Sends a friendly reminder email to parties whose portal links
have been active for more than 7 days without submission.
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
from app.models.party import ReportParty
from app.models.party_link import PartyLink
from app.models.notification_event import NotificationEvent
from app.services.email_service import send_party_nudge

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

NUDGE_AFTER_DAYS = 7
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://fincenclear.com")


def get_property_address(report: Report) -> str:
    """Extract property address from report."""
    if report.property_address_text:
        return report.property_address_text
    try:
        addr = (report.wizard_data or {}).get("collection", {}).get("propertyAddress", {})
        parts = [addr.get("street", ""), addr.get("city", ""), addr.get("state", "")]
        return ", ".join(p for p in parts if p) or "Unknown Property"
    except Exception:
        return "Unknown Property"


def nudge_parties(db: Session) -> int:
    """Find unresponsive parties and send nudge emails."""
    now = datetime.utcnow()
    cutoff = now - timedelta(days=NUDGE_AFTER_DAYS)
    nudges_sent = 0

    # Find parties that:
    # 1. Status is NOT "submitted" or "verified"
    # 2. Were created more than 7 days ago
    # 3. Have an active portal link
    # 4. Report is still in "collecting" status
    parties = db.query(ReportParty).join(
        Report, Report.id == ReportParty.report_id
    ).filter(
        ReportParty.status.in_(["pending", "in_progress"]),
        ReportParty.created_at < cutoff,
        Report.status == "collecting",
    ).all()

    logger.info(f"Found {len(parties)} unresponsive parties (created before {cutoff.isoformat()})")

    for party in parties:
        # Check if we already sent a nudge for this party
        existing_nudge = db.query(NotificationEvent).filter(
            NotificationEvent.report_id == party.report_id,
            NotificationEvent.party_id == party.id,
            NotificationEvent.type == "party_nudge",
        ).first()

        if existing_nudge:
            logger.debug(f"Already nudged party {party.id} — skipping")
            continue

        # Get party email
        party_data = party.party_data or {}
        party_email = party_data.get("email")
        if not party_email:
            logger.debug(f"Party {party.id} has no email — skipping")
            continue

        # Get active link for portal URL
        active_link = db.query(PartyLink).filter(
            PartyLink.report_party_id == party.id,
            PartyLink.status == "active",
            PartyLink.expires_at > now,
        ).first()

        if not active_link:
            logger.debug(f"Party {party.id} has no active link — skipping")
            continue

        # Get report details
        report = db.query(Report).filter(Report.id == party.report_id).first()
        if not report:
            continue

        property_address = get_property_address(report)
        portal_url = f"{FRONTEND_URL}/p/{active_link.token}"

        # Generate company logo URL and name for party-facing branding
        company_logo_url = None
        company_name = None
        if report.company_id:
            try:
                from app.models.company import Company
                from app.services.storage import storage_service as r2_storage
                company = db.query(Company).filter(Company.id == report.company_id).first()
                if company:
                    company_name = company.name
                    if company.logo_url:
                        company_logo_url = r2_storage.generate_download_url(
                            key=company.logo_url,
                            expires_in=604800,
                        )
            except Exception as e:
                logger.warning(f"Could not generate logo URL: {e}")

        # Send nudge (party-facing — uses company branding)
        try:
            result = send_party_nudge(
                to_email=party_email,
                party_name=party.display_name or "",
                party_role=party.party_role or "party",
                property_address=property_address,
                portal_url=portal_url,
                company_logo_url=company_logo_url,
                company_name=company_name,
            )

            # Log notification event
            notification = NotificationEvent(
                report_id=party.report_id,
                party_id=party.id,
                type="party_nudge",
                to_email=party_email,
                subject=f"Reminder: Your Information is Needed — {property_address}",
                body_preview=f"Friendly reminder: we still need your information for {property_address}.",
                delivery_status="sent" if result.success else "failed",
                provider_message_id=result.message_id if result.success else None,
                sent_at=datetime.utcnow() if result.success else None,
                error_message=result.error if not result.success else None,
                meta={
                    "party_name": party.display_name,
                    "party_role": party.party_role,
                    "days_since_created": (now - party.created_at).days if party.created_at else NUDGE_AFTER_DAYS,
                },
            )
            db.add(notification)

            nudges_sent += 1
            logger.info(f"Sent nudge to {party_email} for party {party.id} (report {party.report_id})")

        except Exception as e:
            logger.error(f"Failed to nudge party {party.id}: {e}")

    db.commit()
    return nudges_sent


def main():
    logger.info(f"=== Party Nudge Check @ {datetime.utcnow().isoformat()} ===")
    logger.info(f"Nudge threshold: {NUDGE_AFTER_DAYS} days without submission")

    db = SessionLocal()
    try:
        count = nudge_parties(db)
        logger.info(f"=== Complete: Sent {count} party nudge reminders ===")
    except Exception as e:
        logger.error(f"Party nudge check failed: {e}")
        raise
    finally:
        db.close()

    # Reminder for cron setup
    logger.info("NOTE: Add to Render cron: 0 9 * * * python -m app.scripts.nudge_unresponsive_parties")


if __name__ == "__main__":
    main()
