# 🔴 CRITICAL BUG FIXES — Must Fix Before Launch

## Overview

Six critical bugs that must be fixed immediately. Work through each systematically.

---

## Bug #1: "Start Over" Button Creates Duplicate Data

**Problem:** When a request is determined EXEMPT and user clicks "Start Over", it takes them to Step 1 of the SAME wizard/report. This overwrites the exempt determination.

**Expected:** "Start Over" should mean "Start a NEW Request" — navigate to `/app/reports/new`, not restart the current wizard.

**File:** `web/components/rrer-questionnaire.tsx`

**Find:**
```tsx
// Look for "Start Over" or "startOver" button in the exempt/determination result section
// Likely around lines 1082-1113 based on analysis
```

**Fix:**
```tsx
// WRONG - restarts same wizard
<Button onClick={() => setPhase("determination")}>
  Start Over
</Button>

// CORRECT - starts new request
<Button onClick={() => router.push("/app/reports/new")}>
  Start New Request
</Button>

// Or with confirmation:
<Button onClick={() => {
  // Current report stays as "exempt" - don't touch it
  router.push("/app/reports/new");
}}>
  Start New Request
</Button>
```

**Also:** Add a "Back to Requests" button:
```tsx
<div className="flex gap-3">
  <Button variant="outline" onClick={() => router.push("/app/requests")}>
    Back to Requests
  </Button>
  <Button onClick={() => router.push("/app/reports/new")}>
    Start New Request
  </Button>
</div>
```

---

## Bug #2: SiteX Data Not Auto-Filling

