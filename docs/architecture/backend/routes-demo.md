# Demo API

> `api/app/routes/demo.py` (245 lines)
> Demo/staging-only endpoints for testing and demos.

## Overview

The demo API provides utilities for resetting data, creating test reports, and controlling mock filing outcomes. These endpoints are **only available in staging** and require secret header authentication.

## Security

### Environment Gate

```python
if settings.environment != "staging":
    raise HTTPException(status_code=404)
```

### Secret Header

```python
# Required header
X-DEMO-SECRET: your-secret-here

# Validated against
DEMO_SECRET environment variable
```

### Why 404?

Returns 404 (not 401/403) to prevent endpoint discovery. An attacker cannot distinguish between:
- Endpoint doesn't exist
- Wrong environment
- Wrong secret

### Dependency

```python
def verify_demo_access(request: Request):
    settings = get_settings()

    # Must be staging
    if settings.environment != "staging":
        raise HTTPException(status_code=404)

    # Must have secret
    secret = request.headers.get("x-demo-secret")
    if not secret or secret != settings.demo_secret:
        raise HTTPException(status_code=404)

    return True
```

---

## Endpoints Overview

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/demo/reset` | Reset all data, re-seed |
| `POST` | `/demo/create-report` | Create single demo report |
| `GET` | `/demo/notifications` | List notification events |
| `POST` | `/demo/reports/{id}/set-filing-outcome` | Control filing behavior |

---

## POST /demo/reset

Reset all data and re-seed with demo reports.

### Request Headers

```
X-DEMO-SECRET: your-secret
```

### Response (200)

```json
{
  "ok": true,
  "message": "Demo data reset successfully",
  "reports_created": 6
}
```

### What Happens

1. Delete all data in FK-safe order:
   - `audit_logs`
   - `notification_events`
   - `filing_submissions`
   - `documents`
   - `party_links`
   - `report_parties`
   - `reports`

2. Create 6 demo reports:

| # | Type | Status | Description |
|---|------|--------|-------------|
| 1 | Exempt | `exempt` | Commercial property |
| 2 | Exempt | `exempt` | Conventional mortgage |
| 3 | Exempt | `exempt` | Government entity buyer |
| 4 | Reportable | `awaiting_parties` | Cash LLC buyer |
| 5 | Reportable | `awaiting_parties` | Trust buyer, partial |
| 6 | Reportable | `ready_to_file` | All parties submitted |

---

## POST /demo/create-report

Create a single demo report for quick testing.

### Request Headers

```
X-DEMO-SECRET: your-secret
```

### Request Body (Optional)

```json
{
  "status": "draft",
  "property_address": "456 Test Ave, San Diego, CA 92101"
}
```

### Response (200)

```json
{
  "ok": true,
  "report_id": "uuid",
  "status": "draft",
  "message": "Demo report created"
}
```

---

## GET /demo/notifications

List notification events (email outbox).

### Request Headers

```
X-DEMO-SECRET: your-secret
```

### Query Parameters

| Param | Type | Description |
|-------|------|-------------|
| `limit` | int | Max results (default: 50) |
| `type` | string | Filter by notification type |

### Response (200)

```json
{
  "notifications": [
    {
      "id": "uuid",
      "created_at": "2026-02-10T12:00:00Z",
      "type": "party_invite",
      "to_email": "buyer@example.com",
      "subject": "Action Required: Submit Your Information",
      "body_preview": "Please click the link below to submit...",
      "report_id": "uuid",
      "party_id": "uuid",
      "party_token": "abc123..."
    }
  ],
  "total": 15
}
```

### Notification Types

- `party_invite` - Portal invitation
- `party_submitted` - Submission confirmation
- `internal_alert` - Staff notification
- `filing_receipt` - Filing confirmation

---

## POST /demo/reports/{id}/set-filing-outcome

Control how the mock filing behaves for testing.

### Request Headers

```
X-DEMO-SECRET: your-secret
```

### Request Body

```json
{
  "outcome": "reject",
  "rejection_code": "INVALID_TIN",
  "rejection_message": "TIN does not match IRS records"
}
```

### Outcome Values

| Outcome | Description |
|---------|-------------|
| `accept` | Filing will be accepted |
| `reject` | Filing will be rejected |
| `needs_review` | Filing needs staff review |

### Response (200)

```json
{
  "ok": true,
  "report_id": "uuid",
  "demo_outcome": "reject",
  "message": "Demo outcome set. Next filing will be rejected."
}
```

### How It Works

1. Sets `demo_outcome` on `FilingSubmission` record
2. When `perform_mock_submit()` runs, it checks this field
3. If set, uses configured outcome instead of random
4. Clears after use (one-time setting)

### Use Cases

- Test rejection handling UI
- Test retry flow
- Demonstrate different filing outcomes in demo

---

## Demo Seed Data Details

### Report 1: Commercial Property (Exempt)

```python
{
    "status": "exempt",
    "property_address_text": "100 Business Plaza, Los Angeles, CA 90017",
    "wizard_data": {
        "property": {"type": "commercial"},  # Non-residential
    },
    "determination": {
        "is_reportable": False,
        "exemption_code": "NON_RESIDENTIAL",
        "exemption_reason": "Property is not residential"
    }
}
```

### Report 2: Conventional Mortgage (Exempt)

```python
{
    "status": "exempt",
    "property_address_text": "200 Family Home Ln, Pasadena, CA 91101",
    "wizard_data": {
        "financing": {"type": "conventional_mortgage"}
    },
    "determination": {
        "is_reportable": False,
        "exemption_code": "CONVENTIONAL_MORTGAGE"
    }
}
```

### Report 3: Government Buyer (Exempt)

```python
{
    "status": "exempt",
    "property_address_text": "300 Gov Purchase St, Sacramento, CA 95814",
    "wizard_data": {
        "transferee": {"entity_type": "government"}
    },
    "determination": {
        "is_reportable": False,
        "exemption_code": "GOVERNMENT_ENTITY"
    }
}
```

### Report 4: Cash LLC (Awaiting Parties)

```python
{
    "status": "awaiting_parties",
    "property_address_text": "400 Cash Deal Ave, San Francisco, CA 94102",
    "wizard_data": {
        "financing": {"type": "cash"},
        "transferee": {"entity_type": "llc"}
    },
    "determination": {"is_reportable": True},
    "parties": [
        {"role": "transferee", "status": "link_sent"},
        {"role": "transferor", "status": "pending"}
    ]
}
```

### Report 5: Trust (Partial Submission)

```python
{
    "status": "awaiting_parties",
    "property_address_text": "500 Trust Lane, Beverly Hills, CA 90210",
    "wizard_data": {
        "financing": {"type": "cash"},
        "transferee": {"entity_type": "trust"}
    },
    "parties": [
        {"role": "transferee", "status": "submitted"},
        {"role": "transferor", "status": "in_progress"}
    ]
}
```

### Report 6: Ready to File

```python
{
    "status": "ready_to_file",
    "property_address_text": "600 Complete Rd, Newport Beach, CA 92660",
    "wizard_data": {...},  # Complete data
    "parties": [
        {"role": "transferee", "status": "submitted"},
        {"role": "transferor", "status": "submitted"},
        {"role": "beneficial_owner", "status": "submitted"}
    ]
}
```

---

## Related Files

- **Service:** `api/app/services/demo_seed.py`
- **Config:** `api/app/config.py` (DEMO_SECRET)
- **Frontend:** `web/app/(app)/app/demo-tools/page.tsx`
