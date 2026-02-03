# Investigation: Company Onboarding, User Management & Billing Setup

**Date:** February 3, 2026  
**26 Days to March 1, 2026 Launch**

---

## Executive Summary

This investigation reveals that **the core company/user onboarding infrastructure exists** but has significant gaps in the end-to-end workflow. Companies can be created, users can be added, and billing settings can be configured—but these are **separate disjointed actions** requiring multiple pages and clicks.

**Key Finding:** There is **no unified company onboarding flow** that guides the COO through a complete setup including billing configuration and first admin user creation.

---

## Part 1: Company Creation — What Exists Today

### 1A: Company Model Schema

**File:** `api/app/models/company.py`

| Field | Type | Default | Required | Set At Creation | Set Later | Notes |
|-------|------|---------|----------|-----------------|-----------|-------|
| `id` | UUID | auto-generated | Yes | ✅ | ❌ | |
| `name` | String(255) | - | Yes | ✅ | ✅ | |
| `code` | String(50) | - | Yes | ✅ | ❌ | Unique, uppercase |
| `company_type` | String(50) | "client" | Yes | ✅ | ❌ | "internal" or "client" |
| `billing_email` | String(255) | NULL | No | ✅ Optional | ✅ | **Critical for invoicing** |
| `billing_contact_name` | String(255) | NULL | No | ✅ Optional | ✅ | |
| `address` | JSONB | NULL | No | ❌ | ✅ | {street, city, state, zip} |
| `phone` | String(50) | NULL | No | ✅ Optional | ✅ | |
| `billing_type` | String(50) | "invoice_only" | Yes | ❌ Server default | ✅ | invoice_only, hybrid, subscription |
| `filing_fee_cents` | Integer | 7500 | Yes | ❌ Server default | ✅ | $75.00 default |
| `payment_terms_days` | Integer | 30 | Yes | ❌ Server default | ✅ | Net 30 default |
| `billing_notes` | Text | NULL | No | ❌ | ✅ | Internal notes |
| `stripe_customer_id` | String(255) | NULL | No | ❌ | ✅ | For hybrid billing |
| `status` | String(50) | "active" | Yes | ✅ (hardcoded active) | ✅ | active, suspended, inactive |
| `settings` | JSONB | {} | No | ❌ Server default | ✅ | |
| `created_at` | DateTime | NOW() | Yes | ✅ | ❌ | |
| `updated_at` | DateTime | NOW() | Yes | ✅ | ✅ | |

**Relationships:**
- `users` → One-to-many with User
- `submission_requests` → One-to-many with SubmissionRequest  
- `reports` → One-to-many with Report
- `billing_events` → One-to-many with BillingEvent
- `invoices` → One-to-many with Invoice

**⚠️ Gaps:**
- `billing_type` is NOT set at creation (uses server default)
- `filing_fee_cents` is NOT set at creation (uses server default)
- No admin user is created with the company

---

### 1B: Company Creation Endpoint

**File:** `api/app/routes/companies.py:249-314`
**Route:** `POST /companies`

**Request Schema (`CompanyCreateRequest`):**
```python
class CompanyCreateRequest(BaseModel):
    name: str                                    # Required
    code: str                                    # Required, unique
    company_type: str = "client"                 # Optional, defaults to "client"
    billing_email: Optional[str] = None          # Optional
    billing_contact_name: Optional[str] = None   # Optional
    address: Optional[AddressSchema] = None      # Optional
    phone: Optional[str] = None                  # Optional
```

**Validation:**
- Code uniqueness check ✅
- company_type validation (internal/client) ✅
- No email format validation ❌
- No required billing_email for client companies ❌

**Side Effects:**
- Audit log: `company.created` ✅
- **No default admin user created** ❌
- **No billing setup required** ❌

**What's MISSING from the API:**
1. `filing_fee_cents` - Not accepted, uses server default $75
2. `payment_terms_days` - Not accepted, uses server default 30
3. `billing_type` - Not accepted, uses server default "invoice_only"
4. No option to create initial admin user

