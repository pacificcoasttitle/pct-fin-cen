# Parties API (Party Portal)

> `api/app/routes/parties.py` (213 lines)
> Token-based self-service endpoints for party data collection.

## Overview

The party portal allows transaction parties (buyers, sellers, beneficial owners) to submit their information via a secure, token-based link. No authentication required - the token IS the authentication.

## Endpoints Overview

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| `GET` | `/party/{token}` | Get party info (prefill) | Token |
| `POST` | `/party/{token}/save` | Autosave party data | Token |
| `POST` | `/party/{token}/submit` | Final submission | Token |

---

## GET /party/{token}

Get party information for prefilling the portal form.

### Path Parameters

| Param | Type | Description |
|-------|------|-------------|
| `token` | string | 64-char secure token |

### Response (200)

```json
{
  "party_id": "uuid",
  "role": "transferee",
  "entity_type": "llc",
  "party_data": {
    "legal_name": "ABC Holdings LLC",
    "tin": "12-3456789"
  },
  "status": "link_sent",
  "report_summary": {
    "property_address": "123 Main St, Los Angeles, CA 90001",
    "closing_date": "2026-02-15",
    "title_company": "Pacific Coast Title"
  },
  "is_submitted": false
}
```

### Response (404) - Invalid Token

```json
{
  "detail": "Party link not found or has expired"
}
```

### Token Validation

A token is valid if:
1. Token exists in `party_links` table
2. Status is `active`
3. `expires_at` is in the future

```python
def get_valid_link(token: str, db: Session) -> PartyLink | None:
    link = db.query(PartyLink).filter(
        PartyLink.token == token
    ).first()

    if not link:
        return None
    if link.status != "active":
        return None
    if link.expires_at < datetime.utcnow():
        return None

    return link
```

---

## POST /party/{token}/save

Autosave party data during form editing. Called frequently.

### Request Body

```json
{
  "party_data": {
    "legal_name": "ABC Holdings LLC",
    "tin": "12-3456789",
    "address": {
      "street": "456 Business Ave",
      "city": "San Francisco",
      "state": "CA",
      "zip": "94102"
    },
    "beneficial_owners": [
      {
        "first_name": "John",
        "last_name": "Smith",
        "ownership_percentage": 60
      }
    ]
  }
}
```

### Response (200)

```json
{
  "party_id": "uuid",
  "status": "in_progress",
  "updated_at": "2026-02-10T12:30:00Z"
}
```

### Response (404) - Invalid/Expired Token

```json
{
  "detail": "Party link not found or has expired"
}
```

### Response (409) - Already Submitted

```json
{
  "detail": "Party information has already been submitted"
}
```

### Side Effects

1. Updates `party_data` on `ReportParty`
2. Sets party status to `in_progress` (if not already)
3. Updates `updated_at` timestamp

### Notes

- Called with 1500ms debounce from frontend
- Does NOT create audit log (too frequent)
- Does NOT close the link

---

## POST /party/{token}/submit

Final submission of party data. Locks the link.

### Request Body

```json
{
  "party_data": {
    "legal_name": "ABC Holdings LLC",
    "tin": "12-3456789",
    "address": { ... },
    "beneficial_owners": [ ... ],
    "certification": {
      "agreed": true,
      "signature": "John Smith",
      "agreed_at": "2026-02-10T12:35:00Z"
    }
  }
}
```

### Response (200)

```json
{
  "party_id": "uuid",
  "status": "submitted",
  "submitted_at": "2026-02-10T12:35:00Z",
  "confirmation_id": "PARTY-ABC12345",
  "message": "Thank you! Your information has been submitted successfully."
}
```

### Response (404) - Invalid Token

```json
{
  "detail": "Party link not found or has expired"
}
```

### Response (409) - Already Submitted

```json
{
  "detail": "Party information has already been submitted"
}
```

### Side Effects

1. Updates `party_data` on `ReportParty`
2. Sets party status to `submitted`
3. Sets link status to `used`
4. Sets `submitted_at` on both party and link
5. Creates `NotificationEvent` for confirmation
6. Creates audit log entry

### Audit Log

```json
{
  "action": "party.submitted",
  "actor_type": "party",
  "details": {
    "party_id": "uuid",
    "party_role": "transferee"
  }
}
```

---

## Token Security

### Token Generation

```python
# In PartyLink model
@staticmethod
def generate_secure_token() -> str:
    return secrets.token_urlsafe(48)  # 64 chars
```

### Token Characteristics

- 64 characters, URL-safe
- Cryptographically random
- Cannot be guessed
- One-time use (status changes to `used` after submit)
- Expires after configurable period (default: 14 days)

### Token URL Format

```
https://app.example.com/p/{token}
```

---

## Error Handling

| Scenario | Status | Response |
|----------|--------|----------|
| Token not found | 404 | `"Party link not found or has expired"` |
| Token expired | 404 | `"Party link not found or has expired"` |
| Token revoked | 404 | `"Party link not found or has expired"` |
| Already submitted | 409 | `"Party information has already been submitted"` |
| Validation error | 422 | Pydantic validation details |

### Why 404 for all token issues?

Returns 404 (not 401/403) to prevent token enumeration attacks. An attacker cannot distinguish between:
- Token doesn't exist
- Token expired
- Token revoked

---

## Data Flow

```
┌─────────────┐     GET /party/{token}     ┌─────────────┐
│   Party     │ ─────────────────────────► │    API      │
│   Browser   │ ◄───────────────────────── │             │
│             │     Party data + context    │             │
│             │                            │             │
│             │     POST /party/{token}/save│             │
│             │ ─────────────────────────► │             │
│             │ ◄───────────────────────── │             │
│             │     Updated status          │             │
│             │                            │             │
│             │     POST /party/{token}/submit            │
│             │ ─────────────────────────► │             │
│             │ ◄───────────────────────── │             │
│             │     Confirmation ID         │             │
└─────────────┘                            └─────────────┘
```

---

## Related Files

- **Model:** `api/app/models/party_link.py`, `api/app/models/report_party.py`
- **Schema:** `api/app/schemas/party.py`
- **Services:** `api/app/services/notifications.py`
- **Frontend:** `web/app/p/[token]/page.tsx`
