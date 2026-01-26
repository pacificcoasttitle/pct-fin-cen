"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  XCircle
} from "lucide-react"
import { getParty, saveParty, submitParty, type PartyData } from "@/lib/api"

interface PartyFormData {
  // Common fields
  first_name: string
  last_name: string
  email: string
  phone: string
  // Address
  address_line1: string
  address_line2: string
  city: string
  state: string
  zip_code: string
  // Individual
  date_of_birth: string
  // Entity
  entity_name: string
  ein: string
}

const emptyForm: PartyFormData = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  address_line1: "",
  address_line2: "",
  city: "",
  state: "",
  zip_code: "",
  date_of_birth: "",
  entity_name: "",
  ein: "",
}

export default function PartyPortalPage() {
  const params = useParams()
  const token = params.token as string

  // State
  const [partyData, setPartyData] = useState<PartyData | null>(null)
  const [formData, setFormData] = useState<PartyFormData>(emptyForm)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [errorType, setErrorType] = useState<"expired" | "invalid" | "generic" | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submittedAt, setSubmittedAt] = useState<string | null>(null)
  const [confirmationId, setConfirmationId] = useState<string | null>(null)

  // Calculate form completion
  const calculateProgress = useCallback(() => {
    const requiredFields = ["first_name", "last_name", "email", "address_line1", "city", "state", "zip_code"]
    const filled = requiredFields.filter(f => formData[f as keyof PartyFormData]?.trim()).length
    return Math.round((filled / requiredFields.length) * 100)
  }, [formData])

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
          setFormData(prev => ({
            ...prev,
            ...(data.party_data as Partial<PartyFormData>),
          }))
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

  // Update form field
  const updateField = (field: keyof PartyFormData, value: string) => {
    if (submitted) return
    setFormData(prev => ({ ...prev, [field]: value }))
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading your form...</p>
        </div>
      </div>
    )
  }

  // Error state (no party data loaded)
  if (error && !partyData) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-12 max-w-md">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                {errorType === "expired" ? (
                  <Clock className="h-16 w-16 text-amber-500 mx-auto mb-4" />
                ) : errorType === "invalid" ? (
                  <XCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
                ) : (
                  <AlertTriangle className="h-16 w-16 text-destructive mx-auto mb-4" />
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
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-12 max-w-md">
          <Card className="border-green-200">
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-green-800 mb-2">
                  Information Submitted
                </h2>
                <p className="text-muted-foreground mb-4">
                  Thank you! Your information has been successfully submitted.
                </p>
                
                {/* Confirmation ID */}
                {confirmationId && (
                  <div className="inline-block bg-green-100 border border-green-200 rounded-lg px-6 py-3 mb-6">
                    <p className="text-xs text-green-600 font-medium uppercase mb-1">Confirmation Number</p>
                    <p className="text-xl font-mono font-bold text-green-800">{confirmationId}</p>
                  </div>
                )}
                
                {partyData && (
                  <div className="bg-muted/50 rounded-lg p-4 text-left mb-6">
                    <div className="flex items-center gap-2 mb-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {partyData.report_summary.property_address || "Property Address"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="capitalize">{partyData.party_role}</span>
                    </div>
                  </div>
                )}
                {submittedAt && (
                  <p className="text-sm text-muted-foreground">
                    Submitted: {new Date(submittedAt).toLocaleString()}
                  </p>
                )}
                <p className="text-sm text-muted-foreground mt-4">
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

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container mx-auto px-4 py-8 max-w-xl">
        {/* Context Card */}
        {partyData && (
          <Card className="mb-6 bg-muted/30">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">
                    {partyData.report_summary.property_address || "Property Address Pending"}
                  </p>
                  <div className="flex items-center gap-3 mt-2">
                    <Badge variant="outline" className="capitalize">
                      {partyData.party_role}
                    </Badge>
                    {partyData.report_summary.closing_date && (
                      <span className="text-sm text-muted-foreground">
                        <Clock className="h-3 w-3 inline mr-1" />
                        Closing: {new Date(partyData.report_summary.closing_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Form Progress</span>
            <span className="text-sm text-muted-foreground">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Error Alert */}
        {error && (
          <div className="flex items-center gap-2 p-4 bg-destructive/10 text-destructive rounded-lg mb-6">
            <AlertTriangle className="h-5 w-5" />
            <span>{error}</span>
            <Button variant="ghost" size="sm" onClick={() => setError(null)} className="ml-auto">
              Dismiss
            </Button>
          </div>
        )}

        {/* Form */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Your Information
            </CardTitle>
            <CardDescription>
              Please provide your information for this real estate transaction
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Name */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="first_name">First Name *</Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) => updateField("first_name", e.target.value)}
                  placeholder="John"
                />
              </div>
              <div>
                <Label htmlFor="last_name">Last Name *</Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => updateField("last_name", e.target.value)}
                  placeholder="Smith"
                />
              </div>
            </div>

            {/* Contact */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  placeholder="john@example.com"
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>

            {/* DOB or EIN */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date_of_birth">Date of Birth</Label>
                <Input
                  id="date_of_birth"
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => updateField("date_of_birth", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="ein">EIN (if entity)</Label>
                <Input
                  id="ein"
                  value={formData.ein}
                  onChange={(e) => updateField("ein", e.target.value)}
                  placeholder="XX-XXXXXXX"
                />
              </div>
            </div>

            {/* Entity Name (optional) */}
            <div>
              <Label htmlFor="entity_name">Entity Name (if applicable)</Label>
              <Input
                id="entity_name"
                value={formData.entity_name}
                onChange={(e) => updateField("entity_name", e.target.value)}
                placeholder="ABC Holdings LLC"
              />
            </div>
          </CardContent>
        </Card>

        {/* Address */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Current Address
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="address_line1">Address Line 1 *</Label>
              <Input
                id="address_line1"
                value={formData.address_line1}
                onChange={(e) => updateField("address_line1", e.target.value)}
                placeholder="123 Main Street"
              />
            </div>
            <div>
              <Label htmlFor="address_line2">Address Line 2</Label>
              <Input
                id="address_line2"
                value={formData.address_line2}
                onChange={(e) => updateField("address_line2", e.target.value)}
                placeholder="Apt 4B"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => updateField("city", e.target.value)}
                  placeholder="Los Angeles"
                />
              </div>
              <div>
                <Label htmlFor="state">State *</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => updateField("state", e.target.value)}
                  placeholder="CA"
                  maxLength={2}
                />
              </div>
              <div>
                <Label htmlFor="zip_code">ZIP *</Label>
                <Input
                  id="zip_code"
                  value={formData.zip_code}
                  onChange={(e) => updateField("zip_code", e.target.value)}
                  placeholder="90210"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={handleSave} disabled={saving || submitted}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            {saved ? "Saved!" : "Save Progress"}
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || submitted || progress < 70} className="flex-1">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
            Submit Information
          </Button>
        </div>

        {progress < 70 && (
          <p className="text-sm text-muted-foreground text-center mt-4">
            Please complete at least 70% of required fields to submit
          </p>
        )}

        {/* Footer */}
        <p className="text-xs text-muted-foreground text-center mt-8">
          Your information is encrypted and secure. By submitting, you certify that all information is accurate.
        </p>
      </div>
    </div>
  )
}

// Simple header component
function Header() {
  return (
    <header className="border-b border-border bg-card">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <Shield className="w-6 h-6 text-primary-foreground" />
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
