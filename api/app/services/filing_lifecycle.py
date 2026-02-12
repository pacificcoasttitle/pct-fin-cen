"""
Filing lifecycle service - manages submission states and demo outcomes.

Supports both mock filing (staging/test) and live SDTM filing (production).
Includes auto-file capability and notification dispatch for client-driven flow.
"""
import hashlib
import logging
from datetime import datetime, timedelta
from typing import Optional, Tuple, List
from uuid import UUID

from sqlalchemy.orm import Session

from app.models import Report, FilingSubmission, AuditLog, User
from app.config import get_settings
from app.services.notifications import log_notification

logger = logging.getLogger(__name__)
settings = get_settings()


# ═══════════════════════════════════════════════════════════════════════════════
# NOTIFICATION DISPATCH HELPERS
# ═══════════════════════════════════════════════════════════════════════════════

def _get_property_address(report: Report) -> str:
    """Get property address from report, with fallback."""
    return report.property_address_text or "Property Address Unavailable"


def _get_company_admin(db: Session, company_id: Optional[UUID]) -> Optional[User]:
    """Get the company admin user."""
    if not company_id:
        return None
    return db.query(User).filter(
        User.company_id == company_id,
        User.role == "client_admin",
        User.status == "active"
    ).first()


async def send_filing_notifications(
    db: Session,
    report: Report,
    status: str,
    receipt_id: Optional[str] = None,
    rejection_code: Optional[str] = None,
    rejection_message: Optional[str] = None,
    reason: Optional[str] = None,
):
    """
    Send filing status notifications to all stakeholders.
    
    Args:
        db: Database session
        report: Report that was filed
        status: Filing status (submitted, accepted, rejected, needs_review)
        receipt_id: BSA ID for accepted filings
        rejection_code: Error code for rejected filings
        rejection_message: Error message for rejected filings
        reason: Reason for needs_review status
    """
    from app.services.email_service import (
        send_filing_submitted_notification,
        send_filing_accepted_notification,
        send_filing_rejected_notification,
        send_filing_needs_review_notification,
        send_party_submitted_notification,
        FRONTEND_URL,
    )
    
    config = report.notification_config or {}
    property_address = _get_property_address(report)
    
    # Build report URL
    report_url = f"{FRONTEND_URL}/app/reports/{report.id}"
    admin_report_url = f"{FRONTEND_URL}/app/admin/reports/{report.id}"
    
    # All filing notifications are officer/staff-facing → use FinClear branding (no R2 logo needed)
    try:
        if status == "submitted":
            # Notify initiator
            if config.get("notify_initiator", True) and report.initiated_by:
                send_filing_submitted_notification(
                    to_email=report.initiated_by.email,
                    recipient_name=report.initiated_by.name,
                    property_address=property_address,
                    report_url=report_url,
                )
            
            # Log notification
            log_notification(
                db, "filing_submitted",
                report_id=report.id,
                subject=f"Filing Submitted: {property_address}",
                body_preview="Your FinCEN filing has been submitted and is awaiting processing.",
                meta={"status": "submitted"}
            )
        
        elif status == "accepted":
            filed_at_str = report.filed_at.strftime('%B %d, %Y') if report.filed_at else 'N/A'
            
            # Notify initiator
            if config.get("notify_on_filing_complete", True) and report.initiated_by:
                send_filing_accepted_notification(
                    to_email=report.initiated_by.email,
                    recipient_name=report.initiated_by.name,
                    property_address=property_address,
                    bsa_id=receipt_id or "N/A",
                    filed_at_str=filed_at_str,
                    report_url=report_url,
                )
            
            # Notify company admin if different from initiator
            if config.get("notify_company_admin", True):
                company_admin = _get_company_admin(db, report.company_id)
                if company_admin and (not report.initiated_by_user_id or company_admin.id != report.initiated_by_user_id):
                    send_filing_accepted_notification(
                        to_email=company_admin.email,
                        recipient_name=company_admin.name,
                        property_address=property_address,
                        bsa_id=receipt_id or "N/A",
                        filed_at_str=filed_at_str,
                        report_url=report_url,
                    )
            
            # Notify staff
            if config.get("notify_staff", True) and settings.STAFF_NOTIFICATION_EMAIL:
                send_filing_accepted_notification(
                    to_email=settings.STAFF_NOTIFICATION_EMAIL,
                    recipient_name="Staff",
                    property_address=property_address,
                    bsa_id=receipt_id or "N/A",
                    filed_at_str=filed_at_str,
                    report_url=admin_report_url,
                )
        
        elif status == "rejected":
            # Notify initiator (urgent - they need to fix)
            if config.get("notify_on_filing_error", True) and report.initiated_by:
                send_filing_rejected_notification(
                    to_email=report.initiated_by.email,
                    recipient_name=report.initiated_by.name,
                    property_address=property_address,
                    rejection_code=rejection_code or "UNKNOWN",
                    rejection_message=rejection_message or "Filing was rejected",
                    report_url=report_url,
                )
            
            # Notify staff immediately
            if settings.STAFF_NOTIFICATION_EMAIL:
                send_filing_rejected_notification(
                    to_email=settings.STAFF_NOTIFICATION_EMAIL,
                    recipient_name="Staff",
                    property_address=property_address,
                    rejection_code=rejection_code or "UNKNOWN",
                    rejection_message=rejection_message or "Filing was rejected",
                    report_url=admin_report_url,
                )
            
            # Notify admin
            if settings.ADMIN_NOTIFICATION_EMAIL:
                send_filing_rejected_notification(
                    to_email=settings.ADMIN_NOTIFICATION_EMAIL,
                    recipient_name="Admin",
                    property_address=property_address,
                    rejection_code=rejection_code or "UNKNOWN",
                    rejection_message=rejection_message or "Filing was rejected",
                    report_url=admin_report_url,
                )
        
        elif status == "needs_review":
            # Notify initiator
            if report.initiated_by:
                send_filing_needs_review_notification(
                    to_email=report.initiated_by.email,
                    recipient_name=report.initiated_by.name,
                    property_address=property_address,
                    reason=reason or "Manual review required",
                    report_url=report_url,
                )
            
            # Notify staff
            if settings.STAFF_NOTIFICATION_EMAIL:
                send_filing_needs_review_notification(
                    to_email=settings.STAFF_NOTIFICATION_EMAIL,
                    recipient_name="Staff",
                    property_address=property_address,
                    reason=reason or "Manual review required",
                    report_url=admin_report_url,
                )
    
    except Exception as e:
        logger.error(f"Failed to send filing notification for report {report.id}: {e}")
        # Don't fail the filing if notifications fail

