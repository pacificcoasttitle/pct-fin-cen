# CURSOR PROMPT: Full Platform Traceability Audit & Wiring

## 🎯 MISSION

Audit and ensure EVERY feature in the PCT FinCEN platform is traceable and visible across ALL user roles. If we collect it, process it, or change it - every stakeholder who needs to see it MUST be able to see it.

**Principle: Nothing happens in the dark. Every action leaves a trail.**

---

## THE ROLE HIERARCHY

```
┌─────────────────────────────────────────────────────────────────┐
│                        EXECUTIVE                                 │
│         (Company leadership, compliance officers)                │
│    Sees: Aggregate stats, trends, compliance metrics            │
├─────────────────────────────────────────────────────────────────┤
│                          ADMIN                                   │
│              (Platform administrators)                           │
│    Sees: Everything - full detail, audit trails, all data       │
├─────────────────────────────────────────────────────────────────┤
│                          STAFF                                   │
│           (Title company employees)                              │
│    Sees: Their queue, report details, party data                │
├─────────────────────────────────────────────────────────────────┤
│                         CLIENT                                   │
│        (Title company submitting requests)                       │
│    Sees: Their submissions, status, party progress              │
├─────────────────────────────────────────────────────────────────┤
│                          PARTY                                   │
│      (Buyers, sellers via portal links)                         │
│    Sees: Only their own form, their own documents               │
└─────────────────────────────────────────────────────────────────┘
```

---

## FEATURE-BY-FEATURE TRACEABILITY MATRIX

### 1. SUBMISSION REQUESTS

| Data Point | Party | Client | Staff | Admin | Executive |
|------------|-------|--------|-------|-------|-----------|
| Property Address | ❌ | ✅ View | ✅ View | ✅ View | ❌ |
| Purchase Price | ❌ | ✅ View | ✅ View | ✅ View | ✅ Aggregate |
| Buyer Name/Type | ❌ | ✅ View | ✅ View | ✅ View | ❌ |
| Submission Status | ❌ | ✅ View | ✅ View | ✅ View/Filter | ✅ Counts |
| Created Timestamp | ❌ | ✅ View | ✅ View | ✅ View/Sort | ✅ Trends |
| Last Updated | ❌ | ✅ View | ✅ View | ✅ View/Sort | ❌ |
| Escrow Number | ❌ | ✅ View | ✅ View | ✅ Search | ❌ |

**Audit Events Required:**
- `submission_created`
- `submission_updated`
- `submission_status_changed`

---

### 2. DETERMINATION (Exempt vs Reportable)

| Data Point | Party | Client | Staff | Admin | Executive |
|------------|-------|--------|-------|-------|-----------|
| Determination Result | ❌ | ✅ View | ✅ View/Filter | ✅ View/Filter | ✅ Rates |
| Exemption Reasons | ❌ | ✅ View | ✅ View | ✅ View | ✅ Breakdown |
| Determination Method | ❌ | ❌ | ✅ View | ✅ View/Filter | ✅ Counts |
| Determination Timestamp | ❌ | ✅ View | ✅ View | ✅ View/Sort | ✅ Trends |
| Certificate ID | ❌ | ✅ View | ❌ | ✅ Search | ❌ |
| Original Form Answers | ❌ | ❌ | ❌ | ✅ View | ❌ |

**Audit Events Required:**
- `determination_auto`
- `determination_manual`
- `determination_override`
- `exemption_certified`

---

### 3. REPORTS (FinCEN RRER)

| Data Point | Party | Client | Staff | Admin | Executive |
|------------|-------|--------|-------|-------|-----------|
| Report ID | ❌ | ❌ | ✅ View | ✅ View | ❌ |
| Report Status | ❌ | ✅ Summary | ✅ View/Filter | ✅ View/Filter | ✅ Counts |
| Wizard Progress | ❌ | ❌ | ✅ View | ✅ View | ❌ |
| Wizard Data (all steps) | ❌ | ❌ | ✅ View/Edit | ✅ View | ❌ |
| Ready Check Status | ❌ | ❌ | ✅ View | ✅ View | ✅ Counts |
| Created/Updated | ❌ | ❌ | ✅ View | ✅ View/Sort | ✅ Trends |

**Audit Events Required:**
- `report_created`
- `report_updated`
- `wizard_step_completed`
- `wizard_completed`
- `ready_check_passed`
- `ready_check_failed`

---

### 4. PARTIES (Buyers, Sellers, Transferees, Transferors)

