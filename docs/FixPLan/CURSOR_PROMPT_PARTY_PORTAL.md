# CURSOR PROMPT: Enhance Party Portal with Full FinCEN Fields

## OBJECTIVE
The party portal currently has limited fields. It needs to collect ALL required FinCEN data based on the party's role and type.

The portal should be DYNAMIC - showing different forms based on:
- Party role (seller vs buyer)
- Party type (individual vs entity vs trust)

---

## CURRENT STATE

Party portal exists at `/p/[token]` but:
- Has generic/limited fields
- Doesn't collect all FinCEN required data
- Doesn't handle beneficial owners for entity buyers
- Doesn't collect payment info from buyers

---

## REQUIRED FIELDS BY PARTY TYPE

### SELLER - Individual

```
PERSONAL INFORMATION
- First Name* 
- Middle Name
- Last Name*
- Suffix (Jr., Sr., III, etc.)
- Date of Birth* (date picker, must be 18+)

IDENTIFICATION
- SSN or ITIN (masked input, format: ###-##-####)
- Citizenship Status* (dropdown):
  - U.S. Citizen
  - U.S. Resident Alien
  - Non-Resident Alien

ADDRESS AFTER CLOSING*
- Street Address*
- Unit/Apt
- City*
- State* (dropdown)
- ZIP*
- Country* (default: United States)

CONTACT
- Phone Number
- Email Address (pre-filled, read-only)

CERTIFICATION
☐ I certify that the information provided above is true, 
  complete, and accurate to the best of my knowledge.
  
Signature: [Digital signature field or typed name]
Date: [Auto-filled with current date]
```

### SELLER - Entity

```
ENTITY INFORMATION
- Entity Legal Name*
- DBA/Trade Name (if different)
- Entity Type* (dropdown):
  - LLC
  - Corporation
  - Partnership
  - Limited Partnership
  - Other (specify)
- TIN/EIN* (format: ##-#######)
- State of Formation*
- Date of Formation
- Country of Formation (default: United States)

PRINCIPAL BUSINESS ADDRESS*
- Street Address*
- City*
- State*
- ZIP*
- Country*

AUTHORIZED REPRESENTATIVE (person signing)
- Full Name*
- Title/Capacity*
- Phone Number
- Email Address

CERTIFICATION
☐ I certify that I am authorized to provide this information
  on behalf of the entity and that the information provided 
  is true, complete, and accurate.
  
Signature: [Typed name]
Date: [Auto-filled]
```

### SELLER - Trust

```
TRUST INFORMATION
- Trust Legal Name*
- Trust Type* (dropdown):
  - Revocable Living Trust
  - Irrevocable Trust
  - Land Trust
  - Other (specify)
- Date Trust Was Executed*
- TIN/EIN (if assigned)

TRUSTEE INFORMATION (acting trustee)
- Trustee Name*
- Trustee Title/Capacity*
- Phone Number
- Email Address

TRUST ADDRESS
- Street Address*
- City*
- State*
- ZIP*

CERTIFICATION
☐ I certify that I am authorized to act on behalf of the 
  trust and that the information provided is true, complete, 
  and accurate.
  
Signature: [Typed name]
Date: [Auto-filled]
```

---

### BUYER - Individual (Not Reportable - but may need info)

```
Note: Individual buyers typically don't trigger reporting,
but if they're part of a joint purchase with an entity,
we may need their info.

PERSONAL INFORMATION
- First Name*
- Middle Name
- Last Name*
- Date of Birth*

CONTACT
- Phone Number
- Email Address

CERTIFICATION
☐ I certify the above information is accurate.
```

---

### BUYER - Entity (FULL COLLECTION - This is the main case)

