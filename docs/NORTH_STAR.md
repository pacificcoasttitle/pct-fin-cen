# FinClear Solutions - North Star Document

> **Last Updated:** January 28, 2026  
> **Status:** CURRENT - This reflects the actual implemented state  
> **Brand:** FinClear Solutions (formerly PCT FinCEN Solutions)  
> **Domain:** fincenclear.com

---

## 🎯 What We've Built

A compliance platform where:
1. **Title Company Clients** submit real estate transactions for FinCEN RRER review
2. **FinClear Staff** determines if FinCEN reporting is required via smart wizard
3. **Transaction Parties** (buyers/sellers) provide their own information via secure portal
4. **FinClear Staff** reviews and files to FinCEN (demo mode: mock filing)

---

## 🏗️ Architecture & Tech Stack

### Backend (FastAPI on Render)
```
URL: https://pct-fin-cen-staging.onrender.com
Database: PostgreSQL (Render-hosted)
Environment: staging (ENVIRONMENT=staging)
```

### Frontend (Next.js 14 on Vercel)
```
URL: https://fincenclear.com
Framework: Next.js 14 (App Router)
Styling: Tailwind CSS + shadcn/ui
Auth: Cookie-based demo auth (pct_demo_session)
```

### Data Models
```
api/app/models/
├── company.py           # Client companies
├── user.py              # Users (all roles)
├── submission_request.py # Client transaction requests
├── report.py            # FinCEN reports (created from requests)
├── report_party.py      # Parties on reports
├── party_link.py        # Secure portal links
├── billing_event.py     # Billable events (filings)
├── invoice.py           # Generated invoices
├── audit_log.py         # Audit trail
├── notification_event.py # Email notifications
├── filing_submission.py # Filing lifecycle
└── document.py          # Document storage (future)
```

---

## 📊 Complete Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  PHASE 1: CLIENT SUBMISSION                                                     │
│  Actor: Title Company Client (client_admin or client_user)                      │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  Client logs in → Dashboard → "New Request" (/app/requests/new)                │
│                                                                                 │
│  Form collects:                                                                 │
│  • Property: Address, City, State, ZIP                                         │
│  • Transaction: Purchase Price, Closing Date, Escrow #, Financing Type         │
│  • Buyer: Name, Email, Type (Individual/Entity/Trust), Phone                   │
│  • Seller: Name, Email, Phone                                                  │
│  • Notes (optional)                                                            │
│                                                                                 │
│  [Submit] → POST /submission-requests                                          │
│                                                                                 │
│  Creates: SubmissionRequest (status="pending")                                 │
│  Result: Appears in Staff queue, badge updates                                 │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────────┐
│  PHASE 2: STAFF WIZARD - DETERMINATION                                          │
│  Actor: FinClear Staff (pct_staff)                                             │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  Staff sees request in queue → Clicks "Start Wizard"                           │
│  → POST /submission-requests/{id}/create-report                                │
│  → Creates Report with wizard_data pre-filled from submission                  │
│  → SubmissionRequest status: "pending" → "in_progress"                         │
│                                                                                 │
│  WIZARD - DETERMINATION PHASE:                                                 │
│  ┌───────────────────────────────────────────────────────────────────────────┐ │
│  │ Step 1: Property Type                                                     │ │
│  │ • Is it residential (1-4 family, condo, townhouse, manufactured)?         │ │
│  │ • If commercial/5+ units → NOT REPORTABLE (exempt)                        │ │
│  ├───────────────────────────────────────────────────────────────────────────┤ │
│  │ Step 2: Financing Check                                                   │ │
│  │ • Was this financed by institution with AML program?                      │ │
│  │ • If YES (lender has AML) → NOT REPORTABLE (exempt)                       │ │
│  │ • If NO (cash deal) → Continue                                            │ │
│  ├───────────────────────────────────────────────────────────────────────────┤ │
│  │ Step 3: Buyer Type                                                        │ │
│  │ • Individual buyer → NOT REPORTABLE (exempt)                              │ │
│  │ • Entity buyer → Check entity exemptions                                  │ │
│  │ • Trust buyer → Check trust exemptions                                    │ │
│  ├───────────────────────────────────────────────────────────────────────────┤ │
│  │ Step 4: Entity/Trust Exemption Check                                      │ │
│  │ • 23 exempt entity types (SEC registered, bank, government, etc.)         │ │
│  │ • 4 exempt trust types (statutory, widely held, etc.)                     │ │
│  │ • If EXEMPT type → NOT REPORTABLE                                         │ │
│  └───────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
│  [Run Determination] → POST /reports/{id}/determine                            │
│                                                                                 │
│  Outcomes:                                                                     │
│  • EXEMPT → Report status="exempt", SubmissionRequest status="completed"       │
│  • REPORTABLE → Report status="determination_complete", continue to Phase 3   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
                                    ↓ (if REPORTABLE)
