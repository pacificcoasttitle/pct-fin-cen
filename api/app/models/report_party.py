"""
ReportParty model - parties involved in a report (transferees, transferors, etc.).
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.database import Base


class ReportParty(Base):
    """
    A party involved in a FinCEN RRER report.
    
    Can be a transferee (buyer), transferor (seller), or beneficial owner.
    """
    __tablename__ = "report_parties"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Foreign key to report
    report_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("reports.id", ondelete="CASCADE"), 
        nullable=False,
        index=True
    )
    
    # Party classification
    party_role = Column(
        String(50), 
        nullable=False,
        index=True,
        comment="transferee, transferor, beneficial_owner, reporting_person"
    )
    entity_type = Column(
        String(50), 
        nullable=False,
        comment="individual, llc, corporation, trust, partnership, other"
    )
    
    # Display information
    display_name = Column(String(255), nullable=True, comment="Name for display purposes")
    
    # Full party data (flexible schema)
    party_data = Column(
        JSONB, 
        nullable=True, 
        default=dict,
        comment="Full party information: name, address, ID documents, etc."
    )
    
    # Collection status
    status = Column(
        String(50), 
        nullable=False, 
        default="pending",
        index=True,
        comment="pending, link_sent, in_progress, submitted, verified"
    )
    
    # Timestamps
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    report = relationship("Report", back_populates="parties")
    links = relationship("PartyLink", back_populates="party", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="party", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<ReportParty {self.id} role={self.party_role} status={self.status}>"
