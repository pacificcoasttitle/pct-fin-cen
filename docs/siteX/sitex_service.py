"""
SiteX Property Service for FinCEN
==================================
Retrieves: Address, APN, Legal Description, Subdivision Type, Owner Names

OAuth2 client_credentials flow → SiteX Property Search API

ENV VARS REQUIRED:
    SITEX_CLIENT_ID
    SITEX_CLIENT_SECRET
    SITEX_BASE_URL      (default: https://api.bkiconnect.com)
    SITEX_FEED_ID        (your feed identifier)
    SITEX_DEBUG          (default: false)
"""

import os
import asyncio
import base64
import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

import httpx
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


# =============================================================================
# Response Models
# =============================================================================

class PropertyOwner(BaseModel):
    """Property owner information."""
    first_name: str = ""
    last_name: str = ""
    full_name: str = ""
    owner_type: str = ""  # "individual", "corporation", "trust", etc.

    @property
    def display_name(self) -> str:
        if self.full_name:
            return self.full_name
        parts = [p for p in [self.first_name, self.last_name] if p]
        return " ".join(parts) if parts else "Unknown"


class PropertyData(BaseModel):
    """The 5 fields you need for FinCEN + extras."""
    # === YOUR 5 REQUIRED FIELDS ===
    address: str = ""                          # Full formatted address
    apn: str = ""                              # Assessor's Parcel Number
    legal_description: str = ""                # Legal description
    subdivision_type: str = ""                 # Subdivision / plat type
    owner_names: List[PropertyOwner] = Field(default_factory=list)

    # === Bonus fields (free from same API call) ===
    street_address: str = ""
    city: str = ""
    state: str = ""
    zip_code: str = ""
    county: str = ""
    fips: str = ""
    property_type: str = ""
    lot_size: str = ""
    assessed_value: Optional[int] = None
    year_built: Optional[int] = None

    @property
    def owner_names_display(self) -> str:
        """All owner names as a single string."""
        names = [o.display_name for o in self.owner_names if o.display_name != "Unknown"]
        return " & ".join(names) if names else "Unknown"

    def to_fincen_dict(self) -> dict:
        """Return just the 5 fields FinCEN needs."""
        return {
            "address": self.address,
            "apn": self.apn,
            "legal_description": self.legal_description,
            "subdivision_type": self.subdivision_type,
            "owner_names": self.owner_names_display,
        }


class PropertySearchResult(BaseModel):
    """Result wrapper with status."""
    status: str = "error"  # "success", "multi_match", "not_found", "error"
    data: Optional[PropertyData] = None
    matches: List[dict] = Field(default_factory=list)
    match_count: int = 0
    message: str = ""


# =============================================================================
# Exceptions
# =============================================================================

class SiteXError(Exception):
    def __init__(self, message: str, status_code: int = None):
        self.message = message
        self.status_code = status_code
        super().__init__(message)

class SiteXAuthError(SiteXError):
    pass

class SiteXNotConfiguredError(SiteXError):
    pass


# =============================================================================
# OAuth Token Manager
# =============================================================================

