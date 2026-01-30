# CURSOR PROMPT: Invoicing System Investigation & Master Tech Spec

## MISSION

**INVESTIGATION ONLY - DO NOT MODIFY ANY CODE**

Analyze the FinClear invoicing/billing system and produce a comprehensive **Invoicing Master Tech Spec** document. This will become the single source of truth for understanding billing: how charges are created, how invoices are generated, role visibility, and all touchpoints.

**Goal:** Understand the current system so we can design:
1. Per-filing price customization
2. Flat-fee / subscription pricing models
3. Pay-as-you-go vs monthly billing

---

## OUTPUT REQUIRED

Create file: `docs/INVOICING_MASTER_TECH_SPEC.md`

This document must contain ALL sections below, fully populated with actual findings from the codebase.

---

## INVESTIGATION AREAS

### 1. DATA MODEL

**Files to examine:**
- `api/app/models/billing_event.py`
- `api/app/models/invoice.py`
- `api/app/models/company.py` (look for billing-related fields)
- `api/app/models/__init__.py` (find all billing-related models)

**Document:**
```markdown
## 1. Data Model

### 1.1 BillingEvent Model
[Show the complete model with all fields]

```python
# Actual model from codebase
class BillingEvent(Base):
    ...
```

| Field | Type | Purpose |
|-------|------|---------|
| id | UUID | Primary key |
| ... | ... | ... |

### 1.2 Invoice Model
[Show the complete model with all fields]

```python
class Invoice(Base):
    ...
```

| Field | Type | Purpose |
|-------|------|---------|
| id | UUID | Primary key |
| ... | ... | ... |

### 1.3 Company Billing Fields
[Any billing-related fields on Company model]

### 1.4 Relationships
```
Company (1) ←→ (N) BillingEvent
Company (1) ←→ (N) Invoice
Invoice (1) ←→ (N) BillingEvent (if linked)
Report (1) ←→ (1) BillingEvent (if linked)
```
```

---

### 2. BILLING EVENT LIFECYCLE

**Files to examine:**
- `api/app/routes/reports.py` (where billing events are created on filing)
- `api/app/routes/billing.py` (if exists)
- `api/app/services/billing.py` (if exists)
- Search for "BillingEvent" across all route files

**Document:**
```markdown
## 2. Billing Event Lifecycle

### 2.1 When Are Billing Events Created?
[Document every trigger point]

| Trigger | Location | Event Type | Amount |
|---------|----------|------------|--------|
| Report filed | routes/reports.py | filing | $75 |
| ... | ... | ... | ... |

### 2.2 Billing Event Creation Code
```python
# Actual code that creates billing events
```

### 2.3 Event Types
[List all billing event types]

| Type | Description | Default Amount |
|------|-------------|----------------|
| filing | FinCEN report filed | $75.00 |
| ... | ... | ... |

### 2.4 Amount Determination
[How is the amount determined?]
- Is it hardcoded?
- Is it configurable per company?
- Is it stored in settings?
```

---

### 3. INVOICE GENERATION

**Files to examine:**
- `api/app/routes/invoices.py`
- `api/app/services/invoice.py` (if exists)
- Search for "Invoice" creation across all files

**Document:**
```markdown
## 3. Invoice Generation

### 3.1 How Are Invoices Created?
[Manual? Automatic? Scheduled?]

### 3.2 Invoice Generation Code
```python
# Actual code that generates invoices
```

### 3.3 Invoice Calculation
[How is the total calculated?]
- Sum of billing events?
- Date range filtering?
- Company filtering?

### 3.4 Invoice Statuses
| Status | Meaning | Transitions |
|--------|---------|-------------|
| draft | ... | ... |
| sent | ... | ... |
| paid | ... | ... |
| ... | ... | ... |

### 3.5 Invoice Line Items
[How are line items structured?]
- One line per billing event?
- Grouped by type?
- Includes description?
```

---

### 4. API ENDPOINTS

**Files to examine:**
- `api/app/routes/invoices.py`
- `api/app/routes/billing.py` (if exists)
- `api/app/routes/admin/*.py` (any admin billing routes)

**Document:**
```markdown
## 4. API Endpoints

### 4.1 Invoice Endpoints

| Method | Endpoint | Purpose | Auth Required |
|--------|----------|---------|---------------|
| GET | /invoices | List invoices | Client/Admin |
| GET | /invoices/{id} | Get invoice detail | Client/Admin |
| POST | /invoices | Create invoice | Admin |
| ... | ... | ... | ... |

### 4.2 Billing Event Endpoints

| Method | Endpoint | Purpose | Auth Required |
|--------|----------|---------|---------------|
| GET | /billing-events | List events | Admin |
| ... | ... | ... | ... |

### 4.3 Request/Response Schemas
[Show key Pydantic schemas]
```

