"""
Company Management API Routes
Handles CRUD operations for client companies.
"""

import re
import uuid as uuid_module
from datetime import datetime
from typing import List, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from sqlalchemy import func, or_

from app.database import get_db
from app.models.company import Company
from app.models.user import User
from app.models.submission_request import SubmissionRequest
from app.models.report import Report
from app.models.invoice import Invoice
from app.services.audit import log_event, log_change, ENTITY_COMPANY, ENTITY_USER
from app.services.storage import storage_service

router = APIRouter(prefix="/companies", tags=["companies"])

# Valid values for billing_type and payment_terms
VALID_BILLING_TYPES = ("invoice_only", "hybrid")
VALID_PAYMENT_TERMS = (10, 15, 30, 45, 60)


# ============================================================================
# SCHEMAS
# ============================================================================

class AddressSchema(BaseModel):
    street: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip: Optional[str] = None


class CompanyCreateRequest(BaseModel):
    """
    Schema for creating a new company with full onboarding data.
    Supports the multi-step wizard on the frontend.
    """
    # === Step 1: Company Info ===
    name: str
    code: str  # Unique identifier like "ACME", "PCT" (uppercased automatically)
    company_type: str = "client"  # "internal" or "client"
    phone: Optional[str] = None
    address: Optional[AddressSchema] = None

    # === Step 2: Billing Configuration ===
    billing_email: Optional[str] = None  # REQUIRED for client companies
    billing_contact_name: Optional[str] = None
    billing_type: str = "invoice_only"  # "invoice_only" or "hybrid"
    filing_fee_cents: int = 7500  # Default $75.00
    payment_terms_days: int = 30  # Default Net 30
    billing_notes: Optional[str] = None

    # === Step 3: Initial Admin User (optional) ===
    create_admin_user: bool = False  # If true, create first admin user
    admin_user_name: Optional[str] = None  # Required if create_admin_user=True
    admin_user_email: Optional[str] = None  # Required if create_admin_user=True


class CompanyUpdateRequest(BaseModel):
    """Schema for updating an existing company."""
    name: Optional[str] = None
    billing_email: Optional[str] = None
    billing_contact_name: Optional[str] = None
    address: Optional[AddressSchema] = None
    phone: Optional[str] = None
    settings: Optional[dict] = None
    billing_type: Optional[str] = None  # "invoice_only" or "hybrid"


class ClientCompanyUpdateRequest(BaseModel):
    """
    Limited schema for clients updating their own company.
    Clients cannot change billing_type, filing_fee, or payment_terms.
    """
    billing_email: Optional[str] = None
    billing_contact_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[AddressSchema] = None


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
# MY COMPANY (Client access to own company)
# Must come before /{company_id} routes to avoid conflicts
# ============================================================================

