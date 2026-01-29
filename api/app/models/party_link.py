"""
PartyLink model - secure links for party self-service data collection.
"""
import uuid
import secrets
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


def generate_secure_token() -> str:
    """Generate a secure random token for party links."""
    return secrets.token_urlsafe(32)


class PartyLink(Base):
    """
    A secure, time-limited link for a party to submit their information.
    
    Used for self-service data collection from transferees/beneficial owners.
    """
    __tablename__ = "party_links"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Foreign key to report party
    report_party_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("report_parties.id", ondelete="CASCADE"), 
        nullable=False,
        index=True
    )
    
    # Secure token (unique, used in URL)
    token = Column(
        String(64), 
        nullable=False, 
        unique=True, 
        index=True,
        default=generate_secure_token,
        comment="Secure token for URL access"
    )
    
    # Expiration
    expires_at = Column(
        DateTime, 
        nullable=False,
        comment="When this link expires"
    )
    
    # Status tracking
    status = Column(
        String(50), 
        nullable=False, 
        default="active",
        index=True,
        comment="active, used, expired, revoked"
    )
    
    # Timestamps
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    opened_at = Column(DateTime, nullable=True, comment="When party first opened the link")
    submitted_at = Column(DateTime, nullable=True, comment="When party submitted their data")
    
    # Relationships
    party = relationship("ReportParty", back_populates="links")

    def __repr__(self):
        return f"<PartyLink {self.id} status={self.status}>"
    
    @property
    def is_valid(self) -> bool:
        """Check if link is still valid (active and not expired)."""
        return self.status == "active" and datetime.utcnow() < self.expires_at
