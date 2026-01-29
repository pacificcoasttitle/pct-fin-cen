# CURSOR PROMPT ADDENDUM: Wire Party Data Visibility Across All Roles

## 🎯 REQUIREMENT

The seller forms and validation we're building must be **visible and trackable** by all user roles throughout the system. Data collection without visibility is useless.

**Principle:** If we collect it, everyone who needs it should see it.

---

## VISIBILITY MATRIX

| Data Point | Party Portal | Staff Queue | Staff Wizard | Admin Reports | Client Dashboard |
|------------|--------------|-------------|--------------|---------------|------------------|
| Party Type (individual/entity/trust) | ✅ Edit | ✅ View | ✅ View/Edit | ✅ View | ✅ View |
| Party Status (pending/submitted) | ✅ View | ✅ View | ✅ View | ✅ View | ✅ View |
| Completion % | N/A | ✅ View | ✅ View | ✅ View | ✅ View |
| Entity Name / Trust Name | ✅ Edit | ✅ View | ✅ View | ✅ View | ✅ View |
| EIN / TIN | ✅ Edit | ✅ Masked | ✅ View | ✅ View | ❌ Hidden |
| Beneficial Owners (count) | ✅ Edit | ✅ View | ✅ View | ✅ View | ❌ Hidden |
| Trustees (count) | ✅ Edit | ✅ View | ✅ View | ✅ View | ❌ Hidden |
| Payment Sources (count/total) | ✅ Edit | ✅ View | ✅ View | ✅ View | ❌ Hidden |
| ID Documents Uploaded | ✅ Edit | ✅ View | ✅ View | ✅ View | ❌ Hidden |
| Validation Errors | ✅ View | ✅ View | ✅ View | ✅ View | ❌ Hidden |
| Certification Status | ✅ Edit | ✅ View | ✅ View | ✅ View | ✅ View |

---

## IMPLEMENTATION BY ROLE

### 1. STAFF QUEUE (`/app/staff/queue`)

**Current:** Shows reports assigned to staff with basic party info
**Add:** Enhanced party status cards

```typescript
// In the queue table/cards, show for each report:

interface PartyStatusSummary {
  role: "buyer" | "seller";
  type: "individual" | "entity" | "trust";
  display_name: string;
  status: "pending" | "link_sent" | "opened" | "submitted";
  completion_percentage: number;
  
  // Type-specific summaries
  beneficial_owners_count?: number;  // For entity buyers
  trustees_count?: number;           // For trust buyers/sellers
  payment_sources_count?: number;    // For buyers
  documents_uploaded?: number;
  
  // Validation
  has_errors: boolean;
  error_count: number;
}

// Display as:
<PartyStatusCard party={party}>
  <Badge>{party.type}</Badge>
  <span>{party.display_name}</span>
  <Progress value={party.completion_percentage} />
  {party.type === "entity" && (
    <span className="text-xs text-muted-foreground">
      {party.beneficial_owners_count} beneficial owner(s)
    </span>
  )}
  {party.type === "trust" && (
    <span className="text-xs text-muted-foreground">
      {party.trustees_count} trustee(s)
    </span>
  )}
  {party.has_errors && (
    <Badge variant="destructive">{party.error_count} issues</Badge>
  )}
</PartyStatusCard>
```

### 2. STAFF WIZARD - PARTY REVIEW STEP

**Current:** Shows parties that need links sent
**Add:** Full party data review before filing

