# Integrate Exemption Certificate into Wizard

## Goal

When the wizard determines "No FinCEN Report Required" (exempt), replace the basic page print with the formal ExemptionCertificate component. Users get a professional PDF certificate they can save for their records.

---

## Current State

| Location | What Happens | Quality |
|----------|--------------|---------|
| Wizard (exempt result) | `window.print()` prints whole page | ❌ Unprofessional |
| Requests page (exempt) | Opens ExemptionCertificate in dialog | ✅ Professional |

**Gap:** The good certificate exists but isn't connected to the wizard flow.

---

## Files to Work With

```bash
# The certificate component (already exists)
cat web/components/exemption/ExemptionCertificate.tsx

# The wizard component (needs integration)
cat web/components/rrer-questionnaire.tsx

# Find where exempt result is shown in wizard
grep -n "exempt\|Exempt\|No FinCEN\|not required" web/components/rrer-questionnaire.tsx | head -30

# See how requests page uses the certificate
grep -n "ExemptionCertificate" web/app/\(app\)/app/requests/page.tsx
```

---

## Step 1: Understand the Certificate Component

### Examine the interface

```bash
# See what props ExemptionCertificate expects
grep -A30 "interface\|Props\|type.*Certificate" web/components/exemption/ExemptionCertificate.tsx
```

**Expected props (verify):**

```typescript
interface ExemptionCertificateProps {
  certificateNumber: string;
  propertyAddress: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  purchasePrice: number;
  buyerName: string;
  escrowNumber?: string;
  exemptionReasons: string[];
  determinationDate: Date;
  determinationMethod: string;
}
```

---

## Step 2: Find the Exempt Result in Wizard

### Locate where "exempt" outcome is displayed

```bash
# Find the exempt result card/section
grep -B5 -A20 "No FinCEN\|not required\|exempt" web/components/rrer-questionnaire.tsx | head -60

# Find the print button
grep -B5 -A10 "print\|Print" web/components/rrer-questionnaire.tsx
```

**Look for something like:**

```tsx
{determinationResult === "exempt" && (
  <div className="bg-green-50 ...">
    <h2>No FinCEN Report Required</h2>
    <p>Based on your answers...</p>
    <Button onClick={() => window.print()}>Print</Button>  {/* ← Replace this */}
  </div>
)}
```

---

## Step 3: Map Wizard Data to Certificate Props

### Data available in wizard

The wizard has `wizardData` with this structure:

```typescript
wizardData: {
  determination: {
    result: "exempt" | "reportable";
    exemptionReasons: string[];  // e.g., ["financing_involved", "buyer_is_individual"]
    completedAt: string;
  };
  collection: {
    propertyAddress: { street, city, state, zip };
    purchasePrice: number;
    closingDate: string;
    escrowNumber?: string;
  };
}
```

### Map to certificate props

```typescript
// In the wizard, when showing exempt result:

const certificateData = {
  certificateNumber: generateCertificateNumber(report.id),  // or use report.exemption_certificate_id
  propertyAddress: wizardData.collection.propertyAddress,
  purchasePrice: wizardData.collection.purchasePrice,
  buyerName: getBuyerName(wizardData),  // Extract from buyer data
  escrowNumber: wizardData.collection.escrowNumber,
  exemptionReasons: wizardData.determination.exemptionReasons,
  determinationDate: new Date(wizardData.determination.completedAt),
  determinationMethod: "FinClear Wizard",
};
```

### Helper to generate certificate number

```typescript
function generateCertificateNumber(reportId: string): string {
  // Format: RRER-XXXXXX-YYYYYY
  const hash = reportId.replace(/-/g, '').slice(0, 12).toUpperCase();
  return `RRER-${hash.slice(0, 6)}-${hash.slice(6, 12)}`;
}
```

### Helper to extract buyer name

```typescript
function getBuyerName(wizardData: WizardData): string {
  const buyer = wizardData.collection;
  
  // Individual buyer
  if (buyer.buyerIndividual) {
    const { firstName, lastName } = buyer.buyerIndividual;
    return `${firstName} ${lastName}`.trim();
  }
  
  // Entity buyer
  if (buyer.buyerEntity?.entity?.legalName) {
    return buyer.buyerEntity.entity.legalName;
  }
  
  // Trust buyer
  if (buyer.buyerTrust?.trust?.trustName) {
    return buyer.buyerTrust.trust.trustName;
  }
  
  return "Unknown Buyer";
}
```

---

## Step 4: Integrate Certificate into Wizard

### Option A: Replace print button with certificate dialog

