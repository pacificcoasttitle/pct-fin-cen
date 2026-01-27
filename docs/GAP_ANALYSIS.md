# PCT FinCEN Solutions - Gap Analysis
## North Star vs Actual Implementation

> **Generated:** January 27, 2026  
> **Purpose:** Identify gaps between the North Star document and the current codebase

---

## Executive Summary

| Category | Status |
|----------|--------|
| Client Submission Flow | ❌ **Critical Gap** - Mock data, no real API |
| Submission Request API | ❌ **Critical Gap** - Routes don't exist |
| Admin Queue | ❌ **Critical Gap** - Uses mock data |
| Wizard Determination | ✅ Working |
| Party Link Generation | ✅ Working |
| Party Portal | ⚠️ **Major Gap** - Missing most FinCEN fields |
| Party Data Review | ❌ **Critical Gap** - No review screen |
| In-App Party Tracking | ✅ Working |
| Email Notifications | ✅ Working |
| Filing (Mock) | ✅ Working |

---

## Critical Gaps (Must Fix for Demo)

### 1. ❌ Client Submission Form Doesn't Hit Real API

**Location:** `web/app/(app)/app/requests/new/page.tsx`

**North Star Says:**
> Client enters property info, transaction info, buyer/seller info → [Submit Request] → Creates SubmissionRequest with status="pending"