┌─────────────────────────────────────────────────────────────────────────────────┐
│  PHASE 3: PARTY SETUP & LINK GENERATION                                         │
│  Actor: FinClear Staff                                                          │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  Party info pre-populated from client submission                               │
│  Staff can add/edit/remove parties                                             │
│                                                                                 │
│  Party Setup UI:                                                               │
│  ┌───────────────────────────────────────────────────────────────────────────┐ │
│  │ BUYERS:                                    SELLERS:                       │ │
│  │ • ABC Holdings LLC (Entity)               • John Smith (Individual)       │ │
│  │   contact@abc.com ✏️ ❌                     john@email.com ✏️ ❌            │ │
│  │ [+ Add Buyer]                             [+ Add Seller]                  │ │
│  └───────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
│  [Generate & Send Links] → POST /reports/{id}/party-links                      │
│                                                                                 │
│  System:                                                                       │
│  • Creates ReportParty records with unique tokens                             │
│  • Creates PartyLink records with expiration (7 days default)                 │
│  • Sends email to each party via SendGrid                                     │
│  • Report status: "determination_complete" → "collecting"                      │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────────┐
│  PHASE 4: PARTY DATA COLLECTION                                                 │
│  Actor: Transaction Parties (via secure portal)                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  Party receives email → Clicks link → /p/{token}                               │
│                                                                                 │
│  Dynamic form based on role + type:                                            │
│  ┌───────────────────────────────────────────────────────────────────────────┐ │
│  │ SELLER (Individual)                                                       │ │
│  │ • Full legal name, DOB, SSN/ITIN                                         │ │
│  │ • Address after closing                                                   │ │
│  │ • Citizenship status                                                      │ │
│  │ • Certification checkbox                                                  │ │
│  ├───────────────────────────────────────────────────────────────────────────┤ │
│  │ SELLER (Entity)                                                           │ │
│  │ • Entity legal name, type, EIN                                           │ │
│  │ • Formation state/date                                                    │ │
│  │ • Principal address                                                       │ │
│  │ • Authorized signer info                                                  │ │
│  ├───────────────────────────────────────────────────────────────────────────┤ │
│  │ BUYER (Entity)                                                            │ │
│  │ • Entity info (name, type, EIN, formation)                               │ │
│  │ • ALL Beneficial Owners (25%+ ownership OR control):                     │ │
│  │   - Full name, DOB, SSN                                                  │ │
│  │   - Residential address                                                   │ │
│  │   - ID type and number                                                    │ │
│  │   - Ownership % or control type                                          │ │
│  │ • Payment Sources:                                                        │ │
│  │   - Method (wire, check, crypto, etc.)                                   │ │
│  │   - Amount, account details                                              │ │
│  │   - Institution info                                                      │ │
│  │ • Third-party payer info (if any)                                        │ │
│  ├───────────────────────────────────────────────────────────────────────────┤ │
│  │ BUYER (Trust)                                                             │ │
│  │ • Trust name, type, date executed, TIN/EIN                               │ │
│  │ • Trustees (individual or entity, multiple supported)                    │ │
│  │ • Settlor/Grantor info                                                   │ │
│  │ • Beneficiaries with vested interest                                     │ │
│  │ • Payment Sources                                                         │ │
│  └───────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
│  [Submit] → POST /parties/{token}/submit                                       │
│  → Confirmation page with submission ID                                        │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────────┐
│  PHASE 5: STAFF MONITORING                                                      │
│  Actor: FinClear Staff                                                          │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  My Queue (/app/staff/queue) shows:                                            │
│  • Tabs: All | Needs Setup | Collecting | Ready to File                        │
│  • Party progress: "2/3 parties complete"                                      │
│  • Urgency indicators (≤5 days = amber, overdue = red)                         │
│  • Context-aware action buttons                                                │
│                                                                                 │
│  Wizard shows per-party status:                                                │
│  • Link Sent ✅ | Opened ⏳ | Submitted ✅                                      │
│  • Can resend links, send reminders                                            │
│                                                                                 │
│  When ALL parties complete:                                                    │
│  → POST /reports/{id}/ready-check                                              │
│  → Report status: "collecting" → "ready_to_file"                               │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────────┐
│  PHASE 6: REVIEW & FILE                                                         │
│  Actor: FinClear Staff                                                          │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  Staff reviews all submitted info in wizard                                    │
│  Party data displayed with masked SSN/EINs                                     │
│                                                                                 │
│  [File to FinCEN] → POST /reports/{id}/file                                    │
│                                                                                 │
│  In STAGING (current):                                                         │
│  • Mock filing with configurable outcomes                                      │
│  • Creates FilingSubmission record                                             │
│  • Generates mock receipt_id (BSA ID)                                         │
│  • Report status: "ready_to_file" → "filed"                                    │
│  • SubmissionRequest status: "in_progress" → "completed"                       │
│  • Creates BillingEvent ($75.00)                                               │
│                                                                                 │
│  In PRODUCTION (future):                                                       │
│  • SDTM SFTP submission to FinCEN                                             │
│  • Async lifecycle with real BSA IDs                                          │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────────┐
│  PHASE 7: CLIENT VISIBILITY                                                     │
│  Actor: Title Company Client                                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  Client Dashboard shows:                                                       │
│  • Request status: "Pending" → "In Progress" → "Completed"                     │
│  • Filing confirmation with receipt ID (when filed)                            │
│  • Invoice in billing section                                                  │
│                                                                                 │
│  Client Requests page shows:                                                   │
│  • Rich status with descriptions                                               │
│  • Sub-status when collecting party info                                       │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔌 API Endpoints (Complete Reference)

