# ENTITY ENHANCEMENTS INVESTIGATION REPORT

**Generated:** February 1, 2026  
**Purpose:** Pre-Implementation Reconnaissance

---

## WIZARD STRUCTURE REPORT

```
Main file: web/components/rrer-questionnaire.tsx (~4500 lines)
Step component pattern: SINGLE FILE (all steps in one component)
Navigation method: useState with phase/step IDs

PHASES:
1. "determination" - Determines if transaction is reportable
2. "collection" - Collects party data
3. "summary" - Final review

DETERMINATION STEPS (DeterminationStepId):
1. "property" - Property type question
2. "intent-to-build" - Conditional: only if property is land
3. "financing" - Cash vs financed
4. "lender-aml" - Conditional: only if financed
5. "buyer-type" - Individual/Entity/Trust selection
6. "individual-exemptions" - Conditional: if buyer is individual
7. "entity-exemptions" - Conditional: if buyer is entity
8. "trust-exemptions" - Conditional: if buyer is trust
9. "determination-result" - Shows result

COLLECTION STEPS (CollectionStepId):
1. "transaction-property" - Closing date, price, property address
2. "party-setup" - Add parties, send portal links
3. "monitor-progress" - Track party submissions
4. "review-submissions" - Review submitted data
5. "reporting-person" - Designate reporting person
6. "file-report" - Submit to FinCEN (mock/live)

BUYER TYPE STEP: Step #5 "buyer-type" in rrer-questionnaire.tsx:1292
ENTITY EXEMPTIONS STEP: Step #7 "entity-exemptions" in rrer-questionnaire.tsx:1379
```

---

## STATE MANAGEMENT REPORT

```
State solution: useState (React hooks)
State location: web/components/rrer-questionnaire.tsx:343-347

WIZARD DATA SHAPE:
{
  phase: Phase,                          // "determination" | "collection" | "summary"
  determinationStep: DeterminationStepId,
  collectionStep: CollectionStepId,
  determination: DeterminationState,     // Answers to determination questions
  collection: CollectionData,            // Full transaction data
}

DETERMINATION STATE (web/lib/rrer-types.ts:296):
{
  isResidential: YesNoUnknown,
  hasIntentToBuild: YesNoUnknown,
  isNonFinanced: YesNoUnknown,
  lenderHasAml: YesNoUnknown,
  buyerType: BuyerType,                   // "individual" | "entity" | "trust"
  individualExemptions: string[],
  entityExemptions: string[],
  trustExemptions: string[],
}

COLLECTION DATA (web/lib/rrer-types.ts:227):
{
  closingDate: string,
  propertyAddress: Address,
  county: string,
  propertyType: string,
  purchasePrice: number,
  sellers: SellerData[],
  buyerType: "entity" | "trust",
  buyerEntity?: BuyerEntityData,          // {entity, beneficialOwners[]}
  buyerTrust?: BuyerTrustData,            // {trust, trustees[], settlors[], beneficiaries[]}
  signingIndividuals: SigningIndividual[],
  paymentSources: PaymentSource[],
  reportingPerson: ReportingPerson,
  buyerCertification: Certification,
  sellerCertification: Certification,
  siteXData?: {...},                      // Optional SiteX property enrichment
}

AUTO-SAVE:
- Trigger: useEffect on state changes (line 586)
- Debounce: Built-in via useCallback dependencies
- Endpoint: PUT /reports/{id}/wizard
- Function location: onChange callback passed as prop
```

---

## BACKEND MODELS REPORT

### REPORT MODEL

```
File: api/app/models/report.py
Table name: reports

Fields:
- id: UUID (primary key)
- status: String(50) ["draft", "determination_complete", "collecting", "ready_to_file", "filed", "exempt"]
- property_address_text: Text
- closing_date: Date
- filing_deadline: Date
- wizard_step: Integer (deprecated - using wizard_data now)
- wizard_data: JSONB    <- THIS STORES ALL WIZARD DATA
- determination: JSONB  <- Determination results
- filing_status: String(50)
- filed_at: DateTime
- receipt_id: String(100)
- filing_payload: JSONB
- company_id: UUID (FK)
- submission_request_id: UUID (FK)
- escrow_number: String(100)
- created_by_user_id: UUID (FK)
- created_at: DateTime
- updated_at: DateTime

wizard_data structure (from frontend):
{
  phase: "determination" | "collection" | "summary",
  determinationStep: string,
  collectionStep: string,
  determination: {...},      // DeterminationState
  collection: {...},         // CollectionData
}
```

