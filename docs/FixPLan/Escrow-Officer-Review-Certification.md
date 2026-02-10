# 📋 Escrow Officer Review & Certification Before Filing

## Overview

Add a review and certification step as part of the filing process. The escrow officer must:
1. Review all party-submitted information (read-only)
2. Certify accuracy with a checkbox
3. Cannot alter party data — can only request corrections
4. Certification is stored for audit trail

**Terminology Note:** UI uses "Request" (user-facing), backend uses "Report" (internal model). Keep API endpoints as `/reports/*` but display "Request" in all user-facing text.

---

## Requirements

| Requirement | Detail |
|-------------|--------|
| Read-only data | Party-submitted info cannot be edited by escrow officer |
| Request corrections | Button to send correction request to specific party |
| Certification checkbox | Must check to enable "File" button |
| Audit trail | Store: who certified, when, IP address, checkbox states |
| Part of filing | Integrated into `file-report` step, not separate |
| Terminology | Display "Request" in UI, keep "Report" in code/API |

---

## Implementation

### Step 1: Create Review Summary Component

**File:** `web/components/wizard/ReviewCertification.tsx`

```tsx
"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { 
  Building, 
  User, 
  Users, 
  CreditCard, 
  MapPin, 
  Calendar,
  DollarSign,
  AlertCircle,
  Edit3,
  Lock,
  CheckCircle,
  FileText
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface Party {
  id: string;
  display_name: string;
  party_role: "transferee" | "transferor";
  entity_type: string;
  email: string;
  party_data?: {
    // Individual fields
    first_name?: string;
    last_name?: string;
    ssn?: string;
    date_of_birth?: string;
    address?: {
      street?: string;
      city?: string;
      state?: string;
      zip?: string;
    };
    // Entity fields
    entity_name?: string;
    ein?: string;
    entity_type?: string;
    beneficial_owners?: Array<{
      first_name: string;
      last_name: string;
      ownership_percentage: number;
      ssn?: string;
    }>;
    // Trust fields
    trust_name?: string;
    trust_ein?: string;
    trustees?: Array<{
      first_name: string;
      last_name: string;
    }>;
  };
  status: string;
}

interface PaymentSource {
  method: string;
  institution_name?: string;
  amount: number;
}

interface TransactionData {
  propertyAddress: {
    street: string;
    city: string;
    state: string;
    zip: string;
    county?: string;
  };
  closingDate: string;
  purchasePrice: number;
}

interface ReviewCertificationProps {
  transaction: TransactionData;
  buyers: Party[];
  sellers: Party[];
  paymentSources: PaymentSource[];
  reportingPerson: {
    companyName: string;
    contactName: string;
    email: string;
    phone: string;
  };
  onRequestCorrection: (partyId: string) => void;
  onCertify: (certification: CertificationData) => void;
  onBack: () => void;
  certifierName: string;
  isSubmitting?: boolean;
}

export interface CertificationData {
  certified_by_name: string;
  certified_by_email: string;
  certified_at: string;
  certification_checkboxes: {
    reviewed_transaction: boolean;
    reviewed_parties: boolean;
    reviewed_payment: boolean;
    accuracy_confirmed: boolean;
  };
  ip_address?: string;
}

export function ReviewCertification({
  transaction,
  buyers,
  sellers,
  paymentSources,
  reportingPerson,
  onRequestCorrection,
  onCertify,
  onBack,
  certifierName,
  isSubmitting = false,
}: ReviewCertificationProps) {
  const [checkboxes, setCheckboxes] = useState({
    reviewed_transaction: false,
    reviewed_parties: false,
    reviewed_payment: false,
    accuracy_confirmed: false,
  });

  const allChecked = Object.values(checkboxes).every(Boolean);

  const handleCheckbox = (key: keyof typeof checkboxes) => {
    setCheckboxes(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleCertify = () => {
    const certification: CertificationData = {
      certified_by_name: certifierName,
      certified_by_email: reportingPerson.email,
      certified_at: new Date().toISOString(),
      certification_checkboxes: checkboxes,
    };
    onCertify(certification);
  };

  const maskSSN = (ssn?: string) => {
    if (!ssn) return "Not provided";
    return `***-**-${ssn.slice(-4)}`;
  };

  const maskEIN = (ein?: string) => {
    if (!ein) return "Not provided";
    return `**-***${ein.slice(-4)}`;
  };

  const formatAddress = (addr?: { street?: string; city?: string; state?: string; zip?: string }) => {
    if (!addr) return "Not provided";
    return `${addr.street || ""}, ${addr.city || ""}, ${addr.state || ""} ${addr.zip || ""}`.trim();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <FileText className="w-8 h-8 text-blue-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Review & Certify</h1>
        <p className="text-gray-600 mt-2">
          Please review all information before filing with FinCEN
        </p>
      </div>

      {/* Read-Only Notice */}
      <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
        <Lock className="w-4 h-4 flex-shrink-0" />
        <span>
          Party-submitted information is locked. Use "Request Correction" if changes are needed.
        </span>
      </div>

      {/* Transaction Details */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <MapPin className="w-5 h-5 text-gray-500" />
              Transaction Details
            </CardTitle>
            <Badge variant="outline" className="text-green-600 border-green-200">
              <CheckCircle className="w-3 h-3 mr-1" />
              Complete
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Property Address</p>
              <p className="font-medium">{formatAddress(transaction.propertyAddress)}</p>
              {transaction.propertyAddress.county && (
                <p className="text-sm text-gray-500">County: {transaction.propertyAddress.county}</p>
              )}
            </div>
            <div className="space-y-2">
              <div>
                <p className="text-sm text-gray-500">Closing Date</p>
                <p className="font-medium">{transaction.closingDate}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Purchase Price</p>
                <p className="font-medium">{formatCurrency(transaction.purchasePrice)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Buyers */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="w-5 h-5 text-gray-500" />
            Buyer(s) / Transferee(s)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {buyers.map((buyer) => (
            <div key={buyer.id} className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  {buyer.entity_type === "individual" ? (
                    <User className="w-4 h-4 text-gray-500" />
                  ) : (
                    <Building className="w-4 h-4 text-gray-500" />
                  )}
                  <span className="font-semibold">{buyer.display_name}</span>
                  <Badge variant="secondary" className="text-xs">
                    {buyer.entity_type}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRequestCorrection(buyer.id)}
                  className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                >
                  <Edit3 className="w-4 h-4 mr-1" />
                  Request Correction
                </Button>
              </div>
              
              {buyer.party_data && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  {buyer.entity_type === "individual" ? (
                    <>
                      <div>
                        <p className="text-gray-500">SSN</p>
                        <p className="font-medium">{maskSSN(buyer.party_data.ssn)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Date of Birth</p>
                        <p className="font-medium">{buyer.party_data.date_of_birth || "Not provided"}</p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-gray-500">Address</p>
                        <p className="font-medium">{formatAddress(buyer.party_data.address)}</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <p className="text-gray-500">EIN</p>
                        <p className="font-medium">{maskEIN(buyer.party_data.ein || buyer.party_data.trust_ein)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Entity Type</p>
                        <p className="font-medium">{buyer.party_data.entity_type || buyer.entity_type}</p>
                      </div>
                      
                      {/* Beneficial Owners */}
                      {buyer.party_data.beneficial_owners && buyer.party_data.beneficial_owners.length > 0 && (
                        <div className="md:col-span-2 mt-2">
                          <p className="text-gray-500 mb-2">Beneficial Owners</p>
                          <div className="space-y-2">
                            {buyer.party_data.beneficial_owners.map((bo, idx) => (
                              <div key={idx} className="flex items-center justify-between p-2 bg-white rounded border">
                                <span className="font-medium">{bo.first_name} {bo.last_name}</span>
                                <div className="flex items-center gap-3 text-sm text-gray-500">
                                  <span>{bo.ownership_percentage}% ownership</span>
                                  <span>SSN: {maskSSN(bo.ssn)}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Trustees for trusts */}
                      {buyer.party_data.trustees && buyer.party_data.trustees.length > 0 && (
                        <div className="md:col-span-2 mt-2">
                          <p className="text-gray-500 mb-2">Trustees</p>
                          <div className="space-y-1">
                            {buyer.party_data.trustees.map((trustee, idx) => (
                              <p key={idx} className="font-medium">
                                {trustee.first_name} {trustee.last_name}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Sellers */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="w-5 h-5 text-gray-500" />
            Seller(s) / Transferor(s)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {sellers.map((seller) => (
            <div key={seller.id} className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  {seller.entity_type === "individual" ? (
                    <User className="w-4 h-4 text-gray-500" />
                  ) : (
                    <Building className="w-4 h-4 text-gray-500" />
                  )}
                  <span className="font-semibold">{seller.display_name}</span>
                  <Badge variant="secondary" className="text-xs">
                    {seller.entity_type}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRequestCorrection(seller.id)}
                  className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                >
                  <Edit3 className="w-4 h-4 mr-1" />
                  Request Correction
                </Button>
              </div>
              
              {seller.party_data && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  {seller.entity_type === "individual" ? (
                    <>
                      <div>
                        <p className="text-gray-500">SSN</p>
                        <p className="font-medium">{maskSSN(seller.party_data.ssn)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Address</p>
                        <p className="font-medium">{formatAddress(seller.party_data.address)}</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <p className="text-gray-500">EIN</p>
                        <p className="font-medium">{maskEIN(seller.party_data.ein)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Entity Type</p>
                        <p className="font-medium">{seller.party_data.entity_type || seller.entity_type}</p>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Payment Sources */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CreditCard className="w-5 h-5 text-gray-500" />
            Payment Sources
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {paymentSources.map((payment, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">{payment.method}</p>
                  {payment.institution_name && (
                    <p className="text-sm text-gray-500">{payment.institution_name}</p>
                  )}
                </div>
                <p className="font-semibold">{formatCurrency(payment.amount)}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Reporting Person */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building className="w-5 h-5 text-gray-500" />
            Reporting Person
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Company</p>
              <p className="font-medium">{reportingPerson.companyName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Contact</p>
              <p className="font-medium">{reportingPerson.contactName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="font-medium">{reportingPerson.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Phone</p>
              <p className="font-medium">{reportingPerson.phone}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Certification Section */}
      <Card className="border-2 border-blue-200 bg-blue-50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg text-blue-900">
            <CheckCircle className="w-5 h-5" />
            Certification
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox
                checked={checkboxes.reviewed_transaction}
                onCheckedChange={() => handleCheckbox("reviewed_transaction")}
                className="mt-1"
              />
              <span className="text-sm text-gray-700">
                I have reviewed the transaction details including property address, closing date, and purchase price.
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox
                checked={checkboxes.reviewed_parties}
                onCheckedChange={() => handleCheckbox("reviewed_parties")}
                className="mt-1"
              />
              <span className="text-sm text-gray-700">
                I have reviewed all buyer and seller information, including beneficial ownership details where applicable.
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox
                checked={checkboxes.reviewed_payment}
                onCheckedChange={() => handleCheckbox("reviewed_payment")}
                className="mt-1"
              />
              <span className="text-sm text-gray-700">
                I have reviewed the payment source information and confirmed it accurately reflects the transaction.
              </span>
            </label>

            <div className="border-t pt-3 mt-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <Checkbox
                  checked={checkboxes.accuracy_confirmed}
                  onCheckedChange={() => handleCheckbox("accuracy_confirmed")}
                  className="mt-1"
                />
                <span className="text-sm font-medium text-gray-900">
                  I certify that I have reviewed the above information and confirm it is accurate and complete to the best of my knowledge. I understand that this information will be submitted to FinCEN as required by federal law.
                </span>
              </label>
            </div>
          </div>

          <div className="pt-4 border-t">
            <p className="text-sm text-gray-600">
              <strong>Certified by:</strong> {certifierName}
            </p>
            <p className="text-sm text-gray-600">
              <strong>Date:</strong> {new Date().toLocaleDateString()}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack} disabled={isSubmitting}>
          ← Back to Review
        </Button>
        <Button
          onClick={handleCertify}
          disabled={!allChecked || isSubmitting}
          className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
        >
          {isSubmitting ? (
            <>Submitting...</>
          ) : (
            <>
              <CheckCircle className="w-4 h-4 mr-2" />
              Certify & File with FinCEN
            </>
          )}
        </Button>
      </div>

      {!allChecked && (
        <p className="text-center text-sm text-amber-600">
          Please check all boxes above to certify and file.
        </p>
      )}
    </div>
  );
}
```