```typescript
// Add a "Review Party Data" step or section in wizard

interface PartyReviewSection {
  // For each party, show submitted data in read-only format
}

// BUYER ENTITY REVIEW:
<Card>
  <CardHeader>
    <CardTitle>Buyer: {party.entity_name}</CardTitle>
    <Badge>{party.entity_type}</Badge>
    <Badge variant={party.status === "submitted" ? "success" : "warning"}>
      {party.status}
    </Badge>
  </CardHeader>
  <CardContent>
    <Section title="Entity Information">
      <DataRow label="Legal Name" value={party.entity_name} />
      <DataRow label="DBA" value={party.dba_name || "—"} />
      <DataRow label="EIN" value={maskEIN(party.ein)} />
      <DataRow label="Address" value={formatAddress(party.business_address)} />
    </Section>
    
    <Section title="Beneficial Owners ({party.beneficial_owners.length})">
      {party.beneficial_owners.map(bo => (
        <BOSummaryRow key={bo.id} owner={bo} />
      ))}
    </Section>
    
    <Section title="Payment Sources ({party.payment_sources.length})">
      <DataRow label="Total" value={formatCurrency(totalPayments)} />
      {party.payment_sources.map(ps => (
        <PaymentSummaryRow key={ps.id} source={ps} />
      ))}
    </Section>
    
    <Section title="Documents">
      <DocumentList documents={party.documents} />
    </Section>
    
    {party.validation_errors.length > 0 && (
      <Alert variant="destructive">
        <AlertTitle>Validation Issues</AlertTitle>
        <ul>
          {party.validation_errors.map(err => <li>{err}</li>)}
        </ul>
      </Alert>
    )}
  </CardContent>
</Card>

// SELLER ENTITY REVIEW (simpler - no BOs, no payments):
<Card>
  <CardHeader>
    <CardTitle>Seller: {party.entity_name}</CardTitle>
  </CardHeader>
  <CardContent>
    <Section title="Entity Information">
      <DataRow label="Legal Name" value={party.entity_name} />
      <DataRow label="EIN" value={maskEIN(party.ein)} />
      <DataRow label="Address" value={formatAddress(party.business_address)} />
    </Section>
    
    <Section title="Signing Individual">
      <DataRow label="Name" value={party.signing_individual.full_name} />
      <DataRow label="Title" value={party.signing_individual.title} />
    </Section>
  </CardContent>
</Card>

// SELLER TRUST REVIEW:
<Card>
  <CardHeader>
    <CardTitle>Seller: {party.trust_name}</CardTitle>
    <Badge>{party.is_revocable ? "Revocable" : "Irrevocable"}</Badge>
  </CardHeader>
  <CardContent>
    <Section title="Trust Information">
      <DataRow label="Trust Name" value={party.trust_name} />
      <DataRow label="Date Executed" value={formatDate(party.date_executed)} />
      <DataRow label="TIN" value={maskTIN(party.tin)} />
    </Section>
    
    <Section title="Trustees ({party.trustees.length})">
      {party.trustees.map(trustee => (
        <TrusteeSummaryRow key={trustee.id} trustee={trustee} />
      ))}
    </Section>
  </CardContent>
</Card>
```

### 3. ADMIN REPORTS LIST (`/app/admin/reports`)

**Current:** Shows reports with basic status
**Add:** Party completion summary column

```typescript
// Add columns to admin reports table:

const columns = [
  // ... existing columns ...
  
  {
    header: "Parties",
    cell: ({ row }) => {
      const parties = row.original.parties;
      const buyers = parties.filter(p => p.role === "buyer" || p.role === "transferee");
      const sellers = parties.filter(p => p.role === "seller" || p.role === "transferor");
      
      return (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium">Buyers:</span>
            {buyers.map(b => (
              <PartyPill key={b.id} party={b} />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium">Sellers:</span>
            {sellers.map(s => (
              <PartyPill key={s.id} party={s} />
            ))}
          </div>
        </div>
      );
    }
  },
  
  {
    header: "Data Complete",
    cell: ({ row }) => {
      const { complete, total, hasErrors } = row.original.party_completion;
      return (
        <div className="flex items-center gap-2">
          <Progress value={(complete / total) * 100} className="w-16" />
          <span className="text-xs">{complete}/{total}</span>
          {hasErrors && <AlertCircle className="h-4 w-4 text-red-500" />}
        </div>
      );
    }
  }
];

// PartyPill component
function PartyPill({ party }) {
  const typeIcon = {
    individual: User,
    entity: Building2,
    trust: FileText,
  }[party.entity_type];
  
  const statusColor = {
    pending: "bg-gray-100 text-gray-700",
    link_sent: "bg-blue-100 text-blue-700",
    opened: "bg-amber-100 text-amber-700",
    submitted: "bg-green-100 text-green-700",
  }[party.status];
  
  return (
    <div className={cn("px-2 py-1 rounded-full text-xs flex items-center gap-1", statusColor)}>
      {typeIcon && <typeIcon className="h-3 w-3" />}
      {party.display_name.slice(0, 15)}
      {party.display_name.length > 15 && "..."}
    </div>
  );
}
```

