ADDENDUM OBJECTIVE
You have already implemented (or are implementing) the SDTM + FBARX Integration per “Hardened v2.1 with Real Mapping”.
This addendum exists to:
1) Close remaining hardening gaps
2) Add explicit operational checkpoints
3) Ensure production-readiness
4) Document everything in KilledSharks-2.md

Do NOT re-architect or re-implement v2.1.
Only add what is missing or incomplete.

--------------------------------
SECTION A — FINAL HARDENING ITEMS (ADD IF NOT PRESENT)

A1) Explicit Schema / Structure Preflight
If not already implemented:
- Add a preflight step in fbarx_builder BEFORE upload that verifies:
  - XML is well-formed (parseable)
  - Root element is fc2:EFilingBatchXML
  - <fc2:FormTypeCode>FBARX</fc2:FormTypeCode> exists
  - Required Activity-level parties exist: type codes 35, 37, 15
  - Transmitter (35) has BOTH PartyIdentification types:
      - 4 (TIN)
      - 28 (TCC)
  - At least one <Account> exists
  - At least one Account-level Party (41) exists
  - All SeqNum attributes are numeric and unique
  - Root counts EXACTLY match generated structure
If any check fails:
- Raise PreflightError
- Call mark_needs_review()
- DO NOT attempt SDTM upload

A2) Idempotency Checkpoint (Explicit)
Confirm the following guard exists in perform_sdtm_submit:
- If FilingSubmission.status in {"queued","submitted"}:
    - Do NOT rebuild XML
    - Do NOT reupload
    - Return immediately
- If status == "accepted":
    - Return immediately
This must be explicit and commented in code.

A3) Filename Uniqueness Check
Ensure filename generation includes:
- timestamp
- org name
- short suffix derived from filing_submission.id
This prevents duplicate uploads if two submissions occur within the same second.

--------------------------------
SECTION B — POLLING & TIME-BASED SAFETY CHECKPOINTS

B1) Time-Based Escalation
Ensure poll_sdtm_responses enforces:
- If NO .MESSAGES.XML after 24 hours from upload:
    → mark_needs_review("No FinCEN response after 24 hours")
- If .MESSAGES.XML accepted but NO .ACKED after 5 days:
    → mark_needs_review("No ACKED after acceptance window")

These rules must be enforced even if polling continues.

B2) Poll Backoff Enforcement
Confirm poll backoff is deterministic and stored in payload_snapshot:
- 15 min
- 1 hour
- 3 hours
- 6 hours
- every 12 hours thereafter

--------------------------------
SECTION C — ADMIN DEBUG CHECKPOINTS (VERIFY OR ADD)

Ensure the following admin capabilities exist (backend minimum):

- View FilingSubmission with:
  - filename
  - status
  - receipt_id
  - attempts
  - timestamps
- Download artifacts:
  - outbound XML
  - MESSAGES.XML
  - ACKED
- Trigger a manual “repoll” action (no reupload)

If frontend admin UI is not available:
- Backend endpoints must still exist and be documented.

--------------------------------
SECTION D — OPERATIONAL COMMANDS (REQUIRED FOR PROD)

If not already implemented, add:

1) SDTM Connectivity Test
Command/script:
- fincen_sdtm_ping
Behavior:
- Connect to SDTM
- List /submissions and /acks
- Exit 0 on success, non-zero on failure

2) Poller Command
Command/script:
- poll_fincen_sdtm
Behavior:
- Select all FilingSubmissions with:
    transport="sdtm"
    status in {"queued","submitted"}
    next_poll_at <= now
- Call poll_sdtm_responses

These commands must be referenced in documentation.

--------------------------------
SECTION E — KILLED SHARKS DOCUMENTATION (MANDATORY)

Update KilledSharks-2.md by APPENDING a section titled:

## FinCEN SDTM + FBARX Integration — Production Hardening Addendum

This section MUST include:

1) Confirmation Statement
- Explicitly state:
  “RRER is an internal workflow name. All outbound filings use FBARX XML Schema 2.0 over SDTM.”

2) Environment Flags
- FINCEN_TRANSPORT
- FINCEN_ENV
- SDTM_HOST / PORT
- TRANSMITTER_TIN / TRANSMITTER_TCC

3) Preflight Rules Summary
- Bullet list of conditions that cause needs_review BEFORE submission

4) Polling & Escalation Rules
- 24-hour no-response rule
- 5-day no-ACKED rule
- Backoff schedule

5) Debug Playbook
- Where XML is stored
- Where MESSAGES / ACKED are stored
- How to diagnose:
    - rejected
    - accepted with warnings
    - stuck submitted
- When to repoll vs refile

6) Operational Checklist (Pre-Go-Live)
- SDTM ping success
- Sandbox submission accepted
- ACKED received and receipt_id populated
- Admin debug verified
- Poller running on schedule

Do NOT remove or rewrite existing KilledSharks entries — append only.

--------------------------------
FINAL OUTPUT REQUIRED
At the end of this addendum work, produce:
- A checklist summarizing which items were already present vs added
- A short summary of files touched
- A confirmation that KilledSharks-2.md was updated
