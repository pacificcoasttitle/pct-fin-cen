# CURSOR PROMPT: Invoice System + Trust Buyer Form - Complete Implementation

## 🦈 MISSION

Based on investigation findings, we need to:
1. **Invoice System:** Create API, wire frontend, auto-create billing events
2. **Trust Buyer Form:** Create `BuyerTrustForm.tsx` with full FinCEN fields
3. **Update KilledSharks.md** with DNS completion and these fixes

---

# PART 1: INVOICE SYSTEM

## 1.1 Create Invoice API Routes

**File:** `api/app/routes/invoices.py` (NEW)

```python
"""
Invoice API Routes
Manages invoices and billing events for filed reports.
"""

from datetime import datetime, date
from typing import List, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models.invoice import Invoice
from app.models.billing_event import BillingEvent
from app.models.company import Company
from app.models.report import Report

router = APIRouter(prefix="/invoices", tags=["invoices"])


# ============================================================================
# LIST INVOICES
# ============================================================================

@router.get("")
async def list_invoices(
    company_id: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = Query(50, le=100),
    offset: int = 0,
    db: Session = Depends(get_db),
):
    """
    List invoices with optional filters.
    For demo, if no company_id provided, returns demo company invoices.
    """
    query = db.query(Invoice)
    
    # Filter by company
    if company_id:
        query = query.filter(Invoice.company_id == company_id)
    else:
        # Default to demo company
        demo_company = db.query(Company).filter(Company.code == "DEMO").first()
        if demo_company:
            query = query.filter(Invoice.company_id == demo_company.id)
    
    # Filter by status
    if status:
        query = query.filter(Invoice.status == status)
    
    # Order by created_at desc
    query = query.order_by(Invoice.created_at.desc())
    
    total = query.count()
    invoices = query.offset(offset).limit(limit).all()
    
    return {
        "invoices": [
            {
                "id": inv.id,
                "invoice_number": inv.invoice_number,
                "period_start": inv.period_start.isoformat() if inv.period_start else None,
                "period_end": inv.period_end.isoformat() if inv.period_end else None,
                "subtotal_cents": inv.subtotal_cents,
                "tax_cents": inv.tax_cents,
                "discount_cents": inv.discount_cents,
                "total_cents": inv.total_cents,
                "status": inv.status,
                "due_date": inv.due_date.isoformat() if inv.due_date else None,
                "sent_at": inv.sent_at.isoformat() if inv.sent_at else None,
                "paid_at": inv.paid_at.isoformat() if inv.paid_at else None,
                "created_at": inv.created_at.isoformat() if inv.created_at else None,
            }
            for inv in invoices
        ],
        "total": total,
    }


# ============================================================================
# GET INVOICE DETAIL
# ============================================================================

@router.get("/{invoice_id}")
async def get_invoice(
    invoice_id: str,
    db: Session = Depends(get_db),
):
    """Get invoice with line items (billing events)."""
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    # Get billing events for this invoice
    billing_events = db.query(BillingEvent).filter(
        BillingEvent.invoice_id == invoice_id
    ).all()
    
    return {
        "id": invoice.id,
        "invoice_number": invoice.invoice_number,
        "company_id": invoice.company_id,
        "period_start": invoice.period_start.isoformat() if invoice.period_start else None,
        "period_end": invoice.period_end.isoformat() if invoice.period_end else None,
        "subtotal_cents": invoice.subtotal_cents,
        "tax_cents": invoice.tax_cents,
        "discount_cents": invoice.discount_cents,
        "total_cents": invoice.total_cents,
        "status": invoice.status,
        "due_date": invoice.due_date.isoformat() if invoice.due_date else None,
        "sent_at": invoice.sent_at.isoformat() if invoice.sent_at else None,
        "paid_at": invoice.paid_at.isoformat() if invoice.paid_at else None,
        "payment_method": invoice.payment_method,
        "payment_reference": invoice.payment_reference,
        "notes": invoice.notes,
        "created_at": invoice.created_at.isoformat() if invoice.created_at else None,
        "line_items": [
            {
                "id": be.id,
                "event_type": be.event_type,
                "description": be.description,
                "amount_cents": be.amount_cents,
                "quantity": be.quantity,
                "bsa_id": be.bsa_id,
                "report_id": be.report_id,
                "created_at": be.created_at.isoformat() if be.created_at else None,
            }
            for be in billing_events
        ],
    }


# ============================================================================
# LIST BILLING EVENTS (Unbilled)
# ============================================================================

@router.get("/billing-events/unbilled")
async def list_unbilled_events(
    company_id: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Get unbilled billing events (not yet attached to an invoice)."""
    query = db.query(BillingEvent).filter(BillingEvent.invoice_id.is_(None))
    
    if company_id:
        query = query.filter(BillingEvent.company_id == company_id)
    else:
        demo_company = db.query(Company).filter(Company.code == "DEMO").first()
        if demo_company:
            query = query.filter(BillingEvent.company_id == demo_company.id)
    
    events = query.order_by(BillingEvent.created_at.desc()).all()
    
    return {
        "billing_events": [
            {
                "id": be.id,
                "event_type": be.event_type,
                "description": be.description,
                "amount_cents": be.amount_cents,
                "quantity": be.quantity,
                "bsa_id": be.bsa_id,
                "report_id": be.report_id,
                "created_at": be.created_at.isoformat() if be.created_at else None,
            }
            for be in events
        ],
        "total": len(events),
        "total_cents": sum(be.amount_cents * be.quantity for be in events),
    }


# ============================================================================
# GENERATE INVOICE (For a period)
# ============================================================================

@router.post("/generate")
async def generate_invoice(
    company_id: str,
    period_start: date,
    period_end: date,
    db: Session = Depends(get_db),
):
    """
    Generate an invoice from unbilled billing events in a period.
    """
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
    
    db.commit()
    
    return {
        "id": invoice.id,
        "invoice_number": invoice.invoice_number,
        "total_cents": invoice.total_cents,
        "line_items_count": len(events),
        "status": invoice.status,
    }


# ============================================================================
# UPDATE INVOICE STATUS
# ============================================================================

@router.patch("/{invoice_id}/status")
async def update_invoice_status(
    invoice_id: str,
    status: str,
    payment_method: Optional[str] = None,
    payment_reference: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Update invoice status (send, pay, void)."""
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    valid_statuses = ["draft", "sent", "paid", "void", "overdue"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    invoice.status = status
    
    if status == "sent":
        invoice.sent_at = datetime.utcnow()
    elif status == "paid":
        invoice.paid_at = datetime.utcnow()
        if payment_method:
            invoice.payment_method = payment_method
        if payment_reference:
            invoice.payment_reference = payment_reference
    elif status == "void":
        invoice.voided_at = datetime.utcnow()
    
    db.commit()
    
    return {"success": True, "status": invoice.status}
```