**Actual Code (lines 55-66):**
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsSubmitting(true);

  // Simulate API call   <-- PROBLEM: Just a timeout!
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // Generate mock request ID
  const mockId = `REQ-${new Date().getFullYear()}-...`;
  setRequestId(mockId);
  setIsSuccess(true);
};
```

**Fix Required:**
- Create `POST /submission-requests` API endpoint
- Call real API instead of simulating
- Store in database

---

### 2. ❌ No Submission Request API Routes

**Location:** `api/app/routes/` - **MISSING FILE**

**North Star Says:**
```
POST   /submission-requests              → Client creates new request
GET    /submission-requests              → Client lists their requests
GET    /submission-requests/{id}         → Client views request details
```

**Actual Code:**
- Model exists: `api/app/models/submission_request.py` ✓
- **No routes file!** No API endpoints exist

**Fix Required:**
- Create `api/app/routes/submission_requests.py`
- Implement CRUD endpoints
- Register router in main app

---

### 3. ❌ Admin Queue Uses Mock Data

**Location:** `web/app/(app)/app/admin/requests/page.tsx`

**North Star Says:**
> Staff sees request in queue → Clicks "Start Wizard"

**Actual Code (line 47-71):**
```typescript
// Mock submission requests data (25 requests)
const mockSubmissionRequests: SubmissionRequest[] = [
  {
    id: "req-001",
    companyName: "Golden State Escrow",
    // ... hardcoded data
  },
  // ... 24 more hardcoded entries
];
```

**Fix Required:**
- Fetch from `GET /submission-requests` API
- Add loading states
- Add real-time refresh

---

### 4. ❌ No Party Data Review Screen

**Location:** **DOESN'T EXIST**

**North Star Says (Phase 6):**
> Staff reviews all submitted info:
> - View organized summary of all party data
> - Flag any issues or missing info
> - Request corrections if needed
> - Verify all certifications received

**Actual Code:**
- Wizard shows party status (pending/submitted)
- Admin report detail page shows basic party list
- **NO way to view the actual submitted data!**

**Fix Required:**
- Create review screen at `/app/reports/[id]/review`
- Display all party_data fields in organized format
- Add "Request Correction" functionality
- Add staff certification checkbox

---

## Major Gaps (Important for Full Flow)

### 5. ⚠️ Party Portal Missing Most FinCEN Fields

**Location:** `web/app/p/[token]/page.tsx`

**North Star Party Portal Fields:**

| Required Field | Individual | Entity | Trust | Beneficial Owner | Currently Collected |
|----------------|------------|--------|-------|------------------|---------------------|
| Full Legal Name | ✓ | ✓ | ✓ | ✓ | ✅ first_name, last_name |
| Middle Name | ✓ | | | ✓ | ❌ |
| Suffix | ✓ | | | ✓ | ❌ |
| Date of Birth | ✓ | | | ✓ | ⚠️ Partial |
| SSN/ITIN | ✓ | | | ✓ | ❌ |
| Citizenship Status | ✓ | | | ✓ | ❌ |
| ID Type (passport/state ID) | ✓ | | | ✓ | ❌ |
| ID Number | ✓ | | | ✓ | ❌ |
| ID Issuing Jurisdiction | ✓ | | | ✓ | ❌ |
| Address | ✓ | ✓ | ✓ | ✓ | ✅ Basic |
| Country | | | | | ❌ |
| Entity Legal Name | | ✓ | ✓ | | ⚠️ entity_name |
| Entity Type | | ✓ | | | ❌ |
| EIN | | ✓ | | | ⚠️ ein |
| Formation State | | ✓ | | | ❌ |
| Formation Date | | ✓ | | | ❌ |
| Trust Type | | | ✓ | | ❌ |
| Trust Date Executed | | | ✓ | | ❌ |
| Trust TIN | | | ✓ | | ❌ |
| Trustee Info | | | ✓ | | ❌ |
| Settlor Info | | | ✓ | | ❌ |
| Ownership Percentage | | | | ✓ | ❌ |
| Control Type | | | | ✓ | ❌ |
| Payment Sources | BUYER | | | | ❌ |
| Certification | ✓ | ✓ | ✓ | | ❌ |

**Current PartyFormData Interface:**
```typescript
interface PartyFormData {
  first_name: string
  last_name: string
  email: string
  phone: string
  address_line1: string
  address_line2: string
  city: string
  state: string
  zip_code: string
  date_of_birth: string
  entity_name: string
  ein: string
}
```

**Missing:** 25+ critical FinCEN fields!

**Fix Required:**
- Create dynamic form based on party type (individual/entity/trust/beneficial_owner)
- Add all required FinCEN fields
- Add beneficial owner sub-collection for entity buyers
- Add payment source collection for buyers
- Add certification section

---

### 6. ⚠️ Wizard Collects Party Data (Should NOT)

**Location:** `web/components/rrer-questionnaire.tsx`

**North Star Says:**
> Wizard stops at determination, pivots to party setup  
> Party PORTAL collects all detailed info

**Actual Code:**
The questionnaire has a full "Collection Phase" that collects:
- Seller info (detailed)
- Buyer entity/trust info
- Beneficial owners
- Signing individuals
- Payment sources
- Certifications

**Problem:** This duplicates what party portal should do!

**North Star Flow:**
1. Wizard → Determination only
2. Wizard → Party SETUP (names/emails for links)
3. Party Portal → Collect actual FinCEN data

**Current Flow:**
1. Wizard → Determination
2. Wizard → Full data collection ← WRONG
3. Party Portal → Basic data collection ← INCOMPLETE

**Fix Required:**
- Remove Collection phase from wizard OR repurpose it
- Make Collection phase = Party Setup (just names/emails)
- Party portal does the heavy lifting

---

## Working Components ✅

### Determination Flow
- Multi-step wizard with dynamic steps
- Property type, financing, buyer type checks
- Exemption checklists
- Backend determination API

### Party Link Generation
- Creates parties and secure tokens
- Sends email invitations via SendGrid
- Links have expiration

### In-App Party Tracking
- Real-time polling (15 seconds in wizard, 30 seconds in queue)
- Progress bars and badges
- Toast notifications on submission

### Email System
- SendGrid integration
- HTML email templates
- Notification outbox with delivery tracking

### Mock Filing
- Submission lifecycle with queued/accepted/rejected states
- Demo outcome control
- Receipt ID generation

---

## Data Model Comparison

### North Star SubmissionRequest vs Actual

| North Star Field | Actual Field | Status |
|------------------|--------------|--------|
| id | id | ✅ |
| company_id | company_id | ✅ |
| created_by | requested_by_user_id | ✅ |
| status | status | ✅ |
| property_address | property_address (JSONB) | ✅ |
| property_city | (inside property_address) | ✅ |
| property_state | (inside property_address) | ✅ |
| property_zip | (inside property_address) | ✅ |
| property_county | (inside property_address) | ⚠️ May be missing |
| property_type | - | ❌ Missing |
| purchase_price | purchase_price_cents | ✅ |
| closing_date | expected_closing_date | ✅ |
| escrow_number | escrow_number | ✅ |
| financing_type | financing_type | ✅ |
| buyer_name | buyer_name | ✅ |
| buyer_email | buyer_email | ✅ |
| buyer_type | buyer_type | ✅ |
| buyer_entity_name | - | ❌ Missing |
| seller_name | seller_name | ✅ |
| seller_email | seller_email | ✅ |
| seller_type | - | ❌ Missing |

### North Star PartySubmission vs Actual

| Required by North Star | Exists in party_data? |
|------------------------|----------------------|
| SSN/ITIN | ❌ |
| Citizenship | ❌ |
| ID Type/Number/Jurisdiction | ❌ |
| Entity Type | ❌ |
| Formation State/Date | ❌ |
| Trust Type/Date/TIN | ❌ |
| Ownership Percentage | ❌ |
| Control Type | ❌ |
| Payment Sources | ❌ |
| Certification | ❌ |

---

## API Endpoints Comparison

### North Star Required vs Actual

| Endpoint | Required | Exists | Notes |
|----------|----------|--------|-------|
| POST /submission-requests | ✅ | ❌ | Not implemented |
| GET /submission-requests | ✅ | ❌ | Not implemented |
| GET /submission-requests/{id} | ✅ | ❌ | Not implemented |
| GET /admin/queue | ✅ | ❌ | Not implemented |
| POST /reports | ✅ | ✅ | Working |
| GET /reports/{id} | ✅ | ✅ | Working |
| PUT /reports/{id}/wizard | ✅ | ✅ | Working |
| POST /reports/{id}/determine | ✅ | ✅ | Working |
| POST /reports/{id}/party-links | ✅ | ✅ | Working |
| GET /reports/{id}/parties | ✅ | ✅ | Working |
| POST /reports/{id}/file | ✅ | ✅ | Working |
| GET /p/{token} | ✅ | ✅ | Working |
| POST /p/{token}/submit | ✅ | ✅ | Working |

---

## Priority Fix Order (For Jan 29 Demo)

### P0 - Blockers (Must Have)
1. **Create Submission Request API** - Otherwise clients can't submit
2. **Wire Client Form to API** - Otherwise submissions go nowhere
3. **Wire Admin Queue to API** - Otherwise staff sees mock data

### P1 - Important (Should Have)
4. **Expand Party Portal Fields** - At minimum: SSN, citizenship, ID, certification
5. **Create Party Data Review Screen** - Staff needs to verify before filing

### P2 - Nice to Have
6. **Clean up Wizard Collection Phase** - Either remove or repurpose
7. **Add beneficial owner sub-form** - For entity buyers

---

## Demo Simplification (Per North Star)

For the Jan 29 demo, can simplify to:
- ✅ Single buyer (entity with 2 beneficial owners)
- ✅ Single seller (individual)
- ✅ One property, one transaction
- ✅ Mock filing (not real SDTM)

This means party portal needs at minimum:
- Individual seller form (name, DOB, SSN, address, ID, citizenship, certification)
- Entity buyer form (entity name, EIN, formation, address)
- Beneficial owner sub-forms (×2)
- Payment source (at least one)

---

## Files Requiring Changes

| File | Change Required |
|------|-----------------|
| `api/app/routes/submission_requests.py` | **CREATE** - New file with CRUD endpoints |
| `api/app/main.py` | Register submission_requests router |
| `web/app/(app)/app/requests/new/page.tsx` | Call real API instead of mock |
| `web/app/(app)/app/admin/requests/page.tsx` | Fetch from API instead of mock data |
| `web/app/p/[token]/page.tsx` | Add all required FinCEN fields |
| `web/app/(app)/app/reports/[id]/review/page.tsx` | **CREATE** - New review screen |
| `api/app/models/submission_request.py` | Add `property_type`, `buyer_entity_name`, `seller_type` |
