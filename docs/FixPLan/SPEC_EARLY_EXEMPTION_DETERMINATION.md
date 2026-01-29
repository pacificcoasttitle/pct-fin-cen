# SPEC: Early Exemption Determination at Client Submission

## Overview

Enable the client submission form to immediately determine if a transaction requires FinCEN reporting. If exempt, end the process there with a printable confirmation certificate. If reportable, continue to staff workflow.

---

## Business Value

| Before | After |
|--------|-------|
| All submissions go to staff queue | Only reportable transactions need staff attention |
| Clients wait for determination | Clients get instant answer |
| Staff reviews obvious exemptions | Staff focuses on actual reports |
| No paper trail for exemptions | Printable certificate for compliance files |

---

## Exemption Scenarios (from FinCEN Rules)

A transaction is **EXEMPT** from reporting if ANY of these are true:

### Buyer-Side Exemptions
1. **Financing involved** - Transaction has mortgage/loan (not all-cash)
2. **Buyer is an individual** - Only entities and trusts trigger reporting
3. **Buyer is exempt entity type:**
   - Public company (SEC reporting)
   - Registered broker/dealer
   - Bank or credit union
   - Government entity
   - 501(c) nonprofit
   - Insurance company
   - Registered investment company
   - Pooled investment vehicle

### Property-Side Exemptions
4. **Commercial property** - Only residential triggers reporting
5. **Property value below threshold** - Under $300,000 (check current rules)

### Transaction-Side Exemptions
6. **Not a "transfer"** - Refinance, inheritance (some cases), etc.

---

## Data Model Changes

### Add to SubmissionRequest model:

```python
# api/app/models/submission_request.py

class SubmissionRequest(Base):
    # ... existing fields ...
    
    # NEW: Early determination fields
    determination_result = Column(String(50))  
    # "exempt", "reportable", "needs_review", None (not yet determined)
    
    exemption_reasons = Column(JSONB)  
    # ["financing_involved", "buyer_is_individual", "exempt_entity_type", etc.]
    
    determination_timestamp = Column(DateTime)
    determination_method = Column(String(50))  
    # "auto_client_form", "staff_manual", "ai_assisted"
    
    # For exempt transactions
    exemption_certificate_id = Column(String(100))  # Unique cert number
    exemption_certificate_generated_at = Column(DateTime)
```

### New Status Values

```python
# Update status enum to include:
STATUSES = [
    "pending",           # Just submitted, not determined
    "exempt",            # Determined exempt - DONE
    "reportable",        # Needs staff workflow
    "in_progress",       # Staff working on it
    "awaiting_parties",  # Party links sent
    "ready",             # Ready to file
    "filed",             # Filed with FinCEN
]
```

---

## Client Submission Form Changes

### Current Questions (Keep These):
- Property address
- Purchase price
- Buyer name
- Buyer type (individual/entity/trust)
- Is financing involved?

### Add/Enhance These Questions:

```typescript
// Key determination questions

// Q1: Financing
{
  id: "financing_type",
  question: "How is this transaction being financed?",
  options: [
    { value: "cash", label: "All Cash (no mortgage or loan)" },
    { value: "conventional", label: "Conventional Mortgage" },
    { value: "fha_va", label: "FHA/VA Loan" },
    { value: "seller_financing", label: "Seller Financing" },
    { value: "other_financing", label: "Other Financing" },
  ],
  // If NOT "cash" → EXEMPT (financing involved)
}

// Q2: Buyer Type
{
  id: "buyer_type", 
  question: "Who is the buyer?",
  options: [
    { value: "individual", label: "Individual Person(s)" },
    { value: "entity", label: "Business Entity (LLC, Corp, Partnership)" },
    { value: "trust", label: "Trust" },
  ],
  // If "individual" → EXEMPT
}

// Q3: Entity Type (if buyer_type is entity)
{
  id: "entity_subtype",
  question: "What type of entity is the buyer?",
  options: [
    { value: "llc", label: "LLC" },
    { value: "corporation", label: "Corporation" },
    { value: "partnership", label: "Partnership" },
    { value: "public_company", label: "Publicly Traded Company (SEC Reporting)" },
    { value: "bank", label: "Bank or Credit Union" },
    { value: "broker_dealer", label: "Registered Broker/Dealer" },
    { value: "insurance", label: "Insurance Company" },
    { value: "government", label: "Government Entity" },
    { value: "nonprofit", label: "501(c) Nonprofit Organization" },
    { value: "investment_company", label: "Registered Investment Company" },
  ],
  // If any exempt type → EXEMPT
}

// Q4: Property Type
{
  id: "property_type",
  question: "What type of property is being purchased?",
  options: [
    { value: "single_family", label: "Single Family Residence" },
    { value: "condo", label: "Condominium" },
    { value: "townhouse", label: "Townhouse" },
    { value: "multi_family", label: "Multi-Family (2-4 units)" },
    { value: "commercial", label: "Commercial Property" },
    { value: "land", label: "Vacant Land" },
    { value: "mixed_use", label: "Mixed Use" },
  ],
  // If "commercial" or "land" → EXEMPT
}
```