### 4. ADMIN REPORT DETAIL (`/app/admin/reports/[id]`)

**Current:** Shows report details
**Add:** Full party data inspection panel

```typescript
// Add a "Parties" tab or section with full detail view

<Tabs>
  <TabsList>
    <TabsTrigger value="overview">Overview</TabsTrigger>
    <TabsTrigger value="parties">Parties ({report.parties.length})</TabsTrigger>
    <TabsTrigger value="filing">Filing Status</TabsTrigger>
    <TabsTrigger value="audit">Audit Log</TabsTrigger>
  </TabsList>
  
  <TabsContent value="parties">
    <div className="space-y-4">
      {report.parties.map(party => (
        <PartyDetailCard 
          key={party.id} 
          party={party}
          showSensitive={true}  // Admins see full data
          allowEdit={false}     // Read-only in admin
        />
      ))}
    </div>
  </TabsContent>
</Tabs>

// PartyDetailCard shows EVERYTHING:
// - All form fields
// - All beneficial owners (with masked SSNs)
// - All trustees
// - All payment sources
// - All uploaded documents (with download links)
// - Validation status
// - Submission timestamp
// - Certification details
```

### 5. CLIENT DASHBOARD (`/app/dashboard` or `/app/requests`)

**Current:** Shows submission requests with status
**Add:** Party status visibility (limited detail)

```typescript
// Clients see their parties' status but NOT sensitive data

<Card>
  <CardHeader>
    <CardTitle>Request #{request.escrow_number}</CardTitle>
  </CardHeader>
  <CardContent>
    <Section title="Party Status">
      <div className="space-y-2">
        {request.parties.map(party => (
          <div key={party.id} className="flex items-center justify-between p-2 bg-muted rounded">
            <div className="flex items-center gap-2">
              <PartyTypeIcon type={party.entity_type} />
              <span>{party.display_name}</span>
              <Badge variant="outline">{party.role}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={party.status} />
              {party.status === "submitted" && (
                <Check className="h-4 w-4 text-green-600" />
              )}
            </div>
          </div>
        ))}
      </div>
      
      {/* Show overall completion */}
      <div className="mt-4 pt-4 border-t">
        <div className="flex justify-between text-sm">
          <span>Overall Progress</span>
          <span>{completedParties}/{totalParties} parties complete</span>
        </div>
        <Progress value={(completedParties / totalParties) * 100} className="mt-2" />
      </div>
    </Section>
  </CardContent>
</Card>
```

---

## API CHANGES NEEDED

### 1. Enhance Party Response

**File:** `api/app/routes/reports.py` or `api/app/routes/parties.py`

