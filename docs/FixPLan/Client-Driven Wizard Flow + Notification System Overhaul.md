# Client-Driven Wizard Flow + Notification System Overhaul

## Executive Summary

Transform FinClear from a staff-mediated workflow to a client-driven self-service platform. Escrow officers (client_user) run the complete wizard, send party links, and filing happens automatically when all parties submit. Staff shifts from data entry to QC/oversight. Notifications trickle up through all roles.

**Key Changes:**
1. Remove staff queue as data entry bottleneck
2. Client users run full wizard end-to-end
3. Auto-file to FinCEN when all parties complete
4. Wire up existing notifications + add missing ones
5. Staff sees everything (review only, no intervention required)

---

## PHASE 1: Database Schema Updates

### 1.1 Report Model Changes

**File:** `api/app/models/report.py`

Add fields to track the originating user and enable auto-filing:
```python
# Add these columns to Report model

# Who initiated this report (escrow officer)
initiated_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

# Auto-file configuration
auto_file_enabled = Column(Boolean, default=True, nullable=False)
auto_filed_at = Column(DateTime, nullable=True)  # When auto-file was triggered

# Notification preferences (JSON for flexibility)
notification_config = Column(JSONB, default=lambda: {
    "notify_initiator": True,
    "notify_company_admin": True,
    "notify_staff": True,
    "notify_on_party_submit": True,
    "notify_on_filing_complete": True,
    "notify_on_filing_error": True
})
```

Add relationship:
```python
initiated_by = relationship("User", foreign_keys=[initiated_by_user_id])
```

### 1.2 Migration

**File:** `api/alembic/versions/YYYYMMDD_client_driven_flow.py`
```python
"""Client-driven flow: add initiated_by_user_id and auto_file fields

Revision ID: YYYYMMDD_client_driven
"""

def upgrade():
    op.add_column('reports', sa.Column('initiated_by_user_id', sa.UUID(), nullable=True))
    op.add_column('reports', sa.Column('auto_file_enabled', sa.Boolean(), server_default='true', nullable=False))
    op.add_column('reports', sa.Column('auto_filed_at', sa.DateTime(), nullable=True))
    op.add_column('reports', sa.Column('notification_config', sa.JSON(), nullable=True))
    
    op.create_foreign_key(
        'fk_reports_initiated_by_user',
        'reports', 'users',
        ['initiated_by_user_id'], ['id']
    )

def downgrade():
    op.drop_constraint('fk_reports_initiated_by_user', 'reports', type_='foreignkey')
    op.drop_column('reports', 'notification_config')
    op.drop_column('reports', 'auto_filed_at')
    op.drop_column('reports', 'auto_file_enabled')
    op.drop_column('reports', 'initiated_by_user_id')
```

---

## PHASE 2: Permission Changes

### 2.1 Client User Permissions

**File:** `api/app/middleware/permissions.py` (or wherever role checks happen)

Client users (`client_user`) should now be able to:
```python
CLIENT_USER_PERMISSIONS = [
    # Existing
    "submission_requests.create",
    "submission_requests.read_own_company",
    
    # NEW — Full wizard access
    "reports.create",                    # Start a new report
    "reports.read_own_company",          # View company's reports
    "reports.update_own",                # Update reports they created
    "reports.wizard_access",             # Access the wizard UI
    "reports.send_party_links",          # Send portal invitations
    "reports.file",                      # Trigger filing (manual or auto)
    
    # Party management
    "parties.create",                    # Add parties to report
    "parties.read_own_company",          # View party status
    "parties.resend_link",               # Resend portal links
]
```

### 2.2 Update Route Guards

**Files to update:**
- `api/app/routes/reports.py`
- `api/app/routes/parties.py`

For each endpoint, update the role check:
```python
# BEFORE
@router.post("/reports")
async def create_report(...):
    require_role(current_user, ["pct_staff", "pct_admin"])
    
# AFTER
@router.post("/reports")
async def create_report(...):
    require_role(current_user, ["pct_staff", "pct_admin", "client_admin", "client_user"])
    # Also set initiated_by_user_id = current_user.id
```

**Endpoints to update:**