# Poll backoff schedule (in minutes)
POLL_BACKOFF_MINUTES = [15, 60, 180, 360, 720, 720, 720]  # 15m, 1h, 3h, 6h, then every 12h


def generate_receipt_id(report_id: UUID) -> str:
    """Generate a deterministic receipt ID for demo filing."""
    hash_input = str(report_id).encode()
    short_hash = hashlib.sha256(hash_input).hexdigest()[:8].upper()
    return f"RER-DEMO-{short_hash}"


def get_or_create_submission(db: Session, report_id: UUID) -> FilingSubmission:
    """
    Get existing submission or create a new one for the report.
    """
    submission = db.query(FilingSubmission).filter(
        FilingSubmission.report_id == report_id
    ).first()
    
    if not submission:
        submission = FilingSubmission(
            report_id=report_id,
            environment=settings.ENVIRONMENT,
            status="not_started",
            attempts=0,
        )
        db.add(submission)
        db.flush()
    
    return submission


def enqueue_submission(
    db: Session,
    report_id: UUID,
    payload_snapshot: Optional[dict] = None,
    ip_address: Optional[str] = None,
) -> FilingSubmission:
    """
    Queue a submission for filing.
    """
    submission = get_or_create_submission(db, report_id)
    
    submission.status = "queued"
    submission.attempts += 1
    submission.updated_at = datetime.utcnow()
    submission.payload_snapshot = payload_snapshot
    
    # Clear any previous rejection info
    submission.rejection_code = None
    submission.rejection_message = None
    
    # Audit log
    audit = AuditLog(
        report_id=report_id,
        actor_type="api",
        action="filing_queued",
        details={
            "attempt": submission.attempts,
            "environment": submission.environment,
        },
        ip_address=ip_address,
    )
    db.add(audit)
    
    return submission


def perform_mock_submit(
    db: Session,
    report_id: UUID,
    ip_address: Optional[str] = None,
) -> Tuple[str, FilingSubmission]:
    """
    Perform mock submission and transition to final state based on demo outcome.
    
    Returns: (status, submission)
    - status: "accepted", "rejected", "needs_review"
    """
    submission = get_or_create_submission(db, report_id)
    report = db.query(Report).filter(Report.id == report_id).first()
    
    # Transition to submitted first
    submission.status = "submitted"
    submission.updated_at = datetime.utcnow()
    
    # Audit log for submitted
    audit_submitted = AuditLog(
        report_id=report_id,
        actor_type="api",
        action="filing_submitted",
        details={"attempt": submission.attempts},
        ip_address=ip_address,
    )
    db.add(audit_submitted)
    db.flush()
    
    # Determine outcome based on demo_outcome or default to accept
    outcome = submission.demo_outcome or "accept"
    
    if outcome == "reject":
        return mark_rejected(
            db,
            report_id,
            submission.demo_rejection_code or "DEMO_REJECTION",
            submission.demo_rejection_message or "Rejected for demo purposes",
            ip_address,
        )
    elif outcome == "needs_review":
        return mark_needs_review(db, report_id, ip_address)
    else:
        # Default: accept
        receipt_id = generate_receipt_id(report_id)
        return mark_accepted(db, report_id, receipt_id, ip_address)


