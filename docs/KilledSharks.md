# 🦈 Killed Sharks - January 27, 2026

> A running log of all bugs, gaps, and issues we've slayed today.

---

## Summary

| Category | Count |
|----------|-------|
| 🔴 Critical Fixes | 7 |
| 🟠 Major Features | 6 |
| 🎨 UX/Design | 1 |
| 📄 Documentation | 3 |

---

## 🔴 Critical Fixes

### 1. Submission Request API - CREATED ✅

**Problem:** The `SubmissionRequest` model existed in the database but had **NO API ROUTES**. Client form was using `setTimeout` mock data.

**Impact:** 
- Client submissions went nowhere
- Admin queue showed hardcoded data
- "Start Wizard" button didn't work

**Solution:** Created `api/app/routes/submission_requests.py` with full CRUD:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/submission-requests` | POST | Create new client submission |
| `/submission-requests` | GET | List all (with status filter) |
| `/submission-requests/{id}` | GET | Get single submission |
| `/submission-requests/{id}/status` | PATCH | Update status |
| `/submission-requests/{id}/create-report` | POST | Create Report → Wizard |

**Files Changed:**
- `api/app/routes/submission_requests.py` (NEW - 260 lines)
- `api/app/routes/__init__.py` (added export)
- `api/app/main.py` (registered router)

---

### 2. Frontend API Wiring ✅

**Problem:** Both the client form and admin queue were using mock data.

**Client Form (`web/app/(app)/app/requests/new/page.tsx`):**
- Before: `setTimeout` delay, fake request ID
- After: Real `POST /submission-requests` call, real ID returned

**Admin Queue (`web/app/(app)/app/admin/requests/page.tsx`):**
- Before: 600+ lines of hardcoded mock data (25 fake requests)
- After: Real `GET /submission-requests` with auto-refresh every 30s

**Start Wizard Button:**
- Before: Navigated to non-existent report ID → 422 error
- After: Calls `/create-report` endpoint → Creates real Report → Redirects to wizard

**Files Changed:**
- `web/app/(app)/app/requests/new/page.tsx` (added API integration)
- `web/app/(app)/app/admin/requests/page.tsx` (removed 600+ lines mock, added real fetch)
- `web/components/admin/request-detail-sheet.tsx` (added loading state)

---

## 🟠 Major Features

### 3. Report Creation from Submission ✅

**What it does:** When staff clicks "Start Wizard" on a pending submission:

1. API creates a new `Report` linked to the submission
2. Pre-fills `wizard_data.collection` with:
   - `purchasePrice` (from submission)
   - `escrowNumber`
   - `financingType`
   - `closingDate`
   - `propertyAddress`
   - `initialParties.buyers` (name, email, type)
   - `initialParties.sellers` (name, email)
3. Sets submission status to `in_progress`
4. Returns redirect URL to wizard

**Data Flow:**
```
Client submits form
    ↓
POST /submission-requests
    ↓
Admin sees in queue (real-time)
    ↓
Admin clicks "Start Wizard"
    ↓
POST /submission-requests/{id}/create-report
    ↓
Report created with pre-filled data
    ↓
