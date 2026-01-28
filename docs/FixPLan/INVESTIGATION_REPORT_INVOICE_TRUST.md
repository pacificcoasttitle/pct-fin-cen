# Investigation Report: Invoice System & Trust Form Current State

**Date:** January 28, 2026  
**Investigator:** AI Assistant  
**Purpose:** Understand existing implementation before building

---

## Invoice System Findings

### Current Implementation

| Aspect | Status | Details |
|--------|--------|---------|
| **Data source** | API (enhanced) | Fetches from `GET /reports?status=filed&limit=50` |
| **File** | `web/app/(app)/app/invoices/page.tsx` |
| **Approach** | Derived from filed reports | No separate invoice records used |

**Key Code Snippet (Data Fetching):**

```typescript
const fetchFiledReports = async (showRefresh = false) => {
  if (showRefresh) setRefreshing(true);
  try {
    const response = await fetch(`${API_BASE_URL}/reports?status=filed&limit=50`);
    if (response.ok) {
      const data = await response.json();
      setFiledReports(data.reports || []);
    }
  } catch (error) {
    console.error("Failed to fetch filed reports:", error);
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
};
```

### Table Structure

**Columns Displayed:**

| Column | Data Source |
|--------|-------------|
| Property | `report.property_address_text` |
| Filing Date | `report.filed_at` |
| Receipt ID | `report.receipt_id` |
| Amount | Hardcoded `$75.00` per filing |
| Status | Always "Paid" badge |

**Features:**
- ✅ Loading states (skeleton)
- ✅ Empty state with icon
- ✅ Manual refresh button
- ❌ No pagination
- ❌ No filtering/sorting
- ❌ No search

### Actions Available

| Action | Status | Notes |
|--------|--------|-------|
| View Details | ❌ Missing | No row click handler |
| Download PDF | ❌ Missing | Not implemented |
| Send Invoice | N/A | This is client view |

### Invoice Detail Sheet Component

**File:** `web/components/admin/invoice-detail-sheet.tsx`

| Aspect | Status |
|--------|--------|
| **Exists** | ✅ Yes |
| **Data Source** | Mock data (`getMockLineItems` function) |
| **Features** | Full-featured sheet with summary, dates, payment info, line items |
| **Actions** | All disabled with "Coming soon" tooltips |

**Sheet Features (all mock):**
- Invoice summary (subtotal, discount, tax, total)
- Dates (billing period, due date, sent date, paid date)
- Payment info card (when paid)
- Line items table with BSA ID
- Action buttons (all disabled):
  - Send Invoice
  - Mark as Paid
  - Download PDF
  - Void Invoice

### API Status

| Endpoint | Status | Notes |
|----------|--------|-------|
| `GET /invoices` | ❌ Missing | No route file exists |
| `GET /invoices/{id}` | ❌ Missing | |
| `POST /invoices` | ❌ Missing | |
| `PATCH /invoices/{id}` | ❌ Missing | |

### Model Status

| Model | Exists | Populated |
|-------|--------|-----------|
| `Invoice` | ✅ Yes | ❌ No data |
| `BillingEvent` | ✅ Yes | ❌ No data |

**Invoice Model Fields:**

```python
id                  UUID, primary key
company_id          UUID, FK to companies (NOT NULL)
invoice_number      String(50), unique (NOT NULL)  # "INV-2026-0001"
period_start        Date (NOT NULL)
period_end          Date (NOT NULL)
subtotal_cents      Integer (NOT NULL)
tax_cents           Integer (default 0)
discount_cents      Integer (default 0)
total_cents         Integer (NOT NULL)
status              String(50) - draft/sent/paid/void/overdue
due_date            Date (nullable)
sent_at             DateTime (nullable)
paid_at             DateTime (nullable)
voided_at           DateTime (nullable)
payment_method      String(50) - check/ach/wire/intercompany
payment_reference   String(255)
pdf_url             String(500)
notes               Text
created_at          DateTime
created_by_user_id  UUID, FK
```

