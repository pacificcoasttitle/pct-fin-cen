"""
Permission middleware and helpers for role-based access control.

Supports client-driven workflow where escrow officers (client_user) can:
- Create and manage reports for their company
- Run the full wizard end-to-end
- Send party links
- Trigger filing

Staff maintains oversight of all reports across all companies.
"""
from typing import Optional, List
from uuid import UUID
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models import Report, User


# ============================================================================
# ROLE DEFINITIONS
# ============================================================================

ROLE_COO = "coo"
ROLE_PCT_ADMIN = "pct_admin"
ROLE_PCT_STAFF = "pct_staff"
ROLE_CLIENT_ADMIN = "client_admin"
ROLE_CLIENT_USER = "client_user"

# Staff roles have access to all companies
STAFF_ROLES = [ROLE_COO, ROLE_PCT_ADMIN, ROLE_PCT_STAFF]

# Client roles are scoped to their own company
CLIENT_ROLES = [ROLE_CLIENT_ADMIN, ROLE_CLIENT_USER]

# All valid roles
ALL_ROLES = STAFF_ROLES + CLIENT_ROLES


# ============================================================================
# PERMISSION SETS
# ============================================================================

# What client_user can do (escrow officers)
CLIENT_USER_PERMISSIONS = [
    # Reports - full wizard access
    "reports.create",
    "reports.read_own_company",
    "reports.update_own",
    "reports.wizard_access",
    "reports.send_party_links",
    "reports.file",
    
    # Parties
    "parties.create",
    "parties.read_own_company",
    "parties.resend_link",
    
    # Submission requests (legacy)
    "submission_requests.create",
    "submission_requests.read_own_company",
]

# What client_admin can do (in addition to client_user)
CLIENT_ADMIN_PERMISSIONS = CLIENT_USER_PERMISSIONS + [
    "reports.read_company",  # All reports in company
    "reports.update_company",  # Update any company report
    "users.read_company",
    "users.invite",
    "billing.read_company",
]

# Staff can do everything (no company restriction)
STAFF_PERMISSIONS = [
    "reports.*",
    "parties.*",
    "users.*",
    "billing.*",
    "audit.*",
]


# ============================================================================
# USER FETCHING
# ============================================================================

def get_current_user_from_request(
    db: Session,
    user_id: Optional[str] = None,
    user_id_header: Optional[str] = None,
) -> Optional[User]:
    """
    Get the current user from request context.
    
    In demo mode, user_id comes from the session cookie/header.
    In production, this would decode a JWT or session token.
    """
    uid = user_id or user_id_header
    
    if not uid:
        return None
    
    try:
        user_uuid = UUID(uid)
    except (ValueError, TypeError):
        return None
    
    user = db.query(User).filter(
        User.id == user_uuid,
        User.status == "active"
    ).first()
    
    return user


# ============================================================================
# ROLE CHECKING
# ============================================================================

def require_role(user: Optional[User], allowed_roles: List[str]) -> User:
    """
    Require user to have one of the allowed roles.
    
    Raises HTTPException 401 if not authenticated.
    Raises HTTPException 403 if role not allowed.
    
    Returns the user if authorized.
    """
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Authentication required"
        )
    
    if user.role not in allowed_roles:
        raise HTTPException(
            status_code=403,
            detail=f"Access denied. Required roles: {allowed_roles}. Your role: {user.role}"
        )
    
    return user


def require_any_authenticated(user: Optional[User]) -> User:
    """Require any authenticated user."""
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Authentication required"
        )
    return user


def is_staff(user: User) -> bool:
    """Check if user is a staff member (has access to all companies)."""
    return user.role in STAFF_ROLES


def is_client(user: User) -> bool:
    """Check if user is a client (scoped to their company)."""
    return user.role in CLIENT_ROLES


# ============================================================================
# OWNERSHIP / COMPANY ACCESS
# ============================================================================

def require_report_access(
    user: User,
    report: Report,
    write_access: bool = False,
) -> Report:
    """
    Ensure user can access this report.
    
    Args:
        user: Current authenticated user
        report: Report to check access for
        write_access: If True, require write permission (creator or company admin)
    
    Raises HTTPException 403 if access denied.
    Returns the report if authorized.
    """
    # Staff roles can access any report
    if is_staff(user):
        return report
    
    # Client roles must belong to the same company
    if user.company_id != report.company_id:
        raise HTTPException(
            status_code=403,
            detail="You don't have access to this report"
        )
    
    # For write access, check if user is creator or admin
    if write_access:
        if user.role == ROLE_CLIENT_ADMIN:
            return report  # Admins can edit any company report
        
        # client_user can only edit reports they initiated
        if report.initiated_by_user_id and report.initiated_by_user_id != user.id:
            # Also allow created_by_user_id for backwards compatibility
            if report.created_by_user_id != user.id:
                raise HTTPException(
                    status_code=403,
                    detail="You can only edit reports you created"
                )
    
    return report


def require_company_access(
    user: User,
    company_id: Optional[UUID],
) -> bool:
    """
    Ensure user can access resources for this company.
    
    Returns True if access granted.
    Raises HTTPException 403 if access denied.
    """
    # Staff can access any company
    if is_staff(user):
        return True
    
    # Client must match company
    if not company_id or user.company_id != company_id:
        raise HTTPException(
            status_code=403,
            detail="You don't have access to this company's resources"
        )
    
    return True


def filter_by_company(user: User) -> Optional[UUID]:
    """
    Get company_id filter for database queries.
    
    Returns None for staff (no filter needed).
    Returns user's company_id for clients.
    """
    if is_staff(user):
        return None  # Staff sees everything
    return user.company_id


# ============================================================================
# PERMISSION HELPERS
# ============================================================================

def can_create_report(user: User) -> bool:
    """Check if user can create new reports."""
    return user.role in [
        ROLE_COO, ROLE_PCT_ADMIN, ROLE_PCT_STAFF,
        ROLE_CLIENT_ADMIN, ROLE_CLIENT_USER
    ]


def can_send_party_links(user: User, report: Report) -> bool:
    """Check if user can send party links for this report."""
    if is_staff(user):
        return True
    
    if not is_client(user):
        return False
    
    # Must be same company
    if user.company_id != report.company_id:
        return False
    
    # client_admin can send for any company report
    if user.role == ROLE_CLIENT_ADMIN:
        return True
    
    # client_user can only send for their own reports
    return (
        report.initiated_by_user_id == user.id or
        report.created_by_user_id == user.id
    )


def can_file_report(user: User, report: Report) -> bool:
    """Check if user can trigger filing for this report."""
    # Same rules as sending party links
    return can_send_party_links(user, report)


def can_view_all_reports(user: User) -> bool:
    """Check if user can view reports across all companies."""
    return is_staff(user)