Redirect to /app/reports/{id}/wizard
```

---

### 4. Party Data Review Screen ✅ (P1)

**Problem:** PCT Staff had NO WAY to see what parties actually submitted. They were flying blind before filing to FinCEN.

**Solution:** Created `web/app/(app)/app/reports/[id]/review/page.tsx` - a comprehensive review screen.

**Features:**
- Summary card showing total/submitted/pending party counts
- Collapsible party cards for individuals and entities
- Separate sections for Sellers, Buyers, and Beneficial Owners
- SSN/sensitive data masking (`•••-••-1234`)
- Shows all collected fields:
  - Personal info (name, DOB, SSN, citizenship)
  - Identification (ID type, number, jurisdiction)
  - Address (street, city, state, zip, country)
  - Entity details (legal name, EIN, formation)
  - Beneficial owners (if entity)
  - Payment sources (if buyer)
  - Certification status
- Staff certification checkbox before proceeding
- "Proceed to File" button disabled until all parties submitted + certified

**Navigation Integration:**
- Added "Review All Submissions" button to wizard (appears when all parties complete)
- Button has green gradient styling to stand out

**Files Created/Changed:**
- `web/app/(app)/app/reports/[id]/review/page.tsx` (NEW - 600+ lines)
- `web/app/(app)/app/reports/[id]/wizard/page.tsx` (added review button + FileCheck icon)

---

### 5. Enhanced Party Portal with Full FinCEN Fields ✅ (P1)

**Problem:** Party portal had basic/generic fields. It was missing 25+ required FinCEN fields for proper compliance reporting.

**Solution:** Complete rewrite of party portal with dynamic forms based on party role + type.

**New Component Structure:**
```
web/components/party-portal/
├── types.ts              - TypeScript types + constants (US states, entity types, etc.)
├── AddressFields.tsx     - Reusable address input component
├── CertificationSection.tsx - Digital signature + certification
├── BeneficialOwnerCard.tsx  - Collapsible BO card with all fields
├── PaymentSourceCard.tsx    - Payment info with validation
├── SellerIndividualForm.tsx - Full seller individual form
├── BuyerEntityForm.tsx      - Complex buyer entity form with BOs
└── index.tsx             - DynamicPartyForm selector + generic fallbacks
```

**Forms by Party Type:**

| Role | Type | Form | Key Fields |
|------|------|------|------------|
| Seller | Individual | SellerIndividualForm | Name, DOB, SSN, citizenship, address, ID |
| Seller | Entity | GenericEntityForm | Legal name, EIN, formation, rep info |
| Seller | Trust | GenericTrustForm | Trust name, type, date, trustee info |
| Buyer | Individual | GenericIndividualForm | Name, DOB, citizenship, address |
| Buyer | Entity | **BuyerEntityForm** | Entity + **Beneficial Owners** + **Payment Sources** |
| Buyer | Trust | GenericTrustForm | Trust + trustee + settlor + beneficiary info |

**BuyerEntityForm Features (most complex):**
- Section 1: Entity Information (name, type, EIN, formation, address)
- Section 2: Beneficial Owners (dynamic cards, add/remove)
  - Each BO: name, DOB, SSN, address, citizenship, ID, ownership %
  - Control type checkboxes (senior officer, authority, other)
- Section 3: Signing Individual (with "same as BO" auto-fill)
- Section 4: Payment Information
  - Multiple payment sources with amounts
  - Source types (personal, business, gift, loan, etc.)
  - Payment methods (wire, check, etc.)
  - Third party payer handling
  - **Running total validation** against purchase price

**UI/UX Improvements:**
- Progress bar based on actual required fields per type
- Sticky action bar (save + submit always visible)
- Context card showing property + role + closing date
- "Why is this needed?" info box
- Secure/encrypted messaging
- Modern gradient styling
- Collapsible sections for complex forms

**Files Created:**
- `web/components/party-portal/types.ts` (200+ lines)
- `web/components/party-portal/AddressFields.tsx` (100+ lines)
- `web/components/party-portal/CertificationSection.tsx` (120+ lines)
- `web/components/party-portal/BeneficialOwnerCard.tsx` (330+ lines)
- `web/components/party-portal/PaymentSourceCard.tsx` (220+ lines)
- `web/components/party-portal/SellerIndividualForm.tsx` (230+ lines)
- `web/components/party-portal/BuyerEntityForm.tsx` (400+ lines)
- `web/components/party-portal/index.tsx` (500+ lines)
- `web/app/p/[token]/page.tsx` (rewritten - 350+ lines)

**Total New Code:** ~2,400+ lines

---

### 6. Wizard Flow Restructure ✅ (P2)

**Problem:** The wizard was collecting ALL party data (seller info, buyer info, beneficial owners, payment) directly. This is WRONG - parties should fill out their OWN information via the secure party portal.

**Solution:** Restructured Phase 2 (Collection) with new steps:

**OLD Collection Steps (REMOVED):**
```
transaction-property → seller-info → buyer-info → signing-individuals → 
payment-info → reporting-person → certifications
```

**NEW Collection Steps:**
```
transaction-property → party-setup → monitor-progress → review-submissions → 
reporting-person → file-report
```

**New Step Details:**

| Step | Purpose | Key Features |
|------|---------|--------------|
| `transaction-property` | KEPT - PCT enters closing date, price, property | Unchanged |
| `party-setup` | NEW - Add parties (name, email, type) | Sellers + Buyers sections, email previews |
| `monitor-progress` | NEW - Track party submissions | Auto-refresh status, waiting message |
| `review-submissions` | NEW - View party-submitted data | Links to full review page, staff certification |
| `reporting-person` | KEPT - PCT internal info | Unchanged |
| `file-report` | NEW - Final certification and file | Pre-filing check, final certification, submit button |

**What Changed:**
1. `CollectionStepId` type updated in `web/lib/rrer-types.ts`
2. `collectionSteps` array updated in `web/components/rrer-questionnaire.tsx`
3. Added new state: `partySetup`, `reviewCertified`, `fileCertified`, `readyCheckResult`, `filingResult`
4. Added new step UI components for all 4 new steps
5. Old collection step UIs kept (commented as deprecated) for data compatibility
6. Updated section completion status display

**party-setup Step Features:**
- Add/remove multiple sellers and buyers
- Capture name, email, and type for each party
- Entity/trust type shows info box about what will be collected
- Email preview card showing property address
- Warning alert: "Links will be sent immediately"

**file-report Step Features:**
- Filing summary (property, price, closing date, determination)
- Pre-filing check button with pass/fail display
- Final certification checkbox with detailed terms
- "Submit to FinCEN" button (disabled until ready + certified)
- Success state shows receipt ID

**Files Changed:**
- `web/lib/rrer-types.ts` (updated CollectionStepId)
- `web/components/rrer-questionnaire.tsx` (~300 lines added for new steps)

**Flow Now Correct:**
```
PCT Staff → Determination → Party Setup → Send Links
                               ↓