### PARTY MODEL (ReportParty)

```
File: api/app/models/report_party.py
Table name: report_parties

Fields:
- id: UUID (primary key)
- report_id: UUID (FK to reports)
- party_role: String(50) ["transferee", "transferor", "beneficial_owner", "reporting_person"]
- entity_type: String(50) ["individual", "llc", "corporation", "trust", "partnership", "other"]
- display_name: String(255)
- party_data: JSONB      <- FLEXIBLE SCHEMA FOR ALL PARTY DATA
- status: String(50) ["pending", "link_sent", "in_progress", "submitted", "verified"]
- created_at: DateTime
- updated_at: DateTime

party_data structure (web/components/party-portal/types.ts):
{
  // Individual fields
  first_name, middle_name, last_name, suffix, date_of_birth, ssn, citizenship, id_type, id_number, id_jurisdiction,
  
  // Entity fields  
  entity_name, entity_dba, entity_type, ein, formation_state, formation_date, formation_country,
  
  // Trust fields
  trust_name, trust_type, trust_date, trust_ein, is_revocable,
  
  // Common
  address: AddressData,
  phone, email,
  
  // Nested arrays for buyers
  beneficial_owners?: BeneficialOwnerData[],
  trustees?: TrusteeData[],
  settlors?: SettlorData[],
  beneficiaries?: BeneficiaryData[],
  payment_sources?: PaymentSourceData[],
  
  // Certification
  certified: boolean,
  certification_signature: string,
  certification_date: string,
}
```

### BENEFICIAL OWNER STRUCTURE

```
NOT a separate model - embedded in party_data JSONB

BeneficialOwnerData (web/components/party-portal/types.ts:12):
{
  id: string,
  first_name: string,
  middle_name?: string,
  last_name: string,
  suffix?: string,
  date_of_birth: string,
  address: AddressData,
  citizenship: "us_citizen" | "us_resident_alien" | "non_resident_alien",
  id_type: "ssn" | "passport_us" | "passport_foreign" | "state_id",
  id_number: string,
  id_jurisdiction?: string,
  ownership_percentage?: number,
  control_type?: ("senior_officer" | "authority_decisions" | "other")[],
  control_other?: string,
}

MISSING FIELDS FOR ENTITY ENHANCEMENTS:
- ❌ is_indirect_owner: boolean
- ❌ indirect_entity_name: string
- ❌ trust_role (for Trust BOs)
```

### DOCUMENT MODEL

```
File: api/app/models/document.py
Table name: documents
Status: FULLY IMPLEMENTED ✅

Fields:
- id: UUID (primary key)
- report_party_id: UUID (FK to report_parties)
- document_type: String(50) ["government_id", "government_id_back", "trust_agreement", "formation_docs", "operating_agreement", "articles_of_incorporation", "beneficial_owner_id", "other"]
- file_name: String(255)
- mime_type: String(100)
- size_bytes: Integer
- storage_key: String(500) (R2 object key)
- file_url: String(500) (deprecated)
- upload_confirmed: Boolean
- description: String(255)
- created_at: DateTime
- uploaded_at: DateTime
- verified_at: DateTime
```

---

## BUYER TYPE FLOW REPORT

### USER SELECTS "ENTITY"

```
1. State change: determination.buyerType = "entity" 
   Location: rrer-questionnaire.tsx:1292-1337
   
2. UI change: Shows 3 radio options (Individual, Entity, Trust)
   When Entity selected: relevantDeterminationSteps changes to include "entity-exemptions"
   
3. Next step: "entity-exemptions" (Step 7)
```

### ENTITY EXEMPTION OPTIONS (current)

