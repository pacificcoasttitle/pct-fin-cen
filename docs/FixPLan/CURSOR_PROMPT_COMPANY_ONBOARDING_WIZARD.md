# CURSOR PROMPT: Company Onboarding Enhancement — Multi-Step Creation Wizard

## Context

We are 26 days from the March 1, 2026 launch. The investigation (`docs/INVESTIGATION_COMPANY_USER_ONBOARDING_FINDINGS.md`) revealed that company creation is a basic 5-field modal that captures almost nothing needed to actually serve a company. The COO has to visit 2+ pages and 6+ clicks to finish setting up a single company. Critical fields like `billing_type`, `filing_fee_cents`, and `payment_terms_days` are either not editable in any UI or require navigating to separate pages after creation.

This prompt replaces the simple creation modal with a **multi-step onboarding wizard** and closes every gap identified in the investigation.

### What This Prompt Covers

| # | What | Why It Matters |
|---|------|---------------|
| 1 | Multi-step company creation wizard (frontend) | One flow, everything captured |
| 2 | Expanded company creation API | Accept all billing + admin user fields |
| 3 | `billing_type` visible and editable everywhere | Currently invisible — blocks Stripe integration |
| 4 | `billing_email` required for client companies | Invoice sending fails without it |
| 5 | Company readiness checklist | COO knows what's missing at a glance |
| 6 | Company detail page (dedicated route) | Deep-linkable, not just a side sheet |
| 7 | billing_type in rates tab + company detail sheet | Currently missing from both |
| 8 | Client company settings page | Clients can view their own company info |
| 9 | KilledSharks documentation | Shark #54 |

### What This Prompt Does NOT Cover

- ❌ Production auth / passwords / Clerk integration (separate prompt)
- ❌ Stripe card collection during onboarding (handled by Stripe prompt, wired later)
- ❌ User invitation email flow (separate prompt — requires auth system first)
- ❌ SSO / OAuth (post-launch)

---

## INVESTIGATION REFERENCE

These are confirmed findings from the investigation. Do NOT re-investigate — use these as ground truth.

**Backend Files:**
- Company model: `api/app/models/company.py`
- User model: `api/app/models/user.py`
- Company routes: `api/app/routes/companies.py` (creation endpoint at lines ~249-314)
- User routes: `api/app/routes/users.py` (POST /users, POST /users/invite)
- Billing routes: `api/app/routes/billing.py`
- Demo seed: `api/app/services/demo_seed.py`
- Email service: `api/app/services/email_service.py` (SendGrid integration exists)

**Frontend Files:**
- Company list + creation modal: `web/app/(app)/app/admin/companies/page.tsx` (modal at lines ~394-466)
- Admin users page: `web/app/(app)/app/admin/users/page.tsx`
- Admin billing page: `web/app/(app)/app/admin/billing/page.tsx`
- Client team settings: `web/app/(app)/app/settings/team/page.tsx`
- Navigation: `web/lib/navigation.ts`

**Current Company Creation Schema (what exists):**
```python
class CompanyCreateRequest(BaseModel):
    name: str
    code: str
    company_type: str = "client"
    billing_email: Optional[str] = None
    billing_contact_name: Optional[str] = None
    address: Optional[AddressSchema] = None
    phone: Optional[str] = None
```

**What's MISSING from the API:** `filing_fee_cents`, `payment_terms_days`, `billing_type`, initial admin user creation.

**What's MISSING from the UI:** `billing_type` is not editable anywhere. Not in company creation, not in company detail sheet, not in billing rates tab.

---

## PART 1: BACKEND — Expand Company Creation API

### 1A: Update CompanyCreateRequest Schema

**File:** `api/app/routes/companies.py`

Find the `CompanyCreateRequest` Pydantic model and expand it:

```python
class CompanyCreateRequest(BaseModel):
    # === Step 1: Company Info (existing fields, some now required) ===
    name: str                                          # Required
    code: str                                          # Required, unique, uppercase
    company_type: str = "client"                       # "internal" or "client"
    phone: Optional[str] = None
    address: Optional[AddressSchema] = None            # {street, city, state, zip}

    # === Step 2: Billing Configuration (NEW — all required for client companies) ===
    billing_email: Optional[str] = None                # REQUIRED if company_type == "client"
    billing_contact_name: Optional[str] = None
    billing_type: str = "invoice_only"                 # "invoice_only" or "hybrid"
    filing_fee_cents: int = 7500                       # Default $75.00
    payment_terms_days: int = 30                       # Default Net 30
    billing_notes: Optional[str] = None

    # === Step 3: Initial Admin User (NEW — optional but strongly encouraged) ===
    create_admin_user: bool = False                     # If true, create first admin user
    admin_user_name: Optional[str] = None              # Required if create_admin_user=True
    admin_user_email: Optional[str] = None             # Required if create_admin_user=True
```

### 1B: Update Company Creation Endpoint

**File:** `api/app/routes/companies.py` — the `POST /companies` handler (lines ~249-314)

Update the handler to:

1. **Validate billing_email is present for client companies:**
```python
if req.company_type == "client" and not req.billing_email:
    raise HTTPException(
        status_code=422,
        detail="billing_email is required for client companies"
    )
```

2. **Validate billing_type:**
```python
VALID_BILLING_TYPES = ("invoice_only", "hybrid")
if req.billing_type not in VALID_BILLING_TYPES:
    raise HTTPException(
        status_code=422,
        detail=f"billing_type must be one of: {', '.join(VALID_BILLING_TYPES)}"
    )
```

3. **Validate billing_email format:**
```python
import re
if req.billing_email and not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", req.billing_email):
    raise HTTPException(status_code=422, detail="Invalid billing email format")
```

