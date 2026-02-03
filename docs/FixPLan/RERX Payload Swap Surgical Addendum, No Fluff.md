SURGICAL ADDENDUM: Switch outbound filing payload from FBARX to RERX (Residential Real Estate Report) using the Dec 2025 “Real Estate Report: Technical Specifications for Batch XML Filers”.

Do NOT modify SDTM transport, polling, admin debug endpoints, artifact storage, or FilingSubmission lifecycle logic unless required for the RERX swap.
The SDTM client, poller, .MESSAGES.XML/.ACKED retrieval, and ack parsing should remain unchanged.

Scope: Only replace the XML generation + preflight to match RERX.

--------------------------------------------------------------------------------
1) Update filing constants (minimal)
- FormTypeCode must be "RERX" (not FBARX).
- Root schemaLocation must use: https://bsaefiling.fincen.gov/resources/EFL_RERXBatchSchema.xsd
- SDTM filename prefix must be: "RERXST" (not FBARXST)
- SDTM filename convention must be: RERXST.YYYYMMDDhhmmss.<SDTM-USERNAME>.xml
  (Per spec: the 3rd segment must be the SDTM username, not org name.)

Implement filename generation change in perform_sdtm_submit:
- Use SDTM_USERNAME as the filename segment.
- Still append a short unique suffix if needed, but preserve the required “<sdtm-username>” segment exactly.

--------------------------------------------------------------------------------
2) Replace FBARX builder with RERX builder
- Deprecate/stop using: api/app/services/fincen/fbarx_builder.py
- Create: api/app/services/fincen/rerx_builder.py
- Update filing_lifecycle.perform_sdtm_submit to call build_rerx_xml instead of build_fbarx_xml.

Builder signature:
- build_rerx_xml(report: Report, submission: FilingSubmission, config) -> (xml_string, debug_summary)

--------------------------------------------------------------------------------
3) Implement RERX XML structure (minimum viable compliant)
Per RER spec, batch structure:
- <?xml version="1.0" encoding="UTF-8"?>
- <fc2:EFilingBatchXML ActivityCount="#" xmlns:fc2="www.fincen.gov/base" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="www.fincen.gov/base https://bsaefiling.fincen.gov/resources/EFL_RERXBatchSchema.xsd">
- <fc2:FormTypeCode>RERX</fc2:FormTypeCode>
- <fc2:Activity SeqNum="..."> one per report
- close EFilingBatchXML

Inside Activity, REQUIRED containers in correct order:
A) FilingDateText (YYYYMMDD; cannot be future; cannot be < 20251201)
B) ActivityAssociation (SeqNum) with InitialReportIndicator (Y) for initial filings
C) Party: Reporting Person (ActivityPartyTypeCode=31)
D) Party: Transferee (ActivityPartyTypeCode=67) (entity or trust)
   - Include required associated person(s) via PartyAssociation + Party (ActivityPartyTypeCode=68)
E) Party: Transferor (ActivityPartyTypeCode=69) (at least one)
F) Party: Transmitter (ActivityPartyTypeCode=35) with TWO identifications:
   - type 4 TIN (TRANSMITTER_TIN)
   - type 28 TCC:
       - SANDBOX must be "TBSATEST" per spec
       - PROD uses TRANSMITTER_TCC
G) Party: Transmitter Contact (ActivityPartyTypeCode=37)
H) AssetsAttribute (property address + legal description)
I) ValueTransferActivity (payments + closing date + payment details)

--------------------------------------------------------------------------------
4) Map YOUR data model to RERX (use existing wizard_data + ReportParty)
Use:
- report.wizard_data.collection.reportingPerson => Reporting Person Party (31)
- report.parties where party_role="transferee" => Transferee Party (67)
- report.parties where party_role="transferor" => Transferor Party (69) (one per seller)
- report.wizard_data.collection.propertyAddress + legalDescription => AssetsAttribute
- report.wizard_data.collection.paymentSources[] => ValueTransferActivityDetail(s)
- report.wizard_data.collection.closingDate => TransactionClosingDateText

Transferee requirements:
- If buyer is entity: include TransferPartyEntityIndicator=Y, legal name, optional DBA (PartyNameTypeCode=DBA), principal place of business address + address type code, PartyIdentification with correct PartyIdentificationTypeCode:
   - SSN/ITIN (1) or EIN (2) or foreign TIN (43) or foreign entity reg (41) or no identification (42)
- If buyer is trust: include TransferPartyTrustIndicator=Y, TrustInstrumentExecutionDateText, RevocableTrustIndicator as applicable, PartyIdentification

Associated persons (PartyAssociation):
- For entity transferee: include at least signing individual and/or beneficial owner if required by spec.
- For trust transferee: include trustee/beneficial owner categories as required.
Use your existing nested beneficialOwners and signingIndividuals from wizard_data/party_data.

Transferor requirements:
- One Party (69) per seller in wizard_data.collection.sellers OR report.parties transferor.
- If seller trust: include TransferPartyTrustIndicator + TrustInstrumentExecutionDateText + trustee PartyAssociation with Party (70).

ValueTransferActivity:
- Must include TotalConsiderationPaidAmountText (use purchasePrice rounded up) unless NoConsiderationPaidIndicator is set.
- Must include TransactionClosingDateText.
- For each payment in paymentSources:
   - ValueTransferActivityDetail with PaymentAmountText, Assets (payment method AssetSubtypeID mapped from source_type), and FI party (41) + AccountNumberText if payment from FI account.
   - If payment indicates not from FI account, set PaymentNotFromFinancialInstitutionAccountIndicator=Y and omit FI party.

--------------------------------------------------------------------------------
5) Preflight validation must be RER-aware (replace FBARX checks)
Remove FBARX-specific preflight requirements.
Implement RERX-specific structural preflight:
- FormTypeCode=RERX
- Activity includes: FilingDateText, ActivityAssociation with InitialReportIndicator (Y) or correct/amend path
- Reporting Person Party (31) exists exactly once
- Transferee Party (67) exists at least once
- Transferor Party (69) exists at least once
- Transmitter (35) and Transmitter Contact (37) exist exactly once
- AssetsAttribute exists at least once
- ValueTransferActivity exists exactly once
- For sandbox: transmitter TCC must equal "TBSATEST" (this is mandatory)
- SeqNum uniqueness across complex elements as required by this schema
- Remove root attribute counts other than ActivityCount (RERX root only defines ActivityCount)

If required RER data is missing, raise PreflightError and mark_needs_review BEFORE upload.

--------------------------------------------------------------------------------
6) Response parsing
Keep existing .MESSAGES.XML and .ACKED parsing logic.
However update any assumptions about FormTypeCode or paths if hard-coded.

--------------------------------------------------------------------------------
7) Documentation (MANDATORY)
Append to docs/KilledSharks-2.md:
- A short correction section: “FBARX assumption corrected; outbound schema is RERX per Dec 2025 FinCEN spec.”
- Update:
  - FormTypeCode=RERX
  - schemaLocation URL
  - filename convention RERXST.<timestamp>.<sdtm-username>.xml
  - sandbox transmitter TCC requirement: TBSATEST
- Add a “RERX Minimum Required Sections” checklist so debugging is faster.

--------------------------------------------------------------------------------
8) Deliverables required in final output
- List files changed
- Confirm FBARX builder is no longer used
- Confirm RERX builder generates a full XML with: ReportingPerson(31), Transferee(67), Transferor(69), Transmitter(35), Contact(37), AssetsAttribute, ValueTransferActivity
- Confirm sandbox TCC behavior: TBSATEST
- Confirm KilledSharks-2 updated
