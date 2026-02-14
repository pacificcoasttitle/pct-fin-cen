"use client"

import { useEffect, useState, useCallback, useRef, useMemo } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Shield,
  Clock,
  XCircle,
  ArrowLeft,
  ArrowRight,
  Info,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "sonner"
import { getParty, saveParty, submitParty, type PartyData } from "@/lib/api"
import { type PartySubmissionData } from "@/components/party-portal/types"

// Stepper UI
import { VerticalStepper, type Step } from "@/components/party-portal/VerticalStepper"
import { BrandedHeader } from "@/components/party-portal/BrandedHeader"

// Step components
import { PersonalInfoStep } from "@/components/party-portal/steps/PersonalInfoStep"
import { AddressStep } from "@/components/party-portal/steps/AddressStep"
import { DocumentsStep } from "@/components/party-portal/steps/DocumentsStep"
import { CertificationStep } from "@/components/party-portal/steps/CertificationStep"
import { BeneficialOwnersStep } from "@/components/party-portal/steps/BeneficialOwnersStep"
import { TrusteesStep } from "@/components/party-portal/steps/TrusteesStep"
import { PaymentSourcesStep } from "@/components/party-portal/steps/PaymentSourcesStep"

// ─── Step definition type ───
interface StepDef {
  id: string
  title: string
  description: string
}

/**
 * Compute dynamic steps based on party_role and entity_type.
 *
 * | Party Type              | Steps                                                    |
 * |-------------------------|----------------------------------------------------------|
 * | Individual Buyer        | Info → Address → Payment → Docs → Certify                |
 * | Entity Buyer            | Info → Address → BOs → Payment → Docs → Certify          |
 * | Trust Buyer             | Info → Address → Trustees → Payment → Docs → Certify     |
 * | Individual Seller       | Info → Address → Docs → Certify                          |
 * | Entity Seller           | Info → Address → Docs → Certify                          |
 * | Trust Seller            | Info → Address → Docs → Certify                          |
 */
function buildStepDefinitions(
  partyRole: string,
  entityType: string,
): StepDef[] {
  const isBuyer = partyRole === "transferee"

  // Common steps for all
  const personalTitle =
    entityType === "individual" ? "Personal Information"
      : entityType === "entity" ? "Entity Information"
        : "Trust Information"

  const personalDesc =
    entityType === "individual" ? "Name, DOB, ID, contact info"
      : entityType === "entity" ? "Company name, EIN, representative"
        : "Trust name, type, trustee info"

  const steps: StepDef[] = [
    { id: "personal", title: personalTitle, description: personalDesc },
    {
      id: "address",
      title: "Address Details",
      description:
        entityType === "individual"
          ? "Mailing address"
          : entityType === "entity"
            ? "Principal business address"
            : "Trust address",
    },
  ]

  // Buyer-only steps (inserted between Address and Documents)
  if (isBuyer) {
    if (entityType === "entity") {
      steps.push({
        id: "beneficial_owners",
        title: "Beneficial Owners",
        description: "Owners with 25%+ or control",
      })
    }

    if (entityType === "trust") {
      steps.push({
        id: "trustees",
        title: "Trust Parties",
        description: "Trustees, settlors, beneficiaries",
      })
    }

    steps.push({
      id: "payment",
      title: "Payment Details",
      description: "Fund sources for this purchase",
    })
  }

  // Common final steps
  steps.push(
    { id: "documents", title: "Identification", description: "Upload ID verification" },
    { id: "certify", title: "Review & Certify", description: "Confirm and submit" },
  )

  return steps
}