---

## Determination Logic

### API Endpoint

```python
# api/app/services/early_determination.py

from typing import Tuple, List
from datetime import datetime
import uuid

EXEMPT_ENTITY_TYPES = [
    "public_company",
    "bank", 
    "broker_dealer",
    "insurance",
    "government",
    "nonprofit",
    "investment_company",
]

EXEMPT_PROPERTY_TYPES = [
    "commercial",
    "land",
]

def determine_reporting_requirement(data: dict) -> Tuple[str, List[str]]:
    """
    Determine if transaction requires FinCEN reporting.
    
    Returns:
        (result, reasons) where:
        - result: "exempt" | "reportable" | "needs_review"
        - reasons: list of exemption reason codes
    """
    reasons = []
    
    # Check 1: Financing
    financing_type = data.get("financing_type")
    if financing_type and financing_type != "cash":
        reasons.append("financing_involved")
    
    # Check 2: Buyer type
    buyer_type = data.get("buyer_type")
    if buyer_type == "individual":
        reasons.append("buyer_is_individual")
    
    # Check 3: Entity subtype
    entity_subtype = data.get("entity_subtype")
    if entity_subtype in EXEMPT_ENTITY_TYPES:
        reasons.append(f"exempt_entity_{entity_subtype}")
    
    # Check 4: Property type
    property_type = data.get("property_type")
    if property_type in EXEMPT_PROPERTY_TYPES:
        reasons.append(f"exempt_property_{property_type}")
    
    # Determine result
    if reasons:
        return ("exempt", reasons)
    
    # Could add "needs_review" for edge cases
    # For now, if no exemptions found, it's reportable
    return ("reportable", [])


def generate_exemption_certificate_id() -> str:
    """Generate unique certificate ID."""
    timestamp = datetime.utcnow().strftime("%Y%m%d")
    unique = uuid.uuid4().hex[:8].upper()
    return f"EXM-{timestamp}-{unique}"
```

### Update Submission Endpoint

```python
# api/app/routes/submissions.py

@router.post("/submissions")
async def create_submission(
    request: SubmissionCreateRequest,
    db: Session = Depends(get_db)
):
    # Create submission as before
    submission = SubmissionRequest(**request.dict())
    
    # NEW: Run early determination
    result, reasons = determine_reporting_requirement(request.dict())
    
    submission.determination_result = result
    submission.exemption_reasons = reasons
    submission.determination_timestamp = datetime.utcnow()
    submission.determination_method = "auto_client_form"
    
    if result == "exempt":
        submission.status = "exempt"
        submission.exemption_certificate_id = generate_exemption_certificate_id()
        submission.exemption_certificate_generated_at = datetime.utcnow()
    else:
        submission.status = "reportable"  # Goes to staff queue
    
    db.add(submission)
    db.commit()
    
    return SubmissionResponse(
        id=str(submission.id),
        status=submission.status,
        determination_result=result,
        exemption_reasons=reasons,
        exemption_certificate_id=submission.exemption_certificate_id,
        # ... other fields
    )
```

---

## Frontend: Submission Result Screen

### If EXEMPT - Show Certificate