**Problem:** When address is selected via Google Places + SiteX lookup, the following fields are NOT being auto-filled:
- County
- APN (Assessor's Parcel Number)
- Legal Description
- Property Type

**Expected:** These should populate from `siteXData` returned by the property lookup API.

**File:** `web/components/rrer-questionnaire.tsx` (or wherever AddressAutocomplete is integrated)

**Find the SiteX callback:**
```tsx
// Look for onSelect or onPropertyData callback from AddressAutocomplete
// The siteXData object contains:
// - apn
// - county (or county_name)
// - legal_description
// - property_type (or use_code_description)
```

**Fix:**
```tsx
<AddressAutocomplete
  onSelect={(address, siteXData) => {
    setCollection(prev => ({
      ...prev,
      propertyAddress: {
        street: address.street,
        city: address.city,
        state: address.state,
        zip: address.zip,
        // ADD THESE:
        county: address.county || siteXData?.county || siteXData?.county_name || "",
      },
      // ADD THESE TOP-LEVEL FIELDS:
      apn: siteXData?.apn || "",
      legalDescription: siteXData?.legal_description || "",
      propertyType: siteXData?.property_type || siteXData?.use_code_description || "",
      // Store full SiteX data for reference
      siteXData: siteXData || null,
    }));
  }}
/>
```

**Also ensure the fields exist in the form:**
```tsx
// These fields should display (read-only or editable) after auto-fill:
<div className="grid grid-cols-2 gap-4">
  <div>
    <Label>County</Label>
    <Input 
      value={collection.propertyAddress?.county || ""} 
      onChange={...}
      placeholder="Auto-filled from address"
    />
  </div>
  <div>
    <Label>APN</Label>
    <Input 
      value={collection.apn || ""} 
      onChange={...}
      placeholder="Auto-filled from SiteX"
    />
  </div>
  <div className="col-span-2">
    <Label>Legal Description</Label>
    <Textarea 
      value={collection.legalDescription || ""} 
      onChange={...}
      placeholder="Auto-filled from SiteX"
    />
  </div>
</div>
```

---

## Bug #3: Certificate PDF Not Working

**Problem:** Certificate PDF shows gray page with partial content. Should use PDFShift for generation.

**Current State:** We implemented PDFShift for invoices but NOT for certificates.

**Files to check/fix:**
- `api/app/services/pdf_service.py` — Add certificate PDF generation
- `api/app/routes/reports.py` — Add certificate PDF endpoint
- `web/app/(app)/app/reports/[id]/certificate/page.tsx` — Fix download

**Backend Fix — Add to `api/app/services/pdf_service.py`:**

```python
async def generate_certificate_pdf(report: Report, db: Session) -> bytes:
    """Generate exemption certificate PDF using PDFShift."""
    
    # Build certificate HTML
    html_content = get_certificate_html(report)
    
    if not settings.pdfshift_configured:
        raise HTTPException(500, "PDF generation not configured")
    
    # Call PDFShift API
    response = requests.post(
        "https://api.pdfshift.io/v3/convert/pdf",
        auth=("api", settings.PDFSHIFT_API_KEY),
        json={
            "source": html_content,
            "landscape": False,
            "format": "Letter",
            "margin": "20mm",
        }
    )
    
    if response.status_code != 200:
        raise HTTPException(500, f"PDF generation failed: {response.text}")
    
    return response.content


def get_certificate_html(report: Report) -> str:
    """Generate HTML for exemption certificate."""
    
    wizard_data = report.wizard_data or {}
    determination = wizard_data.get("determination", {})
    collection = wizard_data.get("collection", {})
    property_addr = collection.get("propertyAddress", {})
    
    # Format address
    address_str = f"{property_addr.get('street', '')}, {property_addr.get('city', '')}, {property_addr.get('state', '')} {property_addr.get('zip', '')}"
    
    # Get exemption reason
    exemption_reason = determination.get("exemptionReason", "Transaction meets exemption criteria")
    
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body {{
                font-family: 'Helvetica Neue', Arial, sans-serif;
                max-width: 800px;
                margin: 0 auto;
                padding: 40px;
                color: #1a1a1a;
            }}
            .header {{
                text-align: center;
                border-bottom: 3px solid #0d9488;
                padding-bottom: 20px;
                margin-bottom: 30px;
            }}
            .title {{
                font-size: 28px;
                font-weight: bold;
                color: #0d9488;
                margin-bottom: 5px;
            }}
            .subtitle {{
                font-size: 14px;
                color: #666;
            }}
            .certificate-box {{
                border: 2px solid #0d9488;
                border-radius: 8px;
                padding: 30px;
                margin: 30px 0;
                background: #f0fdfa;
            }}
            .certificate-title {{
                font-size: 24px;
                font-weight: bold;
                text-align: center;
                color: #0d9488;
                margin-bottom: 20px;
            }}
            .field {{
                margin-bottom: 15px;
            }}
            .field-label {{
                font-size: 12px;
                color: #666;
                text-transform: uppercase;
                margin-bottom: 3px;
            }}
            .field-value {{
                font-size: 16px;
                font-weight: 500;
            }}
            .exemption-reason {{
                background: white;
                border: 1px solid #0d9488;
                border-radius: 4px;
                padding: 15px;
                margin-top: 20px;
            }}
            .footer {{
                margin-top: 40px;
                padding-top: 20px;
                border-top: 1px solid #ddd;
                font-size: 12px;
                color: #666;
                text-align: center;
            }}
            .generated-date {{
                margin-top: 30px;
                font-size: 12px;
                color: #666;
            }}
        </style>
    </head>
    <body>
        <div class="header">
            <div class="title">FinClear</div>
            <div class="subtitle">FinCEN Compliance Platform</div>
        </div>
        
        <div class="certificate-box">
            <div class="certificate-title">Certificate of Exemption</div>
            
            <div class="field">
                <div class="field-label">Property Address</div>
                <div class="field-value">{address_str}</div>
            </div>
            
            <div class="field">
                <div class="field-label">Escrow Number</div>
                <div class="field-value">{report.escrow_number or 'N/A'}</div>
            </div>
            
            <div class="field">
                <div class="field-label">Determination Date</div>
                <div class="field-value">{report.updated_at.strftime('%B %d, %Y') if report.updated_at else 'N/A'}</div>
            </div>
            
            <div class="exemption-reason">
                <div class="field-label">Exemption Reason</div>
                <div class="field-value">{exemption_reason}</div>
            </div>
        </div>
        
        <p>This certificate confirms that the above-referenced real estate transaction has been reviewed and determined to be <strong>exempt</strong> from FinCEN reporting requirements under the applicable regulations.</p>
        
        <p>This determination was made based on information provided at the time of review. If material facts change, a new determination may be required.</p>
        
        <div class="generated-date">
            Generated: {datetime.utcnow().strftime('%B %d, %Y at %I:%M %p UTC')}
        </div>
        
        <div class="footer">
            This certificate is for record-keeping purposes only and does not constitute legal advice.
        </div>
    </body>
    </html>
    """
```

**Add API endpoint — `api/app/routes/reports.py`:**

```python
@router.get("/reports/{report_id}/certificate/pdf")
async def get_certificate_pdf(
    report_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Download exemption certificate as PDF."""
    
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(404, "Report not found")
    
    # Verify access
    if current_user.role in ["client_user", "client_admin"]:
        if report.company_id != current_user.company_id:
            raise HTTPException(403, "Access denied")
    
    # Verify report is exempt
    if report.status != "exempt":
        raise HTTPException(400, "Certificate only available for exempt reports")
    
    # Generate PDF
    from app.services.pdf_service import generate_certificate_pdf
    pdf_bytes = await generate_certificate_pdf(report, db)
    
    # Return PDF
    filename = f"exemption-certificate-{report.escrow_number or report_id}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
```

**Frontend Fix — `web/app/(app)/app/reports/[id]/certificate/page.tsx`:**

```tsx
const handleDownloadPDF = async () => {
  setDownloading(true);
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/reports/${reportId}/certificate/pdf`,
      {
        credentials: "include",
      }
    );
    
    if (!response.ok) {
      throw new Error("Failed to generate PDF");
    }
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `exemption-certificate-${escrowNumber || reportId}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    toast.success("Certificate downloaded");
  } catch (error) {
    toast.error("Failed to download certificate");
    console.error(error);
  } finally {
    setDownloading(false);
  }
};
```

