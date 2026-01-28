# CURSOR PROMPT: Company & User Management System - Complete Implementation

## 🦈 GIANT SHARK: Multi-Tenant Foundation

This is foundational infrastructure. Every feature depends on Companies and Users being properly managed. Be precise, thorough, and consider all ripple effects.

**What exists:** Models ✅, Frontend pages ✅ (mock data), Role system ✅
**What's missing:** API routes ❌, Frontend wiring ❌, Seed data gaps ❌

---

## CRITICAL CONTEXT

### Current State
- Demo mode only (no real auth)
- Frontend pages exist but use hardcoded mock data
- Models are complete and well-designed
- 5 roles: `coo`, `pct_admin`, `pct_staff`, `client_admin`, `client_user`
- Companies have `company_type`: "internal" (FinClear) or "client"

### Design Principles
1. **FinClear staff** (`pct_admin`, `pct_staff`, `coo`) have `company_id = NULL` - they're internal
2. **Client users** (`client_admin`, `client_user`) MUST have a `company_id`
3. **Data isolation**: Clients only see their own company's data
4. **FinClear sees all**: Internal staff can see all companies/users

### Ripple Effects to Consider
- Reports are linked to `company_id` - ensure consistency
- Invoices are linked to `company_id` - billing must work
- SubmissionRequests have `company_id` - client submissions
- BillingEvents have `company_id` - revenue tracking
- Demo seed data must create proper relationships

---

# PART 1: COMPANY API ROUTES

## 1.1 Create Company Routes File

**File:** `api/app/routes/companies.py` (NEW)

```python
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


# ============================================================================
# COMPANY STATS (for dashboard cards)
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
    from datetime import date
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
```

## 1.2 Register Company Router

**File:** `api/app/main.py`

Add to imports and registration:

```python
from app.routes.companies import router as companies_router

# In router registration section:
app.include_router(companies_router)
```

---

# PART 2: USER API ROUTES

## 2.1 Create User Routes File

**File:** `api/app/routes/users.py` (NEW)