4. **Validate filing_fee_cents range:**
```python
if req.filing_fee_cents < 0 or req.filing_fee_cents > 100000:  # $0 to $1000
    raise HTTPException(status_code=422, detail="filing_fee_cents must be between 0 and 100000")
```

5. **Validate payment_terms_days:**
```python
VALID_PAYMENT_TERMS = (10, 15, 30, 45, 60)
if req.payment_terms_days not in VALID_PAYMENT_TERMS:
    raise HTTPException(
        status_code=422,
        detail=f"payment_terms_days must be one of: {', '.join(str(d) for d in VALID_PAYMENT_TERMS)}"
    )
```

6. **Validate admin user fields if create_admin_user=True:**
```python
if req.create_admin_user:
    if not req.admin_user_name or not req.admin_user_name.strip():
        raise HTTPException(status_code=422, detail="admin_user_name required when create_admin_user is true")
    if not req.admin_user_email or not req.admin_user_email.strip():
        raise HTTPException(status_code=422, detail="admin_user_email required when create_admin_user is true")
    if req.admin_user_email and not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", req.admin_user_email):
        raise HTTPException(status_code=422, detail="Invalid admin user email format")
    # Check email uniqueness
    existing_user = db.query(User).filter(User.email == req.admin_user_email.lower().strip()).first()
    if existing_user:
        raise HTTPException(status_code=409, detail=f"A user with email {req.admin_user_email} already exists")
```

7. **Set ALL billing fields on the new company:**
```python
company = Company(
    name=req.name.strip(),
    code=req.code.strip().upper(),
    company_type=req.company_type,
    billing_email=req.billing_email.strip() if req.billing_email else None,
    billing_contact_name=req.billing_contact_name.strip() if req.billing_contact_name else None,
    phone=req.phone.strip() if req.phone else None,
    address=req.address.dict() if req.address else None,
    billing_type=req.billing_type,
    filing_fee_cents=req.filing_fee_cents,
    payment_terms_days=req.payment_terms_days,
    billing_notes=req.billing_notes,
    status="active",
)
```

8. **Create admin user if requested (AFTER company is saved to get company.id):**
```python
admin_user = None
if req.create_admin_user and req.company_type == "client":
    admin_user = User(
        name=req.admin_user_name.strip(),
        email=req.admin_user_email.lower().strip(),
        role="client_admin",
        company_id=company.id,
        status="active",  # In demo mode. When auth is added, this becomes "invited"
    )
    db.add(admin_user)
    db.flush()

    # Audit log for user creation
    # log_audit(db, "user.created", user_id=admin_user.id, details={
    #     "created_during": "company_onboarding",
    #     "company_id": str(company.id),
    #     "role": "client_admin",
    # })
```

9. **Return expanded response:**
```python
return {
    "id": str(company.id),
    "name": company.name,
    "code": company.code,
    "status": company.status,
    "billing_type": company.billing_type,
    "filing_fee_cents": company.filing_fee_cents,
    "payment_terms_days": company.payment_terms_days,
    "admin_user_created": admin_user is not None,
    "admin_user_email": admin_user.email if admin_user else None,
}
```

### 1C: Add billing_type to Company Update Endpoint

**File:** `api/app/routes/companies.py`

Find the PATCH/PUT endpoint for updating companies. Ensure `billing_type` is an accepted field. If there's a `CompanyUpdateRequest` schema, add:

```python
billing_type: Optional[str] = None  # "invoice_only" or "hybrid"
```

And validate it the same way as in creation. This is critical — even if companies are created with the right billing_type, admins need to be able to change it later.

### 1D: Add billing_type to Billing Rates Endpoint

**File:** `api/app/routes/billing.py`

Find the `PATCH /billing/admin/rates/{id}` endpoint. Ensure it accepts `billing_type` as an editable field:

```python
# In the rate update schema (however it's defined):
billing_type: Optional[str] = None  # Add this field
```

Validate the same way. When billing_type changes to "hybrid", log an audit event: `company.billing_type_changed`.

---

## PART 2: FRONTEND — Multi-Step Company Creation Wizard

### 2A: Replace the Simple Modal

**File:** `web/app/(app)/app/admin/companies/page.tsx`

Replace the existing simple creation dialog (lines ~394-466) with a **multi-step wizard dialog**. Keep it as a Dialog (not a full page) — but with step navigation inside it.

**Wizard Structure:**

```
┌─────────────────────────────────────────────────────────┐
│  Add New Company                              Step 1/4  │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  ● Company Info  ○ Billing  ○ Admin User  ○ Review     │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │                                                  │   │
│  │  Step content here                               │   │
│  │                                                  │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│                           [Cancel]  [Back]  [Next →]    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Step 1: Company Information

```
Company Name *          [________________________]
Company Code *          [________] (auto-generated from name, editable, max 10, uppercase)
Phone                   [________________________]

Company Address
  Street                [________________________]
  City                  [________________________]
  State                 [____] (dropdown of US states)
  ZIP                   [__________]
```

**Behavior:**
- When the user types in Company Name, auto-generate a suggested Company Code:
  - "Pacific Coast Title" → "PCTITLE"
  - "Acme Title & Escrow" → "ACMETITLE"
  - Take first letters of each word, uppercase, max 10 chars
  - User can override the suggestion
- Code field should show uppercase-only and strip special characters
- Name and Code are required. Address and Phone are optional but encouraged.
- "Next" button validates: name and code are filled

### Step 2: Billing Configuration

```
Billing Type *          (●) Invoice Only    ( ) Hybrid
                        ┌──────────────────────────────────────┐
                        │ ℹ️ Invoice Only: Invoices sent on    │
                        │ your terms. No card required.         │
                        │                                       │
                        │ Hybrid: Invoice sent with Net terms.  │
                        │ Card on file auto-charged if unpaid.  │
                        └──────────────────────────────────────┘