**BillingEvent Model Fields:**

```python
id                      UUID, primary key
company_id              UUID, FK to companies (NOT NULL)
report_id               UUID, FK to reports
submission_request_id   UUID, FK to submission_requests
event_type              String(50) - filing_accepted/expedite_fee/manual_adjustment
description             String(500)
amount_cents            Integer (NOT NULL)
quantity                Integer (default 1)
bsa_id                  String(100)
invoice_id              UUID, FK to invoices
invoiced_at             DateTime
created_at              DateTime
created_by_user_id      UUID, FK
```

### Gaps Identified (Invoice System)

| # | Gap | Severity | Notes |
|---|-----|----------|-------|
| 1 | No invoice API routes | 🟠 Major | Models exist but no endpoints |
| 2 | No BillingEvent creation | 🔴 Critical | Filed reports don't create billing events |
| 3 | No invoice generation logic | 🟠 Major | No automated monthly invoicing |
| 4 | Detail sheet uses mock data | 🟡 Minor | Has getMockLineItems fallback |
| 5 | No PDF generation | 🟡 Minor | pdf_url field exists but unused |
| 6 | No pagination on client view | 🟡 Minor | OK for low volume |

---

## Trust Form Findings

### Current Implementation

| Aspect | Status | Details |
|--------|--------|---------|
| **Dedicated Trust Form** | ❌ No | Falls back to generic |
| **Generic Trust Form** | ✅ Yes | `GenericTrustForm` in index.tsx |
| **Trust Types Defined** | ✅ Yes | `TRUST_TYPES` constant |
| **Trust-Related Types** | ✅ Yes | `TrusteeData`, `SettlorData`, `BeneficiaryData` |

### Party Portal Files

```
web/components/party-portal/
├── AddressFields.tsx           ✅ Reusable
├── BeneficialOwnerCard.tsx     ✅ For entities
├── BuyerEntityForm.tsx         ✅ Complex form
├── CertificationSection.tsx    ✅ Includes trust text
├── index.tsx                   ✅ Has GenericTrustForm
├── PaymentSourceCard.tsx       ✅ Reusable
├── SellerIndividualForm.tsx    ✅ Complete
└── types.ts                    ✅ Has trust types
```

### DynamicPartyForm Routing Logic

**File:** `web/components/party-portal/index.tsx`

```typescript
// Route to the correct form based on role and type
if (isSeller && entityType === "individual") {
  return <SellerIndividualForm ... />
}

if (isBuyer && entityType === "entity") {
  return <BuyerEntityForm ... />  // Has beneficial owners + payment
}

// Fallback: Generic forms for other combinations
if (entityType === "entity") {
  return <GenericEntityForm ... />
}

if (entityType === "trust") {
  return <GenericTrustForm ... />  // ⬅️ All trusts fall here
}

// Default: Individual form
return <GenericIndividualForm ... />
```

**Routing Matrix:**

| Role | Type | Form Used |
|------|------|-----------|
| Seller | Individual | `SellerIndividualForm` ✅ Complete |
| Seller | Entity | `GenericEntityForm` |
| Seller | Trust | `GenericTrustForm` |
| Buyer | Individual | `GenericIndividualForm` |
| Buyer | Entity | `BuyerEntityForm` ✅ Complete |
| Buyer | Trust | `GenericTrustForm` ⬅️ **Gap** |

### Trust Types Defined

**File:** `web/components/party-portal/types.ts`

**Trust Type Constants:**

```typescript
export const TRUST_TYPES = [
  { value: "revocable_living", label: "Revocable Living Trust" },
  { value: "irrevocable", label: "Irrevocable Trust" },
  { value: "land", label: "Land Trust" },
  { value: "blind", label: "Blind Trust" },
  { value: "charitable", label: "Charitable Trust" },
  { value: "other", label: "Other" },
]
```

