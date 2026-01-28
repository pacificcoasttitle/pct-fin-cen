# Investigation Findings: User & Company Management System

**Date:** January 28, 2026  
**Investigator:** Cursor AI  
**Purpose:** Understand current state for multi-tenant SaaS foundation

---

## Company Management Findings

### Model

- **File:** `api/app/models/company.py`
- **Fields:**
  | Field | Type | Notes |
  |-------|------|-------|
  | `id` | UUID | Primary key |
  | `name` | String(255) | Required |
  | `code` | String(50) | Unique, required (e.g., "PCT", "DEMO") |
  | `company_type` | String(50) | "internal" or "client" |
  | `billing_email` | String(255) | Nullable |
  | `billing_contact_name` | String(255) | Nullable |
  | `address` | JSONB | {street, city, state, zip} |
  | `phone` | String(50) | Nullable |
  | `status` | String(50) | "active", "suspended", "inactive" |
  | `settings` | JSONB | Future config (empty by default) |
  | `created_at` | DateTime | Auto |
  | `updated_at` | DateTime | Auto |

- **Relationships:**
  - `users` → User (one-to-many)
  - `submission_requests` → SubmissionRequest (one-to-many)
  - `reports` → Report (one-to-many)
  - `billing_events` → BillingEvent (one-to-many)
  - `invoices` → Invoice (one-to-many)

- **Missing:**
  - ❌ No `subscription_tier` or `plan` field
  - ❌ No `billing_status` field
  - ❌ No `trial_ends_at` or subscription dates
  - ❌ No soft delete (`deleted_at`)

### API Endpoints

| Endpoint | Exists | Functional | Notes |
|----------|--------|------------|-------|
| `POST /companies` | ❌ | N/A | No route file |
| `GET /companies` | ❌ | N/A | No route file |
| `GET /companies/{id}` | ❌ | N/A | No route file |
| `PATCH /companies/{id}` | ❌ | N/A | No route file |
| `DELETE /companies/{id}` | ❌ | N/A | No route file |

**No `api/app/routes/companies.py` file exists.**

### Frontend

- **Page exists:** ✅ Yes - `web/app/(app)/app/admin/companies/page.tsx`
- **Functionality:** Display-only with mock data
  - Shows list of 12 mock companies
  - Stats cards (total, active, pending, filings)
  - Search and filter by status
  - Company detail sheet
- **Calls endpoints:** ❌ None (all mock data)
- **"Add Company" button:** Disabled with "Coming soon" tooltip

---

## User Management Findings

### Model

- **File:** `api/app/models/user.py`
- **Fields:**
  | Field | Type | Notes |
  |-------|------|-------|
  | `id` | UUID | Primary key |
  | `email` | String(255) | Unique, required |
  | `name` | String(255) | Required |
  | `company_id` | UUID FK | Nullable - NULL for PCT internal staff |
  | `role` | String(50) | Role identifier |
  | `clerk_id` | String(255) | Nullable - for Clerk integration later |
  | `status` | String(50) | "active", "invited", "disabled" |
  | `last_login_at` | DateTime | Nullable |
  | `settings` | JSONB | Empty by default |
  | `created_at` | DateTime | Auto |
  | `updated_at` | DateTime | Auto |

- **Role Values:**
  - `coo` - Not in model comments but used in frontend
  - `pct_admin` - Full admin access
  - `pct_staff` - Process reports, manage parties
  - `client_admin` - Admin for client company
  - `client_user` - Regular client user

- **Relationships:**
  - `company` → Company (many-to-one)
  - `submission_requests` → SubmissionRequest (one-to-many, as requester)
  - `assigned_requests` → SubmissionRequest (one-to-many, as assignee)
  - `created_reports` → Report (one-to-many)

- **Helper Properties:**
  - `is_pct_staff` - Returns True if role in (pct_admin, pct_staff)
  - `is_admin` - Returns True if role in (pct_admin, client_admin)

- **Missing:**
  - ❌ No `password` field (external auth expected)
  - ❌ No `invited_at`, `invited_by` tracking
  - ❌ No `phone` field
  - ❌ No `avatar_url` field

### API Endpoints

| Endpoint | Exists | Functional | Notes |
|----------|--------|------------|-------|
| `POST /users` | ❌ | N/A | No route file |
| `GET /users` | ❌ | N/A | No route file |
| `GET /users/{id}` | ❌ | N/A | No route file |
| `PATCH /users/{id}` | ❌ | N/A | No route file |
| `DELETE /users/{id}` | ❌ | N/A | No route file |
| `POST /users/invite` | ❌ | N/A | No route file |

**No `api/app/routes/users.py` file exists.**

### Frontend

- **Admin page exists:** ✅ Yes - `web/app/(app)/app/admin/users/page.tsx`
- **Team settings page exists:** ✅ Yes - `web/app/(app)/app/settings/team/page.tsx`
- **Admin functionality:** Display-only with mock data
  - Shows 41 mock users across 12 companies
  - Filter by type (PCT Staff / Client)
  - Filter by status
  - Search by name/email/company
  - User detail sheet