```python
class PartyResponse(BaseModel):
    id: str
    report_id: str
    party_role: str
    entity_type: str
    display_name: str
    status: str
    
    # NEW: Summary fields for UI
    completion_percentage: int
    beneficial_owners_count: Optional[int]
    trustees_count: Optional[int]
    payment_sources_count: Optional[int]
    payment_sources_total: Optional[int]
    documents_count: int
    
    # NEW: Validation
    has_validation_errors: bool
    validation_error_count: int
    
    # NEW: Timestamps
    link_sent_at: Optional[datetime]
    opened_at: Optional[datetime]
    submitted_at: Optional[datetime]
    
    # Full data (only for authorized views)
    party_data: Optional[dict]  # Include based on role/permissions

def calculate_party_summary(party: ReportParty) -> dict:
    """Calculate summary fields from party_data."""
    data = party.party_data or {}
    
    # Count beneficial owners
    bos = data.get("beneficial_owners", [])
    
    # Count trustees
    trustees = data.get("trustees", [])
    
    # Count and sum payment sources
    payments = data.get("payment_sources", [])
    payment_total = sum(p.get("amount", 0) for p in payments)
    
    # Count documents
    docs_count = len(party.documents) if hasattr(party, 'documents') else 0
    
    # Calculate completion percentage
    completion = calculate_completion_percentage(party)
    
    # Validate
    errors = validate_party_data(party)
    
    return {
        "completion_percentage": completion,
        "beneficial_owners_count": len(bos) if party.entity_type in ["entity", "llc", "corporation"] else None,
        "trustees_count": len(trustees) if party.entity_type == "trust" else None,
        "payment_sources_count": len(payments) if party.party_role in ["buyer", "transferee"] else None,
        "payment_sources_total": payment_total if payments else None,
        "documents_count": docs_count,
        "has_validation_errors": len(errors) > 0,
        "validation_error_count": len(errors),
    }
```

### 2. Add Completion Calculation

```python
def calculate_completion_percentage(party: ReportParty) -> int:
    """Calculate how complete the party's data is."""
    data = party.party_data or {}
    
    required_fields = []
    completed_fields = []
    
    # Common fields
    required_fields.extend(["display_name", "email"])
    
    if party.entity_type == "individual":
        required_fields.extend(["first_name", "last_name", "date_of_birth", "address", "id_number"])
    
    elif party.entity_type in ["entity", "llc", "corporation", "partnership"]:
        required_fields.extend(["entity_name", "ein", "business_address", "signing_individual"])
        if party.party_role in ["buyer", "transferee"]:
            required_fields.extend(["beneficial_owners", "payment_sources"])
    
    elif party.entity_type == "trust":
        required_fields.extend(["trust_name", "date_executed", "tin", "trustees"])
        if party.party_role in ["buyer", "transferee"]:
            required_fields.append("payment_sources")
    
    # Check which fields are complete
    for field in required_fields:
        value = data.get(field)
        if value and (not isinstance(value, list) or len(value) > 0):
            completed_fields.append(field)
    
    if not required_fields:
        return 100 if party.status == "submitted" else 0
    
    return int((len(completed_fields) / len(required_fields)) * 100)
```

### 3. Add Validation Endpoint

```python
@router.get("/reports/{report_id}/parties/{party_id}/validation")
async def validate_party(
    report_id: str,
    party_id: str,
    db: Session = Depends(get_db)
):
    """Get validation errors for a party."""
    party = get_party_or_404(db, party_id)
    errors = validate_party_data(party)
    warnings = get_party_warnings(party)
    
    return {
        "valid": len(errors) == 0,
        "errors": errors,
        "warnings": warnings,
        "completion_percentage": calculate_completion_percentage(party)
    }
```

---

## REUSABLE COMPONENTS TO CREATE

### 1. PartyStatusBadge

```typescript
// web/components/party/PartyStatusBadge.tsx

export function PartyStatusBadge({ status }: { status: string }) {
  const config = {
    pending: { label: "Pending", variant: "secondary" },
    link_sent: { label: "Link Sent", variant: "outline" },
    opened: { label: "In Progress", variant: "warning" },
    submitted: { label: "Submitted", variant: "success" },
  }[status] || { label: status, variant: "secondary" };
  
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
```

### 2. PartyTypeBadge

```typescript
// web/components/party/PartyTypeBadge.tsx

export function PartyTypeBadge({ type }: { type: string }) {
  const config = {
    individual: { label: "Individual", icon: User },
    entity: { label: "Entity", icon: Building2 },
    llc: { label: "LLC", icon: Building2 },
    corporation: { label: "Corporation", icon: Building2 },
    trust: { label: "Trust", icon: FileText },
  }[type] || { label: type, icon: HelpCircle };
  
  const Icon = config.icon;
  
  return (
    <Badge variant="outline" className="gap-1">
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}
```

