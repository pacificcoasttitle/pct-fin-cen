# CURSOR PROMPT: Investigation — Company Onboarding, User Management & Billing Setup

## Context

We are 26 days from the March 1, 2026 launch. Companies are our paying customers — the entire revenue model depends on properly onboarding them with correct billing configuration, user accounts, and role assignments. The current company creation flow from the COO dashboard appears to be a basic modal that doesn't capture the information we need to actually bill and serve these companies.

We need a complete picture of:
1. How companies are created today
2. What information is collected (and what's missing)
3. How users are added/managed under companies
4. How billing settings are configured per company
5. What every role sees and can do regarding company/user management
6. What the company "lifecycle" looks like from creation to first filing

**DO NOT FIX ANYTHING. INVESTIGATION ONLY.**

---

## PART 1: Company Creation — What Exists Today

### 1A: Company Model — Full Schema

```bash
cat api/app/models/company.py
```

**Document every field:**
- Column name, type, default, nullable
- Which fields are populated at creation vs later?
- Which fields are required vs optional?
- Are there any validation constraints?
- Is there a `status` or `is_active` field?
- Is there a `billing_type` field? (Should be from recent billing work)
- What relationships exist? (users, reports, billing_events, invoices)

### 1B: Company Creation Endpoint

```bash
# Find the endpoint that creates companies
grep -rn "create.*company\|Company(" api/app/routes/ --include="*.py"
grep -rn "POST.*compan" api/app/routes/ --include="*.py"
```

**For the creation endpoint, show:**
- Full route path and method
- Request body schema (what fields are accepted?)
- Validation logic (what's required? what's checked?)
- What defaults are set?
- Is a default admin user created with the company?
- Is there any billing setup during creation?
- What audit events are logged?
- What's the full implementation — every line

### 1C: Company Creation Frontend

```bash
# Find the modal/form that creates companies
grep -rn "create.*company\|CreateCompany\|NewCompany\|AddCompany\|company.*modal\|company.*dialog" web/ --include="*.tsx" --include="*.ts" -l
```

**For each UI component found:**
- What form fields are shown?
- What validation runs on the frontend?
- What API endpoint does it call?
- Is there a multi-step wizard or just a single form?
- Which role(s) can access this? (COO only? Admin too?)
- Show the exact JSX for the form

### 1D: Company List / Management Page

```bash
# Find where companies are listed/managed
grep -rn "companies\|company.*list\|company.*table\|CompanyList\|CompanyTable" web/app/ --include="*.tsx" -l
```

**For each page found:**
- What columns/info is displayed per company?
- Can you edit company details inline?
- Can you view company detail page?
- Is there a "manage" or "settings" action?
- What role can access this page?
- Are billing stats shown per company?

---

## PART 2: User Management — What Exists Today

### 2A: User Model — Full Schema

```bash
cat api/app/models/user.py
```

**Document every field:**
- Column name, type, default, nullable
- Role field — what values are supported?
- How is company association stored? (company_id FK?)
- Is there an `is_active` / `status` field?
- Is there an `invited_by` / `invited_at` field?
- Password handling — hashed? What library?
- What relationships exist?

### 2B: User Creation / Invitation Endpoints

```bash
# Find user creation and invitation endpoints
grep -rn "create.*user\|invite.*user\|User(" api/app/routes/ --include="*.py"
grep -rn "POST.*user\|POST.*invite" api/app/routes/ --include="*.py"
```

**For EACH endpoint that creates or invites users:**
- Full route path and method
- Who can call it? (role restrictions)
- What fields are required?
- Is there an email invitation flow?
- Does it set a temporary password or use an invite link?
- Can you create users for different roles?
- What role assignments are possible?
- Is there company scoping? (admin creates users only for their company?)

### 2C: User Management Frontend

```bash
# Find user management UI
grep -rn "user.*list\|UserList\|manage.*user\|team\|member\|invite" web/app/ --include="*.tsx" -l
grep -rn "user.*table\|UserTable\|TeamTable\|MemberList" web/ --include="*.tsx" -l
```

**For each UI component found:**
- What page is it on?
- What role can access it?
- What user info is displayed?
- Can you invite new users?
- Can you edit user roles?
- Can you deactivate users?
- Can you reset passwords?
- Is there a user detail view?

### 2D: Role Definitions & Permissions

```bash
# Find role definitions
grep -rn "role\|Role\|ROLE\|pct_admin\|pct_staff\|client_admin\|client_user\|coo" api/app/ --include="*.py" | grep -i "role\|permission\|auth"
```

**Document:**
- All role values in the system
- How are permissions enforced? (middleware? decorators? per-endpoint checks?)
- Is there a permissions matrix or is it ad-hoc?
- Can a user have multiple roles?
- What's the role hierarchy?

---

## PART 3: Billing Setup During Onboarding

### 3A: When Is Billing Configured?

Trace the full lifecycle of billing fields on the Company model:

- When is `filing_fee_cents` set? (At company creation? Later via admin?)
- When is `payment_terms_days` set?
- When is `billing_type` set? (If it exists)
- When is `billing_email` set?
- When is `billing_contact_name` set?
- Is there a separate "billing settings" page or is it part of the company form?
- Can the COO set billing during company creation or only after?

### 3B: Admin Billing Rate Management

```bash
# Look at the rates tab from billing page
grep -rn "rates\|rate.*edit\|company.*rate\|billing.*rate\|filing.*fee" web/app/ --include="*.tsx" -l
```

**Document:**
- Where can admin edit per-company billing settings?
- What fields are editable?
- Is `billing_type` editable from the UI?
- Is there validation (e.g., minimum rate, required billing email for hybrid)?

### 3C: Billing Setup Gaps

Answer these questions:
- Can the COO create a company and set billing rate in ONE flow?
- Or does the COO have to: create company → go to billing → find the company → edit rate?
- Is there a "company setup checklist" that ensures billing is configured?
- What happens if a company has no billing_email set and someone tries to send an invoice?
- What happens if filing_fee_cents is still the default $75 — is that intentional or a missed configuration?

---

## PART 4: Company Detail / Settings Page

### 4A: Does a Company Detail Page Exist?

```bash
# Look for company detail/settings pages
grep -rn "company.*detail\|company.*settings\|company.*profile\|CompanyDetail\|CompanySettings\|CompanyProfile" web/app/ --include="*.tsx" -l
find web/app -path "*company*" -name "*.tsx"
find web/app -path "*companies*" -name "*.tsx"
```

**If it exists:**
- What information is shown?
- What's editable?
- Who can access it?
- Does it show billing configuration?
- Does it show user list for that company?
- Does it show filing history/stats?

**If it DOESN'T exist:**
- Document this as a gap — we likely need one

### 4B: Client-Side Company Settings

```bash
# Can the client admin view/edit their own company info?
grep -rn "company.*setting\|organization\|org.*setting\|account.*setting" web/app/ --include="*.tsx" -l
grep -rn "settings\|Settings" web/app/\(app\)/app/ --include="*.tsx" -l
```

**Document:**
- Can client_admin view their company details?
- Can client_admin update company info (address, billing email)?
- Is there an account/organization settings page?

---

## PART 5: User Invitation & Onboarding Flow

### 5A: How Does a New User Get Access?

Trace the complete flow from "company needs a new user" to "user can log in and use the system":

1. Who initiates user creation? (COO? Admin? Client Admin?)
2. What information is required? (name, email, role)
3. Is there an email invitation?
4. How does the user set their password?
5. Is there an onboarding/welcome screen?
6. What happens on first login?

### 5B: Email Invitation System

```bash
# Find invitation-related code
grep -rn "invite\|invitation\|Invite\|Invitation" api/app/ --include="*.py" -l
grep -rn "invite\|invitation" web/ --include="*.tsx" --include="*.ts" -l
```

**Document:**
- Is there an invitation model/table?
- Is there an invitation email template?
- Is there a "set password" page for invited users?
- Do invitation links expire?
- Can you resend invitations?

### 5C: Auth System

```bash
# Find auth/login system
grep -rn "login\|Login\|auth\|Auth\|signup\|SignUp\|register\|Register" api/app/routes/ --include="*.py" -l
grep -rn "login\|Login\|auth\|Auth" web/app/ --include="*.tsx" -l
cat api/app/routes/auth.py  # or wherever auth lives
```

**Document:**
- Login method (email+password? SSO? Magic link?)
- Password hashing library
- Session management (JWT? cookies?)
- Password reset flow
- Is there a "forgot password" flow?

---

## PART 6: Cross-Role Visibility Matrix

For each role, document what they can see and do regarding companies and users:

### COO (`coo`)
- Can create companies? How?
- Can edit company details?
- Can set billing rates?
- Can create users for any company?
- Can assign roles?
- Can deactivate companies?
- Can deactivate users?
- What company management pages exist?

### PCT Admin (`pct_admin`)
- Can create companies?
- Can edit company details?
- Can manage billing?
- Can create/invite users?
- Can assign roles?
- What pages exist?

### PCT Staff (`pct_staff`)
- Can see company info? Where?
- Can manage anything about companies?
- Can manage users?

### Client Admin (`client_admin`)
- Can see their own company details?
- Can edit their company info?
- Can invite users to their company?
- Can manage user roles within their company?
- Can view billing?
- What pages exist?

### Client User (`client_user`)
- Can see company info?
- Can manage anything?
- What's visible?

---

## PART 7: Demo / Seed Data

### 7A: How Are Demo Companies Created?

```bash
# Find seed/demo data
grep -rn "seed\|demo\|sample.*company\|test.*company\|DemoSeed" api/app/ --include="*.py" -l
cat api/app/services/demo_seed.py  # or wherever seed data lives
```

**Document:**
- How many demo companies are created?
- What data is seeded per company?
- What users are created per company?
- What roles do demo users have?
- Are billing settings configured for demo companies?
- Is there a "reset demo data" capability?

---

## OUTPUT FORMAT

### Part 1: Company Creation

```markdown
## Company Creation Findings

### Company Model Schema
| Field | Type | Default | Required | Set At Creation | Set Later |
|-------|------|---------|----------|-----------------|-----------|

### Creation Endpoint
- Path: [method + route]
- File: [path:line]
- Request Schema: [fields accepted]
- Validation: [what's checked]
- Side Effects: [what else happens — default user? audit log?]

### Creation UI
- Component: [file path]
- Form Fields:
  | Field | Label | Type | Required | Validation |
  |-------|-------|------|----------|------------|
- Accessible By: [roles]
- UX Type: [modal / page / wizard]
```

### Part 2: User Management

```markdown
## User Management Findings

### User Model Schema
| Field | Type | Default | Required | Notes |
|-------|------|---------|----------|-------|

### User Creation/Invitation
| Endpoint | Method | Who Can Call | Fields Required | Invitation Flow |
|----------|--------|-------------|-----------------|-----------------|

### User Management UI
| Page | Component | Role Access | Features |
|------|-----------|-------------|----------|
```

### Part 3: Billing Setup

```markdown
## Billing Setup Findings

### Field Configuration Timeline
| Field | When Set | How Set | Default | Editable Where |
|-------|----------|---------|---------|----------------|

### Gaps
- [list gaps in billing setup flow]
```

### Parts 4-7: Use similar structured formats

---

## DELIVERABLE

After completing this investigation, produce a single document:

**`docs/INVESTIGATION_COMPANY_USER_ONBOARDING_FINDINGS.md`**

That contains ALL findings from Parts 1-7 in the formats specified above, plus a final section:

```markdown
## CRITICAL GAPS SUMMARY

### 🔴 Blockers (Must fix before March 1)
| Gap | Impact | Estimated Effort |
|-----|--------|-----------------|

### 🟡 Important (Should fix before March 1)
| Gap | Impact | Estimated Effort |
|-----|--------|-----------------|

### 🟢 Nice to Have (Post-launch)
| Gap | Impact | Estimated Effort |
|-----|--------|-----------------|
```

### Key Questions to Answer in Summary

1. **Can the COO onboard a new company end-to-end today?** (Create company → set billing → add users → company can submit first request)
2. **How many clicks / pages does it take?**
3. **What information falls through the cracks?** (billing_type? billing_email? filing rate?)
4. **Can client admins invite their own users?**
5. **Is there a "company readiness" check before the first filing?**
6. **What does the experience feel like vs what it should feel like?**

---

## DO NOT FIX ANYTHING. INVESTIGATION ONLY.

We need the full picture before we design the proper onboarding flow.
