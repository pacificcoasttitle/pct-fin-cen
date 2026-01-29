# CURSOR PROMPT: Update North Star Documentation

## 🎯 MISSION

Update the project's North Star / Source of Truth documentation to reflect the CURRENT state of the application after all our development work.

**Why:** The documentation should accurately represent what EXISTS, not what was PLANNED. Future developers (and Claude) need accurate context.

---

## DOCUMENTS TO UPDATE

### Primary Documents:
1. `PCT_FinCEN_Full_App_Specification.md` - Full application spec
2. `pct_fin_cen_solutions_sources_of_truth_committed.md` - Sources of truth
3. Any README files in the project

### Documents to Reference:
1. `__PCT_FinCEN_Solutions_Accomplished_Log.md` - What we've done
2. `KilledSharks.md` - Detailed fix log

---

## WHAT TO UPDATE

### 1. Architecture & Tech Stack (Verify/Update)

**Backend:**
- FastAPI on Render
- PostgreSQL database
- Models: Company, User, SubmissionRequest, Report, ReportParty, Invoice, BillingEvent
- Key routes: /submission-requests, /reports, /parties, /invoices, /companies, /users, /sidebar

**Frontend:**
- Next.js 14 (App Router) on Vercel
- Tailwind CSS + shadcn/ui
- Domain: fincenclear.com

### 2. Data Models - Document ACTUAL Schema

For each model, document:
- All fields (from actual model files)
- Relationships
- Status values and transitions

### 3. API Endpoints - Document What EXISTS

Create comprehensive endpoint list:
```
/submission-requests
  POST   /                     - Create new submission
  GET    /                     - List submissions
  GET    /{id}                 - Get submission detail
  POST   /{id}/create-report   - Start wizard (creates report)
  GET    /stats                - Dashboard stats

/reports
  GET    /                     - List reports
  GET    /{id}                 - Get report detail
  PATCH  /{id}                 - Update report
  POST   /{id}/party-links     - Create and send party links
  POST   /{id}/determine       - Run determination
  POST   /{id}/file            - File to FinCEN
  GET    /queue/with-parties   - Staff queue with party status
  GET    /executive-stats      - Executive dashboard stats

/parties
  GET    /{token}              - Get party portal data
  POST   /{token}/submit       - Submit party information

/companies
  GET    /                     - List companies
  GET    /{id}                 - Company detail
  POST   /                     - Create company
  PATCH  /{id}                 - Update company
  PATCH  /{id}/status          - Change company status
  GET    /stats/summary        - Company stats

/users
  GET    /                     - List users
  GET    /{id}                 - User detail
  POST   /                     - Create user
  POST   /invite               - Invite user to company
  PATCH  /{id}                 - Update user
  DELETE /{id}                 - Deactivate user
  GET    /my-team              - Team for current company
  GET    /stats/summary        - User stats

/invoices
  GET    /                     - List invoices
  GET    /{id}                 - Invoice detail with line items
  POST   /generate             - Generate invoice for period
  PATCH  /{id}/status          - Update invoice status

/sidebar
  GET    /counts               - Badge counts by role

/demo
  POST   /reset                - Reset demo data
```

### 4. User Roles & Permissions - Document What's Implemented

| Role | Access | Home Page |
|------|--------|-----------|
| `coo` | Full access | /app/executive |
| `pct_admin` | Admin (no exec, no billing) | /app/admin/overview |
| `pct_staff` | Queue, requests, reports | /app/staff/queue |
| `client_admin` | Their company + team + billing | /app/dashboard |
| `client_user` | Their company (no team, no billing) | /app/dashboard |

### 5. Status Lifecycle - Document Complete Flow

**SubmissionRequest:**
```
pending → in_progress → completed
                     → cancelled
```

**Report:**
```
draft → determination_complete → collecting → ready_to_file → filed
     → exempt
```

**ReportParty:**
```
pending → link_sent → opened → submitted
```

### 6. Key Features - Document What's Built

**Client Portal:**
- ✅ Submit new request with property, buyer, seller, financing info
- ✅ View request status and history
- ✅ See completion receipt

**Staff Workflow:**
- ✅ My Queue with tabs (Needs Setup, Collecting, Ready to File)
- ✅ Smart Wizard with state persistence
- ✅ Party portal link generation
- ✅ Party progress monitoring
- ✅ FinCEN filing simulation

**Admin Features:**
- ✅ Company management (CRUD)
- ✅ User management (CRUD, invite)
- ✅ Request management
- ✅ Report oversight

**Billing:**
- ✅ Auto-create BillingEvent on filing ($75)
- ✅ Invoice generation
- ✅ Invoice detail with line items

**Party Portal:**
- ✅ Secure token-based access
- ✅ Dynamic forms by party type (individual, entity, trust)
- ✅ Buyer forms with payment sources
- ✅ Trust forms with trustees, settlors, beneficiaries

### 7. Demo Mode - Document How It Works

- Cookie-based auth (`pct_demo_session`)
- 5 demo users (coo, pct_admin, pct_staff, client_admin, client_user)
- 2 demo companies (FinClear Solutions, Pacific Coast Title)
- Demo reset endpoint: `POST /demo/reset`
- Seed data with 6 submission scenarios

### 8. Deployment - Document Current Setup

**Frontend (Vercel):**
- Domain: fincenclear.com
- Environment: Production

**Backend (Render):**
- URL: pct-fin-cen-staging.onrender.com
- Database: PostgreSQL

**CORS:** Configured for fincenclear.com

---

## FORMAT

Update the documentation to be:
1. **Accurate** - Reflects what's actually built
2. **Complete** - All endpoints, models, features documented
3. **Navigable** - Clear sections and tables
4. **Useful** - A developer could onboard from this

---

## OUTPUT

After reviewing the codebase, update the documentation files with:
1. Current architecture diagram (text-based)
2. Complete API endpoint reference
3. Data model documentation
4. Status/workflow documentation
5. Feature checklist (what's done vs planned)
6. Known limitations or TODOs

**The North Star should be a single source of truth that matches the code.**