```
SECTION 1: ENTITY INFORMATION

Entity Details
- Entity Legal Name*
- DBA/Trade Name (if different)
- Entity Type* (dropdown):
  - LLC (Single Member)
  - LLC (Multi-Member)
  - Corporation (C-Corp)
  - Corporation (S-Corp)
  - General Partnership
  - Limited Partnership (LP)
  - Limited Liability Partnership (LLP)
  - Other (specify)
- TIN/EIN* (validate format: ##-#######)
- State/Country of Formation*
- Date of Formation*

Principal Business Address*
- Street Address*
- City*
- State*
- ZIP*
- Country*

Contact Information
- Primary Contact Name
- Phone Number*
- Email Address*

─────────────────────────────────────────────────────────

SECTION 2: BENEFICIAL OWNERS

💡 Info Box:
"List all individuals who directly or indirectly own 25% or more 
of the entity OR exercise substantial control. At least one 
beneficial owner is required.

Substantial control includes:
• Senior officers (CEO, CFO, COO, etc.)
• Those with authority over important decisions
• Anyone with similar authority"

[Beneficial Owner Cards - Dynamic, can add multiple]

┌─────────────────────────────────────────────────────────┐
│ Beneficial Owner 1                            [Remove]  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Personal Information                                    │
│ - First Name*                                           │
│ - Middle Name                                           │
│ - Last Name*                                            │
│ - Suffix                                                │
│ - Date of Birth* (date picker)                          │
│                                                         │
│ Residential Address* (NOT P.O. Box)                     │
│ - Street Address*                                       │
│ - City*                                                 │
│ - State*                                                │
│ - ZIP*                                                  │
│ - Country*                                              │
│                                                         │
│ Citizenship*                                            │
│ ○ U.S. Citizen                                          │
│ ○ U.S. Resident Alien                                   │
│ ○ Non-Resident Alien                                    │
│                                                         │
│ Identification*                                         │
│ - ID Type* (dropdown):                                  │
│   - SSN/ITIN                                            │
│   - U.S. Passport                                       │
│   - Foreign Passport (requires issuing country)         │
│   - State ID/Driver's License (requires issuing state)  │
│ - ID Number* (masked input)                             │
│ - Issuing Jurisdiction (if passport or state ID)        │
│                                                         │
│ Ownership Basis*                                        │
│ ○ Ownership Percentage: [___]% (if 25%+)                │
│ ○ Control Position:                                     │
│   ☐ Senior Officer                                      │
│   ☐ Authority over important decisions                  │
│   ☐ Other substantial control (specify)                 │
│                                                         │
└─────────────────────────────────────────────────────────┘

[+ Add Another Beneficial Owner]

Running count: "2 beneficial owners added"

─────────────────────────────────────────────────────────

SECTION 3: SIGNING INDIVIDUAL

"Who is signing on behalf of the entity for this transaction?"

- Full Legal Name*
- Title/Capacity* (e.g., Managing Member, President, Authorized Signer)
- Date of Birth*
- Residential Address*
  - Street, City, State, ZIP, Country

☐ This is the same as Beneficial Owner #[dropdown]
  (If checked, auto-fill from selected BO)

─────────────────────────────────────────────────────────

SECTION 4: PAYMENT INFORMATION

"How is this purchase being funded?"

Total Purchase Price: $[pre-filled from transaction, read-only]

Payment Sources (can add multiple):
┌─────────────────────────────────────────────────────────┐
│ Payment Source 1                              [Remove]  │
├─────────────────────────────────────────────────────────┤
│ Source Type* (dropdown):                                │
│ - Personal Funds                                        │
│ - Business Funds                                        │
│ - Gift                                                  │
│ - Loan (not from financial institution)                 │
│ - Investment/Sale Proceeds                              │
│ - Other (specify)                                       │
│                                                         │
│ Amount*: $[___________]                                 │
│                                                         │
│ Payment Method* (dropdown):                             │
│ - Wire Transfer                                         │
│ - Cashier's Check                                       │
│ - Certified Check                                       │
│ - Money Order                                           │
│ - Virtual Currency                                      │
│ - Other (specify)                                       │
│                                                         │
│ Account Information (for wire/check):                   │
│ - Financial Institution Name                            │
│ - Account Number (last 4 digits): [____]                │
│                                                         │
│ Third Party Payer? ○ Yes ○ No                           │
│ (If Yes, show additional fields for payer info)         │
└─────────────────────────────────────────────────────────┘

[+ Add Another Payment Source]

Running Total Validation:
"Total from all sources: $500,000"
"Purchase price: $500,000"
"✓ Amounts match" (or ⚠️ warning if they don't)

─────────────────────────────────────────────────────────

CERTIFICATION

☐ I certify that:
  • I am authorized to provide this information on behalf 
    of [Entity Name]
  • All information provided is true, complete, and accurate 
    to the best of my knowledge
  • All beneficial owners have been identified
  • All payment sources have been disclosed

Signature: [Full legal name typed]
Title: [Title/capacity]
Date: [Auto-filled with current date]

[Submit Information]
```

