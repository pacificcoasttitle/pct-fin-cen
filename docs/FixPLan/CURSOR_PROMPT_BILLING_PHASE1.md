# CURSOR PROMPT: Billing System Enhancement - Phase 1

## 🦈 SHARK CLASSIFICATION: BIG FUCKING SHARK

**This is a multi-phase implementation. Phase 1 focuses on the foundation:**
1. Per-company pricing (configurable filing fee)
2. Admin UI for setting company rates
3. Admin UI for generating invoices

Future phases will add subscriptions, Stripe, auto-invoicing, PDF generation.

---

## CURRENT STATE SUMMARY

Based on `docs/INVOICING_MASTER_TECH_SPEC.md`:

| What Exists | Status |
|-------------|--------|
| BillingEvent model | ✅ Works - created on filing acceptance |
| Invoice model | ✅ Works - manual generation via API |
| Invoice status flow | ✅ draft → sent → paid/void |
| Client invoice view | ✅ `/app/invoices` |
| Admin invoice list | ✅ `/app/admin/invoices` |
| Per-company pricing | ❌ $75 hardcoded everywhere |
| Admin generate invoice UI | ❌ API exists, no UI |
| Manual billing events | ❌ No way to add credits/adjustments |

**THE HARDCODED PROBLEM:**
```python
# api/app/routes/reports.py line ~860
amount_cents=7500  # ← This is the shark we're hunting
```

---

## PHASE 1 DELIVERABLES

### 1. Database Migration
- Add `filing_fee_cents` to `companies` table
- Add `payment_terms_days` to `companies` table

### 2. Backend Changes
- Update Company model with new fields
- Update BillingEvent creation to use company rate
- Add endpoint to update company billing settings
- Add endpoint for manual billing events (credits/adjustments)

### 3. Frontend Changes
- Add billing settings section to company edit page
- Add "Generate Invoice" button/dialog to admin invoices page
- Add "Create Billing Event" dialog for manual adjustments

### 4. Documentation
- Update INVOICING_MASTER_TECH_SPEC.md
- Add to KilledSharks-2.md

---

## PHASE 1.1: DATABASE MIGRATION

**Create file:** `api/alembic/versions/20260130_add_company_billing_settings.py`

```python
"""Add company billing settings

Revision ID: 20260130_billing
Revises: [PREVIOUS_MIGRATION]
Create Date: 2026-01-30

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = '20260130_billing'
down_revision = None  # Set to actual previous revision
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add billing configuration to companies
    op.add_column(
        'companies',
        sa.Column('filing_fee_cents', sa.Integer(), nullable=False, server_default='7500')
    )
    op.add_column(
        'companies',
        sa.Column('payment_terms_days', sa.Integer(), nullable=False, server_default='30')
    )
    op.add_column(
        'companies',
        sa.Column('billing_notes', sa.Text(), nullable=True)
    )
    
    # Add index for billing queries
    op.create_index('ix_companies_filing_fee_cents', 'companies', ['filing_fee_cents'])


def downgrade() -> None:
    op.drop_index('ix_companies_filing_fee_cents', table_name='companies')
    op.drop_column('companies', 'billing_notes')
    op.drop_column('companies', 'payment_terms_days')
    op.drop_column('companies', 'filing_fee_cents')
```

---

## PHASE 1.2: BACKEND MODEL UPDATES

### Update Company Model

**Modify file:** `api/app/models/company.py`

Add the new billing fields:

```python
class Company(Base):
    # ... existing fields ...
    
    # Billing contact (existing)
    billing_email = Column(String(255), nullable=True)
    billing_contact_name = Column(String(255), nullable=True)
    address = Column(JSONBType, nullable=True)
    phone = Column(String(50), nullable=True)
    
    # NEW: Billing configuration
    filing_fee_cents = Column(Integer, nullable=False, server_default="7500")  # $75.00 default
    payment_terms_days = Column(Integer, nullable=False, server_default="30")  # Net 30 default
    billing_notes = Column(Text, nullable=True)  # Internal notes about billing arrangements
    
    # Relationships (existing)
    billing_events = relationship("BillingEvent", back_populates="company")
    invoices = relationship("Invoice", back_populates="company")
    
    # NEW: Computed property for display
    @property
    def filing_fee_dollars(self) -> float:
        """Return filing fee in dollars for display."""
        return self.filing_fee_cents / 100.0
```

