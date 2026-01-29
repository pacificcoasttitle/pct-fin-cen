"""
Report API routes.
"""
from datetime import date, datetime, timedelta
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import case

from app.database import get_db
from app.config import get_settings
from app.models import Report, ReportParty, PartyLink, AuditLog
from app.models.billing_event import BillingEvent
from app.models.submission_request import SubmissionRequest
from app.schemas.report import (
    ReportCreate,
    ReportResponse,
    ReportListResponse,
    ReportDetailResponse,
    WizardUpdate,
    DeterminationResponse,
    ReportPartyBrief,
    PartyStatusItem,
    PartySummary,
    ReportPartiesResponse,
    ReportWithPartySummary,
    ReportListWithPartiesResponse,
)
from app.schemas.party import PartyLinkCreate, PartyLinkResponse, PartyLinkItem, PartyInput
from app.schemas.common import ReadyCheckResponse, FileResponse, MissingItem
from app.services.determination import determine_reportability
from app.services.filing import MockFilingProvider
from app.services.notifications import log_notification, send_party_invite_notification
from app.services.email_service import FRONTEND_URL
from app.services.filing_lifecycle import (
    enqueue_submission,
    perform_mock_submit,
    get_or_create_submission,
)
from app.services.party_validation import (
    calculate_party_summary,
    validate_party_data,
    get_party_warnings,
    calculate_completion_percentage,
)

router = APIRouter(prefix="/reports", tags=["reports"])
settings = get_settings()


