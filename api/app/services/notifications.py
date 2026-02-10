"""
Notification service for email outbox and delivery.

Handles logging notifications to outbox and triggering email delivery via SendGrid.
All emails are logged to NotificationEvent first, then sent.
"""
import logging
from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.notification_event import NotificationEvent
from app.services.email_service import (
    send_party_invite,
    send_party_confirmation,
    EmailResult,
    SENDGRID_ENABLED,
    FRONTEND_URL,
)

logger = logging.getLogger(__name__)


def log_notification(
    db: Session,
    type: str,
    report_id: Optional[UUID] = None,
    party_id: Optional[UUID] = None,
    party_token: Optional[str] = None,
    to_email: Optional[str] = None,
    subject: Optional[str] = None,
    body_preview: Optional[str] = None,
    meta: Optional[Dict[str, Any]] = None,
) -> NotificationEvent:
    """
    Log a notification event to the outbox.
    
    Args:
        db: Database session
        type: Notification type (party_invite, party_submitted, internal_alert, filing_receipt)
        report_id: Associated report ID (optional)
        party_id: Associated party ID (optional)
        party_token: Associated party token (optional)
        to_email: Recipient email (optional)
        subject: Email subject (optional)
        body_preview: Preview of email body, max 500 chars (optional)
        meta: Additional metadata as JSON (optional)
    
    Returns:
        Created NotificationEvent instance
    """
    # Truncate body_preview to 500 chars if needed
    if body_preview and len(body_preview) > 500:
        body_preview = body_preview[:497] + "..."
    
    notification = NotificationEvent(
        type=type,
        report_id=report_id,
        party_id=party_id,
        party_token=party_token,
        to_email=to_email,
        subject=subject,
        body_preview=body_preview,
        meta=meta or {},
        delivery_status="pending",
    )
    
    db.add(notification)
    db.flush()
    
    logger.info(f"Logged notification: id={notification.id} type={type} to={to_email}")
    
    return notification


def update_notification_delivery(
    db: Session,
    notification_id: UUID,
    result: EmailResult,
) -> None:
    """Update notification with delivery result."""
    notification = db.query(NotificationEvent).filter(
        NotificationEvent.id == notification_id
    ).first()
    
    if notification:
        if result.success:
            notification.delivery_status = "sent" if result.message_id != "disabled-mode" else "disabled"
            notification.provider_message_id = result.message_id
            notification.sent_at = datetime.utcnow()
        else:
            notification.delivery_status = "failed"
            notification.error_message = result.error
        
        db.flush()


def send_party_invite_notification(
    db: Session,
    report_id: UUID,
    party_id: UUID,
    party_token: str,
    to_email: str,
    party_name: str,
    party_role: str,
    property_address: str,
    portal_link: str,
    company_name: Optional[str] = None,
    company_logo_url: Optional[str] = None,
) -> NotificationEvent:
    """
    Log and send party invitation email.
    
    1. Creates outbox record
    2. Sends email via SendGrid
    3. Updates delivery status
    """
    # 1. Log to outbox first
    notification = log_notification(
        db=db,
        type="party_invite",
        to_email=to_email,
        subject="Action Required: Information Needed for Real Estate Transaction",
        body_preview=f"Information request for {property_address}. Role: {party_role}",
        report_id=report_id,
        party_id=party_id,
        party_token=party_token,
        meta={
            "party_name": party_name,
            "party_role": party_role,
            "property_address": property_address,
            "portal_link": portal_link,
        },
    )
    
    # 2. Send email
    result = send_party_invite(
        to_email=to_email,
        party_name=party_name,
        party_role=party_role,
        property_address=property_address,
        portal_link=portal_link,
        company_name=company_name,
        company_logo_url=company_logo_url,
    )
    
    # 3. Update delivery status
    update_notification_delivery(db, notification.id, result)
    
    return notification


def send_party_confirmation_notification(
    db: Session,
    report_id: UUID,
    party_id: UUID,
    to_email: str,
    party_name: str,
    confirmation_id: str,
    property_address: str,
) -> NotificationEvent:
    """
    Log and send party submission confirmation email.
    """
    # 1. Log to outbox
    notification = log_notification(
        db=db,
        type="party_submitted",
        to_email=to_email,
        subject="Confirmed: Your Information Has Been Received",
        body_preview=f"Confirmation ID: {confirmation_id}",
        report_id=report_id,
        party_id=party_id,
        meta={
            "party_name": party_name,
            "confirmation_id": confirmation_id,
            "property_address": property_address,
        },
    )
    
    # 2. Send email
    result = send_party_confirmation(
        to_email=to_email,
        party_name=party_name,
        confirmation_id=confirmation_id,
        property_address=property_address,
    )
    
    # 3. Update delivery status
    update_notification_delivery(db, notification.id, result)
    
    return notification


def list_notifications(
    db: Session,
    limit: int = 50,
    report_id: Optional[UUID] = None,
    type_filter: Optional[str] = None,
    delivery_status: Optional[str] = None,
) -> List[NotificationEvent]:
    """
    List notification events from the outbox.
    
    Args:
        db: Database session
        limit: Maximum number of events to return (default 50)
        report_id: Filter by report ID (optional)
        type_filter: Filter by notification type (optional)
        delivery_status: Filter by delivery status (optional)
    
    Returns:
        List of NotificationEvent instances, most recent first
    """
    query = db.query(NotificationEvent)
    
    if report_id:
        query = query.filter(NotificationEvent.report_id == report_id)
    
    if type_filter:
        query = query.filter(NotificationEvent.type == type_filter)
    
    if delivery_status:
        query = query.filter(NotificationEvent.delivery_status == delivery_status)
    
    query = query.order_by(desc(NotificationEvent.created_at))
    query = query.limit(limit)
    
    return query.all()


def get_notification(db: Session, notification_id: UUID) -> Optional[NotificationEvent]:
    """
    Get a single notification event by ID.
    
    Args:
        db: Database session
        notification_id: The notification event ID
    
    Returns:
        NotificationEvent instance or None if not found
    """
    return db.query(NotificationEvent).filter(NotificationEvent.id == notification_id).first()


def delete_all_notifications(db: Session) -> int:
    """
    Delete all notification events (used in demo reset).
    
    Args:
        db: Database session
    
    Returns:
        Number of deleted records
    """
    count = db.query(NotificationEvent).delete()
    return count
