# Task: Create SiteX Integration Documentation

## Goal

Create `docs/SITEX_INTEGRATION.md` — a comprehensive reference document for the SiteX property data integration. This should be the single source of truth for anyone working on this system.

## File to Create

`docs/SITEX_INTEGRATION.md`

## Content to Include

Write the document with these sections:

---

### 1. Overview

SiteX (BKI Connect) provides property data enrichment for the FinCEN compliance wizard. When a user enters a property address via Google Places autocomplete, the system automatically looks up the property in SiteX to retrieve APN, legal description, owner information, and other details needed for FinCEN reporting.

### 2. Architecture — The Full Chain

Document the complete request flow with a diagram:

```
User types address
       ↓
Google Places Autocomplete (frontend)
       ↓
User selects address from dropdown
       ↓
AddressAutocomplete.tsx fires onSelect callback
       ↓
POST {NEXT_PUBLIC_API_BASE_URL}/property/lookup
       ↓
api/app/routes/property.py receives request
       ↓
sitex_client.py.search_property() called
       ↓
OAuth token request (if needed):
  POST {SITEX_BASE_URL}/ls/apigwy/oauth2/v1/token
  Auth: Basic base64(client_id:client_secret)
  Body: grant_type=client_credentials
       ↓
Property search:
  GET {SITEX_BASE_URL}/realestatedata/search
  Auth: Bearer {token}
  Params: addr, lastLine, feedId, clientReference, options
       ↓
Response parsed → PropertyData returned to frontend
       ↓
Wizard auto-fills: APN, legal description, county, owner name
```

### 3. Files Involved

Document every file in the chain:

| File | Purpose |
|------|---------|
| `web/components/AddressAutocomplete.tsx` | Google Places autocomplete + SiteX lookup trigger |
| `web/components/wizard/shared/TransactionReferenceStep.tsx` | Wizard Step 0 — consumes AddressAutocomplete, receives property data |
| `api/app/routes/property.py` | Backend route — POST /property/lookup, POST /property/lookup-by-apn, GET /property/status |
| `api/app/services/sitex_client.py` | SiteX API client — OAuth token management, property search, response parsing, caching |
| `api/app/services/sitex_models.py` | Pydantic models — PropertyData, PropertyOwner, PropertySearchResult |

### 4. Environment Variables

**Backend (Render):**

| Variable | Required | Purpose | Example |
|----------|----------|---------|---------|
| `SITEX_BASE_URL` | Yes | SiteX API base URL | `https://api.uat.bkitest.com` (UAT) or `https://api.bkiconnect.com` (prod) |
| `SITEX_CLIENT_ID` | Yes | OAuth client ID | (from BKI) |
| `SITEX_CLIENT_SECRET` | Yes | OAuth client secret | (from BKI) |
| `SITEX_FEED_ID` | Yes | Data feed identifier | (from BKI) |
| `SITEX_DEBUG` | No | Log raw API responses | `false` |
| `SITEX_TIMEOUT` | No | Request timeout seconds | `30` |

**Frontend (Vercel):**

| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Yes | Google Places autocomplete |
| `NEXT_PUBLIC_API_BASE_URL` | Yes | Backend URL for /property/lookup calls |

### 5. SiteX API Specification

#### Authentication
```
POST {BASE_URL}/ls/apigwy/oauth2/v1/token
Authorization: Basic base64(client_id:client_secret)
Content-Type: application/x-www-form-urlencoded
Body: grant_type=client_credentials

Response: { "access_token": "...", "expires_in": 600 }
```

Token is cached in memory and refreshed 60 seconds before expiry.

#### Property Search
```
GET {BASE_URL}/realestatedata/search
Authorization: Bearer {token}
Params:
  addr            = "1358 5th St"
  lastLine        = "La Verne, CA, 91750"
  feedId          = {SITEX_FEED_ID}
  clientReference = "fincen_wizard"
  options         = "search_exclude_nonres=Y|search_strict=Y"
```

#### Response Match Codes
| MatchCode | Meaning | Action |
|-----------|---------|--------|
| `"S"` or single match | Success | Parse `Feed.PropertyProfile` |
| `"M"` or `"MULTI"` | Multiple matches | Extract `Locations[]` for user selection |
| `"N"` or `"0"` | No match | Return `status="not_found"` |

### 6. Response Structure & Field Mapping

Document the JSON response structure:
```json
{
  "MatchCode": "S",
  "Feed": {
    "PropertyProfile": {
      "APN": "...",
      "SiteAddress": "...",
      "SiteCity": "...",
      "CountyName": "...",
      "LegalDescriptionInfo": {
        "LegalBriefDescription": "...",
        "SubdivisionName": "...",
        "LotNumber": "..."
      },
      "OwnerInformation": {
        "OwnerFullName": "...",
        "Owner1FirstName": "...",
        "Owner1LastName": "..."
      }
    }
  }
}
```