## 1.2 Register Invoice Router

**File:** `api/app/main.py`

Add to imports and router registration:

```python
from app.routes.invoices import router as invoices_router

# In the router registration section:
app.include_router(invoices_router)
```

## 1.3 Auto-Create BillingEvent on Filing

**File:** `api/app/routes/reports.py`

Find the filing endpoint (likely `POST /reports/{id}/file` or similar) and add BillingEvent creation:

```python
from app.models.billing_event import BillingEvent

# Inside the file_report function, after successful filing:

# Create billing event for this filing
billing_event = BillingEvent(
    id=str(uuid4()),
    company_id=report.company_id,
    report_id=report.id,
    submission_request_id=report.submission_request_id,
    event_type="filing_accepted",
    description=f"FinCEN filing for {report.property_address_text}",
    amount_cents=7500,  # $75.00 per filing
    quantity=1,
    bsa_id=report.receipt_id,
    created_at=datetime.utcnow(),
)
db.add(billing_event)
```

## 1.4 Update Seed Data to Include Billing Events

**File:** `api/app/services/demo_seed.py`

Add billing event for the filed report (Scenario 5):

```python
# After creating report_5 (the filed report), add:

from app.models.billing_event import BillingEvent
from app.models.invoice import Invoice

# Create billing event for filed report
billing_event_1 = BillingEvent(
    id=str(uuid4()),
    company_id=demo_company.id,
    report_id=report5_id,
    submission_request_id=req5_id,
    event_type="filing_accepted",
    description=f"FinCEN filing for 8842 Sunset Boulevard, West Hollywood, CA 90069",
    amount_cents=7500,  # $75
    quantity=1,
    bsa_id="BSA-20260118-A1B2C3D4",
    created_at=datetime.utcnow() - timedelta(days=8),
)
db.add(billing_event_1)

# Create a sample invoice with this billing event
invoice_1 = Invoice(
    id=str(uuid4()),
    company_id=demo_company.id,
    invoice_number="INV-2026-01-0001",
    period_start=date.today().replace(day=1),
    period_end=date.today(),
    subtotal_cents=7500,
    tax_cents=0,
    discount_cents=0,
    total_cents=7500,
    status="paid",
    due_date=date.today() + timedelta(days=30),
    sent_at=datetime.utcnow() - timedelta(days=7),
    paid_at=datetime.utcnow() - timedelta(days=5),
    payment_method="ach",
    payment_reference="ACH-12345",
    created_at=datetime.utcnow() - timedelta(days=8),
)
db.add(invoice_1)
db.flush()

# Link billing event to invoice
billing_event_1.invoice_id = invoice_1.id
billing_event_1.invoiced_at = datetime.utcnow() - timedelta(days=7)

print(f"   💰 Invoice created: {invoice_1.invoice_number} ($75.00, Paid)")
```

## 1.5 Wire Invoice Detail Sheet to Real Data

**File:** `web/components/admin/invoice-detail-sheet.tsx`

Replace `getMockLineItems` with real API fetch:

```typescript
// Add state for line items
const [lineItems, setLineItems] = useState<any[]>([]);
const [loadingItems, setLoadingItems] = useState(false);

// Fetch invoice details when sheet opens
useEffect(() => {
  if (open && invoice?.id) {
    fetchInvoiceDetails(invoice.id);
  }
}, [open, invoice?.id]);

const fetchInvoiceDetails = async (invoiceId: string) => {
  setLoadingItems(true);
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/invoices/${invoiceId}`
    );
    if (response.ok) {
      const data = await response.json();
      setLineItems(data.line_items || []);
    }
  } catch (error) {
    console.error("Failed to fetch invoice details:", error);
    // Fall back to computed items from props
    setLineItems([{
      id: invoice.id,
      description: `FinCEN filing - ${invoice.property_address || "Property"}`,
      amount_cents: 7500,
      quantity: 1,
      bsa_id: invoice.receipt_id,
    }]);
  } finally {
    setLoadingItems(false);
  }
};

// Use lineItems in the render instead of getMockLineItems()
```

## 1.6 Update Client Invoice Page

**File:** `web/app/(app)/app/invoices/page.tsx`

Add invoice detail view and improve the table:

```typescript
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Receipt,
  RefreshCw,
  Eye,
  Download,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
} from "lucide-react";
import { format } from "date-fns";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

interface Invoice {
  id: string;
  invoice_number: string;
  period_start: string;
  period_end: string;
  subtotal_cents: number;
  tax_cents: number;
  discount_cents: number;
  total_cents: number;
  status: "draft" | "sent" | "paid" | "void" | "overdue";
  due_date: string | null;
  sent_at: string | null;
  paid_at: string | null;
  created_at: string;
}

interface InvoiceDetail extends Invoice {
  line_items: {
    id: string;
    event_type: string;
    description: string;
    amount_cents: number;
    quantity: number;
    bsa_id: string | null;
    report_id: string | null;
  }[];
}