---

## Bug #4: Seller Entity Type Question Order Wrong

**Problem:** Currently asks for name/email FIRST, then entity type. Should ask entity type FIRST so the correct form fields display.

**File:** `web/components/rrer-questionnaire.tsx` (Seller Info Section, lines ~1234-1508)

**Current (Wrong) Flow:**
```
1. "Enter seller name" (but what type of name? individual? company?)
2. "Enter email"
3. "What type of seller?" ← Too late!
```

**Correct Flow:**
```
1. "What type of seller?" (Individual / Entity / Trust)
2. Show appropriate fields based on selection
```

**Fix:**

```tsx
// Seller section should START with type selection
{collection.sellers?.map((seller, index) => (
  <Card key={seller.id}>
    <CardContent className="p-4 space-y-4">
      {/* STEP 1: Type Selection FIRST */}
      <div>
        <Label className="text-base font-medium">
          Seller {index + 1} Type
        </Label>
        <div className="grid grid-cols-3 gap-2 mt-2">
          {[
            { value: "individual", label: "Individual", icon: User },
            { value: "entity", label: "Entity/Company", icon: Building },
            { value: "trust", label: "Trust", icon: FileText },
          ].map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => updateSeller(seller.id, { entityType: type.value })}
              className={cn(
                "flex flex-col items-center gap-2 p-4 border rounded-lg transition-all",
                seller.entityType === type.value
                  ? "border-teal-500 bg-teal-50 text-teal-700"
                  : "border-gray-200 hover:border-gray-300"
              )}
            >
              <type.icon className="w-5 h-5" />
              <span className="text-sm font-medium">{type.label}</span>
            </button>
          ))}
        </div>
      </div>
      
      {/* STEP 2: Show fields ONLY after type is selected */}
      {seller.entityType && (
        <>
          {/* Email (common to all types) */}
          <div>
            <Label>Email Address</Label>
            <Input
              type="email"
              value={seller.email || ""}
              onChange={(e) => updateSeller(seller.id, { email: e.target.value })}
              placeholder="seller@email.com"
            />
            <p className="text-xs text-gray-500 mt-1">
              Portal link will be sent to this address
            </p>
          </div>
          
          {/* Individual fields */}
          {seller.entityType === "individual" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>First Name</Label>
                <Input
                  value={seller.firstName || ""}
                  onChange={(e) => updateSeller(seller.id, { firstName: e.target.value })}
                />
              </div>
              <div>
                <Label>Last Name</Label>
                <Input
                  value={seller.lastName || ""}
                  onChange={(e) => updateSeller(seller.id, { lastName: e.target.value })}
                />
              </div>
            </div>
          )}
          
          {/* Entity fields */}
          {seller.entityType === "entity" && (
            <div>
              <Label>Entity/Company Name</Label>
              <Input
                value={seller.entityName || ""}
                onChange={(e) => updateSeller(seller.id, { entityName: e.target.value })}
                placeholder="ABC Holdings LLC"
              />
            </div>
          )}
          
          {/* Trust fields */}
          {seller.entityType === "trust" && (
            <div>
              <Label>Trust Name</Label>
              <Input
                value={seller.trustName || ""}
                onChange={(e) => updateSeller(seller.id, { trustName: e.target.value })}
                placeholder="Smith Family Trust"
              />
            </div>
          )}
        </>
      )}
    </CardContent>
  </Card>
))}
```