---

### Step 2: Add Certification Storage to Database

**File:** `api/alembic/versions/20260209_add_certification_fields.py`

```python
"""Add certification fields to reports

Revision ID: 20260209_certification
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = '20260209_certification'
down_revision = None  # Update to your latest revision
branch_labels = None
depends_on = None

def upgrade():
    op.add_column('reports', sa.Column('certification_data', JSONB, nullable=True))
    op.add_column('reports', sa.Column('certified_at', sa.DateTime, nullable=True))
    op.add_column('reports', sa.Column('certified_by_user_id', sa.String(36), nullable=True))

def downgrade():
    op.drop_column('reports', 'certification_data')
    op.drop_column('reports', 'certified_at')
    op.drop_column('reports', 'certified_by_user_id')
```

---

### Step 3: Update Report Model

**File:** `api/app/models/report.py`

Add these fields:

```python
from sqlalchemy.dialects.postgresql import JSONB

class Report(Base):
    # ... existing fields ...
    
    # Certification fields
    certification_data = Column(JSONB, nullable=True)  # Stores all checkbox states, IP, etc.
    certified_at = Column(DateTime, nullable=True)
    certified_by_user_id = Column(String(36), nullable=True)
```

---

### Step 4: Add Certification Endpoint

**File:** `api/app/routes/reports.py`

