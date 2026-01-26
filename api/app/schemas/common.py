"""
Common Pydantic schemas.
"""
from datetime import datetime
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel


class MissingItem(BaseModel):
    """A missing item in ready check."""
    category: str
    field: str
    party_id: Optional[UUID] = None
    message: str


class ReadyCheckResponse(BaseModel):
    """Schema for ready check response."""
    report_id: UUID
    is_ready: bool
    missing_items: List[MissingItem]
    parties_complete: int
    parties_total: int


class FileResponse(BaseModel):
    """Schema for filing response."""
    report_id: UUID
    status: str
    confirmation_number: str
    filed_at: datetime
    message: str
