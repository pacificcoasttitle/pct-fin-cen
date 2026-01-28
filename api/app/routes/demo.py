"""
Demo routes for staging environment.

These endpoints are protected by:
1. Environment check (must be 'staging')
2. Secret header validation (X-DEMO-SECRET must match DEMO_SECRET env var)

If either check fails, returns 404 to avoid endpoint discovery.
"""
from datetime import datetime
from fastapi import APIRouter, Depends, Header, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from uuid import UUID

from pydantic import BaseModel

from app.config import get_settings
from app.database import get_db
from app.models import Report, FilingSubmission
from app.services.demo_seed import reset_demo_data, seed_demo_data
from app.services.notifications import list_notifications, delete_all_notifications
from app.services.filing_lifecycle import set_demo_outcome, get_or_create_submission
from app.services.email_service import send_party_invite, SENDGRID_ENABLED, FRONTEND_URL


class SetFilingOutcomeRequest(BaseModel):
    """Request body for setting demo filing outcome."""
    outcome: str  # accept, reject, needs_review
    code: Optional[str] = None
    message: Optional[str] = None

router = APIRouter(prefix="/demo", tags=["demo"])
settings = get_settings()


def verify_demo_access(x_demo_secret: Optional[str] = Header(None, alias="X-DEMO-SECRET")):
    """
    Dependency to verify demo endpoint access.
    
    Requirements:
    1. ENVIRONMENT must be 'staging'
    2. X-DEMO-SECRET header must match DEMO_SECRET env var
    
    Returns 404 (not 401/403) to avoid endpoint discovery.
    """
    # Check environment
    if settings.ENVIRONMENT != "staging":
        raise HTTPException(status_code=404, detail="Not found")
    
    # Check secret
    if not settings.DEMO_SECRET:
        # If DEMO_SECRET is not configured, deny access
        raise HTTPException(status_code=404, detail="Not found")
    
    if not x_demo_secret or x_demo_secret != settings.DEMO_SECRET:
        raise HTTPException(status_code=404, detail="Not found")
    
    return True


@router.post("/reset")
async def demo_reset(
    db: Session = Depends(get_db),
    _: bool = Depends(verify_demo_access)
):
    """
    Reset all demo data and re-seed with fresh data.
    
    Requires:
    - ENVIRONMENT=staging
    - X-DEMO-SECRET header matching DEMO_SECRET env var
    
    Returns 404 if requirements not met (to avoid discovery).
    """
    try:
        # Delete notification events first (no FK dependencies)
        delete_all_notifications(db)
        
        # Delete all data in correct FK order
        reset_demo_data(db)
        
        # Re-seed with comprehensive linked demo data
        result = seed_demo_data(db)
        
        return {
            "ok": True,
            "requests_created": result.get("requests_created", 0),
            "reports_created": result.get("reports_created", 0),
            "parties_created": result.get("parties_created", 0),
            "filed_reports": result.get("filed_reports", 0),
            "exempt_reports": result.get("exempt_reports", 0),
            "active_portal_link": result.get("active_portal_link"),
            "timestamp": datetime.utcnow().isoformat(),
            "environment": settings.ENVIRONMENT,
            "demo_scenarios": [
                "1 pending request (no report yet)",
                "1 in-progress request (determination phase)",
                "1 collecting request (1/2 parties submitted)",
                "1 ready-to-file request (all parties done)",
                "1 FILED request with receipt ID",
                "1 exempt request (financed transaction)",
            ],
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to reset demo data: {str(e)}"
        )


@router.post("/create-report")
async def demo_create_report(
    db: Session = Depends(get_db),
    _: bool = Depends(verify_demo_access)
):
    """
    Create a single demo report for quick testing.
    
    Requires:
    - ENVIRONMENT=staging
    - X-DEMO-SECRET header matching DEMO_SECRET env var
    
    Returns 404 if requirements not met (to avoid discovery).
    """
    from datetime import timedelta
    from app.models.report import Report
    
    try:
        report = Report(
            status="draft",
            property_address_text=f"Demo Property {datetime.utcnow().strftime('%H:%M:%S')}",
            closing_date=datetime.utcnow().date() + timedelta(days=14),
            wizard_step=1,
            wizard_data={
                "phase": "determination",
                "determinationStep": "property",
            },
        )
        db.add(report)
        db.flush()
        
        wizard_url = f"{settings.APP_BASE_URL}/app/reports/{report.id}/wizard"
        
        db.commit()
        
        return {
            "ok": True,
            "report_id": str(report.id),
            "wizard_url": wizard_url,
            "timestamp": datetime.utcnow().isoformat(),
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create demo report: {str(e)}"
        )