---

## PHASE 1.3: UPDATE BILLING EVENT CREATION

**Modify file:** `api/app/routes/reports.py`

Find the billing event creation code (around line 854-866) and update:

**BEFORE:**
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
```

**AFTER:**
```python
# Create billing event for accepted filings
if outcome == "accepted" and report.company_id:
    # Get company's configured filing fee
    company = db.query(Company).filter(Company.id == report.company_id).first()
    filing_fee = company.filing_fee_cents if company else 7500  # Fallback to default
    
    billing_event = BillingEvent(
        company_id=report.company_id,
        report_id=report.id,
        submission_request_id=report.submission_request_id,
        event_type="filing_accepted",
        description=f"FinCEN filing for {report.property_address_text}",
        amount_cents=filing_fee,  # Use company's configured rate!
        quantity=1,
        bsa_id=submission.receipt_id,
        created_at=datetime.utcnow(),
    )
    db.add(billing_event)
    
    # Audit log for billing event creation
    log_event(
        db=db,
        entity_type="billing_event",
        entity_id=str(billing_event.id),
        event_type="billing_event.created",
        actor_type="system",
        details={
            "event_type": "filing_accepted",
            "amount_cents": filing_fee,
            "company_id": str(report.company_id),
            "report_id": str(report.id),
        },
    )
```

**IMPORTANT:** Also add `from app.models.company import Company` at the top if not already imported.

---

## PHASE 1.4: ADD BILLING SETTINGS ENDPOINTS

**Modify file:** `api/app/routes/companies.py`

Add endpoint to update company billing settings:

```python
from pydantic import BaseModel
from typing import Optional


class CompanyBillingSettingsUpdate(BaseModel):
    """Request to update company billing settings."""
    filing_fee_cents: Optional[int] = None
    payment_terms_days: Optional[int] = None
    billing_notes: Optional[str] = None
    billing_email: Optional[str] = None
    billing_contact_name: Optional[str] = None


class CompanyBillingSettingsResponse(BaseModel):
    """Response with company billing settings."""
    company_id: str
    company_name: str
    filing_fee_cents: int
    filing_fee_dollars: float
    payment_terms_days: int
    billing_notes: Optional[str]
    billing_email: Optional[str]
    billing_contact_name: Optional[str]


@router.get("/{company_id}/billing-settings", response_model=CompanyBillingSettingsResponse)
async def get_company_billing_settings(
    company_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_pct_admin),  # Only PCT admins
):
    """
    Get billing settings for a company.
    
    GET /companies/{company_id}/billing-settings
    """
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    return CompanyBillingSettingsResponse(
        company_id=str(company.id),
        company_name=company.name,
        filing_fee_cents=company.filing_fee_cents,
        filing_fee_dollars=company.filing_fee_cents / 100.0,
        payment_terms_days=company.payment_terms_days,
        billing_notes=company.billing_notes,
        billing_email=company.billing_email,
        billing_contact_name=company.billing_contact_name,
    )


