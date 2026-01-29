"""
Submission Request API routes.

Handles client submissions for new FinCEN filings.
"""
from datetime import datetime, timedelta
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.submission_request import SubmissionRequest
from app.models.report import Report


router = APIRouter(prefix="/submission-requests", tags=["submission-requests"])


# ============================================================================
# Schemas
# ============================================================================

class PropertyAddress(BaseModel):
    street: str
    city: str
    state: str
    zip: str
    county: Optional[str] = None


class SubmissionRequestCreate(BaseModel):
    """Schema for creating a new submission request."""
    property_address: PropertyAddress
    purchase_price_cents: int  # Store in cents to avoid float issues
    expected_closing_date: str  # ISO date string
    escrow_number: Optional[str] = None
    financing_type: str  # "cash", "financed", "unknown"
    buyer_name: str
    buyer_email: EmailStr
    buyer_type: str  # "individual", "entity", "trust"
    seller_name: str
    seller_email: Optional[EmailStr] = None
    seller_type: Optional[str] = "individual"
    notes: Optional[str] = None


class SubmissionRequestResponse(BaseModel):
    """Schema for submission request response."""
    id: str
    status: str
    property_address: Optional[dict]
    purchase_price_cents: Optional[int]
    expected_closing_date: Optional[str]
    escrow_number: Optional[str]
    financing_type: Optional[str]
    buyer_name: Optional[str]
    buyer_email: Optional[str]
    buyer_type: Optional[str]
    seller_name: Optional[str]
    seller_email: Optional[str]
    seller_type: Optional[str]
    notes: Optional[str]
    report_id: Optional[str] = None
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


class StatusUpdate(BaseModel):
    """Schema for status update."""
    status: str


class CreateReportResponse(BaseModel):
    """Schema for create-report response."""
    report_id: str
    message: str
    redirect_url: str


# ============================================================================
# Helper Functions
# ============================================================================

def submission_to_response(submission: SubmissionRequest, include_report_info: bool = True) -> dict:
    """
    Convert SubmissionRequest model to response dict.
    
    If include_report_info is True and submission has a linked report,
    includes report_status and receipt_id for richer status display.
    """
    response = {
        "id": str(submission.id),
        "status": submission.status,
        "property_address": submission.property_address,
        "purchase_price_cents": submission.purchase_price_cents,
        "expected_closing_date": submission.expected_closing_date.isoformat() if submission.expected_closing_date else None,
        "escrow_number": submission.escrow_number,
        "financing_type": submission.financing_type,
        "buyer_name": submission.buyer_name,
        "buyer_email": submission.buyer_email,
        "buyer_type": submission.buyer_type,
        "seller_name": submission.seller_name,
        "seller_email": submission.seller_email,
        "seller_type": None,  # Not in model yet
        "notes": submission.notes,
        "report_id": str(submission.report_id) if submission.report_id else None,
        "created_at": submission.created_at.isoformat() if submission.created_at else None,
        "updated_at": submission.updated_at.isoformat() if submission.updated_at else None,
        # NEW: Report info for richer status display
        "report_status": None,
        "receipt_id": None,
    }
    
    # Include report info if available (requires relationship to be loaded)
    if include_report_info and submission.report_id:
        try:
            report = submission.report
            if report:
                response["report_status"] = report.status
                response["receipt_id"] = report.receipt_id
        except Exception:
            # Relationship not loaded, that's okay
            pass
    
    return response


# ============================================================================
# Endpoints
# ============================================================================