---

### 1C: Company Creation Frontend

**File:** `web/app/(app)/app/admin/companies/page.tsx:394-466`
**Component:** Dialog inside `AdminCompaniesPage`

**Form Fields:**

| Field | Label | Type | Required | Validation |
|-------|-------|------|----------|------------|
| `name` | Company Name * | Text | Yes | Frontend: name exists |
| `code` | Company Code * | Text | Yes | Frontend: code exists, max 10 chars |
| `phone` | Phone | Text | No | None |
| `billing_contact_name` | Billing Contact | Text | No | None |
| `billing_email` | Billing Email | Email | No | HTML5 email type |

**Accessible By:** `coo`, `pct_admin`

**UX Type:** Simple modal dialog (NOT a multi-step wizard)

**⚠️ Critical Gaps:**
1. **No filing fee configuration** - Can't set custom rate at creation
2. **No payment terms** - Can't set Net 15/30/45 at creation
3. **No billing type** - Can't set invoice_only vs hybrid at creation
4. **No address fields** - Address not collected at creation
5. **No "Create admin user" option** - Must navigate to Users page separately
6. **No "Company setup checklist"** - No guidance on what's needed next

---

### 1D: Company List / Management Page

**File:** `web/app/(app)/app/admin/companies/page.tsx`

**Columns Displayed:**
- Company name + billing email
- Code (badge)
- Status (badge)
- User count
- Filing count
- Created date
- Actions dropdown

**Features:**
- ✅ View details (opens side sheet)
- ✅ Suspend/Reactivate status toggle
- ✅ Edit billing settings (inside detail sheet)
- ✅ Search by name/code
- ✅ Filter by status
- ❌ No inline edit
- ❌ No billing stats in list view

**Detail Sheet Shows:**
- Status with toggle
- Stats grid (Users, Filings, Paid $)
- Billing contact info
- **Billing Settings section** (filing fee, payment terms, notes) ✅
- Recent reports

**Accessible By:** `coo`, `pct_admin`

---

## Part 2: User Management — What Exists Today

### 2A: User Model Schema

**File:** `api/app/models/user.py`

| Field | Type | Default | Required | Notes |
|-------|------|---------|----------|-------|
| `id` | UUID | auto-generated | Yes | |
| `email` | String(255) | - | Yes | Unique |
| `name` | String(255) | - | Yes | |
| `company_id` | UUID FK | NULL | No | NULL for internal staff |
| `role` | String(50) | - | Yes | coo, pct_admin, pct_staff, client_admin, client_user |
| `clerk_id` | String(255) | NULL | No | For future Clerk integration |
| `status` | String(50) | "active" | Yes | active, invited, disabled |
| `last_login_at` | DateTime | NULL | No | |
| `settings` | JSONB | {} | No | |
| `created_at` | DateTime | NOW() | Yes | |
| `updated_at` | DateTime | NOW() | Yes | |

**Roles:**
- Internal (no company_id): `coo`, `pct_admin`, `pct_staff`
- Client (has company_id): `client_admin`, `client_user`

**⚠️ Gaps:**
- **No `invited_by` field** - Can't track who invited the user
- **No `invited_at` field** - Can't track when invitation was sent
- **No password/hashed_password field** - Demo mode only (email-based login)
- **No invitation_token field** - No real invitation flow

---

### 2B: User Creation / Invitation Endpoints

**File:** `api/app/routes/users.py`

| Endpoint | Method | Who Can Call | Fields Required | Creates User | Sends Email |
|----------|--------|--------------|-----------------|--------------|-------------|
| `POST /users` | Create | Anyone (no auth) | name, email, role, company_id | Yes (active) | No |
| `POST /users/invite` | Invite | Anyone (no auth) | name, email, role, company_id | Yes (active*) | No |

**Note:** `*` In demo mode, invite creates user directly as "active". In production, would create as "invited" and send email.