**Apply same pattern to Buyer section if not already done.**

---

## Bug #5: Send Party Links Button Broken (400 Error)

**Problem:** Clicking "Send Party Links" does nothing. Console shows:
```
POST /reports/{id}/party-links → 400 Bad Request
```

**Debug Steps:**

### Step 1: Check the API endpoint

**File:** `api/app/routes/reports.py`

Find the `/reports/{report_id}/party-links` endpoint and check:

```python
@router.post("/reports/{report_id}/party-links")
async def create_party_links(
    report_id: UUID,
    request: PartyLinksRequest,  # ← What does this schema expect?
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
```

**Check the schema:**
```python
class PartyLinksRequest(BaseModel):
    party_ids: List[str]  # or List[UUID]?
    # What fields are required?
```

### Step 2: Check the frontend request

**File:** `web/lib/api.ts` or wherever `createPartyLinks` is defined

```typescript
// What is being sent?
export async function createPartyLinks(reportId: string, partyIds: string[]) {
  const response = await fetch(`${API_URL}/reports/${reportId}/party-links`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ party_ids: partyIds }),  // ← Match backend schema
  });
  
  if (!response.ok) {
    const error = await response.json();
    console.error("Party links error:", error);  // ← Add this for debugging
    throw new Error(error.detail || "Failed to create party links");
  }
  
  return response.json();
}
```

### Step 3: Check the wizard handler

**File:** `web/components/rrer-questionnaire.tsx`

```typescript
const handleSendLinks = async () => {
  // What parties are being selected?
  console.log("Sending links for parties:", selectedParties);
  
  // Are there actually parties to send?
  if (!selectedParties || selectedParties.length === 0) {
    toast.error("No parties selected");
    return;
  }
  
  try {
    const response = await createPartyLinks(reportId, selectedParties);
    // ...
  } catch (error) {
    console.error("Send links error:", error);
    toast.error("Failed to send links");
  }
};
```

### Likely Issue: Parties Not Being Created First

The 400 error likely means the parties don't exist in the database yet. The flow should be:

1. **Create/update parties in database** (POST /reports/{id}/parties)
2. **Then create links for those parties** (POST /reports/{id}/party-links)

**Check if parties are being saved:**