---

### BUYER - Trust

```
SECTION 1: TRUST INFORMATION

Trust Details
- Trust Legal Name*
- Trust Type* (dropdown):
  - Revocable Living Trust
  - Irrevocable Trust
  - Land Trust
  - Blind Trust
  - Charitable Trust
  - Other (specify)
- Is this trust revocable?* ○ Yes ○ No
- Date Trust Was Executed*
- TIN/EIN (if assigned)

Trust Address*
- Street Address*
- City*
- State*
- ZIP*
- Country*

─────────────────────────────────────────────────────────

SECTION 2: TRUSTEES

"Provide information for all trustees with authority over 
this transaction."

[Trustee Cards - Dynamic]

┌─────────────────────────────────────────────────────────┐
│ Trustee 1                                     [Remove]  │
├─────────────────────────────────────────────────────────┤
│ Trustee Type*: ○ Individual  ○ Entity (Corporate Trustee)│
│                                                         │
│ IF INDIVIDUAL:                                          │
│ - Full Legal Name*                                      │
│ - Date of Birth*                                        │
│ - SSN (masked)                                          │
│ - Residential Address*                                  │
│ - Citizenship*                                          │
│ - Phone Number                                          │
│ - Email Address                                         │
│                                                         │
│ IF ENTITY (Corporate Trustee):                          │
│ - Entity Legal Name*                                    │
│ - Entity Type*                                          │
│ - TIN/EIN*                                              │
│ - Business Address*                                     │
│ - Point of Contact Name*                                │
│ - Phone Number*                                         │
│ - Email Address*                                        │
└─────────────────────────────────────────────────────────┘

[+ Add Another Trustee]

─────────────────────────────────────────────────────────

SECTION 3: SETTLOR/GRANTOR

"The person(s) who created the trust."

[Settlor Cards - Dynamic]

┌─────────────────────────────────────────────────────────┐
│ Settlor/Grantor 1                             [Remove]  │
├─────────────────────────────────────────────────────────┤
│ - Full Legal Name*                                      │
│ - Date of Birth                                         │
│ - Relationship to Trust                                 │
│ - Is Settlor also a Beneficiary? ○ Yes ○ No             │
└─────────────────────────────────────────────────────────┘

[+ Add Another Settlor/Grantor]

─────────────────────────────────────────────────────────

SECTION 4: BENEFICIARIES

"List beneficiaries who have a vested interest in the 
property being acquired."

[Beneficiary Cards - Dynamic]

┌─────────────────────────────────────────────────────────┐
│ Beneficiary 1                                 [Remove]  │
├─────────────────────────────────────────────────────────┤
│ - Full Legal Name*                                      │
│ - Date of Birth                                         │
│ - Nature of Interest (e.g., "Primary beneficiary")      │
│ - Percentage Interest (if known)                        │
└─────────────────────────────────────────────────────────┘

[+ Add Another Beneficiary]

─────────────────────────────────────────────────────────

SECTION 5: PAYMENT INFORMATION

(Same as Entity Buyer - see above)

─────────────────────────────────────────────────────────

CERTIFICATION

☐ I certify that:
  • I am authorized to act on behalf of [Trust Name]
  • All information provided is true, complete, and accurate
  • All relevant trustees, settlors, and beneficiaries have 
    been identified
  • All payment sources have been disclosed

Signature: [Full legal name typed]
Title/Capacity: [Trustee, etc.]
Date: [Auto-filled]

[Submit Information]
```

---

## IMPLEMENTATION TASKS

### Task 1: Update Party Portal Page (`/p/[token]/page.tsx`)

1. Fetch party data including role and type
2. Render dynamic form based on role + type
3. Use form state management (react-hook-form)
4. Validate all required fields
5. Submit to POST /p/{token}/submit

### Task 2: Create Form Components

