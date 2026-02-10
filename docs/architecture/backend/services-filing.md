# Filing Service

> `api/app/services/filing.py` (83 lines) + `api/app/services/filing_lifecycle.py` (395 lines)
> Filing submission and lifecycle management.

## Overview

The filing service handles the complete lifecycle of submitting reports to FinCEN, from queuing through acceptance/rejection. In staging mode, it uses a mock provider. Production will use SDTM (Secure Data Transfer Mode) via SFTP.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    FILING LIFECYCLE                          │
│                                                              │
│  ┌─────────┐    ┌─────────┐    ┌──────────┐    ┌─────────┐ │
│  │  QUEUE  │ ──►│ SUBMIT  │ ──►│ RESPONSE │ ──►│ FINAL   │ │
│  │         │    │         │    │          │    │ STATE   │ │
│  └─────────┘    └─────────┘    └──────────┘    └─────────┘ │
│       │              │               │               │       │
│       ▼              ▼               ▼               ▼       │
│   queued        submitted       accepted/        accepted   │
│                                 rejected/        rejected   │
│                                 needs_review    needs_review│
└─────────────────────────────────────────────────────────────┘
                           │
            ┌──────────────┼──────────────┐
            │              │              │
     ┌──────────┐   ┌──────────┐   ┌──────────┐
     │  STAGING │   │   PROD   │   │  (Future)│
     │   Mock   │   │   SDTM   │   │   API    │
     └──────────┘   └──────────┘   └──────────┘
```

---

## Filing States

| State | Description |
|-------|-------------|
| `not_started` | Filing not initiated |
| `queued` | Queued for submission |
| `submitted` | Sent to FinCEN, awaiting response |
| `accepted` | FinCEN accepted the filing |
| `rejected` | FinCEN rejected with error code |
| `needs_review` | Requires staff review |

---

## FilingSubmission Model

```python
class FilingSubmission(Base):
    id = Column(UUID)
    report_id = Column(UUID, ForeignKey, unique=True)
    environment = Column(String)      # staging / prod
    status = Column(String)           # queued, submitted, etc.
    receipt_id = Column(String)       # RRER-YYYY-XXXXXXXX
    rejection_code = Column(String)   # Error code
    rejection_message = Column(Text)  # Error details
    demo_outcome = Column(String)     # Force outcome in demo
    demo_rejection_code = Column(String)
    demo_rejection_message = Column(String)
    payload_snapshot = Column(JSONB)  # What was submitted
    attempts = Column(Integer)        # Retry count
```

---

## Main Functions

### generate_receipt_id()

Creates deterministic receipt ID from report ID.

```python
def generate_receipt_id(report_id: str) -> str:
    """
    Format: RRER-YYYY-XXXXXXXX
    Uses MD5 hash of report_id for consistent results.
    """
    hash_input = f"{report_id}:receipt"
    hash_bytes = hashlib.md5(hash_input.encode()).hexdigest()[:8]
    year = datetime.utcnow().year
    return f"RRER-{year}-{hash_bytes.upper()}"
```

### get_or_create_submission()

Get existing or create new FilingSubmission.

```python
def get_or_create_submission(
    db: Session,
    report: Report,
    environment: str = "staging"
) -> FilingSubmission:
    """
    Returns existing FilingSubmission or creates new one.
    """
```

### enqueue_submission()

Queue a report for filing.

```python
def enqueue_submission(db: Session, report: Report) -> FilingSubmission:
    """
    Sets status to 'queued'.
    Stores payload snapshot.
    Creates audit log.
    """
```

### perform_mock_submit()

Execute mock submission for staging.

```python
def perform_mock_submit(
    db: Session,
    submission: FilingSubmission,
    ip_address: str
) -> FilingSubmission:
    """
    Simulates filing submission:
    1. Check for demo_outcome override
    2. If no override, randomly accept (95% chance)
    3. Update status and receipt_id
    4. Create audit log
    5. Log notification event
    """
```

### mark_accepted() / mark_rejected() / mark_needs_review()

State transition functions.

```python
def mark_accepted(db, submission, receipt_id, ip_address):
    """Set status to 'accepted' with receipt."""

def mark_rejected(db, submission, code, message, ip_address):
    """Set status to 'rejected' with error details."""

