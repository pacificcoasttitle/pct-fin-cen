# Data Flow Verification Report
## Does Initial Submission Data Flow Through the System?

> **Generated:** January 27, 2026  
> **Status:** Analysis of current data flow capabilities

---

## Executive Summary

| Data Field | Can Create | Can Display | Flows Through? |
|------------|------------|-------------|----------------|
| property_address | ✅ Yes | ✅ Yes | ✅ **Working** |
| closing_date | ✅ Yes | ✅ Yes | ✅ **Working** |
| purchase_price | ❌ No | ❌ No | ❌ **Gap** |
| buyer_name | ❌ No | ❌ No | ❌ **Gap** |
| buyer_email | ❌ No | ❌ No | ❌ **Gap** |
| buyer_type | ❌ No | ❌ No | ❌ **Gap** |
| seller_name | ❌ No | ❌ No | ❌ **Gap** |
| seller_email | ❌ No | ❌ No | ❌ **Gap** |
| seller_type | ❌ No | ❌ No | ❌ **Gap** |

---

## 1. POST /reports (api/app/routes/reports.py)

### What Fields Does the Create Endpoint Accept?

**Location:** `api/app/routes/reports.py` lines 53-87

```python
def create_report(
    report_in: ReportCreate,
    request: Request,
    db: Session = Depends(get_db),
):
    report = Report(
        property_address_text=report_in.property_address_text,
        closing_date=report_in.closing_date,
        filing_deadline=filing_deadline,  # Calculated: closing_date + 30 days
        wizard_data=report_in.wizard_data or {},
        status="draft",
        wizard_step=1,
    )
```

**Schema:** `api/app/schemas/report.py` lines 10-14

```python
class ReportCreate(BaseModel):
    property_address_text: Optional[str] = None
    closing_date: Optional[date] = None
    wizard_data: Optional[Dict[str, Any]] = Field(default_factory=dict)
```

### Analysis

| Field | Accepted? | Notes |
|-------|-----------|-------|
| `property_address_text` | ✅ Yes | Stored directly on Report model |
| `closing_date` | ✅ Yes | Stored on Report, also calculates `filing_deadline` |
| `purchase_price` | ❌ **NO** | Not in schema, not in model |
| `buyer_name` | ❌ **NO** | Not in schema |
| `buyer_email` | ❌ **NO** | Not in schema |
| `buyer_type` | ❌ **NO** | Not in schema |
| `seller_name` | ❌ **NO** | Not in schema |
| `seller_email` | ❌ **NO** | Not in schema |
| `seller_type` | ❌ **NO** | Not in schema |
| `wizard_data` | ✅ Yes | Can pass any JSON (workaround) |

### Frontend API Client

**Location:** `web/lib/api.ts` lines 253-261

```typescript
export async function createReport(data?: {
  property_address_text?: string;
  closing_date?: string;
}): Promise<Report> {
  return apiFetch<Report>('/reports', {
    method: 'POST',
    body: JSON.stringify(data || {}),
  });
}
```

**Status:** Frontend can only pass `property_address_text` and `closing_date`.

---

## 2. GET /party/{token} (api/app/routes/parties.py)

### What Data Does This Return?

**Location:** `api/app/routes/parties.py` lines 48-75

```python
@router.get("/{token}", response_model=PartyResponse)
def get_party_by_token(token: str, db: Session = Depends(get_db)):
    link = get_valid_link(token, db)
    party = link.party
    report = party.report
    
    report_summary = ReportSummary(
        property_address=report.property_address_text,        # ✅ YES
        closing_date=report.closing_date.isoformat() if report.closing_date else None,  # ✅ YES
        title_company="Pacific Coast Title Company",          # Hardcoded
    )
    
    return PartyResponse(
        party_id=party.id,
        party_role=party.party_role,                          # ✅ YES
        entity_type=party.entity_type,                        # ✅ YES
        display_name=party.display_name,                      # ✅ YES
        party_data=party.party_data or {},                    # ✅ Any saved data
        status=party.status,
        report_summary=report_summary,                        # ✅ Includes property info
        link_expires_at=link.expires_at,
        is_submitted=party.status == "submitted",
    )
```

