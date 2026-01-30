// Phase and Step Types
export type Phase = "determination" | "collection" | "summary"

export type DeterminationStepId = 
  | "property" 
  | "intent-to-build" 
  | "financing" 
  | "lender-aml" 
  | "buyer-type" 
  | "individual-exemptions" 
  | "entity-exemptions" 
  | "trust-exemptions" 
  | "determination-result"

export type CollectionStepId =
  | "transaction-property"
  | "party-setup"
  | "monitor-progress"
  | "review-submissions"
  | "reporting-person"
  | "file-report"

export type YesNoUnknown = "yes" | "no" | "unknown" | null
export type BuyerType = "individual" | "entity" | "trust" | null
export type SellerType = "individual" | "entity" | "trust"

// Address Types
export interface Address {
  street: string
  unit?: string
  city: string
  state: string
  zip: string
  country: string
}

// Individual Types
export interface IndividualInfo {
  id: string
  firstName: string
  middleName?: string
  lastName: string
  suffix?: string
  dateOfBirth: string
  ssn?: string
  address: Address
  phone?: string
  email?: string
  citizenship: "us-citizen" | "us-resident" | "non-resident" | "unknown"
}

// Entity Types
export interface EntityInfo {
  id: string
  legalName: string
  dbaName?: string
  entityType: string
  stateOfFormation: string
  dateOfFormation: string
  tin: string
  foreignTin?: string
  address: Address
  phone: string
  email: string
}

// Trust Types
export interface TrustInfo {
  id: string
  legalName: string
  trustType: string
  isRevocable: YesNoUnknown
  dateExecuted: string
  tin?: string
  address: Address
}

// Beneficial Owner
export interface BeneficialOwner {
  id: string
  firstName: string
  middleName?: string
  lastName: string
  suffix?: string
  dateOfBirth: string
  address: Address
  citizenship: "us-citizen" | "us-resident" | "non-resident"
  idType: "ssn" | "us-passport" | "foreign-passport" | "state-id"
  idNumber: string
  issuingJurisdiction?: string
  ownershipPercentage?: number
  controlTypes: string[]
}

// Trustee
export interface Trustee {
  id: string
  type: "individual" | "entity"
  individual?: Omit<IndividualInfo, 'id'>
  entity?: Omit<EntityInfo, 'id'> & { contactName: string }
}

// Settlor/Grantor
export interface Settlor {
  id: string
  fullName: string
  dateOfBirth?: string
  relationship: string
  isBeneficiary: YesNoUnknown
}

// Trust Beneficiary
export interface TrustBeneficiary {
  id: string
  firstName: string
  middleName?: string
  lastName: string
  dateOfBirth: string
  address: Address
  citizenship: "us-citizen" | "us-resident" | "non-resident"
  idType: "ssn" | "us-passport" | "foreign-passport" | "state-id"
  idNumber: string
  issuingJurisdiction?: string
  natureOfInterest: string
  percentageInterest?: number
}

// Signing Individual
export interface SigningIndividual {
  id: string
  firstName: string
  middleName?: string
  lastName: string
  suffix?: string
  dateOfBirth: string
  address: Address
  citizenship: "us-citizen" | "us-resident" | "non-resident"
  idType: "ssn" | "us-passport" | "foreign-passport" | "state-id"
  idNumber: string
  issuingJurisdiction?: string
  capacity: string
  title: string
  isAgent: YesNoUnknown
  agentDetails?: {
    principalName: string
    principalRelationship: string
    employerName?: string
    employerAddress?: Address
  }
}

// Payment Source
export interface PaymentSource {
  id: string
  sourceType: string
  amount: number
  institutionName: string
  accountType: string
  accountNumberLast4?: string
  routingNumber?: string
  accountHolderName: string
  isDifferentFromBuyer: boolean
  relationshipToBuyer?: string
  explanation?: string
}

// Seller Data
export interface SellerData {
  id: string
  type: SellerType
  individual?: IndividualInfo
  entity?: EntityInfo
  trust?: TrustInfo
  certified: boolean
}

// Buyer Data (Entity or Trust only for reportable transfers)
export interface BuyerEntityData {
  entity: EntityInfo
  beneficialOwners: BeneficialOwner[]
}

export interface BuyerTrustData {
  trust: TrustInfo
  trustees: Trustee[]
  settlors: Settlor[]
  beneficiaries: TrustBeneficiary[]
}

// Reporting Person
export interface ReportingPerson {
  companyName: string
  contactName: string
  licenseNumber?: string
  address: Address
  phone: string
  email: string
  isPCTC: YesNoUnknown
  hasDesignationAgreement?: YesNoUnknown
  designatedCompanyName?: string
  designatedContactInfo?: string
}

