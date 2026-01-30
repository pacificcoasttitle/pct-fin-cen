# Invoicing Master Tech Spec

**Version:** 1.0  
**Last Updated:** January 30, 2026  
**Author:** System Investigation  

---

## Table of Contents

1. [Data Model](#1-data-model)
2. [Billing Event Lifecycle](#2-billing-event-lifecycle)
3. [Invoice Generation](#3-invoice-generation)
4. [API Endpoints](#4-api-endpoints)
5. [Role-Based Access](#5-role-based-access)
6. [Frontend Pages](#6-frontend-pages)
7. [Price Configuration](#7-price-configuration)
8. [Data Flow](#8-data-flow)
9. [Audit Trail](#9-audit-trail)
10. [File Inventory](#10-file-inventory)
11. [Current Gaps & Enhancement Opportunities](#11-current-gaps--enhancement-opportunities)
12. [Pricing Model Analysis](#12-pricing-model-analysis)

---

## 1. Data Model

### 1.1 BillingEvent Model

**File:** `api/app/models/billing_event.py`

```python
class BillingEvent(Base):
    """
    A billable event/charge for a company.
    
    event_types:
    - 'filing_accepted': FinCEN filing was accepted
    - 'expedite_fee': Rush processing requested
    - 'manual_adjustment': Manual credit or charge
    - 'monthly_minimum': Monthly minimum fee
    """
    __tablename__ = "billing_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    report_id = Column(UUID(as_uuid=True), ForeignKey("reports.id", ondelete="SET NULL"), nullable=True)
    submission_request_id = Column(UUID(as_uuid=True), ForeignKey("submission_requests.id", ondelete="SET NULL"), nullable=True)

    event_type = Column(String(50), nullable=False)  # filing_accepted, expedite_fee, manual_adjustment
    description = Column(String(500), nullable=True)
    amount_cents = Column(Integer, nullable=False)  # Can be negative for credits
    quantity = Column(Integer, nullable=False, server_default="1")

    # FinCEN reference
    bsa_id = Column(String(100), nullable=True)

    # Invoice linkage
    invoice_id = Column(UUID(as_uuid=True), ForeignKey("invoices.id", ondelete="SET NULL"), nullable=True)
    invoiced_at = Column(DateTime, nullable=True)

    # Audit
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    created_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # Relationships
    company = relationship("Company", back_populates="billing_events")
    report = relationship("Report", back_populates="billing_events")
    submission_request = relationship("SubmissionRequest", back_populates="billing_events")
    invoice = relationship("Invoice", back_populates="billing_events")
```

| Field | Type | Purpose |
|-------|------|---------|
| id | UUID | Primary key |
| company_id | UUID FK | Links to client company being charged |
| report_id | UUID FK | Links to the filed report (if applicable) |
| submission_request_id | UUID FK | Links to the original submission request |
| event_type | String(50) | Type of billable event (filing_accepted, expedite_fee, etc.) |
| description | String(500) | Human-readable description |
| amount_cents | Integer | Amount in cents (can be negative for credits) |
| quantity | Integer | Quantity multiplier (default: 1) |
| bsa_id | String(100) | FinCEN BSA tracking ID (for filing events) |
| invoice_id | UUID FK | Links to invoice when billed |
| invoiced_at | DateTime | When the event was added to an invoice |
| created_at | DateTime | Creation timestamp |
| created_by_user_id | UUID FK | User who created the event (system or manual) |

### 1.2 Invoice Model

**File:** `api/app/models/invoice.py`

```python
class Invoice(Base):
    """
    A billing invoice for a company.
    
    Status flow: draft -> sent -> paid (or void/overdue)
    """
    __tablename__ = "invoices"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)

    invoice_number = Column(String(50), unique=True, nullable=False)  # "INV-2026-0001"
    period_start = Column(Date, nullable=False)
    period_end = Column(Date, nullable=False)

    # Amounts (all in cents)
    subtotal_cents = Column(Integer, nullable=False)
    tax_cents = Column(Integer, nullable=False, server_default="0")
    discount_cents = Column(Integer, nullable=False, server_default="0")
    total_cents = Column(Integer, nullable=False)

    # Status
    status = Column(String(50), nullable=False, server_default="draft")

    # Dates
    due_date = Column(Date, nullable=True)
    sent_at = Column(DateTime, nullable=True)
    paid_at = Column(DateTime, nullable=True)
    voided_at = Column(DateTime, nullable=True)

    # Payment info
    payment_method = Column(String(50), nullable=True)  # check, ach, wire, intercompany
    payment_reference = Column(String(255), nullable=True)

    # Document
    pdf_url = Column(String(500), nullable=True)
    notes = Column(Text, nullable=True)

    # Audit
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    created_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # Relationships
    company = relationship("Company", back_populates="invoices")
    billing_events = relationship("BillingEvent", back_populates="invoice")
```

| Field | Type | Purpose |
|-------|------|---------|
| id | UUID | Primary key |
| company_id | UUID FK | Links to client company being billed |
| invoice_number | String(50) | Human-readable invoice number (e.g., "INV-2026-01-0001") |
| period_start | Date | Billing period start date |
| period_end | Date | Billing period end date |
| subtotal_cents | Integer | Sum of line items before tax/discount |
| tax_cents | Integer | Tax amount (default: 0) |
| discount_cents | Integer | Discount amount (default: 0) |
| total_cents | Integer | Final invoice total |
| status | String(50) | Invoice status (draft, sent, paid, void, overdue) |
| due_date | Date | Payment due date |
| sent_at | DateTime | When invoice was sent to client |
| paid_at | DateTime | When payment was received |
| voided_at | DateTime | When invoice was voided |
| payment_method | String(50) | Payment method (check, ach, wire, intercompany) |
| payment_reference | String(255) | Payment reference/check number |
| pdf_url | String(500) | URL to generated PDF (not implemented) |
| notes | Text | Internal notes |
| created_at | DateTime | Creation timestamp |
| created_by_user_id | UUID FK | User who created the invoice |

### 1.3 Company Billing Fields

**File:** `api/app/models/company.py`

```python
class Company(Base):
    # ... other fields ...
    
    # Billing contact
    billing_email = Column(String(255), nullable=True)
    billing_contact_name = Column(String(255), nullable=True)
    address = Column(JSONBType, nullable=True)  # {street, city, state, zip}
    phone = Column(String(50), nullable=True)
    
    # Relationships
    billing_events = relationship("BillingEvent", back_populates="company")
    invoices = relationship("Invoice", back_populates="company")
```

| Field | Type | Purpose |
|-------|------|---------|
| billing_email | String(255) | Email for sending invoices |
| billing_contact_name | String(255) | Name of billing contact |
| address | JSONB | Company address for invoices |
| phone | String(50) | Contact phone |

**FINDING: NO per-company pricing fields exist.** The Company model does not have:
- `billing_rate` or `filing_fee_cents`
- `pricing_tier` or `plan_type`
- `subscription_*` fields

### 1.4 Relationships

```
Company (1) ←→ (N) BillingEvent
Company (1) ←→ (N) Invoice
Invoice (1) ←→ (N) BillingEvent (via invoice_id)
Report (1) ←→ (N) BillingEvent (via report_id)
SubmissionRequest (1) ←→ (N) BillingEvent (via submission_request_id)
```

**Entity Relationship Diagram:**

```
┌─────────────────┐       ┌─────────────────────┐       ┌─────────────┐
│     Company     │──1:N──│    BillingEvent     │──N:1──│   Invoice   │
│                 │       │                     │       │             │
│ id              │       │ id                  │       │ id          │
│ name            │       │ company_id (FK)     │       │ company_id  │
│ billing_email   │       │ report_id (FK)      │       │ total_cents │
│ billing_contact │       │ invoice_id (FK)     │◄──────│ status      │
└────────┬────────┘       │ amount_cents        │       └─────────────┘
         │                │ event_type          │
         │                └──────────┬──────────┘
         │                           │
         │                           │ N:1
         │                           ▼
         │                ┌─────────────────────┐
         │                │       Report        │
         └──────1:N──────►│ id                  │
                          │ company_id (FK)     │
                          │ status              │
                          │ filed_at            │
                          └─────────────────────┘
```

---

## 2. Billing Event Lifecycle

### 2.1 When Are Billing Events Created?

| Trigger | Location | Event Type | Amount | Condition |
|---------|----------|------------|--------|-----------|
| Report filing accepted | `api/app/routes/reports.py` (line ~854) | `filing_accepted` | $75.00 (7500 cents) | `outcome == "accepted" and report.company_id` |

**Currently, billing events are ONLY created when a FinCEN filing is accepted.**

### 2.2 Billing Event Creation Code

**File:** `api/app/routes/reports.py` (lines 853-866)

```python
# Create billing event for accepted filings
if outcome == "accepted" and report.company_id:
    billing_event = BillingEvent(
        company_id=report.company_id,
        report_id=report.id,
        submission_request_id=report.submission_request_id,
        event_type="filing_accepted",
        description=f"FinCEN filing for {report.property_address_text}",
        amount_cents=7500,  # $75.00 per filing - HARDCODED!
        quantity=1,
        bsa_id=submission.receipt_id,
        created_at=datetime.utcnow(),
    )
    db.add(billing_event)
    db.commit()
```

### 2.3 Event Types

| Type | Description | Default Amount | Implemented? |
|------|-------------|----------------|--------------|
| `filing_accepted` | FinCEN report filed successfully | $75.00 | ✅ Yes |
| `expedite_fee` | Rush processing requested | TBD | ❌ No |
| `manual_adjustment` | Manual credit or charge | Variable | ❌ No |
| `monthly_minimum` | Monthly minimum fee | TBD | ❌ No |

### 2.4 Amount Determination

**FINDING: Amount is 100% HARDCODED.**

```python
amount_cents=7500,  # $75.00 per filing - HARDCODED!
```

- **Is it hardcoded?** YES - Line ~860 of `reports.py`
- **Is it configurable per company?** NO
- **Is it stored in settings?** NO
- **Is there a pricing table?** NO

---

## 3. Invoice Generation

### 3.1 How Are Invoices Created?

**Method:** Manual via API endpoint (`POST /invoices/generate`)

Invoices are NOT auto-generated. An admin must manually trigger invoice generation by specifying:
- `company_id` - Which company to bill
- `period_start` - Start of billing period
- `period_end` - End of billing period

### 3.2 Invoice Generation Code

**File:** `api/app/routes/invoices.py` (lines 183-263)

```python
@router.post("/generate")
async def generate_invoice(
    company_id: str,
    period_start: date,
    period_end: date,
    db: Session = Depends(get_db),
):
    """Generate an invoice from unbilled billing events in a period."""
    
    # Get unbilled events in the period
    events = db.query(BillingEvent).filter(
        BillingEvent.company_id == company_id,
        BillingEvent.invoice_id.is_(None),
        BillingEvent.created_at >= datetime.combine(period_start, datetime.min.time()),
        BillingEvent.created_at <= datetime.combine(period_end, datetime.max.time()),
    ).all()
    
    if not events:
        raise HTTPException(status_code=400, detail="No unbilled events in this period")
    
    # Calculate totals
    subtotal = sum(be.amount_cents * be.quantity for be in events)
    
    # Generate invoice number
    year = period_end.year
    month = period_end.month
    count = db.query(Invoice).filter(
        Invoice.company_id == company_id,
        func.extract('year', Invoice.created_at) == year,
    ).count() + 1
    invoice_number = f"INV-{year}-{month:02d}-{count:04d}"
    
    # Create invoice
    invoice = Invoice(
        id=str(uuid4()),
        company_id=company_id,
        invoice_number=invoice_number,
        period_start=period_start,
        period_end=period_end,
        subtotal_cents=subtotal,
        tax_cents=0,
        discount_cents=0,
        total_cents=subtotal,
        status="draft",
        due_date=period_end + timedelta(days=30),
        created_at=datetime.utcnow(),
    )
    db.add(invoice)
    db.flush()
    
    # Link billing events to invoice
    for event in events:
        event.invoice_id = invoice.id
        event.invoiced_at = datetime.utcnow()
    
    # Audit log
    log_event(...)
    
    db.commit()
    
    return {...}
```

### 3.3 Invoice Calculation

| Step | Description |
|------|-------------|
| 1 | Query all `BillingEvent` records where `invoice_id IS NULL` |
| 2 | Filter by `company_id` and date range (`period_start` to `period_end`) |
| 3 | Sum: `subtotal = SUM(amount_cents * quantity)` |
| 4 | Tax: Always `0` (not implemented) |
| 5 | Discount: Always `0` (not implemented) |
| 6 | Total: `subtotal_cents` |

### 3.4 Invoice Statuses

| Status | Meaning | Transitions From | Transitions To |
|--------|---------|------------------|----------------|
| `draft` | Created, not sent | (initial) | `sent`, `void` |
| `sent` | Sent to client | `draft` | `paid`, `overdue`, `void` |
| `paid` | Payment received | `sent`, `overdue` | (final) |
| `overdue` | Past due date | `sent` | `paid`, `void` |
| `void` | Cancelled/voided | `draft`, `sent`, `overdue` | (final) |

**Status Flow Diagram:**

```
                    ┌─────────┐
                    │  draft  │
                    └────┬────┘
                         │ Send
                         ▼
    ┌────────────────►┌──────┐
    │                 │ sent │
    │ Past due date   └──┬───┘
    │                    │ Payment
    │                    ▼
┌───┴────┐          ┌──────┐
│overdue │─────────►│ paid │  (final)
└────────┘ Payment  └──────┘

    Any → ┌──────┐
          │ void │  (final, except from 'paid')
          └──────┘
```

### 3.5 Invoice Line Items

- **Structure:** One `BillingEvent` = One line item
- **Grouping:** No grouping - each billing event is its own line
- **Description:** From `BillingEvent.description` field

```
Invoice INV-2026-01-0001
├── Line 1: FinCEN filing for 123 Main St - $75.00
├── Line 2: FinCEN filing for 456 Oak Ave - $75.00
└── Line 3: FinCEN filing for 789 Pine Rd - $75.00
    ─────────────────────────────────────────
    Subtotal: $225.00
    Tax:      $0.00
    Total:    $225.00
```

---

## 4. API Endpoints

### 4.1 Invoice Endpoints

**File:** `api/app/routes/invoices.py`

| Method | Endpoint | Purpose | Auth Required | Implemented |
|--------|----------|---------|---------------|-------------|
| GET | `/invoices` | List invoices with filters | Client/Admin | ✅ |
| GET | `/invoices/{invoice_id}` | Get invoice with line items | Client/Admin | ✅ |
| POST | `/invoices/generate` | Generate invoice from unbilled events | Admin | ✅ |
| PATCH | `/invoices/{invoice_id}/status` | Update invoice status | Admin | ✅ |
| GET | `/invoices/billing-events/unbilled` | List unbilled billing events | Admin | ✅ |

### 4.2 Billing Event Endpoints

| Method | Endpoint | Purpose | Auth Required | Implemented |
|--------|----------|---------|---------------|-------------|
| (auto) | N/A | Created automatically on filing | System | ✅ |
| GET | `/invoices/billing-events/unbilled` | List unbilled events | Admin | ✅ |

**FINDING:** There is NO dedicated billing event CRUD endpoint. Events are only created automatically when filings are accepted.

### 4.3 Request/Response Schemas

**List Invoices Response:**

```json
{
  "invoices": [
    {
      "id": "uuid",
      "invoice_number": "INV-2026-01-0001",
      "company_id": "uuid",
      "period_start": "2026-01-01",
      "period_end": "2026-01-31",
      "subtotal_cents": 22500,
      "tax_cents": 0,
      "discount_cents": 0,
      "total_cents": 22500,
      "status": "paid",
      "due_date": "2026-02-15",
      "sent_at": "2026-01-15T10:00:00Z",
      "paid_at": "2026-01-20T14:30:00Z",
      "created_at": "2026-01-15T09:00:00Z"
    }
  ],
  "total": 1
}
```

**Invoice Detail Response (with line items):**

```json
{
  "id": "uuid",
  "invoice_number": "INV-2026-01-0001",
  "company_id": "uuid",
  "period_start": "2026-01-01",
  "period_end": "2026-01-31",
  "subtotal_cents": 7500,
  "tax_cents": 0,
  "discount_cents": 0,
  "total_cents": 7500,
  "status": "paid",
  "due_date": "2026-02-15",
  "payment_method": "ach",
  "payment_reference": "ACH-12345",
  "line_items": [
    {
      "id": "uuid",
      "event_type": "filing_accepted",
      "description": "FinCEN filing for 8842 Sunset Boulevard",
      "amount_cents": 7500,
      "quantity": 1,
      "bsa_id": "BSA-20260118-A1B2C3D4",
      "report_id": "uuid",
      "created_at": "2026-01-18T10:00:00Z"
    }
  ]
}
```

---

## 5. Role-Based Access

### 5.1 Who Can See What?

| Role | Can View Own Invoices | Can View All Invoices | Can Generate Invoices | Can Edit Status | Can Edit Prices |
|------|----------------------|----------------------|----------------------|-----------------|-----------------|
| `client_user` | ✅ (company-scoped) | ❌ | ❌ | ❌ | ❌ |
| `client_admin` | ✅ (company-scoped) | ❌ | ❌ | ❌ | ❌ |
| `pct_staff` | ❌ (no nav link) | ❌ | ❌ | ❌ | ❌ |
| `pct_admin` | ✅ | ✅ | ✅ | ✅ | ❌ |
| `coo` | ✅ | ✅ | ✅ | ✅ | ❌ |

**Source:** `web/lib/navigation.ts`

### 5.2 Client Invoice View

**Path:** `/app/invoices`  
**File:** `web/app/(app)/app/invoices/page.tsx`

**What clients see:**
- ✅ Invoice list (own company only)
- ✅ Invoice detail (dialog with line items)
- ✅ Payment status
- ⚠️ Download PDF (button exists but disabled - "Coming soon")
- ❌ Cannot generate invoices
- ❌ Cannot change status

### 5.3 Admin Invoice View

**Path:** `/app/admin/invoices`  
**File:** `web/app/(app)/app/admin/invoices/page.tsx`

**What admins see:**
- ✅ All company invoices
- ✅ Search and filter by status
- ✅ Mark as Sent (draft → sent)
- ✅ Mark as Paid (sent/overdue → paid)
- ✅ Void Invoice
- ⚠️ Download PDF (button exists but disabled)
- ❌ Manual invoice generation (API exists, UI doesn't)
- ❌ Edit prices/amounts

### 5.4 Navigation

**File:** `web/lib/navigation.ts`

| Role | Invoice Nav Location |
|------|---------------------|
| `coo` | Administration > Invoices (`/app/admin/invoices`) |
| `pct_admin` | Operations > Invoices (`/app/admin/invoices`) |
| `client_admin` | Account > Invoices (`/app/invoices`) |
| `client_user` | Account > Invoices (`/app/invoices`) |
| `pct_staff` | **None** (no billing access) |

---

## 6. Frontend Pages

### 6.1 Client Invoice Page

**Path:** `/app/invoices`  
**File:** `web/app/(app)/app/invoices/page.tsx`

**Display:**
- Stats cards:
  - Total Invoices (count)
  - Total Paid (sum of paid invoices)
  - Outstanding (sum of sent + overdue)
  - Overdue (count of overdue)
- Invoice table:
  - Invoice Number
  - Period
  - Amount
  - Status (with badge)
  - Due Date
  - Actions (View, PDF)
- Invoice detail dialog (modal)
- Payment information section (terms, accepted methods, contact)

### 6.2 Admin Invoice Page

**Path:** `/app/admin/invoices`  
**File:** `web/app/(app)/app/admin/invoices/page.tsx`

**Display:**
- Stats cards:
  - Total Invoices
  - Outstanding
  - Paid This Month
  - Overdue
- Search input (by invoice number or company name)
- Status filter dropdown
- Invoice table:
  - Invoice Number
  - Company
  - Period
  - Amount
  - Status
  - Due Date
  - Actions (dropdown menu)
- Invoice detail dialog (modal with line items)

### 6.3 Invoice Detail Sheet Component

**File:** `web/components/admin/invoice-detail-sheet.tsx`

**Features:**
- Slide-out sheet panel
- Invoice summary (subtotal, tax, discount, total)
- Dates section (period, due date, sent, paid)
- Payment info card (for paid invoices)
- Line items table (with BSA ID reference)
- Action buttons (Send, Mark Paid, Download PDF, Void)

**NOTE:** Most action buttons are currently disabled with "Coming soon" tooltips.

---

## 7. Price Configuration

### 7.1 Current Pricing

| Item | Price | Location | Configurable? |
|------|-------|----------|---------------|
| Filing fee | $75.00 | `api/app/routes/reports.py` line ~860 | ❌ NO (hardcoded) |
| Tax | $0.00 | `api/app/routes/invoices.py` | ❌ NO (hardcoded to 0) |
| Discount | $0.00 | `api/app/routes/invoices.py` | ❌ NO (hardcoded to 0) |

### 7.2 Company-Level Pricing

**FINDING: Company-level pricing does NOT exist.**

- ❌ No `billing_rate` field on Company
- ❌ No `pricing_tier` field
- ❌ No separate pricing table
- ❌ No per-company overrides

All companies pay the same hardcoded $75 per filing.

### 7.3 Hardcoded Values Found

| Value | File | Line | Context |
|-------|------|------|---------|
| `7500` | `api/app/routes/reports.py` | ~860 | Filing fee ($75.00) in BillingEvent creation |
| `7500` | `api/app/services/demo_seed.py` | ~603 | Demo billing event amount |
| `7500` | `api/app/routes/reports.py` | ~270 | Revenue calculation (mock) |
| `0` | `api/app/routes/invoices.py` | ~224 | Tax cents (always 0) |
| `0` | `api/app/routes/invoices.py` | ~225 | Discount cents (always 0) |
| `30` | `api/app/routes/invoices.py` | ~228 | Due date offset (30 days) |

---

## 8. Data Flow

### 8.1 Filing → Billing Event → Invoice Flow

```
Staff clicks "File to FinCEN" (simulated in demo mode)
    │
    ▼ POST /reports/{id}/file
┌─────────────────────────────────────────────────────────────────┐
│ 1. Report status → "filed"                                       │
│ 2. FilingSubmission created with receipt_id                      │
│ 3. IF outcome == "accepted" AND report.company_id:               │
│    │                                                             │
│    ▼                                                             │
│    Create BillingEvent:                                          │
│      - company_id = report.company_id                            │
│      - report_id = report.id                                     │
│      - submission_request_id = report.submission_request_id      │
│      - event_type = "filing_accepted"                            │
│      - amount_cents = 7500 (HARDCODED)                          │
│      - description = "FinCEN filing for {property_address}"      │
│      - bsa_id = filing receipt_id                                │
│      - invoice_id = NULL (unbilled)                              │
└─────────────────────────────────────────────────────────────────┘
    │
    │ Later (manual admin action)
    │
    ▼ POST /invoices/generate
┌─────────────────────────────────────────────────────────────────┐
│ 1. Query BillingEvents WHERE:                                    │
│      - company_id = {requested_company}                          │
│      - invoice_id IS NULL                                        │
│      - created_at BETWEEN period_start AND period_end            │
│                                                                  │
│ 2. Calculate: subtotal = SUM(amount_cents * quantity)            │
│                                                                  │
│ 3. Create Invoice:                                               │
│      - invoice_number = "INV-{year}-{month:02d}-{count:04d}"    │
│      - subtotal_cents = calculated sum                           │
│      - tax_cents = 0                                             │
│      - total_cents = subtotal_cents                              │
│      - status = "draft"                                          │
│      - due_date = period_end + 30 days                           │
│                                                                  │
│ 4. Update BillingEvents:                                         │
│      - invoice_id = new_invoice.id                               │
│      - invoiced_at = NOW()                                       │
└─────────────────────────────────────────────────────────────────┘
    │
    ▼ PATCH /invoices/{id}/status?status=sent
┌─────────────────────────────────────────────────────────────────┐
│ Invoice status → "sent"                                          │
│ sent_at = NOW()                                                  │
└─────────────────────────────────────────────────────────────────┘
    │
    │ Client receives email (NOT IMPLEMENTED)
    │ Client views invoice at /app/invoices
    │
    ▼ PATCH /invoices/{id}/status?status=paid
┌─────────────────────────────────────────────────────────────────┐
│ Invoice status → "paid"                                          │
│ paid_at = NOW()                                                  │
│ payment_method = {provided}                                      │
│ payment_reference = {provided}                                   │
└─────────────────────────────────────────────────────────────────┘
```

### 8.2 Payment Flow

**FINDING: No payment processing is implemented.**

- ❌ No Stripe integration
- ❌ No PayPal integration
- ❌ No automatic payment capture
- ✅ Manual payment marking only (admin marks as "paid")

**Current payment methods supported (manual entry only):**
- `check` - Check payment
- `ach` - ACH bank transfer
- `wire` - Wire transfer
- `intercompany` - Internal transfer

---

## 9. Audit Trail

### 9.1 Billing-Related Audit Events

**File:** `api/app/services/audit.py`

| Event Constant | Event Type | When Triggered | Data Captured |
|----------------|------------|----------------|---------------|
| `EVENT_INVOICE_CREATED` | `invoice.created` | Not currently used | - |
| `EVENT_INVOICE_GENERATED` | `invoice.generated` | Invoice generation | invoice_number, total_cents, line_items_count, period |
| `EVENT_INVOICE_SENT` | `invoice.sent` | Status → sent | old_status, new_status |
| `EVENT_INVOICE_PAID` | `invoice.paid` | Status → paid | old_status, new_status |
| `EVENT_INVOICE_VOIDED` | `invoice.voided` | Status → void | old_status, new_status |

**Audit Log Integration:**

```python
# On invoice generation (api/app/routes/invoices.py)
log_event(
    db=db,
    entity_type=ENTITY_INVOICE,
    entity_id=str(invoice.id),
    event_type="invoice.generated",
    actor_type="system",
    details={
        "invoice_number": invoice.invoice_number,
        "total_cents": invoice.total_cents,
        "line_items_count": len(events),
        "period_start": str(period_start),
        "period_end": str(period_end),
    },
)

# On status change
log_change(
    db=db,
    entity_type=ENTITY_INVOICE,
    entity_id=str(invoice.id),
    event_type=f"invoice.{status}",
    old_values={"status": old_status},
    new_values={"status": status},
    actor_type="admin",
)
```

**FINDING:** BillingEvent creation is NOT audited. Consider adding `billing_event.created` audit event.

---

## 10. File Inventory

### 10.1 Backend Files

| File | Purpose | Key Functions |
|------|---------|---------------|
| `api/app/models/billing_event.py` | BillingEvent SQLAlchemy model | Model definition |
| `api/app/models/invoice.py` | Invoice SQLAlchemy model | Model definition, status helpers |
| `api/app/routes/invoices.py` | Invoice API endpoints | list, get, generate, update_status, unbilled |
| `api/app/routes/reports.py` | Report filing (creates BillingEvent) | file_report (line ~854) |
| `api/app/services/audit.py` | Audit logging | log_event, ENTITY_INVOICE constants |
| `api/app/services/demo_seed.py` | Demo data | Creates sample invoice + billing event |
| `api/alembic/versions/20260126_000005_add_multitenancy_billing.py` | Database migration | Creates invoices, billing_events tables |

### 10.2 Frontend Files

| File | Purpose |
|------|---------|
| `web/app/(app)/app/invoices/page.tsx` | Client invoice list page |
| `web/app/(app)/app/admin/invoices/page.tsx` | Admin invoice management page |
| `web/components/admin/invoice-detail-sheet.tsx` | Invoice detail slide-out panel |
| `web/components/admin/invoice-status-badge.tsx` | Status badge component |
| `web/lib/navigation.ts` | Navigation structure (invoice links) |

### 10.3 Schemas

**FINDING:** No dedicated Pydantic schemas file for invoices. Response schemas are inline in `api/app/routes/invoices.py`.

---

## 11. Current Gaps & Enhancement Opportunities

### 11.1 Missing Features

| Priority | Feature | Impact |
|----------|---------|--------|
| 🔴 Critical | Per-company pricing | Required for enterprise sales |
| 🔴 Critical | Admin UI for invoice generation | Currently requires API call |
| 🟠 High | Per-filing price override | Flexibility for special deals |
| 🟠 High | Stripe/payment integration | Automated payment collection |
| 🟠 High | Auto-invoice generation | Monthly invoice cron job |
| 🟠 High | Invoice PDF generation | Professional invoice documents |
| 🟡 Medium | Subscription billing | Flat-fee pricing model |
| 🟡 Medium | Email invoice sending | Automated delivery |
| 🟡 Medium | Manual billing event creation | Credits, adjustments, expedite fees |
| 🟡 Medium | Tax calculation | Support for taxable jurisdictions |
| 🟢 Low | Discount codes | Promotional pricing |
| 🟢 Low | Payment reminders | Automated overdue emails |
| 🟢 Low | Billing history export | CSV/Excel export |

### 11.2 Hardcoded Limitations

To enable flexible pricing, these hardcoded values must be extracted:

```python
# api/app/routes/reports.py line ~860
amount_cents=7500  # → Should come from company.filing_fee_cents or settings

# api/app/routes/invoices.py line ~224-225
tax_cents=0       # → Should be calculated based on company jurisdiction
discount_cents=0  # → Should support discount application

# api/app/routes/invoices.py line ~228
due_date=period_end + timedelta(days=30)  # → Should be company.payment_terms_days
```

### 11.3 Database Schema Changes Needed

For flexible pricing models:

```sql
-- Option 1: Add fields to companies table
ALTER TABLE companies ADD COLUMN filing_fee_cents INTEGER DEFAULT 7500;
ALTER TABLE companies ADD COLUMN payment_terms_days INTEGER DEFAULT 30;
ALTER TABLE companies ADD COLUMN pricing_tier VARCHAR(50) DEFAULT 'standard';

-- Option 2: Create separate pricing table
CREATE TABLE company_pricing (
    id UUID PRIMARY KEY,
    company_id UUID REFERENCES companies(id),
    event_type VARCHAR(50) NOT NULL,
    amount_cents INTEGER NOT NULL,
    effective_from DATE NOT NULL,
    effective_until DATE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- For subscription billing
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY,
    company_id UUID REFERENCES companies(id),
    plan_type VARCHAR(50) NOT NULL,  -- 'per_filing', 'flat_monthly', 'tiered'
    monthly_fee_cents INTEGER,
    included_filings INTEGER,
    overage_fee_cents INTEGER,
    started_at TIMESTAMP NOT NULL,
    ended_at TIMESTAMP,
    status VARCHAR(50) DEFAULT 'active'
);
```

### 11.4 Questions for Product

1. **Visibility:** Should companies be able to see their billing rate?
2. **Editing:** Who can change a company's pricing? Only COO? Admin?
3. **Frequency:** How often should invoices be generated? Monthly? On-demand?
4. **Discounts:** Should we support volume discounts? Promotional codes?
5. **Tax:** Do we need to support tax calculation for any jurisdictions?
6. **Trials:** Should we support free trial periods?
7. **Prepaid:** Should companies be able to prepay for filings?
8. **Credits:** Should we support account credits/refunds?

---

## 12. Pricing Model Analysis

### 12.1 Current Model: Pay-Per-Filing

```
┌────────────────────────────────────────────────────┐
│ CURRENT MODEL: Pay-Per-Filing                       │
├────────────────────────────────────────────────────┤
│ Price:       $75 per filing (hardcoded)            │
│ Billing:     Manual invoice generation             │
│ Payment:     Manual marking (check/ACH/wire)       │
│ Subscription: None                                  │
│ Discounts:   None                                   │
│ Tax:         None                                   │
└────────────────────────────────────────────────────┘
```

### 12.2 Proposed: Configurable Per-Filing

**What would need to change:**

| Component | Change Required |
|-----------|-----------------|
| Company model | Add `filing_fee_cents` field (default: 7500) |
| BillingEvent creation | Use `company.filing_fee_cents` instead of hardcoded 7500 |
| Admin UI | Add rate field to company edit form |
| Company list | Show current rate per company |
| Invoice display | No change needed (amounts from billing events) |

**Code Changes:**

```python
# api/app/models/company.py
filing_fee_cents = Column(Integer, nullable=False, server_default="7500")

# api/app/routes/reports.py
company = db.query(Company).filter(Company.id == report.company_id).first()
billing_event = BillingEvent(
    ...
    amount_cents=company.filing_fee_cents,  # Dynamic!
    ...
)
```

### 12.3 Proposed: Flat Fee / Subscription

**What would need to change:**

| Component | Change Required |
|-----------|-----------------|
| New model | `Subscription` (company_id, plan_type, monthly_fee, filing_limit) |
| BillingEvent creation | Check if within subscription limit, else overage |
| Invoice generation | Include subscription fee + overage charges |
| Cron job | Monthly subscription billing events |
| Admin UI | Subscription management page |

**Data Model:**

```python
class Subscription(Base):
    __tablename__ = "subscriptions"
    
    id = Column(UUID, primary_key=True)
    company_id = Column(UUID, ForeignKey("companies.id"))
    plan_type = Column(String(50))  # 'starter', 'professional', 'enterprise'
    monthly_fee_cents = Column(Integer)
    included_filings = Column(Integer)  # 0 for per-filing plans
    overage_fee_cents = Column(Integer)
    billing_cycle_day = Column(Integer)  # Day of month to bill
    started_at = Column(DateTime)
    status = Column(String(50))  # 'active', 'cancelled', 'past_due'
```

### 12.4 Proposed: Tiered Pricing

**Example Tiers:**

| Tier | Monthly Fee | Included Filings | Overage Rate |
|------|-------------|------------------|--------------|
| Starter | $0 | 0 | $75/filing |
| Professional | $200 | 5 | $60/filing |
| Enterprise | $500 | 20 | $40/filing |
| Unlimited | $1,500 | Unlimited | N/A |

**What would need to change:**

- Pricing rules engine
- Company billing tier assignment
- Invoice generation with tier-aware calculations
- Admin dashboard for tier management
- Self-service tier upgrade (optional)

---

---

## 13. Phase 1 Enhancements (January 30, 2026)

### 13.1 Per-Company Pricing

Companies now have configurable billing rates:

| Field | Type | Default | Purpose |
|-------|------|---------|---------|
| `filing_fee_cents` | Integer | 7500 | Per-filing charge ($75.00) |
| `payment_terms_days` | Integer | 30 | Days until invoice is due |
| `billing_notes` | Text | null | Internal notes about billing |

### 13.2 New API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/companies/{id}/billing-settings` | Get company billing config |
| PATCH | `/companies/{id}/billing-settings` | Update billing settings |
| POST | `/invoices/billing-events` | Create manual billing event |
| GET | `/invoices/billing-events` | List all billing events |

### 13.3 Admin UI Enhancements

**Company Detail Sheet:**
- New "Billing Settings" section
- Edit filing fee per company
- Edit payment terms
- Add internal billing notes

**Invoice Management Page:**
- "Generate Invoice" button with dialog
- Select company and date range
- Preview unbilled events count/total
- "Add Billing Event" button for manual charges/credits

### 13.4 Dynamic Billing Event Creation

BillingEvent creation now uses company's configured rate:

```python
# Before (hardcoded):
amount_cents=7500

# After (dynamic):
company = db.query(Company).filter(Company.id == report.company_id).first()
filing_fee = company.filing_fee_cents if company else 7500
amount_cents=filing_fee
```

### 13.5 Manual Billing Events

Admins can now create manual billing events:
- **Credits** (negative amounts)
- **Manual Adjustments**
- **Expedite Fees**
- **Other charges**

### 13.6 Audit Trail Additions

New audit events:
- `billing_event.created` - Auto-created on filing
- `billing_event.manual_created` - Manual creation by admin
- `company.billing_settings_updated` - Rate/terms changes

---

## Summary

**Current State:**
- ✅ Basic invoicing system is functional
- ✅ Billing events auto-created on filing acceptance
- ✅ Manual invoice generation via API **and UI**
- ✅ Status management (draft → sent → paid)
- ✅ Role-based access implemented
- ✅ **Per-company pricing configurable**
- ✅ **Manual billing events (credits/adjustments)**
- ✅ **Admin UI for billing settings**

**Remaining Limitations:**
- No subscription support
- No payment processing (Stripe)
- No auto-invoice generation (cron)
- No PDF generation

**Recommended Next Steps (Phase 2+):**
1. Implement subscription billing model
2. Add Stripe integration for payments
3. Auto-invoice generation cron job
4. PDF invoice generation
5. Email invoice delivery for automated payments