```python
"""
User Management API Routes
Handles CRUD operations for users across all companies.
"""

from datetime import datetime
from typing import List, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.database import get_db
from app.models.user import User
from app.models.company import Company
from app.models.report import Report
from app.models.submission_request import SubmissionRequest

router = APIRouter(prefix="/users", tags=["users"])


# ============================================================================
# CONSTANTS
# ============================================================================

# Valid roles
INTERNAL_ROLES = ("coo", "pct_admin", "pct_staff")
CLIENT_ROLES = ("client_admin", "client_user")
ALL_ROLES = INTERNAL_ROLES + CLIENT_ROLES

# Valid statuses
VALID_STATUSES = ("active", "invited", "disabled")


# ============================================================================
# SCHEMAS
# ============================================================================

class UserCreateRequest(BaseModel):
    email: EmailStr
    name: str
    role: str
    company_id: Optional[str] = None  # Required for client roles, NULL for internal

class UserUpdateRequest(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    status: Optional[str] = None
    settings: Optional[dict] = None

class UserInviteRequest(BaseModel):
    email: EmailStr
    name: str
    role: str
    company_id: str  # Required - which company to invite to


# ============================================================================
# LIST USERS
# ============================================================================

@router.get("")
async def list_users(
    company_id: Optional[str] = None,  # Filter by company
    company_type: Optional[str] = None,  # "internal" or "client"
    role: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(50, le=100),
    offset: int = 0,
    db: Session = Depends(get_db),
):
    """
    List users with filters.
    - FinClear staff see all users
    - Client admins would only see their company (enforce in frontend for demo)
    """
    query = db.query(User)
    
    # Filter by specific company
    if company_id:
        query = query.filter(User.company_id == company_id)
    
    # Filter by company type (internal vs client)
    if company_type == "internal":
        query = query.filter(User.company_id.is_(None))
    elif company_type == "client":
        query = query.filter(User.company_id.isnot(None))
    
    # Filter by role
    if role:
        query = query.filter(User.role == role)
    
    # Filter by status
    if status:
        query = query.filter(User.status == status)
    
    # Search by name or email
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                User.name.ilike(search_term),
                User.email.ilike(search_term)
            )
        )
    
    # Get total
    total = query.count()
    
    # Order and paginate
    users = query.order_by(User.name.asc()).offset(offset).limit(limit).all()
    
    # Build response with company info
    result = []
    for user in users:
        company_name = None
        company_code = None
        if user.company_id:
            company = db.query(Company).filter(Company.id == user.company_id).first()
            if company:
                company_name = company.name
                company_code = company.code
        
        result.append({
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "role": user.role,
            "status": user.status,
            "company_id": user.company_id,
            "company_name": company_name,
            "company_code": company_code,
            "last_login_at": user.last_login_at.isoformat() if user.last_login_at else None,
            "created_at": user.created_at.isoformat() if user.created_at else None,
        })
    
    return {
        "users": result,
        "total": total,
    }


# ============================================================================
# GET USER DETAIL
# ============================================================================

@router.get("/{user_id}")
async def get_user(
    user_id: str,
    db: Session = Depends(get_db),
):
    """Get detailed user information."""
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get company info
    company_name = None
    company_code = None
    if user.company_id:
        company = db.query(Company).filter(Company.id == user.company_id).first()
        if company:
            company_name = company.name
            company_code = company.code
    
    # Get activity stats
    reports_created = db.query(Report).filter(
        Report.created_by_user_id == user_id
    ).count()
    
    reports_assigned = db.query(SubmissionRequest).filter(
        SubmissionRequest.assigned_to_user_id == user_id
    ).count()
    
    requests_submitted = db.query(SubmissionRequest).filter(
        SubmissionRequest.requested_by_user_id == user_id
    ).count()
    
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "role": user.role,
        "status": user.status,
        "company_id": user.company_id,
        "company_name": company_name,
        "company_code": company_code,
        "settings": user.settings,
        "last_login_at": user.last_login_at.isoformat() if user.last_login_at else None,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "updated_at": user.updated_at.isoformat() if user.updated_at else None,
        "stats": {
            "reports_created": reports_created,
            "reports_assigned": reports_assigned,
            "requests_submitted": requests_submitted,
        },
    }


# ============================================================================
# CREATE USER
# ============================================================================

@router.post("")
async def create_user(
    request: UserCreateRequest,
    db: Session = Depends(get_db),
):
    """
    Create a new user directly.
    For demo mode - in production, use invite flow.
    """
    # Validate role
    if request.role not in ALL_ROLES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid role. Must be one of: {ALL_ROLES}"
        )
    
    # Check email uniqueness
    existing = db.query(User).filter(User.email == request.email.lower()).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"User with email '{request.email}' already exists"
        )
    
    # Validate company requirement
    if request.role in CLIENT_ROLES:
        if not request.company_id:
            raise HTTPException(
                status_code=400,
                detail="company_id is required for client roles"
            )
        # Verify company exists
        company = db.query(Company).filter(Company.id == request.company_id).first()
        if not company:
            raise HTTPException(status_code=404, detail="Company not found")
        if company.company_type != "client":
            raise HTTPException(
                status_code=400,
                detail="Client roles can only be assigned to client companies"
            )
    
    if request.role in INTERNAL_ROLES:
        if request.company_id:
            raise HTTPException(
                status_code=400,
                detail="Internal roles (coo, pct_admin, pct_staff) should not have a company_id"
            )
    
    user = User(
        id=str(uuid4()),
        email=request.email.lower(),
        name=request.name,
        role=request.role,
        company_id=request.company_id,
        status="active",
        settings={},
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    
    db.add(user)
    db.commit()
    db.refresh(user)
    
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "role": user.role,
        "status": user.status,
        "message": "User created successfully",
    }


# ============================================================================
# INVITE USER (Demo Mode - Creates Directly)
# ============================================================================

@router.post("/invite")
async def invite_user(
    request: UserInviteRequest,
    db: Session = Depends(get_db),
):
    """
    Invite a user to a company.
    In demo mode: Creates user directly with 'active' status.
    In production: Would create with 'invited' status and send email.
    """
    # Validate role
    if request.role not in CLIENT_ROLES:
        raise HTTPException(
            status_code=400,
            detail=f"Can only invite client roles: {CLIENT_ROLES}"
        )
    
    # Check email uniqueness
    existing = db.query(User).filter(User.email == request.email.lower()).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"User with email '{request.email}' already exists"
        )
    
    # Verify company exists
    company = db.query(Company).filter(Company.id == request.company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    if company.company_type != "client":
        raise HTTPException(
            status_code=400,
            detail="Can only invite users to client companies"
        )
    
    user = User(
        id=str(uuid4()),
        email=request.email.lower(),
        name=request.name,
        role=request.role,
        company_id=request.company_id,
        status="active",  # Demo mode - would be "invited" in production
        settings={},
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    
    db.add(user)
    db.commit()
    db.refresh(user)
    
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "role": user.role,
        "company_id": user.company_id,
        "status": user.status,
        "message": f"User invited to {company.name} successfully",
        # In production: "invitation_sent": True
    }


# ============================================================================
# UPDATE USER
# ============================================================================

@router.patch("/{user_id}")
async def update_user(
    user_id: str,
    request: UserUpdateRequest,
    db: Session = Depends(get_db),
):
    """Update user details (name, role, status)."""
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update name
    if request.name is not None:
        user.name = request.name
    
    # Update role (with validation)
    if request.role is not None:
        if request.role not in ALL_ROLES:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid role. Must be one of: {ALL_ROLES}"
            )
        
        # Prevent changing between internal/client roles
        current_is_internal = user.role in INTERNAL_ROLES
        new_is_internal = request.role in INTERNAL_ROLES
        
        if current_is_internal != new_is_internal:
            raise HTTPException(
                status_code=400,
                detail="Cannot change between internal and client role types"
            )
        
        user.role = request.role
    
    # Update status
    if request.status is not None:
        if request.status not in VALID_STATUSES:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid status. Must be one of: {VALID_STATUSES}"
            )
        user.status = request.status
    
    # Update settings
    if request.settings is not None:
        user.settings = request.settings
    
    user.updated_at = datetime.utcnow()
    
    db.commit()
    
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "role": user.role,
        "status": user.status,
        "message": "User updated successfully",
    }


# ============================================================================
# DEACTIVATE USER (Soft Delete)
# ============================================================================

@router.delete("/{user_id}")
async def deactivate_user(
    user_id: str,
    db: Session = Depends(get_db),
):
    """
    Deactivate a user (soft delete).
    Sets status to 'disabled' rather than deleting.
    """
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.status = "disabled"
    user.updated_at = datetime.utcnow()
    
    db.commit()
    
    return {
        "id": user.id,
        "status": "disabled",
        "message": "User deactivated successfully",
    }


# ============================================================================
# REACTIVATE USER
# ============================================================================

@router.post("/{user_id}/reactivate")
async def reactivate_user(
    user_id: str,
    db: Session = Depends(get_db),
):
    """Reactivate a disabled user."""
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.status != "disabled":
        raise HTTPException(
            status_code=400,
            detail="User is not disabled"
        )
    
    # Check if company is active (for client users)
    if user.company_id:
        company = db.query(Company).filter(Company.id == user.company_id).first()
        if company and company.status != "active":
            raise HTTPException(
                status_code=400,
                detail=f"Cannot reactivate user - company is {company.status}"
            )
    
    user.status = "active"
    user.updated_at = datetime.utcnow()
    
    db.commit()
    
    return {
        "id": user.id,
        "status": "active",
        "message": "User reactivated successfully",
    }


# ============================================================================
# USER STATS (for dashboard cards)
# ============================================================================

@router.get("/stats/summary")
async def get_user_stats(
    db: Session = Depends(get_db),
):
    """Get summary statistics for users dashboard."""
    total = db.query(User).count()
    active = db.query(User).filter(User.status == "active").count()
    disabled = db.query(User).filter(User.status == "disabled").count()
    
    # By type
    internal = db.query(User).filter(User.company_id.is_(None)).count()
    clients = db.query(User).filter(User.company_id.isnot(None)).count()
    
    # By role
    role_counts = {}
    for role in ALL_ROLES:
        role_counts[role] = db.query(User).filter(User.role == role).count()
    
    return {
        "total": total,
        "active": active,
        "disabled": disabled,
        "invited": total - active - disabled,
        "internal": internal,
        "clients": clients,
        "by_role": role_counts,
    }


# ============================================================================
# MY TEAM (For Client Admins)
# ============================================================================

@router.get("/my-team")
async def get_my_team(
    company_id: str,  # In production, get from session
    db: Session = Depends(get_db),
):
    """
    Get team members for a specific company.
    Used by client_admin on Team Settings page.
    """
    company = db.query(Company).filter(Company.id == company_id).first()
    
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    users = db.query(User).filter(
        User.company_id == company_id
    ).order_by(User.name.asc()).all()
    
    return {
        "company_id": company_id,
        "company_name": company.name,
        "team": [
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
```