const statusConfig = {
  draft: { label: "Draft", variant: "secondary" as const, icon: FileText },
  sent: { label: "Sent", variant: "default" as const, icon: Clock },
  paid: { label: "Paid", variant: "success" as const, icon: CheckCircle2 },
  void: { label: "Void", variant: "destructive" as const, icon: AlertCircle },
  overdue: { label: "Overdue", variant: "destructive" as const, icon: AlertCircle },
};

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceDetail | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchInvoices = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const response = await fetch(`${API_BASE_URL}/invoices`);
      if (response.ok) {
        const data = await response.json();
        setInvoices(data.invoices || []);
      }
    } catch (error) {
      console.error("Failed to fetch invoices:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchInvoiceDetail = async (invoiceId: string) => {
    setLoadingDetail(true);
    try {
      const response = await fetch(`${API_BASE_URL}/invoices/${invoiceId}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedInvoice(data);
        setSheetOpen(true);
      }
    } catch (error) {
      console.error("Failed to fetch invoice detail:", error);
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Invoices</h1>
          <p className="text-muted-foreground mt-1">
            View and manage your billing history
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => fetchInvoices(true)}
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {formatCurrency(invoices.reduce((sum, inv) => sum + inv.total_cents, 0))}
            </div>
            <p className="text-xs text-muted-foreground">Total Billed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(
                invoices
                  .filter((inv) => inv.status === "paid")
                  .reduce((sum, inv) => sum + inv.total_cents, 0)
              )}
            </div>
            <p className="text-xs text-muted-foreground">Paid</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{invoices.length}</div>
            <p className="text-xs text-muted-foreground">Total Invoices</p>
          </CardContent>
        </Card>
      </div>

      {/* Loading State */}
      {loading && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!loading && invoices.length === 0 && (
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No invoices yet</h3>
            <p className="text-muted-foreground">
              Invoices will appear here after filings are completed.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Invoices Table */}
      {!loading && invoices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Invoice History</CardTitle>
            <CardDescription>Click an invoice to view details</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => {
                  const status = statusConfig[invoice.status];
                  const StatusIcon = status.icon;

                  return (
                    <TableRow
                      key={invoice.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => fetchInvoiceDetail(invoice.id)}
                    >
                      <TableCell className="font-mono font-medium">
                        {invoice.invoice_number}
                      </TableCell>
                      <TableCell>
                        {invoice.period_start && invoice.period_end
                          ? `${format(new Date(invoice.period_start), "MMM d")} - ${format(new Date(invoice.period_end), "MMM d, yyyy")}`
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(invoice.total_cents)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={status.variant} className="flex items-center gap-1 w-fit">
                          <StatusIcon className="h-3 w-3" />
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(invoice.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              fetchInvoiceDetail(invoice.id);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              // PDF download - placeholder
                              alert("PDF download coming soon!");
                            }}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Invoice Detail Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-[500px] sm:w-[600px] overflow-y-auto">
          {loadingDetail ? (
            <div className="space-y-4 pt-8">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          ) : selectedInvoice ? (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  {selectedInvoice.invoice_number}
                </SheetTitle>
                <SheetDescription>
                  {selectedInvoice.period_start && selectedInvoice.period_end
                    ? `Billing period: ${format(new Date(selectedInvoice.period_start), "MMM d")} - ${format(new Date(selectedInvoice.period_end), "MMM d, yyyy")}`
                    : "Invoice details"}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Status & Total */}
                <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Total</p>
                    <p className="text-3xl font-bold">
                      {formatCurrency(selectedInvoice.total_cents)}
                    </p>
                  </div>
                  <Badge variant={statusConfig[selectedInvoice.status].variant} className="text-lg px-4 py-2">
                    {statusConfig[selectedInvoice.status].label}
                  </Badge>
                </div>

                {/* Payment Info (if paid) */}
                {selectedInvoice.status === "paid" && selectedInvoice.paid_at && (
                  <Card className="border-green-200 bg-green-50">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 text-green-700">
                        <CheckCircle2 className="h-5 w-5" />
                        <span className="font-medium">
                          Paid on {format(new Date(selectedInvoice.paid_at), "MMM d, yyyy")}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Line Items */}
                <div>
                  <h4 className="font-semibold mb-3">Line Items</h4>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Description</TableHead>
                          <TableHead>BSA ID</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedInvoice.line_items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>{item.description}</TableCell>
                            <TableCell className="font-mono text-sm">
                              {item.bsa_id || "-"}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(item.amount_cents * item.quantity)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Summary */}
                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatCurrency(selectedInvoice.subtotal_cents)}</span>
                  </div>
                  {selectedInvoice.discount_cents > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Discount</span>
                      <span>-{formatCurrency(selectedInvoice.discount_cents)}</span>
                    </div>
                  )}
                  {selectedInvoice.tax_cents > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tax</span>
                      <span>{formatCurrency(selectedInvoice.tax_cents)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold text-lg pt-2 border-t">
                    <span>Total</span>
                    <span>{formatCurrency(selectedInvoice.total_cents)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <Button variant="outline" className="flex-1">
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
```

---

# PART 2: TRUST BUYER FORM

## 2.1 Create Trustee Card Component

**File:** `web/components/party-portal/TrusteeCard.tsx` (NEW)

```tsx
"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, Trash2, User } from "lucide-react";
import { AddressFields } from "./AddressFields";
import {
  TrusteeData,
  US_STATES,
  CITIZENSHIP_OPTIONS,
  ID_TYPES,
  AddressData,
} from "./types";

interface TrusteeCardProps {
  trustee: TrusteeData;
  index: number;
  canDelete: boolean;
  onChange: (updated: TrusteeData) => void;
  onDelete: () => void;
}

export function TrusteeCard({
  trustee,
  index,
  canDelete,
  onChange,
  onDelete,
}: TrusteeCardProps) {
  const [isOpen, setIsOpen] = useState(true);

  const updateField = (field: string, value: any) => {
    onChange({ ...trustee, [field]: value });
  };

  const updateAddress = (address: AddressData) => {
    onChange({ ...trustee, address });
  };

  const displayName =
    trustee.type === "individual"
      ? trustee.full_name || `Trustee ${index + 1}`
      : trustee.entity_name || `Trustee ${index + 1}`;

  return (
    <Card className="border-purple-200 bg-purple-50/30">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center gap-2 p-0 h-auto hover:bg-transparent"
              >
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                  <User className="h-4 w-4 text-purple-600" />
                </div>
                <div className="text-left">
                  <CardTitle className="text-base">{displayName}</CardTitle>
                  <p className="text-xs text-muted-foreground capitalize">
                    {trustee.type} Trustee
                  </p>
                </div>
                {isOpen ? (
                  <ChevronUp className="h-4 w-4 ml-2" />
                ) : (
                  <ChevronDown className="h-4 w-4 ml-2" />
                )}
              </Button>
            </CollapsibleTrigger>
            {canDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDelete}
                className="text-red-500 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="space-y-6">
            {/* Trustee Type */}
            <div>
              <Label>Trustee Type *</Label>
              <Select
                value={trustee.type}
                onValueChange={(v) => updateField("type", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Individual</SelectItem>
                  <SelectItem value="entity">Entity/Organization</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Individual Trustee Fields */}
            {trustee.type === "individual" && (
              <>
                <div>
                  <Label>Full Legal Name *</Label>
                  <Input
                    value={trustee.full_name || ""}
                    onChange={(e) => updateField("full_name", e.target.value)}
                    placeholder="Full legal name"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Date of Birth *</Label>
                    <Input
                      type="date"
                      value={trustee.date_of_birth || ""}
                      onChange={(e) => updateField("date_of_birth", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>SSN *</Label>
                    <Input
                      value={trustee.ssn || ""}
                      onChange={(e) => updateField("ssn", e.target.value)}
                      placeholder="XXX-XX-XXXX"
                      maxLength={11}
                    />
                  </div>
                </div>

                <div>
                  <Label>Citizenship *</Label>
                  <Select
                    value={trustee.citizenship || ""}
                    onValueChange={(v) => updateField("citizenship", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select citizenship" />
                    </SelectTrigger>
                    <SelectContent>
                      {CITIZENSHIP_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <AddressFields
                  address={trustee.address || {}}
                  onChange={updateAddress}
                  title="Trustee Address"
                />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Phone</Label>
                    <Input
                      value={trustee.phone || ""}
                      onChange={(e) => updateField("phone", e.target.value)}
                      placeholder="(XXX) XXX-XXXX"
                    />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={trustee.email || ""}
                      onChange={(e) => updateField("email", e.target.value)}
                      placeholder="email@example.com"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Entity Trustee Fields */}
            {trustee.type === "entity" && (
              <>
                <div>
                  <Label>Entity Name *</Label>
                  <Input
                    value={trustee.entity_name || ""}
                    onChange={(e) => updateField("entity_name", e.target.value)}
                    placeholder="Legal entity name"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Entity Type *</Label>
                    <Select
                      value={trustee.entity_type || ""}
                      onValueChange={(v) => updateField("entity_type", v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="llc">LLC</SelectItem>
                        <SelectItem value="corporation">Corporation</SelectItem>
                        <SelectItem value="bank">Bank/Financial Institution</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>EIN *</Label>
                    <Input
                      value={trustee.ein || ""}
                      onChange={(e) => updateField("ein", e.target.value)}
                      placeholder="XX-XXXXXXX"
                      maxLength={10}
                    />
                  </div>
                </div>

                <AddressFields
                  address={trustee.business_address || {}}
                  onChange={(addr) => updateField("business_address", addr)}
                  title="Business Address"
                />

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Contact Name *</Label>
                    <Input
                      value={trustee.contact_name || ""}
                      onChange={(e) => updateField("contact_name", e.target.value)}
                      placeholder="Contact person"
                    />
                  </div>
                  <div>
                    <Label>Contact Phone</Label>
                    <Input
                      value={trustee.contact_phone || ""}
                      onChange={(e) => updateField("contact_phone", e.target.value)}
                      placeholder="(XXX) XXX-XXXX"
                    />
                  </div>
                  <div>
                    <Label>Contact Email</Label>
                    <Input
                      type="email"
                      value={trustee.contact_email || ""}
                      onChange={(e) => updateField("contact_email", e.target.value)}
                      placeholder="email@example.com"
                    />
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
```

## 2.2 Create BuyerTrustForm Component

**File:** `web/components/party-portal/BuyerTrustForm.tsx` (NEW)

```tsx
"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Building2,
  Users,
  DollarSign,
  Plus,
  ShieldCheck,
} from "lucide-react";
import { v4 as uuidv4 } from "uuid";

import { AddressFields } from "./AddressFields";
import { TrusteeCard } from "./TrusteeCard";
import { PaymentSourceCard } from "./PaymentSourceCard";
import { CertificationSection } from "./CertificationSection";
import {
  PartySubmissionData,
  TrusteeData,
  SettlorData,
  BeneficiaryData,
  PaymentSourceData,
  TRUST_TYPES,
  US_STATES,
} from "./types";

interface BuyerTrustFormProps {
  data: PartySubmissionData;
  onChange: (data: PartySubmissionData) => void;
  purchasePrice?: number;
}

export function BuyerTrustForm({
  data,
  onChange,
  purchasePrice = 0,
}: BuyerTrustFormProps) {
  const updateField = (field: keyof PartySubmissionData, value: any) => {
    onChange({ ...data, [field]: value });
  };

  // =========================================================================
  // TRUSTEES
  // =========================================================================

  const trustees = data.trustees || [];

  const addTrustee = () => {
    const newTrustee: TrusteeData = {
      id: uuidv4(),
      type: "individual",
    };
    updateField("trustees", [...trustees, newTrustee]);
  };

  const updateTrustee = (index: number, updated: TrusteeData) => {
    const newTrustees = [...trustees];
    newTrustees[index] = updated;
    updateField("trustees", newTrustees);
  };

  const removeTrustee = (index: number) => {
    updateField(
      "trustees",
      trustees.filter((_, i) => i !== index)
    );
  };

  // =========================================================================
  // SETTLORS
  // =========================================================================

  const settlors = data.settlors || [];

  const addSettlor = () => {
    const newSettlor: SettlorData = {
      id: uuidv4(),
      full_name: "",
      is_beneficiary: false,
    };
    updateField("settlors", [...settlors, newSettlor]);
  };

  const updateSettlor = (index: number, field: string, value: any) => {
    const newSettlors = [...settlors];
    newSettlors[index] = { ...newSettlors[index], [field]: value };
    updateField("settlors", newSettlors);
  };

  const removeSettlor = (index: number) => {
    updateField(
      "settlors",
      settlors.filter((_, i) => i !== index)
    );
  };

  // =========================================================================
  // BENEFICIARIES
  // =========================================================================

  const beneficiaries = data.beneficiaries || [];

  const addBeneficiary = () => {
    const newBeneficiary: BeneficiaryData = {
      id: uuidv4(),
      full_name: "",
    };
    updateField("beneficiaries", [...beneficiaries, newBeneficiary]);
  };

  const updateBeneficiary = (index: number, field: string, value: any) => {
    const newBeneficiaries = [...beneficiaries];
    newBeneficiaries[index] = { ...newBeneficiaries[index], [field]: value };
    updateField("beneficiaries", newBeneficiaries);
  };

  const removeBeneficiary = (index: number) => {
    updateField(
      "beneficiaries",
      beneficiaries.filter((_, i) => i !== index)
    );
  };

  // =========================================================================
  // PAYMENT SOURCES
  // =========================================================================

  const paymentSources = data.payment_sources || [];

  const addPaymentSource = () => {
    const newSource: PaymentSourceData = {
      id: uuidv4(),
      source_type: "trust_funds",
      amount_cents: 0,
    };
    updateField("payment_sources", [...paymentSources, newSource]);
  };

  const updatePaymentSource = (index: number, updated: PaymentSourceData) => {
    const newSources = [...paymentSources];
    newSources[index] = updated;
    updateField("payment_sources", newSources);
  };

  const removePaymentSource = (index: number) => {
    updateField(
      "payment_sources",
      paymentSources.filter((_, i) => i !== index)
    );
  };

  const totalPayment = paymentSources.reduce(
    (sum, s) => sum + (s.amount_cents || 0),
    0
  );
  const purchasePriceCents = purchasePrice * 100;
  const paymentComplete = totalPayment >= purchasePriceCents;

  // =========================================================================
  // RENDER
  // =========================================================================

  return (
    <div className="space-y-8">
      {/* SECTION 1: TRUST INFORMATION */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-purple-600" />
            Trust Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label>Trust Name *</Label>
            <Input
              value={data.trust_name || ""}
              onChange={(e) => updateField("trust_name", e.target.value)}
              placeholder="The Smith Family Trust"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Trust Type *</Label>
              <Select
                value={data.trust_type || ""}
                onValueChange={(v) => updateField("trust_type", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select trust type" />
                </SelectTrigger>
                <SelectContent>
                  {TRUST_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date Established *</Label>
              <Input
                type="date"
                value={data.trust_date || ""}
                onChange={(e) => updateField("trust_date", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Tax ID (EIN or SSN) *</Label>
              <Input
                value={data.trust_ein || ""}
                onChange={(e) => updateField("trust_ein", e.target.value)}
                placeholder="XX-XXXXXXX"
              />
            </div>
            <div>
              <Label>State of Formation *</Label>
              <Select
                value={data.state_of_formation || ""}
                onValueChange={(v) => updateField("state_of_formation", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  {US_STATES.map((state) => (
                    <SelectItem key={state.value} value={state.value}>
                      {state.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_revocable"
              checked={data.is_revocable || false}
              onCheckedChange={(checked) =>
                updateField("is_revocable", checked)
              }
            />
            <Label htmlFor="is_revocable" className="cursor-pointer">
              This is a revocable trust
            </Label>
          </div>

          <Separator />

          <AddressFields
            address={data.address || {}}
            onChange={(addr) => updateField("address", addr)}
            title="Trust Address"
          />
        </CardContent>
      </Card>

      {/* SECTION 2: TRUSTEES */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-600" />
              Trustees
            </CardTitle>
            <Button variant="outline" size="sm" onClick={addTrustee}>
              <Plus className="h-4 w-4 mr-1" />
              Add Trustee
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Add all trustees who have authority over this trust.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {trustees.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No trustees added yet. Click "Add Trustee" to begin.</p>
            </div>
          ) : (
            trustees.map((trustee, index) => (
              <TrusteeCard
                key={trustee.id}
                trustee={trustee}
                index={index}
                canDelete={trustees.length > 1}
                onChange={(updated) => updateTrustee(index, updated)}
                onDelete={() => removeTrustee(index)}
              />
            ))
          )}
        </CardContent>
      </Card>

      {/* SECTION 3: SETTLORS/GRANTORS */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              Settlors / Grantors
            </CardTitle>
            <Button variant="outline" size="sm" onClick={addSettlor}>
              <Plus className="h-4 w-4 mr-1" />
              Add Settlor
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Identify the person(s) who created and funded this trust.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {settlors.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <p>No settlors added. Click "Add Settlor" if applicable.</p>
            </div>
          ) : (
            settlors.map((settlor, index) => (
              <Card key={settlor.id} className="border-blue-200 bg-blue-50/30">
                <CardContent className="pt-4 space-y-4">
                  <div className="flex justify-between items-start">
                    <Label>Settlor {index + 1}</Label>
                    {settlors.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSettlor(index)}
                        className="text-red-500"
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Full Name *</Label>
                      <Input
                        value={settlor.full_name}
                        onChange={(e) =>
                          updateSettlor(index, "full_name", e.target.value)
                        }
                        placeholder="Full legal name"
                      />
                    </div>
                    <div>
                      <Label>Date of Birth</Label>
                      <Input
                        type="date"
                        value={settlor.date_of_birth || ""}
                        onChange={(e) =>
                          updateSettlor(index, "date_of_birth", e.target.value)
                        }
                      />
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={settlor.is_beneficiary}
                      onCheckedChange={(checked) =>
                        updateSettlor(index, "is_beneficiary", checked)
                      }
                    />
                    <Label className="cursor-pointer">
                      Also a beneficiary of this trust
                    </Label>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </CardContent>
      </Card>

      {/* SECTION 4: BENEFICIARIES */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-green-600" />
              Beneficiaries
            </CardTitle>
            <Button variant="outline" size="sm" onClick={addBeneficiary}>
              <Plus className="h-4 w-4 mr-1" />
              Add Beneficiary
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Identify the beneficiaries of this trust.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {beneficiaries.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <p>No beneficiaries added. Click "Add Beneficiary" if applicable.</p>
            </div>
          ) : (
            beneficiaries.map((beneficiary, index) => (
              <Card key={beneficiary.id} className="border-green-200 bg-green-50/30">
                <CardContent className="pt-4 space-y-4">
                  <div className="flex justify-between items-start">
                    <Label>Beneficiary {index + 1}</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeBeneficiary(index)}
                      className="text-red-500"
                    >
                      Remove
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Name *</Label>
                      <Input
                        value={beneficiary.full_name}
                        onChange={(e) =>
                          updateBeneficiary(index, "full_name", e.target.value)
                        }
                        placeholder="Beneficiary name"
                      />
                    </div>
                    <div>
                      <Label>Interest / Percentage</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={beneficiary.percentage_interest || ""}
                        onChange={(e) =>
                          updateBeneficiary(
                            index,
                            "percentage_interest",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        placeholder="e.g. 50"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Nature of Interest</Label>
                    <Input
                      value={beneficiary.interest_nature || ""}
                      onChange={(e) =>
                        updateBeneficiary(index, "interest_nature", e.target.value)
                      }
                      placeholder="e.g. Income beneficiary, Remainder beneficiary"
                    />
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </CardContent>
      </Card>

      {/* SECTION 5: PAYMENT INFORMATION */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              Payment Information
            </CardTitle>
            <Button variant="outline" size="sm" onClick={addPaymentSource}>
              <Plus className="h-4 w-4 mr-1" />
              Add Payment Source
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Provide information about the source(s) of funds for this purchase.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Payment Progress */}
          {purchasePrice > 0 && (
            <div className="p-4 bg-slate-50 rounded-lg">
              <div className="flex justify-between text-sm mb-2">
                <span>Purchase Price:</span>
                <span className="font-semibold">
                  ${purchasePrice.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span>Total Documented:</span>
                <span
                  className={`font-semibold ${
                    paymentComplete ? "text-green-600" : "text-amber-600"
                  }`}
                >
                  ${(totalPayment / 100).toLocaleString()}
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    paymentComplete ? "bg-green-500" : "bg-amber-500"
                  }`}
                  style={{
                    width: `${Math.min(
                      (totalPayment / purchasePriceCents) * 100,
                      100
                    )}%`,
                  }}
                />
              </div>
              {!paymentComplete && (
                <p className="text-xs text-amber-600 mt-2">
                  Please document payment sources totaling the full purchase
                  price.
                </p>
              )}
            </div>
          )}

          {paymentSources.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No payment sources added. Click "Add Payment Source" to begin.</p>
            </div>
          ) : (
            paymentSources.map((source, index) => (
              <PaymentSourceCard
                key={source.id}
                source={source}
                index={index}
                canDelete={true}
                onChange={(updated) => updatePaymentSource(index, updated)}
                onDelete={() => removePaymentSource(index)}
              />
            ))
          )}
        </CardContent>
      </Card>

      {/* SECTION 6: CERTIFICATION */}
      <CertificationSection
        partyType="buyer_trust"
        certified={data.certified || false}
        signature={data.digital_signature || ""}
        trustName={data.trust_name}
        onCertifiedChange={(checked) => updateField("certified", checked)}
        onSignatureChange={(sig) => updateField("digital_signature", sig)}
      />
    </div>
  );
}
```

## 2.3 Update DynamicPartyForm Routing

**File:** `web/components/party-portal/index.tsx`

Find the form selection logic and add the buyer trust case:

```typescript
// Add import at top
import { BuyerTrustForm } from "./BuyerTrustForm";

