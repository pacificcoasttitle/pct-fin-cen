# CURSOR PROMPT: Build Seller Forms & Validation Enhancement

## 🎯 MISSION

Complete the party portal by adding seller entity and trust forms, and enhance validation across all forms. The buyer forms already exist with comprehensive FinCEN-compliant data collection - we're copying those patterns for sellers.

**Note:** Sellers do NOT require:
- Beneficial owner collection (only buyers need this)
- Payment source tracking (sellers receive money, not pay)

Sellers DO require:
- Entity/Trust identification
- Signing individual information
- Trustee information (for trusts)
- Certification

---

## PHASE 1: SELLER ENTITY FORM

### Task 1.1: Create SellerEntityForm.tsx

**Location:** `web/components/party-portal/SellerEntityForm.tsx`

**Reference:** Copy structure from `BuyerEntityForm.tsx`

**Data to collect:**

```typescript
interface SellerEntityFormData {
  // Entity Information
  entity_name: string;
  entity_type: "llc" | "corporation" | "partnership" | "other";
  entity_type_other?: string;
  dba_name?: string;
  ein?: string;
  foreign_tax_id?: string;
  foreign_tax_country?: string;
  
  // Principal Place of Business
  business_address: {
    street: string;
    street2?: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  
  // If foreign entity with US location
  has_us_location?: boolean;
  us_location_address?: AddressData;
  
  // Signing Individual (who signs the deed)
  signing_individual: {
    first_name: string;
    middle_name?: string;
    last_name: string;
    suffix?: string;
    title: string;  // "Manager", "President", "Member", etc.
    date_of_birth: string;
    residential_address: AddressData;
    id_type: "ssn" | "itin" | "foreign_passport";
    id_number: string;
    id_jurisdiction?: string;  // For foreign passport
  };
  
  // Certification
  certification: {
    certified_at: string;
    certifier_name: string;
    certifier_title: string;
    signature_data?: string;
  };
}
```

**UI Structure:**

```
┌─────────────────────────────────────────────────────────┐
│  SELLER INFORMATION - ENTITY                            │
│  Please provide information about the selling entity    │
└─────────────────────────────────────────────────────────┘

Section 1: Entity Information
├── Entity Legal Name* [____________________]
├── Entity Type*: ○ LLC ○ Corporation ○ Partnership ○ Other
├── DBA / Trade Name [____________________]
├── Tax ID Type*: ○ EIN ○ Foreign Tax ID
├── EIN or Tax ID* [__-_______] 
└── (If foreign) Issuing Country [________▼]

Section 2: Principal Place of Business
├── Street Address* [____________________]
├── Suite/Unit [____]
├── City* [____________]
├── State* [____▼]
├── ZIP* [_____]
├── Country* [United States ▼]
│
├── (If foreign country selected)
│   Does entity have a US location? ○ Yes ○ No
│   (If yes) US Location Address: [____________________]

Section 3: Signing Individual
┌─────────────────────────────────────────────────────────┐
│  Who will sign the deed on behalf of this entity?       │
└─────────────────────────────────────────────────────────┘
├── First Name* [__________]
├── Middle Name [__________]
├── Last Name* [__________]
├── Suffix [__]
├── Title/Position* [__________] (e.g., Manager, President)
├── Date of Birth* [__/__/____]
├── Residential Address* [AddressFields component]
├── ID Type*: ○ SSN ○ ITIN ○ Foreign Passport
├── ID Number* [___-__-____]
└── (If foreign) Issuing Country [________▼]

Section 4: Certification
┌─────────────────────────────────────────────────────────┐
│  CERTIFICATION                                           │
│                                                          │
│  I certify that the information provided is accurate    │
│  and complete to the best of my knowledge.              │
│                                                          │
│  □ I agree to the above certification                   │
│                                                          │
│  Printed Name: [____________________]                   │
│  Title: [____________________]                          │
│  Date: [Auto-filled]                                    │
└─────────────────────────────────────────────────────────┘

[Save Draft]  [Submit]
```

---