| Data Point | Party | Client | Staff | Admin | Executive |
|------------|-------|--------|-------|-------|-----------|
| Party Role | ✅ View | ✅ View | ✅ View | ✅ View | ❌ |
| Party Type | ✅ View | ✅ View | ✅ View | ✅ View/Filter | ✅ Breakdown |
| Party Status | ✅ View | ✅ View | ✅ View | ✅ View/Filter | ✅ Counts |
| Display Name | ✅ View | ✅ View | ✅ View | ✅ View | ❌ |
| Completion % | ❌ | ✅ View | ✅ View | ✅ View | ✅ Average |
| EIN/SSN/TIN | ✅ Edit | ❌ Masked | ✅ Masked | ✅ View | ❌ |
| Beneficial Owners | ✅ Edit | ❌ Count | ✅ View | ✅ View | ✅ Counts |
| Trustees | ✅ Edit | ❌ Count | ✅ View | ✅ View | ✅ Counts |
| Payment Sources | ✅ Edit | ❌ | ✅ View | ✅ View | ✅ Totals |
| Validation Errors | ✅ View | ❌ | ✅ View | ✅ View | ✅ Counts |

**Audit Events Required:**
- `party_created`
- `party_updated`
- `party_data_saved`
- `party_submitted`
- `party_validation_failed`

---

### 5. PARTY LINKS

| Data Point | Party | Client | Staff | Admin | Executive |
|------------|-------|--------|-------|-------|-----------|
| Link Token | ✅ Use | ❌ | ✅ Generate | ✅ View | ❌ |
| Link Status | ❌ | ✅ View | ✅ View | ✅ View | ✅ Counts |
| Link Created | ❌ | ❌ | ✅ View | ✅ View | ❌ |
| Link Expires | ❌ | ❌ | ✅ View | ✅ View | ❌ |
| Link Opened At | ❌ | ❌ | ✅ View | ✅ View | ❌ |
| Link Submitted At | ❌ | ✅ View | ✅ View | ✅ View | ✅ Counts |
| Email Sent To | ❌ | ❌ | ✅ View | ✅ View | ❌ |

**Audit Events Required:**
- `party_link_created`
- `party_link_sent`
- `party_link_opened`
- `party_link_expired`
- `party_link_regenerated`

---

### 6. DOCUMENTS (ID Uploads)

| Data Point | Party | Client | Staff | Admin | Executive |
|------------|-------|--------|-------|-------|-----------|
| Document List | ✅ Own | ❌ Count | ✅ View | ✅ View | ✅ Counts |
| Document Type | ✅ Own | ❌ | ✅ View | ✅ View | ✅ Breakdown |
| Document Status | ✅ Own | ❌ | ✅ View | ✅ View/Filter | ✅ Counts |
| Original Filename | ✅ Own | ❌ | ✅ View | ✅ View | ❌ |
| Download URL | ✅ Own | ❌ | ✅ Access | ✅ Access | ❌ |
| Upload Timestamp | ✅ Own | ❌ | ✅ View | ✅ View/Sort | ❌ |
| File Size | ✅ Own | ❌ | ✅ View | ✅ View | ✅ Totals |
| Verification Status | ❌ | ❌ | ✅ View | ✅ View/Edit | ✅ Counts |

**Audit Events Required:**
- `document_upload_started`
- `document_uploaded`
- `document_verified`
- `document_rejected`
- `document_downloaded`
- `document_deleted`

---

### 7. FILING (FinCEN Submission)

| Data Point | Party | Client | Staff | Admin | Executive |
|------------|-------|--------|-------|-------|-----------|
| Filing Status | ❌ | ✅ Summary | ✅ View | ✅ View/Filter | ✅ Counts |
| Receipt ID | ❌ | ❌ | ✅ View | ✅ View/Search | ❌ |
| BSA ID | ❌ | ❌ | ✅ View | ✅ View/Search | ❌ |
| Filed Timestamp | ❌ | ✅ View | ✅ View | ✅ View/Sort | ✅ Trends |
| Filing Attempts | ❌ | ❌ | ✅ View | ✅ View | ✅ Average |
| Rejection Code | ❌ | ❌ | ✅ View | ✅ View/Filter | ✅ Breakdown |
| Rejection Message | ❌ | ❌ | ✅ View | ✅ View | ❌ |

**Audit Events Required:**
- `filing_queued`
- `filing_submitted`
- `filing_accepted`
- `filing_accepted_with_warnings`
- `filing_rejected`
- `filing_retry`
- `bsa_id_received`

---

### 8. NOTIFICATIONS

| Data Point | Party | Client | Staff | Admin | Executive |
|------------|-------|--------|-------|-------|-----------|
| Event Type | ❌ | ❌ | ✅ View | ✅ View/Filter | ✅ Counts |
| Event Message | ❌ | ❌ | ✅ View | ✅ View | ❌ |
| Event Timestamp | ❌ | ❌ | ✅ View | ✅ View/Sort | ✅ Trends |
| Related Entity | ❌ | ❌ | ✅ Link | ✅ Link | ❌ |
| Delivery Status | ❌ | ❌ | ❌ | ✅ View | ✅ Rates |