def mark_accepted(
    db: Session,
    report_id: UUID,
    receipt_id: str,
    ip_address: Optional[str] = None,
    send_notifications: bool = True,
) -> Tuple[str, FilingSubmission]:
    """
    Mark submission as accepted with receipt.
    
    Args:
        send_notifications: If True, send email notifications to stakeholders
    """
    submission = get_or_create_submission(db, report_id)
    report = db.query(Report).filter(Report.id == report_id).first()
    
    filed_at = datetime.utcnow()
    
    submission.status = "accepted"
    submission.receipt_id = receipt_id
    submission.updated_at = filed_at
    
    # Update report
    if report:
        report.status = "filed"
        report.filing_status = "filed_mock"
        report.filed_at = filed_at
        report.receipt_id = receipt_id
        report.updated_at = filed_at
    
    # Audit log
    audit = AuditLog(
        report_id=report_id,
        actor_type="api",
        action="filing_accepted",
        details={
            "receipt_id": receipt_id,
            "attempt": submission.attempts,
        },
        ip_address=ip_address,
    )
    db.add(audit)
    
    # Log notification event
    property_address = report.property_address_text if report else "Property"
    log_notification(
        db,
        type="filing_receipt",
        report_id=report_id,
        subject=f"FinCEN Filing Accepted - {property_address}",
        body_preview=f"Your FinCEN filing has been accepted. Receipt ID: {receipt_id}",
        meta={
            "receipt_id": receipt_id,
            "filed_at": filed_at.isoformat(),
            "status": "accepted",
            "is_demo": True,
        },
    )
    
    # Send email notifications to stakeholders (async)
    if send_notifications and report:
        import asyncio
        try:
            # Run in background - don't block the filing response
            asyncio.create_task(send_filing_notifications(
                db=db,
                report=report,
                status="accepted",
                receipt_id=receipt_id,
            ))
        except RuntimeError:
            # No event loop running (synchronous context) - run directly
            try:
                asyncio.run(send_filing_notifications(
                    db=db,
                    report=report,
                    status="accepted",
                    receipt_id=receipt_id,
                ))
            except Exception as e:
                logger.warning(f"Could not send filing notifications: {e}")
    
    return "accepted", submission


def mark_rejected(
    db: Session,
    report_id: UUID,
    code: str,
    message: str,
    ip_address: Optional[str] = None,
    send_notifications: bool = True,
) -> Tuple[str, FilingSubmission]:
    """
    Mark submission as rejected with error details.
    
    Args:
        send_notifications: If True, send urgent email notifications to stakeholders
    """
    submission = get_or_create_submission(db, report_id)
    report = db.query(Report).filter(Report.id == report_id).first()
    
    submission.status = "rejected"
    submission.rejection_code = code
    submission.rejection_message = message
    submission.updated_at = datetime.utcnow()
    
    # Update report status
    if report:
        report.filing_status = "rejected"
        report.updated_at = datetime.utcnow()
    
    # Audit log
    audit = AuditLog(
        report_id=report_id,
        actor_type="api",
        action="filing_rejected",
        details={
            "rejection_code": code,
            "rejection_message": message,
            "attempt": submission.attempts,
        },
        ip_address=ip_address,
    )
    db.add(audit)
    
    # Log notification event
    property_address = report.property_address_text if report else "Property"
    log_notification(
        db,
        type="internal_alert",
        report_id=report_id,
        subject=f"FinCEN Filing Rejected - {property_address}",
        body_preview=f"Filing rejected: {code} - {message}",
        meta={
            "rejection_code": code,
            "rejection_message": message,
            "status": "rejected",
        },
    )
    
    # Send URGENT email notifications to stakeholders
    if send_notifications and report:
        import asyncio
        try:
            asyncio.create_task(send_filing_notifications(
                db=db,
                report=report,
                status="rejected",
                rejection_code=code,
                rejection_message=message,
            ))
        except RuntimeError:
            try:
                asyncio.run(send_filing_notifications(
                    db=db,
                    report=report,
                    status="rejected",
                    rejection_code=code,
                    rejection_message=message,
                ))
            except Exception as e:
                logger.warning(f"Could not send filing rejection notifications: {e}")
    
    return "rejected", submission


def mark_needs_review(
    db: Session,
    report_id: UUID,
    ip_address: Optional[str] = None,
) -> Tuple[str, FilingSubmission]:
    """
    Mark submission as needing review.
    """
    submission = get_or_create_submission(db, report_id)
    report = db.query(Report).filter(Report.id == report_id).first()
    
    submission.status = "needs_review"
    submission.updated_at = datetime.utcnow()
    
    # Update report status
    if report:
        report.filing_status = "needs_review"
        report.updated_at = datetime.utcnow()
    
    # Audit log
    audit = AuditLog(
        report_id=report_id,
        actor_type="api",
        action="filing_needs_review",
        details={"attempt": submission.attempts},
        ip_address=ip_address,
    )
    db.add(audit)
    
    return "needs_review", submission


