# SiteX Property Data Integration

> Single source of truth for the SiteX/BKI Connect property lookup system.

---

## 1. Overview

SiteX (BKI Connect) provides property data enrichment for the FinCEN compliance wizard. When a user enters a property address via Google Places autocomplete, the system automatically looks up the property in SiteX to retrieve APN, legal description, owner information, and other details needed for FinCEN reporting.

The integration is **optional and gracefully degrading** — if SiteX is not configured or the lookup fails, the wizard still works; the user simply enters property details manually.

---

## 2. Architecture — The Full Chain

```
User types address
       ↓
Google Places Autocomplete (frontend)
       ↓
User selects address from dropdown
       ↓
AddressAutocomplete.tsx fires handlePlaceSelect callback
       ↓
lookupProperty() → POST {NEXT_PUBLIC_API_BASE_URL}/property/lookup
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

---

## 3. Files Involved

| File | Purpose |
|------|---------|
| `web/components/AddressAutocomplete.tsx` | Google Places autocomplete + SiteX lookup trigger. Calls `lookupProperty()` after user selects an address. |
| `web/components/wizard/shared/TransactionReferenceStep.tsx` | Wizard Step 0 — consumes `AddressAutocomplete` with `fetchPropertyData={true}`, receives property data via `onSelect` callback |
| `web/lib/property-types.ts` | TypeScript types — `PropertyData`, `PropertyMatch`, `PropertyLookupResponse`, `ParsedAddress`, `AddressAutocompleteProps` |
| `web/lib/google-places.ts` | Google Maps loader + `parseGooglePlace()` helper |
| `api/app/routes/property.py` | Backend routes — `POST /property/lookup`, `POST /property/lookup-by-apn`, `GET /property/status`, `POST /property/clear-cache` |
| `api/app/services/sitex_client.py` | SiteX API client — OAuth token management, property search, response parsing, in-memory caching with TTL |
| `api/app/services/sitex_models.py` | Pydantic models — `PropertyData`, `PropertyOwner`, `PropertyMatch`, `PropertySearchResult` |

---

## 4. Environment Variables

### Backend (Render)

| Variable | Required | Purpose | Example |
|----------|----------|---------|---------|
| `SITEX_BASE_URL` | Yes | SiteX API base URL | `https://api.uat.bkitest.com` (UAT) or `https://api.bkiconnect.com` (prod) |
| `SITEX_CLIENT_ID` | Yes | OAuth client ID | (from BKI) |
| `SITEX_CLIENT_SECRET` | Yes | OAuth client secret | (from BKI) |
| `SITEX_FEED_ID` | Yes | Data feed identifier | (from BKI) |
| `SITEX_DEBUG` | No | Log raw API responses | `false` |
| `SITEX_TIMEOUT` | No | Request timeout seconds | `30` |

### Frontend (Vercel)

| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Yes | Google Places autocomplete |
| `NEXT_PUBLIC_API_BASE_URL` | Yes | Backend URL for `/property/lookup` calls (e.g. `https://pct-fin-cen-staging.onrender.com`) |

---

## 5. SiteX API Specification

### Authentication

```
POST {BASE_URL}/ls/apigwy/oauth2/v1/token
Authorization: Basic base64(client_id:client_secret)
Content-Type: application/x-www-form-urlencoded
Body: grant_type=client_credentials

Response: { "access_token": "...", "expires_in": 600 }
```

Token is cached in memory and refreshed **60 seconds before expiry** (proactive refresh). Token management is thread-safe via `asyncio.Lock`.

### Property Search by Address

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

### Property Search by APN

```
GET {BASE_URL}/realestatedata/search
Authorization: Bearer {token}
Params:
  apn             = "1234-567-890"
  feedId          = {SITEX_FEED_ID}
  clientReference = "fincen_wizard"
```

### Response Match Codes

| MatchCode | Meaning | Action |
|-----------|---------|--------|
| `"S"` or single match | Success | Parse `Feed.PropertyProfile` for full property data |
| `"M"` or `"MULTI"` | Multiple matches | Extract `Locations[]` for user selection |
| `"N"` or `"0"` or `"NONE"` | No match | Return `status="not_found"` |

---

## 6. Response Structure & Field Mapping

### Sample Response (Single Match)

```json
{
  "MatchCode": "S",
  "Feed": {
    "PropertyProfile": {
      "APN": "2419-011-001",
      "SiteAddress": "1358 5TH ST",
      "SiteCity": "LA VERNE",
      "SiteState": "CA",
      "SiteZipCode": "91750-2401",
      "CountyName": "LOS ANGELES",
      "FIPSCode": "06037",
      "PropertyType": "SFR",
      "YearBuilt": "1952",
      "LegalDescriptionInfo": {
        "LegalBriefDescription": "LOT 1 BLK 2 TRACT 12345",
        "SubdivisionName": "TRACT 12345",
        "LotNumber": "1",
        "BlockNumber": "2",
        "TractNumber": "12345"
      },
      "OwnerInformation": {
        "OwnerFullName": "SMITH JOHN A",
        "Owner1FirstName": "JOHN",
        "Owner1LastName": "SMITH",
        "Owner2FullName": "SMITH JANE B",
        "Owner2FirstName": "JANE",
        "Owner2LastName": "SMITH"
      },
      "AssessedValue": "450000",
      "LandValue": "200000",
      "ImprovementValue": "250000"
    }
  }
}
```

