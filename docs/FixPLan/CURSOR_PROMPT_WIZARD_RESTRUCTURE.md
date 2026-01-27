# CURSOR PROMPT: Restructure Wizard Flow

## OBJECTIVE
The wizard currently collects ALL party data (seller, buyer, beneficial owners, payment) in Phase 2.
This is WRONG. Parties should fill out their OWN information via the party portal.

Restructure the wizard so that:
1. Phase 1 (Determination) remains the same - steps 1-6
2. Phase 2 (Collection) changes to: transaction → party setup → monitor → review → reporting person → file
3. Remove steps where PCT Staff enters party data (parties do this themselves via portal)
4. Integrate existing party link generation into the new "party-setup" step

---

## FILE LOCATIONS

```
web/components/rrer-questionnaire.tsx    # Main wizard component (~164KB)
web/lib/rrer-types.ts                    # Type definitions & constants
web/app/(app)/app/reports/[id]/wizard/page.tsx  # Wizard page wrapper
```

---

## CURRENT ARCHITECTURE (from technical doc)

### Current Three Phases:
- Phase 1: Determination (property → financing → buyer type → exemptions → result)
- Phase 2: Collection (transaction → sellers → buyers → signers → payment → reporting → certs)
- Phase 3: Summary (review → print)

### Current Collection Steps (THE PROBLEM - lines 300-308):
```typescript
const collectionSteps: CollectionStepId[] = [
  "transaction-property",    // PCT enters transaction details
  "seller-info",             // PCT enters seller data ← WRONG
  "buyer-info",              // PCT enters buyer data ← WRONG  
  "signing-individuals",     // PCT enters signer data ← WRONG
  "payment-info",            // PCT enters payment data ← WRONG
  "reporting-person",        // PCT enters (KEEP - internal)
  "certifications",          // PCT enters certifications ← WRONG
]
```

### Existing Backend Actions Section:
The wizard page already has a "Backend Actions" section with:
- Run Determination button
- Generate Party Links button  
- Ready Check button
- File Report button

### Existing Party Status Polling (lines 729-763):
```typescript
// Already exists - 15 second polling when status === "collecting"
useEffect(() => {
  if (report?.status === "collecting") {
    fetchPartyStatus(false)
    const interval = setInterval(() => fetchPartyStatus(true), 15000)
    return () => clearInterval(interval)
  }
}, [report?.status, fetchPartyStatus])
```

---

## NEW COLLECTION STEPS

```typescript
// CHANGE FROM:
const collectionSteps: CollectionStepId[] = [
  "transaction-property",    // KEEP
  "seller-info",             // REMOVE - party fills via portal
  "buyer-info",              // REMOVE - party fills via portal
  "signing-individuals",     // REMOVE - party fills via portal
  "payment-info",            // REMOVE - party fills via portal
  "reporting-person",        // KEEP - but move to after review
  "certifications",          // REMOVE - party certifies in portal
]

// CHANGE TO:
const collectionSteps: CollectionStepId[] = [
  "transaction-property",    // KEEP - PCT enters closing date, price, property details
  "party-setup",             // NEW - Add parties (name, email, type), send links
  "monitor-progress",        // NEW - Track party submissions with polling
  "review-submissions",      // NEW - View all submitted party data
  "reporting-person",        // KEEP - PCT internal info
  "file-report",             // NEW - Final certification and file
]
```

---

## PHASE 1: DETERMINATION - NO CHANGES

Keep all determination steps exactly as they are (lines 389-434 in rrer-questionnaire.tsx):
- property
- intent-to-build (conditional)
- financing
- lender-aml (conditional)
- buyer-type
- individual-exemptions / entity-exemptions / trust-exemptions (conditional)
- determination-result

The determination logic and step navigation should NOT be modified.

---

## PHASE 2: COLLECTION - NEW STEPS

### STEP: transaction-property (KEEP - minimal changes)

This step already exists and should be kept mostly as-is.
- Closing date
- Property address (can be pre-filled if from submission)
- Property type
- APN (optional)
- Purchase price

