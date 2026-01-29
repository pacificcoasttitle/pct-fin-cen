"""
Pydantic schemas for Party endpoints.
"""
from datetime import datetime
from typing import Optional, List, Dict, Any
from uuid import UUID
from pydantic import BaseModel, Field


class PartyInput(BaseModel):
    """Input for creating a party."""
    # Allow both FinCEN terms (transferee/transferor) and common terms (buyer/seller)
    party_role: str = Field(..., pattern="^(transferee|transferor|buyer|seller|beneficial_owner|reporting_person)$")
    # Allow both specific entity types and generic "entity"
    entity_type: str = Field(..., pattern="^(individual|entity|llc|corporation|trust|partnership|other)$")
    display_name: Optional[str] = None
    email: Optional[str] = None  # Email to send invite to
    phone: Optional[str] = None  # Optional phone number


class PartyLinkCreate(BaseModel):
    """Schema for creating party links."""
    parties: List[PartyInput]
    expires_in_days: int = Field(default=7, ge=1, le=30)


class PartyLinkItem(BaseModel):
    """Single party link in response."""
    party_id: UUID
    party_role: str
    entity_type: str
    display_name: Optional[str]
    email: Optional[str] = None
    token: str
    link_url: str
    expires_at: datetime
    email_sent: bool = False  # Whether invite email was sent


class PartyLinkResponse(BaseModel):
    """Schema for party links creation response."""
    report_id: UUID
    links: List[PartyLinkItem]


class ReportSummary(BaseModel):
    """Brief report info for party view."""
    property_address: Optional[str]
    closing_date: Optional[str]
    purchase_price: Optional[float] = None  # For payment tracking in buyer forms
    title_company: str = "FinClear Solutions"


class PartyResponse(BaseModel):
    """Schema for party prefill response."""
    party_id: UUID
    party_role: str
    entity_type: str
    display_name: Optional[str]
    email: Optional[str] = None  # For pre-filling form
    party_data: Dict[str, Any]
    status: str
    report_summary: ReportSummary
    link_expires_at: datetime
    is_submitted: bool


class PartySave(BaseModel):
    """Schema for party autosave."""
    party_data: Dict[str, Any]


class PartySubmitResponse(BaseModel):
    """Schema for party submission response."""
    party_id: UUID
    status: str
    submitted_at: datetime
    confirmation_id: str
    message: str