// Certification
export interface Certification {
  agreed: boolean
  printedName: string
  titleCapacity: string
  date: string
  signature: string
}

// Initial party info from client submission (used to pre-populate party setup)
export interface InitialParty {
  name: string
  email: string
  type: "individual" | "entity" | "trust"
  phone?: string
}

export interface InitialParties {
  buyers: InitialParty[]
  sellers: InitialParty[]
}

// Full Collection Data
export interface CollectionData {
  // ==========================================================================
  // Fields from SubmissionRequest (pre-filled when wizard starts)
  // ==========================================================================
  
  /** Escrow/file number from client submission */
  escrowNumber?: string
  
  /** Financing type from client submission */
  financingType?: "cash" | "financed" | "partial_cash"
  
  /** Initial party info from client submission - used to pre-populate party setup */
  initialParties?: InitialParties
  
  /** Notes from client submission */
  clientNotes?: string

  // ==========================================================================
  // Transaction & Property
  // ==========================================================================
  closingDate: string
  propertyAddress: Address
  county: string
  propertyType: string
  apn?: string
  legalDescription?: string
  purchasePrice: number
  
  // Sellers
  sellers: SellerData[]
  
  // Buyer
  buyerType: "entity" | "trust"
  buyerEntity?: BuyerEntityData
  buyerTrust?: BuyerTrustData
  
  // Signing Individuals
  signingIndividuals: SigningIndividual[]
  
  // Payment
  paymentSources: PaymentSource[]
  
  // Reporting Person
  reportingPerson: ReportingPerson
  
  // Certifications
  buyerCertification: Certification
  sellerCertification: Certification
  
  // ==========================================================================
  // SiteX Property Data (optional enrichment from title plant lookup)
  // ==========================================================================
  siteXData?: {
    apn?: string
    ownerName?: string
    ownerName2?: string
    propertyType?: string
    bedrooms?: number
    bathrooms?: number
    sqft?: number
    yearBuilt?: number
    lastSaleDate?: string
    lastSalePrice?: number
    assessedValue?: number
    lookupTimestamp?: string
  }
}

// Determination State
export interface DeterminationState {
  isResidential: YesNoUnknown
  hasIntentToBuild: YesNoUnknown
  isNonFinanced: YesNoUnknown
  lenderHasAml: YesNoUnknown
  buyerType: BuyerType
  individualExemptions: string[]
  entityExemptions: string[]
  trustExemptions: string[]
}

// Result
export interface DeterminationResult {
  isReportable: boolean
  reason: string
  documentation: string
  exemptionsSelected?: string[]
}

// Full Questionnaire State
export interface QuestionnaireState {
  phase: Phase
  determinationId: string
  createdAt: string
  lastSavedAt?: string
  
  // Phase 1
  determination: DeterminationState
  determinationResult: DeterminationResult | null
  
  // Phase 2
  collection: Partial<CollectionData>
  
  // Section completion tracking
  sectionCompletion: {
    transaction: boolean
    sellers: boolean
    buyer: boolean
    signingIndividuals: boolean
    payment: boolean
    reportingPerson: boolean
    certifications: boolean
  }
}

// Constants
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

export const PROPERTY_TYPES = [
  { value: "1-4-family", label: "1-4 Family Residence" },
  { value: "condo", label: "Condominium" },
  { value: "townhome", label: "Townhome" },
  { value: "coop", label: "Cooperative (Co-op)" },
  { value: "land", label: "Land (Intent to Build 1-4 Family)" },
]

export const ENTITY_TYPES = [
  { value: "llc-single", label: "LLC (Single Member)" },
  { value: "llc-multi", label: "LLC (Multi-Member)" },
  { value: "c-corp", label: "Corporation (C-Corp)" },
  { value: "s-corp", label: "Corporation (S-Corp)" },
  { value: "general-partnership", label: "General Partnership" },
  { value: "lp", label: "Limited Partnership (LP)" },
  { value: "llp", label: "Limited Liability Partnership (LLP)" },
  { value: "foreign", label: "Foreign Entity" },
  { value: "other", label: "Other" },
]

export const TRUST_TYPES = [
  { value: "revocable-living", label: "Revocable Living Trust" },
  { value: "irrevocable", label: "Irrevocable Trust" },
  { value: "land-trust", label: "Land Trust" },
  { value: "blind-trust", label: "Blind Trust" },
  { value: "charitable", label: "Charitable Trust" },
  { value: "other", label: "Other" },
]

