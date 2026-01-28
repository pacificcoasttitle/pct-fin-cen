# CURSOR PROMPT: Fix SubmissionRequest → Wizard Data Flow

## 🦈 SHARK: Data Not Flowing from Client Submission to Wizard

**Root Cause Identified:** TypeScript interface `CollectionData` doesn't include fields the backend sends, so they're silently ignored.

**Impact:** Staff re-enters data that clients already provided, wasting time and risking errors.

---

## THE COMPLETE FIX (4 Parts + Anticipated Baby Sharks)

### Fix Overview

| Part | What | Why |
|------|------|-----|
| 1 | Update TypeScript types | Allow data to flow through |
| 2 | Pre-fill determination | Skip answered questions |
| 3 | Use initialParties in wizard | Pre-populate party setup |
| 4 | Display escrow number | Staff knows which transaction |
| 5 | Baby Sharks | Anticipated follow-up issues |

---

## PART 1: Update TypeScript Types

**File:** `web/lib/rrer-types.ts`

Find the `CollectionData` interface and ADD these fields:

```typescript
export interface CollectionData {
  // ==========================================================================
  // NEW: Fields from SubmissionRequest (pre-filled when wizard starts)
  // ==========================================================================
  
  /** Escrow/file number from client submission */
  escrowNumber?: string;
  
  /** Financing type from client submission: 'cash' | 'financed' | 'partial_cash' */
  financingType?: "cash" | "financed" | "partial_cash";
  
  /** Initial party info from client submission - used to pre-populate party setup */
  initialParties?: {
    buyers: Array<{
      name: string;
      email: string;
      type: "individual" | "entity" | "trust";
      phone?: string;
    }>;
    sellers: Array<{
      name: string;
      email: string;
      type: "individual" | "entity" | "trust";
      phone?: string;
    }>;
  };
  
  /** Notes from client submission */
  clientNotes?: string;

  // ==========================================================================
  // EXISTING fields (keep all of these)
  // ==========================================================================
  
  closingDate: string;
  propertyAddress: Address;
  county?: string;
  propertyType?: string;
  purchasePrice?: number;
  
  // ... rest of existing fields ...
  sellers?: SellerData[];
  buyerType?: "entity" | "trust";
  buyerEntity?: BuyerEntityData;
  buyerTrust?: BuyerTrustData;
  signingIndividuals?: SigningIndividual[];
  paymentSources?: PaymentSource[];
  reportingPerson?: ReportingPerson;
  buyerCertification?: Certification;
  sellerCertification?: Certification;
}
```

**Also add to `DeterminationData` interface if not present:**

```typescript
export interface DeterminationData {
  // Pre-filled from financing_type
  isNonFinanced?: "yes" | "no" | "unknown";
  
  // ... existing fields ...
  propertyType?: string;
  isResidential?: "yes" | "no";
  purchaserType?: string;
  // etc.
}
```

---

## PART 2: Pre-fill Determination from Financing Type

**File:** `api/app/routes/submission_requests.py`

Find the `create_report_from_submission` endpoint and update the `wizard_data`:

```python
@router.post("/{submission_id}/create-report")
async def create_report_from_submission(
    submission_id: str,
    db: Session = Depends(get_db),
):
    """Create a Report from a SubmissionRequest and start the wizard."""
    
    submission = db.query(SubmissionRequest).filter(
        SubmissionRequest.id == submission_id
    ).first()
    
    if not submission:
        raise HTTPException(status_code=404, detail="Submission request not found")
    
    # ... existing validation ...

    # ==========================================================================
    # UPDATED: Pre-fill wizard_data with ALL submission data
    # ==========================================================================
    
    # Determine isNonFinanced based on financing_type
    is_non_financed = None
    if submission.financing_type == "cash":
        is_non_financed = "yes"
    elif submission.financing_type == "financed":
        is_non_financed = "no"
    elif submission.financing_type == "partial_cash":
        is_non_financed = "unknown"  # Staff needs to determine
    
    # Build initial parties array
    initial_buyers = []
    if submission.buyer_name:
        initial_buyers.append({
            "name": submission.buyer_name,
            "email": submission.buyer_email,
            "type": submission.buyer_type or "individual",
            "phone": submission.buyer_phone,
        })
    
    initial_sellers = []
    if submission.seller_name:
        initial_sellers.append({
            "name": submission.seller_name,
            "email": submission.seller_email,
            "type": "individual",  # Default, wizard can change
        })
    
    # Build comprehensive wizard_data
    wizard_data = {
        # Current phase/step tracking
        "phase": "determination",
        "determinationStep": "property",
        
        # Pre-fill determination answers where we can
        "determination": {
            "isNonFinanced": is_non_financed,
            # Don't pre-fill others - let staff verify
        },
        
        # Pre-fill collection data from submission
        "collection": {
            # Transaction basics
            "purchasePrice": submission.purchase_price_cents / 100 if submission.purchase_price_cents else None,
            "escrowNumber": submission.escrow_number,
            "closingDate": submission.expected_closing_date.isoformat() if submission.expected_closing_date else None,
            "financingType": submission.financing_type,
            
            # Property info
            "propertyAddress": submission.property_address,
            
            # Party info for pre-population
            "initialParties": {
                "buyers": initial_buyers,
                "sellers": initial_sellers,
            },
            
            # Notes from client
            "clientNotes": submission.notes,
        },
    }
    
    report = Report(
        id=str(uuid4()),
        submission_request_id=submission.id,
        company_id=submission.company_id,
        property_address_text=property_address_text,
        closing_date=submission.expected_closing_date,
        filing_deadline=filing_deadline,
        escrow_number=submission.escrow_number,
        status="draft",
        wizard_step=1,
        wizard_data=wizard_data,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    
    # ... rest of endpoint ...
```

---

## PART 3: Use initialParties in Party Setup Step

**File:** `web/components/rrer-questionnaire.tsx`

Find where the Party Setup step initializes its state and add logic to pre-populate from `initialParties`:

### 3A: Add helper to convert initialParties to PartySetup format

```typescript
// Near the top of the component or in a utils section

interface InitialParty {
  name: string;
  email: string;
  type: "individual" | "entity" | "trust";
  phone?: string;
}

function convertInitialPartiesToSetup(
  initialParties: CollectionData["initialParties"]
): { buyers: PartySetupItem[]; sellers: PartySetupItem[] } | null {
  if (!initialParties) return null;
  
  const generateId = () => `party-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  return {
    buyers: initialParties.buyers.map((b) => ({
      id: generateId(),
      name: b.name || "",
      email: b.email || "",
      type: b.type || "individual",
      phone: b.phone || "",
      status: "pending" as const,
    })),
    sellers: initialParties.sellers.map((s) => ({
      id: generateId(),
      name: s.name || "",
      email: s.email || "",
      type: s.type || "individual",
      phone: s.phone || "",
      status: "pending" as const,
    })),
  };
}
```

### 3B: Initialize party setup with data from submission

Find where `partySetup` state is initialized (likely a `useState` call):

```typescript
// BEFORE (probably something like):
const [partySetup, setPartySetup] = useState<PartySetupData>({
  buyers: [],
  sellers: [],
});

// AFTER:
const [partySetup, setPartySetup] = useState<PartySetupData>(() => {
  // Try to initialize from submission data
  const fromSubmission = convertInitialPartiesToSetup(
    initialData?.collection?.initialParties
  );
  
  if (fromSubmission && (fromSubmission.buyers.length > 0 || fromSubmission.sellers.length > 0)) {
    return fromSubmission;
  }
  
  // Default empty state
  return {
    buyers: [],
    sellers: [],
  };
});
```

### 3C: Show indicator that data came from submission

In the Party Setup UI, show a subtle indicator:

```tsx
{/* In Party Setup step JSX */}
{initialData?.collection?.initialParties && (
  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
    <InfoIcon className="h-4 w-4 text-blue-600" />
    <span className="text-sm text-blue-700">
      Party information pre-filled from client submission. Please verify and update as needed.
    </span>
  </div>
)}
```

---

## PART 4: Display Escrow Number in Wizard Header

**File:** `web/app/(app)/app/reports/[id]/wizard/page.tsx`

Or wherever the wizard header is rendered. Add escrow number display:

```tsx
{/* In the wizard header section */}
<div className="flex items-center justify-between mb-6">
  <div>
    <h1 className="text-2xl font-bold">FinCEN Report Wizard</h1>
    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
      <span>{report?.property_address_text}</span>
      {report?.escrow_number && (
        <>
          <span>•</span>
          <span className="font-mono bg-slate-100 px-2 py-0.5 rounded">
            {report.escrow_number}
          </span>
        </>
      )}
    </div>
  </div>
  {/* ... existing header content ... */}
