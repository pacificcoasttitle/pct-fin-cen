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

### 48. Per-Company Billing Configuration (Phase 1) ✅

**Date:** January 30, 2026

**Problem:** All companies were charged a hardcoded $75/filing with no flexibility for:
- Enterprise pricing
- Volume discounts
- Special arrangements
- Manual credits/adjustments

The hardcoded line was:
```python
amount_cents=7500  # $75.00 per filing - HARDCODED!
```

**Solution:** Implemented Phase 1 of the Billing System Enhancement.

### Database Changes

| Column | Type | Default | Purpose |
|--------|------|---------|---------|
| `filing_fee_cents` | Integer | 7500 | Per-filing charge |
| `payment_terms_days` | Integer | 30 | Days until due |
| `billing_notes` | Text | null | Internal notes |

**Migration:** `api/alembic/versions/20260130_000001_add_company_billing_settings.py`

### API Endpoints Added

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/companies/{id}/billing-settings` | Get billing config |
| PATCH | `/companies/{id}/billing-settings` | Update billing settings |
| POST | `/invoices/billing-events` | Create manual charge/credit |
| GET | `/invoices/billing-events` | List billing events |

### Admin UI Enhancements

**Company Detail Sheet:**
- New "Billing Settings" section
- Editable filing fee ($0.00 - $999.99)
- Editable payment terms (Net X days)
- Internal billing notes field

**Invoice Management Page:**
- "Generate Invoice" button + dialog
  - Select company
  - Set billing period dates
  - Preview unbilled events count/total
- "Add Billing Event" button + dialog
  - Select company
  - Choose type (adjustment, credit, expedite fee, other)
  - Enter amount with credit checkbox
  - Add description

### Dynamic Billing

BillingEvent creation now uses company's configured rate:
```python
# Get company's filing fee (fallback to $75 default)
company = db.query(Company).filter(Company.id == report.company_id).first()
filing_fee = company.filing_fee_cents if company else 7500
```

### Audit Trail

New events logged:
- `billing_event.created` - Auto-created on filing
- `billing_event.manual_created` - Manual charge/credit
- `company.billing_settings_updated` - Rate changes

### Files Created

| File | Purpose |
|------|---------|
| `api/alembic/versions/20260130_000001_add_company_billing_settings.py` | Migration |

### Files Modified

| File | Changes |
|------|---------|
| `api/app/models/company.py` | Added billing fields + property |
| `api/app/routes/companies.py` | Added billing settings endpoints |
| `api/app/routes/invoices.py` | Added manual billing event endpoint |
| `api/app/routes/reports.py` | Use company rate for billing events |
| `api/app/services/demo_seed.py` | Use company rate |
| `web/app/(app)/app/admin/companies/page.tsx` | Billing settings UI |
| `web/app/(app)/app/admin/invoices/page.tsx` | Generate invoice + billing event dialogs |
| `docs/INVOICING_MASTER_TECH_SPEC.md` | Phase 1 documentation |

**Status:** ✅ Killed (BIG FUCKING SHARK)

---

## Summary Update

| Category | Count |
|----------|-------|
| 🔴 Critical Features | 1 |
| 🟠 Major Features | 1 |
| 🎨 UX/Design | 1 |
| 🔧 Configuration | 2 |
| 📄 Documentation | 2 |

**Total Sharks Killed (Vol 2): 7 🦈**

---

## Next Steps

1. **P1:** Billing Phase 2 - Subscription billing model
2. **P2:** Add property type validation against SiteX data
3. **P2:** Stripe integration for payments
4. **P3:** Surface lastSalePrice for pricing sanity check
5. **P3:** Add APN-only lookup as alternative entry point

---

*Last updated: January 30, 2026*
