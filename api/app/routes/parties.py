"""
Party API routes (public-facing for token-based access).
"""
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import PartyLink, ReportParty, AuditLog
from app.schemas.party import PartyResponse, PartySave, PartySubmitResponse, ReportSummary

router = APIRouter(prefix="/party", tags=["party"])


def get_client_ip(request: Request) -> Optional[str]:
    """Extract client IP from request."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else None


def get_valid_link(token: str, db: Session) -> PartyLink:
    """Get and validate a party link by token."""
    link = db.query(PartyLink).filter(PartyLink.token == token).first()
    
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")
    
    if link.status == "expired" or datetime.utcnow() > link.expires_at:
        if link.status != "expired":
            link.status = "expired"
            db.commit()
        raise HTTPException(status_code=410, detail="Link has expired")
    
    if link.status == "revoked":
        raise HTTPException(status_code=410, detail="Link has been revoked")
    
    if link.status == "used":
        raise HTTPException(status_code=410, detail="Link has already been used")
    
    return link


@router.get("/{token}", response_model=PartyResponse)
def get_party_by_token(
    token: str,
    db: Session = Depends(get_db),
):
    """Get party information by token (for prefilling form)."""
    link = get_valid_link(token, db)
    party = link.party
    report = party.report
    
    # Build report summary for context
    report_summary = ReportSummary(
        property_address=report.property_address_text,
        closing_date=report.closing_date.isoformat() if report.closing_date else None,
        title_company="Pacific Coast Title Company",
    )
    
    return PartyResponse(
        party_id=party.id,
        party_role=party.party_role,
        entity_type=party.entity_type,
        display_name=party.display_name,
        party_data=party.party_data or {},
        status=party.status,
        report_summary=report_summary,
        link_expires_at=link.expires_at,
        is_submitted=party.status == "submitted",
    )


@router.post("/{token}/save", response_model=PartyResponse)
def save_party_data(
    token: str,
    party_save: PartySave,
    request: Request,
    db: Session = Depends(get_db),
):
    """Autosave party data (debounced from UI)."""
    link = get_valid_link(token, db)
    party = link.party
    
    if party.status == "submitted":
        raise HTTPException(status_code=400, detail="Party has already submitted")
    
    # Merge party data (preserve existing, update provided)
    existing_data = party.party_data or {}
    existing_data.update(party_save.party_data)
    
    party.party_data = existing_data
    party.status = "in_progress"
    party.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(party)
    
    report = party.report
    report_summary = ReportSummary(
        property_address=report.property_address_text,
        closing_date=report.closing_date.isoformat() if report.closing_date else None,
        title_company="Pacific Coast Title Company",
    )
    
    return PartyResponse(
        party_id=party.id,
        party_role=party.party_role,
        entity_type=party.entity_type,
        display_name=party.display_name,
        party_data=party.party_data,
        status=party.status,
        report_summary=report_summary,
        link_expires_at=link.expires_at,
        is_submitted=False,
    )


@router.post("/{token}/submit", response_model=PartySubmitResponse)
def submit_party_data(
    token: str,
    request: Request,
    db: Session = Depends(get_db),
):
    """Submit party data (final submission, locks the link)."""
    link = get_valid_link(token, db)
    party = link.party
    report = party.report
    
    if party.status == "submitted":
        raise HTTPException(status_code=400, detail="Party has already submitted")
    
    # Validate minimum required data
    party_data = party.party_data or {}
    
    if party.entity_type == "individual":
        required_fields = ["first_name", "last_name"]
    else:
        required_fields = ["entity_name"]
    
    missing = [f for f in required_fields if not party_data.get(f)]
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Missing required fields: {', '.join(missing)}"
        )
    
    # Update party
    party.status = "submitted"
    party.updated_at = datetime.utcnow()
    
    # Update display name if not set
    if not party.display_name:
        if party.entity_type == "individual":
            party.display_name = f"{party_data.get('first_name', '')} {party_data.get('last_name', '')}".strip()
        else:
            party.display_name = party_data.get("entity_name", "")
    
    # Mark link as used
    link.status = "used"
    link.submitted_at = datetime.utcnow()
    
    # Audit log
    audit = AuditLog(
        report_id=report.id,
        actor_type="party",
        action="party.submitted",
        details={
            "party_id": str(party.id),
            "party_role": party.party_role,
            "display_name": party.display_name,
        },
        ip_address=get_client_ip(request),
    )
    db.add(audit)
    db.commit()
    
    return PartySubmitResponse(
        party_id=party.id,
        status="submitted",
        submitted_at=link.submitted_at,
        message="Thank you! Your information has been submitted successfully.",
    )