- **Team settings functionality:** Display-only with mock data
  - Shows 4 mock team members for "Demo Title & Escrow"
  - "Invite User" button shows alert("Coming soon")
  - Role dropdown menus (Edit Role, Remove) - no actual functionality
- **"Invite User" button:** Disabled with "Coming soon" tooltip (admin page)

---

## Authentication Findings

### Current Implementation

- **Type:** Demo-only (cookie-based fake auth)
- **Session storage:** Cookie (`pct_demo_session`)
- **Cookie format:** Base64-encoded JSON
- **Password handling:** None - no passwords

### Demo Login Flow

1. User selects a demo account on `/login`
2. Frontend `POST`s to `/api/auth/login` with email
3. Backend checks against hardcoded `DEMO_USERS` map
4. If valid, sets `pct_demo_session` cookie with base64 user data
5. User redirected to appropriate home page based on role

### Demo Users (Hardcoded in `/api/auth/login/route.ts`)

| Email | Role | Company |
|-------|------|---------|
| `coo@pct.com` | `coo` | PCT FinCEN Solutions |
| `admin@pctfincen.com` | `pct_admin` | PCT FinCEN Solutions |
| `staff@pctfincen.com` | `pct_staff` | PCT FinCEN Solutions |
| `admin@demotitle.com` | `client_admin` | Demo Title & Escrow |
| `user@demotitle.com` | `client_user` | Demo Title & Escrow |

### Session Cookie Contents

```json
{
  "id": "demo-pct-admin",
  "email": "admin@pctfincen.com",
  "name": "Sarah Mitchell",
  "role": "pct_admin",
  "companyId": null,
  "companyName": "PCT FinCEN Solutions"
}
```

### Middleware Auth Check (`web/middleware.ts`)

1. Checks for `pct_demo_session` cookie
2. If missing for `/app/*` routes → redirect to `/login`
3. Decodes base64 session to get role
4. Enforces role-based access:
   - COO: Full access
   - PCT Admin: No executive dashboard, no billing
   - PCT Staff: Queue, requests, filings only
   - Clients: No admin/staff/executive, no wizard
   - Client User: No billing, no team settings

### API Authentication

- **No `get_current_user` dependency exists**
- Backend routes are NOT authenticated
- Demo endpoints protected by `X-DEMO-SECRET` header
- Regular endpoints are public (security concern for production)

### Gaps

- ❌ No real authentication system (JWT, OAuth, sessions)
- ❌ No password storage or verification
- ❌ No API request authentication
- ❌ No Clerk integration (field exists but unused)
- ❌ No logout endpoint that clears sessions properly

---

## Role-Based Access Findings

### Roles Defined

| Role | Description | Frontend Access |
|------|-------------|-----------------|
| `coo` | Chief Operating Officer | FULL ACCESS - Executive + all admin + billing |
| `pct_admin` | FinClear Admin | Admin pages (no executive, no billing) |
| `pct_staff` | FinClear Staff | Queue, requests, filings, reports (assigned work) |
| `client_admin` | Client Company Admin | Dashboard, requests, reports, invoices, team settings |
| `client_user` | Client Company User | Dashboard, requests, reports (no billing, no team) |

### Enforcement

- **Frontend:** `web/middleware.ts` checks role and redirects unauthorized access
- **Backend:** ❌ NO ENFORCEMENT - All API routes are publicly accessible

### Home Redirects by Role

| Role | Home Page |
|------|-----------|
| `coo` | `/app/executive` |
| `pct_admin` | `/app/admin/overview` |
| `pct_staff` | `/app/staff/queue` |
| `client_admin` | `/app/dashboard` |
| `client_user` | `/app/dashboard` |

---

## Billing Connection Findings

### Company → Invoice Link

- **How linked:** `Invoice.company_id` FK → `Company.id`
- **Fields on Company:** `billing_email`, `billing_contact_name`
- **Invoice creation:** Manual via `POST /invoices/generate` for a period

### User → Billing Link

- **created_by tracked:** ❌ No (Invoice has no `created_by_user_id`)
- **billing contact:** ✅ Yes - on Company model (`billing_contact_name`, `billing_email`)

### BillingEvent Creation

- ✅ Auto-created when report is filed and accepted ($75 per filing)
- Links to `company_id`, `report_id`, `submission_request_id`

---

## Seed Data Findings

### Companies Created

| Code | Name | Type |
|------|------|------|
| `FINCLEAR` | FinClear Solutions | internal |
| `DEMO` | Pacific Coast Title | client |

### Users Created

| Email | Role | Company |
|-------|------|---------|
| `staff@pctfincen.com` | `pct_staff` | NULL (internal) |
| `admin@pctfincen.com` | `pct_admin` | NULL (internal) |
| `admin@demotitle.com` | `client_admin` | DEMO |

### Mismatch Warning ⚠️

The seed data creates users like `staff@pctfincen.com` but the frontend demo login expects `staff@pctfincen.com` - these DO match.