```typescript
// web/app/submit/[id]/result/page.tsx

function ExemptionResult({ submission }) {
  return (
    <div className="max-w-2xl mx-auto p-8">
      {/* Success Header */}
      <div className="text-center mb-8">
        <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="h-10 w-10 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-green-800">
          No FinCEN Report Required
        </h1>
        <p className="text-muted-foreground mt-2">
          Based on the information provided, this transaction is exempt from 
          FinCEN Real Estate Reporting requirements.
        </p>
      </div>

      {/* Exemption Reasons */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Exemption Reason(s)</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {submission.exemption_reasons.map(reason => (
              <li key={reason} className="flex items-center gap-2">
                <Badge variant="secondary">
                  {formatExemptionReason(reason)}
                </Badge>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Certificate Preview */}
      <Card className="mb-6 border-2 border-dashed">
        <CardContent className="p-6">
          <ExemptionCertificate submission={submission} />
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-4 justify-center">
        <Button onClick={() => printCertificate(submission)}>
          <Printer className="h-4 w-4 mr-2" />
          Print Certificate
        </Button>
        <Button variant="outline" onClick={() => downloadPDF(submission)}>
          <Download className="h-4 w-4 mr-2" />
          Download PDF
        </Button>
      </div>

      {/* Footer Note */}
      <p className="text-xs text-muted-foreground text-center mt-8">
        This determination is based on information provided as of {formatDate(submission.determination_timestamp)}.
        If transaction details change, please submit a new request.
        Certificate ID: {submission.exemption_certificate_id}
      </p>
    </div>
  );
}
```

### Exemption Certificate Component

```typescript
// web/components/ExemptionCertificate.tsx

function ExemptionCertificate({ submission }) {
  return (
    <div className="certificate bg-white p-8 border rounded-lg" id="certificate">
      {/* Header */}
      <div className="text-center border-b pb-4 mb-6">
        <h1 className="text-xl font-bold">FinCEN Reporting Exemption Certificate</h1>
        <p className="text-sm text-muted-foreground">
          Real Estate Report (RRER) - 31 CFR 1031
        </p>
      </div>

      {/* Certificate ID */}
      <div className="text-center mb-6">
        <p className="text-sm text-muted-foreground">Certificate Number</p>
        <p className="text-2xl font-mono font-bold">{submission.exemption_certificate_id}</p>
      </div>

      {/* Transaction Details */}
      <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
        <div>
          <p className="text-muted-foreground">Property Address</p>
          <p className="font-medium">{submission.property_address}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Purchase Price</p>
          <p className="font-medium">{formatCurrency(submission.purchase_price)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Buyer</p>
          <p className="font-medium">{submission.buyer_name}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Escrow Number</p>
          <p className="font-medium">{submission.escrow_number}</p>
        </div>
      </div>

      {/* Exemption Statement */}
      <div className="bg-green-50 border border-green-200 rounded p-4 mb-6">
        <h3 className="font-semibold text-green-800 mb-2">Exemption Determination</h3>
        <p className="text-sm text-green-700">
          Based on the information provided, this transaction is <strong>exempt</strong> from 
          FinCEN Real Estate Report filing requirements under 31 CFR 1031.
        </p>
        <div className="mt-3">
          <p className="text-xs text-green-600 font-medium">Applicable Exemption(s):</p>
          <ul className="text-sm text-green-700 mt-1">
            {submission.exemption_reasons.map(reason => (
              <li key={reason}>• {formatExemptionReasonLong(reason)}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-muted-foreground border-t pt-4">
        <p>Determined: {formatDateTime(submission.determination_timestamp)}</p>
        <p>Method: Automated Client Submission Form</p>
        <p className="mt-2">
          This certificate should be retained with transaction records for a minimum of 5 years.
        </p>
        <p className="mt-4 font-medium">
          PCT FinCEN Solutions • fincenclear.com
        </p>
      </div>
    </div>
  );
}

// Helper to format exemption reasons for display
function formatExemptionReasonLong(reason: string): string {
  const map = {
    "financing_involved": "Transaction involves financing (mortgage, loan, or seller financing)",
    "buyer_is_individual": "Buyer is an individual person, not an entity or trust",
    "exempt_entity_public_company": "Buyer is a publicly traded company (SEC reporting)",
    "exempt_entity_bank": "Buyer is a bank or credit union",
    "exempt_entity_broker_dealer": "Buyer is a registered broker/dealer",
    "exempt_entity_insurance": "Buyer is an insurance company",
    "exempt_entity_government": "Buyer is a government entity",
    "exempt_entity_nonprofit": "Buyer is a 501(c) nonprofit organization",
    "exempt_entity_investment_company": "Buyer is a registered investment company",
    "exempt_property_commercial": "Property is commercial (not residential)",
    "exempt_property_land": "Property is vacant land",
  };
  return map[reason] || reason;
}
```

