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
from app.services.audit import log_event, log_change, ENTITY_USER

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
    branch_id: Optional[str] = None  # Optional - assign to a branch on invite


# ============================================================================
# STATS ENDPOINT (must come before /{user_id} to avoid route conflicts)
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
# MY TEAM (For Client Admins) - Must come before /{user_id}
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
    db.flush()
    
    # Audit log
    log_event(
        db=db,
        entity_type=ENTITY_USER,
        entity_id=str(user.id),
        event_type="user.created",
        actor_type="admin",  # TODO: Get from auth context
        details={
            "email": user.email,
            "name": user.name,
            "role": user.role,
            "company_id": user.company_id,
        },
    )
    
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
        branch_id=request.branch_id if request.branch_id else None,
        status="active",  # Demo mode - would be "invited" in production
        settings={},
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    
    db.add(user)
    db.flush()
    
    # Audit log
    log_event(
        db=db,
        entity_type=ENTITY_USER,
        entity_id=str(user.id),
        event_type="user.invited",
        actor_type="admin",  # TODO: Get from auth context
        details={
            "email": user.email,
            "name": user.name,
            "role": user.role,
            "company_id": user.company_id,
            "company_name": company.name,
            "branch_id": request.branch_id,
        },
    )
    
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
    
    # Audit log
    log_event(
        db=db,
        entity_type=ENTITY_USER,
        entity_id=str(user.id),
        event_type="user.updated",
        actor_type="admin",  # TODO: Get from auth context
        details={
            "updated_fields": [
                k for k, v in request.model_dump(exclude_unset=True).items() if v is not None
            ],
        },
    )
    
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
    
    old_status = user.status
    user.status = "disabled"
    user.updated_at = datetime.utcnow()
    
    # Audit log
    log_change(
        db=db,
        entity_type=ENTITY_USER,
        entity_id=str(user.id),
        event_type="user.deactivated",
        old_values={"status": old_status},
        new_values={"status": "disabled"},
        actor_type="admin",  # TODO: Get from auth context
    )
    
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
    
    # Audit log
    log_change(
        db=db,
        entity_type=ENTITY_USER,
        entity_id=str(user.id),
        event_type="user.reactivated",
        old_values={"status": "disabled"},
        new_values={"status": "active"},
        actor_type="admin",  # TODO: Get from auth context
    )
    
    db.commit()
    
    return {
        "id": user.id,
        "status": "active",
        "message": "User reactivated successfully",
    }
