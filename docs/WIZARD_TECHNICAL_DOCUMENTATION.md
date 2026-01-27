# FinCEN RRER Wizard - Complete Technical Documentation

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Phase 1: Determination Flow](#phase-1-determination-flow)
4. [Phase 2: Collection Flow](#phase-2-collection-flow)
5. [Phase 3: Summary & Filing](#phase-3-summary--filing)
6. [Data Models & Types](#data-models--types)
7. [API Integration](#api-integration)
8. [State Management](#state-management)
9. [Autosave System](#autosave-system)
10. [Party Collection System](#party-collection-system)
11. [Filing Lifecycle](#filing-lifecycle)
12. [Component Architecture](#component-architecture)
13. [Dependencies & Contingencies](#dependencies--contingencies)

---

## Overview

The FinCEN RRER (Real Estate Reporting) Wizard is a multi-phase questionnaire system that guides users through the process of determining whether a real estate transaction requires FinCEN reporting under 31 CFR 1031.320, and if so, collects all necessary information for filing.

### Key Characteristics

- **Three-Phase Architecture**: Determination → Collection → Summary
- **Dynamic Step Navigation**: Steps appear/hide based on previous answers
- **Autosave System**: 1.5-second debounced autosave to backend
- **Real-time Party Tracking**: 15-second polling when in collection mode
- **Conditional Logic**: Complex branching based on transaction type, financing, and exemptions

---

## Architecture

### File Structure

```
web/
├── app/(app)/app/reports/[id]/wizard/page.tsx   # Wizard page wrapper
├── components/rrer-questionnaire.tsx            # Main questionnaire component
└── lib/
    ├── api.ts                                    # API functions
    └── rrer-types.ts                            # Type definitions & constants

api/
├── app/routes/reports.py                        # Report & wizard API endpoints
├── app/services/determination.py                # Determination logic
└── app/models/
    ├── report.py                                # Report model
    ├── report_party.py                          # Party model
    └── party_link.py                            # Party link model
```

### Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         WIZARD PAGE (page.tsx)                          │
│                                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │ Load Report │→ │ Init State  │→ │ Render UI   │→ │ Handle Save │   │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │
│         │                                                   │           │
│         ▼                                                   ▼           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    RRER QUESTIONNAIRE COMPONENT                  │   │
│  │                                                                   │   │
│  │  ┌──────────────────────────────────────────────────────────┐   │   │
│  │  │              DETERMINATION PHASE (Phase 1)               │   │   │
│  │  │                                                          │   │   │
│  │  │  Property → Intent → Financing → AML → Buyer → Exemptions│   │   │
│  │  └──────────────────────────────────────────────────────────┘   │   │
│  │                          │                                       │   │
│  │                          ▼ (if reportable)                       │   │
│  │  ┌──────────────────────────────────────────────────────────┐   │   │
│  │  │               COLLECTION PHASE (Phase 2)                 │   │   │
│  │  │                                                          │   │   │
│  │  │  Transaction → Sellers → Buyers → Signers → Payment →    │   │   │
│  │  │  Reporting Person → Certifications                       │   │   │
│  │  └──────────────────────────────────────────────────────────┘   │   │
│  │                          │                                       │   │
│  │                          ▼                                       │   │
│  │  ┌──────────────────────────────────────────────────────────┐   │   │
│  │  │               SUMMARY PHASE (Phase 3)                    │   │   │
│  │  │                                                          │   │   │
│  │  │  Review → Print/Export                                   │   │   │
│  │  └──────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│         │                                                               │
│         ▼                                                               │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                     BACKEND ACTIONS SECTION                      │   │
│  │                                                                   │   │
│  │  Determine → Party Links → Ready Check → File                    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Determination Flow

### Purpose
Determine whether a real estate transaction requires FinCEN reporting by walking through the regulatory decision tree.

### Step Definitions

| Step ID | Title | Question | Triggers When |
|---------|-------|----------|---------------|
| `property` | Property Type | Is this a residential property (1-4 family)? | Always first step |
| `intent-to-build` | Intent to Build | Does buyer intend to build 1-4 family? | `isResidential === "no"` |
| `financing` | Financing Type | Is this a non-financed (cash) transaction? | Always after property/intent |
| `lender-aml` | Lender AML | Does the lender have an AML program? | `isNonFinanced === "no"` |
| `buyer-type` | Buyer Type | What type of buyer? (Individual/Entity/Trust) | See logic below |
| `individual-exemptions` | Individual Exemptions | Select applicable exemptions | `buyerType === "individual"` |
| `entity-exemptions` | Entity Exemptions | Select applicable exemptions | `buyerType === "entity"` |
| `trust-exemptions` | Trust Exemptions | Select applicable exemptions | `buyerType === "trust"` |
| `determination-result` | Result | Final determination display | When result is calculated |

### Dynamic Step Logic

```typescript
// From rrer-questionnaire.tsx lines 389-434
const relevantDeterminationSteps = useMemo(() => {
  const steps: DeterminationStepId[] = ["property"]
  
  // NON-RESIDENTIAL PATH
  if (determination.isResidential === "no") {
    steps.push("intent-to-build")
    if (determination.hasIntentToBuild === "yes") {
      steps.push("financing")
      if (determination.isNonFinanced === "no") {
        steps.push("lender-aml")
        if (determination.lenderHasAml !== "yes") {
          steps.push("buyer-type")
        }
      } else if (determination.isNonFinanced === "yes") {
        steps.push("buyer-type")
      }
      // Add exemption step based on buyer type
      if (steps.includes("buyer-type") && determination.buyerType) {
        if (determination.buyerType === "individual") steps.push("individual-exemptions")
        if (determination.buyerType === "entity") steps.push("entity-exemptions")
        if (determination.buyerType === "trust") steps.push("trust-exemptions")
      }
    }
    // If no intent to build → EXEMPT (no more steps)
  }
  
  // RESIDENTIAL PATH
  if (determination.isResidential === "yes") {
    steps.push("financing")
    if (determination.isNonFinanced === "no") {
      steps.push("lender-aml")
      if (determination.lenderHasAml !== "yes") {
        steps.push("buyer-type")
      }
    } else if (determination.isNonFinanced === "yes") {
      steps.push("buyer-type")
    }
    // Add exemption step based on buyer type
    if (steps.includes("buyer-type") && determination.buyerType) {
      if (determination.buyerType === "individual") steps.push("individual-exemptions")
      if (determination.buyerType === "entity") steps.push("entity-exemptions")
      if (determination.buyerType === "trust") steps.push("trust-exemptions")
    }
  }
  
  // Add result step if determination is complete
  if (determinationResult) {
    steps.push("determination-result")
  }
  
  return steps
}, [determination, determinationResult])
```

### Determination Result Calculation

```typescript
// From rrer-questionnaire.tsx lines 310-386
const determinationResult = useMemo((): DeterminationResult | null => {
  // EXIT 1: Non-residential + no intent to build → EXEMPT
  if (determination.isResidential === "no" && determination.hasIntentToBuild === "no") {
    return {
      isReportable: false,
      reason: "Not residential, no intent to build 1-4 family structure",
      documentation: "Certification from Buyer confirming no intent to build"
    }
  }
  
  // EXIT 2: Lender has AML program → EXEMPT
  if (determination.lenderHasAml === "yes") {
    return {
      isReportable: false,
      reason: "Lender's AML program covers reporting requirements",
      documentation: "Certification from lender confirming active AML program"
    }
  }
  
  // CHECK EXEMPTIONS BY BUYER TYPE
  if (determination.buyerType === "individual") {
    const exemptions = determination.individualExemptions.filter(e => e !== "none")
    if (exemptions.length > 0) {
      return { isReportable: false, reason: "Exemption under 1031.320(b)(2)", ... }
    }
    if (determination.individualExemptions.includes("none")) {
      return { isReportable: true, reason: "REPORTABLE TRANSFER", ... }
    }
  }
  
  if (determination.buyerType === "entity") {
    const exemptions = determination.entityExemptions.filter(e => e !== "none")
    if (exemptions.length > 0) {
      return { isReportable: false, reason: "Exemption under 1031.320(n)(10)", ... }
    }
    if (determination.entityExemptions.includes("none")) {
      return { isReportable: true, reason: "REPORTABLE TRANSFER", ... }
    }
  }
  
  if (determination.buyerType === "trust") {
    const exemptions = determination.trustExemptions.filter(e => e !== "none")
    if (exemptions.length > 0) {
      return { isReportable: false, reason: "Exemption under 1031.320(n)(11)", ... }
    }
    if (determination.trustExemptions.includes("none")) {
      return { isReportable: true, reason: "REPORTABLE TRANSFER", ... }
    }
  }
  
  return null // Determination not yet complete
}, [determination])
```

### Exemption Categories

#### Individual Exemptions (INDIVIDUAL_EXEMPTIONS)
| ID | Description |
|----|-------------|
| `easement` | Easement only (no fee simple transfer) |
| `death` | Transfer due to death (inheritance/estate distribution) |
| `divorce` | Transfer due to divorce or legal dissolution |
| `bankruptcy` | Transfer to a bankruptcy estate |
| `court` | Court-supervised transfer (judicial sale, receivership) |
| `trust-settlor` | No-consideration transfer to trust where individual is settlor |
| `1031` | 1031 Exchange transaction |
| `no-reporting` | No reporting person identified |

#### Entity Exemptions (ENTITY_EXEMPTIONS)
| ID | Description |
|----|-------------|
| `securities-issuer` | Securities reporting issuer (publicly traded) |
| `government` | Governmental authority |
| `bank` | Bank or credit union |
| `depository-holding` | Depository institution holding company |
| `msb` | Money services business |
| `broker-dealer` | Broker or dealer in securities |
| `exchange-clearing` | Securities exchange or clearing agency |
| `exchange-act` | Other Exchange Act registered entity |
| `insurance` | Insurance company |
| `insurance-producer` | State-licensed insurance producer |
| `commodity` | Commodity Exchange Act registered entity |
| `utility` | Public utility |
| `financial-market` | Designated financial market utility |
| `investment` | Registered investment company/adviser |
| `controlled` | Entity controlled by exempt entity |

#### Trust Exemptions (TRUST_EXEMPTIONS)
| ID | Description |
|----|-------------|
| `trust-securities` | Trust that is a securities reporting issuer |
| `trustee-securities` | Trust where Trustee is securities issuer |
| `statutory` | Statutory trust (Delaware Statutory Trust, etc.) |
| `exempt-owned` | Trust wholly owned by exempt entity |

---

## Phase 2: Collection Flow

### Purpose
Collect all required information for a reportable transaction to generate the FinCEN filing.

### Step Definitions

| Step ID | Title | Data Collected |
|---------|-------|----------------|
| `transaction-property` | Transaction & Property | Closing date, property address, type, APN, purchase price |
| `seller-info` | Seller Information | Seller(s) details (individual/entity/trust) |
| `buyer-info` | Buyer Information | Buyer entity/trust + beneficial owners |
| `signing-individuals` | Signing Individuals | Who signs on behalf of buyer |
| `payment-info` | Payment Sources | Wire transfers, checks, payment breakdown |
| `reporting-person` | Reporting Person | Title company / designated reporter |
| `certifications` | Certifications | Buyer and seller certifications |

### Collection Steps (Fixed Order)
```typescript
const collectionSteps: CollectionStepId[] = [
  "transaction-property",
  "seller-info",
  "buyer-info",
  "signing-individuals",
  "payment-info",
  "reporting-person",
  "certifications",
]
```

### Data Structures

#### CollectionData Interface
```typescript
interface CollectionData {
  // Transaction & Property
  closingDate: string              // ISO date format
  propertyAddress: Address         // Full address object
  county: string
  propertyType: string             // "1-4-family" | "condo" | "townhome" | "coop" | "land"
  apn?: string                     // Assessor's Parcel Number
  legalDescription?: string
  purchasePrice: number            // In dollars
  
  // Sellers (1 or more)
  sellers: SellerData[]
  
  // Buyer (entity OR trust, never individual for reportable)
  buyerType: "entity" | "trust"
  buyerEntity?: BuyerEntityData    // If buyerType === "entity"
  buyerTrust?: BuyerTrustData      // If buyerType === "trust"
  
  // Signing Individuals (1 or more)
  signingIndividuals: SigningIndividual[]
  
  // Payment Sources (must sum to purchase price)
  paymentSources: PaymentSource[]
  
  // Reporting Person
  reportingPerson: ReportingPerson
  
  // Certifications
  buyerCertification: Certification
  sellerCertification: Certification
}
```

### Section Completion Validation
```typescript
const sectionCompletion = useMemo(() => {
  return {
    transaction: !!(
      collection.closingDate && 
      collection.propertyAddress?.street && 
      collection.propertyAddress?.city && 
      collection.propertyType && 
      collection.purchasePrice
    ),
    
    sellers: (collection.sellers || []).length > 0 && 
      (collection.sellers || []).every(s => 
        (s.type === "individual" && s.individual?.firstName && s.individual?.lastName) ||
        (s.type === "entity" && s.entity?.legalName) ||
        (s.type === "trust" && s.trust?.legalName)
      ),
    
    buyer: collection.buyerType === "entity" 
      ? !!(collection.buyerEntity?.entity.legalName && 
           (collection.buyerEntity?.beneficialOwners || []).length > 0)
      : !!(collection.buyerTrust?.trust.legalName && 
           (collection.buyerTrust?.trustees || []).length > 0),
    
    signingIndividuals: (collection.signingIndividuals || []).length > 0 && 
      (collection.signingIndividuals || []).every(s => s.firstName && s.lastName),
    
    payment: paymentTotal > 0 && Math.abs(paymentRemaining) < 1,
    
    reportingPerson: !!(
      collection.reportingPerson?.companyName && 
      collection.reportingPerson?.isPCTC !== null
    ),
    
    certifications: !!(
      collection.buyerCertification?.agreed && 
      collection.sellerCertification?.agreed
    ),
  }
}, [collection, paymentTotal, paymentRemaining])
```

### Payment Validation
```typescript
const paymentTotal = useMemo(() => {
  return (collection.paymentSources || []).reduce((sum, source) => 
    sum + (source.amount || 0), 0)
}, [collection.paymentSources])

const paymentRemaining = useMemo(() => {
  return (collection.purchasePrice || 0) - paymentTotal
}, [collection.purchasePrice, paymentTotal])

// Payment is valid when: paymentTotal equals purchasePrice (within $1)
const paymentValid = Math.abs(paymentRemaining) < 1
```

### Filing Deadline Calculation
```typescript
function calculateFilingDeadline(closingDate: string) {
  const closing = new Date(closingDate)
  
  // Option 1: 30 days after closing
  const option1Date = new Date(closing)
  option1Date.setDate(option1Date.getDate() + 30)
  
  // Option 2: Last day of month following closing
  const option2Date = new Date(closing)
  option2Date.setMonth(option2Date.getMonth() + 2, 0)
  
  // Use the LATER date (more favorable to filer)
  const deadlineDate = option1Date > option2Date ? option1Date : option2Date
  
  // Calculate days remaining
  const today = new Date()
  const daysRemaining = Math.ceil(
    (deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  )
  
  return {
    deadline: deadlineDate.toISOString().split('T')[0],
    option1: option1Date.toISOString().split('T')[0],
    option2: option2Date.toISOString().split('T')[0],
    daysRemaining: Math.max(0, daysRemaining),
  }
}
```

---

## Phase 3: Summary & Filing

### Purpose
Review all collected information and submit to FinCEN (or mock filing in demo mode).

### Backend Actions Section

The wizard page includes a "Backend Actions" section below the questionnaire that handles:

1. **Run Determination** - Submit wizard data to backend for official determination
2. **Party Links** - Generate secure links for parties to submit their information
3. **Ready Check** - Verify all required information is complete
4. **File Report** - Submit to FinCEN (mock in demo mode)

---

## Data Models & Types

### DeterminationState
```typescript
interface DeterminationState {
  isResidential: YesNoUnknown          // "yes" | "no" | "unknown" | null
  hasIntentToBuild: YesNoUnknown
  isNonFinanced: YesNoUnknown
  lenderHasAml: YesNoUnknown
  buyerType: BuyerType                 // "individual" | "entity" | "trust" | null
  individualExemptions: string[]
  entityExemptions: string[]
  trustExemptions: string[]
}
```

### Address
```typescript
interface Address {
  street: string
  unit?: string
  city: string
  state: string       // Two-letter state code
  zip: string
  country: string     // Default: "United States"
}
```

### BeneficialOwner
```typescript
interface BeneficialOwner {
  id: string
  firstName: string
  middleName?: string
  lastName: string
  suffix?: string
  dateOfBirth: string
  address: Address
  citizenship: "us-citizen" | "us-resident" | "non-resident"
  idType: "ssn" | "us-passport" | "foreign-passport" | "state-id"
  idNumber: string
  issuingJurisdiction?: string
  ownershipPercentage?: number
  controlTypes: string[]              // e.g., ["ceo", "board_member"]
}
```

### PaymentSource
```typescript
interface PaymentSource {
  id: string
  sourceType: string                  // "wire" | "certified-check" | "cash" | etc.
  amount: number
  institutionName: string
  accountType: string
  accountNumberLast4?: string
  routingNumber?: string
  accountHolderName: string
  isDifferentFromBuyer: boolean
  relationshipToBuyer?: string
  explanation?: string
}
```

---

## API Integration

### Endpoints Used

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `GET /reports/{id}` | GET | Load report data |
| `PUT /reports/{id}/wizard` | PUT | Save wizard progress |
| `POST /reports/{id}/determine` | POST | Run determination |
| `POST /reports/{id}/party-links` | POST | Generate party links |
| `POST /reports/{id}/ready-check` | POST | Check filing readiness |
| `POST /reports/{id}/file` | POST | File report (mock) |
| `GET /reports/{id}/parties` | GET | Get party status |

### API Function Signatures
```typescript
// Load report
export async function getReport(id: string): Promise<Report>

// Save wizard progress
export async function saveWizard(
  reportId: string,
  wizard_step: number,
  wizard_data: Record<string, unknown>
): Promise<Report>

// Run determination
export async function determine(reportId: string): Promise<DeterminationResult>

// Create party links
export async function createPartyLinks(
  reportId: string, 
  parties?: PartyInput[]
): Promise<PartyLinkResponse>

// Ready check
export async function readyCheck(reportId: string): Promise<ReadyCheckResult>

// File report
export async function fileReport(reportId: string): Promise<FileResult>

// Get party status
export async function getReportParties(reportId: string): Promise<ReportPartiesResponse>
```

---

## State Management

### Wizard Page State
```typescript
// Report state
const [report, setReport] = useState<Report | null>(null)
const [loading, setLoading] = useState(true)
const [error, setError] = useState<string | null>(null)

// Save state
const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")

// Action states
const [determining, setDetermining] = useState(false)
const [backendDetermination, setBackendDetermination] = useState<DeterminationResult | null>(null)
const [generatingLinks, setGeneratingLinks] = useState(false)
const [partyLinks, setPartyLinks] = useState<PartyLink[]>([])
const [checkingReady, setCheckingReady] = useState(false)
const [readyResult, setReadyResult] = useState<ReadyCheckResult | null>(null)
const [filing, setFiling] = useState(false)
const [fileResult, setFileResult] = useState<FileResult | null>(null)

// Party status tracking
const [partyStatus, setPartyStatus] = useState<ReportPartiesResponse | null>(null)
const [partyStatusLoading, setPartyStatusLoading] = useState(false)
const [lastPartyUpdate, setLastPartyUpdate] = useState<Date | null>(null)
```

### Questionnaire Component State
```typescript
const [phase, setPhase] = useState<Phase>(initialData?.phase || "determination")
const [determinationStep, setDeterminationStep] = useState<DeterminationStepId>("property")
const [collectionStep, setCollectionStep] = useState<CollectionStepId>("transaction-property")
const [determination, setDetermination] = useState<DeterminationState>(initialDetermination)
const [collection, setCollection] = useState<Partial<CollectionData>>(initialCollection)
```

### State Persistence Structure
```typescript
// Stored in report.wizard_data (JSONB)
{
  phase: "determination" | "collection" | "summary",
  determinationStep: string,
  collectionStep: string,
  determination: DeterminationState,
  collection: Partial<CollectionData>
}
```

---

## Autosave System

### Configuration
```typescript
const AUTOSAVE_DELAY = 1500 // 1.5 seconds
```

### Implementation
```typescript
// Debounced save function
const performSave = useCallback(async (wizardData, wizardStep) => {
  const dataString = JSON.stringify(wizardData)
  if (dataString === lastDataRef.current) return  // Skip if no changes
  lastDataRef.current = dataString

  try {
    setSaveStatus("saving")
    await saveWizard(reportId, wizardStep, wizardData)
    setSaveStatus("saved")
    setTimeout(() => setSaveStatus("idle"), 2000)  // Reset after 2s
  } catch (err) {
    setSaveStatus("error")
  }
}, [reportId])

// Handle questionnaire data changes
const handleQuestionnaireChange = useCallback((data) => {
  if (saveTimeoutRef.current) {
    clearTimeout(saveTimeoutRef.current)
  }

  // Map phase to wizard step number
  const wizardStep = data.phase === "determination" ? 1 
                   : data.phase === "collection" ? 2 
                   : 3

  saveTimeoutRef.current = setTimeout(() => {
    performSave({
      phase: data.phase,
      determinationStep: data.determinationStep,
      collectionStep: data.collectionStep,
      determination: data.determination,
      collection: data.collection,
    }, wizardStep)
  }, AUTOSAVE_DELAY)
}, [performSave])
```

### Save Status UI
```typescript
{saveStatus === "saving" && (
  <span className="flex items-center gap-1.5 text-muted-foreground">
    <Loader2 className="h-3.5 w-3.5 animate-spin" />
    <span className="text-xs">Saving...</span>
  </span>
)}
{saveStatus === "saved" && (
  <span className="flex items-center gap-1.5 text-green-600">
    <Check className="h-3.5 w-3.5" />
    <span className="text-xs">Saved</span>
  </span>
)}
{saveStatus === "error" && (
  <span className="flex items-center gap-1.5 text-destructive">
    <AlertTriangle className="h-3.5 w-3.5" />
    <span className="text-xs">Save failed</span>
  </span>
)}
```

---

## Party Collection System

### Party Link Generation Flow

```
┌────────────────────┐
│ Backend Determine  │
│ (isReportable=true)│
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│ Generate Party     │
│ Links Button       │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐     ┌────────────────────┐
│ POST /party-links  │────▶│ Create ReportParty │
│                    │     │ + PartyLink        │
└─────────┬──────────┘     └────────────────────┘
          │
          ▼
┌────────────────────┐
│ Return Links with  │
│ Secure Tokens      │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│ Display in UI      │
│ (copy/open links)  │
└────────────────────┘
```

### Real-time Party Status Polling

```typescript
// Poll for party status when in collecting mode
useEffect(() => {
  if (report?.status === "collecting") {
    // Initial fetch
    fetchPartyStatus(false)
    
    // Poll every 15 seconds
    const interval = setInterval(() => fetchPartyStatus(true), 15000)
    return () => clearInterval(interval)
  }
}, [report?.status, fetchPartyStatus])

// Fetch with toast notifications
const fetchPartyStatus = useCallback(async (showToast = false) => {
  const data = await getReportParties(reportId)
  
  // Check for new submissions
  if (partyStatus && showToast) {
    if (data.summary.submitted > partyStatus.summary.submitted) {
      toast({
        title: "Party Submitted! 🎉",
        description: `${data.summary.submitted} of ${data.summary.total} parties submitted.`,
      })
    }
    if (data.summary.all_complete && !partyStatus.summary.all_complete) {
      toast({
        title: "All Parties Complete! ✅",
        description: "You can now proceed to file the report.",
      })
    }
  }
  
  setPartyStatus(data)
  setLastPartyUpdate(new Date())
}, [reportId, partyStatus])
```

### Party Status Response Structure
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

interface PartyStatusItem {
  id: string
  party_role: string
  entity_type: string
  display_name: string | null
  email: string | null
  status: string             // "pending" | "submitted"
  submitted_at: string | null
  token: string | null
  link: string | null
  link_expires_at: string | null
  created_at: string
}
```

---

## Filing Lifecycle

### Report Status Flow

```
draft → determination_complete → collecting → ready_to_file → filed
                    │
                    └──────────→ exempt (if not reportable)
```

### Ready Check Validation

```python
# From api/app/routes/reports.py
def perform_ready_check(report: Report) -> tuple[bool, list]:
    errors = []
    
    # 1. Check determination is complete and reportable
    if not report.determination:
        errors.append("Report determination not complete")
    elif report.determination.get("final_result") != "reportable":
        errors.append("Report is not marked as reportable")
    
    # 2. Check required fields
    if not report.property_address_text:
        errors.append("Property address is required")
    
    if not report.closing_date:
        errors.append("Closing date is required")
    
    # 3. Check all parties have submitted
    parties = report.parties
    if not parties:
        errors.append("At least one party is required")
    else:
        for party in parties:
            if party.status != "submitted":
                errors.append(f"Party '{party.display_name or party.party_role}' has not submitted")
    
    return len(errors) == 0, errors
```

### Filing Response Types

```typescript
interface FileResult {
  status: "accepted" | "rejected" | "needs_review"
  message: string
  receipt_id?: string
  filed_at?: string
  rejection_code?: string
  rejection_message?: string
}
```

### Filing UI States

| State | Display |
|-------|---------|
| Not Ready | Show "File Report" button disabled |
| Ready | Show "File Report" button enabled |
| Filing | Show loading spinner |
| Accepted | Green success card with receipt ID |
| Rejected | Red error card with rejection details |
| Needs Review | Amber pending card |

---

## Component Architecture

### Component Hierarchy

```
WizardPage
├── Header Bar (sticky)
│   ├── Back Button
│   ├── Property Address Title
│   ├── Status Badge
│   └── Save Status Indicator
│
├── RRERQuestionnaire
│   ├── Phase Selector (tabs)
│   ├── Progress Bar
│   │
│   ├── Determination Phase
│   │   ├── PropertyStep
│   │   ├── IntentToBuildStep
│   │   ├── FinancingStep
│   │   ├── LenderAmlStep
│   │   ├── BuyerTypeStep
│   │   ├── ExemptionsStep
│   │   └── ResultStep
│   │
│   ├── Collection Phase
│   │   ├── TransactionPropertyStep
│   │   ├── SellersStep
│   │   ├── BuyerInfoStep
│   │   ├── SigningIndividualsStep
│   │   ├── PaymentInfoStep
│   │   ├── ReportingPersonStep
│   │   └── CertificationsStep
│   │
│   └── Summary Phase
│       └── ReviewCards
│
└── Backend Actions Section
    ├── DeterminationCard
    ├── PartyLinksCard
    ├── ReadyCheckCard
    └── FilingCard
```

### Helper Components

| Component | Purpose |
|-----------|---------|
| `TooltipIcon` | Info icons with hover tooltips for regulatory terms |
| `AddressFields` | Reusable address form (street, city, state, zip, country) |
| `SectionHeader` | Consistent card headers with icons and descriptions |

---

## Dependencies & Contingencies

### Conditional Rendering Rules

| Condition | UI Element |
|-----------|------------|
| `phase === "determination"` | Show determination steps |
| `phase === "collection"` | Show collection steps |
| `phase === "summary"` | Show summary view |
| `backendDetermination?.reportable` | Show Party Links card |
| `backendDetermination?.reportable && partyLinks.length > 0` | Show Ready Check card |
| `readyResult?.ready && !fileResult` | Show File button |
| `report?.status === "collecting"` | Enable party status polling |
| `partyStatus?.summary.all_complete` | Show "All Complete" badge |

### Button Enable/Disable Logic

| Button | Enabled When |
|--------|--------------|
| Next (Determination) | `canProceedDetermination === true` |
| Start Collection | `determinationResult?.isReportable === true` |
| Generate Links | `backendDetermination?.reportable && !generatingLinks` |
| Ready Check | `partyLinks.length > 0 && !checkingReady` |
| File Report | `readyResult?.ready && !filing` |

### Progress Calculations

```typescript
// Determination progress
const determinationProgress = useMemo(() => {
  const currentIndex = relevantDeterminationSteps.indexOf(determinationStep)
  return ((currentIndex + 1) / relevantDeterminationSteps.length) * 100
}, [determinationStep, relevantDeterminationSteps])

// Collection progress
const collectionProgress = useMemo(() => {
  const currentIndex = collectionSteps.indexOf(collectionStep)
  return ((currentIndex + 1) / collectionSteps.length) * 100
}, [collectionStep])
```

### Error Handling

| Error Type | Handling |
|------------|----------|
| Report load failure | Show error page with "Back to Reports" button |
| Save failure | Set `saveStatus = "error"`, show indicator |
| Determination failure | Set error state, show dismissible alert |
| Party link failure | Set error state, show dismissible alert |
| Ready check failure | Set error state, show dismissible alert |
| Filing failure | Set error state or show rejection card |

---

## Appendix: Constants

### US States
Full list of US states with two-letter codes for dropdown selectors.

### Property Types
- `1-4-family`: 1-4 Family Residence
- `condo`: Condominium
- `townhome`: Townhome
- `coop`: Cooperative (Co-op)
- `land`: Land (Intent to Build 1-4 Family)

### Entity Types
- `llc-single`: LLC (Single Member)
- `llc-multi`: LLC (Multi-Member)
- `c-corp`: Corporation (C-Corp)
- `s-corp`: Corporation (S-Corp)
- `general-partnership`: General Partnership
- `lp`: Limited Partnership (LP)
- `llp`: Limited Liability Partnership (LLP)
- `foreign`: Foreign Entity
- `other`: Other

### Trust Types
- `revocable-living`: Revocable Living Trust
- `irrevocable`: Irrevocable Trust
- `land-trust`: Land Trust
- `blind-trust`: Blind Trust
- `charitable`: Charitable Trust
- `other`: Other

### Payment Source Types
- `wire`: Wire Transfer
- `certified-check`: Certified/Cashier's Check
- `personal-check`: Personal Check
- `business-check`: Business Check
- `cash`: Cash
- `crypto`: Cryptocurrency
- `other`: Other

### Signing Capacities
- `member-manager`: Member/Manager (LLC)
- `officer`: Officer
- `director`: Director
- `partner`: Partner
- `trustee`: Trustee
- `agent`: Authorized Agent
- `poa`: Attorney-in-Fact (POA)
- `other`: Other