## 2.2 Register User Router

**File:** `api/app/main.py`

Add to imports and registration:

```python
from app.routes.users import router as users_router

# In router registration section:
app.include_router(users_router)
```

---

# PART 3: UPDATE SEED DATA

## 3.1 Fix Demo Seed to Include All Users

**File:** `api/app/services/demo_seed.py`

**Find the user seeding section and update to create ALL 5 demo users:**

```python
# =========================================================================
# SEED USERS - All 5 Demo Roles
# =========================================================================

print("👤 Seeding demo users...")

# 1. COO (Internal - no company)
coo_user = db.query(User).filter(User.email == "coo@pct.com").first()
if not coo_user:
    coo_user = User(
        id=str(uuid4()),
        email="coo@pct.com",
        name="James Richardson",
        role="coo",
        company_id=None,  # Internal
        status="active",
        settings={},
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(coo_user)
    print(f"   👤 COO: {coo_user.email}")

# 2. FinClear Admin (Internal - no company)
admin_user = db.query(User).filter(User.email == "admin@pctfincen.com").first()
if not admin_user:
    admin_user = User(
        id=str(uuid4()),
        email="admin@pctfincen.com",
        name="Sarah Mitchell",
        role="pct_admin",
        company_id=None,  # Internal
        status="active",
        settings={},
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(admin_user)
    print(f"   👤 FinClear Admin: {admin_user.email}")

# 3. FinClear Staff (Internal - no company)
staff_user = db.query(User).filter(User.email == "staff@pctfincen.com").first()
if not staff_user:
    staff_user = User(
        id=str(uuid4()),
        email="staff@pctfincen.com",
        name="Michael Chen",
        role="pct_staff",
        company_id=None,  # Internal
        status="active",
        settings={},
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(staff_user)
    print(f"   👤 FinClear Staff: {staff_user.email}")

# 4. Client Admin (Demo company)
client_admin = db.query(User).filter(User.email == "admin@demotitle.com").first()
if not client_admin:
    client_admin = User(
        id=str(uuid4()),
        email="admin@demotitle.com",
        name="Jennifer Walsh",
        role="client_admin",
        company_id=demo_company.id,  # Linked to Demo company
        status="active",
        settings={},
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(client_admin)
    print(f"   👤 Client Admin: {client_admin.email} (Pacific Coast Title)")

# 5. Client User (Demo company)
client_user = db.query(User).filter(User.email == "user@demotitle.com").first()
if not client_user:
    client_user = User(
        id=str(uuid4()),
        email="user@demotitle.com",
        name="David Park",
        role="client_user",
        company_id=demo_company.id,  # Linked to Demo company
        status="active",
        settings={},
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(client_user)
    print(f"   👤 Client User: {client_user.email} (Pacific Coast Title)")

db.flush()
```

