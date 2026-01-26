"""
Filing lifecycle service - manages submission states and demo outcomes.
"""
import hashlib
from datetime import datetime
from typing import Optional, Tuple
from uuid import UUID

from sqlalchemy.orm import Session

from app.models import Report, FilingSubmission, AuditLog
from app.config import get_settings
from app.services.notifications import log_notification

settings = get_settings()


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
) -> Tuple[str, FilingSubmission]:
    """
    Mark submission as accepted with receipt.
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
    
    # Notification
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
    
    return "accepted", submission


def mark_rejected(
    db: Session,
    report_id: UUID,
    code: str,
    message: str,
    ip_address: Optional[str] = None,
) -> Tuple[str, FilingSubmission]:
    """
    Mark submission as rejected with error details.
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
    
    # Notification
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
