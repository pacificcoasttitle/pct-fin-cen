"""
Document model - uploaded documents for parties (ID photos, etc.).

Supports Cloudflare R2 storage with pre-signed URL generation for
secure direct browser uploads and downloads.
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Integer, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class Document(Base):
    """
    An uploaded document associated with a report party.
    
    Supports:
    - Government ID documents (driver's license, passport)
    - Trust agreements
    - Entity formation documents
    - Operating agreements
    - Beneficial owner identification
    
    Uses Cloudflare R2 for storage with pre-signed URLs.
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
    
    # Document type - expanded for FinCEN requirements
    document_type = Column(
        String(50), 
        nullable=False,
        index=True,
        comment="government_id, government_id_back, trust_agreement, formation_docs, operating_agreement, articles_of_incorporation, beneficial_owner_id, other"
    )
    
    # File information
    file_name = Column(String(255), nullable=False, comment="Original filename")
    mime_type = Column(String(100), nullable=False, comment="MIME type (image/jpeg, etc.)")
    size_bytes = Column(Integer, nullable=True, comment="File size in bytes")
    
    # R2 Storage - use storage_key as primary identifier
    storage_key = Column(
        String(500), 
        nullable=True, 
        unique=True,
        index=True,
        comment="R2 object key path (company/report/party/type/uuid.ext)"
    )
    
    # Legacy URL field (nullable, kept for backward compatibility)
    file_url = Column(String(500), nullable=True, comment="Deprecated: Use storage_key + generate download URL")
    
    # Upload status
    upload_confirmed = Column(
        Boolean, 
        nullable=False, 
        default=False,
        comment="True when client confirms successful R2 upload"
    )
    
    # Optional description/label
    description = Column(String(255), nullable=True, comment="Optional user-provided description")
    
    # Timestamps
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    uploaded_at = Column(DateTime, nullable=True, comment="When R2 upload was confirmed")
    verified_at = Column(DateTime, nullable=True, comment="When staff verified document")
    
    # Relationships
    party = relationship("ReportParty", back_populates="documents")

    def __repr__(self):
        return f"<Document {self.id} type={self.document_type} confirmed={self.upload_confirmed}>"