**Trust-Related Interfaces (All Exist):**

```typescript
export interface TrusteeData {
  id: string
  type: "individual" | "entity"
  // Individual fields
  full_name?: string
  date_of_birth?: string
  ssn?: string
  citizenship?: string
  address?: AddressData
  phone?: string
  email?: string
  // Entity fields
  entity_name?: string
  entity_type?: string
  ein?: string
  business_address?: AddressData
  contact_name?: string
  contact_phone?: string
  contact_email?: string
}

export interface SettlorData {
  id: string
  full_name: string
  date_of_birth?: string
  relationship?: string
  is_beneficiary: boolean
}

export interface BeneficiaryData {
  id: string
  full_name: string
  date_of_birth?: string
  interest_nature?: string
  percentage_interest?: number
}
```

**PartySubmissionData Trust Fields (Ready):**

```typescript
// Trust fields
trust_name?: string
trust_type?: string
trust_date?: string
trust_ein?: string
is_revocable?: boolean

// Trustees (for trust buyers)
trustees?: TrusteeData[]

// Settlors (for trust buyers)
settlors?: SettlorData[]

// Beneficiaries (for trust buyers)
beneficiaries?: BeneficiaryData[]

// Payment (for buyers)
payment_sources?: PaymentSourceData[]
```

### GenericTrustForm Analysis

**Current Fields Collected:**

| Section | Fields |
|---------|--------|
| Trust Information | Trust name, type, date executed, TIN/EIN |
| Trust Address | Street, city, state, zip, country |
| Trustee Information | Name, title, phone, email (single trustee only) |
| Certification | `CERTIFICATION_TEXTS.seller_trust` |

**Missing vs BuyerEntityForm:**

| Feature | BuyerEntityForm | GenericTrustForm |
|---------|-----------------|------------------|
| Multiple trustees | N/A | ❌ Single only |
| Settlors | N/A | ❌ Missing |
| Beneficiaries | N/A | ❌ Missing |
| Payment sources | ✅ Complete | ❌ Missing |
| Dynamic add/remove | ✅ For BOs | ❌ None |

### Backend Trust Handling

**File:** `api/app/models/report_party.py`

```python
entity_type = Column(
    String(50), 
    nullable=False,
    comment="individual, llc, corporation, trust, partnership, other"
)

party_data = Column(
    JSONBType, 
    nullable=True, 
    default=dict,
    comment="Full party information: name, address, ID documents, etc."
)
```

| Aspect | Status |
|--------|--------|
| `entity_type` accepts "trust" | ✅ Yes |
| `party_data` is JSONB | ✅ Flexible schema |
| Trust-specific validation | ❌ None |

### Certification Texts for Trusts

**Seller Trust:**
```
I certify that I am authorized to act on behalf of the trust and that 
the information provided is true, complete, and accurate.
```

**Buyer Trust:**
```
I certify that:
• I am authorized to act on behalf of [Trust Name]
• All information provided is true, complete, and accurate
• All relevant trustees, settlors, and beneficiaries have been identified
• All payment sources have been disclosed
```

### Gaps Identified (Trust Form)

| # | Gap | Severity | Notes |
|---|-----|----------|-------|
| 1 | No `BuyerTrustForm.tsx` | 🔴 Critical | Uses generic form missing key fields |
| 2 | Single trustee only | 🟠 Major | Trusts often have co-trustees |
| 3 | No settlor collection | 🟠 Major | Required for FinCEN |
| 4 | No beneficiary collection | 🟠 Major | Required for FinCEN |
| 5 | No payment sources (buyer) | 🔴 Critical | Required for buyer trusts |
| 6 | No trustee cards (like BO cards) | 🟡 Minor | Would improve UX |

---

## Connection Points

### How Invoice Page Gets Data

```
Client Invoices Page
        │
        ▼
fetch(`/reports?status=filed`)
        │
        ▼
Returns: { reports: [...], total: number }
        │
        ▼
Renders each report as a "filing charge"
with hardcoded $75 amount
```

