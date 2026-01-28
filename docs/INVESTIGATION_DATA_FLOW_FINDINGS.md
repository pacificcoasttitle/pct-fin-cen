# Investigation: SubmissionRequest → Report Data Flow

## Executive Summary

**Finding:** Data IS being transferred from SubmissionRequest to Report, but there are **type mismatches** and **missing field mappings** that prevent the wizard from using the data.

| Status | Issue |
|--------|-------|
| ✅ WORKING | Property address carries over |
| ✅ WORKING | Purchase price transfers |
| ✅ WORKING | Closing date transfers |
| ⚠️ PARTIAL | Escrow number transfers but not used by wizard |
| ⚠️ PARTIAL | Financing type transfers but not used by wizard |
| ⚠️ PARTIAL | Party info (buyer/seller) transfers but not consumed |
| ❌ MISSING | Determination not pre-filled based on financing |

---

## Investigation 1: SubmissionRequest Model

**File:** `api/app/models/submission_request.py`

### All Fields Available

| Field | Type | Purpose |
|-------|------|---------|
| `escrow_number` | String(100) | Client's internal reference |
| `file_number` | String(100) | Alternative reference |
| `property_address` | JSONB | {street, city, state, zip, county} |
| `expected_closing_date` | Date | Transaction closing date |
| `actual_closing_date` | Date | If already closed |
| `transaction_type` | String(50) | 'purchase', 'refinance', etc. |
| `buyer_name` | String(255) | ✅ Primary buyer name |
| `buyer_type` | String(50) | ✅ 'individual', 'entity', 'trust' |
| `buyer_email` | String(255) | ✅ Contact email |
| `buyer_phone` | String(50) | Phone number |
| `seller_name` | String(255) | ✅ Primary seller name |
| `seller_email` | String(255) | ✅ Contact email |
| `purchase_price_cents` | BigInteger | ✅ Price in cents |
| `financing_type` | String(50) | ✅ 'cash', 'financed', 'partial_cash' |
| `notes` | Text | Client notes |

**Verdict:** ✅ Model has all required fields

---

## Investigation 2: Create Report Endpoint

**File:** `api/app/routes/submission_requests.py`
**Endpoint:** `POST /submission-requests/{id}/create-report`

### Current Implementation (Lines 363-395)

```python
report = Report(
    submission_request_id=submission.id,
    company_id=submission.company_id,
    property_address_text=property_address_text,
    closing_date=submission.expected_closing_date,
    filing_deadline=filing_deadline,
    escrow_number=submission.escrow_number,
    status="draft",
    wizard_step=1,
    wizard_data={
        "collection": {
            "purchasePrice": submission.purchase_price_cents / 100 if submission.purchase_price_cents else None,
            "escrowNumber": submission.escrow_number,
            "financingType": submission.financing_type,
            "closingDate": submission.expected_closing_date.isoformat() if submission.expected_closing_date else None,
            "propertyAddress": submission.property_address,
            "initialParties": {
                "buyers": [{
                    "name": submission.buyer_name,
                    "email": submission.buyer_email,
                    "type": submission.buyer_type,
                }],
                "sellers": [{
                    "name": submission.seller_name,
                    "email": submission.seller_email,
                    "type": "individual",
                }]
            }
        }
    }
)
```

### What IS Being Transferred

| Field | From | To | Status |
|-------|------|-----|--------|
| `purchase_price_cents` | SubmissionRequest | `wizard_data.collection.purchasePrice` | ✅ Transferred |
| `escrow_number` | SubmissionRequest | `wizard_data.collection.escrowNumber` | ✅ Transferred |
| `financing_type` | SubmissionRequest | `wizard_data.collection.financingType` | ✅ Transferred |
| `expected_closing_date` | SubmissionRequest | `wizard_data.collection.closingDate` | ✅ Transferred |
| `property_address` | SubmissionRequest | `wizard_data.collection.propertyAddress` | ✅ Transferred |
| `buyer_*` | SubmissionRequest | `wizard_data.collection.initialParties.buyers` | ✅ Transferred |
| `seller_*` | SubmissionRequest | `wizard_data.collection.initialParties.sellers` | ✅ Transferred |

### What's MISSING in Transfer