---

## PDF Generation for Certificate

```typescript
// Use html2pdf or similar library

import html2pdf from 'html2pdf.js';

async function downloadPDF(submission) {
  const element = document.getElementById('certificate');
  
  const opt = {
    margin: 0.5,
    filename: `Exemption-Certificate-${submission.exemption_certificate_id}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
  };
  
  html2pdf().set(opt).from(element).save();
}

function printCertificate(submission) {
  window.print();
}
```

---

## Dashboard Updates

### Client Dashboard - Show Exempt Transactions

```typescript
// Show exempt transactions in a separate section or with different styling

<Tabs defaultValue="active">
  <TabsList>
    <TabsTrigger value="active">Active ({activeCount})</TabsTrigger>
    <TabsTrigger value="exempt">Exempt ({exemptCount})</TabsTrigger>
    <TabsTrigger value="filed">Filed ({filedCount})</TabsTrigger>
  </TabsList>
  
  <TabsContent value="exempt">
    {exemptSubmissions.map(sub => (
      <ExemptSubmissionCard 
        key={sub.id} 
        submission={sub}
        onViewCertificate={() => openCertificate(sub)}
      />
    ))}
  </TabsContent>
</Tabs>
```

### Admin Dashboard - Exemption Stats

```typescript
// Add exemption metrics to admin overview

<StatCard
  title="Exempt Transactions"
  value={stats.exempt_count}
  description="This month"
  icon={<ShieldCheck />}
/>

<StatCard
  title="Exemption Rate"
  value={`${stats.exemption_rate}%`}
  description="Of all submissions"
  icon={<PieChart />}
/>
```

---

## API Response Update

```python
class SubmissionResponse(BaseModel):
    id: str
    status: str
    
    # Determination fields
    determination_result: Optional[str]  # "exempt", "reportable", "needs_review"
    exemption_reasons: Optional[List[str]]
    determination_timestamp: Optional[datetime]
    
    # Certificate (only if exempt)
    exemption_certificate_id: Optional[str]
    
    # ... other existing fields
```

---

## Migration

```python
# alembic/versions/xxxx_add_early_determination.py

def upgrade():
    # Add columns to submission_requests
    op.add_column('submission_requests', 
        sa.Column('determination_result', sa.String(50)))
    op.add_column('submission_requests', 
        sa.Column('exemption_reasons', JSONB))
    op.add_column('submission_requests', 
        sa.Column('determination_timestamp', sa.DateTime))
    op.add_column('submission_requests', 
        sa.Column('determination_method', sa.String(50)))
    op.add_column('submission_requests', 
        sa.Column('exemption_certificate_id', sa.String(100)))
    op.add_column('submission_requests', 
        sa.Column('exemption_certificate_generated_at', sa.DateTime))
    
    # Add index for certificate lookup
    op.create_index('ix_submission_requests_exemption_certificate_id', 
        'submission_requests', ['exemption_certificate_id'])

def downgrade():
    op.drop_index('ix_submission_requests_exemption_certificate_id')
    op.drop_column('submission_requests', 'exemption_certificate_generated_at')
    op.drop_column('submission_requests', 'exemption_certificate_id')
    op.drop_column('submission_requests', 'determination_method')
    op.drop_column('submission_requests', 'determination_timestamp')
    op.drop_column('submission_requests', 'exemption_reasons')
    op.drop_column('submission_requests', 'determination_result')