```
Location: web/lib/rrer-types.ts:467-483

□ Securities reporting issuer (publicly traded company)
□ Governmental authority (federal, state, local, tribal, foreign)
□ Bank or credit union
□ Depository institution holding company
□ Money services business (registered with FinCEN)
□ Broker or dealer in securities (SEC registered)
□ Securities exchange or clearing agency
□ Other Exchange Act registered entity
□ Insurance company
□ State-licensed insurance producer
□ Commodity Exchange Act registered entity
□ Public utility
□ Designated financial market utility
□ Registered investment company or investment adviser
□ Entity controlled or wholly owned by any of the above
```

### USER SELECTS "TRUST"

```
1. State change: determination.buyerType = "trust"
2. UI change: relevantDeterminationSteps changes to include "trust-exemptions"
3. Next step: "trust-exemptions" (Step 6)
```

### TRUST EXEMPTION OPTIONS (current)

```
Location: web/lib/rrer-types.ts:485-490

□ Trust that is a securities reporting issuer
□ Trust where the Trustee is a securities reporting issuer
□ Statutory trust (Delaware Statutory Trust, etc.)
□ Trust wholly owned by an exempt entity listed in the entity exemptions
```

### KEY FINDING: Entity Subtype Selection

**YES - Entity subtype selection EXISTS in CLIENT SUBMISSION FORM only!**

Location: `web/app/(app)/app/requests/new/page.tsx:967-991`

Entity subtypes defined in same file (lines ~850-900):
```typescript
const ENTITY_SUBTYPES = [
  { value: "securities_issuer", label: "Securities Reporting Issuer (Publicly Traded)", exempt: true },
  { value: "government", label: "Government Authority", exempt: true },
  { value: "bank", label: "Bank or Credit Union", exempt: true },
  { value: "insurance", label: "Insurance Company", exempt: true },
  { value: "public_utility", label: "Public Utility", exempt: true },
  { value: "regulated_entity", label: "Other Regulated Financial Entity", exempt: true },
  { value: "llc", label: "Limited Liability Company (LLC)", exempt: false },
  { value: "corporation", label: "Corporation", exempt: false },
  { value: "partnership", label: "Partnership", exempt: false },
  { value: "other", label: "Other Entity Type", exempt: false },
]
```

**BUT - NOT in the WIZARD!**
The wizard does NOT have entity subtype selection. It goes straight from buyer type → exemption checkboxes.

---

## BENEFICIAL OWNER COLLECTION REPORT

### UI LOCATION

```
Party Portal (for buyer entities):
- File: web/components/party-portal/BuyerEntityForm.tsx
- BO Section: Lines 60-98 (add/update/remove helpers)
- BO Card: web/components/party-portal/BeneficialOwnerCard.tsx

Wizard (for staff data entry - deprecated):
- File: web/components/rrer-questionnaire.tsx
- collectionStep === "buyer-info" shows BO collection (lines 2668+)
```

### ADD BO FUNCTION

```typescript
// BuyerEntityForm.tsx:69
const addBeneficialOwner = () => {
  update("beneficial_owners", [...beneficialOwners, createEmptyBeneficialOwner()])
}

// Creates empty BO:
// web/components/party-portal/BeneficialOwnerCard.tsx:~380
export function createEmptyBeneficialOwner(): BeneficialOwnerData {
  return {
    id: generateId(),
    first_name: "",
    middle_name: "",
    last_name: "",
    suffix: "",
    date_of_birth: "",
    address: emptyAddress,
    citizenship: "us_citizen",
    id_type: "ssn",
    id_number: "",
    id_jurisdiction: "",
    ownership_percentage: undefined,
    control_type: [],
    control_other: "",
  }
}
```

### BO ARRAY STATE

```
Variable: data.beneficial_owners (in BuyerEntityForm)
Location: web/components/party-portal/BuyerEntityForm.tsx:67
Type: BeneficialOwnerData[] (from types.ts)
```

### CURRENT BO FIELDS

