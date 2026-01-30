# CURSOR PROMPT: SiteX Integration + Google Places Autocomplete

## MISSION

Integrate Google Places address autocomplete and SiteX property data lookup into the FinClear wizard system. This is a comprehensive integration touching client forms, the wizard, and party portal data hydration.

**THIS IS A BIG SHARK 🦈**

---

## DELIVERABLES

1. **Backend:** SiteX client + property lookup API endpoints
2. **Frontend:** AddressAutocomplete component integrated into:
   - Client submission form (`/app/requests/new`)
   - Wizard transaction-property step
3. **Data Hydration:** Property data flows through wizard → parties
4. **Documentation:** Update `WIZARD_MASTER_TECH_SPEC.md` with new Section 11
5. **Tracking:** Create `docs/KilledSharks-2.md` to log accomplishments

---

## PHASE 1: BACKEND - SiteX Integration

### 1.1 Create SiteX Models

**Create file:** `api/app/services/sitex_models.py`

```python
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
```

---

### 1.2 Create SiteX Client Service

**Create file:** `api/app/services/sitex_client.py`

```python
"""
SiteX Property Client
=====================
Production-grade MLS/property data client for BKI Connect API.

Features:
- OAuth2 Basic Auth token management
- Thread-safe token refresh
- In-memory caching with TTL
- Multi-match handling
- Graceful degradation

Usage:
    from app.services.sitex_client import sitex_service
    
    result = await sitex_service.search_property(
        address="123 Main St",
        city="Los Angeles",
        state="CA"
    )
    
    if result.status == "success":
        print(result.data.apn)
"""

import os
import asyncio
import base64
import hashlib
import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

import httpx

from .sitex_models import (
    PropertyData,
    PropertyOwner,
    PropertyMatch,
    PropertySearchResult,
)

logger = logging.getLogger(__name__)


# =============================================================================
# Exceptions
# =============================================================================

class SiteXError(Exception):
    """Base exception for SiteX errors."""
    def __init__(self, message: str, status_code: int = None):
        self.message = message
        self.status_code = status_code
        super().__init__(message)


class SiteXAuthError(SiteXError):
    """Authentication/authorization error."""
    pass


class SiteXRateLimitError(SiteXError):
    """Rate limit exceeded."""
    pass


class SiteXNotConfiguredError(SiteXError):
    """SiteX credentials not configured."""
    pass


# =============================================================================
# Configuration
# =============================================================================

class SiteXConfig:
    """Centralized SiteX configuration from environment variables."""
    
    def __init__(self):
        self.base_url = os.getenv("SITEX_BASE_URL", "https://api.bkiconnect.com").rstrip('/')
        self.client_id = os.getenv("SITEX_CLIENT_ID")
        self.client_secret = os.getenv("SITEX_CLIENT_SECRET")
        self.feed_id = os.getenv("SITEX_FEED_ID")
        self.debug = os.getenv("SITEX_DEBUG", "false").lower() == "true"
        self.timeout = float(os.getenv("SITEX_TIMEOUT", "30"))
    
    @property
    def token_url(self) -> str:
        return f"{self.base_url}/ls/apigwy/oauth2/v1/token"
    
    @property
    def search_url(self) -> str:
        return f"{self.base_url}/ls/publicsearch/v1/{self.feed_id}/property"
    
    def is_configured(self) -> bool:
        return all([self.client_id, self.client_secret, self.feed_id])


# =============================================================================
# OAuth Token Manager
# =============================================================================

class SiteXTokenManager:
    """Thread-safe OAuth token management with proactive refresh."""
    
    def __init__(self, config: SiteXConfig):
        self.config = config
        self._token: Optional[str] = None
        self._expiry: datetime = datetime.min
        self._lock = asyncio.Lock()
        self._refresh_buffer = timedelta(seconds=60)
    
    async def get_token(self) -> str:
        """Get valid token, refreshing if needed."""
        async with self._lock:
            if self._is_token_valid():
                return self._token
            return await self._refresh_token()
    
    def _is_token_valid(self) -> bool:
        """Check if current token is still valid."""
        return (
            self._token is not None 
            and datetime.utcnow() < (self._expiry - self._refresh_buffer)
        )
    
    async def _refresh_token(self) -> str:
        """Request new OAuth token using Basic Auth."""
        credentials = f"{self.config.client_id}:{self.config.client_secret}"
        basic_auth = base64.b64encode(credentials.encode()).decode()
        
        async with httpx.AsyncClient(timeout=20.0) as client:
            try:
                response = await client.post(
                    self.config.token_url,
                    headers={
                        "Authorization": f"Basic {basic_auth}",
                        "Content-Type": "application/x-www-form-urlencoded",
                    },
                    data={"grant_type": "client_credentials"},
                )
                
                if response.status_code == 401:
                    raise SiteXAuthError("Invalid SiteX credentials", 401)
                
                response.raise_for_status()
                data = response.json()
                
                self._token = data["access_token"]
                expires_in = data.get("expires_in", 600)
                self._expiry = datetime.utcnow() + timedelta(seconds=expires_in)
                
                logger.debug(f"SiteX token refreshed, expires in {expires_in}s")
                return self._token
                
            except httpx.HTTPStatusError as e:
                raise SiteXAuthError(f"Token refresh failed: {e}", e.response.status_code)
    
    def invalidate(self):
        """Invalidate current token (force refresh on next request)."""
        self._token = None
        self._expiry = datetime.min


# =============================================================================
# Main Service
# =============================================================================

class SiteXService:
    """Production-grade SiteX integration with caching."""
    
    def __init__(self):
        self.config = SiteXConfig()
        self.token_manager = SiteXTokenManager(self.config)
        self._cache: Dict[str, Tuple[PropertyData, datetime]] = {}
        self._cache_ttl = timedelta(hours=1)
    
    def is_configured(self) -> bool:
        """Check if SiteX is properly configured."""
        return self.config.is_configured()
    
    async def search_property(
        self,
        address: str,
        city: Optional[str] = None,
        state: str = "CA",
        zip_code: Optional[str] = None,
        use_cache: bool = True
    ) -> PropertySearchResult:
        """
        Search for property by address.
        
        Args:
            address: Street address (e.g., "123 Main St")
            city: City name (optional but recommended)
            state: State code (default: "CA")
            zip_code: ZIP code (optional)
            use_cache: Whether to use cached results
            
        Returns:
            PropertySearchResult with status and data/matches
        """
        if not self.is_configured():
            return PropertySearchResult(
                status="not_configured",
                message="SiteX credentials not configured"
            )
        
        # Check cache
        cache_key = self._make_cache_key(address, city, state, zip_code)
        if use_cache:
            cached = self._get_cached(cache_key)
            if cached:
                return PropertySearchResult(status="success", data=cached)
        
        try:
            # Build last line (city, state zip)
            last_line = self._build_last_line(city, state, zip_code)
            
            # Make API request
            raw_response = await self._search_address(address, last_line)
            
            # Check for multi-match
            if self._is_multi_match(raw_response):
                matches = self._extract_matches(raw_response)
                return PropertySearchResult(
                    status="multi_match",
                    matches=matches,
                    match_count=len(matches),
                    message=f"Found {len(matches)} potential matches"
                )
            
            # Check for no results
            if self._is_no_match(raw_response):
                return PropertySearchResult(
                    status="not_found",
                    message="No property found matching the address"
                )
            
            # Parse successful response
            property_data = self._parse_response(raw_response, address)
            
            # Cache the result
            self._cache[cache_key] = (property_data, datetime.utcnow())
            
            return PropertySearchResult(status="success", data=property_data)
            
        except SiteXAuthError:
            raise
        except SiteXRateLimitError:
            raise
        except Exception as e:
            logger.exception(f"SiteX search error: {e}")
            return PropertySearchResult(
                status="error",
                message=f"Search failed: {str(e)}"
            )
    
    async def search_by_apn(
        self,
        apn: str,
        fips: str,
        use_cache: bool = True
    ) -> PropertySearchResult:
        """
        Search for property by APN (Assessor's Parcel Number).
        
        Args:
            apn: Assessor's Parcel Number
            fips: FIPS county code
            use_cache: Whether to use cached results
            
        Returns:
            PropertySearchResult with status and data
        """
        if not self.is_configured():
            return PropertySearchResult(
                status="not_configured",
                message="SiteX credentials not configured"
            )
        
        cache_key = f"apn:{fips}:{apn}"
        if use_cache:
            cached = self._get_cached(cache_key)
            if cached:
                return PropertySearchResult(status="success", data=cached)
        
        try:
            raw_response = await self._search_apn(apn, fips)
            
            if self._is_no_match(raw_response):
                return PropertySearchResult(
                    status="not_found",
                    message=f"No property found for APN {apn}"
                )
            
            property_data = self._parse_response(raw_response, apn)
            self._cache[cache_key] = (property_data, datetime.utcnow())
            
            return PropertySearchResult(status="success", data=property_data)
            
        except Exception as e:
            logger.exception(f"SiteX APN search error: {e}")
            return PropertySearchResult(
                status="error",
                message=f"APN search failed: {str(e)}"
            )
    
    def clear_cache(self):
        """Clear all cached results."""
        self._cache.clear()
    
    # =========================================================================
    # Private Methods
    # =========================================================================
    
    def _make_cache_key(
        self,
        address: str,
        city: Optional[str],
        state: str,
        zip_code: Optional[str]
    ) -> str:
        """Create cache key from search parameters."""
        raw = f"{address}|{city}|{state}|{zip_code}".lower()
        return hashlib.md5(raw.encode()).hexdigest()
    
    def _get_cached(self, key: str) -> Optional[PropertyData]:
        """Get cached result if valid."""
        if key in self._cache:
            data, cached_at = self._cache[key]
            if datetime.utcnow() - cached_at < self._cache_ttl:
                logger.debug(f"SiteX cache hit: {key}")
                return data
            else:
                del self._cache[key]
        return None
    
    def _build_last_line(
        self,
        city: Optional[str],
        state: str,
        zip_code: Optional[str]
    ) -> str:
        """Build last line of address (city, state zip)."""
        parts = []
        if city:
            parts.append(city)
        parts.append(state)
        if zip_code:
            parts.append(zip_code)
        return " ".join(parts)
    
    async def _search_address(self, address: str, last_line: str) -> dict:
        """Execute address search API call."""
        token = await self.token_manager.get_token()
        
        # Generate client reference
        client_ref = hashlib.md5(f"{address}{datetime.utcnow().isoformat()}".encode()).hexdigest()[:12]
        
        params = {
            "address1": address,
            "address2": last_line,
            "clientRef": client_ref,
        }
        
        async with httpx.AsyncClient(timeout=self.config.timeout) as client:
            response = await client.get(
                self.config.search_url,
                headers={
                    "Authorization": f"Bearer {token}",
                    "Accept": "application/json",
                },
                params=params,
            )
            
            if response.status_code == 401:
                self.token_manager.invalidate()
                raise SiteXAuthError("Token expired or invalid", 401)
            
            if response.status_code == 429:
                raise SiteXRateLimitError("Rate limit exceeded", 429)
            
            response.raise_for_status()
            return response.json()
    
    async def _search_apn(self, apn: str, fips: str) -> dict:
        """Execute APN search API call."""
        token = await self.token_manager.get_token()
        
        params = {
            "apn": apn,
            "fips": fips,
        }
        
        async with httpx.AsyncClient(timeout=self.config.timeout) as client:
            response = await client.get(
                self.config.search_url,
                headers={
                    "Authorization": f"Bearer {token}",
                    "Accept": "application/json",
                },
                params=params,
            )
            
            response.raise_for_status()
            return response.json()
    
    def _is_multi_match(self, response: dict) -> bool:
        """Check if response indicates multiple matches."""
        if "multiMatch" in response:
            return True
        if "candidates" in response and len(response.get("candidates", [])) > 1:
            return True
        if response.get("matchCount", 1) > 1:
            return True
        return False
    
    def _is_no_match(self, response: dict) -> bool:
        """Check if response indicates no matches."""
        if response.get("matchCount", 1) == 0:
            return True
        if response.get("status") == "not_found":
            return True
        if not response.get("property") and not response.get("data"):
            return True
        return False
    
    def _extract_matches(self, response: dict) -> List[PropertyMatch]:
        """Extract match candidates from multi-match response."""
        matches = []
        candidates = response.get("candidates", response.get("matches", []))
        
        for candidate in candidates:
            matches.append(PropertyMatch(
                address=self._get_nested(candidate, ["address", "streetAddress", "Address1"], ""),
                city=self._get_nested(candidate, ["city", "City", "SiteCity"], ""),
                apn=self._get_nested(candidate, ["apn", "APN", "ParcelNumber"], ""),
                fips=self._get_nested(candidate, ["fips", "FIPS", "CountyFIPS"], ""),
                owner_name=self._get_nested(candidate, ["ownerName", "Owner", "OwnerName"], ""),
            ))
        
        return matches
    
    def _parse_response(self, response: dict, original_address: str) -> PropertyData:
        """Parse API response into PropertyData model."""
        prop = response.get("property", response.get("data", response))
        
        # Extract primary owner
        primary_owner = PropertyOwner(
            full_name=self._get_nested(prop, [
                "ownerName", "Owner1Name", "PrimaryOwner", "owner.name"
            ], ""),
            first_name=self._get_nested(prop, ["ownerFirstName", "Owner1FirstName"], ""),
            last_name=self._get_nested(prop, ["ownerLastName", "Owner1LastName"], ""),
            mailing_address=self._get_nested(prop, [
                "mailingAddress", "OwnerMailingAddress", "mailAddress.full"
            ], ""),
        )
        
        # Extract secondary owner if present
        secondary_owner = None
        secondary_name = self._get_nested(prop, ["Owner2Name", "SecondaryOwner"], None)
        if secondary_name:
            secondary_owner = PropertyOwner(
                full_name=secondary_name,
                first_name=self._get_nested(prop, ["Owner2FirstName"], ""),
                last_name=self._get_nested(prop, ["Owner2LastName"], ""),
            )
        
        return PropertyData(
            # Address
            street_address=self._get_nested(prop, [
                "streetAddress", "SiteAddress", "Address1", "address.street"
            ], original_address),
            city=self._get_nested(prop, ["city", "SiteCity", "City"], ""),
            state=self._get_nested(prop, ["state", "SiteState", "State"], "CA"),
            zip_code=self._get_nested(prop, ["zipCode", "SiteZip", "Zip", "PostalCode"], ""),
            county=self._get_nested(prop, ["county", "CountyName", "County"], ""),
            
            # Identifiers
            apn=self._get_nested(prop, ["apn", "APN", "ParcelNumber", "assessorParcelNumber"], ""),
            fips=self._get_nested(prop, ["fips", "FIPS", "CountyFIPS"], ""),
            
            # Legal description
            legal_description=self._get_nested(prop, ["legalDescription", "LegalDesc", "Legal"], ""),
            subdivision_name=self._get_nested(prop, ["subdivisionName", "Subdivision"], ""),
            tract_number=self._get_nested(prop, ["tractNumber", "Tract", "TractNo"], ""),
            lot_number=self._get_nested(prop, ["lotNumber", "Lot", "LotNo"], ""),
            
            # Ownership
            primary_owner=primary_owner,
            secondary_owner=secondary_owner,
            vesting_type=self._get_nested(prop, ["vestingType", "Vesting", "OwnershipType"], ""),
            
            # Property details
            property_type=self._get_nested(prop, ["propertyType", "UseCode", "PropertyUseType"], ""),
            bedrooms=self._safe_int(self._get_nested(prop, ["bedrooms", "Beds", "BedroomCount"], None)),
            bathrooms=self._safe_float(self._get_nested(prop, ["bathrooms", "Baths", "BathroomCount"], None)),
            square_feet=self._safe_int(self._get_nested(prop, ["squareFeet", "LivingArea", "SqFt", "GLA"], None)),
            year_built=self._safe_int(self._get_nested(prop, ["yearBuilt", "YearBuilt", "BuiltYear"], None)),
            
            # Valuation
            assessed_value=self._safe_int(self._get_nested(prop, [
                "assessedValue", "TotalAssessedValue", "AssessedTotal"
            ], None)),
            market_value=self._safe_int(self._get_nested(prop, [
                "marketValue", "EstimatedValue", "AVM"
            ], None)),
            
            # Metadata
            enrichment_source="sitex",
            enrichment_timestamp=datetime.utcnow(),
            confidence_score=1.0,
        )
    
    def _get_nested(self, obj: Dict, paths: List[str], default: Any = None) -> Any:
        """Try multiple field paths, return first found value."""
        for path in paths:
            if "." in path:
                value = self._extract_dot_path(obj, path)
            else:
                value = obj.get(path)
            
            if value is not None and value != "":
                return value
        return default
    
    def _extract_dot_path(self, obj: dict, path: str) -> Any:
        """Extract value using dot notation path."""
        current = obj
        for key in path.split("."):
            if isinstance(current, dict) and key in current:
                current = current[key]
            else:
                return None
        return current
    
    def _safe_int(self, value: Any) -> Optional[int]:
        """Safely convert value to int."""
        if value is None:
            return None
        try:
            return int(float(str(value).replace(",", "")))
        except (ValueError, TypeError):
            return None
    
    def _safe_float(self, value: Any) -> Optional[float]:
        """Safely convert value to float."""
        if value is None:
            return None
        try:
            return float(str(value).replace(",", ""))
        except (ValueError, TypeError):
            return None


# =============================================================================
# Singleton Instance
# =============================================================================

sitex_service = SiteXService()
```

