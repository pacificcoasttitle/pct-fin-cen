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
| 📄 Documentation | 2 |

**Total Sharks Killed (Vol 2): 3 🦈**

---

## 📄 Documentation

### 42. WIZARD_MASTER_TECH_SPEC Created ✅

**Date:** January 30, 2026

**Problem:** No comprehensive documentation existed for the wizard system. Developers had to trace through thousands of lines of code to understand:
- Component architecture
- State management
- Status lifecycles
- Data flow
- API endpoints

**Solution:** Created `docs/WIZARD_MASTER_TECH_SPEC.md` - a 700+ line comprehensive technical specification documenting:

| Section | Content |
|---------|---------|
| 1. Component Architecture | Component tree, key components, props/interfaces |
| 2. State Management | wizard_data structure, autosave, state transitions |
| 3. Wizard Phases & Steps | All determination & collection steps documented |
| 4. Status Lifecycle | Report, SubmissionRequest, Party, PartyLink status flows |
| 5. Data Hydration & Flow | Complete field mapping tables |
| 6. API Endpoints | All wizard and party portal endpoints |
| 7. Party Portal Connection | Form selection logic, pre-filled fields |
| 8. Determination Logic | Full decision tree, all exemptions |
| 9. File Inventory | 40+ files catalogued |
| 10. Current Gaps & Observations | Actionable issues identified |

**Files Created:**
- `docs/WIZARD_MASTER_TECH_SPEC.md` (NEW - 700+ lines)

**Status:** ✅ Killed

---

## 🟠 Major Features

### 43. SiteX Integration + Google Places Autocomplete ✅

**Date:** January 30, 2026