</div>
```

**Also show in the wizard sidebar/progress indicator if there is one.**

---

## PART 5: BABY SHARKS (Anticipated Follow-up Issues)

### Baby Shark 5A: Determination Questions May Already Be Answered

**Issue:** If `isNonFinanced` is pre-filled as "yes", the wizard should skip or auto-advance past that question.

**File:** `web/components/rrer-questionnaire.tsx`

```typescript
// In determination flow logic
useEffect(() => {
  // If isNonFinanced was pre-filled from submission, consider it answered
  if (initialData?.determination?.isNonFinanced && determinationStep === "financing") {
    // Option 1: Auto-advance to next step
    // setDeterminationStep("purchaser");
    
    // Option 2: Show as pre-filled but let staff confirm
    // (Recommended - staff should verify)
  }
}, [initialData]);
```

**Recommendation:** Show the pre-filled answer but let staff confirm. Add visual indicator:

```tsx
{determination.isNonFinanced && initialData?.determination?.isNonFinanced && (
  <p className="text-sm text-blue-600 mt-2">
    Pre-filled based on client's indication of "{collection.financingType}" financing
  </p>
)}
```

### Baby Shark 5B: Party Type Mismatch

**Issue:** If client says buyer is "entity" but wizard expects specific entity data format.

**File:** `web/components/rrer-questionnaire.tsx`

The `initialParties` gives us the type, but the wizard has separate `buyerEntity` and `buyerTrust` objects. Need to bridge this:

```typescript
// When initializing buyer data
useEffect(() => {
  if (initialData?.collection?.initialParties?.buyers?.[0]) {
    const buyer = initialData.collection.initialParties.buyers[0];
    
    // Set the buyer type in collection
    if (buyer.type === "entity") {
      setCollection(prev => ({
        ...prev,
        buyerType: "entity",
        buyerEntity: {
          // Pre-fill what we know
          contactEmail: buyer.email,
          // entityName will need to be entered
        }
      }));
    } else if (buyer.type === "trust") {
      setCollection(prev => ({
        ...prev,
        buyerType: "trust",
        buyerTrust: {
          // Pre-fill what we know
        }
      }));
    }
  }
}, [initialData]);
```

### Baby Shark 5C: Multiple Buyers/Sellers

**Issue:** Client submission only captures ONE buyer and ONE seller, but transactions often have multiple.

**Current Reality:** The submission form collects single buyer/seller. This is a limitation.

**Short-term Fix:** Show the single buyer/seller as starting point, staff can add more.

**Long-term Enhancement:** Update client submission form to allow multiple buyers/sellers.

For now, the Party Setup step should make it easy to add additional parties:

```tsx
{/* After pre-filled parties */}
<Button variant="outline" onClick={addBuyer}>
  <Plus className="h-4 w-4 mr-2" />
  Add Another Buyer
</Button>
```

### Baby Shark 5D: Stale Data if Submission Updated

**Issue:** If client updates their submission after wizard started, wizard has old data.

**Solution:** Show warning if submission was updated after report was created:

```typescript
// In wizard page
const submissionUpdatedAfterReport = 
  submission?.updated_at && 
  report?.created_at && 
  new Date(submission.updated_at) > new Date(report.created_at);