---

### 1.3 Create Property Routes

**Create file:** `api/app/routes/property.py`

```python
"""
Property Lookup API Routes
==========================

FastAPI routes for property data lookup via SiteX/BKI Connect API.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import logging
import os

from app.services.sitex_client import sitex_service, SiteXAuthError, SiteXRateLimitError
from app.services.sitex_models import PropertyData, PropertyMatch, PropertySearchResult

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/property", tags=["property"])


# =============================================================================
# Request/Response Models
# =============================================================================

class PropertyLookupRequest(BaseModel):
    """Request to look up property by address."""
    street: str
    city: Optional[str] = None
    state: str = "CA"
    zip: Optional[str] = None


class APNLookupRequest(BaseModel):
    """Request to look up property by APN."""
    apn: str
    fips: str  # County FIPS code


class PropertyServiceStatus(BaseModel):
    """Status of property lookup services."""
    sitex_configured: bool
    google_places_configured: bool
    sitex_base_url: Optional[str] = None


class PropertyLookupResponse(BaseModel):
    """
    Response from property lookup.
    
    status values:
    - "success": Single match, data in `property` field
    - "multi_match": Multiple matches, see `matches` field
    - "not_found": No property found
    - "not_configured": SiteX not configured
    - "error": Lookup failed, see `error` field
    """
    status: str
    property: Optional[PropertyData] = None
    matches: Optional[List[PropertyMatch]] = None
    match_count: int = 0
    error: Optional[str] = None


# =============================================================================
# Endpoints
# =============================================================================

@router.get("/status", response_model=PropertyServiceStatus)
async def get_service_status():
    """
    Check if property lookup services are configured.
    
    GET /property/status
    """
    return PropertyServiceStatus(
        sitex_configured=sitex_service.is_configured(),
        google_places_configured=bool(os.getenv("GOOGLE_MAPS_API_KEY")),
        sitex_base_url=sitex_service.config.base_url if sitex_service.is_configured() else None,
    )


@router.post("/lookup", response_model=PropertyLookupResponse)
async def lookup_property_by_address(request: PropertyLookupRequest):
    """
    Look up property data by address.
    
    POST /property/lookup
    {
        "street": "123 Main St",
        "city": "Los Angeles",
        "state": "CA",
        "zip": "90001"
    }
    
    Returns:
    - success: Single match with full property data
    - multi_match: Multiple potential matches (user should select)
    - not_found: No matching property
    - not_configured: SiteX credentials not set
    - error: API failure
    """
    if not sitex_service.is_configured():
        return PropertyLookupResponse(
            status="not_configured",
            error="Property lookup service not configured. Set SITEX_CLIENT_ID, SITEX_CLIENT_SECRET, and SITEX_FEED_ID."
        )
    
    try:
        result = await sitex_service.search_property(
            address=request.street,
            city=request.city,
            state=request.state,
            zip_code=request.zip,
        )
        
        return PropertyLookupResponse(
            status=result.status,
            property=result.data,
            matches=result.matches,
            match_count=result.match_count,
            error=result.message if result.status in ["error", "not_found"] else None,
        )
        
    except SiteXAuthError as e:
        logger.error(f"SiteX auth error: {e.message}")
        return PropertyLookupResponse(
            status="error",
            error="Authentication failed - check SiteX credentials"
        )
    except SiteXRateLimitError:
        logger.warning("SiteX rate limit exceeded")
        return PropertyLookupResponse(
            status="error",
            error="Rate limit exceeded - please try again later"
        )
    except Exception as e:
        logger.exception(f"Property lookup failed: {e}")
        return PropertyLookupResponse(
            status="error",
            error="Property lookup failed"
        )


@router.post("/lookup-by-apn", response_model=PropertyLookupResponse)
async def lookup_property_by_apn(request: APNLookupRequest):
    """
    Look up property data by APN (Assessor's Parcel Number).
    
    POST /property/lookup-by-apn
    {
        "apn": "1234-567-890",
        "fips": "06037"  // County FIPS code
    }
    """
    if not sitex_service.is_configured():
        return PropertyLookupResponse(
            status="not_configured",
            error="Property lookup service not configured"
        )
    
    try:
        result = await sitex_service.search_by_apn(
            apn=request.apn,
            fips=request.fips,
        )
        
        return PropertyLookupResponse(
            status=result.status,
            property=result.data,
            match_count=1 if result.data else 0,
            error=result.message if result.status in ["error", "not_found"] else None,
        )
        
    except SiteXAuthError as e:
        logger.error(f"SiteX auth error: {e.message}")
        return PropertyLookupResponse(
            status="error",
            error="Authentication failed - check SiteX credentials"
        )
    except Exception as e:
        logger.exception(f"APN lookup failed: {e}")
        return PropertyLookupResponse(
            status="error",
            error="APN lookup failed"
        )


@router.post("/clear-cache")
async def clear_property_cache():
    """
    Clear the property lookup cache.
    
    POST /property/clear-cache
    """
    sitex_service.clear_cache()
    return {"success": True, "message": "Cache cleared"}
```

