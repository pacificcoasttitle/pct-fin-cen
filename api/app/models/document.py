"""
Document model - uploaded documents for parties (ID photos, etc.).
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class Document(Base):
    """
    An uploaded document associated with a report party.
    
    Typically ID documents (driver's license, passport) for FinCEN reporting.
    """
    __tablename__ = "documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Foreign key to report party
    report_party_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("report_parties.id", ondelete="CASCADE"), 
        nullable=False,
        index=True
    )
    
    # Document type
    document_type = Column(
        String(50), 
        nullable=False,
        index=True,
        comment="drivers_license, passport, state_id, other"
    )
    
    # File information
    file_url = Column(String(500), nullable=False, comment="Storage URL (S3, etc.)")
    file_name = Column(String(255), nullable=False, comment="Original filename")
    mime_type = Column(String(100), nullable=False, comment="MIME type (image/jpeg, etc.)")
    size_bytes = Column(Integer, nullable=False, comment="File size in bytes")
    
    # Timestamps
    uploaded_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    verified_at = Column(DateTime, nullable=True, comment="When document was verified")
    
    # Relationships
    party = relationship("ReportParty", back_populates="documents")

    def __repr__(self):
        return f"<Document {self.id} type={self.document_type}>"