class TokenManager:
    """Thread-safe OAuth2 client_credentials token management."""

    def __init__(self, client_id: str, client_secret: str, token_url: str):
        self.client_id = client_id
        self.client_secret = client_secret
        self.token_url = token_url
        self._token: Optional[str] = None
        self._expiry: datetime = datetime.min
        self._lock = asyncio.Lock()

    async def get_token(self) -> str:
        async with self._lock:
            # Return cached token if still valid (with 60s buffer)
            if self._token and datetime.utcnow() < (self._expiry - timedelta(seconds=60)):
                return self._token
            return await self._refresh()

    async def _refresh(self) -> str:
        """
        THE OUTBOUND CALL FOR OAuth TOKEN
        
        This is the #1 place things break. Common issues:
        1. Wrong token URL (must include full path)
        2. client_id:client_secret must be base64 encoded as Basic auth
        3. Content-Type MUST be application/x-www-form-urlencoded
        4. Body MUST be grant_type=client_credentials (form data, NOT JSON)
        """
        credentials = f"{self.client_id}:{self.client_secret}"
        basic_auth = base64.b64encode(credentials.encode()).decode()

        logger.info(f"🔑 Requesting OAuth token from: {self.token_url}")

        async with httpx.AsyncClient(timeout=20.0) as client:
            try:
                response = await client.post(
                    self.token_url,
                    headers={
                        "Authorization": f"Basic {basic_auth}",
                        "Content-Type": "application/x-www-form-urlencoded",
                    },
                    # KEY: This must be `data=` (form-encoded), NOT `json=`
                    data={"grant_type": "client_credentials"},
                )

                logger.info(f"🔑 Token response status: {response.status_code}")

                if response.status_code == 401:
                    logger.error(f"🔑 Auth failed. Check SITEX_CLIENT_ID and SITEX_CLIENT_SECRET")
                    raise SiteXAuthError("Invalid SiteX credentials", 401)

                response.raise_for_status()
                result = response.json()

                self._token = result["access_token"]
                expires_in = result.get("expires_in", 600)
                self._expiry = datetime.utcnow() + timedelta(seconds=expires_in)

                logger.info(f"✅ Token acquired, expires in {expires_in}s")
                return self._token

            except httpx.HTTPStatusError as e:
                body = e.response.text[:500] if e.response else "no body"
                logger.error(f"❌ Token request failed: {e.response.status_code} - {body}")
                raise SiteXAuthError(f"Token refresh failed: {e}", e.response.status_code)
            except httpx.ConnectError as e:
                logger.error(f"❌ Cannot connect to token URL: {self.token_url} - {e}")
                raise SiteXError(f"Connection failed: {e}")

    def invalidate(self):
        self._token = None
        self._expiry = datetime.min


# =============================================================================
# SiteX Property Service
# =============================================================================