def retry_submission(
    db: Session,
    report_id: UUID,
    ip_address: Optional[str] = None,
) -> Tuple[bool, str, Optional[FilingSubmission]]:
    """
    Retry a rejected or needs_review submission.
    
    Returns: (success, message, submission)
    """
    submission = db.query(FilingSubmission).filter(
        FilingSubmission.report_id == report_id
    ).first()
    
    if not submission:
        return False, "No submission found for this report", None
    
    if submission.status not in ("rejected", "needs_review"):
        return False, f"Cannot retry submission in '{submission.status}' status", None
    
    # Audit log
    audit = AuditLog(
        report_id=report_id,
        actor_type="api",
        action="filing_retry",
        details={
            "previous_status": submission.status,
            "attempt": submission.attempts + 1,
        },
        ip_address=ip_address,
    )
    db.add(audit)
    
    # Re-enqueue
    submission.status = "queued"
    submission.attempts += 1
    submission.updated_at = datetime.utcnow()
    submission.rejection_code = None
    submission.rejection_message = None
    
    return True, "Submission queued for retry", submission


# ═══════════════════════════════════════════════════════════════════════════════
# AUTO-FILE FUNCTIONS (Client-Driven Flow)
# ═══════════════════════════════════════════════════════════════════════════════

async def trigger_auto_file(
    db: Session,
    report: Report,
    ip_address: str = "auto-file",
) -> Tuple[str, Optional[FilingSubmission]]:
    """
    Automatically file a report to FinCEN when all parties have submitted.
    
    This is triggered when:
    1. All parties for a report have status="submitted"
    2. report.auto_file_enabled is True
    3. Global AUTO_FILE_ENABLED is True
    
    Returns: (status, submission)
    - status: "submitted", "accepted", "needs_review", "error"
    """
    from app.services.party_data_sync import sync_party_data_to_wizard
    
    # Check global setting
    if not settings.AUTO_FILE_ENABLED:
        logger.info(f"Auto-file disabled globally, skipping report {report.id}")
        return ("skipped", None)
    
    # Check report-level setting
    if not report.auto_file_enabled:
        logger.info(f"Auto-file disabled for report {report.id}")
        return ("skipped", None)
    
    logger.info(f"AUTO-FILE: Starting for report {report.id}")
    
    try:
        # 1. Final sync of party data (safety net)
        try:
            sync_result = sync_party_data_to_wizard(db, str(report.id))
            logger.info(f"AUTO-FILE: Party data sync result: {sync_result}")
        except Exception as e:
            logger.warning(f"AUTO-FILE: Party data sync failed (continuing): {e}")
        
        # 2. Update report status and auto_filed_at
        report.status = "ready_to_file"
        report.auto_filed_at = datetime.utcnow()
        db.commit()
        db.refresh(report)
        
        # 3. Run ready check
        from app.routes.reports import perform_ready_check
        try:
            ready_result = perform_ready_check(db, report)
            if not ready_result.get("is_ready", False):
                blocking_reasons = ready_result.get("blocking", [])
                reason = f"Auto-file blocked: {', '.join(blocking_reasons)}" if blocking_reasons else "Ready check failed"
                
                report.status = "needs_review"
                db.commit()
                
                await send_filing_notifications(
                    db=db,
                    report=report,
                    status="needs_review",
                    reason=reason,
                )
                
                logger.warning(f"AUTO-FILE: Ready check failed for report {report.id}: {reason}")
                return ("needs_review", None)
        except Exception as e:
            logger.warning(f"AUTO-FILE: Ready check error (continuing): {e}")
            # Continue anyway - let the filing attempt catch any issues
        
        # 4. Attempt filing
        logger.info(f"AUTO-FILE: Attempting filing for report {report.id}")
        
        if settings.ENVIRONMENT == "production" and settings.FINCEN_TRANSPORT == "sdtm":
            status, submission = perform_sdtm_submit(db, report.id, ip_address=ip_address)
        else:
            status, submission = perform_mock_submit(db, report.id, ip_address=ip_address)
        
        db.commit()
        
        logger.info(f"AUTO-FILE: Filing result for report {report.id}: {status}")
        
        # 5. Audit log for auto-file
        audit = AuditLog(
            report_id=report.id,
            actor_type="system",
            action="auto_file_triggered",
            details={
                "result_status": status,
                "receipt_id": submission.receipt_id if submission else None,
            },
            ip_address=ip_address,
        )
        db.add(audit)
        db.commit()
        
        return (status, submission)
        
    except Exception as e:
        logger.error(f"AUTO-FILE: Failed for report {report.id}: {e}")
        
        # Send error notification
        try:
            await send_filing_notifications(
                db=db,
                report=report,
                status="needs_review",
                reason=f"Auto-file error: {str(e)}",
            )
        except Exception as notif_error:
            logger.error(f"AUTO-FILE: Could not send error notification: {notif_error}")
        
        return ("error", None)