export const PAYMENT_SOURCE_TYPES = [
  { value: "wire", label: "Wire Transfer" },
  { value: "certified-check", label: "Certified/Cashier's Check" },
  { value: "personal-check", label: "Personal Check" },
  { value: "business-check", label: "Business Check" },
  { value: "cash", label: "Cash" },
  { value: "crypto", label: "Cryptocurrency" },
  { value: "other", label: "Other" },
]

export const ACCOUNT_TYPES = [
  { value: "personal-checking", label: "Personal Checking" },
  { value: "personal-savings", label: "Personal Savings" },
  { value: "business-checking", label: "Business Checking" },
  { value: "business-savings", label: "Business Savings" },
  { value: "trust-account", label: "Trust Account" },
  { value: "brokerage", label: "Brokerage Account" },
  { value: "other", label: "Other" },
]

export const SIGNING_CAPACITIES = [
  { value: "member-manager", label: "Member/Manager (LLC)" },
  { value: "officer", label: "Officer" },
  { value: "director", label: "Director" },
  { value: "partner", label: "Partner" },
  { value: "trustee", label: "Trustee" },
  { value: "agent", label: "Authorized Agent" },
  { value: "poa", label: "Attorney-in-Fact (POA)" },
  { value: "other", label: "Other" },
]

export const INDIVIDUAL_EXEMPTIONS = [
  { id: "easement", label: "Easement only (no fee simple transfer)" },
  { id: "death", label: "Transfer due to death (inheritance/estate distribution)" },
  { id: "divorce", label: "Transfer due to divorce or legal dissolution" },
  { id: "bankruptcy", label: "Transfer to a bankruptcy estate" },
  { id: "court", label: "Court-supervised transfer (judicial sale, receivership)" },
  { id: "trust-settlor", label: "No-consideration transfer to a trust where the individual (alone or with spouse) is the settlor/grantor" },
  { id: "1031", label: "1031 Exchange transaction" },
  { id: "no-reporting", label: "No reporting person identified for this transaction" },
]

export const ENTITY_EXEMPTIONS = [
  { id: "securities-issuer", label: "Securities reporting issuer (publicly traded company)" },
  { id: "government", label: "Governmental authority (federal, state, local, tribal, foreign)" },
  { id: "bank", label: "Bank or credit union" },
  { id: "depository-holding", label: "Depository institution holding company" },
  { id: "msb", label: "Money services business (registered with FinCEN)" },
  { id: "broker-dealer", label: "Broker or dealer in securities (SEC registered)" },
  { id: "exchange-clearing", label: "Securities exchange or clearing agency" },
  { id: "exchange-act", label: "Other Exchange Act registered entity" },
  { id: "insurance", label: "Insurance company" },
  { id: "insurance-producer", label: "State-licensed insurance producer" },
  { id: "commodity", label: "Commodity Exchange Act registered entity" },
  { id: "utility", label: "Public utility" },
  { id: "financial-market", label: "Designated financial market utility" },
  { id: "investment", label: "Registered investment company or investment adviser" },
  { id: "controlled", label: "Entity controlled or wholly owned by any of the above" },
]

export const TRUST_EXEMPTIONS = [
  { id: "trust-securities", label: "Trust that is a securities reporting issuer" },
  { id: "trustee-securities", label: "Trust where the Trustee is a securities reporting issuer" },
  { id: "statutory", label: "Statutory trust (Delaware Statutory Trust, etc.)" },
  { id: "exempt-owned", label: "Trust wholly owned by an exempt entity listed in the entity exemptions" },
]

export const TOOLTIPS: Record<string, string> = {
  "aml": "Anti-Money Laundering (AML) programs are compliance frameworks that financial institutions use to detect and prevent money laundering activities.",
  "1031": "A 1031 Exchange allows investors to defer capital gains taxes by reinvesting proceeds from a sold property into a similar property.",
  "beneficial-owner": "An individual who directly or indirectly owns 25% or more of the entity OR exercises substantial control over it.",
  "substantial-control": "Includes senior officers (CEO, CFO, COO), those with authority over important decisions, or anyone with similar authority.",
  "settlor-grantor": "The person(s) who created the trust and transferred assets into it.",
  "statutory-trust": "A statutory trust is a legal entity created under state law, commonly used for investment purposes.",
  "designation-agreement": "A written agreement that transfers the reporting responsibility from one party to another for a specific transaction.",
  "bsa-e-filing": "The Bank Secrecy Act Electronic Filing System used to submit required reports to FinCEN.",
}

// Helper functions
export function generateId(): string {
  return Math.random().toString(36).substring(2, 15)
}

export function generateDeterminationId(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 8)
  return `RRER-${timestamp}-${random}`.toUpperCase()
}

export function createEmptyAddress(): Address {
  return {
    street: "",
    unit: "",
    city: "",
    state: "CA",
    zip: "",
    country: "United States",
  }
}

