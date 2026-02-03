"""
Party API routes (public-facing for token-based access).
"""
import logging
from datetime import datetime, timedelta
from typing import Optional
import secrets

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import PartyLink, ReportParty, AuditLog, Report
from app.schemas.party import PartyResponse, PartySave, PartySubmitResponse, ReportSummary
from app.services.notifications import log_notification, send_party_confirmation_notification
from app.services.audit import log_event, ENTITY_PARTY_LINK, EVENT_PARTY_LINK_OPENED
from app.services.party_data_sync import sync_party_data_to_wizard
from app.services.email_service import send_party_submitted_notification

logger = logging.getLogger(__name__)

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
    
    # GAP 5 Fix: Track when party first opens their link
    if link.opened_at is None:
        link.opened_at = datetime.utcnow()
        
        # Audit log
        log_event(
            db=db,
            entity_type=ENTITY_PARTY_LINK,
            entity_id=str(link.id),
            event_type=EVENT_PARTY_LINK_OPENED,
            details={
                "party_id": str(party.id),
                "party_role": party.party_role,
                "report_id": str(report.id) if report else None,
            },
            actor_type="party",
            report_id=str(report.id) if report else None,
        )
        
        db.commit()
    
    # Extract purchase price from wizard_data if available
    purchase_price = None
    if report.wizard_data and isinstance(report.wizard_data, dict):
        collection = report.wizard_data.get("collection", {})
        if collection:
            purchase_price = collection.get("purchasePrice")
    
    # Build report summary for context
    report_summary = ReportSummary(
        property_address=report.property_address_text,
        closing_date=report.closing_date.isoformat() if report.closing_date else None,
        purchase_price=purchase_price,
        title_company="FinClear Solutions",
    )
    
    # Get email from party_data if stored there
    party_data = party.party_data or {}
    email = party_data.get("email")
    
    return PartyResponse(
        party_id=party.id,
        party_role=party.party_role,
        entity_type=party.entity_type,
        display_name=party.display_name,
        email=email,
        party_data=party_data,
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
    # Use a new dict to ensure SQLAlchemy detects the change
    existing_data = dict(party.party_data or {})
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
    
    # Generate stable confirmation ID
    submitted_at = link.submitted_at
    confirmation_id = f"PCT-{submitted_at.strftime('%Y')}-{str(party.id)[-5:].upper()}"
    
    # Audit log
    audit = AuditLog(
        report_id=report.id,
        actor_type="party",
        action="party.submitted",
        details={
            "party_id": str(party.id),
            "party_role": party.party_role,
            "display_name": party.display_name,
            "confirmation_id": confirmation_id,
        },
        ip_address=get_client_ip(request),
    )
    db.add(audit)
    
    # Send confirmation email if email available
    property_address = report.property_address_text or "Property"
    party_email = party_data.get("email")
    
    if party_email:
        # Log and send confirmation email
        send_party_confirmation_notification(
            db=db,
            report_id=report.id,
            party_id=party.id,
            to_email=party_email,
            party_name=party.display_name or "",
            confirmation_id=confirmation_id,
            property_address=property_address,
        )
    else:
        # Log notification event without sending (no email)
        log_notification(
            db,
            type="party_submitted",
            report_id=report.id,
            party_id=party.id,
            party_token=token,
            to_email=None,
            subject="Thank you — your information has been received",
            body_preview=f"Your information for {property_address} has been successfully submitted. Confirmation: {confirmation_id}",
            meta={
                "confirmation_id": confirmation_id,
                "submitted_at": submitted_at.isoformat(),
                "party_role": party.party_role,
                "display_name": party.display_name,
            },
        )
    
    db.flush()  # Flush to ensure party.status is saved before sync
    
    # ═══════════════════════════════════════════════════════════════════════════
    # SYNC PORTAL DATA TO wizard_data FOR RERX BUILDER (Shark #57)
    # ═══════════════════════════════════════════════════════════════════════════
    try:
        sync_result = sync_party_data_to_wizard(db, str(report.id))
        logger.info(f"[PARTY_SUBMIT] Portal data synced: {sync_result}")
        
        # Store sync result in audit log
        audit_sync = AuditLog(
            report_id=report.id,
            actor_type="system",
            action="party.data_synced",
            details={
                "party_id": str(party.id),
                "sync_result": sync_result,
            },
        )
        db.add(audit_sync)
    except Exception as e:
        logger.exception(f"[PARTY_SUBMIT] Sync failed for report {report.id}: {e}")
        # Don't fail the submission if sync fails — log and continue
    
    # ═══════════════════════════════════════════════════════════════════════════
    # AUTO-TRANSITION TO ready_to_file IF ALL PARTIES SUBMITTED
    # ═══════════════════════════════════════════════════════════════════════════
    all_parties = db.query(ReportParty).filter(
        ReportParty.report_id == report.id
    ).all()
    
    all_submitted = all(p.status in ("submitted", "verified") for p in all_parties)
    
    if all_submitted and len(all_parties) > 0:
        if report.status == "collecting":
            report.status = "ready_to_file"
            report.updated_at = datetime.utcnow()
            logger.info(f"[PARTY_SUBMIT] All {len(all_parties)} parties submitted. "
                        f"Report {report.id} → ready_to_file")
            
            # Audit log the status change
            audit_status = AuditLog(
                report_id=report.id,
                actor_type="system",
                action="report.status_changed",
                details={
                    "old_status": "collecting",
                    "new_status": "ready_to_file",
                    "reason": "all_parties_submitted",
                    "party_count": len(all_parties),
                },
            )
            db.add(audit_status)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # NOTIFY STAFF OF PARTY SUBMISSION
    # ═══════════════════════════════════════════════════════════════════════════
    # Note: In production, we would look up the assigned staff member
    # For now, we skip the notification if no staff email is available
    # TODO: Add report.assigned_to or fetch staff email from settings
    try:
        # Only send "all complete" notifications for now (most important)
        if all_submitted and len(all_parties) > 0:
            # Placeholder: In production, get assigned staff email or use a queue email
            # staff_email = report.assigned_to.email if report.assigned_to else None
            # For now, log the intent but don't send (no staff email configured)
            logger.info(f"[PARTY_SUBMIT] Would send 'all parties complete' notification for report {report.id}")
    except Exception as e:
        logger.warning(f"[PARTY_SUBMIT] Staff notification failed: {e}")
    
    db.commit()
    
    return PartySubmitResponse(
        party_id=party.id,
        status="submitted",
        submitted_at=submitted_at,
        confirmation_id=confirmation_id,
        message="Thank you! Your information has been submitted successfully.",
    )


# ═══════════════════════════════════════════════════════════════════════════════
# STAFF ENDPOINTS (require authentication in production)
# ═══════════════════════════════════════════════════════════════════════════════


class ResendLinkRequest(BaseModel):
    allow_resubmission: bool = False  # If true, reset party status to allow resubmission


class ResendLinkResponse(BaseModel):
    party_id: str
    new_token: Optional[str] = None
    existing_token: Optional[str] = None
    link_url: str
    expires_at: datetime
    message: str


@router.post("/staff/resend-link/{party_id}", response_model=ResendLinkResponse)
def resend_party_link(
    party_id: str,
    request_body: ResendLinkRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Resend or regenerate a party portal link.
    
    - If existing link is still active and not expired: resend same link
    - If expired or used: generate new token, revoke old link
    - If allow_resubmission=True: reset party status to allow resubmission
    
    Note: In production, this should require staff/admin authentication.
    """
    # Find the party
    party = db.query(ReportParty).filter(ReportParty.id == party_id).first()
    if not party:
        raise HTTPException(status_code=404, detail="Party not found")
    
    # Find existing link
    existing_link = db.query(PartyLink).filter(
        PartyLink.party_id == party.id
    ).order_by(PartyLink.created_at.desc()).first()
    
    report = party.report
    now = datetime.utcnow()
    
    # Determine if we can reuse existing link
    can_reuse = (
        existing_link and
        existing_link.status == "active" and
        existing_link.expires_at > now
    )
    
    if can_reuse and not request_body.allow_resubmission:
        # Resend existing link
        link_url = f"{_get_portal_base_url()}/p/{existing_link.token}"
        
        logger.info(f"[RESEND_LINK] Reusing existing link for party {party_id}")
        
        return ResendLinkResponse(
            party_id=str(party.id),
            existing_token=existing_link.token,
            link_url=link_url,
            expires_at=existing_link.expires_at,
            message="Existing link is still valid. Email can be resent.",
        )
    
    # Generate new link
    if existing_link:
        existing_link.status = "revoked"
        logger.info(f"[RESEND_LINK] Revoked old link for party {party_id}")
    
    # Create new token
    new_token = secrets.token_urlsafe(32)
    expires_at = now + timedelta(days=7)  # 7 day expiration
    
    new_link = PartyLink(
        party_id=party.id,
        token=new_token,
        status="active",
        expires_at=expires_at,
    )
    db.add(new_link)
    
    # Reset party status if requested
    if request_body.allow_resubmission:
        if party.status == "submitted":
            party.status = "link_sent"
            party.updated_at = now
            logger.info(f"[RESEND_LINK] Reset party {party_id} status to link_sent")
    
    # Audit log
    audit = AuditLog(
        report_id=report.id if report else None,
        actor_type="staff",
        action="party_link.resent",
        details={
            "party_id": str(party.id),
            "old_link_revoked": existing_link is not None,
            "allow_resubmission": request_body.allow_resubmission,
            "new_token_prefix": new_token[:8] + "...",
        },
        ip_address=get_client_ip(request),
    )
    db.add(audit)
    
    db.commit()
    
    link_url = f"{_get_portal_base_url()}/p/{new_token}"
    
    return ResendLinkResponse(
        party_id=str(party.id),
        new_token=new_token,
        link_url=link_url,
        expires_at=expires_at,
        message="New link generated. Old link revoked." + 
                (" Party can resubmit." if request_body.allow_resubmission else ""),
    )


def _get_portal_base_url() -> str:
    """Get the base URL for the portal. Configure via env in production."""
    import os
    return os.getenv("PORTAL_BASE_URL", "https://fincenclear.com")
