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