```
- first_name: string (required)
- middle_name: string (optional)
- last_name: string (required)
- suffix: string (optional)
- date_of_birth: string (required)
- address: AddressData (required - residential, not PO Box)
- citizenship: "us_citizen" | "us_resident_alien" | "non_resident_alien" (required)
- id_type: "ssn" | "passport_us" | "passport_foreign" | "state_id" (required)
- id_number: string (required)
- id_jurisdiction: string (conditional - for passport/state_id)
- ownership_percentage: number (optional)
- control_type: string[] (optional - checkboxes)
- control_other: string (conditional - if "other" in control_type)
```

### EXISTING ROLE/TYPE FIELDS

```
TRUST ROLE: ❌ NOT FOUND
INDIRECT OWNERSHIP: ❌ NOT FOUND
```

### VALIDATION

```
Min BOs required: 0 (no minimum enforced in portal)
Required fields per BO: first_name, last_name (see parties.py:176-178)
Validation function: api/app/routes/parties.py:171-185 (minimal validation)
```

---

## PARTY PORTAL REPORT

```
ROUTE: /p/[token]
FILE: web/app/p/[token]/page.tsx

CURRENT STEPS (not multi-step wizard - single form):
1. Load party data (auto on mount)
2. Display form based on party_role + entity_type
3. Autosave on change
4. Final submit

DOCUMENT UPLOAD EXISTS: ✅ YES
- Component: web/components/party-portal/DocumentUpload.tsx
- Integrated in: BuyerEntityForm.tsx, BuyerTrustForm.tsx
- Storage: Cloudflare R2 (fully implemented)

SUBMISSION ENDPOINT: POST /party/{token}/submit
File: api/app/routes/parties.py:158-214

EXPECTED PAYLOAD (via PartySave):
{
  party_data: {
    // All PartySubmissionData fields
    // Stored in report_parties.party_data JSONB
  }
}
```

### RELEVANT FILES

```
- web/app/p/[token]/page.tsx (main portal page)
- web/components/party-portal/index.tsx (exports)
- web/components/party-portal/types.ts (data types)
- web/components/party-portal/DynamicPartyForm (in index.tsx)
- web/components/party-portal/BuyerEntityForm.tsx
- web/components/party-portal/BuyerTrustForm.tsx
- web/components/party-portal/SellerIndividualForm.tsx
- web/components/party-portal/SellerEntityForm.tsx
- web/components/party-portal/SellerTrustForm.tsx
- web/components/party-portal/BeneficialOwnerCard.tsx
- web/components/party-portal/TrusteeCard.tsx
- web/components/party-portal/PaymentSourceCard.tsx
- web/components/party-portal/DocumentUpload.tsx
- api/app/routes/parties.py (API endpoints)
```

---

## DOCUMENT HANDLING REPORT

```
DOCUMENT TABLE:
- Migration exists: ✅ api/alembic/versions/ (multiple migrations)
- Model exists: ✅ api/app/models/document.py

DOCUMENT MODEL FIELDS:
- id: UUID
- report_party_id: UUID (FK)
- document_type: String ["government_id", "government_id_back", "trust_agreement", "formation_docs", "operating_agreement", "articles_of_incorporation", "beneficial_owner_id", "other"]
- file_name: String
- mime_type: String
- size_bytes: Integer
- storage_key: String (R2 path)
- upload_confirmed: Boolean
- description: String
- created_at, uploaded_at, verified_at: DateTime

UPLOAD COMPONENTS:
- File input component: ❌ (uses drag-drop)
- Dropzone component: ✅ web/components/party-portal/DocumentUpload.tsx
- react-dropzone installed: ❌ (custom implementation)

STORAGE SERVICE:
- R2 configured: ✅ YES
- Storage service file: api/app/services/storage.py
- Upload endpoint: POST /documents/upload-url → generates pre-signed URL
- Confirm endpoint: POST /documents/{id}/confirm
- List endpoint: GET /documents/party/{party_id}
- Delete endpoint: DELETE /documents/{id}

EXISTING UPLOAD FUNCTIONALITY: ✅ FULLY IMPLEMENTED
```

---

## INTEGRATION POINTS REPORT

### 1. ENTITY SUBTYPE SELECTOR (IN WIZARD)

**Currently MISSING from wizard - only in client submission form**