The existing `CollectionData` interface fields for this step are correct.

---

### STEP: party-setup (NEW - replaces old collection steps)

**Purpose:** PCT Staff identifies all parties and sends them secure links.

**Integration Point:** Move the existing "Generate Party Links" functionality from Backend Actions into this step.

**Use existing API:** `POST /reports/{id}/party-links` with `PartyInput[]`

**UI Layout**
```
┌─────────────────────────────────────────────────────────────────┐
│ 📋 Party Setup                                                  │
│ Identify all parties and send them secure information requests  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ SELLERS                                                         │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ 👤 Seller 1                                       [Remove]  ││
│ │                                                             ││
│ │ Name*: [John Smith________________]                         ││
│ │ Email*: [john@email.com___________]                         ││
│ │ Type: ○ Individual  ○ Entity  ○ Trust                       ││
│ │ Entity Name (if entity/trust): [_____________]              ││
│ └─────────────────────────────────────────────────────────────┘│
│ [+ Add Another Seller]                                          │
│                                                                 │
│ BUYERS                                                          │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ 🏢 Buyer 1                                        [Remove]  ││
│ │                                                             ││
│ │ Name/Entity Name*: [ABC Holdings LLC_______]                ││
│ │ Contact Email*: [contact@abc.com______]                     ││
│ │ Type: ○ Individual  ● Entity  ○ Trust                       ││
│ │                                                             ││
│ │ 💡 This party will be asked to provide:                     ││
│ │    • Entity details (EIN, formation state, address)         ││
│ │    • All beneficial owners (25%+ ownership or control)      ││
│ │    • Signing individual information                         ││
│ │    • Payment source details                                 ││
│ └─────────────────────────────────────────────────────────────┘│
│ [+ Add Another Buyer]                                           │
│                                                                 │
│ ─────────────────────────────────────────────────────────────  │
│ 📧 Email Preview                                                │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ Each party will receive a secure link via email.            ││
│ │ Links expire in 30 days.                                    ││
│ │                                                             ││
│ │ Property: 123 Main St, Los Angeles, CA 90210               ││
│ └─────────────────────────────────────────────────────────────┘│
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ ⚠️ Links will be sent immediately upon clicking Continue        │
│                              [← Back]  [Send Links & Continue →]│
└─────────────────────────────────────────────────────────────────┘
```

**Data Structure (new type needed):**
```typescript
interface PartySetupData {
  sellers: PartySetupItem[]
  buyers: PartySetupItem[]
}

interface PartySetupItem {
  id: string            // Local ID for UI
  name: string          // Display name
  email: string         // Required for sending link
  type: "individual" | "entity" | "trust"
  entityName?: string   // If entity or trust
}
```

**On "Send Links & Continue":**
1. Validate: at least 1 seller, at least 1 buyer, all emails valid
2. Call existing `createPartyLinks(reportId, parties)` API
3. This creates Party records and triggers SendGrid emails
4. Update report status to "collecting"
5. Move to "monitor-progress" step

**Remove from Backend Actions Section:**
The "Generate Party Links" button should be removed from the Backend Actions Section since this functionality is now integrated into the wizard flow.

---

### STEP: monitor-progress (NEW - uses existing polling)

**Purpose:** PCT Staff monitors which parties have submitted their information.

**Integration Point:** Use the EXISTING party status polling (lines 729-763 of rrer-questionnaire.tsx). This code already polls every 15 seconds and shows toast notifications.

**Existing Code to Leverage:**
```typescript
// This already exists in the wizard page
const [partyStatus, setPartyStatus] = useState<ReportPartiesResponse | null>(null)

// This polling logic already exists
useEffect(() => {
  if (report?.status === "collecting") {
    fetchPartyStatus(false)
    const interval = setInterval(() => fetchPartyStatus(true), 15000)
    return () => clearInterval(interval)
  }
}, [report?.status, fetchPartyStatus])
```

**Use Existing API:** `GET /reports/{id}/parties`

