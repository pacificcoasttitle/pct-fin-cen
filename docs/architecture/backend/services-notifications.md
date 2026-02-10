# Notifications Service

> `api/app/services/notifications.py` (121 lines)
> Email outbox pattern for notification management.

## Overview

The notifications service implements an outbox pattern for managing email notifications. In demo mode, notifications are logged but not sent. In production, a worker will process the outbox and send via SendGrid.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    APPLICATION                               │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Reports   │  │   Parties   │  │   Filing    │         │
│  │   Service   │  │   Service   │  │   Service   │         │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘         │
│         │                │                │                 │
│         └────────────────┼────────────────┘                 │
│                          │                                  │
│                          ▼                                  │
│             ┌────────────────────────┐                     │
│             │  log_notification()    │                     │
│             │                        │                     │
│             │  NotificationEvent     │                     │
│             │  (Database Outbox)     │                     │
│             └────────────────────────┘                     │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
         ┌─────────────────────────────────────┐
         │           WORKER (Future)           │
         │                                     │
         │  Poll outbox → Send via SendGrid   │
         │  Mark as sent/failed               │
         └─────────────────────────────────────┘
```

---

## NotificationEvent Model

```python
class NotificationEvent(Base):
    id = Column(UUID)
    created_at = Column(DateTime, index=True)
    report_id = Column(UUID)
    party_id = Column(UUID)
    party_token = Column(String(64))
    type = Column(String(50))        # party_invite, etc.
    to_email = Column(String(255))
    subject = Column(String(255))
    body_preview = Column(String(500))
    meta = Column(JSONB)             # Additional data
```

---

## Notification Types

| Type | Description | Triggered By |
|------|-------------|--------------|
| `party_invite` | Portal link invitation | Creating party links |
| `party_submitted` | Submission confirmation | Party submits data |
| `internal_alert` | Staff notification | Various events |
| `filing_receipt` | Filing confirmation | Successful filing |

---

## Main Functions

### log_notification()

Create a new notification event in the outbox.

```python
def log_notification(
    db: Session,
    notification_type: str,
    to_email: str,
    subject: str,
    body_preview: str,
    report_id: str = None,
    party_id: str = None,
    party_token: str = None,
    meta: dict = None
) -> NotificationEvent:
    """
    Creates NotificationEvent record.
    In demo mode, notification is logged but not sent.
    In production, worker will pick up and send.
    """
```

### list_notifications()

Query notifications with optional filtering.

```python
def list_notifications(
    db: Session,
    limit: int = 50,
    notification_type: str = None
) -> list[NotificationEvent]:
    """
    Returns notifications, newest first.
    Optionally filter by type.
    """
```

### get_notification()

Get single notification by ID.

```python
def get_notification(
    db: Session,
    notification_id: str
) -> NotificationEvent | None:
    """Returns notification or None."""
```

### delete_all_notifications()

Clear all notifications (demo reset).

```python
def delete_all_notifications(db: Session) -> int:
    """
    Deletes all notification events.
    Returns count deleted.
    Used by demo reset endpoint.
    """
```

---

## Usage Examples

### Party Invitation

```python
# When creating party links
log_notification(
    db=db,
    notification_type="party_invite",
    to_email="buyer@example.com",
    subject="Action Required: Submit Your Information",
    body_preview="Please click the link below to submit your information for the real estate transaction at 123 Main St...",
    report_id=str(report.id),
    party_id=str(party.id),
    party_token=link.token,
    meta={
        "property_address": report.property_address_text,
        "link_url": f"{APP_BASE_URL}/p/{link.token}",
        "expires_at": link.expires_at.isoformat()
    }
)
```

### Party Submitted

```python
# When party submits
log_notification(
    db=db,
    notification_type="party_submitted",
    to_email="buyer@example.com",
    subject="Submission Confirmed",
    body_preview="Thank you for submitting your information. Your confirmation ID is...",
    report_id=str(report.id),
    party_id=str(party.id),
    meta={
        "confirmation_id": f"PARTY-{party.id[:8].upper()}"
    }
)
```

### Filing Receipt

```python
# When filing accepted
log_notification(
    db=db,
    notification_type="filing_receipt",
    to_email="escrow@titlecompany.com",
    subject="FinCEN Filing Accepted",
    body_preview="Your FinCEN RRER filing has been accepted. Receipt ID: RRER-2026-ABC12345",
    report_id=str(report.id),
    meta={
        "receipt_id": submission.receipt_id,
        "property_address": report.property_address_text
    }
)
```

---

## Email Templates (Planned)

### Party Invitation

```
Subject: Action Required: Submit Your Information

Dear [Name],

You are required to submit information for a real estate transaction.

Property: [Address]
Closing Date: [Date]

Please click the link below to access the secure submission portal:
[Link]

This link expires on [Date].

Thank you,
[Title Company]
```

### Party Submitted

```
Subject: Submission Confirmed

Dear [Name],

Thank you for submitting your information for the transaction at:
[Address]

Your confirmation ID is: [ID]

If you need to make corrections, please contact [Title Company].

Thank you.
```

### Filing Receipt

```
Subject: FinCEN Filing Accepted

Your FinCEN RRER filing has been accepted.

Receipt ID: [ID]
Property: [Address]
Filed: [Date/Time]

Please retain this receipt for your records.
```

---

## Production Integration (Planned)

### SendGrid Worker

```python
# Future implementation
async def process_outbox():
    """
    1. Query unprocessed notifications
    2. For each notification:
       a. Render template with meta data
       b. Send via SendGrid API
       c. Mark as sent (add sent_at column)
       d. On failure, mark for retry
    """
```

### Additional Fields (Future)

```python
# To be added to NotificationEvent
sent_at = Column(DateTime)        # When actually sent
delivery_status = Column(String)  # pending, sent, failed, bounced
sendgrid_id = Column(String)      # SendGrid message ID
retry_count = Column(Integer)     # Retry attempts
```

---

## Demo Endpoints

### View Notifications

```
GET /demo/notifications
X-DEMO-SECRET: your-secret

Response:
{
    "notifications": [
        {
            "id": "uuid",
            "type": "party_invite",
            "to_email": "buyer@example.com",
            "subject": "...",
            "body_preview": "...",
            "created_at": "..."
        }
    ]
}
```

---

## Related Files

- **Model:** `api/app/models/notification_event.py`
- **Routes:**
  - `api/app/routes/demo.py` → view notifications
  - `api/app/routes/reports.py` → triggers notifications
  - `api/app/routes/parties.py` → triggers notifications
- **Frontend:** `web/app/(app)/app/admin/notifications/page.tsx`
