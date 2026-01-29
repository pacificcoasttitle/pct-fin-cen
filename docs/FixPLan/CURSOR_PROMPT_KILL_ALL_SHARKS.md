# CURSOR PROMPT: Kill All Sharks - Complete Traceability & Visibility Fix

## 🎯 MISSION

Fix ALL identified gaps from the traceability investigation and ripple effect analysis. This is the comprehensive cleanup to ensure every feature is fully wired across all roles.

**Based on:**
- INVESTIGATION_TRACEABILITY_FINDINGS.md (6.5/10 → target 10/10)
- RIPPLE_EFFECT_ANALYSIS_2026_01_29.md (gaps identified)
- TRACEABILITY_AUDIT_COMPLETE.md (audit system now exists)

---

## ✅ ALREADY COMPLETED (Do Not Redo)

The following have been implemented per TRACEABILITY_AUDIT_COMPLETE.md:

1. ✅ `api/app/services/audit.py` - Centralized audit service with 40+ event types
2. ✅ `api/app/routes/audit.py` - Audit API endpoints (list, entity trail, report trail, stats)
3. ✅ Audit logging in: submission_requests, documents, companies, users, invoices
4. ✅ Executive dashboard at `/app/executive`
5. ✅ Party visibility components (PartyStatusBadge, PartyTypeBadge, etc.)

---

## 🔴 CRITICAL GAPS TO FIX

### GAP 1: Client Party Status Visibility

**Problem:** Clients cannot see party submission status for their transactions.

**Investigation Finding:**
> "Critical Gap: Clients cannot see party submission status for their transactions!"

**Fix Required:**

```typescript
// web/app/(app)/app/requests/page.tsx
// Add party status column to the requests table

// For each request, show:
// "2/3 parties submitted" or "Awaiting 1 seller"

// API already returns parties via /submission-requests/my-requests
// Need to display it in the UI
```

**Files to Modify:**
- `web/app/(app)/app/requests/page.tsx` - Add party status column
- `web/app/(app)/app/dashboard/page.tsx` - Add party status to recent requests card

**Implementation:**
```typescript
// In requests table, add column:
{
  header: "Party Status",
  cell: ({ row }) => {
    const parties = row.original.parties || [];
    const submitted = parties.filter(p => p.status === "submitted").length;
    const total = parties.length;
    
    if (total === 0) return <span className="text-muted-foreground">—</span>;
    
    return (
      <div className="flex items-center gap-2">
        <Progress value={(submitted / total) * 100} className="w-16 h-2" />
        <span className="text-xs text-muted-foreground">
          {submitted}/{total}
        </span>
      </div>
    );
  }
}
```

---

### GAP 2: Admin Invoice Management Page

**Problem:** Full invoice API exists but no admin UI to use it.

**Investigation Finding:**
> "Critical Gap: No admin interface for invoice management despite full API existing!"

**Fix Required:**

Create new page: `web/app/(app)/app/admin/invoices/page.tsx`

**Features:**
- List all invoices with filters (status, company, date range)
- Invoice detail view with line items
- Generate invoice for period
- Mark invoice as sent/paid/void
- Download invoice PDF

**Files to Create:**
- `web/app/(app)/app/admin/invoices/page.tsx` - Main invoice list
- `web/app/(app)/app/admin/invoices/[id]/page.tsx` - Invoice detail
- `web/components/admin/InvoiceTable.tsx` - Reusable table
- `web/components/admin/InvoiceDetail.tsx` - Detail view
- `web/components/admin/GenerateInvoiceDialog.tsx` - Generate modal

**API Endpoints (already exist):**
- `GET /invoices` - List invoices
- `GET /invoices/{id}` - Invoice detail
- `POST /invoices/generate` - Generate invoice
- `PATCH /invoices/{id}/status` - Update status

---

### GAP 3: Admin Document Management Page

**Problem:** Staff/admin cannot easily review uploaded documents.

**Investigation Finding:**
> "Critical Gap: No admin document management view. Staff cannot easily review uploaded documents."

**Fix Required:**