```

---

## 🔴 CRITICAL: Full Traceability Across All Roles

**Principle: Every determination is visible and traceable up the entire chain.**

### Visibility Matrix - Exemption Data

| Data Point | Client Portal | Client Dashboard | Staff Queue | Staff Detail | Admin List | Admin Detail | Executive Reports |
|------------|---------------|------------------|-------------|--------------|------------|--------------|-------------------|
| Determination Result | ✅ View | ✅ View | ✅ Filter | ✅ View | ✅ Filter | ✅ View | ✅ Aggregate |
| Exemption Reasons | ✅ View | ✅ View | ✅ View | ✅ View | ✅ View | ✅ View | ❌ |
| Certificate ID | ✅ View | ✅ View | ❌ N/A | ❌ N/A | ✅ Search | ✅ View | ❌ |
| Determination Timestamp | ✅ View | ✅ View | ✅ View | ✅ View | ✅ Sort | ✅ View | ✅ Aggregate |
| Determination Method | ❌ | ❌ | ✅ View | ✅ View | ✅ Filter | ✅ View | ✅ Aggregate |
| Form Answers (raw) | ❌ | ❌ | ❌ | ✅ View | ❌ | ✅ View | ❌ |
| Audit Trail | ❌ | ❌ | ❌ | ✅ View | ❌ | ✅ Full | ✅ Summary |

### Audit Log Events (REQUIRED)

Every determination MUST create audit log entries:

```python
# api/app/services/audit.py

class AuditEventType(str, Enum):
    # Submission events
    SUBMISSION_CREATED = "submission_created"
    SUBMISSION_UPDATED = "submission_updated"
    
    # Determination events
    DETERMINATION_AUTO = "determination_auto"           # Auto from form
    DETERMINATION_MANUAL = "determination_manual"       # Staff override
    DETERMINATION_OVERRIDE = "determination_override"   # Changed after initial
    
    # Exemption events  
    EXEMPTION_CERTIFIED = "exemption_certified"         # Certificate generated
    EXEMPTION_CERTIFICATE_VIEWED = "exemption_cert_viewed"
    EXEMPTION_CERTIFICATE_DOWNLOADED = "exemption_cert_downloaded"
    EXEMPTION_CERTIFICATE_PRINTED = "exemption_cert_printed"
    
    # Reportable events
    MARKED_REPORTABLE = "marked_reportable"
    SENT_TO_STAFF_QUEUE = "sent_to_staff_queue"

def log_determination(
    db: Session,
    submission_id: str,
    result: str,
    reasons: List[str],
    method: str,
    user_id: Optional[str] = None,
    metadata: Optional[dict] = None
):
    """Log a determination event with full context."""
    event = AuditLog(
        entity_type="submission_request",
        entity_id=submission_id,
        event_type=AuditEventType.DETERMINATION_AUTO if method == "auto_client_form" 
                   else AuditEventType.DETERMINATION_MANUAL,
        actor_id=user_id,
        actor_type="system" if not user_id else "user",
        details={
            "result": result,
            "reasons": reasons,
            "method": method,
            "timestamp": datetime.utcnow().isoformat(),
            **(metadata or {})
        },
        created_at=datetime.utcnow()
    )
    db.add(event)
    
    # If exempt, also log certificate generation
    if result == "exempt":
        cert_event = AuditLog(
            entity_type="submission_request",
            entity_id=submission_id,
            event_type=AuditEventType.EXEMPTION_CERTIFIED,
            actor_id=user_id,
            actor_type="system",
            details={
                "certificate_id": metadata.get("certificate_id"),
                "reasons": reasons,
            },
            created_at=datetime.utcnow()
        )
        db.add(cert_event)
```

### Staff Queue - Filter by Determination

```typescript
// Staff sees ONLY reportable transactions by default
// But can filter to see all

<Tabs defaultValue="reportable">
  <TabsList>
    <TabsTrigger value="reportable">
      Reportable ({reportableCount})
    </TabsTrigger>
    <TabsTrigger value="exempt">
      Exempt ({exemptCount})
    </TabsTrigger>
    <TabsTrigger value="all">
      All ({totalCount})
    </TabsTrigger>
  </TabsList>
  
  <TabsContent value="reportable">
    {/* Default view - work queue */}
    <SubmissionTable 
      filter={{ determination_result: "reportable" }}
      columns={['property', 'buyer', 'submitted_at', 'status', 'actions']}
    />
  </TabsContent>
  
  <TabsContent value="exempt">
    {/* Reference only - no actions needed */}
    <SubmissionTable 
      filter={{ determination_result: "exempt" }}
      columns={['property', 'buyer', 'submitted_at', 'exemption_reasons', 'certificate_id']}
      readOnly={true}
    />
  </TabsContent>
</Tabs>
```

### Admin Reports List - Full Visibility

```typescript
// Admin sees everything with filtering

