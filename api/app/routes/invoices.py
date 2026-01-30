"""
Invoice API Routes
Manages invoices and billing events for filed reports.
"""

from datetime import datetime, date, timedelta
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
from app.services.audit import log_event, log_change, ENTITY_INVOICE

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
                "id": str(inv.id),
                "invoice_number": inv.invoice_number,
                "company_id": str(inv.company_id) if inv.company_id else None,
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
        "id": str(invoice.id),
        "invoice_number": invoice.invoice_number,
        "company_id": str(invoice.company_id) if invoice.company_id else None,
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
                "id": str(be.id),
                "event_type": be.event_type,
                "description": be.description,
                "amount_cents": be.amount_cents,
                "quantity": be.quantity,
                "bsa_id": be.bsa_id,
                "report_id": str(be.report_id) if be.report_id else None,
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
                "id": str(be.id),
                "event_type": be.event_type,
                "description": be.description,
                "amount_cents": be.amount_cents,
                "quantity": be.quantity,
                "bsa_id": be.bsa_id,
                "report_id": str(be.report_id) if be.report_id else None,
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
    
    # Audit log
    log_event(
        db=db,
        entity_type=ENTITY_INVOICE,
        entity_id=str(invoice.id),
        event_type="invoice.generated",
        actor_type="system",  # Usually auto-generated
        details={
            "invoice_number": invoice.invoice_number,
            "total_cents": invoice.total_cents,
            "line_items_count": len(events),
            "period_start": str(period_start),
            "period_end": str(period_end),
        },
    )
    
    db.commit()
    
    return {
        "id": str(invoice.id),
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
    
    old_status = invoice.status
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
    
    # Audit log
    event_type = f"invoice.{status}"  # e.g., invoice.paid, invoice.sent
    log_change(
        db=db,
        entity_type=ENTITY_INVOICE,
        entity_id=str(invoice.id),
        event_type=event_type,
        old_values={"status": old_status},
        new_values={"status": status},
        actor_type="admin",  # TODO: Get from auth context
    )
    
    db.commit()
    
    return {"success": True, "status": invoice.status}


# ============================================================================
# MANUAL BILLING EVENT (Credits, Adjustments, etc.)
# ============================================================================

from pydantic import BaseModel

class ManualBillingEventCreate(BaseModel):
    """Request to create a manual billing event."""
    company_id: str
    event_type: str  # manual_adjustment, expedite_fee, credit, etc.
    description: str
    amount_cents: int  # Can be negative for credits
    quantity: int = 1


@router.post("/billing-events")
async def create_manual_billing_event(
    event: ManualBillingEventCreate,
    db: Session = Depends(get_db),
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
        # created_by_user_id will be set when auth is implemented
    )
    db.add(billing_event)
    db.flush()
    
    # Audit log
    log_event(
        db=db,
        entity_type="billing_event",
        entity_id=str(billing_event.id),
        event_type="billing_event.manual_created",
        actor_type="admin",
        details={
            "event_type": event.event_type,
            "amount_cents": event.amount_cents,
            "description": event.description,
            "company_id": event.company_id,
        },
        company_id=event.company_id,
    )
    
    db.commit()
    db.refresh(billing_event)
    
    return {
        "id": str(billing_event.id),
        "company_id": str(billing_event.company_id),
        "event_type": billing_event.event_type,
        "description": billing_event.description,
        "amount_cents": billing_event.amount_cents,
        "quantity": billing_event.quantity,
        "invoice_id": str(billing_event.invoice_id) if billing_event.invoice_id else None,
        "created_at": billing_event.created_at.isoformat() if billing_event.created_at else None,
    }


# ============================================================================
# LIST ALL BILLING EVENTS (Admin view)
# ============================================================================

@router.get("/billing-events")
async def list_billing_events(
    company_id: Optional[str] = None,
    event_type: Optional[str] = None,
    unbilled_only: bool = False,
    limit: int = Query(50, le=100),
    offset: int = 0,
    db: Session = Depends(get_db),
):
    """
    List billing events with filters.
    
    GET /invoices/billing-events?company_id=...&unbilled_only=true
    """
    query = db.query(BillingEvent)
    
    if company_id:
        query = query.filter(BillingEvent.company_id == company_id)
    
    if event_type:
        query = query.filter(BillingEvent.event_type == event_type)
    
    if unbilled_only:
        query = query.filter(BillingEvent.invoice_id.is_(None))
    
    total = query.count()
    total_cents = db.query(func.sum(BillingEvent.amount_cents * BillingEvent.quantity)).filter(
        BillingEvent.id.in_([e.id for e in query.all()])
    ).scalar() or 0
    
    events = query.order_by(BillingEvent.created_at.desc()).offset(offset).limit(limit).all()
    
    return {
        "billing_events": [
            {
                "id": str(be.id),
                "company_id": str(be.company_id) if be.company_id else None,
                "report_id": str(be.report_id) if be.report_id else None,
                "event_type": be.event_type,
                "description": be.description,
                "amount_cents": be.amount_cents,
                "quantity": be.quantity,
                "bsa_id": be.bsa_id,
                "invoice_id": str(be.invoice_id) if be.invoice_id else None,
                "invoiced_at": be.invoiced_at.isoformat() if be.invoiced_at else None,
                "created_at": be.created_at.isoformat() if be.created_at else None,
            }
            for be in events
        ],
        "total": total,
        "total_cents": total_cents,
    }