**Existing Response Structure (ReportPartiesResponse):**
```typescript
interface ReportPartiesResponse {
  report_id: string
  property_address: string | null
  parties: PartyStatusItem[]
  summary: {
    total: number
    submitted: number
    pending: number
    all_complete: boolean
  }
}
```

**UI Layout**
```
┌─────────────────────────────────────────────────────────────────┐
│ 📊 Monitoring Party Submissions                                 │
│ Track information submissions from all parties                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │              {summary.submitted} of {summary.total} Complete ││
│ │ ████████████████████████░░░░░░░░░░░░  67%                   ││
│ └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│ {parties.map(party => (                                         │
│   party.status === "submitted" ? (                              │
│     <SubmittedCard party={party} />                            │
│   ) : (                                                         │
│     <PendingCard party={party} />                              │
│   )                                                             │
│ ))}                                                             │
│                                                                 │
│ 🔄 Auto-refreshing every 15 seconds      [Refresh Now]         │
│ Last updated: {lastPartyUpdate}                                │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ {summary.all_complete ? (                                       │
│   "✅ All parties have submitted! You can proceed."            │
│ ) : (                                                           │
│   "⏳ Waiting for all parties to submit..."                    │
│ )}                                                              │
│                                                                 │
│            [← Back to Party Setup]  [Continue to Review →]     │
│                                     (disabled until all_complete)│
└─────────────────────────────────────────────────────────────────┘
```

**Submitted Card:**
```
┌─────────────────────────────────────────────────────────────────┐
│ ✅ {party.display_name} ({party.party_role})                    │
│    Submitted {formatDate(party.submitted_at)}                   │
│    [View Submission →]                                          │
└─────────────────────────────────────────────────────────────────┘
```

**Pending Card:**
```
┌─────────────────────────────────────────────────────────────────┐
│ ⏳ {party.display_name} ({party.party_role})           PENDING  │
│    Link sent {formatDate(party.created_at)}                     │
│    Expires: {formatDate(party.link_expires_at)}                 │
│                                                                 │
│    [{party.link}]  [📋 Copy] [📧 Resend] [⏰ Remind]            │
└─────────────────────────────────────────────────────────────────┘
```

**Behavior:**
- "Continue to Review" button DISABLED until `summary.all_complete === true`
- Show toast notifications when parties submit (existing functionality)
- Allow going back to add more parties if needed
- "Resend" calls existing party link resend functionality
- "Remind" sends a reminder email (can use same email template)

---

### STEP: review-submissions (NEW - view party-submitted data)

**Purpose:** PCT Staff reviews all information submitted by parties before filing.

**Key Insight:** The party data is stored in `report_parties.party_data` (JSONB field).
The portal submission saves all collected data to this field.

**API:** `GET /reports/{id}/parties` returns party data including submissions.