```
/components/party-portal/
  SellerIndividualForm.tsx
  SellerEntityForm.tsx
  SellerTrustForm.tsx
  BuyerIndividualForm.tsx
  BuyerEntityForm.tsx      ← Most complex
  BuyerTrustForm.tsx
  BeneficialOwnerCard.tsx
  PaymentSourceCard.tsx
  TrusteeCard.tsx
  CertificationSection.tsx
```

### Task 3: Update API Schema

Ensure POST /p/{token}/submit accepts comprehensive data:

```python
class PartySubmissionData(BaseModel):
    # Individual fields
    first_name: Optional[str]
    middle_name: Optional[str]
    last_name: Optional[str]
    suffix: Optional[str]
    date_of_birth: Optional[date]
    ssn_itin: Optional[str]
    citizenship: Optional[str]
    
    # Address
    address_street: Optional[str]
    address_unit: Optional[str]
    address_city: Optional[str]
    address_state: Optional[str]
    address_zip: Optional[str]
    address_country: Optional[str] = "United States"
    
    # Entity fields
    entity_name: Optional[str]
    entity_type: Optional[str]
    entity_ein: Optional[str]
    formation_state: Optional[str]
    formation_date: Optional[date]
    formation_country: Optional[str]
    
    # Trust fields
    trust_name: Optional[str]
    trust_type: Optional[str]
    trust_date: Optional[date]
    trust_ein: Optional[str]
    is_revocable: Optional[bool]
    
    # Beneficial owners (for entity buyers)
    beneficial_owners: Optional[List[BeneficialOwnerData]]
    
    # Trustees (for trust buyers)
    trustees: Optional[List[TrusteeData]]
    
    # Settlors (for trust buyers)
    settlors: Optional[List[SettlorData]]
    
    # Beneficiaries (for trust buyers)
    beneficiaries: Optional[List[BeneficiaryData]]
    
    # Signing individual
    signer_name: Optional[str]
    signer_title: Optional[str]
    signer_dob: Optional[date]
    signer_address: Optional[AddressData]
    
    # Payment (for buyers)
    payment_sources: Optional[List[PaymentSourceData]]
    
    # Certification
    certified: bool
    certification_signature: str
    certification_date: date


class BeneficialOwnerData(BaseModel):
    first_name: str
    middle_name: Optional[str]
    last_name: str
    suffix: Optional[str]
    date_of_birth: date
    address_street: str
    address_city: str
    address_state: str
    address_zip: str
    address_country: str
    citizenship: str
    id_type: str
    id_number: str
    id_jurisdiction: Optional[str]
    ownership_percentage: Optional[float]
    control_type: Optional[List[str]]


class PaymentSourceData(BaseModel):
    source_type: str
    amount: float
    payment_method: str
    institution_name: Optional[str]
    account_last_four: Optional[str]
    is_third_party: bool
    third_party_name: Optional[str]
    third_party_address: Optional[str]
```

### Task 4: UI/UX Considerations

1. **Progress indicator** - Show completion percentage
2. **Section validation** - Validate each section before proceeding
3. **Auto-save** - Save progress periodically (existing functionality)
4. **Mobile-friendly** - Large touch targets, stacked layout
5. **Help tooltips** - Explain why each field is needed
6. **Error messages** - Clear, specific validation errors
7. **Confirmation** - Show summary before final submit

### Task 5: Sensitive Data Handling

1. Mask SSN/TIN fields on input
2. Show only last 4 digits after entry
3. Never log full SSN values
4. Encrypt sensitive fields in database

---

## STYLING GUIDELINES

Match the existing app theme:
- Use shadcn/ui components
- Calm, professional colors
- Clear section headers
- Generous spacing
- Mobile-first responsive design

Landing page should be welcoming:
- Show property address prominently
- Explain why this information is needed
- Security badges/messaging
- Estimated time to complete

---

## TESTING CHECKLIST

After implementation:
1. [ ] Seller individual form works
2. [ ] Seller entity form works
3. [ ] Seller trust form works
4. [ ] Buyer entity form works with BOs
5. [ ] Buyer trust form works with trustees
6. [ ] Payment info collection works
7. [ ] Validation prevents incomplete submissions
8. [ ] Confirmation shows submitted data
9. [ ] Data saves to database correctly
10. [ ] Staff can view submitted data in wizard review step