```tsx
// In rrer-questionnaire.tsx

import { ExemptionCertificate } from "@/components/exemption/ExemptionCertificate";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

// Inside the exempt result section:
{determinationResult === "exempt" && (
  <Card className="bg-green-50 border-green-200">
    <CardHeader>
      <div className="flex items-center gap-3">
        <CheckCircle className="w-8 h-8 text-green-600" />
        <CardTitle className="text-green-800">
          No FinCEN Report Required
        </CardTitle>
      </div>
    </CardHeader>
    
    <CardContent>
      <p className="text-green-700 mb-4">
        Based on your answers, this transaction is exempt from FinCEN reporting.
      </p>
      
      <div className="bg-white rounded-lg p-4 mb-6">
        <h4 className="font-medium mb-2">Exemption Reasons:</h4>
        <ul className="space-y-1">
          {exemptionReasons.map((reason) => (
            <li key={reason} className="flex items-center gap-2 text-sm">
              <Check className="w-4 h-4 text-green-600" />
              {formatExemptionReason(reason)}
            </li>
          ))}
        </ul>
      </div>
      
      {/* Certificate Dialog */}
      <Dialog>
        <DialogTrigger asChild>
          <Button className="w-full bg-green-600 hover:bg-green-700">
            <FileText className="w-4 h-4 mr-2" />
            View & Print Exemption Certificate
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <ExemptionCertificate
            certificateNumber={generateCertificateNumber(report.id)}
            propertyAddress={wizardData.collection.propertyAddress}
            purchasePrice={wizardData.collection.purchasePrice}
            buyerName={getBuyerName(wizardData)}
            escrowNumber={wizardData.collection.escrowNumber}
            exemptionReasons={exemptionReasons}
            determinationDate={new Date()}
            determinationMethod="FinClear Wizard"
          />
        </DialogContent>
      </Dialog>
      
      <p className="text-sm text-green-600 mt-4 text-center">
        💾 Save this certificate for your records. Retain for 5 years.
      </p>
    </CardContent>
  </Card>
)}
```

### Option B: Navigate to dedicated certificate page

```tsx
// Create a new page: web/app/(app)/app/reports/[id]/certificate/page.tsx

// In wizard, on exempt result:
<Button onClick={() => router.push(`/app/reports/${reportId}/certificate`)}>
  View Exemption Certificate
</Button>
```

**Recommendation: Option A (Dialog)** — keeps user in wizard context, immediate access.

---

## Step 5: Format Exemption Reasons

### Create a mapping for human-readable reasons

```typescript
// web/lib/exemption-reasons.ts

export const EXEMPTION_REASON_LABELS: Record<string, string> = {
  // Financing exemptions
  "financing_involved": "Transaction involves financing from a financial institution",
  "mortgage_present": "Mortgage or deed of trust is being recorded",
  
  // Buyer type exemptions
  "buyer_is_individual": "Buyer is an individual (natural person), not an entity or trust",
  "buyer_is_public_company": "Buyer is a publicly traded company",
  "buyer_is_bank": "Buyer is a bank or financial institution",
  "buyer_is_government": "Buyer is a government entity",
  "buyer_is_nonprofit": "Buyer is a registered 501(c) nonprofit organization",
  "buyer_is_insurance": "Buyer is a regulated insurance company",
  "buyer_is_registered_investment": "Buyer is a registered investment company",
  "buyer_is_securities_broker": "Buyer is a registered securities broker/dealer",
  
  // Property type exemptions
  "commercial_property": "Property is commercial, not residential",
  "property_over_threshold": "Property does not meet reporting thresholds",
  
  // Trust exemptions
  "revocable_trust": "Buyer is a revocable trust",
  "trust_all_us_persons": "All trust beneficiaries are U.S. persons",
  
  // Transaction exemptions
  "under_300k": "Purchase price is under $300,000",
  "foreclosure": "Transaction is a foreclosure sale",
  "court_ordered": "Transaction is court-ordered",
};

export function formatExemptionReason(code: string): string {
  return EXEMPTION_REASON_LABELS[code] || code.replace(/_/g, ' ');
}
```

---

## Step 6: Persist Certificate Data

### Save certificate info when determination completes

When the wizard determines "exempt," save the certificate details to the database:

```python
# api/app/routes/reports.py (or wizard endpoint)

# When determination is "exempt":
report.exemption_certificate_id = generate_certificate_id()
report.determination_result = "exempt"
report.determination_completed_at = datetime.utcnow()
report.exemption_reasons = exemption_reasons  # JSONB array
db.commit()
```

### Certificate ID generation (backend)

```python
# api/app/services/certificate_service.py

import hashlib
from datetime import datetime

def generate_certificate_id(report_id: str) -> str:
    """Generate a unique, verifiable certificate ID."""
    # Format: RRER-XXXXXX-YYYYYY
    # Using report_id + timestamp for uniqueness
    seed = f"{report_id}-{datetime.utcnow().isoformat()}"
    hash_value = hashlib.sha256(seed.encode()).hexdigest()[:12].upper()
    return f"RRER-{hash_value[:6]}-{hash_value[6:12]}"
```

---