**UI Layout**
```
┌─────────────────────────────────────────────────────────────────┐
│ 📝 Review Party Submissions                                     │
│ Review all information before filing to FinCEN                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ SELLERS                                                         │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ 📋 John Smith (Individual)                       [Collapse] ││
│ ├─────────────────────────────────────────────────────────────┤│
│ │ Full Name: John Michael Smith                               ││
│ │ Date of Birth: January 15, 1975                             ││
│ │ SSN: •••-••-1234                                            ││
│ │ Citizenship: U.S. Citizen                                   ││
│ │                                                             ││
│ │ Address After Closing:                                      ││
│ │ 456 New Street, Los Angeles, CA 90001                       ││
│ │                                                             ││
│ │ ✅ Certification signed: Jan 27, 2026 2:30 PM               ││
│ │                                                             ││
│ │ [⚠️ Request Correction]                                     ││
│ └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│ BUYERS                                                          │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ 📋 ABC Holdings LLC (Entity)                     [Collapse] ││
│ ├─────────────────────────────────────────────────────────────┤│
│ │ ENTITY DETAILS                                              ││
│ │ Legal Name: ABC Holdings LLC                                ││
│ │ Type: LLC (Multi-Member)                                    ││
│ │ EIN: 12-3456789                                             ││
│ │ Formation: Delaware, January 10, 2020                       ││
│ │ Address: 789 Business Ave, Suite 100, NYC, NY 10001         ││
│ │                                                             ││
│ │ BENEFICIAL OWNERS (2)                                       ││
│ │ ┌───────────────────────────────────────────────────────┐  ││
│ │ │ 1. Robert Johnson                                     │  ││
│ │ │    50% ownership | Managing Member                    │  ││
│ │ │    DOB: March 22, 1980 | SSN: •••-••-5678             │  ││
│ │ │    123 Owner Lane, Los Angeles, CA 90001              │  ││
│ │ │    ID: California Driver's License #•••••1234         │  ││
│ │ └───────────────────────────────────────────────────────┘  ││
│ │ ┌───────────────────────────────────────────────────────┐  ││
│ │ │ 2. Sarah Williams                                     │  ││
│ │ │    50% ownership                                      │  ││
│ │ │    DOB: July 8, 1985 | SSN: •••-••-9012               │  ││
│ │ │    456 Partner Blvd, San Francisco, CA 94102          │  ││
│ │ │    ID: U.S. Passport #•••••5678                       │  ││
│ │ └───────────────────────────────────────────────────────┘  ││
│ │                                                             ││
│ │ SIGNING INDIVIDUAL                                          ││
│ │ Robert Johnson (Managing Member)                            ││
│ │                                                             ││
│ │ PAYMENT INFORMATION                                         ││
│ │ Total: $500,000.00                                          ││
│ │ Source: Wire Transfer - Business Funds                      ││
│ │ From: Chase Bank ****4567 (ABC Holdings operating acct)     ││
│ │                                                             ││
│ │ ✅ Certification signed: Jan 27, 2026 3:15 PM               ││
│ │                                                             ││
│ │ [⚠️ Request Correction]                                     ││
│ └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│ ─────────────────────────────────────────────────────────────  │
│                                                                 │
│ REVIEWER CERTIFICATION                                          │
│ ☐ I have reviewed all party submissions and confirm the        │
│   information appears complete and accurate to the best of my   │
│   knowledge.                                                    │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                 [← Back]  [Continue to Reporting Person →]      │
│                           (disabled until checkbox checked)     │
└─────────────────────────────────────────────────────────────────┘
```

**Features:**
- Expandable/collapsible sections for each party
- Masked sensitive data (SSN shows last 4 only)
- "Request Correction" reopens party portal for that party
- Certification checkbox required before proceeding
- Shows all beneficial owners inline for entity buyers
- Shows payment info breakdown

**Request Correction Flow:**
1. Click "Request Correction" on a party
2. Optionally add a note about what needs fixing
3. System sends email to party with updated link
4. Party status reverts to "pending"
5. Staff waits in "monitor-progress" until resubmission

---

### STEP: reporting-person (KEEP - already exists)

**Purpose:** This step already exists in the current wizard. Keep it mostly as-is.

**Data:** Who is the reporting person (the title company filing the report)?
- Company name
- Contact info
- Is PCTC the reporting person?

This is internal PCT data, not party-submitted data, so it stays in the wizard.

The existing `ReportingPerson` interface and form should be preserved.

---

### STEP: file-report (NEW - combines ready-check and file)

**Purpose:** Final review summary and file to FinCEN.

**Integration:** Combine the existing "Ready Check" and "File Report" functionality from Backend Actions into this step.

**Use existing APIs:**
- `POST /reports/{id}/ready-check` - Validate completeness
- `POST /reports/{id}/file` - Submit filing

