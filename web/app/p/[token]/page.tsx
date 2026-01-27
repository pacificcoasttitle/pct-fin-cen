"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  Loader2, 
  AlertTriangle, 
  CheckCircle2, 
  Shield, 
  Building2, 
  User,
  Save,
  Send,
  Clock,
  XCircle,
  Info
} from "lucide-react"
import { getParty, saveParty, submitParty, type PartyData } from "@/lib/api"
import { DynamicPartyForm, type PartySubmissionData } from "@/components/party-portal"

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
  const [saved, setSaved] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submittedAt, setSubmittedAt] = useState<string | null>(null)
  const [confirmationId, setConfirmationId] = useState<string | null>(null)

  // Calculate form completion based on role/type
  const calculateProgress = useCallback(() => {
    if (!partyData) return 0
    
    const role = partyData.party_role
    const type = partyData.entity_type
    
    let requiredFields: (keyof PartySubmissionData)[] = []
    
    if (type === "individual") {
      requiredFields = ["first_name", "last_name", "date_of_birth", "certified", "certification_signature"]
      if (formData.address) {
        const addr = formData.address
        if (addr.street && addr.city && addr.state && addr.zip) {
          requiredFields = requiredFields.filter(f => f !== "address" as any)
        }
      }
    } else if (type === "entity") {
      requiredFields = ["entity_name", "entity_type", "ein", "formation_state", "certified", "certification_signature"]
      if (role === "transferee") {
        // Buyer entity needs beneficial owners
        if (!formData.beneficial_owners || formData.beneficial_owners.length === 0) {
          return Math.min(50, calculateBasicProgress(requiredFields))
        }
      }
    } else if (type === "trust") {
      requiredFields = ["trust_name", "trust_type", "trust_date", "signer_name", "certified", "certification_signature"]
    }
    
    return calculateBasicProgress(requiredFields)
  }, [formData, partyData])

  const calculateBasicProgress = (requiredFields: (keyof PartySubmissionData)[]) => {
    let filled = 0
    let total = requiredFields.length
    
    for (const field of requiredFields) {
      const value = formData[field]
      if (value !== undefined && value !== null && value !== "" && value !== false) {
        filled++
      }
    }
    
    // Check address separately
    if (formData.address) {
      const addr = formData.address
      if (addr.street && addr.city && addr.state && addr.zip) {
        filled++
      }
      total++
    }
    
    return Math.round((filled / total) * 100)
  }

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
  const handleFormChange = (newData: Partial<PartySubmissionData>) => {
    if (submitted) return
    setFormData(newData)
    setSaved(false)
  }

  // Save progress
  const handleSave = async () => {
    try {
      setSaving(true)
      await saveParty(token, formData)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  // Submit
  const handleSubmit = async () => {
    try {
      setSubmitting(true)
      setError(null)
      // Save first
      await saveParty(token, formData)
      // Then submit
      const result = await submitParty(token)
      setSubmitted(true)
      setSubmittedAt(result.submitted_at)
      setConfirmationId(result.confirmation_id)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit")
    } finally {
      setSubmitting(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
          <p className="text-muted-foreground">Loading your form...</p>
        </div>
      </div>
    )
  }

  // Error state (no party data loaded)
  if (error && !partyData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <Header />
        <div className="container mx-auto px-4 py-12 max-w-md">
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
                <p className="text-muted-foreground">{error}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Success state (submitted)
  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
        <Header />
        <div className="container mx-auto px-4 py-12 max-w-md">
          <Card className="border-green-200 shadow-lg">
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="h-12 w-12 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-green-800 mb-2">
                  Information Submitted!
                </h2>
                <p className="text-muted-foreground mb-6">
                  Thank you! Your information has been successfully submitted.
                </p>
                
                {/* Confirmation ID */}
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
                
                {partyData && (
                  <div className="bg-muted/50 rounded-xl p-5 text-left mb-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <span className="font-medium block">
                          {partyData.report_summary.property_address || "Property Address"}
                        </span>
                        <span className="text-sm text-muted-foreground capitalize">
                          {partyData.party_role.replace("_", " ")} • {partyData.entity_type}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                
                {submittedAt && (
                  <p className="text-sm text-muted-foreground">
                    Submitted: {new Date(submittedAt).toLocaleString()}
                  </p>
                )}
                
                <p className="text-sm text-muted-foreground mt-6 px-4">
                  You may close this window. The title company will contact you if additional information is needed.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Form state
  const progress = calculateProgress()
  const canSubmit = progress >= 70 && formData.certified && formData.certification_signature

  // Determine role display
  const getRoleDisplay = (role: string) => {
    switch (role) {
      case "transferee": return "Buyer"
      case "transferor": return "Seller"
      case "beneficial_owner": return "Beneficial Owner"
      default: return role.replace("_", " ")
    }
  }

  const getTypeDisplay = (type: string) => {
    switch (type) {
      case "individual": return "Individual"
      case "entity": return "Entity/LLC"
      case "trust": return "Trust"
      default: return type
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <Header />

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Context Card */}
        {partyData && (
          <Card className="mb-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-white rounded-xl shadow-sm">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-lg">
                    {partyData.report_summary.property_address || "Property Address Pending"}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <Badge variant="secondary" className="font-medium">
                      {getRoleDisplay(partyData.party_role)}
                    </Badge>
                    <Badge variant="outline">
                      {getTypeDisplay(partyData.entity_type)}
                    </Badge>
                    {partyData.report_summary.closing_date && (
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Closing: {new Date(partyData.report_summary.closing_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Why We Need This Info */}
        <Card className="mb-6 bg-blue-50/50 border-blue-100">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm text-blue-900 font-medium">Why is this information needed?</p>
                <p className="text-sm text-blue-700 mt-1">
                  Federal regulations require us to collect certain information from all parties 
                  in real estate transactions. Your information is encrypted, secure, and will 
                  only be used for compliance purposes.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Form Progress</span>
            <span className="text-sm text-muted-foreground">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
          {progress < 70 && (
            <p className="text-xs text-muted-foreground mt-1">
              Complete at least 70% and certify to submit
            </p>
          )}
        </div>

        {/* Error Alert */}
        {error && (
          <div className="flex items-center gap-2 p-4 bg-destructive/10 text-destructive rounded-lg mb-6">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <span className="flex-1">{error}</span>
            <Button variant="ghost" size="sm" onClick={() => setError(null)}>
              Dismiss
            </Button>
          </div>
        )}

        {/* Dynamic Form */}
        {partyData && (
          <DynamicPartyForm
            partyRole={partyData.party_role as "transferee" | "transferor" | "beneficial_owner"}
            entityType={partyData.entity_type as "individual" | "entity" | "trust"}
            data={formData}
            onChange={handleFormChange}
            disabled={submitted}
            email={partyData.email || undefined}
            purchasePrice={partyData.report_summary.purchase_price}
          />
        )}

        {/* Actions */}
        <div className="flex items-center gap-4 mt-8 sticky bottom-4 bg-white/95 backdrop-blur p-4 -mx-4 rounded-xl shadow-lg border">
          <Button 
            variant="outline" 
            onClick={handleSave} 
            disabled={saving || submitted}
            className="min-w-[140px]"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : saved ? (
              <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {saved ? "Saved!" : "Save Progress"}
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={submitting || submitted || !canSubmit} 
            className="flex-1 min-h-[44px]"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Submit Information
          </Button>
        </div>

        {/* Footer */}
        <div className="mt-8 pb-20 text-center">
          <div className="flex items-center justify-center gap-2 text-muted-foreground mb-2">
            <Shield className="h-4 w-4" />
            <span className="text-sm font-medium">Secure & Encrypted</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Your information is protected with industry-standard encryption.
            <br />
            By submitting, you certify that all information is accurate.
          </p>
        </div>
      </div>
    </div>
  )
}

// Simple header component
function Header() {
  return (
    <header className="border-b border-border bg-white/80 backdrop-blur sticky top-0 z-10">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center shadow-sm">
            <Shield className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <span className="font-bold text-foreground">PCT FinCEN</span>
            <span className="font-medium text-muted-foreground"> Solutions</span>
          </div>
        </div>
      </div>
    </header>
  )
}