---

### 5. ROLE-BASED ACCESS

**Files to examine:**
- `web/app/(app)/app/invoices/page.tsx` (client view)
- `web/app/(app)/app/admin/invoices/page.tsx` (admin view)
- `web/lib/navigation.ts` (who sees invoice links)
- Search for "invoice" in all page files

**Document:**
```markdown
## 5. Role-Based Access

### 5.1 Who Can See What?

| Role | Can View Own Invoices | Can View All Invoices | Can Create Invoices | Can Edit Prices |
|------|----------------------|----------------------|--------------------|-----------------| 
| client_user | ✅ | ❌ | ❌ | ❌ |
| client_admin | ✅ | ❌ | ❌ | ❌ |
| pct_staff | ? | ? | ? | ? |
| pct_admin | ? | ✅ | ? | ? |
| executive | ? | ? | ? | ? |

### 5.2 Client Invoice View
[What does the client see?]
- Invoice list
- Invoice detail
- Payment status
- Download PDF?

### 5.3 Admin Invoice View
[What does admin see?]
- All company invoices
- Generate invoices
- Mark as paid
- Edit?

### 5.4 Navigation
[Who has invoice links in sidebar?]
```

---

### 6. FRONTEND PAGES

**Files to examine:**
- `web/app/(app)/app/invoices/page.tsx`
- `web/app/(app)/app/invoices/[id]/page.tsx` (if exists)
- `web/app/(app)/app/admin/invoices/page.tsx`
- `web/components/invoices/*.tsx` (if exists)

**Document:**
```markdown
## 6. Frontend Pages

### 6.1 Client Invoice Page
**Path:** `/app/invoices`
**File:** `web/app/(app)/app/invoices/page.tsx`

[Describe what's displayed]
- Table columns
- Filters
- Actions

### 6.2 Admin Invoice Page
**Path:** `/app/admin/invoices`
**File:** `web/app/(app)/app/admin/invoices/page.tsx`

[Describe what's displayed]
- Table columns
- Filters
- Actions (generate, mark paid, etc.)

### 6.3 Invoice Detail Page (if exists)
[Describe detail view]
```

---

### 7. PRICE CONFIGURATION

**Files to examine:**
- `api/app/config.py`
- `api/app/services/demo_seed.py`
- Search for "75" or "price" or "amount" in billing-related files
- `api/app/models/company.py` (check for pricing fields)

**Document:**
```markdown
## 7. Price Configuration

### 7.1 Current Pricing
[Where is the $75 price defined?]

| Item | Price | Location | Configurable? |
|------|-------|----------|---------------|
| Filing fee | $75 | ? | No/Yes |
| ... | ... | ... | ... |

### 7.2 Company-Level Pricing
[Can different companies have different prices?]
- Is there a `billing_rate` field on Company?
- Is there a `pricing_tier` field?
- Is there a separate pricing table?

### 7.3 Hardcoded Values Found
[List all hardcoded price values]

| Value | File | Line | Context |
|-------|------|------|---------|
| 75 | routes/reports.py | 123 | filing fee |
| ... | ... | ... | ... |
```

---

### 8. DATA FLOW

**Document:**
```markdown
## 8. Data Flow

### 8.1 Filing → Billing Event → Invoice Flow

```
Staff clicks "File to FinCEN"
    │
    ▼ POST /reports/{id}/file
┌─────────────────────────────────────────┐
│ Report status → "filed"                  │
│ Create BillingEvent:                     │
│   - company_id                           │
│   - report_id                            │
│   - event_type: "filing"                 │
│   - amount_cents: 7500                   │
│   - description: "FinCEN Filing - {addr}"|
└─────────────────────────────────────────┘
    │
    │ Later (manual or scheduled?)
    ▼
┌─────────────────────────────────────────┐
│ Invoice generated:                       │
│   - company_id                           │
│   - period_start / period_end            │
│   - Sum of BillingEvents in period       │
│   - status: "draft" or "sent"            │
└─────────────────────────────────────────┘
    │
    ▼
Client sees invoice in /app/invoices
```

### 8.2 Payment Flow (if implemented)
[Is there any payment processing?]
- Stripe integration?
- Manual payment marking?
```