### Task 1.2: Create SellerTrustForm.tsx

**Location:** `web/components/party-portal/SellerTrustForm.tsx`

**Reference:** Copy structure from `BuyerTrustForm.tsx` (simplified - no settlors/beneficiaries needed for sellers)

**Data to collect:**

```typescript
interface SellerTrustFormData {
  // Trust Information
  trust_name: string;
  trust_type: "revocable" | "irrevocable" | "other";
  trust_type_other?: string;
  date_executed: string;
  tin?: string;  // EIN or SSN
  foreign_tax_id?: string;
  foreign_tax_country?: string;
  
  // Trustees (at least one required)
  trustees: TrusteeData[];
  
  // Certification
  certification: CertificationData;
}

interface TrusteeData {
  id: string;
  type: "individual" | "entity";
  
  // If individual trustee
  individual?: {
    first_name: string;
    middle_name?: string;
    last_name: string;
    suffix?: string;
    residential_address: AddressData;
    id_type: "ssn" | "itin" | "foreign_passport";
    id_number: string;
    id_jurisdiction?: string;
  };
  
  // If entity trustee
  entity?: {
    entity_name: string;
    entity_type: string;
    ein?: string;
    foreign_id?: string;
    business_address: AddressData;
  };
}
```

**UI Structure:**

```
┌─────────────────────────────────────────────────────────┐
│  SELLER INFORMATION - TRUST                             │
│  Please provide information about the selling trust     │
└─────────────────────────────────────────────────────────┘

Section 1: Trust Information
├── Trust Name* [____________________]
│   (Full title as it appears on trust agreement)
├── Trust Type*: ○ Revocable ○ Irrevocable ○ Other
├── Date Trust Executed* [__/__/____]
├── Tax ID Type*: ○ SSN ○ EIN ○ Foreign Tax ID
├── Tax ID Number* [___________]
└── (If foreign) Issuing Country [________▼]

Section 2: Trustees
┌─────────────────────────────────────────────────────────┐
│  ⚠️ List ALL trustees of this trust                     │
│  At least one trustee is required                       │
└─────────────────────────────────────────────────────────┘

Trustee #1
├── Trustee Type*: ○ Individual ○ Entity
│
├── (If Individual)
│   ├── First Name* [__________]
│   ├── Middle Name [__________]
│   ├── Last Name* [__________]
│   ├── Residential Address* [AddressFields]
│   ├── ID Type*: ○ SSN ○ ITIN ○ Foreign Passport
│   ├── ID Number* [___________]
│   └── (If foreign) Issuing Country [________▼]
│
└── (If Entity)
    ├── Entity Name* [____________________]
    ├── Entity Type* [____▼]
    ├── EIN or Foreign ID* [___________]
    └── Business Address* [AddressFields]

[+ Add Another Trustee]

Section 3: Certification
[Same as SellerEntityForm]

[Save Draft]  [Submit]
```

---

### Task 1.3: Update Party Portal Router

**File:** Find the main party portal page (likely `web/app/party/[token]/page.tsx` or similar)

**Update the form selection logic:**

```typescript
// Determine which form to show based on party role and type
const getFormComponent = (party: PartyData) => {
  const role = party.party_role?.toLowerCase();
  const type = party.entity_type?.toLowerCase();
  
  // BUYER / TRANSFEREE
  if (role === "buyer" || role === "transferee") {
    if (type === "entity" || type === "llc" || type === "corporation" || type === "partnership") {
      return <BuyerEntityForm party={party} onSave={handleSave} onSubmit={handleSubmit} />;
    } else if (type === "trust") {
      return <BuyerTrustForm party={party} onSave={handleSave} onSubmit={handleSubmit} />;
    } else {
      return <BuyerIndividualForm party={party} onSave={handleSave} onSubmit={handleSubmit} />;
    }
  }
  
  // SELLER / TRANSFEROR
  if (role === "seller" || role === "transferor") {
    if (type === "entity" || type === "llc" || type === "corporation" || type === "partnership") {
      return <SellerEntityForm party={party} onSave={handleSave} onSubmit={handleSubmit} />;
    } else if (type === "trust") {
      return <SellerTrustForm party={party} onSave={handleSave} onSubmit={handleSubmit} />;
    } else {
      return <SellerIndividualForm party={party} onSave={handleSave} onSubmit={handleSubmit} />;
    }
  }
  
  // Fallback
  return <GenericPartyForm party={party} onSave={handleSave} onSubmit={handleSubmit} />;
};
```