// In the form routing logic, add this case BEFORE the generic trust fallback:

if (isBuyer && entityType === "trust") {
  return (
    <BuyerTrustForm
      data={formData}
      onChange={onFormChange}
      purchasePrice={purchasePrice}
    />
  );
}

// The existing generic trust case will now only handle seller trusts:
if (entityType === "trust") {
  return <GenericTrustForm ... />  // Now only for seller trusts
}
```

## 2.4 Export TrusteeCard and BuyerTrustForm

**File:** `web/components/party-portal/index.tsx`

Add exports:

```typescript
export { TrusteeCard } from "./TrusteeCard";
export { BuyerTrustForm } from "./BuyerTrustForm";
```

---

# PART 3: UPDATE KILLEDSHARKS.MD

Add these entries to the KilledSharks.md file:

```markdown
---

### 18. DNS Configuration Complete ✅

**Task:** Configure custom domain fincenclear.com

**Actions Completed:**
- ✅ DNS A record added: @ → 76.76.21.21 (Vercel)
- ✅ DNS CNAME added: www → cname.vercel-dns.com
- ✅ Domain added in Vercel dashboard
- ✅ SSL certificate auto-provisioned
- ✅ CORS updated for fincenclear.com

**Result:** https://fincenclear.com now live and functional

**Status:** ✅ Killed

