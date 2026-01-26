"""
Report model - core entity for FinCEN RRER filings.
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, Date, DateTime, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base
from app.db_types import JSONBType


class Report(Base):
    """
    A FinCEN RRER report representing a real estate transaction.
    
    Tracks the wizard progress, determination results, and filing status.
    """
    __tablename__ = "reports"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Status tracking
    status = Column(
        String(50), 
        nullable=False, 
        default="draft",
        index=True,
        comment="draft, determination_complete, collecting, ready_to_file, filed, exempt"
    )
    
    # Property information
    property_address_text = Column(Text, nullable=True, comment="Full property address as text")
    closing_date = Column(Date, nullable=True, comment="Transaction closing date")
    filing_deadline = Column(Date, nullable=True, comment="FinCEN filing deadline (30 days from closing)")
    
    # Wizard state
    wizard_step = Column(Integer, nullable=False, default=1, comment="Current wizard step number")
    wizard_data = Column(JSONBType, nullable=True, default=dict, comment="Wizard form data by step")
    
    # Determination results
    determination = Column(JSONBType, nullable=True, comment="Determination logic results and reasoning")
    
    # Filing information
    filing_status = Column(
        String(50),
        nullable=True,
        index=True,
        comment="filed_mock, filed_live, failed, etc."
    )
    filed_at = Column(DateTime, nullable=True, comment="When the report was filed")
    receipt_id = Column(String(100), nullable=True, index=True, comment="Filing receipt/confirmation ID")
    filing_payload = Column(JSONBType, nullable=True, comment="Full filing request/response payload")
    
    # Multi-tenancy fields (nullable for backwards compatibility)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="SET NULL"), nullable=True, index=True)
    submission_request_id = Column(UUID(as_uuid=True), ForeignKey("submission_requests.id", ondelete="SET NULL"), nullable=True)
    escrow_number = Column(String(100), nullable=True, index=True)
    created_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    parties = relationship("ReportParty", back_populates="report", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="report", cascade="all, delete-orphan")
    filing_submission = relationship("FilingSubmission", back_populates="report", uselist=False, cascade="all, delete-orphan")
    
    # Multi-tenancy relationships
    company = relationship("Company", back_populates="reports")
    # This is the SubmissionRequest that created this Report (Report has FK to SubmissionRequest)
    submission_request = relationship(
        "SubmissionRequest", 
        foreign_keys=[submission_request_id],
        backref="reports_created"
    )
    created_by_user = relationship("User", back_populates="created_reports")
    billing_events = relationship("BillingEvent", back_populates="report")

    def __repr__(self):
        return f"<Report {self.id} status={self.status}>"