@router.patch("/{company_id}/billing-settings", response_model=CompanyBillingSettingsResponse)
async def update_company_billing_settings(
    company_id: str,
    settings: CompanyBillingSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_pct_admin),  # Only PCT admins
):
    """
    Update billing settings for a company.
    
    PATCH /companies/{company_id}/billing-settings
    {
        "filing_fee_cents": 6000,  // $60.00
        "payment_terms_days": 45,
        "billing_notes": "Enterprise client - volume discount"
    }
    """
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    # Track old values for audit
    old_values = {
        "filing_fee_cents": company.filing_fee_cents,
        "payment_terms_days": company.payment_terms_days,
    }
    
    # Update fields if provided
    if settings.filing_fee_cents is not None:
        if settings.filing_fee_cents < 0:
            raise HTTPException(status_code=400, detail="Filing fee cannot be negative")
        company.filing_fee_cents = settings.filing_fee_cents
    
    if settings.payment_terms_days is not None:
        if settings.payment_terms_days < 0:
            raise HTTPException(status_code=400, detail="Payment terms cannot be negative")
        company.payment_terms_days = settings.payment_terms_days
    
    if settings.billing_notes is not None:
        company.billing_notes = settings.billing_notes
    
    if settings.billing_email is not None:
        company.billing_email = settings.billing_email
    
    if settings.billing_contact_name is not None:
        company.billing_contact_name = settings.billing_contact_name
    
    # Audit log
    log_change(
        db=db,
        entity_type="company",
        entity_id=str(company.id),
        event_type="company.billing_settings_updated",
        old_values=old_values,
        new_values={
            "filing_fee_cents": company.filing_fee_cents,
            "payment_terms_days": company.payment_terms_days,
        },
        actor_type="admin",
        actor_id=str(current_user.id),
    )
    
    db.commit()
    db.refresh(company)
    
    return CompanyBillingSettingsResponse(
        company_id=str(company.id),
        company_name=company.name,
        filing_fee_cents=company.filing_fee_cents,
        filing_fee_dollars=company.filing_fee_cents / 100.0,
        payment_terms_days=company.payment_terms_days,
        billing_notes=company.billing_notes,
        billing_email=company.billing_email,
        billing_contact_name=company.billing_contact_name,
    )
```

---

## PHASE 1.5: ADD MANUAL BILLING EVENT ENDPOINT

**Modify file:** `api/app/routes/invoices.py`

Add endpoint for creating manual billing events (credits, adjustments):

```python
class ManualBillingEventCreate(BaseModel):
    """Request to create a manual billing event."""
    company_id: str
    event_type: str  # manual_adjustment, expedite_fee, credit, etc.
    description: str
    amount_cents: int  # Can be negative for credits
    quantity: int = 1


class BillingEventResponse(BaseModel):
    """Response for a billing event."""
    id: str
    company_id: str
    event_type: str
    description: str
    amount_cents: int
    quantity: int
    invoice_id: Optional[str]
    created_at: datetime


@router.post("/billing-events", response_model=BillingEventResponse)
async def create_manual_billing_event(
    event: ManualBillingEventCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_pct_admin),
):
    """
    Create a manual billing event (credit, adjustment, expedite fee).
    
    POST /invoices/billing-events
    {
        "company_id": "uuid",
        "event_type": "manual_adjustment",
        "description": "Credit for service issue",
        "amount_cents": -5000  // Negative for credit
    }
    """
    # Validate company exists
    company = db.query(Company).filter(Company.id == event.company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    # Validate event type
    valid_types = ["manual_adjustment", "credit", "expedite_fee", "monthly_minimum", "other"]
    if event.event_type not in valid_types:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid event type. Must be one of: {valid_types}"
        )
    
    billing_event = BillingEvent(
        id=str(uuid4()),
        company_id=event.company_id,
        event_type=event.event_type,
        description=event.description,
        amount_cents=event.amount_cents,
        quantity=event.quantity,
        created_at=datetime.utcnow(),
        created_by_user_id=str(current_user.id),
    )
    db.add(billing_event)
    
    # Audit log
    log_event(
        db=db,
        entity_type="billing_event",
        entity_id=str(billing_event.id),
        event_type="billing_event.manual_created",
        actor_type="admin",
        actor_id=str(current_user.id),
        details={
            "event_type": event.event_type,
            "amount_cents": event.amount_cents,
            "description": event.description,
            "company_id": event.company_id,
        },
    )
    
    db.commit()
    db.refresh(billing_event)
    
    return BillingEventResponse(
        id=str(billing_event.id),
        company_id=str(billing_event.company_id),
        event_type=billing_event.event_type,
        description=billing_event.description,
        amount_cents=billing_event.amount_cents,
        quantity=billing_event.quantity,
        invoice_id=str(billing_event.invoice_id) if billing_event.invoice_id else None,
        created_at=billing_event.created_at,
    )
