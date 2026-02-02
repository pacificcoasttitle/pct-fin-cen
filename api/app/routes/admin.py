"""
Admin API routes for operations console.

These endpoints are read-only and do not require DEMO_SECRET.
They should be protected by the app's auth at the frontend level.
"""
from datetime import datetime
from typing import Optional, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from pydantic import BaseModel

from app.database import get_db
from app.config import get_settings
from app.models import Report, ReportParty, AuditLog, FilingSubmission
from app.services.filing_lifecycle import (
    get_filing_stats,
    list_submissions,
    retry_submission,
    poll_sdtm_responses,
    list_pending_polls,
)

router = APIRouter(prefix="/admin", tags=["admin"])
settings = get_settings()


def get_client_ip(request: Request) -> Optional[str]:
    """Extract client IP from request."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else None


# Response models
class ReportSummary(BaseModel):
    id: str
    property_address_text: Optional[str]
    status: str
    filing_status: Optional[str]
    receipt_id: Optional[str]
    parties_total: int
    parties_submitted: int
    created_at: str
    updated_at: str


class FilingSubmissionSummary(BaseModel):
    id: str
    report_id: str
    property_address: Optional[str]
    status: str
    receipt_id: Optional[str]
    rejection_code: Optional[str]
    rejection_message: Optional[str]
    attempts: int
    created_at: str
    updated_at: str


class AuditLogEntry(BaseModel):
    id: str
    report_id: Optional[str]
    action: str
    actor_type: str
    details: dict
    created_at: str


class AdminStatsResponse(BaseModel):
    total_reports: int
    pending_parties: int
    ready_to_file: int
    filings_accepted: int
    filings_rejected: int
    filings_needs_review: int


@router.get("/stats", response_model=AdminStatsResponse)
def get_admin_stats(db: Session = Depends(get_db)):
    """
    Get aggregate statistics for the admin dashboard.
    """
    # Total reports
    total_reports = db.query(func.count(Report.id)).scalar() or 0
    
    # Pending parties (parties not yet submitted across all reports)
    pending_parties = db.query(func.count(ReportParty.id)).filter(
        ReportParty.status != "submitted"
    ).scalar() or 0
    
    # Ready to file
    ready_to_file = db.query(func.count(Report.id)).filter(
        Report.status == "ready_to_file"
    ).scalar() or 0
    
    # Filing stats
    filing_stats = get_filing_stats(db)
    
    return AdminStatsResponse(
        total_reports=total_reports,
        pending_parties=pending_parties,
        ready_to_file=ready_to_file,
        filings_accepted=filing_stats.get("accepted", 0),
        filings_rejected=filing_stats.get("rejected", 0),
        filings_needs_review=filing_stats.get("needs_review", 0),
    )


@router.get("/reports")
def list_admin_reports(
    db: Session = Depends(get_db),
    status: Optional[str] = Query(None, description="Filter by report status"),
    filing_status: Optional[str] = Query(None, description="Filter by filing status"),
    q: Optional[str] = Query(None, description="Search query"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    """
    List reports with filing status for admin view.
    """
    query = db.query(Report)
    
    # Apply filters
    if status:
        query = query.filter(Report.status == status)
    
    if filing_status:
        query = query.filter(Report.filing_status == filing_status)
    
    if q:
        search_term = f"%{q}%"
        query = query.filter(Report.property_address_text.ilike(search_term))
    
    # Get total before pagination
    total = query.count()
    
    # Apply pagination and ordering
    reports = query.order_by(desc(Report.updated_at)).offset(offset).limit(limit).all()
    
    # Build response with submission info
    items = []
    for report in reports:
        parties = report.parties
        items.append({
            "id": str(report.id),
            "property_address_text": report.property_address_text,
            "status": report.status,
            "filing_status": report.filing_status,
            "receipt_id": report.receipt_id,
            "filed_at": report.filed_at.isoformat() if report.filed_at else None,
            "parties_total": len(parties),
            "parties_submitted": sum(1 for p in parties if p.status == "submitted"),
            "closing_date": report.closing_date.isoformat() if report.closing_date else None,
            "created_at": report.created_at.isoformat(),
            "updated_at": report.updated_at.isoformat(),
        })
    
    return {
        "items": items,
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.get("/reports/{report_id}")
def get_admin_report_detail(
    report_id: UUID,
    db: Session = Depends(get_db),
):
    """
    Get detailed report information for admin view.
    """
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Get submission
    submission = db.query(FilingSubmission).filter(
        FilingSubmission.report_id == report_id
    ).first()
    
    # Get audit logs
    audit_logs = db.query(AuditLog).filter(
        AuditLog.report_id == report_id
    ).order_by(desc(AuditLog.created_at)).limit(50).all()
    
    # Build parties info
    parties = []
    for party in report.parties:
        parties.append({
            "id": str(party.id),
            "party_role": party.party_role,
            "entity_type": party.entity_type,
            "display_name": party.display_name,
            "status": party.status,
            "created_at": party.created_at.isoformat(),
            "updated_at": party.updated_at.isoformat(),
        })
    
    # Build audit log entries
    audit_entries = []
    for log in audit_logs:
        audit_entries.append({
            "id": str(log.id),
            "action": log.action,
            "actor_type": log.actor_type,
            "details": log.details or {},
            "created_at": log.created_at.isoformat(),
        })
    
    return {
        "report": {
            "id": str(report.id),
            "property_address_text": report.property_address_text,
            "closing_date": report.closing_date.isoformat() if report.closing_date else None,
            "filing_deadline": report.filing_deadline.isoformat() if report.filing_deadline else None,
            "status": report.status,
            "wizard_step": report.wizard_step,
            "determination": report.determination,
            "filing_status": report.filing_status,
            "filed_at": report.filed_at.isoformat() if report.filed_at else None,
            "receipt_id": report.receipt_id,
            "created_at": report.created_at.isoformat(),
            "updated_at": report.updated_at.isoformat(),
        },
        "parties": parties,
        "submission": submission.to_dict() if submission else None,
        "audit_log": audit_entries,
    }


@router.get("/filings")
def list_admin_filings(
    db: Session = Depends(get_db),
    status: Optional[str] = Query(None, description="Filter by submission status"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    """
    List filing submissions for admin view.
    """
    query = db.query(FilingSubmission)
    
    if status:
        query = query.filter(FilingSubmission.status == status)
    
    total = query.count()
    submissions = query.order_by(desc(FilingSubmission.updated_at)).offset(offset).limit(limit).all()
    
    # Enrich with report info
    items = []
    for sub in submissions:
        report = db.query(Report).filter(Report.id == sub.report_id).first()
        items.append({
            "id": str(sub.id),
            "report_id": str(sub.report_id),
            "property_address": report.property_address_text if report else None,
            "status": sub.status,
            "receipt_id": sub.receipt_id,
            "rejection_code": sub.rejection_code,
            "rejection_message": sub.rejection_message,
            "demo_outcome": sub.demo_outcome,
            "attempts": sub.attempts,
            "created_at": sub.created_at.isoformat(),
            "updated_at": sub.updated_at.isoformat(),
        })
    
    return {
        "items": items,
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.post("/reports/{report_id}/retry-filing")
def retry_admin_filing(
    report_id: UUID,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Retry a rejected or needs_review filing submission.
    """
    # Check report exists
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    client_ip = get_client_ip(request)
    success, message, submission = retry_submission(db, report_id, client_ip)
    
    if not success:
        raise HTTPException(status_code=400, detail=message)
    
    db.commit()
    
    return {
        "ok": True,
        "message": message,
        "submission_status": submission.status if submission else None,
        "attempts": submission.attempts if submission else None,
    }


