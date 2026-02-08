"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { 
  Loader2, 
  AlertTriangle, 
  Calendar, 
  FileText, 
  ArrowRight,
  Building2,
  CheckCircle,
  MapPin,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createReport } from "@/lib/api"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { AddressAutocomplete } from "@/components/AddressAutocomplete"
import type { ParsedAddress, PropertyData } from "@/lib/property-types"

interface FormData {
  // Structured address from AddressAutocomplete
  propertyAddress: {
    street: string
    city: string
    state: string
    zip: string
    county: string
  } | null
  closing_date: string
  escrow_number: string
  // SiteX property data
  siteXData: PropertyData | null
}

export default function NewReportPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState<FormData>({
    propertyAddress: null,
    closing_date: "",
    escrow_number: "",
    siteXData: null,
  })

  const handleAddressSelect = (address: ParsedAddress, property?: PropertyData) => {
    setFormData(prev => ({
      ...prev,
      propertyAddress: {
        street: address.street,
        city: address.city,
        state: address.state,
        zip: address.zip,
        county: address.county || "",
      },
      siteXData: property || null,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.propertyAddress) return
    
    setIsSubmitting(true)
    setError(null)

    // Build formatted address text for display
    const addressText = `${formData.propertyAddress.street}, ${formData.propertyAddress.city}, ${formData.propertyAddress.state} ${formData.propertyAddress.zip}`

    try {
      const report = await createReport({
        property_address_text: addressText,
        closing_date: formData.closing_date || undefined,
        // Pass wizard_data with pre-filled collection data
        wizard_data: {
          collection: {
            propertyAddress: formData.propertyAddress,
            closingDate: formData.closing_date || null,
            escrowNumber: formData.escrow_number || null,
            // Include SiteX data for auto-population
            siteXData: formData.siteXData ? {
              apn: formData.siteXData.apn,
              legal_description: formData.siteXData.legal_description,
              county: formData.siteXData.county,
              assessed_value: formData.siteXData.assessed_value,
              primary_owner: formData.siteXData.primary_owner,
            } : null,
          },
        },
      })
      
      // Redirect to wizard
      router.push(`/app/reports/${report.id}/wizard`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create report")
      setIsSubmitting(false)
    }
  }

  const isValid = formData.propertyAddress !== null

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Start a New FinCEN Report
        </h1>
        <p className="text-gray-600">
          Enter the property address to begin. You&apos;ll complete the full 
          report through our guided wizard.
        </p>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
        <div className="flex items-start gap-3">
          <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-900">How it works</h3>
            <p className="text-sm text-blue-700 mt-1">
              1. Enter property address below → 2. Complete the wizard → 
              3. Send party invitations → 4. Auto-filed when all parties submit
            </p>
          </div>
        </div>
      </div>

      {/* Form Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-gray-500" />
            Transaction Details
          </CardTitle>
          <CardDescription>
            Start typing the property address to search — we&apos;ll auto-fill property details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Property Address - Google Autocomplete + SiteX */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-500" />
                Property Address <span className="text-red-500">*</span>
              </Label>
              
              <AddressAutocomplete
                onSelect={handleAddressSelect}
                fetchPropertyData={true}
                showPropertyCard={true}
                placeholder="Start typing the property address..."
                required
                disabled={isSubmitting}
                className="w-full"
              />
              
              {/* Show confirmation when address selected */}
              {formData.propertyAddress && (
                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-green-800">
                        Address confirmed
                      </p>
                      <p className="text-sm text-green-700">
                        {formData.propertyAddress.street}, {formData.propertyAddress.city}, {formData.propertyAddress.state} {formData.propertyAddress.zip}
                      </p>
                      {formData.propertyAddress.county && (
                        <p className="text-xs text-green-600 mt-1">
                          County: {formData.propertyAddress.county}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {/* SiteX data preview */}
              {formData.siteXData && (
                <div className="mt-2 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <p className="text-xs font-medium text-purple-800 mb-1">
                    Property data auto-populated:
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs text-purple-700">
                    {formData.siteXData.apn && (
                      <span>APN: {formData.siteXData.apn}</span>
                    )}
                    {formData.siteXData.primary_owner?.full_name && (
                      <span>Owner: {formData.siteXData.primary_owner.full_name}</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Closing Date */}
            <div className="space-y-2">
              <Label htmlFor="closing_date" className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                Closing Date <span className="text-gray-400 text-xs">(optional)</span>
              </Label>
              <Input
                id="closing_date"
                name="closing_date"
                type="date"
                value={formData.closing_date}
                onChange={(e) => setFormData(prev => ({ ...prev, closing_date: e.target.value }))}
                disabled={isSubmitting}
              />
              <p className="text-xs text-gray-500">
                The FinCEN filing deadline is 30 days from closing.
              </p>
            </div>

            {/* Escrow Number (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="escrow_number" className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-gray-500" />
                Escrow Number <span className="text-gray-400 text-xs">(optional)</span>
              </Label>
              <Input
                id="escrow_number"
                name="escrow_number"
                value={formData.escrow_number}
                onChange={(e) => setFormData(prev => ({ ...prev, escrow_number: e.target.value }))}
                placeholder="Your internal escrow/file number"
                disabled={isSubmitting}
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-red-800">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="font-medium">Error</span>
                </div>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/app/reports")}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={!isValid || isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Creating Report...
                  </>
                ) : (
                  <>
                    Start Wizard
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Footer Info */}
      <div className="mt-8 text-center text-sm text-gray-500">
        <p>
          Need help? Contact support at{" "}
          <a href="mailto:clear@fincenclear.com" className="text-blue-600 hover:underline">
            clear@fincenclear.com
          </a>
        </p>
      </div>
    </div>
  )
}
