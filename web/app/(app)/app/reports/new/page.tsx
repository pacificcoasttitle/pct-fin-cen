"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { 
  Loader2, 
  AlertTriangle, 
  Home, 
  Calendar, 
  FileText, 
  ArrowRight,
  Building2,
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

interface FormData {
  property_address_text: string
  closing_date: string
  escrow_number: string
}

export default function NewReportPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState<FormData>({
    property_address_text: "",
    closing_date: "",
    escrow_number: "",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const report = await createReport({
        property_address_text: formData.property_address_text,
        closing_date: formData.closing_date || undefined,
      })
      
      // Redirect to wizard
      router.push(`/app/reports/${report.id}/wizard`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create report")
      setIsSubmitting(false)
    }
  }

  const isValid = formData.property_address_text.trim().length > 0

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Start a New FinCEN Report
        </h1>
        <p className="text-gray-600">
          Enter the basic transaction details to begin. You'll complete the full 
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
              1. Enter property details below → 2. Complete the wizard → 
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
            Provide the property address and closing date to get started.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Property Address */}
            <div className="space-y-2">
              <Label htmlFor="property_address_text" className="flex items-center gap-2">
                <Home className="h-4 w-4 text-gray-500" />
                Property Address <span className="text-red-500">*</span>
              </Label>
              <Input
                id="property_address_text"
                name="property_address_text"
                value={formData.property_address_text}
                onChange={handleChange}
                placeholder="123 Main St, City, State ZIP"
                required
                disabled={isSubmitting}
                className="text-base"
              />
              <p className="text-xs text-gray-500">
                Enter the full property address for this transaction.
              </p>
            </div>

            {/* Closing Date */}
            <div className="space-y-2">
              <Label htmlFor="closing_date" className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                Closing Date
              </Label>
              <Input
                id="closing_date"
                name="closing_date"
                type="date"
                value={formData.closing_date}
                onChange={handleChange}
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
                Escrow Number <span className="text-gray-400">(Optional)</span>
              </Label>
              <Input
                id="escrow_number"
                name="escrow_number"
                value={formData.escrow_number}
                onChange={handleChange}
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
