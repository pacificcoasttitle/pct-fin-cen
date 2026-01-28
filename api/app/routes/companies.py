"""
Company Management API Routes
Handles CRUD operations for client companies.
"""

from datetime import datetime
from typing import List, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from sqlalchemy import func, or_

from app.database import get_db
from app.models.company import Company
from app.models.user import User
from app.models.submission_request import SubmissionRequest
from app.models.report import Report
from app.models.invoice import Invoice

router = APIRouter(prefix="/companies", tags=["companies"])


# ============================================================================
# SCHEMAS
# ============================================================================

class AddressSchema(BaseModel):
    street: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip: Optional[str] = None

class CompanyCreateRequest(BaseModel):
    name: str
    code: str  # Unique identifier like "ACME", "PCT"
    company_type: str = "client"  # "internal" or "client"
    billing_email: Optional[str] = None
    billing_contact_name: Optional[str] = None
    address: Optional[AddressSchema] = None
    phone: Optional[str] = None

class CompanyUpdateRequest(BaseModel):
    name: Optional[str] = None
    billing_email: Optional[str] = None
    billing_contact_name: Optional[str] = None
    address: Optional[AddressSchema] = None
    phone: Optional[str] = None
    settings: Optional[dict] = None

class CompanyStatusRequest(BaseModel):
    status: str  # "active", "suspended", "inactive"


# ============================================================================
# STATS ENDPOINT (must come before /{company_id} to avoid route conflicts)
# ============================================================================

@router.get("/stats/summary")
async def get_company_stats(
    db: Session = Depends(get_db),
):
    """Get summary statistics for companies dashboard."""
    total = db.query(Company).count()
    active = db.query(Company).filter(Company.status == "active").count()
    suspended = db.query(Company).filter(Company.status == "suspended").count()
    clients = db.query(Company).filter(Company.company_type == "client").count()
    
    # This month's new companies
    start_of_month = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    new_this_month = db.query(Company).filter(
        Company.created_at >= start_of_month
    ).count()
    
    return {
        "total": total,
        "active": active,
        "suspended": suspended,
        "inactive": total - active - suspended,
        "clients": clients,
        "internal": total - clients,
        "new_this_month": new_this_month,
    }


# ============================================================================
# LIST COMPANIES
# ============================================================================

@router.get("")
async def list_companies(
    company_type: Optional[str] = None,  # "internal", "client"
    status: Optional[str] = None,  # "active", "suspended", "inactive"
    search: Optional[str] = None,
    limit: int = Query(50, le=100),
    offset: int = 0,
    db: Session = Depends(get_db),
):
    """
    List all companies with optional filters.
    FinClear staff can see all companies.
    """
    query = db.query(Company)
    
    # Filter by type
    if company_type:
        query = query.filter(Company.company_type == company_type)
    
    # Filter by status
    if status:
        query = query.filter(Company.status == status)
    
    # Search by name or code
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Company.name.ilike(search_term),
                Company.code.ilike(search_term)
            )
        )
    
    # Get total before pagination
    total = query.count()
    
    # Order and paginate
    companies = query.order_by(Company.name.asc()).offset(offset).limit(limit).all()
    
    # Get user counts and filing counts for each company
    result = []
    for company in companies:
        user_count = db.query(User).filter(User.company_id == company.id).count()
        filing_count = db.query(Report).filter(
            Report.company_id == company.id,
            Report.status == "filed"
        ).count()
        
        result.append({
            "id": company.id,
            "name": company.name,
            "code": company.code,
            "company_type": company.company_type,
            "status": company.status,
            "billing_email": company.billing_email,
            "billing_contact_name": company.billing_contact_name,
            "address": company.address,
            "phone": company.phone,
            "user_count": user_count,
            "filing_count": filing_count,
            "created_at": company.created_at.isoformat() if company.created_at else None,
        })
    
    return {
        "companies": result,
        "total": total,
    }


# ============================================================================
# GET COMPANY DETAIL
# ============================================================================

