# Types & Constants

> `web/lib/rrer-types.ts` (682 lines)
> TypeScript types and constants for the questionnaire.

## Overview

This file contains all the type definitions, constants, and factory functions used by the wizard component and related forms.

---

## Phase & Step Types

### Phases

```typescript
export type Phase = 'determination' | 'collection' | 'summary'
```

### Determination Steps

```typescript
export type DeterminationStepId =
  | 'property'
  | 'intent-to-build'
  | 'financing'
  | 'buyer-type'
  | 'entity-exemptions'
  | 'trust-exemptions'
  | 'individual-exemptions'
  | 'transaction-exemptions'
  | 'determination-result'
```

### Collection Steps

```typescript
export type CollectionStepId =
  | 'transaction-property'
  | 'seller-info'
  | 'buyer-info'
  | 'beneficial-owners'
  | 'trust-details'
  | 'payment-info'
  | 'review'
```

---

## Data Types

### Address

```typescript
export interface Address {
  street: string
  unit?: string
  city: string
  state: string
  zip: string
  country: string
}
```

### IndividualInfo

```typescript
export interface IndividualInfo {
  id: string
  firstName: string
  middleName?: string
  lastName: string
  suffix?: string
  dateOfBirth?: string
  ssn?: string  // Last 4 only in most cases
  citizenship?: string
  address: Address
  phone?: string
  email?: string
}
```

### EntityInfo

```typescript
export interface EntityInfo {
  id: string
  legalName: string
  entityType: string  // llc, corporation, etc.
  tin?: string  // EIN
  formationState?: string
  formationDate?: string
  address: Address
  phone?: string
  email?: string
}
```

### TrustInfo

```typescript
export interface TrustInfo {
  id: string
  legalName: string
  trustType: string
  isRevocable: boolean
  formationDate?: string
  tin?: string
  address: Address
}
```

### BeneficialOwner

```typescript
export interface BeneficialOwner {
  id: string
  individual: IndividualInfo
  ownershipPercentage: number
  controlTypes: string[]  // voting, appointment, etc.
}
```

### Trustee

```typescript
export interface Trustee {
  id: string
  isIndividual: boolean
  individual?: IndividualInfo
  entity?: EntityInfo
}
```

### Settlor

```typescript
export interface Settlor {
  id: string
  isIndividual: boolean
  individual?: IndividualInfo
  entity?: EntityInfo
}
```

### TrustBeneficiary

```typescript
export interface TrustBeneficiary {
  id: string
  individual: IndividualInfo
  beneficiaryInterest?: string
}
```

### SigningIndividual

```typescript
export interface SigningIndividual {
  id: string
  individual: IndividualInfo
  capacity: string  // member-manager, officer, etc.
  isAgent: boolean
  agentDetails?: {
    agentName: string
    authorityDocument: string
  }
}
```

### PaymentSource

```typescript
export interface PaymentSource {
  id: string
  sourceType: string  // wire, check, cash, etc.
  amount: number
  accountType?: string
  accountLastFour?: string
  institutionName?: string
  institutionAddress?: Address
}
```

### SellerData

```typescript
export interface SellerData {
  id: string
  sellerType: 'individual' | 'entity' | 'trust'
  individual?: IndividualInfo
  entity?: EntityInfo
  trust?: TrustInfo
  signingIndividual?: SigningIndividual
}
```

### BuyerEntityData

```typescript
export interface BuyerEntityData {
  id: string
  entity: EntityInfo
  beneficialOwners: BeneficialOwner[]
  signingIndividual: SigningIndividual
}
```

### BuyerTrustData

```typescript
export interface BuyerTrustData {
  id: string
  trust: TrustInfo
  trustees: Trustee[]
  settlors: Settlor[]
  beneficiaries: TrustBeneficiary[]
}
```

---

## State Types

### DeterminationState

```typescript
export interface DeterminationState {
  isResidential?: boolean
  hasIntentToBuild?: boolean
  hasFinancing?: boolean
  financingType?: string
  buyerType?: 'individual' | 'entity' | 'trust'
  entityType?: string
  trustType?: string
  entityExemptions: string[]
  trustExemptions: string[]
  individualExemptions: string[]
  transactionExemptions: string[]
}
```

### DeterminationResult