```python
# In the party-links endpoint, add validation:
@router.post("/reports/{report_id}/party-links")
async def create_party_links(...):
    # Check parties exist
    for party_id in request.party_ids:
        party = db.query(ReportParty).filter(
            ReportParty.id == party_id,
            ReportParty.report_id == report_id
        ).first()
        
        if not party:
            raise HTTPException(400, f"Party {party_id} not found. Save parties first.")
```

**Fix — Ensure parties are saved before sending links:**

```typescript
const handleSendLinks = async () => {
  try {
    // STEP 1: Save/sync parties to database first
    await saveParties(reportId, collection.sellers, collection.buyerEntity, collection.buyerTrust);
    
    // STEP 2: Now create links
    const response = await createPartyLinks(reportId, partyIds);
    
    toast.success("Links sent successfully");
  } catch (error) {
    console.error(error);
    toast.error("Failed to send links");
  }
};
```

---

## Bug #6: Sales Price Not Being Collected

**Problem:** The wizard does not have a field for sales price / purchase price.

**This is REQUIRED for RERX XML filing.** The field `TotalConsiderationPaidAmountText` comes from this.

**File:** `web/components/rrer-questionnaire.tsx` (Transaction/Property section)

**Add the field:**

```tsx
// In the transaction-property step (around lines 1115-1232)
<div className="space-y-4">
  {/* Property Address */}
  <AddressAutocomplete ... />
  
  {/* ADD: Sales Price */}
  <div>
    <Label htmlFor="purchasePrice" className="text-base font-medium">
      Sales Price / Purchase Price *
    </Label>
    <div className="relative mt-1">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
      <Input
        id="purchasePrice"
        type="text"
        inputMode="numeric"
        value={collection.purchasePrice ? formatNumberWithCommas(collection.purchasePrice) : ""}
        onChange={(e) => {
          // Remove commas and non-numeric chars, parse as number
          const value = e.target.value.replace(/[^0-9]/g, "");
          setCollection(prev => ({
            ...prev,
            purchasePrice: value ? parseInt(value, 10) : null
          }));
        }}
        placeholder="1,500,000"
        className="pl-8"
      />
    </div>
    <p className="text-xs text-gray-500 mt-1">
      Total consideration paid for the property
    </p>
  </div>
  
  {/* Closing Date */}
  <div>
    <Label htmlFor="closingDate">Closing Date *</Label>
    <Input
      id="closingDate"
      type="date"
      value={collection.closingDate || ""}
      onChange={(e) => setCollection(prev => ({ ...prev, closingDate: e.target.value }))}
    />
  </div>
</div>
```

**Add helper function if not present:**

```typescript
function formatNumberWithCommas(num: number): string {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
```

**Ensure the field is in the type definition:**

**File:** `web/lib/rrer-types.ts`

```typescript
interface CollectionData {
  propertyAddress: AddressData;
  purchasePrice: number | null;  // ← Must exist
  closingDate: string;
  // ...
}
```

---

## Verification Checklist

After fixing all bugs, verify:

- [ ] Bug #1: "Start Over" on exempt goes to `/app/reports/new`, not same wizard
- [ ] Bug #2: County, APN, Legal Description auto-fill from SiteX
- [ ] Bug #3: Certificate PDF downloads correctly using PDFShift
- [ ] Bug #4: Seller type selection appears FIRST, then appropriate fields
- [ ] Bug #5: "Send Party Links" works (no 400 error)
- [ ] Bug #6: Sales Price field exists and saves correctly

---

## Priority Order

1. **Bug #5** — Send Party Links (blocking all party portal testing)
2. **Bug #6** — Sales Price (required for XML filing)
3. **Bug #4** — Seller type order (UX issue)
4. **Bug #2** — SiteX auto-fill (UX issue)
5. **Bug #1** — Start Over button (UX issue)
6. **Bug #3** — Certificate PDF (nice to have for exempt)

Fix #5 and #6 first — they're blocking critical functionality.