### 3. PartyCompletionProgress

```typescript
// web/components/party/PartyCompletionProgress.tsx

export function PartyCompletionProgress({ 
  percentage, 
  hasErrors 
}: { 
  percentage: number; 
  hasErrors: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <Progress 
        value={percentage} 
        className={cn("w-20", hasErrors && "bg-red-100")}
      />
      <span className="text-xs text-muted-foreground">{percentage}%</span>
      {hasErrors && <AlertCircle className="h-4 w-4 text-red-500" />}
    </div>
  );
}
```

### 4. PartySummaryCard

```typescript
// web/components/party/PartySummaryCard.tsx

export function PartySummaryCard({ party, showDetails = false }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PartyTypeBadge type={party.entity_type} />
            <span className="font-medium">{party.display_name}</span>
          </div>
          <PartyStatusBadge status={party.status} />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between text-sm">
          <PartyCompletionProgress 
            percentage={party.completion_percentage}
            hasErrors={party.has_validation_errors}
          />
          
          <div className="flex items-center gap-3 text-muted-foreground">
            {party.beneficial_owners_count !== null && (
              <span>{party.beneficial_owners_count} BOs</span>
            )}
            {party.trustees_count !== null && (
              <span>{party.trustees_count} trustees</span>
            )}
            {party.documents_count > 0 && (
              <span>{party.documents_count} docs</span>
            )}
          </div>
        </div>
        
        {showDetails && party.party_data && (
          <PartyDetailView data={party.party_data} type={party.entity_type} />
        )}
      </CardContent>
    </Card>
  );
}
```

---

## FILES TO CREATE/MODIFY

### New Components:
```
web/components/party/
├── PartyStatusBadge.tsx
├── PartyTypeBadge.tsx
├── PartyCompletionProgress.tsx
├── PartySummaryCard.tsx
├── PartyDetailCard.tsx
├── PartyDetailView.tsx
└── index.ts
```

### Modified Pages:
```
web/app/(app)/app/staff/queue/page.tsx          # Add party summaries
web/app/(app)/app/reports/[id]/wizard/page.tsx  # Add party review section
web/app/(app)/app/admin/reports/page.tsx        # Add party columns
web/app/(app)/app/admin/reports/[id]/page.tsx   # Add parties tab
web/app/(app)/app/requests/page.tsx             # Add party status (client view)
web/app/(app)/app/dashboard/page.tsx            # Add party status overview
```

### Modified API:
```
api/app/routes/reports.py                       # Enhance party response
api/app/routes/parties.py                       # Add validation endpoint
api/app/services/party_validation.py            # NEW: Validation logic
```

---

## VERIFICATION CHECKLIST

### Staff Queue:
- [ ] Shows party type badges (individual/entity/trust)
- [ ] Shows party status (pending/sent/opened/submitted)
- [ ] Shows completion percentage
- [ ] Shows BO/trustee counts where applicable
- [ ] Shows validation error indicator

### Staff Wizard:
- [ ] Party review section shows all submitted data
- [ ] Can see entity details, BOs, trustees, payment sources
- [ ] Validation errors highlighted before filing
- [ ] Documents listed with download links

### Admin Reports List:
- [ ] Party column shows all parties with status
- [ ] Data completion column with progress
- [ ] Can filter by party completion status

### Admin Report Detail:
- [ ] Parties tab shows full detail for each party
- [ ] Can expand to see all data fields
- [ ] Sensitive data appropriately displayed (admin access)

### Client Dashboard:
- [ ] Can see party names and status
- [ ] Can see overall completion progress
- [ ] Cannot see sensitive data (SSN, EIN, etc.)

---

**This ensures every piece of data we collect is VISIBLE and TRACKABLE throughout the system!**