---

### 1.4 Register Property Router

**Modify file:** `api/app/main.py`

Add import and register the router:

```python
from app.routes.property import router as property_router

# In the router registration section:
app.include_router(property_router)
```

---

### 1.5 Add Environment Variables

**Modify file:** `api/app/config.py`

Add SiteX configuration:

```python
# SiteX / BKI Connect Configuration (optional - graceful degradation if not set)
SITEX_BASE_URL: str = os.getenv("SITEX_BASE_URL", "https://api.bkiconnect.com")
SITEX_CLIENT_ID: Optional[str] = os.getenv("SITEX_CLIENT_ID")
SITEX_CLIENT_SECRET: Optional[str] = os.getenv("SITEX_CLIENT_SECRET")
SITEX_FEED_ID: Optional[str] = os.getenv("SITEX_FEED_ID")  # REQUIRED for API calls
SITEX_DEBUG: bool = os.getenv("SITEX_DEBUG", "false").lower() == "true"
SITEX_TIMEOUT: float = float(os.getenv("SITEX_TIMEOUT", "30"))
```

**Backend `.env` file - add these variables:**
```env
# SiteX / BKI Connect Property Data
SITEX_BASE_URL=https://api.bkiconnect.com
SITEX_CLIENT_ID=your_client_id
SITEX_CLIENT_SECRET=your_client_secret
SITEX_FEED_ID=your_feed_id
SITEX_DEBUG=false
SITEX_TIMEOUT=30
```