---

## PHASE 2: VALIDATION ENHANCEMENT

### Task 2.1: Beneficial Owner Validation (Buyer Forms)

**File:** `web/components/party-portal/BuyerEntityForm.tsx`

**Add validation rules:**

```typescript
const validateBeneficialOwners = (owners: BeneficialOwnerData[]): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Rule 1: At least one BO required
  if (owners.length === 0) {
    errors.push("At least one beneficial owner is required");
  }
  
  // Rule 2: Check ownership percentages
  const totalOwnership = owners.reduce((sum, bo) => sum + (bo.ownership_percentage || 0), 0);
  
  if (totalOwnership > 100) {
    errors.push("Total ownership percentage cannot exceed 100%");
  }
  
  if (totalOwnership < 75 && totalOwnership > 0) {
    warnings.push(`Only ${totalOwnership}% ownership is listed. Please ensure all owners with 25%+ are included.`);
  }
  
  // Rule 3: Validate each BO
  owners.forEach((bo, index) => {
    const boNum = index + 1;
    
    // Required fields
    if (!bo.first_name) errors.push(`Beneficial Owner ${boNum}: First name is required`);
    if (!bo.last_name) errors.push(`Beneficial Owner ${boNum}: Last name is required`);
    if (!bo.date_of_birth) errors.push(`Beneficial Owner ${boNum}: Date of birth is required`);
    if (!bo.id_number) errors.push(`Beneficial Owner ${boNum}: ID number is required`);
    
    // DOB validation
    if (bo.date_of_birth) {
      const dob = new Date(bo.date_of_birth);
      const today = new Date();
      if (dob >= today) {
        errors.push(`Beneficial Owner ${boNum}: Date of birth must be in the past`);
      }
      
      const age = Math.floor((today.getTime() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      if (age < 18) {
        warnings.push(`Beneficial Owner ${boNum}: Owner appears to be under 18`);
      }
    }
    
    // SSN format validation
    if (bo.id_type === "ssn" && bo.id_number) {
      const ssnPattern = /^\d{3}-?\d{2}-?\d{4}$/;
      if (!ssnPattern.test(bo.id_number.replace(/-/g, ''))) {
        errors.push(`Beneficial Owner ${boNum}: Invalid SSN format`);
      }
    }
    
    // Ownership percentage
    if (bo.ownership_percentage !== undefined) {
      if (bo.ownership_percentage < 0 || bo.ownership_percentage > 100) {
        errors.push(`Beneficial Owner ${boNum}: Ownership percentage must be between 0 and 100`);
      }
    }
  });
  
  return { valid: errors.length === 0, errors, warnings };
};
```

### Task 2.2: Payment Source Validation (Buyer Forms)

**File:** `web/components/party-portal/BuyerEntityForm.tsx` and `BuyerTrustForm.tsx`

**Add validation rules:**

