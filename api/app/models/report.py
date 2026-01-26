"""
Report model - core entity for FinCEN RRER filings.
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, Date, DateTime, Integer
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.database import Base


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
    wizard_data = Column(JSONB, nullable=True, default=dict, comment="Wizard form data by step")
    
    # Determination results
    determination = Column(JSONB, nullable=True, comment="Determination logic results and reasoning")
    
    # Timestamps
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    parties = relationship("ReportParty", back_populates="report", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="report", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Report {self.id} status={self.status}>"