Create new page: `web/app/(app)/app/admin/documents/page.tsx`

**Features:**
- List all documents across all parties
- Filter by: status, type, report, date
- View/download documents
- Mark as verified/rejected
- See which party uploaded which document

**Files to Create:**
- `web/app/(app)/app/admin/documents/page.tsx` - Document list
- `web/components/admin/DocumentTable.tsx` - Reusable table
- `web/components/admin/DocumentVerifyDialog.tsx` - Verification modal

**API Endpoints to Add:**
```python
# api/app/routes/documents.py

@router.get("/admin/documents")
async def list_all_documents(
    status: Optional[str] = None,
    document_type: Optional[str] = None,
    report_id: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """List all documents for admin review."""
    query = db.query(Document).join(ReportParty).join(Report)
    
    if status:
        query = query.filter(Document.status == status)
    if document_type:
        query = query.filter(Document.document_type == document_type)
    if report_id:
        query = query.filter(Report.id == report_id)
    
    total = query.count()
    documents = query.order_by(Document.created_at.desc()).offset(offset).limit(limit).all()
    
    return {
        "documents": [doc_to_response(d) for d in documents],
        "total": total,
        "has_more": offset + limit < total
    }

@router.patch("/admin/documents/{id}/verify")
async def verify_document(
    id: str,
    request: VerifyDocumentRequest,
    db: Session = Depends(get_db)
):
    """Mark document as verified or rejected."""
    document = get_document_or_404(db, id)
    
    old_status = document.status
    document.status = request.status  # "verified" or "rejected"
    document.verified_at = datetime.utcnow()
    document.verification_notes = request.notes
    
    # Audit log
    log_change(
        db, ENTITY_DOCUMENT, str(document.id),
        EVENT_DOCUMENT_VERIFIED if request.status == "verified" else EVENT_DOCUMENT_REJECTED,
        {"status": old_status}, {"status": request.status}
    )
    
    db.commit()
    return {"ok": True}
```

---

### GAP 4: Wire Client Invoice Page to Real API

**Problem:** Client invoice page uses filed reports as proxy, not actual Invoice model.

**Investigation Finding:**
> "*Client invoice page exists but uses filed reports as proxy, not actual Invoice model."

**Fix Required:**

Update: `web/app/(app)/app/invoices/page.tsx`

**Changes:**
- Fetch from `/invoices` API instead of `/reports`
- Show actual invoice line items
- Show invoice status (draft, sent, paid)
- Add invoice detail modal

---

### GAP 5: Party Link Open Tracking

**Problem:** No tracking when party opens their link.

**Investigation Finding:**
> "Gap: No tracking of when links are opened (clicked). Only submitted_at is tracked."

**Fix Required:**

**Model Change:**
```python
# api/app/models/party_link.py
# Add field:
opened_at = Column(DateTime, nullable=True)
```

**Migration:**
```python
# New migration
op.add_column('party_links', sa.Column('opened_at', sa.DateTime, nullable=True))
```

**API Change:**
```python
# api/app/routes/parties.py
# In get_party_data endpoint, track open:

@router.get("/party/{token}/data")
async def get_party_data(token: str, db: Session = Depends(get_db)):
    party_link = get_party_link_by_token(db, token)
    
    # Track first open
    if party_link.opened_at is None:
        party_link.opened_at = datetime.utcnow()
        
        # Audit log
        log_event(
            db, ENTITY_PARTY_LINK, str(party_link.id),
            EVENT_PARTY_LINK_OPENED,
            details={"party_id": str(party_link.report_party_id)}
        )
        
        db.commit()
    
    return party_data_response(party_link)
```

**UI Update:**
Show "Opened" status in staff queue and admin views.

---

### GAP 6: Certificate ID Search in Admin

**Problem:** API exists but no UI for searching by certificate ID.

**Fix Required:**

Update: `web/app/(app)/app/admin/requests/page.tsx`

**Add:**
- Search input for certificate ID
- Calls `GET /submission-requests/certificate/{id}`
- Shows matching submission if found

---

