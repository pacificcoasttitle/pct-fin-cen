"""
AuditLog model - tracks all actions for compliance and debugging.
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB, INET

from app.database import Base


class AuditLog(Base):
    """
    Audit log entry for tracking actions on reports.
    
    Required for FinCEN compliance - must retain for 5 years.
    """
    __tablename__ = "audit_log"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Optional report association
    report_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("reports.id", ondelete="SET NULL"), 
        nullable=True,
        index=True
    )
    
    # Actor information
    actor_type = Column(
        String(50), 
        nullable=False,
        index=True,
        comment="system, staff, party, api"
    )
    actor_user_id = Column(
        UUID(as_uuid=True), 
        nullable=True,
        index=True,
        comment="User ID if applicable"
    )
    
    # Action details
    action = Column(
        String(100), 
        nullable=False,
        index=True,
        comment="report.created, party.submitted, document.uploaded, etc."
    )
    details = Column(
        JSONB, 
        nullable=True, 
        default=dict,
        comment="Additional action details"
    )
    
    # Request context
    ip_address = Column(INET, nullable=True, comment="Client IP address")
    
    # Timestamp
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    
    # Relationships
    from sqlalchemy.orm import relationship
    report = relationship("Report", back_populates="audit_logs")

    def __repr__(self):
        return f"<AuditLog {self.id} action={self.action}>"
