# Admin API

> `api/app/routes/admin.py` (342 lines)
> Admin operations console for staff users.

## Overview

The admin API provides read-only access to reports, filings, and activity logs for staff monitoring. In the current demo phase, these endpoints are not protected by backend auth - the frontend handles session validation.

## Endpoints Overview

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| `GET` | `/admin/stats` | Dashboard statistics | Cookie |
| `GET` | `/admin/reports` | List all reports | Cookie |
| `GET` | `/admin/reports/{id}` | Report detail + audit | Cookie |
| `GET` | `/admin/filings` | List filing submissions | Cookie |
| `POST` | `/admin/reports/{id}/retry-filing` | Retry failed filing | Cookie |
| `GET` | `/admin/activity` | Recent audit log | Cookie |

---

## GET /admin/stats

Get aggregate dashboard statistics.

### Response (200)

```json
{
  "total_reports": 42,
  "reports_by_status": {
    "draft": 5,
    "determination_complete": 3,
    "collecting": 2,
    "awaiting_parties": 8,
    "ready_to_file": 4,
    "filed": 15,
    "exempt": 5
  },
  "filings_by_status": {
    "queued": 1,
    "submitted": 2,
    "accepted": 12,
    "rejected": 1,
    "needs_review": 1
  },
  "parties_pending": 12,
  "parties_submitted": 45,
  "recent_activity_count": 100
}
```

### Computed Values

```python
# Total reports
total = db.query(Report).count()

# Reports by status
by_status = db.query(Report.status, func.count())\
    .group_by(Report.status).all()

# Filings by status
filings = db.query(FilingSubmission.status, func.count())\
    .group_by(FilingSubmission.status).all()

# Pending parties
pending = db.query(ReportParty).filter(
    ReportParty.status != "submitted"
).count()
```

---

## GET /admin/reports

List reports with optional filtering.

### Query Parameters

| Param | Type | Description |
|-------|------|-------------|
| `status` | string | Filter by report status |
| `filing_status` | string | Filter by filing status |
| `limit` | int | Max results (default: 100) |
| `offset` | int | Pagination offset |

### Response (200)

```json
{
  "reports": [
    {
      "id": "uuid",
      "status": "filed",
      "property_address_text": "123 Main St, Los Angeles, CA 90001",
      "closing_date": "2026-02-15",
      "filing_deadline": "2026-03-17",
      "party_count": 3,
      "parties_submitted": 3,
      "filing_status": "accepted",
      "receipt_id": "RRER-2026-ABC12345",
      "created_at": "2026-02-01T10:00:00Z",
      "updated_at": "2026-02-10T12:00:00Z"
    }
  ],
  "total": 42
}
```

### Response Model

```python
class ReportSummary(BaseModel):
    id: str
    status: str
    property_address_text: Optional[str]
    closing_date: Optional[date]
    filing_deadline: Optional[date]
    party_count: int
    parties_submitted: int
    filing_status: Optional[str]
    receipt_id: Optional[str]
    created_at: datetime
    updated_at: datetime
```

---

## GET /admin/reports/{id}

Get detailed report with parties and audit log.

### Response (200)

```json
{
  "id": "uuid",
  "status": "filed",
  "property_address_text": "123 Main St, Los Angeles, CA 90001",
  "closing_date": "2026-02-15",
  "filing_deadline": "2026-03-17",
  "wizard_step": "file-report",
  "wizard_data": { ... },
  "determination": {
    "is_reportable": true,
    "reasoning": ["..."]
  },
  "parties": [
    {
      "id": "uuid",
      "party_role": "transferee",
      "entity_type": "llc",
      "display_name": "ABC Holdings LLC",
      "status": "submitted",
      "party_data": { ... }
    }
  ],
  "filing_submission": {
    "id": "uuid",
    "status": "accepted",
    "receipt_id": "RRER-2026-ABC12345",
    "attempts": 1,
    "created_at": "...",
    "updated_at": "..."
  },
  "audit_logs": [
    {
      "id": "uuid",
      "action": "report.created",
      "actor_type": "staff",
      "details": {},
      "ip_address": "127.0.0.1",
      "created_at": "2026-02-01T10:00:00Z"
    }
  ],
  "created_at": "...",
  "updated_at": "..."
}
```