**IMPORTANT:** All three credentials (CLIENT_ID, CLIENT_SECRET, FEED_ID) are required for SiteX to function. The FEED_ID is included in the API URL path.

---

## PHASE 2: FRONTEND - Google Places + AddressAutocomplete

### 2.1 Create Google Places Utilities

**Create file:** `web/lib/google-places.ts`

```typescript
/**
 * Google Places Utilities
 */

import type { ParsedAddress } from "./property-types";

/**
 * Parse Google Places result into our address format
 */
export function parseGooglePlace(place: google.maps.places.PlaceResult): ParsedAddress {
  const components = place.address_components || [];
  
  const get = (type: string, short = false): string => {
    const comp = components.find((c) => c.types.includes(type));
    return comp ? (short ? comp.short_name : comp.long_name) : "";
  };

  const streetNumber = get("street_number");
  const route = get("route");
  const street = streetNumber ? `${streetNumber} ${route}` : route;
  
  const city = get("locality") || get("sublocality") || get("administrative_area_level_2");
  const state = get("administrative_area_level_1", true);
  const zip = get("postal_code");
  const county = get("administrative_area_level_2");

  const formatted = [street, city, state, zip].filter(Boolean).join(", ");

  return {
    street,
    city,
    state,
    zip,
    county,
    formatted,
    lat: place.geometry?.location?.lat(),
    lng: place.geometry?.location?.lng(),
    placeId: place.place_id,
  };
}

/**
 * Load Google Maps script
 */
export function loadGoogleMaps(apiKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Window not available"));
      return;
    }
    
    if (window.google?.maps?.places) {
      resolve();
      return;
    }

    const existing = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existing) {
      existing.addEventListener("load", () => resolve());
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(script);
  });
}
```

---

### 2.2 Create Property Types

**Create file:** `web/lib/property-types.ts`

