"""
Consolidated Billing API Routes
All billing-related endpoints in ONE file for clarity.

Endpoints:
- /billing/my/* - Client Admin (company-scoped)
- /billing/admin/* - Admin/COO (all companies)
"""

from datetime import datetime, date, timedelta
from typing import Optional, List
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func

from fastapi.responses import Response

from app.database import get_db
from app.models.company import Company
from app.models.user import User
from app.models.invoice import Invoice
from app.models.billing_event import BillingEvent
from app.services.audit import log_event, log_change
from app.services.email_service import send_invoice_email, SENDGRID_ENABLED, FRONTEND_URL
from app.services.pdf_service import generate_invoice_pdf

router = APIRouter(prefix="/billing", tags=["billing"])


# ============================================================================
# SCHEMAS
# ============================================================================

class BillingStatsResponse(BaseModel):
    outstanding_cents: int
    outstanding_dollars: float
    paid_cents: int
    paid_dollars: float
    pending_events_count: int
    pending_events_cents: int
    filing_fee_cents: Optional[int] = None  # Only for client view
    filing_fee_dollars: Optional[float] = None
    companies_count: Optional[int] = None  # Only for admin view


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
    created_at: str


class InvoiceListItemResponse(BaseModel):
    id: str
    company_id: str
    company_name: Optional[str] = None
    invoice_number: str
    period_start: str
    period_end: str
    subtotal_cents: int
    total_cents: int
    total_dollars: float
    status: str
    due_date: Optional[str]
    line_items_count: int
    created_at: str


class InvoiceDetailResponse(InvoiceListItemResponse):
    tax_cents: int
    discount_cents: int
    sent_at: Optional[str]
    paid_at: Optional[str]
    payment_method: Optional[str]
    payment_reference: Optional[str]
    line_items: List[BillingEventResponse]


class CompanyRateResponse(BaseModel):
    company_id: str
    company_name: str
    company_code: str
    billing_type: str
    filing_fee_cents: int
    filing_fee_dollars: float
    payment_terms_days: int
    billing_notes: Optional[str]
    total_billed_cents: int
    total_billed_dollars: float
    filings_count: int


class UpdateCompanyRateRequest(BaseModel):
    billing_type: Optional[str] = None  # "invoice_only" or "hybrid"
    filing_fee_cents: Optional[int] = None
    payment_terms_days: Optional[int] = None
    billing_notes: Optional[str] = None


class CreateBillingEventRequest(BaseModel):
    company_id: str
    event_type: str  # manual_adjustment, credit, expedite_fee, other
    description: str
    amount_cents: int  # Can be negative for credits


class GenerateInvoiceRequest(BaseModel):
    company_id: str
    period_start: date
    period_end: date


class UpdateInvoiceStatusRequest(BaseModel):
    status: str  # sent, paid, void
    payment_method: Optional[str] = None
    payment_reference: Optional[str] = None


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def get_demo_user(db: Session) -> Optional[User]:
    """Get the demo user from session/cookie. For now, return demo client admin."""
    return db.query(User).filter(User.email == "admin@demoescrow.com").first()


def get_demo_admin(db: Session) -> Optional[User]:
    """Get a demo admin user."""
    return db.query(User).filter(User.role.in_(["pct_admin", "coo"])).first()


def billing_event_to_response(event: BillingEvent, company_name: str = None, invoice_number: str = None) -> dict:
    """Convert BillingEvent to response dict."""
    total_cents = event.amount_cents * event.quantity
    return {
        "id": str(event.id),
        "company_id": str(event.company_id) if event.company_id else None,
        "company_name": company_name,
        "event_type": event.event_type,
        "description": event.description,
        "amount_cents": event.amount_cents,
        "amount_dollars": event.amount_cents / 100.0,
        "quantity": event.quantity,
        "total_cents": total_cents,
        "total_dollars": total_cents / 100.0,
        "bsa_id": event.bsa_id,
        "invoice_id": str(event.invoice_id) if event.invoice_id else None,
        "invoice_number": invoice_number,
        "status": "invoiced" if event.invoice_id else "pending",
        "created_at": event.created_at.isoformat() if event.created_at else None,
    }


