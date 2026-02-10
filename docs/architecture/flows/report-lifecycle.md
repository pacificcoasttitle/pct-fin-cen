# Report Lifecycle Flow

> Complete lifecycle of a FinCEN RRER report from creation to filing.

## Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         REPORT LIFECYCLE                                 │
│                                                                         │
│  CREATE ──► DETERMINE ──► COLLECT ──► LINK ──► WAIT ──► FILE ──► DONE  │
│    │            │            │          │        │         │        │   │
│    ▼            ▼            ▼          ▼        ▼         ▼        ▼   │
│  draft   determination  collecting  awaiting  awaiting  filed   filed  │
│           _complete                  parties   parties  (pending) (done)│
│                │                                                        │
│                └──► EXEMPT ──────────────────────────────────────────►  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Creation

### User Action
Click "New Report" button on dashboard

### System Flow

```
User clicks "New Report"
         │
         ▼
POST /reports
{
  "property_address_text": null,
  "closing_date": null,
  "wizard_data": {}
}
         │
         ▼
Create Report record
  - id: UUID
  - status: "draft"
  - wizard_step: null
         │
         ▼
Create AuditLog
  - action: "report.created"
  - actor_type: "staff"
         │
         ▼
Return report ID
         │
         ▼
Redirect to /app/reports/{id}/wizard
```

### Database State

| Field | Value |
|-------|-------|
| status | `draft` |
| wizard_step | `null` |
| wizard_data | `{}` |
| determination | `null` |

---

## Phase 2: Determination

### User Action
Complete wizard steps 1-6 (property, financing, buyer type, exemptions)

### System Flow

```
User fills Property step
         │
         ▼
Auto-save (1500ms debounce)
PUT /reports/{id}/wizard
{
  "wizard_step": "property",
  "wizard_data": { "property": { ... } }
}
         │
         ▼
... more steps ...
         │
         ▼
User completes exemption checks
         │
         ▼
POST /reports/{id}/determine
         │
         ▼
determine_reportability(wizard_data)
         │
    ┌────┴────┐
    │         │
REPORTABLE   EXEMPT
    │         │
    ▼         ▼
status:    status:
"determination  "exempt"
_complete"
```

### Determination Logic

```
Is property residential?
    NO  → EXEMPT (non-residential)
    YES ↓

Is it cash/non-financed?
    NO  → EXEMPT (regulated financing)
    YES ↓

Buyer type?
    INDIVIDUAL → Check individual exemptions
    ENTITY     → Check entity exemptions (15 types)
    TRUST      → Check trust exemptions (4 types)
         ↓
Any exemption applies?
    YES → EXEMPT
    NO  → REPORTABLE
```

### Database State (Reportable)

| Field | Value |
|-------|-------|
| status | `determination_complete` |
| wizard_step | `determination-result` |
| determination | `{ "is_reportable": true, "required_parties": [...] }` |

---

## Phase 3: Collection

### User Action
Complete wizard steps 7-10 (seller, buyer, BOs, payment)

### System Flow

```
User fills Seller Information
         │
         ▼
Auto-save (1500ms debounce)
PUT /reports/{id}/wizard
{
  "wizard_step": "seller-info",
  "wizard_data": {
    "sellers": [{ ... }]
  }
}
         │
         ▼
(Status changes to "collecting" on first save)
         │
         ▼
User fills Buyer Information
         │
         ▼
User fills Beneficial Owners (if entity)
         │
         ▼
User fills Payment Information
         │
         ▼
User reaches Review step
```

### Database State

| Field | Value |
|-------|-------|
| status | `collecting` |
| wizard_step | `payment-info` |
| wizard_data | Full form data |

---

## Phase 4: Party Link Generation

### User Action
Click "Generate Party Links" button

### System Flow