### Submission Requests (`/submission-requests`)
```
POST   /                           Create new submission request
GET    /                           List all submissions (admin)
GET    /my-requests                List submissions for current company
GET    /stats                      Dashboard stats for company
GET    /{id}                       Get submission detail
PATCH  /{id}/status                Update submission status
POST   /{id}/create-report         Start wizard (creates report)
```

### Reports (`/reports`)
```
POST   /                           Create report directly
GET    /                           List all reports
GET    /queue/with-parties         Staff queue with party progress
GET    /executive-stats            Executive dashboard stats
GET    /{id}                       Get report detail
GET    /{id}/parties               Get party statuses for report
PUT    /{id}/wizard                Save wizard progress (autosave)
POST   /{id}/determine             Run determination logic
POST   /{id}/party-links           Create and send party links
POST   /{id}/ready-check           Check if ready to file
POST   /{id}/file                  File to FinCEN (mock in staging)
```

### Parties (`/parties`)
```
GET    /{token}                    Get party portal data
POST   /{token}/save               Save draft data
POST   /{token}/submit             Submit party information
```

### Companies (`/companies`)
```
GET    /stats/summary              Company stats summary
GET    /                           List all companies
GET    /{id}                       Get company detail with stats
GET    /{id}/users                 List users in company
POST   /                           Create new company
PATCH  /{id}                       Update company
PATCH  /{id}/status                Change company status
```