| Endpoint | Old Roles | New Roles |
|----------|-----------|-----------|
| `POST /reports` | staff, admin | + client_admin, client_user |
| `PATCH /reports/{id}` | staff, admin | + client_* (own company only) |
| `POST /reports/{id}/party-links` | staff, admin | + client_* (own reports only) |
| `POST /reports/{id}/file` | staff, admin | + client_* (own reports only) |
| `GET /reports/{id}/wizard-data` | staff, admin | + client_* (own company only) |

**Important:** Add company ownership check for client roles:
```python
def require_report_access(user, report):
    """Ensure user can access this report."""
    if user.role in ["pct_staff", "pct_admin", "coo"]:
        return True  # Staff can access all
    if user.role in ["client_admin", "client_user"]:
        return report.company_id == user.company_id
    return False
```

---

## PHASE 3: New Client Entry Points

### 3.1 Client Wizard Entry Page

**File:** `web/app/(app)/app/reports/new/page.tsx` (NEW)

Create a new page for clients to start reports directly:
```tsx
// This replaces the old "submit request → staff queue → create report" flow

export default function NewReportPage() {
  // 1. Show transaction basics form (property, price, financing)
  // 2. On submit, create Report directly (not SubmissionRequest)
  // 3. Redirect to /app/reports/[id]/wizard
  
  const createReport = async (data: TransactionBasics) => {
    const response = await fetch('/api/reports', {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        // Report is created by client, not staff
        source: 'client_direct',
      }),
    });
    const report = await response.json();
    router.push(`/app/reports/${report.id}/wizard`);
  };
}
```

### 3.2 Update Navigation

**File:** `web/lib/navigation.ts`

Add wizard access for client roles:
```typescript
// Add to client navigation
{
  name: "New Report",
  href: "/app/reports/new",
  icon: PlusCircle,
  roles: ["client_admin", "client_user"],
},
{
  name: "My Reports", 
  href: "/app/reports",
  icon: FileText,
  roles: ["client_admin", "client_user"],
},
```

### 3.3 Client Reports List Page

**File:** `web/app/(app)/app/reports/page.tsx` (NEW or update existing)

Show the client's company reports with status:
```tsx
// Columns: Property | Status | Parties | Filing Status | Created | Actions
// Actions: Continue Wizard | View Details | Resend Links

// Filter to show only:
// - Reports where company_id matches user's company
// - OR reports where initiated_by_user_id matches current user (for client_user)
```

---

## PHASE 4: Auto-File on All Parties Complete

### 4.1 Update Party Submit Handler

**File:** `api/app/routes/parties.py`

When a party submits, check if all parties are complete and trigger auto-file:
```python
@router.post("/parties/{token}/submit")
async def submit_party_data(token: str, data: PartySubmitData, db: Session = Depends(get_db)):
    party = get_party_by_token(db, token)
    report = party.report
    
    # 1. Save party data (existing)
    party.party_data = data.dict()
    party.status = "submitted"
    party.submitted_at = datetime.utcnow()
    
    # 2. Sync to wizard_data (existing - Shark #57)
    sync_party_data_to_wizard(db, report)
    
    # 3. Send party confirmation email (existing)
    send_party_confirmation(party)
    
    # 4. Check if all parties complete
    all_parties = db.query(ReportParty).filter(ReportParty.report_id == report.id).all()
    all_complete = all(p.status == "submitted" for p in all_parties)
    
    # 5. Send notifications (NEW - wire up existing function)
    await send_party_submitted_notifications(
        db=db,
        report=report,
        party=party,
        all_complete=all_complete
    )
    
    # 6. Auto-file if all complete and enabled (NEW)
    if all_complete and report.auto_file_enabled:
        await trigger_auto_file(db, report)
    
    # 7. Log audit event
    log_event(db, "party.submitted", report_id=report.id, details={
        "party_id": str(party.id),
        "party_role": party.party_role,
        "all_complete": all_complete
    })
    
    return {"status": "submitted", "all_complete": all_complete}
```

### 4.2 Auto-File Function

**File:** `api/app/services/filing_lifecycle.py`