def set_demo_outcome(
    db: Session,
    report_id: UUID,
    outcome: str,
    rejection_code: Optional[str] = None,
    rejection_message: Optional[str] = None,
    ip_address: Optional[str] = None,
) -> FilingSubmission:
    """
    Set the demo outcome for a submission.
    Used by demo endpoint to control filing behavior.
    """
    submission = get_or_create_submission(db, report_id)
    
    submission.demo_outcome = outcome
    submission.demo_rejection_code = rejection_code
    submission.demo_rejection_message = rejection_message
    submission.updated_at = datetime.utcnow()
    
    # Audit log
    audit = AuditLog(
        report_id=report_id,
        actor_type="api",
        action="demo_outcome_set",
        details={
            "outcome": outcome,
            "rejection_code": rejection_code,
        },
        ip_address=ip_address,
    )
    db.add(audit)
    
    return submission


def get_filing_stats(db: Session) -> dict:
    """
    Get aggregate filing statistics.
    """
    from sqlalchemy import func
    
    total = db.query(func.count(FilingSubmission.id)).scalar() or 0
    
    status_counts = dict(
        db.query(FilingSubmission.status, func.count(FilingSubmission.id))
        .group_by(FilingSubmission.status)
        .all()
    )
    
    return {
        "total": total,
        "not_started": status_counts.get("not_started", 0),
        "queued": status_counts.get("queued", 0),
        "submitted": status_counts.get("submitted", 0),
        "accepted": status_counts.get("accepted", 0),
        "rejected": status_counts.get("rejected", 0),
        "needs_review": status_counts.get("needs_review", 0),
    }


def list_submissions(
    db: Session,
    status: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
) -> list:
    """
    List filing submissions with optional status filter.
    """
    query = db.query(FilingSubmission)
    
    if status:
        query = query.filter(FilingSubmission.status == status)
    
    query = query.order_by(FilingSubmission.updated_at.desc())
    query = query.offset(offset).limit(limit)
    
    return query.all()


# ═══════════════════════════════════════════════════════════════════════════════
# SDTM (Secure Direct Transfer Mode) Functions
# ═══════════════════════════════════════════════════════════════════════════════