---

## GET /admin/filings

List filing submissions with optional filtering.

### Query Parameters

| Param | Type | Description |
|-------|------|-------------|
| `status` | string | Filter by filing status |
| `limit` | int | Max results (default: 50) |
| `offset` | int | Pagination offset |

### Response (200)

```json
{
  "filings": [
    {
      "id": "uuid",
      "report_id": "uuid",
      "property_address": "123 Main St, Los Angeles, CA 90001",
      "status": "accepted",
      "receipt_id": "RRER-2026-ABC12345",
      "rejection_code": null,
      "rejection_message": null,
      "attempts": 1,
      "environment": "staging",
      "created_at": "2026-02-10T12:00:00Z",
      "updated_at": "2026-02-10T12:05:00Z"
    }
  ],
  "total": 15
}
```

### Response Model

```python
class FilingSubmissionSummary(BaseModel):
    id: str
    report_id: str
    property_address: Optional[str]
    status: str
    receipt_id: Optional[str]
    rejection_code: Optional[str]
    rejection_message: Optional[str]
    attempts: int
    environment: str
    created_at: datetime
    updated_at: datetime
```

---

## POST /admin/reports/{id}/retry-filing

Retry a failed or rejected filing.

### Request Body

None required

### Response (200) - Success

```json
{
  "ok": true,
  "report_id": "uuid",
  "status": "filed",
  "receipt_id": "RRER-2026-NEW123",
  "message": "Filing retried successfully",
  "is_demo": true
}
```

### Response (400) - Cannot Retry

```json
{
  "detail": "Filing cannot be retried in current status"
}
```

### Retry Eligibility

Filing can be retried if status is:
- `rejected`
- `needs_review`

Cannot retry if:
- `accepted` (already succeeded)
- `queued` or `submitted` (in progress)

### Audit Log

```json
{
  "action": "filing.retried",
  "actor_type": "staff",
  "details": {
    "previous_status": "rejected",
    "new_receipt_id": "RRER-2026-NEW123"
  }
}
```

---

## GET /admin/activity

Get recent audit log entries.

### Query Parameters

| Param | Type | Description |
|-------|------|-------------|
| `limit` | int | Max entries (default: 50, max: 200) |

### Response (200)

```json
{
  "activity": [
    {
      "id": "uuid",
      "action": "filing.accepted",
      "actor_type": "system",
      "report_id": "uuid",
      "property_address": "123 Main St, Los Angeles, CA 90001",
      "details": {
        "receipt_id": "RRER-2026-ABC12345"
      },
      "ip_address": null,
      "created_at": "2026-02-10T12:05:00Z"
    }
  ]
}
```

### Response Model

```python
class AuditLogEntry(BaseModel):
    id: str
    action: str
    actor_type: str
    report_id: Optional[str]
    property_address: Optional[str]
    details: dict
    ip_address: Optional[str]
    created_at: datetime
```

---

## Common Actions in Activity Log

| Action | Description |
|--------|-------------|
| `report.created` | New report created |
| `report.determination_completed` | Determination finished |
| `party.link_created` | Party portal link generated |
| `party.submitted` | Party submitted information |
| `filing.queued` | Filing queued for submission |
| `filing.submitted` | Filing sent to FinCEN |
| `filing.accepted` | FinCEN accepted filing |
| `filing.rejected` | FinCEN rejected filing |
| `filing.retried` | Staff retried filing |

---

## Related Files

- **Models:** `api/app/models/report.py`, `api/app/models/filing_submission.py`, `api/app/models/audit_log.py`
- **Services:** `api/app/services/filing_lifecycle.py`
- **Frontend:**
  - `web/app/(app)/app/admin/overview/page.tsx`
  - `web/app/(app)/app/admin/reports/page.tsx`
  - `web/app/(app)/app/admin/filings/page.tsx`
