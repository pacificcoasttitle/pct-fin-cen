"""
Branch Management API Routes.
Handles CRUD operations for company branches/offices.
Client admins can create and manage branches within their company.
"""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Header
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.branch import Branch
from app.models.user import User
from app.models.company import Company

router = APIRouter(prefix="/branches", tags=["branches"])


# ============================================================================
# SCHEMAS
# ============================================================================

class BranchCreate(BaseModel):
    name: str
    code: Optional[str] = None
    street: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    manager_name: Optional[str] = None
    manager_email: Optional[str] = None
    is_headquarters: bool = False


class BranchUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    street: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    manager_name: Optional[str] = None
    manager_email: Optional[str] = None
    is_active: Optional[bool] = None
    is_headquarters: Optional[bool] = None


class BranchResponse(BaseModel):
    id: UUID
    name: str
    code: Optional[str] = None
    street: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    manager_name: Optional[str] = None
    manager_email: Optional[str] = None
    is_active: bool
    is_headquarters: bool
    user_count: int = 0
    created_at: datetime

    class Config:
        from_attributes = True


# ============================================================================
# HELPERS
# ============================================================================

def _get_user_from_header(
    db: Session,
    x_user_id: Optional[str] = None,
) -> Optional[User]:
    """Extract user from X-User-Id header (demo mode)."""
    if not x_user_id:
        return None
    try:
        user_uuid = UUID(x_user_id)
        return db.query(User).filter(User.id == user_uuid, User.status == "active").first()
    except (ValueError, TypeError):
        return None


def _require_client_admin(db: Session, company_id: Optional[str], x_user_id: Optional[str]) -> tuple:
    """
    Validate that the request comes from a client_admin for the given company.
    Returns (user, company_id_uuid).
    
    In demo mode, we accept company_id as query param.
    """
    # Try header-based auth first
    user = _get_user_from_header(db, x_user_id)
    
    if user and user.role == "client_admin" and user.company_id:
        return user, user.company_id

    # Fall back to company_id query param (demo mode, matches team page pattern)
    if not company_id:
        raise HTTPException(401, "Authentication required. Provide company_id or X-User-Id header.")
    
    try:
        cid = UUID(company_id)
    except (ValueError, TypeError):
        raise HTTPException(400, "Invalid company_id")
    
    # Verify the company exists
    company = db.query(Company).filter(Company.id == cid).first()
    if not company:
        raise HTTPException(404, "Company not found")
    
    return None, cid


def _branch_to_response(branch: Branch, user_count: int) -> dict:
    """Convert a Branch model to response dict."""
    return {
        "id": branch.id,
        "name": branch.name,
        "code": branch.code,
        "street": branch.street,
        "city": branch.city,
        "state": branch.state,
        "zip": branch.zip,
        "phone": branch.phone,
        "email": branch.email,
        "manager_name": branch.manager_name,
        "manager_email": branch.manager_email,
        "is_active": branch.is_active,
        "is_headquarters": branch.is_headquarters,
        "user_count": user_count,
        "created_at": branch.created_at,
    }


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.get("", response_model=List[BranchResponse])
def list_branches(
    company_id: Optional[str] = Query(None),
    include_inactive: bool = Query(False),
    db: Session = Depends(get_db),
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
):
    """List all branches for a company."""
    _, cid = _require_client_admin(db, company_id, x_user_id)

    query = db.query(Branch).filter(Branch.company_id == cid)
    if not include_inactive:
        query = query.filter(Branch.is_active == True)
    
    branches = query.order_by(Branch.is_headquarters.desc(), Branch.name).all()

    result = []
    for branch in branches:
        user_count = db.query(User).filter(User.branch_id == branch.id).count()
        result.append(_branch_to_response(branch, user_count))

    return result


@router.post("", response_model=BranchResponse, status_code=201)
def create_branch(
    branch_data: BranchCreate,
    company_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
):
    """Create a new branch."""
    _, cid = _require_client_admin(db, company_id, x_user_id)

    # If setting as HQ, unset any existing HQ
    if branch_data.is_headquarters:
        db.query(Branch).filter(
            Branch.company_id == cid,
            Branch.is_headquarters == True,
        ).update({"is_headquarters": False})

    branch = Branch(
        company_id=cid,
        name=branch_data.name,
        code=branch_data.code,
        street=branch_data.street,
        city=branch_data.city,
        state=branch_data.state,
        zip=branch_data.zip,
        phone=branch_data.phone,
        email=branch_data.email,
        manager_name=branch_data.manager_name,
        manager_email=branch_data.manager_email,
        is_headquarters=branch_data.is_headquarters,
    )

    db.add(branch)
    db.commit()
    db.refresh(branch)

    return _branch_to_response(branch, 0)