| Field | Issue |
|-------|-------|
| `financing_type → determination.isNonFinanced` | ❌ Not pre-filling determination |

**Verdict:** ✅ Backend IS transferring data, but missing determination pre-fill

---

## Investigation 3: Report Model

**File:** `api/app/models/report.py`

### wizard_data Structure

```python
wizard_data = Column(JSONBType, nullable=True, default=dict)
# No schema enforcement - accepts any JSON structure
```

The `wizard_data` field is flexible JSONB that stores:

```json
{
  "phase": "determination" | "collection" | "summary",
  "determinationStep": "property" | "financing" | ...,
  "collectionStep": "transaction-property" | ...,
  "determination": { ... determination answers ... },
  "collection": { ... collection form data ... }
}
```

**Verdict:** ✅ Report model is flexible enough to store any data

---

## Investigation 4: Wizard Frontend - THE ROOT CAUSE

**File:** `web/app/(app)/app/reports/[id]/wizard/page.tsx`

### How Data is Passed (Lines 285-292)

```typescript
const wizardData = report?.wizard_data as Record<string, unknown> | undefined
const initialData: RRERQuestionnaireProps["initialData"] = wizardData ? {
  phase: wizardData.phase,
  determinationStep: wizardData.determinationStep,
  collectionStep: wizardData.collectionStep,
  determination: wizardData.determination,
  collection: wizardData.collection,  // ← Collection data IS passed
} : undefined
```

### How RRERQuestionnaire Uses It (Lines 347-349)

```typescript
const [collection, setCollection] = useState<Partial<CollectionData>>({
  ...initialCollection,
  ...initialData?.collection,  // ← Initial collection IS spread
})
```

### 🔴 THE PROBLEM: Type Mismatch

**File:** `web/lib/rrer-types.ts` - `CollectionData` Interface (Lines 214-244)

```typescript
export interface CollectionData {
  // What the wizard expects:
  closingDate: string              // ✅ Matches backend
  propertyAddress: Address         // ✅ Matches backend
  county: string
  propertyType: string
  purchasePrice: number            // ✅ Matches backend
  
  // These ARE NOT in the interface but ARE sent from backend:
  // ❌ escrowNumber - NOT DEFINED
  // ❌ financingType - NOT DEFINED  
  // ❌ initialParties - NOT DEFINED
  
  sellers: SellerData[]
  buyerType: "entity" | "trust"
  buyerEntity?: BuyerEntityData
  buyerTrust?: BuyerTrustData
  signingIndividuals: SigningIndividual[]
  paymentSources: PaymentSource[]
  reportingPerson: ReportingPerson
  buyerCertification: Certification
  sellerCertification: Certification
}
```

**The backend sends these fields to `wizard_data.collection`:**
- `escrowNumber` ← **Not in CollectionData interface**
- `financingType` ← **Not in CollectionData interface**
- `initialParties` ← **Not in CollectionData interface**

These fields are ignored because TypeScript types don't include them!

---

## Investigation 5: Client Submission Form

**File:** `web/app/(app)/app/requests/new/page.tsx`

### Fields Collected

| Field | Sent As | Verified |
|-------|---------|----------|
| Escrow Number | `escrow_number` | ✅ |
| Property Address | `property_address` (JSONB) | ✅ |
| Expected Closing Date | `expected_closing_date` | ✅ |
| Purchase Price | `purchase_price_cents` | ✅ |
| Financing Type | `financing_type` | ✅ |
| Buyer Name | `buyer_name` | ✅ |
| Buyer Email | `buyer_email` | ✅ |
| Buyer Type | `buyer_type` | ✅ |
| Seller Name | `seller_name` | ✅ |
| Seller Email | `seller_email` | ✅ |
| Notes | `notes` | ✅ |

**Verdict:** ✅ Client form sends all data correctly

---

## Gap Analysis Summary

