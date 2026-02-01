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

## Summary Update

| Category | Count |
|----------|-------|
| 🔴 Critical Features | 2 |
| 🟠 Major Features | 1 |
| 🎨 UX/Design | 1 |
| 🔧 Configuration | 2 |
| 📄 Documentation | 2 |

**Total Sharks Killed (Vol 2): 8 🦈**

---

## Next Steps

1. **P1:** Billing Phase 2 - Subscription billing model
2. **P1:** Entity Enhancements Phase 2 - Backend storage of new fields
3. **P2:** Add property type validation against SiteX data
4. **P2:** Stripe integration for payments
5. **P3:** Surface lastSalePrice for pricing sanity check
6. **P3:** Add APN-only lookup as alternative entry point

---

*Last updated: February 1, 2026*
