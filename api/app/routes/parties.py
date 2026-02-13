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


def _send_party_submitted_notifications(
    db: Session,
    report: Report,
    party: ReportParty,
    all_complete: bool,
):
    """
    Send notifications when a party submits their portal form.
    
    Notifies: Escrow officer (initiator), Company Admin, Staff
    Uses the report's notification_config to determine what to send.
    """
    from app.config import get_settings
    from app.services.email_service import FRONTEND_URL
    from app.models import User
    
    settings = get_settings()
    config = report.notification_config or {}
    property_address = report.property_address_text or "Property"
    party_name = party.display_name or "Party"
    party_role = party.party_role or "unknown"
    
    # Get role display
    role_display = "Buyer" if party_role == "transferee" else "Seller"
    
    # All party-submitted notifications are officer/staff-facing → use FinClear branding (no R2 logo needed)
    
    # 1. Notify the escrow officer who initiated the report
    if config.get("notify_initiator", True) and report.initiated_by_user_id:
        initiator = db.query(User).filter(User.id == report.initiated_by_user_id).first()
        if initiator and initiator.email:
            try:
                send_party_submitted_notification(
                    staff_email=initiator.email,
                    party_name=party_name,
                    party_role=party_role,
                    property_address=property_address,
                    report_id=str(report.id),
                    all_complete=all_complete,
                )
                logger.info(f"[PARTY_NOTIFY] Sent to initiator: {initiator.email}")
            except Exception as e:
                logger.warning(f"[PARTY_NOTIFY] Failed to notify initiator: {e}")
    
    # 2. Notify company admin (if different from initiator)
    if config.get("notify_company_admin", True) and report.company_id:
        company_admin = db.query(User).filter(
            User.company_id == report.company_id,
            User.role == "client_admin",
            User.status == "active",
        ).first()
        
        if company_admin and company_admin.email:
            # Don't double-notify if admin is the initiator
            if not report.initiated_by_user_id or company_admin.id != report.initiated_by_user_id:
                try:
                    send_party_submitted_notification(
                        staff_email=company_admin.email,
                        party_name=party_name,
                        party_role=party_role,
                        property_address=property_address,
                        report_id=str(report.id),
                        all_complete=all_complete,
                    )
                    logger.info(f"[PARTY_NOTIFY] Sent to company admin: {company_admin.email}")
                except Exception as e:
                    logger.warning(f"[PARTY_NOTIFY] Failed to notify company admin: {e}")
    
    # 3. Notify staff (always notify on "all complete")
    if config.get("notify_staff", True) and settings.STAFF_NOTIFICATION_EMAIL:
        # Only notify staff on individual submissions if explicitly configured
        should_notify_staff = all_complete or config.get("notify_on_party_submit", False)
        
        if should_notify_staff:
            try:
                send_party_submitted_notification(
                    staff_email=settings.STAFF_NOTIFICATION_EMAIL,
                    party_name=party_name,
                    party_role=party_role,
                    property_address=property_address,
                    report_id=str(report.id),
                    all_complete=all_complete,
                )
                logger.info(f"[PARTY_NOTIFY] Sent to staff: {settings.STAFF_NOTIFICATION_EMAIL}")
            except Exception as e:
                logger.warning(f"[PARTY_NOTIFY] Failed to notify staff: {e}")
    
    # 4. Log notification event (for audit trail)
    log_notification(
        db,
        type="party_submitted",
        report_id=report.id,
        party_id=party.id,
        subject=f"Party Submitted: {party_name} ({role_display})" if not all_complete 
                else f"All Parties Complete: {property_address}",
        body_preview=f"{party_name} has submitted their information for {property_address}.",
        meta={
            "party_name": party_name,
            "party_role": party_role,
            "all_complete": all_complete,
            "notified_initiator": bool(report.initiated_by_user_id),
            "notified_company_admin": bool(report.company_id),
            "notified_staff": bool(settings.STAFF_NOTIFICATION_EMAIL),
        },
    )


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
    
    # Company branding
    company = report.company if report.company_id else None
    company_name = company.name if company else "FinClear Solutions"
    contact_email = company.billing_email if company else "clear@fincenclear.com"
    
    # Generate pre-signed R2 URL for company logo (FIX 4)
    company_logo = None
    if company and company.logo_url:
        try:
            from app.services.storage import storage_service as r2_storage
            company_logo = r2_storage.generate_download_url(
                key=company.logo_url,
                expires_in=604800,  # 7 days
            )
        except Exception as e:
            logger.warning(f"[PARTY_PORTAL] Could not generate logo URL: {e}")
    
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
        company_name=company_name,
        company_logo=company_logo,
        contact_email=contact_email,
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
    # CHECK IF ALL PARTIES SUBMITTED
    # ═══════════════════════════════════════════════════════════════════════════
    all_parties = db.query(ReportParty).filter(
        ReportParty.report_id == report.id
    ).all()
    
    all_submitted = all(p.status in ("submitted", "verified") for p in all_parties)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # SEND PARTY SUBMISSION NOTIFICATIONS (Client-Driven Flow)
    # ═══════════════════════════════════════════════════════════════════════════
    try:
        _send_party_submitted_notifications(
            db=db,
            report=report,
            party=party,
            all_complete=all_submitted,
        )
    except Exception as e:
        logger.warning(f"[PARTY_SUBMIT] Notification error (non-fatal): {e}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # AUTO-TRANSITION TO ready_to_file IF ALL PARTIES SUBMITTED
    # ═══════════════════════════════════════════════════════════════════════════
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
    
    db.commit()
    
    # ═══════════════════════════════════════════════════════════════════════════
    # AUTO-FILE IF ALL PARTIES COMPLETE (Client-Driven Flow)
    # ═══════════════════════════════════════════════════════════════════════════
    if all_submitted and len(all_parties) > 0 and report.status == "ready_to_file":
        # Import here to avoid circular imports
        from app.services.filing_lifecycle import trigger_auto_file
        from app.config import get_settings
        settings = get_settings()
        
        # Only auto-file if enabled at both global and report level
        if settings.AUTO_FILE_ENABLED and report.auto_file_enabled:
            logger.info(f"[PARTY_SUBMIT] Triggering auto-file for report {report.id}")
            try:
                import asyncio
                # Run auto-file in background
                asyncio.create_task(trigger_auto_file(
                    db=db,
                    report=report,
                    ip_address="party-submission-auto-file",
                ))
            except RuntimeError:
                # No event loop - try synchronous
                try:
                    asyncio.run(trigger_auto_file(
                        db=db,
                        report=report,
                        ip_address="party-submission-auto-file",
                    ))
                except Exception as e:
                    logger.warning(f"[PARTY_SUBMIT] Auto-file failed: {e}")
    
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
        PartyLink.report_party_id == party.id
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
        
        # FIX 6: Actually send the invitation email
        party_email = (party.party_data or {}).get("email")
        if party_email:
            try:
                _send_resend_invite_email(
                    db=db,
                    report=report,
                    party=party,
                    party_email=party_email,
                    link_url=link_url,
                    token=existing_link.token,
                    notification_type="party_invite_resend",
                )
            except Exception as e:
                logger.warning(f"[RESEND_LINK] Email send failed (non-fatal): {e}")
        
        logger.info(f"[RESEND_LINK] Reusing existing link for party {party_id}")
        
        return ResendLinkResponse(
            party_id=str(party.id),
            existing_token=existing_link.token,
            link_url=link_url,
            expires_at=existing_link.expires_at,
            message="Existing link resent via email.",
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
    
    # FIX 6: Actually send the invitation email with the new link
    party_email = (party.party_data or {}).get("email")
    if party_email:
        try:
            _send_resend_invite_email(
                db=db,
                report=report,
                party=party,
                party_email=party_email,
                link_url=link_url,
                token=new_token,
                notification_type="party_invite",
            )
        except Exception as e:
            logger.warning(f"[RESEND_LINK] Email send failed (non-fatal): {e}")
    
    return ResendLinkResponse(
        party_id=str(party.id),
        new_token=new_token,
        link_url=link_url,
        expires_at=expires_at,
        message="New link generated and emailed. Old link revoked." + 
                (" Party can resubmit." if request_body.allow_resubmission else ""),
    )


class CorrectionRequest(BaseModel):
    message: str


class CorrectionResponse(BaseModel):
    status: str
    message: str


@router.post("/parties/{party_id}/request-corrections", response_model=CorrectionResponse)
def request_corrections(
    party_id: str,
    data: CorrectionRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Request corrections from a party who already submitted.
    Staff/admin use only — resets party status so they can edit and resubmit.
    """
    from uuid import UUID
    
    try:
        pid = UUID(party_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid party ID")
    
    party = db.query(ReportParty).filter(ReportParty.id == pid).first()
    if not party:
        raise HTTPException(status_code=404, detail="Party not found")
    
    if party.status not in ("submitted", "verified"):
        raise HTTPException(
            status_code=400, 
            detail=f"Can only request corrections for submitted/verified parties (current: {party.status})"
        )
    
    now = datetime.utcnow()
    
    # Update party status to corrections_requested
    party.status = "corrections_requested"
    party.updated_at = now
    
    # Store correction info in party_data
    party_data = party.party_data or {}
    party_data["correction_requested_at"] = now.isoformat()
    party_data["correction_message"] = data.message
    party.party_data = party_data
    
    # Ensure there's an active portal link
    existing_link = db.query(PartyLink).filter(
        PartyLink.report_party_id == pid,
        PartyLink.status == "active",
        PartyLink.expires_at > now,
    ).first()
    
    link_url = None
    if existing_link:
        link_url = f"{_get_portal_base_url()}/p/{existing_link.token}"
    else:
        # Generate new link
        new_token = secrets.token_urlsafe(32)
        expires_at = now + timedelta(days=7)
        new_link = PartyLink(
            report_party_id=pid,
            token=new_token,
            status="active",
            created_at=now,
            expires_at=expires_at,
        )
        db.add(new_link)
        link_url = f"{_get_portal_base_url()}/p/{new_token}"
    
    # Audit log
    report = db.query(Report).filter(Report.id == party.report_id).first()
    audit = AuditLog(
        report_id=party.report_id,
        actor_type="staff",
        action="party.corrections_requested",
        details={
            "party_id": str(pid),
            "message": data.message,
        },
        ip_address=get_client_ip(request),
    )
    db.add(audit)
    
    db.commit()
    
    # TODO: In production, send correction request email with link_url
    logger.info(f"[CORRECTIONS] Requested for party {party_id}: {data.message}")
    
    return CorrectionResponse(
        status="corrections_requested",
        message="Correction request sent. Party can now edit and resubmit.",
    )


class ClientResendResponse(BaseModel):
    message: str
    sent_to: str
    link_url: str


@router.post("/reports/{report_id}/parties/{party_id}/resend-link", response_model=ClientResendResponse)
def client_resend_party_link(
    report_id: str,
    party_id: str,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Resend a party portal link. Accessible by clients (for their own reports)
    and staff. No authentication required in demo mode — in production,
    validate the caller owns this report.
    """
    from uuid import UUID
    
    # Find the report
    try:
        rid = UUID(report_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid report ID")
    
    report = db.query(Report).filter(Report.id == rid).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Find the party on this report
    try:
        pid = UUID(party_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid party ID")
    
    party = db.query(ReportParty).filter(
        ReportParty.id == pid,
        ReportParty.report_id == rid,
    ).first()
    if not party:
        raise HTTPException(status_code=404, detail="Party not found on this report")
    
    party_email = None
    if party.party_data and isinstance(party.party_data, dict):
        party_email = party.party_data.get("email")
    if not party_email:
        raise HTTPException(status_code=400, detail="Party has no email address on file")
    
    now = datetime.utcnow()
    
    # Check for existing active link
    existing_link = db.query(PartyLink).filter(
        PartyLink.report_party_id == pid,
        PartyLink.status == "active",
        PartyLink.expires_at > now,
    ).first()
    
    if existing_link:
        link_url = f"{_get_portal_base_url()}/p/{existing_link.token}"
        
        # FIX 6: Actually send the invitation email
        try:
            _send_resend_invite_email(
                db=db,
                report=report,
                party=party,
                party_email=party_email,
                link_url=link_url,
                token=existing_link.token,
                notification_type="party_invite_resend",
            )
        except Exception as e:
            logger.warning(f"[RESEND_LINK] Email send failed (non-fatal): {e}")
        
        return ClientResendResponse(
            message="Portal link resent successfully",
            sent_to=party_email,
            link_url=link_url,
        )
    
    # No active link — generate a new one
    new_token = secrets.token_urlsafe(32)
    expires_at = now + timedelta(days=7)
    
    new_link = PartyLink(
        report_party_id=pid,
        token=new_token,
        status="active",
        created_at=now,
        expires_at=expires_at,
    )
    db.add(new_link)
    
    # Audit log
    audit = AuditLog(
        report_id=rid,
        actor_type="client",
        action="party_link.resent",
        details={
            "party_id": str(pid),
            "party_email": party_email,
        },
        ip_address=get_client_ip(request),
    )
    db.add(audit)
    
    db.commit()
    
    link_url = f"{_get_portal_base_url()}/p/{new_token}"
    
    # FIX 6: Actually send the invitation email with the new link
    try:
        _send_resend_invite_email(
            db=db,
            report=report,
            party=party,
            party_email=party_email,
            link_url=link_url,
            token=new_token,
            notification_type="party_invite",
        )
    except Exception as e:
        logger.warning(f"[RESEND_LINK] Email send failed (non-fatal): {e}")
    
    return ClientResendResponse(
        message="New portal link generated and sent",
        sent_to=party_email,
        link_url=link_url,
    )


def _send_resend_invite_email(
    db: Session,
    report: Report,
    party: ReportParty,
    party_email: str,
    link_url: str,
    token: str,
    notification_type: str = "party_invite_resend",
):
    """
    Send (or re-send) a party invitation email.
    
    Shared helper for both staff and client resend endpoints.
    Fetches company branding and calls the standard invite notification flow.
    """
    from app.services.notifications import send_party_invite_notification
    from app.services.email_service import FRONTEND_URL
    
    # Fetch company branding
    company_name_for_email = "FinClear Solutions"
    company_logo_url_for_email = None
    if report.company_id:
        try:
            from app.models.company import Company as CompanyModel
            from app.services.storage import storage_service as r2_storage
            report_company = db.query(CompanyModel).filter(CompanyModel.id == report.company_id).first()
            if report_company:
                company_name_for_email = report_company.name
                if report_company.logo_url:
                    company_logo_url_for_email = r2_storage.generate_download_url(
                        key=report_company.logo_url,
                        expires_in=604800,  # 7 days
                    )
        except Exception as e:
            logger.warning(f"[RESEND_LINK] Could not generate logo URL: {e}")
    
    property_address = report.property_address_text or "Property"
    
    send_party_invite_notification(
        db=db,
        report_id=report.id,
        party_id=party.id,
        party_token=token,
        to_email=party_email,
        party_name=party.display_name or "",
        party_role=party.party_role or "party",
        property_address=property_address,
        portal_link=link_url,
        company_name=company_name_for_email,
        company_logo_url=company_logo_url_for_email,
    )
    
    logger.info(f"[RESEND_LINK] Email sent to {party_email} for party {party.id}")


def _get_portal_base_url() -> str:
    """Get the base URL for the portal. Configure via env in production."""
    import os
    return os.getenv("PORTAL_BASE_URL", "https://fincenclear.com")