export function createEmptyIndividual(): IndividualInfo {
  return {
    id: generateId(),
    firstName: "",
    middleName: "",
    lastName: "",
    suffix: "",
    dateOfBirth: "",
    ssn: "",
    address: createEmptyAddress(),
    phone: "",
    email: "",
    citizenship: "unknown",
  }
}

export function createEmptyEntity(): EntityInfo {
  return {
    id: generateId(),
    legalName: "",
    dbaName: "",
    entityType: "",
    stateOfFormation: "CA",
    dateOfFormation: "",
    tin: "",
    foreignTin: "",
    address: createEmptyAddress(),
    phone: "",
    email: "",
  }
}

export function createEmptyTrust(): TrustInfo {
  return {
    id: generateId(),
    legalName: "",
    trustType: "",
    isRevocable: null,
    dateExecuted: "",
    tin: "",
    address: createEmptyAddress(),
  }
}

export function createEmptyBeneficialOwner(): BeneficialOwner {
  return {
    id: generateId(),
    firstName: "",
    middleName: "",
    lastName: "",
    suffix: "",
    dateOfBirth: "",
    address: createEmptyAddress(),
    citizenship: "us-citizen",
    idType: "ssn",
    idNumber: "",
    issuingJurisdiction: "",
    ownershipPercentage: undefined,
    controlTypes: [],
  }
}

export function createEmptyTrustee(): Trustee {
  return {
    id: generateId(),
    type: "individual",
    individual: undefined,
    entity: undefined,
  }
}

export function createEmptySettlor(): Settlor {
  return {
    id: generateId(),
    fullName: "",
    dateOfBirth: "",
    relationship: "",
    isBeneficiary: null,
  }
}

export function createEmptyTrustBeneficiary(): TrustBeneficiary {
  return {
    id: generateId(),
    firstName: "",
    middleName: "",
    lastName: "",
    dateOfBirth: "",
    address: createEmptyAddress(),
    citizenship: "us-citizen",
    idType: "ssn",
    idNumber: "",
    issuingJurisdiction: "",
    natureOfInterest: "",
    percentageInterest: undefined,
  }
}

export function createEmptySigningIndividual(): SigningIndividual {
  return {
    id: generateId(),
    firstName: "",
    middleName: "",
    lastName: "",
    suffix: "",
    dateOfBirth: "",
    address: createEmptyAddress(),
    citizenship: "us-citizen",
    idType: "ssn",
    idNumber: "",
    issuingJurisdiction: "",
    capacity: "",
    title: "",
    isAgent: null,
    agentDetails: undefined,
  }
}

export function createEmptyPaymentSource(): PaymentSource {
  return {
    id: generateId(),
    sourceType: "",
    amount: 0,
    institutionName: "",
    accountType: "",
    accountNumberLast4: "",
    routingNumber: "",
    accountHolderName: "",
    isDifferentFromBuyer: false,
    relationshipToBuyer: "",
    explanation: "",
  }
}

export function createEmptySeller(): SellerData {
  return {
    id: generateId(),
    type: "individual",
    individual: createEmptyIndividual(),
    entity: undefined,
    trust: undefined,
    certified: false,
  }
}

export function createEmptyCertification(): Certification {
  return {
    agreed: false,
    printedName: "",
    titleCapacity: "",
    date: new Date().toISOString().split('T')[0],
    signature: "",
  }
}

export function createEmptyReportingPerson(): ReportingPerson {
  return {
    companyName: "",
    contactName: "",
    licenseNumber: "",
    address: createEmptyAddress(),
    phone: "",
    email: "",
    isPCTC: null,
    hasDesignationAgreement: null,
    designatedCompanyName: "",
    designatedContactInfo: "",
  }
}

// Filing deadline calculation
export function calculateFilingDeadline(closingDate: string): { deadline: string; option1: string; option2: string; daysRemaining: number } {
  const closing = new Date(closingDate)
  
  // Option 1: 30 days after closing
  const option1Date = new Date(closing)
  option1Date.setDate(option1Date.getDate() + 30)
  
  // Option 2: Last day of month following closing
  const option2Date = new Date(closing)
  option2Date.setMonth(option2Date.getMonth() + 2, 0) // Last day of next month
  
  // Use the later date
  const deadlineDate = option1Date > option2Date ? option1Date : option2Date
  
  // Calculate days remaining
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const daysRemaining = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  
  return {
    deadline: deadlineDate.toISOString().split('T')[0],
    option1: option1Date.toISOString().split('T')[0],
    option2: option2Date.toISOString().split('T')[0],
    daysRemaining: Math.max(0, daysRemaining),
  }
}

// Format currency
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount)
}