```typescript
export interface DeterminationResult {
  isReportable: boolean
  reason?: string
  exemptionCode?: string
  exemptionReason?: string
  requiredParties: string[]
}
```

### CollectionData

```typescript
export interface CollectionData {
  property: {
    type: string
    address: Address
  } | null
  transactionDetails: {
    salePrice: number
    closingDate: string
    filingDeadline: string
  } | null
  sellers: SellerData[]
  buyers: (BuyerEntityData | BuyerTrustData | IndividualInfo)[]
  paymentSources: PaymentSource[]
  reportingPerson: ReportingPerson | null
  certification: Certification | null
}
```

### QuestionnaireState

```typescript
export interface QuestionnaireState {
  phase: Phase
  currentStep: string
  determination: DeterminationState
  determinationResult: DeterminationResult | null
  collection: CollectionData
}
```

---

## Constants

### US States

```typescript
export const US_STATES = [
  { value: 'AL', label: 'Alabama' },
  { value: 'AK', label: 'Alaska' },
  // ... all 50 states
  { value: 'WY', label: 'Wyoming' },
  { value: 'DC', label: 'District of Columbia' }
]
```

### Property Types

```typescript
export const PROPERTY_TYPES = [
  { value: '1-4_family', label: '1-4 Family Residential' },
  { value: 'condominium', label: 'Condominium' },
  { value: 'townhome', label: 'Townhome' },
  { value: 'coop', label: 'Cooperative' },
  { value: 'vacant_land', label: 'Vacant Residential Land' }
]
```

### Entity Types

```typescript
export const ENTITY_TYPES = [
  { value: 'llc', label: 'Limited Liability Company (LLC)' },
  { value: 'c_corp', label: 'C Corporation' },
  { value: 's_corp', label: 'S Corporation' },
  { value: 'general_partnership', label: 'General Partnership' },
  { value: 'limited_partnership', label: 'Limited Partnership' },
  { value: 'lp', label: 'Limited Partnership (LP)' },
  { value: 'llp', label: 'Limited Liability Partnership (LLP)' },
  { value: 'nonprofit', label: 'Nonprofit Organization' },
  { value: 'other', label: 'Other' }
]
```

### Trust Types

```typescript
export const TRUST_TYPES = [
  { value: 'revocable-living', label: 'Revocable Living Trust' },
  { value: 'irrevocable', label: 'Irrevocable Trust' },
  { value: 'testamentary', label: 'Testamentary Trust' },
  { value: 'special-needs', label: 'Special Needs Trust' },
  { value: 'charitable', label: 'Charitable Trust' },
  { value: 'other', label: 'Other Trust' }
]
```

### Payment Source Types

```typescript
export const PAYMENT_SOURCE_TYPES = [
  { value: 'wire', label: 'Wire Transfer' },
  { value: 'check', label: 'Personal/Business Check' },
  { value: 'cashiers_check', label: "Cashier's Check" },
  { value: 'cash', label: 'Cash' },
  { value: 'cryptocurrency', label: 'Cryptocurrency' },
  { value: 'other_electronic', label: 'Other Electronic' },
  { value: 'other', label: 'Other' }
]
```

### Account Types

```typescript
export const ACCOUNT_TYPES = [
  { value: 'personal_checking', label: 'Personal Checking' },
  { value: 'personal_savings', label: 'Personal Savings' },
  { value: 'business_checking', label: 'Business Checking' },
  { value: 'business_savings', label: 'Business Savings' },
  { value: 'money_market', label: 'Money Market' },
  { value: 'investment', label: 'Investment Account' },
  { value: 'other', label: 'Other' }
]
```

### Signing Capacities

```typescript
export const SIGNING_CAPACITIES = [
  { value: 'member-manager', label: 'Member-Manager (LLC)' },
  { value: 'member', label: 'Member (LLC)' },
  { value: 'officer', label: 'Officer (Corporation)' },
  { value: 'partner', label: 'Partner' },
  { value: 'trustee', label: 'Trustee' },
  { value: 'beneficiary', label: 'Beneficiary' },
  { value: 'agent', label: 'Authorized Agent' },
  { value: 'attorney-in-fact', label: 'Attorney-in-Fact' }
]
```

---

## Exemptions

### Entity Exemptions

