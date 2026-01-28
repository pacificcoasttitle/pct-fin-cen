# CURSOR PROMPT: Investigation - User & Company Management System

## 🦈 MISSION

This is a CRITICAL investigation. We need to understand the complete picture of:
- How companies are created and managed
- How users are added under companies
- How roles work (staff, admin, client_admin, client_user, coo)
- How authentication flows
- How this connects to billing, reports, and other features

**This will inform a major feature build. Be thorough.**

---

## INVESTIGATION 1: Database Models

### 1.1 Company Model

**File to examine:** `api/app/models/company.py`

Questions:
1. What fields exist on the Company model?
2. Is there a `subscription_tier` or `billing_status` field?
3. Is there a `settings` or `config` JSONB field?
4. What relationships exist (to users, invoices, reports)?
5. Is there soft delete (`is_active`, `deleted_at`)?

### 1.2 User Model

**File to examine:** `api/app/models/user.py`

Questions:
1. What fields exist on the User model?
2. How is `role` defined? (enum, string, choices?)
3. What are ALL possible role values?
4. Is there `company_id` foreign key?
5. Is there password/auth fields or is auth external?
6. Is there `is_active`, `last_login`, `invited_at`, `invited_by`?
7. What relationships exist?

### 1.3 Any Role/Permission Models

**Files to examine:** `api/app/models/` directory

Questions:
1. Is there a separate `Role` model?
2. Is there a `Permission` model?
3. Is there a `UserRole` junction table?
4. Any `Invitation` model for inviting users?

---

## INVESTIGATION 2: API Routes

### 2.1 Company Routes

**File to examine:** `api/app/routes/companies.py` (if exists)

Questions:
1. Does this route file exist?
2. What endpoints are defined?
   - `POST /companies` (create)?
   - `GET /companies` (list)?
   - `GET /companies/{id}` (detail)?
   - `PATCH /companies/{id}` (update)?
   - `DELETE /companies/{id}` (delete)?
3. Who can access these endpoints (any auth checks)?
4. What data is returned?

### 2.2 User Routes

**File to examine:** `api/app/routes/users.py` (if exists)

Questions:
1. Does this route file exist?
2. What endpoints are defined?
   - `POST /users` (create)?
   - `GET /users` (list)?
   - `GET /users/{id}` (detail)?
   - `PATCH /users/{id}` (update)?
   - `DELETE /users/{id}` (delete)?
   - `POST /users/invite` (invite)?
3. Can users be created under a specific company?
4. Can roles be assigned/changed?
5. Any password reset/change endpoints?

### 2.3 Auth Routes

**File to examine:** `api/app/routes/auth.py` (if exists)

Questions:
1. Does this route file exist?
2. What auth endpoints exist?
   - `POST /auth/login`?
   - `POST /auth/logout`?
   - `POST /auth/register`?
   - `GET /auth/me`?
   - `POST /auth/forgot-password`?
   - `POST /auth/reset-password`?
3. How does authentication work (JWT, session, cookie)?
4. Is there OAuth/SSO support?

### 2.4 Demo Routes

**File to examine:** `api/app/routes/demo.py`

Questions:
1. How are demo users currently created?
2. What's the demo login flow?
3. Is there a `/demo/login` endpoint?
4. How does the demo session work?

---

## INVESTIGATION 3: Frontend Admin Pages

### 3.1 Company Management UI

**Files to examine:** `web/app/(app)/app/admin/companies/`

Questions:
1. Does a companies admin page exist?
2. What can you do on this page?
   - View list of companies?
   - Create new company?
   - Edit company?
   - View company details?
3. What API endpoints does it call?
4. Is it fully functional or placeholder?

### 3.2 User Management UI

**Files to examine:** `web/app/(app)/app/admin/users/` or `web/app/(app)/app/settings/team/`

Questions:
1. Does a users admin page exist?
2. What can you do on this page?
   - View list of users?
   - Create/invite new user?
   - Edit user (change role)?
   - Deactivate user?
3. What API endpoints does it call?
4. Is it scoped to company or global?

### 3.3 Team Settings (Client Side)

**Files to examine:** `web/app/(app)/app/settings/team/page.tsx`

Questions:
1. Does this page exist?
2. Can client_admin invite team members?
3. Can they change roles within their company?
4. What API endpoints does it call?

---

## INVESTIGATION 4: Authentication Flow

### 4.1 Current Login Implementation

**Files to examine:** 
- `web/app/login/page.tsx`
- `web/middleware.ts`
- `web/lib/auth.ts` (if exists)

Questions:
1. How does login currently work?
2. Is it demo-only (cookie-based fake auth)?
3. Is there real authentication?
4. What does the session contain (user id, role, company_id)?
5. How is the session stored (cookie, localStorage)?

### 4.2 Session/Auth State

**File to examine:** `web/middleware.ts`

Questions:
1. How does middleware check authentication?
2. What's in the session cookie?
3. How are roles checked for route access?

### 4.3 API Authentication

**Files to examine:** `api/app/` - look for auth dependencies

Questions:
1. Is there a `get_current_user` dependency?
2. How does the API verify requests?
3. Is there JWT validation?
4. How does demo mode bypass auth?

---

## INVESTIGATION 5: Connections & Data Flow

### 5.1 Company → Users Relationship