export default function PartyPortalPage() {
  const params = useParams()
  const token = params.token as string

  // State
  const [partyData, setPartyData] = useState<PartyData | null>(null)
  const [formData, setFormData] = useState<Partial<PartySubmissionData>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [errorType, setErrorType] = useState<"expired" | "invalid" | "generic" | null>(null)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submittedAt, setSubmittedAt] = useState<string | null>(null)
  const [confirmationId, setConfirmationId] = useState<string | null>(null)

  // Stepper state
  const [currentStep, setCurrentStep] = useState(0)

  // Autosave state
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null)
  const initialDataRef = useRef<string>("")

  // Derived values
  const entityType = (partyData?.entity_type || "individual") as "individual" | "entity" | "trust"
  const partyRole = (partyData?.party_role || "transferor") as "transferee" | "transferor" | "beneficial_owner"

  // Compute dynamic steps
  const stepDefs = useMemo(
    () => buildStepDefinitions(partyRole, entityType),
    [partyRole, entityType],
  )

  const totalSteps = stepDefs.length
  const lastStepIndex = totalSteps - 1
  const isCertifyStep = stepDefs[currentStep]?.id === "certify"

  // Build visual step array for the VerticalStepper
  const steps: Step[] = useMemo(() => {
    return stepDefs.map((def, i) => ({
      id: def.id,
      title: def.title,
      description: def.description,
      status: currentStep > i ? "complete" : currentStep === i ? "current" : "pending",
    }))
  }, [stepDefs, currentStep])

  // Load party data
  useEffect(() => {
    const loadParty = async () => {
      try {
        setLoading(true)
        setError(null)
        setErrorType(null)
        const data = await getParty(token)
        setPartyData(data)

        // Hydrate form from existing party_data
        if (data.party_data && typeof data.party_data === "object") {
          setFormData(data.party_data as Partial<PartySubmissionData>)
        }

        // Check if already submitted
        if (data.status === "submitted") {
          setSubmitted(true)
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error"
        if (message.toLowerCase().includes("expired")) {
          setError("This link has expired. Please contact the title company for a new link.")
          setErrorType("expired")
        } else if (message.toLowerCase().includes("not found") || message.toLowerCase().includes("invalid")) {
          setError("This link is invalid or no longer active.")
          setErrorType("invalid")
        } else {
          setError(message)
          setErrorType("generic")
        }
      } finally {
        setLoading(false)
      }
    }
    loadParty()
  }, [token])

  // Handle form data changes
  const handleFormChange = useCallback((newData: Partial<PartySubmissionData>) => {
    if (submitted) return
    setFormData(newData)
    setHasUnsavedChanges(true)
  }, [submitted])

  // Debounced autosave — saves 2 seconds after last change
  useEffect(() => {
    if (!hasUnsavedChanges || submitted || !partyData) return

    const dataStr = JSON.stringify(formData)
    if (dataStr === initialDataRef.current) return

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
    }

    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        setAutoSaveStatus("saving")
        await saveParty(token, formData)
        setAutoSaveStatus("saved")
        setHasUnsavedChanges(false)
        initialDataRef.current = dataStr
        setTimeout(() => setAutoSaveStatus("idle"), 2000)
      } catch {
        setAutoSaveStatus("error")
      }
    }, 2000)

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
    }
  }, [formData, hasUnsavedChanges, submitted, token, partyData])

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges && !submitted) {
        e.preventDefault()
        e.returnValue = ""
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [hasUnsavedChanges, submitted])

  // Track initial data for comparison
  useEffect(() => {
    if (partyData?.party_data) {
      initialDataRef.current = JSON.stringify(partyData.party_data)
    }
  }, [partyData])

  // Save & navigate to next step
  const handleSaveAndContinue = async () => {
    setSaving(true)
    try {
      await saveParty(token, formData)
      setHasUnsavedChanges(false)
      initialDataRef.current = JSON.stringify(formData)
      setAutoSaveStatus("saved")
      setTimeout(() => setAutoSaveStatus("idle"), 2000)
      setCurrentStep((prev) => Math.min(prev + 1, lastStepIndex))
      window.scrollTo({ top: 0, behavior: "smooth" })
    } catch (err) {
      toast.error("Failed to save progress")
    } finally {
      setSaving(false)
    }
  }

  // Go back
  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0))
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  // Final submit
  const handleSubmit = async () => {
    try {
      setSubmitting(true)
      setError(null)
      await saveParty(token, formData)
      const result = await submitParty(token)
      setSubmitted(true)
      setSubmittedAt(result.submitted_at)
      setConfirmationId(result.confirmation_id)
      toast.success("Information submitted successfully!")
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to submit"
      setError(msg)
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  // Step click handler (allow going back to completed steps)
  const handleStepClick = (index: number) => {
    if (index <= currentStep) {
      setCurrentStep(index)
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  // ─── Render the current step's component ───
  const renderCurrentStep = () => {
    if (!partyData) return null
    const stepId = stepDefs[currentStep]?.id

    switch (stepId) {
      case "personal":
        return (
          <PersonalInfoStep
            entityType={entityType}
            partyRole={partyRole}
            data={formData}
            onChange={handleFormChange}
            disabled={submitted}
            email={partyData.email || undefined}
          />
        )
      case "address":
        return (
          <AddressStep
            entityType={entityType}
            data={formData}
            onChange={handleFormChange}
            disabled={submitted}
          />
        )
      case "beneficial_owners":
        return (
          <BeneficialOwnersStep
            data={formData}
            onChange={handleFormChange}
            disabled={submitted}
          />
        )
      case "trustees":
        return (
          <TrusteesStep
            data={formData}
            onChange={handleFormChange}
            disabled={submitted}
          />
        )
      case "payment":
        return (
          <PaymentSourcesStep
            data={formData}
            onChange={handleFormChange}
            disabled={submitted}
          />
        )
      case "documents":
        return (
          <DocumentsStep
            entityType={entityType}
            partyId={partyData.party_id}
            disabled={submitted}
          />
        )
      case "certify":
        return (
          <CertificationStep
            entityType={entityType}
            partyRole={partyRole}
            data={formData}
            onChange={handleFormChange}
            onSubmit={handleSubmit}
            onBack={handlePrevious}
            isSubmitting={submitting}
            disabled={submitted}
          />
        )
      default:
        return null
    }
  }

  // ─── Loading state ───
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-teal-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
          </div>
          <p className="text-gray-500">Loading your form...</p>
        </div>
      </div>
    )
  }

  // ─── Error state (no party data loaded) ───
  if (error && !partyData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <div className="border-b bg-white">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">FinClear Solutions</p>
              <p className="text-sm text-gray-500">Secure Portal</p>
            </div>
          </div>
        </div>
        <div className="max-w-md mx-auto px-4 py-12">
          <Card className="shadow-lg">
            <CardContent className="pt-6">
              <div className="text-center py-8">
                {errorType === "expired" ? (
                  <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Clock className="h-10 w-10 text-amber-600" />
                  </div>
                ) : errorType === "invalid" ? (
                  <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <XCircle className="h-10 w-10 text-red-600" />
                  </div>
                ) : (
                  <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle className="h-10 w-10 text-red-600" />
                  </div>
                )}
                <h2 className="text-xl font-bold mb-2">
                  {errorType === "expired" ? "Link Expired" : errorType === "invalid" ? "Invalid Link" : "Error"}
                </h2>
                <p className="text-gray-500">{error}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // ─── Success state (submitted) ───
  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
        {partyData && (
          <BrandedHeader
            companyName={partyData.company_name || "FinClear Solutions"}
            companyLogo={partyData.company_logo}
            propertyAddress={partyData.report_summary.property_address || "Property"}
            closingDate={partyData.report_summary.closing_date}
          />
        )}
        <div className="max-w-md mx-auto px-4 py-12">
          <Card className="border-green-200 shadow-lg">
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="h-12 w-12 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-green-800 mb-2">
                  Thank You!
                </h2>
                <p className="text-gray-500 mb-6">
                  Your information has been submitted successfully. The escrow team will be in touch if anything else is needed.
                </p>

                {confirmationId && (
                  <div className="inline-block bg-green-100 border-2 border-green-200 rounded-xl px-8 py-4 mb-6">
                    <p className="text-xs text-green-600 font-medium uppercase mb-1 tracking-wider">
                      Confirmation Number
                    </p>
                    <p className="text-2xl font-mono font-bold text-green-800 tracking-wide">
                      {confirmationId}
                    </p>
                  </div>
                )}

                {submittedAt && (
                  <p className="text-sm text-gray-400">
                    Submitted: {new Date(submittedAt).toLocaleString()}
                  </p>
                )}

                <p className="text-sm text-gray-400 mt-6 px-4">
                  You may safely close this page.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // ─── Main form with stepper ───
  if (!partyData) return null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Branded Header */}
      <BrandedHeader
        companyName={partyData.company_name || partyData.report_summary.title_company || "FinClear Solutions"}
        companyLogo={partyData.company_logo}
        propertyAddress={partyData.report_summary.property_address || "Property Address"}
        closingDate={partyData.report_summary.closing_date}
      />

      <main className="max-w-4xl mx-auto px-4 py-6 lg:py-8">
        {/* Corrections Banner */}
        {partyData.status === "corrections_requested" && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-red-900 font-semibold">Corrections Requested</p>
                {partyData.party_data?.correction_message && (
                  <p className="text-sm text-red-700 mt-1 leading-relaxed">
                    {String(partyData.party_data.correction_message)}
                  </p>
                )}
                <p className="text-xs text-red-600 mt-2">
                  Please review and update your information below, then submit again.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Why We Need This Info */}
        <div className="mb-6 p-4 bg-gradient-to-r from-slate-50 to-slate-100/50 border border-slate-200 rounded-xl">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-teal-100 rounded-lg">
              <Info className="h-4 w-4 text-teal-600" />
            </div>
            <div>
              <p className="text-sm text-gray-900 font-medium">Why is this information needed?</p>
              <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                Federal regulations require us to collect certain information from all parties
                in real estate transactions. Your information is encrypted, secure, and will
                only be used for compliance purposes.
              </p>
            </div>
          </div>
        </div>

        {/* Autosave status indicator */}
        <div className="flex items-center justify-between mb-4 min-h-[24px]">
          <span className="text-xs text-gray-400">
            Step {currentStep + 1} of {totalSteps}
          </span>
          <div className="flex items-center gap-2">
            {autoSaveStatus === "saving" && (
              <span className="flex items-center gap-1 text-xs text-gray-500 animate-pulse">
                <Loader2 className="w-3 h-3 animate-spin" />
                Saving...
              </span>
            )}
            {autoSaveStatus === "saved" && (
              <span className="flex items-center gap-1 text-xs text-teal-600">
                <CheckCircle2 className="w-3 h-3" />
                Progress saved
              </span>
            )}
            {autoSaveStatus === "error" && (
              <span className="flex items-center gap-1 text-xs text-red-500">
                <AlertTriangle className="w-3 h-3" />
                Save failed — will retry
              </span>
            )}
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="flex items-center gap-2 p-4 bg-red-50 text-red-800 rounded-lg mb-6 border border-red-200">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <span className="flex-1">{error}</span>
            <Button variant="ghost" size="sm" onClick={() => setError(null)}>
              Dismiss
            </Button>
          </div>
        )}

        {/* Stepper + Content */}
        <VerticalStepper
          steps={steps}
          currentStepIndex={currentStep}
          onStepClick={handleStepClick}
        >
          <div className="bg-white rounded-xl shadow-sm border p-6">
            {renderCurrentStep()}

            {/* Navigation — hide on certification step (has its own submit button) */}
            {!isCertifyStep && (
              <div className="flex justify-between mt-8 pt-6 border-t">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentStep === 0 || saving}
                  className="h-11 px-6 rounded-xl border-2 font-medium"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Previous
                </Button>
                <Button
                  onClick={handleSaveAndContinue}
                  disabled={saving}
                  className="h-11 px-6 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-semibold shadow-lg shadow-teal-500/25"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      Save &amp; Continue
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </VerticalStepper>

        {/* Footer */}
        <div className="mt-8 pb-8 text-center text-sm text-gray-500">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Shield className="h-4 w-4 text-teal-500" />
            <span className="font-medium">Secure &amp; Encrypted</span>
          </div>
          <p>Your progress is automatically saved.</p>
          {partyData.contact_email && (
            <p className="mt-1">
              Questions? Contact:{" "}
              <a
                href={`mailto:${partyData.contact_email}`}
                className="text-teal-600 hover:underline"
              >
                {partyData.contact_email}
              </a>
            </p>
          )}
        </div>
      </main>
    </div>
  )
}