---

### 9. AUDIT TRAIL

**Files to examine:**
- `api/app/services/audit.py`
- Search for invoice-related audit events

**Document:**
```markdown
## 9. Audit Trail

### 9.1 Billing-Related Audit Events
[What gets logged?]

| Event | When | Data Captured |
|-------|------|---------------|
| billing_event.created | Filing | report_id, amount, company_id |
| invoice.generated | ? | invoice_id, total, company_id |
| invoice.paid | ? | invoice_id, paid_at |
| ... | ... | ... |
```

---

### 10. FILE INVENTORY

**Document:**
```markdown
## 10. File Inventory

### 10.1 Backend Files
| File | Purpose | Key Functions |
|------|---------|---------------|
| api/app/models/billing_event.py | BillingEvent model | ... |
| api/app/models/invoice.py | Invoice model | ... |
| api/app/routes/invoices.py | Invoice API | ... |
| ... | ... | ... |

### 10.2 Frontend Files
| File | Purpose |
|------|---------|
| web/app/(app)/app/invoices/page.tsx | Client invoice list |
| web/app/(app)/app/admin/invoices/page.tsx | Admin invoice management |
| ... | ... |

### 10.3 Schemas
| File | Key Schemas |
|------|-------------|
| api/app/schemas/invoice.py | InvoiceResponse, InvoiceCreate |
| ... | ... |
```

---

### 11. GAPS & ENHANCEMENT OPPORTUNITIES

**Document:**
```markdown
## 11. Current Gaps & Enhancement Opportunities

### 11.1 Missing Features
[List what's NOT implemented]

- [ ] Per-company pricing
- [ ] Per-filing price override
- [ ] Subscription billing
- [ ] Stripe integration
- [ ] Auto-invoice generation
- [ ] Invoice PDF generation
- [ ] Payment tracking
- [ ] ...

### 11.2 Hardcoded Limitations
[What would need to change for flexible pricing?]

### 11.3 Database Schema Changes Needed
[For future pricing models, what tables/fields would we need?]

### 11.4 Questions for Product
1. Should companies be able to see their billing rate?
2. Who can change a company's pricing?
3. How often should invoices be generated?
4. ...
```

---

### 12. PRICING MODEL ANALYSIS

**Document:**
```markdown
## 12. Pricing Model Analysis

### 12.1 Current Model: Pay-Per-Filing
- Price: $75 per filing (hardcoded?)
- Billing: Invoice after filings occur
- No subscription component

### 12.2 Proposed: Configurable Per-Filing
What would need to change:
- Company model: Add `filing_fee_cents` field
- BillingEvent creation: Use company's rate instead of hardcoded
- Admin UI: Ability to set per-company rate

### 12.3 Proposed: Flat Fee / Subscription
What would need to change:
- New model: `Subscription` (company_id, plan_type, monthly_fee, filing_limit)
- Modify billing event creation: Check if within subscription limit
- Invoice generation: Include subscription fee + overage

### 12.4 Proposed: Tiered Pricing
Examples:
- Tier 1: $75/filing
- Tier 2: $60/filing (10+ filings/month)
- Tier 3: $500/month unlimited

What would need to change:
- Pricing rules engine
- Company billing tier assignment
```

---

## EXECUTION INSTRUCTIONS

1. **Read each file listed** in the investigation areas
2. **Extract actual code** - don't guess, quote real implementations
3. **Follow imports** - trace the full billing flow
4. **Document unknowns** - if something is unclear, note it as "UNCLEAR: [question]"
5. **Be thorough** - this document will guide pricing model design

---

## OUTPUT FORMAT

Create `docs/INVOICING_MASTER_TECH_SPEC.md` with:
- Clear markdown formatting
- Code blocks for actual code snippets
- Tables for structured data
- Flow diagrams using ASCII or mermaid
- A table of contents at the top

---

## COMPLETION CHECKLIST

Before finishing, verify:
- [ ] All 12 sections are populated
- [ ] No placeholder text like "TBD" or "..."
- [ ] All file paths are verified to exist
- [ ] Code snippets are actual code from the repo
- [ ] Billing event creation is fully traced
- [ ] Invoice generation is fully documented
- [ ] Role-based access is complete
- [ ] All hardcoded prices are identified
- [ ] Enhancement opportunities are listed

---

**DO NOT MODIFY ANY CODE - INVESTIGATION ONLY**
