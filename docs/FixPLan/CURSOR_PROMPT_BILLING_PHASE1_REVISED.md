# CURSOR PROMPT: Billing System Enhancement - Phase 1 (REVISED)

## 🦈 SHARK CLASSIFICATION: BIG FUCKING SHARK

**Design Principle: ONE PAGE PER ROLE. Everything billing in one place.**

---

## ROLE-BASED BILLING ACCESS (FINAL)

| Role | Sees Billing in Sidebar | Page | Capabilities |
|------|-------------------------|------|--------------|
| `client_user` | ❌ No | - | No billing access |
| `client_admin` | ✅ Yes | `/app/billing` | View own invoices + activity |
| `pct_staff` | ❌ No | - | No billing access |
| `pct_admin` | ✅ Yes | `/app/admin/billing` | Full billing management |
| `coo` | ✅ Yes | `/app/admin/billing` | Full billing management |

---

## WHAT THIS PROMPT DELIVERS

### 1. Database Migration
- Add `filing_fee_cents` to `companies` table (default: 7500)
- Add `payment_terms_days` to `companies` table (default: 30)
- Add `billing_notes` to `companies` table

### 2. Backend: New Consolidated Billing API
**Create file:** `api/app/routes/billing.py`

All billing endpoints in ONE file:

**Client Admin Endpoints (company-scoped):**
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/billing/my/stats` | GET | Stats for my company |
| `/billing/my/invoices` | GET | My company's invoices |
| `/billing/my/invoices/{id}` | GET | Invoice detail |
| `/billing/my/activity` | GET | My company's billing events |

**Admin/COO Endpoints (all companies):**
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/billing/admin/stats` | GET | Stats across all companies |
| `/billing/admin/invoices` | GET | All invoices |
| `/billing/admin/invoices/{id}` | GET | Invoice detail |
| `/billing/admin/invoices/generate` | POST | Generate invoice |
| `/billing/admin/invoices/{id}/status` | PATCH | Update status |
| `/billing/admin/events` | GET | All billing events |
| `/billing/admin/events` | POST | Create manual event |
| `/billing/admin/rates` | GET | All company rates |
| `/billing/admin/rates/{id}` | PATCH | Update company rate |

### 3. Frontend: Two Unified Billing Pages

**Client Admin:** `/app/billing`
```
┌─────────────────────────────────────────────────────────────┐
│ Billing                                                      │
├─────────────────────────────────────────────────────────────┤
│  [Outstanding: $225]  [Paid YTD: $1,350]  [Your Rate: $75]  │
│                                                              │
│  [Invoices Tab]  [Activity Tab]                             │
│                                                              │
│  Invoices: List of their invoices with status               │
│  Activity: All billing events (pending + invoiced)          │
└─────────────────────────────────────────────────────────────┘
```

**Admin/COO:** `/app/admin/billing`
```
┌─────────────────────────────────────────────────────────────┐
│ Billing                                    [Add Event] [Gen]│
├─────────────────────────────────────────────────────────────┤
│  [Outstanding: $4,500]  [Collected: $12K]  [Pending: 23]    │
│                                                              │
│  [Invoices Tab]  [Billing Events Tab]  [Company Rates Tab]  │
│                                                              │
│  Invoices: All companies, filter by status, actions         │
│  Events: All billing events, filter by company/status       │
│  Rates: All companies with their rates, edit inline         │
└─────────────────────────────────────────────────────────────┘
```

### 4. Navigation Updates
- Add "Billing" to sidebar for client_admin → `/app/billing`
- Add "Billing" to sidebar for pct_admin/coo → `/app/admin/billing`
- Remove or redirect old `/app/invoices` and `/app/admin/invoices`

### 5. Kill the Hardcoded Price
Update `api/app/routes/reports.py` to use `company.filing_fee_cents` instead of `7500`

---

## IMPORTANT: USE THE ORIGINAL PROMPT AS BASE

This revised prompt **REPLACES** the navigation/frontend sections of the original.

**Use `CURSOR_PROMPT_BILLING_PHASE1.md` for:**
- Phase 1.1: Database Migration (same)
- Phase 1.2: Company Model Updates (same)
- Phase 1.3: Update BillingEvent Creation (same)

**REPLACE with this prompt for:**
- Phase 1.4-1.5: Use new consolidated `/api/app/routes/billing.py`
- Phase 1.6-1.7: Use new unified billing pages
- Phase 1.8: Navigation updates per this spec