Add new function:
```python
async def trigger_auto_file(db: Session, report: Report) -> Tuple[str, Optional[FilingSubmission]]:
    """
    Automatically file a report to FinCEN when all parties have submitted.
    
    Returns: (status, submission)
    - status: "submitted", "needs_review", "error"
    """
    from app.services.party_data_sync import sync_party_data_to_wizard
    from app.services.fincen import build_rerx_xml
    
    # 1. Final sync of party data (safety net)
    sync_party_data_to_wizard(db, report)
    
    # 2. Update report status
    report.status = "ready_to_file"
    report.auto_filed_at = datetime.utcnow()
    db.commit()
    
    # 3. Run ready check
    ready_check = perform_ready_check(db, report.id)
    if not ready_check.is_ready:
        # Can't auto-file, needs review
        report.status = "needs_review"
        db.commit()
        
        await send_filing_needs_review_notification(
            db, report, 
            reason=f"Auto-file blocked: {ready_check.blocking_reasons}"
        )
        return ("needs_review", None)
    
    # 4. Attempt filing
    try:
        if settings.ENVIRONMENT == "production" and settings.FINCEN_TRANSPORT == "sdtm":
            status, submission = perform_sdtm_submit(db, report.id, ip_address="auto-file")
        else:
            status, submission = perform_mock_submit(db, report.id, ip_address="auto-file")
        
        # 5. Send appropriate notifications based on result
        if status == "submitted":
            await send_filing_submitted_notification(db, report)
        elif status == "needs_review":
            await send_filing_needs_review_notification(db, report, reason="Preflight validation failed")
        
        return (status, submission)
        
    except Exception as e:
        log.error(f"Auto-file failed for report {report.id}: {e}")
        await send_filing_error_notification(db, report, error=str(e))
        return ("error", None)
```

---

## PHASE 5: Notification System Overhaul

### 5.1 New Notification Functions

**File:** `api/app/services/email_service.py`