**UI Layout**
```
┌─────────────────────────────────────────────────────────────────┐
│ 📤 File Report to FinCEN                                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ FILING SUMMARY                                                  │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ Property: 123 Main Street, Los Angeles, CA 90210            ││
│ │ Purchase Price: $500,000.00                                 ││
│ │ Closing Date: February 1, 2026                              ││
│ │                                                             ││
│ │ Determination: REPORTABLE                                   ││
│ │ Reason: Non-financed transfer to entity with no exemptions  ││
│ │                                                             ││
│ │ Parties:                                                    ││
│ │ • 1 Seller (Individual) - ✅ Submitted                      ││
│ │ • 1 Buyer (Entity) with 2 beneficial owners - ✅ Submitted  ││
│ │                                                             ││
│ │ Filing Deadline: March 3, 2026 (30 days from closing)       ││
│ │ Days Remaining: 35                                          ││
│ └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│ PRE-FILING CHECK                                                │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ {readyResult ? (                                            ││
│ │   readyResult.ready ? (                                     ││
│ │     "✅ All checks passed. Ready to file."                  ││
│ │   ) : (                                                     ││
│ │     "❌ Issues found:" + readyResult.errors.map(...)        ││
│ │   )                                                         ││
│ │ ) : (                                                       ││
│ │   <Button onClick={runReadyCheck}>Run Pre-Filing Check</Button>││
│ │ )}                                                          ││
│ └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│ FINAL CERTIFICATION                                             │
│ ☐ I certify that:                                               │
│   • I have reviewed all information in this report              │
│   • The information is accurate to the best of my knowledge     │
│   • I am authorized to submit this report on behalf of          │
│     {reportingPerson.companyName}                               │
│                                                                 │
│ ─────────────────────────────────────────────────────────────  │
│                                                                 │
│ 📧 A copy of the filing confirmation will be sent to:           │
│    {reportingPerson.email}                                      │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                              [← Back]  [🚀 Submit to FinCEN]    │
│                                   (disabled until ready + certified)│
└─────────────────────────────────────────────────────────────────┘
```

**On Successful Filing:**
```
┌─────────────────────────────────────────────────────────────────┐
│ ✅ Report Successfully Filed!                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│            🎉                                                   │
│                                                                 │
│ Your report has been submitted to FinCEN.                       │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ Receipt ID: BSA-2026-0127-ABC123                            ││
│ │ Filed At: January 27, 2026 4:45 PM                          ││
│ │ Status: ACCEPTED                                            ││
│ └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│ A confirmation email has been sent to staff@pctfincen.com       │
│                                                                 │
│        [📄 Download Filing Summary]  [← Back to Dashboard]      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Filing States (use existing FileResult interface):**
- ACCEPTED: Green success card with receipt ID
- REJECTED: Red error card with rejection details and retry option
- NEEDS_REVIEW: Amber pending card

**Remove from Backend Actions Section:**
After this change, the Backend Actions Section should only contain:
- "Run Determination" button (for determination phase)

The party links, ready check, and file buttons are now integrated into the wizard flow.

---

## IMPLEMENTATION TASKS

### Task 1: Update Collection Step Types

In `web/lib/rrer-types.ts`, modify the `CollectionStepId` type:

```typescript
// CHANGE FROM:
export type CollectionStepId = 
  | "transaction-property"
  | "seller-info"
  | "buyer-info"
  | "signing-individuals"
  | "payment-info"
  | "reporting-person"
  | "certifications"

// CHANGE TO:
export type CollectionStepId =
  | "transaction-property"
  | "party-setup"
  | "monitor-progress"
  | "review-submissions"
  | "reporting-person"
  | "file-report"
```

### Task 2: Update collectionSteps Array

In `web/components/rrer-questionnaire.tsx`, update the steps array:

```typescript
// CHANGE FROM (around line 300):
const collectionSteps: CollectionStepId[] = [
  "transaction-property",
  "seller-info",
  "buyer-info",
  "signing-individuals",
  "payment-info",
  "reporting-person",
  "certifications",
]

// CHANGE TO:
const collectionSteps: CollectionStepId[] = [
  "transaction-property",
  "party-setup",
  "monitor-progress",
  "review-submissions",
  "reporting-person",
  "file-report",
]
```

### Task 3: Add New State for Party Setup

```typescript
// Add to component state
const [partySetup, setPartySetup] = useState<PartySetupData>({
  sellers: [],
  buyers: [],
})

// Type definition
interface PartySetupData {
  sellers: PartySetupItem[]
  buyers: PartySetupItem[]
}

