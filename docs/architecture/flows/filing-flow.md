# Filing Flow

> FinCEN filing submission and lifecycle management.

## Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           FILING FLOW                                    │
│                                                                         │
│  VALIDATE ──► QUEUE ──► SUBMIT ──► WAIT ──► RESPONSE ──► FINAL         │
│     │           │          │         │          │           │           │
│     ▼           ▼          ▼         ▼          ▼           ▼           │
│   Ready     queued    submitted   (async)   accepted    filed          │
│   Check                                     rejected    retry          │
│                                             needs_rev   review         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Pre-Filing: Ready Check

### User Action
Click "Check Readiness" or attempt to file

### System Flow

```
POST /reports/{id}/ready-check
         │
         ▼
Validate all requirements:
         │
         ├── All parties submitted?
         │   For each ReportParty:
         │     party.status == "submitted"?
         │
         ├── Property information complete?
         │   wizard_data.property.address filled?
         │   wizard_data.property.type set?
         │
         ├── Transaction details?
         │   wizard_data.transaction.salePrice > 0?
         │   wizard_data.transaction.closingDate set?
         │
         ├── Payment sources?
         │   wizard_data.paymentSources.length > 0?
         │
         ├── Entity-specific (if buyer is entity):
         │   Beneficial owners provided?
         │   Signing individual set?
         │
         └── Trust-specific (if buyer is trust):
             Trustees provided?
             Settlors provided?
         │
         ▼
Return result:
{
  "is_ready": true,
  "missing": []
}

// OR

{
  "is_ready": false,
  "missing": [
    {
      "category": "party",
      "field": "transferee",
      "party_id": "...",
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

---

## Filing: Submit

### User Action
Click "File Report" button

### System Flow (Staging)

```
POST /reports/{id}/file
         │
         ▼
Validate report status:
  status in ["ready_to_file"]?
  → No: 400 "Report is not ready for filing"
         │
         ▼
Run ready check:
  is_ready?
  → No: 400 "Report has missing information"
         │
         ▼
Get or create FilingSubmission:
         │
         ├── Existing submission?
         │   → Use it, increment attempts
         │
         └── New submission:
             - id: UUID
             - report_id: {report_id}
             - environment: "staging"
             - status: "queued"
             - payload_snapshot: {wizard_data + party_data}
             - attempts: 1
         │
         ▼
Check environment:
  ENVIRONMENT == "staging"?
         │
         ├── YES: perform_mock_submit()
         │
         └── NO: perform_sdtm_submit() (future)
         │
         ▼
perform_mock_submit():
         │
         ├── Check demo_outcome override:
         │   submission.demo_outcome set?
         │   → YES: Use configured outcome
         │   → NO: Random (95% accept, 5% reject)
         │
         ├── Generate receipt_id:
         │   RRER-{year}-{hash(report_id)}
         │   Example: "RRER-2026-ABC12345"
         │
         └── Apply outcome:
             ├── accept: mark_accepted()
             ├── reject: mark_rejected()
             └── needs_review: mark_needs_review()
         │
         ▼
Update records:
         │
         ├── Report
         │   - status: "filed"
         │   - filing_status: "accepted"
         │   - receipt_id: "RRER-2026-ABC12345"
         │   - filed_at: now
         │   - filing_payload: {snapshot}
         │
         ├── FilingSubmission
         │   - status: "accepted"
         │   - receipt_id: "RRER-2026-ABC12345"
         │   - updated_at: now
         │
         ├── AuditLog
         │   - action: "filing.accepted"
         │   - actor_type: "system"
         │   - details: { receipt_id, environment }
         │
         └── NotificationEvent
             - type: "filing_receipt"
             - subject: "FinCEN Filing Accepted"
         │
         ▼
Return:
{
  "ok": true,
  "report_id": "...",
  "status": "filed",
  "receipt_id": "RRER-2026-ABC12345",
  "message": "Report filed successfully",
  "is_demo": true
}
```

---

## Rejection Handling

### Rejection Flow

```
Filing rejected (demo_outcome = "reject")
         │
         ▼
Update records:
         │
         ├── Report
         │   - status: "filed" (still filed, but rejected)
         │   - filing_status: "rejected"
         │
         ├── FilingSubmission
         │   - status: "rejected"
         │   - rejection_code: "INVALID_TIN"
         │   - rejection_message: "TIN does not match IRS records"
         │
         └── AuditLog
             - action: "filing.rejected"
             - details: { code, message }
         │
         ▼
