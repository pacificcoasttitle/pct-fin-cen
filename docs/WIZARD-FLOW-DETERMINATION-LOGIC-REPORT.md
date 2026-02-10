# Wizard Flow & Determination Logic — Complete Report

> Generated: February 10, 2026  
> Source: `web/components/rrer-questionnaire.tsx`, `web/lib/rrer-types.ts`, `api/app/services/determination.py`, `api/app/services/early_determination.py`

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Phases & Steps](#2-phases--steps)
3. [Phase 1: Determination — Step-by-Step](#3-phase-1-determination--step-by-step)
4. [DeterminationState (All Fields)](#4-determinationstate-all-fields)
5. [Determination Logic (Frontend)](#5-determination-logic-frontend)
6. [Determination Logic (Backend)](#6-determination-logic-backend)
7. [Phase 2: Collection — Step-by-Step](#7-phase-2-collection--step-by-step)
8. [CollectionData (All Fields)](#8-collectiondata-all-fields)
9. [Phase 3: Summary](#9-phase-3-summary)
10. [Exemption Constants (All Options)](#10-exemption-constants-all-options)
11. [Navigation & Flow Control](#11-navigation--flow-control)
12. [Section Completion Logic](#12-section-completion-logic)
13. [What's Missing / Gaps](#13-whats-missing--gaps)

---

## 1. Architecture Overview

The wizard is a single React component (`RRERQuestionnaire`) with **3 phases**, a dynamic determination engine, and conditional step branching.

```
┌─────────────────────────────────────────────────────────────────┐
│                        WIZARD FLOW                              │
│                                                                 │
│  Phase 1: DETERMINATION                                         │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ property → [intent-to-build] → financing → [lender-aml]    ││
│  │ → buyer-type → [individual|entity|trust]-exemptions         ││
│  │ → determination-result                                      ││
│  └─────────────────────────────────────────────────────────────┘│
│         │                           │                           │
│     EXEMPT ──→ Certificate       REPORTABLE ──→ Phase 2        │
│                                                                 │
│  Phase 2: COLLECTION                                            │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Session 1: transaction-property → party-setup → send links  ││
│  │            → LinksSentConfirmation → EXIT to dashboard       ││
│  │                                                              ││
│  │ Session 2: reporting-person → file-report                   ││
│  │            (Review & Certify → File with FinCEN)            ││
│  │                                                              ││
│  │ Non-linear (accessible but not mandatory):                  ││
│  │   monitor-progress, review-submissions,                     ││
│  │   seller-info, buyer-info, signing-individuals, payment-info││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  Phase 3: SUMMARY                                               │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Filing Preparation Summary → Document Generation            ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### Key Design Decisions
- **Phase 1 steps are dynamic** — steps are added/removed based on previous answers
- **Phase 2 uses a split-session model** — Session 1 (setup + send links), Session 2 (review + file)
- **Determination auto-persists** to backend when result step is reached
- **Some collection steps are non-linear** — accessible via navigation but not in the `collectionSteps` array

---

## 2. Phases & Steps

### Phase Type

```typescript
type Phase = "determination" | "collection" | "summary"
```

### Determination Steps

```typescript
type DeterminationStepId = 
  | "property"                 // Step 1: Is this residential?
  | "intent-to-build"         // Step 1A: Intent to build? (only if NOT residential)
  | "financing"               // Step 2: Non-financed transfer?
  | "lender-aml"              // Step 2A: Lender has AML? (only if financed)
  | "buyer-type"              // Step 3: Individual, Entity, or Trust?
  | "individual-exemptions"   // Step 4: Transaction exemptions (if individual)
  | "entity-exemptions"       // Step 5: Entity exemptions (if entity)
  | "trust-exemptions"        // Step 6: Trust exemptions (if trust)
  | "determination-result"    // Final: Shows result
```

### Collection Steps (Linear Flow)

```typescript
const collectionSteps: CollectionStepId[] = [
  "transaction-property",   // Section 2A: Closing date, price, property address
  "party-setup",            // Section 2B: Add sellers/buyers, send links
  "reporting-person",       // Section 2F: Reporting person designation
  "file-report",            // Section 2F: Review, certify, file with FinCEN
]
```

### Collection Steps (Non-Linear / Accessible via Navigation)

These steps have rendered UI but are NOT in the linear `collectionSteps` array:

| Step ID | Section | Description |
|---------|---------|-------------|
| `monitor-progress` | 2C | Track party submission progress |
| `review-submissions` | — | Review submitted party data |
| `seller-info` | 2B | Detailed seller information (name, SSN, address, etc.) |
| `buyer-info` | 2C | Buyer entity/trust details, beneficial owners |
| `signing-individuals` | 2D | Individuals signing on behalf of entity/trust |
| `payment-info` | 2E | Payment source details |
| `certifications` | — | Buyer/seller certification agreements |

---

## 3. Phase 1: Determination — Step-by-Step

### Step 1: Property Type (`"property"`)
**Always shown first.**

| Field | Question | UI |
|-------|----------|-----|
| `determination.isResidential` | "Is this a Residential Transaction?" | Two large card buttons: **Yes** (Residential property) / **No** (Commercial/Other) |

**Description shown:** "Residential includes: 1-4 Family Structure, Intent to Build 1-4 Family Structure, Condo/Townhome, or Co-op (per 1031.320(b))"

**Branching:**
- If `"yes"` → go to **Financing** (Step 2)
- If `"no"` → go to **Intent to Build** (Step 1A)

---

### Step 1A: Intent to Build (`"intent-to-build"`)
**Only shown if `isResidential === "no"`.**

| Field | Question | UI |
|-------|----------|-----|
| `determination.hasIntentToBuild` | "Does the Buyer intend to build a 1-4 family residential structure?" | Two buttons: **Yes** / **No** |

**Description:** "Per 1031.320(b)(ii), land purchased with intent to build residential property is covered."

**Branching:**
- If `"yes"` → go to **Financing** (Step 2)
- If `"no"` → **EXEMPT** → go to **Determination Result**

---

### Step 2: Financing (`"financing"`)
**Shown if `isResidential === "yes"` OR (`isResidential === "no"` AND `hasIntentToBuild === "yes"`).**

| Field | Question | UI |
|-------|----------|-----|
| `determination.isNonFinanced` | "Is this a non-financed transfer?" | Two buttons: **Yes (Non-financed)** / **No (Has Lender)** |

**Description:** "A non-financed transfer means no mortgage lender is involved in the transaction (cash purchase, seller financing, etc.)"

**Pre-fill indicator:** Shows if client previously indicated financing type from submission form.

**Branching:**
- If `"yes"` (non-financed) → go to **Buyer Type** (Step 3)
- If `"no"` (has lender) → go to **Lender AML** (Step 2A)

---

### Step 2A: Lender AML Program (`"lender-aml"`)
**Only shown if `isNonFinanced === "no"` (transaction has a lender).**

| Field | Question | UI |
|-------|----------|-----|
| `determination.lenderHasAml` | "Does the Lender have an Anti-Money Laundering (AML) Program?" | Three buttons: **Yes** / **No** / **Unknown** |

**Description:** "Per 1031.320(i), lenders with AML programs handle their own reporting requirements."

**Helper text:** "Most institutional lenders (banks, credit unions) have AML programs."

**Branching:**
- If `"yes"` → **EXEMPT** → go to **Determination Result**
- If `"no"` or `"unknown"` → go to **Buyer Type** (Step 3)

---

### Step 3: Buyer Type (`"buyer-type"`)
**Shown if not already exempt from AML check.**

| Field | Question | UI |
|-------|----------|-----|
| `determination.buyerType` | "Is the Buyer (Transferee) an Individual, Entity, or Trust?" | Three buttons: **Individual** (Natural person) / **Entity** (LLC, Corp, Partnership) / **Trust** (Any trust type) |

**Sub-questions (Entity only):**

| Field | Question | Shown When |
|-------|----------|-----------|
| `determination.entitySubtype` | "What type of entity is the buyer?" | `buyerType === "entity"` |
| `determination.buyerBoiStatus` | "Has this entity filed its BOI report with FinCEN?" | `buyerType === "entity"` AND `entitySubtype` is set AND `entitySubtype !== "pension_plan"` |
| `determination.buyerFincenId` | "FinCEN ID (optional)" | `buyerBoiStatus === "filed"` |

**Entity Subtype Options:**
- LLC
- Domestic Corporation
- Foreign Entity
- Partnership
- Pension/Retirement Plan
- Other

**BOI Status Options:**
- Yes, BOI report filed with FinCEN
- No, not yet filed
- Exempt from BOI reporting
- Unknown

**After subtype selected:** Shows a document checklist for the selected entity type.

**Branching based on buyerType:**
- `"individual"` → go to **Individual Exemptions** (Step 4)
- `"entity"` → go to **Entity Exemptions** (Step 5)
- `"trust"` → go to **Trust Exemptions** (Step 6)

---

### Step 4: Individual Exemptions (`"individual-exemptions"`)
**Only shown if `buyerType === "individual"`.**

| Field | Question | UI |
|-------|----------|-----|
| `determination.individualExemptions` | "Does any of the following exemptions apply to this transaction?" | Checkbox list |

**Description:** "Per 1031.320(b)(2), certain transaction types are exempt from reporting."

**Options (checkboxes):**
1. ☐ Easement only (no fee simple transfer)
2. ☐ Transfer due to death (inheritance/estate distribution)
3. ☐ Transfer due to divorce or legal dissolution
4. ☐ Transfer to a bankruptcy estate
5. ☐ Court-supervised transfer (judicial sale, receivership)
6. ☐ No-consideration transfer to a trust where the individual (alone or with spouse) is the settlor/grantor
7. ☐ 1031 Exchange transaction
8. ☐ No reporting person identified for this transaction

**Separator**

9. ☐ **None of the above apply** (disables all other checkboxes when selected)

**Branching:**
- If ANY exemption selected → **EXEMPT** → Determination Result
- If `"none"` selected → **REPORTABLE** → Determination Result

---

### Step 5: Entity Exemptions (`"entity-exemptions"`)
**Only shown if `buyerType === "entity"`.**

| Field | Question | UI |
|-------|----------|-----|
| `determination.entityExemptions` | "Is the Buyer Entity any of the following exempt entity types?" | Scrollable checkbox list |

**Description:** "Per 1031.320(n)(10), certain regulated entities are exempt from RRER reporting."

**Options (checkboxes):**
1. ☐ Securities reporting issuer (publicly traded company)
2. ☐ Governmental authority (federal, state, local, tribal, foreign)
3. ☐ Bank or credit union
4. ☐ Depository institution holding company
5. ☐ Money services business (registered with FinCEN)
6. ☐ Broker or dealer in securities (SEC registered)
7. ☐ Securities exchange or clearing agency
8. ☐ Other Exchange Act registered entity
9. ☐ Insurance company
10. ☐ State-licensed insurance producer
11. ☐ Commodity Exchange Act registered entity
12. ☐ Public utility
13. ☐ Designated financial market utility
14. ☐ Registered investment company or investment adviser
15. ☐ Entity controlled or wholly owned by any of the above

**Separator**

16. ☐ **None of the above apply**

**Branching:** Same as Individual Exemptions.

---

### Step 6: Trust Exemptions (`"trust-exemptions"`)
**Only shown if `buyerType === "trust"`.**

| Field | Question | UI |
|-------|----------|-----|
| `determination.trustExemptions` | "Is the Buyer Trust any of the following exempt trust types?" | Checkbox list |

**Description:** "Per 1031.320(n)(11), certain trust types are exempt from RRER reporting."

**Options (checkboxes):**
1. ☐ Trust that is a securities reporting issuer
2. ☐ Trust where the Trustee is a securities reporting issuer
3. ☐ Statutory trust (Delaware Statutory Trust, etc.)
4. ☐ Trust wholly owned by an exempt entity listed in the entity exemptions

**Separator**

5. ☐ **None of the above apply**

**Branching:** Same as Individual Exemptions.

---

### Determination Result (`"determination-result"`)
**Always the final determination step.**

**Two possible outcomes:**

#### If EXEMPT (Not Reportable)
- Green gradient card with shield/checkmark icon
- Title: **"No FinCEN Report Required"**
- Shows reason text
- Shows list of selected exemption reasons
- **Action button:** "View & Print Exemption Certificate" → opens dialog with `ExemptionCertificate` component
- **Navigation:** "Back to Requests" / "Start New Request" buttons (navigates away, no local state reset)

#### If REPORTABLE
- Amber/orange gradient card with warning icon
- Title: **"FinCEN Report Required"**
- Shows: "This is a REPORTABLE TRANSFER requiring FinCEN Real Estate Report filing."
- Filing deadline notice: "Filing deadline: 30 days from closing"
- **Action:** "Begin Data Collection" button → advances to Phase 2

---

## 4. DeterminationState (All Fields)

```typescript
interface DeterminationState {
  isResidential: YesNoUnknown           // "yes" | "no" | "unknown" | null
  hasIntentToBuild: YesNoUnknown        // "yes" | "no" | "unknown" | null
  isNonFinanced: YesNoUnknown           // "yes" | "no" | "unknown" | null
  lenderHasAml: YesNoUnknown            // "yes" | "no" | "unknown" | null
  buyerType: BuyerType                  // "individual" | "entity" | "trust" | null
  individualExemptions: string[]        // Array of exemption IDs
  entityExemptions: string[]            // Array of exemption IDs
  trustExemptions: string[]             // Array of exemption IDs
  
  // Entity Enhancement Fields
  entitySubtype?: EntitySubtype         // "llc" | "corporation_domestic" | "corporation_foreign" | "partnership" | "pension_plan" | "other"
  buyerBoiStatus?: BoiStatus            // "filed" | "not_filed" | "exempt" | "unknown"
  buyerFincenId?: string                // FinCEN ID (free text, optional)
}
```

---

## 5. Determination Logic (Frontend)

The determination is computed via `useMemo` in real-time as the user answers questions.

### Decision Tree (Exact Logic)

```
START
  │
  ├── isResidential === "no" AND hasIntentToBuild === "no"
  │     → EXEMPT
  │     Reason: "This is not a residential real estate transaction 
  │              and the buyer has no intent to build a 1-4 family 
  │              residential structure."
  │
  ├── lenderHasAml === "yes"
  │     → EXEMPT
  │     Reason: "The lender's AML program covers reporting requirements 
  │              for this transaction."
  │
  ├── buyerType === "individual"
  │     ├── individualExemptions has items OTHER THAN "none"
  │     │     → EXEMPT
  │     │     Reason: "This transaction qualifies for an exemption 
  │     │              under 1031.320(b)(2)."
  │     │     Shows: list of selected exemption labels
  │     │
  │     └── individualExemptions includes "none"
  │           → REPORTABLE
  │           Reason: "This is a REPORTABLE TRANSFER requiring FinCEN 
  │                    Real Estate Report filing."
  │
  ├── buyerType === "entity"
  │     ├── entityExemptions has items OTHER THAN "none"
  │     │     → EXEMPT
  │     │     Reason: "The buyer entity qualifies for an exemption 
  │     │              under 1031.320(n)(10)."
  │     │
  │     └── entityExemptions includes "none"
  │           → REPORTABLE
  │
  ├── buyerType === "trust"
  │     ├── trustExemptions has items OTHER THAN "none"
  │     │     → EXEMPT
  │     │     Reason: "The buyer trust qualifies for an exemption 
  │     │              under 1031.320(n)(11)."
  │     │
  │     └── trustExemptions includes "none"
  │           → REPORTABLE
  │
  └── (else) → null (no determination yet, keep collecting answers)
```

### Step Visibility Logic (Dynamic Branching)

```
ALWAYS: ["property"]

IF isResidential === "no":
  ADD: "intent-to-build"
  IF hasIntentToBuild === "yes":
    ADD: "financing"
    IF isNonFinanced === "no":
      ADD: "lender-aml"
      IF lenderHasAml !== "yes":
        ADD: "buyer-type"
    ELIF isNonFinanced === "yes":
      ADD: "buyer-type"

IF isResidential === "yes":
  ADD: "financing"
  IF isNonFinanced === "no":
    ADD: "lender-aml"
    IF lenderHasAml !== "yes":
      ADD: "buyer-type"
  ELIF isNonFinanced === "yes":
    ADD: "buyer-type"

IF "buyer-type" in steps AND buyerType is set:
  IF buyerType === "individual": ADD "individual-exemptions"
  IF buyerType === "entity":     ADD "entity-exemptions"
  IF buyerType === "trust":      ADD "trust-exemptions"

IF determinationResult is not null:
  ADD: "determination-result"
```

---

## 6. Determination Logic (Backend)

### File: `api/app/services/determination.py`

**Function:** `determine_reportability(wizard_data)` → `(is_reportable, details, reasoning)`

Uses step-based data structure (`step1`, `step2`, `step3`, `step4`):

```
CHECK 1: Is residential?
  - step1.is_residential === False → EXEMPT (reason: "non_residential")
  - step1.is_residential === None  → INCOMPLETE

CHECK 2: Financing type?
  - is_cash_transaction === False AND financing_type in 
    ["conventional", "fha", "va", "usda"] → EXEMPT (reason: "regulated_financing")
  - is_cash_transaction === True OR financing_type in 
    ["seller_financing", "private_loan", "none"] → CONTINUE

CHECK 3: Transferee entity type?
  - transferee_type === None → INCOMPLETE

CHECK 4: Entity exemptions (11 checked):
  - is_publicly_traded → EXEMPT
  - is_regulated_entity → EXEMPT
  - is_government_entity → EXEMPT
  - is_501c3 → EXEMPT
  - is_bank_subsidiary → EXEMPT
  - is_insurance_company → EXEMPT
  - is_registered_investment → EXEMPT
  - is_venture_capital → EXEMPT
  - is_accounting_firm → EXEMPT
  - is_public_utility → EXEMPT
  - is_pooled_investment → EXEMPT

  None apply → REPORTABLE
```

### File: `api/app/services/early_determination.py`

**Function:** `determine_reporting_requirement(financing_type, buyer_type, entity_subtype, property_type)` → `(result, reasons)`

Used for early/quick determination from client submission forms:

```
CHECK 1: Financing
  - Any financing type that is NOT "cash" → EXEMPT (reason: "financing_involved")

CHECK 2: Buyer type
  - buyer_type === "individual" → EXEMPT (reason: "buyer_is_individual")

CHECK 3: Entity subtype
  - entity_subtype in EXEMPT_ENTITY_TYPES → EXEMPT
  - Exempt types: public_company, bank, broker_dealer, insurance, 
    government, nonprofit, investment_company, pooled_investment

CHECK 4: Property type
  - property_type in EXEMPT_PROPERTY_TYPES → EXEMPT
  - Exempt types: commercial, land, industrial, agricultural

No exemptions found → REPORTABLE
```

### ⚠️ DISCREPANCY: Frontend vs Backend Determination Logic

| Feature | Frontend | Backend (`determination.py`) | Backend (`early_determination.py`) |
|---------|----------|-------------------------------|--------------------------------------|
| Non-residential + no intent to build | ✅ EXEMPT | ✅ EXEMPT (if is_residential=False) | N/A |
| Lender has AML | ✅ EXEMPT | ❌ Not checked (checks financing type instead) | N/A |
| Individual buyer | Goes to individual exemptions list | N/A (only checks entity exemptions) | ✅ EXEMPT |
| Regulated financing (conventional/FHA/VA/USDA) | Not separately checked | ✅ EXEMPT | ✅ EXEMPT |
| Commercial/industrial/agricultural property | Not separately checked | N/A | ✅ EXEMPT |
| 23 entity exemption categories | 15 categories + "none" | 11 categories | 8 categories |

**Note:** The frontend wizard is the **primary determination engine**. The backend services appear to be:
- `determination.py` — an older/legacy service with step-based data
- `early_determination.py` — a simplified pre-screening from client submission forms

---

## 7. Phase 2: Collection — Step-by-Step

### Linear Steps (in order)

#### Step 2A: Transaction & Property (`"transaction-property"`)

**Fields collected:**

| Field | Label | Type | Required |
|-------|-------|------|----------|
| `collection.closingDate` | Expected/Actual Closing Date | date input | ✅ |
| `collection.purchasePrice` | Total Purchase Price | currency input | ✅ |
| `collection.propertyAddress` | Property Address | AddressAutocomplete + manual fields | ✅ |
| `collection.county` | County | text (auto-filled from SiteX) | ✅ |
| `collection.propertyType` | Property Type | select dropdown | ✅ |
| `collection.apn` | APN (Assessor's Parcel Number) | text (auto-filled from SiteX) | |
| `collection.legalDescription` | Legal Description | textarea (auto-filled from SiteX) | |

**Property Type Options:**
- 1-4 Family Residence
- Condominium
- Townhome
- Cooperative (Co-op)
- Land (Intent to Build 1-4 Family)

**SiteX Integration:** When an address is selected via autocomplete, the system:
1. Auto-fills county, APN, legal description, property type from SiteX data
2. Auto-fills first seller name from owner-of-record
3. Stores full SiteX data for display (owner name, bedrooms, sqft, etc.)

---

#### Step 2B: Party Setup (`"party-setup"`)

**Purpose:** Add sellers and buyers with name, email, and type. Then send secure portal links.

**Seller fields (per seller):**

| Field | Label | Type | Required |
|-------|-------|------|----------|
| `seller.type` | Seller Type | radio: individual / entity / trust | ✅ |
| `seller.name` | Full Name / Company Name / Trust Name (dynamic label) | text | ✅ |
| `seller.email` | Email | email | ✅ |
| `seller.entityName` | Entity/Trust Legal Name (if different) | text | Only if type is entity/trust |

**Buyer fields (per buyer):**

| Field | Label | Type | Required |
|-------|-------|------|----------|
| `buyer.type` | Buyer Type | radio: individual / entity / trust | ✅ |
| `buyer.name` | Full Name / Company Name / Trust Name (dynamic label) | text | ✅ |
| `buyer.email` | Contact Email | email | ✅ |

**Actions:**
- "Add Seller" / "Add Buyer" buttons
- Email preview section showing what parties will receive
- **"Send Links & Continue"** button → calls `handleSendPartyLinks` → shows `LinksSentConfirmation`

**After links sent:** Shows `LinksSentConfirmation` component with options:
- "Return to Dashboard" (primary action)
- "Monitor Progress" (secondary)

---

#### Step 2F: Reporting Person Designation (`"reporting-person"`)

**Purpose:** Designate who is responsible for filing the RER.

**Shows cascade priority list:**
1. Closing/settlement agent
2. Preparer of closing statement (HUD-1/CD)
3. Deed filer
4. Title insurer
5. Disbursing escrow agent
6. Title evaluator
7. Deed preparer

**Fields collected:**

| Field | Label | Required |
|-------|-------|----------|
| `reportingPerson.companyName` | Company Name | ✅ |
| `reportingPerson.contactName` | Contact Name | ✅ |
| `reportingPerson.phone` | Phone | ✅ |
| `reportingPerson.email` | Email | ✅ |
| `reportingPerson.address` | Address | ✅ |
| `reportingPerson.isPCTC` | Is PCTC the reporting person? | ✅ |

---

#### Step 2F: File Report (`"file-report"`)

**Three sub-states:**

1. **Already Filed (success):** Shows green success card with receipt ID + "Back to Requests Dashboard" button
2. **Review & Certify (not yet certified):** Shows `ReviewCertification` component
3. **Certified — Ready to File:** Shows filing action button

**Review & Certify includes:**
- Complete data review
- Buyer/seller certifications
- Filing certification checkbox

---

### Non-Linear Steps (Accessible via Navigation)

#### Monitor Progress (`"monitor-progress"`)
- Shows real-time tracking of party submissions
- Not a required linear step — accessible from party-setup or navigation

#### Review Submissions (`"review-submissions"`)
- Review submitted party data before proceeding

#### Seller Info (`"seller-info"`)
- Detailed seller information: type selection, name fields (first/last for individual, legal name for entity/trust), SSN/EIN, address, etc.

#### Buyer Info (`"buyer-info"`)
- Full buyer entity/trust details including:
  - Entity: legal name, DBA, entity type, EIN, formation state, address, beneficial owners
  - Trust: legal name, trust type, EIN, formation date, trustees

#### Signing Individuals (`"signing-individuals"`)
- Individuals who sign closing documents on behalf of buyer entity/trust
- Name, title, authority type

#### Payment Info (`"payment-info"`)
- Payment source details
- Must account for total purchase price
- Shows remaining balance tracker

#### Certifications (`"certifications"`)
- Buyer certification agreement
- Seller certification agreement

---

## 8. CollectionData (All Fields)

```typescript
interface CollectionData {
  // Pre-filled from SubmissionRequest
  escrowNumber?: string
  financingType?: "cash" | "financed" | "partial_cash"
  initialParties?: InitialParties
  clientNotes?: string

  // Transaction & Property
  closingDate: string
  propertyAddress: Address            // { street, unit?, city, state, zip, country }
  county: string
  propertyType: string
  apn?: string
  legalDescription?: string
  purchasePrice: number
  
  // Sellers
  sellers: SellerData[]
  
  // Buyer
  buyerType: "entity" | "trust"
  buyerEntity?: BuyerEntityData
  buyerTrust?: BuyerTrustData
  
  // Signing Individuals
  signingIndividuals: SigningIndividual[]
  
  // Payment
  paymentSources: PaymentSource[]
  
  // Reporting Person
  reportingPerson: ReportingPerson
  
  // Certifications
  buyerCertification: Certification
  sellerCertification: Certification
  
  // SiteX Property Data (auto-enrichment)
  siteXData?: {
    apn?: string
    ownerName?: string
    ownerName2?: string
    propertyType?: string
    bedrooms?: number
    bathrooms?: number
    sqft?: number
    yearBuilt?: number
    lastSaleDate?: string
    lastSalePrice?: number
    assessedValue?: number
    lookupTimestamp?: string
  }
}
```

---

## 9. Phase 3: Summary

**Title:** "Filing Preparation Summary"

**Sections displayed:**
1. **Filing Deadline Calculator:**
   - Shows closing date
   - Option 1: 30 days after closing
   - Option 2: End of following month
   - **Your Filing Deadline:** Earlier of the two
   - Days remaining (red if ≤ 7 days)

2. **Section Completion Status:**
   - Transaction & Property ✅/❌
   - Party Setup ✅/❌
   - Reporting Person ✅/❌
   - File Report ✅/❌
   - Each row is clickable → navigates to that collection step

3. **Document Generation Options:**
   - ☐ Generate RER Data Summary (PDF)
   - ☐ Generate Beneficial Ownership Certification Form
   - ☐ Generate Seller Certification Form
   - ☐ Generate Buyer Certification Form
   - ☐ Generate Designation Agreement (if applicable)
   - ☐ Generate Complete Filing Package (all documents)

---

## 10. Exemption Constants (All Options)

### Individual Exemptions (8 options + "none")

| ID | Label |
|----|-------|
| `easement` | Easement only (no fee simple transfer) |
| `death` | Transfer due to death (inheritance/estate distribution) |
| `divorce` | Transfer due to divorce or legal dissolution |
| `bankruptcy` | Transfer to a bankruptcy estate |
| `court` | Court-supervised transfer (judicial sale, receivership) |
| `trust-settlor` | No-consideration transfer to a trust where the individual (alone or with spouse) is the settlor/grantor |
| `1031` | 1031 Exchange transaction |
| `no-reporting` | No reporting person identified for this transaction |

### Entity Exemptions (15 options + "none")

| ID | Label |
|----|-------|
| `securities-issuer` | Securities reporting issuer (publicly traded company) |
| `government` | Governmental authority (federal, state, local, tribal, foreign) |
| `bank` | Bank or credit union |
| `depository-holding` | Depository institution holding company |
| `msb` | Money services business (registered with FinCEN) |
| `broker-dealer` | Broker or dealer in securities (SEC registered) |
| `exchange-clearing` | Securities exchange or clearing agency |
| `exchange-act` | Other Exchange Act registered entity |
| `insurance` | Insurance company |
| `insurance-producer` | State-licensed insurance producer |
| `commodity` | Commodity Exchange Act registered entity |
| `utility` | Public utility |
| `financial-market` | Designated financial market utility |
| `investment` | Registered investment company or investment adviser |
| `controlled` | Entity controlled or wholly owned by any of the above |

### Trust Exemptions (4 options + "none")

| ID | Label |
|----|-------|
| `trust-securities` | Trust that is a securities reporting issuer |
| `trustee-securities` | Trust where the Trustee is a securities reporting issuer |
| `statutory` | Statutory trust (Delaware Statutory Trust, etc.) |
| `exempt-owned` | Trust wholly owned by an exempt entity listed in the entity exemptions |

---

## 11. Navigation & Flow Control

### Determination Navigation
- **"Back"** button: Goes to previous step in `relevantDeterminationSteps` (disabled on first step)
- **"Continue"** button: Goes to next step (auto-advance on selection for most steps)

### Collection Navigation (navConfig)

| Step | Back Button | Continue Button |
|------|------------|-----------------|
| `transaction-property` | ❌ Hidden | ✅ "Continue to Party Setup" |
| `party-setup` | ✅ "Back" | ❌ Hidden (inline "Send Links" button) |
| `monitor-progress` | ✅ "Back to Parties" | ❌ Hidden (inline "Continue to Review") |
| `review-submissions` | ✅ "Back" | ✅ "Continue" |
| `reporting-person` | ✅ "Back" | ✅ "Continue to Review & File" |
| `file-report` | ❌ Hidden (own back) | ❌ Hidden (filing handled inline) |

### 3-Stage Progress Indicator

```
[Setup] ──→ [Collecting] ──→ [Review & File]
```

| Stage | Steps Included |
|-------|---------------|
| Setup | transaction-property, party-setup |
| Collecting | monitor-progress, review-submissions |
| Review & File | reporting-person, file-report |

### Auto-Detection of Initial Step

When re-entering the wizard, the system auto-detects what step to show based on report status:
- URL parameter `?step=file-report` → jumps directly to file-report
- Status-based: `ready_to_file` → auto-navigates to `file-report`

---

## 12. Section Completion Logic

```typescript
const sectionCompletion = {
  // Transaction complete if ALL these have values:
  transaction: closingDate AND propertyAddress.street AND 
               propertyAddress.city AND propertyType AND purchasePrice,

  // Sellers complete if at least 1 seller with required fields:
  sellers: sellers.length > 0 AND every seller has:
    (individual: firstName + lastName) OR
    (entity: legalName) OR
    (trust: legalName),

  // Buyer complete depending on type:
  buyer: 
    entity → buyerEntity.entity.legalName + at least 1 beneficial owner
    trust → buyerTrust.trust.legalName + at least 1 trustee,

  // Signing individuals complete:
  signingIndividuals: at least 1 AND every has firstName + lastName,

  // Payment complete:
  payment: paymentTotal > 0 AND remaining balance < $1,

  // Reporting person complete:
  reportingPerson: companyName AND isPCTC is not null,

  // Certifications complete:
  certifications: buyerCertification.agreed AND sellerCertification.agreed,
}
```

---

## 13. What's Missing / Gaps

### Questions/Features Expected but NOT Found

| Item | Status | Notes |
|------|--------|-------|
| Intent to build question | ✅ Present | Step 1A, shown for non-residential |
| Price threshold check | ❌ NOT PRESENT | No minimum/maximum purchase price threshold in determination logic |
| Multiple buyer types simultaneously | ❌ NOT SUPPORTED | Wizard supports only ONE buyer type (entity OR trust), not mixed |
| Transfer type (sale, gift, exchange) | ❌ NOT ASKED | Not part of determination, only "1031 Exchange" is in exemptions |
| Foreign buyer indicator | ❌ NOT ASKED | No specific question about foreign national buyers |
| Previous FinCEN filing check | ❌ NOT ASKED | No question about whether a prior filing exists for this property |

### Frontend ↔ Backend Discrepancies

| Issue | Description |
|-------|-------------|
| Different data structures | Frontend uses `determination.isResidential`; backend uses `step1.is_residential` |
| Different exemption counts | Frontend: 8 individual + 15 entity + 4 trust; Backend determination.py: 11 entity only; early_determination.py: 8 entity + property type checks |
| AML check gap | Frontend checks `lenderHasAml`; backend `determination.py` checks `financing_type` instead |
| Property type exemption | `early_determination.py` exempts commercial/land/industrial/agricultural; frontend only checks `isResidential` |
| Individual buyer | `early_determination.py` automatically exempts individual buyers; frontend still requires checking individual exemptions list |

### Non-Linear Steps Concern

The following steps exist in the UI but are NOT in the linear `collectionSteps` array, meaning they can only be reached via manual navigation:
- `seller-info` — Detailed seller data entry
- `buyer-info` — Detailed buyer entity/trust data
- `signing-individuals` — Signing individual details
- `payment-info` — Payment source breakdown
- `certifications` — Buyer/seller certification agreements

**These are critical for FinCEN filing but have no guaranteed path to reach them in the current linear flow.** They rely on party portal submissions or manual navigation.

### CollectionStepId Type vs Actual Usage

The TypeScript `CollectionStepId` type allows:
```typescript
"transaction-property" | "party-setup" | "monitor-progress" | 
"review-submissions" | "reporting-person" | "file-report"
```

But the actual wizard renders **additional step IDs** not in this type:
- `"seller-info"`
- `"buyer-info"`
- `"signing-individuals"`
- `"payment-info"`
- `"certifications"`

These are set via `setCollectionStep()` but their IDs aren't in the `CollectionStepId` union type.

---

*End of Report*
