"""
Sidebar Badge Counts API
Provides real-time badge counts for navigation.
"""

from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.submission_request import SubmissionRequest
from app.models.report import Report
from app.models.company import Company

router = APIRouter(prefix="/sidebar", tags=["sidebar"])


def is_valid_uuid(value: str) -> bool:
    """Check if a string is a valid UUID."""
    try:
        UUID(value)
        return True
    except (ValueError, TypeError):
        return False


@router.get("/counts")
def get_sidebar_counts(
    role: str = Query(..., description="User role"),
    company_id: Optional[str] = Query(None, description="Company ID for client roles"),
    db: Session = Depends(get_db),
):
    """
    Get badge counts based on user role.
    
    Returns different counts depending on role:
    - Internal roles (coo, pct_admin, pct_staff): Global counts
    - Client roles: Company-scoped counts
    
    Badge Types:
    - requests_pending: RED badge - NEW items needing attention
    - queue_active: AMBER badge - Work in progress  
    - requests_active: BLUE badge - Client's active requests
    """
    
    # Internal roles see global counts
    if role in ("coo", "pct_admin", "pct_staff"):
        # Count: Pending submission requests (needs attention - RED badge)
        pending_requests = db.query(SubmissionRequest).filter(
            SubmissionRequest.status == "pending"
        ).count()
        
        # Count: Reports in collecting or ready_to_file (active work - AMBER badge)
        queue_count = db.query(Report).filter(
            Report.status.in_(["collecting", "ready_to_file"])
        ).count()
        
        return {
            "requests_pending": pending_requests,  # For "All Requests" / "Requests" badge
            "queue_active": queue_count,           # For "My Queue" badge
        }
    
    # Client roles see their company's counts
    elif role in ("client_admin", "client_user"):
        # Validate company_id is a real UUID (not a fake string like "demo-client-company")
        if company_id and not is_valid_uuid(company_id):
            # Invalid company_id - return zeros instead of crashing
            # This handles legacy sessions with fake IDs gracefully
            return {"requests_active": 0}
        
        if not company_id:
            # Try to get demo company as fallback
            demo_company = db.query(Company).filter(Company.code == "DEMO").first()
            if demo_company:
                company_id = str(demo_company.id)
            else:
                return {"requests_active": 0}
        
        # Count: Their pending + in_progress requests (BLUE badge)
        active_requests = db.query(SubmissionRequest).filter(
            SubmissionRequest.company_id == company_id,
            SubmissionRequest.status.in_(["pending", "in_progress"])
        ).count()
        
        return {
            "requests_active": active_requests,  # For client "Requests" badge
        }
    
    # Unknown role - return zeros
    return {
        "requests_pending": 0,
        "queue_active": 0,
        "requests_active": 0,
    }
