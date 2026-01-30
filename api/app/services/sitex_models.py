"""
SiteX Property Models
=====================
Pydantic models for property data from SiteX/BKI Connect API.
"""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class PropertyOwner(BaseModel):
    """Property owner information."""
    
    full_name: str = ""
    first_name: str = ""
    last_name: str = ""
    mailing_address: str = ""
    mailing_city: str = ""
    mailing_state: str = ""
    mailing_zip: str = ""
    
    @property
    def display_name(self) -> str:
        """Get best available name for display."""
        if self.full_name:
            return self.full_name
        if self.first_name or self.last_name:
            return f"{self.first_name} {self.last_name}".strip()
        return ""


class PropertyData(BaseModel):
    """Comprehensive property data model."""
    
    # Address
    street_address: str = ""
    city: str = ""
    state: str = "CA"
    zip_code: str = ""
    county: str = ""
    
    # Identifiers
    apn: str = ""  # Assessor's Parcel Number
    fips: str = ""  # County FIPS code
    
    # Legal description
    legal_description: str = ""
    subdivision_name: Optional[str] = None
    tract_number: Optional[str] = None
    lot_number: Optional[str] = None
    block_number: Optional[str] = None
    
    # Ownership
    primary_owner: PropertyOwner = Field(default_factory=PropertyOwner)
    secondary_owner: Optional[PropertyOwner] = None
    vesting_type: Optional[str] = None
    
    # Property details
    property_type: Optional[str] = None
    bedrooms: Optional[int] = None
    bathrooms: Optional[float] = None
    square_feet: Optional[int] = None
    lot_size_sqft: Optional[int] = None
    lot_size_acres: Optional[float] = None
    year_built: Optional[int] = None
    stories: Optional[int] = None
    
    # Valuation
    assessed_value: Optional[int] = None
    land_value: Optional[int] = None
    improvement_value: Optional[int] = None
    market_value: Optional[int] = None
    tax_amount: Optional[float] = None
    tax_year: Optional[int] = None
    
    # Metadata
    enrichment_source: str = "sitex"
    enrichment_timestamp: datetime = Field(default_factory=datetime.utcnow)
    confidence_score: float = 1.0
    
    @property
    def full_address(self) -> str:
        """Get formatted full address."""
        parts = [self.street_address]
        if self.city:
            parts.append(self.city)
        if self.state:
            parts.append(self.state)
        if self.zip_code:
            parts.append(self.zip_code)
        return ", ".join(parts)
    
    @property
    def owner_names(self) -> str:
        """Get all owner names as string."""
        names = []
        if self.primary_owner.display_name:
            names.append(self.primary_owner.display_name)
        if self.secondary_owner and self.secondary_owner.display_name:
            names.append(self.secondary_owner.display_name)
        return " and ".join(names)


class PropertyMatch(BaseModel):
    """Single match candidate for multi-match scenarios."""
    
    address: str = ""
    city: str = ""
    state: str = ""
    zip_code: str = ""
    apn: str = ""
    fips: str = ""
    owner_name: str = ""
    
    @property
    def full_address(self) -> str:
        """Get formatted address."""
        parts = [self.address]
        if self.city:
            parts.append(self.city)
        if self.state:
            parts.append(self.state)
        return ", ".join(parts)


class PropertySearchResult(BaseModel):
    """
    Result from property search.
    
    Status values:
        - "success": Single match found, data in `data` field
        - "multi_match": Multiple matches, candidates in `matches` field
        - "not_found": No matches found
        - "error": Search failed, see `message`
        - "not_configured": SiteX not configured
    """
    
    status: str
    data: Optional[PropertyData] = None
    matches: Optional[List[PropertyMatch]] = None
    message: str = ""
    match_count: int = 0
    
    @property
    def is_success(self) -> bool:
        return self.status == "success"
    
    @property
    def is_multi_match(self) -> bool:
        return self.status == "multi_match"
