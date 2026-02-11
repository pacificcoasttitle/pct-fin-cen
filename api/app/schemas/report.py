"""
Pydantic schemas for Report endpoints.
"""
from datetime import date, datetime
from typing import Optional, List, Dict, Any
from uuid import UUID
from pydantic import BaseModel, Field


class ReportCreate(BaseModel):
    """Schema for creating a new report."""
    property_address_text: Optional[str] = None
    closing_date: Optional[date] = None
    wizard_data: Optional[Dict[str, Any]] = Field(default_factory=dict)


class ReportPartyBrief(BaseModel):
    """Brief party info for report responses."""
    id: UUID
    party_role: str
    entity_type: str
    display_name: Optional[str]
    status: str

    class Config:
        from_attributes = True


class PartyStatusItem(BaseModel):
    """Detailed party status for tracking."""
    id: UUID
    party_role: str
    entity_type: str
    display_name: Optional[str]
    email: Optional[str] = None
    status: str
    submitted_at: Optional[datetime] = None
    token: Optional[str] = None
    link: Optional[str] = None
    link_expires_at: Optional[datetime] = None
    created_at: datetime
    # Enhanced summary fields
    completion_percentage: int = 0
    beneficial_owners_count: Optional[int] = None
    trustees_count: Optional[int] = None
    payment_sources_count: Optional[int] = None
    payment_sources_total: Optional[int] = None
    documents_count: int = 0
    has_validation_errors: bool = False
    validation_error_count: int = 0


class PartySummary(BaseModel):
    """Summary of party completion status."""
    total: int
    submitted: int
    pending: int
    all_complete: bool


class ReportPartiesResponse(BaseModel):
    """Response for GET /reports/{id}/parties."""
    report_id: UUID
    property_address: Optional[str]
    parties: List[PartyStatusItem]
    summary: PartySummary


class PartyDetailItem(BaseModel):
    """Full party detail for admin/staff review."""
    id: UUID
    party_role: str
    entity_type: str
    display_name: Optional[str]
    email: Optional[str] = None
    status: str
    party_data: Optional[Dict[str, Any]] = None  # Full party data
    submitted_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    # Summary fields
    completion_percentage: int = 0
    beneficial_owners_count: Optional[int] = None
    trustees_count: Optional[int] = None
    payment_sources_count: Optional[int] = None
    payment_sources_total: Optional[int] = None
    documents_count: int = 0
    has_validation_errors: bool = False
    validation_error_count: int = 0
    validation_errors: List[str] = []
    validation_warnings: List[str] = []


class ReportWithPartySummary(BaseModel):
    """Report with party summary for queue views."""
    id: UUID
    status: str
    property_address_text: Optional[str]
    escrow_number: Optional[str] = None
    closing_date: Optional[date] = None
    filing_deadline: Optional[date] = None
    wizard_step: int
    determination: Optional[Dict[str, Any]] = None
    filing_status: Optional[str] = None
    receipt_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    submission_request_id: Optional[UUID] = None
    # Party summary
    parties_total: int = 0
    parties_submitted: int = 0
    parties_pending: int = 0
    all_parties_complete: bool = False
    # Enhanced: Include party details for queue views
    parties: List[PartyStatusItem] = []


class ReportListWithPartiesResponse(BaseModel):
    """Schema for list of reports with party summaries."""
    reports: List[ReportWithPartySummary]
    total: int


class ReportResponse(BaseModel):
    """Schema for report in list responses."""
    id: UUID
    status: str
    property_address_text: Optional[str]
    closing_date: Optional[date]
    filing_deadline: Optional[date]
    wizard_step: int
    filing_status: Optional[str] = None
    filed_at: Optional[datetime] = None
    receipt_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ReportListResponse(BaseModel):
    """Schema for list of reports."""
    reports: List[ReportResponse]
    total: int


class ReportDetailResponse(BaseModel):
    """Schema for detailed report response."""
    id: UUID
    status: str
    property_address_text: Optional[str]
    closing_date: Optional[date]
    filing_deadline: Optional[date]
    wizard_step: int
    wizard_data: Optional[Dict[str, Any]]
    determination: Optional[Dict[str, Any]]
    parties: List[ReportPartyBrief]
    filing_status: Optional[str] = None
    filed_at: Optional[datetime] = None
    receipt_id: Optional[str] = None
    filing_payload: Optional[Dict[str, Any]] = None
    # Determination persistence fields (Shark 2)
    determination_result: Optional[str] = None
    determination_completed_at: Optional[datetime] = None
    exemption_certificate_id: Optional[str] = None
    exemption_reasons: Optional[List[str]] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class WizardUpdate(BaseModel):
    """Schema for wizard autosave."""
    wizard_step: int = Field(..., ge=0, le=10)
    wizard_data: Dict[str, Any]


class DeterminationResponse(BaseModel):
    """Schema for determination result."""
    report_id: UUID
    is_reportable: bool
    status: str
    determination: Dict[str, Any]
    reasoning: List[str]
    certificate_id: Optional[str] = None
    exemption_reasons: Optional[List[str]] = None