### How Party Portal Submits Trust Data

```
GenericTrustForm (UI)
        │
        ▼
onChange updates PartySubmissionData
        │
        ▼
Submit button calls onSubmit prop
        │
        ▼
POST /parties/{token}/submit
        │
        ▼
party_data JSONB stores all fields
```

---

## Recommended Approach

### For Invoices

**Recommendation: Build dedicated invoice API + enhance frontend**

| Task | Priority | Effort |
|------|----------|--------|
| Create `api/app/routes/invoices.py` | 🔴 P1 | Medium |
| Auto-create BillingEvent on filing | 🔴 P1 | Small |
| Monthly invoice generation (cron) | 🟡 P3 | Large |
| Wire invoice-detail-sheet to real data | 🟠 P2 | Medium |
| PDF generation | 🟡 P3 | Medium |

**Suggested Invoice Endpoints:**

```
GET    /invoices                   - List invoices (with filters)
GET    /invoices/{id}             - Get invoice detail + line items
POST   /invoices/generate         - Generate invoice for period
PATCH  /invoices/{id}/status      - Update status (send/pay/void)
GET    /invoices/{id}/pdf         - Download PDF
```

**Quick Win:** Create BillingEvent when report is filed, then invoices page can query billing_events directly instead of deriving from reports.

### For Trust Form

**Recommendation: Create `BuyerTrustForm.tsx` with full features**

| Task | Priority | Effort |
|------|----------|--------|
| Create `BuyerTrustForm.tsx` | 🔴 P1 | Medium |
| Add `TrusteeCard.tsx` component | 🟠 P2 | Medium |
| Add settlor/beneficiary sections | 🟠 P2 | Small |
| Reuse `PaymentSourceCard` | 🟡 Easy | Tiny |
| Update DynamicPartyForm routing | 🟡 Easy | Tiny |

**BuyerTrustForm Should Include:**

1. **Trust Information** (existing from generic)
   - Trust name, type, date, EIN, revocable flag

2. **Trustees** (NEW - dynamic list)
   - Individual or entity trustees
   - TrusteeCard component (like BeneficialOwnerCard)

3. **Settlors** (NEW - dynamic list)
   - Simple name/relationship form

4. **Beneficiaries** (NEW - dynamic list)
   - Name, interest nature, percentage

5. **Signing Individual** (similar to entity)
   - Who signs on behalf of trust

6. **Payment Information** (reuse)
   - PaymentSourceCard components

**Type Infrastructure Ready:**
- ✅ `TrusteeData` interface exists
- ✅ `SettlorData` interface exists
- ✅ `BeneficiaryData` interface exists
- ✅ `PaymentSourceData` interface exists
- ✅ `TRUST_TYPES` constant exists
- ✅ `CERTIFICATION_TEXTS.buyer_trust` exists

---

## Summary Matrix

| System | What Exists | What's Missing | Build Effort |
|--------|-------------|----------------|--------------|
| **Invoice API** | Models only | All endpoints | Medium |
| **Invoice Frontend** | Basic client view | Detail sheet data, admin view | Medium |
| **Trust Form** | Generic fallback | BuyerTrustForm with trustees/settlors/beneficiaries/payment | Medium |
| **Trust Types** | All interfaces | Just the form component | Small |

---

## Next Steps

1. **Invoice System:**
   - Create `api/app/routes/invoices.py` with CRUD endpoints
   - Create BillingEvent when report is filed
   - Wire invoice-detail-sheet to real API data

2. **Trust Form:**
   - Create `BuyerTrustForm.tsx` modeled after `BuyerEntityForm.tsx`
   - Create `TrusteeCard.tsx` modeled after `BeneficialOwnerCard.tsx`
   - Update DynamicPartyForm routing for buyer+trust

**Don't build both at once - prioritize based on demo needs.**