Add these new email functions:
```python
# ============================================================
# PARTY SUBMISSION NOTIFICATIONS (Wire up existing + expand)
# ============================================================

async def send_party_submitted_notifications(
    db: Session,
    report: Report,
    party: ReportParty,
    all_complete: bool
):
    """
    Send notifications when a party submits their portal form.
    Notifies: Escrow officer, Staff, and optionally Client Admin.
    """
    config = report.notification_config or {}
    property_address = _get_property_address(report)
    
    # 1. Notify the escrow officer who initiated the report
    if config.get("notify_initiator", True) and report.initiated_by:
        await send_email(
            to_email=report.initiated_by.email,
            subject=f"Party Submitted: {party.display_name}" if not all_complete 
                    else f"✅ All Parties Complete: {property_address}",
            html=get_party_submitted_html(
                recipient_name=report.initiated_by.name,
                party_name=party.display_name,
                party_role=party.party_role,
                property_address=property_address,
                all_complete=all_complete,
                report_url=f"{settings.FRONTEND_URL}/app/reports/{report.id}/wizard"
            )
        )
    
    # 2. Notify staff (existing function, now actually called)
    if config.get("notify_staff", True):
        staff_email = settings.STAFF_NOTIFICATION_EMAIL or "staff@fincenclear.com"
        send_party_submitted_notification(
            staff_email=staff_email,
            party_name=party.display_name,
            party_role=party.party_role,
            report_id=str(report.id),
            all_complete=all_complete
        )
    
    # 3. Notify client admin if different from initiator
    if config.get("notify_company_admin", True):
        company_admin = _get_company_admin(db, report.company_id)
        if company_admin and company_admin.id != report.initiated_by_user_id:
            await send_email(
                to_email=company_admin.email,
                subject=f"Party Update: {property_address}",
                html=get_party_submitted_html(
                    recipient_name=company_admin.name,
                    party_name=party.display_name,
                    party_role=party.party_role,
                    property_address=property_address,
                    all_complete=all_complete,
                    report_url=f"{settings.FRONTEND_URL}/app/reports/{report.id}"
                )
            )
    
    # 4. Log notification event
    log_notification(db, report.id, "party_submitted", {
        "party_id": str(party.id),
        "party_name": party.display_name,
        "all_complete": all_complete
    })


# ============================================================
# FILING STATUS NOTIFICATIONS (New)
# ============================================================

async def send_filing_submitted_notification(db: Session, report: Report):
    """Notify when filing is submitted to FinCEN (pending acceptance)."""
    property_address = _get_property_address(report)
    
    # Notify escrow officer
    if report.initiated_by:
        await send_email(
            to_email=report.initiated_by.email,
            subject=f"Filing Submitted to FinCEN: {property_address}",
            html=get_filing_submitted_html(
                recipient_name=report.initiated_by.name,
                property_address=property_address,
                submitted_at=datetime.utcnow(),
                report_url=f"{settings.FRONTEND_URL}/app/reports/{report.id}"
            )
        )
    
    log_notification(db, report.id, "filing_submitted", {
        "submitted_at": datetime.utcnow().isoformat()
    })


async def send_filing_accepted_notification(db: Session, report: Report, bsa_id: str):
    """Notify when filing is accepted by FinCEN with BSA ID."""
    property_address = _get_property_address(report)
    
    # 1. Notify escrow officer (primary)
    if report.initiated_by:
        await send_email(
            to_email=report.initiated_by.email,
            subject=f"✅ FinCEN Filing Complete: {property_address}",
            html=get_filing_accepted_html(
                recipient_name=report.initiated_by.name,
                property_address=property_address,
                bsa_id=bsa_id,
                filed_at=report.filed_at,
                report_url=f"{settings.FRONTEND_URL}/app/reports/{report.id}"
            )
        )
    
    # 2. Notify client admin (CC)
    company_admin = _get_company_admin(db, report.company_id)
    if company_admin and company_admin.id != report.initiated_by_user_id:
        await send_email(
            to_email=company_admin.email,
            subject=f"✅ FinCEN Filing Complete: {property_address}",
            html=get_filing_accepted_html(
                recipient_name=company_admin.name,
                property_address=property_address,
                bsa_id=bsa_id,
                filed_at=report.filed_at,
                report_url=f"{settings.FRONTEND_URL}/app/reports/{report.id}"
            )
        )
    
    # 3. Notify staff (digest or immediate based on config)
    await send_email(
        to_email=settings.STAFF_NOTIFICATION_EMAIL,
        subject=f"Filing Accepted: {property_address} — BSA ID: {bsa_id}",
        html=get_filing_accepted_staff_html(
            property_address=property_address,
            bsa_id=bsa_id,
            company_name=report.company.name,
            report_url=f"{settings.FRONTEND_URL}/app/admin/reports/{report.id}"
        )
    )
    
    log_notification(db, report.id, "filing_accepted", {
        "bsa_id": bsa_id,
        "filed_at": report.filed_at.isoformat() if report.filed_at else None
    })


async def send_filing_rejected_notification(db: Session, report: Report, code: str, message: str):
    """Notify when filing is rejected by FinCEN — URGENT."""
    property_address = _get_property_address(report)
    
    # 1. Notify escrow officer (primary — they need to fix this)
    if report.initiated_by:
        await send_email(
            to_email=report.initiated_by.email,
            subject=f"⚠️ Action Required: FinCEN Filing Rejected — {property_address}",
            html=get_filing_rejected_html(
                recipient_name=report.initiated_by.name,
                property_address=property_address,
                rejection_code=code,
                rejection_message=message,
                report_url=f"{settings.FRONTEND_URL}/app/reports/{report.id}/wizard"
            )
        )
    
    # 2. Notify staff immediately
    await send_email(
        to_email=settings.STAFF_NOTIFICATION_EMAIL,
        subject=f"🚨 Filing Rejected: {property_address} — Code: {code}",
        html=get_filing_rejected_staff_html(
            property_address=property_address,
            company_name=report.company.name,
            rejection_code=code,
            rejection_message=message,
            report_url=f"{settings.FRONTEND_URL}/app/admin/reports/{report.id}"
        )
    )
    
    # 3. Notify admin
    await send_email(
        to_email=settings.ADMIN_NOTIFICATION_EMAIL,
        subject=f"🚨 Filing Rejected: {property_address}",
        html=get_filing_rejected_staff_html(
            property_address=property_address,
            company_name=report.company.name,
            rejection_code=code,
            rejection_message=message,
            report_url=f"{settings.FRONTEND_URL}/app/admin/reports/{report.id}"
        )
    )
    
    log_notification(db, report.id, "filing_rejected", {
        "code": code,
        "message": message
    })


async def send_filing_needs_review_notification(db: Session, report: Report, reason: str):
    """Notify when filing needs manual review."""
    property_address = _get_property_address(report)
    
    # Similar pattern to rejected, but less urgent tone
    # Notify: escrow officer, staff, admin
    # Subject: "Review Required: FinCEN Filing — {property_address}"
    
    # ... implement similar to rejected but with "needs_review" type
    pass


# ============================================================
# EMAIL TEMPLATES (HTML)
# ============================================================

def get_filing_submitted_html(recipient_name: str, property_address: str, 
                               submitted_at: datetime, report_url: str) -> str:
    """HTML template for filing submitted notification."""
    return f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1e40af;">Filing Submitted to FinCEN</h2>
        
        <p>Hi {recipient_name},</p>
        
        <p>Your FinCEN Real Estate Report has been submitted for processing.</p>
        
        <div style="background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 16px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Property:</strong> {property_address}</p>
            <p style="margin: 8px 0 0;"><strong>Submitted:</strong> {submitted_at.strftime('%B %d, %Y at %I:%M %p')}</p>
            <p style="margin: 8px 0 0;"><strong>Status:</strong> Awaiting FinCEN Response</p>
        </div>
        
        <p>You'll receive another email once FinCEN processes your filing (typically within 24-48 hours).</p>
        
        <a href="{report_url}" style="display: inline-block; background: #2563eb; color: white; 
           padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">
            View Report Status
        </a>
        
        <p style="color: #6b7280; font-size: 14px; margin-top: 32px;">
            — The FinClear Team
        </p>
    </div>
    """


def get_filing_accepted_html(recipient_name: str, property_address: str,
                              bsa_id: str, filed_at: datetime, report_url: str) -> str:
    """HTML template for filing accepted notification."""
    return f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #059669;">✅ FinCEN Filing Complete</h2>
        
        <p>Hi {recipient_name},</p>
        
        <p>Great news! Your FinCEN Real Estate Report has been accepted.</p>
        
        <div style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 16px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Property:</strong> {property_address}</p>
            <p style="margin: 8px 0 0;"><strong>BSA ID:</strong> <code style="background: #d1fae5; padding: 2px 6px;">{bsa_id}</code></p>
            <p style="margin: 8px 0 0;"><strong>Filed:</strong> {filed_at.strftime('%B %d, %Y') if filed_at else 'N/A'}</p>
        </div>
        
        <p><strong>Save this BSA ID for your records.</strong> This is your official FinCEN receipt number.</p>
        
        <a href="{report_url}" style="display: inline-block; background: #059669; color: white; 
           padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">
            View Filing Details
        </a>
        
        <p style="color: #6b7280; font-size: 14px; margin-top: 32px;">
            This filing will be stored securely for 5 years per FinCEN requirements.<br>
            — The FinClear Team
        </p>
    </div>
    """


def get_filing_rejected_html(recipient_name: str, property_address: str,
                              rejection_code: str, rejection_message: str,
                              report_url: str) -> str:
    """HTML template for filing rejected notification."""
    return f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">⚠️ Action Required: Filing Rejected</h2>
        
        <p>Hi {recipient_name},</p>
        
        <p>Your FinCEN Real Estate Report was rejected and requires attention.</p>
        
        <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Property:</strong> {property_address}</p>
            <p style="margin: 8px 0 0;"><strong>Error Code:</strong> <code>{rejection_code}</code></p>
            <p style="margin: 8px 0 0;"><strong>Reason:</strong> {rejection_message}</p>
        </div>
        
        <p><strong>What to do:</strong></p>
        <ol>
            <li>Review the error details above</li>
            <li>Correct the information in the report</li>
            <li>Re-submit the filing</li>
        </ol>
        
        <a href="{report_url}" style="display: inline-block; background: #dc2626; color: white; 
           padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">
            Fix and Resubmit
        </a>
        
        <p style="color: #6b7280; font-size: 14px; margin-top: 32px;">
            Need help? Contact support@fincenclear.com<br>
            — The FinClear Team
        </p>
    </div>
    """
```