**Validation:**
- Role must be valid ✅
- Email uniqueness check ✅
- Client roles require company_id ✅
- Internal roles must NOT have company_id ✅
- Company must exist and be "client" type for invite ✅

**⚠️ Gaps:**
- **No actual email invitation sent** - Placeholder comment only
- **No invitation token generation** - Would need for real invite flow
- **No "set password" page** - Users can't set passwords
- **No invitation expiration** - No concept of invitation lifecycle
- **No resend invitation capability** - No stored invitation to resend

---

### 2C: User Management Frontend

**1. Admin Users Page**  
**File:** `web/app/(app)/app/admin/users/page.tsx`  
**Route:** `/app/admin/users`  
**Accessible By:** `coo`, `pct_admin`

| Feature | Status |
|---------|--------|
| List all users | ✅ |
| Search by name/email | ✅ |
| Filter by status | ✅ |
| Filter by type (internal/client) | ✅ |
| "Invite User" dialog | ✅ |
| Change user role | ✅ |
| Deactivate/Reactivate | ✅ |
| View user detail | ✅ |
| **Reset password** | ❌ N/A (no passwords) |
| **Resend invitation** | ❌ |

**Invite Dialog Fields:**
- Full Name *
- Email Address *
- Company * (dropdown of client companies)
- Role (client_admin or client_user)

---

**2. Team Settings Page (Client Admin)**  
**File:** `web/app/(app)/app/settings/team/page.tsx`  
**Route:** `/app/settings/team`  
**Accessible By:** `client_admin`

| Feature | Status |
|---------|--------|
| List team members | ✅ |
| Stats (total, active, invited) | ✅ |
| "Invite User" button | ✅ |
| Change role (admin ↔ user) | ✅ |
| Remove (deactivate) | ✅ |
| Reactivate | ✅ |
| Role permissions info | ✅ |

**⚠️ Key Finding:** Client admins CAN invite users to their own company! This is good.

---

### 2D: Role Definitions & Permissions

**Roles Defined in:** `api/app/routes/users.py:30-32`

```python
INTERNAL_ROLES = ("coo", "pct_admin", "pct_staff")
CLIENT_ROLES = ("client_admin", "client_user")
ALL_ROLES = INTERNAL_ROLES + CLIENT_ROLES
```

**Permission Enforcement:**
- **Ad-hoc** per endpoint (no centralized middleware)
- Most endpoints currently have **no authentication** (demo mode)
- Role-based navigation handled in `web/lib/navigation.ts`

**Navigation Access:**

| Role | Access |
|------|--------|
| `coo` | Executive dashboard, ALL admin pages, Companies, Users, Billing |
| `pct_admin` | Admin overview, Requests, Companies, Reports, Filings, Billing, Users |
| `pct_staff` | Queue, All Requests, My Reports, Filings |
| `client_admin` | Dashboard, Requests, Reports, Billing, Company Settings, Team |
| `client_user` | Dashboard, Requests, Reports, Profile |

---

## Part 3: Billing Setup During Onboarding

### 3A: When Is Billing Configured?

| Field | When Set | How Set | Can Set at Company Creation? |
|-------|----------|---------|------------------------------|
| `filing_fee_cents` | After creation | Company detail sheet → "Billing Settings" | ❌ No |
| `payment_terms_days` | After creation | Company detail sheet → "Billing Settings" | ❌ No |
| `billing_type` | Never (uses default) | **NOT editable in UI** | ❌ No |
| `billing_email` | At creation (optional) | Company creation dialog | ✅ Yes |
| `billing_contact_name` | At creation (optional) | Company creation dialog | ✅ Yes |

**⚠️ Critical Workflow Gap:**

1. COO creates company (basic info only)
2. COO must then click into company detail sheet
3. COO must then click "Edit" in Billing Settings section
4. COO must manually enter filing fee and payment terms
5. COO must then go to /app/admin/users to invite an admin
6. COO must remember to select the new company from dropdown