```
User clicks "Generate Party Links"
         │
         ▼
POST /reports/{id}/party-links
{
  "parties": [
    { "party_role": "transferee", "entity_type": "llc", "display_name": "..." },
    { "party_role": "transferor", "entity_type": "individual", "display_name": "..." }
  ],
  "expires_in_days": 14
}
         │
         ▼
For each party:
  ├── Create ReportParty record
  ├── Create PartyLink with secure token
  └── Create NotificationEvent (email)
         │
         ▼
Update report.status = "awaiting_parties"
         │
         ▼
Return links:
{
  "links": [
    { "token": "abc123...", "link_url": "https://app.example.com/p/abc123..." }
  ]
}
```

### Database State

| Table | Records |
|-------|---------|
| reports | status: `awaiting_parties` |
| report_parties | 2+ records (transferee, transferor, etc.) |
| party_links | 2+ records with tokens |
| notification_events | 2+ records (invites) |

---

## Phase 5: Party Submission

### External Action
Parties receive emails and submit via portal

### System Flow

```
Party receives email with link
         │
         ▼
Opens /p/{token}
         │
         ▼
GET /party/{token}
  → Validates token
  → Returns party info + report summary
         │
         ▼
Party fills form
         │
         ▼
Auto-save (1500ms)
POST /party/{token}/save
         │
         ▼
Party submits
POST /party/{token}/submit
         │
         ▼
├── Update party.status = "submitted"
├── Update link.status = "used"
├── Create NotificationEvent (confirmation)
└── Create AuditLog
```

### Ready Check

```
Staff clicks "Check Readiness"
         │
         ▼
POST /reports/{id}/ready-check
         │
         ▼
Validate:
  ├── All required parties submitted?
  ├── Property info complete?
  ├── Payment sources provided?
  └── BOs/trust details (if applicable)?
         │
         ▼
Return:
{
  "is_ready": true/false,
  "missing": [...]
}
```

---

## Phase 6: Filing

### User Action
Click "File Report" button

### System Flow

```
User clicks "File Report"
         │
         ▼
POST /reports/{id}/file
         │
         ▼
Ready check validation
         │
         ▼
Get or create FilingSubmission
         │
         ▼
Environment check:
  ├── staging → perform_mock_submit()
  └── prod    → perform_sdtm_submit() (future)
         │
         ▼
Mock submit:
  ├── Check demo_outcome (if set)
  ├── Random outcome (95% accept)
  └── Generate receipt_id
         │
         ▼
Update records:
  ├── report.status = "filed"
  ├── report.filing_status = "accepted"
  ├── report.receipt_id = "RRER-2026-ABC123"
  ├── report.filed_at = now()
  ├── submission.status = "accepted"
  └── Create AuditLog
         │
         ▼
Return:
{
  "ok": true,
  "receipt_id": "RRER-2026-ABC123"
}
```

### Final Database State

| Table | Key Fields |
|-------|------------|
| reports | status: `filed`, receipt_id: `RRER-2026-ABC123` |
| filing_submissions | status: `accepted`, receipt_id: `...` |
| audit_logs | Complete history |

---

## Status Transitions

```
                    ┌──────────────────────────────────────────┐
                    │                                          │
                    ▼                                          │
draft ──► determination_complete ──► collecting ──► awaiting_parties ──► ready_to_file ──► filed
  │                │                                                            │
  │                └──────────────────► exempt                                  │
  │                                                                             │
  └──────────────────────────────────► cancelled ◄──────────────────────────────┘
```

---

## Key Files

| Purpose | File |
|---------|------|
| Create/update report | `api/app/routes/reports.py` |
| Determination logic | `api/app/services/determination.py` |
| Filing lifecycle | `api/app/services/filing_lifecycle.py` |
| Wizard UI | `web/components/rrer-questionnaire.tsx` |
| API client | `web/lib/api.ts` |

---

## Timing

| Phase | Duration |
|-------|----------|
| Creation | Instant |
| Determination | 2-5 minutes |
| Collection | 10-30 minutes |
| Party submission | 1-7 days |
| Filing | Instant (mock) / Minutes (SDTM) |
