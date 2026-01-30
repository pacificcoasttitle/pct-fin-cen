# Wizard Master Tech Spec

> **Created:** January 30, 2026  
> **Version:** 1.0  
> **Purpose:** Single source of truth for the FinClear wizard system

---

## Table of Contents

1. [Component Architecture](#1-component-architecture)
2. [State Management](#2-state-management)
3. [Wizard Phases & Steps](#3-wizard-phases--steps)
4. [Status Lifecycle](#4-status-lifecycle)
5. [Data Hydration & Flow](#5-data-hydration--flow)
6. [API Endpoints](#6-api-endpoints)
7. [Party Portal Connection](#7-party-portal-connection)
8. [Determination Logic](#8-determination-logic)
9. [File Inventory](#9-file-inventory)
10. [Current Gaps & Observations](#10-current-gaps--observations)

---

## 1. Component Architecture

### 1.1 Wizard Component Tree

```
WizardPage (web/app/(app)/app/reports/[id]/wizard/page.tsx)
├── Header Bar (sticky)
│   ├── Back Button → /app/admin/reports
│   ├── Property Address
│   ├── Escrow Number Badge
│   ├── Status Badge
│   └── Save Status Indicator
├── Client Notes Alert (if initialData.collection.clientNotes)
└── RRERQuestionnaire (web/components/rrer-questionnaire.tsx)
    ├── Phase 1: Determination
    │   ├── Step: property
    │   ├── Step: intent-to-build
    │   ├── Step: financing
    │   ├── Step: lender-aml
    │   ├── Step: buyer-type
    │   ├── Step: individual-exemptions
    │   ├── Step: entity-exemptions
    │   ├── Step: trust-exemptions
    │   └── Step: determination-result
    ├── Phase 2: Collection
    │   ├── Step: transaction-property
    │   ├── Step: party-setup → Creates ReportParty + PartyLink
    │   ├── Step: monitor-progress → Polls getReportParties()
    │   ├── Step: review-submissions → Links to /app/reports/[id]/review
    │   ├── Step: reporting-person
    │   └── Step: file-report → readyCheck() + fileReport()
    └── Phase 3: Summary
        └── Filing Result Display
```

### 1.2 Key Components

| Component | File Path | Purpose |
|-----------|-----------|---------|
| `WizardPage` | `web/app/(app)/app/reports/[id]/wizard/page.tsx` | Page wrapper, handles API calls, autosave |
| `RRERQuestionnaire` | `web/components/rrer-questionnaire.tsx` | Main wizard UI (~4,500 lines) |
| `DynamicPartyForm` | `web/components/party-portal/index.tsx` | Form selector for party portal |
| `BuyerEntityForm` | `web/components/party-portal/BuyerEntityForm.tsx` | Buyer entity form with BOs |
| `BuyerTrustForm` | `web/components/party-portal/BuyerTrustForm.tsx` | Buyer trust form |
| `SellerIndividualForm` | `web/components/party-portal/SellerIndividualForm.tsx` | Seller individual form |
| `SellerEntityForm` | `web/components/party-portal/SellerEntityForm.tsx` | Seller entity form |
| `SellerTrustForm` | `web/components/party-portal/SellerTrustForm.tsx` | Seller trust form |

### 1.3 Props & Interfaces

```typescript
// RRERQuestionnaire Props (from web/components/rrer-questionnaire.tsx)
export interface RRERQuestionnaireProps {
  initialData?: {
    phase?: Phase;
    determinationStep?: string;
    collectionStep?: string;
    determination?: Record<string, unknown>;
    collection?: Record<string, unknown>;
  };
  onChange?: (data: {
    phase: Phase;
    determinationStep: DeterminationStepId;
    collectionStep: CollectionStepId;
    determination: DeterminationState;
    collection: Partial<CollectionData>;
  }) => void;
  saveStatus?: "idle" | "saving" | "saved" | "error";
  reportId?: string;
  partyStatus?: ReportPartiesResponse | null;
  onRefreshPartyStatus?: () => void;
  onSendPartyLinks?: (parties: PartyInput[]) => Promise<void>;
  onReadyCheck?: () => Promise<{ ready: boolean; errors: string[] }>;
  onFileReport?: () => Promise<{ success: boolean; receipt_id?: string; error?: string }>;
}
```

---

## 2. State Management

### 2.1 Wizard State Structure

The wizard state is stored in `Report.wizard_data` as JSONB:

```typescript
interface WizardData {
  // Current phase and step tracking
  phase: "determination" | "collection" | "summary";
  determinationStep: DeterminationStepId;
  collectionStep: CollectionStepId;
  
  // Phase 1: Determination answers
  determination: {
    isResidential: "yes" | "no" | "unknown" | null;
    hasIntentToBuild: "yes" | "no" | "unknown" | null;
    isNonFinanced: "yes" | "no" | "unknown" | null;
    lenderHasAml: "yes" | "no" | "unknown" | null;
    buyerType: "individual" | "entity" | "trust" | null;
    individualExemptions: string[];
    entityExemptions: string[];
    trustExemptions: string[];
  };
  
  // Phase 2: Collection data
  collection: {
    // Pre-filled from SubmissionRequest
    escrowNumber?: string;
    financingType?: "cash" | "financed" | "partial_cash";
    initialParties?: {
      buyers: Array<{ name: string; email: string; type: string; phone?: string }>;
      sellers: Array<{ name: string; email: string; type?: string; phone?: string }>;
    };
    clientNotes?: string;
    
    // Transaction data
    closingDate: string;
    propertyAddress: Address;
    county: string;
    propertyType: string;
    purchasePrice: number;
    
    // Party data (used for local tracking before link generation)
    sellers: SellerData[];
    buyerType: "entity" | "trust";
    buyerEntity?: BuyerEntityData;
    buyerTrust?: BuyerTrustData;
    
    // Other collection fields
    signingIndividuals: SigningIndividual[];
    paymentSources: PaymentSource[];
    reportingPerson: ReportingPerson;
    buyerCertification: Certification;
    sellerCertification: Certification;
  };
}
```

### 2.2 State Persistence

**Autosave Mechanism:**
- Debounce delay: `1500ms` (AUTOSAVE_DELAY constant)
- Trigger: Any change to wizard state via `onChange` callback
- Endpoint: `PUT /reports/{id}/wizard`
- Data: `{ wizard_step, wizard_data: { phase, determination, collection, ... } }`

**State Loading:**
```typescript
// In WizardPage useEffect
const loadReport = async () => {
  const data = await getReport(reportId);
  setReport(data);
  // wizard_data is loaded and passed to RRERQuestionnaire as initialData
};
```

### 2.3 State Transitions

| Trigger | State Change |
|---------|--------------|
| User answers determination question | `determination` object updated |
| User clicks "Continue" (determination) | `determinationStep` changes to next step |
| User clicks "Back" (determination) | `determinationStep` changes to previous step |
| Determination complete | `phase` → "collection" |
| User enters collection data | `collection` object updated |
| User clicks "Send Links" | API called, `collectionStep` → "monitor-progress" |
| User clicks "Submit to FinCEN" | API called, Report status → "filed" |

---

## 3. Wizard Phases & Steps

### 3.1 Phase Overview

| Phase | Steps | Purpose |
|-------|-------|---------|
| **Determination** | 1-9 (dynamic) | Decide if transaction is reportable |
| **Collection** | 6 fixed steps | Gather data, create parties, file |
| **Summary** | 1 | Show filing result |

### 3.2 Step Definitions

**Determination Steps (DeterminationStepId):**

| Step ID | Display Name | Purpose | Conditional |
|---------|--------------|---------|-------------|
| `property` | Property Type | Is residential? | Always shown |
| `intent-to-build` | Intent to Build | Land with intent to build 1-4 family? | If `isResidential === "unknown"` |
| `financing` | Financing | Cash or financed? | Always shown |
| `lender-aml` | Lender AML | Does lender have AML program? | If financed |
| `buyer-type` | Buyer Type | Individual, entity, or trust? | Always shown |
| `individual-exemptions` | Individual Exemptions | Check 8 exemption categories | If `buyerType === "individual"` |
| `entity-exemptions` | Entity Exemptions | Check 15+ exemption categories | If `buyerType === "entity"` |
| `trust-exemptions` | Trust Exemptions | Check 4 exemption categories | If `buyerType === "trust"` |
| `determination-result` | Result | Show reportable/exempt result | Always shown last |

**Collection Steps (CollectionStepId):**

| Step ID | Display Name | Purpose | Key Fields |
|---------|--------------|---------|------------|
| `transaction-property` | Transaction & Property | Enter property & closing details | closingDate, propertyAddress, purchasePrice |
| `party-setup` | Party Setup | Add sellers + buyers, enter names/emails | partySetup.sellers[], partySetup.buyers[] |
| `monitor-progress` | Monitor Progress | Track party link submissions | Displays partyStatus from API |
| `review-submissions` | Review Submissions | View submitted party data | Link to /app/reports/[id]/review |
| `reporting-person` | Reporting Person | FinClear internal info | reportingPerson.* |
| `file-report` | File Report | Final cert and submit | Calls readyCheck() + fileReport() |

### 3.3 Conditional Step Logic

```typescript
// In RRERQuestionnaire - dynamic step determination
const relevantDeterminationSteps = useMemo(() => {
  const steps: DeterminationStepId[] = ["property"];
  
  if (determination.isResidential === "unknown") {
    steps.push("intent-to-build");
  }
  
  if (determination.isResidential === "yes" || determination.hasIntentToBuild === "yes") {
    steps.push("financing");
    
    if (determination.isNonFinanced === "no") {
      steps.push("lender-aml");
    }
    
    if (determination.isNonFinanced === "yes" || 
        (determination.isNonFinanced === "no" && determination.lenderHasAml === "no")) {
      steps.push("buyer-type");
      
      if (determination.buyerType === "individual") {
        steps.push("individual-exemptions");
      } else if (determination.buyerType === "entity") {
        steps.push("entity-exemptions");
      } else if (determination.buyerType === "trust") {
        steps.push("trust-exemptions");
      }
    }
  }
  
  steps.push("determination-result");
  return steps;
}, [determination]);
```

### 3.4 Navigation Logic

- **Next:** `collectionSteps.indexOf(collectionStep) + 1` (bounds checked)
- **Back:** `collectionSteps.indexOf(collectionStep) - 1` (bounds checked)
- **Jump to step:** Not supported - linear progression only
- **Reset:** `resetQuestionnaire()` returns to `phase: "determination"`, `determinationStep: "property"`

---

## 4. Status Lifecycle

### 4.1 Report Status Flow

```
draft → determination_complete → collecting → ready_to_file → filed
                              ↘             ↗
                               → exempt (ends here)
```

| Status | Meaning | Set When | Set By |
|--------|---------|----------|--------|
| `draft` | Wizard started, in progress | `POST /submission-requests/{id}/create-report` | API |
| `determination_complete` | Determination finished, reportable | `POST /reports/{id}/determine` (if reportable) | API |
| `collecting` | Party links sent, waiting | `POST /reports/{id}/party-links` | API (auto-transition) |
| `ready_to_file` | All parties submitted | Backend detection | API |
| `filed` | Successfully filed to FinCEN | `POST /reports/{id}/file` | API |
| `exempt` | Not reportable | `POST /reports/{id}/determine` (if exempt) | API |

### 4.2 SubmissionRequest Status Flow

```
pending → exempt (if early determination finds exemption)
       → reportable → in_progress → completed
```

| Status | Meaning | Set When | Set By |
|--------|---------|----------|--------|
| `pending` | New request, waiting | Created via form | API |
| `exempt` | Auto-determined exempt at submission | Early determination | API |
| `reportable` | Requires filing | Early determination | API |
| `in_progress` | Report created, wizard started | `POST /submission-requests/{id}/create-report` | API |
| `completed` | Filed or exempt | Report filed/exempted | API |
| `cancelled` | Cancelled by staff/client | Manual action | API |

### 4.3 ReportParty Status Flow

```
pending → link_sent → in_progress → submitted → verified
```

| Status | Meaning | Set When | Set By |
|--------|---------|----------|--------|
| `pending` | Party created, no link yet | `POST /reports/{id}/party-links` | API |
| `link_sent` | Email invitation sent | After party creation (if email provided) | API |
| `in_progress` | Party started filling form | `POST /party/{token}/save` | Party Portal |
| `submitted` | Party submitted final data | `POST /party/{token}/submit` | Party Portal |
| `verified` | Staff verified data | Manual verification | Staff |

### 4.4 PartyLink Status Flow

```
active → used (or expired/revoked)
```

| Status | Meaning | Set When | Set By |
|--------|---------|----------|--------|
| `active` | Link can be used | Created | API |
| `used` | Party submitted | `POST /party/{token}/submit` | Party Portal |
| `expired` | Past expiration date | Automatic on access | API |
| `revoked` | Manually disabled | Staff action | API |

### 4.5 Status Sync Rules

1. **SubmissionRequest → Report:** When Report is filed or exempt, SubmissionRequest status → "completed"
2. **PartyLink → Party:** When link is used, Party status → "submitted"
3. **Report status auto-transitions:** `determination_complete` → `collecting` when first party links created

---

## 5. Data Hydration & Flow

### 5.1 SubmissionRequest → Wizard (create-report endpoint)

When staff clicks "Start Wizard", `POST /submission-requests/{id}/create-report` creates a Report with pre-filled `wizard_data`:

| SubmissionRequest Field | Wizard Field | Transform |
|------------------------|--------------|-----------|
| `property_address` | `collection.propertyAddress` | JSON object → Address |
| `purchase_price_cents` | `collection.purchasePrice` | cents / 100 → dollars |
| `expected_closing_date` | `collection.closingDate` | ISO date string |
| `escrow_number` | `collection.escrowNumber` | Direct |
| `financing_type` | `collection.financingType` + `determination.isNonFinanced` | "cash" → "yes", "financed" → "no" |
| `buyer_name` | `collection.initialParties.buyers[0].name` | Direct |
| `buyer_email` | `collection.initialParties.buyers[0].email` | Direct |
| `buyer_type` | `collection.initialParties.buyers[0].type` | Direct |
| `seller_name` | `collection.initialParties.sellers[0].name` | Direct |
| `seller_email` | `collection.initialParties.sellers[0].email` | Direct |
| `notes` | `collection.clientNotes` | Direct |

### 5.2 Wizard → Party Creation (party-setup step)

When user clicks "Send Links & Continue" in party-setup step:

| Wizard Field | Party Field | Notes |
|--------------|-------------|-------|
| `partySetup.buyers[i].name` | `ReportParty.display_name` | Direct |
| `partySetup.buyers[i].email` | `ReportParty.party_data.email` | Also sent invite |
| `partySetup.buyers[i].type` | `ReportParty.entity_type` | "individual", "entity", "trust" |
| `partySetup.buyers[i].phone` | `ReportParty.party_data.phone` | Optional |
| (parsed from name) | `ReportParty.party_data.first_name/last_name` | For individuals |
| (parsed from name) | `ReportParty.party_data.entity_name` | For entities |

### 5.3 Party → Party Portal Form (GET /party/{token})

| Party Record Field | Portal Form Field | Pre-filled? |
|-------------------|-------------------|-------------|
| `party_data.email` | Email field | ✅ Yes |
| `party_data.first_name` | First Name | ✅ Yes (individuals) |
| `party_data.last_name` | Last Name | ✅ Yes (individuals) |
| `party_data.entity_name` | Entity Name | ✅ Yes (entities) |
| `party_data.phone` | Phone | ✅ Yes |
| `party_role` | Form type selection | ✅ Determines form |
| `entity_type` | Form type selection | ✅ Determines form |
| `report.property_address_text` | Context display | ✅ Shown in header |
| `report.closing_date` | Context display | ✅ Shown in header |
| `report.wizard_data.collection.purchasePrice` | Payment total validation | ✅ For buyers |

### 5.4 Data Flow Diagram

```
Client Submits Request (web/app/(app)/app/requests/new/page.tsx)
    │
    ▼ POST /submission-requests
┌─────────────────────────────────────────┐
│ SubmissionRequest                       │
│ - property_address, buyer_name, etc.    │
│ - determination_result (auto)           │
└─────────────────────────────────────────┘
    │
    │ Staff clicks "Start Wizard"
    ▼ POST /submission-requests/{id}/create-report
┌─────────────────────────────────────────┐
│ Report                                   │
│ - wizard_data.collection (pre-filled)   │
│ - wizard_data.determination             │
│ - status: "draft"                       │
└─────────────────────────────────────────┘
    │
    │ Staff completes determination + party-setup
    ▼ POST /reports/{id}/party-links
┌─────────────────────────────────────────┐
│ ReportParty[]                           │
│ - party_role, entity_type               │
│ - party_data (name, email pre-filled)   │
│ - status: "pending"                     │
├─────────────────────────────────────────┤
│ PartyLink[]                             │
│ - token (unique URL)                    │
│ - expires_at                            │
│ - status: "active"                      │
└─────────────────────────────────────────┘
    │
    │ Party opens link (/p/{token})
    ▼ GET /party/{token}
┌─────────────────────────────────────────┐
│ Party Portal Form (pre-filled)          │
│ - Shows property context                │
│ - Pre-filled name, email                │
│ - Collects: ID, address, DOB, SSN, etc. │
└─────────────────────────────────────────┘
    │
    │ Party saves progress
    ▼ POST /party/{token}/save
    │
    │ Party submits
    ▼ POST /party/{token}/submit
┌─────────────────────────────────────────┐
│ ReportParty                             │
│ - party_data (full data from form)      │
│ - status: "submitted"                   │
├─────────────────────────────────────────┤
│ PartyLink                               │
│ - status: "used"                        │
│ - submitted_at: now                     │
└─────────────────────────────────────────┘
    │
    │ Staff reviews + files
    ▼ POST /reports/{id}/file
┌─────────────────────────────────────────┐
│ Report                                   │
│ - status: "filed"                       │
│ - filing_status: "filed_mock"           │
│ - receipt_id: "BSA-XXXX-XXXX"           │
└─────────────────────────────────────────┘
```

---

## 6. API Endpoints

### 6.1 Wizard Endpoints

| Method | Endpoint | Purpose | Request | Response |
|--------|----------|---------|---------|----------|
| `POST` | `/reports` | Create new report | `ReportCreate` | `ReportResponse` |
| `GET` | `/reports/{id}` | Get report details | - | `ReportDetailResponse` |
| `PUT` | `/reports/{id}/wizard` | Save wizard progress | `WizardUpdate` | `ReportDetailResponse` |
| `POST` | `/reports/{id}/determine` | Run determination | - | `DeterminationResponse` |
| `POST` | `/reports/{id}/party-links` | Create parties + links | `PartyLinkCreate` | `PartyLinkResponse` |
| `GET` | `/reports/{id}/parties` | Get party status | - | `ReportPartiesResponse` |
| `POST` | `/reports/{id}/ready-check` | Check filing readiness | - | `ReadyCheckResponse` |
| `POST` | `/reports/{id}/file` | Submit to FinCEN | - | `FileResponse` |

### 6.2 Party Portal Endpoints

| Method | Endpoint | Purpose | Request | Response |
|--------|----------|---------|---------|----------|
| `GET` | `/party/{token}` | Load party data | - | `PartyResponse` |
| `POST` | `/party/{token}/save` | Autosave | `PartySave` | `PartyResponse` |
| `POST` | `/party/{token}/submit` | Final submit | - | `PartySubmitResponse` |

### 6.3 Schema Details

```python
# WizardUpdate (api/app/schemas/report.py)
class WizardUpdate(BaseModel):
    wizard_step: int
    wizard_data: Dict[str, Any]

# PartyLinkCreate
class PartyLinkCreate(BaseModel):
    parties: List[PartyInput]
    expires_in_days: int = 30

# PartyInput
class PartyInput(BaseModel):
    party_role: str  # "transferee", "transferor", "buyer", "seller"
    entity_type: str  # "individual", "entity", "trust", etc.
    display_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None

# DeterminationResponse
class DeterminationResponse(BaseModel):
    report_id: UUID
    is_reportable: bool
    status: str
    determination: Dict[str, Any]
    reasoning: List[str]

# ReadyCheckResponse
class ReadyCheckResponse(BaseModel):
    ready: bool
    missing: List[MissingItem]
    summary: Dict[str, int]

# FileResponse
class FileResponse(BaseModel):
    ok: bool
    status: str  # "accepted", "rejected", "needs_review"
    receipt_id: Optional[str]
    message: Optional[str]
    filed_at: Optional[datetime]
```

---

## 7. Party Portal Connection

### 7.1 Portal Entry Point

- **URL Pattern:** `/p/{token}`
- **Token Validation:** `get_valid_link()` checks expiration, revocation, used status
- **Expiration Handling:** Returns 410 Gone with appropriate message

```typescript
// Token validation in api/app/routes/parties.py
def get_valid_link(token: str, db: Session) -> PartyLink:
    link = db.query(PartyLink).filter(PartyLink.token == token).first()
    
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")
    
    if link.status == "expired" or datetime.utcnow() > link.expires_at:
        raise HTTPException(status_code=410, detail="Link has expired")
    
    if link.status == "revoked":
        raise HTTPException(status_code=410, detail="Link has been revoked")
    
    if link.status == "used":
        raise HTTPException(status_code=410, detail="Link has already been used")
    
    return link
```

### 7.2 Form Selection Logic

`DynamicPartyForm` in `web/components/party-portal/index.tsx` selects form based on:

| party_role | entity_type | Form Component |
|------------|-------------|----------------|
| `transferor` (seller) | `individual` | `SellerIndividualForm` |
| `transferor` (seller) | `entity` | `SellerEntityForm` |
| `transferor` (seller) | `trust` | `SellerTrustForm` |
| `transferee` (buyer) | `individual` | `GenericIndividualForm` |
| `transferee` (buyer) | `entity` | `BuyerEntityForm` |
| `transferee` (buyer) | `trust` | `BuyerTrustForm` |

### 7.3 Pre-filled Fields

Fields pre-populated from `party_data` when portal loads:

| Field | Pre-filled? | Source |
|-------|-------------|--------|
| First Name | ✅ | `party_data.first_name` |
| Last Name | ✅ | `party_data.last_name` |
| Entity Name | ✅ | `party_data.entity_name` |
| Trust Name | ✅ | `party_data.trust_name` |
| Email | ✅ | `party_data.email` |
| Phone | ✅ | `party_data.phone` |
| Property Address | ✅ | `report.property_address_text` (display) |
| Closing Date | ✅ | `report.closing_date` (display) |
| Purchase Price | ✅ | `report.wizard_data.collection.purchasePrice` (validation) |

### 7.4 Required Fields by Form

**SellerIndividualForm:**
- First Name, Last Name (required)
- DOB, SSN (required for FinCEN)
- Address (required)
- Citizenship (required)
- Government ID (required)

**BuyerEntityForm:**
- Entity Name, EIN (required)
- Entity Type (LLC, Corp, etc.)
- State of Formation
- Address (required)
- Beneficial Owners (at least 1 required)
- Payment Sources (required, must total purchase price)
- Signing Individual

**BuyerTrustForm:**
- Trust Name, Type (required)
- Trust Date, EIN
- Trustees (at least 1 required)
- Settlors/Grantors
- Beneficiaries
- Payment Sources (required)

### 7.5 Beneficial Owner Collection

In `BuyerEntityForm`, beneficial owners are collected via expandable `BeneficialOwnerCard` components:

- Minimum 1 beneficial owner required
- Each BO requires: Name, DOB, SSN, Address, Citizenship, ID
- Ownership percentage captured
- Control type checkboxes (senior officer, authority, other)

### 7.6 Document Upload Integration

`DocumentUpload` component is integrated into all forms:

- Uses Cloudflare R2 for storage
- Pre-signed URL generation: `GET /documents/upload-url`
- Supported types: Government ID, Trust Agreement, Formation Docs, etc.
- Max size: 10MB per file
- Files linked to `party_id`

---

## 8. Determination Logic

### 8.1 Determination Rules (Decision Tree)

```
START
  │
  ▼
Is Residential? (1-4 family)
  │
  ├─ NO → EXEMPT (reason: non_residential)
  │
  └─ YES / UNKNOWN
      │
      ▼
  Is Land with Intent to Build?
      │
      ├─ YES → Continue to financing
      │
      └─ NO (and not residential) → EXEMPT
      │
      ▼
  Is Financed by Regulated Lender?
      │
      ├─ YES (conventional/FHA/VA/USDA) → EXEMPT (reason: regulated_financing)
      │
      └─ NO (cash, seller financing, private)
          │
          ▼
      Buyer Type?
          │
          ├─ Individual → Check Individual Exemptions (8 categories)
          │     │
          │     ├─ Any exemption applies? → EXEMPT
          │     └─ No exemptions → REPORTABLE
          │
          ├─ Entity → Check Entity Exemptions (15+ categories)
          │     │
          │     ├─ Any exemption applies? → EXEMPT
          │     └─ No exemptions → REPORTABLE
          │
          └─ Trust → Check Trust Exemptions (4 categories)
                │
                ├─ Any exemption applies? → EXEMPT
                └─ No exemptions → REPORTABLE
```

### 8.2 Exemption Types

**Individual Exemptions (8):**
1. Easement only (no fee simple)
2. Transfer due to death
3. Transfer due to divorce
4. Transfer to bankruptcy estate
5. Court-supervised transfer
6. No-consideration to trust (settlor is individual)
7. 1031 Exchange
8. No reporting person identified

**Entity Exemptions (15):**
1. Securities reporting issuer (public company)
2. Government authority
3. Bank or credit union
4. Depository institution holding company
5. Money services business
6. Broker/dealer in securities
7. Securities exchange or clearing agency
8. Other Exchange Act registered
9. Insurance company
10. State-licensed insurance producer
11. Commodity Exchange Act registered
12. Public utility
13. Designated financial market utility
14. Registered investment company/adviser
15. Controlled by exempt entity

**Trust Exemptions (4):**
1. Trust is securities reporting issuer
2. Trustee is securities reporting issuer
3. Statutory trust (Delaware, etc.)
4. Wholly owned by exempt entity

### 8.3 Determination Result Schema

```typescript
interface DeterminationResult {
  isReportable: boolean;
  reason: string;  // e.g., "non_residential", "regulated_financing"
  documentation: string;  // Human-readable explanation
  exemptionsSelected?: string[];  // List of exemption IDs selected
}
```

---

## 9. File Inventory

### 9.1 Frontend Files

| File | Purpose | Key Exports |
|------|---------|-------------|
| `web/components/rrer-questionnaire.tsx` | Main wizard component | `RRERQuestionnaire` |
| `web/app/(app)/app/reports/[id]/wizard/page.tsx` | Wizard page wrapper | `WizardPage` |
| `web/app/(app)/app/reports/[id]/review/page.tsx` | Party data review | `ReviewPage` |
| `web/app/p/[token]/page.tsx` | Party portal page | `PartyPortalPage` |
| `web/lib/rrer-types.ts` | Wizard types | All interfaces, constants |
| `web/lib/api.ts` | API client | `getReport`, `saveWizard`, etc. |
| `web/components/party-portal/index.tsx` | Form selector | `DynamicPartyForm` |
| `web/components/party-portal/BuyerEntityForm.tsx` | Buyer entity form | `BuyerEntityForm` |
| `web/components/party-portal/BuyerTrustForm.tsx` | Buyer trust form | `BuyerTrustForm` |
| `web/components/party-portal/SellerIndividualForm.tsx` | Seller individual | `SellerIndividualForm` |
| `web/components/party-portal/SellerEntityForm.tsx` | Seller entity | `SellerEntityForm` |
| `web/components/party-portal/SellerTrustForm.tsx` | Seller trust | `SellerTrustForm` |
| `web/components/party-portal/types.ts` | Portal types | `PartySubmissionData`, constants |
| `web/components/party-portal/validation.ts` | Validation utils | Validation functions |
| `web/components/party-portal/DocumentUpload.tsx` | File upload | `DocumentUpload` |

### 9.2 Backend Files

| File | Purpose | Key Functions |
|------|---------|---------------|
| `api/app/routes/reports.py` | Report API | `save_wizard`, `determine`, `party_links`, `file` |
| `api/app/routes/parties.py` | Party Portal API | `get_party_by_token`, `save`, `submit` |
| `api/app/routes/submission_requests.py` | Submission API | `create_report_from_submission` |
| `api/app/models/report.py` | Report model | `Report` class |
| `api/app/models/report_party.py` | Party model | `ReportParty` class |
| `api/app/models/party_link.py` | Link model | `PartyLink` class |
| `api/app/services/determination.py` | Determination logic | `determine_reportability` |
| `api/app/services/early_determination.py` | Early determination | `determine_reporting_requirement` |
| `api/app/services/filing.py` | Filing service | `MockFilingProvider` |
| `api/app/services/party_validation.py` | Party validation | `calculate_party_summary` |
| `api/app/schemas/report.py` | Report schemas | All Pydantic models |
| `api/app/schemas/party.py` | Party schemas | `PartyResponse`, `PartyInput` |

### 9.3 Shared Types

| File | Purpose | Key Types |
|------|---------|-----------|
| `web/lib/rrer-types.ts` | Wizard types | `WizardData`, `DeterminationStep`, `CollectionData` |
| `web/lib/api.ts` | API types | `Report`, `PartyLink`, `ReportPartiesResponse` |
| `web/components/party-portal/types.ts` | Portal types | `PartySubmissionData`, `AddressData`, `BeneficialOwnerData` |

---

## 10. Current Gaps & Observations

### 10.1 Missing Functionality

1. **No buyer individual form** - Only entity and trust buyers are fully supported (as expected per FinCEN rules - individuals exempt)
2. **No multi-seller support in party-setup UI** - Data structure supports it, UI only has single seller in some places
3. **No link regeneration** - Can't regenerate expired links without creating new party
4. **No party deletion** - Once created, parties can't be removed
5. **No partial filing** - Can't file report with only some parties submitted

### 10.2 Hardcoded Values

| Value | Location | Should Be |
|-------|----------|-----------|
| `AUTOSAVE_DELAY = 1500` | wizard page | Configurable |
| `expires_in_days = 30` | PartyLinkCreate default | From settings |
| `MAX_DETERMINATION_STEPS = 7` | questionnaire | Dynamic based on actual steps |
| `"Pacific Coast Title Company"` | Various places | `BRAND.name` |
| Filing price `$75` | seed data, dashboards | Configurable |

### 10.3 Potential Issues

1. **Large wizard_data JSONB** - No cleanup of stale data when steps change
2. **No optimistic updates** - UI waits for API response before updating
3. **No offline support** - Lost data if network fails during autosave
4. **No conflict resolution** - If two tabs open same wizard, last save wins
5. **Determination step array recalculation** - Runs on every render via useMemo

### 10.4 SiteX/Address Lookup Integration (IMPLEMENTED)

See **Section 11** for complete SiteX integration documentation.

---

## 11. SiteX Integration & Address Autocomplete

### 11.1 Overview

The wizard integrates with Google Places for address autocomplete and SiteX for property data enrichment. This provides:
- Fast, accurate address entry via Google Places
- Auto-fill of county, APN, and property details from SiteX
- Current owner lookup (useful for seller verification)
- Property type verification

### 11.2 Architecture

```
User types address
    ↓
Google Places suggests addresses
    ↓
User selects address
    ↓ (ParsedAddress)
Frontend calls POST /property/lookup
    ↓
SiteX returns property data
    ↓ (PropertyData)
Wizard state updated with:
- propertyAddress (street, city, state, zip)
- county (auto-filled)
- apn (auto-filled)
- siteXData (full property record)
```

### 11.3 Data Flow

| Source | Field | Destination | Notes |
|--------|-------|-------------|-------|
| Google Places | street | collection.propertyAddress.street | Parsed from address_components |
| Google Places | city | collection.propertyAddress.city | locality or sublocality |
| Google Places | state | collection.propertyAddress.state | administrative_area_level_1 (short) |
| Google Places | zip | collection.propertyAddress.zip | postal_code |
| Google Places | county | collection.county | administrative_area_level_2 |
| SiteX | apn | collection.apn | Assessor's Parcel Number |
| SiteX | ownerName | (display only) | Current owner of record |
| SiteX | propertyType | collection.siteXData.propertyType | Single Family, Condo, etc. |
| SiteX | assessedValue | collection.siteXData.assessedValue | For reference |

### 11.4 Integration Points

| Location | Component | Purpose |
|----------|-----------|---------|
| Client form | `requests/new/page.tsx` | Initial address entry |
| Wizard | `rrer-questionnaire.tsx` (transaction-property) | Staff verification |
| Backend | `routes/property.py` | SiteX proxy endpoints |
| Service | `services/sitex_client.py` | SiteX API client |

### 11.5 API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/property/status` | GET | Check if services configured |
| `/property/lookup` | POST | Lookup property by address |
| `/property/lookup-by-apn` | POST | Lookup property by APN |
| `/property/clear-cache` | POST | Clear lookup cache |

### 11.6 Configuration

**Frontend (.env.local or Vercel):**
```
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_key
```

**Backend (.env or Render):**
```
# SiteX / BKI Connect Property Data
SITEX_BASE_URL=https://api.bkiconnect.com
SITEX_CLIENT_ID=your_client_id
SITEX_CLIENT_SECRET=your_client_secret
SITEX_FEED_ID=your_feed_id
SITEX_DEBUG=false
SITEX_TIMEOUT=30
```

**IMPORTANT:** All four SiteX variables are required:
- `SITEX_CLIENT_ID` - OAuth client ID
- `SITEX_CLIENT_SECRET` - OAuth client secret  
- `SITEX_FEED_ID` - Feed ID (included in API URL path)
- `SITEX_BASE_URL` - API base URL (default: https://api.bkiconnect.com)

### 11.7 Graceful Degradation

- If Google Places unavailable: Manual address entry still works
- If SiteX unavailable: Address autocomplete works, no property enrichment
- No hard failures - all lookups are optional enhancements

### 11.8 Files Added

| File | Purpose |
|------|---------|
| `api/app/services/sitex_models.py` | Pydantic models for property data |
| `api/app/services/sitex_client.py` | SiteX API client with OAuth |
| `api/app/routes/property.py` | Property lookup endpoints |
| `web/components/AddressAutocomplete.tsx` | Autocomplete component |
| `web/lib/google-places.ts` | Google Places utilities |
| `web/lib/property-types.ts` | TypeScript types |
| `web/types/google-maps.d.ts` | Google Maps type declarations |

### 11.9 Component Usage

```tsx
import { AddressAutocomplete } from "@/components/AddressAutocomplete";

<AddressAutocomplete
  onSelect={(address, property) => {
    updateCollection({
      propertyAddress: {
        street: address.street,
        city: address.city,
        state: address.state,
        zip: address.zip,
      },
      county: address.county || "",
      apn: property?.apn || "",
      siteXData: property ? {
        apn: property.apn,
        ownerName: property.primary_owner?.full_name,
        propertyType: property.property_type,
        assessedValue: property.assessed_value,
        lookupTimestamp: new Date().toISOString(),
      } : undefined,
    });
  }}
  fetchPropertyData={true}
  showPropertyCard={true}
  placeholder="Start typing property address..."
/>
```

---

## Appendix A: Quick Reference

### Starting the Wizard

```typescript
// Staff clicks "Start Wizard" on admin queue
POST /submission-requests/{id}/create-report
→ Returns { report_id, redirect_url: "/app/reports/{id}/wizard" }
```

### Saving Progress

```typescript
// Auto-triggered by onChange after 1.5s debounce
PUT /reports/{id}/wizard
Body: { wizard_step: 2, wizard_data: { phase, determination, collection } }
```

### Creating Party Links

```typescript
// User clicks "Send Links" in party-setup step
POST /reports/{id}/party-links
Body: {
  parties: [
    { party_role: "transferee", entity_type: "entity", display_name: "Acme LLC", email: "..." }
  ],
  expires_in_days: 30
}
```

### Filing Report

```typescript
// User clicks "Submit to FinCEN" after ready check passes
POST /reports/{id}/file
→ Returns { ok: true, status: "accepted", receipt_id: "BSA-..." }
```

---

*Document generated via CURSOR_PROMPT_WIZARD_INVESTIGATION*