**This is 6+ clicks across 2 pages minimum!**

---

### 3B: Admin Billing Rate Management

**File:** `web/app/(app)/app/admin/billing/page.tsx`
**Tab:** "Company Rates"

| Feature | Status |
|---------|--------|
| List all companies with rates | ✅ |
| Edit filing fee | ✅ |
| Edit payment terms | ✅ |
| Edit billing notes | ✅ |
| Edit billing_type | ❌ **NOT IN UI** |
| Bulk edit rates | ❌ |

**Also editable in:** Company detail sheet (inside `/app/admin/companies`)

---

### 3C: Billing Setup Gaps

| Question | Answer |
|----------|--------|
| Can COO create company + set billing in ONE flow? | **❌ No** - Must create, then open detail, then edit billing |
| Is there a company setup checklist? | **❌ No** |
| What if billing_email is empty? | Invoice email will **fail silently** |
| What if filing_fee is default $75? | May not match contract - no warning |
| Can billing_type be changed? | **❌ Not in any UI** - only via API |

---

## Part 4: Company Detail / Settings Page

### 4A: Company Detail Page — Admin Side

**No dedicated company detail PAGE exists.** Instead:
- Company detail is shown in a **side sheet** on the Companies list page
- Sheet includes basic info, stats, billing settings

**Gaps:**
- No dedicated URL for company detail
- Can't deep-link to a specific company
- No company user list (must go to Users page and filter)

---

### 4B: Client-Side Company Settings

**File:** `web/app/(app)/app/settings/company/page.tsx` (referenced in navigation but may not exist)

**Current State:** The navigation shows "Company Settings" for `client_admin` but this page's content was not fully implemented.

**What client_admin can see:**
- Team page (`/app/settings/team`) ✅
- Profile page (`/app/settings/profile`) ✅
- Company Settings page: **Partial/Unknown**

**⚠️ Gap:** Client admins should be able to:
- View their company's billing email
- Update their billing contact info
- View (but not edit) their filing rate
- See their payment terms

---

## Part 5: User Invitation & Onboarding Flow

### 5A: How Does a New User Get Access Today?

**Current Flow (Demo Mode):**

1. **Admin/COO creates user** via `/app/admin/users` → "Invite User"
2. User is created with **status = "active"** immediately
3. **No email is sent** (placeholder only)
4. User can go to `/login` and enter their email
5. Login succeeds if email matches a user record
6. **No password required** in demo mode

**⚠️ This is NOT production-ready!**

---

### 5B: Email Invitation System

**Current State:**

| Component | Status |
|-----------|--------|
| Invitation model/table | ❌ Does not exist |
| Invitation email template | ❌ Does not exist |
| "Set password" page | ❌ Does not exist |
| Invitation link expiration | ❌ N/A |
| Resend invitation | ❌ N/A |

**Related code that DOES exist:**
- `api/app/services/email_service.py` - Has SendGrid integration ✅
- Party invitation emails work ✅
- **User invitation emails** - Not implemented ❌

---

### 5C: Auth System

**Current Implementation:**

| Aspect | Status | Notes |
|--------|--------|-------|
| Login method | Email only (no password) | Demo mode |
| Password hashing | ❌ N/A | No passwords in demo |
| Session management | Cookie-based | `pct_demo_session` cookie, base64 encoded |
| Token duration | 8 hours | |
| Password reset | ❌ Does not exist | |
| Forgot password | ❌ Does not exist | |
| SSO / OAuth | ❌ Not implemented | |
| Clerk integration | Partial | `clerk_id` field exists but not used |

**Auth Files:**
- `web/app/api/auth/login/route.ts` - Demo login endpoint
- `web/app/api/auth/logout/route.ts` - Logout endpoint
- `web/app/login/page.tsx` - Login page with demo account selector

---

## Part 6: Cross-Role Visibility Matrix

### COO (`coo`)