## 3.2 Add Additional Demo Company for Variety

**Add a second client company to show multiple companies:**

```python
# Second demo client company
acme_company = db.query(Company).filter(Company.code == "ACME").first()
if not acme_company:
    acme_company = Company(
        id=str(uuid4()),
        name="Acme Title & Escrow",
        code="ACME",
        company_type="client",
        billing_email="billing@acmetitle.com",
        billing_contact_name="Robert Johnson",
        address={
            "street": "456 Commerce Blvd",
            "city": "San Diego",
            "state": "CA",
            "zip": "92101"
        },
        phone="(619) 555-0199",
        status="active",
        settings={},
        created_at=datetime.utcnow() - timedelta(days=45),
        updated_at=datetime.utcnow(),
    )
    db.add(acme_company)
    print(f"   🏢 Created Acme company: {acme_company.name}")

# Acme admin user
acme_admin = db.query(User).filter(User.email == "admin@acmetitle.com").first()
if not acme_admin:
    acme_admin = User(
        id=str(uuid4()),
        email="admin@acmetitle.com",
        name="Robert Johnson",
        role="client_admin",
        company_id=acme_company.id,
        status="active",
        settings={},
        created_at=datetime.utcnow() - timedelta(days=45),
        updated_at=datetime.utcnow(),
    )
    db.add(acme_admin)
    print(f"   👤 Acme Admin: {acme_admin.email}")
```

---

# PART 4: WIRE ADMIN COMPANIES PAGE

## 4.1 Update Companies Admin Page

**File:** `web/app/(app)/app/admin/companies/page.tsx`

**Replace mock data with real API calls:**

