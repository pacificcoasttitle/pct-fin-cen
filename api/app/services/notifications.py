"""
Notification service for demo outbox.

This service logs notification events without sending actual emails.
Used for demo purposes to show what notifications WOULD be sent.
"""
from typing import Optional, List, Dict, Any
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.notification_event import NotificationEvent


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
    )
    
    db.add(notification)
    db.flush()
    
    return notification


def list_notifications(
    db: Session,
    limit: int = 50,
    report_id: Optional[UUID] = None,
    type_filter: Optional[str] = None,
) -> List[NotificationEvent]:
    """
    List notification events from the outbox.
    
    Args:
        db: Database session
        limit: Maximum number of events to return (default 50)
        report_id: Filter by report ID (optional)
        type_filter: Filter by notification type (optional)
    
    Returns:
        List of NotificationEvent instances, most recent first
    """
    query = db.query(NotificationEvent)
    
    if report_id:
        query = query.filter(NotificationEvent.report_id == report_id)
    
    if type_filter:
        query = query.filter(NotificationEvent.type == type_filter)
    
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