### 5.2 Wire Notifications into Filing Lifecycle

**File:** `api/app/services/filing_lifecycle.py`

Update `mark_accepted` and `mark_rejected` to send notifications:
```python
def mark_accepted(db: Session, report_id: UUID, receipt_id: str):
    """Mark filing as accepted and send notifications."""
    submission = get_submission(db, report_id)
    submission.status = "accepted"
    submission.receipt_id = receipt_id
    submission.accepted_at = datetime.utcnow()
    
    report = submission.report
    report.receipt_id = receipt_id
    report.filed_at = datetime.utcnow()
    report.filing_status = "filed_live"
    report.status = "filed"
    
    db.commit()
    
    # NEW: Send notifications
    asyncio.create_task(
        send_filing_accepted_notification(db, report, receipt_id)
    )
    
    log_event(db, "filing.accepted", report_id=report_id, details={"bsa_id": receipt_id})


def mark_rejected(db: Session, report_id: UUID, code: str, message: str):
    """Mark filing as rejected and send notifications."""
    submission = get_submission(db, report_id)
    submission.status = "rejected"
    submission.rejection_code = code
    submission.rejection_message = message
    submission.rejected_at = datetime.utcnow()
    
    report = submission.report
    report.filing_status = "rejected"
    
    db.commit()
    
    # NEW: Send notifications
    asyncio.create_task(
        send_filing_rejected_notification(db, report, code, message)
    )
    
    log_event(db, "filing.rejected", report_id=report_id, details={"code": code, "message": message})
```

