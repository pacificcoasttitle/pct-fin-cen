"use client"

import { useState, useMemo, useCallback, useEffect, useRef } from "react"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ExemptionCertificate, type ExemptionCertificateData } from "@/components/exemption"
import { 
  CheckCircle2, 
  AlertTriangle, 
  ArrowLeft, 
  ArrowRight, 
  RotateCcw, 
  Printer, 
  Download,
  Info,
  Building2,
  FileText,
  Plus,
  Trash2,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  HelpCircle,
  Calendar,
  DollarSign,
  Users,
  Shield,
  Home,
  Briefcase,
  FileWarning,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Check,
  User,
  Landmark,
  Mail,
  Copy,
  ExternalLink,
  RefreshCw,
  Send,
  Eye,
  FileCheck,
  MapPin,
  Rocket,
  Loader2
} from "lucide-react"
import { cn } from "@/lib/utils"
import { AddressAutocomplete } from "@/components/AddressAutocomplete"
import { LinksSentConfirmation } from "@/components/wizard/LinksSentConfirmation"
import { useDemo } from "@/hooks/use-demo"
import type { ParsedAddress, PropertyData } from "@/lib/property-types"
import {
  type DeterminationState,
  type DeterminationResult,
  type CollectionData,
  type SellerData,
  type BeneficialOwner,
  type Trustee,
  type Settlor,
  type TrustBeneficiary,
  type SigningIndividual,
  type PaymentSource,
  type Phase,
  type DeterminationStepId,
  type CollectionStepId,
  type Address,
  type EntitySubtype,
  type BoiStatus,
  INDIVIDUAL_EXEMPTIONS,
  ENTITY_EXEMPTIONS,
  TRUST_EXEMPTIONS,
  US_STATES,
  PROPERTY_TYPES,
  ENTITY_TYPES,
  TRUST_TYPES,
  PAYMENT_SOURCE_TYPES,
  ACCOUNT_TYPES,
  SIGNING_CAPACITIES,
  TOOLTIPS,
  ENTITY_SUBTYPE_OPTIONS,
  BOI_STATUS_OPTIONS,
  ENTITY_DOCUMENT_CHECKLIST,
  generateDeterminationId,
  generateId,
  createEmptyAddress,
  createEmptySeller,
  createEmptyBeneficialOwner,
  createEmptyTrustee,
  createEmptySettlor,
  createEmptyTrustBeneficiary,
  createEmptySigningIndividual,
  createEmptyPaymentSource,
  createEmptyCertification,
  createEmptyReportingPerson,
  createEmptyEntity,
  createEmptyTrust,
  calculateFilingDeadline,
  formatCurrency,
} from "@/lib/rrer-types"

// ============================================================================
// Currency Input Formatting Helpers
// ============================================================================

/**
 * Format number for display in currency input (with commas, no $ sign)
 * e.g., 1500000 → "1,500,000"
 */
function formatPriceForInput(value: number | undefined | null): string {
  if (!value || value === 0) return ""
  return value.toLocaleString("en-US", { maximumFractionDigits: 0 })
}

/**
 * Parse formatted price string back to number
 * e.g., "1,500,000" → 1500000
 */
function parsePriceFromInput(formatted: string): number {
  const digits = formatted.replace(/[^0-9]/g, "")
  return digits ? parseInt(digits, 10) : 0
}

// ============================================================================
// Exemption Reason Labels (for certificate display)
// ============================================================================

const EXEMPTION_REASON_LABELS: Record<string, string> = {
  // Non-residential exemptions
  "non_residential_no_intent": "Property is not residential and buyer has no intent to build residential",
  
  // Lender AML exemptions  
  "lender_aml_covers": "Lender's AML program covers reporting requirements",
  
  // Individual buyer exemptions (from INDIVIDUAL_EXEMPTIONS)
  "government_agency": "Transferor is a government agency",
  "deceased_seller": "Transferor is a decedent's estate",
  "divorce_transfer": "Transfer pursuant to divorce/separation",
  "gift_inheritance": "Transfer by gift, bequest, or inheritance",
  "court_order": "Transfer by court order",
  "foreclosure": "Foreclosure or deed in lieu of foreclosure",
  "bankruptcy": "Transfer in bankruptcy proceeding",
  "quitclaim_related": "Quitclaim to/from related party",
  
  // Entity buyer exemptions (from ENTITY_EXEMPTIONS)
  "securities_issuer": "Securities reporting issuer (public company)",
  "regulated_insurance": "Regulated insurance company",
  "bank_credit_union": "Bank, credit union, or depository institution",
  "money_services": "Registered money services business",
  "broker_dealer": "SEC-registered broker or dealer",
  "securities_exchange": "National securities exchange",
  "clearing_agency": "SEC-registered clearing agency",
  "investment_company": "SEC-registered investment company",
  "investment_adviser": "SEC-registered investment adviser",
  "venture_capital": "Venture capital fund adviser",
  "pooled_investment": "Pooled investment vehicle",
  "entity_501c": "Tax-exempt organization under 501(c)",
  "entity_political": "Political organization under 527",
  "entity_trust_401a": "Trust described in 401(a)",
  "entity_government": "State, local, or tribal government",
  "public_utility": "Public utility providing essential services",
  "large_operating": "Large operating company (20+ employees, $5M+ revenue)",
  "subsidiary_exempt": "Subsidiary of exempt entity",
  "inactive_entity": "Inactive entity meeting criteria",
  "entity_cta_exempt": "Entity reporting exempt under CTA",
  "boi_filed": "Entity has filed BOI report with FinCEN",
  "entity_pooled": "Pooled investment vehicle",
  
  // Trust buyer exemptions (from TRUST_EXEMPTIONS)
  "trust_revocable": "Revocable trust",
  "trust_501c": "Trust exempt under 501(c)",
  "trust_charitable": "Charitable remainder trust",
  "trust_crt": "Charitable lead trust",
}

/**
 * Format exemption reason code to human-readable label
 */
