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
        
        params = {
            "address1": address,
        }
        if last_line:
            params["lastLine"] = last_line
        
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
                state=self._get_nested(candidate, ["state", "State", "SiteState"], "CA"),
                zip_code=self._get_nested(candidate, ["zip", "zipCode", "Zip", "PostalCode"], ""),
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
