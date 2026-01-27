"""
Submission Request API routes.

Handles client submissions for new FinCEN filings.
"""
from datetime import datetime, timedelta
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

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

def submission_to_response(submission: SubmissionRequest) -> dict:
    """Convert SubmissionRequest model to response dict."""
    return {
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
    }


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
    
    submission = SubmissionRequest(
        # For demo, company_id and user_id are null
        # In production, get from auth context
        company_id=None,
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
    """
    query = db.query(SubmissionRequest)
    
    if status:
        query = query.filter(SubmissionRequest.status == status)
    
    # Order by most recent first
    query = query.order_by(SubmissionRequest.created_at.desc())
    query = query.limit(limit)
    
    submissions = query.all()
    return [submission_to_response(s) for s in submissions]


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
    The report inherits key fields from the submission.
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
    
    # Create report with pre-filled data
    report = Report(
        submission_request_id=submission.id,
        property_address_text=property_address_text,
        closing_date=submission.expected_closing_date,
        filing_deadline=filing_deadline,
        escrow_number=submission.escrow_number,
        status="draft",
        wizard_step=1,
        wizard_data={
            # Pre-fill wizard collection data from submission
            "collection": {
                "purchasePrice": submission.purchase_price_cents / 100 if submission.purchase_price_cents else None,
                "escrowNumber": submission.escrow_number,
                "financingType": submission.financing_type,
                "closingDate": submission.expected_closing_date.isoformat() if submission.expected_closing_date else None,
                "propertyAddress": submission.property_address,
                # Store initial party info for party-setup step
                "initialParties": {
                    "buyers": [{
                        "name": submission.buyer_name,
                        "email": submission.buyer_email,
                        "type": submission.buyer_type,
                    }],
                    "sellers": [{
                        "name": submission.seller_name,
                        "email": submission.seller_email,
                        "type": "individual",  # Default, can be changed
                    }]
                }
            }
        }
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
