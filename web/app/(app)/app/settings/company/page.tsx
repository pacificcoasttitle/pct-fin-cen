"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Building2,
  Save,
  Mail,
  Phone,
  MapPin,
  DollarSign,
  Loader2,
  CheckCircle,
  AlertCircle,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
]

interface CompanyData {
  id: string
  name: string
  code: string
  status: string
  phone: string | null
  address: {
    street?: string
    city?: string
    state?: string
    zip?: string
  } | null
  billing_email: string | null
  billing_contact_name: string | null
  billing_type: string
  filing_fee_cents: number
  filing_fee_dollars: number
  payment_terms_days: number
}

export default function CompanySettingsPage() {
  const { toast } = useToast()
  const [company, setCompany] = useState<CompanyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  // Editable fields (limited for clients)
  const [billingEmail, setBillingEmail] = useState("")
  const [billingContactName, setBillingContactName] = useState("")
  const [phone, setPhone] = useState("")
  const [address, setAddress] = useState({
    street: "",
    city: "",
    state: "",
    zip: "",
  })

  const fetchCompany = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/companies/me`)
      if (response.ok) {
        const data = await response.json()
        setCompany(data)
        // Initialize editable fields
        setBillingEmail(data.billing_email || "")
        setBillingContactName(data.billing_contact_name || "")
        setPhone(data.phone || "")
        setAddress({
          street: data.address?.street || "",
          city: data.address?.city || "",
          state: data.address?.state || "",
          zip: data.address?.zip || "",
        })
      }
    } catch (error) {
      console.error("Failed to fetch company:", error)
      toast({
        title: "Error",
        description: "Failed to load company information",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchCompany()
  }, [fetchCompany])

  // Check for changes
  useEffect(() => {
    if (!company) return
    
    const changed = 
      billingEmail !== (company.billing_email || "") ||
      billingContactName !== (company.billing_contact_name || "") ||
      phone !== (company.phone || "") ||
      address.street !== (company.address?.street || "") ||
      address.city !== (company.address?.city || "") ||
      address.state !== (company.address?.state || "") ||
      address.zip !== (company.address?.zip || "")
    
    setHasChanges(changed)
  }, [company, billingEmail, billingContactName, phone, address])

  const handleSave = async () => {
    if (!company) return
    
    // Validate email
    if (billingEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(billingEmail)) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid billing email",
        variant: "destructive",
      })
      return
    }
    
    setSaving(true)
    try {
      const response = await fetch(`${API_BASE_URL}/companies/me`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          billing_email: billingEmail.trim() || null,
          billing_contact_name: billingContactName.trim() || null,
          phone: phone.trim() || null,
          address: (address.street || address.city) ? address : null,
        }),
      })
      
      if (response.ok) {
        toast({
          title: "Success",
          description: "Company settings saved",
        })
        fetchCompany() // Refresh data
      } else {
        const err = await response.json()
        toast({
          title: "Error",
          description: err.detail || "Failed to save settings",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Network error. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100)
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64" />
        <Skeleton className="h-48" />
      </div>
    )
  }

  if (!company) {
    return (
      <div className="mx-auto max-w-2xl text-center py-12">
        <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-lg font-semibold mb-2">No company found</h2>
        <p className="text-muted-foreground">Your account is not associated with a company.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Company Settings</h1>
        <p className="text-slate-500">Manage your company information</p>
      </div>

      {/* Company Info (Read-only) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Company Information
          </CardTitle>
          <CardDescription>
            Basic details about your company
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <div>
              <p className="font-semibold">{company.name}</p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="outline" className="font-mono">{company.code}</Badge>
                <span>•</span>
                <Badge variant={company.status === "active" ? "default" : "secondary"}>
                  {company.status}
                </Badge>
              </div>
            </div>
            <CheckCircle className="h-5 w-5 text-green-500" />
          </div>
          
          <p className="text-xs text-muted-foreground">
            Contact FinClear support to update your company name or code.
          </p>
        </CardContent>
      </Card>

      {/* Billing Information (Partially Read-only) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Billing Information
          </CardTitle>
          <CardDescription>
            Your billing configuration and rates
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Read-only billing fields */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-muted-foreground">Billing Type</p>
              <Badge variant={company.billing_type === "hybrid" ? "default" : "secondary"} className="mt-1">
                {company.billing_type === "hybrid" ? "Hybrid" : "Invoice Only"}
              </Badge>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-muted-foreground">Filing Fee</p>
              <p className="font-semibold mt-1">{formatCurrency(company.filing_fee_cents)}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-muted-foreground">Payment Terms</p>
              <p className="font-semibold mt-1">Net {company.payment_terms_days}</p>
            </div>
          </div>
          
          <p className="text-xs text-muted-foreground">
            Contact FinClear support to change your billing type, filing fee, or payment terms.
          </p>
        </CardContent>
      </Card>

      {/* Editable: Billing Contact */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Billing Contact
          </CardTitle>
          <CardDescription>
            Where we send invoices and billing communications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="billingEmail">Billing Email</Label>
            <Input
              id="billingEmail"
              type="email"
              value={billingEmail}
              onChange={(e) => setBillingEmail(e.target.value)}
              placeholder="billing@company.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="billingContact">Billing Contact Name</Label>
            <Input
              id="billingContact"
              value={billingContactName}
              onChange={(e) => setBillingContactName(e.target.value)}
              placeholder="Jane Smith"
            />
          </div>
        </CardContent>
      </Card>

      {/* Editable: Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Contact Information
          </CardTitle>
          <CardDescription>
            Your company's contact details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 123-4567"
            />
          </div>
        </CardContent>
      </Card>

      {/* Editable: Address */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Company Address
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="street">Street Address</Label>
            <Input
              id="street"
              value={address.street}
              onChange={(e) => setAddress({ ...address, street: e.target.value })}
              placeholder="123 Main Street"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={address.city}
                onChange={(e) => setAddress({ ...address, city: e.target.value })}
                placeholder="San Diego"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Select
                value={address.state}
                onValueChange={(val) => setAddress({ ...address, state: val })}
              >
                <SelectTrigger id="state">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {US_STATES.map((state) => (
                    <SelectItem key={state} value={state}>{state}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="zip">ZIP Code</Label>
              <Input
                id="zip"
                value={address.zip}
                onChange={(e) => setAddress({ ...address, zip: e.target.value })}
                placeholder="92101"
                maxLength={10}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        {hasChanges && (
          <p className="text-sm text-amber-600 self-center">You have unsaved changes</p>
        )}
        <Button onClick={handleSave} disabled={saving || !hasChanges}>
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Changes
        </Button>
      </div>
    </div>
  )
}