@router.post("", response_model=SubmissionRequestResponse)
def create_submission_request(
    data: SubmissionRequestCreate,
    db: Session = Depends(get_db)
):
    """
    Create a new submission request from a title company client.
    This creates the initial request that PCT staff will process.
    """
    from datetime import date as date_type
    
    # Parse the date string
    try:
        closing_date = date_type.fromisoformat(data.expected_closing_date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    # For demo, get or create a default demo company
    # In production, get from auth context
    from app.models.company import Company
    demo_company = db.query(Company).filter(Company.code == "DEMO").first()
    if not demo_company:
        # Create a minimal demo company if it doesn't exist
        demo_company = Company(
            name="Demo Company",
            code="DEMO",
            company_type="client",
            status="active",
        )
        db.add(demo_company)
        db.flush()
    
    submission = SubmissionRequest(
        company_id=demo_company.id,
        requested_by_user_id=None,
        status="pending",
        property_address=data.property_address.model_dump(),
        purchase_price_cents=data.purchase_price_cents,
        expected_closing_date=closing_date,
        escrow_number=data.escrow_number,
        financing_type=data.financing_type,
        buyer_name=data.buyer_name,
        buyer_email=data.buyer_email,
        buyer_type=data.buyer_type,
        seller_name=data.seller_name,
        seller_email=data.seller_email,
        notes=data.notes,
    )
    
    db.add(submission)
    db.commit()
    db.refresh(submission)
    
    return submission_to_response(submission)


@router.get("", response_model=List[SubmissionRequestResponse])
def list_submission_requests(
    status: Optional[str] = Query(None, description="Filter by status"),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """
    List submission requests.
    For admin/staff: returns all requests
    For client: returns only their company's requests (in production)
    
    Returns report_status and receipt_id for richer status display.
    """
    query = db.query(SubmissionRequest).options(
        joinedload(SubmissionRequest.report)  # Eagerly load report for status info
    )
    
    if status:
        query = query.filter(SubmissionRequest.status == status)
    
    # Order by most recent first
    query = query.order_by(SubmissionRequest.created_at.desc())
    query = query.limit(limit)
    
    submissions = query.all()
    return [submission_to_response(s, include_report_info=True) for s in submissions]


@router.get("/my-requests", response_model=List[SubmissionRequestResponse])
def get_my_requests(
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user),  # When auth is implemented
):
    """
    Get all submission requests for the current user's company.
    For demo purposes, returns all requests for the demo company.
    
    In production, this will filter by the authenticated user's company_id.
    Returns report_status and receipt_id for richer status display.
    """
    from app.models.company import Company
    
    # For demo - get demo company's requests
    demo_company = db.query(Company).filter(Company.code == "DEMO").first()
    if not demo_company:
        return []
    
    requests = db.query(SubmissionRequest).options(
        joinedload(SubmissionRequest.report)  # Eagerly load report for status info
    ).filter(
        SubmissionRequest.company_id == demo_company.id
    ).order_by(SubmissionRequest.created_at.desc()).all()
    
    return [submission_to_response(r, include_report_info=True) for r in requests]


@router.get("/stats")
def get_submission_stats(
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user),  # When auth ready
):
    """
    Get submission statistics for client dashboard.
    For demo, returns stats for the demo company.
    """
    from app.models.company import Company
    
    # For demo, get demo company
    demo_company = db.query(Company).filter(Company.code == "DEMO").first()
    if not demo_company:
        return {
            "total": 0,
            "pending": 0,
            "in_progress": 0,
            "completed": 0,
            "this_month": 0,
        }
    
    company_id = demo_company.id
    
    # Get counts
    total = db.query(SubmissionRequest).filter(
        SubmissionRequest.company_id == company_id
    ).count()
    
    pending = db.query(SubmissionRequest).filter(
        SubmissionRequest.company_id == company_id,
        SubmissionRequest.status == "pending"
    ).count()
    
    in_progress = db.query(SubmissionRequest).filter(
        SubmissionRequest.company_id == company_id,
        SubmissionRequest.status == "in_progress"
    ).count()
    
    completed = db.query(SubmissionRequest).filter(
        SubmissionRequest.company_id == company_id,
        SubmissionRequest.status == "completed"
    ).count()
    
    # This month
    start_of_month = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    this_month = db.query(SubmissionRequest).filter(
        SubmissionRequest.company_id == company_id,
        SubmissionRequest.created_at >= start_of_month
    ).count()
    
    return {
        "total": total,
        "pending": pending,
        "in_progress": in_progress,
        "completed": completed,
        "this_month": this_month,
    }


@router.get("/{request_id}", response_model=SubmissionRequestResponse)
def get_submission_request(
    request_id: UUID,
    db: Session = Depends(get_db)
):
    """Get a single submission request by ID."""
    submission = db.query(SubmissionRequest).filter(
        SubmissionRequest.id == request_id
    ).first()
    
    if not submission:
        raise HTTPException(status_code=404, detail="Submission request not found")
    
    return submission_to_response(submission)


@router.patch("/{request_id}/status")
def update_submission_status(
    request_id: UUID,
    data: StatusUpdate,
    db: Session = Depends(get_db)
):
    """Update submission request status (for staff processing)."""
    submission = db.query(SubmissionRequest).filter(
        SubmissionRequest.id == request_id
    ).first()
    
    if not submission:
        raise HTTPException(status_code=404, detail="Submission request not found")
    
    valid_statuses = ["pending", "assigned", "in_progress", "completed", "cancelled"]
    if data.status not in valid_statuses:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid status. Must be one of: {valid_statuses}"
        )
    
    submission.status = data.status
    submission.updated_at = datetime.utcnow()
    db.commit()
    
    return {"status": "updated", "new_status": data.status}