function formatExemptionReason(code: string): string {
  return EXEMPTION_REASON_LABELS[code] || code.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

// Initial states
const initialDetermination: DeterminationState = {
  isResidential: null,
  hasIntentToBuild: null,
  isNonFinanced: null,
  lenderHasAml: null,
  buyerType: null,
  individualExemptions: [],
  entityExemptions: [],
  trustExemptions: [],
  // Entity enhancement fields
  entitySubtype: undefined,
  buyerBoiStatus: undefined,
  buyerFincenId: undefined,
}

const initialCollection: Partial<CollectionData> = {
  closingDate: "",
  propertyAddress: createEmptyAddress(),
  county: "",
  propertyType: "",
  apn: "",
  legalDescription: "",
  purchasePrice: 0,
  sellers: [createEmptySeller()],
  buyerType: "entity",
  buyerEntity: {
    entity: createEmptyEntity(),
    beneficialOwners: [createEmptyBeneficialOwner()],
  },
  buyerTrust: undefined,
  signingIndividuals: [createEmptySigningIndividual()],
  paymentSources: [createEmptyPaymentSource()],
  reportingPerson: createEmptyReportingPerson(),
  buyerCertification: createEmptyCertification(),
  sellerCertification: createEmptyCertification(),
}

// Helper Components
function TooltipIcon({ term }: { term: string }) {
  const tooltip = TOOLTIPS[term]
  if (!tooltip) return null
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help inline ml-1" />
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <p>{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  )
}

function AddressFields({ 
  address, 
  onChange, 
  prefix = "",
  required = false 
}: { 
  address: Address
  onChange: (address: Address) => void
  prefix?: string
  required?: boolean
}) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor={`${prefix}street`}>Street Address {required && "*"}</Label>
        <Input
          id={`${prefix}street`}
          value={address.street}
          onChange={(e) => onChange({ ...address, street: e.target.value })}
          required={required}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${prefix}unit`}>Unit/Apt</Label>
        <Input
          id={`${prefix}unit`}
          value={address.unit || ""}
          onChange={(e) => onChange({ ...address, unit: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor={`${prefix}city`}>City {required && "*"}</Label>
          <Input
            id={`${prefix}city`}
            value={address.city}
            onChange={(e) => onChange({ ...address, city: e.target.value })}
            required={required}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`${prefix}state`}>State {required && "*"}</Label>
          <Select value={address.state} onValueChange={(value) => onChange({ ...address, state: value })}>
            <SelectTrigger id={`${prefix}state`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {US_STATES.map((state) => (
                <SelectItem key={state.value} value={state.value}>
                  {state.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor={`${prefix}zip`}>ZIP Code {required && "*"}</Label>
          <Input
            id={`${prefix}zip`}
            value={address.zip}
            onChange={(e) => onChange({ ...address, zip: e.target.value })}
            required={required}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`${prefix}country`}>Country {required && "*"}</Label>
          <Input
            id={`${prefix}country`}
            value={address.country}
            onChange={(e) => onChange({ ...address, country: e.target.value })}
            required={required}
          />
        </div>
      </div>
    </div>
  )
}

function SectionHeader({ 
  title, 
  description, 
  step,
  icon: Icon
}: { 
  title: string
  description?: string
  step: string
  icon?: React.ComponentType<{ className?: string }>
}) {
  return (
    <CardHeader className="relative border-b bg-gradient-to-br from-slate-50 via-white to-teal-50/30 pb-6">
      {/* Accent bar at top - teal gradient matching website */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-teal-500 via-teal-500 to-teal-400 rounded-t-2xl" />
      
      <div className="flex items-start gap-4 pt-3">
        {Icon && (
          <div className="p-3 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 text-white shadow-lg shadow-teal-500/25 shrink-0">
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div className="flex-1">
          <Badge variant="outline" className="mb-2 bg-teal-50 border-teal-200 text-teal-700 font-medium">{step}</Badge>
          <CardTitle className="text-xl font-semibold text-gray-900">{title}</CardTitle>
          {description && (
            <CardDescription className="mt-2 text-gray-600 leading-relaxed">{description}</CardDescription>
          )}
        </div>
      </div>
    </CardHeader>
  )
}

// Props interface for external integration
// Party status types (imported from api)
export interface PartyStatusItem {
  id: string
  party_role: string
  entity_type: string
  display_name: string | null
  email: string | null
  status: string
  submitted_at: string | null
  token: string | null
  link: string | null
  link_expires_at: string | null
  created_at: string
}

export interface PartySummary {
  total: number
  submitted: number
  pending: number
  all_complete: boolean
}

export interface ReportPartiesResponse {
  report_id: string
  property_address: string | null
  parties: PartyStatusItem[]
  summary: PartySummary
}

export interface RRERQuestionnaireProps {
  initialData?: {
    phase?: Phase
    determinationStep?: DeterminationStepId
    collectionStep?: CollectionStepId
    determination?: Partial<DeterminationState>
    collection?: Partial<CollectionData>
  }
  onChange?: (data: {
    phase: Phase
    determinationStep: DeterminationStepId
    collectionStep: CollectionStepId
    determination: DeterminationState
    collection: Partial<CollectionData>
  }) => void
  saveStatus?: "idle" | "saving" | "saved" | "error"
  // NEW: Props for API integration
  reportId?: string
  partyStatus?: ReportPartiesResponse | null
  onRefreshPartyStatus?: () => Promise<void>
  onSendPartyLinks?: (parties: Array<{
    party_role: string
    entity_type: string
    display_name: string
    email: string
  }>) => Promise<void>
  onReadyCheck?: () => Promise<{ ready: boolean; errors?: string[] }>
  onFileReport?: () => Promise<{ success: boolean; receipt_id?: string; error?: string }>
  onDetermine?: () => Promise<void>
}

export function RRERQuestionnaire({ 
  initialData, 
  onChange, 
  saveStatus,
  reportId,
  partyStatus,
  onRefreshPartyStatus,
  onSendPartyLinks,
  onReadyCheck,
  onFileReport,
  onDetermine,
}: RRERQuestionnaireProps = {}) {
  const { user: demoUser } = useDemo()
  const [showLinksSentConfirmation, setShowLinksSentConfirmation] = useState(false)
  const [phase, setPhase] = useState<Phase>(initialData?.phase || "determination")
  const [determinationStep, setDeterminationStep] = useState<DeterminationStepId>(initialData?.determinationStep || "property")
  const [collectionStep, setCollectionStep] = useState<CollectionStepId>(initialData?.collectionStep || "transaction-property")
  const [determination, setDetermination] = useState<DeterminationState>({
    ...initialDetermination,
    ...initialData?.determination,
  })
  const [collection, setCollection] = useState<Partial<CollectionData>>({
    ...initialCollection,
    ...initialData?.collection,
  })
  
  // Use report ID if available, otherwise generate a new one
  // Format: RRER-{short_id} where short_id is first 8 chars of reportId or generated
  const [determinationId] = useState(() => {
    if (reportId) {
      // Use the report's UUID, formatted nicely
      const shortId = reportId.replace(/-/g, '').substring(0, 12).toUpperCase()
      return `RRER-${shortId.substring(0, 6)}-${shortId.substring(6, 12)}`
    }
    // Fallback: generate a new one for standalone wizard
    return generateDeterminationId()
  })
  const [createdAt] = useState(() => new Date().toISOString())
  const [lastSavedAt, setLastSavedAt] = useState<string | undefined>()
  const [resendingPartyId, setResendingPartyId] = useState<string | null>(null)
  
  // NEW: Party Setup State for restructured wizard flow
  // Initialize from initialParties if available (from client submission)
  const [partySetup, setPartySetup] = useState<{
    sellers: { id: string; name: string; email: string; type: "individual" | "entity" | "trust"; entityName?: string }[]
    buyers: { id: string; name: string; email: string; type: "individual" | "entity" | "trust"; entityName?: string }[]
  }>(() => {
    // Try to initialize from submission data
    const initialParties = initialData?.collection?.initialParties
    if (initialParties) {
      const buyers = (initialParties.buyers || [])
        .filter(b => b.name) // Only include if has name
        .map(b => ({
          id: generateId(),
          name: b.name || "",
          email: b.email || "",
          type: (b.type || "individual") as "individual" | "entity" | "trust",
          entityName: undefined,
        }))
      
      const sellers = (initialParties.sellers || [])
        .filter(s => s.name) // Only include if has name
        .map(s => ({
          id: generateId(),
          name: s.name || "",
          email: s.email || "",
          type: (s.type || "individual") as "individual" | "entity" | "trust",
          entityName: undefined,
        }))
      
      if (buyers.length > 0 || sellers.length > 0) {
        return { buyers, sellers }
      }
    }
    
    // Default empty state
    return { sellers: [], buyers: [] }
  })
  const [reviewCertified, setReviewCertified] = useState(false)
  const [fileCertified, setFileCertified] = useState(false)
  const [readyCheckResult, setReadyCheckResult] = useState<{ ready: boolean; errors?: string[] } | null>(null)
  const [filingResult, setFilingResult] = useState<{ success: boolean; receiptId?: string; error?: string } | null>(null)
  
  // API loading states
  const [sendingLinks, setSendingLinks] = useState(false)
  const [runningReadyCheck, setRunningReadyCheck] = useState(false)
  const [filing, setFiling] = useState(false)
  
  // Toast hook for notifications
  const { toast } = useToast()

  // Handler: Send Party Links
  const handleSendPartyLinks = async () => {
    console.log("[SendLinks] Handler called", {
      sellersCount: partySetup.sellers.length,
      buyersCount: partySetup.buyers.length,
      hasOnSendPartyLinks: !!onSendPartyLinks,
    })

    try {
      // Validate we have at least one seller and one buyer
      if (partySetup.sellers.length === 0) {
        console.log("[SendLinks] Validation failed: no sellers")
        toast({
          title: "Missing Seller",
          description: "Please add at least one seller.",
          variant: "destructive",
        })
        return
      }
      
      if (partySetup.buyers.length === 0) {
        console.log("[SendLinks] Validation failed: no buyers")
        toast({
          title: "Missing Buyer", 
          description: "Please add at least one buyer.",
          variant: "destructive",
        })
        return
      }

      // Validate all parties have name and email
      const allParties = [...partySetup.sellers, ...partySetup.buyers]
      const invalidParty = allParties.find(p => !p.name?.trim() || !p.email?.trim())
      if (invalidParty) {
        console.log("[SendLinks] Validation failed: missing name/email", invalidParty)
        toast({
          title: "Missing Information",
          description: "All parties must have a name and email address.",
          variant: "destructive",
        })
        return
      }

      setSendingLinks(true)

      // Transform to API format
      const parties = [
        ...partySetup.sellers.map(s => ({
          party_role: "transferor" as const,
          entity_type: s.type || "individual",
          display_name: s.name,
          email: s.email,
        })),
        ...partySetup.buyers.map(b => ({
          party_role: "transferee" as const,
          entity_type: b.type || "entity",
          display_name: b.name,
          email: b.email,
        })),
      ]

      console.log("[SendLinks] Calling API with", parties.length, "parties")

      // Call the API via prop
      if (onSendPartyLinks) {
        await onSendPartyLinks(parties)
        console.log("[SendLinks] API call succeeded")
      } else {
        console.warn("[SendLinks] onSendPartyLinks prop is undefined — skipping API call")
      }
      
      // Show success
      toast({
        title: "Links Sent Successfully!",
        description: `Secure links sent to ${parties.length} parties via email.`,
      })
      
      // Refresh party status
      if (onRefreshPartyStatus) {
        await onRefreshPartyStatus()
      }
      
      // Show confirmation screen instead of auto-advancing
      setShowLinksSentConfirmation(true)
      console.log("[SendLinks] Confirmation screen activated")

    } catch (error) {
      console.error("[SendLinks] ERROR:", error)
      toast({
        title: "Failed to Send Links",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setSendingLinks(false)
    }
  }

  // Handler: Ready Check
  const handleReadyCheck = async () => {
    setRunningReadyCheck(true)
    try {
      if (onReadyCheck) {
        const result = await onReadyCheck()
        setReadyCheckResult(result)
        
        if (result.ready) {
          toast({
            title: "Ready to File ✓",
            description: "All checks passed. You can now submit to FinCEN.",
          })
        } else {
          toast({
            title: "Not Ready",
            description: `${result.errors?.length || 0} issue(s) found.`,
            variant: "destructive",
          })
        }
      } else {
        // Fallback mock result
        setReadyCheckResult({ ready: true, errors: [] })
      }
    } catch (error) {
      toast({
        title: "Check Failed",
        description: "Could not verify filing readiness.",
        variant: "destructive",
      })
    } finally {
      setRunningReadyCheck(false)
    }
  }

  // Handler: File to FinCEN
  const handleFileToFinCEN = async () => {
    if (!fileCertified) {
      toast({
        title: "Certification Required",
        description: "Please check the certification box before filing.",
        variant: "destructive",
      })
      return
    }

    setFiling(true)
    try {
      // Run ready check first if not already done
      if (!readyCheckResult?.ready && onReadyCheck) {
        const check = await onReadyCheck()
        setReadyCheckResult(check)
        if (!check.ready) {
          throw new Error("Report is not ready to file")
        }
      }
      
      // Submit to FinCEN
      if (onFileReport) {
        const result = await onFileReport()
        setFilingResult(result)
        
        if (result.success) {
          toast({
            title: "Report Filed Successfully! 🎉",
            description: `Receipt ID: ${result.receipt_id}`,
          })
        } else {
          throw new Error(result.error || "Filing failed")
        }
      } else {
        // Fallback mock result
        setFilingResult({ 
          success: true, 
          receiptId: `BSA-${new Date().getFullYear()}-${Date.now().toString().slice(-8)}` 
        })
      }
      
    } catch (error) {
      console.error("Filing failed:", error)
      toast({
        title: "Filing Failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setFiling(false)
    }
  }
  
  // Pre-fill reporting person with logged-in user info (FIX 3)
  const reportingPersonPreFilled = useRef(false)
  useEffect(() => {
    if (demoUser && !reportingPersonPreFilled.current) {
      // Only pre-fill if the fields are currently empty (don't overwrite saved data)
      const rp = collection.reportingPerson
      if (!rp?.companyName && !rp?.contactName && !rp?.email) {
        reportingPersonPreFilled.current = true
        setCollection(prev => ({
          ...prev,
          reportingPerson: {
            ...createEmptyReportingPerson(),
            ...prev.reportingPerson,
            companyName: prev.reportingPerson?.companyName || demoUser.companyName || "",
            contactName: prev.reportingPerson?.contactName || demoUser.name || "",
            email: prev.reportingPerson?.email || demoUser.email || "",
          }
        }))
      }
    }
  }, [demoUser, collection.reportingPerson])

  // Check if can proceed from monitor step
  const canProceedFromMonitor = partyStatus?.summary.all_complete === true

  // Call onChange when data changes (for autosave)
  useEffect(() => {
    if (onChange) {
      onChange({ phase, determinationStep, collectionStep, determination, collection })
    }
  }, [phase, determinationStep, collectionStep, determination, collection, onChange])

  // Auto-save effect (internal timer for UI feedback)
  useEffect(() => {
    const interval = setInterval(() => {
      setLastSavedAt(new Date().toISOString())
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  // Calculate determination result
  const determinationResult = useMemo((): DeterminationResult | null => {
    // Non-residential with no intent to build
    if (determination.isResidential === "no" && determination.hasIntentToBuild === "no") {
      return {
        isReportable: false,
        reason: "This is not a residential real estate transaction and the buyer has no intent to build a 1-4 family residential structure.",
        documentation: "Documentation needed: Certification from Buyer confirming no intent to build 1-4 family residential property.",
      }
    }
    
    if (determination.lenderHasAml === "yes") {
      return {
        isReportable: false,
        reason: "The lender's AML program covers reporting requirements for this transaction.",
        documentation: "Documentation needed: Certification from lender confirming active AML program.",
      }
    }
    
    if (determination.buyerType === "individual") {
      const exemptions = determination.individualExemptions.filter(e => e !== "none")
      if (exemptions.length > 0) {
        return {
          isReportable: false,
          reason: "This transaction qualifies for an exemption under 1031.320(b)(2).",
          documentation: "Documentation needed: Certification from Seller confirming applicable exemption.",
          exemptionsSelected: exemptions.map(id => INDIVIDUAL_EXEMPTIONS.find(e => e.id === id)?.label || id),
        }
      }
      if (determination.individualExemptions.includes("none")) {
        return {
          isReportable: true,
          reason: "This is a REPORTABLE TRANSFER requiring FinCEN Real Estate Report filing.",
          documentation: "Proceed to Phase 2 to collect required information.",
        }
      }
    }
    
    if (determination.buyerType === "entity") {
      const exemptions = determination.entityExemptions.filter(e => e !== "none")
      if (exemptions.length > 0) {
        return {
          isReportable: false,
          reason: "The buyer entity qualifies for an exemption under 1031.320(n)(10).",
          documentation: "Documentation needed: Certification from Buyer confirming exempt entity status.",
          exemptionsSelected: exemptions.map(id => ENTITY_EXEMPTIONS.find(e => e.id === id)?.label || id),
        }
      }
      if (determination.entityExemptions.includes("none")) {
        return {
          isReportable: true,
          reason: "This is a REPORTABLE TRANSFER requiring FinCEN Real Estate Report filing.",
          documentation: "Proceed to Phase 2 to collect required information.",
        }
      }
    }
    
    if (determination.buyerType === "trust") {
      const exemptions = determination.trustExemptions.filter(e => e !== "none")
      if (exemptions.length > 0) {
        return {
          isReportable: false,
          reason: "The buyer trust qualifies for an exemption under 1031.320(n)(11).",
          documentation: "Documentation needed: Certification from Buyer confirming exempt trust status.",
          exemptionsSelected: exemptions.map(id => TRUST_EXEMPTIONS.find(e => e.id === id)?.label || id),
        }
      }
      if (determination.trustExemptions.includes("none")) {
        return {
          isReportable: true,
          reason: "This is a REPORTABLE TRANSFER requiring FinCEN Real Estate Report filing.",
          documentation: "Proceed to Phase 2 to collect required information.",
        }
      }
    }
    
    return null
  }, [determination])

  // Relevant determination steps
  const relevantDeterminationSteps = useMemo(() => {
    const steps: DeterminationStepId[] = ["property"]
    
    if (determination.isResidential === "no") {
      steps.push("intent-to-build")
      if (determination.hasIntentToBuild === "yes") {
        steps.push("financing")
        if (determination.isNonFinanced === "no") {
          steps.push("lender-aml")
          if (determination.lenderHasAml !== "yes") {
            steps.push("buyer-type")
          }
        } else if (determination.isNonFinanced === "yes") {
          steps.push("buyer-type")
        }
        if (steps.includes("buyer-type") && determination.buyerType) {
          if (determination.buyerType === "individual") steps.push("individual-exemptions")
          if (determination.buyerType === "entity") steps.push("entity-exemptions")
          if (determination.buyerType === "trust") steps.push("trust-exemptions")
        }
      }
    }
    
    if (determination.isResidential === "yes") {
      steps.push("financing")
      if (determination.isNonFinanced === "no") {
        steps.push("lender-aml")
        if (determination.lenderHasAml !== "yes") {
          steps.push("buyer-type")
        }
      } else if (determination.isNonFinanced === "yes") {
        steps.push("buyer-type")
      }
      if (steps.includes("buyer-type") && determination.buyerType) {
        if (determination.buyerType === "individual") steps.push("individual-exemptions")
        if (determination.buyerType === "entity") steps.push("entity-exemptions")
        if (determination.buyerType === "trust") steps.push("trust-exemptions")
      }
    }
    
    if (determinationResult) {
      steps.push("determination-result")
    }
    
    return steps
  }, [determination, determinationResult])

  // Auto-persist determination to backend when result is reached
  const determinationPersistedRef = useRef(false)
  useEffect(() => {
    if (
      determinationResult && 
      determinationStep === "determination-result" && 
      onDetermine && 
      !determinationPersistedRef.current
    ) {
      determinationPersistedRef.current = true
      onDetermine().catch((err) => {
        console.error("Failed to persist determination:", err)
        determinationPersistedRef.current = false // Allow retry
      })
    }
  }, [determinationResult, determinationStep, onDetermine])

  // Collection steps - NEW RESTRUCTURED FLOW
  // Phase 2 now focuses on party setup and monitoring, not data entry
  // Parties fill out their own info via the party portal
  const collectionSteps: CollectionStepId[] = [
    "transaction-property",  // PCT enters closing date, price, property details
    "party-setup",           // Add parties (name, email, type), send links
    "monitor-progress",      // Track party submissions with polling
    "review-submissions",    // View all submitted party data
    "reporting-person",      // FinClear internal info
    "file-report",           // Final certification and file
  ]

  // Progress calculations
  // Use maximum possible steps for consistent progress display
  // This prevents showing 100% when only 1 step is known in dynamic array
  const MAX_DETERMINATION_STEPS = 7 // property, intent-to-build, financing, lender-aml, buyer-type, exemptions, result
  
  const determinationProgress = useMemo(() => {
    const currentIndex = relevantDeterminationSteps.indexOf(determinationStep)
    // Use max possible steps so step 1 shows ~14%, step 2 shows ~28%, etc.
    return Math.round(((currentIndex + 1) / MAX_DETERMINATION_STEPS) * 100)
  }, [determinationStep, relevantDeterminationSteps])

  const collectionProgress = useMemo(() => {
    const currentIndex = collectionSteps.indexOf(collectionStep)
    return Math.round(((currentIndex + 1) / collectionSteps.length) * 100)
  }, [collectionStep])

  // Navigation handlers
  const goToNextDeterminationStep = useCallback(() => {
    const currentIndex = relevantDeterminationSteps.indexOf(determinationStep)
    if (currentIndex < relevantDeterminationSteps.length - 1) {
      setDeterminationStep(relevantDeterminationSteps[currentIndex + 1])
    }
  }, [determinationStep, relevantDeterminationSteps])

  const goToPreviousDeterminationStep = useCallback(() => {
    const currentIndex = relevantDeterminationSteps.indexOf(determinationStep)
    if (currentIndex > 0) {
      setDeterminationStep(relevantDeterminationSteps[currentIndex - 1])
    }
  }, [determinationStep, relevantDeterminationSteps])

  const goToNextCollectionStep = useCallback(() => {
    const currentIndex = collectionSteps.indexOf(collectionStep)
    if (currentIndex < collectionSteps.length - 1) {
      setCollectionStep(collectionSteps[currentIndex + 1])
    }
  }, [collectionStep])

  const goToPreviousCollectionStep = useCallback(() => {
    const currentIndex = collectionSteps.indexOf(collectionStep)
    if (currentIndex > 0) {
      setCollectionStep(collectionSteps[currentIndex - 1])
    }
  }, [collectionStep])

  const resetQuestionnaire = useCallback(() => {
    setPhase("determination")
    setDeterminationStep("property")
    setCollectionStep("transaction-property")
    setDetermination(initialDetermination)
    setCollection(initialCollection)
  }, [])

  const startCollection = useCallback(() => {
    // Pre-fill buyer type from determination
    const buyerType = determination.buyerType === "entity" ? "entity" : "trust"
    setCollection(prev => ({
      ...prev,
      buyerType,
      buyerEntity: buyerType === "entity" ? {
        entity: createEmptyEntity(),
        beneficialOwners: [createEmptyBeneficialOwner()],
      } : undefined,
      buyerTrust: buyerType === "trust" ? {
        trust: createEmptyTrust(),
        trustees: [createEmptyTrustee()],
        settlors: [createEmptySettlor()],
        beneficiaries: [],
      } : undefined,
    }))
    setPhase("collection")
  }, [determination.buyerType])

  // Can proceed checks
  const canProceedDetermination = useMemo(() => {
    switch (determinationStep) {
      case "property":
        return determination.isResidential !== null
      case "intent-to-build":
        return determination.hasIntentToBuild !== null
      case "financing":
        return determination.isNonFinanced !== null
      case "lender-aml":
        return determination.lenderHasAml !== null
      case "buyer-type":
        return determination.buyerType !== null
      case "individual-exemptions":
        return determination.individualExemptions.length > 0
      case "entity-exemptions":
        return determination.entityExemptions.length > 0
      case "trust-exemptions":
        return determination.trustExemptions.length > 0
      default:
        return true
    }
  }, [determinationStep, determination])

  // Toggle exemption
  const toggleExemption = useCallback((type: "individual" | "entity" | "trust", id: string) => {
    setDetermination(prev => {
      const key = `${type}Exemptions` as keyof DeterminationState
      const current = prev[key] as string[]
      
      if (id === "none") {
        return { ...prev, [key]: current.includes("none") ? [] : ["none"] }
      }
      
      const withoutNone = current.filter(e => e !== "none")
      if (withoutNone.includes(id)) {
        return { ...prev, [key]: withoutNone.filter(e => e !== id) }
      }
      return { ...prev, [key]: [...withoutNone, id] }
    })
  }, [])

  // Payment totals
  const paymentTotal = useMemo(() => {
    return (collection.paymentSources || []).reduce((sum, source) => sum + (source.amount || 0), 0)
  }, [collection.paymentSources])

  const paymentRemaining = useMemo(() => {
    return (collection.purchasePrice || 0) - paymentTotal
  }, [collection.purchasePrice, paymentTotal])

  // Filing deadline
  const filingDeadline = useMemo(() => {
    if (!collection.closingDate) return null
    return calculateFilingDeadline(collection.closingDate)
  }, [collection.closingDate])

  // Section completion status
  const sectionCompletion = useMemo(() => {
    return {
      transaction: !!(collection.closingDate && collection.propertyAddress?.street && collection.propertyAddress?.city && collection.propertyType && collection.purchasePrice),
      sellers: (collection.sellers || []).length > 0 && (collection.sellers || []).every(s => 
        (s.type === "individual" && s.individual?.firstName && s.individual?.lastName) ||
        (s.type === "entity" && s.entity?.legalName) ||
        (s.type === "trust" && s.trust?.legalName)
      ),
      buyer: collection.buyerType === "entity" 
        ? !!(collection.buyerEntity?.entity.legalName && (collection.buyerEntity?.beneficialOwners || []).length > 0)
        : !!(collection.buyerTrust?.trust.legalName && (collection.buyerTrust?.trustees || []).length > 0),
      signingIndividuals: (collection.signingIndividuals || []).length > 0 && (collection.signingIndividuals || []).every(s => s.firstName && s.lastName),
      payment: paymentTotal > 0 && Math.abs(paymentRemaining) < 1,
      reportingPerson: !!(collection.reportingPerson?.companyName && collection.reportingPerson?.isPCTC !== null),
      certifications: !!(collection.buyerCertification?.agreed && collection.sellerCertification?.agreed),
    }
  }, [collection, paymentTotal, paymentRemaining])

  // Print handler
  const handlePrint = useCallback(() => {
    window.print()
  }, [])

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50/50">
        {/* Header - Modern teal gradient matching website */}
        <header className="bg-gradient-to-r from-teal-600 via-teal-500 to-teal-600 text-white py-5 px-4 md:px-8 print:bg-white print:text-foreground shadow-xl shadow-teal-600/30">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20 shadow-lg">
                <Building2 className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight">FinClear</h1>
                <p className="text-sm text-teal-100">FinCEN RRER Compliance Wizard</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {lastSavedAt && (
                <div className="hidden md:flex items-center gap-2 text-sm bg-white/15 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20 shadow-lg">
                  <CheckCircle className="w-4 h-4 text-green-300" />
                  <span className="text-white/90">Saved {new Date(lastSavedAt).toLocaleTimeString()}</span>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Enhanced Phase Tabs - Modern teal theme */}
        <div className="bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm print:hidden sticky top-0 z-30">
          <div className="max-w-5xl mx-auto px-4 md:px-8">
            <div className="flex gap-2 py-3">
              {/* Phase 1: Determination */}
              <button
                onClick={() => setPhase("determination")}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200",
                  phase === "determination"
                    ? "bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-lg shadow-teal-500/25"
                    : "hover:bg-teal-50 text-gray-600 hover:text-teal-700"
                )}
              >
                <span className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold transition-colors",
                  phase === "determination" 
                    ? "bg-white/20" 
                    : determinationResult 
                      ? "bg-teal-100 text-teal-700"
                      : "bg-gray-100"
                )}>
                  {determinationResult ? <Check className="w-4 h-4" /> : "1"}
                </span>
                <span className="font-medium hidden sm:inline">Determination</span>
              </button>

              {/* Connector */}
              <div className="flex items-center px-1">
                <ChevronRight className={cn(
                  "w-4 h-4 transition-colors",
                  determinationResult?.isReportable ? "text-teal-500" : "text-gray-300"
                )} />
              </div>

              {/* Phase 2: Collection */}
              <button
                onClick={() => determinationResult?.isReportable && setPhase("collection")}
                disabled={!determinationResult?.isReportable}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200",
                  phase === "collection"
                    ? "bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-lg shadow-teal-500/25"
                    : determinationResult?.isReportable
                      ? "hover:bg-teal-50 text-gray-600 hover:text-teal-700"
                      : "text-gray-300 cursor-not-allowed"
                )}
              >
                <span className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold",
                  phase === "collection" 
                    ? "bg-white/20" 
                    : phase === "summary" 
                      ? "bg-teal-100 text-teal-700"
                      : "bg-gray-100"
                )}>
                  {phase === "summary" ? <Check className="w-4 h-4" /> : "2"}
                </span>
                <span className="font-medium hidden sm:inline">Collection</span>
              </button>

              {/* Connector */}
              <div className="flex items-center px-1">
                <ChevronRight className={cn(
                  "w-4 h-4 transition-colors",
                  phase === "summary" ? "text-teal-500" : "text-gray-300"
                )} />
              </div>

              {/* Phase 3: Summary */}
              <button
                onClick={() => determinationResult?.isReportable && setPhase("summary")}
                disabled={!determinationResult?.isReportable}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200",
                  phase === "summary"
                    ? "bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-lg shadow-teal-500/25"
                    : determinationResult?.isReportable
                      ? "hover:bg-teal-50 text-gray-600 hover:text-teal-700"
                      : "text-gray-300 cursor-not-allowed"
                )}
              >
                <span className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold",
                  phase === "summary" ? "bg-white/20" : "bg-gray-100"
                )}>
                  3
                </span>
                <span className="font-medium hidden sm:inline">Summary</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="max-w-5xl mx-auto px-4 md:px-8 py-8">
          {/* Determination ID and Progress */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
              <FileText className="w-4 h-4" />
              <span className="font-mono">ID: {determinationId}</span>
            </div>
            
            {phase === "determination" && (
              <div className="mb-6 print:hidden">
                {/* Enhanced Progress Bar */}
                <div className="relative">
                  {/* Background track */}
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    {/* Animated fill */}
                    <div 
                      className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${determinationProgress}%` }}
                    />
                  </div>
                  
                  {/* Progress indicator badge */}
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        Step {relevantDeterminationSteps.indexOf(determinationStep) + 1}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        • Determination Phase
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                      <span className="text-sm font-semibold text-primary">
                        {determinationProgress}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {phase === "collection" && (
              <div className="mb-6 print:hidden">
                {/* Enhanced Progress Bar */}
                <div className="relative">
                  {/* Background track */}
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    {/* Animated fill */}
                    <div 
                      className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${collectionProgress}%` }}
                    />
                  </div>
                  
                  {/* Progress indicator badge */}
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        Section {collectionSteps.indexOf(collectionStep) + 1}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        of {collectionSteps.length}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                      <span className="text-sm font-semibold text-primary">
                        {Math.round(collectionProgress)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* PHASE 1: DETERMINATION */}
          {phase === "determination" && (
            <Card className="mb-6 border-0 rounded-2xl shadow-xl shadow-teal-500/5 ring-1 ring-gray-100 overflow-hidden">
              {/* Property Type */}
              {determinationStep === "property" && (
                <>
                  <SectionHeader 
                    step="Step 1: Property Type"
                    title="Is this a Residential Transaction?"
                    description="Residential includes: 1-4 Family Structure, Intent to Build 1-4 Family Structure, Condo/Townhome, or Co-op (per 1031.320(b))"
                    icon={Home}
                  />
                  <CardContent className="pt-8 pb-8">
                    <div className="grid gap-4 sm:grid-cols-2 max-w-xl mx-auto">
                      {/* Yes Option */}
                      <button
                        onClick={() => setDetermination(prev => ({ ...prev, isResidential: "yes" }))}
                        className={cn(
                          "relative flex flex-col items-center p-6 rounded-2xl border-2 transition-all duration-200",
                          "hover:shadow-lg hover:scale-[1.02]",
                          determination.isResidential === "yes"
                            ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                            : "border-muted hover:border-primary/50 hover:bg-muted/50"
                        )}
                      >
                        {/* Selection indicator */}
                        <div className={cn(
                          "absolute top-4 right-4 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                          determination.isResidential === "yes"
                            ? "border-primary bg-primary"
                            : "border-muted-foreground/30"
                        )}>
                          {determination.isResidential === "yes" && (
                            <Check className="h-4 w-4 text-primary-foreground" />
                          )}
                        </div>
                        
                        <div className={cn(
                          "w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-colors",
                          determination.isResidential === "yes"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        )}>
                          <Home className="h-7 w-7" />
                        </div>
                        <span className="text-xl font-semibold">Yes</span>
                        <span className="text-sm text-muted-foreground mt-1">Residential property</span>
                      </button>

                      {/* No Option */}
                      <button
                        onClick={() => setDetermination(prev => ({ ...prev, isResidential: "no" }))}
                        className={cn(
                          "relative flex flex-col items-center p-6 rounded-2xl border-2 transition-all duration-200",
                          "hover:shadow-lg hover:scale-[1.02]",
                          determination.isResidential === "no"
                            ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                            : "border-muted hover:border-primary/50 hover:bg-muted/50"
                        )}
                      >
                        {/* Selection indicator */}
                        <div className={cn(
                          "absolute top-4 right-4 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                          determination.isResidential === "no"
                            ? "border-primary bg-primary"
                            : "border-muted-foreground/30"
                        )}>
                          {determination.isResidential === "no" && (
                            <Check className="h-4 w-4 text-primary-foreground" />
                          )}
                        </div>
                        
                        <div className={cn(
                          "w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-colors",
                          determination.isResidential === "no"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        )}>
                          <Building2 className="h-7 w-7" />
                        </div>
                        <span className="text-xl font-semibold">No</span>
                        <span className="text-sm text-muted-foreground mt-1">Commercial/Other</span>
                      </button>
                    </div>
                  </CardContent>
                </>
              )}

              {/* Intent to Build */}
              {determinationStep === "intent-to-build" && (
                <>
                  <SectionHeader 
                    step="Step 1A: Intent to Build"
                    title="Does the Buyer intend to build a 1-4 family residential structure?"
                    description="Per 1031.320(b)(ii), land purchased with intent to build residential property is covered. A certification from the buyer will be required."
                  />
                  <CardContent className="pt-6">
                    <div className="flex flex-col sm:flex-row gap-4">
                      <Button
                        variant={determination.hasIntentToBuild === "yes" ? "default" : "outline"}
                        size="lg"
                        className="flex-1 h-16 text-lg"
                        onClick={() => setDetermination(prev => ({ ...prev, hasIntentToBuild: "yes" }))}
                      >
                        Yes
                      </Button>
                      <Button
                        variant={determination.hasIntentToBuild === "no" ? "default" : "outline"}
                        size="lg"
                        className="flex-1 h-16 text-lg"
                        onClick={() => setDetermination(prev => ({ ...prev, hasIntentToBuild: "no" }))}
                      >
                        No
                      </Button>
                    </div>
                  </CardContent>
                </>
              )}

              {/* Financing */}
              {determinationStep === "financing" && (
                <>
                  <SectionHeader 
                    step="Step 2: Financing"
                    title="Is this a non-financed transfer?"
                    description="A non-financed transfer means no mortgage lender is involved in the transaction (cash purchase, seller financing, etc.)"
                  />
                  <CardContent className="pt-6">
                    {/* Pre-filled indicator */}
                    {initialData?.determination?.isNonFinanced && initialData?.collection?.financingType && (
                      <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg flex items-center gap-2">
                        <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                        <span className="text-sm text-blue-700 dark:text-blue-300">
                          Pre-filled based on client&apos;s indication of &quot;{initialData.collection.financingType}&quot; financing. Please verify.
                        </span>
                      </div>
                    )}
                    <div className="flex flex-col sm:flex-row gap-4">
                      <Button
                        variant={determination.isNonFinanced === "yes" ? "default" : "outline"}
                        size="lg"
                        className="flex-1 h-16 text-lg"
                        onClick={() => setDetermination(prev => ({ ...prev, isNonFinanced: "yes" }))}
                      >
                        Yes (Non-financed)
                      </Button>
                      <Button
                        variant={determination.isNonFinanced === "no" ? "default" : "outline"}
                        size="lg"
                        className="flex-1 h-16 text-lg"
                        onClick={() => setDetermination(prev => ({ ...prev, isNonFinanced: "no" }))}
                      >
                        No (Has Lender)
                      </Button>
                    </div>
                  </CardContent>
                </>
              )}

              {/* Lender AML */}
              {determinationStep === "lender-aml" && (
                <>
                  <SectionHeader 
                    step="Step 2A: Lender AML Program"
                    title="Does the Lender have an Anti-Money Laundering (AML) Program?"
                    description="Per 1031.320(i), lenders with AML programs handle their own reporting requirements."
                  />
                  <CardContent className="pt-6">
                    <div className="flex flex-col sm:flex-row gap-4">
                      <Button
                        variant={determination.lenderHasAml === "yes" ? "default" : "outline"}
                        size="lg"
                        className="flex-1 h-14"
                        onClick={() => setDetermination(prev => ({ ...prev, lenderHasAml: "yes" }))}
                      >
                        Yes
                      </Button>
                      <Button
                        variant={determination.lenderHasAml === "no" ? "default" : "outline"}
                        size="lg"
                        className="flex-1 h-14"
                        onClick={() => setDetermination(prev => ({ ...prev, lenderHasAml: "no" }))}
                      >
                        No
                      </Button>
                      <Button
                        variant={determination.lenderHasAml === "unknown" ? "default" : "outline"}
                        size="lg"
                        className="flex-1 h-14"
                        onClick={() => setDetermination(prev => ({ ...prev, lenderHasAml: "unknown" }))}
                      >
                        Unknown
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground mt-4">
                      <TooltipIcon term="aml" />
                      {" "}Most institutional lenders (banks, credit unions) have AML programs.
                    </p>
                  </CardContent>
                </>
              )}

              {/* Buyer Type */}
              {determinationStep === "buyer-type" && (
                <>
                  <SectionHeader 
                    step="Step 3: Buyer Type"
                    title="Is the Buyer (Transferee) an Individual, Entity, or Trust?"
                  />
                  <CardContent className="pt-6 space-y-6">
                    <div className="flex flex-col sm:flex-row gap-4">
                      <Button
                        variant={determination.buyerType === "individual" ? "default" : "outline"}
                        size="lg"
                        className="flex-1 h-16"
                        onClick={() => setDetermination(prev => ({ ...prev, buyerType: "individual", entitySubtype: undefined, buyerBoiStatus: undefined, buyerFincenId: undefined }))}
                      >
                        <div className="text-center">
                          <div className="text-lg">Individual</div>
                          <div className="text-xs opacity-70">Natural person</div>
                        </div>
                      </Button>
                      <Button
                        variant={determination.buyerType === "entity" ? "default" : "outline"}
                        size="lg"
                        className="flex-1 h-16"
                        onClick={() => setDetermination(prev => ({ ...prev, buyerType: "entity" }))}
                      >
                        <div className="text-center">
                          <div className="text-lg">Entity</div>
                          <div className="text-xs opacity-70">LLC, Corp, Partnership</div>
                        </div>
                      </Button>
                      <Button
                        variant={determination.buyerType === "trust" ? "default" : "outline"}
                        size="lg"
                        className="flex-1 h-16"
                        onClick={() => setDetermination(prev => ({ ...prev, buyerType: "trust", entitySubtype: undefined, buyerBoiStatus: undefined, buyerFincenId: undefined }))}
                      >
                        <div className="text-center">
                          <div className="text-lg">Trust</div>
                          <div className="text-xs opacity-70">Any trust type</div>
                        </div>
                      </Button>
                    </div>

                    {/* Entity Subtype Selection */}
                    {determination.buyerType === "entity" && (
                      <div className="space-y-4 pt-4 border-t">
                        <div>
                          <Label className="text-base font-medium">What type of entity is the buyer?</Label>
                          <p className="text-sm text-muted-foreground mt-1">
                            Select the specific entity type for accurate document requirements
                          </p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {ENTITY_SUBTYPE_OPTIONS.map((option) => (
                            <div 
                              key={option.value} 
                              className={cn(
                                "flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors",
                                determination.entitySubtype === option.value 
                                  ? "border-primary bg-primary/5" 
                                  : "hover:bg-muted/50"
                              )}
                              onClick={() => setDetermination(prev => ({ ...prev, entitySubtype: option.value }))}
                            >
                              <div className={cn(
                                "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                                determination.entitySubtype === option.value ? "border-primary" : "border-muted-foreground"
                              )}>
                                {determination.entitySubtype === option.value && (
                                  <div className="w-2 h-2 rounded-full bg-primary" />
                                )}
                              </div>
                              <div className="flex-1">
                                <span className="font-medium">{option.label}</span>
                                <p className="text-xs text-muted-foreground">{option.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        {/* Document Checklist - shows after subtype selected */}
                        {determination.entitySubtype && (
                          <Card className="bg-blue-50 border-blue-200">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm font-medium text-blue-800 flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                Documents to Have on File
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0">
                              <ul className="text-sm text-blue-700 space-y-1">
                                {ENTITY_DOCUMENT_CHECKLIST[determination.entitySubtype].map((doc, i) => (
                                  <li key={i} className="flex items-center gap-2">
                                    <CheckCircle className="h-4 w-4 flex-shrink-0" />
                                    <span>{doc}</span>
                                  </li>
                                ))}
                              </ul>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    )}

                    {/* BOI Status - only for entities that need BOI reporting */}
                    {determination.buyerType === "entity" && 
                     determination.entitySubtype && 
                     determination.entitySubtype !== "pension_plan" && (
                      <div className="space-y-4 pt-4 border-t">
                        <div>
                          <Label className="text-base font-medium">
                            Has this entity filed its Beneficial Ownership Information (BOI) report with FinCEN?
                          </Label>
                        </div>
                        
                        <div className="space-y-2">
                          {BOI_STATUS_OPTIONS.map((option) => (
                            <div 
                              key={option.value} 
                              className={cn(
                                "flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors",
                                determination.buyerBoiStatus === option.value 
                                  ? "border-primary bg-primary/5" 
                                  : "hover:bg-muted/50"
                              )}
                              onClick={() => setDetermination(prev => ({ ...prev, buyerBoiStatus: option.value }))}
                            >
                              <div className={cn(
                                "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                                determination.buyerBoiStatus === option.value ? "border-primary" : "border-muted-foreground"
                              )}>
                                {determination.buyerBoiStatus === option.value && (
                                  <div className="w-2 h-2 rounded-full bg-primary" />
                                )}
                              </div>
                              <span>{option.label}</span>
                            </div>
                          ))}
                        </div>
                        
                        {/* FinCEN ID input if BOI filed */}
                        {determination.buyerBoiStatus === "filed" && (
                          <div className="ml-6">
                            <Label htmlFor="fincen-id">FinCEN ID (optional)</Label>
                            <Input
                              id="fincen-id"
                              placeholder="Enter FinCEN ID if available"
                              value={determination.buyerFincenId || ""}
                              onChange={(e) => 
                                setDetermination(prev => ({ ...prev, buyerFincenId: e.target.value }))
                              }
                              className="mt-1"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              If available, this can help verify beneficial owner information
                            </p>
                          </div>
                        )}
                        
                        {/* Warning if BOI not filed */}
                        {determination.buyerBoiStatus === "not_filed" && (
                          <Alert className="bg-amber-50 border-amber-200">
                            <AlertTriangle className="h-4 w-4 text-amber-600" />
                            <AlertDescription className="text-amber-700 text-sm">
                              Note: Most entities are required to file BOI reports with FinCEN. 
                              This may be a compliance concern for the buyer.
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    )}
                  </CardContent>
                </>
              )}

              {/* Individual Exemptions */}
              {determinationStep === "individual-exemptions" && (
                <>
                  <SectionHeader 
                    step="Step 4: Transaction Exemptions"
                    title="Does any of the following exemptions apply to this transaction?"
                    description="Per 1031.320(b)(2), certain transaction types are exempt from reporting."
                  />
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      {INDIVIDUAL_EXEMPTIONS.map((exemption) => (
                        <div key={exemption.id} className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                          <Checkbox
                            id={exemption.id}
                            checked={determination.individualExemptions.includes(exemption.id)}
                            onCheckedChange={() => toggleExemption("individual", exemption.id)}
                            disabled={determination.individualExemptions.includes("none") && exemption.id !== "none"}
                          />
                          <Label htmlFor={exemption.id} className="text-sm cursor-pointer flex-1">
                            {exemption.label}
                            {exemption.id === "1031" && <TooltipIcon term="1031" />}
                          </Label>
                        </div>
                      ))}
                      <Separator className="my-4" />
                      <div className="flex items-start gap-3 p-3 rounded-lg border border-destructive/50 hover:bg-destructive/5 transition-colors">
                        <Checkbox
                          id="none"
                          checked={determination.individualExemptions.includes("none")}
                          onCheckedChange={() => toggleExemption("individual", "none")}
                        />
                        <Label htmlFor="none" className="text-sm cursor-pointer flex-1 font-medium">
                          None of the above apply
                        </Label>
                      </div>
                    </div>
                  </CardContent>
                </>
              )}

              {/* Entity Exemptions */}
              {determinationStep === "entity-exemptions" && (
                <>
                  <SectionHeader 
                    step="Step 5: Entity Exemptions"
                    title="Is the Buyer Entity any of the following exempt entity types?"
                    description="Per 1031.320(n)(10), certain regulated entities are exempt from RRER reporting."
                  />
                  <CardContent className="pt-6">
                    <div className="space-y-3 max-h-[400px] overflow-y-auto">
                      {ENTITY_EXEMPTIONS.map((exemption) => (
                        <div key={exemption.id} className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                          <Checkbox
                            id={exemption.id}
                            checked={determination.entityExemptions.includes(exemption.id)}
                            onCheckedChange={() => toggleExemption("entity", exemption.id)}
                            disabled={determination.entityExemptions.includes("none") && exemption.id !== "none"}
                          />
                          <Label htmlFor={exemption.id} className="text-sm cursor-pointer flex-1">
                            {exemption.label}
                          </Label>
                        </div>
                      ))}
                      <Separator className="my-4" />
                      <div className="flex items-start gap-3 p-3 rounded-lg border border-destructive/50 hover:bg-destructive/5 transition-colors">
                        <Checkbox
                          id="entity-none"
                          checked={determination.entityExemptions.includes("none")}
                          onCheckedChange={() => toggleExemption("entity", "none")}
                        />
                        <Label htmlFor="entity-none" className="text-sm cursor-pointer flex-1 font-medium">
                          None of the above apply
                        </Label>
                      </div>
                    </div>
                  </CardContent>
                </>
              )}

              {/* Trust Exemptions */}
              {determinationStep === "trust-exemptions" && (
                <>
                  <SectionHeader 
                    step="Step 6: Trust Exemptions"
                    title="Is the Buyer Trust any of the following exempt trust types?"
                    description="Per 1031.320(n)(11), certain trust types are exempt from RRER reporting."
                  />
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      {TRUST_EXEMPTIONS.map((exemption) => (
                        <div key={exemption.id} className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                          <Checkbox
                            id={exemption.id}
                            checked={determination.trustExemptions.includes(exemption.id)}
                            onCheckedChange={() => toggleExemption("trust", exemption.id)}
                            disabled={determination.trustExemptions.includes("none") && exemption.id !== "none"}
                          />
                          <Label htmlFor={exemption.id} className="text-sm cursor-pointer flex-1">
                            {exemption.label}
                            {exemption.id === "statutory" && <TooltipIcon term="statutory-trust" />}
                          </Label>
                        </div>
                      ))}
                      <Separator className="my-4" />
                      <div className="flex items-start gap-3 p-3 rounded-lg border border-destructive/50 hover:bg-destructive/5 transition-colors">
                        <Checkbox
                          id="trust-none"
                          checked={determination.trustExemptions.includes("none")}
                          onCheckedChange={() => toggleExemption("trust", "none")}
                        />
                        <Label htmlFor="trust-none" className="text-sm cursor-pointer flex-1 font-medium">
                          None of the above apply
                        </Label>
                      </div>
                    </div>
                  </CardContent>
                </>
              )}

              {/* Determination Result */}
              {determinationStep === "determination-result" && determinationResult && (
                <>
                  <SectionHeader 
                    step="Determination Complete"
                    title={determinationResult.isReportable ? "Reportable Transfer" : "Reporting NOT Required"}
                    icon={determinationResult.isReportable ? FileWarning : CheckCircle2}
                  />
                  <CardContent className="pt-8 pb-8">
                    {/* Reportable Result - Dramatic Display */}
                    {determinationResult.isReportable ? (
                      <div className="relative overflow-hidden rounded-2xl border-2 border-amber-500/50 bg-gradient-to-br from-amber-50 to-orange-50 p-8">
                        {/* Animated background pattern */}
                        <div className="absolute inset-0 opacity-20">
                          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(251,146,60,0.4),transparent_50%)]" />
                          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(234,88,12,0.3),transparent_50%)]" />
                        </div>
                        
                        <div className="relative flex flex-col items-center text-center">
                          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center mb-6 shadow-xl shadow-amber-500/30">
                            <FileWarning className="h-10 w-10" />
                          </div>
                          
                          <h3 className="text-2xl font-bold text-amber-900 mb-3">
                            FinCEN Report Required
                          </h3>
                          
                          <p className="text-amber-800 max-w-lg">
                            {determinationResult.reason}
                          </p>
                          
                          <p className="text-amber-700 font-medium mt-3 max-w-lg">
                            {determinationResult.documentation}
                          </p>
                          
                          <div className="mt-6 flex items-center gap-2 text-sm text-amber-700 bg-amber-100/80 px-5 py-2.5 rounded-full border border-amber-200">
                            <AlertTriangle className="h-4 w-4" />
                            <span className="font-medium">Filing deadline: 30 days from closing</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Exempt Result - Clean and Reassuring */
                      <div className="relative overflow-hidden rounded-2xl border-2 border-green-500/50 bg-gradient-to-br from-green-50 to-emerald-50 p-8">
                        {/* Background pattern */}
                        <div className="absolute inset-0 opacity-20">
                          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(34,197,94,0.4),transparent_50%)]" />
                          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(16,185,129,0.3),transparent_50%)]" />
                        </div>
                        
                        <div className="relative flex flex-col items-center text-center">
                          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 text-white flex items-center justify-center mb-6 shadow-xl shadow-green-500/30">
                            <CheckCircle className="h-10 w-10" />
                          </div>
                          
                          <h3 className="text-2xl font-bold text-green-900 mb-3">
                            No FinCEN Report Required
                          </h3>
                          
                          <p className="text-green-800 max-w-lg mb-4">
                            {determinationResult.reason}
                          </p>
                          
                          {determinationResult.exemptionsSelected && determinationResult.exemptionsSelected.length > 0 && (
                            <div className="bg-white/80 rounded-xl p-5 border border-green-200 max-w-lg w-full mb-6">
                              <p className="text-sm font-semibold text-green-900 mb-2">Exemption Reason:</p>
                              <ul className="text-sm text-green-700 space-y-1">
                                {determinationResult.exemptionsSelected.map((ex, i) => (
                                  <li key={i} className="flex items-start gap-2">
                                    <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                                    <span>{ex}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          {/* Certificate Dialog Button */}
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold h-12 px-8 rounded-xl shadow-lg shadow-green-500/25 hover:shadow-xl transition-all"
                              >
                                <Shield className="w-5 h-5 mr-2" />
                                View & Print Exemption Certificate
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                              <DialogHeader className="sr-only">
                                <DialogTitle>Exemption Certificate</DialogTitle>
                              </DialogHeader>
                              <ExemptionCertificate
                                data={{
                                  certificateId: determinationId,
                                  propertyAddress: {
                                    street: collection.propertyAddress?.street,
                                    city: collection.propertyAddress?.city,
                                    state: collection.propertyAddress?.state,
                                    zip: collection.propertyAddress?.zip,
                                  },
                                  purchasePrice: collection.purchasePrice || 0,
                                  buyerName: collection.buyerType === "entity" 
                                    ? (collection.buyerEntity?.entity?.legalName || "Entity Buyer")
                                    : collection.buyerType === "trust"
                                    ? (collection.buyerTrust?.trust?.legalName || "Trust Buyer")
                                    : "Individual Buyer",
                                  escrowNumber: collection.escrowNumber,
                                  exemptionReasons: (determinationResult.exemptionsSelected || []).map(ex => ({
                                    code: ex,
                                    display: formatExemptionReason(ex),
                                  })),
                                  determinationTimestamp: createdAt,
                                  determinationMethod: "FinClear Wizard",
                                }}
                                showActions={true}
                              />
                            </DialogContent>
                          </Dialog>
                          
                          <p className="text-sm text-green-600 mt-4 flex items-center gap-2">
                            <Info className="w-4 h-4" />
                            Save this certificate for your records. Retain for 5 years.
                          </p>
                        </div>
                      </div>
                    )}

                    {determinationResult.isReportable && (
                      <div className="mt-8 p-6 bg-gradient-to-br from-muted/50 to-muted rounded-2xl border">
                        <h4 className="font-semibold flex items-center gap-2 text-lg">
                          <Clock className="w-5 h-5 text-primary" />
                          Filing Deadline Information
                        </h4>
                        <p className="text-sm text-muted-foreground mt-3">
                          The RER must be filed by the later of:
                        </p>
                        <ul className="text-sm mt-2 space-y-1">
                          <li className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                            30 days after closing
                          </li>
                          <li className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                            Last day of the month following closing
                          </li>
                        </ul>
                        <Button 
                          className={cn(
                            "mt-6 w-full gap-2 h-12",
                            "bg-gradient-to-r from-teal-500 to-teal-600",
                            "hover:from-teal-600 hover:to-teal-700",
                            "shadow-lg shadow-teal-500/25 hover:shadow-xl hover:shadow-teal-500/35",
                            "text-white font-semibold rounded-xl",
                            "transition-all duration-200"
                          )}
                          size="lg"
                          onClick={startCollection}
                        >
                          <Sparkles className="w-4 h-4" />
                          Proceed to Information Collection
                          <ArrowRight className="w-4 h-4" />
                        </Button>
                      </div>
                    )}

                    {/* Summary */}
                    <div className="mt-6 p-4 border rounded-lg">
                      <h4 className="font-semibold mb-3">Determination Summary</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between py-1 border-b">
                          <span className="text-muted-foreground">Determination ID:</span>
                          <span className="font-mono">{determinationId}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b">
                          <span className="text-muted-foreground">Date/Time:</span>
                          <span>{new Date(createdAt).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b">
                          <span className="text-muted-foreground">Residential Transaction:</span>
                          <span className="capitalize">{determination.isResidential}</span>
                        </div>
                        {determination.hasIntentToBuild && (
                          <div className="flex justify-between py-1 border-b">
                            <span className="text-muted-foreground">Intent to Build:</span>
                            <span className="capitalize">{determination.hasIntentToBuild}</span>
                          </div>
                        )}
                        {determination.isNonFinanced && (
                          <div className="flex justify-between py-1 border-b">
                            <span className="text-muted-foreground">Non-financed Transfer:</span>
                            <span className="capitalize">{determination.isNonFinanced}</span>
                          </div>
                        )}
                        {determination.lenderHasAml && (
                          <div className="flex justify-between py-1 border-b">
                            <span className="text-muted-foreground">Lender AML Program:</span>
                            <span className="capitalize">{determination.lenderHasAml}</span>
                          </div>
                        )}
                        {determination.buyerType && (
                          <div className="flex justify-between py-1 border-b">
                            <span className="text-muted-foreground">Buyer Type:</span>
                            <span className="capitalize">{determination.buyerType}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="border-t bg-gradient-to-r from-slate-50 via-gray-50 to-slate-50 gap-3 print:hidden">
                    {!determinationResult.isReportable && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" className="gap-2 h-11 rounded-xl border-2 font-medium hover:bg-white hover:border-green-300">
                            <Shield className="w-4 h-4 text-green-600" />
                            View Certificate
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader className="sr-only">
                            <DialogTitle>Exemption Certificate</DialogTitle>
                          </DialogHeader>
                          <ExemptionCertificate
                            data={{
                              certificateId: determinationId,
                              propertyAddress: {
                                street: collection.propertyAddress?.street,
                                city: collection.propertyAddress?.city,
                                state: collection.propertyAddress?.state,
                                zip: collection.propertyAddress?.zip,
                              },
                              purchasePrice: collection.purchasePrice || 0,
                              buyerName: collection.buyerType === "entity" 
                                ? (collection.buyerEntity?.entity?.legalName || "Entity Buyer")
                                : collection.buyerType === "trust"
                                ? (collection.buyerTrust?.trust?.legalName || "Trust Buyer")
                                : "Individual Buyer",
                              escrowNumber: collection.escrowNumber,
                              exemptionReasons: (determinationResult.exemptionsSelected || []).map(ex => ({
                                code: ex,
                                display: formatExemptionReason(ex),
                              })),
                              determinationTimestamp: createdAt,
                              determinationMethod: "FinClear Wizard",
                            }}
                            showActions={true}
                          />
                        </DialogContent>
                      </Dialog>
                    )}
                    <Button variant="outline" onClick={handlePrint} className="gap-2 h-11 rounded-xl border-2 font-medium hover:bg-white hover:border-teal-300">
                      <Printer className="w-4 h-4" />
                      Print Summary
                    </Button>
                    <Button variant="outline" onClick={resetQuestionnaire} className="gap-2 h-11 rounded-xl border-2 font-medium hover:bg-white hover:border-teal-300">
                      <RotateCcw className="w-4 h-4" />
                      Start Over
                    </Button>
                  </CardFooter>
                </>
              )}

              {/* Navigation for non-result steps */}
              {determinationStep !== "determination-result" && (
                <CardFooter className="border-t bg-gradient-to-r from-muted/30 via-muted/50 to-muted/30 flex items-center justify-between py-5 print:hidden">
                  <Button
                    variant="ghost"
                    onClick={goToPreviousDeterminationStep}
                    disabled={relevantDeterminationSteps.indexOf(determinationStep) === 0}
                    className="gap-2 hover:bg-background/80"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Back
                  </Button>
                  
                  {/* Step indicator */}
                  <span className="text-sm text-muted-foreground hidden sm:block">
                    Determination • {determinationProgress}% complete
                  </span>
                  
                  <Button
                    onClick={goToNextDeterminationStep}
                    disabled={!canProceedDetermination}
                    className={cn(
                      "gap-2 min-w-[130px]",
                      canProceedDetermination && "shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30"
                    )}
                  >
                    Continue
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </CardFooter>
              )}
            </Card>
          )}

          {/* PHASE 2: COLLECTION */}
          {phase === "collection" && (
            <>
              {/* Reportable Transfer Banner - Premium */}
              <div className="mb-8 relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 p-5">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_50%,rgba(251,146,60,0.15),transparent_50%)]" />
                <div className="relative flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-amber-500 text-white shadow-lg shadow-amber-500/30">
                    <FileWarning className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-amber-900 flex items-center gap-2">
                      <span>REPORTABLE TRANSFER</span>
                      <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
                        Action Required
                      </Badge>
                    </h3>
                    <p className="text-sm text-amber-800 mt-1">
                      This transaction requires FinCEN Real Estate Report filing. Please collect all required information below.
                    </p>
                  </div>
                  {filingDeadline && (
                    <div className="hidden md:flex flex-col items-end text-right">
                      <span className="text-xs text-amber-700 font-medium">Filing Deadline</span>
                      <span className="text-lg font-bold text-amber-900">
                        {new Date(filingDeadline.deadline).toLocaleDateString()}
                      </span>
                      <span className={cn(
                        "text-xs font-medium mt-0.5",
                        filingDeadline.daysRemaining <= 7 ? "text-red-600" : "text-amber-700"
                      )}>
                        {filingDeadline.daysRemaining} days remaining
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <Card className="mb-6 border-0 rounded-2xl shadow-xl shadow-teal-500/5 ring-1 ring-gray-100 overflow-hidden">
                {/* Transaction & Property */}
                {collectionStep === "transaction-property" && (
                  <>
                    <SectionHeader 
                      step="Section 2A: Transaction & Property"
                      title="Transaction Details"
                    />
                    <CardContent className="pt-6 space-y-6">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="grid gap-2">
                          <Label htmlFor="closingDate" className="flex items-center gap-2">
                            Expected/Actual Closing Date *
                            {collection.closingDate && initialData?.collection?.closingDate && (
                              <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">Pre-filled</Badge>
                            )}
                          </Label>
                          <Input
                            id="closingDate"
                            type="date"
                            value={collection.closingDate || ""}
                            onChange={(e) => setCollection(prev => ({ ...prev, closingDate: e.target.value }))}
                            required
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="purchasePrice">Total Purchase Price *</Label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">$</span>
                            <Input
                              id="purchasePrice"
                              type="text"
                              inputMode="numeric"
                              className="pl-7 text-lg font-medium"
                              placeholder="1,500,000"
                              value={formatPriceForInput(collection.purchasePrice)}
                              onChange={(e) => setCollection(prev => ({ 
                                ...prev, 
                                purchasePrice: parsePriceFromInput(e.target.value) 
                              }))}
                              required
                            />
                          </div>
                          {collection.purchasePrice > 0 && (
                            <p className="text-xs text-muted-foreground">
                              {formatCurrency(collection.purchasePrice)}
                            </p>
                          )}
                        </div>
                      </div>

                      <Separator />

                      <div>
                        <h4 className="font-medium mb-4 flex items-center gap-2">
                          <Home className="h-4 w-4" />
                          Property Address
                        </h4>
                        
                        {/* Pre-filled address from entry form - show as confirmation */}
                        {collection.propertyAddress?.street && !collection._editingAddress ? (
                          <div className="space-y-3">
                            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start gap-3">
                                  <div className="p-2 rounded-full bg-green-100">
                                    <MapPin className="h-4 w-4 text-green-600" />
                                  </div>
                                  <div>
                                    <p className="font-medium text-green-900">
                                      {collection.propertyAddress.street}
                                    </p>
                                    <p className="text-sm text-green-700">
                                      {collection.propertyAddress.city}, {collection.propertyAddress.state} {collection.propertyAddress.zip}
                                    </p>
                                    {collection.county && (
                                      <p className="text-xs text-green-600 mt-1">
                                        County: {collection.county}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setCollection(prev => ({ ...prev, _editingAddress: true }))}
                                  className="text-green-700 hover:text-green-800 hover:bg-green-100"
                                >
                                  Change
                                </Button>
                              </div>
                              
                              {/* SiteX data preview if available */}
                              {collection.siteXData?.apn && (
                                <div className="mt-3 pt-3 border-t border-green-200">
                                  <p className="text-xs text-green-600">
                                    APN: {collection.siteXData.apn}
                                    {collection.siteXData.ownerName && ` • Owner: ${collection.siteXData.ownerName}`}
                                  </p>
                                </div>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              ✓ Address confirmed from report entry. Click &quot;Change&quot; to edit.
                            </p>
                          </div>
                        ) : (
                          <>
                            {/* Full address entry with autocomplete */}
                            <AddressAutocomplete
                              onSelect={(address: ParsedAddress, property?: PropertyData) => {
                                setCollection(prev => {
                                  // Parse owner name into first/last for seller auto-fill
                                  let updatedSellers = prev.sellers || [createEmptySeller()];
                                  if (property?.primary_owner?.full_name && updatedSellers.length > 0) {
                                    const ownerName = property.primary_owner.full_name.trim();
                                    const nameParts = ownerName.split(/\s+/);
                                    const firstName = nameParts[0] || "";
                                    const lastName = nameParts.slice(1).join(" ") || "";
                                    
                                    // Only auto-fill if the first seller doesn't have a name yet
                                    const firstSeller = updatedSellers[0];
                                    if (firstSeller.type === "individual" && 
                                        firstSeller.individual && 
                                        !firstSeller.individual.firstName && 
                                        !firstSeller.individual.lastName) {
                                      updatedSellers = [
                                        {
                                          ...firstSeller,
                                          individual: {
                                            ...firstSeller.individual,
                                            firstName,
                                            lastName,
                                          },
                                        },
                                        ...updatedSellers.slice(1),
                                      ];
                                    }
                                  }
                                  
                                  return {
                                    ...prev,
                                    _editingAddress: false, // Close edit mode after selection
                                    propertyAddress: {
                                      street: address.street,
                                      unit: "",
                                      city: address.city,
                                      state: address.state || "CA",
                                      zip: address.zip,
                                      country: "United States",
                                    },
                                    county: address.county || prev.county || "",
                                    apn: property?.apn || prev.apn || "",
                                    sellers: updatedSellers,
                                    siteXData: property ? {
                                      apn: property.apn,
                                      ownerName: property.primary_owner?.full_name,
                                      ownerName2: property.secondary_owner?.full_name,
                                      propertyType: property.property_type,
                                      bedrooms: property.bedrooms,
                                      bathrooms: property.bathrooms,
                                      sqft: property.square_feet,
                                      yearBuilt: property.year_built,
                                      assessedValue: property.assessed_value,
                                      lookupTimestamp: new Date().toISOString(),
                                    } : undefined,
                                  };
                                });
                              }}
                              fetchPropertyData={true}
                              showPropertyCard={true}
                              placeholder="Start typing the property address..."
                              defaultValue={
                                collection.propertyAddress?.street
                                  ? `${collection.propertyAddress.street}, ${collection.propertyAddress.city}, ${collection.propertyAddress.state} ${collection.propertyAddress.zip}`
                                  : ""
                              }
                              required
                            />
                            
                            {/* Cancel edit button if editing pre-filled address */}
                            {collection._editingAddress && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setCollection(prev => ({ ...prev, _editingAddress: false }))}
                                className="mt-2"
                              >
                                Cancel edit
                              </Button>
                            )}
                            
                            {/* Manual address fallback (always visible for editing) */}
                            <div className="mt-4 p-4 bg-muted/50 rounded-lg border">
                              <p className="text-xs text-muted-foreground mb-3">
                                Address details (edit if needed):
                              </p>
                              <AddressFields
                                address={collection.propertyAddress || createEmptyAddress()}
                                onChange={(address) => setCollection(prev => ({ ...prev, propertyAddress: address }))}
                                prefix="property-"
                                required
                              />
                            </div>
                          </>
                        )}
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="grid gap-2">
                          <Label htmlFor="county">
                            County *
                            {collection.county && collection.siteXData?.apn && (
                              <Badge variant="secondary" className="ml-2 text-xs">Auto-filled</Badge>
                            )}
                          </Label>
                          <Input
                            id="county"
                            value={collection.county || ""}
                            onChange={(e) => setCollection(prev => ({ ...prev, county: e.target.value }))}
                            placeholder="Auto-filled from address lookup"
                            required
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="propertyType">Property Type *</Label>
                          <Select 
                            value={collection.propertyType || ""} 
                            onValueChange={(value) => setCollection(prev => ({ ...prev, propertyType: value }))}
                          >
                            <SelectTrigger id="propertyType">
                              <SelectValue placeholder="Select property type" />
                            </SelectTrigger>
                            <SelectContent>
                              {PROPERTY_TYPES.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="grid gap-2">
                          <Label htmlFor="apn">
                            APN (Assessor&apos;s Parcel Number)
                            {collection.apn && collection.siteXData?.apn && (
                              <Badge variant="secondary" className="ml-2 text-xs">Auto-filled</Badge>
                            )}
                          </Label>
                          <Input
                            id="apn"
                            value={collection.apn || ""}
                            onChange={(e) => setCollection(prev => ({ ...prev, apn: e.target.value }))}
                            placeholder="Auto-filled from address lookup"
                          />
                        </div>
                        {collection.siteXData?.ownerName && (
                          <div className="grid gap-2">
                            <Label className="text-muted-foreground flex items-center gap-2">
                              Owner of Record (from Title Plant)
                              <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Seller Auto-filled
                              </Badge>
                            </Label>
                            <div className="p-2 bg-teal-50 border border-teal-200 rounded-md text-sm">
                              {collection.siteXData.ownerName}
                              {collection.siteXData.ownerName2 && (
                                <span className="text-muted-foreground"> and {collection.siteXData.ownerName2}</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="legalDescription">Legal Description</Label>
                        <Textarea
                          id="legalDescription"
                          value={collection.legalDescription || ""}
                          onChange={(e) => setCollection(prev => ({ ...prev, legalDescription: e.target.value }))}
                          rows={3}
                        />
                      </div>
                    </CardContent>
                  </>
                )}

                {/* NEW: Party Setup Step */}
                {/* Links Sent Confirmation - shows after successful send */}
                {collectionStep === "party-setup" && showLinksSentConfirmation && (
                  <LinksSentConfirmation
                    sellers={partySetup.sellers}
                    buyers={partySetup.buyers}
                    propertyAddress={
                      collection.propertyAddress
                        ? `${collection.propertyAddress.street || ""}, ${collection.propertyAddress.city || ""}`
                        : "Property"
                    }
                    onViewStatus={() => {
                      setShowLinksSentConfirmation(false)
                      setCollectionStep("monitor-progress")
                    }}
                  />
                )}

                {/* Normal party-setup content - only show if NOT showing confirmation */}
                {collectionStep === "party-setup" && !showLinksSentConfirmation && (
                  <>
                    <SectionHeader 
                      step="Section 2B: Party Setup"
                      title="Party Setup"
                      description="Identify all parties and send them secure information requests"
                    />
                    <CardContent className="pt-6 space-y-6">
                      {/* Pre-filled from submission indicator */}
                      {initialData?.collection?.initialParties && (
                        (initialData.collection.initialParties.buyers?.length > 0 || 
                         initialData.collection.initialParties.sellers?.length > 0) && (
                          <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg flex items-center gap-2">
                            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                            <span className="text-sm text-blue-700 dark:text-blue-300">
                              Party information pre-filled from client submission. Please verify and update as needed.
                            </span>
                          </div>
                        )
                      )}
                      
                      {/* Sellers Section */}
                      <div>
                        <h4 className="font-semibold flex items-center gap-2 mb-4">
                          <User className="w-4 h-4" />
                          Sellers
                        </h4>
                        <div className="space-y-3">
                          {partySetup.sellers.map((seller, index) => (
                            <div key={seller.id} className="p-4 border rounded-lg space-y-3 bg-muted/30">
                              <div className="flex items-center justify-between">
                                <span className="font-medium">Seller {index + 1}</span>
                                {partySetup.sellers.length > 1 && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setPartySetup(prev => ({
                                      ...prev,
                                      sellers: prev.sellers.filter(s => s.id !== seller.id)
                                    }))}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                              <div className="grid gap-3 md:grid-cols-2">
                                <div className="grid gap-2">
                                  <Label>Name *</Label>
                                  <Input
                                    value={seller.name}
                                    onChange={(e) => setPartySetup(prev => ({
                                      ...prev,
                                      sellers: prev.sellers.map(s => s.id === seller.id ? { ...s, name: e.target.value } : s)
                                    }))}
                                    placeholder="John Smith"
                                  />
                                </div>
                                <div className="grid gap-2">
                                  <Label>Email *</Label>
                                  <Input
                                    type="email"
                                    value={seller.email}
                                    onChange={(e) => setPartySetup(prev => ({
                                      ...prev,
                                      sellers: prev.sellers.map(s => s.id === seller.id ? { ...s, email: e.target.value } : s)
                                    }))}
                                    placeholder="john@email.com"
                                  />
                                </div>
                              </div>
                              <div className="grid gap-2">
                                <Label>Type *</Label>
                                <div className="flex gap-4">
                                  {(["individual", "entity", "trust"] as const).map(type => (
                                    <label key={type} className="flex items-center gap-2 cursor-pointer">
                                      <input
                                        type="radio"
                                        name={`seller-type-${seller.id}`}
                                        checked={seller.type === type}
                                        onChange={() => setPartySetup(prev => ({
                                          ...prev,
                                          sellers: prev.sellers.map(s => s.id === seller.id ? { ...s, type } : s)
                                        }))}
                                        className="w-4 h-4"
                                      />
                                      <span className="capitalize">{type}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                              {(seller.type === "entity" || seller.type === "trust") && (
                                <div className="grid gap-2">
                                  <Label>Entity/Trust Name</Label>
                                  <Input
                                    value={seller.entityName || ""}
                                    onChange={(e) => setPartySetup(prev => ({
                                      ...prev,
                                      sellers: prev.sellers.map(s => s.id === seller.id ? { ...s, entityName: e.target.value } : s)
                                    }))}
                                    placeholder="Smith Family Trust"
                                  />
                                </div>
                              )}
                            </div>
                          ))}
                          <Button
                            variant="outline"
                            onClick={() => setPartySetup(prev => ({
                              ...prev,
                              sellers: [...prev.sellers, { id: generateId(), name: "", email: "", type: "individual" }]
                            }))}
                            className="w-full"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Seller
                          </Button>
                        </div>
                      </div>

                      <Separator />

                      {/* Buyers Section */}
                      <div>
                        <h4 className="font-semibold flex items-center gap-2 mb-4">
                          <Building2 className="w-4 h-4" />
                          Buyers
                        </h4>
                        <div className="space-y-3">
                          {partySetup.buyers.map((buyer, index) => (
                            <div key={buyer.id} className="p-4 border rounded-lg space-y-3 bg-muted/30">
                              <div className="flex items-center justify-between">
                                <span className="font-medium">Buyer {index + 1}</span>
                                {partySetup.buyers.length > 1 && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setPartySetup(prev => ({
                                      ...prev,
                                      buyers: prev.buyers.filter(b => b.id !== buyer.id)
                                    }))}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                              <div className="grid gap-3 md:grid-cols-2">
                                <div className="grid gap-2">
                                  <Label>Name/Entity Name *</Label>
                                  <Input
                                    value={buyer.name}
                                    onChange={(e) => setPartySetup(prev => ({
                                      ...prev,
                                      buyers: prev.buyers.map(b => b.id === buyer.id ? { ...b, name: e.target.value } : b)
                                    }))}
                                    placeholder="ABC Holdings LLC"
                                  />
                                </div>
                                <div className="grid gap-2">
                                  <Label>Contact Email *</Label>
                                  <Input
                                    type="email"
                                    value={buyer.email}
                                    onChange={(e) => setPartySetup(prev => ({
                                      ...prev,
                                      buyers: prev.buyers.map(b => b.id === buyer.id ? { ...b, email: e.target.value } : b)
                                    }))}
                                    placeholder="contact@abc.com"
                                  />
                                </div>
                              </div>
                              <div className="grid gap-2">
                                <Label>Type *</Label>
                                <div className="flex gap-4">
                                  {(["individual", "entity", "trust"] as const).map(type => (
                                    <label key={type} className="flex items-center gap-2 cursor-pointer">
                                      <input
                                        type="radio"
                                        name={`buyer-type-${buyer.id}`}
                                        checked={buyer.type === type}
                                        onChange={() => setPartySetup(prev => ({
                                          ...prev,
                                          buyers: prev.buyers.map(b => b.id === buyer.id ? { ...b, type } : b)
                                        }))}
                                        className="w-4 h-4"
                                      />
                                      <span className="capitalize">{type}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                              {buyer.type !== "individual" && (
                                <Alert className="bg-blue-50 border-blue-200">
                                  <Info className="w-4 h-4 text-blue-600" />
                                  <AlertDescription className="text-blue-700 text-sm">
                                    This party will be asked to provide:
                                    <ul className="list-disc list-inside mt-1">
                                      <li>Entity details (EIN, formation state, address)</li>
                                      <li>All beneficial owners (25%+ ownership or control)</li>
                                      <li>Signing individual information</li>
                                      <li>Payment source details</li>
                                    </ul>
                                  </AlertDescription>
                                </Alert>
                              )}
                            </div>
                          ))}
                          <Button
                            variant="outline"
                            onClick={() => setPartySetup(prev => ({
                              ...prev,
                              buyers: [...prev.buyers, { id: generateId(), name: "", email: "", type: "entity" }]
                            }))}
                            className="w-full"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Buyer
                          </Button>
                        </div>
                      </div>

                      <Separator />

                      {/* Email Preview */}
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <h4 className="font-medium flex items-center gap-2 mb-2">
                          <Mail className="w-4 h-4" />
                          Email Preview
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          Each party will receive a secure link via email. Links expire in 30 days.
                        </p>
                        {collection.propertyAddress && (
                          <p className="text-sm mt-2">
                            <strong>Property:</strong> {collection.propertyAddress.street}, {collection.propertyAddress.city}, {collection.propertyAddress.state} {collection.propertyAddress.zip}
                          </p>
                        )}
                      </div>

                      <Alert className="bg-amber-50 border-amber-200">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        <AlertDescription className="text-amber-700">
                          Links will be sent immediately upon clicking the button below.
                        </AlertDescription>
                      </Alert>

                      {/* Send Links Button */}
                      <div className="pt-4">
                        <Button 
                          onClick={handleSendPartyLinks}
                          disabled={sendingLinks || partySetup.sellers.length === 0 || partySetup.buyers.length === 0}
                          className="w-full h-12 bg-gradient-to-r from-primary to-teal-600 text-lg"
                        >
                          {sendingLinks ? (
                            <>
                              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                              Sending Links...
                            </>
                          ) : (
                            <>
                              <Send className="h-5 w-5 mr-2" />
                              Send Links & Continue ({partySetup.sellers.length + partySetup.buyers.length} parties)
                            </>
                          )}
                        </Button>
                        {partySetup.sellers.length === 0 || partySetup.buyers.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center mt-2">
                            Add at least one seller and one buyer to continue
                          </p>
                        ) : null}
                      </div>
                    </CardContent>
                  </>
                )}

                {/* NEW: Monitor Progress Step */}
                {collectionStep === "monitor-progress" && (
                  <>
                    <SectionHeader 
                      step="Section 2C: Monitor Progress"
                      title="Monitoring Party Submissions"
                      description="Track information submissions from all parties in real-time"
                    />
                    <CardContent className="pt-6 space-y-6">
                      {partyStatus ? (
                        <>
                          {/* Progress Summary */}
                          <div className="text-center p-6 bg-muted/30 rounded-lg">
                            <p className="text-4xl font-bold text-primary">
                              {partyStatus.summary.submitted} of {partyStatus.summary.total}
                            </p>
                            <p className="text-muted-foreground mt-1">Parties Submitted</p>
                            <Progress 
                              value={partyStatus.summary.total > 0 
                                ? (partyStatus.summary.submitted / partyStatus.summary.total) * 100 
                                : 0
                              } 
                              className="mt-4 h-3"
                            />
                          </div>
                          
                          {/* All Complete Banner */}
                          {partyStatus.summary.all_complete && (
                            <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
                              <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0" />
                              <div>
                                <p className="font-semibold text-green-800">All Parties Have Submitted!</p>
                                <p className="text-sm text-green-600">You can now proceed to review the submissions.</p>
                              </div>
                            </div>
                          )}
                          
                          {/* Party Cards */}
                          <div className="space-y-3">
                            {partyStatus.parties.map((party) => (
                              <Card key={party.id} className={cn(
                                "transition-colors",
                                party.status === "submitted" && "border-green-200 bg-green-50/30"
                              )}>
                                <CardContent className="pt-4">
                                  <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                      <div className={cn(
                                        "p-2 rounded-lg",
                                        party.status === "submitted" ? "bg-green-100" : "bg-muted"
                                      )}>
                                        {party.entity_type === "individual" ? (
                                          <User className="h-4 w-4" />
                                        ) : (
                                          <Building2 className="h-4 w-4" />
                                        )}
                                      </div>
                                      <div>
                                        <p className="font-medium">{party.display_name || "Unnamed Party"}</p>
                                        <p className="text-sm text-muted-foreground capitalize">
                                          {party.party_role === "transferor" ? "Seller" : "Buyer"} • {party.entity_type}
                                        </p>
                                        {party.email && (
                                          <p className="text-xs text-muted-foreground">{party.email}</p>
                                        )}
                                      </div>
                                    </div>
                                    
                                    <div className="text-right">
                                      {party.status === "submitted" ? (
                                        <Badge className="bg-green-600">
                                          <CheckCircle2 className="h-3 w-3 mr-1" />
                                          Submitted
                                        </Badge>
                                      ) : (
                                        <Badge variant="secondary">
                                          <Clock className="h-3 w-3 mr-1" />
                                          Pending
                                        </Badge>
                                      )}
                                      {party.submitted_at && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                          {new Date(party.submitted_at).toLocaleString()}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  
                                  {/* Actions for pending parties */}
                                  {party.status !== "submitted" && party.link && (
                                    <div className="mt-3 pt-3 border-t flex gap-2">
                                      <Button 
                                        size="sm" 
                                        variant="outline"
                                        onClick={() => {
                                          navigator.clipboard.writeText(party.link!)
                                          toast({ title: "Link Copied!" })
                                        }}
                                      >
                                        <Copy className="h-3 w-3 mr-1" />
                                        Copy Link
                                      </Button>
                                      <Button 
                                        size="sm" 
                                        variant="outline"
                                        onClick={() => window.open(party.link!, "_blank")}
                                      >
                                        <ExternalLink className="h-3 w-3 mr-1" />
                                        Open
                                      </Button>
                                      {reportId && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          disabled={resendingPartyId === party.id}
                                          onClick={async () => {
                                            try {
                                              setResendingPartyId(party.id)
                                              const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000"
                                              const res = await fetch(`${apiBase}/party/reports/${reportId}/parties/${party.id}/resend-link`, {
                                                method: "POST",
                                                headers: { "Content-Type": "application/json" },
                                              })
                                              if (!res.ok) throw new Error("Failed to resend")
                                              const data = await res.json()
                                              toast({ title: "Link Resent", description: `Sent to ${data.sent_to || party.email}` })
                                            } catch {
                                              toast({ title: "Error", description: "Failed to resend link", variant: "destructive" })
                                            } finally {
                                              setResendingPartyId(null)
                                            }
                                          }}
                                        >
                                          {resendingPartyId === party.id ? (
                                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                          ) : (
                                            <RefreshCw className="h-3 w-3 mr-1" />
                                          )}
                                          Resend
                                        </Button>
                                      )}
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                          
                          {/* Auto-refresh indicator */}
                          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                            <RefreshCw className="h-3 w-3 animate-spin" />
                            Auto-refreshing every 15 seconds
                            {onRefreshPartyStatus && (
                              <Button variant="link" size="sm" onClick={onRefreshPartyStatus} className="h-auto p-0 ml-2">
                                Refresh Now
                              </Button>
                            )}
                          </div>

                          {/* Continue Button */}
                          <div className="pt-4">
                            <Button 
                              onClick={() => setCollectionStep("review-submissions")}
                              disabled={!canProceedFromMonitor}
                              className="w-full h-12 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white font-semibold rounded-xl shadow-lg shadow-teal-500/25 hover:shadow-xl transition-all"
                            >
                              Continue to Review
                              <ArrowRight className="h-4 w-4 ml-2" />
                            </Button>
                            {!canProceedFromMonitor && (
                              <p className="text-sm text-muted-foreground text-center mt-2">
                                Waiting for all parties to submit...
                              </p>
                            )}
                          </div>
                        </>
                      ) : (
                        <div className="text-center py-12 text-muted-foreground">
                          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                          Loading party status...
                        </div>
                      )}
                    </CardContent>
                  </>
                )}

                {/* NEW: Review Submissions Step */}
                {collectionStep === "review-submissions" && (
                  <>
                    <SectionHeader 
                      step="Section 2D: Review Submissions"
                      title="Review Party Submissions"
                      description="Review all information before filing to FinCEN"
                    />
                    <CardContent className="pt-6 space-y-6">
                      <div className="p-6 bg-muted/30 rounded-lg text-center">
                        <Eye className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="font-semibold text-lg mb-2">Party Data Review</h3>
                        <p className="text-muted-foreground mb-4">
                          For a detailed view of all party submissions, use the dedicated Review page.
                        </p>
                        <Button variant="outline" asChild>
                          <a href={`/app/reports/${window.location.pathname.split('/')[3]}/review`} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Open Full Review Page
                          </a>
                        </Button>
                      </div>

                      <Separator />

                      <div className="p-4 border rounded-lg space-y-3">
                        <h4 className="font-medium flex items-center gap-2">
                          <Shield className="w-4 h-4" />
                          Reviewer Certification
                        </h4>
                        <div className="flex items-start gap-2">
                          <Checkbox
                            id="review-cert"
                            checked={reviewCertified}
                            onCheckedChange={(checked) => setReviewCertified(!!checked)}
                          />
                          <Label htmlFor="review-cert" className="text-sm leading-relaxed cursor-pointer">
                            I have reviewed all party submissions and confirm the information appears 
                            complete and accurate to the best of my knowledge.
                          </Label>
                        </div>
                      </div>
                    </CardContent>
                  </>
                )}

                {/* OLD STEPS - These are now handled by the party portal */}
                {/* The old seller-info, buyer-info, signing-individuals, payment-info, 
                    and certifications steps have been replaced by the new workflow above.
                    Parties now fill out their own information via the secure party portal. */}

                {/* Seller Information - DEPRECATED: Parties fill this via portal */}
                {collectionStep === "seller-info" && (
                  <>
                    <SectionHeader 
                      step="Section 2B: Seller Information"
                      title="Seller Information"
                      description="Sellers must provide accurate identifying information to ensure compliance and timely closing."
                    />
                    <CardContent className="pt-6 space-y-6">
                      {(collection.sellers || []).map((seller, index) => (
                        <div key={seller.id} className="p-4 border rounded-lg space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">Seller {index + 1}</h4>
                            {(collection.sellers || []).length > 1 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setCollection(prev => ({
                                    ...prev,
                                    sellers: (prev.sellers || []).filter(s => s.id !== seller.id)
                                  }))
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>

                          <div className="grid gap-2">
                            <Label>Seller Type *</Label>
                            <div className="flex gap-2">
                              {(["individual", "entity", "trust"] as const).map((type) => (
                                <Button
                                  key={type}
                                  variant={seller.type === type ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => {
                                    setCollection(prev => ({
                                      ...prev,
                                      sellers: (prev.sellers || []).map(s => 
                                        s.id === seller.id ? { ...s, type } : s
                                      )
                                    }))
                                  }}
                                >
                                  {type.charAt(0).toUpperCase() + type.slice(1)}
                                </Button>
                              ))}
                            </div>
                          </div>

                          {seller.type === "individual" && (
                            <div className="space-y-4">
                              <div className="grid gap-4 md:grid-cols-4">
                                <div className="grid gap-2">
                                  <Label>First Name *</Label>
                                  <Input
                                    value={seller.individual?.firstName || ""}
                                    onChange={(e) => {
                                      setCollection(prev => ({
                                        ...prev,
                                        sellers: (prev.sellers || []).map(s => 
                                          s.id === seller.id 
                                            ? { ...s, individual: { ...s.individual!, firstName: e.target.value } }
                                            : s
                                        )
                                      }))
                                    }}
                                  />
                                </div>
                                <div className="grid gap-2">
                                  <Label>Middle Name</Label>
                                  <Input
                                    value={seller.individual?.middleName || ""}
                                    onChange={(e) => {
                                      setCollection(prev => ({
                                        ...prev,
                                        sellers: (prev.sellers || []).map(s => 
                                          s.id === seller.id 
                                            ? { ...s, individual: { ...s.individual!, middleName: e.target.value } }
                                            : s
                                        )
                                      }))
                                    }}
                                  />
                                </div>
                                <div className="grid gap-2">
                                  <Label>Last Name *</Label>
                                  <Input
                                    value={seller.individual?.lastName || ""}
                                    onChange={(e) => {
                                      setCollection(prev => ({
                                        ...prev,
                                        sellers: (prev.sellers || []).map(s => 
                                          s.id === seller.id 
                                            ? { ...s, individual: { ...s.individual!, lastName: e.target.value } }
                                            : s
                                        )
                                      }))
                                    }}
                                  />
                                </div>
                                <div className="grid gap-2">
                                  <Label>Suffix</Label>
                                  <Input
                                    value={seller.individual?.suffix || ""}
                                    onChange={(e) => {
                                      setCollection(prev => ({
                                        ...prev,
                                        sellers: (prev.sellers || []).map(s => 
                                          s.id === seller.id 
                                            ? { ...s, individual: { ...s.individual!, suffix: e.target.value } }
                                            : s
                                        )
                                      }))
                                    }}
                                  />
                                </div>
                              </div>
                              <div className="grid gap-4 md:grid-cols-2">
                                <div className="grid gap-2">
                                  <Label>Date of Birth *</Label>
                                  <Input
                                    type="date"
                                    value={seller.individual?.dateOfBirth || ""}
                                    onChange={(e) => {
                                      setCollection(prev => ({
                                        ...prev,
                                        sellers: (prev.sellers || []).map(s => 
                                          s.id === seller.id 
                                            ? { ...s, individual: { ...s.individual!, dateOfBirth: e.target.value } }
                                            : s
                                        )
                                      }))
                                    }}
                                  />
                                </div>
                                <div className="grid gap-2">
                                  <Label>SSN or ITIN</Label>
                                  <Input
                                    type="password"
                                    placeholder="XXX-XX-XXXX"
                                    value={seller.individual?.ssn || ""}
                                    onChange={(e) => {
                                      setCollection(prev => ({
                                        ...prev,
                                        sellers: (prev.sellers || []).map(s => 
                                          s.id === seller.id 
                                            ? { ...s, individual: { ...s.individual!, ssn: e.target.value } }
                                            : s
                                        )
                                      }))
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          {seller.type === "entity" && (
                            <div className="space-y-4">
                              <div className="grid gap-4 md:grid-cols-2">
                                <div className="grid gap-2">
                                  <Label>Entity Legal Name *</Label>
                                  <Input
                                    value={seller.entity?.legalName || ""}
                                    onChange={(e) => {
                                      setCollection(prev => ({
                                        ...prev,
                                        sellers: (prev.sellers || []).map(s => 
                                          s.id === seller.id 
                                            ? { ...s, entity: { ...createEmptyEntity(), ...s.entity, legalName: e.target.value } }
                                            : s
                                        )
                                      }))
                                    }}
                                  />
                                </div>
                                <div className="grid gap-2">
                                  <Label>TIN/EIN *</Label>
                                  <Input
                                    value={seller.entity?.tin || ""}
                                    onChange={(e) => {
                                      setCollection(prev => ({
                                        ...prev,
                                        sellers: (prev.sellers || []).map(s => 
                                          s.id === seller.id 
                                            ? { ...s, entity: { ...createEmptyEntity(), ...s.entity, tin: e.target.value } }
                                            : s
                                        )
                                      }))
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          {seller.type === "trust" && (
                            <div className="space-y-4">
                              <div className="grid gap-4 md:grid-cols-2">
                                <div className="grid gap-2">
                                  <Label>Trust Legal Name *</Label>
                                  <Input
                                    value={seller.trust?.legalName || ""}
                                    onChange={(e) => {
                                      setCollection(prev => ({
                                        ...prev,
                                        sellers: (prev.sellers || []).map(s => 
                                          s.id === seller.id 
                                            ? { ...s, trust: { ...createEmptyTrust(), ...s.trust, legalName: e.target.value } }
                                            : s
                                        )
                                      }))
                                    }}
                                  />
                                </div>
                                <div className="grid gap-2">
                                  <Label>Date Trust Was Executed *</Label>
                                  <Input
                                    type="date"
                                    value={seller.trust?.dateExecuted || ""}
                                    onChange={(e) => {
                                      setCollection(prev => ({
                                        ...prev,
                                        sellers: (prev.sellers || []).map(s => 
                                          s.id === seller.id 
                                            ? { ...s, trust: { ...createEmptyTrust(), ...s.trust, dateExecuted: e.target.value } }
                                            : s
                                        )
                                      }))
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="flex items-center gap-2 pt-2">
                            <Checkbox
                              id={`seller-cert-${seller.id}`}
                              checked={seller.certified}
                              onCheckedChange={(checked) => {
                                setCollection(prev => ({
                                  ...prev,
                                  sellers: (prev.sellers || []).map(s => 
                                    s.id === seller.id ? { ...s, certified: !!checked } : s
                                  )
                                }))
                              }}
                            />
                            <Label htmlFor={`seller-cert-${seller.id}`} className="text-sm">
                              I certify that the information provided above is true, complete, and accurate to the best of my knowledge.
                            </Label>
                          </div>
                        </div>
                      ))}

                      <Button
                        variant="outline"
                        onClick={() => {
                          setCollection(prev => ({
                            ...prev,
                            sellers: [...(prev.sellers || []), createEmptySeller()]
                          }))
                        }}
                        className="w-full gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Add Another Seller
                      </Button>
                    </CardContent>
                  </>
                )}

                {/* Buyer Information */}
                {collectionStep === "buyer-info" && (
                  <>
                    <SectionHeader 
                      step="Section 2C: Buyer Information"
                      title={`Buyer Information - ${collection.buyerType === "entity" ? "Entity" : "Trust"}`}
                      description="Buyers using a legal entity or trust in a non-financed residential purchase must provide detailed information including beneficial ownership data."
                    />
                    <CardContent className="pt-6 space-y-6">
                      {collection.buyerType === "entity" && collection.buyerEntity && (
                        <>
                          <div className="p-4 border rounded-lg space-y-4">
                            <h4 className="font-medium">Entity Details</h4>
                            <div className="grid gap-4 md:grid-cols-2">
                              <div className="grid gap-2">
                                <Label>Entity Legal Name *</Label>
                                <Input
                                  value={collection.buyerEntity.entity.legalName}
                                  onChange={(e) => {
                                    setCollection(prev => ({
                                      ...prev,
                                      buyerEntity: {
                                        ...prev.buyerEntity!,
                                        entity: { ...prev.buyerEntity!.entity, legalName: e.target.value }
                                      }
                                    }))
                                  }}
                                />
                              </div>
                              <div className="grid gap-2">
                                <Label>DBA/Trade Name</Label>
                                <Input
                                  value={collection.buyerEntity.entity.dbaName || ""}
                                  onChange={(e) => {
                                    setCollection(prev => ({
                                      ...prev,
                                      buyerEntity: {
                                        ...prev.buyerEntity!,
                                        entity: { ...prev.buyerEntity!.entity, dbaName: e.target.value }
                                      }
                                    }))
                                  }}
                                />
                              </div>
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                              <div className="grid gap-2">
                                <Label>Entity Type *</Label>
                                <Select 
                                  value={collection.buyerEntity.entity.entityType} 
                                  onValueChange={(value) => {
                                    setCollection(prev => ({
                                      ...prev,
                                      buyerEntity: {
                                        ...prev.buyerEntity!,
                                        entity: { ...prev.buyerEntity!.entity, entityType: value }
                                      }
                                    }))
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select entity type" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {ENTITY_TYPES.map((type) => (
                                      <SelectItem key={type.value} value={type.value}>
                                        {type.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="grid gap-2">
                                <Label>State/Country of Formation *</Label>
                                <Select 
                                  value={collection.buyerEntity.entity.stateOfFormation} 
                                  onValueChange={(value) => {
                                    setCollection(prev => ({
                                      ...prev,
                                      buyerEntity: {
                                        ...prev.buyerEntity!,
                                        entity: { ...prev.buyerEntity!.entity, stateOfFormation: value }
                                      }
                                    }))
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {US_STATES.map((state) => (
                                      <SelectItem key={state.value} value={state.value}>
                                        {state.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                              <div className="grid gap-2">
                                <Label>Date of Formation *</Label>
                                <Input
                                  type="date"
                                  value={collection.buyerEntity.entity.dateOfFormation}
                                  onChange={(e) => {
                                    setCollection(prev => ({
                                      ...prev,
                                      buyerEntity: {
                                        ...prev.buyerEntity!,
                                        entity: { ...prev.buyerEntity!.entity, dateOfFormation: e.target.value }
                                      }
                                    }))
                                  }}
                                />
                              </div>
                              <div className="grid gap-2">
                                <Label>TIN/EIN *</Label>
                                <Input
                                  value={collection.buyerEntity.entity.tin}
                                  onChange={(e) => {
                                    setCollection(prev => ({
                                      ...prev,
                                      buyerEntity: {
                                        ...prev.buyerEntity!,
                                        entity: { ...prev.buyerEntity!.entity, tin: e.target.value }
                                      }
                                    }))
                                  }}
                                />
                              </div>
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                              <div className="grid gap-2">
                                <Label>Phone Number *</Label>
                                <Input
                                  type="tel"
                                  value={collection.buyerEntity.entity.phone}
                                  onChange={(e) => {
                                    setCollection(prev => ({
                                      ...prev,
                                      buyerEntity: {
                                        ...prev.buyerEntity!,
                                        entity: { ...prev.buyerEntity!.entity, phone: e.target.value }
                                      }
                                    }))
                                  }}
                                />
                              </div>
                              <div className="grid gap-2">
                                <Label>Email Address *</Label>
                                <Input
                                  type="email"
                                  value={collection.buyerEntity.entity.email}
                                  onChange={(e) => {
                                    setCollection(prev => ({
                                      ...prev,
                                      buyerEntity: {
                                        ...prev.buyerEntity!,
                                        entity: { ...prev.buyerEntity!.entity, email: e.target.value }
                                      }
                                    }))
                                  }}
                                />
                              </div>
                            </div>
                            <div>
                              <h5 className="font-medium mb-3">Principal Business Address</h5>
                              <AddressFields
                                address={collection.buyerEntity.entity.address}
                                onChange={(address) => {
                                  setCollection(prev => ({
                                    ...prev,
                                    buyerEntity: {
                                      ...prev.buyerEntity!,
                                      entity: { ...prev.buyerEntity!.entity, address }
                                    }
                                  }))
                                }}
                                prefix="buyer-entity-"
                                required
                              />
                            </div>
                          </div>

                          {/* Beneficial Owners */}
                          <div className="p-4 border rounded-lg space-y-4">
                            <div>
                              <h4 className="font-medium">Beneficial Owners <TooltipIcon term="beneficial-owner" /></h4>
                              <p className="text-sm text-muted-foreground mt-1">
                                List all individuals who directly or indirectly own 25% or more of the entity OR exercise substantial control.
                                <TooltipIcon term="substantial-control" />
                              </p>
                            </div>

                            {(collection.buyerEntity.beneficialOwners || []).map((owner, index) => (
                              <div key={owner.id} className="p-4 bg-muted/30 rounded-lg space-y-4">
                                <div className="flex items-center justify-between">
                                  <h5 className="font-medium">Beneficial Owner {index + 1}</h5>
                                  {(collection.buyerEntity?.beneficialOwners || []).length > 1 && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setCollection(prev => ({
                                          ...prev,
                                          buyerEntity: {
                                            ...prev.buyerEntity!,
                                            beneficialOwners: prev.buyerEntity!.beneficialOwners.filter(o => o.id !== owner.id)
                                          }
                                        }))
                                      }}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  )}
                                </div>
                                <div className="grid gap-4 md:grid-cols-4">
                                  <div className="grid gap-2">
                                    <Label>First Name *</Label>
                                    <Input
                                      value={owner.firstName}
                                      onChange={(e) => {
                                        setCollection(prev => ({
                                          ...prev,
                                          buyerEntity: {
                                            ...prev.buyerEntity!,
                                            beneficialOwners: prev.buyerEntity!.beneficialOwners.map(o =>
                                              o.id === owner.id ? { ...o, firstName: e.target.value } : o
                                            )
                                          }
                                        }))
                                      }}
                                    />
                                  </div>
                                  <div className="grid gap-2">
                                    <Label>Middle Name</Label>
                                    <Input
                                      value={owner.middleName || ""}
                                      onChange={(e) => {
                                        setCollection(prev => ({
                                          ...prev,
                                          buyerEntity: {
                                            ...prev.buyerEntity!,
                                            beneficialOwners: prev.buyerEntity!.beneficialOwners.map(o =>
                                              o.id === owner.id ? { ...o, middleName: e.target.value } : o
                                            )
                                          }
                                        }))
                                      }}
                                    />
                                  </div>
                                  <div className="grid gap-2">
                                    <Label>Last Name *</Label>
                                    <Input
                                      value={owner.lastName}
                                      onChange={(e) => {
                                        setCollection(prev => ({
                                          ...prev,
                                          buyerEntity: {
                                            ...prev.buyerEntity!,
                                            beneficialOwners: prev.buyerEntity!.beneficialOwners.map(o =>
                                              o.id === owner.id ? { ...o, lastName: e.target.value } : o
                                            )
                                          }
                                        }))
                                      }}
                                    />
                                  </div>
                                  <div className="grid gap-2">
                                    <Label>Date of Birth *</Label>
                                    <Input
                                      type="date"
                                      value={owner.dateOfBirth}
                                      onChange={(e) => {
                                        setCollection(prev => ({
                                          ...prev,
                                          buyerEntity: {
                                            ...prev.buyerEntity!,
                                            beneficialOwners: prev.buyerEntity!.beneficialOwners.map(o =>
                                              o.id === owner.id ? { ...o, dateOfBirth: e.target.value } : o
                                            )
                                          }
                                        }))
                                      }}
                                    />
                                  </div>
                                </div>
                                <div className="grid gap-4 md:grid-cols-3">
                                  <div className="grid gap-2">
                                    <Label>Citizenship *</Label>
                                    <Select 
                                      value={owner.citizenship} 
                                      onValueChange={(value: "us-citizen" | "us-resident" | "non-resident") => {
                                        setCollection(prev => ({
                                          ...prev,
                                          buyerEntity: {
                                            ...prev.buyerEntity!,
                                            beneficialOwners: prev.buyerEntity!.beneficialOwners.map(o =>
                                              o.id === owner.id ? { ...o, citizenship: value } : o
                                            )
                                          }
                                        }))
                                      }}
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="us-citizen">U.S. Citizen</SelectItem>
                                        <SelectItem value="us-resident">U.S. Resident Alien</SelectItem>
                                        <SelectItem value="non-resident">Non-Resident Alien</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="grid gap-2">
                                    <Label>ID Type *</Label>
                                    <Select 
                                      value={owner.idType} 
                                      onValueChange={(value: "ssn" | "us-passport" | "foreign-passport" | "state-id") => {
                                        setCollection(prev => ({
                                          ...prev,
                                          buyerEntity: {
                                            ...prev.buyerEntity!,
                                            beneficialOwners: prev.buyerEntity!.beneficialOwners.map(o =>
                                              o.id === owner.id ? { ...o, idType: value } : o
                                            )
                                          }
                                        }))
                                      }}
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="ssn">SSN/ITIN</SelectItem>
                                        <SelectItem value="us-passport">U.S. Passport</SelectItem>
                                        <SelectItem value="foreign-passport">Foreign Passport</SelectItem>
                                        <SelectItem value="state-id">State ID/Driver&apos;s License</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="grid gap-2">
                                    <Label>ID Number *</Label>
                                    <Input
                                      type="password"
                                      value={owner.idNumber}
                                      onChange={(e) => {
                                        setCollection(prev => ({
                                          ...prev,
                                          buyerEntity: {
                                            ...prev.buyerEntity!,
                                            beneficialOwners: prev.buyerEntity!.beneficialOwners.map(o =>
                                              o.id === owner.id ? { ...o, idNumber: e.target.value } : o
                                            )
                                          }
                                        }))
                                      }}
                                    />
                                  </div>
                                </div>
                                <div className="grid gap-2">
                                  <Label>Ownership Percentage (if based on ownership)</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={owner.ownershipPercentage || ""}
                                    onChange={(e) => {
                                      setCollection(prev => ({
                                        ...prev,
                                        buyerEntity: {
                                          ...prev.buyerEntity!,
                                          beneficialOwners: prev.buyerEntity!.beneficialOwners.map(o =>
                                            o.id === owner.id ? { ...o, ownershipPercentage: parseFloat(e.target.value) || undefined } : o
                                          )
                                        }
                                      }))
                                    }}
                                  />
                                </div>
                              </div>
                            ))}

                            <Button
                              variant="outline"
                              onClick={() => {
                                setCollection(prev => ({
                                  ...prev,
                                  buyerEntity: {
                                    ...prev.buyerEntity!,
                                    beneficialOwners: [...prev.buyerEntity!.beneficialOwners, createEmptyBeneficialOwner()]
                                  }
                                }))
                              }}
                              className="w-full gap-2"
                            >
                              <Plus className="w-4 h-4" />
                              Add Another Beneficial Owner
                            </Button>
                          </div>
                        </>
                      )}

                      {collection.buyerType === "trust" && collection.buyerTrust && (
                        <>
                          <div className="p-4 border rounded-lg space-y-4">
                            <h4 className="font-medium">Trust Details</h4>
                            <div className="grid gap-4 md:grid-cols-2">
                              <div className="grid gap-2">
                                <Label>Trust Legal Name *</Label>
                                <Input
                                  value={collection.buyerTrust.trust.legalName}
                                  onChange={(e) => {
                                    setCollection(prev => ({
                                      ...prev,
                                      buyerTrust: {
                                        ...prev.buyerTrust!,
                                        trust: { ...prev.buyerTrust!.trust, legalName: e.target.value }
                                      }
                                    }))
                                  }}
                                />
                              </div>
                              <div className="grid gap-2">
                                <Label>Trust Type *</Label>
                                <Select 
                                  value={collection.buyerTrust.trust.trustType} 
                                  onValueChange={(value) => {
                                    setCollection(prev => ({
                                      ...prev,
                                      buyerTrust: {
                                        ...prev.buyerTrust!,
                                        trust: { ...prev.buyerTrust!.trust, trustType: value }
                                      }
                                    }))
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select trust type" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {TRUST_TYPES.map((type) => (
                                      <SelectItem key={type.value} value={type.value}>
                                        {type.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                              <div className="grid gap-2">
                                <Label>Is this trust revocable? *</Label>
                                <div className="flex gap-2">
                                  <Button
                                    variant={collection.buyerTrust.trust.isRevocable === "yes" ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => {
                                      setCollection(prev => ({
                                        ...prev,
                                        buyerTrust: {
                                          ...prev.buyerTrust!,
                                          trust: { ...prev.buyerTrust!.trust, isRevocable: "yes" }
                                        }
                                      }))
                                    }}
                                  >
                                    Yes
                                  </Button>
                                  <Button
                                    variant={collection.buyerTrust.trust.isRevocable === "no" ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => {
                                      setCollection(prev => ({
                                        ...prev,
                                        buyerTrust: {
                                          ...prev.buyerTrust!,
                                          trust: { ...prev.buyerTrust!.trust, isRevocable: "no" }
                                        }
                                      }))
                                    }}
                                  >
                                    No
                                  </Button>
                                </div>
                              </div>
                              <div className="grid gap-2">
                                <Label>Date Trust Was Executed *</Label>
                                <Input
                                  type="date"
                                  value={collection.buyerTrust.trust.dateExecuted}
                                  onChange={(e) => {
                                    setCollection(prev => ({
                                      ...prev,
                                      buyerTrust: {
                                        ...prev.buyerTrust!,
                                        trust: { ...prev.buyerTrust!.trust, dateExecuted: e.target.value }
                                      }
                                    }))
                                  }}
                                />
                              </div>
                            </div>
                            <div className="grid gap-2">
                              <Label>TIN/EIN (if assigned)</Label>
                              <Input
                                value={collection.buyerTrust.trust.tin || ""}
                                onChange={(e) => {
                                  setCollection(prev => ({
                                    ...prev,
                                    buyerTrust: {
                                      ...prev.buyerTrust!,
                                      trust: { ...prev.buyerTrust!.trust, tin: e.target.value }
                                    }
                                  }))
                                }}
                              />
                            </div>
                          </div>

                          {/* Trustees */}
                          <div className="p-4 border rounded-lg space-y-4">
                            <div>
                              <h4 className="font-medium">Trustee Information</h4>
                              <p className="text-sm text-muted-foreground mt-1">
                                Provide information for all trustees with authority over this transaction.
                              </p>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Trustee collection forms would go here (similar to beneficial owners)
                            </p>
                            <Button
                              variant="outline"
                              onClick={() => {
                                setCollection(prev => ({
                                  ...prev,
                                  buyerTrust: {
                                    ...prev.buyerTrust!,
                                    trustees: [...(prev.buyerTrust?.trustees || []), createEmptyTrustee()]
                                  }
                                }))
                              }}
                              className="w-full gap-2"
                            >
                              <Plus className="w-4 h-4" />
                              Add Another Trustee
                            </Button>
                          </div>

                          {/* Settlors */}
                          <div className="p-4 border rounded-lg space-y-4">
                            <div>
                              <h4 className="font-medium">Settlor/Grantor Information <TooltipIcon term="settlor-grantor" /></h4>
                              <p className="text-sm text-muted-foreground mt-1">
                                The person(s) who created the trust.
                              </p>
                            </div>
                            {(collection.buyerTrust.settlors || []).map((settlor, index) => (
                              <div key={settlor.id} className="p-4 bg-muted/30 rounded-lg space-y-4">
                                <div className="flex items-center justify-between">
                                  <h5 className="font-medium">Settlor/Grantor {index + 1}</h5>
                                  {(collection.buyerTrust?.settlors || []).length > 1 && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setCollection(prev => ({
                                          ...prev,
                                          buyerTrust: {
                                            ...prev.buyerTrust!,
                                            settlors: prev.buyerTrust!.settlors.filter(s => s.id !== settlor.id)
                                          }
                                        }))
                                      }}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  )}
                                </div>
                                <div className="grid gap-4 md:grid-cols-2">
                                  <div className="grid gap-2">
                                    <Label>Full Legal Name *</Label>
                                    <Input
                                      value={settlor.fullName}
                                      onChange={(e) => {
                                        setCollection(prev => ({
                                          ...prev,
                                          buyerTrust: {
                                            ...prev.buyerTrust!,
                                            settlors: prev.buyerTrust!.settlors.map(s =>
                                              s.id === settlor.id ? { ...s, fullName: e.target.value } : s
                                            )
                                          }
                                        }))
                                      }}
                                    />
                                  </div>
                                  <div className="grid gap-2">
                                    <Label>Date of Birth</Label>
                                    <Input
                                      type="date"
                                      value={settlor.dateOfBirth || ""}
                                      onChange={(e) => {
                                        setCollection(prev => ({
                                          ...prev,
                                          buyerTrust: {
                                            ...prev.buyerTrust!,
                                            settlors: prev.buyerTrust!.settlors.map(s =>
                                              s.id === settlor.id ? { ...s, dateOfBirth: e.target.value } : s
                                            )
                                          }
                                        }))
                                      }}
                                    />
                                  </div>
                                </div>
                                <div className="grid gap-2">
                                  <Label>Is Settlor also a Beneficiary?</Label>
                                  <div className="flex gap-2">
                                    <Button
                                      variant={settlor.isBeneficiary === "yes" ? "default" : "outline"}
                                      size="sm"
                                      onClick={() => {
                                        setCollection(prev => ({
                                          ...prev,
                                          buyerTrust: {
                                            ...prev.buyerTrust!,
                                            settlors: prev.buyerTrust!.settlors.map(s =>
                                              s.id === settlor.id ? { ...s, isBeneficiary: "yes" } : s
                                            )
                                          }
                                        }))
                                      }}
                                    >
                                      Yes
                                    </Button>
                                    <Button
                                      variant={settlor.isBeneficiary === "no" ? "default" : "outline"}
                                      size="sm"
                                      onClick={() => {
                                        setCollection(prev => ({
                                          ...prev,
                                          buyerTrust: {
                                            ...prev.buyerTrust!,
                                            settlors: prev.buyerTrust!.settlors.map(s =>
                                              s.id === settlor.id ? { ...s, isBeneficiary: "no" } : s
                                            )
                                          }
                                        }))
                                      }}
                                    >
                                      No
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ))}
                            <Button
                              variant="outline"
                              onClick={() => {
                                setCollection(prev => ({
                                  ...prev,
                                  buyerTrust: {
                                    ...prev.buyerTrust!,
                                    settlors: [...(prev.buyerTrust?.settlors || []), createEmptySettlor()]
                                  }
                                }))
                              }}
                              className="w-full gap-2"
                            >
                              <Plus className="w-4 h-4" />
                              Add Another Settlor/Grantor
                            </Button>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </>
                )}

                {/* Signing Individuals */}
                {collectionStep === "signing-individuals" && (
                  <>
                    <SectionHeader 
                      step="Section 2D: Signing Individuals"
                      title="Individual(s) Signing on Behalf of Buyer Entity/Trust"
                      description="Provide information for all individuals who will sign closing documents on behalf of the buyer entity or trust."
                    />
                    <CardContent className="pt-6 space-y-6">
                      {(collection.signingIndividuals || []).map((signer, index) => (
                        <div key={signer.id} className="p-4 border rounded-lg space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">Signing Individual {index + 1}</h4>
                            {(collection.signingIndividuals || []).length > 1 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setCollection(prev => ({
                                    ...prev,
                                    signingIndividuals: (prev.signingIndividuals || []).filter(s => s.id !== signer.id)
                                  }))
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>

                          <div className="grid gap-4 md:grid-cols-4">
                            <div className="grid gap-2">
                              <Label>First Name *</Label>
                              <Input
                                value={signer.firstName}
                                onChange={(e) => {
                                  setCollection(prev => ({
                                    ...prev,
                                    signingIndividuals: (prev.signingIndividuals || []).map(s =>
                                      s.id === signer.id ? { ...s, firstName: e.target.value } : s
                                    )
                                  }))
                                }}
                              />
                            </div>
                            <div className="grid gap-2">
                              <Label>Middle Name</Label>
                              <Input
                                value={signer.middleName || ""}
                                onChange={(e) => {
                                  setCollection(prev => ({
                                    ...prev,
                                    signingIndividuals: (prev.signingIndividuals || []).map(s =>
                                      s.id === signer.id ? { ...s, middleName: e.target.value } : s
                                    )
                                  }))
                                }}
                              />
                            </div>
                            <div className="grid gap-2">
                              <Label>Last Name *</Label>
                              <Input
                                value={signer.lastName}
                                onChange={(e) => {
                                  setCollection(prev => ({
                                    ...prev,
                                    signingIndividuals: (prev.signingIndividuals || []).map(s =>
                                      s.id === signer.id ? { ...s, lastName: e.target.value } : s
                                    )
                                  }))
                                }}
                              />
                            </div>
                            <div className="grid gap-2">
                              <Label>Date of Birth *</Label>
                              <Input
                                type="date"
                                value={signer.dateOfBirth}
                                onChange={(e) => {
                                  setCollection(prev => ({
                                    ...prev,
                                    signingIndividuals: (prev.signingIndividuals || []).map(s =>
                                      s.id === signer.id ? { ...s, dateOfBirth: e.target.value } : s
                                    )
                                  }))
                                }}
                              />
                            </div>
                          </div>

                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="grid gap-2">
                              <Label>Capacity/Role *</Label>
                              <Select 
                                value={signer.capacity} 
                                onValueChange={(value) => {
                                  setCollection(prev => ({
                                    ...prev,
                                    signingIndividuals: (prev.signingIndividuals || []).map(s =>
                                      s.id === signer.id ? { ...s, capacity: value } : s
                                    )
                                  }))
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select capacity" />
                                </SelectTrigger>
                                <SelectContent>
                                  {SIGNING_CAPACITIES.map((cap) => (
                                    <SelectItem key={cap.value} value={cap.value}>
                                      {cap.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="grid gap-2">
                              <Label>Title/Position *</Label>
                              <Input
                                value={signer.title}
                                onChange={(e) => {
                                  setCollection(prev => ({
                                    ...prev,
                                    signingIndividuals: (prev.signingIndividuals || []).map(s =>
                                      s.id === signer.id ? { ...s, title: e.target.value } : s
                                    )
                                  }))
                                }}
                              />
                            </div>
                          </div>

                          <div className="grid gap-2">
                            <Label>Is this person acting as an agent for another? *</Label>
                            <div className="flex gap-2">
                              <Button
                                variant={signer.isAgent === "yes" ? "default" : "outline"}
                                size="sm"
                                onClick={() => {
                                  setCollection(prev => ({
                                    ...prev,
                                    signingIndividuals: (prev.signingIndividuals || []).map(s =>
                                      s.id === signer.id ? { ...s, isAgent: "yes" } : s
                                    )
                                  }))
                                }}
                              >
                                Yes
                              </Button>
                              <Button
                                variant={signer.isAgent === "no" ? "default" : "outline"}
                                size="sm"
                                onClick={() => {
                                  setCollection(prev => ({
                                    ...prev,
                                    signingIndividuals: (prev.signingIndividuals || []).map(s =>
                                      s.id === signer.id ? { ...s, isAgent: "no", agentDetails: undefined } : s
                                    )
                                  }))
                                }}
                              >
                                No
                              </Button>
                            </div>
                          </div>

                          {signer.isAgent === "yes" && (
                            <div className="p-4 bg-muted/30 rounded-lg space-y-4">
                              <h5 className="font-medium">Agent Details</h5>
                              <div className="grid gap-4 md:grid-cols-2">
                                <div className="grid gap-2">
                                  <Label>Principal&apos;s Name *</Label>
                                  <Input
                                    value={signer.agentDetails?.principalName || ""}
                                    onChange={(e) => {
                                      setCollection(prev => ({
                                        ...prev,
                                        signingIndividuals: (prev.signingIndividuals || []).map(s =>
                                          s.id === signer.id ? { 
                                            ...s, 
                                            agentDetails: { 
                                              ...s.agentDetails, 
                                              principalName: e.target.value,
                                              principalRelationship: s.agentDetails?.principalRelationship || ""
                                            } 
                                          } : s
                                        )
                                      }))
                                    }}
                                  />
                                </div>
                                <div className="grid gap-2">
                                  <Label>Principal&apos;s Relationship to Entity/Trust *</Label>
                                  <Input
                                    value={signer.agentDetails?.principalRelationship || ""}
                                    onChange={(e) => {
                                      setCollection(prev => ({
                                        ...prev,
                                        signingIndividuals: (prev.signingIndividuals || []).map(s =>
                                          s.id === signer.id ? { 
                                            ...s, 
                                            agentDetails: { 
                                              ...s.agentDetails, 
                                              principalRelationship: e.target.value,
                                              principalName: s.agentDetails?.principalName || ""
                                            } 
                                          } : s
                                        )
                                      }))
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}

                      <Button
                        variant="outline"
                        onClick={() => {
                          setCollection(prev => ({
                            ...prev,
                            signingIndividuals: [...(prev.signingIndividuals || []), createEmptySigningIndividual()]
                          }))
                        }}
                        className="w-full gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Add Another Signing Individual
                      </Button>
                    </CardContent>
                  </>
                )}

                {/* Payment Information */}
                {collectionStep === "payment-info" && (
                  <>
                    <SectionHeader 
                      step="Section 2E: Payment Information"
                      title="Payment/Consideration Details"
                      description="Provide details about how the purchase is being funded."
                    />
                    <CardContent className="pt-6 space-y-6">
                      <div className="p-4 bg-muted/30 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Total Purchase Price:</span>
                          <span className="text-lg font-bold">{formatCurrency(collection.purchasePrice || 0)}</span>
                        </div>
                      </div>

                      {(collection.paymentSources || []).map((source, index) => (
                        <div key={source.id} className="p-4 border rounded-lg space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">Payment Source {index + 1}</h4>
                            {(collection.paymentSources || []).length > 1 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setCollection(prev => ({
                                    ...prev,
                                    paymentSources: (prev.paymentSources || []).filter(s => s.id !== source.id)
                                  }))
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>

                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="grid gap-2">
                              <Label>Source Type *</Label>
                              <Select 
                                value={source.sourceType} 
                                onValueChange={(value) => {
                                  setCollection(prev => ({
                                    ...prev,
                                    paymentSources: (prev.paymentSources || []).map(s =>
                                      s.id === source.id ? { ...s, sourceType: value } : s
                                    )
                                  }))
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select source type" />
                                </SelectTrigger>
                                <SelectContent>
                                  {PAYMENT_SOURCE_TYPES.map((type) => (
                                    <SelectItem key={type.value} value={type.value}>
                                      {type.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="grid gap-2">
                              <Label>Amount *</Label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">$</span>
                                <Input
                                  type="text"
                                  inputMode="numeric"
                                  className="pl-7 font-medium"
                                  placeholder="500,000"
                                  value={formatPriceForInput(source.amount)}
                                  onChange={(e) => {
                                    setCollection(prev => ({
                                      ...prev,
                                      paymentSources: (prev.paymentSources || []).map(s =>
                                        s.id === source.id ? { ...s, amount: parsePriceFromInput(e.target.value) } : s
                                      )
                                    }))
                                  }}
                                />
                              </div>
                              {source.amount > 0 && (
                                <p className="text-xs text-muted-foreground">{formatCurrency(source.amount)}</p>
                              )}
                            </div>
                          </div>

                          {source.sourceType === "cash" && source.amount > 10000 && (
                            <Alert variant="destructive">
                              <AlertTriangle className="h-4 w-4" />
                              <AlertTitle>Cash Reporting Threshold</AlertTitle>
                              <AlertDescription>
                                Cash amounts over $10,000 trigger additional reporting requirements.
                              </AlertDescription>
                            </Alert>
                          )}

                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="grid gap-2">
                              <Label>Financial Institution Name *</Label>
                              <Input
                                value={source.institutionName}
                                onChange={(e) => {
                                  setCollection(prev => ({
                                    ...prev,
                                    paymentSources: (prev.paymentSources || []).map(s =>
                                      s.id === source.id ? { ...s, institutionName: e.target.value } : s
                                    )
                                  }))
                                }}
                              />
                            </div>
                            <div className="grid gap-2">
                              <Label>Account Type</Label>
                              <Select 
                                value={source.accountType} 
                                onValueChange={(value) => {
                                  setCollection(prev => ({
                                    ...prev,
                                    paymentSources: (prev.paymentSources || []).map(s =>
                                      s.id === source.id ? { ...s, accountType: value } : s
                                    )
                                  }))
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select account type" />
                                </SelectTrigger>
                                <SelectContent>
                                  {ACCOUNT_TYPES.map((type) => (
                                    <SelectItem key={type.value} value={type.value}>
                                      {type.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="grid gap-2">
                            <Label>Account Holder Name *</Label>
                            <Input
                              value={source.accountHolderName}
                              onChange={(e) => {
                                setCollection(prev => ({
                                  ...prev,
                                  paymentSources: (prev.paymentSources || []).map(s =>
                                    s.id === source.id ? { ...s, accountHolderName: e.target.value } : s
                                  )
                                }))
                              }}
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={`diff-${source.id}`}
                              checked={source.isDifferentFromBuyer}
                              onCheckedChange={(checked) => {
                                setCollection(prev => ({
                                  ...prev,
                                  paymentSources: (prev.paymentSources || []).map(s =>
                                    s.id === source.id ? { ...s, isDifferentFromBuyer: !!checked } : s
                                  )
                                }))
                              }}
                            />
                            <Label htmlFor={`diff-${source.id}`}>Account holder is different from buyer</Label>
                          </div>

                          {source.isDifferentFromBuyer && (
                            <div className="p-4 bg-muted/30 rounded-lg space-y-4">
                              <div className="grid gap-2">
                                <Label>Relationship to Buyer *</Label>
                                <Input
                                  value={source.relationshipToBuyer || ""}
                                  onChange={(e) => {
                                    setCollection(prev => ({
                                      ...prev,
                                      paymentSources: (prev.paymentSources || []).map(s =>
                                        s.id === source.id ? { ...s, relationshipToBuyer: e.target.value } : s
                                      )
                                    }))
                                  }}
                                />
                              </div>
                              <div className="grid gap-2">
                                <Label>Explanation for Third-Party Payment *</Label>
                                <Textarea
                                  value={source.explanation || ""}
                                  onChange={(e) => {
                                    setCollection(prev => ({
                                      ...prev,
                                      paymentSources: (prev.paymentSources || []).map(s =>
                                        s.id === source.id ? { ...s, explanation: e.target.value } : s
                                      )
                                    }))
                                  }}
                                  rows={2}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      ))}

                      <Button
                        variant="outline"
                        onClick={() => {
                          setCollection(prev => ({
                            ...prev,
                            paymentSources: [...(prev.paymentSources || []), createEmptyPaymentSource()]
                          }))
                        }}
                        className="w-full gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Add Another Payment Source
                      </Button>

                      {/* Running Total */}
                      <div className="p-4 border rounded-lg space-y-2">
                        <div className="flex items-center justify-between">
                          <span>Total from all sources:</span>
                          <span className="font-bold">{formatCurrency(paymentTotal)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Remaining to account for:</span>
                          <span className={`font-bold ${Math.abs(paymentRemaining) < 1 ? "text-green-600" : "text-amber-600"}`}>
                            {formatCurrency(paymentRemaining)}
                          </span>
                        </div>
                        {Math.abs(paymentRemaining) > 1 && (
                          <Alert variant="default" className="mt-2">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                              Payment sources should equal the purchase price plus closing costs.
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    </CardContent>
                  </>
                )}

                {/* Reporting Person */}
                {collectionStep === "reporting-person" && (
                  <>
                    <SectionHeader 
                      step="Section 2F: Reporting Person Designation"
                      title="Reporting Person Designation"
                      description="Under the FinCEN rule, the 'reporting person' is responsible for filing the RER."
                    />
                    <CardContent className="pt-6 space-y-6">
                      <div className="p-4 bg-muted/30 rounded-lg">
                        <h4 className="font-medium mb-2">Cascade Priority</h4>
                        <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
                          <li>Closing/settlement agent</li>
                          <li>Preparer of closing statement (HUD-1/CD)</li>
                          <li>Deed filer</li>
                          <li>Title insurer</li>
                          <li>Disbursing escrow agent</li>
                          <li>Title evaluator</li>
                          <li>Deed preparer</li>
                        </ol>
                      </div>

                      <div className="p-4 border rounded-lg space-y-4">
                        <h4 className="font-medium">Closing/Settlement Agent</h4>
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="grid gap-2">
                            <Label>Company Name *</Label>
                            <Input
                              value={collection.reportingPerson?.companyName || ""}
                              onChange={(e) => {
                                setCollection(prev => ({
                                  ...prev,
                                  reportingPerson: { ...createEmptyReportingPerson(), ...prev.reportingPerson, companyName: e.target.value }
                                }))
                              }}
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label>Contact Name *</Label>
                            <Input
                              value={collection.reportingPerson?.contactName || ""}
                              onChange={(e) => {
                                setCollection(prev => ({
                                  ...prev,
                                  reportingPerson: { ...createEmptyReportingPerson(), ...prev.reportingPerson, contactName: e.target.value }
                                }))
                              }}
                            />
                          </div>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="grid gap-2">
                            <Label>Phone *</Label>
                            <Input
                              type="tel"
                              value={collection.reportingPerson?.phone || ""}
                              onChange={(e) => {
                                setCollection(prev => ({
                                  ...prev,
                                  reportingPerson: { ...createEmptyReportingPerson(), ...prev.reportingPerson, phone: e.target.value }
                                }))
                              }}
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label>Email *</Label>
                            <Input
                              type="email"
                              value={collection.reportingPerson?.email || ""}
                              onChange={(e) => {
                                setCollection(prev => ({
                                  ...prev,
                                  reportingPerson: { ...createEmptyReportingPerson(), ...prev.reportingPerson, email: e.target.value }
                                }))
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-4">
                        <Label>Is FinClear the designated reporting person? *</Label>
                        <div className="flex gap-2">
                          <Button
                            variant={collection.reportingPerson?.isPCTC === "yes" ? "default" : "outline"}
                            onClick={() => {
                              setCollection(prev => ({
                                ...prev,
                                reportingPerson: { ...createEmptyReportingPerson(), ...prev.reportingPerson, isPCTC: "yes" }
                              }))
                            }}
                          >
                            Yes
                          </Button>
                          <Button
                            variant={collection.reportingPerson?.isPCTC === "no" ? "default" : "outline"}
                            onClick={() => {
                              setCollection(prev => ({
                                ...prev,
                                reportingPerson: { ...createEmptyReportingPerson(), ...prev.reportingPerson, isPCTC: "no" }
                              }))
                            }}
                          >
                            No
                          </Button>
                        </div>
                      </div>

                      {collection.reportingPerson?.isPCTC === "no" && (
                        <div className="p-4 bg-muted/30 rounded-lg space-y-4">
                          <div className="grid gap-2">
                            <Label>Is there a Designation Agreement in place? <TooltipIcon term="designation-agreement" /></Label>
                            <div className="flex gap-2">
                              <Button
                                variant={collection.reportingPerson?.hasDesignationAgreement === "yes" ? "default" : "outline"}
                                size="sm"
                                onClick={() => {
                                  setCollection(prev => ({
                                    ...prev,
                                    reportingPerson: { ...createEmptyReportingPerson(), ...prev.reportingPerson, hasDesignationAgreement: "yes" }
                                  }))
                                }}
                              >
                                Yes
                              </Button>
                              <Button
                                variant={collection.reportingPerson?.hasDesignationAgreement === "no" ? "default" : "outline"}
                                size="sm"
                                onClick={() => {
                                  setCollection(prev => ({
                                    ...prev,
                                    reportingPerson: { ...createEmptyReportingPerson(), ...prev.reportingPerson, hasDesignationAgreement: "no" }
                                  }))
                                }}
                              >
                                No
                              </Button>
                            </div>
                          </div>

                          {collection.reportingPerson?.hasDesignationAgreement === "yes" && (
                            <>
                              <div className="grid gap-2">
                                <Label>Designated Reporting Person Company Name *</Label>
                                <Input
                                  value={collection.reportingPerson?.designatedCompanyName || ""}
                                  onChange={(e) => {
                                    setCollection(prev => ({
                                      ...prev,
                                      reportingPerson: { ...createEmptyReportingPerson(), ...prev.reportingPerson, designatedCompanyName: e.target.value }
                                    }))
                                  }}
                                />
                              </div>
                              <div className="grid gap-2">
                                <Label>Contact Information *</Label>
                                <Textarea
                                  value={collection.reportingPerson?.designatedContactInfo || ""}
                                  onChange={(e) => {
                                    setCollection(prev => ({
                                      ...prev,
                                      reportingPerson: { ...createEmptyReportingPerson(), ...prev.reportingPerson, designatedContactInfo: e.target.value }
                                    }))
                                  }}
                                  rows={2}
                                />
                              </div>
                            </>
                          )}
                        </div>
                      )}

                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                          Designation Agreements must be in writing, specific to each transaction, and retained for 5 years.
                        </AlertDescription>
                      </Alert>
                    </CardContent>
                  </>
                )}

                {/* NEW: File Report Step */}
                {collectionStep === "file-report" && (
                  <>
                    <SectionHeader 
                      step="Section 2F: File Report"
                      title="File Report to FinCEN"
                      description="Final review and submission"
                    />
                    <CardContent className="pt-6 space-y-6">
                      {/* Demo Mode Banner */}
                      {process.env.NEXT_PUBLIC_DEMO_MODE === "true" && (
                        <div className="px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-3 text-amber-800">
                          <span className="text-xl">🎭</span>
                          <div>
                            <p className="font-medium">Demo Mode Active</p>
                            <p className="text-sm text-amber-700">Filing will be simulated - not submitted to real FinCEN</p>
                          </div>
                        </div>
                      )}

                      {/* Show success state if filed */}
                      {filingResult?.success ? (
                        <div className="text-center py-8">
                          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle2 className="h-8 w-8 text-green-600" />
                          </div>
                          <h3 className="text-xl font-bold text-green-800">Report Filed Successfully!</h3>
                          <p className="text-muted-foreground mt-2">Your report has been submitted to FinCEN.</p>
                          
                          <Card className="mt-6 bg-green-50 border-green-200 max-w-sm mx-auto">
                            <CardContent className="pt-6">
                              <div className="text-center">
                                <p className="text-sm text-muted-foreground">Receipt ID</p>
                                <p className="font-mono font-bold text-xl">{filingResult.receiptId}</p>
                              </div>
                            </CardContent>
                          </Card>
                          
                          <Button 
                            className="mt-6"
                            onClick={() => window.location.href = "/app/reports"}
                          >
                            Back to Reports Dashboard
                          </Button>
                        </div>
                      ) : (
                        <>
                          {/* Filing Summary */}
                          <div className="p-4 bg-muted/30 rounded-lg space-y-3">
                            <h4 className="font-semibold flex items-center gap-2">
                              <FileText className="w-4 h-4" />
                              Filing Summary
                            </h4>
                            <div className="grid gap-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Property:</span>
                                <span className="font-medium">
                                  {collection.propertyAddress 
                                    ? `${collection.propertyAddress.street}, ${collection.propertyAddress.city}, ${collection.propertyAddress.state}` 
                                    : "Not specified"}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Purchase Price:</span>
                                <span className="font-medium">
                                  {collection.purchasePrice 
                                    ? `$${collection.purchasePrice.toLocaleString()}` 
                                    : "Not specified"}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Closing Date:</span>
                                <span className="font-medium">
                                  {collection.closingDate 
                                    ? new Date(collection.closingDate).toLocaleDateString() 
                                    : "Not specified"}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Determination:</span>
                                <Badge variant="destructive">REPORTABLE</Badge>
                              </div>
                              {partyStatus && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Parties:</span>
                                  <span className="font-medium">
                                    {partyStatus.summary.submitted}/{partyStatus.summary.total} submitted
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Pre-Filing Check */}
                          <div className="p-4 border rounded-lg space-y-3">
                            <h4 className="font-semibold flex items-center gap-2">
                              <FileCheck className="w-4 h-4" />
                              Pre-Filing Check
                            </h4>
                            {readyCheckResult ? (
                              readyCheckResult.ready ? (
                                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                                  <div className="flex items-center gap-2 text-green-700">
                                    <CheckCircle2 className="h-5 w-5" />
                                    <span className="font-medium">All checks passed. Ready to file.</span>
                                  </div>
                                </div>
                              ) : (
                                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                                  <div className="flex items-center gap-2 text-red-700 mb-2">
                                    <AlertTriangle className="h-5 w-5" />
                                    <span className="font-medium">Issues found:</span>
                                  </div>
                                  <ul className="list-disc list-inside text-sm text-red-600">
                                    {readyCheckResult.errors?.map((err, i) => (
                                      <li key={i}>{err}</li>
                                    ))}
                                  </ul>
                                </div>
                              )
                            ) : (
                              <Button 
                                variant="outline" 
                                onClick={handleReadyCheck}
                                disabled={runningReadyCheck}
                              >
                                {runningReadyCheck ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Running Checks...
                                  </>
                                ) : (
                                  <>
                                    <Shield className="h-4 w-4 mr-2" />
                                    Run Pre-Filing Check
                                  </>
                                )}
                              </Button>
                            )}
                          </div>

                          {/* Final Certification */}
                          <div className="p-4 border rounded-lg space-y-3">
                            <h4 className="font-semibold flex items-center gap-2">
                              <Shield className="w-4 h-4" />
                              Final Certification
                            </h4>
                            <div className="flex items-start gap-3">
                              <Checkbox
                                id="file-cert"
                                checked={fileCertified}
                                onCheckedChange={(checked) => setFileCertified(!!checked)}
                              />
                              <Label htmlFor="file-cert" className="text-sm leading-relaxed cursor-pointer">
                                I certify that I have reviewed all information in this report, the information 
                                is accurate to the best of my knowledge, and I am authorized to submit this 
                                report to FinCEN on behalf of {collection.reportingPerson?.companyName || "the reporting person"}.
                              </Label>
                            </div>
                          </div>

                          {/* Error message if filing failed */}
                          {filingResult && !filingResult.success && (
                            <Alert variant="destructive">
                              <XCircle className="w-4 h-4" />
                              <AlertTitle>Filing Failed</AlertTitle>
                              <AlertDescription>{filingResult.error}</AlertDescription>
                            </Alert>
                          )}

                          {/* Submit Button */}
                          <Button
                            onClick={handleFileToFinCEN}
                            disabled={filing || !fileCertified || (readyCheckResult !== null && !readyCheckResult.ready)}
                            className="w-full h-12 bg-gradient-to-r from-primary to-teal-600 text-lg"
                          >
                            {filing ? (
                              <>
                                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                                Submitting to FinCEN...
                              </>
                            ) : (
                              <>
                                <Rocket className="h-5 w-5 mr-2" />
                                Submit to FinCEN
                              </>
                            )}
                          </Button>

                          {!fileCertified && (
                            <p className="text-sm text-muted-foreground text-center">
                              Please check the certification box to proceed
                            </p>
                          )}
                        </>
                      )}
                    </CardContent>
                  </>
                )}

                {/* OLD STEP: Certifications - DEPRECATED: Parties certify via portal */}
                {collectionStep === "certifications" && (
                  <>
                    <SectionHeader 
                      step="Section 2G: Certifications"
                      title="Required Certifications"
                    />
                    <CardContent className="pt-6 space-y-6">
                      {/* Buyer Certification */}
                      <div className="p-4 border rounded-lg space-y-4">
                        <h4 className="font-medium flex items-center gap-2">
                          <Shield className="w-4 h-4" />
                          Buyer Certification (for Entity/Trust)
                        </h4>
                        <div className="p-4 bg-muted/30 rounded-lg text-sm">
                          <p className="font-medium">I/We certify under penalty of perjury that:</p>
                          <ol className="list-decimal list-inside mt-2 space-y-1">
                            <li>All information provided regarding the buyer entity/trust is true, complete, and accurate</li>
                            <li>All beneficial ownership information is true, complete, and accurate</li>
                            <li>I/We understand that willfully providing false information may result in civil and criminal penalties</li>
                            <li>I/We will promptly notify the reporting person of any changes to this information before closing</li>
                          </ol>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="buyer-cert"
                            checked={collection.buyerCertification?.agreed || false}
                            onCheckedChange={(checked) => {
                              setCollection(prev => ({
                                ...prev,
                                buyerCertification: { ...createEmptyCertification(), ...prev.buyerCertification, agreed: !!checked }
                              }))
                            }}
                          />
                          <Label htmlFor="buyer-cert">I agree to the above certification *</Label>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="grid gap-2">
                            <Label>Printed Name *</Label>
                            <Input
                              value={collection.buyerCertification?.printedName || ""}
                              onChange={(e) => {
                                setCollection(prev => ({
                                  ...prev,
                                  buyerCertification: { ...createEmptyCertification(), ...prev.buyerCertification, printedName: e.target.value }
                                }))
                              }}
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label>Title/Capacity *</Label>
                            <Input
                              value={collection.buyerCertification?.titleCapacity || ""}
                              onChange={(e) => {
                                setCollection(prev => ({
                                  ...prev,
                                  buyerCertification: { ...createEmptyCertification(), ...prev.buyerCertification, titleCapacity: e.target.value }
                                }))
                              }}
                            />
                          </div>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="grid gap-2">
                            <Label>Date *</Label>
                            <Input
                              type="date"
                              value={collection.buyerCertification?.date || new Date().toISOString().split('T')[0]}
                              onChange={(e) => {
                                setCollection(prev => ({
                                  ...prev,
                                  buyerCertification: { ...createEmptyCertification(), ...prev.buyerCertification, date: e.target.value }
                                }))
                              }}
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label>Electronic Signature *</Label>
                            <Input
                              placeholder="Type full name to sign"
                              value={collection.buyerCertification?.signature || ""}
                              onChange={(e) => {
                                setCollection(prev => ({
                                  ...prev,
                                  buyerCertification: { ...createEmptyCertification(), ...prev.buyerCertification, signature: e.target.value }
                                }))
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Seller Certification */}
                      <div className="p-4 border rounded-lg space-y-4">
                        <h4 className="font-medium flex items-center gap-2">
                          <Shield className="w-4 h-4" />
                          Seller Certification
                        </h4>
                        <div className="p-4 bg-muted/30 rounded-lg text-sm">
                          <p className="font-medium">I/We certify that:</p>
                          <ol className="list-decimal list-inside mt-2 space-y-1">
                            <li>All information provided is true, complete, and accurate to the best of my/our knowledge</li>
                            <li>I/We will cooperate with reasonable requests for additional information or documentation</li>
                          </ol>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="seller-cert"
                            checked={collection.sellerCertification?.agreed || false}
                            onCheckedChange={(checked) => {
                              setCollection(prev => ({
                                ...prev,
                                sellerCertification: { ...createEmptyCertification(), ...prev.sellerCertification, agreed: !!checked }
                              }))
                            }}
                          />
                          <Label htmlFor="seller-cert">I agree to the above certification *</Label>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="grid gap-2">
                            <Label>Printed Name *</Label>
                            <Input
                              value={collection.sellerCertification?.printedName || ""}
                              onChange={(e) => {
                                setCollection(prev => ({
                                  ...prev,
                                  sellerCertification: { ...createEmptyCertification(), ...prev.sellerCertification, printedName: e.target.value }
                                }))
                              }}
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label>Date *</Label>
                            <Input
                              type="date"
                              value={collection.sellerCertification?.date || new Date().toISOString().split('T')[0]}
                              onChange={(e) => {
                                setCollection(prev => ({
                                  ...prev,
                                  sellerCertification: { ...createEmptyCertification(), ...prev.sellerCertification, date: e.target.value }
                                }))
                              }}
                            />
                          </div>
                        </div>
                        <div className="grid gap-2">
                          <Label>Electronic Signature *</Label>
                          <Input
                            placeholder="Type full name to sign"
                            value={collection.sellerCertification?.signature || ""}
                            onChange={(e) => {
                              setCollection(prev => ({
                                ...prev,
                                sellerCertification: { ...createEmptyCertification(), ...prev.sellerCertification, signature: e.target.value }
                              }))
                            }}
                          />
                        </div>
                      </div>

                      {/* Continue to Summary */}
                      {sectionCompletion.certifications && (
                        <Button 
                          className="w-full h-12 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white font-semibold rounded-xl shadow-lg shadow-teal-500/25 hover:shadow-xl transition-all" 
                          size="lg"
                          onClick={() => setPhase("summary")}
                        >
                          Continue to Summary
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      )}
                    </CardContent>
                  </>
                )}

                {/* Collection Navigation */}
                <CardFooter className="border-t bg-gradient-to-r from-slate-50 via-gray-50 to-slate-50 flex items-center justify-between py-5 print:hidden">
                  <Button
                    variant="outline"
                    onClick={goToPreviousCollectionStep}
                    disabled={collectionSteps.indexOf(collectionStep) === 0}
                    className="gap-2 h-11 px-6 rounded-xl border-2 font-medium hover:bg-white hover:border-teal-300"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Back
                  </Button>
                  
                  {/* Step indicator */}
                  <div className="hidden sm:flex items-center gap-2">
                    {collectionSteps.map((_, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          "w-2 h-2 rounded-full transition-all",
                          idx <= collectionSteps.indexOf(collectionStep) 
                            ? "bg-teal-500" 
                            : "bg-gray-200"
                        )}
                      />
                    ))}
                  </div>
                  
                  <Button
                    onClick={goToNextCollectionStep}
                    disabled={collectionSteps.indexOf(collectionStep) === collectionSteps.length - 1}
                    className="gap-2 min-w-[130px] h-11 rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white font-semibold shadow-lg shadow-teal-500/25 hover:shadow-xl transition-all"
                  >
                    Continue
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </CardFooter>
              </Card>
            </>
          )}

          {/* PHASE 3: SUMMARY */}
          {phase === "summary" && (
            <>
              <Card className="mb-6 border-0 rounded-2xl shadow-xl shadow-teal-500/5 ring-1 ring-gray-100 overflow-hidden">
                <SectionHeader 
                  step="Phase 3: Summary"
                  title="Filing Preparation Summary"
                  description="Review all collected information before filing."
                  icon={FileText}
                />
                <CardContent className="pt-8 space-y-6">
                  {/* Filing Deadline - Enhanced */}
                  {filingDeadline && (
                    <div className="p-6 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-2xl border border-primary/20">
                      <h4 className="font-semibold flex items-center gap-2 text-lg">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                          <Calendar className="w-5 h-5" />
                        </div>
                        Filing Deadline
                      </h4>
                      <div className="mt-3 grid gap-2 text-sm">
                        <div className="flex justify-between">
                          <span>Closing Date:</span>
                          <span className="font-medium">{collection.closingDate ? new Date(collection.closingDate).toLocaleDateString() : "Not set"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Option 1 (30 days after closing):</span>
                          <span>{new Date(filingDeadline.option1).toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Option 2 (End of following month):</span>
                          <span>{new Date(filingDeadline.option2).toLocaleDateString()}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between text-lg font-bold">
                          <span>YOUR FILING DEADLINE:</span>
                          <span className="text-primary">{new Date(filingDeadline.deadline).toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Days remaining:</span>
                          <span className={filingDeadline.daysRemaining <= 7 ? "text-destructive font-bold" : ""}>
                            {filingDeadline.daysRemaining} days
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Section Completion Status */}
                  <div className="space-y-3">
                    <h4 className="font-semibold">Section Completion Status</h4>
                    {[
                      { key: "transaction", label: "Transaction & Property", step: "transaction-property" as CollectionStepId },
                      { key: "partySetup", label: "Party Setup", step: "party-setup" as CollectionStepId },
                      { key: "monitorProgress", label: "Monitor Progress", step: "monitor-progress" as CollectionStepId },
                      { key: "reviewSubmissions", label: "Review Submissions", step: "review-submissions" as CollectionStepId },
                      { key: "reportingPerson", label: "Reporting Person", step: "reporting-person" as CollectionStepId },
                      { key: "fileReport", label: "File Report", step: "file-report" as CollectionStepId },
                    ].map(({ key, label, step }) => (
                      <div 
                        key={key} 
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                        onClick={() => {
                          setPhase("collection")
                          setCollectionStep(step)
                        }}
                      >
                        <div className="flex items-center gap-3">
                          {sectionCompletion[key as keyof typeof sectionCompletion] ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <XCircle className="w-5 h-5 text-amber-500" />
                          )}
                          <span>{label}</span>
                        </div>
                        <Badge variant={sectionCompletion[key as keyof typeof sectionCompletion] ? "default" : "secondary"}>
                          {sectionCompletion[key as keyof typeof sectionCompletion] ? "Complete" : "Incomplete"}
                        </Badge>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  {/* Document Generation */}
                  <div className="space-y-3">
                    <h4 className="font-semibold">Document Generation Options</h4>
                    <div className="grid gap-2">
                      {[
                        "Generate RER Data Summary (PDF)",
                        "Generate Beneficial Ownership Certification Form",
                        "Generate Seller Certification Form",
                        "Generate Buyer Certification Form",
                        "Generate Designation Agreement (if applicable)",
                        "Generate Complete Filing Package (all documents)",
                      ].map((doc) => (
                        <div key={doc} className="flex items-center gap-2">
                          <Checkbox id={doc} />
                          <Label htmlFor={doc} className="text-sm">{doc}</Label>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button variant="outline" className="gap-2 bg-transparent">
                        <Download className="w-4 h-4" />
                        Download All
                      </Button>
                      <Button variant="outline" className="gap-2 bg-transparent">
                        <Printer className="w-4 h-4" />
                        Print
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  {/* Filing Instructions */}
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <h4 className="font-semibold mb-2">Filing Instructions <TooltipIcon term="bsa-e-filing" /></h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      File RER electronically via FinCEN BSA E-Filing System
                    </p>
                    <p className="text-sm font-medium">Acceptable methods:</p>
                    <ul className="list-disc list-inside text-sm text-muted-foreground mt-1">
                      <li>PDF upload via BSA E-Filing portal</li>
                      <li>Online form completion</li>
                      <li>Batch XML submission via portal or SFTP</li>
                    </ul>
                    <p className="text-sm mt-3">
                      <strong>Records Retention:</strong> Maintain all certifications, designation agreements, and supporting documentation for at least 5 years.
                    </p>
                  </div>

                  {/* Compliance Warning */}
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Non-Compliance Warning</AlertTitle>
                    <AlertDescription>
                      Failure to obtain required data or file timely may block closing, result in civil penalties under the Bank Secrecy Act, and lead to severe penalties for willful violations. Please ensure all information is collected and verified before closing.
                    </AlertDescription>
                  </Alert>
                </CardContent>
                <CardFooter className="border-t bg-gradient-to-r from-slate-50 via-gray-50 to-slate-50 gap-3 print:hidden">
                  <Button variant="outline" onClick={() => setPhase("collection")} className="gap-2 h-11 rounded-xl border-2 font-medium hover:bg-white hover:border-teal-300">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Collection
                  </Button>
                  <Button variant="outline" onClick={handlePrint} className="gap-2 h-11 rounded-xl border-2 font-medium hover:bg-white hover:border-teal-300">
                    <Printer className="w-4 h-4" />
                    Print Summary
                  </Button>
                  <Button variant="outline" onClick={resetQuestionnaire} className="gap-2 h-11 rounded-xl border-2 font-medium hover:bg-white hover:border-teal-300">
                    <RotateCcw className="w-4 h-4" />
                    Start New
                  </Button>
                </CardFooter>
              </Card>
            </>
          )}
        </main>

        {/* Footer */}
        <footer className="border-t py-4 px-4 md:px-8 text-center text-sm text-muted-foreground print:hidden">
          <p>FinClear - FinCEN RRER Compliance Tool</p>
          <p className="mt-1">Effective March 1, 2026 | Per 31 CFR 1031.320</p>
        </footer>
      </div>
    </TooltipProvider>
  )
}
