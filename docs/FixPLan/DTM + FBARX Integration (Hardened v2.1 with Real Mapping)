You are working in the FinClear backend repo.

Goal
- Implement SDTM + FBARX XML submission using real data from:
  - Report.wizard_data (JSONB)
  - Report.parties (ReportParty.party_data)
- Replace mock filing in production while preserving demo behavior in staging/test.
- Hardened: idempotent, preflight validates, safe retries/polling, artifact persistence, debug-friendly.

Repo constraints
- Filing endpoint: api/app/routes/reports.py (lines ~787-942)
- FilingSubmission model: api/app/models/filing_submission.py (report_id unique=True)
- Filing lifecycle: api/app/services/filing_lifecycle.py
- Report model: api/app/models/report.py
- Config: api/app/config.py

Existing lifecycle functions must remain usable:
- get_or_create_submission
- enqueue_submission
- perform_mock_submit
- mark_accepted / mark_rejected / mark_needs_review / retry_submission

--------------------------------------------------------------------------------
PHASE 1 — Config + Dependencies (same as v2)

Update api/app/config.py:
- Add FINCEN_TRANSPORT, FINCEN_ENV, SDTM_* env vars with defaults:
  - host defaults:
    sandbox: bsaefiling-direct-transfer-sandbox.fincen.gov
    production: bsaefiling-direct-transfer.fincen.gov
  - port: 2222
  - submissions dir: submissions
  - acks dir: acks
  - org name: SDTM_ORGNAME (sanitize)

Update api/requirements.txt:
- Add paramiko>=3.4.0

--------------------------------------------------------------------------------
PHASE 2 — Operational Metadata in payload_snapshot JSONB (no DB migration)

Because FilingSubmission.report_id is unique, all submissions/polls/retries reuse one row.

In FilingSubmission.payload_snapshot store:
- transport / fincen_env / ip_address
- filename and timestamps
- poll schedule
- artifacts (gz+b64 xml/messages/acked) + sha256/size
- parsed normalized errors and BSA IDs

Implement helpers:
- gzip_b64_encode(str/bytes) -> str
- gzip_b64_decode(str) -> bytes
- sha256(bytes) -> hex

--------------------------------------------------------------------------------
PHASE 3 — New FinCEN Modules

Create api/app/services/fincen/ with:

A) sdtm_client.py (same as v2)
- paramiko SFTP client with retries/timeouts
- upload to /submissions
- list+download from /acks

B) response_processor.py (same as v2)
- parse_messages_xml() -> normalized dict
- parse_acked_xml() -> normalized dict (extract BSAID by activity seq)

C) fbarx_builder.py (UPDATED MAPPING REQUIRED)

Implement:
- build_fbarx_xml(report: Report, submission: FilingSubmission, config) -> tuple[str, dict]
Returns:
- xml_string
- debug_summary dict including:
  - computed counts
  - chosen parties (reporting_person/transferee/etc)
  - any warnings and preflight failures

CRITICAL: This builder MUST use the following mapping rules.

--------------------------------------------------------------------------------
PHASE 4 — DATA MAPPING RULES (Your data model → FBARX)

Important: FBARX schema (as in your uploaded FinCEN FBAR XML Schema 2.0 guide) expects:
- Activity-level parties: Transmitter (35), Transmitter Contact (37), Foreign Account Filer (15)
- Account-level: Financial Institution Where Account is Held (41) and optional owners (42/43/44)

Your platform data is RRER-style. We are mapping pragmatically to FBARX structure so the SDTM transport + schema validation passes.
We will map "reportingPerson" → Transmitter and "transferee buyer" → Foreign Account Filer.
We will map "paymentSources[0].institutionName" → Financial Institution Where Account is Held (41).

If any REQUIRED FBARX-required data is missing, do NOT submit. Mark needs_review with a reason.

-------------------------
4.1 Identify core source objects

From report.wizard_data:
- wd = report.wizard_data
- collection = wd["collection"]
- determination = wd["determination"]

Key extraction:
- closing_date = collection["closingDate"] (YYYY-MM-DD)
- report_calendar_year = year(closing_date) else year(report.closing_date) else current_year-1 fallback
- property_address = collection["propertyAddress"] (street/unit/city/state/zip/country)
- reporting_person = collection["reportingPerson"] (companyName/contactName/licenseNumber/address/phone/email)

From report.parties (ReportParty[]):
- transferee_party = first where party_role == "transferee" (buyer)
- transferor_parties = all where party_role == "transferor" (sellers)
Note: beneficial owners are nested inside transferee_party.party_data for entity buyer, not separate ReportParty rows.

-------------------------
4.2 Map to Activity-level parties

Party 35 (Transmitter)
Source: wd.collection.reportingPerson
- RawPartyFullName = reportingPerson.companyName (required)
- Address:
  - street = reportingPerson.address.street (+ unit if present)
  - city/state/zip/country from reportingPerson.address
  - Country code must be ISO-2: map "United States" -> "US" etc.