```typescript
const validatePaymentSources = (
  sources: PaymentSourceData[], 
  purchasePrice: number
): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Rule 1: At least one payment source required
  if (sources.length === 0) {
    errors.push("At least one payment source is required");
  }
  
  // Rule 2: Total should match purchase price
  const totalAmount = sources.reduce((sum, src) => sum + (src.amount || 0), 0);
  const difference = Math.abs(totalAmount - purchasePrice);
  const differencePercent = (difference / purchasePrice) * 100;
  
  if (differencePercent > 5) {
    errors.push(`Payment sources total ($${totalAmount.toLocaleString()}) differs significantly from purchase price ($${purchasePrice.toLocaleString()})`);
  } else if (differencePercent > 1) {
    warnings.push(`Payment sources total ($${totalAmount.toLocaleString()}) differs slightly from purchase price ($${purchasePrice.toLocaleString()})`);
  }
  
  // Rule 3: Validate each payment source
  sources.forEach((source, index) => {
    const srcNum = index + 1;
    
    // Amount required
    if (!source.amount || source.amount <= 0) {
      errors.push(`Payment Source ${srcNum}: Amount is required and must be positive`);
    }
    
    // Wire transfers need bank info
    if (source.payment_method === "wire") {
      if (!source.institution_name) {
        errors.push(`Payment Source ${srcNum}: Bank/institution name required for wire transfers`);
      }
    }
    
    // Third party payments need details
    if (source.is_third_party) {
      if (!source.third_party_name) {
        errors.push(`Payment Source ${srcNum}: Third party name is required`);
      }
    }
  });
  
  return { valid: errors.length === 0, errors, warnings };
};
```

### Task 2.3: Trust Date Validation

**File:** `web/components/party-portal/BuyerTrustForm.tsx` and `SellerTrustForm.tsx`

```typescript
const validateTrustDate = (
  trustDate: string, 
  closingDate?: string
): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (!trustDate) {
    errors.push("Trust execution date is required");
    return { valid: false, errors, warnings };
  }
  
  const executed = new Date(trustDate);
  const today = new Date();
  
  // Must be in the past
  if (executed >= today) {
    errors.push("Trust execution date must be in the past");
  }
  
  // Must be before closing date
  if (closingDate) {
    const closing = new Date(closingDate);
    if (executed >= closing) {
      errors.push("Trust must have been executed before the closing date");
    }
  }
  
  // Warning if very recent (potential red flag)
  const daysSinceExecution = Math.floor((today.getTime() - executed.getTime()) / (24 * 60 * 60 * 1000));
  if (daysSinceExecution < 30) {
    warnings.push("This trust was created recently (less than 30 days ago)");
  }
  
  return { valid: errors.length === 0, errors, warnings };
};
```

### Task 2.4: EIN/SSN Format Validation Utility

**File:** `web/components/party-portal/utils/validation.ts` (create if doesn't exist)

```typescript
export const validateEIN = (ein: string): boolean => {
  // EIN format: XX-XXXXXXX (9 digits, dash after 2nd digit)
  const cleaned = ein.replace(/-/g, '');
  return /^\d{9}$/.test(cleaned);
};

export const validateSSN = (ssn: string): boolean => {
  // SSN format: XXX-XX-XXXX (9 digits)
  const cleaned = ssn.replace(/-/g, '');
  if (!/^\d{9}$/.test(cleaned)) return false;
  
  // Additional checks (not starting with 000, 666, or 900-999)
  const area = parseInt(cleaned.substring(0, 3));
  if (area === 0 || area === 666 || area >= 900) return false;
  
  // Group number can't be 00
  const group = parseInt(cleaned.substring(3, 5));
  if (group === 0) return false;
  
  // Serial number can't be 0000
  const serial = parseInt(cleaned.substring(5, 9));
  if (serial === 0) return false;
  
  return true;
};

export const formatEIN = (ein: string): string => {
  const cleaned = ein.replace(/\D/g, '');
  if (cleaned.length <= 2) return cleaned;
  return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 9)}`;
};

export const formatSSN = (ssn: string): string => {
  const cleaned = ssn.replace(/\D/g, '');
  if (cleaned.length <= 3) return cleaned;
  if (cleaned.length <= 5) return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
  return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 5)}-${cleaned.slice(5, 9)}`;
};

export const maskSSN = (ssn: string): string => {
  // Show only last 4 digits: ***-**-1234
  const cleaned = ssn.replace(/\D/g, '');
  if (cleaned.length < 4) return '***-**-****';
  return `***-**-${cleaned.slice(-4)}`;
};
```

### Task 2.5: Add Validation Display Component

**File:** `web/components/party-portal/ValidationMessages.tsx`