---

### 19. Invoice System - Full Implementation ✅

**Problem:** Invoice page existed but:
- Used filed reports as proxy (no real invoice records)
- No billing events created on filing
- Detail sheet used mock data
- No invoice API endpoints

**Solution:**

**1. Created Invoice API** (`api/app/routes/invoices.py`)
| Endpoint | Purpose |
|----------|---------|
| `GET /invoices` | List invoices with filters |
| `GET /invoices/{id}` | Get invoice + line items |
| `GET /invoices/billing-events/unbilled` | List unbilled events |
| `POST /invoices/generate` | Generate invoice for period |
| `PATCH /invoices/{id}/status` | Update status (send/pay/void) |

**2. Auto-Create BillingEvent on Filing**
- When report is filed, creates BillingEvent with $75 charge
- Links to report and includes BSA receipt ID

**3. Updated Seed Data**
- Created sample invoice (INV-2026-01-0001)
- Created billing event linked to filed report
- Status: Paid via ACH

**4. Wired Invoice Page to Real API**
- Fetches from `/invoices` endpoint
- Stats cards show real totals
- Table shows invoice history
- Detail sheet shows line items from API

**Files Created:**
- `api/app/routes/invoices.py` (NEW - 200+ lines)

**Files Changed:**
- `api/app/main.py` (register router)
- `api/app/routes/reports.py` (create billing event on file)
- `api/app/services/demo_seed.py` (add invoice + billing event)
- `web/app/(app)/app/invoices/page.tsx` (API integration)
- `web/components/admin/invoice-detail-sheet.tsx` (real data)