| Capability | Status | How |
|------------|--------|-----|
| Create companies | ✅ | `/app/admin/companies` → "Add Company" |
| Edit company details | ✅ | Company detail sheet |
| Set billing rates | ✅ | Company detail sheet → Billing Settings |
| Create users (any company) | ✅ | `/app/admin/users` → "Invite User" |
| Assign roles | ✅ | User detail |
| Deactivate companies | ✅ | Company detail → Suspend |
| Deactivate users | ✅ | User actions dropdown |

---

### PCT Admin (`pct_admin`)

| Capability | Status | How |
|------------|--------|-----|
| Create companies | ✅ | `/app/admin/companies` → "Add Company" |
| Edit company details | ✅ | Company detail sheet |
| Manage billing | ✅ | `/app/admin/billing` |
| Create/invite users | ✅ | `/app/admin/users` → "Invite User" |
| Assign roles | ✅ | User detail |

---

### PCT Staff (`pct_staff`)

| Capability | Status | How |
|------------|--------|-----|
| See company info | ✅ | On reports/requests |
| Manage companies | ❌ | No access |
| Manage users | ❌ | No access |

---

### Client Admin (`client_admin`)

| Capability | Status | How |
|------------|--------|-----|
| See own company details | Partial | Via Team page |
| Edit company info | ❌ | No dedicated UI |
| Invite users (own company) | ✅ | `/app/settings/team` → "Invite User" |
| Manage user roles | ✅ | Team page |
| View billing | ✅ | `/app/billing` |

---

### Client User (`client_user`)

| Capability | Status | How |
|------------|--------|-----|
| See company info | Limited | Via profile/dashboard |
| Manage anything | ❌ | Read-only access |

---

## Part 7: Demo / Seed Data

### 7A: Demo Companies Created

**File:** `api/app/services/demo_seed.py`

| Company | Code | Type | Users Created |
|---------|------|------|---------------|
| FinClear Solutions | FINCLEAR | internal | COO, Admin, Staff |
| Pacific Coast Title | DEMO | client | Client Admin, Client User |
| Acme Title & Escrow | ACME | client | Admin |

**Billing Settings in Seed:**
- Uses default $75 filing fee (reads from company if set)
- Creates sample invoice for filed report

**Reset Capability:**
- `reset_demo_data()` function exists
- Called via API endpoint (exact route not verified)

---

## CRITICAL GAPS SUMMARY

### 🔴 Blockers (Must Fix Before March 1)

| Gap | Impact | Estimated Effort |
|-----|--------|-----------------|
| **No unified company onboarding flow** | COO must navigate 2+ pages to fully set up a company | 1-2 days |
| **No admin user creation during company creation** | Every new company requires manual user creation | 0.5 day |
| **billing_type not editable in UI** | Can't set hybrid billing for any company | 0.5 day |
| **No real user invitation flow** | Users can't set passwords, no invitation emails | 2-3 days |
| **No authentication** | Demo mode only - anyone can log in with any email | 3-5 days (production auth) |

---

### 🟡 Important (Should Fix Before March 1)

| Gap | Impact | Estimated Effort |
|-----|--------|-----------------|
| **billing_email not required** | Invoice sending will fail | 0.5 day |
| **No company setup checklist** | COO may miss required fields | 1 day |
| **No client company settings page** | Clients can't view/update billing contact | 1 day |
| **No company detail deep-link** | Can't share/bookmark company pages | 0.5 day |
| **No password reset flow** | Users locked out if session expires | 1 day |

---

### 🟢 Nice to Have (Post-Launch)

| Gap | Impact | Estimated Effort |
|-----|--------|-----------------|
| Invitation expiration tracking | Security improvement | 1 day |
| Bulk user import | Onboarding large teams | 2 days |
| SSO / Clerk integration | Enterprise feature | 3-5 days |
| Company onboarding wizard | Better UX | 2-3 days |

---

## Key Questions Answered

### 1. Can the COO onboard a new company end-to-end today?