```typescript
interface ValidationMessagesProps {
  errors: string[];
  warnings: string[];
}

export const ValidationMessages: React.FC<ValidationMessagesProps> = ({ errors, warnings }) => {
  if (errors.length === 0 && warnings.length === 0) return null;
  
  return (
    <div className="space-y-3">
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-800 font-medium mb-2">
            <AlertCircle className="h-5 w-5" />
            Please fix the following errors:
          </div>
          <ul className="list-disc list-inside text-red-700 text-sm space-y-1">
            {errors.map((error, i) => (
              <li key={i}>{error}</li>
            ))}
          </ul>
        </div>
      )}
      
      {warnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-amber-800 font-medium mb-2">
            <AlertTriangle className="h-5 w-5" />
            Please review:
          </div>
          <ul className="list-disc list-inside text-amber-700 text-sm space-y-1">
            {warnings.map((warning, i) => (
              <li key={i}>{warning}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
```

---

## PHASE 3: INTEGRATION & TESTING

### Task 3.1: Update Exports

**File:** `web/components/party-portal/index.ts`

```typescript
// Add new exports
export { SellerEntityForm } from './SellerEntityForm';
export { SellerTrustForm } from './SellerTrustForm';
export { ValidationMessages } from './ValidationMessages';
export * from './utils/validation';
```

### Task 3.2: Update Types

**File:** `web/components/party-portal/types.ts`

Ensure these types exist:
- `SellerEntityFormData`
- `SellerTrustFormData`
- `TrusteeData`
- `ValidationResult`

### Task 3.3: Test Scenarios

Create test data for:

1. **Seller LLC:**
   - Single member LLC
   - Multi-member LLC
   - Foreign LLC with US location

2. **Seller Corporation:**
   - Domestic C-Corp
   - S-Corp
   - Foreign corporation

3. **Seller Trust:**
   - Revocable trust with individual trustee
   - Irrevocable trust with entity trustee
   - Trust with multiple trustees

---

## FILES TO CREATE/MODIFY

### New Files:
```
web/components/party-portal/SellerEntityForm.tsx      # NEW
web/components/party-portal/SellerTrustForm.tsx       # NEW
web/components/party-portal/ValidationMessages.tsx    # NEW
web/components/party-portal/utils/validation.ts       # NEW (or add to existing)
```

### Modified Files:
```
web/components/party-portal/index.ts                  # Add exports
web/components/party-portal/types.ts                  # Add types
web/app/party/[token]/page.tsx                        # Update router
web/components/party-portal/BuyerEntityForm.tsx       # Add validation
web/components/party-portal/BuyerTrustForm.tsx        # Add validation
```

---

## VERIFICATION CHECKLIST

### Phase 1 Complete When:
- [ ] SellerEntityForm renders correctly
- [ ] SellerEntityForm collects all required fields
- [ ] SellerEntityForm submits successfully
- [ ] SellerTrustForm renders correctly
- [ ] SellerTrustForm supports multiple trustees
- [ ] SellerTrustForm submits successfully
- [ ] Party portal routes to correct form based on role + type
- [ ] Existing buyer forms still work

### Phase 2 Complete When:
- [ ] BO validation shows errors for missing required fields
- [ ] BO validation warns when ownership < 75%
- [ ] Payment validation compares total to purchase price
- [ ] Trust date validation checks for future dates
- [ ] SSN/EIN format validation works
- [ ] ValidationMessages component displays errors/warnings
- [ ] Forms prevent submission when errors exist
- [ ] Forms allow submission with only warnings (after confirmation)

---

## REFERENCE: Existing Components to Reuse

```
BuyerEntityForm.tsx        → Pattern for SellerEntityForm
BuyerTrustForm.tsx         → Pattern for SellerTrustForm
BeneficialOwnerCard.tsx    → NOT needed for sellers
PaymentSourceCard.tsx      → NOT needed for sellers
TrusteeCard.tsx            → Reuse for SellerTrustForm
AddressFields.tsx          → Reuse everywhere
CertificationSection.tsx   → Reuse everywhere
```

---

**Build these components following existing patterns. The infrastructure is in place - we're filling in the gaps!**