### GAP 7: Exemption Reasons Breakdown Chart

**Problem:** Executive dashboard missing exemption reasons breakdown.

**Investigation Finding:**
> "Exemption reasons breakdown chart | ❌ GAP | Not implemented"

**Fix Required:**

Update: `web/app/(app)/app/executive/page.tsx`

**Add Chart:**
```typescript
// Add to executive dashboard
<Card>
  <CardHeader>
    <CardTitle>Exemption Reasons</CardTitle>
  </CardHeader>
  <CardContent>
    <ExemptionReasonsChart data={stats.exemption_breakdown} />
  </CardContent>
</Card>

// ExemptionReasonsChart shows:
// - Financing involved: 45%
// - Individual buyer: 30%
// - Commercial property: 15%
// - Other: 10%
```

**API Update:**
```python
# api/app/routes/reports.py - get_executive_stats
# Add exemption_breakdown to response:

exemption_breakdown = db.query(
    func.jsonb_array_elements_text(SubmissionRequest.exemption_reasons).label('reason'),
    func.count().label('count')
).filter(
    SubmissionRequest.determination_result == "exempt"
).group_by('reason').all()

return {
    # ... existing stats ...
    "exemption_breakdown": [
        {"reason": r, "count": c} for r, c in exemption_breakdown
    ]
}
```

---

### GAP 8: Demo Seed Data for Exempt Submissions

**Problem:** Demo doesn't include exempt submission examples.

**Fix Required:**

Update: `api/app/services/demo_seed.py`

**Add:**
```python
# Create exempt submission examples
exempt_submissions = [
    {
        "property_address": "456 Commercial Blvd, Business Park, CA 90001",
        "purchase_price": 2500000,
        "buyer_name": "ABC Holdings LLC",
        "buyer_type": "entity",
        "financing_type": "conventional",  # Has financing = exempt
        "determination_result": "exempt",
        "exemption_reasons": ["financing_involved"],
    },
    {
        "property_address": "789 Residential Ave, Anytown, CA 90002",
        "purchase_price": 850000,
        "buyer_name": "John Smith",
        "buyer_type": "individual",  # Individual = exempt
        "financing_type": "cash",
        "determination_result": "exempt",
        "exemption_reasons": ["buyer_is_individual"],
    },
    {
        "property_address": "321 Industrial Way, Commerce, CA 90003",
        "purchase_price": 5000000,
        "buyer_name": "City of Commerce",
        "buyer_type": "entity",
        "entity_subtype": "government",  # Government = exempt
        "financing_type": "cash",
        "determination_result": "exempt",
        "exemption_reasons": ["exempt_entity_government"],
    },
]

for data in exempt_submissions:
    submission = SubmissionRequest(
        company_id=demo_company.id,
        **data,
        exemption_certificate_id=generate_exemption_certificate_id(),
        determination_timestamp=datetime.utcnow(),
        determination_method="auto_client_form",
        status="exempt",
    )
    db.add(submission)
```

---

### GAP 9: Download Tracking for Documents

**Problem:** No audit log when documents are downloaded.

**Fix Required:**

Already defined in audit.py: `EVENT_DOCUMENT_DOWNLOADED`

**Add to download endpoint:**
```python
# api/app/routes/documents.py

@router.get("/documents/{id}/download-url")
async def get_download_url(id: str, db: Session = Depends(get_db)):
    document = get_document_or_404(db, id)
    
    # Generate download URL
    url = storage_service.generate_download_url(document.storage_key)
    
    # Audit log
    log_event(
        db, ENTITY_DOCUMENT, str(document.id),
        EVENT_DOCUMENT_DOWNLOADED,
        details={
            "filename": document.original_filename,
            "party_id": str(document.report_party_id),
        }
    )
    db.commit()
    
    return {"download_url": url}
```

---

### GAP 10: Add Navigation Links for New Admin Pages

**Fix Required:**

Update: `web/lib/navigation.ts`

