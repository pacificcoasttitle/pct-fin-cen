You are working in the FinClear codebase. Goal: replace the current mock FinCEN filing with real SDTM SFTP transport and FBARX XML generation, while preserving the existing filing lifecycle and UI behavior.

High-level requirements:
- Keep the existing API endpoint: POST /reports/{id}/file
- Keep existing FilingSubmission model and status lifecycle (not_started → queued → submitted → accepted/rejected/needs_review)
- Implement:
  1) FBARX XML builder service (JSON/domain model → XML)
  2) SDTM SFTP client (upload .xml to /submissions, download from /acks)
  3) Response polling + parsing for:
     - .MESSAGES.XML (within hours)
     - .ACKED (2–3 business days)
  4) Update FilingSubmission + Report + SubmissionRequest statuses based on responses
  5) Add structured logs and payload snapshots for debugging

Constraints:
- Do NOT break staging/demo flows. Keep a feature flag or environment switch:
  - FINCEN_TRANSPORT=mock|sdtm
  - FINCEN_ENV=sandbox|production
- Store credentials and config in environment variables (do not hardcode)
- Implement with clean abstractions: Transport + Builder + Processor

Tasks:

A) Locate current filing flow:
- Find fileReport() frontend call and backend route handler for POST /reports/{id}/file
- Identify where filing is currently “mocked” and where FilingSubmission is created/updated
- Keep that surface area stable

B) Implement FBARX XML builder:
- Create module: backend/services/fincen/fbarx_builder.py (or similar)
- Input: Report + related parties/accounts data already in DB (use existing models)
- Output: string XML with:
  - XML prolog
  - fc2:EFilingBatchXML root with correct attributes and counts
  - fc2:FormTypeCode=FBARX
  - at least 1 fc2:Activity
  - required parties: transmitter(35), transmitter contact(37), filer(15)
  - accounts + financial institution party(41)
  - ForeignAccountActivity + ReportCalendarYearText
- Implement deterministic SeqNum assignment:
  - simplest: walk elements in schema order and increment an integer
- Implement correct root attribute counts:
  - ActivityCount = number of Activity
  - AccountCount = count of Account
  - PartyCount = count of account-level financial institutions (ActivityPartyTypeCode=41)
  - JointlyOwnedOwnerCount (42), NoFIOwnerCount (43), ConsolidatedOwnerCount (44)

C) Implement SDTM SFTP client:
- Create module: backend/services/fincen/sdtm_client.py
- Use paramiko (add to requirements if needed) OR other existing SFTP lib in repo
- Env vars:
  - SDTM_HOST (default based on FINCEN_ENV)
  - SDTM_PORT=2222
  - SDTM_USERNAME
  - SDTM_PASSWORD (or private key if repo supports)
  - SDTM_SUBMISSIONS_DIR=submissions
  - SDTM_ACKS_DIR=acks
- Provide methods:
  - upload(xml_bytes, filename) -> remote_path
  - list_acks(prefix_filename) -> list files
  - download(remote_filename) -> bytes

D) Implement response processing:
- Create module: backend/services/fincen/response_processor.py
- Parse .MESSAGES.XML:
  - Determine overall submission status: accepted, accepted_with_warnings, rejected
  - Extract useful error messages/codes if present
  - Update FilingSubmission:
     status = submitted/accepted/rejected/needs_review
     rejection_code/message if rejected
     store raw response in payload_snapshot or response_snapshot field
- Parse .ACKED:
  - Extract BSAID(s) per activity SeqNum
  - Extract per-activity warnings/errors
  - Update FilingSubmission.receipt_id (or corresponding field)
  - Update Report/SubmissionRequest to accepted/review needed if errors exist

E) Background job / polling:
- If repo already has a queue system, use it (Celery/RQ/etc). If not:
  - Implement lightweight polling triggered by endpoint:
    - After upload, immediately schedule next poll timestamp in DB
    - Create a management command / cron-safe runner that checks pending submissions and polls SDTM
- The endpoint POST /reports/{id}/file should:
  1) Create FilingSubmission row (status=queued)
  2) Generate XML
  3) Upload file via SDTM (status=submitted)
  4) Record filename + timestamps + attempt count
  5) Return success to UI quickly (do not wait for ACKED)

F) Observability / Debugging:
- Add structured logs for each step:
  - filing_submission_id, report_id, filename, FINCEN_ENV, transport
- Persist:
  - generated XML (payload snapshot) OR hash + stored file reference
  - messages xml response
  - acked response
- Ensure you do NOT store secrets.

G) Tests:
- Add unit tests for:
  - builder generates valid-ish XML (basic structure, required tags, counts)
  - message parser extracts status/errors
  - ack parser extracts BSAIDs
- Add an integration “dry run” mode that builds XML and writes it to local disk without SFTP.

Deliverables:
- New modules: fbarx_builder.py, sdtm_client.py, response_processor.py
- Wiring changes in filing endpoint to use transport based on FINCEN_TRANSPORT
- Requirements update if paramiko added
- Minimal docs/comments in code explaining flow

After implementing, run a quick search for “RRER” usage in filing code and ensure naming doesn’t imply wrong schema. We can keep internal names but outbound must be FBARX.