**Problem:** Manual address entry was slow, error-prone, and didn't leverage existing title plant data. Users had to manually enter:
- Full property address
- County
- APN (Assessor's Parcel Number)
- Verify property type
- Look up current owner

**Solution:** Integrated Google Places autocomplete with SiteX property data enrichment.

### Backend Implementation

| Component | Purpose |
|-----------|---------|
| `api/app/services/sitex_models.py` | Pydantic models for property data |
| `api/app/services/sitex_client.py` | SiteX API client with OAuth token management |
| `api/app/routes/property.py` | Property lookup endpoints |

**SiteX Client Features:**
- OAuth2 Basic Auth token management
- Thread-safe token refresh
- In-memory caching with 1-hour TTL
- Multi-match handling
- Graceful degradation when not configured

**API Endpoints:**

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/property/status` | GET | Check if services configured |
| `/property/lookup` | POST | Lookup by address |
| `/property/lookup-by-apn` | POST | Lookup by APN |
| `/property/clear-cache` | POST | Clear lookup cache |

### Frontend Implementation

| Component | Purpose |
|-----------|---------|
| `AddressAutocomplete.tsx` | Google Places autocomplete + SiteX lookup |
| `google-places.ts` | Address parsing utilities |
| `property-types.ts` | TypeScript interfaces |
| `google-maps.d.ts` | Type declarations |

**Component Features:**
- Google Places autocomplete for fast address entry
- Automatic SiteX property enrichment
- Multi-match selection UI
- Property data card display
- Graceful degradation when services unavailable

### Data Auto-Fill

| Field | Source | Auto-filled? |
|-------|--------|--------------|
| Street | Google Places | ✅ |
| City | Google Places | ✅ |
| State | Google Places | ✅ |
| ZIP | Google Places | ✅ |
| County | Google Places | ✅ |
| APN | SiteX | ✅ |
| Owner Name | SiteX | ✅ (display) |
| Property Type | SiteX | ✅ (display) |
| Year Built | SiteX | ✅ (display) |
| Assessed Value | SiteX | ✅ (display) |

### Environment Variables Added

**Frontend (Vercel):**
```
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_key
```

**Backend (Render):**
```
SITEX_BASE_URL=https://api.bkiconnect.com
SITEX_CLIENT_ID=your_client_id
SITEX_CLIENT_SECRET=your_client_secret
SITEX_FEED_ID=your_feed_id
SITEX_DEBUG=false
SITEX_TIMEOUT=30
```

### Files Created

| File | Lines | Purpose |
|------|-------|---------|
| `api/app/services/sitex_models.py` | 130 | Pydantic models |
| `api/app/services/sitex_client.py` | 450 | SiteX API client |
| `api/app/routes/property.py` | 150 | API endpoints |
| `web/components/AddressAutocomplete.tsx` | 320 | Autocomplete component |
| `web/lib/google-places.ts` | 65 | Google Places utilities |
| `web/lib/property-types.ts` | 130 | TypeScript interfaces |
| `web/types/google-maps.d.ts` | 10 | Type declarations |

### Files Modified

| File | Change |
|------|--------|
| `api/app/main.py` | Registered property router |
| `api/app/routes/__init__.py` | Exported property_router |
| `web/lib/rrer-types.ts` | Added siteXData to CollectionData |

**Status:** ✅ Killed

---

### 44. WIZARD_MASTER_TECH_SPEC Section 11 Added ✅

**Date:** January 30, 2026

**Problem:** SiteX integration not documented in master tech spec.

**Solution:** Added comprehensive Section 11 covering:
- Architecture overview
- Data flow mapping
- Integration points
- Configuration requirements
- Graceful degradation behavior

**Files Modified:**
- `docs/WIZARD_MASTER_TECH_SPEC.md` (Section 11 added)

**Status:** ✅ Killed

---

## Integration Points for Future Work

### Wizard Integration (Ready to Wire)

The `AddressAutocomplete` component is ready to be integrated into:

1. **Client Submission Form** (`web/app/(app)/app/requests/new/page.tsx`)
   - Replace manual address inputs
   - Auto-fill seller name from SiteX owner

2. **Wizard Transaction-Property Step** (`web/components/rrer-questionnaire.tsx`)
   - Replace `AddressFields` with `AddressAutocomplete`
   - Auto-fill county, APN from lookup

### Example Integration

```tsx
import { AddressAutocomplete } from "@/components/AddressAutocomplete";

<AddressAutocomplete
  onSelect={(address, property) => {
    setFormData(prev => ({
      ...prev,
      propertyStreet: address.street,
      propertyCity: address.city,
      propertyState: address.state,
      propertyZip: address.zip,
      propertyCounty: address.county || "",
      apn: property?.apn || "",
    }));
  }}
  fetchPropertyData={true}
  showPropertyCard={true}
  placeholder="Start typing property address..."
/>
```

---

---

### 45. Wire AddressAutocomplete into Client Submission Form ✅

**Date:** January 30, 2026

**Problem:** The client submission form still used manual address entry after the AddressAutocomplete component was created.

**Solution:** Integrated AddressAutocomplete into `web/app/(app)/app/requests/new/page.tsx`:
- Replaced manual street/city/state/zip inputs with AddressAutocomplete
- Added SiteX property data enrichment
- Auto-fills county from Google Places
- Shows "Use as seller name" suggestion when SiteX returns owner info
- Shows parsed address fields for manual editing if needed

**Files Modified:**
- `web/app/(app)/app/requests/new/page.tsx`

**Status:** ✅ Killed

---

### 46. Wire AddressAutocomplete into Wizard Transaction-Property Step ✅

**Date:** January 30, 2026

**Problem:** The wizard still used the basic AddressFields component for property address entry.

**Solution:** Integrated AddressAutocomplete into `web/components/rrer-questionnaire.tsx`:
- Added AddressAutocomplete to transaction-property step
- Auto-fills county and APN from SiteX lookup
- Stores full SiteX data in `collection.siteXData`
- Shows "Auto-filled" badge on county and APN fields
- Displays owner of record from title plant
- Keeps AddressFields visible for manual editing

**Files Modified:**
- `web/components/rrer-questionnaire.tsx`

**Status:** ✅ Killed

---

---

### 47. Auto-Hydrate Seller Name from Property Owner ✅

**Date:** January 30, 2026

**Problem:** While property data (address, county, APN) auto-filled, the seller name still required manual entry even though SiteX returns the owner of record.

**Solution:** Enhanced both forms to auto-populate seller name from SiteX property owner data:

**Client Form:**
- Seller name field auto-fills from `property.primary_owner.full_name`
- Shows green confirmation badge when auto-filled
- Only fills if seller name field is currently empty

**Wizard:**
- Parses owner's full name into firstName/lastName
- Auto-populates first seller's individual info
- Shows "Seller Auto-filled" badge next to owner display
- Only fills if seller doesn't already have a name

**Files Modified:**
- `web/app/(app)/app/requests/new/page.tsx`
- `web/components/rrer-questionnaire.tsx`

**Status:** ✅ Killed

---

### 48. Per-Company Billing + Unified Billing UI (Phase 1 Complete) ✅

**Date:** January 30, 2026

**Problem:** 
- All companies charged hardcoded $75/filing with no flexibility
- Billing UI scattered across multiple pages
- Client Admin couldn't see billing activity
- Admin couldn't easily manage rates

The hardcoded line was:
```python
amount_cents=7500  # $75.00 per filing - HARDCODED!
```

**Solution:** Implemented complete Billing System Phase 1 with unified UI per role.

### Database Changes

| Column | Type | Default | Purpose |
|--------|------|---------|---------|
| `filing_fee_cents` | Integer | 7500 | Per-filing charge |
| `payment_terms_days` | Integer | 30 | Days until due |
| `billing_notes` | Text | null | Internal notes |

**Migration:** `api/alembic/versions/20260130_000001_add_company_billing_settings.py`

### NEW: Consolidated Billing API

All billing endpoints now in ONE file: `api/app/routes/billing.py`

**Client Admin Endpoints (`/billing/my/*`):**

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/billing/my/stats` | Company's billing stats |
| GET | `/billing/my/invoices` | Company's invoices |
| GET | `/billing/my/invoices/{id}` | Invoice detail |
| GET | `/billing/my/activity` | Company's billing events |

**Admin Endpoints (`/billing/admin/*`):**

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/billing/admin/stats` | All-company stats |
| GET | `/billing/admin/invoices` | All invoices |
| GET | `/billing/admin/invoices/{id}` | Invoice detail |
| POST | `/billing/admin/invoices/generate` | Generate invoice |
| PATCH | `/billing/admin/invoices/{id}/status` | Update status |
| GET | `/billing/admin/events` | All billing events |
| POST | `/billing/admin/events` | Create manual event |
| GET | `/billing/admin/rates` | All company rates |
| PATCH | `/billing/admin/rates/{id}` | Update rate |

### NEW: Unified Billing Pages

**Client Admin:** `/app/billing`
- Stats: Outstanding, Paid YTD, Pending Charges, Your Rate
- Tabs: Invoices, Activity
- Invoice detail dialog

**Admin/COO:** `/app/admin/billing`
- Stats: Outstanding, Collected (Month), Pending Events, Companies
- Tabs: Invoices, Billing Events, Company Rates
- Actions: Generate Invoice, Add Event
- Dialogs: Generate Invoice, Add Billing Event, Edit Rate

### Navigation Updates

| Role | Sees "Billing"? | Route |
|------|-----------------|-------|
| `client_user` | ❌ No | - |
| `client_admin` | ✅ Yes | `/app/billing` |
| `pct_staff` | ❌ No | - |
| `pct_admin` | ✅ Yes | `/app/admin/billing` |
| `coo` | ✅ Yes | `/app/admin/billing` |

### Audit Trail

New events logged:
- `billing_event.created` - Auto-created on filing
- `billing_event.manual_created` - Manual charge/credit
- `company.billing_rate_updated` - Rate changes
- `invoice.generated` - Invoice generation

### Files Created

| File | Lines | Purpose |
|------|-------|---------|
| `api/app/routes/billing.py` | ~700 | Consolidated billing API |
| `web/app/(app)/app/billing/page.tsx` | ~350 | Client billing page |
| `web/app/(app)/app/admin/billing/page.tsx` | ~650 | Admin billing page |
| `api/alembic/versions/20260130_000001_...` | 45 | Migration |

### Files Modified

| File | Changes |
|------|---------|
| `api/app/models/company.py` | Added billing fields + property |
| `api/app/routes/reports.py` | Use company rate for billing events |
| `api/app/routes/__init__.py` | Export billing_router |
| `api/app/main.py` | Register billing router |
| `api/app/services/demo_seed.py` | Use company rate |
| `web/lib/navigation.ts` | Add Billing links per role |
| `docs/INVOICING_MASTER_TECH_SPEC.md` | Phase 1 documentation |

**Status:** ✅ Killed (BIG FUCKING SHARK 🦈)

---

---

### 49. Entity Enhancements - Subtype, BOI Status, Indirect Ownership, Trust Roles ✅

**Date:** February 1, 2026

**Problem:** The wizard and party portal lacked critical FinCEN compliance features:
- No entity subtype differentiation (LLC vs Corporation vs Partnership etc.)
- No BOI (Beneficial Ownership Information) status tracking
- No indirect ownership documentation
- No trust role specification for trust beneficial owners
- No entity-specific document checklists

**Solution:** Implemented comprehensive entity enhancements across wizard and party portal.

### Phase 1: TypeScript Interface Updates

| File | Changes |
|------|---------|
| `web/lib/rrer-types.ts` | Added `EntitySubtype`, `BoiStatus`, `TrustRole` types |
| `web/lib/rrer-types.ts` | Added entity subtype/BOI/trust role options constants |
| `web/lib/rrer-types.ts` | Added `ENTITY_DOCUMENT_CHECKLIST` per subtype |
| `web/lib/rrer-types.ts` | Updated `DeterminationState` with new fields |
| `web/lib/rrer-types.ts` | Updated `BeneficialOwner` with indirect/trust fields |
| `web/components/party-portal/types.ts` | Updated `BeneficialOwnerData` |

### Phase 2: Wizard Entity Subtype

**Added to buyer-type step:**
- Entity subtype selector (LLC, Corp, Partnership, Pension, Foreign, Other)
- Dynamic document checklist based on selected subtype
- BOI status question for non-pension entities
- FinCEN ID input when BOI is filed
- Warning alert when BOI not filed

**Entity Subtypes & Document Checklists:**

| Subtype | Documents Required |
|---------|-------------------|
| LLC | Articles of Org, Operating Agreement, Member List, EIN |
| Domestic Corp | Articles of Inc, Bylaws, Statement of Info, Shareholder Roster, Officers |
| Foreign Entity | Formation Docs (certified), Translation, US Registration, Tax ID |
| Partnership | Partnership Agreement, Partner List, EIN |
| Pension Plan | Trust Agreement, Adoption Agreement, Plan Sponsor, IRS Qualification |

### Phase 3: Indirect Ownership (BeneficialOwnerCard)

Added to every beneficial owner card:
- "Indirect owner" checkbox for ownership through another entity
- Entity name input when indirect ownership is marked
- Clear explanatory text about indirect ownership requirements

Added guidance alert to BuyerEntityForm:
- Amber alert explaining indirect ownership concept
- Example: "If ABC Corp owns 40% of the buyer, and John Smith owns 100% of ABC Corp..."

### Phase 4: Trust Roles (BeneficialOwnerCard)

When `parentEntityType="trust"`:
- Trust role dropdown appears: Trustee, Settlor/Grantor, Beneficiary, Power Holder, Other
- Role is required for trust beneficial owners

Updated parent components:
- `BuyerEntityForm` passes `parentEntityType="entity"`
- `BuyerTrustForm` uses TrusteeCard (different pattern)

### Files Modified

| File | Changes |
|------|---------|
| `web/lib/rrer-types.ts` | Added types, constants, updated interfaces |
| `web/components/rrer-questionnaire.tsx` | Entity subtype UI, BOI status, imports |
| `web/components/party-portal/types.ts` | Added BO enhancement fields |
| `web/components/party-portal/BeneficialOwnerCard.tsx` | Indirect ownership, trust roles |
| `web/components/party-portal/BuyerEntityForm.tsx` | Guidance alert, parentEntityType prop |

### New TypeScript Types

```typescript
type EntitySubtype = "llc" | "corporation_domestic" | "corporation_foreign" 
                   | "partnership" | "pension_plan" | "other"

type BoiStatus = "filed" | "not_filed" | "exempt" | "unknown"

type TrustRole = "trustee" | "settlor" | "beneficiary" | "power_holder" | "other"
```

### Verification Checklist

- ✅ EntitySubtype type exists
- ✅ BoiStatus type exists
- ✅ TrustRole type exists
- ✅ ENTITY_SUBTYPE_OPTIONS constant exists
- ✅ BOI_STATUS_OPTIONS constant exists
- ✅ ENTITY_DOCUMENT_CHECKLIST constant exists
- ✅ DeterminationState has new fields
- ✅ BeneficialOwnerData has new fields
- ✅ Entity subtype selector appears for entity buyers
- ✅ Document checklist shows based on subtype
- ✅ BOI status question appears for non-pension entities
- ✅ Indirect ownership checkbox in BO card
- ✅ Trust role dropdown for trust buyers
- ✅ TypeScript compiles without new errors
- ✅ No linter errors in modified files

**Status:** ✅ Killed (COMPLIANCE SHARK 🦈)

---

### 50. SDTM + FBARX Integration (Hardened v2.1) ✅

**Date:** February 2, 2026

**Problem:** The system only supported mock filing in staging/test environments. Production FinCEN filing via SDTM (Secure Direct Transfer Mode) was not implemented. No:
- XML generation for FBARX schema
- SFTP connectivity to FinCEN servers
- Response file parsing (MESSAGES.XML, ACKED)
- Real BSA ID receipt processing
- Background polling for async responses

**Solution:** Implemented complete SDTM + FBARX integration with hardened, production-ready code.

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    POST /reports/{id}/file                  │
├─────────────────────────────────────────────────────────────┤
│  ENVIRONMENT=production + FINCEN_TRANSPORT=sdtm?            │
│    YES → perform_sdtm_submit()                              │
│    NO  → perform_mock_submit() (existing demo behavior)     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    perform_sdtm_submit()                    │
├─────────────────────────────────────────────────────────────┤
│  1. Idempotency check (skip if already submitted/accepted)  │
│  2. build_fbarx_xml() → XML + debug_summary                 │
│  3. PreflightError? → mark_needs_review                     │
│  4. Store gz+b64 XML artifact in payload_snapshot           │
│  5. SdtmClient.upload() → SFTP to FinCEN                    │
│  6. Set status="submitted", schedule poll                   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                 poll_sdtm_responses() [cron]                │
├─────────────────────────────────────────────────────────────┤
│  1. Look for filename.MESSAGES.XML                          │
│     - Parse → rejected? → mark_rejected                     │
│     - Parse → accepted_with_warnings? → mark_needs_review   │
│     - Parse → accepted? → wait for ACKED                    │
│  2. Look for filename.ACKED                                 │
│     - Parse → extract BSA ID                                │
│     - mark_accepted(bsa_id)                                 │
│     - Update report.receipt_id, filed_at, filing_status     │
│  3. Backoff schedule: 15m, 1h, 3h, 6h, 12h...               │
│  4. Timeout: 24h no MESSAGES → needs_review                 │
│              5d no ACKED after accept → needs_review        │
└─────────────────────────────────────────────────────────────┘
```

### Phase 1: Configuration

**New Environment Variables:**

| Variable | Purpose | Default |
|----------|---------|---------|
| `FINCEN_TRANSPORT` | `mock` or `sdtm` | `mock` |
| `FINCEN_ENV` | `sandbox` or `production` | `sandbox` |
| `SDTM_HOST` | SFTP hostname | (auto from FINCEN_ENV) |
| `SDTM_PORT` | SFTP port | `2222` |
| `SDTM_USERNAME` | SFTP username | (required for sdtm) |
| `SDTM_PASSWORD` | SFTP password | (required for sdtm) |
| `SDTM_SUBMISSIONS_DIR` | Upload directory | `submissions` |
| `SDTM_ACKS_DIR` | Response directory | `acks` |
| `SDTM_ORGNAME` | Org name for filename | `PCTITLE` |
| `TRANSMITTER_TIN` | 9-digit TIN | (required for sdtm) |
| `TRANSMITTER_TCC` | 8-char TCC (starts with P) | (required for sdtm) |

**Helper Properties:**

```python
settings.sdtm_configured  # True if all SDTM creds + transmitter IDs set
settings.transmitter_configured  # True if TIN + TCC set
```

### Phase 2: FBARX XML Builder

**Data Mapping (wizard_data → FBARX):**

| FBARX Party | Source | Mapped To |
|-------------|--------|-----------|
| 35 (Transmitter) | `reportingPerson.companyName` | `RawPartyFullName` |
| 35 | `TRANSMITTER_TIN` env var | PartyIdentification type 4 |
| 35 | `TRANSMITTER_TCC` env var | PartyIdentification type 28 |
| 37 (Transmitter Contact) | `reportingPerson.contactName` | `RawPartyFullName` |
| 15 (Filer - Individual) | `transferee.individual.*` | Name, DOB, Address, SSN/Passport |
| 15 (Filer - Entity) | `transferee.entity.*` or `buyerEntity.entity.*` | Name, Address, EIN |
| 15 (Filer - Trust) | `buyerTrust.trust.*` | Name, Address, EIN |
| 41 (Financial Institution) | `paymentSources[0].institutionName` | `RawPartyFullName` |

**Preflight Validation:**

Builder raises `PreflightError` if:
- TRANSMITTER_TIN missing or invalid (must be 9 digits)
- TRANSMITTER_TCC missing or invalid (must start with P, length 8)
- reportingPerson.companyName missing
- Buyer missing identification (no SSN/EIN/Passport)
- Buyer missing required address fields
- Forbidden placeholders detected (UNKNOWN, N/A, etc.)

### Phase 3: SDTM Client

**Features:**

| Feature | Implementation |
|---------|----------------|
| Connection retries | 3 attempts with exponential backoff |
| Timeout | 30 seconds default |
| Upload | `/submissions/{filename}` |
| Download | `/acks/{filename}` |
| List directories | Returns file metadata |
| Ping test | `python -m app.scripts.fincen_sdtm_ping` |

### Phase 4: Response Processor

**MESSAGES.XML Parsing:**

```python
result = parse_messages_xml(xml_content)
# result.status: "accepted", "rejected", "accepted_with_warnings"
# result.errors: List[MessageError]
# result.warnings: List[MessageError]
# result.primary_rejection_code: str
```

**ACKED Parsing:**

```python
result = parse_acked_xml(xml_content)
# result.bsa_id: str (e.g., "31000123456789")
# result.activity_seq_to_bsa_id: Dict[str, str]
# result.receipt_date: str
```

### Phase 5: Filing Lifecycle Updates

**New Functions:**

| Function | Purpose |
|----------|---------|
| `perform_sdtm_submit()` | Build XML, upload, update status |
| `poll_sdtm_responses()` | Check for MESSAGES/ACKED, update status |
| `list_pending_polls()` | Get submissions ready for polling |

**Artifact Storage:**

All artifacts stored in `payload_snapshot.artifacts`:

```json
{
  "artifacts": {
    "xml": {
      "data": "H4sIAAAA...",  // gzip + base64 encoded
      "sha256": "abc123...",
      "size": 12345,
      "filename": "FBARXST.20260202143000.PCTITLE.abc123.xml"
    },
    "messages": { ... },  // When downloaded
    "acked": { ... }       // When downloaded
  }
}
```

### Phase 6: Endpoint Transport Switch

The `/reports/{id}/file` endpoint now:

```python
if ENVIRONMENT == "production" and FINCEN_TRANSPORT == "sdtm" and sdtm_configured:
    # Live SDTM filing
    outcome, submission = perform_sdtm_submit(db, report_id, ip)
    poll_sdtm_responses(db, report_id)  # Best-effort immediate poll
else:
    # Mock filing (staging/test/development)
    outcome, submission = perform_mock_submit(db, report_id, ip)
```

### Phase 7: Scripts

| Script | Purpose | Usage |
|--------|---------|-------|
| `poll_fincen_sdtm.py` | Background poller | `python -m app.scripts.poll_fincen_sdtm` |
| `fincen_sdtm_ping.py` | Test connectivity | `python -m app.scripts.fincen_sdtm_ping` |

**Poller Schedule (via Render Cron Job):**

```
*/15 * * * *  python -m app.scripts.poll_fincen_sdtm
```

### Phase 8: Tests

**Test Coverage:**

| Test Class | Coverage |
|------------|----------|
| `TestUtils` | gzip encode/decode, sha256, digits_only, country codes, sanitize |
| `TestResponseProcessor` | MESSAGES accepted/rejected/warnings, ACKED parsing |
| `TestFbarxBuilder` | XML generation, preflight failures, filename generation |

### Files Created

| File | Lines | Purpose |
|------|-------|---------|
| `api/app/services/fincen/__init__.py` | 30 | Module exports |
| `api/app/services/fincen/utils.py` | 110 | Compression, hashing, normalization |
| `api/app/services/fincen/sdtm_client.py` | 250 | SFTP client with retries |
| `api/app/services/fincen/response_processor.py` | 300 | MESSAGES/ACKED parsers |
| `api/app/services/fincen/fbarx_builder.py` | 550 | XML generation with data mapping |
| `api/app/scripts/__init__.py` | 10 | Scripts module |
| `api/app/scripts/poll_fincen_sdtm.py` | 100 | Background poller |
| `api/app/scripts/fincen_sdtm_ping.py` | 70 | Connectivity test |
| `api/tests/test_fincen_services.py` | 300 | Unit tests |

### Files Modified

| File | Changes |
|------|---------|
| `api/app/config.py` | Added SDTM/transmitter env vars + helpers |
| `api/requirements.txt` | Added `paramiko>=3.4.0` |
| `api/app/services/filing_lifecycle.py` | Added SDTM functions, poll backoff |
| `api/app/routes/reports.py` | Transport switch logic |

### Deployment Checklist

**For Production SDTM:**

1. Set `FINCEN_TRANSPORT=sdtm`
2. Set `FINCEN_ENV=sandbox` (for testing) or `production`
3. Configure SFTP credentials:
   - `SDTM_USERNAME`
   - `SDTM_PASSWORD`
4. Configure transmitter IDs:
   - `TRANSMITTER_TIN` (9 digits)
   - `TRANSMITTER_TCC` (8 chars, starts with P)
5. Create Render Cron Job:
   - Schedule: `*/15 * * * *`
   - Command: `python -m app.scripts.poll_fincen_sdtm`
6. Test connectivity: `python -m app.scripts.fincen_sdtm_ping`

**Status:** ✅ Killed (LEGENDARY SHARK 🦈🦈🦈)

---

## FinCEN SDTM + FBARX Integration — Production Hardening Addendum

**Date:** February 2, 2026

This addendum documents the final hardening measures applied to make the SDTM + FBARX integration production-ready.

---

### 1. Confirmation Statement

> **RRER is an internal workflow name. All outbound filings use FBARX XML Schema 2.0 over SDTM.**

The internal report type is called "RRER" (Real Estate Report) for business context, but the actual XML transmitted to FinCEN follows the **FBARX XML Schema 2.0** specification and is transmitted via **SDTM (Secure Direct Transfer Mode)** SFTP.

---

### 2. Environment Flags

| Variable | Purpose | Required |
|----------|---------|----------|
| `FINCEN_TRANSPORT` | `mock` or `sdtm` | Yes |
| `FINCEN_ENV` | `sandbox` or `production` | Yes |
| `SDTM_HOST` | SFTP hostname (auto-set if FINCEN_ENV provided) | Optional |
| `SDTM_PORT` | SFTP port (default: 2222) | Optional |
| `SDTM_USERNAME` | SFTP username | Yes for SDTM |
| `SDTM_PASSWORD` | SFTP password | Yes for SDTM |
| `TRANSMITTER_TIN` | 9-digit Transmitter TIN | Yes for SDTM |
| `TRANSMITTER_TCC` | 8-char TCC starting with "P" | Yes for SDTM |
| `SDTM_ORGNAME` | Organization name for filenames | Optional |

**Helper Properties:**
- `settings.sdtm_configured` → True if all required SDTM variables are set
- `settings.transmitter_configured` → True if TIN + TCC are set

---

### 3. Preflight Rules Summary

The FBARX builder performs **two-stage preflight validation**:

**Stage 1: Data Preflight (before XML generation)**

Blocks submission if:
- ❌ `TRANSMITTER_TIN` missing or not 9 digits
- ❌ `TRANSMITTER_TCC` missing or doesn't start with "P" or not 8 chars
- ❌ `reportingPerson.companyName` missing or empty
- ❌ Buyer missing identification (no SSN, EIN, passport, or foreign TIN)
- ❌ Buyer missing required address fields
- ❌ Forbidden placeholder text detected (UNKNOWN, N/A, NONE, etc.)

**Stage 2: Structural Preflight (after XML generation)**

Validates generated XML:
- ❌ XML not well-formed (parse error)
- ❌ Root element not `EFilingBatchXML`
- ❌ Missing required Activity-level parties (35, 37, 15)
- ❌ Transmitter (35) missing PartyIdentification types 4 (TIN) and 28 (TCC)
- ❌ No Account elements
- ❌ No Financial Institution party (41)
- ❌ SeqNum values not unique or not numeric
- ❌ Root counts don't match actual structure

**On preflight failure:**
- `PreflightError` raised
- `mark_needs_review()` called with specific error message
- NO SDTM upload attempted
- Errors stored in `payload_snapshot.preflight_errors`

---

### 4. Polling & Escalation Rules

**Poll Backoff Schedule:**

| Poll # | Wait Time |
|--------|-----------|
| 1 | 15 minutes |
| 2 | 1 hour |
| 3 | 3 hours |
| 4 | 6 hours |
| 5+ | 12 hours (repeats) |

**Time-Based Escalation:**

| Condition | Action |
|-----------|--------|
| No `MESSAGES.XML` after 24 hours | `mark_needs_review("No FinCEN response after 24 hours")` |
| `MESSAGES.XML` accepted but no `ACKED` after 5 days | `mark_needs_review("No ACKED after acceptance window")` |
| `MESSAGES.XML` status = `accepted_with_warnings` | `mark_needs_review("Accepted with warnings: [count] warning(s)")` |
| `MESSAGES.XML` status = `rejected` | `mark_rejected(code, message)` |
| `ACKED` contains BSA ID | `mark_accepted(bsa_id)` |

---

### 5. Debug Playbook

#### Where Artifacts Are Stored

All SDTM artifacts are stored in `FilingSubmission.payload_snapshot.artifacts`:

```json
{
  "artifacts": {
    "xml": {
      "data": "<gzip+base64 encoded XML>",
      "sha256": "abc123...",
      "size": 12345,
      "filename": "FBARXST.20260202143000.PCTITLE.abc123.xml"
    },
    "messages": {
      "data": "<gzip+base64 encoded MESSAGES.XML>",
      "downloaded_at": "2026-02-02T15:00:00Z",
      ...
    },
    "acked": {
      "data": "<gzip+base64 encoded ACKED>",
      "downloaded_at": "2026-02-02T16:00:00Z",
      ...
    }
  }
}
```

#### Admin Debug Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/admin/filings/{id}/debug` | GET | View detailed submission info |
| `/admin/filings/{id}/artifact/{type}` | GET | Download artifact (xml, messages, acked) |
| `/admin/filings/{id}/repoll` | POST | Trigger manual repoll (no reupload) |
| `/admin/sdtm/pending` | GET | List submissions ready for polling |

#### Diagnosing Issues

**Filing Rejected:**
1. Check `/admin/filings/{id}/debug` → `parsed_messages.errors`
2. Download MESSAGES.XML: `/admin/filings/{id}/artifact/messages`
3. Review error codes in FinCEN documentation
4. Fix data issues in wizard
5. Use "Retry Filing" to resubmit (creates new XML)

**Accepted with Warnings:**
1. Status will be `needs_review`
2. Check `parsed_messages.warnings`
3. Decide if warnings are acceptable
4. If acceptable, manually update status (future: admin action)

**Stuck in "submitted" Status:**
1. Check `poll_schedule.next_poll_at` - is polling running?
2. Try manual repoll: `/admin/filings/{id}/repoll`
3. Check SDTM connectivity: `python -m app.scripts.fincen_sdtm_ping`
4. Check poller logs for errors

**When to Repoll vs Refile:**
- **Repoll:** Status is `submitted`, just need to check for response files
- **Refile:** Status is `rejected` or `needs_review` AND data has been corrected

---

### 6. Operational Checklist (Pre-Go-Live)

- [ ] **SDTM ping success:** `python -m app.scripts.fincen_sdtm_ping` exits 0
- [ ] **Sandbox submission accepted:** Test filing goes through successfully
- [ ] **ACKED received:** BSA ID populated in `receipt_id`
- [ ] **Admin debug verified:** Can view submission, download artifacts
- [ ] **Poller running:** Render Cron Job configured and executing
- [ ] **Environment variables set:**
  - [ ] `FINCEN_TRANSPORT=sdtm`
  - [ ] `FINCEN_ENV=sandbox` (or `production` when ready)
  - [ ] `SDTM_USERNAME` and `SDTM_PASSWORD`
  - [ ] `TRANSMITTER_TIN` (9 digits)
  - [ ] `TRANSMITTER_TCC` (8 chars, starts with P)

---

### 7. Files Modified in Hardening Addendum

| File | Changes |
|------|---------|
| `api/app/services/fincen/fbarx_builder.py` | Added `_validate_xml_structure()` post-build preflight |
| `api/app/services/filing_lifecycle.py` | Explicit idempotency comments |
| `api/app/routes/admin.py` | Added SDTM debug endpoints |
| `docs/KilledSharks-2.md` | This addendum |

**Status:** ✅ Hardened

---

## RERX Payload Swap — Schema Correction

**Date:** February 2, 2026

### Correction Statement

> **FBARX assumption corrected. Outbound schema is RERX (Real Estate Report) per Dec 2025 FinCEN Technical Specifications for Batch XML Filers.**

The original implementation incorrectly assumed FBARX schema. Per the Dec 2025 FinCEN specification, Real Estate Reports must use the **RERX** schema, not FBARX.

---

### Schema Details

| Attribute | Old (FBARX) | New (RERX) |
|-----------|-------------|------------|
| **FormTypeCode** | `FBARX` | `RERX` |
| **schemaLocation** | N/A | `www.fincen.gov/base https://bsaefiling.fincen.gov/resources/EFL_RERXBatchSchema.xsd` |
| **Filename prefix** | `FBARXST` | `RERXST` |
| **Filename format** | `FBARXST.<ts>.<orgname>.<suffix>.xml` | `RERXST.<ts>.<SDTM_USERNAME>.xml` |
| **Sandbox TCC** | Configured | **Must be `TBSATEST`** (per spec) |

---

### RERX Minimum Required Sections Checklist

All RERX Activity elements must contain these in order:

- [x] **FilingDateText** — `YYYYMMDD`, cannot be future, cannot be < 20251201
- [x] **ActivityAssociation** — with `InitialReportIndicator=Y` for new filings
- [x] **Party 31** — Reporting Person (exactly one)
- [x] **Party 67** — Transferee/Buyer (at least one)
  - Entity: `TransferPartyEntityIndicator=Y`
  - Trust: `TransferPartyTrustIndicator=Y` + execution date
  - Associated Persons (68) for BOs/signing individuals
- [x] **Party 69** — Transferor/Seller (at least one)
  - Trust sellers need trustee association (Party 70)
- [x] **Party 35** — Transmitter with:
  - TIN (PartyIdentificationTypeCode=4)
  - TCC (PartyIdentificationTypeCode=28) — **TBSATEST for sandbox**
- [x] **Party 37** — Transmitter Contact
- [x] **AssetsAttribute** — Property address + optional legal description
- [x] **ValueTransferActivity** — Payment details + closing date
  - `TotalConsiderationPaidAmountText` OR `NoConsiderationPaidIndicator=Y`
  - `ValueTransferActivityDetail` per payment source with FI Party (41)

---

### Files Changed

| File | Change |
|------|--------|
| `api/app/services/fincen/rerx_builder.py` | **NEW** — RERX XML generator (~700 lines) |
| `api/app/services/fincen/__init__.py` | Export `build_rerx_xml`, `generate_rerx_filename` |
| `api/app/services/filing_lifecycle.py` | Import/call `build_rerx_xml`, use `SDTM_USERNAME` for filename |
| `api/app/services/fincen/fbarx_builder.py` | **DEPRECATED** — No longer used |

---

### Sandbox TCC Requirement

For `FINCEN_ENV=sandbox`:
- TCC **must** be `TBSATEST` (per FinCEN spec)
- The builder automatically uses this when `config.FINCEN_ENV == "sandbox"`
- Production uses `config.TRANSMITTER_TCC`

---

**Status:** ✅ Schema Corrected

---

## Summary Update

| Category | Count |
|----------|-------|
| 🔴 Critical Features | 3 |
| 🟠 Major Features | 1 |
| 🎨 UX/Design | 1 |
| 🔧 Configuration | 2 |
| 📄 Documentation | 3 |

**Total Sharks Killed (Vol 2): 9 🦈 + 1 Hardening Addendum**

---

## Next Steps

1. **P0:** Test SDTM integration with FinCEN sandbox
2. **P1:** Billing Phase 2 - Subscription billing model
3. **P1:** Entity Enhancements Phase 2 - Backend storage of new fields
4. **P2:** Add property type validation against SiteX data
5. **P2:** Stripe integration for payments
6. ~~**P3:** Admin debug UI for SDTM submissions~~ ✅ Done (backend endpoints)

---

*Last updated: February 2, 2026*