def invoice_to_response(invoice: Invoice, company_name: str = None, line_items_count: int = 0) -> dict:
    """Convert Invoice to response dict."""
    return {
        "id": str(invoice.id),
        "company_id": str(invoice.company_id) if invoice.company_id else None,
        "company_name": company_name,
        "invoice_number": invoice.invoice_number,
        "period_start": invoice.period_start.isoformat() if invoice.period_start else None,
        "period_end": invoice.period_end.isoformat() if invoice.period_end else None,
        "subtotal_cents": invoice.subtotal_cents,
        "tax_cents": invoice.tax_cents,
        "discount_cents": invoice.discount_cents,
        "total_cents": invoice.total_cents,
        "total_dollars": invoice.total_cents / 100.0,
        "status": invoice.status,
        "due_date": invoice.due_date.isoformat() if invoice.due_date else None,
        "sent_at": invoice.sent_at.isoformat() if invoice.sent_at else None,
        "paid_at": invoice.paid_at.isoformat() if invoice.paid_at else None,
        "payment_method": invoice.payment_method,
        "payment_reference": invoice.payment_reference,
        "line_items_count": line_items_count,
        "created_at": invoice.created_at.isoformat() if invoice.created_at else None,
    }


# ============================================================================
# CLIENT ADMIN ENDPOINTS (/billing/my/*)
# ============================================================================