---

## NEW: CONSOLIDATED BILLING API

**Create file:** `api/app/routes/billing.py`

This is a LARGE file (~600 lines). Key sections:

### Schemas (at top of file)
```python
class BillingStatsResponse(BaseModel):
    outstanding_cents: int
    outstanding_dollars: float
    paid_cents: int
    paid_dollars: float
    pending_events_count: int
    pending_events_cents: int
    filing_fee_cents: Optional[int] = None  # Only for client view
    filing_fee_dollars: Optional[float] = None

class BillingEventResponse(BaseModel):
    id: str
    company_id: str
    company_name: Optional[str] = None
    event_type: str
    description: str
    amount_cents: int
    amount_dollars: float
    quantity: int
    total_cents: int
    total_dollars: float
    bsa_id: Optional[str] = None
    invoice_id: Optional[str] = None
    invoice_number: Optional[str] = None
    status: str  # "pending" or "invoiced"
    created_at: datetime

class InvoiceListItemResponse(BaseModel):
    id: str
    company_id: str
    company_name: Optional[str] = None
    invoice_number: str
    period_start: date
    period_end: date
    total_cents: int
    total_dollars: float
    status: str
    due_date: Optional[date]
    line_items_count: int

class CompanyRateResponse(BaseModel):
    company_id: str
    company_name: str
    filing_fee_cents: int
    filing_fee_dollars: float
    payment_terms_days: int
    billing_notes: Optional[str]
    total_billed_dollars: float
```

### Client Admin Endpoints
```python
@router.get("/my/stats")
async def get_my_billing_stats(current_user = Depends(require_client_admin)):
    """Stats for current user's company."""
    # Query outstanding, paid, pending for company_id
    
@router.get("/my/invoices")
async def get_my_invoices(current_user = Depends(require_client_admin)):
    """Invoices for current user's company."""
    # Filter by company_id
    
@router.get("/my/activity")
async def get_my_billing_activity(current_user = Depends(require_client_admin)):
    """Billing events for current user's company."""
    # Filter by company_id, return pending + invoiced
```

### Admin Endpoints
```python
@router.get("/admin/stats")
async def get_admin_billing_stats(current_user = Depends(require_pct_admin)):
    """Stats across all companies."""

@router.get("/admin/invoices")
async def get_all_invoices(company_id: Optional[str], status: Optional[str]):
    """All invoices with filters."""

@router.get("/admin/events")
async def get_all_billing_events(company_id: Optional[str], status: Optional[str]):
    """All billing events with filters."""

@router.get("/admin/rates")
async def get_company_rates():
    """All companies with their billing rates."""

@router.patch("/admin/rates/{company_id}")
async def update_company_rate(company_id: str, request: UpdateCompanyRateRequest):
    """Update a company's billing rate."""

@router.post("/admin/events")
async def create_billing_event(request: CreateBillingEventRequest):
    """Create manual billing event (credit, adjustment)."""

@router.post("/admin/invoices/generate")
async def generate_invoice(request: GenerateInvoiceRequest):
    """Generate invoice from unbilled events."""

@router.patch("/admin/invoices/{invoice_id}/status")
async def update_invoice_status(invoice_id: str, request: UpdateStatusRequest):
    """Update invoice status (sent, paid, void)."""
```

---

## NEW: CLIENT BILLING PAGE

**Create file:** `web/app/(app)/app/billing/page.tsx`

Features:
- Stats cards: Outstanding, Paid YTD, Pending Charges, Your Rate
- Tabs: Invoices, Activity
- Invoice detail dialog (click to view line items)
- Clean, simple interface

Key components:
```tsx
// Stats cards showing company-specific data
<Card>Outstanding: ${stats.outstanding_dollars}</Card>
<Card>Paid (YTD): ${stats.paid_dollars}</Card>
<Card>Pending: {stats.pending_events_count} charges</Card>
<Card>Your Rate: ${stats.filing_fee_dollars}/filing</Card>

// Tabs
<Tabs>
  <TabsList>
    <TabsTrigger value="invoices">Invoices</TabsTrigger>
    <TabsTrigger value="activity">Activity</TabsTrigger>
  </TabsList>
  
  <TabsContent value="invoices">
    {/* Invoice table with status badges */}
  </TabsContent>
  
  <TabsContent value="activity">
    {/* All billing events - pending highlighted */}
  </TabsContent>
</Tabs>
```

