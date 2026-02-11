"""
Property Lookup Routes for FinCEN
==================================
POST /api/property/lookup          - Search by address (with Google Places parsed address)
POST /api/property/lookup-by-apn   - Search by APN
GET  /api/property/health          - Check SiteX configuration

Wire this into your FastAPI app:
    from routes.property import router as property_router
    app.include_router(property_router)
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import logging

from services.sitex_service import sitex_service, SiteXAuthError, SiteXNotConfiguredError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/property", tags=["property"])


# =============================================================================
# Request/Response Models
# =============================================================================

class PropertyLookupRequest(BaseModel):
    """Request from frontend after Google Places selection."""
    street: str               # "123 Main St"
    city: Optional[str] = None
    state: Optional[str] = "CA"
    zip: Optional[str] = None


class APNLookupRequest(BaseModel):
    apn: str
    county: Optional[str] = None
    state: Optional[str] = "CA"


# =============================================================================
# Routes
# =============================================================================

@router.get("/health")
async def property_health():
    """Check if SiteX is properly configured."""
    configured = sitex_service.is_configured()
    return {
        "sitex_configured": configured,
        "base_url": sitex_service.base_url,
        "feed_id": sitex_service.feed_id or "NOT SET",
        "client_id_set": bool(sitex_service.client_id),
        "client_secret_set": bool(sitex_service.client_secret),
    }


@router.post("/lookup")
async def lookup_property(request: PropertyLookupRequest):
    """
    Look up property data by address.
    
    Called by frontend after Google Places autocomplete selection.
    Returns the 5 FinCEN fields: address, APN, legal description,
    subdivision type, and owner names.
    """
    logger.info(f"📍 Property lookup: {request.street}, {request.city}, {request.state}")

    try:
        result = await sitex_service.search_property(
            address=request.street,
            city=request.city,
            state=request.state,
            zip_code=request.zip,
        )

        if result.status == "success" and result.data:
            return {
                "success": True,
                "status": "success",
                "property": {
                    # Your 5 FinCEN fields
                    "address": result.data.address,
                    "apn": result.data.apn,
                    "legal_description": result.data.legal_description,
                    "subdivision_type": result.data.subdivision_type,
                    "owner_names": result.data.owner_names_display,
                    # Bonus fields
                    "county": result.data.county,
                    "property_type": result.data.property_type,
                    "assessed_value": result.data.assessed_value,
                    "year_built": result.data.year_built,
                },
            }

        elif result.status == "multi_match":
            return {
                "success": True,
                "status": "multi_match",
                "matches": result.matches,
                "match_count": result.match_count,
                "message": result.message,
            }

        elif result.status == "not_found":
            return {
                "success": True,
                "status": "not_found",
                "message": result.message,
            }

        else:
            return {
                "success": False,
                "status": "error",
                "message": result.message or "Unknown error",
            }

    except SiteXNotConfiguredError as e:
        raise HTTPException(status_code=503, detail=str(e.message))
    except SiteXAuthError as e:
        raise HTTPException(status_code=401, detail=f"SiteX auth failed: {e.message}")
    except Exception as e:
        logger.exception(f"Property lookup error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/lookup-by-apn")
async def lookup_by_apn(request: APNLookupRequest):
    """Look up property by APN (placeholder - uses address search with APN)."""
    # Note: SiteX's APN search may use a different endpoint depending on your feed
    # For now, this is a placeholder that you can wire up to the specific APN endpoint
    return {
        "success": False,
        "status": "not_implemented",
        "message": "APN lookup not yet implemented for this feed. Use address lookup.",
    }