```python
from pydantic import BaseModel
from typing import Dict
from datetime import datetime

class CertificationRequest(BaseModel):
    certified_by_name: str
    certified_by_email: str
    certification_checkboxes: Dict[str, bool]

@router.post("/reports/{report_id}/certify")
async def certify_report(
    report_id: UUID,
    certification: CertificationRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Certify request data before filing."""
    
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(404, "Request not found")
    
    # Verify access
    if current_user.role in ["client_admin", "client_user"]:
        if report.company_id != current_user.company_id:
            raise HTTPException(403, "Access denied")
    
    # Verify all checkboxes are checked
    required_checkboxes = [
        "reviewed_transaction",
        "reviewed_parties", 
        "reviewed_payment",
        "accuracy_confirmed"
    ]
    for checkbox in required_checkboxes:
        if not certification.certification_checkboxes.get(checkbox):
            raise HTTPException(400, f"Required certification checkbox not checked: {checkbox}")
    
    # Get client IP
    client_ip = request.headers.get("X-Forwarded-For", request.client.host)
    
    # Store certification
    report.certification_data = {
        "certified_by_name": certification.certified_by_name,
        "certified_by_email": certification.certified_by_email,
        "certified_at": datetime.utcnow().isoformat(),
        "certification_checkboxes": certification.certification_checkboxes,
        "ip_address": client_ip,
        "user_agent": request.headers.get("User-Agent"),
    }
    report.certified_at = datetime.utcnow()
    report.certified_by_user_id = str(current_user.id)
    
    db.commit()
    
    # Log audit event
    log_audit(db, report_id, current_user, "report_certified", {
        "certified_by": certification.certified_by_name,
        "ip_address": client_ip,
    })
    
    return {
        "success": True,
        "certified_at": report.certified_at.isoformat(),
        "message": "Request certified successfully"
    }
```