### Users (`/users`)
```
GET    /stats/summary              User stats summary
GET    /my-team                    Get team for company
GET    /                           List all users
GET    /{id}                       Get user detail with stats
POST   /                           Create new user
POST   /invite                     Invite user to company
PATCH  /{id}                       Update user
DELETE /{id}                       Deactivate user
POST   /{id}/reactivate            Reactivate user
```

### Invoices (`/invoices`)
```
GET    /                           List invoices
GET    /{id}                       Get invoice with line items
GET    /billing-events/unbilled    List unbilled events
POST   /generate                   Generate invoice for period
PATCH  /{id}/status                Update invoice status
```

### Sidebar (`/sidebar`)
```
GET    /counts                     Badge counts by role
```

### Demo (`/demo`)
```
POST   /reset                      Reset demo data
POST   /create-report              Create demo report directly
GET    /notifications              Get recent notifications
POST   /reports/{id}/set-filing-outcome  Set mock filing outcome
POST   /test-email                 Send test email
```

---

## 🗄️ Data Models

### SubmissionRequest
```python
id: UUID
company_id: UUID                  # Client company
requested_by_user_id: UUID        # User who submitted
assigned_to_user_id: UUID         # Staff assigned (optional)
report_id: UUID                   # Linked report (after wizard starts)

# Status
status: str                       # pending, assigned, in_progress, completed, cancelled

# Property
property_address: JSONB           # {street, city, state, zip}

# Transaction
purchase_price_cents: int
expected_closing_date: date
escrow_number: str
financing_type: str               # cash, financed, partial_cash

# Parties
buyer_name, buyer_email, buyer_type, buyer_phone
seller_name, seller_email, seller_phone

# Metadata
notes: str
created_at, updated_at
```

### Report
```python
id: UUID
company_id: UUID
submission_request_id: UUID       # Source request
user_id: UUID                     # Creator

# Status
status: str                       # draft, determination_complete, collecting, ready_to_file, filed, exempt
wizard_step: int
wizard_data: JSONB                # {phase, determination, collection, ...}
determination: JSONB              # Result from determination

# Property/Transaction
property_address_text: str
closing_date: date
filing_deadline: date
escrow_number: str

# Filing
filing_status: str                # filed_mock, filed_live, failed
filed_at: datetime
receipt_id: str                   # BSA ID

created_at, updated_at
```

### ReportParty
```python
id: UUID
report_id: UUID
party_role: str                   # buyer, seller
entity_type: str                  # individual, entity, trust
display_name, email, phone

# Status
status: str                       # pending, link_sent, opened, submitted
link_sent_at, opened_at, submitted_at

# Data
party_data: JSONB                 # Submitted form data
```

### PartyLink
```python
id: UUID
report_party_id: UUID
token: str                        # Unique access token
status: str                       # pending, sent, clicked, submitted, expired
email_sent: bool
expires_at: datetime
```

### Company
```python
id: UUID
name: str
code: str                         # Short code (DEMO, PCT, etc.)
company_type: str                 # internal, client
billing_email, billing_contact_name
address: JSONB
phone: str
status: str                       # active, suspended, inactive
settings: JSONB
created_at, updated_at
```

### User
```python
id: UUID
email: str (unique)
name: str
company_id: UUID                  # NULL for internal users
role: str                         # coo, pct_admin, pct_staff, client_admin, client_user
clerk_id: str                     # For future Clerk auth
status: str                       # active, invited, suspended, inactive
last_login_at: datetime
settings: JSONB
created_at, updated_at
```

### BillingEvent
```python
id: UUID
company_id: UUID
report_id: UUID
submission_request_id: UUID
event_type: str                   # filing_accepted
description: str
amount_cents: int                 # 7500 = $75.00
quantity: int
bsa_id: str
invoice_id: UUID                  # NULL until invoiced
created_at
```

### Invoice
```python
id: UUID
company_id: UUID
invoice_number: str               # INV-2026-0001
status: str                       # draft, sent, paid, overdue, cancelled
period_start, period_end: date
subtotal_cents, tax_cents, total_cents: int
due_date: date
paid_at: datetime
notes: str
created_at, updated_at
```

---