```

---

## PHASE 1.6: FRONTEND - COMPANY BILLING SETTINGS

### Add Billing Settings to Company Edit Page

**Modify file:** `web/app/(app)/app/admin/companies/[id]/page.tsx`

(Or wherever company editing happens)

Add a "Billing Settings" section:

```tsx
import { useState, useEffect } from "react";

interface BillingSettings {
  filing_fee_cents: number;
  filing_fee_dollars: number;
  payment_terms_days: number;
  billing_notes: string | null;
  billing_email: string | null;
  billing_contact_name: string | null;
}

// In the component:
const [billingSettings, setBillingSettings] = useState<BillingSettings | null>(null);
const [editingBilling, setEditingBilling] = useState(false);
const [filingFee, setFilingFee] = useState<string>("");
const [paymentTerms, setPaymentTerms] = useState<string>("");
const [billingNotes, setBillingNotes] = useState<string>("");

// Fetch billing settings
useEffect(() => {
  if (company?.id) {
    fetch(`${API_BASE}/companies/${company.id}/billing-settings`, {
      credentials: "include",
    })
      .then(res => res.json())
      .then(data => {
        setBillingSettings(data);
        setFilingFee(String(data.filing_fee_dollars));
        setPaymentTerms(String(data.payment_terms_days));
        setBillingNotes(data.billing_notes || "");
      });
  }
}, [company?.id]);

// Save billing settings
const saveBillingSettings = async () => {
  const feeCents = Math.round(parseFloat(filingFee) * 100);
  
  const res = await fetch(`${API_BASE}/companies/${company.id}/billing-settings`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      filing_fee_cents: feeCents,
      payment_terms_days: parseInt(paymentTerms),
      billing_notes: billingNotes || null,
    }),
  });
  
  if (res.ok) {
    const data = await res.json();
    setBillingSettings(data);
    setEditingBilling(false);
    toast.success("Billing settings updated");
  } else {
    toast.error("Failed to update billing settings");
  }
};

