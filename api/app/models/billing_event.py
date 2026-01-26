"""
BillingEvent model - represents billable actions/charges.
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class BillingEvent(Base):
    """
    A billable event/charge for a company.
    
    event_types:
    - 'filing_accepted': FinCEN filing was accepted
    - 'expedite_fee': Rush processing requested
    - 'manual_adjustment': Manual credit or charge
    - 'monthly_minimum': Monthly minimum fee
    """
    __tablename__ = "billing_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()"))
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    report_id = Column(UUID(as_uuid=True), ForeignKey("reports.id", ondelete="SET NULL"), nullable=True)
    submission_request_id = Column(UUID(as_uuid=True), ForeignKey("submission_requests.id", ondelete="SET NULL"), nullable=True)

    event_type = Column(String(50), nullable=False)  # filing_accepted, expedite_fee, manual_adjustment
    description = Column(String(500), nullable=True)
    amount_cents = Column(Integer, nullable=False)  # Can be negative for credits
    quantity = Column(Integer, nullable=False, server_default="1")

    # FinCEN reference
    bsa_id = Column(String(100), nullable=True)

    # Invoice linkage
    invoice_id = Column(UUID(as_uuid=True), ForeignKey("invoices.id", ondelete="SET NULL"), nullable=True)
    invoiced_at = Column(DateTime, nullable=True)

    # Audit
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow, server_default=text("NOW()"))
    created_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # Relationships
    company = relationship("Company", back_populates="billing_events")
    report = relationship("Report", back_populates="billing_events")
    submission_request = relationship("SubmissionRequest", back_populates="billing_events")
    invoice = relationship("Invoice", back_populates="billing_events")

    def __repr__(self):
        return f"<BillingEvent {self.event_type} ${self.amount_cents/100:.2f}>"
    
    @property
    def amount_dollars(self) -> float:
        """Get amount in dollars."""
        return self.amount_cents / 100.0
    
    @property
    def total_cents(self) -> int:
        """Get total amount (amount * quantity)."""
        return self.amount_cents * self.quantity
