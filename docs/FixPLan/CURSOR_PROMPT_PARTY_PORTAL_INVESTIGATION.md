# CURSOR PROMPT: Investigation — Party Portal End-to-End Completeness

## Context

We are 26 days from the March 1, 2026 FinCEN compliance deadline. The Party Portal (`/p/{token}`) is how external parties — buyers (transferees), sellers (transferors), and their beneficial owners — submit their information for FinCEN Real Estate Reports.

This is the **data pipeline into the RERX XML builder**. If the portal doesn't collect the right data, or doesn't store it where the builder expects it, filings will fail preflight validation and cannot be submitted to FinCEN.

**We know from previous work:**
- Shark #49 added entity enhancements to the portal (BOI status, indirect ownership, trust roles, entity subtypes)
- The WIZARD_MASTER_TECH_SPEC (Shark #42, Section 7) documented portal connection points
- The RERX builder (`api/app/services/fincen/rerx_builder.py`) maps `report.parties` and `report.wizard_data` to XML
- Party portal components exist in `web/components/party-portal/`

**What we DON'T know:**
- Does the full round-trip work? (link generated → party opens link → fills form → submits → data lands in correct fields → RERX builder can consume it)
- Are ALL required RERX fields collected for every party type?
- What happens after submission? (confirmation page, status update, notification to staff)
- Can staff see what parties have submitted vs what's still pending?
- Do the status lifecycles (Party, PartyLink) actually transition correctly?

**DO NOT FIX ANYTHING. INVESTIGATION ONLY.**

---

## PART 1: Party Portal Infrastructure — What Exists

### 1A: Link Generation & Token System

1. **How are party portal links created?**
   - What generates the token? (which endpoint, which service)
   - What data is encoded in or associated with the token?
   - Is there a `PartyLink` model? Show ALL fields, types, statuses
   - Is there a `Party` or `ReportParty` model? Show ALL fields
   - What is the relationship: Report → SubmissionRequest → Party → PartyLink?
   - How long is the token valid? Does it expire?

2. **When are links generated?**
   - Are links generated when the wizard reaches the "collecting" phase?
   - Are links generated automatically or manually by staff?
   - Can staff regenerate/resend a link?
   - Are links sent via email? (check for SendGrid/email integration)

3. **Show the token generation code:**
```bash
grep -rn "party.*link\|party.*token\|generate.*token\|portal.*link\|portal.*token" api/app/ --include="*.py" -l
grep -rn "PartyLink\|party_link" api/app/ --include="*.py" -l
grep -rn "/p/\|party-portal\|portal" web/ --include="*.ts" --include="*.tsx" -l
```

### 1B: Portal Route & Authentication

1. **What is the portal URL structure?**
   - Is it `/p/{token}` or something else?
   - Show the Next.js route file
   - How does the frontend resolve the token to a party/report?

2. **Portal authentication:**
   - Does the token grant access without login?
   - Is there any additional verification (email, name, etc.)?
   - What backend endpoint validates the token?
   - What data does the token validation return? (party info, report context, what fields to show)

3. **Show the portal entry point:**
```bash
# Frontend portal route
find web/app -path "*/p/*" -o -path "*party-portal*" -o -path "*portal*" | head -20
cat web/app/p/*/page.tsx  # or whatever the route structure is

# Backend token validation
grep -rn "validate.*token\|verify.*token\|party.*token\|portal.*auth" api/app/ --include="*.py"
grep -rn "GET.*portal\|GET.*/p/" api/app/routes/ --include="*.py"
```

### Output Format for Part 1

```
## Portal Infrastructure Findings

### Token System
- Token model: [PartyLink? file + fields]
- Token generation: [endpoint/service + when triggered]
- Token format: [UUID? JWT? length?]
- Token expiration: [duration or "never"]
- Token → Party mapping: [how resolved]

### Link Delivery
- Email integration: YES/NO [code location]
- Manual copy/paste: YES/NO
- Resend capability: YES/NO

### Portal Route
- URL pattern: [exact pattern]
- Frontend route file: [path]
- Backend validation endpoint: [method + path]
- Auth mechanism: [token-only? additional verification?]
- Data returned on token validation: [fields]
```

---

## PART 2: Party Portal Forms — What Data Is Collected

### 2A: Form Selection Logic

1. **How does the portal decide which form to show?**
   - What determines if a party sees: Individual buyer form? Entity buyer form? Trust buyer form? Seller form? Beneficial owner form?
   - Is this based on the party's `party_role`? The report's `determination`? The `party_type`?
   - Show the form selection logic code

2. **What form components exist?**
```bash
ls -la web/components/party-portal/
cat web/components/party-portal/types.ts
```

List every form component and what party type it handles.

### 2B: Individual Buyer (Transferee) Form

If the buyer is an individual person:

1. **What fields are collected?**

| Field | Collected? | Required? | Maps to RERX |
|-------|-----------|-----------|--------------|
| First name | ? | ? | Party 67 RawIndividualFirstName |
| Middle name | ? | ? | Party 67 RawIndividualMiddleName |
| Last name | ? | ? | Party 67 RawEntityIndividualLastName |
| Suffix | ? | ? | Party 67 RawIndividualNameSuffixText |
| Date of birth | ? | ? | Party 67 IndividualBirthDateText |
| SSN | ? | ? | Party 67 PartyIdentification type 1 |
| ITIN | ? | ? | Party 67 PartyIdentification type 1 |
| Foreign TIN | ? | ? | Party 67 PartyIdentification type 43 |
| Passport # | ? | ? | Party 67 (alternative ID) |
| Passport country | ? | ? | Party 67 OtherIssuerCountryText |
| Street address | ? | ? | Party 67 Address |
| City | ? | ? | Party 67 Address |
| State | ? | ? | Party 67 Address |
| ZIP | ? | ? | Party 67 Address |
| Country | ? | ? | Party 67 Address |
| Phone | ? | ? | Party 67 PhoneNumberText |
| Email | ? | ? | (notification use) |

2. **Show the individual buyer form component code**

### 2C: Entity Buyer (Transferee) Form

If the buyer is an entity (LLC, Corp, etc.):

1. **What fields are collected?**

| Field | Collected? | Required? | Maps to RERX |
|-------|-----------|-----------|--------------|
| Entity legal name | ? | ? | Party 67 RawPartyFullName |
| DBA / trade name | ? | ? | Party 67 PartyName (DBA type) |
| Entity subtype (LLC/Corp/etc.) | ? | ? | (context for document checklist) |
| EIN | ? | ? | Party 67 PartyIdentification type 2 |
| Foreign TIN | ? | ? | Party 67 PartyIdentification type 43 |
| Foreign entity reg # | ? | ? | Party 67 PartyIdentification type 41 |
| No identification indicator | ? | ? | Party 67 type 42 |
| Principal business address | ? | ? | Party 67 Address (type code) |
| State of formation | ? | ? | Party 67 (if collected) |
| Country of formation | ? | ? | Party 67 FormationCountryCodeText |
| BOI filing status | ? | ? | (compliance context) |
| FinCEN ID (if BOI filed) | ? | ? | Party 67 (if collected) |
| TransferPartyEntityIndicator | ? | ? | Must be Y for entities |

2. **Beneficial Owners — are they collected HERE or in a separate form?**
   - How many BOs can be added?
   - What fields per BO? (name, DOB, SSN, address, ownership %, indirect ownership, trust role)
   - Are BOs stored as nested data within the entity party, or as separate Party/PartyLink records?
   - Show the BeneficialOwnerCard component

3. **Signing Individuals — are they collected?**
   - Is there a signing individual form?
   - What fields? (name, title, date)
   - Where is this stored?

4. **Show the entity buyer form component code**

### 2D: Trust Buyer (Transferee) Form

If the buyer is a trust:

1. **What fields are collected?**

| Field | Collected? | Required? | Maps to RERX |
|-------|-----------|-----------|--------------|
| Trust name | ? | ? | Party 67 RawPartyFullName |
| EIN | ? | ? | Party 67 PartyIdentification type 2 |
| Trust instrument execution date | ? | ? | Party 67 TrustInstrumentExecutionDateText |
| Revocable trust indicator | ? | ? | Party 67 RevocableTrustIndicator |
| TransferPartyTrustIndicator | ? | ? | Must be Y for trusts |
| Trustee name | ? | ? | PartyAssociation → Party 68 |
| Trustee address | ? | ? | Party 68 Address |
| Trustee TIN | ? | ? | Party 68 PartyIdentification |
| Beneficiaries | ? | ? | PartyAssociation → Party 68 |

2. **Show the trust buyer form component code**

### 2E: Seller (Transferor) Form

For each seller:

1. **What fields are collected?**

| Field | Collected? | Required? | Maps to RERX |
|-------|-----------|-----------|--------------|
| Seller type (individual/entity/trust) | ? | ? | Determines Party 69 structure |
| **Individual seller:** | | | |
| First name | ? | ? | Party 69 name fields |
| Last name | ? | ? | Party 69 name fields |
| SSN/TIN | ? | ? | Party 69 PartyIdentification |
| Address | ? | ? | Party 69 Address |
| **Entity seller:** | | | |
| Entity name | ? | ? | Party 69 RawPartyFullName |
| EIN | ? | ? | Party 69 PartyIdentification |
| Address | ? | ? | Party 69 Address |
| **Trust seller:** | | | |
| Trust name | ? | ? | Party 69 RawPartyFullName |
| Trust execution date | ? | ? | TrustInstrumentExecutionDateText |
| Trustee info | ? | ? | PartyAssociation → Party 70 |

2. **Are sellers collected in the party portal or only in the wizard?**
   - Does the seller get a portal link?
   - Or is seller info entered directly by staff in the wizard?

3. **Show the seller form component (if it exists in the portal)**

### 2F: Fields the RERX Builder REQUIRES but Might Not Be Collected

Cross-reference the RERX builder (`api/app/services/fincen/rerx_builder.py`) with what the portal collects:

```bash
# What fields does the RERX builder extract from party_data?
grep -n "party_data\[" api/app/services/fincen/rerx_builder.py
grep -n "wizard_data\[" api/app/services/fincen/rerx_builder.py
grep -n "get(\|\.get(" api/app/services/fincen/rerx_builder.py | head -60
```

For EACH field the builder reads, trace backwards: is this field actually collected in the portal form?

### Output Format for Part 2

```
## Form Coverage Findings

### Form Components Inventory
| Component | File | Handles Party Type |
|-----------|------|--------------------|

### Individual Buyer Coverage
| RERX Required Field | Collected in Portal? | Form Field Name | Required in Form? |
|---------------------|---------------------|-----------------|-------------------|

### Entity Buyer Coverage
| RERX Required Field | Collected in Portal? | Form Field Name | Required in Form? |
|---------------------|---------------------|-----------------|-------------------|

### Trust Buyer Coverage
| RERX Required Field | Collected in Portal? | Form Field Name | Required in Form? |
|---------------------|---------------------|-----------------|-------------------|

### Seller Coverage
| RERX Required Field | Collected in Portal? | Form Field Name | Required in Form? |
|---------------------|---------------------|-----------------|-------------------|

### RERX Builder Fields NOT Collected
| Field | Expected Source | Actually Collected? | Gap Impact |
|-------|----------------|--------------------|-----------:|
```

---

## PART 3: Form Submission — Where Does Data Land?

### 3A: Submit Handler

1. **What endpoint does the portal form submit to?**
```bash
grep -rn "submit\|POST\|save\|handleSubmit" web/components/party-portal/ --include="*.tsx" --include="*.ts" | grep -i "fetch\|api\|endpoint\|submit"
```

2. **What is the request payload shape?** Show the exact JSON structure sent for each party type.

3. **What backend endpoint receives it?**
```bash
grep -rn "party.*submit\|portal.*submit\|POST.*party\|POST.*portal" api/app/routes/ --include="*.py"
```

4. **Show the full backend handler** — every line.

### 3B: Data Storage

1. **Where does submitted party data get stored?**
   - Is it stored in `ReportParty.party_data` (JSONB)?
   - Is it stored in `Report.wizard_data.collection`?
   - Is it stored in BOTH places?
   - Are there any transformations between portal form fields and storage fields?

2. **Show the exact storage code.** What model gets updated? What fields?

3. **Does the RERX builder read from the same location the portal writes to?**
   - Builder reads from: `report.parties where party_role="transferee"` → `party_data`
   - Builder also reads from: `report.wizard_data.collection`
   - Portal writes to: ???
   - **IS THERE A MISMATCH?**

### 3C: Status Transitions on Submission

1. **What happens to the Party/PartyLink status when the form is submitted?**
   - Party status: what does it change from/to?
   - PartyLink status: what does it change from/to?
   - Report status: does it change?
   - SubmissionRequest status: does it change?

2. **Is there a "all parties complete" check?**
   - What triggers the report to move from "collecting" to "ready for review"?
   - Is this automatic or manual?
   - Show the code

3. **Show the status transition code path**

### Output Format for Part 3

```
## Data Flow Findings

### Submission Path
- Frontend submit handler: [file + function]
- API endpoint: [method + path]
- Backend handler: [file + function]

### Storage Location
- Portal writes to: [model.field]
- RERX builder reads from: [model.field]
- MATCH? YES/NO
- Transformation needed? [describe]

### Payload Shape (per party type)
[Show JSON example for each]

### Status Transitions
| Event | Party Status | PartyLink Status | Report Status | Code Location |
|-------|-------------|-----------------|---------------|---------------|
| Link sent | ? | ? | ? | |
| Form opened | ? | ? | ? | |
| Form submitted | ? | ? | ? | |
| All parties done | ? | ? | ? | |
```

---

## PART 4: Post-Submission Experience

### 4A: Party's Experience After Submission

1. **What does the party see after submitting?**
   - Confirmation page? What does it say?
   - Can they go back and edit?
   - Can they check status later?
   - Is the token still valid after submission?

2. **Show the confirmation/success page code**

### 4B: Staff's Visibility Into Party Submissions

1. **In the wizard, how does staff see party submission status?**
   - Is there a party tracking step/panel?
   - Does it show: sent / opened / submitted / needs attention?
   - Can staff see WHAT the party submitted?
   - Can staff edit party-submitted data?

2. **In the report detail, is there party status shown?**

3. **Show the wizard party tracking UI code**

### 4C: Notifications

1. **When a party submits their form, who gets notified?**
   - Is an email sent to staff?
   - Is an in-app notification created?
   - Is there an audit log entry?

2. **When a party link is sent, is an email sent?**
   - Show the email template
   - What info is in the email? (link, instructions, deadline?)

3. **Show notification code for party events:**
```bash
grep -rn "email\|notify\|notification\|send.*party\|party.*email" api/app/ --include="*.py" | grep -iv "test\|comment"
```

### Output Format for Part 4

```
## Post-Submission Findings

### Party Confirmation
- Confirmation page: YES/NO [content summary]
- Edit after submit: YES/NO
- Re-access via token: YES/NO
- Token invalidation: [when/if]

### Staff Visibility
- Party status in wizard: YES/NO [component + what's shown]
- Party data viewable: YES/NO
- Party data editable by staff: YES/NO
- Report party list: [what's shown]

### Notifications
| Event | Email Sent? | Recipient | Audit Log? | Code Location |
|-------|------------|-----------|------------|---------------|
| Link generated | ? | ? | ? | |
| Party opens link | ? | ? | ? | |
| Party submits form | ? | ? | ? | |
| All parties complete | ? | ? | ? | |
```

---

## PART 5: RERX Builder ↔ Portal Data Contract

This is the most critical section. The RERX builder is the CONSUMER of portal data. If the portal doesn't produce what the builder expects, filings will fail.

### 5A: Trace the Builder's Data Reads

```bash
# Show every field access from party_data and wizard_data in the RERX builder
cat api/app/services/fincen/rerx_builder.py
```

For EACH party type the builder generates (67, 68, 69, 70), document:
- What fields it reads
- From which source (wizard_data vs party_data vs report.parties)
- Whether that field is required or optional
- Whether the portal actually populates that field

### 5B: Build a Complete Field Map

```
## RERX Builder ↔ Portal Data Contract

### Party 67 (Transferee/Buyer)
| RERX XML Element | Builder Source Field | Portal Form Field | Collected? | Gap? |
|------------------|---------------------|-------------------|-----------|------|
| RawPartyFullName | party_data["entity_name"] | Entity Name input | ? | ? |
| RawIndividualFirstName | party_data["first_name"] | First Name input | ? | ? |
| ... | ... | ... | ... | ... |

### Party 68 (Associated Person — BO/Signing Individual)
| RERX XML Element | Builder Source Field | Portal Form Field | Collected? | Gap? |
|------------------|---------------------|-------------------|-----------|------|

### Party 69 (Transferor/Seller)
| RERX XML Element | Builder Source Field | Portal Form Field | Collected? | Gap? |
|------------------|---------------------|-------------------|-----------|------|

### Party 70 (Seller Trust Trustee)
| RERX XML Element | Builder Source Field | Portal Form Field | Collected? | Gap? |
|------------------|---------------------|-------------------|-----------|------|
```

### 5C: Preflight Validation Cross-Check

The RERX builder has preflight checks that will block filing if data is missing. For EACH preflight check, verify the portal collects the required data:

```bash
grep -n "PreflightError\|preflight\|required\|missing" api/app/services/fincen/rerx_builder.py
```

```
## Preflight ↔ Portal Coverage

| Preflight Check | What It Validates | Portal Collects It? | Gap? |
|-----------------|-------------------|--------------------|----- |
| Buyer has identification | SSN, EIN, or foreign TIN present | ? | ? |
| Buyer has address | Street, city, state, ZIP | ? | ? |
| Seller exists | At least one transferor | ? | ? |
| ... | ... | ... | ... |
```

---

## PART 6: Edge Cases & Error Handling

### 6A: What Happens When...

1. **A party partially fills the form and closes the browser?**
   - Is data auto-saved?
   - Can they return to the same token and resume?
   - Is partial data stored?

2. **A party submits with missing required fields?**
   - Is validation client-side, server-side, or both?
   - What error messages are shown?
   - Can they correct and resubmit?

3. **The token link is expired or invalid?**
   - What does the party see?
   - Is there a way to request a new link?

4. **Multiple buyers or multiple sellers?**
   - Does each get their own link?
   - How are multiple transferees/transferors handled?
   - Does the wizard support adding more parties after initial link generation?

5. **Staff needs to correct party-submitted data?**
   - Can staff edit data after party submission?
   - Does this require the party to resubmit?

### 6B: Mobile Experience

1. **Is the party portal responsive/mobile-friendly?**
   - Many parties will access via phone
   - Are form fields usable on mobile?

---

## PART 7: Cross-Cutting Concerns

### 7A: Security

1. **Is party data (SSN, EIN) encrypted at rest?**
2. **Is the portal served over HTTPS?**
3. **Can a token be brute-forced?** (length, entropy)
4. **Is there rate limiting on the portal endpoint?**
5. **Can one party's token access another party's data?**

### 7B: Data Sensitivity Display

1. **Are SSNs/EINs masked in the UI after entry?** (show only last 4)
2. **Are SSNs/EINs masked in the staff wizard view?**
3. **Are SSNs/EINs stored in full or masked?**

---

## DELIVERABLE

After completing this investigation, produce a single document:

**`docs/INVESTIGATION_PARTY_PORTAL_FINDINGS.md`**

Containing ALL findings from Parts 1-7 in the formats specified, plus a final section:

```
## CRITICAL GAPS SUMMARY

### 🔴 Blockers (Party portal won't work without these)
| Gap | Impact | Estimated Effort |
|-----|--------|-----------------|

### 🟡 Important (Should fix before March 1)
| Gap | Impact | Estimated Effort |
|-----|--------|-----------------|

### 🟢 Nice to Have (Post-launch)
| Gap | Impact | Estimated Effort |
|-----|--------|-----------------|

## RERX DATA CONTRACT STATUS

### Fully Covered (portal collects → builder consumes → XML generated)
- [list]

### Partially Covered (some fields missing)
- [list with specific missing fields]

### Not Covered (builder expects data that portal does not collect)
- [list — THESE ARE BLOCKERS]
```

**DO NOT FIX ANYTHING. INVESTIGATION ONLY.** We need the full picture before building remediation.