Questions:
1. How are users linked to companies?
2. Can a user belong to multiple companies?
3. When a company is created, is an admin user created?

### 5.2 Company → Billing Relationship

Questions:
1. How are invoices linked to companies?
2. Is there a billing contact on company?
3. Is there subscription/tier info on company?

### 5.3 Company → Reports Relationship

Questions:
1. How are reports linked to companies?
2. When listing reports, is it filtered by company?
3. Do FinClear staff see all companies' reports?

### 5.4 User → Reports Relationship

Questions:
1. Is `created_by_user_id` tracked on reports?
2. Is `assigned_to_user_id` tracked?
3. Can you see who filed what?

### 5.5 Role-Based Access

Questions:
1. What can each role do?
   - `coo`: ?
   - `pct_admin` / `finclear_admin`: ?
   - `pct_staff` / `finclear_staff`: ?
   - `client_admin`: ?
   - `client_user`: ?
2. Where is this enforced (frontend, backend, both)?

---

## INVESTIGATION 6: Seed Data & Demo Mode

### 6.1 Current Demo Users

**File to examine:** `api/app/services/demo_seed.py`

Questions:
1. What demo users are created?
2. What are their emails and roles?
3. Which companies do they belong to?
4. How many companies are seeded?

### 6.2 Demo Login Flow

Questions:
1. How does clicking "Login as FinClear Staff" work?
2. What endpoint is called?
3. What session/cookie is set?
4. Can you switch between demo users?

---

## INVESTIGATION 7: What's Missing?

Based on your findings, identify:

### 7.1 API Gaps

| Feature | Exists? | Notes |
|---------|---------|-------|
| Create company | ? | |
| List companies | ? | |
| Update company | ? | |
| Create user | ? | |
| List users (by company) | ? | |
| Update user role | ? | |
| Invite user | ? | |
| Deactivate user | ? | |
| Real authentication | ? | |

### 7.2 Frontend Gaps

| Feature | Exists? | Notes |
|---------|---------|-------|
| Company list page | ? | |
| Company create form | ? | |
| Company detail/edit | ? | |
| User list page | ? | |
| User create/invite form | ? | |
| User role management | ? | |
| Team settings (client) | ? | |

### 7.3 Data Model Gaps

| Feature | Exists? | Notes |
|---------|---------|-------|
| Invitation model | ? | |
| Password hashing | ? | |
| Session/token model | ? | |
| Audit logging | ? | |

---

## OUTPUT FORMAT

Please provide findings in this format:

```markdown
## Company Management Findings

### Model
- File: [path]
- Fields: [list key fields]
- Relationships: [list]

### API Endpoints
| Endpoint | Exists | Functional | Notes |
|----------|--------|------------|-------|
| POST /companies | | | |
| GET /companies | | | |
| ... | | | |

### Frontend
- Page exists: [yes/no]
- Functionality: [description]
- Calls endpoints: [list]

---

## User Management Findings

### Model
- File: [path]
- Fields: [list key fields]
- Role values: [list ALL roles]
- Relationships: [list]

### API Endpoints
| Endpoint | Exists | Functional | Notes |
|----------|--------|------------|-------|
| POST /users | | | |
| GET /users | | | |
| ... | | | |

### Frontend
- Admin page exists: [yes/no]
- Team settings page exists: [yes/no]
- Functionality: [description]

---

## Authentication Findings

### Current Implementation
- Type: [demo-only / real auth / hybrid]
- Session storage: [cookie / JWT / localStorage]
- Password handling: [none / hashed / external]

### Demo Mode
- How it works: [description]
- Users available: [list]

### Gaps
- [list what's missing]

---

## Role-Based Access Findings

### Roles Defined
| Role | Description | Can Access |
|------|-------------|------------|
| coo | | |
| pct_admin | | |
| ... | | |

### Enforcement
- Frontend: [how]
- Backend: [how]

---

## Billing Connection Findings

### Company → Invoice Link
- How linked: [description]
- Fields used: [list]

### User → Billing Link
- created_by tracked: [yes/no]
- billing contact: [yes/no]

---

## Data Flow Summary

### Creating a New Client Company
1. [step 1]
2. [step 2]
...

### Adding a User to Company
1. [step 1]
2. [step 2]
...

### Changing User Role
1. [step 1]
2. [step 2]
...

---

## Recommended Implementation Priority

### P0 - Critical (Needed for Real Users)
1. [item]
2. [item]

### P1 - Important (Needed Soon)
1. [item]
2. [item]

### P2 - Nice to Have
1. [item]
2. [item]

---

## File Locations Quick Reference

| Purpose | File |
|---------|------|
| Company model | |
| User model | |
| Company routes | |
| User routes | |
| Auth routes | |
| Demo routes | |
| Admin companies page | |
| Admin users page | |
| Team settings page | |
| Middleware | |
| Demo seed | |
```

---

## WHY THIS MATTERS

This investigation will tell us:

1. **What exists** - Don't rebuild what's already there
2. **What's functional vs placeholder** - Know what needs wiring vs building
3. **How auth works** - Critical for security
4. **How roles connect** - Determines access control design
5. **Billing integration** - Companies pay invoices
6. **Data isolation** - Each company sees only their data

**This is the foundation for multi-tenant SaaS. Get it right.**

---

**Don't build anything yet - investigate thoroughly and report back.**
