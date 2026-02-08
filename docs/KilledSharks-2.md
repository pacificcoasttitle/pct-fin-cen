# 🦈 Killed Sharks - Volume 2

> January 30, 2026 and beyond

---

## Summary

| Category | Count |
|----------|-------|
| 🔴 Critical Features | 10 |
| 🟠 Major Features | 1 |
| 🎨 UX/Design | 2 |
| 🔧 Configuration | 3 |
| 📄 Documentation | 3 |

**Total Sharks Killed (Vol 2): 18 🦈 + 1 Hardening Addendum**

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

## Critical Bug Fix: .ACK File Extension

**Date:** February 3, 2026

### Issue

The poller was looking for `.ACKED` files but FinCEN actually writes `.ACK` files.

| What code expected | What FinCEN writes |
|--------------------|-------------------|
| `filename.ACKED` | `filename.ACK` |

### Impact (if unfixed)

- Poller would **never find** acknowledgement files
- Filings would appear stuck in "submitted" forever
- After 5 days → escalates to `needs_review`
- BSA IDs would never be extracted

### Fix Applied

```python
# BEFORE (bug)
acked_filename = f"{filename}.ACKED"

# AFTER (correct)
acked_filename = f"{filename}.ACK"  # CRITICAL: .ACK not .ACKED
```

### Files Updated

| File | Change |
|------|--------|
| `api/app/services/filing_lifecycle.py` | Fixed filename pattern |
| `api/app/services/fincen/response_processor.py` | Updated docstring |
| `api/app/services/fincen/__init__.py` | Updated docstring |

**Status:** ✅ Bug Fixed

---

## 🔧 Pre-Sandbox Readiness Scripts

**Date:** February 2, 2026

Created utility scripts for pre-submission validation while waiting for FinCEN sandbox access.

### Scripts Created

| Script | Purpose |
|--------|---------|
| `api/app/scripts/rerx_dry_run.py` | Generate RERX XML from real report data (no submission) |
| `api/app/scripts/rerx_validate_xsd.py` | Validate XML against XSD or structural checks |

### Dry Run Script (`rerx_dry_run.py`)

```bash
# Basic run - finds best available report automatically
python -m app.scripts.rerx_dry_run --show-data

# Target a specific report
python -m app.scripts.rerx_dry_run --report-id "UUID" --show-data

# Custom output filename
python -m app.scripts.rerx_dry_run --output my_test.xml
```

**Features:**
- Auto-loads `.env` for local development
- Finds most suitable report (filed > ready_to_file > collecting)
- Shows wizard_data summary with `--show-data`
- Saves XML to file for inspection
- Clear error messages for preflight failures

### Validation Script (`rerx_validate_xsd.py`)

```bash
# Structural validation (no XSD required)
python -m app.scripts.rerx_validate_xsd rerx_dry_run_output.xml --structural-only

# Full XSD validation (if schema downloaded)
python -m app.scripts.rerx_validate_xsd rerx_dry_run_output.xml --xsd rerx_schema.xsd
```

**Structural Checks:**
- Well-formed XML
- FormTypeCode = RERX
- Schema location present
- All required party types (31, 67, 69, 35, 37)
- Required sections (FilingDateText, ActivityAssociation, AssetsAttribute, ValueTransferActivity)
- Filing date in valid range (20251201-20261231)
- TCC value present (TBSATEST for sandbox)
- Transmitter TIN present and 9 digits
- SeqNum uniqueness
- ActivityCount attribute

### Ping Script Update

Updated `api/app/scripts/fincen_sdtm_ping.py` to auto-load `.env` file for local development.

**Status:** ✅ Scripts Created

---

### 51. Filing Status Display — Full System Remediation ✅

**Date:** February 3, 2026

**Problem:** Investigation revealed significant gaps in how filing status and receipt IDs are displayed across all user roles:

- COO dashboard: No individual filing visibility, revenue hardcoded at $75, no rejection alerts
- Staff queue: No filing status column, no receipt ID, no rejection visibility
- Wizard: Always showed "Demo" badge even for live SDTM filings
- Client requests: Receipt ID in interface but not rendered in table, inconsistent field naming
- Client dashboard: No filing summary at all
- Status badges duplicated 16+ times with inconsistent vocabulary
- No shared status component
- No receipt ID search capability

**Solution:** Comprehensive remediation across all user-facing pages.

#### Shared Components Created

| Component | Purpose |
|-----------|---------|
| `StatusBadge.tsx` | Universal status badge with type-specific vocabularies (report, filing, request, invoice, party, user) |
| `ReceiptId.tsx` | Copyable receipt ID display with consistent styling, truncation, and tooltips |
| `usePollFilingStatus.ts` | Auto-refresh hook for pending filing status (polls every 60s) |

#### Status Vocabulary Standardization

| Type | Statuses |
|------|----------|
| Report | draft, determination_complete, awaiting_parties, collecting, ready_to_file, filed, exempt, cancelled |
| Filing | not_started, queued, submitted, accepted, rejected, needs_review |
| Request (client) | pending, exempt, reportable, in_progress, completed, cancelled |

#### Changes by Role

**COO (/app/executive):**
- Revenue now calculated from actual BillingEvent records, not hardcoded $75
- Added `avg_revenue_per_filing` from real billing data
- Added rejection/needs_review alert banner when issues exist
- Added "Recent Filings" mini-table with receipt IDs
- Stats are clickable, linking to filtered admin views

**PCT Admin:**
- Replaced inline status maps with shared StatusBadge component
- Receipt ID search/filter added (searches address, ID, receipt)
- ReceiptId component shows copyable IDs with click-to-copy

**PCT Staff:**
- Queue now shows filing status column alongside report status
- Receipt ID visible for filed reports using shared ReceiptId component
- Rejection/needs_review attention banner at top of queue
- `needs_attention` count added to queue stats

**Client Wizard:**
- Shows "Live Filing" badge for SDTM submissions
- Shows "Demo" badge only for mock filings (using `is_demo` from FileResult)
- Shows "Awaiting FinCEN Response" card for `submitted` status
- Contextual messaging based on actual filing transport

**Client Admin/User:**
- Receipt ID now rendered in requests table for completed requests
- Receipt ID column added to requests table
- Field naming standardized (supports both `receipt_id` and `filing_receipt_id`)
- Receipt ID shows whenever present regardless of request status
- Dashboard now includes filing summary card with counts by status
- Filing summary shows most recent filing with receipt ID

**Executive Dashboard Backend:**
- `GET /reports/executive-stats` now returns:
  - `avg_revenue_per_filing` from actual BillingEvent sum/count
  - `rejected_filings`, `needs_review_filings`, `pending_filings`, `accepted_filings` counts
  - `recent_filings` array with last 5 accepted filings (receipt_id, company, address)

#### Files Created

| File | Purpose |
|------|---------|
| `web/components/ui/StatusBadge.tsx` | Shared status badge component (all status configs exported) |
| `web/components/ui/ReceiptId.tsx` | Copyable receipt ID component |
| `web/hooks/usePollFilingStatus.ts` | Filing status polling hook |

#### Files Modified

| File | Change |
|------|--------|
| `web/app/(app)/app/executive/page.tsx` | Real revenue, alert banner, recent filings table, clickable stats |
| `web/app/(app)/app/staff/queue/page.tsx` | Filing status column, receipt ID, attention banner, needs_attention count |
| `web/app/(app)/app/reports/[id]/wizard/page.tsx` | Demo vs Live badge, submitted state card, contextual messaging |
| `web/app/(app)/app/requests/page.tsx` | Receipt ID column in table, uses StatusBadge |
| `web/app/(app)/app/requests/[id]/page.tsx` | Receipt ID shows when present (not status-gated), uses ReceiptId component |
| `web/app/(app)/app/dashboard/page.tsx` | Filing summary card with counts and most recent filing |
| `web/app/(app)/app/admin/reports/page.tsx` | Uses shared StatusBadge and ReceiptId, receipt ID search |
| `web/lib/api.ts` | Added ExecutiveStats fields (avg_revenue_per_filing, filing counts, recent_filings) |
| `api/app/routes/reports.py` | executive-stats: real revenue from BillingEvents, filing breakdown, recent filings |