Filing Fee *            $ [75.00_____]
                        Per-filing charge for this company

Payment Terms *         [Net 30 ▼]
                        (Options: Net 10, Net 15, Net 30, Net 45, Net 60)

Billing Email *         [________________________]
                        Invoices will be sent to this address

Billing Contact         [________________________]
                        Name of billing contact at this company

Billing Notes           [________________________]
                        Internal notes (not visible to client)
```

**Behavior:**
- When "Hybrid" is selected, show an info box:
  ```
  ⚠️ Hybrid billing requires the client to add a card on file.
  After the company is created, the client admin will be prompted
  to add a card from their Billing page.
  ```
- When "Hybrid" is selected, payment terms defaults change to Net 10 (auto-switch, but user can override)
- Filing fee input: display as dollars with 2 decimal places, store as cents internally
  - Input: "75.00" → stored as 7500
  - Input: "125.50" → stored as 12550
  - Validate: must be >= 0 and <= 1000.00
- Billing Email is REQUIRED (red asterisk, cannot proceed without it)
- "Next" button validates: billing_email filled, filing_fee valid, payment_terms selected

### Step 3: Initial Admin User (Optional but Encouraged)

```
┌──────────────────────────────────────────────────────────┐
│ ℹ️ Create the first admin user for this company.         │
│ This person will be able to submit filing requests,      │
│ manage their team, and view billing.                     │
│                                                          │
│ You can skip this and create users later from the        │
│ Users page.                                              │
└──────────────────────────────────────────────────────────┘

[✓] Create admin user now

  Admin Name *          [________________________]
  Admin Email *         [________________________]

  Role: Client Administrator (automatic — first user is always admin)
```

**Behavior:**
- Checkbox "Create admin user now" — checked by default
- If unchecked, name and email fields hide and step shows:
  ```
  ℹ️ You can invite users later from Admin → Users.
  ```
- If checked, name and email are required
- Email validation: proper format, will check uniqueness on submit
- Show note: "In demo mode, this user can log in immediately. When production auth is enabled, an invitation email will be sent."
- "Next" button validates: if checkbox checked, name and email filled

### Step 4: Review & Confirm

```
┌─────────────────────────────────────────────────────────┐
│  Review Company Setup                                    │
│  ─────────────────────────────────────────────────────  │
│                                                          │
│  COMPANY INFO                              [Edit →]      │
│  Name:       Pacific Coast Title                         │
│  Code:       PCTITLE                                     │
│  Phone:      (555) 123-4567                              │
│  Address:    123 Main St, San Diego, CA 92101            │
│                                                          │
│  BILLING                                   [Edit →]      │
│  Type:       Hybrid                                      │
│  Filing Fee: $75.00 per filing                           │
│  Terms:      Net 10                                      │
│  Email:      billing@pctitle.com                         │
│  Contact:    Jane Smith                                  │
│                                                          │
│  ADMIN USER                                [Edit →]      │
│  Name:       John Doe                                    │
│  Email:      john@pctitle.com                            │
│  Role:       Client Administrator                        │
│                                                          │
│  ──────────────────────────────────────────────────────  │
│                                                          │
│  ⚠️ Hybrid billing: Client admin will need to add       │
│  a card on file from their Billing page.                 │
│                                                          │
└─────────────────────────────────────────────────────────┘

                                    [Cancel]  [Back]  [Create Company ✓]
```

**Behavior:**
- Each section has an "Edit" link that jumps back to that step
- "Create Company" button is primary/green — submits everything in one API call
- On success:
  - Close dialog
  - Refresh companies list
  - Show success toast:
    - "Pacific Coast Title created successfully! Admin user john@pctitle.com can now log in."
    - OR if no admin user: "Pacific Coast Title created successfully!"
  - If billing_type is "hybrid", show additional toast:
    - "Reminder: Client admin will need to add a card on file for hybrid billing."
- On error:
  - Show error inline (code already exists, email already exists, etc.)
  - Stay on review step
  - Highlight the section that has the error

### 2B: State Management

Use React state for the wizard. Do NOT use localStorage (not supported in artifacts, and not needed here — this is a simple form flow).

```tsx
// Wizard state
const [step, setStep] = useState(1);
const TOTAL_STEPS = 4;

// Step 1: Company Info
const [companyName, setCompanyName] = useState("");
const [companyCode, setCompanyCode] = useState("");
const [phone, setPhone] = useState("");
const [address, setAddress] = useState({ street: "", city: "", state: "", zip: "" });

// Step 2: Billing
const [billingType, setBillingType] = useState("invoice_only");
const [filingFeeDollars, setFilingFeeDollars] = useState("75.00");
const [paymentTermsDays, setPaymentTermsDays] = useState(30);
const [billingEmail, setBillingEmail] = useState("");
const [billingContactName, setBillingContactName] = useState("");
const [billingNotes, setBillingNotes] = useState("");

// Step 3: Admin User
const [createAdminUser, setCreateAdminUser] = useState(true);
const [adminName, setAdminName] = useState("");
const [adminEmail, setAdminEmail] = useState("");

// Submission
const [isSubmitting, setIsSubmitting] = useState(false);
const [errors, setErrors] = useState<Record<string, string>>({});
```

### 2C: Auto-Generate Company Code

```tsx
function generateCode(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9\s]/g, "")  // Remove special chars
    .split(/\s+/)                       // Split on whitespace
    .map(word => word.charAt(0).toUpperCase())  // First letter of each word
    .join("")
    .slice(0, 10);                      // Max 10 chars
}