interface PartySetupItem {
  id: string
  name: string
  email: string
  type: "individual" | "entity" | "trust"
  entityName?: string
}
```

### Task 4: Remove Old Collection Step UI

Remove or comment out the render code for these steps:
- `seller-info`
- `buyer-info`
- `signing-individuals`
- `payment-info`
- `certifications`

This includes:
- The step render conditionals
- The form components for each
- The validation logic for each

### Task 5: Add New Step UI Components

Create render blocks for:
- `party-setup` - Form to add sellers/buyers with emails
- `monitor-progress` - Party status cards with polling
- `review-submissions` - View party-submitted data
- `file-report` - Summary, ready check, and file button

### Task 6: Integrate Existing Functionality

Move these from Backend Actions Section into wizard steps:
- `createPartyLinks()` → party-setup step
- `readyCheck()` → file-report step
- `fileReport()` → file-report step
- Party status polling → monitor-progress step (already exists, just display)

### Task 7: Update Step Navigation Logic

```typescript
// Update canProceedCollection logic
const canProceedCollection = useMemo(() => {
  switch (collectionStep) {
    case "transaction-property":
      return sectionCompletion.transaction
    case "party-setup":
      return partySetup.sellers.length > 0 && 
             partySetup.buyers.length > 0 &&
             partySetup.sellers.every(s => s.email && s.name) &&
             partySetup.buyers.every(b => b.email && b.name)
    case "monitor-progress":
      return partyStatus?.summary.all_complete === true
    case "review-submissions":
      return reviewCertified // new state: has staff checked the review checkbox
    case "reporting-person":
      return sectionCompletion.reportingPerson
    case "file-report":
      return readyResult?.ready && fileCertified // staff certification
    default:
      return false
  }
}, [collectionStep, sectionCompletion, partySetup, partyStatus, reviewCertified, readyResult, fileCertified])
```

### Task 8: Update Backend Actions Section

After the wizard changes, Backend Actions should be simplified:
- KEEP: "Run Determination" button (only visible in determination phase)
- REMOVE: "Generate Party Links" (now in wizard)
- REMOVE: "Ready Check" (now in wizard)
- REMOVE: "File Report" (now in wizard)

---

## WHAT TO REMOVE

The following should be REMOVED from `rrer-questionnaire.tsx`:

1. **Seller Info collection UI** (the form that collects seller details)
2. **Buyer Info collection UI** (the form that collects buyer/entity/trust details)
3. **Signing Individuals collection UI** (the form that collects signer details)
4. **Payment Info collection UI** (the form that collects payment sources)
5. **Certifications collection UI** (the checkbox forms)

These data types in `CollectionData` become UNUSED by the wizard:
- `sellers: SellerData[]`
- `buyerEntity: BuyerEntityData`
- `buyerTrust: BuyerTrustData`
- `signingIndividuals: SigningIndividual[]`
- `paymentSources: PaymentSource[]`
- `buyerCertification: Certification`
- `sellerCertification: Certification`

However, KEEP these types as they may be used by the party portal or review screen.

---

## TESTING CHECKLIST

After implementation:
1. [ ] Determination phase works unchanged (steps 1-6)
2. [ ] "Reportable" result leads to collection phase
3. [ ] Transaction-property step works
4. [ ] Party-setup step allows adding sellers/buyers with emails
5. [ ] "Send Links" calls API and sends emails
6. [ ] Monitor-progress shows party status with polling
7. [ ] Review-submissions displays party-submitted data
8. [ ] Reporting-person step works (existing)
9. [ ] File-report runs ready check and allows filing
10. [ ] Filing shows success/error states correctly
11. [ ] Autosave still works for wizard state
12. [ ] Navigation (back/next) works correctly
13. [ ] Backend Actions Section simplified

---

## FILE SIZE CONSIDERATION

The current `rrer-questionnaire.tsx` is 164KB. After removing the old collection forms, it should be significantly smaller. The new steps are simpler since they don't have the complex nested forms for beneficial owners, payment sources, etc.