## Step 7: Update ExemptionCertificate Component (if needed)

### Verify it has all needed features

```bash
# Check current implementation
cat web/components/exemption/ExemptionCertificate.tsx
```

**Ensure it includes:**

- [ ] Certificate number prominently displayed
- [ ] Property address
- [ ] Purchase price
- [ ] Buyer name
- [ ] Escrow number (if provided)
- [ ] List of exemption reasons with checkmarks
- [ ] Determination date and time
- [ ] Determination method
- [ ] "Retain for 5 years" notice
- [ ] FinClear branding/logo
- [ ] Print button
- [ ] Download PDF button (or print-to-PDF instructions)
- [ ] Print-specific CSS (@media print)

### Add download as PDF functionality (if missing)

```tsx
// In ExemptionCertificate.tsx

const handleDownloadPDF = () => {
  // Option 1: Browser print dialog (save as PDF)
  window.print();
  
  // Option 2: Use html2pdf library (if installed)
  // import html2pdf from 'html2pdf.js';
  // const element = document.getElementById('exemption-certificate');
  // html2pdf().from(element).save(`exemption-certificate-${certificateNumber}.pdf`);
};

// In the component:
<div className="flex gap-4 print:hidden">
  <Button onClick={() => window.print()}>
    <Printer className="w-4 h-4 mr-2" />
    Print Certificate
  </Button>
  <Button variant="outline" onClick={handleDownloadPDF}>
    <Download className="w-4 h-4 mr-2" />
    Save as PDF
  </Button>
</div>
```

---

## Step 8: Add Print Styles

### Ensure certificate prints cleanly

```css
/* In the ExemptionCertificate component or globals.css */

@media print {
  /* Hide everything except certificate */
  body * {
    visibility: hidden;
  }
  
  #exemption-certificate,
  #exemption-certificate * {
    visibility: visible;
  }
  
  #exemption-certificate {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
  }
  
  /* Hide buttons in print */
  .print\\:hidden {
    display: none !important;
  }
  
  /* Ensure colors print */
  .bg-green-50 {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
```

---

## Step 9: Test the Integration

### Test flow

1. Log in as client_user
2. Start new report
3. Enter property details
4. Select buyer type = "Individual" (should trigger exempt)
5. Complete determination
6. **Should see:** "No FinCEN Report Required" with certificate button
7. Click "View & Print Exemption Certificate"
8. **Should see:** Professional certificate in dialog
9. Click "Print" — should print just the certificate
10. Click "Save as PDF" — should save clean PDF

### Verify certificate content

- [ ] Certificate number is unique and displayed
- [ ] Property address matches what was entered
- [ ] Purchase price is formatted correctly
- [ ] Buyer name is populated
- [ ] Exemption reasons are listed with human-readable labels
- [ ] Date/time is accurate
- [ ] FinClear branding is present
- [ ] "Retain for 5 years" notice is visible

---

## Summary: Files to Modify

| File | Action |
|------|--------|
| `web/components/rrer-questionnaire.tsx` | Add certificate dialog to exempt result |
| `web/components/exemption/ExemptionCertificate.tsx` | Verify/enhance as needed |
| `web/lib/exemption-reasons.ts` | Create (if doesn't exist) reason labels |
| `web/lib/utils.ts` or new file | Add certificate number generator |
| `api/app/routes/reports.py` | Save certificate ID on exempt determination |
| `api/app/services/certificate_service.py` | Backend certificate ID generation |

---

## User Experience After Integration

```
Client completes wizard
         ↓
    Determination: EXEMPT
         ↓
┌─────────────────────────────────────────┐
│  ✅ No FinCEN Report Required           │
│                                         │
│  This transaction is exempt because:    │
│  • Buyer is an individual               │
│  • [other reasons...]                   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  📄 View & Print Certificate    │   │
│  └─────────────────────────────────┘   │
│                                         │
│  💾 Save for your records (5 years)    │
└─────────────────────────────────────────┘
         ↓
    [Click Certificate Button]
         ↓
┌─────────────────────────────────────────┐
│         EXEMPTION CERTIFICATE           │
│           RRER-A1B2C3-D4E5F6           │
│                                         │
│  Property: 123 Main St, City, CA 90210 │
│  Buyer: John Smith                      │
│  Price: $450,000                        │
│  Escrow: 12345-ABC                      │
│                                         │
│  Exempt Reasons:                        │
│  ✓ Buyer is an individual              │
│                                         │
│  Determined: Feb 9, 2026 at 2:30 PM    │
│  Method: FinClear Wizard                │
│                                         │
│  ⚠️ Retain this certificate for 5 years│
│                                         │
│  [🖨 Print]  [💾 Save PDF]              │
│                                         │
│           FinClear.com                  │
└─────────────────────────────────────────┘
```

This gives escrow officers **defensible documentation** of their compliance decision.