@router.post("/{request_id}/create-report", response_model=CreateReportResponse)
def create_report_from_submission(
    request_id: UUID,
    db: Session = Depends(get_db)
):
    """
    Create a Report from a SubmissionRequest.
    This is called when staff clicks "Start Wizard" on a pending request.
    The report inherits key fields from the submission and pre-fills wizard data.
    
    Data Flow:
    - financing_type → determination.isNonFinanced
    - buyer/seller info → collection.initialParties
    - purchase_price_cents → collection.purchasePrice (converted to dollars)
    - All other submission fields → collection.*
    """
    submission = db.query(SubmissionRequest).filter(
        SubmissionRequest.id == request_id
    ).first()
    
    if not submission:
        raise HTTPException(status_code=404, detail="Submission request not found")
    
    # Check if report already exists
    if submission.report_id:
        return CreateReportResponse(
            report_id=str(submission.report_id),
            message="Report already exists for this submission",
            redirect_url=f"/app/reports/{submission.report_id}/wizard"
        )
    
    # Build property address text from JSONB
    addr = submission.property_address or {}
    property_address_text = f"{addr.get('street', '')}, {addr.get('city', '')}, {addr.get('state', '')} {addr.get('zip', '')}".strip()
    if property_address_text == ", ,  ":
        property_address_text = None
    
    # Calculate filing deadline (30 days from closing)
    filing_deadline = None
    if submission.expected_closing_date:
        filing_deadline = submission.expected_closing_date + timedelta(days=30)
    
    # ==========================================================================
    # PRE-FILL DETERMINATION based on financing_type
    # ==========================================================================
    is_non_financed = None
    if submission.financing_type == "cash":
        is_non_financed = "yes"
    elif submission.financing_type == "financed":
        is_non_financed = "no"
    elif submission.financing_type == "partial_cash":
        is_non_financed = "unknown"  # Staff needs to determine exact cash portion
    
    # ==========================================================================
    # BUILD INITIAL PARTIES (only if data exists)
    # ==========================================================================
    initial_buyers = []
    if submission.buyer_name:
        initial_buyers.append({
            "name": submission.buyer_name,
            "email": submission.buyer_email or "",
            "type": submission.buyer_type or "individual",
            "phone": submission.buyer_phone or "",
        })
    
    initial_sellers = []
    if submission.seller_name:
        initial_sellers.append({
            "name": submission.seller_name,
            "email": submission.seller_email or "",
            "type": "individual",  # Default, wizard can change
        })
    
    # ==========================================================================
    # BUILD COMPREHENSIVE WIZARD_DATA
    # ==========================================================================
    wizard_data = {
        # Current phase/step tracking
        "phase": "determination",
        "determinationStep": "property",
        "collectionStep": "transaction-property",
        
        # Pre-fill determination answers where possible
        "determination": {
            "isNonFinanced": is_non_financed,
            # Other fields will be answered by staff during wizard
        },
        
        # Pre-fill collection data from submission
        "collection": {
            # Transaction basics (from submission)
            "purchasePrice": submission.purchase_price_cents / 100 if submission.purchase_price_cents else None,
            "escrowNumber": submission.escrow_number,
            "financingType": submission.financing_type,
            "closingDate": submission.expected_closing_date.isoformat() if submission.expected_closing_date else None,
            
            # Property info
            "propertyAddress": submission.property_address,
            
            # Party info for pre-population
            "initialParties": {
                "buyers": initial_buyers,
                "sellers": initial_sellers,
            },
            
            # Notes from client
            "clientNotes": submission.notes,
        },
    }
    
    # Create report with pre-filled data
    report = Report(
        submission_request_id=submission.id,
        company_id=submission.company_id,
        property_address_text=property_address_text,
        closing_date=submission.expected_closing_date,
        filing_deadline=filing_deadline,
        escrow_number=submission.escrow_number,
        status="draft",
        wizard_step=1,
        wizard_data=wizard_data,
    )
    
    db.add(report)
    db.flush()  # Get report ID
    
    # Link submission to report
    submission.report_id = report.id
    submission.status = "in_progress"
    submission.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(report)
    
    return CreateReportResponse(
        report_id=str(report.id),
        message="Report created from submission",
        redirect_url=f"/app/reports/{report.id}/wizard"
    )