@router.get("/me")
async def get_my_company(
    db: Session = Depends(get_db),
):
    """
    Return the current user's company information.
    For client_admin and client_user roles only.
    
    GET /companies/me
    """
    # In demo mode, get a demo client user
    # In production, get from auth context
    demo_user = db.query(User).filter(User.email == "admin@demotitle.com").first()
    if not demo_user:
        # Fallback: get any client user
        demo_user = db.query(User).filter(User.role.in_(["client_admin", "client_user"])).first()
    
    if not demo_user or not demo_user.company_id:
        raise HTTPException(status_code=404, detail="No company associated with user")
    
    company = db.query(Company).filter(Company.id == demo_user.company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    # Generate a pre-signed URL for logo if a key is stored
    logo_public_url = None
    if company.logo_url:
        logo_public_url = storage_service.generate_download_url(
            key=company.logo_url,
            expires_in=86400,  # 24 hours
        ) or None
    
    return {
        "id": str(company.id),
        "name": company.name,
        "code": company.code,
        "status": company.status,
        "phone": company.phone,
        "address": company.address,
        "billing_email": company.billing_email,
        "billing_contact_name": company.billing_contact_name,
        "billing_type": company.billing_type,
        "filing_fee_cents": company.filing_fee_cents or 7500,
        "filing_fee_dollars": (company.filing_fee_cents or 7500) / 100.0,
        "payment_terms_days": company.payment_terms_days or 30,
        # Branding
        "logo_url": logo_public_url,
        "logo_updated_at": company.logo_updated_at.isoformat() if company.logo_updated_at else None,
        "primary_color": company.primary_color,
        "secondary_color": company.secondary_color,
    }


@router.patch("/me")
async def update_my_company(
    request: ClientCompanyUpdateRequest,
    db: Session = Depends(get_db),
):
    """
    Client admin can update limited company fields.
    
    PATCH /companies/me
    {
        "billing_email": "billing@company.com",
        "billing_contact_name": "Jane Doe",
        "phone": "555-1234",
        "address": {"street": "123 Main St", "city": "San Diego", "state": "CA", "zip": "92101"}
    }
    
    Clients CANNOT update: name, code, billing_type, filing_fee_cents, payment_terms_days
    """
    # In demo mode, get a demo client admin
    demo_user = db.query(User).filter(
        User.email == "admin@demotitle.com",
        User.role == "client_admin"
    ).first()
    if not demo_user:
        demo_user = db.query(User).filter(User.role == "client_admin").first()
    
    if not demo_user or not demo_user.company_id:
        raise HTTPException(status_code=404, detail="No company associated with user")
    
    company = db.query(Company).filter(Company.id == demo_user.company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    # Track changes for audit
    old_values = {}
    
    if request.billing_email is not None:
        if request.billing_email and not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", request.billing_email.strip()):
            raise HTTPException(status_code=422, detail="Invalid email format")
        old_values["billing_email"] = company.billing_email
        company.billing_email = request.billing_email.strip() if request.billing_email else None
    
    if request.billing_contact_name is not None:
        old_values["billing_contact_name"] = company.billing_contact_name
        company.billing_contact_name = request.billing_contact_name.strip() if request.billing_contact_name else None
    
    if request.phone is not None:
        old_values["phone"] = company.phone
        company.phone = request.phone.strip() if request.phone else None
    
    if request.address is not None:
        old_values["address"] = company.address
        company.address = request.address.dict()
    
    company.updated_at = datetime.utcnow()
    
    # Audit log
    log_event(
        db=db,
        entity_type=ENTITY_COMPANY,
        entity_id=str(company.id),
        event_type="company.updated_by_client",
        actor_type="client_admin",
        actor_id=str(demo_user.id),
        details={
            "updated_fields": list(old_values.keys()),
            "old_values": old_values,
        },
    )
    
    db.commit()
    
    return {
        "ok": True,
        "message": "Company updated successfully",
    }


# ============================================================================
# LOGO UPLOAD / DELETE (Client Admin)
# ============================================================================

ALLOWED_LOGO_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}
MAX_LOGO_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB


@router.post("/me/logo")
async def upload_company_logo(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """
    Upload or replace company logo.
    Logo is stored in Cloudflare R2 under company_logos/{company_id}/logo.{ext}.
    
    POST /companies/me/logo
    Content-Type: multipart/form-data
    """
    # Get current user's company (demo mode fallback)
    demo_user = db.query(User).filter(
        User.email == "admin@demotitle.com",
        User.role == "client_admin"
    ).first()
    if not demo_user:
        demo_user = db.query(User).filter(User.role == "client_admin").first()
    
    if not demo_user or not demo_user.company_id:
        raise HTTPException(status_code=404, detail="No company associated with user")
    
    company = db.query(Company).filter(Company.id == demo_user.company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    # Validate file type
    if file.content_type not in ALLOWED_LOGO_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: JPG, PNG, GIF, WebP"
        )
    
    # Read and validate size
    contents = await file.read()
    if len(contents) > MAX_LOGO_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="Image must be less than 5MB")
    
    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="File is empty")
    
    # Check R2 is configured
    if not storage_service.is_configured:
        raise HTTPException(status_code=503, detail="File storage is not configured")
    
    # Determine extension from content type
    ext_map = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/gif": "gif",
        "image/webp": "webp",
    }
    ext = ext_map.get(file.content_type, "png")
    
    # Delete old logo from R2 if exists
    if company.logo_url:
        storage_service.delete_file(company.logo_url)
    
    # Generate unique key path
    unique_id = uuid_module.uuid4().hex[:12]
    r2_key = f"company_logos/{company.id}/{unique_id}.{ext}"
    
    # Upload to R2
    success = storage_service.upload_file(
        key=r2_key,
        data=contents,
        content_type=file.content_type,
    )
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to upload logo to storage")
    
    # Update company record
    company.logo_url = r2_key
    company.logo_updated_at = datetime.utcnow()
    company.updated_at = datetime.utcnow()
    
    # Audit log
    log_event(
        db=db,
        entity_type=ENTITY_COMPANY,
        entity_id=str(company.id),
        event_type="company.logo_uploaded",
        actor_type="client_admin",
        actor_id=str(demo_user.id),
        details={
            "r2_key": r2_key,
            "content_type": file.content_type,
            "size_bytes": len(contents),
            "filename": file.filename,
        },
    )
    
    db.commit()
    
    # Generate a pre-signed URL for immediate display
    logo_public_url = storage_service.generate_download_url(
        key=r2_key,
        expires_in=86400,  # 24 hours
    )
    
    return {
        "success": True,
        "logo_url": logo_public_url,
        "message": "Logo uploaded successfully",
    }