```typescript
/**
 * Types for Address Autocomplete + SiteX Property Data
 */

// =============================================================================
// Address Types (from Google Places)
// =============================================================================

export interface ParsedAddress {
  street: string;        // "123 Main St"
  city: string;          // "Los Angeles"
  state: string;         // "CA"
  zip: string;           // "90001"
  county?: string;       // "Los Angeles"
  formatted: string;     // "123 Main St, Los Angeles, CA 90001"
  lat?: number;
  lng?: number;
  placeId?: string;
}

// =============================================================================
// Property Data (from SiteX)
// =============================================================================

export interface PropertyOwner {
  full_name: string;
  first_name: string;
  last_name: string;
  mailing_address: string;
  mailing_city: string;
  mailing_state: string;
  mailing_zip: string;
}

export interface PropertyData {
  // Address
  street_address: string;
  city: string;
  state: string;
  zip_code: string;
  county: string;
  
  // Identifiers
  apn: string;              // Assessor's Parcel Number
  fips: string;             // County FIPS code
  
  // Legal description
  legal_description: string;
  subdivision_name?: string;
  tract_number?: string;
  lot_number?: string;
  
  // Ownership
  primary_owner: PropertyOwner;
  secondary_owner?: PropertyOwner;
  vesting_type?: string;
  
  // Property details
  property_type?: string;   // "SFR", "Condo", etc.
  bedrooms?: number;
  bathrooms?: number;
  square_feet?: number;
  lot_size_sqft?: number;
  year_built?: number;
  stories?: number;
  
  // Valuation
  assessed_value?: number;
  land_value?: number;
  improvement_value?: number;
  market_value?: number;
  tax_amount?: number;
  tax_year?: number;
  
  // Metadata
  enrichment_source: string;
  enrichment_timestamp: string;
  confidence_score: number;
}

export interface PropertyMatch {
  address: string;
  city: string;
  state: string;
  zip_code: string;
  apn: string;
  fips: string;
  owner_name: string;
}

// =============================================================================
// Component Props
// =============================================================================

export interface AddressAutocompleteProps {
  /** Called when user selects an address */
  onSelect: (address: ParsedAddress, property?: PropertyData) => void;
  
  /** Called when multi-match occurs */
  onMultiMatch?: (matches: PropertyMatch[]) => void;
  
  /** Fetch property data from SiteX (default: false) */
  fetchPropertyData?: boolean;
  
  /** Input placeholder */
  placeholder?: string;
  
  /** Pre-fill value */
  defaultValue?: string;
  
  /** Disable input */
  disabled?: boolean;
  
  /** Container className */
  className?: string;
  
  /** Input className */
  inputClassName?: string;
  
  /** Restrict to countries (default: ["us"]) */
  countries?: string[];
  
  /** API endpoint for property lookup */
  propertyEndpoint?: string;
  
  /** Show property data card after selection */
  showPropertyCard?: boolean;
  
  /** Label for the input */
  label?: string;
  
  /** Required field indicator */
  required?: boolean;
}

// =============================================================================
// API Types
// =============================================================================

export interface PropertyLookupRequest {
  street: string;
  city?: string;
  state: string;
  zip?: string;
}

export interface PropertyLookupResponse {
  status: "success" | "multi_match" | "not_found" | "not_configured" | "error";
  property?: PropertyData;
  matches?: PropertyMatch[];
  match_count: number;
  error?: string;
}
```

---

### 2.3 Create AddressAutocomplete Component

**Create file:** `web/components/AddressAutocomplete.tsx`

```typescript
/**
 * AddressAutocomplete Component
 * 
 * Google Places autocomplete + SiteX property enrichment with multi-match handling
 * 
 * Usage:
 *   <AddressAutocomplete
 *     onSelect={(address, property) => console.log(address, property)}
 *     fetchPropertyData={true}
 *   />
 */

"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { parseGooglePlace, loadGoogleMaps } from "@/lib/google-places";
import type { 
  AddressAutocompleteProps, 
  ParsedAddress, 
  PropertyData,
  PropertyMatch,
  PropertyLookupResponse 
} from "@/lib/property-types";
import { cn } from "@/lib/utils";

export function AddressAutocomplete({
  onSelect,
  onMultiMatch,
  fetchPropertyData = false,
  placeholder = "Enter an address...",
  defaultValue = "",
  disabled = false,
  className = "",
  inputClassName = "",
  countries = ["us"],
  propertyEndpoint = "/property/lookup",
  showPropertyCard = false,
  label,
  required = false,
}: AddressAutocompleteProps) {
  
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  
  const [value, setValue] = useState(defaultValue);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [propertyData, setPropertyData] = useState<PropertyData | null>(null);
  const [multiMatches, setMultiMatches] = useState<PropertyMatch[] | null>(null);

  // ---------------------------------------------------------------------------
  // Load Google Maps
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      console.warn("Google Maps API key not configured - autocomplete disabled");
      setReady(true); // Allow manual input
      return;
    }

    loadGoogleMaps(apiKey)
      .then(() => setReady(true))
      .catch((err) => {
        console.error("Failed to load Google Maps:", err);
        setReady(true); // Allow manual input
      });
  }, []);

  // ---------------------------------------------------------------------------
  // Initialize Autocomplete
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!ready || !inputRef.current || autocompleteRef.current) return;
    if (typeof window === "undefined" || !window.google?.maps?.places) return;

    const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: countries },
      types: ["address"],
      fields: ["address_components", "formatted_address", "geometry", "place_id"],
    });

    autocomplete.addListener("place_changed", () => {
      handlePlaceSelect(autocomplete);
    });

    autocompleteRef.current = autocomplete;

    return () => {
      google.maps.event.clearInstanceListeners(autocomplete);
    };
  }, [ready]);

  // ---------------------------------------------------------------------------
  // Handle Selection
  // ---------------------------------------------------------------------------
  const handlePlaceSelect = useCallback(
    async (autocomplete: google.maps.places.Autocomplete) => {
      const place = autocomplete.getPlace();
      
      if (!place.address_components) {
        setError("Please select an address from the dropdown");
        return;
      }

      setError(null);
      setMultiMatches(null);
      const address = parseGooglePlace(place);
      setValue(address.formatted);
      setPropertyData(null);

      // Skip SiteX if not enabled
      if (!fetchPropertyData) {
        onSelect(address, undefined);
        return;
      }

      // Fetch property data
      setLoading(true);
      try {
        const result = await lookupProperty(address, propertyEndpoint);
        
        if (result.status === "success" && result.property) {
          setPropertyData(result.property);
          onSelect(address, result.property);
        } else if (result.status === "multi_match" && result.matches) {
          setMultiMatches(result.matches);
          onMultiMatch?.(result.matches);
          onSelect(address, undefined); // Still return address
        } else if (result.status === "not_configured") {
          // SiteX not configured - just use Google address
          console.warn("SiteX not configured");
          onSelect(address, undefined);
        } else {
          // not_found or error - still return address
          onSelect(address, undefined);
        }
      } catch (err) {
        console.error("Property lookup failed:", err);
        onSelect(address, undefined);
      } finally {
        setLoading(false);
      }
    },
    [fetchPropertyData, onSelect, onMultiMatch, propertyEndpoint]
  );

  // ---------------------------------------------------------------------------
  // Handle Multi-Match Selection
  // ---------------------------------------------------------------------------
  const handleMatchSelect = async (match: PropertyMatch) => {
    setLoading(true);
    setMultiMatches(null);
    
    try {
      // Look up by APN for more specific result
      const result = await lookupPropertyByApn(match.apn, match.fips, propertyEndpoint);
      
      if (result.status === "success" && result.property) {
        setPropertyData(result.property);
        
        // Create address from match
        const address: ParsedAddress = {
          street: match.address,
          city: match.city,
          state: match.state,
          zip: match.zip_code,
          formatted: `${match.address}, ${match.city}, ${match.state} ${match.zip_code}`,
        };
        setValue(address.formatted);
        onSelect(address, result.property);
      }
    } catch (err) {
      console.error("Match lookup failed:", err);
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className={cn("space-y-3", className)}>
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
            setPropertyData(null);
            setMultiMatches(null);
          }}
          placeholder={placeholder}
          disabled={disabled || !ready}
          autoComplete="off"
          className={cn(
            "w-full px-3 py-2 border rounded-md",
            "focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent",
            "disabled:bg-gray-100 disabled:cursor-not-allowed",
            error ? "border-red-500" : "border-gray-300",
            inputClassName
          )}
        />
        
        {/* Loading spinner */}
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <svg className="animate-spin h-5 w-5 text-teal-500" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12" cy="12" r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          </div>
        )}
      </div>
      
      {/* Error */}
      {error && <p className="text-sm text-red-600">{error}</p>}
      
      {/* Multi-Match Selection */}
      {multiMatches && multiMatches.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <h4 className="font-medium text-amber-900 mb-2">
            Multiple properties found - please select:
          </h4>
          <div className="space-y-2">
            {multiMatches.map((match, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleMatchSelect(match)}
                className="w-full text-left p-3 bg-white border border-amber-200 rounded hover:bg-amber-100 transition-colors"
              >
                <div className="font-medium">{match.address}</div>
                <div className="text-sm text-gray-600">
                  {match.city}, {match.state} • APN: {match.apn}
                </div>
                {match.owner_name && (
                  <div className="text-sm text-gray-500">Owner: {match.owner_name}</div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Property Data Card */}
      {showPropertyCard && propertyData && (
        <div className="p-4 bg-teal-50 border border-teal-200 rounded-lg">
          <h4 className="font-medium text-teal-900 mb-2">Property Details</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-gray-500">APN:</span>
              <span className="ml-2 font-medium">{propertyData.apn}</span>
            </div>
            <div>
              <span className="text-gray-500">County:</span>
              <span className="ml-2 font-medium">{propertyData.county}</span>
            </div>
            {propertyData.primary_owner?.full_name && (
              <div className="col-span-2">
                <span className="text-gray-500">Owner:</span>
                <span className="ml-2 font-medium">{propertyData.primary_owner.full_name}</span>
              </div>
            )}
            {propertyData.property_type && (
              <div>
                <span className="text-gray-500">Type:</span>
                <span className="ml-2 font-medium">{propertyData.property_type}</span>
              </div>
            )}
            {propertyData.year_built && (
              <div>
                <span className="text-gray-500">Year Built:</span>
                <span className="ml-2 font-medium">{propertyData.year_built}</span>
              </div>
            )}
            {propertyData.assessed_value && (
              <div className="col-span-2">
                <span className="text-gray-500">Assessed Value:</span>
                <span className="ml-2 font-medium">
                  ${propertyData.assessed_value.toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Property Lookup Helpers
// -----------------------------------------------------------------------------

async function lookupProperty(
  address: ParsedAddress,
  endpoint: string
): Promise<PropertyLookupResponse> {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "";
  const url = `${apiBase}${endpoint}`;
    
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      street: address.street,
      city: address.city,
      state: address.state,
      zip: address.zip,
    }),
  });

  if (!res.ok) {
    throw new Error("Lookup failed");
  }

  return res.json();
}

async function lookupPropertyByApn(
  apn: string,
  fips: string,
  baseEndpoint: string
): Promise<PropertyLookupResponse> {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "";
  const endpoint = baseEndpoint.replace("/lookup", "/lookup-by-apn");
  const url = `${apiBase}${endpoint}`;
    
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ apn, fips }),
  });

  if (!res.ok) {
    throw new Error("APN lookup failed");
  }

  return res.json();
}

export default AddressAutocomplete;
```