**Audit Events Required:**
- `notification_created`
- `notification_sent`
- `notification_delivered`
- `notification_failed`
- `notification_retried`

---

### 9. BILLING/INVOICES

| Data Point | Party | Client | Staff | Admin | Executive |
|------------|-------|--------|-------|-------|-----------|
| Invoice ID | ❌ | ✅ View | ❌ | ✅ View | ❌ |
| Invoice Amount | ❌ | ✅ View | ❌ | ✅ View | ✅ Totals |
| Invoice Status | ❌ | ✅ View | ❌ | ✅ View/Filter | ✅ Counts |
| Line Items | ❌ | ✅ View | ❌ | ✅ View | ❌ |
| Created Timestamp | ❌ | ✅ View | ❌ | ✅ View/Sort | ✅ Trends |
| Paid Timestamp | ❌ | ✅ View | ❌ | ✅ View | ✅ Trends |

**Audit Events Required:**
- `invoice_created`
- `invoice_sent`
- `invoice_viewed`
- `invoice_paid`
- `invoice_voided`

---

## IMPLEMENTATION CHECKLIST

### Phase 1: Audit Existing Features

For EACH feature above, verify:

- [ ] **Data is stored** - All data points exist in the model
- [ ] **API returns it** - Endpoints include the data in responses
- [ ] **UI displays it** - Each role's UI shows appropriate data
- [ ] **Filters work** - Admin can filter/search/sort
- [ ] **Audit logged** - Events are created for state changes

### Phase 2: Create Missing Components

#### Reusable Audit Components

```typescript
// web/components/audit/AuditTrailTable.tsx
// Shows chronological list of all events for an entity

interface AuditTrailTableProps {
  entityType: string;
  entityId: string;
  showActor?: boolean;
  showDetails?: boolean;
  limit?: number;
}

// web/components/audit/AuditEventBadge.tsx
// Color-coded badge for event types

// web/components/audit/AuditTimeline.tsx
// Visual timeline of events
```

#### Dashboard Stat Components

```typescript
// web/components/dashboard/StatCard.tsx
// Already exists - verify it shows trends

// web/components/dashboard/TrendChart.tsx
// Line chart for time-series data

// web/components/dashboard/BreakdownChart.tsx
// Pie/bar chart for categorical breakdowns

// web/components/dashboard/MetricComparison.tsx
// Compare current period to previous
```

#### Executive Dashboard

```typescript
// web/app/(app)/app/executive/page.tsx
// High-level metrics only

// Sections:
// - Submission volume (trend)
// - Determination breakdown (exempt vs reportable)
// - Filing success rate
// - Average completion time
// - Document upload stats
// - Revenue metrics (if billing enabled)
```

### Phase 3: Verify Role-Based Access

For EACH page, verify the role can only see what they should:

```typescript
// Middleware or page-level checks

// Client pages
/app/dashboard          → Client's submissions only
/app/requests           → Client's requests only
/app/requests/[id]      → Only if client owns it

// Staff pages
/app/staff/queue        → Assigned reports only (or company's)
/app/reports/[id]       → Only if staff has access

// Admin pages
/app/admin/*            → All data, full access

// Executive pages
/app/executive/*        → Aggregates only, no PII
```

### Phase 4: API Response Verification

Every API endpoint must return appropriate data for the caller's role:

```python
# Example: GET /submissions/{id}

def get_submission(id: str, current_user: User):
    submission = get_submission_by_id(id)
    
    if current_user.role == "party":
        raise HTTPException(403)  # Parties don't see submissions
    
    elif current_user.role == "client":
        # Only if they own it
        if submission.company_id != current_user.company_id:
            raise HTTPException(403)
        return SubmissionClientResponse(submission)  # Limited fields
    
    elif current_user.role == "staff":
        # Check assignment or company
        return SubmissionStaffResponse(submission)  # More fields
    
    elif current_user.role == "admin":
        return SubmissionAdminResponse(submission)  # All fields + audit
    
    elif current_user.role == "executive":
        raise HTTPException(403)  # Executives use aggregate endpoints
```

---

## AUDIT LOG IMPLEMENTATION

### AuditLog Model