- PhoneNumberText = digits only from reportingPerson.phone
- PartyIdentification occurrences (REQUIRED x2):
  1) type 4 (TIN): Use a config value, NOT wizard_data. Add env var:
     TRANSMITTER_TIN (digits-only or allowed string per schema)
  2) type 28 (TCC): Use env var:
     TRANSMITTER_TCC (must start with "P" and length 8)
If either TRANSMITTER_TIN or TRANSMITTER_TCC missing -> preflight FAIL.

Party 37 (Transmitter Contact)
Source: reportingPerson.contactName
- RawPartyFullName = contactName (required; if missing, use companyName + " Contact" as fallback)
No address/phone required here per guide.

Party 15 (Foreign Account Filer)
Source: transferee_party.party_data if exists else wd.collection buyerEntity/buyerTrust data.
We must determine filer type:

If buyer is individual:
- use fields: first_name/middle_name/last_name/suffix/date_of_birth/ssn or passport
- Set <FilerTypeIndividualIndicator>Y
- IndividualBirthDateText = YYYYMMDD derived from date_of_birth
- Name fields required:
  - RawEntityIndividualLastName = last_name
  - RawIndividualFirstName = first_name
  - RawIndividualMiddleName optional
  - RawIndividualNameSuffixText optional
- Address required:
  - address.street (+ unit)
  - city/state/zip/country
- PartyIdentification (at least one):
  - SSN/ITIN => type 1 using digits-only (strip hyphens)
  - OR passport/foreign tin => type 6 or 9 + OtherIssuerCountryText (non-US)
If missing both U.S. TIN and foreign ID -> preflight FAIL.

If buyer is entity:
- treat as entity filer type: corporation/partnership/fiduciary-other/consolidated.
Given your entity types, map:
  - llc_* / partnership / corporation_* => use <FilerTypeFiduciaryOtherIndicator>Y and set <FilerTypeOtherText> appropriately:
    e.g. "limited liability company" or "partnership" or "corporation"
  - DO NOT set FilerTypeIndividualIndicator.
- Name:
  - RawPartyFullName = entity_name (or buyerEntity.entity.legalName)
- Address:
  - use entity address if available
- PartyIdentification:
  - EIN => type 2 using digits-only (strip hyphens)
  - If missing EIN, allow foreign TIN type 9 if present
If no identification at all -> preflight FAIL.

If buyer is trust:
- treat as fiduciary-other:
  - <FilerTypeFiduciaryOtherIndicator>Y
  - <FilerTypeOtherText> "trust"
- Name:
  - RawPartyFullName = trust_name
- Address:
  - trust address
- PartyIdentification:
  - trust_ein -> type 2 (digits-only) if EIN-like; else type 9 if foreign style
If missing identification -> preflight FAIL.

Always required flags for filer party:
- <FilerFinancialInterest25ForeignAccountIndicator> set "N" by default (unless you have a concept of 25+ accounts)
- <SignatureAuthoritiesIndicator> set "N" by default
- If you ever set either to "Y", enforce the required quantity fields in ForeignAccountActivity.

-------------------------
4.3 Map to Account-level elements

We will include at least one <Account> always.

Account fields source:
- Use first payment source in wd.collection.paymentSources[0]
- payment = paymentSources[0]
- institution_name = payment.institutionName
- account_type = payment.accountType
- account_last4 = payment.accountNumberLast4
- amount = payment.amount (USD)

Account mapping:
- EFilingAccountTypeCode = 141 (Separately Owned) as default
- AccountTypeCode:
  - if account_type contains "securities" => 2 else 1
- AccountNumberText:
  - If account_last4 exists: "XXXX" + last4 (e.g. "XXXX5678")
  - Else: generate stable "ACCT" + first 12 of report_id hex
- AccountMaximumValueAmountText:
  - use purchasePrice or payment.amount; must be whole dollars no decimals; cast to int; if missing => UnknownMaximumValueIndicator=Y

Financial Institution Party (41) under Account:
- PartyName.RawPartyFullName = institution_name (required)
- Address:
  - IMPORTANT: FBARX guide says FI country cannot be US; but your institutions likely are US.
  - For schema compliance, record the FI address as best known.
  - If country is unknown, set country to "US" and accept warning risk; DO NOT block.
  - Prefer to use reportingPerson address if payment institution address is unavailable, but label is still institution_name.
  - Keep state present only when country is CA or MX per guide; otherwise omit RawStateCodeText for FI if country not CA/MX.
This is an unavoidable mismatch; log it in debug_summary.

We will NOT include owner parties 42/43/44 initially. Keep owner counts = 0.

-------------------------
4.4 ForeignAccountActivity mapping

- ReportCalendarYearText:
  - year from closingDate, else report.closing_date, else current year-1