**Status:** ✅ Killed

---

### 20. Trust Buyer Form - Complete Implementation ✅

**Problem:** When buyer is a Trust, party portal used generic form missing:
- Multiple trustees (only had single trustee field)
- Settlor/grantor information
- Beneficiary information  
- Payment sources (required for buyers)

**Solution:**

**1. Created TrusteeCard Component**
- Supports individual OR entity trustees
- Collapsible cards like BeneficialOwnerCard
- Full fields for each type

**2. Created BuyerTrustForm Component**
Complete form with 6 sections:
| Section | Contents |
|---------|----------|
| Trust Information | Name, type, date, EIN, state, revocable flag |
| Trustees | Dynamic list with TrusteeCard components |
| Settlors/Grantors | Who created the trust |
| Beneficiaries | Who benefits, percentage interest |
| Payment Information | Reuses PaymentSourceCard with running total |
| Certification | Trust-specific certification language |

**3. Updated DynamicPartyForm Routing**
- `buyer + trust` → BuyerTrustForm (NEW)
- `seller + trust` → GenericTrustForm (existing)

**Files Created:**
- `web/components/party-portal/TrusteeCard.tsx` (NEW - 250+ lines)
- `web/components/party-portal/BuyerTrustForm.tsx` (NEW - 450+ lines)