---

### Step 5: Update File Report Endpoint

**File:** `api/app/routes/reports.py`

Update the file endpoint to require certification:

```python
@router.post("/reports/{report_id}/file")
async def file_report(
    report_id: UUID,
    # ... existing params ...
):
    # ... existing code ...
    
    # NEW: Require certification before filing
    if not report.certified_at:
        raise HTTPException(
            400, 
            "Request must be certified before filing. Please complete the review and certification step."
        )
    
    # Check certification is recent (within last 24 hours)
    if report.certified_at:
        hours_since_cert = (datetime.utcnow() - report.certified_at).total_seconds() / 3600
        if hours_since_cert > 24:
            raise HTTPException(
                400,
                "Certification has expired. Please re-certify before filing."
            )
    
    # ... rest of existing filing logic ...
```

---

### Step 6: Integrate into Wizard

**File:** `web/components/rrer-questionnaire.tsx`

Update the `file-report` step to use the new component:

```tsx
// Add import
import { ReviewCertification, CertificationData } from "@/components/wizard/ReviewCertification"

// Add state
const [showReviewCertification, setShowReviewCertification] = useState(true)
const [isCertified, setIsCertified] = useState(false)

// Add handler
const handleCertify = async (certification: CertificationData) => {
  try {
    const response = await fetch(`/api/reports/${reportId}/certify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(certification),
    })
    
    if (!response.ok) throw new Error('Certification failed')
    
    setIsCertified(true)
    setShowReviewCertification(false)
    toast.success("Request certified successfully")
    
  } catch (error) {
    toast.error("Failed to certify request")
    console.error(error)
  }
}