{submissionUpdatedAfterReport && (
  <Alert variant="warning">
    <AlertTriangle className="h-4 w-4" />
    <AlertDescription>
      The original submission was updated after this report was created. 
      Some information may be outdated.
      <Button variant="link" onClick={refreshFromSubmission}>
        Refresh data
      </Button>
    </AlertDescription>
  </Alert>
)}
```

### Baby Shark 5E: Client Notes Not Visible

**Issue:** Client may have added important notes that staff doesn't see.

**File:** Wizard header or sidebar

```tsx
{collection.clientNotes && (
  <Card className="mb-4 border-amber-200 bg-amber-50">
    <CardHeader className="pb-2">
      <CardTitle className="text-sm flex items-center gap-2">
        <MessageSquare className="h-4 w-4" />
        Client Notes
      </CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-sm">{collection.clientNotes}</p>
    </CardContent>
  </Card>
)}
```

### Baby Shark 5F: Purchase Price Display

**Issue:** Purchase price may not be displaying correctly in wizard (formatting, cents vs dollars).

**Verify:** Check that the wizard displays `$1,500,000.00` not `150000000` cents.

```typescript
// Ensure price is displayed correctly
const formatPrice = (cents: number | undefined) => {
  if (!cents) return "";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents); // Note: backend now sends dollars, not cents
};
```

---

## VERIFICATION CHECKLIST

### After Implementation, Test:

**Submission → Wizard Data Flow:**
- [ ] Submit new request with ALL fields filled
- [ ] Staff clicks "Start Wizard"
- [ ] Open browser dev tools, check `report.wizard_data` in API response

**Wizard Pre-population:**
- [ ] Property address shows ✅
- [ ] Purchase price shows (formatted as currency)
- [ ] Closing date shows
- [ ] Escrow number visible in header
- [ ] Financing type stored (check determination)

**Determination Pre-fill:**
- [ ] If financing_type="cash" → isNonFinanced="yes"
- [ ] If financing_type="financed" → isNonFinanced="no"
- [ ] If financing_type="partial_cash" → isNonFinanced="unknown"
- [ ] Staff can still change the answer

**Party Setup Pre-population:**
- [ ] Buyer name appears in party list
- [ ] Buyer email appears
- [ ] Buyer type (individual/entity/trust) is set
- [ ] Seller name appears
- [ ] Seller email appears
- [ ] "Pre-filled from submission" indicator shows
- [ ] Can add additional buyers/sellers

**Edge Cases:**
- [ ] Submission with missing fields doesn't break wizard
- [ ] Empty buyer/seller doesn't create blank party
- [ ] Notes display if present, hidden if empty

---

## UPDATE KILLEDSHARKS.MD

```markdown
---

### 23. SubmissionRequest → Wizard Data Flow ✅

**Problem:** When staff started a wizard from a submission request, most data was lost:
- ❌ Financing type not transferred
- ❌ Buyer/seller names not populated
- ❌ Escrow number not visible
- ❌ Determination not pre-filled

**Root Cause:** TypeScript `CollectionData` interface didn't include fields the backend was sending, so they were silently ignored.

**Solution:**

**1. Updated TypeScript Types** (`web/lib/rrer-types.ts`)
Added to CollectionData:
- `escrowNumber?: string`
- `financingType?: "cash" | "financed" | "partial_cash"`
- `initialParties?: { buyers: [...], sellers: [...] }`
- `clientNotes?: string`

**2. Pre-fill Determination** (`api/app/routes/submission_requests.py`)
- `financing_type = "cash"` → `isNonFinanced = "yes"`
- `financing_type = "financed"` → `isNonFinanced = "no"`
- `financing_type = "partial_cash"` → `isNonFinanced = "unknown"`

**3. Party Setup Pre-population** (`web/components/rrer-questionnaire.tsx`)
- Converts `initialParties` to party setup format
- Shows "pre-filled from submission" indicator
- Allows staff to add more parties

**4. Escrow Number Display**
- Shows in wizard header
- Shows in progress sidebar

**5. Client Notes Display**
- Shows in amber card if present
- Staff can see client's context

**Anticipated Baby Sharks Handled:**
- ✅ Pre-filled answers show source indicator
- ✅ Party type bridging (individual/entity/trust)
- ✅ Multiple parties (add more button)
- ✅ Stale data warning
- ✅ Price formatting (dollars vs cents)

**Files Changed:**
- `web/lib/rrer-types.ts` (add interface fields)
- `api/app/routes/submission_requests.py` (pre-fill wizard_data)
- `web/components/rrer-questionnaire.tsx` (use initialParties)
- `web/app/(app)/app/reports/[id]/wizard/page.tsx` (display escrow, notes)

**Status:** ✅ Killed

---
```

---

## SUMMARY

| Fix | Priority | Impact |
|-----|----------|--------|
| Update TypeScript types | P0 - CRITICAL | Unblocks all data flow |
| Pre-fill determination | P1 | Saves 2-3 wizard steps for cash deals |
| Pre-populate parties | P1 | Saves manual entry, reduces errors |
| Show escrow number | P2 | Better UX for staff |
| Show client notes | P2 | Context for staff |
| Baby shark handling | P2 | Smooth edge cases |

**This is a workflow-critical fix. The submission form is a key asset - make sure its data flows through!** 🦈
