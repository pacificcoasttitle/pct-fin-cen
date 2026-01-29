"""
SubmissionRequest model - represents a client's request for a new filing.
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, Date, DateTime, BigInteger, ForeignKey, text, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base
from app.db_types import JSONBType


class SubmissionRequest(Base):
    """
    A submission request from a client company.
    
    This is how clients initiate new FinCEN filings - they submit basic
    transaction info and PCT staff then creates the actual Report.
    
    Status flow: 
    - pending -> exempt (if auto-determined exempt, ends here with certificate)
    - pending -> reportable -> in_progress -> completed (normal workflow)
    """
    __tablename__ = "submission_requests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()"))
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    requested_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # Transaction info from client
    escrow_number = Column(String(100), nullable=True)
    file_number = Column(String(100), nullable=True)
    property_address = Column(JSONBType, nullable=True)  # {street, city, state, zip, county}
    expected_closing_date = Column(Date, nullable=True)
    actual_closing_date = Column(Date, nullable=True)
    transaction_type = Column(String(50), nullable=True)  # 'purchase', 'refinance', etc.

    # Party info (basic)
    buyer_name = Column(String(255), nullable=True)
    buyer_type = Column(String(50), nullable=True)  # 'individual', 'entity', 'trust'
    buyer_email = Column(String(255), nullable=True)
    buyer_phone = Column(String(50), nullable=True)
    seller_name = Column(String(255), nullable=True)
    seller_email = Column(String(255), nullable=True)

    # Transaction details
    purchase_price_cents = Column(BigInteger, nullable=True)
    financing_type = Column(String(50), nullable=True)  # 'cash', 'financed', 'partial_cash'
    
    # Additional form fields for determination
    property_type = Column(String(50), nullable=True)  # single_family, condo, commercial, land, etc.
    entity_subtype = Column(String(50), nullable=True)  # llc, corporation, public_company, bank, nonprofit, etc.

    # Client notes
    notes = Column(Text, nullable=True)
    attachments = Column(JSONBType, nullable=True, server_default="[]")  # [{filename, url, uploaded_at}]
    priority = Column(String(50), nullable=False, server_default="normal")  # 'urgent', 'normal', 'low'

    # Status tracking
    # Statuses: pending, exempt, reportable, in_progress, completed, cancelled
    status = Column(String(50), nullable=False, server_default="pending", index=True)
    assigned_to_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    report_id = Column(UUID(as_uuid=True), ForeignKey("reports.id", ondelete="SET NULL"), nullable=True)
    
    # =========================================================================
    # EARLY DETERMINATION FIELDS
    # =========================================================================
    # Result of automatic or manual determination
    determination_result = Column(String(50), nullable=True, index=True)  # "exempt", "reportable", "needs_review", None
    exemption_reasons = Column(JSONBType, nullable=True)  # ["financing_involved", "buyer_is_individual", etc.]
    determination_timestamp = Column(DateTime, nullable=True)
    determination_method = Column(String(50), nullable=True)  # "auto_client_form", "staff_manual", "ai_assisted"
    
    # Exemption certificate (only if determination_result == "exempt")
    exemption_certificate_id = Column(String(100), nullable=True, unique=True, index=True)
    exemption_certificate_generated_at = Column(DateTime, nullable=True)

    # Timestamps
    submitted_at = Column(DateTime, nullable=False, default=datetime.utcnow, server_default=text("NOW()"))
    assigned_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow, server_default=text("NOW()"))
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, server_default=text("NOW()"), onupdate=datetime.utcnow)

    # Relationships
    company = relationship("Company", back_populates="submission_requests")
    requested_by = relationship("User", foreign_keys=[requested_by_user_id], back_populates="submission_requests")
    assigned_to = relationship("User", foreign_keys=[assigned_to_user_id], back_populates="assigned_requests")
    # This is the Report that was created from this SubmissionRequest (SubmissionRequest has FK to Report)
    report = relationship(
        "Report", 
        foreign_keys=[report_id],
        backref="submission_requests_linked"
    )
    billing_events = relationship("BillingEvent", back_populates="submission_request")

    def __repr__(self):
        return f"<SubmissionRequest {self.id} status={self.status}>"
    
    @property
    def property_address_text(self) -> str:
        """Get formatted property address string."""
        if not self.property_address:
            return ""
        addr = self.property_address
        parts = [
            addr.get("street", ""),
            addr.get("city", ""),
            addr.get("state", ""),
            addr.get("zip", ""),
        ]
        return ", ".join(p for p in parts if p)