def get_client_ip(request: Request) -> Optional[str]:
    """Extract client IP from request."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else None


@router.post("", response_model=ReportResponse, status_code=201)
def create_report(
    report_in: ReportCreate,
    request: Request,
    db: Session = Depends(get_db),
):
    """Create a new report."""
    # Calculate filing deadline if closing date provided (30 days per FinCEN)
    filing_deadline = None
    if report_in.closing_date:
        filing_deadline = report_in.closing_date + timedelta(days=30)
    
    report = Report(
        property_address_text=report_in.property_address_text,
        closing_date=report_in.closing_date,
        filing_deadline=filing_deadline,
        wizard_data=report_in.wizard_data or {},
        status="draft",
        wizard_step=1,
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    
    # Audit log
    audit = AuditLog(
        report_id=report.id,
        actor_type="api",
        action="report.created",
        details={"property_address": report_in.property_address_text},
        ip_address=get_client_ip(request),
    )
    db.add(audit)
    db.commit()
    
    return report


@router.get("", response_model=ReportListResponse)
def list_reports(
    status: Optional[str] = Query(None, description="Filter by status"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """List all reports with optional filtering."""
    query = db.query(Report)
    
    if status:
        query = query.filter(Report.status == status)
    
    total = query.count()
    reports = query.order_by(Report.created_at.desc()).offset(offset).limit(limit).all()
    
    return ReportListResponse(
        reports=[ReportResponse.model_validate(r) for r in reports],
        total=total,
    )


@router.get("/queue/with-parties", response_model=ReportListWithPartiesResponse)
def list_reports_with_parties(
    status: Optional[str] = Query(None, description="Filter by single status (e.g., 'collecting')"),
    statuses: Optional[str] = Query(None, description="Filter by multiple statuses (comma-separated: 'draft,collecting,ready_to_file')"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """
    List reports with party completion summary.
    
    This endpoint is optimized for queue/dashboard views where party
    completion status needs to be shown at a glance.
    
    Can filter by single status or multiple statuses.
    If no status filter provided, returns all active work (draft, determination_complete, collecting, ready_to_file).
    
    Returns party counts: total, submitted, pending, all_complete flag.
    """
    query = db.query(Report)
    
    # Filter by status(es)
    if statuses:
        # Support comma-separated: "draft,collecting,ready_to_file"
        status_list = [s.strip() for s in statuses.split(",")]
        query = query.filter(Report.status.in_(status_list))
    elif status:
        query = query.filter(Report.status == status)
    else:
        # Default: Show all active work (not filed, not exempt)
        query = query.filter(Report.status.in_([
            "draft",
            "determination_complete",
            "collecting",
            "ready_to_file"
        ]))
    
    total = query.count()
    
    # Order by urgency: ready_to_file first, then by deadline
    reports = query.order_by(
        case(
            (Report.status == "ready_to_file", 1),
            (Report.status == "collecting", 2),
            (Report.status == "determination_complete", 3),
            (Report.status == "draft", 4),
            else_=5
        ),
        Report.filing_deadline.asc().nullslast()
    ).offset(offset).limit(limit).all()
    
    result = []
    for report in reports:
        parties = report.parties
        parties_total = len(parties)
        parties_submitted = len([p for p in parties if p.status == "submitted"])
        
        # Build enhanced party list with summary data
        party_items = []
        for party in parties:
            summary = calculate_party_summary(party)
            
            # Get the first active link for this party
            active_link = None
            if party.links:
                active_link = next(
                    (l for l in party.links if l.expires_at > datetime.utcnow()),
                    None
                )
            
            party_items.append(PartyStatusItem(
                id=party.id,
                party_role=party.party_role,
                entity_type=party.entity_type,
                display_name=party.display_name,
                email=party.party_data.get("email") if party.party_data else None,
                status=party.status,
                submitted_at=party.updated_at if party.status == "submitted" else None,
                token=active_link.token if active_link else None,
                link=f"{FRONTEND_URL}/p/{active_link.token}" if active_link else None,
                link_expires_at=active_link.expires_at if active_link else None,
                created_at=party.created_at,
                completion_percentage=summary["completion_percentage"],
                beneficial_owners_count=summary["beneficial_owners_count"],
                trustees_count=summary["trustees_count"],
                payment_sources_count=summary["payment_sources_count"],
                payment_sources_total=summary["payment_sources_total"],
                documents_count=summary["documents_count"],
                has_validation_errors=summary["has_validation_errors"],
                validation_error_count=summary["validation_error_count"],
            ))
        
        result.append(ReportWithPartySummary(
            id=report.id,
            status=report.status,
            property_address_text=report.property_address_text,
            escrow_number=report.escrow_number,
            closing_date=report.closing_date,
            filing_deadline=report.filing_deadline,
            wizard_step=report.wizard_step,
            determination=report.determination,
            filing_status=report.filing_status,
            created_at=report.created_at,
            updated_at=report.updated_at,
            submission_request_id=report.submission_request_id,
            parties_total=parties_total,
            parties_submitted=parties_submitted,
            parties_pending=parties_total - parties_submitted,
            all_parties_complete=parties_submitted == parties_total if parties_total > 0 else False,
            parties=party_items,
        ))
    
    return ReportListWithPartiesResponse(
        reports=result,
        total=total,
    )


@router.get("/executive-stats")
def get_executive_stats(db: Session = Depends(get_db)):
    """
    Get executive-level statistics for the COO dashboard.
    Returns aggregated metrics across all companies.
    Includes early determination exemption insights.
    """
    from sqlalchemy import func
    
    # Total reports
    total_reports = db.query(Report).count()
    
    # Filed reports
    filed_reports = db.query(Report).filter(Report.status == "filed").count()
    
    # Exempt reports (from report status - staff-determined)
    exempt_reports = db.query(Report).filter(Report.status == "exempt").count()
    
    # Pending reports (not yet filed)
    pending_reports = db.query(Report).filter(
        Report.status.in_(["draft", "collecting", "ready_to_file"])
    ).count()
    
    # This month's filings
    start_of_month = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    filed_this_month = db.query(Report).filter(
        Report.status == "filed",
        Report.filed_at >= start_of_month
    ).count()
    
    # Calculate revenue (mock: $75 per filing)
    revenue_per_filing = 7500  # cents
    mtd_revenue_cents = filed_this_month * revenue_per_filing
    
    # Average completion time (from creation to filing) - mock for now
    avg_completion_days = 3.2
    
    # Compliance rate (filed on time vs total filed)
    compliance_rate = 98.2  # Mock for now
    
    # ==========================================================================
    # NEW: Early Determination / Submission Stats
    # ==========================================================================
    # Total submissions
    total_submissions = db.query(SubmissionRequest).count()
    
    # Exempt submissions (auto-determined at submission time)
    exempt_submissions = db.query(SubmissionRequest).filter(
        SubmissionRequest.determination_result == "exempt"
    ).count()
    
    # Reportable submissions
    reportable_submissions = db.query(SubmissionRequest).filter(
        SubmissionRequest.determination_result == "reportable"
    ).count()
    
    # Calculate exemption rate
    exemption_rate = 0
    if total_submissions > 0:
        exemption_rate = round((exempt_submissions / total_submissions) * 100, 1)
    
    # ==========================================================================
    # Exemption Reasons Breakdown
    # ==========================================================================
    exemption_reasons_breakdown = {}
    exempt_requests = db.query(SubmissionRequest).filter(
        SubmissionRequest.determination_result == "exempt"
    ).all()
    
    for req in exempt_requests:
        if req.exemption_reasons:
            for reason in req.exemption_reasons:
                exemption_reasons_breakdown[reason] = exemption_reasons_breakdown.get(reason, 0) + 1
    
    return {
        "total_reports": total_reports,
        "filed_reports": filed_reports,
        "exempt_reports": exempt_reports,
        "pending_reports": pending_reports,
        "filed_this_month": filed_this_month,
        "mtd_revenue_cents": mtd_revenue_cents,
        "compliance_rate": compliance_rate,
        "avg_completion_days": avg_completion_days,
        # NEW: Early determination stats
        "total_submissions": total_submissions,
        "exempt_submissions": exempt_submissions,
        "reportable_submissions": reportable_submissions,
        "exemption_rate": exemption_rate,
        "exemption_reasons_breakdown": exemption_reasons_breakdown,
    }


@router.get("/{report_id}", response_model=ReportDetailResponse)
def get_report(
    report_id: UUID,
    db: Session = Depends(get_db),
):
    """Get detailed report by ID."""
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    return ReportDetailResponse(
        id=report.id,
        status=report.status,
        property_address_text=report.property_address_text,
        closing_date=report.closing_date,
        filing_deadline=report.filing_deadline,
        wizard_step=report.wizard_step,
        wizard_data=report.wizard_data,
        determination=report.determination,
        parties=[ReportPartyBrief.model_validate(p) for p in report.parties],
        filing_status=report.filing_status,
        filed_at=report.filed_at,
        receipt_id=report.receipt_id,
        filing_payload=report.filing_payload,
        created_at=report.created_at,
        updated_at=report.updated_at,
    )


@router.get("/{report_id}/parties", response_model=ReportPartiesResponse)
def get_report_parties(
    report_id: UUID,
    db: Session = Depends(get_db),
):
    """
    Get all parties and their submission status for a report.
    
    Returns detailed party information including:
    - Submission status (pending, submitted)
    - Portal link for pending parties
    - Submission timestamp for completed parties
    """
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    parties_data = []
    for party in report.parties:
        # Get the most recent active link for this party
        active_link = None
        for link in party.links:
            if link.status == "active" or link.status == "used":
                active_link = link
                break
        
        # Get email from party_data if available
        party_email = None
        if party.party_data:
            party_email = party.party_data.get("email")
        
        # Build portal link
        portal_link = None
        link_expires_at = None
        token = None
        if active_link:
            token = active_link.token
            portal_link = f"{FRONTEND_URL}/p/{active_link.token}"
            link_expires_at = active_link.expires_at
        
        # Get submitted_at from link
        submitted_at = None
        if party.status == "submitted" and active_link:
            submitted_at = active_link.submitted_at
        
        parties_data.append(PartyStatusItem(
            id=party.id,
            party_role=party.party_role,
            entity_type=party.entity_type,
            display_name=party.display_name,
            email=party_email,
            status=party.status,
            submitted_at=submitted_at,
            token=token,
            link=portal_link,
            link_expires_at=link_expires_at,
            created_at=party.created_at,
        ))
    
    # Calculate summary
    total = len(parties_data)
    submitted = len([p for p in parties_data if p.status == "submitted"])
    pending = total - submitted
    
    return ReportPartiesResponse(
        report_id=report.id,
        property_address=report.property_address_text,
        parties=parties_data,
        summary=PartySummary(
            total=total,
            submitted=submitted,
            pending=pending,
            all_complete=submitted == total if total > 0 else False,
        ),
    )


@router.put("/{report_id}/wizard", response_model=ReportDetailResponse)
def update_wizard(
    report_id: UUID,
    wizard_update: WizardUpdate,
    request: Request,
    db: Session = Depends(get_db),
):
    """Autosave wizard progress."""
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    if report.status == "filed":
        raise HTTPException(status_code=400, detail="Cannot modify filed report")
    
    # Merge wizard data (preserve existing steps, update provided)
    # Use a new dict to ensure SQLAlchemy detects the change
    existing_data = dict(report.wizard_data or {})
    existing_data.update(wizard_update.wizard_data)
    
    report.wizard_step = wizard_update.wizard_step
    report.wizard_data = existing_data
    report.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(report)
    
    return ReportDetailResponse(
        id=report.id,
        status=report.status,
        property_address_text=report.property_address_text,
        closing_date=report.closing_date,
        filing_deadline=report.filing_deadline,
        wizard_step=report.wizard_step,
        wizard_data=report.wizard_data,
        determination=report.determination,
        parties=[ReportPartyBrief.model_validate(p) for p in report.parties],
        created_at=report.created_at,
        updated_at=report.updated_at,
    )


@router.post("/{report_id}/determine", response_model=DeterminationResponse)
def determine_report(
    report_id: UUID,
    request: Request,
    db: Session = Depends(get_db),
):
    """Run determination logic on report's wizard data."""
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    if report.status == "filed":
        raise HTTPException(status_code=400, detail="Cannot modify filed report")
    
    wizard_data = report.wizard_data or {}
    is_reportable, determination, reasoning = determine_reportability(wizard_data)
    
    # Update report
    report.determination = determination
    if is_reportable:
        report.status = "determination_complete"
    else:
        report.status = "exempt"
        
        # =================================================================
        # UPDATE: Mark linked SubmissionRequest as "completed" when exempt
        # =================================================================
        if report.submission_request_id:
            submission_request = db.query(SubmissionRequest).filter(
                SubmissionRequest.id == report.submission_request_id
            ).first()
            if submission_request:
                submission_request.status = "completed"
                submission_request.updated_at = datetime.utcnow()
    
    report.updated_at = datetime.utcnow()
    
    # Audit log
    audit = AuditLog(
        report_id=report.id,
        actor_type="api",
        action="report.determined",
        details={
            "is_reportable": is_reportable,
            "result": determination.get("final_result"),
        },
        ip_address=get_client_ip(request),
    )
    db.add(audit)
    db.commit()
    db.refresh(report)
    
    return DeterminationResponse(
        report_id=report.id,
        is_reportable=is_reportable,
        status=report.status,
        determination=determination,
        reasoning=reasoning,
    )