- LateFilingReasonCode:
  - omit unless you have a "late" concept; do not guess
- If filer flags indicate 25+ accounts (Y), then include required quantities.

-------------------------
4.5 Preflight Validation (STRICT)

Before returning XML, validate:
- Prolog + required namespaces present
- Required parties exist: 35, 37, 15
- Transmitter has both PartyIdentification blocks: (4 TIN) and (28 TCC)
- All SeqNum attributes numeric and unique
- Root counts match actual generated structure
- No forbidden placeholders appear in name/address fields:
  disallow: "UNKNOWN", "N/A", "NONE", "NOT APPLICABLE", "SEE ABOVE" (case-insensitive)
- Phone digits-only
- ZIP no hyphens/spaces
- If any HARD requirement missing -> raise PreflightError with human message

Builder must return either:
- (xml, debug_summary) on success
- raise PreflightError on failure, and the caller will mark_needs_review with that message and DO NOT transmit.

--------------------------------------------------------------------------------
PHASE 5 — Filing lifecycle integration (perform_sdtm_submit + poll_sdtm_responses)

Edit api/app/services/filing_lifecycle.py:

Add env var requirements for transmitter identity:
- TRANSMITTER_TIN
- TRANSMITTER_TCC

Add perform_sdtm_submit(db, report_id, ip_address) -> (status, submission):
- Enforce idempotency:
  - if status in {queued,submitted} do not re-upload, return submitted
  - if accepted, return accepted
- attempts += 1
- build_fbarx_xml(report, submission, config)
  - on PreflightError: mark_needs_review with message + store debug_summary, return needs_review
- Generate filename:
  FBARXST.YYYYMMDDhhmmss.<OrgName>.<submission_short>.xml
- Store gz+b64 outbound xml + sha256/size into payload_snapshot.artifacts.xml
- Upload via SdtmClient
- Set submission.status="submitted"
- Update payload_snapshot poll schedule:
  next_poll_at now+15m; poll_attempts 0

Add poll_sdtm_responses(db, report_id):
- Look for:
  filename + ".MESSAGES.XML"
  filename + ".ACKED"
- Download if present and not already stored; store gz+b64 in payload_snapshot
- Parse and store normalized parsed payloads
- Status rules:
  - If messages status rejected => mark_rejected(code,message)
  - If messages accepted_with_warnings => mark_needs_review with summary, DO NOT mark accepted
  - If messages accepted => wait for ACKED to finalize receipt
  - If ACKED includes BSAID => mark_accepted(receipt_id=bsa_id) AND update Report fields:
      report.receipt_id = bsa_id
      report.filed_at = now
      report.filing_status = "filed_live"
      report.status = "filed" (only if your business rules allow)
- Poll scheduling backoff:
  15m, 1h, 3h, 6h, then every 12h
  If no messages after 24h => needs_review
  If no acked after 5 days after messages accepted => needs_review

--------------------------------------------------------------------------------
PHASE 6 — Endpoint switch (reports.py)

Edit POST /reports/{report_id}/file in api/app/routes/reports.py

Rules:
- If config.ENVIRONMENT in {"staging","test"}:
  - Keep existing demo behavior with perform_mock_submit and demo_outcome
- Else if config.ENVIRONMENT == "production" and config.FINCEN_TRANSPORT == "sdtm":
  - get_or_create_submission
  - perform_ready_check
  - enqueue_submission(db, report_id, payload_snapshot, ip_address) keep as-is
  - call perform_sdtm_submit
  - immediately do a best-effort poll_sdtm_responses once (no waiting)
  - return FileResponse:
     ok=true
     status="submitted" unless needs_review/rejected happened immediately
     receipt_id=None until accepted via ACKED
     is_demo=false
     message="Submitted for processing via SDTM" (or error message)
- Else:
  - use existing mock flow (backward compatibility)

--------------------------------------------------------------------------------
PHASE 7 — Poller Script + SDTM Ping command

Add:
- api/app/scripts/poll_fincen_sdtm.py
  - selects submissions with payload_snapshot.transport=="sdtm" and status in {"submitted","queued"} and next_poll_at<=now
  - calls poll_sdtm_responses

Add:
- api/app/scripts/fincen_sdtm_ping.py
  - connects and lists submissions/ and acks/
  - prints success/failure and exits

--------------------------------------------------------------------------------
PHASE 8 — Tests

Add unit tests:
- builder generates required structure and correct counts using mocked report.wizard_data + report.parties
- preflight fails when:
  - missing TRANSMITTER_TIN or TRANSMITTER_TCC
  - missing buyer identification
  - missing reporting_person companyName
- parser tests for messages/acked minimal samples

Deliverables:
- config changes
- requirements updates
- new fincen services modules
- filing_lifecycle updates
- endpoint updated for transport switch
- poller + ping scripts
- tests
- robust logs (report_id, submission_id, filename)
- NEVER log secrets