def mark_needs_review(db, submission, reason, ip_address):
    """Set status to 'needs_review' with reason."""
```

### retry_submission()

Retry a failed filing.

```python
def retry_submission(
    db: Session,
    submission: FilingSubmission,
    ip_address: str
) -> FilingSubmission:
    """
    Only if status is 'rejected' or 'needs_review'.
    Increments attempts counter.
    Re-runs submission logic.
    """
```

### set_demo_outcome()

Control mock filing behavior for testing.

```python
def set_demo_outcome(
    db: Session,
    submission: FilingSubmission,
    outcome: str,  # accept, reject, needs_review
    rejection_code: str = None,
    rejection_message: str = None
) -> FilingSubmission:
    """
    Sets demo_outcome field.
    Next perform_mock_submit() will use this outcome.
    """
```

---

## Mock Filing Provider

> `api/app/services/filing.py`

### MockFilingProvider

```python
class MockFilingProvider:
    def generate_confirmation_number(self) -> str:
        """RRER-YYYY-XXXXXXXX format"""

    def file_report(self, report_data: dict) -> dict:
        """
        Returns:
        {
            "success": True,
            "confirmation_number": "RRER-2026-ABC12345",
            "message": "Report filed successfully"
        }
        """

    def validate_for_filing(self, report_data: dict) -> tuple[bool, list[str]]:
        """
        Validates:
        - All required fields present
        - All parties submitted
        - Payment sources provided
        """
```

---

## Filing Flow (Staging)

```python
# 1. User clicks "File Report"
POST /reports/{id}/file

# 2. Ready check validation
ready_check = perform_ready_check(report)
if not ready_check.is_ready:
    raise HTTPException(400, "Not ready")

# 3. Get or create submission
submission = get_or_create_submission(db, report)

# 4. Execute mock filing
submission = perform_mock_submit(db, submission, ip_address)

# 5. Update report status
if submission.status == "accepted":
    report.status = "filed"
    report.filing_status = "accepted"
    report.receipt_id = submission.receipt_id
    report.filed_at = datetime.utcnow()
```

---

## Demo Outcome Override

For testing different scenarios:

```python
# Set up rejection
POST /demo/reports/{id}/set-filing-outcome
{
    "outcome": "reject",
    "rejection_code": "INVALID_TIN",
    "rejection_message": "TIN does not match IRS records"
}

# Next file attempt will reject
POST /reports/{id}/file
# Returns rejected status
```

---

## Production Filing (Planned)

### SDTM (Secure Data Transfer Mode)

1. **Transmit**: SFTP upload to BSA E-Filing server
2. **Acknowledge**: Poll `/acks` directory for response
3. **Parse**: Process MESSAGES.XML for status
4. **Update**: Store acceptance/rejection in database

### File Format

- One report per XML file
- Schema per FinCEN RRER specification
- Encrypted transmission via SFTP

### Status Flow

```
transmit → wait for MESSAGES.XML → parse response
    ↓
accepted: Store BSA ID
rejected: Store error code, enable retry
```

---

## Audit Trail

Every state change creates an audit log:

```python
# Filed
{
    "action": "filing.submitted",
    "details": {"receipt_id": "...", "environment": "staging"}
}

# Accepted
{
    "action": "filing.accepted",
    "details": {"receipt_id": "..."}
}

# Rejected
{
    "action": "filing.rejected",
    "details": {"code": "INVALID_TIN", "message": "..."}
}

# Retried
{
    "action": "filing.retried",
    "details": {"attempt": 2, "previous_status": "rejected"}
}
```

---

## Statistics

```python
def get_filing_stats(db: Session) -> dict:
    """
    Returns:
    {
        "queued": 5,
        "submitted": 3,
        "accepted": 42,
        "rejected": 2,
        "needs_review": 1
    }
    """
```

---

## Related Files

- **Routes:**
  - `api/app/routes/reports.py` → `file_report`
  - `api/app/routes/admin.py` → `retry_filing`
  - `api/app/routes/demo.py` → `set_filing_outcome`
- **Model:** `api/app/models/filing_submission.py`
- **Frontend:**
  - `web/components/rrer-questionnaire.tsx` → file-report step
  - `web/app/(app)/app/admin/filings/page.tsx`