```typescript
export const ENTITY_EXEMPTIONS = [
  { value: 'PUBLICLY_TRADED', label: 'Publicly Traded Company', description: '...' },
  { value: 'REGULATED_FINANCIAL', label: 'Regulated Financial Institution', description: '...' },
  { value: 'GOVERNMENT_ENTITY', label: 'Government Entity', description: '...' },
  { value: '501C3', label: '501(c)(3) Nonprofit', description: '...' },
  { value: 'BANK_SUBSIDIARY', label: 'Bank Subsidiary', description: '...' },
  { value: 'INSURANCE_COMPANY', label: 'Insurance Company', description: '...' },
  { value: 'SEC_INVESTMENT_COMPANY', label: 'SEC Investment Company', description: '...' },
  { value: 'VENTURE_CAPITAL', label: 'Venture Capital Fund', description: '...' },
  { value: 'CPA_FIRM', label: 'CPA Firm', description: '...' },
  { value: 'PUBLIC_UTILITY', label: 'Public Utility', description: '...' },
  { value: 'POOLED_INVESTMENT', label: 'Pooled Investment Vehicle', description: '...' },
  { value: 'TAX_EXEMPT', label: 'Tax-Exempt Entity', description: '...' },
  { value: 'EMPLOYEE_BENEFIT_PLAN', label: 'Employee Benefit Plan', description: '...' },
  { value: 'BANK_HOLDING', label: 'Bank Holding Company', description: '...' },
  { value: 'FOREIGN_POOLED', label: 'Foreign Pooled Investment', description: '...' }
]
```

### Trust Exemptions

```typescript
export const TRUST_EXEMPTIONS = [
  { value: 'STATUTORY_TRUST', label: 'Statutory Trust', description: '...' },
  { value: 'BUSINESS_TRUST', label: 'Business Trust', description: '...' },
  { value: 'COMMON_LAW_TRUST', label: 'Common Law Trust', description: '...' },
  { value: 'FOREIGN_TRUST', label: 'Foreign Trust', description: '...' }
]
```

---

## Factory Functions

### Generate ID

```typescript
export function generateId(): string {
  return Math.random().toString(36).substring(2, 15)
}
```

### Create Empty Objects

```typescript
export function createEmptyAddress(): Address {
  return {
    street: '',
    city: '',
    state: 'CA',
    zip: '',
    country: 'US'
  }
}

export function createEmptyEntity(): EntityInfo {
  return {
    id: generateId(),
    legalName: '',
    entityType: '',
    address: createEmptyAddress()
  }
}

export function createEmptyBeneficialOwner(): BeneficialOwner {
  return {
    id: generateId(),
    individual: createEmptyIndividual(),
    ownershipPercentage: 0,
    controlTypes: []
  }
}

export function createEmptyPaymentSource(): PaymentSource {
  return {
    id: generateId(),
    sourceType: '',
    amount: 0
  }
}

export function createEmptySeller(): SellerData {
  return {
    id: generateId(),
    sellerType: 'individual',
    individual: createEmptyIndividual()
  }
}
```

---

## Utility Functions

### Calculate Filing Deadline

```typescript
export function calculateFilingDeadline(
  closingDate: string,
  option: 1 | 2 = 1
): { deadline: Date; daysRemaining: number } {
  const closing = new Date(closingDate)

  let deadline: Date
  if (option === 1) {
    // Option 1: 30 days from closing
    deadline = new Date(closing)
    deadline.setDate(deadline.getDate() + 30)
  } else {
    // Option 2: Last day of following month
    deadline = new Date(closing.getFullYear(), closing.getMonth() + 2, 0)
  }

  const today = new Date()
  const diffTime = deadline.getTime() - today.getTime()
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  return { deadline, daysRemaining }
}
```

### Format Currency

```typescript
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}
```

---

## Tooltips

```typescript
export const TOOLTIPS: Record<string, string> = {
  ssn: 'Social Security Number - Last 4 digits only for security',
  ein: 'Employer Identification Number - Format: XX-XXXXXXX',
  tin: 'Taxpayer Identification Number',
  beneficialOwner: 'Individual who owns 25% or more, or exercises substantial control',
  // ... more tooltips
}
```

---

## Related Files

- **Usage:** `web/components/rrer-questionnaire.tsx`
- **API Client:** `web/lib/api.ts`
- **Backend Types:** `api/app/schemas/`
