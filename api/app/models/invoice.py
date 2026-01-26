"""
Invoice model - represents monthly billing invoices.
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Text, Date, DateTime, ForeignKey, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class Invoice(Base):
    """
    A billing invoice for a company.
    
    Status flow: draft -> sent -> paid (or void/overdue)
    """
    __tablename__ = "invoices"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()"))
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)

    invoice_number = Column(String(50), unique=True, nullable=False)  # "INV-2026-0001"
    period_start = Column(Date, nullable=False)
    period_end = Column(Date, nullable=False)

    # Amounts (all in cents)
    subtotal_cents = Column(Integer, nullable=False)
    tax_cents = Column(Integer, nullable=False, server_default="0")
    discount_cents = Column(Integer, nullable=False, server_default="0")
    total_cents = Column(Integer, nullable=False)

    # Status
    status = Column(String(50), nullable=False, server_default="draft")  # draft, sent, paid, void, overdue

    # Dates
    due_date = Column(Date, nullable=True)
    sent_at = Column(DateTime, nullable=True)
    paid_at = Column(DateTime, nullable=True)
    voided_at = Column(DateTime, nullable=True)

    # Payment info
    payment_method = Column(String(50), nullable=True)  # check, ach, wire, intercompany
    payment_reference = Column(String(255), nullable=True)

    # Document
    pdf_url = Column(String(500), nullable=True)
    notes = Column(Text, nullable=True)

    # Audit
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow, server_default=text("NOW()"))
    created_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # Relationships
    company = relationship("Company", back_populates="invoices")
    billing_events = relationship("BillingEvent", back_populates="invoice")

    def __repr__(self):
        return f"<Invoice {self.invoice_number} ${self.total_cents/100:.2f}>"
    
    @property
    def subtotal_dollars(self) -> float:
        return self.subtotal_cents / 100.0
    
    @property
    def tax_dollars(self) -> float:
        return self.tax_cents / 100.0
    
    @property
    def discount_dollars(self) -> float:
        return self.discount_cents / 100.0
    
    @property
    def total_dollars(self) -> float:
        return self.total_cents / 100.0
    
    @property
    def is_paid(self) -> bool:
        return self.status == "paid"
    
    @property
    def is_overdue(self) -> bool:
        if self.status == "paid" or not self.due_date:
            return False
        return datetime.utcnow().date() > self.due_date