// In the file-report step render:
{collectionStep === "file-report" && (
  <>
    {showReviewCertification && !isCertified ? (
      <ReviewCertification
        transaction={{
          propertyAddress: collection.propertyAddress,
          closingDate: collection.closingDate,
          purchasePrice: collection.purchasePrice,
        }}
        buyers={partyStatuses?.filter(p => p.party_role === "transferee") || []}
        sellers={partyStatuses?.filter(p => p.party_role === "transferor") || []}
        paymentSources={collection.paymentSources || []}
        reportingPerson={collection.reportingPerson}
        onRequestCorrection={(partyId) => {
          // Open correction dialog
          setSelectedPartyForCorrection(partyId)
          setShowCorrectionDialog(true)
        }}
        onCertify={handleCertify}
        onBack={() => setCollectionStep("reporting-person")}
        certifierName={user?.name || collection.reportingPerson?.contactName || "Unknown"}
      />
    ) : (
      // Existing file button UI (only shows after certification)
      <div className="text-center">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2">Request Certified</h2>
        <p className="text-gray-600 mb-6">Ready to file with FinCEN</p>
        <Button onClick={handleFileReport} disabled={isFilingReport}>
          {isFilingReport ? "Filing..." : "Submit to FinCEN"}
        </Button>
      </div>
    )}
  </>
)}
```

---

### Step 7: Add API Function

**File:** `web/lib/api.ts`

```typescript
export async function certifyReport(reportId: string, certification: {
  certified_by_name: string;
  certified_by_email: string;
  certification_checkboxes: Record<string, boolean>;
}): Promise<{ success: boolean; certified_at: string }> {
  return apiFetch(`/reports/${reportId}/certify`, {
    method: 'POST',
    body: JSON.stringify(certification),
  });
}
```

---

## Summary

| Component | Purpose |
|-----------|---------|
| `ReviewCertification.tsx` | Read-only review with certification checkboxes |
| Database migration | Store certification data, timestamp, user ID |
| `POST /reports/{id}/certify` | API to save certification with audit trail |
| Updated file endpoint | Requires certification before filing |
| Wizard integration | Shows review before final file button |

**Key Features:**
- ✅ Read-only party data (escrow officer cannot alter)
- ✅ "Request Correction" button on each party
- ✅ 4 certification checkboxes (all required)
- ✅ Stores who certified, when, IP address
- ✅ 24-hour expiration on certification
- ✅ Audit trail for compliance

---

## After Implementation

Run migration:
```bash
alembic upgrade head
```

Test flow:
1. Complete wizard to file-report step
2. See review screen with all data
3. Check all 4 boxes
4. Click "Certify & File"
5. Verify certification stored in database