Parties → Fill own info via portal → Submit
                               ↓
PCT Staff → Monitor → Review → File
```

---

### 7. Wizard Step API Wiring ✅ (Final Gap Closure)

**Problem:** The new wizard collection steps (party-setup, monitor-progress, file-report) had complete UI but were NOT connected to backend APIs. Buttons did nothing - they were just mockups.

**Impact:**
- "Send Links" button didn't actually send links
- Party status wasn't being displayed/polled
- "Submit to FinCEN" button didn't file

**Solution:** Wired all new wizard steps to existing API functions via prop callbacks.

| Step | Button | API Called | Status |
|------|--------|------------|--------|
| party-setup | "Send Links & Continue" | `createPartyLinks()` | ✅ Wired |
| monitor-progress | Auto-poll + display | `getReportParties()` | ✅ Wired |
| file-report | "Run Pre-Filing Check" | `readyCheck()` | ✅ Wired |
| file-report | "Submit to FinCEN" | `fileReport()` | ✅ Wired |

**Implementation Details:**

1. **Updated RRERQuestionnaire Props:**
   - Added `reportId`, `partyStatus`, `onRefreshPartyStatus`
   - Added `onSendPartyLinks`, `onReadyCheck`, `onFileReport` callbacks
   - These allow the wizard page to handle actual API calls

2. **party-setup Step:**
   - Validates parties have name + email
   - Calls `onSendPartyLinks` with transformed party data
   - Shows loading spinner during API call
   - Shows success toast with party count
   - Auto-advances to monitor-progress on success

3. **monitor-progress Step:**
   - Displays real party status from `partyStatus` prop
   - Shows progress bar with X of Y submitted
   - Shows individual party cards with status badges
   - Shows "Copy Link" and "Open" buttons for pending parties
   - "Continue" button disabled until all parties submitted
   - Auto-refresh indicator showing 15-second polling

4. **file-report Step:**
   - "Run Pre-Filing Check" calls `onReadyCheck`
   - Shows pass/fail result with error details
   - Final certification checkbox required
   - "Submit to FinCEN" calls `onFileReport`
   - Shows success state with receipt ID
   - Shows "Back to Reports Dashboard" button after success

**Files Changed:**
- `web/components/rrer-questionnaire.tsx` 
  - Added props interface with API callbacks
  - Added handler functions for all 3 steps
  - Added loading states and toast notifications
  - Updated step UIs to use real data/handlers
- `web/app/(app)/app/reports/[id]/wizard/page.tsx`
  - Passes all new props to questionnaire
  - Implements API callback handlers

**End-to-End Flow Now Works:**
```
Client Submit → Admin Queue → Start Wizard → Determination →
Party Setup → SEND LINKS (API) → Monitor Progress (polling) →
Review Submissions → File Report → SUBMIT TO FINCEN (API) → Success!
```

---

### 8. Demo Mode Polish & Seed Data ✅

**Problem:** 
1. No clear indication that filing is in demo mode (could confuse sales team)
2. Empty database makes demo awkward - no visual examples to show

**Solution:**

**Demo Mode Filing Indicator:**
- Added "🎭 Demo Mode Active" banner in file-report step
- Conditional display via `NEXT_PUBLIC_DEMO_MODE=true` env var
- Filing endpoint already returns `is_demo: true` in response

**Demo Seed Data:**
Enhanced `seed_demo_submission_requests()` function to create comprehensive test data:

| Scenario | Status | Purpose |
|----------|--------|---------|
| Request 1 | `pending` | Show client submission in queue |
| Request 2 | `pending` | Show volume (high-value property) |
| Request 3 | `in_progress` | Show wizard can be resumed |
| Report 1-3 | `exempt` | Various exemption scenarios |
| Report 4 | `awaiting_parties` | Show party monitoring |
| Report 5 | `awaiting_parties` | Partial party submissions (1/2) |
| Report 6 | `ready_to_file` | All parties done, ready to file |

**Files Changed:**
- `web/components/rrer-questionnaire.tsx` (demo mode banner)
- `api/app/services/demo_seed.py` (added `seed_demo_submission_requests`)
- `api/app/routes/demo.py` (updated reset to seed requests)

**Test:** 
- Call `POST /demo/reset` with X-DEMO-SECRET header
- Admin queue shows 2 pending + 1 in-progress requests
- Reports list shows reports at various stages
- Filing shows "Demo Mode" when NEXT_PUBLIC_DEMO_MODE=true

**Demo Walkthrough Now Supports:**
1. ✅ Show client submission flow
2. ✅ Show admin queue with pending items
3. ✅ Resume partial wizard
4. ✅ Show party monitoring (pending vs submitted)
5. ✅ Show review screen with real data
6. ✅ File and see receipt ID (with demo indicator)
7. ✅ Show filing history

---

## 📄 Documentation Created

### 4. Gap Analysis (`docs/GAP_ANALYSIS.md`) ✅

Comprehensive comparison of `NORTH_STAR.md` vs actual codebase:

- **Critical gaps identified:** 4
- **Major gaps identified:** 2
- **Working components documented:** 5
- **Priority fix order for Jan 29 demo**

### 5. Data Flow Verification (`docs/DATA_FLOW_VERIFICATION.md`) ✅

Answered key questions:
- Does `POST /reports` accept initial party info? → **NO (gap)**
- Does `GET /party/{token}` return property address? → **YES ✅**
- Does wizard pre-fill from Report fields? → **NO (gap)**
- Does party portal show property/role? → **YES ✅**

### 6. Wizard Technical Documentation (`docs/WIZARD_TECHNICAL_DOCUMENTATION.md`) ✅

1000+ lines of detailed documentation covering:
- Wizard flow and phases
- Data models and state
- API integration
- Autosave implementation
- Party collection
- Filing lifecycle
- Component architecture

---

## Remaining Gaps (Not Fixed Yet)

These were identified but not yet addressed:

| Gap | Priority | Status |
|-----|----------|--------|
| ~~Party portal missing 25+ FinCEN fields~~ | ~~P1~~ | ✅ **FIXED** |
| ~~No party data review screen~~ | ~~P1~~ | ✅ **FIXED** |
| ~~Wizard collects party data (should only do determination)~~ | ~~P2~~ | ✅ **FIXED** |
| ~~Wizard steps not calling APIs~~ | ~~P0~~ | ✅ **FIXED** |
| No purchase_price in Report model | P3 | Deferred (using wizard_data) |

---

### 9. Client Form Testing Fixes ✅

**Issues Found During Testing:**
1. **CORS Error (Blocker):** API blocked requests from Vercel frontend domain
2. **Wizard UX:** Form showed all sections at once (defeats wizard pattern)
3. **Layout:** Form was left-aligned instead of centered

**Solutions:**

**CORS Fix:**
- Updated `api/app/config.py` to include Vercel domains in default CORS origins
- Added `allow_origin_regex=r"https://.*\.vercel\.app"` to allow all Vercel deployments
- No more 403 errors from Vercel frontend!

**Wizard UX - Step-by-Step:**
- Converted scrollable form to true 4-step wizard
- One section visible at a time with Back/Continue buttons
- Validation per step (can't proceed until required fields filled)
- Progress bar shows current position

| Step | Fields |
|------|--------|
| 1. Property | Escrow #, Street, City, State, ZIP |
| 2. Transaction | Closing Date, Purchase Price, Financing Type |
| 3. Buyer | Name, Type (Individual/Entity/Trust), Email, Phone |
| 4. Seller | Name, Email (optional), Notes (optional) |

**Layout Fix:**
- Changed from `max-w-4xl` to `max-w-2xl mx-auto`
- Form now centered in content area
- Better readability and professional appearance

**Files Changed:**
- `api/app/config.py` (CORS default origins)
- `api/app/main.py` (allow_origin_regex)
- `web/app/(app)/app/requests/new/page.tsx` (complete rewrite to step wizard)

**Test:**
- Submit form from Vercel deployment → No CORS error
- Navigate through each step with Back/Continue
- Submit on final step → Success overlay with request ID

**Status:** ✅ Killed

---

### 10. Fix 422 Payload & Input Formatting ✅

**Issues:**
1. Potential 422 errors from payload mismatches
2. No input formatting for phone numbers, currency, ZIP codes

**Solutions:**

**Payload Improvements:**
- Added debug logging (`console.log`) to see exact payload being sent
- Better error message formatting for validation errors (shows field names)
- Trim whitespace from all text fields
- Ensure lowercase for email, financing_type, buyer_type
- Handle ZIP code formatting (strip dashes for API)

**Input Formatting/Masking:**

| Field | Format | Example |
|-------|--------|---------|
| Phone Numbers | `(XXX) XXX-XXXX` | (555) 123-4567 |
| Purchase Price | `X,XXX,XXX` | 1,500,000 |
| ZIP Code | `XXXXX` or `XXXXX-XXXX` | 90210 or 90210-1234 |

**Implementation:**
- `formatPhoneNumber()` - Auto-formats as user types
- `formatCurrency()` - Adds commas for readability
- `formatZipCode()` - Handles 5 or 9 digit formats
- `parseCurrency()` - Strips formatting for API submission

**Files Changed:**
- `web/app/(app)/app/requests/new/page.tsx` (formatting utilities + improved payload)

**Test:**
- Type phone → auto-formats to (555) 123-4567
- Type price → auto-formats with commas
- Submit form → check console for payload debug
- API returns 201 Created

**Status:** ✅ Killed

---

### 11. 500 Error - company_id NOT NULL + Vercel Analytics 404 ✅

**Console Errors:**
```
POST https://pct-fin-cen-staging.onrender.com/submission-requests 500 (Internal Server Error)
GET https://pct-fin-cen-6wx3.vercel.app/_vercel/insights/script.js 404 (Not Found)
```

**Root Causes:**

1. **500 Internal Server Error:**
   - `SubmissionRequest.company_id` is `NOT NULL` in the database
   - API route was setting `company_id=None` causing constraint violation
   - The CORS error was a side effect (error responses don't have CORS headers)

2. **Vercel Analytics 404:**
   - `@vercel/analytics` package is installed but Vercel Analytics not enabled in dashboard
   - Script at `/_vercel/insights/script.js` doesn't exist

**Fixes:**

**500 Error Fix:**
```python
# Before: company_id=None  ← Violates NOT NULL constraint