@router.get("/{company_id}")
async def get_company(
    company_id: str,
    db: Session = Depends(get_db),
):
    """Get detailed company information including stats."""
    company = db.query(Company).filter(Company.id == company_id).first()
    
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    # Get related counts
    user_count = db.query(User).filter(User.company_id == company_id).count()
    active_user_count = db.query(User).filter(
        User.company_id == company_id,
        User.status == "active"
    ).count()
    
    request_count = db.query(SubmissionRequest).filter(
        SubmissionRequest.company_id == company_id
    ).count()
    
    report_count = db.query(Report).filter(
        Report.company_id == company_id
    ).count()
    
    filed_count = db.query(Report).filter(
        Report.company_id == company_id,
        Report.status == "filed"
    ).count()
    
    # Get recent activity (last 5 reports)
    recent_reports = db.query(Report).filter(
        Report.company_id == company_id
    ).order_by(Report.created_at.desc()).limit(5).all()
    
    # Get billing summary
    invoice_total = db.query(func.sum(Invoice.total_cents)).filter(
        Invoice.company_id == company_id
    ).scalar() or 0
    
    paid_total = db.query(func.sum(Invoice.total_cents)).filter(
        Invoice.company_id == company_id,
        Invoice.status == "paid"
    ).scalar() or 0
    
    return {
        "id": company.id,
        "name": company.name,
        "code": company.code,
        "company_type": company.company_type,
        "status": company.status,
        "billing_email": company.billing_email,
        "billing_contact_name": company.billing_contact_name,
        "address": company.address,
        "phone": company.phone,
        "settings": company.settings,
        "created_at": company.created_at.isoformat() if company.created_at else None,
        "updated_at": company.updated_at.isoformat() if company.updated_at else None,
        "stats": {
            "total_users": user_count,
            "active_users": active_user_count,
            "total_requests": request_count,
            "total_reports": report_count,
            "filed_reports": filed_count,
            "total_billed_cents": invoice_total,
            "total_paid_cents": paid_total,
        },
        "recent_reports": [
            {
                "id": r.id,
                "property_address_text": r.property_address_text,
                "status": r.status,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in recent_reports
        ],
    }


# ============================================================================
# CREATE COMPANY
# ============================================================================

@router.post("")
async def create_company(
    request: CompanyCreateRequest,
    db: Session = Depends(get_db),
):
    """
    Create a new company.
    Typically used by FinClear admins to onboard new clients.
    """
    # Check code uniqueness
    existing = db.query(Company).filter(Company.code == request.code.upper()).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Company code '{request.code}' already exists"
        )
    
    # Validate company_type
    if request.company_type not in ("internal", "client"):
        raise HTTPException(
            status_code=400,
            detail="company_type must be 'internal' or 'client'"
        )
    
    company = Company(
        id=str(uuid4()),
        name=request.name,
        code=request.code.upper(),
        company_type=request.company_type,
        billing_email=request.billing_email,
        billing_contact_name=request.billing_contact_name,
        address=request.address.dict() if request.address else {},
        phone=request.phone,
        status="active",
        settings={},
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    
    db.add(company)
    db.commit()
    db.refresh(company)
    
    return {
        "id": company.id,
        "name": company.name,
        "code": company.code,
        "status": company.status,
        "message": "Company created successfully",
    }


# ============================================================================
# UPDATE COMPANY
# ============================================================================

@router.patch("/{company_id}")
async def update_company(
    company_id: str,
    request: CompanyUpdateRequest,
    db: Session = Depends(get_db),
):
    """Update company details."""
    company = db.query(Company).filter(Company.id == company_id).first()
    
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    # Update fields if provided
    if request.name is not None:
        company.name = request.name
    if request.billing_email is not None:
        company.billing_email = request.billing_email
    if request.billing_contact_name is not None:
        company.billing_contact_name = request.billing_contact_name
    if request.address is not None:
        company.address = request.address.dict()
    if request.phone is not None:
        company.phone = request.phone
    if request.settings is not None:
        company.settings = request.settings
    
    company.updated_at = datetime.utcnow()
    
    db.commit()
    
    return {
        "id": company.id,
        "name": company.name,
        "message": "Company updated successfully",
    }


# ============================================================================
# UPDATE COMPANY STATUS
# ============================================================================

@router.patch("/{company_id}/status")
async def update_company_status(
    company_id: str,
    request: CompanyStatusRequest,
    db: Session = Depends(get_db),
):
    """
    Update company status (activate, suspend, deactivate).
    Suspending a company should prevent their users from logging in.
    """
    company = db.query(Company).filter(Company.id == company_id).first()
    
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    valid_statuses = ("active", "suspended", "inactive")
    if request.status not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Must be one of: {valid_statuses}"
        )
    
    old_status = company.status
    company.status = request.status
    company.updated_at = datetime.utcnow()
    
    # If suspending, also suspend all users
    if request.status == "suspended" and old_status == "active":
        db.query(User).filter(
            User.company_id == company_id,
            User.status == "active"
        ).update({"status": "disabled"})
    
    # If reactivating, reactivate users (but keep disabled ones disabled)
    if request.status == "active" and old_status == "suspended":
        db.query(User).filter(
            User.company_id == company_id,
            User.status == "disabled"
        ).update({"status": "active"})
    
    db.commit()
    
    return {
        "id": company.id,
        "status": company.status,
        "message": f"Company status changed from '{old_status}' to '{request.status}'",
    }


# ============================================================================
# GET COMPANY USERS
# ============================================================================

@router.get("/{company_id}/users")
async def get_company_users(
    company_id: str,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Get all users belonging to a specific company."""
    company = db.query(Company).filter(Company.id == company_id).first()
    
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    query = db.query(User).filter(User.company_id == company_id)
    
    if status:
        query = query.filter(User.status == status)
    
    users = query.order_by(User.name.asc()).all()
    
    return {
        "company_id": company_id,
        "company_name": company.name,
        "users": [
            {
                "id": u.id,
                "email": u.email,
                "name": u.name,
                "role": u.role,
                "status": u.status,
                "last_login_at": u.last_login_at.isoformat() if u.last_login_at else None,
                "created_at": u.created_at.isoformat() if u.created_at else None,
            }
            for u in users
        ],
        "total": len(users),
    }