class SiteXPropertyService:
    """
    Makes outbound calls to SiteX to retrieve property data.
    
    Flow:
    1. Get OAuth token (cached, auto-refreshes)
    2. Call property search endpoint with address
    3. Parse response to extract your 5 fields
    """

    def __init__(self):
        self.base_url = os.getenv("SITEX_BASE_URL", "https://api.bkiconnect.com").rstrip("/")
        self.client_id = os.getenv("SITEX_CLIENT_ID", "")
        self.client_secret = os.getenv("SITEX_CLIENT_SECRET", "")
        self.feed_id = os.getenv("SITEX_FEED_ID", "")
        self.debug = os.getenv("SITEX_DEBUG", "false").lower() == "true"

        # Token URL - this is the ICE/BKI standard path
        token_url = f"{self.base_url}/ls/apigwy/oauth2/v1/token"

        self.token_manager = TokenManager(
            client_id=self.client_id,
            client_secret=self.client_secret,
            token_url=token_url,
        )

        # Cache: key -> (PropertyData, timestamp)
        self._cache: Dict[str, Tuple[PropertyData, datetime]] = {}
        self._cache_ttl = timedelta(hours=1)

        logger.info(f"SiteX configured: base_url={self.base_url}, feed_id={self.feed_id}")

    def is_configured(self) -> bool:
        return all([self.client_id, self.client_secret, self.feed_id])

    # -------------------------------------------------------------------------
    # Public API
    # -------------------------------------------------------------------------

    async def search_property(
        self,
        address: str,
        city: Optional[str] = None,
        state: str = "CA",
        zip_code: Optional[str] = None,
        use_cache: bool = True,
    ) -> PropertySearchResult:
        """
        Search for property by address.
        Returns PropertySearchResult with your 5 FinCEN fields.
        """
        if not self.is_configured():
            raise SiteXNotConfiguredError(
                "Missing env vars. Need: SITEX_CLIENT_ID, SITEX_CLIENT_SECRET, SITEX_FEED_ID"
            )

        # Check cache
        cache_key = f"{address}|{city}|{state}|{zip_code}".lower()
        if use_cache:
            cached = self._get_cached(cache_key)
            if cached:
                logger.info(f"📦 Cache hit for: {address}")
                return PropertySearchResult(status="success", data=cached)

        try:
            # Build the "last line" (city, state zip)
            last_line = self._build_last_line(city, state, zip_code)

            # === THE OUTBOUND PROPERTY SEARCH CALL ===
            raw = await self._make_search_request(address, last_line)

            # Check response type
            if self._is_multi_match(raw):
                matches = self._extract_matches(raw)
                return PropertySearchResult(
                    status="multi_match",
                    matches=matches,
                    match_count=len(matches),
                    message=f"Found {len(matches)} potential matches",
                )

            if self._is_no_match(raw):
                return PropertySearchResult(
                    status="not_found",
                    message="No property found for this address",
                )

            # Parse the successful response
            prop_data = self._parse_property(raw, address, city, state, zip_code)

            # Cache it
            self._cache[cache_key] = (prop_data, datetime.utcnow())

            return PropertySearchResult(status="success", data=prop_data)

        except (SiteXAuthError, SiteXNotConfiguredError):
            raise
        except Exception as e:
            logger.exception(f"SiteX search error: {e}")
            return PropertySearchResult(status="error", message=str(e))

    # -------------------------------------------------------------------------
    # The Actual Outbound HTTP Call
    # -------------------------------------------------------------------------

    async def _make_search_request(self, address: str, last_line: str) -> dict:
        """
        THE OUTBOUND CALL TO SITEX PROPERTY SEARCH
        
        This is where most implementations break. Key points:
        
        1. URL format: {base_url}/ls/publicsearch/v1/{feed_id}/property
        2. Auth: Bearer token from OAuth (not Basic auth)
        3. Method: GET with query params (NOT POST with JSON body)
        4. Params: address1={street}&lastLine={city, state zip}
        """
        token = await self.token_manager.get_token()

        search_url = f"{self.base_url}/ls/publicsearch/v1/{self.feed_id}/property"

        params = {
            "address1": address,
        }
        if last_line:
            params["lastLine"] = last_line

        headers = {
            "Authorization": f"Bearer {token}",
            "Accept": "application/json",
        }

        logger.info(f"🔍 SiteX search: url={search_url}")
        logger.info(f"🔍 SiteX params: {params}")

        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.get(
                    search_url,
                    params=params,
                    headers=headers,
                )

                logger.info(f"🔍 SiteX response status: {response.status_code}")

                if response.status_code == 401:
                    # Token expired mid-request, invalidate and retry once
                    logger.warning("Token expired, refreshing...")
                    self.token_manager.invalidate()
                    token = await self.token_manager.get_token()
                    headers["Authorization"] = f"Bearer {token}"
                    response = await client.get(search_url, params=params, headers=headers)

                if response.status_code == 429:
                    raise SiteXError("Rate limited by SiteX", 429)

                response.raise_for_status()
                data = response.json()

                if self.debug:
                    logger.debug(f"🔍 SiteX raw response: {data}")

                return data

            except httpx.ConnectError as e:
                logger.error(f"❌ Cannot connect to SiteX: {search_url} - {e}")
                raise SiteXError(f"Connection to SiteX failed: {e}")
            except httpx.HTTPStatusError as e:
                body = e.response.text[:500] if e.response else ""
                logger.error(f"❌ SiteX error {e.response.status_code}: {body}")
                raise SiteXError(f"SiteX API error: {e.response.status_code}", e.response.status_code)

    # -------------------------------------------------------------------------
    # Response Parsing - Extract Your 5 Fields
    # -------------------------------------------------------------------------

    def _parse_property(
        self, raw: dict, address: str, city: str = None, state: str = None, zip_code: str = None
    ) -> PropertyData:
        """
        Parse the SiteX response into PropertyData.
        
        SiteX responses are nested and field names vary by feed.
        We try multiple possible field paths for each value.
        """
        # The property data is usually nested under a key
        prop = self._find_property_object(raw)

        if not prop:
            logger.warning("Could not find property object in SiteX response")
            return PropertyData(address=address)

        # === FIELD 1: ADDRESS ===
        street = self._try_fields(prop, [
            "SiteStreetAddress", "SiteAddress", "StreetAddress",
            "PropertyAddress", "address1", "Address",
        ]) or address
        site_city = self._try_fields(prop, [
            "SiteCity", "City", "PropertyCity",
        ]) or city or ""
        site_state = self._try_fields(prop, [
            "SiteState", "State", "PropertyState",
        ]) or state or ""
        site_zip = self._try_fields(prop, [
            "SiteZip", "ZipCode", "Zip", "PostalCode",
        ]) or zip_code or ""

        full_address = f"{street}, {site_city}, {site_state} {site_zip}".strip(", ")

        # === FIELD 2: APN ===
        apn = self._try_fields(prop, [
            "APN", "ParcelNumber", "AssessorParcelNumber",
            "apn", "TaxID", "ParcelID", "Apn",
            "APNFormatted", "APNUnformatted",
        ]) or ""

        # === FIELD 3: LEGAL DESCRIPTION ===
        legal_desc = self._try_fields(prop, [
            "LegalDescription", "LegalDesc", "Legal",
            "legal_description", "LegalBriefDescription",
            "LegalLot", "LegalBlock", "LegalSection",
        ]) or ""

        # If legal is split across multiple fields, combine them
        if not legal_desc:
            parts = []
            lot = self._try_fields(prop, ["LegalLot", "Lot"])
            block = self._try_fields(prop, ["LegalBlock", "Block"])
            section = self._try_fields(prop, ["LegalSection", "Section"])
            tract = self._try_fields(prop, ["LegalTract", "Tract"])
            if lot:
                parts.append(f"Lot {lot}")
            if block:
                parts.append(f"Block {block}")
            if section:
                parts.append(f"Section {section}")
            if tract:
                parts.append(f"Tract {tract}")
            legal_desc = ", ".join(parts)

        # === FIELD 4: SUBDIVISION TYPE ===
        subdivision = self._try_fields(prop, [
            "SubdivisionName", "Subdivision", "SubdivisionType",
            "PlatName", "TractName", "SubName",
            "LegalSubdivision", "SubdivisionPlat",
        ]) or ""

        # === FIELD 5: OWNER NAMES ===
        owners = self._extract_owners(prop)

        return PropertyData(
            address=full_address,
            street_address=street,
            city=site_city,
            state=site_state,
            zip_code=site_zip,
            apn=apn,
            legal_description=legal_desc,
            subdivision_type=subdivision,
            owner_names=owners,
            county=self._try_fields(prop, ["County", "CountyName", "SiteCounty"]) or "",
            fips=self._try_fields(prop, ["FIPS", "FIPSCode", "CountyFIPS"]) or "",
            property_type=self._try_fields(prop, [
                "PropertyType", "UseCode", "PropertyUseType", "LandUse",
            ]) or "",
            lot_size=self._try_fields(prop, [
                "LotSize", "LotSizeAcres", "LotSizeSqFt", "LandAreaSqFt",
            ]) or "",
            assessed_value=self._safe_int(self._try_fields(prop, [
                "TotalAssessedValue", "AssessedValue", "AssessedTotal",
            ])),
            year_built=self._safe_int(self._try_fields(prop, [
                "YearBuilt", "BuiltYear", "EffectiveYearBuilt",
            ])),
        )

    def _extract_owners(self, prop: dict) -> List[PropertyOwner]:
        """Extract owner names from various SiteX field patterns."""
        owners = []

        # Pattern 1: Owner1First/Owner1Last, Owner2First/Owner2Last
        for prefix in ["Owner1", "Owner2", "owner1", "owner2"]:
            first = self._try_fields(prop, [
                f"{prefix}First", f"{prefix}FirstName", f"{prefix}_first_name",
            ]) or ""
            last = self._try_fields(prop, [
                f"{prefix}Last", f"{prefix}LastName", f"{prefix}_last_name",
            ]) or ""
            full = self._try_fields(prop, [
                f"{prefix}Name", f"{prefix}FullName", f"{prefix}_name",
            ]) or ""

            if full or first or last:
                owners.append(PropertyOwner(
                    first_name=first,
                    last_name=last,
                    full_name=full or f"{first} {last}".strip(),
                ))

        # Pattern 2: Single "OwnerName" field with " & " or " AND "
        if not owners:
            owner_str = self._try_fields(prop, [
                "OwnerName", "OwnerNames", "Owner",
                "GranteeName", "VestingOwner",
            ]) or ""
            if owner_str:
                # Split on common delimiters
                for delim in [" & ", " AND ", " and ", ";", ","]:
                    if delim in owner_str:
                        for name in owner_str.split(delim):
                            name = name.strip()
                            if name:
                                owners.append(PropertyOwner(full_name=name))
                        break
                else:
                    owners.append(PropertyOwner(full_name=owner_str))

        return owners

    # -------------------------------------------------------------------------
    # Helpers
    # -------------------------------------------------------------------------

    def _find_property_object(self, raw: dict) -> Optional[dict]:
        """
        Find the actual property data object in the response.
        SiteX nests data differently depending on the endpoint.
        """
        # Direct property fields at top level
        if "APN" in raw or "SiteStreetAddress" in raw or "ParcelNumber" in raw:
            return raw

        # Nested under common keys
        for key in ["property", "Property", "data", "Data", "result", "Result", "properties"]:
            if key in raw:
                val = raw[key]
                if isinstance(val, dict):
                    return val
                if isinstance(val, list) and len(val) > 0:
                    return val[0]  # First match

        # Sometimes it's { "response": { "property": {...} } }
        if "response" in raw:
            return self._find_property_object(raw["response"])

        # Last resort: return the whole thing
        return raw

    def _try_fields(self, obj: dict, field_names: List[str]) -> Optional[str]:
        """Try multiple field names, return first non-empty value."""
        for name in field_names:
            # Handle dot notation for nested fields
            if "." in name:
                val = self._get_nested(obj, name)
            else:
                val = obj.get(name)

            if val is not None and str(val).strip() != "":
                return str(val).strip()
        return None

    def _get_nested(self, obj: dict, path: str) -> Any:
        """Get value from nested dict using dot notation."""
        current = obj
        for key in path.split("."):
            if isinstance(current, dict) and key in current:
                current = current[key]
            else:
                return None
        return current

    def _build_last_line(self, city: str = None, state: str = None, zip_code: str = None) -> str:
        """Build the 'last line' parameter: 'City, ST ZIP'"""
        parts = []
        if city:
            parts.append(city)
        if state:
            if parts:
                parts[-1] += ","
            parts.append(state)
        if zip_code:
            parts.append(zip_code)
        return " ".join(parts)

    def _is_multi_match(self, raw: dict) -> bool:
        """Check if response indicates multiple matches."""
        if raw.get("matchCode") == "MULTI":
            return True
        if raw.get("status") == "multi_match":
            return True
        props = raw.get("properties", raw.get("Property", []))
        if isinstance(props, list) and len(props) > 1:
            return True
        return False

    def _is_no_match(self, raw: dict) -> bool:
        """Check if response indicates no matches."""
        if raw.get("matchCode") == "NONE":
            return True
        if raw.get("status") in ("not_found", "no_match"):
            return True
        if raw.get("totalRecords", -1) == 0:
            return True
        return False

    def _extract_matches(self, raw: dict) -> List[dict]:
        """Extract match candidates from multi-match response."""
        matches = []
        props = raw.get("properties", raw.get("Property", []))
        if isinstance(props, list):
            for p in props[:10]:  # Limit to 10
                matches.append({
                    "address": self._try_fields(p, ["SiteStreetAddress", "Address"]) or "",
                    "city": self._try_fields(p, ["SiteCity", "City"]) or "",
                    "state": self._try_fields(p, ["SiteState", "State"]) or "",
                    "apn": self._try_fields(p, ["APN", "ParcelNumber"]) or "",
                    "owner": self._try_fields(p, ["OwnerName", "Owner1Name"]) or "",
                })
        return matches

    def _get_cached(self, key: str) -> Optional[PropertyData]:
        if key in self._cache:
            data, ts = self._cache[key]
            if datetime.utcnow() - ts < self._cache_ttl:
                return data
            del self._cache[key]
        return None

    def clear_cache(self):
        self._cache.clear()

    @staticmethod
    def _safe_int(val) -> Optional[int]:
        if val is None:
            return None
        try:
            return int(float(str(val).replace(",", "")))
        except (ValueError, TypeError):
            return None


# =============================================================================
# Singleton
# =============================================================================

sitex_service = SiteXPropertyService()