**Add:**
```typescript
// In admin navigation section:
{
  title: "Invoices",
  href: "/app/admin/invoices",
  icon: Receipt,
  roles: ["pct_admin"],
},
{
  title: "Documents",
  href: "/app/admin/documents",
  icon: FileText,
  roles: ["pct_admin"],
},
```

---

## 📋 IMPLEMENTATION CHECKLIST

### Phase 1: Client Visibility (Quick Wins)
- [ ] Add party status to client requests page
- [ ] Add party status to client dashboard
- [ ] Add certificate search to admin requests page

### Phase 2: Admin Pages (Medium Effort)
- [ ] Create admin invoice management page
- [ ] Create admin document management page
- [ ] Add navigation links for new pages
- [ ] Wire client invoice page to real API

### Phase 3: Tracking & Analytics (Refinement)
- [ ] Add party link open tracking (migration + API)
- [ ] Add document download tracking
- [ ] Add exemption reasons breakdown chart
- [ ] Update demo seed with exempt examples

### Phase 4: Verification
- [ ] Test client can see party status
- [ ] Test admin can manage invoices
- [ ] Test admin can review documents
- [ ] Test party link opens are tracked
- [ ] Test document downloads are logged
- [ ] Test executive dashboard shows exemption breakdown
- [ ] Test demo includes exempt submissions

---

## FILES TO CREATE

| File | Purpose |
|------|---------|
| `web/app/(app)/app/admin/invoices/page.tsx` | Invoice list |
| `web/app/(app)/app/admin/invoices/[id]/page.tsx` | Invoice detail |
| `web/app/(app)/app/admin/documents/page.tsx` | Document list |
| `web/components/admin/InvoiceTable.tsx` | Reusable invoice table |
| `web/components/admin/DocumentTable.tsx` | Reusable document table |
| `web/components/charts/ExemptionReasonsChart.tsx` | Pie/bar chart |
| `api/alembic/versions/xxx_add_party_link_opened_at.py` | Migration |

## FILES TO MODIFY

| File | Changes |
|------|---------|
| `web/app/(app)/app/requests/page.tsx` | Add party status column |
| `web/app/(app)/app/dashboard/page.tsx` | Add party status to recent |
| `web/app/(app)/app/admin/requests/page.tsx` | Add certificate search |
| `web/app/(app)/app/invoices/page.tsx` | Wire to real Invoice API |
| `web/app/(app)/app/executive/page.tsx` | Add exemption breakdown chart |
| `web/lib/navigation.ts` | Add invoice/document nav links |
| `api/app/routes/documents.py` | Add admin endpoints, download tracking |
| `api/app/routes/parties.py` | Add link open tracking |
| `api/app/routes/reports.py` | Add exemption breakdown to exec stats |
| `api/app/models/party_link.py` | Add opened_at field |
| `api/app/services/demo_seed.py` | Add exempt submission examples |

---

## VERIFICATION QUERIES

After implementation, verify:

```sql
-- 1. Party links have opened_at tracking
SELECT id, opened_at, submitted_at FROM party_links WHERE opened_at IS NOT NULL;

-- 2. Document downloads are logged
SELECT * FROM audit_logs WHERE action = 'document.downloaded' ORDER BY created_at DESC LIMIT 10;

-- 3. Exempt submissions exist in demo
SELECT id, determination_result, exemption_reasons FROM submission_requests 
WHERE determination_result = 'exempt';

-- 4. Invoices exist
SELECT id, status, total_amount FROM invoices ORDER BY created_at DESC LIMIT 10;
```

---

## SUCCESS CRITERIA

After this prompt is complete:

| Metric | Before | After |
|--------|--------|-------|
| Traceability Score | 6.5/10 | 10/10 |
| Client Party Visibility | ❌ | ✅ |
| Admin Invoice Management | ❌ | ✅ |
| Admin Document Management | ❌ | ✅ |
| Party Link Open Tracking | ❌ | ✅ |
| Document Download Tracking | ❌ | ✅ |
| Exemption Breakdown Chart | ❌ | ✅ |
| Demo Exempt Examples | ❌ | ✅ |

---

**This kills all the sharks. Execute in phases, verify after each phase.**