### Sample Response (Multi-Match)

```json
{
  "MatchCode": "M",
  "Locations": [
    {
      "SiteAddress": "123 MAIN ST APT 1",
      "SiteCity": "LOS ANGELES",
      "SiteState": "CA",
      "SiteZipCode": "90001",
      "APN": "5432-001-001"
    },
    {
      "SiteAddress": "123 MAIN ST APT 2",
      "SiteCity": "LOS ANGELES",
      "SiteState": "CA",
      "SiteZipCode": "90001",
      "APN": "5432-001-002"
    }
  ]
}
```

### Field Mapping Table

| FinCEN Field | PropertyData Field | SiteX Path | Fallbacks |
|---|---|---|---|
| APN | `apn` | `APN` | `ParcelNumber`, `AssessorParcelNumber` |
| Legal Description | `legal_description` | `LegalDescriptionInfo.LegalBriefDescription` | `LegalDescriptionInfo.LegalDescription`, `BriefLegal` |
| Subdivision | `subdivision_name` | `LegalDescriptionInfo.SubdivisionName` | `Subdivision` |
| Lot Number | `lot_number` | `LegalDescriptionInfo.LotNumber` | — |
| Block Number | `block_number` | `LegalDescriptionInfo.BlockNumber` | — |
| Tract Number | `tract_number` | `LegalDescriptionInfo.TractNumber` | — |
| County | `county` | `CountyName` | `SiteCountyName`, `County` |
| FIPS | `fips` | `FIPSCode` | `FIPS`, `FIPSStateCode` + `FIPSCountyCode` |
| Street Address | `street_address` | `SiteAddress` | `PropertyAddress`, `Address` |
| City | `city` | `SiteCity` | `PropertyCity`, `City` |
| State | `state` | `SiteState` | `PropertyState`, `State` |
| ZIP | `zip_code` | `SiteZipCode` (truncated to 5 chars) | `PropertyZip`, `Zip` |
| Primary Owner | `primary_owner.full_name` | `OwnerInformation.OwnerFullName` | `Owner1FirstName` + `Owner1LastName` |
| Secondary Owner | `secondary_owner.full_name` | `OwnerInformation.Owner2FullName` | `Owner2FirstName` + `Owner2LastName` |
| Property Type | `property_type` | `PropertyType` | `UseCodeDescription` |
| Year Built | `year_built` | `YearBuilt` | — |
| Assessed Value | `assessed_value` | `AssessedValue` | — |
| Land Value | `land_value` | `LandValue` | — |
| Improvement Value | `improvement_value` | `ImprovementValue` | — |

---

## 7. Wizard Auto-Fill Behavior

When SiteX returns data, the wizard auto-fills:

| Wizard Field | Source | Auto-detect Logic |
|---|---|---|
| County | `property.county` | Direct fill |
| APN | `property.apn` | Direct fill, shows badge |
| Legal Description Text | `property.legal_description` | Direct fill |
| Legal Description Type | Detected from SiteX data | `lot_number` present → `lot_block_subdivision`; text contains "beginning at"/"thence" → `metes_and_bounds`; otherwise → `other` |
| Owner of Record | `property.primary_owner.full_name` | Display only (informational) |

---

## 8. Error Handling & Graceful Degradation

| Scenario | Behavior |
|----------|----------|
| SiteX not configured (missing env vars) | Autocomplete still works for address, no property lookup attempted. `is_configured()` returns `false`. |
| OAuth token fails (401) | Token invalidated, retried on next request. Error logged, user sees "Property lookup unavailable". |
| Property not found (MatchCode `"N"`) | User sees "No property data found" — can still enter details manually. |
| Multiple matches (MatchCode `"M"`) | `Locations[]` extracted, user sees match count. Can refine address or enter manually. |
| SiteX timeout (configurable, default 30s) | Error logged, user can proceed with manual entry. |
| Rate limit (HTTP 429) | `SiteXRateLimitError` raised. Error logged, user told to try again later. |
| Google API key missing | Autocomplete doesn't load, manual address entry available via plain text input. |

### Exception Classes

| Exception | Trigger |
|-----------|---------|
| `SiteXError` | Base exception for any SiteX-related failure |
| `SiteXAuthError` | OAuth token request fails (401/403) |
| `SiteXRateLimitError` | HTTP 429 from SiteX |
| `SiteXNotConfiguredError` | Credentials not set |