```python
# api/app/models/audit_log.py

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    
    # What changed
    entity_type = Column(String(50), nullable=False, index=True)
    # submission_request, report, report_party, party_link, 
    # party_document, filing_submission, notification_event, invoice
    
    entity_id = Column(UUID, nullable=False, index=True)
    
    # What happened
    event_type = Column(String(100), nullable=False, index=True)
    
    # Who did it
    actor_id = Column(UUID, nullable=True)  # Null for system actions
    actor_type = Column(String(50), default="system")
    # system, user, staff, admin, party
    
    # Details
    details = Column(JSONB, default={})
    # Previous values, new values, metadata
    
    # When
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    # Indexes for common queries
    __table_args__ = (
        Index('ix_audit_entity', 'entity_type', 'entity_id'),
        Index('ix_audit_actor', 'actor_type', 'actor_id'),
        Index('ix_audit_event', 'event_type', 'created_at'),
    )
```

### Audit Helper Service

```python
# api/app/services/audit.py

def log_event(
    db: Session,
    entity_type: str,
    entity_id: str,
    event_type: str,
    actor_id: Optional[str] = None,
    actor_type: str = "system",
    details: Optional[dict] = None
):
    """Log an audit event."""
    event = AuditLog(
        entity_type=entity_type,
        entity_id=entity_id,
        event_type=event_type,
        actor_id=actor_id,
        actor_type=actor_type,
        details=details or {},
        created_at=datetime.utcnow()
    )
    db.add(event)
    # Don't commit - let caller manage transaction

def log_change(
    db: Session,
    entity_type: str,
    entity_id: str,
    event_type: str,
    old_values: dict,
    new_values: dict,
    actor_id: Optional[str] = None,
    actor_type: str = "user"
):
    """Log a change with before/after values."""
    log_event(
        db=db,
        entity_type=entity_type,
        entity_id=entity_id,
        event_type=event_type,
        actor_id=actor_id,
        actor_type=actor_type,
        details={
            "old": old_values,
            "new": new_values,
            "changed_fields": list(set(old_values.keys()) | set(new_values.keys()))
        }
    )
```

### Usage in Routes

```python
# Example: Update submission status

@router.patch("/submissions/{id}/status")
async def update_submission_status(
    id: str,
    request: StatusUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    submission = get_submission_or_404(db, id)
    old_status = submission.status
    
    submission.status = request.status
    submission.updated_at = datetime.utcnow()
    
    # Log the change
    log_change(
        db=db,
        entity_type="submission_request",
        entity_id=id,
        event_type="submission_status_changed",
        old_values={"status": old_status},
        new_values={"status": request.status},
        actor_id=str(current_user.id),
        actor_type=current_user.role
    )
    
    db.commit()
    return SubmissionResponse.from_orm(submission)
```

---

## VERIFICATION QUERIES

Run these to verify traceability is working:

```sql
-- 1. All audit events for a submission
SELECT * FROM audit_logs 
WHERE entity_type = 'submission_request' 
AND entity_id = '<submission_id>'
ORDER BY created_at;

-- 2. All events by a specific user
SELECT * FROM audit_logs
WHERE actor_id = '<user_id>'
ORDER BY created_at DESC
LIMIT 100;

-- 3. Event type breakdown (for executive dashboard)
SELECT event_type, COUNT(*) as count
FROM audit_logs
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY event_type
ORDER BY count DESC;

-- 4. Submission status flow
SELECT 
    entity_id,
    event_type,
    details->>'old'->>'status' as old_status,
    details->>'new'->>'status' as new_status,
    created_at
FROM audit_logs
WHERE entity_type = 'submission_request'
AND event_type = 'submission_status_changed'
ORDER BY entity_id, created_at;
```

---

## DELIVERABLES

After running this audit, deliver:

1. **Gap Report** - List any features missing visibility at any role level
2. **Audit Log Migration** - If AuditLog model doesn't exist, create it
3. **Event Logging** - Add `log_event()` calls to all state-changing operations
4. **UI Updates** - Add audit trail views where missing
5. **Executive Dashboard** - Create if doesn't exist
6. **API Response Updates** - Ensure role-appropriate data in all responses

---

## FINAL CHECKLIST

- [ ] Every CREATE operation logs an event
- [ ] Every UPDATE operation logs old + new values
- [ ] Every DELETE operation logs what was deleted
- [ ] Every STATUS CHANGE logs the transition
- [ ] Every FILE UPLOAD/DOWNLOAD logs the action
- [ ] Every EMAIL SENT logs delivery status
- [ ] Admin can see full audit trail for any entity
- [ ] Executive can see aggregate metrics for all event types
- [ ] No PII appears in executive views
- [ ] All timestamps are consistent (UTC)
- [ ] All entity references use UUIDs
- [ ] Audit logs are append-only (never deleted)

---

**This is the foundation of compliance. If it's not logged, it didn't happen.**