## 👤 User Roles & Permissions

| Role | Description | Home Page | Access |
|------|-------------|-----------|--------|
| `coo` | Executive | /app/executive | Full access including executive dashboard |
| `pct_admin` | FinClear Admin | /app/admin/overview | Admin (companies, users, requests, reports) |
| `pct_staff` | FinClear Staff | /app/staff/queue | Queue, requests, reports (no admin) |
| `client_admin` | Client Admin | /app/dashboard | Company's data + team + billing |
| `client_user` | Client User | /app/dashboard | Company's data (no team, no billing) |

### Navigation by Role

**COO:**
- Executive Dashboard
- Requests, Reports, Companies, Users
- Billing, Invoices
- Settings

**FinClear Admin:**
- Admin Overview Dashboard
- Requests, Reports, Companies, Users
- Team, Settings

**FinClear Staff:**
- My Queue (with tabs)
- All Requests
- Reports
- Settings

**Client Admin:**
- Dashboard
- Requests, Reports
- Invoices
- Team, Settings

**Client User:**
- Dashboard
- Requests, Reports
- Settings

---

## 🔄 Status Lifecycles

### SubmissionRequest
```
pending          → Client submitted, awaiting staff
    ↓ [Start Wizard]
in_progress      → Staff working on it
    ↓ [Report filed OR exempt]
completed        → Done

    or
pending → cancelled (manual)
```

### Report
```
draft                    → Created from submission, wizard in progress
    ↓ [Determination = Reportable]
determination_complete   → Ready for party setup
    ↓ [Party links sent]
collecting               → Waiting for parties to submit
    ↓ [All parties complete + ready check]
ready_to_file            → Ready for FinCEN filing
    ↓ [File]
filed                    → Submitted to FinCEN

Alternative:
draft → exempt (Determination = Not Reportable)
```

### ReportParty
```
pending    → Party created, no link yet
    ↓
link_sent  → Email sent
    ↓
opened     → Party clicked link
    ↓
submitted  → Party completed form
```

---

## 🎭 Demo Mode

### Authentication
- Cookie-based: `pct_demo_session`
- Base64 encoded JSON with user data
- Parsed via `web/lib/session.ts` utilities

### Demo Users
| Email | Role | Company |
|-------|------|---------|
| coo@pct.com | coo | FinClear Solutions (internal) |
| admin@pctfincen.com | pct_admin | FinClear Solutions (internal) |
| staff@pctfincen.com | pct_staff | FinClear Solutions (internal) |
| admin@demotitle.com | client_admin | Pacific Coast Title |
| user@demotitle.com | client_user | Pacific Coast Title |

### Demo Companies
1. **FinClear Solutions** - Internal company for staff
2. **Pacific Coast Title** - Demo client company
3. **Acme Title & Escrow** - Second demo client

### Demo Reset
`POST /demo/reset` - Resets to fresh seed data with:
- 6 SubmissionRequests at various stages
- 5 Reports (draft, collecting, ready_to_file, filed, exempt)
- Active party portal link for testing
- Sample billing events and invoice

### Filing Outcomes
`POST /demo/reports/{id}/set-filing-outcome` with:
- `accepted` (default) - Mock success
- `rejected` - Mock rejection
- `needs_review` - Mock review needed

---

## 🚀 Deployment

### Frontend (Vercel)
- **Domain:** fincenclear.com
- **Environment Variables:**
  - `NEXT_PUBLIC_API_BASE_URL`: https://pct-fin-cen-staging.onrender.com
  - `NEXT_PUBLIC_SITE_URL`: https://fincenclear.com
  - `NEXT_PUBLIC_ENVIRONMENT`: production

### Backend (Render)
- **URL:** https://pct-fin-cen-staging.onrender.com
- **Database:** PostgreSQL (Render-hosted)
- **Environment Variables:**
  - `DATABASE_URL`: PostgreSQL connection string
  - `ENVIRONMENT`: staging
  - `DEMO_SECRET`: For demo endpoints
  - `SENDGRID_API_KEY`: For email
  - `CORS_ALLOWED_ORIGINS`: https://fincenclear.com