---

## PHASE 6: Configuration Updates

### 6.1 New Environment Variables

**File:** `api/app/config.py`
```python
# Notification recipients
STAFF_NOTIFICATION_EMAIL: str = os.getenv("STAFF_NOTIFICATION_EMAIL", "staff@fincenclear.com")
ADMIN_NOTIFICATION_EMAIL: str = os.getenv("ADMIN_NOTIFICATION_EMAIL", "admin@fincenclear.com")
COO_NOTIFICATION_EMAIL: str = os.getenv("COO_NOTIFICATION_EMAIL", "")  # Optional

# Auto-file configuration
AUTO_FILE_ENABLED: bool = os.getenv("AUTO_FILE_ENABLED", "true").lower() == "true"
AUTO_FILE_DELAY_SECONDS: int = int(os.getenv("AUTO_FILE_DELAY_SECONDS", "0"))  # Optional delay
```

---

## PHASE 7: Frontend Updates

### 7.1 Update Wizard for Client Access

**File:** `web/app/(app)/app/reports/[id]/wizard/page.tsx`

Ensure wizard works for client users:
```tsx
// Remove staff-only restrictions
// Allow client_user and client_admin to access

// Update the filing button:
// - For clients: Show "Submit to FinCEN" (auto-file happens on party complete)
// - For staff: Show "File Now" (manual trigger)

// Add status messaging:
// - "Waiting for parties to complete" when collecting
// - "All parties complete — filing automatically" when auto-filing
// - "Filing in progress..." during submission
// - "Filed successfully — BSA ID: xxx" on completion
```

### 7.2 Client Dashboard Updates

**File:** `web/app/(app)/app/dashboard/page.tsx`

Add report tracking for clients:
```tsx
// Add section: "Your Active Reports"
// Show: Property | Status | Parties Complete | Filing Status
// Quick actions: Continue Wizard | View Details | Resend Links

// Add section: "Recent Filings" 
// Show: Property | BSA ID | Filed Date
// (Same as what COO sees, but filtered to their company)
```

### 7.3 Navigation Updates

**File:** `web/lib/navigation.ts`
```typescript
// For client_user and client_admin, add:
{
  name: "Start New Report",
  href: "/app/reports/new",
  icon: PlusCircle,
},
{
  name: "My Reports",
  href: "/app/reports",
  icon: FileText,
},

// Keep existing "Requests" for backward compatibility during transition
// Can be removed later once flow is proven
```

---

## PHASE 8: Staff Queue Transformation

### 8.1 Staff Queue Becomes Review Queue

**File:** `web/app/(app)/app/staff/queue/page.tsx`

Transform from "work queue" to "review queue":
```tsx
// BEFORE: Queue of requests waiting for staff to create reports
// AFTER: Queue of reports for QC review

// Show all reports across all companies with filters:
// - Status: All | Collecting | Ready to File | Filed | Needs Review
// - Filing Status: All | Pending | Submitted | Accepted | Rejected
// - Company: All | [Company dropdown]

// Columns:
// Property | Company | Escrow Officer | Status | Parties | Filing | Actions

// Actions:
// - View Details (always)
// - Review Data (when ready_to_file or needs_review)
// - NO "Create Report" — clients do this now

// Highlight:
// - Red badge for rejected filings
// - Yellow badge for needs_review
// - Green badge for filed
```

### 8.2 Staff Notification Preferences

Staff can configure what they want to be notified about:
```tsx
// Staff settings page or per-user preferences:
// [ ] Notify me when any party submits
// [x] Notify me when all parties complete (default on)
// [x] Notify me when filing is rejected (default on)
// [ ] Notify me when filing is accepted
```

---

## PHASE 9: Testing Checklist