### Analysis

| Data Field | Returned? | Source |
|------------|-----------|--------|
| `property_address` | ✅ Yes | `report.property_address_text` |
| `closing_date` | ✅ Yes | `report.closing_date` |
| `party_role` | ✅ Yes | `party.party_role` (transferee, seller, etc.) |
| `entity_type` | ✅ Yes | `party.entity_type` (individual, entity, trust) |
| `display_name` | ✅ Yes | `party.display_name` |
| `party_data` | ✅ Yes | Previously saved form data |
| `title_company` | ⚠️ Hardcoded | "Pacific Coast Title Company" |

### Verdict
✅ **Party portal receives property_address and closing_date from parent Report.**

---

## 3. Wizard Initialization (web/components/rrer-questionnaire.tsx)

### Does the Wizard Pre-fill Form Fields from Report Data?

**Location:** `web/app/(app)/app/reports/[id]/wizard/page.tsx` lines 283-290

```typescript
// Parse initial data from report
const wizardData = report?.wizard_data as Record<string, unknown> | undefined
const initialData: RRERQuestionnaireProps["initialData"] = wizardData ? {
  phase: wizardData.phase as "determination" | "collection" | "summary" | undefined,
  determinationStep: wizardData.determinationStep as string | undefined,
  collectionStep: wizardData.collectionStep as string | undefined,
  determination: wizardData.determination as Record<string, unknown> | undefined,
  collection: wizardData.collection as Record<string, unknown> | undefined,
} : undefined
```

**Questionnaire Component:** `web/components/rrer-questionnaire.tsx` lines 278-289

```typescript
export function RRERQuestionnaire({ initialData, onChange, saveStatus }: RRERQuestionnaireProps = {}) {
  const [phase, setPhase] = useState<Phase>(initialData?.phase || "determination")
  const [determinationStep, setDeterminationStep] = useState<DeterminationStepId>(
    initialData?.determinationStep || "property"
  )
  const [collectionStep, setCollectionStep] = useState<CollectionStepId>(
    initialData?.collectionStep || "transaction-property"
  )
  const [determination, setDetermination] = useState<DeterminationState>({
    ...initialDetermination,
    ...initialData?.determination,
  })
  const [collection, setCollection] = useState<Partial<CollectionData>>({
    ...initialCollection,
    ...initialData?.collection,
  })
```

### Analysis

| Data Source | Used? | Notes |
|-------------|-------|-------|
| `report.wizard_data` | ✅ Yes | Primary source for all wizard state |
| `report.property_address_text` | ❌ **NO** | Not passed to questionnaire |
| `report.closing_date` | ❌ **NO** | Not passed to questionnaire |

### Verdict
⚠️ **Wizard only reads from `wizard_data` JSONB. It does NOT pre-fill from Report's `property_address_text` or `closing_date`.**

If you want property/closing date pre-filled in the Collection phase, you would need to:
1. Either store them in `wizard_data.collection` when creating the report
2. Or modify the wizard page to pass `report.property_address_text` and `report.closing_date` to the questionnaire

---

## 4. Party Portal Landing (web/app/p/[token]/page.tsx)

### Does It Display Property Address and Party Role?

**Location:** `web/app/p/[token]/page.tsx` lines 268-293

```typescript
{/* Context Card */}
{partyData && (
  <Card className="mb-6 bg-muted/30">
    <CardContent className="pt-6">
      <div className="flex items-start gap-4">
        <div className="p-3 bg-primary/10 rounded-lg">
          <Building2 className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1">
          <p className="font-medium">
            {partyData.report_summary.property_address || "Property Address Pending"}
          </p>
          <div className="flex items-center gap-3 mt-2">
            <Badge variant="outline" className="capitalize">
              {partyData.party_role}
            </Badge>
            {partyData.report_summary.closing_date && (
              <span className="text-sm text-muted-foreground">
                <Clock className="h-3 w-3 inline mr-1" />
                Closing: {new Date(partyData.report_summary.closing_date).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
)}
```