# After: Get or create demo company
demo_company = db.query(Company).filter(Company.code == "DEMO").first()
if not demo_company:
    demo_company = Company(name="Demo Company", code="DEMO", ...)
    db.add(demo_company)
    db.flush()
submission = SubmissionRequest(company_id=demo_company.id, ...)
```

**Analytics 404 Fix:**
- Commented out Analytics component in `web/app/layout.tsx`
- Can re-enable after setting up Vercel Analytics in dashboard

**Files Changed:**
- `api/app/routes/submission_requests.py` (use demo company_id)
- `web/app/layout.tsx` (disable Analytics component)

**Test:** Submit form → No more 500 error, request created successfully

**Status:** ✅ Killed

---

### 12. Proactive Landmine Check - company_id Propagation ✅

**Issue Found During Trace Checklist:**
When creating a Report from a SubmissionRequest via `/create-report`, the `company_id` wasn't being propagated.

**Risk:**
- Data lineage broken: Submission has company_id, but Report was getting NULL
- Not a crash (Report.company_id is nullable) but bad for multi-tenant data integrity

**Verification of Other Models:**

| Model | Field | Constraint | Risk |
|-------|-------|------------|------|
| Report | `company_id` | `nullable=True` | ✅ Safe (but should propagate) |
| Report | `created_by_user_id` | `nullable=True` | ✅ Safe |
| ReportParty | `report_id` | `NOT NULL` (FK) | ✅ Set on creation |
| ReportParty | `party_role` | `NOT NULL` | ✅ Required param |
| ReportParty | `entity_type` | `NOT NULL` | ✅ Required param |
| PartyLink | `report_party_id` | `NOT NULL` (FK) | ✅ Set on creation |
| PartyLink | `token` | `NOT NULL` | ✅ Auto-generated |
| PartyLink | `expires_at` | `NOT NULL` | ✅ Set on creation |

**Fix:**
```python
# In create_report_from_submission()
report = Report(
    submission_request_id=submission.id,
    company_id=submission.company_id,  # ← Added this line
    ...
)
```

**Files Changed:**
- `api/app/routes/submission_requests.py`

**Status:** ✅ Killed (proactive prevention)

---

### 13. Complete Client Request Visibility ✅

**Problem Found During Testing:** Client submits a request, sees success message, but then has NO way to:
- View their submitted requests
- Check status of requests
- Track progress through the workflow

**Impact:** Clients submit into a black hole. Unprofessional for a compliance platform.

**Solution - Complete Client Experience:**

**1. Client Requests Dashboard (`/app/requests`)**
- Table view of all client submissions
- Stats cards (total, pending, in progress, completed)
- Status badges with icons and colors
- Click rows to view details
- Auto-refresh every 60 seconds
- Empty state with CTA
- Status legend/help section

**2. Request Detail Page (`/app/requests/[id]`)**
- Full submission details in card layout
- Visual status indicator with colors
- Property details, transaction info, buyer/seller cards
- Filing receipt display (when completed)
- "What happens next?" timeline showing progress
- Professional, polished UI

**3. API Endpoint (`GET /submission-requests/my-requests`)**
- Returns requests for current user's company
- Sorted by most recent first
- Ready for auth integration (uses demo company for now)

**4. Enhanced Success Page**
- Larger, more visible confirmation
- Clear request ID display (truncated for readability)
- "What happens next" explanation with checkmarks
- Links to dashboard
- Option to submit another

**5. Proactive Bug Prevention**
- Error boundary (`error.tsx`) for graceful failures
- Loading states (`loading.tsx`) for both pages
- Safe date/price formatting utilities in `web/lib/utils.ts`

**Files Created:**
- `web/app/(app)/app/requests/page.tsx` (complete rewrite - client dashboard)
- `web/app/(app)/app/requests/[id]/page.tsx` (detail view)
- `web/app/(app)/app/requests/[id]/loading.tsx` (loading state)
- `web/app/(app)/app/requests/error.tsx` (error boundary)
- `web/app/(app)/app/requests/loading.tsx` (loading state)

**Files Modified:**
- `api/app/routes/submission_requests.py` (added `/my-requests` endpoint)
- `web/app/(app)/app/requests/new/page.tsx` (enhanced success page)
- `web/lib/utils.ts` (added safe formatting utilities)

**Test:**
1. Submit a new request → See enhanced success page
2. Click "View My Requests" → See dashboard with submission
3. Click on request → See full details with timeline
4. Submit another → Both appear in dashboard

**Status:** ✅ Killed

---

### 14. Landing Page Color Scheme Glow-Up ✅

**Problem:** Landing page used Navy + Gold color scheme, while the app dashboards evolved to Navy + Teal with modern "bubbly tech" aesthetic. Visual disconnect between marketing and product.

**Impact:** 
- Brand inconsistency
- Marketing didn't match the premium feel of the app
- Demo flow felt disjointed landing → app

**Solution:** Complete color refresh of all landing page components to match app design system:

| Element | Before (Gold) | After (Teal) |
|---------|---------------|--------------|
| Primary Accent | `#C9A227` | `#0D9488` (teal-500) |
| CTA Buttons | Gold gradient | Teal gradient with shadows |
| Hover States | Gold accents | Teal-400 accents |
| Countdown Timer | Gold numbers | Teal-400 numbers |
| Popular Badge | Gold badge | Teal-to-emerald gradient |
| Footer Logo | Gold shield | Teal gradient shield |