@router.get("/activity")
def get_recent_activity(
    db: Session = Depends(get_db),
    limit: int = Query(20, ge=1, le=100),
):
    """
    Get recent audit log activity across all reports.
    """
    logs = db.query(AuditLog).order_by(desc(AuditLog.created_at)).limit(limit).all()
    
    items = []
    for log in logs:
        # Get report info if available
        report_info = None
        if log.report_id:
            report = db.query(Report).filter(Report.id == log.report_id).first()
            if report:
                report_info = {
                    "id": str(report.id),
                    "property_address": report.property_address_text,
                }
        
        items.append({
            "id": str(log.id),
            "report_id": str(log.report_id) if log.report_id else None,
            "report": report_info,
            "action": log.action,
            "actor_type": log.actor_type,
            "details": log.details or {},
            "created_at": log.created_at.isoformat(),
        })
    
    return {"items": items}


# ═══════════════════════════════════════════════════════════════════════════════
# SDTM DEBUG ENDPOINTS (Section C Hardening)
# ═══════════════════════════════════════════════════════════════════════════════


@router.get("/filings/{submission_id}/debug")
def get_filing_submission_debug(
    submission_id: UUID,
    db: Session = Depends(get_db),
):
    """
    Get detailed filing submission information for debugging.
    
    Returns:
    - Basic submission info (status, receipt_id, attempts, timestamps)
    - SDTM-specific info (filename, transport, fincen_env)
    - Artifact metadata (what files are stored, sizes, hashes)
    - Poll schedule info
    - Parsed response data
    """
    submission = db.query(FilingSubmission).filter(
        FilingSubmission.id == submission_id
    ).first()
    
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    # Get report info
    report = db.query(Report).filter(Report.id == submission.report_id).first()
    
    # Parse payload_snapshot for debug info
    snapshot = submission.payload_snapshot or {}
    artifacts = snapshot.get("artifacts", {})
    
    # Build artifact metadata (without the actual data)
    artifact_meta = {}
    for key, artifact in artifacts.items():
        if isinstance(artifact, dict):
            artifact_meta[key] = {
                "filename": artifact.get("filename"),
                "size": artifact.get("size"),
                "sha256": artifact.get("sha256"),
                "downloaded_at": artifact.get("downloaded_at"),
                "has_data": bool(artifact.get("data")),
            }
    
    return {
        "submission": {
            "id": str(submission.id),
            "report_id": str(submission.report_id),
            "property_address": report.property_address_text if report else None,
            "status": submission.status,
            "receipt_id": submission.receipt_id,
            "rejection_code": submission.rejection_code,
            "rejection_message": submission.rejection_message,
            "attempts": submission.attempts,
            "created_at": submission.created_at.isoformat(),
            "updated_at": submission.updated_at.isoformat(),
        },
        "sdtm_info": {
            "transport": snapshot.get("transport"),
            "fincen_env": snapshot.get("fincen_env"),
            "filename": snapshot.get("filename"),
            "remote_path": snapshot.get("remote_path"),
            "generated_at": snapshot.get("generated_at"),
            "uploaded_at": snapshot.get("uploaded_at"),
            "uploaded_size": snapshot.get("uploaded_size"),
        },
        "artifacts": artifact_meta,
        "poll_schedule": snapshot.get("poll_schedule"),
        "parsed_messages": snapshot.get("parsed_messages"),
        "parsed_acked": snapshot.get("parsed_acked"),
        "preflight_errors": snapshot.get("preflight_errors"),
        "needs_review_reason": snapshot.get("needs_review_reason"),
        "debug_summary": snapshot.get("debug_summary"),
    }