@router.get("/my/stats")
async def get_my_billing_stats(
    db: Session = Depends(get_db),
):
    """
    Get billing stats for current user's company.
    For client_admin role.
    """
    # In production, get from auth. For demo, use demo user.
    user = get_demo_user(db)
    if not user or not user.company_id:
        raise HTTPException(status_code=401, detail="No company associated with user")
    
    company = db.query(Company).filter(Company.id == user.company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    # Outstanding (sent + overdue invoices)
    outstanding = db.query(func.sum(Invoice.total_cents)).filter(
        Invoice.company_id == company.id,
        Invoice.status.in_(["sent", "overdue"])
    ).scalar() or 0
    
    # Paid this year
    year_start = datetime(datetime.utcnow().year, 1, 1)
    paid = db.query(func.sum(Invoice.total_cents)).filter(
        Invoice.company_id == company.id,
        Invoice.status == "paid",
        Invoice.paid_at >= year_start
    ).scalar() or 0
    
    # Pending billing events (not yet invoiced)
    pending_events = db.query(BillingEvent).filter(
        BillingEvent.company_id == company.id,
        BillingEvent.invoice_id.is_(None)
    ).all()
    
    pending_count = len(pending_events)
    pending_cents = sum(e.amount_cents * e.quantity for e in pending_events)
    
    return {
        "outstanding_cents": outstanding,
        "outstanding_dollars": outstanding / 100.0,
        "paid_cents": paid,
        "paid_dollars": paid / 100.0,
        "pending_events_count": pending_count,
        "pending_events_cents": pending_cents,
        "filing_fee_cents": company.filing_fee_cents or 7500,
        "filing_fee_dollars": (company.filing_fee_cents or 7500) / 100.0,
    }


@router.get("/my/invoices")
async def get_my_invoices(
    status: Optional[str] = None,
    limit: int = Query(50, le=100),
    offset: int = 0,
    db: Session = Depends(get_db),
):
    """
    Get invoices for current user's company.
    """
    user = get_demo_user(db)
    if not user or not user.company_id:
        raise HTTPException(status_code=401, detail="No company associated with user")
    
    company = db.query(Company).filter(Company.id == user.company_id).first()
    
    query = db.query(Invoice).filter(Invoice.company_id == user.company_id)
    
    if status:
        query = query.filter(Invoice.status == status)
    
    total = query.count()
    invoices = query.order_by(Invoice.created_at.desc()).offset(offset).limit(limit).all()
    
    result = []
    for inv in invoices:
        line_items_count = db.query(BillingEvent).filter(
            BillingEvent.invoice_id == inv.id
        ).count()
        result.append(invoice_to_response(inv, company.name, line_items_count))
    
    return {
        "invoices": result,
        "total": total,
    }


@router.get("/my/invoices/{invoice_id}")
async def get_my_invoice_detail(
    invoice_id: str,
    db: Session = Depends(get_db),
):
    """
    Get invoice detail with line items.
    """
    user = get_demo_user(db)
    if not user or not user.company_id:
        raise HTTPException(status_code=401, detail="No company associated with user")
    
    invoice = db.query(Invoice).filter(
        Invoice.id == invoice_id,
        Invoice.company_id == user.company_id
    ).first()
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    company = db.query(Company).filter(Company.id == invoice.company_id).first()
    
    # Get line items
    events = db.query(BillingEvent).filter(
        BillingEvent.invoice_id == invoice.id
    ).order_by(BillingEvent.created_at).all()
    
    response = invoice_to_response(invoice, company.name if company else None, len(events))
    response["line_items"] = [
        billing_event_to_response(e, company.name if company else None, invoice.invoice_number)
        for e in events
    ]
    
    return response


@router.get("/my/activity")
async def get_my_billing_activity(
    status: Optional[str] = None,  # "pending" or "invoiced"
    limit: int = Query(50, le=100),
    offset: int = 0,
    db: Session = Depends(get_db),
):
    """
    Get all billing events (activity) for current user's company.
    """
    user = get_demo_user(db)
    if not user or not user.company_id:
        raise HTTPException(status_code=401, detail="No company associated with user")
    
    company = db.query(Company).filter(Company.id == user.company_id).first()
    
    query = db.query(BillingEvent).filter(BillingEvent.company_id == user.company_id)
    
    if status == "pending":
        query = query.filter(BillingEvent.invoice_id.is_(None))
    elif status == "invoiced":
        query = query.filter(BillingEvent.invoice_id.isnot(None))
    
    total = query.count()
    events = query.order_by(BillingEvent.created_at.desc()).offset(offset).limit(limit).all()
    
    # Get invoice numbers for invoiced events
    invoice_numbers = {}
    invoiced_ids = [e.invoice_id for e in events if e.invoice_id]
    if invoiced_ids:
        invoices = db.query(Invoice).filter(Invoice.id.in_(invoiced_ids)).all()
        invoice_numbers = {str(inv.id): inv.invoice_number for inv in invoices}
    
    return {
        "events": [
            billing_event_to_response(
                e, 
                company.name if company else None,
                invoice_numbers.get(str(e.invoice_id))
            )
            for e in events
        ],
        "total": total,
    }


# ============================================================================
# ADMIN ENDPOINTS (/billing/admin/*)
# ============================================================================

@router.get("/admin/stats")
async def get_admin_billing_stats(
    db: Session = Depends(get_db),
):
    """
    Get billing stats across all companies.
    For pct_admin and coo roles.
    """
    # Outstanding (sent + overdue invoices)
    outstanding = db.query(func.sum(Invoice.total_cents)).filter(
        Invoice.status.in_(["sent", "overdue"])
    ).scalar() or 0
    
    # Paid this month
    month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    paid = db.query(func.sum(Invoice.total_cents)).filter(
        Invoice.status == "paid",
        Invoice.paid_at >= month_start
    ).scalar() or 0
    
    # Pending billing events (not yet invoiced)
    pending = db.query(BillingEvent).filter(
        BillingEvent.invoice_id.is_(None)
    ).all()
    
    pending_count = len(pending)
    pending_cents = sum(e.amount_cents * e.quantity for e in pending)
    
    # Company count
    companies_count = db.query(Company).filter(Company.company_type == "client").count()
    
    return {
        "outstanding_cents": outstanding,
        "outstanding_dollars": outstanding / 100.0,
        "paid_cents": paid,
        "paid_dollars": paid / 100.0,
        "pending_events_count": pending_count,
        "pending_events_cents": pending_cents,
        "companies_count": companies_count,
    }


@router.get("/admin/invoices")
async def get_all_invoices(
    company_id: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = Query(50, le=100),
    offset: int = 0,
    db: Session = Depends(get_db),
):
    """
    Get all invoices with optional filters.
    """
    query = db.query(Invoice)
    
    if company_id:
        query = query.filter(Invoice.company_id == company_id)
    
    if status:
        query = query.filter(Invoice.status == status)
    
    total = query.count()
    invoices = query.order_by(Invoice.created_at.desc()).offset(offset).limit(limit).all()
    
    # Get company names
    company_ids = list(set(str(inv.company_id) for inv in invoices if inv.company_id))
    companies = {str(c.id): c.name for c in db.query(Company).filter(Company.id.in_(company_ids)).all()}
    
    result = []
    for inv in invoices:
        line_items_count = db.query(BillingEvent).filter(
            BillingEvent.invoice_id == inv.id
        ).count()
        result.append(invoice_to_response(
            inv, 
            companies.get(str(inv.company_id)),
            line_items_count
        ))
    
    return {
        "invoices": result,
        "total": total,
    }


@router.get("/admin/invoices/{invoice_id}")
async def get_admin_invoice_detail(
    invoice_id: str,
    db: Session = Depends(get_db),
):
    """
    Get invoice detail with line items (admin view).
    """
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    company = db.query(Company).filter(Company.id == invoice.company_id).first()
    
    # Get line items
    events = db.query(BillingEvent).filter(
        BillingEvent.invoice_id == invoice.id
    ).order_by(BillingEvent.created_at).all()
    
    response = invoice_to_response(invoice, company.name if company else None, len(events))
    response["line_items"] = [
        billing_event_to_response(e, company.name if company else None, invoice.invoice_number)
        for e in events
    ]
    
    return response


@router.post("/admin/invoices/generate")
async def generate_invoice(
    request: GenerateInvoiceRequest,
    db: Session = Depends(get_db),
):
    """
    Generate invoice from unbilled events for a company.
    """
    company = db.query(Company).filter(Company.id == request.company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    # Get unbilled events in the period
    events = db.query(BillingEvent).filter(
        BillingEvent.company_id == request.company_id,
        BillingEvent.invoice_id.is_(None),
        BillingEvent.created_at >= datetime.combine(request.period_start, datetime.min.time()),
        BillingEvent.created_at <= datetime.combine(request.period_end, datetime.max.time()),
    ).all()
    
    if not events:
        raise HTTPException(status_code=400, detail="No unbilled events in this period")
    
    # Calculate totals
    subtotal = sum(e.amount_cents * e.quantity for e in events)
    
    # Generate invoice number
    year_month = request.period_end.strftime("%Y-%m")
    count = db.query(Invoice).filter(
        Invoice.invoice_number.like(f"INV-{year_month}%")
    ).count() + 1
    invoice_number = f"INV-{year_month}-{count:04d}"
    
    # Create invoice
    due_date = request.period_end + timedelta(days=company.payment_terms_days or 30)
    
    invoice = Invoice(
        id=str(uuid4()),
        company_id=request.company_id,
        invoice_number=invoice_number,
        period_start=request.period_start,
        period_end=request.period_end,
        subtotal_cents=subtotal,
        tax_cents=0,
        discount_cents=0,
        total_cents=subtotal,
        status="draft",
        due_date=due_date,
        created_at=datetime.utcnow(),
    )
    db.add(invoice)
    db.flush()
    
    # Link events to invoice
    for event in events:
        event.invoice_id = invoice.id
        event.invoiced_at = datetime.utcnow()
    
    # Audit log
    log_event(
        db=db,
        entity_type="invoice",
        entity_id=str(invoice.id),
        event_type="invoice.generated",
        actor_type="admin",
        details={
            "invoice_number": invoice_number,
            "company_id": str(company.id),
            "total_cents": subtotal,
            "line_items_count": len(events),
        },
        company_id=str(company.id),
    )
    
    db.commit()
    
    return {
        "id": str(invoice.id),
        "invoice_number": invoice_number,
        "total_cents": subtotal,
        "total_dollars": subtotal / 100.0,
        "line_items_count": len(events),
        "status": "draft",
    }


@router.patch("/admin/invoices/{invoice_id}/status")
async def update_invoice_status(
    invoice_id: str,
    request: UpdateInvoiceStatusRequest,
    db: Session = Depends(get_db),
):
    """
    Update invoice status (sent, paid, void).
    """
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    valid_statuses = ["draft", "sent", "paid", "void", "overdue"]
    if request.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    old_status = invoice.status
    invoice.status = request.status
    
    if request.status == "sent":
        invoice.sent_at = datetime.utcnow()
    elif request.status == "paid":
        invoice.paid_at = datetime.utcnow()
        if request.payment_method:
            invoice.payment_method = request.payment_method
        if request.payment_reference:
            invoice.payment_reference = request.payment_reference
    elif request.status == "void":
        invoice.voided_at = datetime.utcnow()
    
    # Audit log
    log_change(
        db=db,
        entity_type="invoice",
        entity_id=str(invoice.id),
        event_type=f"invoice.{request.status}",
        old_values={"status": old_status},
        new_values={"status": request.status},
        actor_type="admin",
    )
    
    db.commit()
    
    return {"success": True, "status": invoice.status}


@router.get("/admin/events")
async def get_all_billing_events(
    company_id: Optional[str] = None,
    status: Optional[str] = None,  # "pending" or "invoiced"
    event_type: Optional[str] = None,
    limit: int = Query(50, le=100),
    offset: int = 0,
    db: Session = Depends(get_db),
):
    """
    Get all billing events with optional filters.
    """
    query = db.query(BillingEvent)
    
    if company_id:
        query = query.filter(BillingEvent.company_id == company_id)
    
    if status == "pending":
        query = query.filter(BillingEvent.invoice_id.is_(None))
    elif status == "invoiced":
        query = query.filter(BillingEvent.invoice_id.isnot(None))
    
    if event_type:
        query = query.filter(BillingEvent.event_type == event_type)
    
    total = query.count()
    total_cents = db.query(func.sum(BillingEvent.amount_cents * BillingEvent.quantity)).filter(
        BillingEvent.id.in_([e.id for e in query.all()])
    ).scalar() or 0
    
    events = query.order_by(BillingEvent.created_at.desc()).offset(offset).limit(limit).all()
    
    # Get company names
    company_ids = list(set(str(e.company_id) for e in events if e.company_id))
    companies = {str(c.id): c.name for c in db.query(Company).filter(Company.id.in_(company_ids)).all()}
    
    # Get invoice numbers
    invoice_ids = list(set(str(e.invoice_id) for e in events if e.invoice_id))
    invoices = {str(inv.id): inv.invoice_number for inv in db.query(Invoice).filter(Invoice.id.in_(invoice_ids)).all()}
    
    return {
        "events": [
            billing_event_to_response(
                e,
                companies.get(str(e.company_id)),
                invoices.get(str(e.invoice_id))
            )
            for e in events
        ],
        "total": total,
        "total_cents": total_cents,
        "total_dollars": total_cents / 100.0,
    }


@router.post("/admin/events")
async def create_billing_event(
    request: CreateBillingEventRequest,
    db: Session = Depends(get_db),
):
    """
    Create manual billing event (credit, adjustment, expedite fee).
    """
    company = db.query(Company).filter(Company.id == request.company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    valid_types = ["manual_adjustment", "credit", "expedite_fee", "monthly_minimum", "other"]
    if request.event_type not in valid_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid event type. Must be one of: {valid_types}"
        )
    
    event = BillingEvent(
        id=str(uuid4()),
        company_id=request.company_id,
        event_type=request.event_type,
        description=request.description,
        amount_cents=request.amount_cents,
        quantity=1,
        created_at=datetime.utcnow(),
    )
    db.add(event)
    db.flush()
    
    # Audit log
    log_event(
        db=db,
        entity_type="billing_event",
        entity_id=str(event.id),
        event_type="billing_event.manual_created",
        actor_type="admin",
        details={
            "event_type": request.event_type,
            "amount_cents": request.amount_cents,
            "description": request.description,
        },
        company_id=str(company.id),
    )
    
    db.commit()
    
    return billing_event_to_response(event, company.name)


@router.get("/admin/rates")
async def get_company_rates(
    db: Session = Depends(get_db),
):
    """
    Get all companies with their billing rates and billing type.
    """
    companies = db.query(Company).filter(
        Company.company_type == "client"
    ).order_by(Company.name).all()
    
    result = []
    for company in companies:
        # Get total billed
        total_billed = db.query(func.sum(BillingEvent.amount_cents * BillingEvent.quantity)).filter(
            BillingEvent.company_id == company.id
        ).scalar() or 0
        
        # Get filings count
        filings_count = db.query(BillingEvent).filter(
            BillingEvent.company_id == company.id,
            BillingEvent.event_type == "filing_accepted"
        ).count()
        
        result.append({
            "company_id": str(company.id),
            "company_name": company.name,
            "company_code": company.code,
            "billing_type": company.billing_type or "invoice_only",
            "filing_fee_cents": company.filing_fee_cents or 7500,
            "filing_fee_dollars": (company.filing_fee_cents or 7500) / 100.0,
            "payment_terms_days": company.payment_terms_days or 30,
            "billing_notes": company.billing_notes,
            "total_billed_cents": total_billed,
            "total_billed_dollars": total_billed / 100.0,
            "filings_count": filings_count,
        })
    
    return {"rates": result, "total": len(result)}


@router.patch("/admin/rates/{company_id}")
async def update_company_rate(
    company_id: str,
    request: UpdateCompanyRateRequest,
    db: Session = Depends(get_db),
):
    """
    Update a company's billing rate and billing type.
    """
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    # Valid billing types
    VALID_BILLING_TYPES = ("invoice_only", "hybrid")
    
    old_values = {
        "billing_type": company.billing_type,
        "filing_fee_cents": company.filing_fee_cents,
        "payment_terms_days": company.payment_terms_days,
    }
    
    # Handle billing_type update
    if request.billing_type is not None:
        if request.billing_type not in VALID_BILLING_TYPES:
            raise HTTPException(
                status_code=422,
                detail=f"billing_type must be one of: {', '.join(VALID_BILLING_TYPES)}"
            )
        company.billing_type = request.billing_type
    
    if request.filing_fee_cents is not None:
        if request.filing_fee_cents < 0:
            raise HTTPException(status_code=400, detail="Filing fee cannot be negative")
        company.filing_fee_cents = request.filing_fee_cents
    
    if request.payment_terms_days is not None:
        if request.payment_terms_days < 0:
            raise HTTPException(status_code=400, detail="Payment terms cannot be negative")
        company.payment_terms_days = request.payment_terms_days
    
    if request.billing_notes is not None:
        company.billing_notes = request.billing_notes
    
    # Audit log - special handling for billing_type changes
    event_type = "company.billing_rate_updated"
    if request.billing_type is not None and old_values["billing_type"] != company.billing_type:
        event_type = "company.billing_type_changed"
    
    log_change(
        db=db,
        entity_type="company",
        entity_id=str(company.id),
        event_type=event_type,
        old_values=old_values,
        new_values={
            "billing_type": company.billing_type,
            "filing_fee_cents": company.filing_fee_cents,
            "payment_terms_days": company.payment_terms_days,
        },
        actor_type="admin",
    )
    
    db.commit()
    
    return {
        "company_id": str(company.id),
        "company_name": company.name,
        "billing_type": company.billing_type or "invoice_only",
        "filing_fee_cents": company.filing_fee_cents or 7500,
        "filing_fee_dollars": (company.filing_fee_cents or 7500) / 100.0,
        "payment_terms_days": company.payment_terms_days or 30,
        "billing_notes": company.billing_notes,
        "message": "Billing rate updated successfully",
    }


# ============================================================================
# INVOICE EMAIL & PDF ENDPOINTS
# ============================================================================

@router.post("/admin/invoices/{invoice_id}/send-email")
async def send_invoice_email_endpoint(
    invoice_id: str,
    db: Session = Depends(get_db),
):
    """
    Send invoice email to company billing contact.
    Updates invoice status to 'sent' and records sent_to_email.
    """
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    company = db.query(Company).filter(Company.id == invoice.company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    # Determine recipient email
    to_email = company.billing_email
    if not to_email:
        raise HTTPException(
            status_code=400,
            detail="Company has no billing email configured. Please add a billing email first."
        )
    
    # Format dates
    def fmt_date(d):
        if d:
            return d.strftime("%B %d, %Y")
        return "N/A"
    
    # Build view link
    view_link = f"{FRONTEND_URL}/app/billing"
    
    # Send email
    result = send_invoice_email(
        to_email=to_email,
        company_name=company.name,
        invoice_number=invoice.invoice_number,
        total_dollars=invoice.total_cents / 100.0,
        due_date=fmt_date(invoice.due_date),
        period_start=fmt_date(invoice.period_start),
        period_end=fmt_date(invoice.period_end),
        view_link=view_link,
    )
    
    if result.success:
        # Update invoice
        old_status = invoice.status
        if invoice.status == "draft":
            invoice.status = "sent"
        invoice.sent_at = datetime.utcnow()
        invoice.sent_to_email = to_email
        
        # Audit log
        log_event(
            db=db,
            entity_type="invoice",
            entity_id=str(invoice.id),
            event_type="invoice.email_sent",
            actor_type="admin",
            details={
                "invoice_number": invoice.invoice_number,
                "sent_to": to_email,
                "message_id": result.message_id,
                "old_status": old_status,
                "new_status": invoice.status,
            },
            company_id=str(company.id),
        )
        
        db.commit()
        
        return {
            "success": True,
            "message": f"Invoice emailed to {to_email}",
            "message_id": result.message_id,
            "status": invoice.status,
            "sendgrid_enabled": SENDGRID_ENABLED,
        }
    else:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to send email: {result.error}"
        )


@router.get("/admin/invoices/{invoice_id}/pdf")
async def get_invoice_pdf(
    invoice_id: str,
    db: Session = Depends(get_db),
):
    """
    Generate and return invoice PDF.
    Returns PDF file directly for download.
    """
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    company = db.query(Company).filter(Company.id == invoice.company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    # Get line items
    events = db.query(BillingEvent).filter(
        BillingEvent.invoice_id == invoice.id
    ).order_by(BillingEvent.created_at).all()
    
    line_items = [
        {
            "description": e.description or f"Filing Fee - {e.bsa_id or 'N/A'}",
            "quantity": e.quantity,
            "amount_cents": e.amount_cents,
            "total_cents": e.amount_cents * e.quantity,
        }
        for e in events
    ]
    
    # Generate PDF
    result = await generate_invoice_pdf(
        invoice_number=invoice.invoice_number,
        company_name=company.name,
        company_address=company.address or {},
        billing_email=company.billing_email or "",
        period_start=invoice.period_start.isoformat() if invoice.period_start else "",
        period_end=invoice.period_end.isoformat() if invoice.period_end else "",
        due_date=invoice.due_date.isoformat() if invoice.due_date else "",
        line_items=line_items,
        subtotal_cents=invoice.subtotal_cents,
        tax_cents=invoice.tax_cents,
        discount_cents=invoice.discount_cents,
        total_cents=invoice.total_cents,
        status=invoice.status,
        payment_terms_days=company.payment_terms_days or 30,
        notes=invoice.notes,
    )
    
    if result.pdf_bytes:
        # Return actual PDF
        return Response(
            content=result.pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{invoice.invoice_number}.pdf"'
            }
        )
    elif result.html_content:
        # Return HTML as fallback (for preview when PDFShift not configured)
        return Response(
            content=result.html_content,
            media_type="text/html",
            headers={
                "X-PDF-Fallback": "true",
                "X-PDF-Error": result.error or "PDFShift not configured"
            }
        )
    else:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate invoice: {result.error}"
        )


@router.get("/my/invoices/{invoice_id}/pdf")
async def get_my_invoice_pdf(
    invoice_id: str,
    db: Session = Depends(get_db),
):
    """
    Generate and return invoice PDF for client's own invoice.
    """
    user = get_demo_user(db)
    if not user or not user.company_id:
        raise HTTPException(status_code=401, detail="No company associated with user")
    
    invoice = db.query(Invoice).filter(
        Invoice.id == invoice_id,
        Invoice.company_id == user.company_id
    ).first()
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    company = db.query(Company).filter(Company.id == invoice.company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    # Get line items
    events = db.query(BillingEvent).filter(
        BillingEvent.invoice_id == invoice.id
    ).order_by(BillingEvent.created_at).all()
    
    line_items = [
        {
            "description": e.description or f"Filing Fee - {e.bsa_id or 'N/A'}",
            "quantity": e.quantity,
            "amount_cents": e.amount_cents,
            "total_cents": e.amount_cents * e.quantity,
        }
        for e in events
    ]
    
    # Generate PDF
    result = await generate_invoice_pdf(
        invoice_number=invoice.invoice_number,
        company_name=company.name,
        company_address=company.address or {},
        billing_email=company.billing_email or "",
        period_start=invoice.period_start.isoformat() if invoice.period_start else "",
        period_end=invoice.period_end.isoformat() if invoice.period_end else "",
        due_date=invoice.due_date.isoformat() if invoice.due_date else "",
        line_items=line_items,
        subtotal_cents=invoice.subtotal_cents,
        tax_cents=invoice.tax_cents,
        discount_cents=invoice.discount_cents,
        total_cents=invoice.total_cents,
        status=invoice.status,
        payment_terms_days=company.payment_terms_days or 30,
        notes=invoice.notes,
    )
    
    if result.pdf_bytes:
        return Response(
            content=result.pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{invoice.invoice_number}.pdf"'
            }
        )
    elif result.html_content:
        return Response(
            content=result.html_content,
            media_type="text/html",
            headers={
                "X-PDF-Fallback": "true",
                "X-PDF-Error": result.error or "PDFShift not configured"
            }
        )
    else:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate invoice: {result.error}"
        )