---

## 9. Caching

Results are cached in-memory with a **TTL of 30 minutes** (configurable). Cache keys are SHA-256 hashes of the search parameters. Cache features:

- Prevents redundant API calls when user navigates back/forth in wizard
- Separate caches for address search and APN search
- `POST /property/clear-cache` endpoint available for admin use
- Cache is per-process (not shared across workers)

---

## 10. Known Pitfalls

> These are lessons learned from debugging. Read before changing any SiteX code.

1. **Search endpoint is `/realestatedata/search`, NOT `/ls/publicsearch/v1/{feed_id}/property`** — The `publicsearch` path is a different BKI product. Our integration uses the real estate data API.

2. **Address param is `addr`, NOT `address1` or `address2`** — SiteX naming is non-standard.

3. **`feedId` is a query parameter, NOT part of the URL path.** It was previously embedded in the URL as `.../{feed_id}/property` which is wrong.

4. **`lastLine` format is `"City, ST, ZIP"` with commas.** It combines city/state/zip into one string. The param name is `lastLine`, NOT `address2`.

5. **`CountyName` not `County`** — The `County` field may return a FIPS code instead of the human-readable name.

6. **`LegalBriefDescription` not `LegalDescription`** — The "brief" version is populated in more CA counties. The full `LegalDescription` is often empty.

7. **ZIP codes may come back as ZIP+4** — Always truncate to 5 characters (e.g. `"91750-2401"` → `"91750"`).

8. **No `/api` prefix on backend routes** — FastAPI routes are mounted directly. The property endpoint is `/property/lookup`, NOT `/api/property/lookup`. The router is defined with `prefix="/property"`.

9. **Token URL path IS `/ls/apigwy/oauth2/v1/token`** — This path is correct even though the search path is different. Don't "fix" this to match the search path.

10. **Property data lives at `Feed.PropertyProfile`** — The response is nested. The top-level object contains `MatchCode` and `Feed`, then property data is under `Feed.PropertyProfile`.

11. **Owner info lives at `OwnerInformation`** — Within `PropertyProfile`, owner fields are nested under `OwnerInformation`, not at the top level.

12. **Legal description info lives at `LegalDescriptionInfo`** — Within `PropertyProfile`, legal fields are nested under `LegalDescriptionInfo`, not at the top level.

---

## 11. Testing

### Local Test (requires .env with SiteX credentials)

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
        print(f'Owner: {result.data.owner_names}')
        print(f'Legal: {result.data.legal_description}')
asyncio.run(test())
"
```

### Staging Test (via curl)

```bash
curl -X POST https://pct-fin-cen-staging.onrender.com/property/lookup \
  -H "Content-Type: application/json" \
  -d '{"street": "1358 5th St", "city": "La Verne", "state": "CA", "zip": "91750"}'
```

### Health Check

```bash
curl https://pct-fin-cen-staging.onrender.com/property/status
```

Expected healthy response:
```json
{
  "sitex_configured": true,
  "google_places_configured": false,
  "sitex_base_url": "https://api.bkiconnect.com"
}
```

(`google_places_configured` is `false` on backend because the Google API key is a frontend-only env var.)

---

## 12. Backend API Reference

### `POST /property/lookup`

Look up property by address.

**Request:**
```json
{
  "street": "1358 5th St",
  "city": "La Verne",
  "state": "CA",
  "zip": "91750"
}
```

**Response:**
```json
{
  "status": "success",
  "property": { /* PropertyData */ },
  "matches": null,
  "match_count": 1,
  "error": null
}
```

Status values: `success`, `multi_match`, `not_found`, `not_configured`, `error`.

### `POST /property/lookup-by-apn`

Look up property by APN + FIPS code.

**Request:**
```json
{
  "apn": "2419-011-001",
  "fips": "06037"
}
```

### `GET /property/status`

Check if SiteX is configured.

### `POST /property/clear-cache`

Clear the in-memory property cache.

---

## 13. Change History

| Date | Change | Reason |
|------|--------|--------|
| 2026-01-30 | Initial SiteX integration (Shark #43) | Google Places + SiteX property enrichment |
| 2026-02-10 | Wizard rebuild — wired AddressAutocomplete into TransactionReferenceStep | Eliminated duplicate address entry |
| 2026-02-11 | Fixed search endpoint path | Was using `/ls/publicsearch/v1/...`, correct path is `/realestatedata/search` |
| 2026-02-11 | Fixed query parameter names | `address1` → `addr`, `address2` → `lastLine`, added `feedId` as query param |
| 2026-02-11 | Fixed response parsing | Added `Feed.PropertyProfile` nesting, `LegalDescriptionInfo`, `OwnerInformation` |
| 2026-02-11 | Created this document | Single source of truth for SiteX integration |