// Alternative: use first word if short enough
function generateCode(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9\s]/g, "").trim().toUpperCase();
  // If name is one word and <= 10 chars, use it
  if (!cleaned.includes(" ") && cleaned.length <= 10) return cleaned;
  // Otherwise, take significant words
  const words = cleaned.split(/\s+/).filter(w => !["AND", "THE", "OF", "LLC", "INC", "CORP"].includes(w));
  const code = words.map(w => w.slice(0, Math.ceil(10 / words.length))).join("").slice(0, 10);
  return code || cleaned.slice(0, 10);
}
```

When `companyName` changes and the user hasn't manually edited the code field, auto-update `companyCode`. Use a `codeManuallyEdited` boolean ref to track this.

### 2D: Fee Input Handling

The filing fee is stored in cents but displayed in dollars:

```tsx
// Display as dollars, store as string for the input
const [filingFeeDollars, setFilingFeeDollars] = useState("75.00");

// Convert to cents for API
const filingFeeCents = Math.round(parseFloat(filingFeeDollars) * 100);

// Input handler — allow only valid dollar amounts
function handleFeeChange(value: string) {
  // Allow digits and one decimal point
  const cleaned = value.replace(/[^0-9.]/g, "");
  // Max one decimal point, max 2 decimal places
  const parts = cleaned.split(".");
  if (parts.length > 2) return;
  if (parts[1] && parts[1].length > 2) return;
  setFilingFeeDollars(cleaned);
}
```

### 2E: Submit Handler

```tsx
async function handleSubmit() {
  setIsSubmitting(true);
  setErrors({});

  const filingFeeCents = Math.round(parseFloat(filingFeeDollars) * 100);

  const payload = {
    name: companyName.trim(),
    code: companyCode.trim().toUpperCase(),
    company_type: "client",
    phone: phone.trim() || null,
    address: (address.street || address.city) ? address : null,
    billing_type: billingType,
    filing_fee_cents: filingFeeCents,
    payment_terms_days: paymentTermsDays,
    billing_email: billingEmail.trim(),
    billing_contact_name: billingContactName.trim() || null,
    billing_notes: billingNotes.trim() || null,
    create_admin_user: createAdminUser,
    admin_user_name: createAdminUser ? adminName.trim() : null,
    admin_user_email: createAdminUser ? adminEmail.trim().toLowerCase() : null,
  };

  try {
    const res = await fetch("/api/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json();
      // Map error to the right step
      setErrors({ submit: data.detail || "Failed to create company" });
      return;
    }

    const data = await res.json();

    // Success! Close dialog and refresh
    onClose();
    refreshCompanies();

    // Show success toast
    toast.success(
      createAdminUser
        ? `${companyName} created! Admin user ${adminEmail} can now log in.`
        : `${companyName} created successfully!`
    );

    // Hybrid reminder
    if (billingType === "hybrid") {
      toast.info("Reminder: Client admin will need to add a card on file for hybrid billing.", {
        duration: 8000,
      });
    }
  } catch (err) {
    setErrors({ submit: "Network error. Please try again." });
  } finally {
    setIsSubmitting(false);
  }
}
```

### 2F: Reset State on Dialog Close

When the dialog closes (cancel or success), reset ALL wizard state back to defaults so the next "Add Company" starts fresh:

```tsx
function resetWizard() {
  setStep(1);
  setCompanyName("");
  setCompanyCode("");
  setPhone("");
  setAddress({ street: "", city: "", state: "", zip: "" });
  setBillingType("invoice_only");
  setFilingFeeDollars("75.00");
  setPaymentTermsDays(30);
  setBillingEmail("");
  setBillingContactName("");
  setBillingNotes("");
  setCreateAdminUser(true);
  setAdminName("");
  setAdminEmail("");
  setErrors({});
  setIsSubmitting(false);
}
```

---

## PART 3: BILLING_TYPE VISIBILITY — Fix It Everywhere

This is the single most important gap. `billing_type` exists in the database but is invisible in the UI. Fix it in ALL of these places:

### 3A: Company Detail Sheet — Add billing_type

**File:** `web/app/(app)/app/admin/companies/page.tsx`

Find the company detail side sheet (the one that opens when you click a company). Find the "Billing Settings" section. It currently shows filing fee, payment terms, and notes. Add `billing_type` as the FIRST field in that section:

```
Billing Settings                              [Edit]

