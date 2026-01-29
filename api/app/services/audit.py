"""
Centralized Audit Logging Service.

All state-changing operations MUST log an audit event.
This is critical for FinCEN compliance - logs retained for 5 years.

Usage:
    from app.services.audit import log_event, log_change

    # Simple event
    log_event(db, "submission_request", str(submission.id), "created", 
              actor_id=str(user.id), actor_type="client")

    # Change with before/after
    log_change(db, "report", str(report.id), "status_changed",
               old_values={"status": "draft"}, 
               new_values={"status": "collecting"},
               actor_id=str(user.id), actor_type="staff")
"""

from datetime import datetime
from typing import Optional, Any
from uuid import UUID
from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog


# ============================================================================
# ENTITY TYPES (for consistency)
# ============================================================================

ENTITY_SUBMISSION_REQUEST = "submission_request"
ENTITY_REPORT = "report"
ENTITY_REPORT_PARTY = "report_party"
ENTITY_PARTY_LINK = "party_link"
ENTITY_DOCUMENT = "document"
ENTITY_FILING_SUBMISSION = "filing_submission"
ENTITY_NOTIFICATION = "notification_event"
ENTITY_INVOICE = "invoice"
ENTITY_BILLING_EVENT = "billing_event"
ENTITY_COMPANY = "company"
ENTITY_USER = "user"


# ============================================================================
# EVENT TYPES (standard naming convention: entity.action)
# ============================================================================

# Submission Request Events
EVENT_SUBMISSION_CREATED = "submission.created"
EVENT_SUBMISSION_UPDATED = "submission.updated"
EVENT_SUBMISSION_STATUS_CHANGED = "submission.status_changed"
EVENT_SUBMISSION_DETERMINED = "submission.determined"
EVENT_SUBMISSION_CERTIFIED_EXEMPT = "submission.certified_exempt"

# Report Events
EVENT_REPORT_CREATED = "report.created"
EVENT_REPORT_UPDATED = "report.updated"
EVENT_REPORT_STATUS_CHANGED = "report.status_changed"
EVENT_WIZARD_STEP_COMPLETED = "report.wizard_step_completed"
EVENT_WIZARD_COMPLETED = "report.wizard_completed"
EVENT_DETERMINATION_COMPLETE = "report.determination_complete"
EVENT_READY_CHECK_PASSED = "report.ready_check_passed"
EVENT_READY_CHECK_FAILED = "report.ready_check_failed"

# Party Events
EVENT_PARTY_CREATED = "party.created"
EVENT_PARTY_DATA_SAVED = "party.data_saved"
EVENT_PARTY_SUBMITTED = "party.submitted"
EVENT_PARTY_VALIDATION_FAILED = "party.validation_failed"

# Party Link Events
EVENT_PARTY_LINK_CREATED = "party_link.created"
EVENT_PARTY_LINK_SENT = "party_link.sent"
EVENT_PARTY_LINK_OPENED = "party_link.opened"
EVENT_PARTY_LINK_EXPIRED = "party_link.expired"
EVENT_PARTY_LINK_REGENERATED = "party_link.regenerated"

# Document Events
EVENT_DOCUMENT_UPLOAD_STARTED = "document.upload_started"
EVENT_DOCUMENT_UPLOADED = "document.uploaded"
EVENT_DOCUMENT_VERIFIED = "document.verified"
EVENT_DOCUMENT_REJECTED = "document.rejected"
EVENT_DOCUMENT_DOWNLOADED = "document.downloaded"
EVENT_DOCUMENT_DELETED = "document.deleted"

# Filing Events
EVENT_FILING_QUEUED = "filing.queued"
EVENT_FILING_SUBMITTED = "filing.submitted"
EVENT_FILING_ACCEPTED = "filing.accepted"
EVENT_FILING_REJECTED = "filing.rejected"
EVENT_FILING_NEEDS_REVIEW = "filing.needs_review"
EVENT_FILING_RETRY = "filing.retry"
EVENT_BSA_ID_RECEIVED = "filing.bsa_id_received"

# Invoice Events
EVENT_INVOICE_CREATED = "invoice.created"
EVENT_INVOICE_GENERATED = "invoice.generated"
EVENT_INVOICE_SENT = "invoice.sent"
EVENT_INVOICE_PAID = "invoice.paid"
EVENT_INVOICE_VOIDED = "invoice.voided"

# Company Events
EVENT_COMPANY_CREATED = "company.created"
EVENT_COMPANY_UPDATED = "company.updated"
EVENT_COMPANY_STATUS_CHANGED = "company.status_changed"

# User Events
EVENT_USER_CREATED = "user.created"
EVENT_USER_UPDATED = "user.updated"
EVENT_USER_ROLE_CHANGED = "user.role_changed"
EVENT_USER_DEACTIVATED = "user.deactivated"
EVENT_USER_REACTIVATED = "user.reactivated"
EVENT_USER_INVITED = "user.invited"


# ============================================================================
# LOGGING FUNCTIONS
# ============================================================================