def perform_sdtm_submit(
    db: Session,
    report_id: UUID,
    ip_address: Optional[str] = None,
) -> Tuple[str, FilingSubmission]:
    """
    Perform live SDTM submission to FinCEN.
    
    This function:
    1. Enforces idempotency (won't re-upload if already submitted/accepted)
    2. Builds FBARX XML from report data
    3. Uploads to SDTM via SFTP
    4. Updates submission status and stores artifacts
    
    Args:
        db: Database session
        report_id: Report UUID
        ip_address: Optional client IP for audit
        
    Returns:
        (status, submission) tuple
        
    Raises:
        PreflightError: If XML validation fails (handled gracefully)
    """
    from app.services.fincen import (
        build_rerx_xml,
        PreflightError,
        SdtmClient,
        gzip_b64_encode,
        sha256_hex,
        generate_rerx_filename,
    )
    
    submission = get_or_create_submission(db, report_id)
    report = db.query(Report).filter(Report.id == report_id).first()
    
    if not report:
        return mark_needs_review(db, report_id, ip_address, "Report not found")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # IDEMPOTENCY CHECKPOINT (A2 Hardening - EXPLICIT)
    # ═══════════════════════════════════════════════════════════════════════════
    # This guard MUST be explicit to prevent duplicate uploads:
    #
    # 1. If status == "accepted": Filing already complete, return immediately.
    #    DO NOT rebuild XML, DO NOT reupload.
    #
    # 2. If status in {"queued", "submitted"} AND xml artifact exists:
    #    Filing already in progress, return immediately.
    #    DO NOT rebuild XML, DO NOT reupload.
    #
    # This prevents duplicate FinCEN submissions which could cause:
    # - Duplicate BSA IDs
    # - Wasted quota
    # - Compliance issues
    # ═══════════════════════════════════════════════════════════════════════════
    
    # IDEMPOTENCY RULE 1: Already accepted = complete, skip entirely
    if submission.status == "accepted":
        logger.info(f"SDTM IDEMPOTENCY: Report {report_id} already accepted - returning immediately")
        return "accepted", submission
    
    # IDEMPOTENCY RULE 2: Already queued/submitted with XML = in progress, skip upload
    if submission.status in ("queued", "submitted"):
        snapshot = submission.payload_snapshot or {}
        if snapshot.get("artifacts", {}).get("xml"):
            logger.info(f"SDTM IDEMPOTENCY: Report {report_id} already submitted with XML - returning immediately")
            return "submitted", submission
        # Note: If status is queued/submitted but no XML, something failed mid-process
        # Allow retry in this case (continue to rebuild/upload)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # Increment attempt counter
    # ═══════════════════════════════════════════════════════════════════════════
    
    submission.attempts += 1
    submission.updated_at = datetime.utcnow()
    
    # Initialize payload_snapshot if needed
    if not submission.payload_snapshot:
        submission.payload_snapshot = {}
    
    snapshot = submission.payload_snapshot
    snapshot["transport"] = "sdtm"
    snapshot["fincen_env"] = settings.FINCEN_ENV
    snapshot["ip_address"] = ip_address
    snapshot["attempt"] = submission.attempts
    
    # ═══════════════════════════════════════════════════════════════════════════
    # PRE-FILING SAFETY NET: Sync party portal data to wizard_data (Shark #57)
    # ═══════════════════════════════════════════════════════════════════════════
    
    try:
        from app.services.party_data_sync import sync_party_data_to_wizard
        sync_result = sync_party_data_to_wizard(db, str(report_id))
        logger.info(f"SDTM: Pre-filing sync completed: {sync_result}")
        snapshot["party_sync"] = sync_result
        
        if sync_result.get("errors"):
            logger.warning(f"SDTM: Pre-filing sync warnings: {sync_result['errors']}")
        
        # Refresh report to pick up synced wizard_data
        db.refresh(report)
    except Exception as e:
        logger.warning(f"SDTM: Pre-filing sync failed (non-fatal): {e}")
        snapshot["party_sync_error"] = str(e)
        # Continue anyway — the wizard_data may already have the data
    
    # ═══════════════════════════════════════════════════════════════════════════
    # Build RERX XML (Real Estate Report per Dec 2025 FinCEN spec)
    # ═══════════════════════════════════════════════════════════════════════════
    
    try:
        xml_content, debug_summary = build_rerx_xml(report, submission, settings)
    except PreflightError as e:
        logger.warning(f"SDTM: Preflight failed for {report_id}: {e.message}")
        snapshot["preflight_errors"] = e.errors
        snapshot["debug_summary"] = {"error": e.message}
        submission.payload_snapshot = snapshot
        return mark_needs_review(
            db, report_id, ip_address,
            f"Preflight validation failed: {e.message}"
        )
    except Exception as e:
        logger.error(f"SDTM: XML build error for {report_id}: {e}")
        snapshot["build_error"] = str(e)
        submission.payload_snapshot = snapshot
        return mark_needs_review(
            db, report_id, ip_address,
            f"XML build error: {str(e)}"
        )
    
    # Store debug summary
    snapshot["debug_summary"] = debug_summary
    
    # ═══════════════════════════════════════════════════════════════════════════
    # Generate filename and store artifact
    # ═══════════════════════════════════════════════════════════════════════════
    
    timestamp = datetime.utcnow()
    # RERX filename: RERXST.<timestamp>.<SDTM_USERNAME>.xml per Dec 2025 spec
    filename = generate_rerx_filename(
        settings.SDTM_USERNAME,
        str(submission.id),
        timestamp
    )
    
    snapshot["filename"] = filename
    snapshot["generated_at"] = timestamp.isoformat()
    
    # Store compressed XML artifact
    xml_bytes = xml_content.encode("utf-8")
    if "artifacts" not in snapshot:
        snapshot["artifacts"] = {}
    
    snapshot["artifacts"]["xml"] = {
        "data": gzip_b64_encode(xml_content),
        "sha256": sha256_hex(xml_bytes),
        "size": len(xml_bytes),
        "filename": filename,
    }
    
    # ═══════════════════════════════════════════════════════════════════════════
    # Upload to SDTM
    # ═══════════════════════════════════════════════════════════════════════════
    
    try:
        client = SdtmClient.from_settings()
        with client:
            remote_path, uploaded_size = client.upload(filename, xml_content)
        
        snapshot["uploaded_at"] = datetime.utcnow().isoformat()
        snapshot["remote_path"] = remote_path
        snapshot["uploaded_size"] = uploaded_size
        
        logger.info(f"SDTM: Uploaded {filename} ({uploaded_size} bytes) for report {report_id}")
        
    except Exception as e:
        logger.error(f"SDTM: Upload failed for {report_id}: {e}")
        snapshot["upload_error"] = str(e)
        submission.payload_snapshot = snapshot
        return mark_needs_review(
            db, report_id, ip_address,
            f"SDTM upload failed: {str(e)}"
        )
    
    # ═══════════════════════════════════════════════════════════════════════════
    # Update submission status
    # ═══════════════════════════════════════════════════════════════════════════
    
    submission.status = "submitted"
    submission.updated_at = datetime.utcnow()
    
    # Set up poll schedule
    snapshot["poll_schedule"] = {
        "next_poll_at": (datetime.utcnow() + timedelta(minutes=15)).isoformat(),
        "poll_attempts": 0,
    }
    
    submission.payload_snapshot = snapshot
    
    # Audit log
    audit = AuditLog(
        report_id=report_id,
        actor_type="api",
        action="sdtm_submitted",
        details={
            "filename": filename,
            "attempt": submission.attempts,
            "fincen_env": settings.FINCEN_ENV,
        },
        ip_address=ip_address,
    )
    db.add(audit)
    
    logger.info(f"SDTM: Submission complete for report {report_id}, status=submitted")
    
    return "submitted", submission