const columns = [
  { header: "Property", accessor: "property_address" },
  { header: "Buyer", accessor: "buyer_name" },
  { header: "Submitted", accessor: "created_at" },
  { 
    header: "Determination", 
    accessor: "determination_result",
    cell: ({ value, row }) => (
      <DeterminationBadge 
        result={value}
        reasons={row.exemption_reasons}
        method={row.determination_method}
      />
    )
  },
  { header: "Certificate", accessor: "exemption_certificate_id" },
  { header: "Status", accessor: "status" },
];

// Filters
<FilterBar>
  <Select name="determination" options={[
    { value: "all", label: "All Determinations" },
    { value: "exempt", label: "Exempt Only" },
    { value: "reportable", label: "Reportable Only" },
    { value: "needs_review", label: "Needs Review" },
  ]} />
  
  <Select name="method" options={[
    { value: "all", label: "All Methods" },
    { value: "auto_client_form", label: "Auto (Client Form)" },
    { value: "staff_manual", label: "Staff Manual" },
    { value: "ai_assisted", label: "AI Assisted" },
  ]} />
  
  <DateRangePicker name="date_range" />
  
  <Input name="certificate_search" placeholder="Search certificate ID..." />
</FilterBar>
```

### Admin Detail Page - Full Audit Trail

```typescript
// Admin sees complete history

<Tabs>
  <TabsTrigger value="details">Details</TabsTrigger>
  <TabsTrigger value="determination">Determination</TabsTrigger>
  <TabsTrigger value="audit">Audit Trail</TabsTrigger>
</Tabs>

<TabsContent value="determination">
  <Card>
    <CardHeader>
      <CardTitle>Determination Details</CardTitle>
    </CardHeader>
    <CardContent>
      <DataRow label="Result">
        <DeterminationBadge result={submission.determination_result} />
      </DataRow>
      <DataRow label="Method">
        {formatMethod(submission.determination_method)}
      </DataRow>
      <DataRow label="Timestamp">
        {formatDateTime(submission.determination_timestamp)}
      </DataRow>
      
      {submission.determination_result === "exempt" && (
        <>
          <Separator className="my-4" />
          <DataRow label="Certificate ID">
            <code>{submission.exemption_certificate_id}</code>
          </DataRow>
          <DataRow label="Exemption Reasons">
            <ul className="list-disc list-inside">
              {submission.exemption_reasons.map(r => (
                <li key={r}>{formatExemptionReason(r)}</li>
              ))}
            </ul>
          </DataRow>
          <div className="mt-4">
            <Button variant="outline" onClick={() => viewCertificate(submission)}>
              <Eye className="h-4 w-4 mr-2" />
              View Certificate
            </Button>
          </div>
        </>
      )}
      
      {/* Show original form answers for audit */}
      <Separator className="my-4" />
      <h4 className="font-medium mb-2">Original Form Answers</h4>
      <pre className="bg-muted p-4 rounded text-xs overflow-auto">
        {JSON.stringify(submission.form_data, null, 2)}
      </pre>
    </CardContent>
  </Card>
</TabsContent>

<TabsContent value="audit">
  <AuditTrailTable 
    entityType="submission_request"
    entityId={submission.id}
    showAllEvents={true}
  />
</TabsContent>
```

### Executive Dashboard - Aggregate Stats

```typescript
// High-level metrics for leadership

<div className="grid grid-cols-4 gap-4">
  <StatCard
    title="Total Submissions"
    value={stats.total}
    trend={stats.total_trend}
  />
  <StatCard
    title="Exempt"
    value={stats.exempt}
    percentage={stats.exempt_rate}
    color="green"
  />
  <StatCard
    title="Reportable"
    value={stats.reportable}
    percentage={stats.reportable_rate}
    color="blue"
  />
  <StatCard
    title="Filed"
    value={stats.filed}
    percentage={stats.filed_rate}
    color="purple"
  />
</div>

{/* Exemption breakdown chart */}
<Card>
  <CardHeader>
    <CardTitle>Exemption Reasons Breakdown</CardTitle>
  </CardHeader>
  <CardContent>
    <ExemptionReasonsChart data={stats.exemption_breakdown} />
    {/* Shows: 45% financing, 30% individual buyer, 15% commercial, etc. */}
  </CardContent>
</Card>

{/* Trend over time */}
<Card>
  <CardHeader>
    <CardTitle>Determination Trend</CardTitle>
  </CardHeader>
  <CardContent>
    <DeterminationTrendChart 
      data={stats.monthly_trend}
      series={['exempt', 'reportable', 'filed']}
    />
  </CardContent>