### Analysis

| UI Element | Displayed? | Data Source |
|------------|------------|-------------|
| Property Address | ✅ Yes | `partyData.report_summary.property_address` |
| Party Role | ✅ Yes | `partyData.party_role` (badge) |
| Closing Date | ✅ Yes | `partyData.report_summary.closing_date` |
| Title Company | ❌ No | Available but not shown |

### Verdict
✅ **Party portal displays property address, party role, and closing date fetched from the API.**

---

## Summary: What Works vs What's Missing

### ✅ Working Data Flow

```
Report.property_address_text  →  GET /party/{token}  →  Party Portal UI
Report.closing_date           →  GET /party/{token}  →  Party Portal UI
Party.party_role              →  GET /party/{token}  →  Party Portal UI (badge)
Party.display_name            →  GET /party/{token}  →  Party Portal UI
```

### ❌ Missing/Gaps

```
❌ purchase_price - Not in Report model, not in API
❌ buyer_name/email/type - Not in Report model (only in SubmissionRequest)
❌ seller_name/email/type - Not in Report model (only in SubmissionRequest)
❌ Wizard doesn't pre-fill from Report.property_address_text or Report.closing_date
```

---

## Recommended Changes

### Option A: Expand ReportCreate Schema (Minimal Change)

Add fields to accept initial party info at report creation:

```python
# api/app/schemas/report.py
class ReportCreate(BaseModel):
    property_address_text: Optional[str] = None
    closing_date: Optional[date] = None
    purchase_price_cents: Optional[int] = None  # ADD
    escrow_number: Optional[str] = None         # ADD
    wizard_data: Optional[Dict[str, Any]] = Field(default_factory=dict)
    
    # Initial party info (for creating parties at report creation)
    initial_parties: Optional[List[InitialPartyInfo]] = None  # ADD

class InitialPartyInfo(BaseModel):
    party_role: str  # "transferee", "transferor", "beneficial_owner"
    entity_type: str  # "individual", "entity", "trust"
    display_name: Optional[str] = None
    email: Optional[str] = None
```

### Option B: Link Report to SubmissionRequest (Better Architecture)

Use the existing `submission_request_id` foreign key:

```python
# When creating report from submission request:
report = Report(
    submission_request_id=submission_request.id,
    property_address_text=submission_request.property_address_text,
    closing_date=submission_request.expected_closing_date,
    # ... etc
)
```

Then pull party info from SubmissionRequest when generating party links.

### Option C: Pre-fill Wizard from Report Fields

Modify wizard page to pass report fields to questionnaire:

```typescript
// web/app/(app)/app/reports/[id]/wizard/page.tsx
const initialData: RRERQuestionnaireProps["initialData"] = {
  ...wizardData,
  collection: {
    ...(wizardData?.collection || {}),
    // Pre-fill from report if not in wizard_data
    closingDate: wizardData?.collection?.closingDate || report?.closing_date,
    propertyAddress: wizardData?.collection?.propertyAddress || {
      street: report?.property_address_text || "",
      // ... parse address components
    },
  }
};
```

---

## Conclusion

**Current State:**
- ✅ Property address and closing date flow from Report → Party Portal (works!)
- ✅ Party role displays correctly in portal
- ❌ Purchase price not captured anywhere in Report
- ❌ Initial buyer/seller info not captured (only in SubmissionRequest which has no API)
- ❌ Wizard doesn't auto-fill from Report's property/closing date

**For Jan 29 Demo:**
The simplest fix is **Option A** - expand `ReportCreate` to accept `escrow_number` and optionally pre-create parties with basic info (name, email, type). This lets staff create a report with all initial data in one API call.
