// Party Portal Types

export interface AddressData {
  street: string
  unit?: string
  city: string
  state: string
  zip: string
  country: string
}

export interface BeneficialOwnerData {
  id: string
  first_name: string
  middle_name?: string
  last_name: string
  suffix?: string
  date_of_birth: string
  address: AddressData
  citizenship: "us_citizen" | "us_resident_alien" | "non_resident_alien"
  id_type: "ssn" | "passport_us" | "passport_foreign" | "state_id"
  id_number: string
  id_jurisdiction?: string
  ownership_percentage?: number
  control_type?: ("senior_officer" | "authority_decisions" | "other")[]
  control_other?: string
}

export interface PaymentSourceData {
  id: string
  source_type: "personal_funds" | "business_funds" | "gift" | "loan" | "investment" | "other"
  source_other?: string
  amount: number
  payment_method: "wire" | "cashiers_check" | "certified_check" | "money_order" | "virtual_currency" | "other"
  method_other?: string
  institution_name?: string
  account_last_four?: string
  is_third_party: boolean
  third_party_name?: string
  third_party_address?: string
}

export interface TrusteeData {
  id: string
  type: "individual" | "entity"
  // Individual fields
  full_name?: string
  date_of_birth?: string
  ssn?: string
  citizenship?: string
  address?: AddressData
  phone?: string
  email?: string
  // Entity fields
  entity_name?: string
  entity_type?: string
  ein?: string
  business_address?: AddressData
  contact_name?: string
  contact_phone?: string
  contact_email?: string
}

export interface SettlorData {
  id: string
  full_name: string
  date_of_birth?: string
  relationship?: string
  is_beneficiary: boolean
}

export interface BeneficiaryData {
  id: string
  full_name: string
  date_of_birth?: string
  interest_nature?: string
  percentage_interest?: number
}

// Main party submission data that covers all party types
export interface PartySubmissionData {
  // Individual fields
  first_name?: string
  middle_name?: string
  last_name?: string
  suffix?: string
  date_of_birth?: string
  ssn?: string
  citizenship?: "us_citizen" | "us_resident_alien" | "non_resident_alien"
  id_type?: string
  id_number?: string
  id_jurisdiction?: string
  
  // Address
  address?: AddressData
  
  // Contact
  phone?: string
  email?: string
  
  // Entity fields
  entity_name?: string
  entity_dba?: string
  entity_type?: string
  ein?: string
  formation_state?: string
  formation_date?: string
  formation_country?: string
  
  // Trust fields
  trust_name?: string
  trust_type?: string
  trust_date?: string
  trust_ein?: string
  is_revocable?: boolean
  
  // Authorized representative / signing individual
  signer_name?: string
  signer_title?: string
  signer_dob?: string
  signer_address?: AddressData
  signer_is_bo?: string // Reference to BO id if same
  
  // Beneficial owners (for entity buyers)
  beneficial_owners?: BeneficialOwnerData[]
  
  // Trustees (for trust buyers)
  trustees?: TrusteeData[]
  
  // Settlors (for trust buyers)
  settlors?: SettlorData[]
  
  // Beneficiaries (for trust buyers)
  beneficiaries?: BeneficiaryData[]
  
  // Payment (for buyers)
  payment_sources?: PaymentSourceData[]
  
  // Certification
  certified: boolean
  certification_signature: string
  certification_date: string
}

export interface PartyPortalProps {
  token: string
  partyRole: "transferee" | "transferor" | "beneficial_owner"
  entityType: "individual" | "entity" | "trust"
  propertyAddress?: string
  closingDate?: string
  purchasePrice?: number
  displayName?: string
  email?: string
  initialData?: Partial<PartySubmissionData>
  onSave: (data: PartySubmissionData) => Promise<void>
  onSubmit: (data: PartySubmissionData) => Promise<void>
  disabled?: boolean
}

// US States for dropdown
export const US_STATES = [
  { value: "AL", label: "Alabama" },
  { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" },
  { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" },
  { value: "DE", label: "Delaware" },
  { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" },
  { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" },
  { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" },
  { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" },
  { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" },
  { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" },
  { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" },
  { value: "WY", label: "Wyoming" },
  { value: "DC", label: "District of Columbia" },
]

export const ENTITY_TYPES = [
  { value: "llc_single", label: "LLC (Single Member)" },
  { value: "llc_multi", label: "LLC (Multi-Member)" },
  { value: "corporation_c", label: "Corporation (C-Corp)" },
  { value: "corporation_s", label: "Corporation (S-Corp)" },
  { value: "partnership_general", label: "General Partnership" },
  { value: "partnership_lp", label: "Limited Partnership (LP)" },
  { value: "partnership_llp", label: "Limited Liability Partnership (LLP)" },
  { value: "other", label: "Other" },
]

export const TRUST_TYPES = [
  { value: "revocable_living", label: "Revocable Living Trust" },
  { value: "irrevocable", label: "Irrevocable Trust" },
  { value: "land", label: "Land Trust" },
  { value: "blind", label: "Blind Trust" },
  { value: "charitable", label: "Charitable Trust" },
  { value: "other", label: "Other" },
]

export const ID_TYPES = [
  { value: "ssn", label: "SSN/ITIN" },
  { value: "passport_us", label: "U.S. Passport" },
  { value: "passport_foreign", label: "Foreign Passport" },
  { value: "state_id", label: "State ID/Driver's License" },
]

export const CITIZENSHIP_OPTIONS = [
  { value: "us_citizen", label: "U.S. Citizen" },
  { value: "us_resident_alien", label: "U.S. Resident Alien" },
  { value: "non_resident_alien", label: "Non-Resident Alien" },
]

export const PAYMENT_SOURCE_TYPES = [
  { value: "personal_funds", label: "Personal Funds" },
  { value: "business_funds", label: "Business Funds" },
  { value: "gift", label: "Gift" },
  { value: "loan", label: "Loan (not from financial institution)" },
  { value: "investment", label: "Investment/Sale Proceeds" },
  { value: "other", label: "Other" },
]

export const PAYMENT_METHODS = [
  { value: "wire", label: "Wire Transfer" },
  { value: "cashiers_check", label: "Cashier's Check" },
  { value: "certified_check", label: "Certified Check" },
  { value: "money_order", label: "Money Order" },
  { value: "virtual_currency", label: "Virtual Currency" },
  { value: "other", label: "Other" },
]