Billing Type:     Hybrid                      ← NEW
Filing Fee:       $75.00 per filing
Payment Terms:    Net 10
Billing Notes:    Premium client, volume discount
```

In the edit mode for billing settings, add a billing_type selector:

```
Billing Type      (●) Invoice Only  ( ) Hybrid    ← NEW
Filing Fee        $ [75.00]
Payment Terms     [Net 10 ▼]
Billing Notes     [________________________]
```

**When billing_type is changed to "hybrid"**, show a warning:
```
⚠️ Hybrid billing requires the client to have a card on file.
If they don't have one yet, they'll be prompted on their Billing page.
```

Make sure the PATCH/PUT call to update the company includes `billing_type`.

### 3B: Billing Rates Tab — Add billing_type Column

**File:** `web/app/(app)/app/admin/billing/page.tsx`

Find the "Company Rates" tab. It currently shows a table with columns like: Company, Rate, Terms, Actions.

Add a **Billing Type** column:

| Company | Billing Type | Rate | Terms | Actions |
|---------|-------------|------|-------|---------|
| Pacific Coast Title | `Hybrid` | $75.00 | Net 10 | Edit |
| Acme Title & Escrow | `Invoice Only` | $60.00 | Net 30 | Edit |

**Billing Type display:**
- `invoice_only` → Badge: "Invoice Only" (neutral/gray)
- `hybrid` → Badge: "Hybrid" (blue)

In the **rate edit dialog/form**, add billing_type as an editable field:

```
Billing Type      (●) Invoice Only  ( ) Hybrid
Filing Fee        $ [75.00]
Payment Terms     [Net 30 ▼]
Billing Notes     [________________________]
```

Make sure the PATCH call to update rates includes `billing_type`.

### 3C: Company List Table — Add billing_type Indicator

**File:** `web/app/(app)/app/admin/companies/page.tsx`

In the companies list table, add a small billing type badge next to the company name or as a separate column:

| Company | Code | Status | Billing | Users | Filings | Created |
|---------|------|--------|---------|-------|---------|---------|
| Pacific Coast Title | PCT | ✅ Active | Hybrid | 3 | 12 | Jan 15 |
| Acme Title | ACME | ✅ Active | Invoice | 1 | 5 | Jan 20 |

Use small, subtle badges. "Hybrid" in blue, "Invoice" in gray.

---

## PART 4: COMPANY READINESS CHECKLIST

### 4A: Backend — Readiness Endpoint

**Add to `api/app/routes/companies.py`:**

```python
@router.get("/companies/{company_id}/readiness")
async def get_company_readiness(company_id: str, current_user = Depends(require_pct_admin_or_coo)):
    """
    Return a checklist of what's configured for this company.
    Used to show setup progress on company detail.
    """
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404)

    users = db.query(User).filter(User.company_id == company.id, User.status == "active").all()
    admin_users = [u for u in users if u.role == "client_admin"]
    has_filings = db.query(Report).filter(Report.company_id == company.id).count() > 0

    checks = [
        {
            "key": "billing_email",
            "label": "Billing email configured",
            "passed": bool(company.billing_email),
            "detail": company.billing_email or "Not set",
        },
        {
            "key": "billing_type_set",
            "label": "Billing type confirmed",
            "passed": company.billing_type is not None,
            "detail": company.billing_type or "Not set",
        },
        {
            "key": "filing_fee_configured",
            "label": "Filing fee set",
            "passed": company.filing_fee_cents is not None,
            "detail": f"${company.filing_fee_cents / 100:.2f}" if company.filing_fee_cents else "Default $75.00",
        },
        {
            "key": "admin_user",
            "label": "Admin user created",
            "passed": len(admin_users) > 0,
            "detail": f"{len(admin_users)} admin(s): {', '.join(u.email for u in admin_users)}" if admin_users else "No admin user",
        },
        {
            "key": "any_user",
            "label": "At least one active user",
            "passed": len(users) > 0,
            "detail": f"{len(users)} active user(s)" if users else "No users",
        },
        {
            "key": "address",
            "label": "Company address set",
            "passed": bool(company.address and company.address.get("street")),
            "detail": "Set" if company.address and company.address.get("street") else "Not set",
        },
        {
            "key": "card_on_file",
            "label": "Card on file (hybrid only)",
            "passed": company.billing_type != "hybrid" or bool(company.stripe_payment_method_id),
            "detail": "N/A" if company.billing_type != "hybrid" else ("Card on file" if company.stripe_payment_method_id else "⚠️ No card — required for hybrid"),
            "required": company.billing_type == "hybrid",
        },
    ]

    all_required_passed = all(c["passed"] for c in checks if c.get("required", True) and c["key"] != "card_on_file")
    # card_on_file is a soft requirement — company can function without it, but auto-charge won't work

    return {
        "company_id": str(company.id),
        "ready": all_required_passed,
        "checks": checks,
        "has_filings": has_filings,
    }
```

### 4B: Frontend — Readiness Checklist Component

**Create:** `web/components/CompanyReadinessChecklist.tsx`

A reusable component that displays the readiness checklist. Used in:
1. Company detail sheet (side sheet on companies page)
2. Dedicated company detail page (Part 5)
3. Optionally: after creating a company (success state)

```tsx
/**
 * CompanyReadinessChecklist
 *
 * Displays a checklist of company setup progress.
 * Fetches from GET /companies/{id}/readiness
 *
 * Visual:
 * ┌─────────────────────────────────────────┐
 * │ Setup Progress                    4/6   │
 * │ ■■■■■■■■■■■■■□□□□□□  67%               │
 * │                                         │
 * │ ✅ Billing email configured              │
 * │ ✅ Billing type confirmed                │
 * │ ✅ Filing fee set ($75.00)               │
 * │ ✅ Admin user created                    │
 * │ ❌ Company address not set               │
 * │ ⚠️ No card on file (required for hybrid)│
 * └─────────────────────────────────────────┘
 */
