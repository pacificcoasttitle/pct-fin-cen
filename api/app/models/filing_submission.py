"""
FilingSubmission model - tracks filing lifecycle and submission attempts.
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base
from app.db_types import JSONBType


class FilingSubmission(Base):
    """
    Tracks the filing submission lifecycle for a report.
    
    Statuses:
    - not_started: No filing attempt made
    - queued: Filing request queued
    - submitted: Sent to FinCEN (mock in staging)
    - accepted: Filing accepted with receipt
    - rejected: Filing rejected with error code
    - needs_review: Requires internal review
    """
    __tablename__ = "filing_submissions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Report association
    report_id = Column(
        UUID(as_uuid=True),
        ForeignKey("reports.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True
    )
    
    # Timestamps
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Environment
    environment = Column(
        String(20),
        nullable=False,
        default="staging",
        comment="staging or prod"
    )
    
    # Status tracking
    status = Column(
        String(50),
        nullable=False,
        default="not_started",
        index=True,
        comment="not_started, queued, submitted, accepted, rejected, needs_review"
    )
    
    # Receipt/confirmation
    receipt_id = Column(String(100), nullable=True, index=True)
    
    # Rejection details
    rejection_code = Column(String(50), nullable=True, comment="MISSING_FIELD, BAD_FORMAT, etc.")
    rejection_message = Column(String(500), nullable=True)
    
    # Demo outcome override (for deterministic demo behavior)
    demo_outcome = Column(
        String(20),
        nullable=True,
        comment="accept, reject, needs_review - set via demo endpoint"
    )
    demo_rejection_code = Column(String(50), nullable=True)
    demo_rejection_message = Column(String(500), nullable=True)
    
    # Payload snapshot (safe summary, no sensitive PII)
    payload_snapshot = Column(JSONBType, nullable=True)
    
    # Retry tracking
    attempts = Column(Integer, nullable=False, default=0)
    
    # Relationship
    report = relationship("Report", back_populates="filing_submission")

    def __repr__(self):
        return f"<FilingSubmission {self.id} report={self.report_id} status={self.status}>"
    
    def to_dict(self):
        """Convert to dictionary for API response."""
        return {
            "id": str(self.id),
            "report_id": str(self.report_id),
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "environment": self.environment,
            "status": self.status,
            "receipt_id": self.receipt_id,
            "rejection_code": self.rejection_code,
            "rejection_message": self.rejection_message,
            "attempts": self.attempts,
        }