@router.get("/filings/{submission_id}/artifact/{artifact_type}")
def download_filing_artifact(
    submission_id: UUID,
    artifact_type: str,
    db: Session = Depends(get_db),
):
    """
    Download a filing artifact (XML, MESSAGES.XML, or ACKED).
    
    Args:
        submission_id: Filing submission UUID
        artifact_type: One of "xml", "messages", "acked"
        
    Returns:
        The decompressed artifact content as text/xml
    """
    from fastapi.responses import PlainTextResponse
    from app.services.fincen.utils import gzip_b64_decode
    
    if artifact_type not in ("xml", "messages", "acked"):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid artifact type: {artifact_type}. Must be one of: xml, messages, acked"
        )
    
    submission = db.query(FilingSubmission).filter(
        FilingSubmission.id == submission_id
    ).first()
    
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    snapshot = submission.payload_snapshot or {}
    artifacts = snapshot.get("artifacts", {})
    artifact = artifacts.get(artifact_type)
    
    if not artifact or not artifact.get("data"):
        raise HTTPException(
            status_code=404,
            detail=f"Artifact '{artifact_type}' not found or has no data"
        )
    
    # Decompress the artifact
    try:
        content = gzip_b64_decode(artifact["data"]).decode("utf-8")
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to decompress artifact: {str(e)}"
        )
    
    filename = artifact.get("filename", f"{artifact_type}.xml")
    
    return PlainTextResponse(
        content=content,
        media_type="application/xml",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
    )


@router.post("/filings/{submission_id}/repoll")
def trigger_filing_repoll(
    submission_id: UUID,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Trigger a manual repoll for a submitted filing.
    
    This does NOT re-upload the XML, only checks for response files.
    
    Only works for submissions in "submitted" or "queued" status
    with transport="sdtm".
    """
    
    submission = db.query(FilingSubmission).filter(
        FilingSubmission.id == submission_id
    ).first()
    
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    snapshot = submission.payload_snapshot or {}
    
    # Verify this is an SDTM submission
    if snapshot.get("transport") != "sdtm":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot repoll non-SDTM submission (transport={snapshot.get('transport')})"
        )
    
    # Verify status allows repoll
    if submission.status not in ("submitted", "queued"):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot repoll submission in '{submission.status}' status"
        )
    
    client_ip = get_client_ip(request)
    
    # Log the manual repoll action
    from app.models import AuditLog
    audit = AuditLog(
        report_id=submission.report_id,
        actor_type="admin",
        action="manual_repoll_triggered",
        details={
            "submission_id": str(submission.id),
            "previous_status": submission.status,
        },
        ip_address=client_ip,
    )
    db.add(audit)
    
    # Perform the repoll
    try:
        status, result = poll_sdtm_responses(db, submission.report_id)
        db.commit()
        
        return {
            "ok": True,
            "message": f"Repoll completed. Status: {status}",
            "status": status,
            "result": result,
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Repoll failed: {str(e)}"
        )


@router.get("/sdtm/pending")
def list_pending_sdtm_polls(
    db: Session = Depends(get_db),
    limit: int = Query(50, ge=1, le=100),
):
    """
    List SDTM submissions that are pending/ready for polling.
    
    Useful for debugging why polls might not be running.
    """
    pending = list_pending_polls(db, limit=limit)
    
    items = []
    for sub in pending:
        report = db.query(Report).filter(Report.id == sub.report_id).first()
        snapshot = sub.payload_snapshot or {}
        poll_schedule = snapshot.get("poll_schedule", {})
        
        items.append({
            "id": str(sub.id),
            "report_id": str(sub.report_id),
            "property_address": report.property_address_text if report else None,
            "status": sub.status,
            "filename": snapshot.get("filename"),
            "attempts": sub.attempts,
            "poll_attempts": poll_schedule.get("poll_attempts", 0),
            "next_poll_at": poll_schedule.get("next_poll_at"),
            "last_poll_at": poll_schedule.get("last_poll_at"),
            "generated_at": snapshot.get("generated_at"),
        })
    
    return {
        "items": items,
        "total": len(items),
    }