```

**Props:**
```tsx
interface CompanyReadinessChecklistProps {
  companyId: string;
  compact?: boolean;  // Smaller version for side sheet
}
```

**Add this component to the company detail sheet** in `web/app/(app)/app/admin/companies/page.tsx`, placed prominently near the top (above or below the stats grid).

---

## PART 5: DEDICATED COMPANY DETAIL PAGE

### 5A: Create Company Detail Route

**Create:** `web/app/(app)/app/admin/companies/[id]/page.tsx`

This is a dedicated page (not just a side sheet) that provides a full view of a company.

**Layout:**

```
┌─────────────────────────────────────────────────────────────┐
│ ← Back to Companies                                         │
│                                                              │
│ Pacific Coast Title                        [Edit] [Suspend] │
│ Code: PCTITLE  |  Status: ✅ Active  |  Since: Jan 15, 2026│
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│ │  5 Users     │  │  12 Filings  │  │  $900 Billed │       │
│ │  3 active    │  │  10 filed    │  │  $675 paid   │       │
│ └──────────────┘  └──────────────┘  └──────────────┘       │
│                                                              │
│ [Setup Progress]  [Billing]  [Users]  [Activity]            │
│                                                              │
│ ┌─ Setup Progress ─────────────────────────────────────┐    │
│ │ CompanyReadinessChecklist component                   │    │
│ └──────────────────────────────────────────────────────┘    │
│                                                              │
│ ┌─ Billing Configuration ──────────────────────────────┐    │
│ │ Billing Type:    Hybrid                    [Edit]     │    │
│ │ Filing Fee:      $75.00 per filing                    │    │
│ │ Payment Terms:   Net 10                               │    │
│ │ Billing Email:   billing@pctitle.com                  │    │
│ │ Billing Contact: Jane Smith                           │    │
│ │ Card on File:    ✅ Visa •••• 4242                    │    │
│ └──────────────────────────────────────────────────────┘    │
│                                                              │
│ ┌─ Users ──────────────────────────────────────────────┐    │
│ │ Name           Email              Role       Status   │    │
│ │ John Doe       john@pct.com       Admin      Active   │    │
│ │ Jane Smith     jane@pct.com       User       Active   │    │
│ │                                                       │    │
│ │ [+ Invite User]                                       │    │
│ └──────────────────────────────────────────────────────┘    │
│                                                              │
│ ┌─ Recent Activity ────────────────────────────────────┐    │
│ │ Recent reports, filings, billing events              │    │
│ └──────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Data Sources:**
- Company info: `GET /companies/{id}`
- Readiness: `GET /companies/{id}/readiness`
- Users: `GET /users?company_id={id}` (or however users are filtered)
- Billing: Company object includes billing fields
- Activity: `GET /billing/admin/events?company_id={id}` (if endpoint supports filtering)

**Features:**
- Deep-linkable: `/app/admin/companies/{id}`
- All company info in one view
- Inline editing for billing settings
- User list with invite button (opens invite dialog pre-filled with this company)
- Readiness checklist prominently displayed
- Link back to companies list

**Accessible By:** `coo`, `pct_admin`

### 5B: Link From Companies List

In the companies list table, make the company name a clickable link to `/app/admin/companies/{id}`. The existing side sheet can remain as a quick-view, but clicking the company name (or a "View Details" action) navigates to the full page.

### 5C: Backend — Company Detail Endpoint

Verify that `GET /companies/{id}` exists and returns ALL fields including billing fields, user count, filing count. If it doesn't return enough data, expand it:

```python
@router.get("/companies/{company_id}")
async def get_company_detail(company_id: str):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404)

    user_count = db.query(User).filter(User.company_id == company.id, User.status != "disabled").count()
    admin_count = db.query(User).filter(User.company_id == company.id, User.role == "client_admin", User.status != "disabled").count()
    filing_count = db.query(Report).filter(Report.company_id == company.id).count()

    return {
        "id": str(company.id),
        "name": company.name,
        "code": company.code,
        "company_type": company.company_type,
        "status": company.status,
        "phone": company.phone,
        "address": company.address,
        "billing_email": company.billing_email,
        "billing_contact_name": company.billing_contact_name,
        "billing_type": company.billing_type,
        "filing_fee_cents": company.filing_fee_cents,
        "payment_terms_days": company.payment_terms_days,
        "billing_notes": company.billing_notes,
        "stripe_customer_id": company.stripe_customer_id,
        "stripe_payment_method_id": company.stripe_payment_method_id,  # For card-on-file status
        "user_count": user_count,
        "admin_count": admin_count,
        "filing_count": filing_count,
        "created_at": company.created_at.isoformat(),
    }
```

### 5D: Backend — Users by Company Endpoint

Ensure there's a way to get users for a specific company:

```python
@router.get("/companies/{company_id}/users")
async def get_company_users(company_id: str, current_user = Depends(require_pct_admin_or_coo)):
    users = db.query(User).filter(User.company_id == company_id).order_by(User.created_at.desc()).all()
    return [
        {
            "id": str(u.id),
            "name": u.name,
            "email": u.email,
            "role": u.role,
            "status": u.status,
            "last_login_at": u.last_login_at.isoformat() if u.last_login_at else None,
            "created_at": u.created_at.isoformat(),
        }
        for u in users
    ]
```

---

## PART 6: CLIENT COMPANY SETTINGS PAGE

### 6A: Create Client Company Settings Page

**Create:** `web/app/(app)/app/settings/company/page.tsx`

(The investigation noted this page is referenced in navigation but may not be fully implemented.)

**Layout:**

```
┌─────────────────────────────────────────────────────────────┐
│ Company Settings                                             │
│                                                              │
│ ┌─ Company Information ────────────────────────────────┐    │
│ │ Company Name:     Pacific Coast Title                │    │
│ │ Company Code:     PCTITLE                            │    │
│ │ Status:           ✅ Active                          │    │
│ └──────────────────────────────────────────────────────┘    │
│                                                              │
│ ┌─ Billing Information ────────────────────────────────┐    │
│ │ Billing Type:     Hybrid                             │    │
│ │ Filing Fee:       $75.00 per filing                  │    │
│ │ Payment Terms:    Net 10                             │    │
│ │ Billing Email:    billing@pctitle.com     [Edit]     │    │
│ │ Billing Contact:  Jane Smith              [Edit]     │    │
│ └──────────────────────────────────────────────────────┘    │
│                                                              │
│ ┌─ Contact Information ────────────────────────────────┐    │
│ │ Phone:            (555) 123-4567          [Edit]     │    │
│ │ Address:          123 Main St             [Edit]     │    │
│ │                   San Diego, CA 92101                │    │
│ └──────────────────────────────────────────────────────┘    │
│                                                              │
│ ℹ️ To change your filing fee, payment terms, or billing    │
│ type, please contact PCT FinCEN Solutions support.          │
└─────────────────────────────────────────────────────────────┘
```