**Components Updated:**
- `hero-section.tsx` - Badge, CTAs, floating clock icon
- `header.tsx` - Navbar CTA buttons (desktop + mobile)
- `countdown-section.tsx` - Timer blocks, background gradient
- `pricing-section.tsx` - Popular badge, CTA buttons, borders
- `cta-section.tsx` - Background gradient, orbs, buttons
- `footer.tsx` - Logo, social hovers, link hovers
- `comparison-section.tsx` - CTA button
- `mobile-cta-bar.tsx` - Sticky mobile CTA

**Additional Improvements:**
- Added floating orb effects for depth
- Added animated ping indicator on regulation badge
- Improved shadow system (`shadow-teal-500/25`)
- Better gradient transitions on hover
- Consistent slate-900 dark backgrounds

**Visual Result:**
Landing (Teal) → Login (Teal) → Dashboard (Teal) = **ONE Premium Brand**

**Status:** ✅ Killed

---

## Git Commits Today

1. `docs: add gap analysis comparing North Star vs actual code`
2. `docs: add data flow verification report`
3. `feat: P0 - Create Submission Request API and wire frontend`
4. `docs: add KilledSharks.md tracking today's fixes`
5. `feat: P1 - Create party data review screen with wizard navigation`
6. `fix: add email-validator dependency for Pydantic EmailStr`
7. `feat: P1 - Enhanced party portal with full FinCEN fields`
8. `feat: P2 - Restructure wizard collection phase with new flow`
9. `feat: Wire wizard steps to backend APIs (final gap closure)`
10. `feat: Demo mode polish and comprehensive seed data`
11. `fix: CORS and client form wizard UX improvements`
12. `fix: 422 payload fix and input formatting/masking`
13. `fix: 500 error - company_id NOT NULL constraint + Vercel Analytics 404`
14. `fix: propagate company_id from submission to report`
15. `feat: complete client request visibility and tracking`
16. `feat: landing page color glow-up - gold to teal`