| Data Point | In SubmissionRequest | Transferred to Report | In CollectionData Type | Used by Wizard |
|------------|---------------------|----------------------|------------------------|----------------|
| Property Address | ✅ | ✅ | ✅ | ✅ |
| Purchase Price | ✅ | ✅ | ✅ | ✅ |
| Closing Date | ✅ | ✅ | ✅ | ✅ |
| Escrow Number | ✅ | ✅ | ❌ **MISSING** | ❌ |
| Financing Type | ✅ | ✅ | ❌ **MISSING** | ❌ |
| Buyer Name | ✅ | ✅ (initialParties) | ❌ **MISSING** | ❌ |
| Buyer Email | ✅ | ✅ (initialParties) | ❌ **MISSING** | ❌ |
| Buyer Type | ✅ | ✅ (initialParties) | ❌ **MISSING** | ❌ |
| Seller Name | ✅ | ✅ (initialParties) | ❌ **MISSING** | ❌ |
| Seller Email | ✅ | ✅ (initialParties) | ❌ **MISSING** | ❌ |
| Notes | ✅ | ❌ Not transferred | ❌ | ❌ |
| Pre-fill isNonFinanced | - | ❌ Not calculated | - | ❌ |

---

## Root Cause

### 1. Type Definition Gap
The `CollectionData` TypeScript interface in `web/lib/rrer-types.ts` doesn't include:
- `escrowNumber`
- `financingType`
- `initialParties`

Even though the backend sends these fields, TypeScript silently ignores them.

### 2. No Determination Pre-fill
The backend doesn't set `wizard_data.determination.isNonFinanced` based on `financing_type`.

### 3. Party Setup Disconnect
The `initialParties` data is sent but the wizard's Party Setup step doesn't read from it to pre-populate the form.

---

## Recommended Fixes

### Fix 1: Update CollectionData Type

**File:** `web/lib/rrer-types.ts`

```typescript
export interface CollectionData {
  // ADD THESE:
  escrowNumber?: string                    // From submission
  financingType?: string                   // From submission
  initialParties?: {                       // From submission
    buyers: Array<{
      name: string
      email: string
      type: string
    }>
    sellers: Array<{
      name: string
      email: string
      type: string
    }>
  }
  
  // Existing fields...
  closingDate: string
  propertyAddress: Address
  // ...
}
```

### Fix 2: Pre-fill Determination

**File:** `api/app/routes/submission_requests.py`

```python
# In create_report_from_submission endpoint
wizard_data={
    "collection": { ... },
    "determination": {
        # Pre-fill based on financing_type
        "isNonFinanced": "yes" if submission.financing_type == "cash" else 
                         "unknown" if submission.financing_type == "partial_cash" else "no",
    }
}
```

### Fix 3: Use initialParties in Party Setup

**File:** `web/components/rrer-questionnaire.tsx`

In the Party Setup step initialization:

```typescript
// Initialize party setup from initialParties if available
useEffect(() => {
  if (initialData?.collection?.initialParties) {
    setPartySetup({
      buyers: initialData.collection.initialParties.buyers.map(b => ({
        id: generateId(),
        name: b.name,
        email: b.email,
        type: b.type as "individual" | "entity" | "trust",
      })),
      sellers: initialData.collection.initialParties.sellers.map(s => ({
        id: generateId(),
        name: s.name,
        email: s.email,
        type: s.type as "individual" | "entity" | "trust",
      }))
    })
  }
}, [initialData])
```

### Fix 4: Display Escrow Number in Wizard Header

Show the escrow number prominently so staff knows which transaction they're working on.

---

## Implementation Priority

| Fix | Priority | Effort | Impact |
|-----|----------|--------|--------|
| Fix 1: Update CollectionData Type | P0 | 15 min | Required for any data to flow |
| Fix 2: Pre-fill Determination | P1 | 30 min | Saves staff from re-answering questions |
| Fix 3: Use initialParties | P1 | 1 hour | Saves manual party entry |
| Fix 4: Display Escrow Number | P2 | 15 min | Better UX for staff |

---

## Verification Steps

After implementing fixes:

1. Submit a new request with all fields filled
2. Staff clicks "Start Wizard"
3. Verify in wizard:
   - [ ] Purchase price is pre-filled
   - [ ] Closing date is pre-filled
   - [ ] Property address is pre-filled
   - [ ] Escrow number is visible
   - [ ] Determination has isNonFinanced pre-filled (for cash transactions)
   - [ ] Party Setup shows buyer/seller names from submission

---

*Investigation completed: January 28, 2026*