**Rules:**
- Client admin can VIEW all fields
- Client admin can EDIT: `billing_email`, `billing_contact_name`, `phone`, `address`
- Client admin CANNOT edit: `name`, `code`, `billing_type`, `filing_fee_cents`, `payment_terms_days`
- Show clear message: "Contact support to change billing configuration"

**Data Source:** Need a `GET /companies/me` or `GET /my/company` endpoint that returns the current user's company info.

### 6B: Backend — My Company Endpoint

**Add to `api/app/routes/companies.py`:**

```python
@router.get("/companies/me")
async def get_my_company(current_user = Depends(require_client_role)):
    """Return the current user's company information."""
    if not current_user.company_id:
        raise HTTPException(status_code=404, detail="No company associated")

    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    if not company:
        raise HTTPException(status_code=404)

    return {
        "id": str(company.id),
        "name": company.name,
        "code": company.code,
        "status": company.status,
        "phone": company.phone,
        "address": company.address,
        "billing_email": company.billing_email,
        "billing_contact_name": company.billing_contact_name,
        "billing_type": company.billing_type,
        "filing_fee_cents": company.filing_fee_cents,
        "payment_terms_days": company.payment_terms_days,
    }
```

### 6C: Backend — Client Update Own Company (Limited Fields)

```python
class ClientCompanyUpdateRequest(BaseModel):
    billing_email: Optional[str] = None
    billing_contact_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[AddressSchema] = None

@router.patch("/companies/me")
async def update_my_company(
    req: ClientCompanyUpdateRequest,
    current_user = Depends(require_client_admin),  # Only client_admin, not client_user
):
    """Client admin can update limited company fields."""
    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    if not company:
        raise HTTPException(status_code=404)

    if req.billing_email is not None:
        if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", req.billing_email):
            raise HTTPException(status_code=422, detail="Invalid email format")
        company.billing_email = req.billing_email.strip()

    if req.billing_contact_name is not None:
        company.billing_contact_name = req.billing_contact_name.strip()

    if req.phone is not None:
        company.phone = req.phone.strip()

    if req.address is not None:
        company.address = req.address.dict()

    db.commit()

    # Audit log
    # log_audit(db, "company.updated_by_client", company_id=company.id, ...)

    return {"ok": True}
```

---

## PART 7: NAVIGATION UPDATES

**File:** `web/lib/navigation.ts`

Verify these navigation entries exist:

| Role | Menu Item | Route | Exists? |
|------|-----------|-------|---------|
| `coo` | Companies | `/app/admin/companies` | ✅ Verify |
| `pct_admin` | Companies | `/app/admin/companies` | ✅ Verify |
| `client_admin` | Company Settings | `/app/settings/company` | ⚠️ May need to add/fix |

Ensure `Company Settings` link exists for `client_admin` in the settings section of navigation.

---

## PART 8: DOCUMENT IN KILLEDSHARKS-2.md

**Append** to `docs/KilledSharks-2.md`:

```markdown
### 54. Company Onboarding Enhancement — Multi-Step Creation Wizard ✅

**Date:** [date]

**Problem:**
Company creation was a basic 5-field modal that captured almost nothing needed to serve a company:
- No billing configuration (billing_type, filing_fee, payment_terms)
- No admin user creation
- No address collection
- No company readiness checklist
- `billing_type` was invisible — not editable anywhere in the UI
- COO had to visit 2+ pages and 6+ clicks to fully set up a company
- billing_email not required, causing invoice failures
- No dedicated company detail page (only a side sheet)
- No client company settings page

**Solution:** Complete company onboarding overhaul.

#### Multi-Step Creation Wizard
| Step | What It Captures |
|------|-----------------|
| 1. Company Info | Name, code (auto-generated), phone, address |
| 2. Billing Config | Billing type, filing fee, payment terms, billing email, billing contact |
| 3. Admin User | First client_admin name + email (optional but encouraged) |
| 4. Review | Summary of all fields, edit links back to each step |

#### billing_type Now Visible Everywhere
| Location | Before | After |
|----------|--------|-------|
| Company creation | ❌ Not available | ✅ Step 2 of wizard |
| Company detail sheet | ❌ Not shown | ✅ In billing section |
| Billing rates tab | ❌ No column | ✅ Billing Type column + editable |
| Company list table | ❌ No indicator | ✅ Badge on each row |
| Client company settings | ❌ Page didn't exist | ✅ Visible (read-only) |

#### New Features
| Feature | Description |
|---------|------------|
| Company readiness checklist | Shows setup progress: billing email, admin user, address, card on file |
| Dedicated company detail page | `/app/admin/companies/{id}` — deep-linkable, full company view |
| Client company settings | `/app/settings/company` — clients can view/edit limited fields |
| Auto-generated company code | Name → code suggestion (editable) |
| billing_email required | Enforced for all client companies |
| Admin user at creation | Optional checkbox to create first client_admin during onboarding |

#### API Changes
| Endpoint | Change |
|----------|--------|
| `POST /companies` | Expanded schema: billing_type, filing_fee_cents, payment_terms_days, create_admin_user, admin_user_name, admin_user_email |
| `PATCH /companies/{id}` | Now accepts billing_type |
| `PATCH /billing/admin/rates/{id}` | Now accepts billing_type |
| `GET /companies/{id}/readiness` | **NEW** — Returns setup checklist |
| `GET /companies/{id}/users` | **NEW** — Returns users for a company |
| `GET /companies/me` | **NEW** — Client's own company info |
| `PATCH /companies/me` | **NEW** — Client admin updates limited fields |

#### Files Created
| File | Purpose |
|------|---------|
| `web/app/(app)/app/admin/companies/[id]/page.tsx` | Dedicated company detail page |
| `web/app/(app)/app/settings/company/page.tsx` | Client company settings |
| `web/components/CompanyReadinessChecklist.tsx` | Reusable readiness checklist component |

#### Files Modified
| File | Change |
|------|--------|
| `api/app/routes/companies.py` | Expanded creation schema, readiness endpoint, company detail, /me endpoints |
| `api/app/routes/billing.py` | billing_type in rate updates |
| `web/app/(app)/app/admin/companies/page.tsx` | Multi-step wizard replaces simple modal, billing_type in list table + detail sheet |
| `web/app/(app)/app/admin/billing/page.tsx` | billing_type column + edit in rates tab |
| `web/lib/navigation.ts` | Verify company settings link for client_admin |

**Status:** ✅ Killed (ONBOARDING SHARK 🦈)
```

