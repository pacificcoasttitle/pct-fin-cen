"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
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
  Landmark
} from "lucide-react"
import { cn } from "@/lib/utils"
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
    <CardHeader className="relative border-b bg-gradient-to-br from-background via-background to-muted/30 pb-6">
      {/* Accent bar at top */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary/80 to-primary/60" />
      
      <div className="flex items-start gap-4 pt-2">
        {Icon && (
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div className="flex-1">
          <Badge variant="outline" className="mb-2 bg-background/50 backdrop-blur-sm">{step}</Badge>
          <CardTitle className="text-xl font-semibold">{title}</CardTitle>
          {description && (
            <CardDescription className="mt-2 text-muted-foreground">{description}</CardDescription>
          )}
        </div>
      </div>
    </CardHeader>
  )
}

// Props interface for external integration
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
}

export function RRERQuestionnaire({ initialData, onChange, saveStatus }: RRERQuestionnaireProps = {}) {
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
  const [determinationId] = useState(generateDeterminationId)
  const [createdAt] = useState(() => new Date().toISOString())
  const [lastSavedAt, setLastSavedAt] = useState<string | undefined>()

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

  // Collection steps
  const collectionSteps: CollectionStepId[] = [
    "transaction-property",
    "seller-info",
    "buyer-info",
    "signing-individuals",
    "payment-info",
    "reporting-person",
    "certifications",
  ]

  // Progress calculations
  const determinationProgress = useMemo(() => {
    const currentIndex = relevantDeterminationSteps.indexOf(determinationStep)
    return ((currentIndex + 1) / relevantDeterminationSteps.length) * 100
  }, [determinationStep, relevantDeterminationSteps])

  const collectionProgress = useMemo(() => {
    const currentIndex = collectionSteps.indexOf(collectionStep)
    return ((currentIndex + 1) / collectionSteps.length) * 100
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
      <div className="min-h-screen bg-gradient-to-b from-muted/30 via-background to-background">
        {/* Header */}
        <header className="bg-gradient-to-r from-primary via-primary to-primary/95 text-primary-foreground py-5 px-4 md:px-8 print:bg-white print:text-foreground shadow-lg shadow-primary/20">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20">
                <Building2 className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight">Pacific Coast Title Company</h1>
                <p className="text-sm text-primary-foreground/80">FinCEN RRER Compliance Wizard</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {lastSavedAt && (
                <div className="hidden md:flex items-center gap-2 text-sm bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/20">
                  <CheckCircle className="w-4 h-4 text-green-300" />
                  <span className="text-primary-foreground/90">Saved {new Date(lastSavedAt).toLocaleTimeString()}</span>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Enhanced Phase Tabs */}
        <div className="bg-background/95 backdrop-blur-md border-b shadow-sm print:hidden sticky top-0 z-30">
          <div className="max-w-5xl mx-auto px-4 md:px-8">
            <div className="flex gap-2 py-3">
              {/* Phase 1: Determination */}
              <button
                onClick={() => setPhase("determination")}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200",
                  phase === "determination"
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                <span className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold transition-colors",
                  phase === "determination" 
                    ? "bg-primary-foreground/20" 
                    : determinationResult 
                      ? "bg-green-100 text-green-700"
                      : "bg-muted"
                )}>
                  {determinationResult ? <Check className="w-4 h-4" /> : "1"}
                </span>
                <span className="font-medium hidden sm:inline">Determination</span>
              </button>

              {/* Connector */}
              <div className="flex items-center px-1">
                <ChevronRight className={cn(
                  "w-4 h-4 transition-colors",
                  determinationResult?.isReportable ? "text-primary" : "text-muted-foreground/40"
                )} />
              </div>

              {/* Phase 2: Collection */}
              <button
                onClick={() => determinationResult?.isReportable && setPhase("collection")}
                disabled={!determinationResult?.isReportable}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200",
                  phase === "collection"
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                    : determinationResult?.isReportable
                      ? "hover:bg-muted text-muted-foreground hover:text-foreground"
                      : "text-muted-foreground/40 cursor-not-allowed"
                )}
              >
                <span className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold",
                  phase === "collection" 
                    ? "bg-primary-foreground/20" 
                    : phase === "summary" 
                      ? "bg-green-100 text-green-700"
                      : "bg-muted"
                )}>
                  {phase === "summary" ? <Check className="w-4 h-4" /> : "2"}
                </span>
                <span className="font-medium hidden sm:inline">Collection</span>
              </button>

              {/* Connector */}
              <div className="flex items-center px-1">
                <ChevronRight className={cn(
                  "w-4 h-4 transition-colors",
                  phase === "summary" ? "text-primary" : "text-muted-foreground/40"
                )} />
              </div>

              {/* Phase 3: Summary */}
              <button
                onClick={() => determinationResult?.isReportable && setPhase("summary")}
                disabled={!determinationResult?.isReportable}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200",
                  phase === "summary"
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                    : determinationResult?.isReportable
                      ? "hover:bg-muted text-muted-foreground hover:text-foreground"
                      : "text-muted-foreground/40 cursor-not-allowed"
                )}
              >
                <span className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold",
                  phase === "summary" ? "bg-primary-foreground/20" : "bg-muted"
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
                        of {relevantDeterminationSteps.length}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                      <span className="text-sm font-semibold text-primary">
                        {Math.round(determinationProgress)}%
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
            <Card className="mb-6 border-0 shadow-xl shadow-black/5 overflow-hidden">
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
                  <CardContent className="pt-6">
                    <div className="flex flex-col sm:flex-row gap-4">
                      <Button
                        variant={determination.buyerType === "individual" ? "default" : "outline"}
                        size="lg"
                        className="flex-1 h-16"
                        onClick={() => setDetermination(prev => ({ ...prev, buyerType: "individual" }))}
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
                        onClick={() => setDetermination(prev => ({ ...prev, buyerType: "trust" }))}
                      >
                        <div className="text-center">
                          <div className="text-lg">Trust</div>
                          <div className="text-xs opacity-70">Any trust type</div>
                        </div>
                      </Button>
                    </div>
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
                            <div className="bg-white/80 rounded-xl p-5 border border-green-200 max-w-lg w-full">
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
                            "mt-6 w-full gap-2",
                            "bg-gradient-to-r from-primary to-primary/90",
                            "hover:from-primary/90 hover:to-primary/80",
                            "shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30",
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
                  <CardFooter className="border-t bg-muted/30 gap-2 print:hidden">
                    <Button variant="outline" onClick={handlePrint} className="gap-2 bg-transparent">
                      <Printer className="w-4 h-4" />
                      Print
                    </Button>
                    <Button variant="outline" onClick={resetQuestionnaire} className="gap-2 bg-transparent">
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
                    Step {relevantDeterminationSteps.indexOf(determinationStep) + 1} of {relevantDeterminationSteps.length}
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

              <Card className="mb-6 border-0 shadow-xl shadow-black/5 overflow-hidden">
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
                          <Label htmlFor="closingDate">Expected/Actual Closing Date *</Label>
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
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                              id="purchasePrice"
                              type="number"
                              className="pl-9"
                              value={collection.purchasePrice || ""}
                              onChange={(e) => setCollection(prev => ({ ...prev, purchasePrice: parseFloat(e.target.value) || 0 }))}
                              required
                            />
                          </div>
                        </div>
                      </div>

                      <Separator />

                      <div>
                        <h4 className="font-medium mb-4">Property Address</h4>
                        <AddressFields
                          address={collection.propertyAddress || createEmptyAddress()}
                          onChange={(address) => setCollection(prev => ({ ...prev, propertyAddress: address }))}
                          prefix="property-"
                          required
                        />
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="grid gap-2">
                          <Label htmlFor="county">County *</Label>
                          <Input
                            id="county"
                            value={collection.county || ""}
                            onChange={(e) => setCollection(prev => ({ ...prev, county: e.target.value }))}
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
                          <Label htmlFor="apn">APN (Assessor&apos;s Parcel Number)</Label>
                          <Input
                            id="apn"
                            value={collection.apn || ""}
                            onChange={(e) => setCollection(prev => ({ ...prev, apn: e.target.value }))}
                          />
                        </div>
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

                {/* Seller Information */}
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
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                  type="number"
                                  className="pl-9"
                                  value={source.amount || ""}
                                  onChange={(e) => {
                                    setCollection(prev => ({
                                      ...prev,
                                      paymentSources: (prev.paymentSources || []).map(s =>
                                        s.id === source.id ? { ...s, amount: parseFloat(e.target.value) || 0 } : s
                                      )
                                    }))
                                  }}
                                />
                              </div>
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
                        <Label>Is Pacific Coast Title Company the designated reporting person? *</Label>
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

                {/* Certifications */}
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
                          className="w-full" 
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
                <CardFooter className="border-t bg-gradient-to-r from-muted/30 via-muted/50 to-muted/30 flex items-center justify-between py-5 print:hidden">
                  <Button
                    variant="ghost"
                    onClick={goToPreviousCollectionStep}
                    disabled={collectionSteps.indexOf(collectionStep) === 0}
                    className="gap-2 hover:bg-background/80"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Back
                  </Button>
                  
                  {/* Step indicator */}
                  <span className="text-sm text-muted-foreground hidden sm:block">
                    Section {collectionSteps.indexOf(collectionStep) + 1} of {collectionSteps.length}
                  </span>
                  
                  <Button
                    onClick={goToNextCollectionStep}
                    disabled={collectionSteps.indexOf(collectionStep) === collectionSteps.length - 1}
                    className="gap-2 min-w-[130px] shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30"
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
              <Card className="mb-6 border-0 shadow-xl shadow-black/5 overflow-hidden">
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
                      { key: "sellers", label: "Seller Information", step: "seller-info" as CollectionStepId },
                      { key: "buyer", label: "Buyer Information", step: "buyer-info" as CollectionStepId },
                      { key: "signingIndividuals", label: "Signing Individuals", step: "signing-individuals" as CollectionStepId },
                      { key: "payment", label: "Payment Information", step: "payment-info" as CollectionStepId },
                      { key: "reportingPerson", label: "Reporting Person", step: "reporting-person" as CollectionStepId },
                      { key: "certifications", label: "Certifications", step: "certifications" as CollectionStepId },
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
                <CardFooter className="border-t bg-muted/30 gap-2 print:hidden">
                  <Button variant="outline" onClick={() => setPhase("collection")} className="gap-2">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Collection
                  </Button>
                  <Button variant="outline" onClick={handlePrint} className="gap-2 bg-transparent">
                    <Printer className="w-4 h-4" />
                    Print Summary
                  </Button>
                  <Button variant="outline" onClick={resetQuestionnaire} className="gap-2 bg-transparent">
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
          <p>Pacific Coast Title Company - FinCEN RRER Compliance Tool</p>
          <p className="mt-1">Effective March 1, 2026 | Per 31 CFR 1031.320</p>
        </footer>
      </div>
    </TooltipProvider>
  )
}
