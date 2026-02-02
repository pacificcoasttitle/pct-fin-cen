Update documentation file: /mnt/data/KilledSharks-2.md (or the repo’s KilledSharks-2.md) by adding a new section titled:

## FinCEN SDTM + FBARX Filing Integration (Production-Ready)

This section must include:

1) Overview
- Explain that “RRER” is internal naming; actual FinCEN payload schema is FBARX XML 2.0.
- Explain transport is SDTM SFTP.

2) Environment Variables (list + meaning + examples)
- FINCEN_TRANSPORT=mock|sdtm
- FINCEN_ENV=sandbox|production
- SDTM_HOST, SDTM_PORT, SDTM_USERNAME, SDTM_PASSWORD (or key path)
- SDTM_SUBMISSIONS_DIR, SDTM_ACKS_DIR
- Optional: SDTM_ORGNAME for filename generation

3) File naming + directories
- Filename: FBARXST.YYYYMMDDhhmmss.<OrgName>.xml
- Upload dir: submissions/
- Response dir: acks/
- Response files:
  - .MESSAGES.XML (status; usually within 5 hours)
  - .ACKED (BSA IDs; 2–3 business days after acceptance)

4) Filing lifecycle (DB + statuses)
- Describe FilingSubmission fields used:
  - status transitions: queued → submitted → accepted/rejected/needs_review
  - receipt_id population after ACKED
  - payload_snapshot stores outbound XML and inbound responses (or pointers)
  - attempt_count, timestamps

5) Step-by-step flow (sequence)
- POST /reports/{id}/file triggers:
  - create FilingSubmission queued
  - build XML
  - upload SFTP
  - mark submitted
  - schedule polling
- Poller checks /acks:
  - if MESSAGES arrives → update status
  - if ACKED arrives → set receipt_id and finalize

6) Debug Playbook (this is the most important part)
Include:
- How to confirm upload succeeded
  - log grep instructions; expected filename
- How to confirm MESSAGES arrived
  - where to look; how to parse; common statuses
- How to confirm ACKED arrived and receipt IDs mapped
  - SeqNum mapping guidance
- Common failure modes + what they mean:
  - SFTP auth failure
  - file rejected (schema errors, counts mismatch, missing SeqNum, bad prefixes)
  - accepted with warnings (requires amendment flow)
- Where to find artifacts:
  - outbound XML snapshot
  - inbound MESSAGES/ACKED snapshots
  - logs (include key identifiers: filing_submission_id/report_id/filename)

7) Sandbox-first checklist
- Steps to validate in sandbox before production
- A “known good” test report recipe (minimal parties + single account)
- How to flip to production safely

Write this in a tone consistent with the existing KilledSharks-2.md: concise bullets + implementation-specific details. Do NOT remove existing content—only append a new section.

Finally, add a short “Implementation Notes” block listing key modules/files added (paths), and the key functions used in the flow.