@router.post("/{report_id}/party-links", response_model=PartyLinkResponse)
def create_party_links(
    report_id: UUID,
    party_links_in: PartyLinkCreate,
    request: Request,
    db: Session = Depends(get_db),
):
    """Create parties and their collection links."""
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Allow draft, determination_complete, or collecting status
    # Status will auto-transition to "collecting" when links are created
    if report.status not in ["draft", "determination_complete", "collecting"]:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot create party links for report in '{report.status}' status. Report must be in draft or collecting phase."
        )
    
    links_created = []
    expires_at = datetime.utcnow() + timedelta(days=party_links_in.expires_in_days)
    property_address = report.property_address_text or "Property"
    
    for party_in in party_links_in.parties:
        # Build initial party_data from input - this gets hydrated to the form
        initial_party_data = {}
        if party_in.display_name:
            initial_party_data["display_name"] = party_in.display_name
            # Try to parse first/last name from display_name for individuals
            if party_in.entity_type == "individual" and " " in party_in.display_name:
                parts = party_in.display_name.split(" ", 1)
                initial_party_data["first_name"] = parts[0]
                initial_party_data["last_name"] = parts[1] if len(parts) > 1 else ""
            elif party_in.entity_type in ["entity", "llc", "corporation", "partnership", "other"]:
                initial_party_data["entity_name"] = party_in.display_name
            elif party_in.entity_type == "trust":
                initial_party_data["trust_name"] = party_in.display_name
        if party_in.email:
            initial_party_data["email"] = party_in.email
        if party_in.phone:
            initial_party_data["phone"] = party_in.phone
        
        # Create party with pre-populated data
        party = ReportParty(
            report_id=report.id,
            party_role=party_in.party_role,
            entity_type=party_in.entity_type,
            display_name=party_in.display_name,
            party_data=initial_party_data,  # Pre-populate for form hydration
            status="pending",
        )
        db.add(party)
        db.flush()  # Get party ID
        
        # Create link
        link = PartyLink(
            report_party_id=party.id,
            expires_at=expires_at,
            status="active",
        )
        db.add(link)
        db.flush()  # Get link token
        
        # Build full URL - use FRONTEND_URL for party portal
        portal_base = FRONTEND_URL.rstrip("/")
        link_url = f"{portal_base}/p/{link.token}"
        
        # Send invitation email if email provided
        email_sent = False
        if party_in.email:
            send_party_invite_notification(
                db=db,
                report_id=report.id,
                party_id=party.id,
                party_token=link.token,
                to_email=party_in.email,
                party_name=party_in.display_name or "",
                party_role=party_in.party_role,
                property_address=property_address,
                portal_link=link_url,
                company_name="Pacific Coast Title Company",
            )
            email_sent = True
        else:
            # Log notification event without sending (no email provided)
            log_notification(
                db,
                type="party_invite",
                report_id=report.id,
                party_id=party.id,
                party_token=link.token,
                to_email=None,
                subject=f"Action Required: Information needed for {property_address}",
                body_preview=f"You have been invited to provide information for a FinCEN Real Estate Report. Property: {property_address}. Role: {party.party_role}.",
                meta={
                    "link": link_url,
                    "role": party.party_role,
                    "party_name": party.display_name,
                    "expires_at": expires_at.isoformat(),
                },
            )
        
        links_created.append(PartyLinkItem(
            party_id=party.id,
            party_role=party.party_role,
            entity_type=party.entity_type,
            display_name=party.display_name,
            email=party_in.email,
            token=link.token,
            link_url=link_url,
            expires_at=expires_at,
            email_sent=email_sent,
        ))
    
    # Update report status
    report.status = "collecting"
    report.updated_at = datetime.utcnow()
    
    # Audit log
    audit = AuditLog(
        report_id=report.id,
        actor_type="api",
        action="party_links.created",
        details={
            "parties_count": len(party_links_in.parties),
            "emails_sent": sum(1 for l in links_created if l.email_sent),
        },
        ip_address=get_client_ip(request),
    )
    db.add(audit)
    db.commit()
    
    return PartyLinkResponse(
        report_id=report.id,
        links=links_created,
    )