</Card>
```

### API Endpoints for Traceability

```python
# api/app/routes/admin.py

@router.get("/admin/submissions/stats")
async def get_submission_stats(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db)
):
    """Get aggregate stats for executive dashboard."""
    return {
        "total": count_submissions(db, start_date, end_date),
        "exempt": count_submissions(db, start_date, end_date, determination="exempt"),
        "reportable": count_submissions(db, start_date, end_date, determination="reportable"),
        "filed": count_submissions(db, start_date, end_date, status="filed"),
        "exempt_rate": calculate_rate("exempt", db, start_date, end_date),
        "exemption_breakdown": get_exemption_breakdown(db, start_date, end_date),
        "monthly_trend": get_monthly_trend(db, months=12),
    }

@router.get("/admin/submissions/{id}/audit")
async def get_submission_audit_trail(
    id: str,
    db: Session = Depends(get_db)
):
    """Get full audit trail for a submission."""
    events = db.query(AuditLog).filter(
        AuditLog.entity_type == "submission_request",
        AuditLog.entity_id == id
    ).order_by(AuditLog.created_at.desc()).all()
    
    return [AuditEventResponse.from_orm(e) for e in events]

@router.get("/admin/certificates/{certificate_id}")
async def lookup_certificate(
    certificate_id: str,
    db: Session = Depends(get_db)
):
    """Look up submission by certificate ID."""
    submission = db.query(SubmissionRequest).filter(
        SubmissionRequest.exemption_certificate_id == certificate_id
    ).first()
    
    if not submission:
        raise HTTPException(404, "Certificate not found")
    
    return SubmissionDetailResponse.from_orm(submission)
```

### Notification Events for Traceability

```python
# Log notification events for each determination

def create_determination_notification(db: Session, submission: SubmissionRequest):
    """Create notification event for determination."""
    if submission.determination_result == "exempt":
        event_type = "exemption_certified"
        message = f"Transaction {submission.escrow_number} determined EXEMPT"
    else:
        event_type = "marked_reportable"
        message = f"Transaction {submission.escrow_number} requires FinCEN report"
    
    notification = NotificationEvent(
        event_type=event_type,
        entity_type="submission_request",
        entity_id=str(submission.id),
        message=message,
        metadata={
            "determination_result": submission.determination_result,
            "exemption_reasons": submission.exemption_reasons,
            "certificate_id": submission.exemption_certificate_id,
        },
        created_at=datetime.utcnow()
    )
    db.add(notification)
```

---

## Verification Checklist

### Client Experience
- [ ] Client submission form has all determination questions
- [ ] Submission creates with immediate determination
- [ ] Exempt submissions get certificate ID
- [ ] Exempt result page shows certificate
- [ ] Print certificate works
- [ ] Download PDF works

### Client Dashboard Visibility
- [ ] Exempt submissions appear in client dashboard
- [ ] Client can view certificate from dashboard
- [ ] Client can re-download/re-print certificate

### Staff Visibility
- [ ] Staff queue filters by determination (default: reportable only)
- [ ] Staff can view exempt transactions (read-only)
- [ ] Staff can see determination details on any submission

### Admin Visibility
- [ ] Admin list shows all determinations with filters
- [ ] Admin can search by certificate ID
- [ ] Admin detail shows full determination info
- [ ] Admin sees complete audit trail
- [ ] Admin can view original form answers

### Executive Visibility
- [ ] Dashboard shows exemption stats
- [ ] Dashboard shows exemption rate percentage
- [ ] Dashboard shows exemption reasons breakdown
- [ ] Dashboard shows trend over time

### Audit Trail
- [ ] Determination event logged
- [ ] Certificate generation event logged
- [ ] Certificate view/download/print events logged
- [ ] All events include timestamp, actor, details

---

## Summary

| Outcome | What Happens |
|---------|--------------|
| **EXEMPT** | Transaction ends. Client gets printable certificate. Logged for compliance. Staff never sees it. |
| **REPORTABLE** | Continues to staff queue → wizard → party links → filing |
| **NEEDS_REVIEW** | (Future) Edge cases flagged for staff manual determination |

**This saves staff time and gives clients instant answers with paper trail!**
