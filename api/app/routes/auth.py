"""
Demo Authentication API.
Provides demo login functionality that returns REAL user/company IDs from the database.
"""

from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.company import Company


router = APIRouter(prefix="/auth", tags=["auth"])


class DemoLoginRequest(BaseModel):
    """Demo login request - email only, no password in demo mode."""
    email: str


class DemoLoginResponse(BaseModel):
    """Demo login response with REAL database IDs."""
    user_id: str
    email: str
    name: str
    role: str
    company_id: Optional[str] = None
    company_name: Optional[str] = None
    company_code: Optional[str] = None


@router.post("/demo-login", response_model=DemoLoginResponse)
async def demo_login(request: DemoLoginRequest, db: Session = Depends(get_db)):
    """
    Demo login endpoint.
    
    Looks up user by email in the database and returns REAL UUIDs.
    In production, this would verify password/token. In demo mode, email match is sufficient.
    
    This is the source of truth for user/company IDs - the frontend stores these
    in the session cookie and uses them for all API calls.
    """
    # Normalize email
    email = request.email.lower().strip()
    
    # Look up real user from database
    user = db.query(User).filter(
        User.email == email,
        User.status == "active"
    ).first()
    
    if not user:
        raise HTTPException(
            status_code=401, 
            detail=f"User not found with email: {email}"
        )
    
    # Get company data if user has a company
    company = None
    if user.company_id:
        company = db.query(Company).filter(Company.id == user.company_id).first()
    
    # Update last_login_at
    user.last_login_at = datetime.utcnow()
    db.commit()
    
    return DemoLoginResponse(
        user_id=str(user.id),              # REAL UUID
        email=user.email,
        name=user.name,
        role=user.role,
        company_id=str(user.company_id) if user.company_id else None,  # REAL UUID
        company_name=company.name if company else None,
        company_code=company.code if company else None,
    )


@router.get("/me")
async def get_current_user_info(
    user_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Get current user info by ID.
    
    In production, this would use the auth token. In demo mode, we accept user_id as a query param.
    This is useful for refreshing user data or validating the session.
    """
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id is required")
    
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    company = None
    if user.company_id:
        company = db.query(Company).filter(Company.id == user.company_id).first()
    
    return {
        "user_id": str(user.id),
        "email": user.email,
        "name": user.name,
        "role": user.role,
        "company_id": str(user.company_id) if user.company_id else None,
        "company_name": company.name if company else None,
        "company_code": company.code if company else None,
    }


@router.get("/status")
async def auth_status(db: Session = Depends(get_db)):
    """
    Check auth system status and demo users.
    
    Diagnostic endpoint to verify demo users exist in database.
    """
    from app.config import get_settings
    settings = get_settings()
    
    # Expected demo users
    expected_emails = [
        "coo@pct.com",
        "admin@pctfincen.com",
        "staff@pctfincen.com",
        "admin@demotitle.com",
        "user@demotitle.com",
        "admin@acmetitle.com",
    ]
    
    # Check which users exist
    users_status = []
    for email in expected_emails:
        user = db.query(User).filter(User.email == email).first()
        users_status.append({
            "email": email,
            "exists": user is not None,
            "role": user.role if user else None,
            "status": user.status if user else None,
        })
    
    total_users = db.query(User).count()
    total_companies = db.query(Company).count()
    
    return {
        "environment": settings.ENVIRONMENT,
        "total_users": total_users,
        "total_companies": total_companies,
        "demo_users": users_status,
        "seed_required": total_users == 0,
    }


@router.post("/seed-demo")
async def seed_demo_users(db: Session = Depends(get_db)):
    """
    Manually trigger demo seed.
    
    Creates demo users if they don't exist. Safe to call multiple times.
    """
    from app.services.demo_seed import seed_demo_data
    
    # Check if already seeded
    user_count = db.query(User).count()
    if user_count > 0:
        return {
            "seeded": False,
            "message": f"Users already exist ({user_count} users). Skipping seed.",
            "user_count": user_count,
        }
    
    # Run the seed
    try:
        result = seed_demo_data(db)
        new_user_count = db.query(User).count()
        return {
            "seeded": True,
            "message": f"Demo data created successfully",
            "user_count": new_user_count,
            "details": result,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Seed failed: {str(e)}")