// In the JSX, add a section:
<div className="bg-white rounded-lg border p-6">
  <div className="flex items-center justify-between mb-4">
    <h3 className="text-lg font-semibold">Billing Settings</h3>
    {!editingBilling ? (
      <Button variant="outline" size="sm" onClick={() => setEditingBilling(true)}>
        Edit
      </Button>
    ) : (
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => setEditingBilling(false)}>
          Cancel
        </Button>
        <Button size="sm" onClick={saveBillingSettings}>
          Save
        </Button>
      </div>
    )}
  </div>
  
  {billingSettings && (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-500 mb-1">
          Filing Fee
        </label>
        {editingBilling ? (
          <div className="relative">
            <span className="absolute left-3 top-2 text-gray-500">$</span>
            <input
              type="number"
              step="0.01"
              value={filingFee}
              onChange={(e) => setFilingFee(e.target.value)}
              className="w-full pl-7 pr-3 py-2 border rounded-md"
            />
          </div>
        ) : (
          <p className="text-lg font-semibold">
            ${billingSettings.filing_fee_dollars.toFixed(2)}
          </p>
        )}
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-500 mb-1">
          Payment Terms
        </label>
        {editingBilling ? (
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
              className="w-20 px-3 py-2 border rounded-md"
            />
            <span className="text-gray-500">days</span>
          </div>
        ) : (
          <p className="text-lg font-semibold">
            Net {billingSettings.payment_terms_days}
          </p>
        )}
      </div>
      
      <div className="col-span-2">
        <label className="block text-sm font-medium text-gray-500 mb-1">
          Billing Notes (Internal)
        </label>
        {editingBilling ? (
          <textarea
            value={billingNotes}
            onChange={(e) => setBillingNotes(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border rounded-md"
            placeholder="e.g., Volume discount agreement, special terms..."
          />
        ) : (
          <p className="text-gray-700">
            {billingSettings.billing_notes || <span className="text-gray-400 italic">No notes</span>}
          </p>
        )}
      </div>
    </div>
  )}
</div>
```

---

## PHASE 1.7: FRONTEND - GENERATE INVOICE DIALOG

**Modify file:** `web/app/(app)/app/admin/invoices/page.tsx`

Add a "Generate Invoice" button and dialog:

```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";

// State for generate dialog
const [showGenerateDialog, setShowGenerateDialog] = useState(false);
const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
const [periodStart, setPeriodStart] = useState<Date | undefined>();
const [periodEnd, setPeriodEnd] = useState<Date | undefined>();
const [companies, setCompanies] = useState<{id: string, name: string}[]>([]);
const [unbilledCount, setUnbilledCount] = useState<number>(0);
const [generating, setGenerating] = useState(false);

// Fetch companies list
useEffect(() => {
  fetch(`${API_BASE}/companies`, { credentials: "include" })
    .then(res => res.json())
    .then(data => setCompanies(data.companies || []));
}, []);

// Check unbilled events when company/dates selected
useEffect(() => {
  if (selectedCompanyId && periodStart && periodEnd) {
    const params = new URLSearchParams({
      company_id: selectedCompanyId,
      start_date: format(periodStart, "yyyy-MM-dd"),
      end_date: format(periodEnd, "yyyy-MM-dd"),
    });
    fetch(`${API_BASE}/invoices/billing-events/unbilled?${params}`, {
      credentials: "include",
    })
      .then(res => res.json())
      .then(data => setUnbilledCount(data.events?.length || 0));
  }
}, [selectedCompanyId, periodStart, periodEnd]);

// Generate invoice
const generateInvoice = async () => {
  if (!selectedCompanyId || !periodStart || !periodEnd) return;
  
  setGenerating(true);
  try {
    const res = await fetch(`${API_BASE}/invoices/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        company_id: selectedCompanyId,
        period_start: format(periodStart, "yyyy-MM-dd"),
        period_end: format(periodEnd, "yyyy-MM-dd"),
      }),
    });
    
    if (res.ok) {
      toast.success("Invoice generated successfully");
      setShowGenerateDialog(false);
      // Refresh invoice list
      fetchInvoices();
    } else {
      const data = await res.json();
      toast.error(data.detail || "Failed to generate invoice");
    }
  } finally {
    setGenerating(false);
  }
};

// Add button to page header
<div className="flex items-center justify-between mb-6">
  <h1 className="text-2xl font-bold">Invoices</h1>
  <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
    <DialogTrigger asChild>
      <Button>
        <Plus className="h-4 w-4 mr-2" />
        Generate Invoice
      </Button>
    </DialogTrigger>
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Generate Invoice</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        {/* Company Select */}
        <div>
          <label className="block text-sm font-medium mb-1">Company</label>
          <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
            <SelectTrigger>
              <SelectValue placeholder="Select company..." />
            </SelectTrigger>
            <SelectContent>
              {companies.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Date Range */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Period Start</label>
            <input
              type="date"
              value={periodStart ? format(periodStart, "yyyy-MM-dd") : ""}
              onChange={(e) => setPeriodStart(e.target.value ? new Date(e.target.value) : undefined)}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Period End</label>
            <input
              type="date"
              value={periodEnd ? format(periodEnd, "yyyy-MM-dd") : ""}
              onChange={(e) => setPeriodEnd(e.target.value ? new Date(e.target.value) : undefined)}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
        </div>
        
        {/* Preview */}
        {selectedCompanyId && periodStart && periodEnd && (
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm">
              <span className="font-medium">{unbilledCount}</span> unbilled events in this period
            </p>
          </div>
        )}
        
        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setShowGenerateDialog(false)}>
            Cancel
          </Button>
          <Button 
            onClick={generateInvoice}
            disabled={!selectedCompanyId || !periodStart || !periodEnd || unbilledCount === 0 || generating}
          >
            {generating ? "Generating..." : "Generate Invoice"}
          </Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</div>
```

---

## PHASE 1.8: FRONTEND - MANUAL BILLING EVENT DIALOG

Add ability for admins to create manual billing events (credits, adjustments):

```tsx
// State for billing event dialog
const [showBillingEventDialog, setShowBillingEventDialog] = useState(false);
const [eventType, setEventType] = useState<string>("manual_adjustment");
const [eventCompanyId, setEventCompanyId] = useState<string>("");
const [eventDescription, setEventDescription] = useState<string>("");
const [eventAmount, setEventAmount] = useState<string>("");
const [isCredit, setIsCredit] = useState(false);

// Create billing event
const createBillingEvent = async () => {
  const amountCents = Math.round(parseFloat(eventAmount) * 100);
  const finalAmount = isCredit ? -Math.abs(amountCents) : Math.abs(amountCents);
  
  const res = await fetch(`${API_BASE}/invoices/billing-events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      company_id: eventCompanyId,
      event_type: eventType,
      description: eventDescription,
      amount_cents: finalAmount,
    }),
  });
  
  if (res.ok) {
    toast.success(isCredit ? "Credit applied" : "Billing event created");
    setShowBillingEventDialog(false);
    // Reset form
    setEventDescription("");
    setEventAmount("");
    setIsCredit(false);
  } else {
    toast.error("Failed to create billing event");
  }
};