**Yes, but it's fragmented:**
1. Create company (1 click)
2. Open company detail sheet (1 click)
3. Click "Edit" on Billing Settings (1 click)
4. Save billing settings (1 click)
5. Go to Users page (1 click)
6. Click "Invite User" (1 click)
7. Fill form, select company from dropdown (5+ fields)
8. Save user (1 click)

**Total: ~10+ clicks across 2 pages**

---

### 2. How many clicks / pages does it take?

- **Minimum:** 6-8 clicks
- **Pages visited:** 2 (`/app/admin/companies`, `/app/admin/users`)
- **Forms filled:** 2 (company create, user invite)

---

### 3. What information falls through the cracks?

- `billing_type` - Always defaults to "invoice_only"
- Custom filing fee - Often forgotten, stays at $75
- Address - Not collected at creation
- Company-specific payment terms - Defaults to Net 30

---

### 4. Can client admins invite their own users?

**✅ Yes!** The Team Settings page at `/app/settings/team` allows client admins to:
- View all team members
- Invite new users (client_admin or client_user roles only)
- Promote/demote between admin and user
- Remove (deactivate) users

---

### 5. Is there a "company readiness" check before first filing?

**❌ No.** A company can be created with:
- No billing email
- Default $75 rate (may not match contract)
- No users
- No address

And nothing prevents a request from being submitted.

---

### 6. What does the experience feel like vs what it should feel like?

**Current Experience:**
- Disjointed - multiple pages for one logical workflow
- Easy to forget steps - no checklist or guidance
- No confirmation of setup completion
- "Demo mode" doesn't feel production-ready

**Ideal Experience:**
- Single wizard: "Add New Company"
  - Step 1: Basic Info (name, code, address, phone)
  - Step 2: Billing Setup (filing fee, payment terms, billing type, billing email)
  - Step 3: Create Admin User (name, email)
  - Step 4: Review & Confirm
- Email sent to admin with "Set Password" link
- Company marked as "Onboarding" until admin logs in
- Checklist on company detail page showing setup progress

---

## Appendix: File Inventory

### Backend
- `api/app/models/company.py` - Company model
- `api/app/models/user.py` - User model
- `api/app/routes/companies.py` - Company CRUD + billing settings
- `api/app/routes/users.py` - User CRUD + invite
- `api/app/services/demo_seed.py` - Demo data seeding

### Frontend
- `web/app/(app)/app/admin/companies/page.tsx` - Admin companies page
- `web/app/(app)/app/admin/users/page.tsx` - Admin users page
- `web/app/(app)/app/settings/team/page.tsx` - Client team management
- `web/app/(app)/app/admin/billing/page.tsx` - Admin billing page
- `web/lib/navigation.ts` - Role-based navigation
- `web/app/login/page.tsx` - Demo login page
- `web/app/api/auth/login/route.ts` - Demo login API

---

## Recommended Next Steps

### Immediate (This Week)

1. **Add `billing_type` to company creation dialog**
   - Add dropdown: invoice_only / hybrid
   - Include in API request

2. **Make `billing_email` required for client companies**
   - Frontend validation
   - Backend validation with helpful error message

3. **Add "Create Admin User" checkbox to company creation**
   - Additional fields: Admin Name, Admin Email
   - Auto-create user after company creation

4. **Add billing setup to company creation dialog**
   - Filing fee field with $ prefix
   - Payment terms dropdown (Net 10/15/30/45/60)

### Short Term (Before Launch)

5. **Implement real user invitation flow**
   - Add `invitation_token` and `invitation_expires_at` to User model
   - Send email via SendGrid
   - Create "Set Password" page
   - Invitation acceptance flow

6. **Add company setup checklist**
   - Show on company detail
   - Items: Billing email ✓, Admin user ✓, Custom rate ✓

### Post-Launch

7. **Multi-step company onboarding wizard**
8. **Clerk/Auth0 integration for production auth**
9. **Client company settings page**