---

## Testing Checklist

- [x] API starts without errors
- [x] `POST /submission-requests` creates record
- [x] `GET /submission-requests` returns list
- [x] Client form submits successfully
- [x] Admin queue loads real data
- [x] "Start Wizard" creates report and navigates
- [x] Frontend builds successfully
- [x] Review page loads party data
- [x] Individual party cards render correctly
- [x] Entity party cards render with BO sections
- [x] Sensitive data is masked
- [x] Certification checkbox works
- [x] Navigation from wizard to review works
- [x] Party portal dynamic forms render by role/type
- [x] Seller Individual form shows all required fields
- [x] Buyer Entity form shows BO + payment sections
- [x] BeneficialOwnerCard add/remove works
- [x] PaymentSourceCard with amount validation
- [x] Certification section with digital signature
- [x] Wizard collection steps updated (6 new steps)
- [x] party-setup step add/remove parties works
- [x] monitor-progress step displays
- [x] review-submissions step with certification
- [x] file-report step with pre-check and submit
- [x] party-setup "Send Links" calls createPartyLinks API
- [x] monitor-progress shows real-time party status from API
- [x] file-report "Run Pre-Filing Check" calls readyCheck API
- [x] file-report "Submit to FinCEN" calls fileReport API
- [x] Loading states on all async actions
- [x] Error handling with toast notifications
- [x] End-to-end flow complete
- [ ] Client requests dashboard shows real data from API
- [ ] Client request detail page loads submission info
- [ ] "What happens next" timeline displays correctly
- [ ] Success page shows enhanced UI with next steps
- [ ] Error boundary catches failures gracefully
- [ ] Loading states appear during fetch
- [ ] Landing page hero uses teal accents (no gold)
- [ ] All CTA buttons use teal gradient
- [ ] Countdown timer numbers are teal
- [ ] Pricing "popular" badge is teal gradient
- [ ] Footer links hover to teal

---

## Next Steps

1. ~~**P1:** Expand party portal with required FinCEN fields~~ ✅ DONE
2. ~~**P1:** Create party data review screen for staff~~ ✅ DONE
3. ~~**P2:** Refactor wizard collection phase~~ ✅ DONE
4. ~~**P0:** Wire wizard steps to backend APIs~~ ✅ DONE
5. **P2:** Add Trust buyer form with trustees/settlors/beneficiaries
6. **P3:** Add more comprehensive form validation

---

*Last updated: January 27, 2026 @ end of session*