def poll_sdtm_responses(
    db: Session,
    report_id: UUID,
) -> Tuple[str, Optional[dict]]:
    """
    Poll SDTM for response files (.MESSAGES.XML and .ACK).
    
    This function:
    1. Checks for .MESSAGES.XML (processing status)
    2. If accepted, checks for .ACK file (contains BSA ID)
    3. Updates submission status accordingly
    
    NOTE: FinCEN uses .ACK extension, NOT .ACKED (per Jan 2026 spec)
    
    Args:
        db: Database session
        report_id: Report UUID
        
    Returns:
        (status, result_dict) tuple
    """
    from app.services.fincen import (
        SdtmClient,
        parse_messages_xml,
        parse_acked_xml,
        gzip_b64_encode,
        sha256_hex,
    )
    from app.services.fincen.response_processor import (
        extract_filing_status_from_messages,
        extract_bsa_id_from_acked,
    )
    
    submission = db.query(FilingSubmission).filter(
        FilingSubmission.report_id == report_id
    ).first()
    
    if not submission:
        return "not_found", None
    
    if submission.status not in ("submitted", "queued"):
        return submission.status, None
    
    snapshot = submission.payload_snapshot or {}
    filename = snapshot.get("filename")
    
    if not filename:
        logger.warning(f"SDTM Poll: No filename in snapshot for {report_id}")
        return "error", {"error": "No filename in submission snapshot"}
    
    if "artifacts" not in snapshot:
        snapshot["artifacts"] = {}
    
    poll_schedule = snapshot.get("poll_schedule", {})
    poll_attempts = poll_schedule.get("poll_attempts", 0) + 1
    
    result = {
        "poll_attempt": poll_attempts,
        "messages_found": False,
        "acked_found": False,
    }
    
    try:
        client = SdtmClient.from_settings()
        with client:
            # ═══════════════════════════════════════════════════════════════════
            # Check for MESSAGES.XML
            # ═══════════════════════════════════════════════════════════════════
            
            messages_filename = f"{filename}.MESSAGES.XML"
            
            # Only download if not already stored
            if not snapshot["artifacts"].get("messages"):
                messages_content = client.download(messages_filename)
                
                if messages_content:
                    result["messages_found"] = True
                    
                    # Store artifact
                    messages_bytes = messages_content.encode("utf-8")
                    snapshot["artifacts"]["messages"] = {
                        "data": gzip_b64_encode(messages_content),
                        "sha256": sha256_hex(messages_bytes),
                        "size": len(messages_bytes),
                        "filename": messages_filename,
                        "downloaded_at": datetime.utcnow().isoformat(),
                    }
                    
                    # Parse and store normalized
                    messages_result = parse_messages_xml(messages_content)
                    snapshot["parsed_messages"] = extract_filing_status_from_messages(messages_result)
                    
                    logger.info(
                        f"SDTM Poll: Found {messages_filename}, status={messages_result.status}"
                    )
                    
                    # Handle rejection
                    if messages_result.is_rejected:
                        submission.payload_snapshot = snapshot
                        return mark_rejected(
                            db, report_id,
                            messages_result.primary_rejection_code or "FINCEN_REJECTED",
                            messages_result.primary_rejection_message or messages_result.error_summary,
                            None
                        )
                    
                    # Handle accepted_with_warnings - mark needs_review, don't accept yet
                    if messages_result.status == "accepted_with_warnings":
                        submission.payload_snapshot = snapshot
                        return mark_needs_review(
                            db, report_id, None,
                            f"Accepted with warnings: {len(messages_result.warnings)} warning(s)"
                        )
            else:
                result["messages_found"] = True
            
            # ═══════════════════════════════════════════════════════════════════
            # Check for .ACK file (only if MESSAGES.XML shows accepted)
            # NOTE: FinCEN uses .ACK extension, NOT .ACKED (per Jan 2026 spec)
            # ═══════════════════════════════════════════════════════════════════
            
            parsed_messages = snapshot.get("parsed_messages", {})
            if parsed_messages.get("is_accepted"):
                acked_filename = f"{filename}.ACK"  # CRITICAL: .ACK not .ACKED
                
                if not snapshot["artifacts"].get("acked"):
                    acked_content = client.download(acked_filename)
                    
                    if acked_content:
                        result["acked_found"] = True
                        
                        # Store artifact
                        acked_bytes = acked_content.encode("utf-8")
                        snapshot["artifacts"]["acked"] = {
                            "data": gzip_b64_encode(acked_content),
                            "sha256": sha256_hex(acked_bytes),
                            "size": len(acked_bytes),
                            "filename": acked_filename,
                            "downloaded_at": datetime.utcnow().isoformat(),
                        }
                        
                        # Parse and extract BSA ID
                        acked_result = parse_acked_xml(acked_content)
                        snapshot["parsed_acked"] = extract_bsa_id_from_acked(acked_result)
                        
                        if acked_result.bsa_id:
                            logger.info(
                                f"SDTM Poll: Found {acked_filename}, BSA ID={acked_result.bsa_id}"
                            )
                            
                            submission.payload_snapshot = snapshot
                            
                            # Mark accepted with BSA ID
                            status, sub = mark_accepted(
                                db, report_id,
                                acked_result.bsa_id,
                                None
                            )
                            
                            # Update report with live filing status
                            report = db.query(Report).filter(Report.id == report_id).first()
                            if report:
                                report.filing_status = "filed_live"
                            
                            return status, {"bsa_id": acked_result.bsa_id}
                else:
                    result["acked_found"] = True
    
    except Exception as e:
        logger.error(f"SDTM Poll: Error for {report_id}: {e}")
        result["error"] = str(e)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # Update poll schedule
    # ═══════════════════════════════════════════════════════════════════════════
    
    # Calculate next poll time with backoff
    backoff_index = min(poll_attempts - 1, len(POLL_BACKOFF_MINUTES) - 1)
    next_poll_minutes = POLL_BACKOFF_MINUTES[backoff_index]
    
    snapshot["poll_schedule"] = {
        "next_poll_at": (datetime.utcnow() + timedelta(minutes=next_poll_minutes)).isoformat(),
        "poll_attempts": poll_attempts,
        "last_poll_at": datetime.utcnow().isoformat(),
    }
    
    submission.payload_snapshot = snapshot
    submission.updated_at = datetime.utcnow()
    
    # Check for timeout conditions
    generated_at_str = snapshot.get("generated_at")
    if generated_at_str:
        generated_at = datetime.fromisoformat(generated_at_str)
        hours_since = (datetime.utcnow() - generated_at).total_seconds() / 3600
        
        # No messages after 24 hours -> needs_review
        if not result["messages_found"] and hours_since > 24:
            return mark_needs_review(
                db, report_id, None,
                "No MESSAGES.XML received after 24 hours"
            )
        
        # Messages accepted but no .ACK after 5 days -> needs_review
        if result["messages_found"] and not result["acked_found"]:
            messages_status = snapshot.get("parsed_messages", {}).get("status")
            if messages_status == "accepted" and hours_since > 120:  # 5 days
                return mark_needs_review(
                    db, report_id, None,
                    "No .ACK file received 5 days after acceptance"
                )
    
    return "submitted", result


