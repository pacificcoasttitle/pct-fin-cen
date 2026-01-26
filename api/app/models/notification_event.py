"""
NotificationEvent model - tracks all notification events for demo outbox.

This is a demo-only feature for the notification outbox.
No actual emails are sent; this records what WOULD be sent.
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base
from app.db_types import JSONBType


class NotificationEvent(Base):
    """
    A notification event record (demo outbox).
    
    Types:
    - party_invite: When party invite links are generated
    - party_submitted: When a party submits their portal info
    - internal_alert: Internal alerts (e.g., deadline approaching)
    - filing_receipt: Filing confirmation receipts
    """
    __tablename__ = "notification_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    
    # Report association (optional)
    report_id = Column(
        UUID(as_uuid=True),
        ForeignKey("reports.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    
    # Party association (optional - can use party_id or party_token)
    party_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    party_token = Column(String(100), nullable=True, index=True)
    
    # Notification type
    type = Column(
        String(50),
        nullable=False,
        index=True,
        comment="party_invite, party_submitted, internal_alert, filing_receipt"
    )
    
    # Email content (what would be sent)
    to_email = Column(String(255), nullable=True)
    subject = Column(String(500), nullable=True)
    body_preview = Column(Text, nullable=True, comment="Max 500 chars preview of body")
    
    # Additional metadata (links, receipt_id, etc.)
    meta = Column(JSONBType, nullable=True, default=dict)

    def __repr__(self):
        return f"<NotificationEvent {self.id} type={self.type}>"
    
    def to_dict(self):
        """Convert to dictionary for API response."""
        return {
            "id": str(self.id),
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "report_id": str(self.report_id) if self.report_id else None,
            "party_id": str(self.party_id) if self.party_id else None,
            "party_token": self.party_token,
            "type": self.type,
            "to_email": self.to_email,
            "subject": self.subject,
            "body_preview": self.body_preview,
            "meta": self.meta or {},
        }