Return:
{
  "ok": false,
  "report_id": "...",
  "status": "rejected",
  "receipt_id": null,
  "message": "Filing rejected: INVALID_TIN",
  "is_demo": true
}
```

### Retry Flow

```
Staff clicks "Retry Filing"
         │
         ▼
POST /admin/reports/{id}/retry-filing
         │
         ▼
Validate submission status:
  status in ["rejected", "needs_review"]?
  → No: 400 "Cannot retry in current status"
         │
         ▼
retry_submission():
         │
         ├── Increment attempts counter
         │
         ├── Clear demo_outcome (one-time use)
         │
         └── Re-run perform_mock_submit()
         │
         ▼
(Same flow as original submit)
         │
         ▼
Create AuditLog:
  - action: "filing.retried"
  - details: { attempt, previous_status }
```

---

## Demo Outcome Override

### Set Outcome for Testing

```
POST /demo/reports/{id}/set-filing-outcome
X-DEMO-SECRET: your-secret
{
  "outcome": "reject",
  "rejection_code": "INVALID_TIN",
  "rejection_message": "TIN does not match IRS records"
}
         │
         ▼
Update FilingSubmission:
  - demo_outcome: "reject"
  - demo_rejection_code: "INVALID_TIN"
  - demo_rejection_message: "..."
         │
         ▼
Next file attempt will use these values
```

### Outcome Values

| Outcome | Result |
|---------|--------|
| `accept` | Filing succeeds with receipt ID |
| `reject` | Filing fails with error code |
| `needs_review` | Filing requires staff review |

---

## Production Filing (Planned)

### SDTM (Secure Data Transfer Mode)

```
perform_sdtm_submit():
         │
         ▼
Build RERX XML:
  - Property information
  - Party data
  - Payment sources
  - Certification
         │
         ▼
SFTP upload to BSA E-Filing:
  - Connect to sftp.bsaefilingf.fincen.treas.gov
  - Upload to /submission directory
  - Filename: {batch_id}.xml
         │
         ▼
Update submission:
  - status: "submitted"
  - updated_at: now
         │
         ▼
Start polling for acknowledgement:
  - Check /acks directory
  - Look for MESSAGES.XML
         │
         ▼
Parse MESSAGES.XML:
  - BSA ID (acceptance)
  - Error codes (rejection)
         │
         ▼
Update based on response:
  ├── Accepted: store BSA ID
  └── Rejected: store error, enable retry
```

---

## Filing Status Lifecycle

```
                     ┌─────────────────────────────────────────┐
                     │                                         │
                     ▼                                         │
not_started ──► queued ──► submitted ──► accepted              │
                  │                         │                  │
                  │                         ▼                  │
                  │                      (DONE)                │
                  │                                            │
                  └──────────────────► rejected ───► retry ────┘
                                          │
                                          ▼
                                     needs_review ───► retry ───┘
```

---

## Receipt ID Format

```
RRER-{YEAR}-{HASH}

Examples:
- RRER-2026-ABC12345
- RRER-2026-DEF67890

Generation:
1. Take report_id
2. Hash: MD5(report_id + ":receipt")
3. Take first 8 characters
4. Uppercase
5. Prepend "RRER-{year}-"
```

---

## Key Files

| Purpose | File |
|---------|------|
| File endpoint | `api/app/routes/reports.py` → `file_report` |
| Retry endpoint | `api/app/routes/admin.py` → `retry_filing` |
| Demo outcome | `api/app/routes/demo.py` → `set_filing_outcome` |
| Lifecycle service | `api/app/services/filing_lifecycle.py` |
| Mock provider | `api/app/services/filing.py` |
| Model | `api/app/models/filing_submission.py` |
| Frontend | `web/components/rrer-questionnaire.tsx` → file-report step |
| Admin UI | `web/app/(app)/app/admin/filings/page.tsx` |

---

## Error Codes (Demo)

| Code | Description |
|------|-------------|
| `INVALID_TIN` | TIN does not match IRS records |
| `DUPLICATE_FILING` | Report already filed |
| `MISSING_BO` | Beneficial owner information incomplete |
| `INVALID_ADDRESS` | Property address validation failed |
| `SYSTEM_ERROR` | Internal system error |
