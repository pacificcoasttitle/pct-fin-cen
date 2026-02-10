"""
Company model - represents clients who use PCT FinCEN Solutions.
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Text, DateTime, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base
from app.db_types import JSONBType


class Company(Base):
    """
    A company/client that uses PCT FinCEN Solutions.
    
    company_type:
    - 'internal': PCT itself (Pacific Coast Title)
    - 'client': External title/escrow companies using PCT's services
    """
    __tablename__ = "companies"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()"))
    name = Column(String(255), nullable=False)
    code = Column(String(50), unique=True, nullable=False)  # Short code like "PCT", "ABC"
    company_type = Column(String(50), nullable=False, server_default="client")  # 'internal' or 'client'
    
    # Billing contact
    billing_email = Column(String(255), nullable=True)
    billing_contact_name = Column(String(255), nullable=True)
    address = Column(JSONBType, nullable=True)  # {street, city, state, zip}
    phone = Column(String(50), nullable=True)
    
    # Billing configuration
    billing_type = Column(String(50), nullable=False, server_default="invoice_only")  # invoice_only, hybrid, subscription
    filing_fee_cents = Column(Integer, nullable=False, server_default="7500")  # $75.00 default
    payment_terms_days = Column(Integer, nullable=False, server_default="30")  # Net 30 default
    billing_notes = Column(Text, nullable=True)  # Internal notes about billing arrangements
    stripe_customer_id = Column(String(255), nullable=True)  # For hybrid tier auto-charge
    
    # Branding
    logo_url = Column(String(500), nullable=True)  # R2 object key for company logo
    logo_updated_at = Column(DateTime, nullable=True)
    primary_color = Column(String(7), nullable=True)  # e.g., "#0D9488"
    secondary_color = Column(String(7), nullable=True)
    
    # Status
    status = Column(String(50), nullable=False, server_default="active")  # active, suspended, inactive
    settings = Column(JSONBType, nullable=True, server_default="{}")  # Future config
    
    # Timestamps
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow, server_default=text("NOW()"))
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, server_default=text("NOW()"), onupdate=datetime.utcnow)

    # Relationships
    users = relationship("User", back_populates="company")
    branches = relationship("Branch", back_populates="company", cascade="all, delete-orphan")
    submission_requests = relationship("SubmissionRequest", back_populates="company")
    reports = relationship("Report", back_populates="company")
    billing_events = relationship("BillingEvent", back_populates="company")
    invoices = relationship("Invoice", back_populates="company")

    def __repr__(self):
        return f"<Company {self.code} name={self.name}>"
    
    @property
    def filing_fee_dollars(self) -> float:
        """Return filing fee in dollars for display."""
        return (self.filing_fee_cents or 7500) / 100.0