### 9.1 Permission Tests
```python
# Test: client_user can create report
# Test: client_user can access wizard for own company's report
# Test: client_user CANNOT access other company's reports
# Test: client_user can send party links
# Test: client_user can trigger manual file (if auto-file disabled)
# Test: staff can view all reports (read-only review)
# Test: staff cannot modify client-created reports (optional restriction)
```

### 9.2 Auto-File Tests
```python
# Test: When last party submits, auto-file triggers
# Test: Auto-file respects auto_file_enabled flag
# Test: Auto-file runs ready_check before filing
# Test: Auto-file sends notifications on success
# Test: Auto-file sends notifications on failure
# Test: Auto-file logs audit events
```

### 9.3 Notification Tests
```python
# Test: Party submit → escrow officer notified
# Test: All parties complete → escrow officer notified with "all complete" flag
# Test: All parties complete → staff notified
# Test: Filing submitted → escrow officer notified
# Test: Filing accepted → escrow officer, client_admin, staff notified
# Test: Filing rejected → escrow officer, staff, admin notified (urgent)
# Test: Notification config respected (can disable specific notifications)
```

---

## PHASE 10: Documentation Updates

### 10.1 Update RRER-WIZARD-TECHNICAL-DOCUMENTATION.md

Add new section:
```markdown
## Client-Driven Flow (v2)

As of [DATE], the wizard supports client-driven operation:

### Who Can Do What

| Action | client_user | client_admin | staff | admin | coo |
|--------|-------------|--------------|-------|-------|-----|
| Start new report | ✅ | ✅ | ✅ | ✅ | ❌ |
| Run wizard | ✅ Own | ✅ Company | ✅ All | ✅ All | ❌ |
| Send party links | ✅ Own | ✅ Company | ✅ All | ✅ All | ❌ |
| Trigger filing | ✅ Own | ✅ Company | ✅ All | ✅ All | ❌ |
| Review all reports | ❌ | ❌ | ✅ | ✅ | ✅ |

### Auto-File Behavior

When the last party submits their portal form:
1. Party data syncs to wizard_data
2. Report status → ready_to_file
3. Ready check runs automatically
4. If ready: filing submitted to FinCEN
5. Notifications sent to all stakeholders

### Notification Matrix

[Include the full matrix from Part 3 of the investigation]
```

### 10.2 Update KilledSharks-2.md

Add Shark #58:
```markdown
### 58. Client-Driven Wizard Flow + Notification Overhaul ✅

**Date:** [DATE]

**Problem:** Staff queue was an unnecessary bottleneck. Escrow officers had all the information but had to wait for staff to re-enter it. Notifications existed but weren't wired up.

**Solution:** 
- Client users can now run the complete wizard end-to-end
- Auto-file triggers when all parties submit
- Notifications wired up across all roles
- Staff queue transformed to review-only

**Files Created:**
- `web/app/(app)/app/reports/new/page.tsx` — Client report entry
- `web/app/(app)/app/reports/page.tsx` — Client reports list
- Migration for `initiated_by_user_id`, `auto_file_enabled`

**Files Modified:**
- `api/app/routes/reports.py` — Permission updates
- `api/app/routes/parties.py` — Auto-file trigger, notification wiring
- `api/app/services/filing_lifecycle.py` — Auto-file function, notification calls
- `api/app/services/email_service.py` — New notification functions + templates
- `web/lib/navigation.ts` — Client navigation updates
- `web/app/(app)/app/staff/queue/page.tsx` — Transformed to review queue

**Status:** ✅ Killed (FLOW TRANSFORMATION SHARK 🦈🦈🦈)
```

---

## Execution Order

1. **Database migration** — Add new columns
2. **Permission updates** — Open wizard to client roles
3. **Auto-file logic** — Wire into party submit handler
4. **Notification functions** — Add new templates, wire existing
5. **Frontend: Client entry** — New report page, reports list
6. **Frontend: Navigation** — Add client routes
7. **Frontend: Staff queue** — Transform to review queue
8. **Testing** — Full flow test
9. **Documentation** — Update specs

---

## Rollback Plan

If issues arise:

1. Set `AUTO_FILE_ENABLED=false` in environment
2. Revert permission changes (client_user back to limited)
3. Staff queue continues to work as before
4. Notifications continue to log (just won't send new types)

The migration is additive (new columns only), so rollback doesn't require database changes.