**Files Changed:**
- `web/components/party-portal/index.tsx` (routing + exports)

**Type Infrastructure Used (already existed):**
- ✅ TrusteeData interface
- ✅ SettlorData interface
- ✅ BeneficiaryData interface
- ✅ TRUST_TYPES constant
- ✅ CERTIFICATION_TEXTS.buyer_trust

**Status:** ✅ Killed

---

## Updated Summary

| Category | Count |
|----------|-------|
| 🔴 Critical Fixes | 8 |
| 🟠 Major Features | 8 |
| 🎨 UX/Design | 2 |
| 🔧 Configuration | 2 |
| 📄 Documentation | 3 |
| 🎯 Demo Data & API | 1 |

**Total Sharks Killed: 24** 🦈

---

## Updated Testing Checklist

### Invoice System
- [ ] `GET /invoices` returns list of invoices
- [ ] `GET /invoices/{id}` returns invoice with line items
- [ ] Filing a report creates BillingEvent
- [ ] Demo reset creates sample invoice
- [ ] Invoice page shows real data
- [ ] Invoice detail sheet shows line items
- [ ] Stats cards show correct totals

### Trust Buyer Form
- [ ] Party portal routes buyer+trust to BuyerTrustForm
- [ ] Trust information section works
- [ ] Can add/remove multiple trustees
- [ ] TrusteeCard supports individual and entity
- [ ] Can add/remove settlors
- [ ] Can add/remove beneficiaries
- [ ] Payment sources with running total
- [ ] Certification section displays
- [ ] Form submits successfully
```

---

# VERIFICATION CHECKLIST

After implementing all parts:

## Invoice System
- [ ] `api/app/routes/invoices.py` created
- [ ] Router registered in `main.py`
- [ ] BillingEvent created when report filed
- [ ] Seed data includes invoice + billing event
- [ ] Invoice page fetches from `/invoices`
- [ ] Invoice detail shows line items
- [ ] Stats reflect real totals

## Trust Buyer Form
- [ ] `TrusteeCard.tsx` created
- [ ] `BuyerTrustForm.tsx` created
- [ ] DynamicPartyForm routes buyer+trust correctly
- [ ] All sections render
- [ ] Add/remove trustees works
- [ ] Add/remove settlors works
- [ ] Add/remove beneficiaries works
- [ ] Payment sources with total validation
- [ ] Certification works

## KilledSharks.md
- [ ] DNS entry added (#18)
- [ ] Invoice entry added (#19)
- [ ] Trust form entry added (#20)
- [ ] Summary updated to 24 sharks
- [ ] Testing checklist updated

---

**This is the final polish. After this, the demo is COMPLETE.** 🦈🔱