However, frontend demo shows 5 roles but seed only creates 3 users. The `coo@pct.com` and `user@demotitle.com` users are NOT seeded in the database.

---

## Data Flow Summary

### Creating a New Client Company

**Currently:** Not possible via API or UI

**Required steps to implement:**
1. Create `POST /companies` endpoint
2. Create company creation form UI
3. Validate company code uniqueness
4. Auto-create admin user invite?

### Adding a User to Company

**Currently:** Not possible via API or UI

**Required steps to implement:**
1. Create `POST /users` or `POST /users/invite` endpoint
2. Create user invitation form UI
3. Link to company via `company_id`
4. Send invitation email
5. Handle invitation acceptance

### Changing User Role

**Currently:** Not possible via API or UI

**Required steps to implement:**
1. Create `PATCH /users/{id}` endpoint
2. Validate role transitions (e.g., can't promote to COO?)
3. Add audit logging
4. Update UI role dropdown to call API

---

## Gap Analysis Summary

### API Gaps

| Feature | Exists? | Priority |
|---------|---------|----------|
| Create company | ❌ | P1 |
| List companies | ❌ | P1 |
| Update company | ❌ | P2 |
| Delete/suspend company | ❌ | P3 |
| Create user | ❌ | P1 |
| List users (by company) | ❌ | P1 |
| Update user role | ❌ | P1 |
| Invite user (email) | ❌ | P1 |
| Deactivate user | ❌ | P2 |
| Real authentication | ❌ | P0 |
| API auth middleware | ❌ | P0 |

### Frontend Gaps

| Feature | Exists? | Functional? | Notes |
|---------|---------|-------------|-------|
| Company list page | ✅ | ❌ Mock data | Needs API wiring |
| Company create form | ❌ | N/A | Button disabled |
| Company detail/edit | ✅ | ❌ Mock data | Sheet exists but no edit |
| User list page | ✅ | ❌ Mock data | Needs API wiring |
| User create/invite form | ❌ | N/A | Button disabled |
| User role management | ✅ | ❌ Mock data | Dropdown exists |
| Team settings (client) | ✅ | ❌ Mock data | Needs API wiring |

### Data Model Gaps

| Feature | Exists? | Notes |
|---------|---------|-------|
| Invitation model | ❌ | No `Invitation` table |
| Password hashing | ❌ | No password field |
| Session/token model | ❌ | Cookie-only demo auth |
| Audit logging (users) | ❌ | AuditLog exists but not for user/company changes |
| Subscription/tier | ❌ | No billing tier fields |

---

## Recommended Implementation Priority

### P0 - Critical (Security & Foundation)

1. **API Authentication Middleware**
   - Create `get_current_user` dependency
   - Verify session/JWT on protected routes
   - Block unauthenticated access to sensitive endpoints

2. **Real Auth Integration (Clerk recommended)**
   - Use `clerk_id` field already on User model
   - Handle user sync from Clerk webhooks
   - Implement proper session management

### P1 - Important (Core Multi-Tenant Features)

1. **Company CRUD API**
   - `POST /companies` - create
   - `GET /companies` - list (admin only)
   - `GET /companies/{id}` - detail
   - `PATCH /companies/{id}` - update

2. **User CRUD API**
   - `POST /users/invite` - send invitation
   - `GET /users` - list (scoped by company for clients)
   - `PATCH /users/{id}` - update role/status
   - `DELETE /users/{id}` - deactivate

3. **Wire Frontend Pages to APIs**
   - Companies admin page → real data
   - Users admin page → real data
   - Team settings page → real data

### P2 - Nice to Have

1. **Invitation System**
   - Create `Invitation` model
   - Email sending for invites
   - Invitation acceptance flow

2. **User Activity Tracking**
   - Update `last_login_at` on login
   - Track user actions in audit log

3. **Company Settings**
   - Logo upload
   - Custom branding
   - Notification preferences

---

## File Locations Quick Reference

| Purpose | File |
|---------|------|
| Company model | `api/app/models/company.py` |
| User model | `api/app/models/user.py` |
| Company routes | ❌ Does not exist |
| User routes | ❌ Does not exist |
| Auth routes | ❌ Does not exist (demo only) |
| Demo routes | `api/app/routes/demo.py` |
| Admin companies page | `web/app/(app)/app/admin/companies/page.tsx` |
| Admin users page | `web/app/(app)/app/admin/users/page.tsx` |
| Team settings page | `web/app/(app)/app/settings/team/page.tsx` |
| Middleware | `web/middleware.ts` |
| Demo login API | `web/app/api/auth/login/route.ts` |
| Demo seed | `api/app/services/demo_seed.py` |
| Login page | `web/app/login/page.tsx` |

---

## Critical Security Note ⚠️

**The current backend has NO authentication.**

All API endpoints are publicly accessible. Anyone can:
- List/create/modify reports
- View party data (including SSN/sensitive info)
- File reports
- Access admin endpoints

**Before going to production, P0 auth items are MANDATORY.**

---

*Investigation complete. This document should inform the multi-tenant SaaS feature build.*