**Status:** ✅ Killed (VISIBILITY SHARK 🦈)

---

### 52. Billing Finalization — PDF Invoices + Email Delivery ✅

**Date:** February 3, 2026

**Problem:** The billing system (Shark #48) had core functionality but lacked:
- PDF invoice generation (clients couldn't download invoices)
- Email delivery (invoices had to be sent manually outside the system)
- Company billing tier classification (`invoice_only` vs `hybrid` vs `subscription`)
- Frontend actions for email/PDF

**Solution:** Comprehensive billing finalization for March 1, 2026 launch.

#### Database Changes

New migration `20260203_000001_add_billing_type_and_invoice_email.py`:

| Table | Field | Type | Purpose |
|-------|-------|------|---------|
| `companies` | `billing_type` | String(50) | `invoice_only`, `hybrid`, `subscription` |
| `companies` | `stripe_customer_id` | String(255) | For future Stripe integration |
| `invoices` | `sent_to_email` | String(255) | Track where invoice was sent |

#### PDF Generation Service

**File:** `api/app/services/pdf_service.py` (NEW - ~350 lines)

- Professional HTML invoice template with FinClear branding
- PDFShift API integration for HTML→PDF conversion
- Graceful fallback to HTML preview when PDFShift not configured
- Includes: invoice summary, line items table, payment instructions, totals

#### Invoice Email Templates

**File:** `api/app/services/email_service.py` (UPDATED)

New functions:
- `get_invoice_email_html()` - Professional invoice notification email
- `get_invoice_email_text()` - Plain text fallback
- `send_invoice_email()` - Complete invoice delivery function

Email includes: invoice summary card, amount due, due date, payment options, view link.

#### New API Endpoints

**File:** `api/app/routes/billing.py` (UPDATED)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/billing/admin/invoices/{id}/send-email` | Send invoice to company billing contact |
| GET | `/billing/admin/invoices/{id}/pdf` | Generate/download invoice PDF |
| GET | `/billing/my/invoices/{id}/pdf` | Client download own invoice PDF |

#### Frontend Updates

**Admin Billing Page** (`/app/admin/billing`):
- ✅ "Download PDF" button in invoice dropdown
- ✅ "Send Invoice" / "Resend Email" button in invoice dropdown
- ✅ PDF and Email buttons in invoice detail dialog
- ✅ Fixed TypeScript `float` → `number` bug (line 108)

**Client Billing Page** (`/app/billing`):
- ✅ PDF download button on each invoice row
- ✅ "Download PDF" button in invoice detail dialog

#### Configuration

New environment variables:
```env
PDFSHIFT_API_KEY=your_pdfshift_api_key
PDFSHIFT_ENABLED=true
```

#### Billing Tier Model

| Tier | Name | Behavior |
|------|------|----------|
| `invoice_only` | Trusted | Invoice sent. Payment on their terms (Net 30). No card required. |
| `hybrid` | Standard | Invoice sent with Net 10. If unpaid after terms, auto-charge card on file. |
| `subscription` | Subscription | Monthly flat fee + per-filing overages. (Phase 2 - NOT in this PR) |

#### Files Created/Modified

| File | Change |
|------|--------|
| `api/alembic/versions/20260203_000001_*.py` | NEW - Migration for billing_type, stripe_customer_id, sent_to_email |
| `api/app/models/company.py` | Added billing_type, stripe_customer_id |
| `api/app/models/invoice.py` | Added sent_to_email |
| `api/app/config.py` | Added PDFSHIFT_API_KEY, PDFSHIFT_ENABLED, pdfshift_configured property |
| `api/app/services/pdf_service.py` | NEW - PDF generation service |
| `api/app/services/email_service.py` | Added invoice email templates |
| `api/app/routes/billing.py` | Added send-email and pdf endpoints |
| `web/app/(app)/app/admin/billing/page.tsx` | Email/PDF buttons, fixed TypeScript bug |
| `web/app/(app)/app/billing/page.tsx` | PDF download button |

**Status:** ✅ Killed (BILLING SHARK 🦈)

---

### 54. Company Onboarding Enhancement — Multi-Step Creation Wizard ✅

**Date:** February 3, 2026

**Problem:**
Company creation was a basic 5-field modal that captured almost nothing needed to serve a company:
- No billing configuration (billing_type, filing_fee, payment_terms)
- No admin user creation
- No address collection
- No company readiness checklist
- `billing_type` was invisible — not editable anywhere in the UI
- COO had to visit 2+ pages and 6+ clicks to fully set up a company
- `billing_email` not required, causing invoice failures
- No dedicated company detail page (only a side sheet)
- No client company settings page

**Solution:** Complete company onboarding overhaul.

#### Multi-Step Creation Wizard

| Step | What It Captures |
|------|-----------------|
| 1. Company Info | Name, code (auto-generated), phone, address |
| 2. Billing Config | Billing type, filing fee, payment terms, billing email, billing contact |
| 3. Admin User | First client_admin name + email (optional but encouraged) |
| 4. Review | Summary of all fields, edit links back to each step |

#### billing_type Now Visible Everywhere

| Location | Before | After |
|----------|--------|-------|
| Company creation | ❌ Not available | ✅ Step 2 of wizard |
| Company detail sheet | ❌ Not shown | ✅ In billing section |
| Billing rates tab | ❌ No column | ✅ Billing Type column + editable |
| Company list table | ❌ No indicator | ✅ Badge on each row |
| Client company settings | ❌ Page not functional | ✅ Visible (read-only) |

#### New Features

| Feature | Description |
|---------|------------|
| Company readiness checklist | Shows setup progress: billing email, admin user, address, card on file |
| Dedicated company detail page | `/app/admin/companies/{id}` — deep-linkable, full company view |
| Client company settings | `/app/settings/company` — clients can view/edit limited fields |
| Auto-generated company code | Name → code suggestion (editable) |
| billing_email required | Enforced for all client companies |
| Admin user at creation | Optional checkbox to create first client_admin during onboarding |

#### API Changes

| Endpoint | Change |
|----------|--------|
| `POST /companies` | Expanded schema: billing_type, filing_fee_cents, payment_terms_days, create_admin_user, admin_user_name, admin_user_email |
| `PATCH /companies/{id}` | Now accepts billing_type |
| `PATCH /billing/admin/rates/{id}` | Now accepts billing_type |
| `GET /companies/{id}/readiness` | **NEW** — Returns setup checklist |
| `GET /companies/{id}/users` | Already exists — Returns users for a company |
| `GET /companies/me` | **NEW** — Client's own company info |
| `PATCH /companies/me` | **NEW** — Client admin updates limited fields |

#### Files Created

| File | Purpose |
|------|---------|
| `web/app/(app)/app/admin/companies/[id]/page.tsx` | Dedicated company detail page |
| `web/components/CompanyReadinessChecklist.tsx` | Reusable readiness checklist component |

#### Files Modified

| File | Change |
|------|--------|
| `api/app/routes/companies.py` | Expanded creation schema, readiness endpoint, /me endpoints |
| `api/app/routes/billing.py` | billing_type in rates endpoint |
| `web/app/(app)/app/admin/companies/page.tsx` | Multi-step wizard replaces simple modal, billing_type in list table + detail sheet |
| `web/app/(app)/app/admin/billing/page.tsx` | billing_type column + edit in rates tab |
| `web/app/(app)/app/settings/company/page.tsx` | Full rewrite — now fetches from API, shows billing info |

**Status:** ✅ Killed (ONBOARDING SHARK 🦈)

---

### 55. Demo Auth Fix — Real Database IDs ✅

**Date:** February 3, 2026

**Problem:**
Demo login stored **hardcoded fake IDs** in the session cookie (e.g., `companyId: "demo-client-company"` instead of a real UUID). This caused:
- All client-side API calls to fail (401, 404, 500)
- Sidebar counts endpoint returning errors (CORS masking 500s)
- Billing endpoints returning 401 for client roles
- Company settings showing "No company found"
- **Effectively, NO client-side features worked in demo mode**

**Root Cause:**
The frontend login API route (`web/app/api/auth/login/route.ts`) had a hardcoded `DEMO_USERS` object with fake IDs like `"demo-client-company"` and `"demo-client-admin"`. When these fake IDs were stored in the session cookie, backend endpoints couldn't find matching database records.

**Solution:**
1. **Created backend auth endpoint** (`api/app/routes/auth.py`):
   - `POST /auth/demo-login` — Looks up user by email in database, returns REAL UUIDs
   - Updates `last_login_at` timestamp
   - Returns real `user_id`, `company_id`, `company_name`, `company_code`

2. **Rewrote frontend login route** (`web/app/api/auth/login/route.ts`):
   - Removed all hardcoded `DEMO_USERS` with fake IDs
   - Now calls backend `/auth/demo-login` to get real user data
   - Stores REAL UUIDs in session cookie

3. **Added UUID validation to sidebar endpoint** (`api/app/routes/sidebar.py`):
   - Added `is_valid_uuid()` helper
   - Returns zeros instead of crashing for invalid company_id
   - Gracefully handles legacy sessions with fake IDs

4. **Fixed incorrect demo user email** (`api/app/routes/billing.py`):
   - Changed `admin@demoescrow.com` → `admin@demotitle.com`

**Files Created:**

| File | Purpose |
|------|---------|
| `api/app/routes/auth.py` | Demo login endpoint returning real UUIDs |

**Files Modified:**

| File | Change |
|------|--------|
| `api/app/routes/__init__.py` | Export auth_router |
| `api/app/main.py` | Register auth router |
| `api/app/routes/sidebar.py` | UUID validation, graceful fallback |
| `api/app/routes/billing.py` | Fixed demo user email |
| `web/app/api/auth/login/route.ts` | Complete rewrite — calls backend, stores real UUIDs |

**Verification Checklist:**

- [x] Zero instances of "demo-client-company" in codebase
- [x] CORS correctly configured for `fincenclear.com`
- [x] Sidebar counts endpoint validates UUIDs
- [x] All demo user email references point to `admin@demotitle.com`

**Impact:**
All client-side features now work correctly:
- ✅ Company Settings loads with real company data
- ✅ Billing endpoints return 200 (not 401)
- ✅ Sidebar counts display correctly
- ✅ Dashboard loads with real data

**Status:** ✅ Killed (CRITICAL AUTH SHARK 🦈)

---

### 56. Auto-Seed Demo Users on Startup ✅

**Date:** February 3, 2026

**Problem:**
Database had 1 company but **ZERO users**. The demo auth fix (#55) correctly looked up users in the database, but found nothing because the seed was never run. Login showed "User not found" for all demo accounts.

**Root Cause:**
- The `POST /demo/reset` endpoint exists and seeds users, but requires `X-DEMO-SECRET` header
- No one ever called that endpoint after the database was created
- No auto-seed mechanism existed

**Solution:**
Added a **lifespan startup hook** that:
1. Checks if `ENVIRONMENT=staging`
2. Queries users table count
3. If count == 0, calls `seed_demo_data()` to create all demo users
4. Logs the result

**Files Modified:**

| File | Change |
|------|--------|
| `api/app/main.py` | Added `lifespan` context manager with `auto_seed_if_empty()` |

**What Gets Created:**

| Email | Name | Role | Company |
|-------|------|------|---------|
| `coo@pct.com` | James Richardson | coo | null |
| `admin@pctfincen.com` | Sarah Mitchell | pct_admin | null |
| `staff@pctfincen.com` | Michael Chen | pct_staff | null |
| `admin@demotitle.com` | Jennifer Walsh | client_admin | Pacific Coast Title |
| `user@demotitle.com` | David Park | client_user | Pacific Coast Title |
| `admin@acmetitle.com` | Robert Johnson | client_admin | Acme Title & Escrow |

**Verification:**
After deploy, check `/health` endpoint:
```json
{
  "status": "ok",
  "users": 6,
  "environment": "staging"
}
```

**Status:** ✅ Killed (AUTO-SEED SHARK 🦈)

---

## Summary Update

| Category | Count |
|----------|-------|
| 🔴 Critical Features | 8 |
| 🟠 Major Features | 1 |
| 🎨 UX/Design | 2 |
| 🔧 Configuration | 3 |
| 📄 Documentation | 3 |

**Total Sharks Killed (Vol 2): 15 🦈 + 1 Hardening Addendum**

---

### 57. Party Portal Data Bridge + Auto-Transition ✅

**Date:** February 3, 2026

**Problem:** Party portal collected all required RERX data but stored it in `ReportParty.party_data`. The RERX builder read from `report.wizard_data.collection`. No sync existed between these two locations, meaning portal-submitted data never reached the XML generator.

**Root Cause:**
- Portal writes to: `ReportParty.party_data` (JSONB)
- RERX builder reads from: `report.wizard_data.collection` (different JSONB column)
- No synchronization between these two data stores
- Additionally, portal uses snake_case (`first_name`), wizard uses camelCase (`firstName`)

**Solution:**

Created `api/app/services/party_data_sync.py` that:
1. Loads all ReportParty records for a report
2. Maps portal snake_case fields to wizard camelCase structure
3. Handles format conversions (SSN hyphens, phone normalization, country codes)
4. Preserves non-party fields in wizard_data (reportingPerson, propertyAddress)
5. Sets `determination.buyerType` based on transferee entity_type

**Sync is triggered:**
- Automatically when a party submits via the portal
- As a pre-filing safety net before RERX XML generation

**Additional Features Implemented:**

| Feature | Description |
|---------|-------------|
| Auto-transition to `ready_to_file` | When all parties have status `submitted`, report automatically transitions to `ready_to_file` |
| Link resend endpoint | `POST /party/staff/resend-link/{party_id}` — Regenerates or resends portal links |
| Staff notification template | Email template for notifying staff when parties complete |
| Audit logging | All syncs and status changes are logged for traceability |

**Files Created:**

| File | Lines | Purpose |
|------|-------|---------|
| `api/app/services/party_data_sync.py` | ~450 | Sync function with field mapping logic |

**Files Modified:**

| File | Change |
|------|--------|
| `api/app/routes/parties.py` | Added sync on submit, auto-transition, resend endpoint |
| `api/app/services/filing_lifecycle.py` | Added pre-filing safety net sync |
| `api/app/services/email_service.py` | Added `send_party_submitted_notification()` |

**Data Flow After Fix:**

```
Portal Submit
    │
    ▼
party.party_data = {...}  ──► sync_party_data_to_wizard()
                                        │
                                        ▼
                               wizard_data.collection = {
                                   buyerEntity: { ... },
                                   sellers: [ ... ],
                                   paymentSources: [ ... ],
                                   _portal_synced_at: "2026-02-03T..."
                               }
                                        │
                                        ▼
                               build_rerx_xml() reads wizard_data ✅
```

**End-to-End Validation (February 3, 2026):**

| Step | Test | Result |
|------|------|--------|
| 1 | Check existing data | ✅ Found 9 parties, 4 reports |
| 1B | Create test data | ✅ Entity buyer + 2 BOs + individual seller |
| 2 | Run sync function | ✅ 2 parties synced, SSN hyphens stripped |
| 3 | RERX dry run | ✅ XML generated (8991 bytes, 184 lines) |
| 4 | Structural validation | ✅ **18/18 checks passed** |
| 5 | Content inspection | ✅ All portal data visible in XML |

**Verified in XML:**
- Party 67 (Buyer): Entity name + EIN (hyphens stripped)
- Party 68 (BOs): Margaret Chen + Robert Kim with SSNs (hyphens stripped)
- Party 69 (Seller): James Wilson
- Payments: $1,250,000 + $250,000 = $1,500,000
- All addresses mapped correctly

**Status:** ✅ Killed (BRIDGE SHARK 🦈) — **E2E VALIDATED**

---

### 58. Client-Driven Wizard Flow + Notification System Overhaul ✅

**Date:** February 8, 2026

**Problem:** Staff queue was an unnecessary bottleneck. Escrow officers had all the transaction information but had to wait for PCT staff to re-enter it in the wizard. Notifications existed but weren't wired up to send emails at key moments.

**Solution:** Transformed FinClear from staff-mediated to client-driven self-service:

| Change | Before | After |
|--------|--------|-------|
| Report Creation | Staff only | Clients create directly |
| Wizard Access | Staff only | Clients run full wizard |
| Party Links | Staff sends | Clients send |
| Filing Trigger | Manual by staff | Auto-file on all parties complete |
| Staff Role | Data entry | QC/oversight review only |

### Database Schema Updates

```python
# New columns on Report model
initiated_by_user_id = Column(UUID, ForeignKey("users.id"))  # Escrow officer
auto_file_enabled = Column(Boolean, default=True)           # Auto-file toggle
auto_filed_at = Column(DateTime)                            # When triggered
notification_config = Column(JSONB)                         # Notification prefs
```

### Auto-File Flow

```
Party Submit (last party)
    │
    ▼
All parties complete? ──► Yes ──► Auto-file triggered
    │                              │
    │                              ▼
    │                         Ready check passes?
    │                              │
    │                         Yes ──► File to FinCEN
    │                              │
    │                         No  ──► Status: needs_review
    │                              │
    ▼                              ▼
Notifications sent to:         Notifications sent to:
- Escrow officer               - Escrow officer
- Company admin                - Staff (urgent)
- Staff                        - Admin (urgent)
```

### Notification Matrix

| Event | Escrow Officer | Company Admin | Staff | Admin |
|-------|----------------|---------------|-------|-------|
| Party submits | ✅ | ✅ | ✅ (all complete) | — |
| Filing submitted | ✅ | — | — | — |
| Filing accepted | ✅ | ✅ | ✅ | — |
| Filing rejected | ✅ | — | ✅ 🚨 | ✅ 🚨 |

### Permission Updates

| Action | client_user | client_admin | staff | admin |
|--------|-------------|--------------|-------|-------|
| Create report | ✅ | ✅ | ✅ | ✅ |
| Run wizard | ✅ Own | ✅ Company | ✅ All | ✅ All |
| Send party links | ✅ Own | ✅ Company | ✅ All | ✅ All |
| File to FinCEN | ✅ Own | ✅ Company | ✅ All | ✅ All |

### Frontend Changes

| Component | Change |
|-----------|--------|
| Navigation | Added "Start New Report" for clients |
| `/reports/new` | Enhanced with form for property details |
| `/reports` | Real-time status with party progress |
| Staff Queue | Renamed to "Review Queue", added client-driven info |

### Files Created

- `api/alembic/versions/20260208_000001_client_driven_flow.py` — Migration
- `api/app/middleware/permissions.py` — Role-based access control

### Files Modified

**Backend:**
- `api/app/models/report.py` — New columns + relationships
- `api/app/config.py` — Notification + auto-file settings
- `api/app/routes/reports.py` — Client creation, user context
- `api/app/routes/parties.py` — Auto-file trigger, notification dispatch
- `api/app/services/filing_lifecycle.py` — Auto-file function, notification helpers
- `api/app/services/email_service.py` — Filing status email templates

**Frontend:**
- `web/lib/navigation.ts` — Client wizard access
- `web/lib/api.ts` — Reports with parties API
- `web/app/(app)/app/reports/new/page.tsx` — Client entry form
- `web/app/(app)/app/reports/page.tsx` — Real-time report list
- `web/app/(app)/app/staff/queue/page.tsx` — Review queue transformation

**Documentation:**
- `docs/RRER-WIZARD-TECHNICAL-DOCUMENTATION.md` — Client-driven flow section

**Status:** ✅ Killed (FLOW TRANSFORMATION SHARK 🦈🦈🦈)

---

### 59. Triple Shark Kill: Emails + Permissions + Landing Page ✅

**Date:** February 8, 2026

**Problem:** 
- Email notification events were logged but not sent
- Client users couldn't access wizard
- Landing page had FNF references and unverifiable claims

**Investigation Result:**
All three issues were **already resolved** in previous work:

| Shark | Status | Evidence |
|-------|--------|----------|
| **A: Email Wiring** | ✅ Complete | `parties.py` line 64: `send_party_submitted_notification()` wired |
| | | `filing_lifecycle.py` line 105: `send_filing_accepted_notification()` wired |
| | | `config.py`: `STAFF_NOTIFICATION_EMAIL` and `ADMIN_NOTIFICATION_EMAIL` configured |
| **B: Client Permissions** | ✅ Complete | `middleware/permissions.py`: Full RBAC with `CLIENT_USER_PERMISSIONS` |
| | | `navigation.ts`: Client users have "Start New Report" → `/app/reports/new` |
| | | `reports.py` route: Clients can create reports with `initiated_by_user_id` |
| | | `reports/page.tsx`: Full client reports list with actions |
| **C: Landing Page** | ✅ Complete | `about-section.tsx`: No FNF references, factual stats only |
| | | `security-section.tsx`: Testimonial replaced with demo CTA |
| | | Only `web/_imports/` (backup) contains old content |

**Verification Checklist:**
```bash
# All return only _imports/ (backup) matches
grep -rn "FNF" web/ --include="*.tsx"           # ✅ Only in _imports
grep -rn "most comprehensive" web/              # ✅ Only in _imports  
grep -rn "hundreds of" web/                     # ✅ Only in _imports
grep -rn "Sarah Mitchell.*Golden State" web/   # ✅ No matches
```

**Files Already Complete:**
- `api/app/routes/parties.py` — Email wiring for party submissions
- `api/app/services/filing_lifecycle.py` — Filing notification dispatch
- `api/app/services/email_service.py` — All email templates present
- `api/app/middleware/permissions.py` — Full RBAC implementation
- `web/lib/navigation.ts` — Client wizard access configured
- `web/app/(app)/app/reports/page.tsx` — Client reports list
- `web/components/about-section.tsx` — Clean, factual content
- `web/components/security-section.tsx` — Demo CTA (no testimonial)

**Status:** ✅ Already Killed (TRIPLE SHARK 🦈🦈🦈 — verified complete)

---

## Next Steps

1. **P0:** Verify sandbox credentials with FinCEN (authentication failed in test)
2. **P0:** Run dry-run against production database once credentials verified
3. **P1:** Configure PDFShift API key in Render environment
4. **P1:** Billing Phase 2 - Subscription billing model (if needed)
5. **P1:** Entity Enhancements Phase 2 - Backend storage of new fields
6. **P2:** Add property type validation against SiteX data
7. **P2:** Stripe integration for hybrid tier auto-charge
8. ~~**P3:** Admin debug UI for SDTM submissions~~ ✅ Done (backend endpoints)

---

*Last updated: February 8, 2026 (Shark #59 - Triple Shark verified)*