def mark_needs_review(
    db: Session,
    report_id: UUID,
    ip_address: Optional[str] = None,
    reason: Optional[str] = None,
) -> Tuple[str, FilingSubmission]:
    """
    Mark submission as needing review with optional reason.
    """
    submission = get_or_create_submission(db, report_id)
    report = db.query(Report).filter(Report.id == report_id).first()
    
    submission.status = "needs_review"
    submission.updated_at = datetime.utcnow()
    
    # Store reason in payload_snapshot
    if reason:
        if not submission.payload_snapshot:
            submission.payload_snapshot = {}
        submission.payload_snapshot["needs_review_reason"] = reason
    
    # Update report status
    if report:
        report.filing_status = "needs_review"
        report.updated_at = datetime.utcnow()
    
    # Audit log
    audit = AuditLog(
        report_id=report_id,
        actor_type="api",
        action="filing_needs_review",
        details={
            "attempt": submission.attempts,
            "reason": reason,
        },
        ip_address=ip_address,
    )
    db.add(audit)
    
    return "needs_review", submission


def list_pending_polls(db: Session, limit: int = 100) -> List[FilingSubmission]:
    """
    List submissions ready for polling.
    
    Returns submissions where:
    - transport == "sdtm"
    - status in ("submitted", "queued")
    - next_poll_at <= now
    """
    now = datetime.utcnow()
    
    submissions = db.query(FilingSubmission).filter(
        FilingSubmission.status.in_(["submitted", "queued"])
    ).all()
    
    # Filter by poll schedule in payload_snapshot
    ready = []
    for sub in submissions:
        snapshot = sub.payload_snapshot or {}
        
        # Only SDTM submissions
        if snapshot.get("transport") != "sdtm":
            continue
        
        poll_schedule = snapshot.get("poll_schedule", {})
        next_poll_str = poll_schedule.get("next_poll_at")
        
        if not next_poll_str:
            ready.append(sub)
            continue
        
        try:
            next_poll = datetime.fromisoformat(next_poll_str)
            if next_poll <= now:
                ready.append(sub)
        except ValueError:
            ready.append(sub)
        
        if len(ready) >= limit:
            break
    
    return ready
