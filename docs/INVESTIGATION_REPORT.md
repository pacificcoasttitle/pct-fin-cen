# Demo Data Investigation Report

**Generated:** January 28, 2026  
**Purpose:** Understand current state before making fixes

---

## 1. Data Models & Relationships

### SubmissionRequest Model

- **File:** `api/app/models/submission_request.py`
- **Key Fields:**
  - `id` (UUID, primary key)
  - `company_id` (UUID, FK to companies - **NOT NULL**)
  - `requested_by_user_id` (UUID, FK to users - nullable)
  - `status` (String) - `pending`, `assigned`, `in_progress`, `completed`, `cancelled`
  - `property_address` (JSONB) - `{street, city, state, zip, county}`
  - `purchase_price_cents` (BigInteger)
  - `buyer_name`, `buyer_email`, `buyer_type`
  - `seller_name`, `seller_email`
  - `escrow_number`, `expected_closing_date`
  - `financing_type` - `cash`, `financed`, `partial_cash`
  - `report_id` (UUID, FK to reports - nullable) ← Link to Report
  - `assigned_to_user_id` (UUID, FK to users - nullable)

### Report Model

- **File:** `api/app/models/report.py`
- **Key Fields:**
  - `id` (UUID, primary key)
  - `status` (String) - `draft`, `determination_complete`, `collecting`, `ready_to_file`, `filed`, `exempt`
  - `property_address_text` (Text)
  - `closing_date`, `filing_deadline` (Date)
  - `wizard_step` (Integer)
  - `wizard_data` (JSONB)
  - `determination` (JSONB)
  - `filing_status` (String) - `filed_mock`, `filed_live`, `failed`
  - `receipt_id` (String)
  - `company_id` (UUID, FK - **nullable**)
  - `submission_request_id` (UUID, FK - nullable) ← Back-reference
  - `created_by_user_id` (UUID, FK - nullable)

### Link Mechanism

- **One SubmissionRequest → One Report** (1:1)
- SubmissionRequest has `report_id` FK pointing to Report
- Report has `submission_request_id` FK pointing back to SubmissionRequest
- Link is created when staff clicks "Start Wizard" → creates Report → links via both FKs
- Created in `POST /submission-requests/{id}/create-report` endpoint

---

## 2. Current Seed Data

### Location & Functions

- **File:** `api/app/services/demo_seed.py`
- **Key Functions:**
  - `reset_demo_data(db)` - Deletes all demo data in FK order
  - `seed_pct_company(db)` - Creates "Pacific Coast Title Company" (code: "PCT")
  - `seed_demo_users(db)` - Creates admin@pctfincen.com, staff@pctfincen.com
  - `seed_demo_client_company(db)` - Creates "Demo Title & Escrow" (code: "DEMO")
  - `seed_demo_submission_requests(db)` - Creates 3 requests
  - `seed_demo_reports(db)` - Creates 6 reports

### What Seed Data Creates

| Entity | Count | Details |
|--------|-------|---------|
| Companies | 2 | PCT (internal), DEMO (client) |
| Users | 4 | 2 PCT staff + 2 demo client users |
| SubmissionRequests | 3 | 2 pending, 1 in_progress |
| Reports | 6 | 3 exempt, 3 reportable at various stages |
| ReportParties | ~6 | Attached to reportable reports |
| PartyLinks | ~3 | For parties needing submission |

### Seed Data Gaps

- ⚠️ **SubmissionRequests are NOT linked to Reports** - They're created independently
- ⚠️ **No "completed" SubmissionRequest** - Only pending/in_progress
- ⚠️ **No filed Reports** - Only ready_to_file, no actually filed ones
- ⚠️ **company_id not set on Reports** - Reports seeded without company context

### When Seed Data is Called

- Triggered by `POST /demo/reset` endpoint
- Requires `ENVIRONMENT=staging` + `X-DEMO-SECRET` header
- Not called on app startup
- Must be manually triggered via Demo Tools page or API

---

## 3. Dashboard Data Sources

