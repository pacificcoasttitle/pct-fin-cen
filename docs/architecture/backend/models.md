# Database Models

> SQLAlchemy ORM models for FinClear

## Entity Relationship Diagram

```
┌─────────────┐       ┌─────────────────┐       ┌─────────────┐
│   Report    │───────│  ReportParty    │───────│  PartyLink  │
│             │ 1   N │                 │ 1   N │             │
└─────────────┘       └─────────────────┘       └─────────────┘
      │                       │
      │ 1                     │ 1
      │ N                     │ N
      │                       │
┌─────────────┐       ┌─────────────────┐
│  AuditLog   │       │    Document     │
│             │       │                 │
└─────────────┘       └─────────────────┘
      │
      │
┌─────────────┐       ┌─────────────────┐
│FilingSubmit │       │NotificationEvent│
│   sion      │       │                 │
└─────────────┘       └─────────────────┘
```

---

## Report

> Core entity representing a FinCEN RRER filing

**File:** `api/app/models/report.py` (66 lines)

### Schema

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `status` | String(50) | Report status |
| `property_address_text` | String(500) | Property address |
| `closing_date` | Date | Transaction closing date |
| `filing_deadline` | Date | FinCEN filing deadline |
| `wizard_step` | String(50) | Current wizard step |
| `wizard_data` | JSONB | All wizard form data |
| `determination` | JSONB | Determination result |
| `filing_status` | String(50) | Filing status |
| `filed_at` | DateTime | Filing timestamp |
| `receipt_id` | String(100) | FinCEN receipt ID |
| `filing_payload` | JSONB | Submitted payload |
| `created_at` | DateTime | Created timestamp |
| `updated_at` | DateTime | Last update |

### Relationships

```python
parties = relationship("ReportParty", back_populates="report")
audit_logs = relationship("AuditLog", back_populates="report")
filing_submission = relationship("FilingSubmission", back_populates="report", uselist=False)
```

### Status Values

- `draft` - Initial state
- `determination_complete` - Determination finished
- `collecting` - Collection phase started
- `awaiting_parties` - Waiting for party submissions
- `ready_to_file` - Ready to submit to FinCEN
- `filed` - Submitted to FinCEN
- `exempt` - Determined not reportable
- `cancelled` - Cancelled

---

## ReportParty

> Parties involved in a transaction (transferees, transferors, beneficial owners)

**File:** `api/app/models/report_party.py` (75 lines)

### Schema

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `report_id` | UUID | FK to Report |
| `party_role` | String(50) | Role in transaction |
| `entity_type` | String(50) | Type of entity |
| `display_name` | String(200) | Display name |
| `party_data` | JSONB | All party information |
| `status` | String(50) | Collection status |
| `created_at` | DateTime | Created timestamp |
| `updated_at` | DateTime | Last update |

### Relationships

```python
report = relationship("Report", back_populates="parties")
links = relationship("PartyLink", back_populates="party")
documents = relationship("Document", back_populates="party")
```

### Party Roles

- `transferee` - Buyer
- `transferor` - Seller
- `beneficial_owner` - Entity owner (25%+)
- `reporting_person` - Filing submitter

### Entity Types

- `individual` - Natural person
- `llc` - Limited Liability Company
- `corporation` - Corporation
- `trust` - Trust
- `partnership` - Partnership
- `other` - Other entity

### Status Values

- `pending` - Created, no link sent
- `link_sent` - Portal link generated
- `in_progress` - Party started form
- `submitted` - Party submitted
- `verified` - Staff verified

---

## PartyLink

> Secure tokens for party portal access

**File:** `api/app/models/party_link.py` (76 lines)

### Schema

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `report_party_id` | UUID | FK to ReportParty |
| `token` | String(64) | URL-safe token (unique) |
| `expires_at` | DateTime | Expiration timestamp |
| `status` | String(50) | Link status |
| `created_at` | DateTime | Created timestamp |
| `submitted_at` | DateTime | Submission timestamp |

### Relationships

```python
party = relationship("ReportParty", back_populates="links")
```

### Methods

```python
@staticmethod
def generate_secure_token() -> str:
    """Generate 64-char URL-safe token"""
    return secrets.token_urlsafe(48)

@property
def is_valid(self) -> bool:
    """Check if link is usable"""
    return (
        self.status == "active" and
        self.expires_at > datetime.utcnow()
    )
```