**Update the Summary table at the top of KilledSharks-2.md.**

---

## EXECUTION ORDER

1. **Part 1** — Backend: Expand company creation API + billing_type in updates
2. **Part 3** — Frontend: billing_type visibility everywhere (quick wins, unblocks Stripe)
3. **Part 2** — Frontend: Multi-step creation wizard (biggest piece)
4. **Part 4** — Backend + Frontend: Company readiness checklist
5. **Part 5** — Dedicated company detail page
6. **Part 6** — Client company settings page
7. **Part 7** — Navigation updates
8. **Part 8** — KilledSharks documentation

---

## VERIFICATION CHECKLIST

### API
- [ ] `POST /companies` accepts: billing_type, filing_fee_cents, payment_terms_days, create_admin_user, admin_user_name, admin_user_email
- [ ] `POST /companies` requires billing_email for client companies
- [ ] `POST /companies` validates billing_email format
- [ ] `POST /companies` validates billing_type is "invoice_only" or "hybrid"
- [ ] `POST /companies` validates filing_fee_cents range (0-100000)
- [ ] `POST /companies` validates payment_terms_days (10, 15, 30, 45, 60)
- [ ] `POST /companies` creates admin user when create_admin_user=true
- [ ] `POST /companies` checks admin email uniqueness
- [ ] `POST /companies` sets ALL billing fields on company (not just defaults)
- [ ] `PATCH /companies/{id}` accepts and validates billing_type
- [ ] `PATCH /billing/admin/rates/{id}` accepts and validates billing_type
- [ ] `GET /companies/{id}/readiness` returns correct checklist
- [ ] `GET /companies/{id}/users` returns users for company
- [ ] `GET /companies/me` returns current user's company
- [ ] `PATCH /companies/me` only allows limited fields (billing_email, billing_contact_name, phone, address)
- [ ] `PATCH /companies/me` restricted to client_admin role

### Multi-Step Wizard
- [ ] Step 1: Name, code (auto-generated), phone, address
- [ ] Step 1: Code auto-generates from name, user can override
- [ ] Step 1: Validates name and code filled before proceeding
- [ ] Step 2: Billing type radio (invoice_only / hybrid)
- [ ] Step 2: Filing fee as dollar input, stored as cents
- [ ] Step 2: Payment terms dropdown (10, 15, 30, 45, 60)
- [ ] Step 2: Billing email required, validated
- [ ] Step 2: Hybrid selection shows card warning + switches terms to Net 10
- [ ] Step 3: Create admin user checkbox (default checked)
- [ ] Step 3: Name + email required when checked
- [ ] Step 3: Email validated
- [ ] Step 4: Review shows all fields with edit links
- [ ] Step 4: Submit calls single POST /companies with all data
- [ ] Step 4: Success toast with company name + admin email
- [ ] Step 4: Hybrid reminder toast
- [ ] Step 4: Error handling with inline messages
- [ ] Dialog resets all state when closed

### billing_type Visibility
- [ ] Company creation wizard: Step 2 (radio selector)
- [ ] Company detail sheet: Shown in billing section, editable
- [ ] Company list table: Badge per row
- [ ] Billing rates tab: Column + editable in edit form
- [ ] Client company settings: Shown (read-only)

### Readiness Checklist
- [ ] Shows on company detail sheet
- [ ] Shows on dedicated company detail page
- [ ] Checks: billing_email, billing_type, filing_fee, admin_user, any_user, address, card_on_file (hybrid)
- [ ] Progress bar with percentage
- [ ] Green check / red X per item
- [ ] Card on file check only applies to hybrid companies

### Company Detail Page
- [ ] Route: `/app/admin/companies/{id}`
- [ ] Shows company info, stats, readiness checklist, billing config, users, activity
- [ ] Billing settings editable inline (including billing_type)
- [ ] Users list with invite button
- [ ] Back link to companies list
- [ ] Accessible by coo and pct_admin

### Client Company Settings
- [ ] Route: `/app/settings/company`
- [ ] Shows all company info
- [ ] Editable: billing_email, billing_contact_name, phone, address
- [ ] Read-only: name, code, billing_type, filing_fee, payment_terms
- [ ] "Contact support" message for read-only fields
- [ ] Accessible by client_admin only

### Navigation
- [ ] Company detail page linked from companies list (company name is clickable)
- [ ] Client company settings link exists in navigation for client_admin

---

## DO NOT

- ❌ Do not implement production auth / passwords in this prompt (separate effort)
- ❌ Do not implement Stripe card collection during onboarding (Stripe prompt handles this)
- ❌ Do not implement user invitation emails (requires auth system first)
- ❌ Do not modify SDTM, RERX, or filing lifecycle code
- ❌ Do not modify the existing billing endpoints (extend only, don't break existing functionality)
- ❌ Do not remove the existing simple creation modal code — replace it with the wizard in the same file
- ❌ Do not remove or rewrite existing KilledSharks entries — append only