### Client Dashboard (`/app/dashboard`)

| Aspect | Status |
|--------|--------|
| **API Endpoint** | ❌ None - uses hardcoded stats |
| **Stats Cards** | Hardcoded: 3 pending, 2 in-progress, 8 completed, 45 total |
| **Recent Activity** | Hardcoded mock data |
| **Issue** | 🔴 No real data connection |

### Staff Queue (`/app/staff/queue`)

| Aspect | Status |
|--------|--------|
| **API Endpoint** | ✅ `GET /reports/queue/with-parties?status=collecting` |
| **Stats Cards** | Calculated from fetched reports |
| **Table** | Real reports with party progress |
| **Issue** | 🟢 Working with real API data |

### Admin Overview (`/app/admin/overview`)

| Aspect | Status |
|--------|--------|
| **API Endpoints** | ✅ `getAdminStats()`, `getAdminFilings()`, `getAdminActivity()` |
| **Stats Cards** | From API |
| **Recent Filings** | From API |
| **Activity Feed** | From API |
| **Issue** | 🟡 API exists but may return empty/mock data |

### Executive Dashboard (`/app/executive`)

| Aspect | Status |
|--------|--------|
| **API Endpoint** | ❌ None - uses hardcoded KPIs |
| **Revenue Section** | Hardcoded: $28,500 MTD, $52,000 projected |
| **Operations Section** | Hardcoded: 47 filings, 98.2% acceptance |
| **Issue** | 🔴 No real data connection |

### Client Requests (`/app/requests`)

| Aspect | Status |
|--------|--------|
| **API Endpoint** | ✅ `GET /submission-requests/my-requests` |
| **Stats Cards** | Calculated from fetched data |
| **Table** | Real submission requests |
| **Issue** | 🟢 Working with real API data |

---

## 4. Invoice & PDF Features

### Invoice Page (`/app/invoices`)

| Feature | Status | Notes |
|---------|--------|-------|
| **Invoice List** | 🟡 Mock data | Uses hardcoded `mockInvoices` array |
| **Invoice Detail** | 🟡 Mock data | `InvoiceDetailSheet` uses mock line items |
| **View Button** | 🟡 UI only | Opens sheet with mock data |
| **Download PDF** | ❌ Disabled | Shows "Coming soon" tooltip |
| **Send Invoice** | ❌ Disabled | Shows "Coming soon" tooltip |
| **Mark as Paid** | ❌ Disabled | Shows "Coming soon" tooltip |
| **Void Invoice** | ❌ Disabled | Shows "Coming soon" tooltip |

### PDF Generation

| Aspect | Status |
|--------|--------|
| **Library Installed** | ❌ No PDF library in dependencies |
| **Invoice PDF** | ❌ Not implemented |
| **Filing Receipt PDF** | ❌ Not implemented |
| **Report Summary PDF** | ❌ Not implemented |

### Invoice API Endpoints

| Endpoint | Status |
|----------|--------|
| `GET /invoices` | ❓ Unknown - need to check |
| `POST /invoices` | ❓ Unknown |
| `GET /invoices/{id}` | ❓ Unknown |

---

## 5. Role-Based Views

### Defined Roles

```typescript
// web/lib/navigation.ts
type UserRole = "coo" | "pct_admin" | "pct_staff" | "client_admin" | "client_user"
```

### Role Access Matrix