And the field mapping table:

| FinCEN Field | PropertyData Field | SiteX Path | Fallbacks |
|---|---|---|---|
| APN | `apn` | `APN` | `ParcelNumber`, `AssessorParcelNumber` |
| Legal Description | `legal_description` | `LegalDescriptionInfo.LegalBriefDescription` | `.LegalDescription`, `BriefLegal` |
| Subdivision | `subdivision_type` | `LegalDescriptionInfo.SubdivisionName` | `Subdivision` |
| County | `county` | `CountyName` | `SiteCountyName`, `County` |
| Owner | `owner_names_display` | `OwnerInformation.OwnerFullName` | `Owner1FirstName + Owner1LastName` |
| Property Type | `property_type` | `PropertyType` | `UseCodeDescription` |
| Year Built | `year_built` | `YearBuilt` | — |
| Assessed Value | `assessed_value` | `AssessedValue` | — |

### 7. Wizard Auto-Fill Behavior

When SiteX returns data, the wizard auto-fills:

| Wizard Field | Source | Auto-detect Logic |
|---|---|---|
| County | `property.county` | Direct fill |
| APN | `property.apn` | Direct fill, shows badge |
| Legal Description Text | `property.legal_description` | Direct fill |
| Legal Description Type | Detected from SiteX data | `lot_number` present → `lot_block_subdivision`; text contains "beginning at"/"thence" → `metes_and_bounds`; otherwise → `other` |
| Owner of Record | `property.owner_names_display` | Display only (informational) |

### 8. Error Handling & Graceful Degradation

| Scenario | Behavior |
|----------|----------|
| SiteX not configured (missing env vars) | Autocomplete still works for address, no property lookup attempted |
| OAuth token fails (401) | Error logged, user sees "Property lookup unavailable" |
| Property not found | User sees "No property data found" — can still enter manually |
| Multiple matches | User sees match count — needs more specific address |
| SiteX timeout | Error logged, user can proceed with manual entry |
| Google API key missing | Autocomplete doesn't load, manual address entry available |

### 9. Known Pitfalls

Document these from experience:

1. **Search endpoint is `/realestatedata/search`, NOT `/ls/publicsearch/v1/{feed_id}/property`** — The publicsearch path is a different BKI product.
2. **Address param is `addr`, NOT `address1` or `address2`** — SiteX naming is non-standard.
3. **`feedId` is a query parameter, NOT part of the URL path.**
4. **`lastLine` format is `"City, ST, ZIP"` with commas.**
5. **`CountyName` not `County`** — `County` may return FIPS code instead of name.
6. **`LegalBriefDescription` not `LegalDescription`** — The brief version is populated in more CA counties.
7. **ZIP codes may come back as ZIP+4** — Always truncate to 5 characters.
8. **No `/api` prefix on backend routes** — FastAPI routes are mounted directly. The property endpoint is `/property/lookup`, not `/api/property/lookup`.
9. **Token URL path IS `/ls/apigwy/oauth2/v1/token`** — This path is correct even though the search path is different.

### 10. Testing

#### Local test (requires .env with SiteX credentials):
```bash
cd api && python -c "
import asyncio
from app.services.sitex_client import sitex_service

async def test():
    result = await sitex_service.search_property(
        address='1358 5th St',
        city='La Verne',
        state='CA',
        zip_code='91750',
    )
    print(f'Status: {result.status}')
    if result.data:
        print(f'APN: {result.data.apn}')
        print(f'Owner: {result.data.owner_names_display}')
        print(f'Legal: {result.data.legal_description}')
asyncio.run(test())
"
```

#### Staging test:
```bash
curl -X POST https://pct-fin-cen-staging.onrender.com/property/lookup \
  -H "Content-Type: application/json" \
  -d '{"street": "1358 5th St", "city": "La Verne", "state": "CA", "zip": "91750"}'
```

#### Health check:
```bash
curl https://pct-fin-cen-staging.onrender.com/property/status
```

### 11. Change History

| Date | Change | Reason |
|------|--------|--------|
| 2026-01-30 | Initial SiteX integration (Shark #43) | Google Places + SiteX property enrichment |
| 2026-02-10 | Wizard rebuild — wired AddressAutocomplete into TransactionReferenceStep | Eliminated duplicate address entry |
| 2026-02-11 | Fixed search endpoint path | Was using `/ls/publicsearch/v1/...`, correct path is `/realestatedata/search` |
| 2026-02-11 | Fixed query parameter names | `address1` → `addr`, `address2` → `lastLine`, added `feedId` as param |
| 2026-02-11 | Fixed response parsing | Added `Feed.PropertyProfile` nesting, `LegalDescriptionInfo`, `OwnerInformation` |

---

## DO NOT

- ❌ Change any code — this is documentation only
- ❌ Create the file anywhere other than `docs/SITEX_INTEGRATION.md`
