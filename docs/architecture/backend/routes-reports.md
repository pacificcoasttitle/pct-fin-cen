# Reports API

> `api/app/routes/reports.py` (532 lines)
> Handles report CRUD, wizard operations, party links, and filing.

## Endpoints Overview

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| `POST` | `/reports` | Create new report | Cookie |
| `GET` | `/reports` | List reports | Cookie |
| `GET` | `/reports/{id}` | Get report details | Cookie |
| `PUT` | `/reports/{id}/wizard` | Autosave wizard progress | Cookie |
| `POST` | `/reports/{id}/determine` | Run determination | Cookie |
| `POST` | `/reports/{id}/party-links` | Create party links | Cookie |
| `POST` | `/reports/{id}/ready-check` | Check filing readiness | Cookie |
| `POST` | `/reports/{id}/file` | Submit to FinCEN | Cookie |

---

## POST /reports

Create a new report.

### Request Body

```json
{
  "property_address_text": "123 Main St, Los Angeles, CA 90001",
  "closing_date": "2026-02-15",
  "wizard_data": {}
}
```

### Response (201)

```json
{
  "id": "uuid",
  "status": "draft",
  "property_address_text": "123 Main St, Los Angeles, CA 90001",
  "closing_date": "2026-02-15",
  "wizard_step": null,
  "created_at": "2026-02-10T12:00:00Z",
  "updated_at": "2026-02-10T12:00:00Z"
}
```

### Audit Log

```json
{
  "action": "report.created",
  "actor_type": "staff",
  "details": { "property_address": "..." }
}
```

---

## GET /reports

List reports with optional filtering.

### Query Parameters

| Param | Type | Description |
|-------|------|-------------|
| `status` | string | Filter by status |
| `limit` | int | Max results (default: 100) |
| `offset` | int | Pagination offset |

### Response (200)

```json
{
  "reports": [
    {
      "id": "uuid",
      "status": "draft",
      "property_address_text": "...",
      "closing_date": "2026-02-15",
      "created_at": "...",
      "updated_at": "..."
    }
  ],
  "total": 42
}
```

---

## GET /reports/{id}

Get detailed report including parties and determination.

### Response (200)

```json
{
  "id": "uuid",
  "status": "collecting",
  "property_address_text": "...",
  "closing_date": "2026-02-15",
  "filing_deadline": "2026-03-17",
  "wizard_step": "seller-info",
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
      "status": "pending"
    }
  ],
  "filing_status": null,
  "filed_at": null,
  "receipt_id": null,
  "filing_payload": null,
  "created_at": "...",
  "updated_at": "..."
}
```

---

## PUT /reports/{id}/wizard

Autosave wizard progress. Called frequently during form editing.

### Request Body

```json
{
  "wizard_step": "property",
  "wizard_data": {
    "property": {
      "address": { ... },
      "type": "1-4_family"
    }
  }
}
```

### Response (200)

```json
{
  "id": "uuid",
  "wizard_step": "property",
  "updated_at": "..."
}
```

### Notes

- Called with 1500ms debounce from frontend
- Stores entire wizard state in `wizard_data` JSONB
- Does NOT create audit log (too frequent)

---

## POST /reports/{id}/determine

Run FinCEN determination logic on wizard data.

### Request Body

None required (uses stored wizard_data)

### Response (200)

```json
{
  "report_id": "uuid",
  "is_reportable": true,
  "status": "determination_complete",
  "determination": {
    "is_reportable": true,
    "exemption_code": null,
    "required_parties": ["transferee", "transferor", "beneficial_owner"]
  },
  "reasoning": [
    "Transaction is residential real estate",
    "Transaction is cash or has no regulated financing",
    "Transferee is an LLC (entity)",
    "Entity does not qualify for any exemptions"
  ]
}
```

### Response (200) - Exempt

```json
{
  "report_id": "uuid",
  "is_reportable": false,
  "status": "exempt",
  "determination": {
    "is_reportable": false,
    "exemption_code": "CONVENTIONAL_MORTGAGE",
    "exemption_reason": "Transaction has regulated conventional mortgage financing"
  },
  "reasoning": [
    "Transaction is residential real estate",
    "Transaction has conventional mortgage - exempt"
  ]
}
```