| Page | COO | PCT Admin | PCT Staff | Client Admin | Client User |
|------|-----|-----------|-----------|--------------|-------------|
| `/app/executive` | ✅ HOME | ❌ | ❌ | ❌ | ❌ |
| `/app/admin/overview` | ✅ | ✅ HOME | ❌ | ❌ | ❌ |
| `/app/admin/requests` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `/app/admin/companies` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `/app/admin/billing` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `/app/admin/users` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `/app/staff/queue` | ✅ | ❌ | ✅ HOME | ❌ | ❌ |
| `/app/dashboard` | ✅ | ❌ | ❌ | ✅ HOME | ✅ HOME |
| `/app/requests` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/app/invoices` | ✅ | ❌ | ❌ | ✅ | ❌ |
| `/app/settings/team` | ✅ | ✅ | ❌ | ✅ | ❌ |
| `*/wizard` routes | ✅ | ✅ | ✅ | ❌ | ❌ |

### Access Control Implementation

- **Middleware:** `web/middleware.ts`
- **Method:** Cookie-based session (`pct_demo_session`)
- **Session Format:** Base64-encoded JSON with user data including `role`

---

## 6. Current Gaps Summary

### 🔴 Critical Data Gaps

1. **Client Dashboard has no real data** - All hardcoded
2. **Executive Dashboard has no real data** - All KPIs hardcoded
3. **Seed data doesn't link SubmissionRequests → Reports**
4. **No filed Reports in seed data** - Can't demo complete workflow

### 🟠 Feature Gaps

1. **Invoice View** - UI exists but uses mock data, no API connection
2. **PDF Download** - Not implemented at all
3. **Invoice Actions** - Send, Mark Paid, Void all disabled
4. **No completed/filed workflow demo** - Seed data stops at ready_to_file

### 🟡 Data Consistency Gaps

1. **company_id** not set on seeded Reports
2. **SubmissionRequests** not linked to their Reports
3. **No demo data showing full lifecycle** (request → report → filed)

---

## 7. Recommended Fixes (Priority Order)

### P0 - Critical for Demo

1. **Create linked seed data chain**
   - SubmissionRequest → Report → Parties → Filed
   - Show complete lifecycle in one example

2. **Wire Client Dashboard to real API**
   - Create `GET /submission-requests/stats` endpoint
   - Replace hardcoded stats with API call

3. **Add filed Report to seed data**
   - At least 1 report with `status=filed` and `receipt_id`

### P1 - Important for Demo Quality

4. **Wire Executive Dashboard to real API**
   - Create aggregate stats endpoint
   - Or use existing admin stats

5. **Wire Invoice page to real API**
   - Create basic Invoice endpoints if missing
   - Connect frontend to fetch real data

6. **Create seed Invoices**
   - Link to billing events from filed reports

### P2 - Nice to Have

7. **PDF Generation**
   - Add react-pdf or jspdf
   - Implement invoice PDF download
   - Implement filing receipt PDF

8. **Invoice Actions**
   - Enable Send Invoice (email)
   - Enable Mark as Paid
   - Enable Void

---

## 8. Quick Reference: API Endpoints Needed

| Endpoint | Purpose | Status |
|----------|---------|--------|
| `GET /submission-requests/stats` | Client dashboard stats | ❌ Missing |
| `GET /reports/stats` | Admin/Executive stats | ❓ Check |
| `GET /invoices` | List invoices | ❓ Check |
| `POST /invoices/generate-pdf` | PDF generation | ❌ Missing |
| `POST /invoices/{id}/send` | Email invoice | ❌ Missing |
| `PATCH /invoices/{id}/mark-paid` | Payment recording | ❌ Missing |

---

## Appendix: File Locations Quick Reference

| Purpose | File |
|---------|------|
| SubmissionRequest Model | `api/app/models/submission_request.py` |
| Report Model | `api/app/models/report.py` |
| Seed Data | `api/app/services/demo_seed.py` |
| Demo Routes | `api/app/routes/demo.py` |
| Navigation/Roles | `web/lib/navigation.ts` |
| Middleware | `web/middleware.ts` |
| Client Dashboard | `web/app/(app)/app/dashboard/page.tsx` |
| Staff Queue | `web/app/(app)/app/staff/queue/page.tsx` |
| Admin Overview | `web/app/(app)/app/admin/overview/page.tsx` |
| Executive Dashboard | `web/app/(app)/app/executive/page.tsx` |
| Invoice Page | `web/app/(app)/app/invoices/page.tsx` |
| Invoice Detail Sheet | `web/components/admin/invoice-detail-sheet.tsx` |