@router.get("/notifications")
async def demo_get_notifications(
    db: Session = Depends(get_db),
    _: bool = Depends(verify_demo_access),
    limit: int = Query(default=50, ge=1, le=200),
    report_id: Optional[str] = Query(default=None),
    type: Optional[str] = Query(default=None),
):
    """
    List notification events from the demo outbox.
    
    This is for demo purposes only - shows what notifications WOULD be sent.
    
    Requires:
    - ENVIRONMENT=staging
    - X-DEMO-SECRET header matching DEMO_SECRET env var
    
    Returns 404 if requirements not met (to avoid discovery).
    
    Query params:
    - limit: Max number of events to return (default 50, max 200)
    - report_id: Filter by report ID (optional)
    - type: Filter by notification type (optional)
    """
    try:
        # Parse report_id if provided
        parsed_report_id = None
        if report_id:
            try:
                parsed_report_id = UUID(report_id)
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid report_id format")
        
        notifications = list_notifications(
            db,
            limit=limit,
            report_id=parsed_report_id,
            type_filter=type,
        )
        
        return {
            "items": [n.to_dict() for n in notifications],
            "count": len(notifications),
            "limit": limit,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch notifications: {str(e)}"
        )


@router.post("/reports/{report_id}/set-filing-outcome")
async def demo_set_filing_outcome(
    report_id: UUID,
    body: SetFilingOutcomeRequest,
    db: Session = Depends(get_db),
    _: bool = Depends(verify_demo_access),
):
    """
    Set the demo filing outcome for a report.
    
    This controls what happens when /reports/{id}/file is called:
    - accept: Filing will be accepted with a receipt ID
    - reject: Filing will be rejected with the provided code/message
    - needs_review: Filing will be marked as needing review
    
    Requires:
    - ENVIRONMENT=staging
    - X-DEMO-SECRET header matching DEMO_SECRET env var
    
    Returns 404 if requirements not met (to avoid discovery).
    """
    # Validate outcome
    if body.outcome not in ("accept", "reject", "needs_review"):
        raise HTTPException(
            status_code=400,
            detail="Invalid outcome. Must be: accept, reject, or needs_review"
        )
    
    # Check report exists
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    try:
        submission = set_demo_outcome(
            db,
            report_id,
            outcome=body.outcome,
            rejection_code=body.code,
            rejection_message=body.message,
        )
        db.commit()
        
        return {
            "ok": True,
            "report_id": str(report_id),
            "outcome": body.outcome,
            "rejection_code": body.code,
            "rejection_message": body.message,
            "submission_status": submission.status,
            "timestamp": datetime.utcnow().isoformat(),
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to set filing outcome: {str(e)}"
        )


class TestEmailRequest(BaseModel):
    """Request body for test email."""
    to_email: Optional[str] = None  # If None, uses a test address


@router.post("/test-email")
async def demo_test_email(
    body: TestEmailRequest = TestEmailRequest(),
    _: bool = Depends(verify_demo_access),
):
    """
    Test email sending functionality.
    
    When SENDGRID_ENABLED=false:
    - Returns what WOULD be sent (without actually sending)
    
    When SENDGRID_ENABLED=true:
    - Sends a real test email via SendGrid
    
    Requires:
    - ENVIRONMENT=staging
    - X-DEMO-SECRET header matching DEMO_SECRET env var
    
    Returns 404 if requirements not met (to avoid discovery).
    """
    test_email = body.to_email or "test@example.com"
    
    result = send_party_invite(
        to_email=test_email,
        party_name="Test User",
        party_role="buyer",
        property_address="123 Test Street, Demo City, CA 90210",
        portal_link=f"{FRONTEND_URL}/p/demo-test-token",
        company_name="Pacific Coast Title Company",
    )
    
    return {
        "ok": result.success,
        "sendgrid_enabled": SENDGRID_ENABLED,
        "to_email": test_email,
        "message_id": result.message_id,
        "error": result.error,
        "note": "Email disabled - only logging" if not SENDGRID_ENABLED else "Email sent via SendGrid",
        "timestamp": datetime.utcnow().isoformat(),
    }