def log_event(
    db: Session,
    entity_type: str,
    entity_id: str,
    event_type: str,
    actor_id: Optional[str] = None,
    actor_type: str = "system",
    details: Optional[dict] = None,
    ip_address: Optional[str] = None,
    report_id: Optional[str] = None,
) -> AuditLog:
    """
    Log a simple audit event.
    
    Args:
        db: Database session
        entity_type: Type of entity (use ENTITY_* constants)
        entity_id: UUID of the entity
        event_type: Type of event (use EVENT_* constants)
        actor_id: UUID of user who performed action (None for system)
        actor_type: Role of actor (system, client, staff, admin, party)
        details: Additional JSON details
        ip_address: Client IP if available
        report_id: Associated report ID if applicable
        
    Returns:
        The created AuditLog entry
    """
    # If entity is a report, use it as report_id
    if entity_type == ENTITY_REPORT and report_id is None:
        report_id = entity_id
    
    audit = AuditLog(
        report_id=_parse_uuid(report_id),
        actor_type=actor_type,
        actor_user_id=_parse_uuid(actor_id),
        action=event_type,
        details={
            "entity_type": entity_type,
            "entity_id": entity_id,
            **(details or {}),
        },
        ip_address=ip_address,
        created_at=datetime.utcnow(),
    )
    db.add(audit)
    # Don't commit - let caller manage transaction
    return audit


def log_change(
    db: Session,
    entity_type: str,
    entity_id: str,
    event_type: str,
    old_values: dict,
    new_values: dict,
    actor_id: Optional[str] = None,
    actor_type: str = "user",
    ip_address: Optional[str] = None,
    report_id: Optional[str] = None,
) -> AuditLog:
    """
    Log a change event with before/after values.
    
    Args:
        db: Database session
        entity_type: Type of entity
        entity_id: UUID of the entity
        event_type: Type of event
        old_values: Dict of old field values
        new_values: Dict of new field values
        actor_id: UUID of user who performed action
        actor_type: Role of actor
        ip_address: Client IP if available
        report_id: Associated report ID if applicable
        
    Returns:
        The created AuditLog entry
    """
    # Calculate which fields changed
    changed_fields = []
    for key in set(old_values.keys()) | set(new_values.keys()):
        if old_values.get(key) != new_values.get(key):
            changed_fields.append(key)
    
    details = {
        "old": old_values,
        "new": new_values,
        "changed_fields": changed_fields,
    }
    
    return log_event(
        db=db,
        entity_type=entity_type,
        entity_id=entity_id,
        event_type=event_type,
        actor_id=actor_id,
        actor_type=actor_type,
        details=details,
        ip_address=ip_address,
        report_id=report_id,
    )


def log_submission_created(
    db: Session,
    submission_id: str,
    details: dict,
    actor_id: Optional[str] = None,
    actor_type: str = "client",
    ip_address: Optional[str] = None,
) -> AuditLog:
    """Log a submission creation event."""
    return log_event(
        db=db,
        entity_type=ENTITY_SUBMISSION_REQUEST,
        entity_id=submission_id,
        event_type=EVENT_SUBMISSION_CREATED,
        actor_id=actor_id,
        actor_type=actor_type,
        details=details,
        ip_address=ip_address,
    )


def log_submission_determined(
    db: Session,
    submission_id: str,
    result: str,
    reasons: list,
    method: str,
    certificate_id: Optional[str] = None,
    ip_address: Optional[str] = None,
) -> AuditLog:
    """Log a submission determination event."""
    event_type = EVENT_SUBMISSION_CERTIFIED_EXEMPT if result == "exempt" else EVENT_SUBMISSION_DETERMINED
    
    return log_event(
        db=db,
        entity_type=ENTITY_SUBMISSION_REQUEST,
        entity_id=submission_id,
        event_type=event_type,
        details={
            "result": result,
            "reasons": reasons,
            "method": method,
            "certificate_id": certificate_id,
        },
        ip_address=ip_address,
    )


def log_document_event(
    db: Session,
    document_id: str,
    event_type: str,
    party_id: Optional[str] = None,
    report_id: Optional[str] = None,
    details: Optional[dict] = None,
    actor_id: Optional[str] = None,
    actor_type: str = "party",
    ip_address: Optional[str] = None,
) -> AuditLog:
    """Log a document-related event."""
    return log_event(
        db=db,
        entity_type=ENTITY_DOCUMENT,
        entity_id=document_id,
        event_type=event_type,
        actor_id=actor_id,
        actor_type=actor_type,
        details={
            "party_id": party_id,
            **(details or {}),
        },
        ip_address=ip_address,
        report_id=report_id,
    )


def log_filing_event(
    db: Session,
    report_id: str,
    event_type: str,
    details: Optional[dict] = None,
    actor_id: Optional[str] = None,
    actor_type: str = "system",
    ip_address: Optional[str] = None,
) -> AuditLog:
    """Log a filing-related event."""
    return log_event(
        db=db,
        entity_type=ENTITY_FILING_SUBMISSION,
        entity_id=report_id,  # Use report_id as entity since filing is 1:1
        event_type=event_type,
        actor_id=actor_id,
        actor_type=actor_type,
        details=details,
        ip_address=ip_address,
        report_id=report_id,
    )


def _parse_uuid(value: Any) -> Optional[UUID]:
    """Parse a value to UUID, returning None if invalid."""
    if value is None:
        return None
    if isinstance(value, UUID):
        return value
    try:
        return UUID(str(value))
    except (ValueError, TypeError):
        return None