@router.post("/{report_id}/ready-check", response_model=ReadyCheckResponse)
def ready_check(
    report_id: UUID,
    db: Session = Depends(get_db),
):
    """Check if report is ready for filing."""
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    missing_items = []
    
    # Check report fields
    if not report.property_address_text:
        missing_items.append(MissingItem(
            category="report",
            field="property_address_text",
            message="Property address is required"
        ))
    
    if not report.closing_date:
        missing_items.append(MissingItem(
            category="report",
            field="closing_date",
            message="Closing date is required"
        ))
    
    if not report.determination or report.determination.get("final_result") != "reportable":
        missing_items.append(MissingItem(
            category="report",
            field="determination",
            message="Determination must be complete and reportable"
        ))
    
    # Check parties
    parties = report.parties
    parties_total = len(parties)
    parties_complete = 0
    
    if parties_total == 0:
        missing_items.append(MissingItem(
            category="parties",
            field="parties",
            message="At least one transferee party is required"
        ))
    
    for party in parties:
        if party.status == "submitted":
            parties_complete += 1
        else:
            missing_items.append(MissingItem(
                category="party",
                field="party_data",
                party_id=party.id,
                message=f"Party '{party.display_name or party.party_role}' has not submitted (status: {party.status})"
            ))
    
    is_ready = len(missing_items) == 0
    
    # Update status if ready
    if is_ready and report.status != "filed":
        report.status = "ready_to_file"
        report.updated_at = datetime.utcnow()
        db.commit()
    
    return ReadyCheckResponse(
        report_id=report.id,
        is_ready=is_ready,
        missing_items=missing_items,
        parties_complete=parties_complete,
        parties_total=parties_total,
    )