### CORS Configuration
```python
allowed_origins = [
    "https://fincenclear.com",
    "https://www.fincenclear.com",
    "https://pct-fin-cen.vercel.app",
    # Local dev
    "http://localhost:3000",
    "http://localhost:3001",
]
```

---

## ✅ Feature Checklist

### Client Portal ✅
- [x] Submit new request with full form
- [x] View request status and history
- [x] See completion with receipt ID
- [x] Dashboard with stats
- [x] Request detail view

### Staff Workflow ✅
- [x] My Queue with tabs (Needs Setup, Collecting, Ready)
- [x] Smart Wizard with state persistence
- [x] Determination logic (23 entity + 4 trust exemptions)
- [x] Party portal link generation
- [x] Party progress monitoring
- [x] FinCEN filing simulation
- [x] Inline action buttons (Start Wizard, Continue)
- [x] Urgency indicators for deadlines

### Admin Features ✅
- [x] Company management (CRUD)
- [x] User management (CRUD, invite)
- [x] Request management
- [x] Report oversight

### Billing ✅
- [x] Auto-create BillingEvent on filing ($75)
- [x] Invoice generation
- [x] Invoice detail with line items

### Party Portal ✅
- [x] Secure token-based access
- [x] Dynamic forms by party type
- [x] Individual forms
- [x] Entity forms with beneficial owners
- [x] Trust forms with trustees/settlors/beneficiaries
- [x] Payment source collection

### UI/UX ✅
- [x] Dynamic sidebar badges (color-coded)
- [x] Role-based navigation
- [x] Status sync (SubmissionRequest ↔ Report)
- [x] Pre-filled wizard data from submissions
- [x] Session utilities for cookie parsing

---

## 🔮 Future / Not Yet Implemented

### Authentication
- [ ] Clerk integration (currently demo auth)
- [ ] SSO support
- [ ] Password management

### Filing
- [ ] SDTM SFTP to FinCEN (currently mock)
- [ ] Real BSA ID tracking
- [ ] MESSAGES.XML parsing
- [ ] Acknowledgement tracking

### Notifications
- [ ] Real-time notifications in-app
- [ ] SMS notifications
- [ ] Reminder automation

### Billing
- [ ] Stripe integration (external clients)
- [ ] Auto-invoice generation
- [ ] Payment tracking

### Compliance
- [ ] Document storage (IDs, etc.)
- [ ] Audit report generation
- [ ] Data retention policies

---

## 📁 File Structure

```
/api/
  /app/
    /models/          # SQLAlchemy models (13 files)
    /routes/          # FastAPI endpoints (10 files)
    /services/        # Business logic, demo seed
    /schemas/         # Pydantic schemas
    main.py           # App setup, CORS, routers
    database.py       # DB connection
    config.py         # Settings

/web/
  /app/
    /(app)/app/       # Authenticated pages
      /dashboard/     # Client dashboard
      /executive/     # COO dashboard
      /admin/         # Admin pages (requests, companies, users)
      /staff/         # Staff pages (queue)
      /reports/       # Report list + wizard
      /requests/      # Client request pages
      /settings/      # User/team settings
      /invoices/      # Billing
    /p/               # Party portal (public)
    /login/           # Demo login
  /components/
    /admin/           # Admin components
    /party-portal/    # Party form components
    /ui/              # shadcn/ui components
  /lib/
    api.ts            # API utilities
    brand.ts          # Brand constants
    navigation.ts     # Role-based nav with badges
    session.ts        # Session cookie utilities
    rrer-types.ts     # Wizard type definitions
  /context/
    sidebar-badge-context.tsx  # Badge state management
  /hooks/
    use-demo.ts       # Demo auth hook
    use-toast.ts      # Toast notifications

/docs/
  NORTH_STAR.md       # This file
  KilledSharks.md     # Bug fix log
  /FixPLan/           # Implementation prompts
```

---

*This document reflects the actual implemented state as of January 28, 2026.*
