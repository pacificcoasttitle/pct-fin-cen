# 🦈 Killed Sharks - January 27, 2026

> A running log of all bugs, gaps, and issues we've slayed today.

---

## Summary

| Category | Count |
|----------|-------|
| 🔴 Critical Fixes | 2 |
| 🟠 Major Features | 2 |
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
| Party portal missing 25+ FinCEN fields | P1 | Pending |
| ~~No party data review screen~~ | ~~P1~~ | ✅ **FIXED** |
| Wizard collects party data (should only do determination) | P2 | Pending |
| No purchase_price in Report model | P2 | Pending |

---

## Git Commits Today

1. `docs: add gap analysis comparing North Star vs actual code`
2. `docs: add data flow verification report`
3. `feat: P0 - Create Submission Request API and wire frontend`
4. `docs: add KilledSharks.md tracking today's fixes`
5. `feat: P1 - Create party data review screen with wizard navigation`
6. `fix: add email-validator dependency for Pydantic EmailStr`

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

---

## Next Steps

1. **P1:** Expand party portal with required FinCEN fields (SSN, citizenship, ID, etc.)
2. ~~**P1:** Create party data review screen for staff~~ ✅ DONE
3. **P2:** Refactor wizard collection phase

---

*Last updated: January 27, 2026 @ end of session*