@router.get("/{branch_id}", response_model=BranchResponse)
def get_branch(
    branch_id: UUID,
    company_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
):
    """Get a specific branch."""
    _, cid = _require_client_admin(db, company_id, x_user_id)

    branch = db.query(Branch).filter(
        Branch.id == branch_id,
        Branch.company_id == cid,
    ).first()

    if not branch:
        raise HTTPException(404, "Branch not found")

    user_count = db.query(User).filter(User.branch_id == branch.id).count()
    return _branch_to_response(branch, user_count)


@router.patch("/{branch_id}", response_model=BranchResponse)
def update_branch(
    branch_id: UUID,
    branch_data: BranchUpdate,
    company_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
):
    """Update a branch."""
    _, cid = _require_client_admin(db, company_id, x_user_id)

    branch = db.query(Branch).filter(
        Branch.id == branch_id,
        Branch.company_id == cid,
    ).first()

    if not branch:
        raise HTTPException(404, "Branch not found")

    # If setting as HQ, unset other HQ
    if branch_data.is_headquarters:
        db.query(Branch).filter(
            Branch.company_id == cid,
            Branch.is_headquarters == True,
            Branch.id != branch_id,
        ).update({"is_headquarters": False})

    for key, value in branch_data.model_dump(exclude_unset=True).items():
        setattr(branch, key, value)

    branch.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(branch)

    user_count = db.query(User).filter(User.branch_id == branch.id).count()
    return _branch_to_response(branch, user_count)


@router.delete("/{branch_id}")
def delete_branch(
    branch_id: UUID,
    company_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
):
    """Soft delete a branch (set inactive). Unassigns all users."""
    _, cid = _require_client_admin(db, company_id, x_user_id)

    branch = db.query(Branch).filter(
        Branch.id == branch_id,
        Branch.company_id == cid,
    ).first()

    if not branch:
        raise HTTPException(404, "Branch not found")

    # Unassign users from this branch
    db.query(User).filter(User.branch_id == branch_id).update({"branch_id": None})

    branch.is_active = False
    branch.updated_at = datetime.utcnow()
    db.commit()

    return {"success": True, "message": f"Branch '{branch.name}' deleted"}


@router.get("/{branch_id}/users")
def list_branch_users(
    branch_id: UUID,
    company_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
):
    """List users assigned to a branch."""
    _, cid = _require_client_admin(db, company_id, x_user_id)

    branch = db.query(Branch).filter(
        Branch.id == branch_id,
        Branch.company_id == cid,
    ).first()

    if not branch:
        raise HTTPException(404, "Branch not found")

    users = db.query(User).filter(User.branch_id == branch_id).all()

    return [
        {
            "id": str(u.id),
            "name": u.name,
            "email": u.email,
            "role": u.role,
            "status": u.status,
        }
        for u in users
    ]


@router.post("/{branch_id}/users/{user_id}")
def assign_user_to_branch(
    branch_id: UUID,
    user_id: UUID,
    company_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
):
    """Assign a user to a branch."""
    _, cid = _require_client_admin(db, company_id, x_user_id)

    branch = db.query(Branch).filter(
        Branch.id == branch_id,
        Branch.company_id == cid,
    ).first()

    if not branch:
        raise HTTPException(404, "Branch not found")

    user = db.query(User).filter(
        User.id == user_id,
        User.company_id == cid,
    ).first()

    if not user:
        raise HTTPException(404, "User not found")

    user.branch_id = branch_id
    db.commit()

    return {"success": True, "message": f"User '{user.name}' assigned to {branch.name}"}


@router.delete("/{branch_id}/users/{user_id}")
def remove_user_from_branch(
    branch_id: UUID,
    user_id: UUID,
    company_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
):
    """Remove a user from a branch."""
    _, cid = _require_client_admin(db, company_id, x_user_id)

    user = db.query(User).filter(
        User.id == user_id,
        User.company_id == cid,
        User.branch_id == branch_id,
    ).first()

    if not user:
        raise HTTPException(404, "User not found in this branch")

    user.branch_id = None
    db.commit()

    return {"success": True, "message": f"User '{user.name}' removed from branch"}
