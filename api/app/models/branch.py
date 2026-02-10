"""
Branch model - represents branch offices within a client company.
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class Branch(Base):
    """
    A branch/office location within a client company.
    
    Escrow admins can create and manage branches.
    Team members (escrow officers) can be associated with specific branches.
    """
    __tablename__ = "branches"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()"))
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)

    # Branch details
    name = Column(String(255), nullable=False)        # e.g., "Downtown Office"
    code = Column(String(50), nullable=True)           # e.g., "DT-01"

    # Address
    street = Column(String(255), nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(50), nullable=True)
    zip = Column(String(20), nullable=True)

    # Contact
    phone = Column(String(50), nullable=True)
    email = Column(String(255), nullable=True)

    # Manager
    manager_name = Column(String(255), nullable=True)
    manager_email = Column(String(255), nullable=True)

    # Status
    is_active = Column(Boolean, nullable=False, default=True, server_default=text("true"))
    is_headquarters = Column(Boolean, nullable=False, default=False, server_default=text("false"))

    # Timestamps
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow, server_default=text("NOW()"))
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, server_default=text("NOW()"), onupdate=datetime.utcnow)

    # Relationships
    company = relationship("Company", back_populates="branches")
    users = relationship("User", back_populates="branch")

    def __repr__(self):
        return f"<Branch {self.name} company_id={self.company_id}>"