```
File to modify: web/components/rrer-questionnaire.tsx
Insert after: Buyer type selection (line ~1337, after buyer-type step UI)
OR Create new step: "entity-details" after "buyer-type"

Add to DeterminationState (web/lib/rrer-types.ts:296):
- entitySubtype?: string
- buyerFincenId?: string  // For existing BOI filings
- buyerBoiStatus?: "filed" | "not_filed" | "exempt"
```

### 2. INDIRECT OWNERSHIP (BO form)

```
File: web/components/party-portal/BeneficialOwnerCard.tsx
Insert in: After control_type checkboxes (~line 250)

Add to BeneficialOwnerData (web/components/party-portal/types.ts:12):
- is_indirect_owner?: boolean
- indirect_entity_name?: string
- indirect_entity_type?: string
```

### 3. TRUST BO ROLES

```
File: web/components/party-portal/BeneficialOwnerCard.tsx
Insert in: At top of form, before first_name (~line 125)
Condition: Only show when parentEntityType === "trust" (need to pass prop)

Add to BeneficialOwnerData:
- trust_role?: "trustee" | "settlor" | "beneficiary" | "other"
- trust_role_other?: string
```

### 4. BOI STATUS

```
File: web/components/rrer-questionnaire.tsx
Insert after: Entity info collection in wizard
OR: Add to BuyerEntityForm.tsx in party portal

Add state fields:
- buyerBoiStatus: "filed" | "not_filed" | "exempt"
- buyerFincenId?: string (if filed)
```

### 5. DOCUMENT UPLOAD (Party Portal)

```
Status: ✅ ALREADY IMPLEMENTED
File: web/components/party-portal/DocumentUpload.tsx
Integration: Already in BuyerEntityForm.tsx and BuyerTrustForm.tsx
No changes needed - just ensure all document types are covered
```

---

## CONFLICT CHECK REPORT

### EXISTING CONFLICTING FIELDS

```
✅ NO CONFLICTS - New fields don't exist yet

entitySubtype: Only in client submission form, not in wizard
entity_subtype: Only in early_determination.py for exemption logic
```

### PARTIAL IMPLEMENTATIONS FOUND

```
1. entitySubtype in client form (web/app/(app)/app/requests/new/page.tsx)
   - Works for early determination
   - BUT not passed to wizard/report wizard_data
   
2. Document upload fully implemented
   - No action needed
```

### TYPESCRIPT INTERFACES TO UPDATE

```
- web/lib/rrer-types.ts:
  - DeterminationState (line 296) - add entitySubtype, buyerBoiStatus, buyerFincenId
  - BeneficialOwner (line 79) - add is_indirect_owner, indirect_entity_name, trust_role

- web/components/party-portal/types.ts:
  - BeneficialOwnerData (line 12) - add is_indirect_owner, indirect_entity_name, trust_role
```

### PYDANTIC MODELS TO UPDATE

```
- api/app/schemas/party.py - Add new fields to PartyResponse if needed
- api/app/routes/parties.py - Minimal changes (stores in party_data JSONB)
```

### VALIDATION CONCERNS

```
- party_data is JSONB - accepts any structure (no strict validation)
- wizard_data is JSONB - accepts any structure (no strict validation)
- Frontend TypeScript provides type safety
- Backend Pydantic schemas are permissive
```

---

## IMPLEMENTATION ROADMAP

### PRE-REQUISITES

```
□ None - all infrastructure exists
□ Document upload already implemented with R2
□ JSONB columns accept new fields without migration
```

### PHASE 1: ENTITY SUBTYPE IN WIZARD

```
Impact: 2-3 files, ~50 lines

- [ ] Update DeterminationState interface (web/lib/rrer-types.ts:296)
      Add: entitySubtype?: string
      
- [ ] Add entity subtype UI to buyer-type step OR create new step
      File: web/components/rrer-questionnaire.tsx:1292
      After buyer type radio selection, show subtype dropdown for entities
      
- [ ] Wire subtype to exemption logic
      If entitySubtype is exempt type → auto-select corresponding exemption
```

### PHASE 2: INDIRECT OWNERSHIP