---

## NEW: ADMIN BILLING PAGE

**Create file:** `web/app/(app)/app/admin/billing/page.tsx`

Features:
- Header with action buttons: "Add Event", "Generate Invoice"
- Stats cards: Outstanding, Collected (month), Pending Events, Companies
- Tabs: Invoices, Billing Events, Company Rates
- Dialogs for: Generate Invoice, Add Billing Event, Edit Rate

Key components:
```tsx
// Header
<div className="flex justify-between">
  <h1>Billing</h1>
  <div className="flex gap-2">
    <Button onClick={() => setShowEventDialog(true)}>Add Event</Button>
    <Button onClick={() => setShowGenerateDialog(true)}>Generate Invoice</Button>
  </div>
</div>

// Stats cards (all companies)
<Card>Outstanding: ${stats.outstanding_dollars}</Card>
<Card>Collected (Month): ${stats.paid_dollars}</Card>
<Card>Pending Events: {stats.pending_events_count}</Card>
<Card>Companies: {rates.length}</Card>

// Tabs
<Tabs>
  <TabsTrigger value="invoices">Invoices</TabsTrigger>
  <TabsTrigger value="events">Billing Events</TabsTrigger>
  <TabsTrigger value="rates">Company Rates</TabsTrigger>
</Tabs>

// Invoices tab: Table with company name, actions dropdown
// Events tab: Table with company name, status filter
// Rates tab: Table with inline edit button
```

---

## NAVIGATION UPDATES

**Modify file:** `web/lib/navigation.ts`

```typescript
// Find the navigation items for each role and update:

// For client_admin - ADD:
{
  name: "Billing",
  href: "/app/billing",
  icon: DollarSign, // from lucide-react
}

// For pct_admin and coo - ADD:
{
  name: "Billing", 
  href: "/app/admin/billing",
  icon: DollarSign,
}

// REMOVE any existing invoice links like:
// - /app/invoices
// - /app/admin/invoices
```

---

## EXECUTION ORDER

1. **Run migration** - Add columns to companies table
2. **Update Company model** - Add new fields
3. **Update reports.py** - Use company.filing_fee_cents
4. **Create billing.py** - New consolidated API
5. **Register router** - Add to main.py
6. **Create /app/billing** - Client page
7. **Create /app/admin/billing** - Admin page
8. **Update navigation** - Add Billing links
9. **Redirect old pages** - /app/invoices → /app/billing
10. **Test all roles** - Verify access

---

## VERIFICATION CHECKLIST

- [ ] Migration runs: `filing_fee_cents`, `payment_terms_days`, `billing_notes` added
- [ ] Company model updated with new fields
- [ ] BillingEvent creation uses `company.filing_fee_cents`
- [ ] All `/billing/my/*` endpoints work for client_admin
- [ ] All `/billing/admin/*` endpoints work for pct_admin/coo
- [ ] Client billing page loads at `/app/billing`
- [ ] Admin billing page loads at `/app/admin/billing`
- [ ] Can edit company rates from Rates tab
- [ ] Can generate invoice from dialog
- [ ] Can create manual billing event (including credits)
- [ ] Navigation shows "Billing" for correct roles
- [ ] client_user and pct_staff do NOT see Billing

---

## DOCUMENTATION UPDATES

Add to `docs/KilledSharks-2.md`:

```markdown
### 45. Per-Company Billing + Unified UI ✅

**Date:** January 30, 2026

**Problem:**
- $75/filing hardcoded for all companies
- Billing UI scattered across multiple pages
- Client Admin couldn't see billing activity
- Admin couldn't easily manage rates

**Solution:**
- Added per-company pricing fields to Company model
- Created unified `/app/billing` for Client Admin
- Created unified `/app/admin/billing` for Admin/COO
- Consolidated all billing endpoints into `/api/app/routes/billing.py`

**Files Created:**
- `api/app/routes/billing.py` (~600 lines)
- `web/app/(app)/app/billing/page.tsx`
- `web/app/(app)/app/admin/billing/page.tsx`

**Files Modified:**
- `api/app/models/company.py` (new fields)
- `api/app/routes/reports.py` (dynamic pricing)
- `web/lib/navigation.ts` (new Billing links)

**Status:** ✅ Killed
```

---

**🦈 HARPOON LOADED. ONE PAGE PER ROLE. SIMPLE AND CLEAN.**
