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
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class WizardUpdate(BaseModel):
    """Schema for wizard autosave."""
    wizard_step: int = Field(..., ge=1, le=10)
    wizard_data: Dict[str, Any]


class DeterminationResponse(BaseModel):
    """Schema for determination result."""
    report_id: UUID
    is_reportable: bool
    status: str
    determination: Dict[str, Any]
    reasoning: List[str]