def perform_ready_check(report: Report) -> tuple[bool, list]:
    """
    Internal ready check for filing validation.
    Returns (is_ready, list of error messages).
    """
    errors = []
    
    # Check report is reportable
    if not report.determination:
        errors.append("Report determination not complete")
    elif report.determination.get("final_result") != "reportable":
        errors.append("Report is not marked as reportable")
    
    # Check required fields
    if not report.property_address_text:
        errors.append("Property address is required")
    
    if not report.closing_date:
        errors.append("Closing date is required")
    
    # Check all required parties have submitted
    parties = report.parties
    if not parties:
        errors.append("At least one party is required")
    else:
        for party in parties:
            if party.status != "submitted":
                errors.append(f"Party '{party.display_name or party.party_role}' has not submitted")
    
    return len(errors) == 0, errors


@router.post("/{report_id}/file")
def file_report(
    report_id: UUID,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    File report to FinCEN.
    
    In staging environment: Performs mock filing with submission lifecycle.
    Outcome is determined by demo_outcome setting (default: accept).
    
    Returns:
    - 200 for accepted filings
    - 400 for rejected filings
    - 202 for needs_review filings
    - 501 in non-staging environments
    """
    # Check environment - only allow mock filing in staging/test
    if settings.ENVIRONMENT not in ("staging", "test"):
        raise HTTPException(
            status_code=501,
            detail="Live FinCEN filing not enabled. This feature is only available in staging environment."
        )
    
    # Get report
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Check existing submission status
    submission = get_or_create_submission(db, report_id)
    if submission.status == "accepted":
        raise HTTPException(status_code=400, detail="Report already filed and accepted")
    
    if report.status == "exempt":
        raise HTTPException(status_code=400, detail="Exempt reports cannot be filed")
    
    # Perform ready check
    is_ready, errors = perform_ready_check(report)
    if not is_ready:
        raise HTTPException(
            status_code=400,
            detail={
                "message": "Report is not ready for filing",
                "errors": errors,
            }
        )
    
    # Create payload snapshot (safe summary)
    payload_snapshot = {
        "property_address": report.property_address_text,
        "closing_date": report.closing_date.isoformat() if report.closing_date else None,
        "parties_count": len(report.parties),
        "party_roles": [p.party_role for p in report.parties],
    }
    
    client_ip = get_client_ip(request)
    
    # Enqueue the submission
    enqueue_submission(db, report_id, payload_snapshot, client_ip)
    
    # Perform mock submission (transitions to final state)
    outcome, submission = perform_mock_submit(db, report_id, client_ip)
    
    db.commit()
    
    # Create billing event for accepted filings
    if outcome == "accepted" and report.company_id:
        billing_event = BillingEvent(
            company_id=report.company_id,
            report_id=report.id,
            submission_request_id=report.submission_request_id,
            event_type="filing_accepted",
            description=f"FinCEN filing for {report.property_address_text}",
            amount_cents=7500,  # $75.00 per filing
            quantity=1,
            bsa_id=submission.receipt_id,
            created_at=datetime.utcnow(),
        )
        db.add(billing_event)
        db.commit()
    
    # =================================================================
    # UPDATE: Mark linked SubmissionRequest as "completed"
    # =================================================================
    if outcome == "accepted" and report.submission_request_id:
        submission_request = db.query(SubmissionRequest).filter(
            SubmissionRequest.id == report.submission_request_id
        ).first()
        if submission_request:
            submission_request.status = "completed"
            submission_request.updated_at = datetime.utcnow()
            db.commit()
    
    # Return appropriate response based on outcome
    if outcome == "accepted":
        return FileResponse(
            ok=True,
            report_id=report.id,
            status="accepted",
            receipt_id=submission.receipt_id,
            filed_at=submission.updated_at,
            message="Filed successfully (demo)",
            is_demo=True,
        )
    elif outcome == "rejected":
        # Return 400 for rejected
        raise HTTPException(
            status_code=400,
            detail={
                "ok": False,
                "status": "rejected",
                "report_id": str(report.id),
                "rejection_code": submission.rejection_code,
                "rejection_message": submission.rejection_message,
                "message": f"Filing rejected: {submission.rejection_code}",
                "is_demo": True,
            }
        )
    else:  # needs_review
        # Return 202 for needs_review
        from fastapi.responses import JSONResponse
        return JSONResponse(
            status_code=202,
            content={
                "ok": True,
                "status": "needs_review",
                "report_id": str(report.id),
                "message": "Requires internal review (demo)",
                "is_demo": True,
            }
        )