### Status Values

- `active` - Can be used
- `used` - Has been submitted
- `expired` - Past expiration
- `revoked` - Manually invalidated

---

## Document

> Uploaded files (ID documents, etc.)

**File:** `api/app/models/document.py` (53 lines)

### Schema

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `report_party_id` | UUID | FK to ReportParty |
| `document_type` | String(50) | Type of document |
| `file_url` | String(500) | Storage URL |
| `file_name` | String(255) | Original filename |
| `mime_type` | String(100) | MIME type |
| `size_bytes` | Integer | File size |
| `uploaded_at` | DateTime | Upload timestamp |
| `verified_at` | DateTime | Verification timestamp |

### Relationships

```python
party = relationship("ReportParty", back_populates="documents")
```

### Document Types

- `drivers_license`
- `passport`
- `state_id`
- `other`

---

## FilingSubmission

> Filing lifecycle tracking

**File:** `api/app/models/filing_submission.py` (101 lines)

### Schema

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `report_id` | UUID | FK to Report (unique) |
| `environment` | String(20) | staging / prod |
| `status` | String(50) | Filing status |
| `receipt_id` | String(100) | FinCEN receipt |
| `rejection_code` | String(50) | Rejection code |
| `rejection_message` | Text | Rejection details |
| `demo_outcome` | String(20) | Demo outcome setting |
| `demo_rejection_code` | String(50) | Demo rejection code |
| `demo_rejection_message` | String(500) | Demo rejection message |
| `payload_snapshot` | JSONB | Submitted data |
| `attempts` | Integer | Submission attempts |
| `created_at` | DateTime | Created timestamp |
| `updated_at` | DateTime | Last update |

### Relationships

```python
report = relationship("Report", back_populates="filing_submission")
```

### Methods

```python
def to_dict(self) -> dict:
    """Convert to API response format"""
```

### Status Values

- `not_started` - Not yet initiated
- `queued` - Queued for submission
- `submitted` - Sent to FinCEN
- `accepted` - FinCEN accepted
- `rejected` - FinCEN rejected
- `needs_review` - Needs staff review

---

## AuditLog

> Compliance audit trail (5-year retention)

**File:** `api/app/models/audit_log.py` (70 lines)

### Schema

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `report_id` | UUID | FK to Report (nullable) |
| `actor_type` | String(50) | Actor category |
| `actor_user_id` | UUID | User ID (nullable) |
| `action` | String(100) | Action performed (indexed) |
| `details` | JSONB | Action details |
| `ip_address` | String(45) | Client IP |
| `created_at` | DateTime | Timestamp |

### Relationships

```python
report = relationship("Report", back_populates="audit_logs")
```

### Actor Types

- `system` - Automated action
- `staff` - Staff user
- `party` - Party portal user
- `api` - External API

### Common Actions

- `report.created`
- `report.determination_completed`
- `party.link_created`
- `party.submitted`
- `filing.queued`
- `filing.accepted`
- `filing.rejected`

---

## NotificationEvent

> Email outbox (demo - no actual sending)

**File:** `api/app/models/notification_event.py` (75 lines)

### Schema

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `created_at` | DateTime | Timestamp (indexed) |
| `report_id` | UUID | Related report |
| `party_id` | UUID | Related party |
| `party_token` | String(64) | Party link token |
| `type` | String(50) | Notification type |
| `to_email` | String(255) | Recipient email |
| `subject` | String(255) | Email subject |
| `body_preview` | String(500) | Body preview |
| `meta` | JSONB | Additional data |

### Methods

```python
def to_dict(self) -> dict:
    """Convert to API response format"""
```

### Notification Types

- `party_invite` - Portal invitation
- `party_submitted` - Submission confirmation
- `internal_alert` - Staff notification
- `filing_receipt` - Filing confirmation

---

## JSONB Compatibility

All JSONB columns use `JSONBType` from `db_types.py`:

```python
from app.db_types import JSONBType

class Report(Base):
    wizard_data = Column(JSONBType, default=dict)
```

This automatically uses:
- `JSONB` on PostgreSQL
- `JSON` on SQLite

---

## Migration Commands

```bash
# Create new migration
alembic revision --autogenerate -m "add_new_field"

# Apply migrations
alembic upgrade head

# Rollback one step
alembic downgrade -1

# View current version
alembic current
```