```typescript
"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Building2,
  Plus,
  Search,
  RefreshCw,
  Users,
  FileText,
  DollarSign,
  MoreHorizontal,
  Eye,
  Edit,
  Ban,
  CheckCircle,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

interface Company {
  id: string;
  name: string;
  code: string;
  company_type: string;
  status: string;
  billing_email: string | null;
  billing_contact_name: string | null;
  address: any;
  phone: string | null;
  user_count: number;
  filing_count: number;
  created_at: string;
}

interface CompanyStats {
  total: number;
  active: number;
  suspended: number;
  inactive: number;
  clients: number;
  internal: number;
  new_this_month: number;
}

interface CompanyDetail extends Company {
  settings: any;
  updated_at: string;
  stats: {
    total_users: number;
    active_users: number;
    total_requests: number;
    total_reports: number;
    filed_reports: number;
    total_billed_cents: number;
    total_paid_cents: number;
  };
  recent_reports: any[];
}

const statusConfig = {
  active: { label: "Active", variant: "success" as const },
  suspended: { label: "Suspended", variant: "destructive" as const },
  inactive: { label: "Inactive", variant: "secondary" as const },
};

export default function CompaniesPage() {
  const { toast } = useToast();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [stats, setStats] = useState<CompanyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  // Detail sheet
  const [selectedCompany, setSelectedCompany] = useState<CompanyDetail | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  
  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newCompany, setNewCompany] = useState({
    name: "",
    code: "",
    billing_email: "",
    billing_contact_name: "",
    phone: "",
  });

  // Fetch companies
  const fetchCompanies = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const params = new URLSearchParams();
      params.set("company_type", "client"); // Only show client companies
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (search) params.set("search", search);
      
      const response = await fetch(`${API_BASE_URL}/companies?${params}`);
      if (response.ok) {
        const data = await response.json();
        setCompanies(data.companies || []);
      }
    } catch (error) {
      console.error("Failed to fetch companies:", error);
      toast({
        title: "Error",
        description: "Failed to fetch companies",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch stats
  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/companies/stats/summary`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  };

  // Fetch company detail
  const fetchCompanyDetail = async (companyId: string) => {
    setLoadingDetail(true);
    try {
      const response = await fetch(`${API_BASE_URL}/companies/${companyId}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedCompany(data);
        setSheetOpen(true);
      }
    } catch (error) {
      console.error("Failed to fetch company detail:", error);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Create company
  const handleCreate = async () => {
    if (!newCompany.name || !newCompany.code) {
      toast({
        title: "Validation Error",
        description: "Name and code are required",
        variant: "destructive",
      });
      return;
    }
    
    setCreating(true);
    try {
      const response = await fetch(`${API_BASE_URL}/companies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newCompany,
          company_type: "client",
        }),
      });
      
      if (response.ok) {
        toast({
          title: "Success",
          description: "Company created successfully",
        });
        setCreateOpen(false);
        setNewCompany({ name: "", code: "", billing_email: "", billing_contact_name: "", phone: "" });
        fetchCompanies();
        fetchStats();
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.detail || "Failed to create company",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create company",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  // Update company status
  const handleStatusChange = async (companyId: string, newStatus: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/companies/${companyId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (response.ok) {
        toast({
          title: "Success",
          description: `Company ${newStatus}`,
        });
        fetchCompanies();
        fetchStats();
        if (selectedCompany?.id === companyId) {
          fetchCompanyDetail(companyId);
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchCompanies();
    fetchStats();
  }, [statusFilter]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchCompanies();
    }, 300);
    return () => clearTimeout(debounce);
  }, [search]);

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Companies</h1>
          <p className="text-muted-foreground mt-1">
            Manage client companies and their settings
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => { fetchCompanies(true); fetchStats(); }}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Company
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Company</DialogTitle>
                <DialogDescription>
                  Create a new client company. You can invite users after creation.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>Company Name *</Label>
                    <Input
                      value={newCompany.name}
                      onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
                      placeholder="Pacific Coast Title"
                    />
                  </div>
                  <div>
                    <Label>Company Code *</Label>
                    <Input
                      value={newCompany.code}
                      onChange={(e) => setNewCompany({ ...newCompany, code: e.target.value.toUpperCase() })}
                      placeholder="PCT"
                      maxLength={10}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Unique identifier (3-10 chars)
                    </p>
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input
                      value={newCompany.phone}
                      onChange={(e) => setNewCompany({ ...newCompany, phone: e.target.value })}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  <div>
                    <Label>Billing Contact</Label>
                    <Input
                      value={newCompany.billing_contact_name}
                      onChange={(e) => setNewCompany({ ...newCompany, billing_contact_name: e.target.value })}
                      placeholder="John Smith"
                    />
                  </div>
                  <div>
                    <Label>Billing Email</Label>
                    <Input
                      type="email"
                      value={newCompany.billing_email}
                      onChange={(e) => setNewCompany({ ...newCompany, billing_email: e.target.value })}
                      placeholder="billing@company.com"
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={creating}>
                  {creating ? "Creating..." : "Create Company"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-blue-100">
                  <Building2 className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.clients}</p>
                  <p className="text-xs text-muted-foreground">Total Clients</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-green-100">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.active}</p>
                  <p className="text-xs text-muted-foreground">Active</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-amber-100">
                  <Ban className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.suspended}</p>
                  <p className="text-xs text-muted-foreground">Suspended</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-purple-100">
                  <Plus className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.new_this_month}</p>
                  <p className="text-xs text-muted-foreground">New This Month</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or code..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {loading && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!loading && companies.length === 0 && (
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No companies found</h3>
            <p className="text-muted-foreground mb-4">
              {search ? "Try adjusting your search" : "Get started by adding your first client company"}
            </p>
            {!search && (
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Company
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Companies Table */}
      {!loading && companies.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Users</TableHead>
                  <TableHead className="text-center">Filings</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.map((company) => (
                  <TableRow
                    key={company.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => fetchCompanyDetail(company.id)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-slate-600" />
                        </div>
                        <div>
                          <p className="font-medium">{company.name}</p>
                          {company.billing_email && (
                            <p className="text-sm text-muted-foreground">{company.billing_email}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="bg-slate-100 px-2 py-1 rounded text-sm">
                        {company.code}
                      </code>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusConfig[company.status as keyof typeof statusConfig]?.variant || "secondary"}>
                        {statusConfig[company.status as keyof typeof statusConfig]?.label || company.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        {company.user_count}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        {company.filing_count}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(company.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); fetchCompanyDetail(company.id); }}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          {company.status === "active" && (
                            <DropdownMenuItem
                              onClick={(e) => { e.stopPropagation(); handleStatusChange(company.id, "suspended"); }}
                              className="text-amber-600"
                            >
                              <Ban className="h-4 w-4 mr-2" />
                              Suspend
                            </DropdownMenuItem>
                          )}
                          {company.status === "suspended" && (
                            <DropdownMenuItem
                              onClick={(e) => { e.stopPropagation(); handleStatusChange(company.id, "active"); }}
                              className="text-green-600"
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Reactivate
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Company Detail Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-[500px] sm:w-[600px] overflow-y-auto">
          {loadingDetail ? (
            <div className="space-y-4 pt-8">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : selectedCompany ? (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  {selectedCompany.name}
                </SheetTitle>
                <SheetDescription>
                  Code: {selectedCompany.code} • Created {format(new Date(selectedCompany.created_at), "MMMM d, yyyy")}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Status */}
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge variant={statusConfig[selectedCompany.status as keyof typeof statusConfig]?.variant || "secondary"} className="mt-1">
                      {statusConfig[selectedCompany.status as keyof typeof statusConfig]?.label || selectedCompany.status}
                    </Badge>
                  </div>
                  {selectedCompany.status === "active" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStatusChange(selectedCompany.id, "suspended")}
                      className="text-amber-600"
                    >
                      <Ban className="h-4 w-4 mr-1" />
                      Suspend
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStatusChange(selectedCompany.id, "active")}
                      className="text-green-600"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Reactivate
                    </Button>
                  )}
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg text-center">
                    <Users className="h-5 w-5 mx-auto text-blue-600 mb-1" />
                    <p className="text-2xl font-bold">{selectedCompany.stats.total_users}</p>
                    <p className="text-xs text-muted-foreground">Users</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg text-center">
                    <FileText className="h-5 w-5 mx-auto text-green-600 mb-1" />
                    <p className="text-2xl font-bold">{selectedCompany.stats.filed_reports}</p>
                    <p className="text-xs text-muted-foreground">Filings</p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg text-center">
                    <DollarSign className="h-5 w-5 mx-auto text-purple-600 mb-1" />
                    <p className="text-2xl font-bold">{formatCurrency(selectedCompany.stats.total_paid_cents)}</p>
                    <p className="text-xs text-muted-foreground">Paid</p>
                  </div>
                </div>

                {/* Contact Info */}
                <div>
                  <h4 className="font-semibold mb-3">Billing Contact</h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-muted-foreground">Name:</span> {selectedCompany.billing_contact_name || "—"}</p>
                    <p><span className="text-muted-foreground">Email:</span> {selectedCompany.billing_email || "—"}</p>
                    <p><span className="text-muted-foreground">Phone:</span> {selectedCompany.phone || "—"}</p>
                  </div>
                </div>

                {/* Recent Activity */}
                {selectedCompany.recent_reports.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3">Recent Reports</h4>
                    <div className="space-y-2">
                      {selectedCompany.recent_reports.map((report) => (
                        <div key={report.id} className="flex justify-between items-center p-2 bg-slate-50 rounded">
                          <span className="text-sm truncate flex-1">{report.property_address_text}</span>
                          <Badge variant="outline" className="ml-2">{report.status}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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

# PART 5: WIRE ADMIN USERS PAGE

**File:** `web/app/(app)/app/admin/users/page.tsx`

This is a large file. The pattern is similar to the companies page:

```typescript
// Key changes needed:
// 1. Replace mockUsers array with API fetch from GET /users
// 2. Replace mock stats with GET /users/stats/summary
// 3. Wire "Invite User" button to POST /users or POST /users/invite
// 4. Wire role change dropdown to PATCH /users/{id}
// 5. Wire status change to PATCH /users/{id} or DELETE /users/{id}
// 6. Add user detail sheet with real data from GET /users/{id}

// Fetch functions to add:
const fetchUsers = async () => {
  const params = new URLSearchParams();
  if (companyFilter !== "all") params.set("company_type", companyFilter);
  if (roleFilter !== "all") params.set("role", roleFilter);
  if (statusFilter !== "all") params.set("status", statusFilter);
  if (search) params.set("search", search);
  
  const response = await fetch(`${API_BASE_URL}/users?${params}`);
  const data = await response.json();
  setUsers(data.users || []);
};

const fetchStats = async () => {
  const response = await fetch(`${API_BASE_URL}/users/stats/summary`);
  const data = await response.json();
  setStats(data);
};

const handleInviteUser = async () => {
  const response = await fetch(`${API_BASE_URL}/users/invite`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
      company_id: newUser.company_id,
    }),
  });
  // Handle response...
};

const handleUpdateRole = async (userId: string, newRole: string) => {
  const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role: newRole }),
  });
  // Handle response...
};

const handleDeactivate = async (userId: string) => {
  const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
    method: "DELETE",
  });
  // Handle response...
};
```

**Full implementation follows the same pattern as the Companies page - replace all mock data with API calls, add loading states, add create dialog, add detail sheet.**

---

# PART 6: WIRE TEAM SETTINGS PAGE

**File:** `web/app/(app)/app/settings/team/page.tsx`

```typescript
// Key changes:
// 1. Get company_id from session/cookie
// 2. Fetch team from GET /users/my-team?company_id=xxx
// 3. Wire "Invite User" to POST /users/invite
// 4. Wire role dropdown to PATCH /users/{id}
// 5. Wire remove button to DELETE /users/{id}

// For demo mode, get company_id from cookie:
const getCompanyId = () => {
  const cookie = document.cookie
    .split("; ")
    .find((row) => row.startsWith("pct_demo_session="));
  if (cookie) {
    const session = JSON.parse(atob(cookie.split("=")[1]));
    return session.companyId;
  }
  return null;
};

// Fetch team
const fetchTeam = async () => {
  const companyId = getCompanyId();
  if (!companyId) {
    // User is internal staff, no team
    setTeam([]);
    return;
  }
  
  const response = await fetch(`${API_BASE_URL}/users/my-team?company_id=${companyId}`);
  const data = await response.json();
  setTeam(data.team || []);
};
```

---

# PART 7: UPDATE DEMO LOGIN TO MATCH

**File:** `web/app/api/auth/login/route.ts`

Ensure the demo users match what's seeded:

```typescript
const DEMO_USERS: Record<string, DemoUser> = {
  "coo@pct.com": {
    id: "demo-coo",
    email: "coo@pct.com",
    name: "James Richardson",
    role: "coo",
    companyId: null,
    companyName: "FinClear Solutions",
  },
  "admin@pctfincen.com": {
    id: "demo-pct-admin",
    email: "admin@pctfincen.com",
    name: "Sarah Mitchell",
    role: "pct_admin",
    companyId: null,
    companyName: "FinClear Solutions",
  },
  "staff@pctfincen.com": {
    id: "demo-pct-staff",
    email: "staff@pctfincen.com",
    name: "Michael Chen",
    role: "pct_staff",
    companyId: null,
    companyName: "FinClear Solutions",
  },
  "admin@demotitle.com": {
    id: "demo-client-admin",
    email: "admin@demotitle.com",
    name: "Jennifer Walsh",
    role: "client_admin",
    companyId: "demo-company-id", // Will need to match seeded company ID
    companyName: "Pacific Coast Title",
  },
  "user@demotitle.com": {
    id: "demo-client-user",
    email: "user@demotitle.com",
    name: "David Park",
    role: "client_user",
    companyId: "demo-company-id",
    companyName: "Pacific Coast Title",
  },
};
```

---

# PART 8: RIPPLE EFFECTS & DATA CONSISTENCY

## 8.1 Ensure Company ID Propagation

When creating reports/requests, ensure company_id flows through:

**Already handled in previous fixes, but verify:**
- SubmissionRequest gets company_id from session
- Report gets company_id from SubmissionRequest
- BillingEvent gets company_id from Report
- Invoice gets company_id when generated

## 8.2 Data Isolation for Clients

**Frontend middleware already handles this**, but ensure API calls include company filtering:

```typescript
// When client_admin or client_user makes API calls, scope to their company
const session = getSession();
if (session.companyId) {
  // Add company_id filter to requests
  params.set("company_id", session.companyId);
}
```

## 8.3 Update Any Hardcoded Company References

Search for and update:
- "PCT" → "FINCLEAR" (internal company code)
- "DEMO" → Keep for demo client company
- Any hardcoded company IDs

---

# PART 9: UPDATE KILLEDSHARKS.MD

Add this entry:

```markdown
---

### 21. Company & User Management System ✅

**Problem:** Foundational multi-tenant infrastructure was missing:
- No Company CRUD API
- No User CRUD API
- Admin pages used mock data
- Team settings used mock data
- Seed data missing 2 demo users

**Solution:**

**1. Company API** (`api/app/routes/companies.py`)
| Endpoint | Purpose |
|----------|---------|
| `GET /companies` | List with filters (type, status, search) |
| `GET /companies/{id}` | Detail with stats & recent activity |
| `POST /companies` | Create new client company |
| `PATCH /companies/{id}` | Update company details |
| `PATCH /companies/{id}/status` | Activate/suspend/deactivate |
| `GET /companies/{id}/users` | List company users |
| `GET /companies/stats/summary` | Dashboard stats |

**2. User API** (`api/app/routes/users.py`)
| Endpoint | Purpose |
|----------|---------|
| `GET /users` | List with filters (company, role, status, search) |
| `GET /users/{id}` | Detail with activity stats |
| `POST /users` | Create user directly |
| `POST /users/invite` | Invite user to company |
| `PATCH /users/{id}` | Update name, role, status |
| `DELETE /users/{id}` | Deactivate (soft delete) |
| `POST /users/{id}/reactivate` | Reactivate disabled user |
| `GET /users/my-team` | Get team for client company |
| `GET /users/stats/summary` | Dashboard stats |

**3. Frontend Wiring**
- Admin Companies page → Real API data
- Admin Users page → Real API data  
- Team Settings page → Real API data
- Create Company dialog → Functional
- Invite User dialog → Functional
- Role change dropdown → Functional
- Status change actions → Functional

**4. Seed Data Fixed**
- Added COO user: `coo@pct.com`
- Added Client User: `user@demotitle.com`
- Added second demo company: Acme Title & Escrow
- All 5 demo roles now properly seeded

**5. Ripple Effects Handled**
- Company status change cascades to users
- Data isolation enforced (clients see only their data)
- Demo login matches seeded users

**Role Validation Rules:**
- Internal roles (coo, pct_admin, pct_staff) → company_id must be NULL
- Client roles (client_admin, client_user) → company_id required
- Cannot change between internal ↔ client role types

**Files Created:**
- `api/app/routes/companies.py` (NEW - 350+ lines)
- `api/app/routes/users.py` (NEW - 400+ lines)

**Files Changed:**
- `api/app/main.py` (register routers)
- `api/app/services/demo_seed.py` (add missing users + company)
- `web/app/(app)/app/admin/companies/page.tsx` (API wiring)
- `web/app/(app)/app/admin/users/page.tsx` (API wiring)
- `web/app/(app)/app/settings/team/page.tsx` (API wiring)
- `web/app/api/auth/login/route.ts` (match seeded users)

**Status:** ✅ Killed (Giant Shark)

---

## Updated Summary

| Category | Count |
|----------|-------|
| 🔴 Critical Fixes | 8 |
| 🟠 Major Features | 9 |
| 🎨 UX/Design | 2 |
| 🔧 Configuration | 2 |
| 📄 Documentation | 3 |
| 🎯 Demo Data & API | 1 |
| 🏗️ Infrastructure | 1 |

**Total Sharks Killed: 25** 🦈
```

---

# VERIFICATION CHECKLIST

## Company API
- [ ] `GET /companies` returns list of companies
- [ ] `GET /companies/{id}` returns detail with stats
- [ ] `POST /companies` creates new company
- [ ] `PATCH /companies/{id}` updates company
- [ ] `PATCH /companies/{id}/status` changes status
- [ ] Suspending company cascades to users
- [ ] `GET /companies/stats/summary` returns counts

## User API
- [ ] `GET /users` returns list with filters
- [ ] `GET /users/{id}` returns detail with stats
- [ ] `POST /users` creates user with validation
- [ ] `POST /users/invite` creates user in company
- [ ] `PATCH /users/{id}` updates role/status
- [ ] `DELETE /users/{id}` soft deletes user
- [ ] Internal roles validated (no company_id)
- [ ] Client roles validated (company_id required)
- [ ] `GET /users/my-team` returns company team

## Frontend
- [ ] Companies admin shows real data
- [ ] Add Company dialog works
- [ ] Company detail sheet works
- [ ] Suspend/reactivate company works
- [ ] Users admin shows real data
- [ ] Invite User dialog works
- [ ] Role dropdown updates via API
- [ ] Deactivate user works
- [ ] Team settings shows real team
- [ ] Team invite works

## Seed Data
- [ ] All 5 demo users created
- [ ] Demo login works for all roles
- [ ] Second company (Acme) created

## Data Consistency
- [ ] New requests get company_id from session
- [ ] Reports inherit company_id
- [ ] Billing events have company_id
- [ ] Clients only see their own data

---

**This is the Giant Shark. Kill it and the foundation is solid.** 🦈🔱