---

### 2.4 Add Google Maps Type Declaration

**Create file:** `web/types/google-maps.d.ts`

```typescript
/// <reference types="google.maps" />

declare global {
  interface Window {
    google: typeof google;
  }
}

export {};
```

---

## PHASE 3: INTEGRATION INTO WIZARD

### 3.1 Update Wizard Transaction-Property Step

**Modify file:** `web/components/rrer-questionnaire.tsx`

Find the `transaction-property` step and integrate AddressAutocomplete:

**IMPORTANT:** Find the section that renders the property address fields (look for `propertyAddress` or `AddressFields`).

Replace the manual address inputs with:

```tsx
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import type { ParsedAddress, PropertyData } from "@/lib/property-types";

// In state, add:
const [propertyLookupData, setPropertyLookupData] = useState<PropertyData | null>(null);

// In the transaction-property step rendering:
<div className="space-y-4">
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      Property Address
    </label>
    <AddressAutocomplete
      onSelect={(address, property) => {
        // Update collection data with parsed address
        updateCollection({
          propertyAddress: {
            street: address.street,
            city: address.city,
            state: address.state,
            zip: address.zip,
          },
          county: address.county || "",
          // Auto-fill from SiteX if available
          apn: property?.apn || collection.apn || "",
        });
        setPropertyLookupData(property || null);
      }}
      fetchPropertyData={true}
      showPropertyCard={true}
      placeholder="Start typing property address..."
      defaultValue={
        collection.propertyAddress
          ? `${collection.propertyAddress.street}, ${collection.propertyAddress.city}, ${collection.propertyAddress.state} ${collection.propertyAddress.zip}`
          : ""
      }
    />
  </div>
  
  {/* Show additional SiteX data if available */}
  {propertyLookupData && (
    <div className="p-4 bg-gray-50 rounded-lg border">
      <h4 className="font-medium mb-2">Property Information (from Title Plant)</h4>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <span className="text-gray-500">APN:</span>
          <span className="ml-2">{propertyLookupData.apn}</span>
        </div>
        <div>
          <span className="text-gray-500">Current Owner:</span>
          <span className="ml-2">{propertyLookupData.ownerName}</span>
        </div>
        {propertyLookupData.propertyType && (
          <div>
            <span className="text-gray-500">Property Type:</span>
            <span className="ml-2">{propertyLookupData.propertyType}</span>
          </div>
        )}
        {propertyLookupData.lastSalePrice && (
          <div>
            <span className="text-gray-500">Last Sale:</span>
            <span className="ml-2">
              ${propertyLookupData.lastSalePrice.toLocaleString()}
              {propertyLookupData.lastSaleDate && ` (${propertyLookupData.lastSaleDate})`}
            </span>
          </div>
        )}
      </div>
    </div>
  )}
  
  {/* Keep manual county input as fallback */}
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      County
    </label>
    <input
      type="text"
      value={collection.county || ""}
      onChange={(e) => updateCollection({ county: e.target.value })}
      className="w-full px-3 py-2 border border-gray-300 rounded-md"
      placeholder="County will auto-fill from address"
    />
  </div>
  
  {/* Keep APN input */}
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      APN (Assessor's Parcel Number)
    </label>
    <input
      type="text"
      value={collection.apn || ""}
      onChange={(e) => updateCollection({ apn: e.target.value })}
      className="w-full px-3 py-2 border border-gray-300 rounded-md"
      placeholder="Auto-filled from property lookup"
    />
  </div>
</div>
```