### Audit Log

```json
{
  "action": "report.determination_completed",
  "details": {
    "is_reportable": true,
    "exemption_code": null
  }
}
```

---

## POST /reports/{id}/party-links

Create parties and generate portal tokens.

### Request Body

```json
{
  "parties": [
    {
      "party_role": "transferee",
      "entity_type": "llc",
      "display_name": "ABC Holdings LLC"
    },
    {
      "party_role": "transferor",
      "entity_type": "individual",
      "display_name": "John Smith"
    }
  ],
  "expires_in_days": 14
}
```

### Response (200)

```json
{
  "report_id": "uuid",
  "links": [
    {
      "party_id": "uuid",
      "role": "transferee",
      "entity_type": "llc",
      "token": "abc123...",
      "link_url": "http://localhost:3000/p/abc123...",
      "expires_at": "2026-02-24T12:00:00Z"
    }
  ]
}
```

### Side Effects

1. Creates `ReportParty` records
2. Creates `PartyLink` records with secure tokens
3. Logs `NotificationEvent` for each party
4. Updates report status to `awaiting_parties`

### Audit Log

```json
{
  "action": "party.link_created",
  "details": {
    "party_id": "uuid",
    "party_role": "transferee"
  }
}
```

---

## POST /reports/{id}/ready-check

Validate report is ready for filing.

### Response (200) - Ready

```json
{
  "is_ready": true,
  "missing": []
}
```

### Response (200) - Not Ready

```json
{
  "is_ready": false,
  "missing": [
    {
      "category": "party",
      "field": "transferee",
      "party_id": "uuid",
      "message": "Transferee has not submitted information"
    },
    {
      "category": "transaction",
      "field": "payment_sources",
      "party_id": null,
      "message": "At least one payment source is required"
    }
  ]
}
```

### Validation Checks

1. All required parties have submitted
2. Property information complete
3. Payment sources provided
4. Beneficial owners (if entity)
5. Trust details (if trust)

---

## POST /reports/{id}/file

Submit report to FinCEN.

### Request Body

None required

### Response (200) - Success

```json
{
  "ok": true,
  "report_id": "uuid",
  "status": "filed",
  "receipt_id": "RRER-2026-ABC12345",
  "message": "Report filed successfully",
  "is_demo": true
}
```

### Response (400) - Not Ready

```json
{
  "detail": "Report is not ready for filing"
}
```

### Response (409) - Already Filed

```json
{
  "detail": "Report has already been filed"
}
```

### Filing Process

1. Validate report status is `ready_to_file`
2. Run ready-check validation
3. Create/update `FilingSubmission` record
4. In staging: call `perform_mock_submit()`
5. In production: call `perform_sdtm_submit()` (not yet implemented)
6. Update report status to `filed`
7. Store receipt ID and filing payload

### Audit Log

```json
{
  "action": "filing.submitted",
  "details": {
    "receipt_id": "RRER-2026-ABC12345",
    "environment": "staging"
  }
}
```

---

## Helper Functions

### get_client_ip()

Extract client IP from request headers.

```python
def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host or "unknown"
```

### perform_ready_check()

Internal validation for filing readiness.

```python
def perform_ready_check(report: Report) -> ReadyCheckResponse:
    missing = []

    # Check all parties submitted
    for party in report.parties:
        if party.status != "submitted":
            missing.append(MissingItem(
                category="party",
                field=party.party_role,
                party_id=str(party.id),
                message=f"{party.display_name} has not submitted"
            ))

    # Check payment sources
    wizard_data = report.wizard_data or {}
    if not wizard_data.get("payment_sources"):
        missing.append(MissingItem(
            category="transaction",
            field="payment_sources",
            message="At least one payment source required"
        ))

    return ReadyCheckResponse(
        is_ready=len(missing) == 0,
        missing=missing
    )
```

---

## Related Files

- **Model:** `api/app/models/report.py`
- **Schemas:** `api/app/schemas/report.py`, `api/app/schemas/party.py`
- **Services:**
  - `api/app/services/determination.py`
  - `api/app/services/filing_lifecycle.py`
- **Frontend:**
  - `web/components/rrer-questionnaire.tsx`
  - `web/lib/api.ts`