```
Impact: 2 files, ~30 lines

- [ ] Update BeneficialOwnerData interface (web/components/party-portal/types.ts:12)
      Add: is_indirect_owner?: boolean, indirect_entity_name?: string
      
- [ ] Add indirect ownership checkbox to BeneficialOwnerCard
      File: web/components/party-portal/BeneficialOwnerCard.tsx:~250
      After control_type section:
      □ "This person owns through another entity (indirect ownership)"
      [Conditional: Entity name input]
```

### PHASE 3: TRUST BO ROLES

```
Impact: 2 files, ~40 lines

- [ ] Update BeneficialOwnerData interface
      Add: trust_role?: "trustee" | "settlor" | "beneficiary" | "other"
      
- [ ] Add trust role dropdown to BeneficialOwnerCard
      File: web/components/party-portal/BeneficialOwnerCard.tsx:125
      Pass parentEntityType prop, show dropdown if "trust"
      
- [ ] Update BuyerTrustForm to pass entityType to BO cards
```

### PHASE 4: BOI STATUS

```
Impact: 2-3 files, ~60 lines

- [ ] Update DeterminationState OR CollectionData
      Add: buyerBoiStatus?: "filed" | "not_filed" | "exempt"
           buyerFincenId?: string
           
- [ ] Add BOI status question in wizard (after entity info)
      "Has this entity filed a Beneficial Ownership Information Report (BOIR)?"
      □ Yes, FinCEN ID: [input]
      □ No, will file as part of this report
      □ Entity is exempt from BOI reporting
      
- [ ] Optionally add to party portal BuyerEntityForm
```

### PHASE 5: DOCUMENT UPLOAD ENHANCEMENTS

```
Status: ✅ ALREADY COMPLETE - No work needed

Document upload is fully implemented with:
- Cloudflare R2 storage
- Pre-signed URLs for direct browser upload
- Document types for individuals, entities, and trusts
- Download/delete functionality
- Audit logging
```

---

## RISK AREAS

```
1. WIZARD SIZE
   rrer-questionnaire.tsx is ~4500 lines
   Adding more UI could make it unwieldy
   Consider: Extract entity-specific steps to separate components
   
2. STATE MANAGEMENT
   useState is simple but grows complex
   Multiple nested objects (determination, collection, etc.)
   Consider: Document state shape changes clearly
   
3. EARLY DETERMINATION SYNC
   entitySubtype exists in client form for early determination
   Need to ensure wizard uses same values
   Consider: Share ENTITY_SUBTYPES constant
```

---

## QUESTIONS FOR DEVELOPER

```
1. Should entitySubtype selection be in:
   a) The existing "buyer-type" step (add dropdown after radio)
   b) A new dedicated "entity-details" step
   c) Both wizard AND party portal BuyerEntityForm

2. For BOI status, should non-exempt entities be REQUIRED to:
   a) Provide existing FinCEN ID
   b) Have BOI filed as part of this workflow
   c) Just declare status (no enforcement)

3. Should indirect ownership capture:
   a) Just entity name
   b) Entity name + type (LLC, Corp, etc.)
   c) Full entity details including EIN

4. Trust BO roles - should these map to:
   a) Existing Trustee/Settlor/Beneficiary arrays
   b) Separate BO array with role field
   c) Both (duplicate data for compliance)
```

---

## SUMMARY

| Feature | Status | Files to Change | Estimated Lines |
|---------|--------|-----------------|-----------------|
| Entity Subtype (Wizard) | 🔴 Not in wizard | rrer-questionnaire.tsx, rrer-types.ts | ~50 |
| Indirect Ownership | 🔴 Not implemented | BeneficialOwnerCard.tsx, types.ts | ~30 |
| Trust BO Roles | 🔴 Not implemented | BeneficialOwnerCard.tsx, types.ts | ~40 |
| BOI Status | 🔴 Not implemented | rrer-questionnaire.tsx, rrer-types.ts | ~60 |
| Document Upload | ✅ Complete | - | 0 |

**Total Estimated New Code: ~180 lines**

---

*Investigation completed. Ready for implementation.*