---

### 3.2 Update Client Submission Form

**Modify file:** `web/app/(app)/app/requests/new/page.tsx`

Replace the manual property address inputs with AddressAutocomplete:

```tsx
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import type { ParsedAddress, PropertyData } from "@/lib/property-types";

// In state:
const [propertyData, setPropertyData] = useState<PropertyData | null>(null);

// In form rendering (find the property address section):
<div className="space-y-4">
  <h3 className="font-medium">Property Information</h3>
  
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      Property Address *
    </label>
    <AddressAutocomplete
      onSelect={(address, property) => {
        setFormData(prev => ({
          ...prev,
          propertyAddress: address.formatted,
          propertyStreet: address.street,
          propertyCity: address.city,
          propertyState: address.state,
          propertyZip: address.zip,
          propertyCounty: address.county || "",
        }));
        setPropertyData(property || null);
      }}
      fetchPropertyData={true}
      showPropertyCard={true}
      placeholder="Start typing the property address..."
    />
  </div>
  
  {/* Show seller name from SiteX lookup */}
  {propertyData?.ownerName && !formData.sellerName && (
    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
      <p className="text-sm text-blue-800">
        <strong>Tip:</strong> Current owner on record is "{propertyData.ownerName}".
        <button
          type="button"
          onClick={() => setFormData(prev => ({ ...prev, sellerName: propertyData.ownerName }))}
          className="ml-2 text-blue-600 underline"
        >
          Use as seller name
        </button>
      </p>
    </div>
  )}
</div>
```

---

## PHASE 4: UPDATE WIZARD_DATA SCHEMA

### 4.1 Add SiteX Data to Collection Schema

**Modify file:** `web/lib/rrer-types.ts`

Add to the `CollectionData` interface:

```typescript
interface CollectionData {
  // ... existing fields ...
  
  // SiteX Property Data (optional enrichment)
  siteXData?: {
    apn?: string;
    ownerName?: string;
    ownerName2?: string;
    propertyType?: string;
    bedrooms?: number;
    bathrooms?: number;
    sqft?: number;
    yearBuilt?: number;
    lastSaleDate?: string;
    lastSalePrice?: number;
    assessedValue?: number;
    lookupTimestamp?: string;
  };
}
```

---

### 4.2 Update API Types

**Modify file:** `web/lib/api.ts`

Add property lookup function:

```typescript
export interface PropertyLookupResult {
  success: boolean;
  property?: {
    apn: string;
    ownerName: string;
    ownerName2?: string;
    mailingAddress?: string;
    propertyType?: string;
    bedrooms?: number;
    bathrooms?: number;
    sqft?: number;
    lotSize?: number;
    yearBuilt?: number;
    lastSaleDate?: string;
    lastSalePrice?: number;
    assessedValue?: number;
  };
  error?: string;
}

export async function lookupPropertyByAddress(
  street: string,
  city: string,
  state: string,
  zip?: string
): Promise<PropertyLookupResult> {
  const res = await fetch(`${API_BASE}/property/lookup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ street, city, state, zip }),
  });
  return res.json();
}
```

---

## PHASE 5: DOCUMENTATION UPDATES

### 5.1 Update WIZARD_MASTER_TECH_SPEC.md

Add Section 11 at the end of the document:

```markdown
---

## 11. SiteX Integration & Address Autocomplete

### 11.1 Overview

The wizard integrates with Google Places for address autocomplete and SiteX for property data enrichment. This provides:
- Fast, accurate address entry
- Auto-fill of county, APN, and property details
- Current owner lookup (useful for seller verification)
- Property type verification

### 11.2 Architecture

```
User types address
    ↓
Google Places suggests addresses
    ↓
User selects address
    ↓ (ParsedAddress)
Frontend calls POST /property/lookup
    ↓
SiteX returns property data
    ↓ (PropertyData)
Wizard state updated with:
- propertyAddress (street, city, state, zip)
- county (auto-filled)
- apn (auto-filled)
- siteXData (full property record)
```

### 11.3 Data Flow

| Source | Field | Destination | Notes |
|--------|-------|-------------|-------|
| Google Places | street | collection.propertyAddress.street | Parsed from address_components |
| Google Places | city | collection.propertyAddress.city | locality or sublocality |
| Google Places | state | collection.propertyAddress.state | administrative_area_level_1 (short) |
| Google Places | zip | collection.propertyAddress.zip | postal_code |
| Google Places | county | collection.county | administrative_area_level_2 |
| SiteX | apn | collection.apn | Assessor's Parcel Number |
| SiteX | ownerName | (display only) | Current owner of record |
| SiteX | propertyType | collection.siteXData.propertyType | Single Family, Condo, etc. |
| SiteX | lastSalePrice | collection.siteXData.lastSalePrice | Previous sale amount |

### 11.4 Integration Points

| Location | Component | Purpose |
|----------|-----------|---------|
| Client form | `requests/new/page.tsx` | Initial address entry |
| Wizard | `rrer-questionnaire.tsx` (transaction-property) | Staff verification |
| Backend | `routes/property.py` | SiteX proxy |
| Service | `services/sitex_client.py` | SiteX API client |

### 11.5 Configuration

**Frontend (.env.local or Vercel):**
```
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_key
```

**Backend (.env or Render):**
```
# SiteX / BKI Connect Property Data
SITEX_BASE_URL=https://api.bkiconnect.com
SITEX_CLIENT_ID=your_client_id
SITEX_CLIENT_SECRET=your_client_secret
SITEX_FEED_ID=your_feed_id
SITEX_DEBUG=false
SITEX_TIMEOUT=30
```