// Dialog component
<Dialog open={showBillingEventDialog} onOpenChange={setShowBillingEventDialog}>
  <DialogTrigger asChild>
    <Button variant="outline">
      <Plus className="h-4 w-4 mr-2" />
      Add Billing Event
    </Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Create Billing Event</DialogTitle>
    </DialogHeader>
    <div className="space-y-4">
      {/* Company */}
      <div>
        <label className="block text-sm font-medium mb-1">Company</label>
        <Select value={eventCompanyId} onValueChange={setEventCompanyId}>
          <SelectTrigger>
            <SelectValue placeholder="Select company..." />
          </SelectTrigger>
          <SelectContent>
            {companies.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      {/* Event Type */}
      <div>
        <label className="block text-sm font-medium mb-1">Type</label>
        <Select value={eventType} onValueChange={setEventType}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="manual_adjustment">Manual Adjustment</SelectItem>
            <SelectItem value="credit">Credit</SelectItem>
            <SelectItem value="expedite_fee">Expedite Fee</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {/* Amount */}
      <div>
        <label className="block text-sm font-medium mb-1">Amount</label>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-2 text-gray-500">$</span>
            <input
              type="number"
              step="0.01"
              value={eventAmount}
              onChange={(e) => setEventAmount(e.target.value)}
              className="w-full pl-7 pr-3 py-2 border rounded-md"
            />
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isCredit}
              onChange={(e) => setIsCredit(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">Credit (negative)</span>
          </label>
        </div>
      </div>
      
      {/* Description */}
      <div>
        <label className="block text-sm font-medium mb-1">Description</label>
        <textarea
          value={eventDescription}
          onChange={(e) => setEventDescription(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 border rounded-md"
          placeholder="Reason for this charge or credit..."
        />
      </div>
      
      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => setShowBillingEventDialog(false)}>
          Cancel
        </Button>
        <Button 
          onClick={createBillingEvent}
          disabled={!eventCompanyId || !eventDescription || !eventAmount}
        >
          Create
        </Button>
      </div>
    </div>
  </DialogContent>
</Dialog>
```

---

## PHASE 1.9: UPDATE DEMO SEED

**Modify file:** `api/app/services/demo_seed.py`

Update demo data to use company's configured rate:

Find the billing event creation and update:

```python
# Instead of hardcoded 7500:
filing_fee = company.filing_fee_cents if company else 7500

billing_event = BillingEvent(
    ...
    amount_cents=filing_fee,  # Use company's rate
    ...
)
```

---

## PHASE 1.10: DOCUMENTATION UPDATES

### Update INVOICING_MASTER_TECH_SPEC.md

Add a new section documenting the enhancements:

```markdown
## 13. Phase 1 Enhancements (January 2026)

### 13.1 Per-Company Pricing

Companies now have configurable billing rates:

| Field | Type | Default | Purpose |
|-------|------|---------|---------|
| `filing_fee_cents` | Integer | 7500 | Per-filing charge |
| `payment_terms_days` | Integer | 30 | Days until due |
| `billing_notes` | Text | null | Internal notes |

### 13.2 Admin Billing Settings UI

Admins can now edit company billing settings at:
- Path: `/app/admin/companies/{id}` (Billing Settings section)
- Permissions: `pct_admin`, `coo` only

### 13.3 Generate Invoice UI

Admins can now generate invoices from the UI:
- Path: `/app/admin/invoices` (Generate Invoice button)
- Shows unbilled event count before generation
- Creates invoice in "draft" status

### 13.4 Manual Billing Events

Admins can create manual billing events:
- Credits (negative amounts)
- Adjustments
- Expedite fees
- Other charges

### 13.5 Audit Trail Additions

New audit events:
- `billing_event.created` - Auto-created on filing
- `billing_event.manual_created` - Manual creation
- `company.billing_settings_updated` - Rate changes
```

### Add to KilledSharks-2.md

```markdown
## 🟠 Major Features

### 45. Per-Company Billing Configuration ✅

**Date:** January 30, 2026

**Problem:** All companies charged hardcoded $75/filing with no flexibility for enterprise pricing, volume discounts, or special arrangements.

**Solution:** 
- Added `filing_fee_cents`, `payment_terms_days`, `billing_notes` to Company model
- Updated BillingEvent creation to use company's configured rate
- Added admin UI for editing company billing settings
- Added admin UI for generating invoices
- Added manual billing event creation (credits, adjustments)

**Database Changes:**
- Migration: `20260130_add_company_billing_settings.py`
- New columns on `companies` table

**API Endpoints Added:**
- `GET /companies/{id}/billing-settings`
- `PATCH /companies/{id}/billing-settings`
- `POST /invoices/billing-events`

**Frontend Changes:**
- Billing Settings section on company edit page
- Generate Invoice dialog on admin invoices page
- Add Billing Event dialog

**Status:** ✅ Killed
```

---

## VERIFICATION CHECKLIST

Before marking complete:

- [ ] Migration runs successfully
- [ ] Company model has new fields
- [ ] Default filing fee is $75 (7500 cents)
- [ ] Filing creates BillingEvent with company's rate
- [ ] Admin can view company billing settings
- [ ] Admin can edit company billing settings
- [ ] Billing settings changes are audited
- [ ] Admin can generate invoices from UI
- [ ] Admin can create manual billing events
- [ ] Manual billing events can be negative (credits)
- [ ] Demo seed uses company rates
- [ ] All changes documented

---

## EXECUTION ORDER

1. **Create migration** (Phase 1.1)
2. **Run migration:** `alembic upgrade head`
3. **Update Company model** (Phase 1.2)
4. **Update BillingEvent creation** (Phase 1.3)
5. **Add billing settings endpoints** (Phase 1.4)
6. **Add manual billing event endpoint** (Phase 1.5)
7. **Frontend: Company billing settings** (Phase 1.6)
8. **Frontend: Generate invoice dialog** (Phase 1.7)
9. **Frontend: Manual billing event dialog** (Phase 1.8)
10. **Update demo seed** (Phase 1.9)
11. **Update documentation** (Phase 1.10)

---

## FUTURE PHASES

**Phase 2:** Subscription Billing
- Subscription model (monthly fee, included filings, overage)
- Subscription management UI
- Auto-billing cron job

**Phase 3:** Stripe Integration
- Payment processing
- Auto-charge subscriptions
- Payment webhooks

**Phase 4:** Auto-Invoicing
- Monthly invoice generation cron
- Email delivery
- PDF generation

---

**🦈 HARPOON READY. LET'S KILL THIS SHARK.**