@router.delete("/me/logo")
async def delete_company_logo(
    db: Session = Depends(get_db),
):
    """
    Delete company logo.
    
    DELETE /companies/me/logo
    """
    # Get current user's company (demo mode fallback)
    demo_user = db.query(User).filter(
        User.email == "admin@demotitle.com",
        User.role == "client_admin"
    ).first()
    if not demo_user:
        demo_user = db.query(User).filter(User.role == "client_admin").first()
    
    if not demo_user or not demo_user.company_id:
        raise HTTPException(status_code=404, detail="No company associated with user")
    
    company = db.query(Company).filter(Company.id == demo_user.company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    if company.logo_url:
        # Delete from R2
        storage_service.delete_file(company.logo_url)
        
        old_key = company.logo_url
        company.logo_url = None
        company.logo_updated_at = None
        company.updated_at = datetime.utcnow()
        
        # Audit log
        log_event(
            db=db,
            entity_type=ENTITY_COMPANY,
            entity_id=str(company.id),
            event_type="company.logo_deleted",
            actor_type="client_admin",
            actor_id=str(demo_user.id),
            details={"deleted_r2_key": old_key},
        )
        
        db.commit()
    
    return {
        "success": True,
        "message": "Logo removed successfully",
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
            "id": str(company.id),
            "name": company.name,
            "code": company.code,
            "company_type": company.company_type,
            "status": company.status,
            "billing_email": company.billing_email,
            "billing_contact_name": company.billing_contact_name,
            "billing_type": company.billing_type or "invoice_only",
            "filing_fee_cents": company.filing_fee_cents or 7500,
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
    """Get detailed company information including stats and billing config."""
    company = db.query(Company).filter(Company.id == company_id).first()
    
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    # Get related counts
    user_count = db.query(User).filter(User.company_id == company_id).count()
    active_user_count = db.query(User).filter(
        User.company_id == company_id,
        User.status == "active"
    ).count()
    admin_count = db.query(User).filter(
        User.company_id == company_id,
        User.role == "client_admin",
        User.status != "disabled"
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
        "id": str(company.id),
        "name": company.name,
        "code": company.code,
        "company_type": company.company_type,
        "status": company.status,
        "billing_email": company.billing_email,
        "billing_contact_name": company.billing_contact_name,
        "address": company.address,
        "phone": company.phone,
        # Billing configuration
        "billing_type": company.billing_type,
        "filing_fee_cents": company.filing_fee_cents or 7500,
        "filing_fee_dollars": (company.filing_fee_cents or 7500) / 100.0,
        "payment_terms_days": company.payment_terms_days or 30,
        "billing_notes": company.billing_notes,
        "stripe_customer_id": company.stripe_customer_id,
        # Metadata
        "settings": company.settings,
        "created_at": company.created_at.isoformat() if company.created_at else None,
        "updated_at": company.updated_at.isoformat() if company.updated_at else None,
        "stats": {
            "total_users": user_count,
            "active_users": active_user_count,
            "admin_count": admin_count,
            "total_requests": request_count,
            "total_reports": report_count,
            "filed_reports": filed_count,
            "total_billed_cents": invoice_total,
            "total_paid_cents": paid_total,
        },
        "recent_reports": [
            {
                "id": str(r.id),
                "property_address_text": r.property_address_text,
                "status": r.status,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in recent_reports
        ],
    }


# ============================================================================
# GET COMPANY READINESS
# ============================================================================

@router.get("/{company_id}/readiness")
async def get_company_readiness(
    company_id: str,
    db: Session = Depends(get_db),
):
    """
    Return a checklist of what's configured for this company.
    Used to show setup progress on company detail.
    
    GET /companies/{company_id}/readiness
    """
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    # Get users for this company
    users = db.query(User).filter(
        User.company_id == company.id,
        User.status == "active"
    ).all()
    admin_users = [u for u in users if u.role == "client_admin"]
    
    # Check if company has any filings
    has_filings = db.query(Report).filter(Report.company_id == company.id).count() > 0
    
    # Build the readiness checklist
    checks = [
        {
            "key": "billing_email",
            "label": "Billing email configured",
            "passed": bool(company.billing_email),
            "detail": company.billing_email or "Not set",
            "required": True,
        },
        {
            "key": "billing_type_set",
            "label": "Billing type confirmed",
            "passed": company.billing_type is not None,
            "detail": company.billing_type or "Not set",
            "required": True,
        },
        {
            "key": "filing_fee_configured",
            "label": "Filing fee set",
            "passed": company.filing_fee_cents is not None,
            "detail": f"${(company.filing_fee_cents or 7500) / 100:.2f}",
            "required": True,
        },
        {
            "key": "admin_user",
            "label": "Admin user created",
            "passed": len(admin_users) > 0,
            "detail": f"{len(admin_users)} admin(s): {', '.join(u.email for u in admin_users)}" if admin_users else "No admin user",
            "required": True,
        },
        {
            "key": "any_user",
            "label": "At least one active user",
            "passed": len(users) > 0,
            "detail": f"{len(users)} active user(s)" if users else "No users",
            "required": True,
        },
        {
            "key": "address",
            "label": "Company address set",
            "passed": bool(company.address and company.address.get("street")),
            "detail": "Set" if company.address and company.address.get("street") else "Not set",
            "required": False,
        },
        {
            "key": "card_on_file",
            "label": "Card on file (hybrid only)",
            "passed": company.billing_type != "hybrid" or bool(company.stripe_customer_id),
            "detail": "N/A" if company.billing_type != "hybrid" else ("Card on file" if company.stripe_customer_id else "No card — required for hybrid"),
            "required": company.billing_type == "hybrid",
        },
    ]
    
    # Calculate overall readiness
    required_checks = [c for c in checks if c.get("required", False)]
    passed_required = sum(1 for c in required_checks if c["passed"])
    total_required = len(required_checks)
    
    # All required items must pass (except card_on_file which is soft requirement)
    core_checks = [c for c in required_checks if c["key"] != "card_on_file"]
    all_core_passed = all(c["passed"] for c in core_checks)
    
    return {
        "company_id": str(company.id),
        "company_name": company.name,
        "ready": all_core_passed,
        "passed_count": passed_required,
        "total_count": total_required,
        "percentage": round((passed_required / total_required) * 100) if total_required > 0 else 0,
        "checks": checks,
        "has_filings": has_filings,
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
    Create a new company with full onboarding data.
    Supports the multi-step wizard on the frontend.
    
    POST /companies
    {
        "name": "Pacific Coast Title",
        "code": "PCTITLE",
        "company_type": "client",
        "billing_email": "billing@pctitle.com",
        "billing_type": "invoice_only",
        "filing_fee_cents": 7500,
        "payment_terms_days": 30,
        "create_admin_user": true,
        "admin_user_name": "John Doe",
        "admin_user_email": "john@pctitle.com"
    }
    """
    # ----------------------------------------------------------------
    # VALIDATION: Company code uniqueness
    # ----------------------------------------------------------------
    code_upper = request.code.strip().upper()
    existing = db.query(Company).filter(Company.code == code_upper).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Company code '{code_upper}' already exists"
        )
    
    # ----------------------------------------------------------------
    # VALIDATION: company_type
    # ----------------------------------------------------------------
    if request.company_type not in ("internal", "client"):
        raise HTTPException(
            status_code=422,
            detail="company_type must be 'internal' or 'client'"
        )
    
    # ----------------------------------------------------------------
    # VALIDATION: billing_email required for client companies
    # ----------------------------------------------------------------
    if request.company_type == "client" and not request.billing_email:
        raise HTTPException(
            status_code=422,
            detail="billing_email is required for client companies"
        )
    
    # ----------------------------------------------------------------
    # VALIDATION: billing_email format
    # ----------------------------------------------------------------
    if request.billing_email:
        if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", request.billing_email.strip()):
            raise HTTPException(
                status_code=422,
                detail="Invalid billing email format"
            )
    
    # ----------------------------------------------------------------
    # VALIDATION: billing_type
    # ----------------------------------------------------------------
    if request.billing_type not in VALID_BILLING_TYPES:
        raise HTTPException(
            status_code=422,
            detail=f"billing_type must be one of: {', '.join(VALID_BILLING_TYPES)}"
        )
    
    # ----------------------------------------------------------------
    # VALIDATION: filing_fee_cents range ($0 to $1000)
    # ----------------------------------------------------------------
    if request.filing_fee_cents < 0 or request.filing_fee_cents > 100000:
        raise HTTPException(
            status_code=422,
            detail="filing_fee_cents must be between 0 and 100000 ($0 to $1000)"
        )
    
    # ----------------------------------------------------------------
    # VALIDATION: payment_terms_days
    # ----------------------------------------------------------------
    if request.payment_terms_days not in VALID_PAYMENT_TERMS:
        raise HTTPException(
            status_code=422,
            detail=f"payment_terms_days must be one of: {', '.join(str(d) for d in VALID_PAYMENT_TERMS)}"
        )
    
    # ----------------------------------------------------------------
    # VALIDATION: admin user fields if create_admin_user=True
    # ----------------------------------------------------------------
    if request.create_admin_user:
        if not request.admin_user_name or not request.admin_user_name.strip():
            raise HTTPException(
                status_code=422,
                detail="admin_user_name is required when create_admin_user is true"
            )
        if not request.admin_user_email or not request.admin_user_email.strip():
            raise HTTPException(
                status_code=422,
                detail="admin_user_email is required when create_admin_user is true"
            )
        # Validate email format
        if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", request.admin_user_email.strip()):
            raise HTTPException(
                status_code=422,
                detail="Invalid admin user email format"
            )
        # Check email uniqueness
        existing_user = db.query(User).filter(
            User.email == request.admin_user_email.lower().strip()
        ).first()
        if existing_user:
            raise HTTPException(
                status_code=409,
                detail=f"A user with email {request.admin_user_email} already exists"
            )
    
    # ----------------------------------------------------------------
    # CREATE COMPANY
    # ----------------------------------------------------------------
    company = Company(
        id=str(uuid4()),
        name=request.name.strip(),
        code=code_upper,
        company_type=request.company_type,
        billing_email=request.billing_email.strip() if request.billing_email else None,
        billing_contact_name=request.billing_contact_name.strip() if request.billing_contact_name else None,
        address=request.address.dict() if request.address else {},
        phone=request.phone.strip() if request.phone else None,
        billing_type=request.billing_type,
        filing_fee_cents=request.filing_fee_cents,
        payment_terms_days=request.payment_terms_days,
        billing_notes=request.billing_notes.strip() if request.billing_notes else None,
        status="active",
        settings={},
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    
    db.add(company)
    db.flush()
    
    # ----------------------------------------------------------------
    # CREATE ADMIN USER (if requested, for client companies)
    # ----------------------------------------------------------------
    admin_user = None
    if request.create_admin_user and request.company_type == "client":
        admin_user = User(
            id=str(uuid4()),
            name=request.admin_user_name.strip(),
            email=request.admin_user_email.lower().strip(),
            role="client_admin",
            company_id=company.id,
            status="active",  # In demo mode. When auth is added, this becomes "invited"
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(admin_user)
        db.flush()
        
        # Audit log for user creation
        log_event(
            db=db,
            entity_type=ENTITY_USER,
            entity_id=str(admin_user.id),
            event_type="user.created",
            actor_type="admin",
            details={
                "created_during": "company_onboarding",
                "company_id": str(company.id),
                "role": "client_admin",
                "name": admin_user.name,
                "email": admin_user.email,
            },
        )
    
    # Audit log for company creation
    log_event(
        db=db,
        entity_type=ENTITY_COMPANY,
        entity_id=str(company.id),
        event_type="company.created",
        actor_type="admin",
        details={
            "name": company.name,
            "code": company.code,
            "company_type": company.company_type,
            "billing_type": company.billing_type,
            "filing_fee_cents": company.filing_fee_cents,
            "payment_terms_days": company.payment_terms_days,
            "admin_user_created": admin_user is not None,
        },
    )
    
    db.commit()
    db.refresh(company)
    
    return {
        "id": str(company.id),
        "name": company.name,
        "code": company.code,
        "status": company.status,
        "billing_type": company.billing_type,
        "filing_fee_cents": company.filing_fee_cents,
        "payment_terms_days": company.payment_terms_days,
        "admin_user_created": admin_user is not None,
        "admin_user_email": admin_user.email if admin_user else None,
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
    """Update company details including billing_type."""
    company = db.query(Company).filter(Company.id == company_id).first()
    
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    # Track old values for audit
    old_values = {}
    
    # Update fields if provided
    if request.name is not None:
        old_values["name"] = company.name
        company.name = request.name.strip()
    if request.billing_email is not None:
        # Validate email format
        if request.billing_email and not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", request.billing_email.strip()):
            raise HTTPException(status_code=422, detail="Invalid billing email format")
        old_values["billing_email"] = company.billing_email
        company.billing_email = request.billing_email.strip() if request.billing_email else None
    if request.billing_contact_name is not None:
        old_values["billing_contact_name"] = company.billing_contact_name
        company.billing_contact_name = request.billing_contact_name.strip() if request.billing_contact_name else None
    if request.address is not None:
        old_values["address"] = company.address
        company.address = request.address.dict()
    if request.phone is not None:
        old_values["phone"] = company.phone
        company.phone = request.phone.strip() if request.phone else None
    if request.settings is not None:
        old_values["settings"] = company.settings
        company.settings = request.settings
    
    # Handle billing_type update with validation
    if request.billing_type is not None:
        if request.billing_type not in VALID_BILLING_TYPES:
            raise HTTPException(
                status_code=422,
                detail=f"billing_type must be one of: {', '.join(VALID_BILLING_TYPES)}"
            )
        old_values["billing_type"] = company.billing_type
        company.billing_type = request.billing_type
    
    company.updated_at = datetime.utcnow()
    
    # Audit log
    log_event(
        db=db,
        entity_type=ENTITY_COMPANY,
        entity_id=str(company.id),
        event_type="company.updated",
        actor_type="admin",
        details={
            "updated_fields": list(old_values.keys()),
            "old_values": old_values,
        },
    )
    
    db.commit()
    
    return {
        "id": str(company.id),
        "name": company.name,
        "billing_type": company.billing_type,
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
    
    # Audit log
    log_change(
        db=db,
        entity_type=ENTITY_COMPANY,
        entity_id=str(company.id),
        event_type="company.status_changed",
        old_values={"status": old_status},
        new_values={"status": request.status},
        actor_type="admin",  # TODO: Get from auth context
    )
    
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


# ============================================================================
# BILLING SETTINGS
# ============================================================================

class CompanyBillingSettingsUpdate(BaseModel):
    """Request to update company billing settings."""
    filing_fee_cents: Optional[int] = None
    payment_terms_days: Optional[int] = None
    billing_notes: Optional[str] = None
    billing_email: Optional[str] = None
    billing_contact_name: Optional[str] = None


@router.get("/{company_id}/billing-settings")
async def get_company_billing_settings(
    company_id: str,
    db: Session = Depends(get_db),
):
    """
    Get billing settings for a company.
    
    GET /companies/{company_id}/billing-settings
    """
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    return {
        "company_id": str(company.id),
        "company_name": company.name,
        "filing_fee_cents": company.filing_fee_cents or 7500,
        "filing_fee_dollars": (company.filing_fee_cents or 7500) / 100.0,
        "payment_terms_days": company.payment_terms_days or 30,
        "billing_notes": company.billing_notes,
        "billing_email": company.billing_email,
        "billing_contact_name": company.billing_contact_name,
    }


@router.patch("/{company_id}/billing-settings")
async def update_company_billing_settings(
    company_id: str,
    settings: CompanyBillingSettingsUpdate,
    db: Session = Depends(get_db),
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
    
    company.updated_at = datetime.utcnow()
    
    # Audit log
    log_change(
        db=db,
        entity_type=ENTITY_COMPANY,
        entity_id=str(company.id),
        event_type="company.billing_settings_updated",
        old_values=old_values,
        new_values={
            "filing_fee_cents": company.filing_fee_cents,
            "payment_terms_days": company.payment_terms_days,
        },
        actor_type="admin",
    )
    
    db.commit()
    db.refresh(company)
    
    return {
        "company_id": str(company.id),
        "company_name": company.name,
        "filing_fee_cents": company.filing_fee_cents or 7500,
        "filing_fee_dollars": (company.filing_fee_cents or 7500) / 100.0,
        "payment_terms_days": company.payment_terms_days or 30,
        "billing_notes": company.billing_notes,
        "billing_email": company.billing_email,
        "billing_contact_name": company.billing_contact_name,
        "message": "Billing settings updated successfully",
    }