**IMPORTANT:** All four SiteX variables are required:
- `SITEX_CLIENT_ID` - OAuth client ID
- `SITEX_CLIENT_SECRET` - OAuth client secret  
- `SITEX_FEED_ID` - Feed ID (included in API URL path)
- `SITEX_BASE_URL` - API base URL (default: https://api.bkiconnect.com)

### 11.6 Graceful Degradation

- If Google Places unavailable: Manual address entry works
- If SiteX unavailable: Address autocomplete works, no property enrichment
- No hard failures - all lookups are optional enhancements

### 11.7 Files Added

| File | Purpose |
|------|---------|
| `api/app/services/sitex_client.py` | SiteX API client with OAuth |
| `api/app/routes/property.py` | Property lookup endpoints |
| `api/app/schemas/property.py` | Pydantic models |
| `web/components/AddressAutocomplete.tsx` | Autocomplete component |
| `web/lib/google-places.ts` | Google Places utilities |
| `web/lib/property-types.ts` | TypeScript types |
| `web/types/google-maps.d.ts` | Google Maps type declarations |
```

---

### 5.2 Create KilledSharks-2.md

**Create file:** `docs/KilledSharks-2.md`

```markdown
# 🦈 Killed Sharks - Volume 2

> January 30, 2026 and beyond

---

## Summary

| Category | Count |
|----------|-------|
| 🔴 Critical Features | 0 |
| 🟠 Major Features | 1 |
| 🎨 UX/Design | 0 |
| 🔧 Configuration | 0 |
| 📄 Documentation | 1 |

**Total Sharks Killed (Vol 2): 2 🦈**

---

## 🟠 Major Features

### 42. SiteX Integration + Google Places Autocomplete ✅

**Date:** January 30, 2026

**Problem:** Manual address entry was slow, error-prone, and didn't leverage existing title plant data. Users had to manually enter:
- Full property address
- County
- APN (Assessor's Parcel Number)
- Verify property type

**Solution:** Integrated Google Places autocomplete with SiteX property data enrichment.

**Backend Implementation:**

| Component | Purpose |
|-----------|---------|
| `api/app/services/sitex_client.py` | SiteX API client with OAuth token management |
| `api/app/routes/property.py` | Property lookup endpoints |
| `api/app/schemas/property.py` | Pydantic request/response models |

**API Endpoints:**

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/property/status` | GET | Check if services configured |
| `/property/lookup` | POST | Lookup by address |
| `/property/lookup-by-apn` | POST | Lookup by APN |

**Frontend Implementation:**

| Component | Purpose |
|-----------|---------|
| `AddressAutocomplete.tsx` | Google Places autocomplete + SiteX lookup |
| `google-places.ts` | Address parsing utilities |
| `property-types.ts` | TypeScript interfaces |

**Integration Points:**

| Location | What Changed |
|----------|--------------|
| `requests/new/page.tsx` | Added AddressAutocomplete to client form |
| `rrer-questionnaire.tsx` | Added AddressAutocomplete to transaction-property step |
| `WIZARD_MASTER_TECH_SPEC.md` | Added Section 11: SiteX Integration |

**Data Auto-Fill:**
- ✅ County (from Google Places)
- ✅ APN (from SiteX)
- ✅ Property type verification (from SiteX)
- ✅ Current owner display (from SiteX)

**Environment Variables Added:**
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- `SITEX_CLIENT_ID`
- `SITEX_CLIENT_SECRET`
- `SITEX_BASE_URL`

**Files Created:**
- `api/app/services/sitex_client.py` (NEW - 450+ lines)
- `api/app/services/sitex_models.py` (NEW - 130 lines)
- `api/app/routes/property.py` (NEW - 150 lines)
- `web/components/AddressAutocomplete.tsx` (NEW - 320 lines)
- `web/lib/google-places.ts` (NEW - 65 lines)
- `web/lib/property-types.ts` (NEW - 130 lines)
- `web/types/google-maps.d.ts` (NEW - 10 lines)

**Files Modified:**
- `api/app/main.py` (registered property router)
- `api/app/config.py` (added SiteX config variables)
- `api/requirements.txt` (added httpx if not present)
- `web/lib/rrer-types.ts` (added siteXData to CollectionData)
- `web/lib/api.ts` (added lookupPropertyByAddress)
- `web/app/(app)/app/requests/new/page.tsx` (integrated autocomplete)
- `web/components/rrer-questionnaire.tsx` (integrated autocomplete)
- `docs/WIZARD_MASTER_TECH_SPEC.md` (added Section 11)

**Status:** ✅ Killed

---

## 📄 Documentation

### 43. WIZARD_MASTER_TECH_SPEC Section 11 Added ✅

**Date:** January 30, 2026

**Problem:** SiteX integration not documented in master tech spec.

**Solution:** Added comprehensive Section 11 covering:
- Architecture overview
- Data flow mapping
- Integration points
- Configuration requirements
- Graceful degradation behavior

**Status:** ✅ Killed

---

## Next Steps

1. **P2:** Add property type validation against SiteX data
2. **P3:** Cache SiteX lookups to reduce API calls
3. **P3:** Add APN lookup as alternative to address lookup
4. **P3:** Surface lastSalePrice for pricing sanity check

---

*Last updated: January 30, 2026*
```

---

## PHASE 6: ENVIRONMENT SETUP

### 6.1 Update .env.example Files

**Backend `.env.example` - add:**
```env
# =============================================================================
# SiteX / BKI Connect Property Data Integration
# =============================================================================
# Get credentials from your BKI Connect account
# All four variables are REQUIRED for property lookup to function

SITEX_BASE_URL=https://api.bkiconnect.com
SITEX_CLIENT_ID=your_client_id_here
SITEX_CLIENT_SECRET=your_client_secret_here
SITEX_FEED_ID=your_feed_id_here
SITEX_DEBUG=false
SITEX_TIMEOUT=30
```

**Frontend `.env.example` - add:**
```env
# =============================================================================
# Google Places API
# =============================================================================
# Get from Google Cloud Console > APIs & Services > Credentials
# Enable: Places API, Maps JavaScript API

NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_api_key_here
```

### 6.2 Add to Vercel (Frontend)

In Vercel dashboard for fincenclear.com:
1. Go to Settings → Environment Variables
2. Add: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` = your Google API key
3. Redeploy

### 6.3 Add to Render (Backend)

In Render dashboard for pct-fin-cen-staging:
1. Go to Environment
2. Add these variables:
   - `SITEX_BASE_URL` = `https://api.bkiconnect.com`
   - `SITEX_CLIENT_ID` = your client ID
   - `SITEX_CLIENT_SECRET` = your client secret
   - `SITEX_FEED_ID` = your feed ID
3. Redeploy

---

## VERIFICATION CHECKLIST

Before marking complete, verify:

- [ ] Backend starts without errors
- [ ] `GET /property/status` returns correct configuration state
- [ ] `POST /property/lookup` works (if SiteX configured) or returns graceful error
- [ ] Frontend builds without TypeScript errors
- [ ] AddressAutocomplete renders in client form
- [ ] AddressAutocomplete renders in wizard transaction-property step
- [ ] Address selection triggers SiteX lookup (if configured)
- [ ] County auto-fills from Google Places
- [ ] APN auto-fills from SiteX (if configured)
- [ ] Property data card displays (if showPropertyCard=true)
- [ ] Manual input still works if Google/SiteX unavailable
- [ ] WIZARD_MASTER_TECH_SPEC.md has Section 11
- [ ] KilledSharks-2.md created with Shark #42 and #43

---

## EXECUTION ORDER

1. **Backend first** (Phase 1) - creates API endpoints
2. **Frontend types** (Phase 2.1, 2.2) - no dependencies
3. **AddressAutocomplete component** (Phase 2.3, 2.4)
4. **Integration** (Phase 3) - wire into forms
5. **Schema updates** (Phase 4)
6. **Documentation** (Phase 5)
7. **Verification** (Phase 6)

---

**REMEMBER: Update KilledSharks-2.md as you complete each phase!**
