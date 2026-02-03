"use client"

import { useState, useEffect } from "react"
import {
  Building2,
  Plus,
  Search,
  Users,
  FileText,
  Clock,
  TrendingUp,
  Filter,
  Eye,
  RefreshCw,
  Ban,
  CheckCircle,
  MoreHorizontal,
  DollarSign,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/components/ui/use-toast"
import { format } from "date-fns"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL

interface Company {
  id: string
  name: string
  code: string
  company_type: string
  status: string
  billing_email: string | null
  billing_contact_name: string | null
  billing_type: string
  filing_fee_cents: number
  address: any
  phone: string | null
  user_count: number
  filing_count: number
  created_at: string
}

interface CompanyStats {
  total: number
  active: number
  suspended: number
  inactive: number
  clients: number
  internal: number
  new_this_month: number
}

interface CompanyDetail extends Company {
  settings: any
  updated_at: string
  billing_notes: string | null
  stripe_customer_id: string | null
  stats: {
    total_users: number
    active_users: number
    admin_count: number
    total_requests: number
    total_reports: number
    filed_reports: number
    total_billed_cents: number
    total_paid_cents: number
  }
  recent_reports: any[]
}

interface BillingSettings {
  company_id: string
  company_name: string
  billing_type: string
  filing_fee_cents: number
  filing_fee_dollars: number
  payment_terms_days: number
  billing_notes: string | null
  billing_email: string | null
  billing_contact_name: string | null
}

// US States for address dropdown
const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
]

const PAYMENT_TERMS_OPTIONS = [10, 15, 30, 45, 60]

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "Active", variant: "default" },
  suspended: { label: "Suspended", variant: "destructive" },
  inactive: { label: "Inactive", variant: "secondary" },
}

export default function AdminCompaniesPage() {
  const { toast } = useToast()
  const [companies, setCompanies] = useState<Company[]>([])
  const [stats, setStats] = useState<CompanyStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  
  // Detail sheet
  const [selectedCompany, setSelectedCompany] = useState<CompanyDetail | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(false)
  
  // Create wizard dialog
  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [wizardStep, setWizardStep] = useState(1)
  const [codeManuallyEdited, setCodeManuallyEdited] = useState(false)
  const [wizardErrors, setWizardErrors] = useState<Record<string, string>>({})
  
  // Step 1: Company Info
  const [companyName, setCompanyName] = useState("")
  const [companyCode, setCompanyCode] = useState("")
  const [companyPhone, setCompanyPhone] = useState("")
  const [companyAddress, setCompanyAddress] = useState({
    street: "",
    city: "",
    state: "",
    zip: ""
  })
  
  // Step 2: Billing
  const [billingType, setBillingType] = useState("invoice_only")
  const [filingFeeDollars, setFilingFeeDollars] = useState("75.00")
  const [paymentTermsDays, setPaymentTermsDays] = useState(30)
  const [billingEmail, setBillingEmail] = useState("")
  const [billingContactName, setBillingContactName] = useState("")
  const [wizardBillingNotes, setWizardBillingNotes] = useState("")
  
  // Step 3: Admin User
  const [createAdminUser, setCreateAdminUser] = useState(true)
  const [adminName, setAdminName] = useState("")
  const [adminEmail, setAdminEmail] = useState("")
  
  // Billing settings (in detail sheet)
  const [billingSettings, setBillingSettings] = useState<BillingSettings | null>(null)
  const [editingBilling, setEditingBilling] = useState(false)
  const [savingBilling, setSavingBilling] = useState(false)
  const [editBillingType, setEditBillingType] = useState("")
  const [filingFee, setFilingFee] = useState("")
  const [paymentTerms, setPaymentTerms] = useState("")
  const [billingNotes, setBillingNotes] = useState("")

  // Fetch companies
  const fetchCompanies = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true)
    try {
      const params = new URLSearchParams()
      params.set("company_type", "client") // Only show client companies
      if (statusFilter !== "all") params.set("status", statusFilter)
      if (search) params.set("search", search)
      
      const response = await fetch(`${API_BASE_URL}/companies?${params}`)
      if (response.ok) {
        const data = await response.json()
        setCompanies(data.companies || [])
      }
    } catch (error) {
      console.error("Failed to fetch companies:", error)
      toast({
        title: "Error",
        description: "Failed to fetch companies",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Fetch stats
  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/companies/stats/summary`)
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error)
    }
  }

  // Fetch company detail
  const fetchCompanyDetail = async (companyId: string) => {
    setLoadingDetail(true)
    setEditingBilling(false)
    try {
      const response = await fetch(`${API_BASE_URL}/companies/${companyId}`)
      if (response.ok) {
        const data = await response.json()
        setSelectedCompany(data)
        setSheetOpen(true)
        // Fetch billing settings
        fetchBillingSettings(companyId)
      }
    } catch (error) {
      console.error("Failed to fetch company detail:", error)
    } finally {
      setLoadingDetail(false)
    }
  }
  
  // Fetch billing settings
  const fetchBillingSettings = async (companyId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/companies/${companyId}/billing-settings`)
      if (response.ok) {
        const data = await response.json()
        setBillingSettings(data)
        setEditBillingType(data.billing_type || "invoice_only")
        setFilingFee(String(data.filing_fee_dollars))
        setPaymentTerms(String(data.payment_terms_days))
        setBillingNotes(data.billing_notes || "")
      }
    } catch (error) {
      console.error("Failed to fetch billing settings:", error)
    }
  }
  
  // Generate company code from name
  const generateCode = (name: string): string => {
    const cleaned = name.replace(/[^a-zA-Z0-9\s]/g, "").trim().toUpperCase()
    // If name is one word and <= 10 chars, use it
    if (!cleaned.includes(" ") && cleaned.length <= 10) return cleaned
    // Otherwise, take significant words
    const stopWords = ["AND", "THE", "OF", "LLC", "INC", "CORP", "CO", "COMPANY", "TITLE", "ESCROW"]
    const words = cleaned.split(/\s+/).filter(w => !stopWords.includes(w))
    if (words.length === 0) return cleaned.slice(0, 10)
    const code = words.map(w => w.slice(0, Math.ceil(10 / words.length))).join("").slice(0, 10)
    return code || cleaned.slice(0, 10)
  }
  
  // Reset wizard state
  const resetWizard = () => {
    setWizardStep(1)
    setCodeManuallyEdited(false)
    setWizardErrors({})
    // Step 1
    setCompanyName("")
    setCompanyCode("")
    setCompanyPhone("")
    setCompanyAddress({ street: "", city: "", state: "", zip: "" })
    // Step 2
    setBillingType("invoice_only")
    setFilingFeeDollars("75.00")
    setPaymentTermsDays(30)
    setBillingEmail("")
    setBillingContactName("")
    setWizardBillingNotes("")
    // Step 3
    setCreateAdminUser(true)
    setAdminName("")
    setAdminEmail("")
  }
  
  // Validate wizard step
  const validateStep = (step: number): boolean => {
    const errors: Record<string, string> = {}
    
    if (step === 1) {
      if (!companyName.trim()) errors.name = "Company name is required"
      if (!companyCode.trim()) errors.code = "Company code is required"
      else if (companyCode.length < 2 || companyCode.length > 10) errors.code = "Code must be 2-10 characters"
    }
    
    if (step === 2) {
      if (!billingEmail.trim()) errors.billing_email = "Billing email is required"
      else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(billingEmail)) errors.billing_email = "Invalid email format"
      
      const feeNum = parseFloat(filingFeeDollars)
      if (isNaN(feeNum) || feeNum < 0 || feeNum > 1000) errors.filing_fee = "Fee must be between $0 and $1000"
    }
    
    if (step === 3 && createAdminUser) {
      if (!adminName.trim()) errors.admin_name = "Admin name is required"
      if (!adminEmail.trim()) errors.admin_email = "Admin email is required"
      else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(adminEmail)) errors.admin_email = "Invalid email format"
    }
    
    setWizardErrors(errors)
    return Object.keys(errors).length === 0
  }
  
  // Handle next step
  const handleNextStep = () => {
    if (validateStep(wizardStep)) {
      setWizardStep(s => s + 1)
    }
  }
  
  // Handle company name change with auto-code generation
  const handleCompanyNameChange = (name: string) => {
    setCompanyName(name)
    if (!codeManuallyEdited) {
      setCompanyCode(generateCode(name))
    }
  }
  
  // Handle billing type change
  const handleBillingTypeChange = (type: string) => {
    setBillingType(type)
    // Auto-switch to Net 10 for hybrid
    if (type === "hybrid" && paymentTermsDays === 30) {
      setPaymentTermsDays(10)
    }
  }
  
  // Save billing settings
  const saveBillingSettings = async () => {
    if (!selectedCompany) return
    
    setSavingBilling(true)
    try {
      const feeCents = Math.round(parseFloat(filingFee) * 100)
      
      // Use billing rates endpoint which supports billing_type
      const response = await fetch(`${API_BASE_URL}/billing/admin/rates/${selectedCompany.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          billing_type: editBillingType,
          filing_fee_cents: feeCents,
          payment_terms_days: parseInt(paymentTerms),
          billing_notes: billingNotes || null,
        }),
      })
      
      if (response.ok) {
        const data = await response.json()
        // Refresh billing settings from company endpoint
        fetchBillingSettings(selectedCompany.id)
        setEditingBilling(false)
        toast({
          title: "Success",
          description: "Billing settings updated",
        })
        // Refresh company list to show updated billing_type
        fetchCompanies()
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.detail || "Failed to update billing settings",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update billing settings",
        variant: "destructive",
      })
    } finally {
      setSavingBilling(false)
    }
  }

  // Create company (submit wizard)
  const handleCreate = async () => {
    // Final validation
    if (!validateStep(1) || !validateStep(2)) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors before submitting",
        variant: "destructive",
      })
      return
    }
    if (createAdminUser && !validateStep(3)) {
      toast({
        title: "Validation Error",
        description: "Please fix the admin user errors",
        variant: "destructive",
      })
      return
    }
    
    setCreating(true)
    setWizardErrors({})
    
    try {
      const filingFeeCents = Math.round(parseFloat(filingFeeDollars) * 100)
      
      const payload = {
        name: companyName.trim(),
        code: companyCode.trim().toUpperCase(),
        company_type: "client",
        phone: companyPhone.trim() || null,
        address: (companyAddress.street || companyAddress.city) ? companyAddress : null,
        billing_type: billingType,
        filing_fee_cents: filingFeeCents,
        payment_terms_days: paymentTermsDays,
        billing_email: billingEmail.trim(),
        billing_contact_name: billingContactName.trim() || null,
        billing_notes: wizardBillingNotes.trim() || null,
        create_admin_user: createAdminUser,
        admin_user_name: createAdminUser ? adminName.trim() : null,
        admin_user_email: createAdminUser ? adminEmail.trim().toLowerCase() : null,
      }
      
      const response = await fetch(`${API_BASE_URL}/companies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      
      if (response.ok) {
        const data = await response.json()
        
        // Success toast
        toast({
          title: "Success",
          description: createAdminUser 
            ? `${companyName} created! Admin user ${adminEmail} can now log in.`
            : `${companyName} created successfully!`,
        })
        
        // Hybrid reminder
        if (billingType === "hybrid") {
          setTimeout(() => {
            toast({
              title: "Reminder",
              description: "Client admin will need to add a card on file for hybrid billing.",
            })
          }, 1500)
        }
        
        setCreateOpen(false)
        resetWizard()
        fetchCompanies()
        fetchStats()
      } else {
        const error = await response.json()
        setWizardErrors({ submit: error.detail || "Failed to create company" })
        toast({
          title: "Error",
          description: error.detail || "Failed to create company",
          variant: "destructive",
        })
      }
    } catch (error) {
      setWizardErrors({ submit: "Network error. Please try again." })
      toast({
        title: "Error",
        description: "Network error. Please try again.",
        variant: "destructive",
      })
    } finally {
      setCreating(false)
    }
  }

  // Update company status
  const handleStatusChange = async (companyId: string, newStatus: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/companies/${companyId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      
      if (response.ok) {
        toast({
          title: "Success",
          description: `Company ${newStatus}`,
        })
        fetchCompanies()
        fetchStats()
        if (selectedCompany?.id === companyId) {
          fetchCompanyDetail(companyId)
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      })
    }
  }

  useEffect(() => {
    fetchCompanies()
    fetchStats()
  }, [statusFilter])

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchCompanies()
    }, 300)
    return () => clearTimeout(debounce)
  }, [search])

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Companies</h1>
          <p className="text-slate-500">Manage client companies and their access</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => { fetchCompanies(true); fetchStats(); }}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Dialog open={createOpen} onOpenChange={(open) => {
            setCreateOpen(open)
            if (!open) resetWizard()
          }}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-blue-600 to-cyan-500">
                <Plus className="h-4 w-4 mr-2" />
                Add Company
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  Add New Company
                  <span className="text-sm font-normal text-muted-foreground">
                    Step {wizardStep}/4
                  </span>
                </DialogTitle>
                <DialogDescription>
                  {wizardStep === 1 && "Enter company information"}
                  {wizardStep === 2 && "Configure billing settings"}
                  {wizardStep === 3 && "Create the first admin user"}
                  {wizardStep === 4 && "Review and confirm"}
                </DialogDescription>
              </DialogHeader>
              
              {/* Step Indicator */}
              <div className="flex items-center gap-2 py-4">
                {[1, 2, 3, 4].map((step) => (
                  <button
                    key={step}
                    onClick={() => step < wizardStep && setWizardStep(step)}
                    className={`flex-1 h-2 rounded-full transition-colors ${
                      step <= wizardStep ? "bg-blue-500" : "bg-slate-200"
                    } ${step < wizardStep ? "cursor-pointer hover:bg-blue-400" : ""}`}
                  />
                ))}
              </div>
              
              {/* Step Content */}
              <div className="min-h-[300px]">
                {/* Step 1: Company Info */}
                {wizardStep === 1 && (
                  <div className="space-y-4">
                    <div>
                      <Label>Company Name *</Label>
                      <Input
                        value={companyName}
                        onChange={(e) => handleCompanyNameChange(e.target.value)}
                        placeholder="Pacific Coast Title"
                        className={wizardErrors.name ? "border-red-500" : ""}
                      />
                      {wizardErrors.name && <p className="text-xs text-red-500 mt-1">{wizardErrors.name}</p>}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Company Code *</Label>
                        <Input
                          value={companyCode}
                          onChange={(e) => {
                            setCodeManuallyEdited(true)
                            setCompanyCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))
                          }}
                          placeholder="PCTITLE"
                          maxLength={10}
                          className={wizardErrors.code ? "border-red-500" : ""}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          {codeManuallyEdited ? "Custom code" : "Auto-generated from name"}
                        </p>
                        {wizardErrors.code && <p className="text-xs text-red-500 mt-1">{wizardErrors.code}</p>}
                      </div>
                      <div>
                        <Label>Phone</Label>
                        <Input
                          value={companyPhone}
                          onChange={(e) => setCompanyPhone(e.target.value)}
                          placeholder="(555) 123-4567"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-3 pt-2">
                      <Label className="text-muted-foreground">Company Address (optional)</Label>
                      <Input
                        value={companyAddress.street}
                        onChange={(e) => setCompanyAddress({...companyAddress, street: e.target.value})}
                        placeholder="Street Address"
                      />
                      <div className="grid grid-cols-3 gap-3">
                        <Input
                          value={companyAddress.city}
                          onChange={(e) => setCompanyAddress({...companyAddress, city: e.target.value})}
                          placeholder="City"
                        />
                        <Select
                          value={companyAddress.state}
                          onValueChange={(val) => setCompanyAddress({...companyAddress, state: val})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="State" />
                          </SelectTrigger>
                          <SelectContent className="max-h-[200px]">
                            {US_STATES.map((state) => (
                              <SelectItem key={state} value={state}>{state}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          value={companyAddress.zip}
                          onChange={(e) => setCompanyAddress({...companyAddress, zip: e.target.value})}
                          placeholder="ZIP"
                          maxLength={10}
                        />
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Step 2: Billing */}
                {wizardStep === 2 && (
                  <div className="space-y-4">
                    <div>
                      <Label>Billing Type *</Label>
                      <div className="flex gap-4 mt-2">
                        <label className={`flex-1 flex items-center gap-2 p-3 border rounded-lg cursor-pointer ${billingType === "invoice_only" ? "border-blue-500 bg-blue-50" : ""}`}>
                          <input
                            type="radio"
                            name="billing_type"
                            value="invoice_only"
                            checked={billingType === "invoice_only"}
                            onChange={() => handleBillingTypeChange("invoice_only")}
                          />
                          <div>
                            <p className="font-medium">Invoice Only</p>
                            <p className="text-xs text-muted-foreground">Invoices sent on your terms. No card required.</p>
                          </div>
                        </label>
                        <label className={`flex-1 flex items-center gap-2 p-3 border rounded-lg cursor-pointer ${billingType === "hybrid" ? "border-blue-500 bg-blue-50" : ""}`}>
                          <input
                            type="radio"
                            name="billing_type"
                            value="hybrid"
                            checked={billingType === "hybrid"}
                            onChange={() => handleBillingTypeChange("hybrid")}
                          />
                          <div>
                            <p className="font-medium">Hybrid</p>
                            <p className="text-xs text-muted-foreground">Card on file auto-charged if unpaid.</p>
                          </div>
                        </label>
                      </div>
                      {billingType === "hybrid" && (
                        <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
                          <p className="text-amber-800">
                            ⚠️ Hybrid billing requires the client to add a card on file.
                            After creation, they will be prompted on their Billing page.
                          </p>
                        </div>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Filing Fee *</Label>
                        <div className="relative mt-1">
                          <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                          <Input
                            type="text"
                            value={filingFeeDollars}
                            onChange={(e) => {
                              const cleaned = e.target.value.replace(/[^0-9.]/g, "")
                              const parts = cleaned.split(".")
                              if (parts.length <= 2 && (!parts[1] || parts[1].length <= 2)) {
                                setFilingFeeDollars(cleaned)
                              }
                            }}
                            placeholder="75.00"
                            className={`pl-7 ${wizardErrors.filing_fee ? "border-red-500" : ""}`}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Per-filing charge</p>
                        {wizardErrors.filing_fee && <p className="text-xs text-red-500">{wizardErrors.filing_fee}</p>}
                      </div>
                      <div>
                        <Label>Payment Terms *</Label>
                        <Select
                          value={String(paymentTermsDays)}
                          onValueChange={(val) => setPaymentTermsDays(Number(val))}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PAYMENT_TERMS_OPTIONS.map((days) => (
                              <SelectItem key={days} value={String(days)}>Net {days}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Billing Email *</Label>
                        <Input
                          type="email"
                          value={billingEmail}
                          onChange={(e) => setBillingEmail(e.target.value)}
                          placeholder="billing@company.com"
                          className={wizardErrors.billing_email ? "border-red-500" : ""}
                        />
                        <p className="text-xs text-muted-foreground mt-1">Invoices sent here</p>
                        {wizardErrors.billing_email && <p className="text-xs text-red-500">{wizardErrors.billing_email}</p>}
                      </div>
                      <div>
                        <Label>Billing Contact</Label>
                        <Input
                          value={billingContactName}
                          onChange={(e) => setBillingContactName(e.target.value)}
                          placeholder="Jane Smith"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label>Billing Notes (internal)</Label>
                      <Input
                        value={wizardBillingNotes}
                        onChange={(e) => setWizardBillingNotes(e.target.value)}
                        placeholder="e.g., Volume discount, special terms..."
                      />
                    </div>
                  </div>
                )}
                
                {/* Step 3: Admin User */}
                {wizardStep === 3 && (
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800">
                        Create the first admin user for this company. They will be able to
                        submit filing requests, manage their team, and view billing.
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="create_admin"
                        checked={createAdminUser}
                        onChange={(e) => setCreateAdminUser(e.target.checked)}
                        className="h-4 w-4"
                      />
                      <label htmlFor="create_admin" className="font-medium">
                        Create admin user now
                      </label>
                    </div>
                    
                    {createAdminUser ? (
                      <div className="space-y-4 pt-2">
                        <div>
                          <Label>Admin Name *</Label>
                          <Input
                            value={adminName}
                            onChange={(e) => setAdminName(e.target.value)}
                            placeholder="John Doe"
                            className={wizardErrors.admin_name ? "border-red-500" : ""}
                          />
                          {wizardErrors.admin_name && <p className="text-xs text-red-500 mt-1">{wizardErrors.admin_name}</p>}
                        </div>
                        <div>
                          <Label>Admin Email *</Label>
                          <Input
                            type="email"
                            value={adminEmail}
                            onChange={(e) => setAdminEmail(e.target.value)}
                            placeholder="john@company.com"
                            className={wizardErrors.admin_email ? "border-red-500" : ""}
                          />
                          {wizardErrors.admin_email && <p className="text-xs text-red-500 mt-1">{wizardErrors.admin_email}</p>}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Role: <strong>Client Administrator</strong> (first user is always admin)
                        </p>
                        <p className="text-xs text-muted-foreground italic">
                          In demo mode, this user can log in immediately. When production auth is enabled, an invitation email will be sent.
                        </p>
                      </div>
                    ) : (
                      <div className="p-4 bg-slate-50 rounded-lg">
                        <p className="text-sm text-muted-foreground">
                          You can invite users later from Admin → Users.
                        </p>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Step 4: Review */}
                {wizardStep === 4 && (
                  <div className="space-y-4">
                    {wizardErrors.submit && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-600">{wizardErrors.submit}</p>
                      </div>
                    )}
                    
                    <div className="border rounded-lg divide-y">
                      <div className="p-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-sm text-muted-foreground uppercase">Company Info</h4>
                          <button onClick={() => setWizardStep(1)} className="text-xs text-blue-600 hover:underline">Edit</button>
                        </div>
                        <div className="mt-2 space-y-1 text-sm">
                          <p><span className="text-muted-foreground">Name:</span> {companyName}</p>
                          <p><span className="text-muted-foreground">Code:</span> {companyCode}</p>
                          {companyPhone && <p><span className="text-muted-foreground">Phone:</span> {companyPhone}</p>}
                          {companyAddress.street && (
                            <p><span className="text-muted-foreground">Address:</span> {companyAddress.street}, {companyAddress.city}, {companyAddress.state} {companyAddress.zip}</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="p-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-sm text-muted-foreground uppercase">Billing</h4>
                          <button onClick={() => setWizardStep(2)} className="text-xs text-blue-600 hover:underline">Edit</button>
                        </div>
                        <div className="mt-2 space-y-1 text-sm">
                          <p><span className="text-muted-foreground">Type:</span> <Badge variant={billingType === "hybrid" ? "default" : "secondary"}>{billingType === "invoice_only" ? "Invoice Only" : "Hybrid"}</Badge></p>
                          <p><span className="text-muted-foreground">Filing Fee:</span> ${filingFeeDollars} per filing</p>
                          <p><span className="text-muted-foreground">Terms:</span> Net {paymentTermsDays}</p>
                          <p><span className="text-muted-foreground">Email:</span> {billingEmail}</p>
                          {billingContactName && <p><span className="text-muted-foreground">Contact:</span> {billingContactName}</p>}
                        </div>
                      </div>
                      
                      <div className="p-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-sm text-muted-foreground uppercase">Admin User</h4>
                          <button onClick={() => setWizardStep(3)} className="text-xs text-blue-600 hover:underline">Edit</button>
                        </div>
                        <div className="mt-2 space-y-1 text-sm">
                          {createAdminUser ? (
                            <>
                              <p><span className="text-muted-foreground">Name:</span> {adminName}</p>
                              <p><span className="text-muted-foreground">Email:</span> {adminEmail}</p>
                              <p><span className="text-muted-foreground">Role:</span> Client Administrator</p>
                            </>
                          ) : (
                            <p className="text-muted-foreground italic">No admin user will be created</p>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {billingType === "hybrid" && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <p className="text-sm text-amber-800">
                          ⚠️ Hybrid billing: Client admin will need to add a card on file from their Billing page.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => {
                  setCreateOpen(false)
                  resetWizard()
                }}>
                  Cancel
                </Button>
                {wizardStep > 1 && (
                  <Button variant="outline" onClick={() => setWizardStep(s => s - 1)}>
                    Back
                  </Button>
                )}
                {wizardStep < 4 ? (
                  <Button onClick={handleNextStep}>
                    Next
                  </Button>
                ) : (
                  <Button onClick={handleCreate} disabled={creating} className="bg-green-600 hover:bg-green-700">
                    {creating ? "Creating..." : "Create Company"}
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-slate-100 rounded-xl">
                <Building2 className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Total Clients</p>
                <p className="text-2xl font-bold">{stats?.clients ?? <Skeleton className="h-8 w-12" />}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-100 rounded-xl">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Active</p>
                <p className="text-2xl font-bold">{stats?.active ?? <Skeleton className="h-8 w-12" />}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-100 rounded-xl">
                <Ban className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Suspended</p>
                <p className="text-2xl font-bold">{stats?.suspended ?? <Skeleton className="h-8 w-12" />}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-purple-100 rounded-xl">
                <Plus className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">New This Month</p>
                <p className="text-2xl font-bold">{stats?.new_this_month ?? <Skeleton className="h-8 w-12" />}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Companies Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>All Companies</CardTitle>
              <CardDescription>
                {loading ? "Loading..." : `${companies.length} ${companies.length === 1 ? "company" : "companies"}`}
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search companies..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 w-[200px]"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Loading State */}
          {loading && (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && companies.length === 0 && (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No companies found</h3>
              <p className="text-muted-foreground mb-4">
                {search ? "Try adjusting your search" : "Get started by adding your first client company"}
              </p>
              {!search && (
                <Button onClick={() => setCreateOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Company
                </Button>
              )}
            </div>
          )}

          {/* Table */}
          {!loading && companies.length > 0 && (
            <div className="overflow-x-auto -mx-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Billing</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Users</TableHead>
                    <TableHead className="text-center">Filings</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companies.map((company) => (
                    <TableRow 
                      key={company.id} 
                      className="cursor-pointer hover:bg-slate-50"
                      onClick={() => fetchCompanyDetail(company.id)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-slate-100 rounded-lg">
                            <Building2 className="h-4 w-4 text-slate-600" />
                          </div>
                          <div>
                            <p className="font-medium">{company.name}</p>
                            {company.billing_email && (
                              <p className="text-sm text-muted-foreground">{company.billing_email}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">{company.code}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={company.billing_type === "hybrid" ? "default" : "secondary"} className="text-xs">
                          {company.billing_type === "hybrid" ? "Hybrid" : "Invoice"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusConfig[company.status]?.variant || "secondary"}>
                          {statusConfig[company.status]?.label || company.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-slate-400" />
                          {company.user_count}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <FileText className="h-3.5 w-3.5 text-slate-400" />
                          {company.filing_count}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {company.created_at ? format(new Date(company.created_at), "MMM d, yyyy") : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); fetchCompanyDetail(company.id); }}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            {company.status === "active" && (
                              <DropdownMenuItem
                                onClick={(e) => { e.stopPropagation(); handleStatusChange(company.id, "suspended"); }}
                                className="text-amber-600"
                              >
                                <Ban className="h-4 w-4 mr-2" />
                                Suspend
                              </DropdownMenuItem>
                            )}
                            {company.status === "suspended" && (
                              <DropdownMenuItem
                                onClick={(e) => { e.stopPropagation(); handleStatusChange(company.id, "active"); }}
                                className="text-green-600"
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Reactivate
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Company Detail Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-[500px] sm:w-[600px] overflow-y-auto">
          {loadingDetail ? (
            <div className="space-y-4 pt-8">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : selectedCompany ? (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  {selectedCompany.name}
                </SheetTitle>
                <SheetDescription>
                  Code: {selectedCompany.code} • Created {selectedCompany.created_at ? format(new Date(selectedCompany.created_at), "MMMM d, yyyy") : "—"}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Status */}
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge variant={statusConfig[selectedCompany.status]?.variant || "secondary"} className="mt-1">
                      {statusConfig[selectedCompany.status]?.label || selectedCompany.status}
                    </Badge>
                  </div>
                  {selectedCompany.status === "active" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStatusChange(selectedCompany.id, "suspended")}
                      className="text-amber-600"
                    >
                      <Ban className="h-4 w-4 mr-1" />
                      Suspend
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStatusChange(selectedCompany.id, "active")}
                      className="text-green-600"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Reactivate
                    </Button>
                  )}
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg text-center">
                    <Users className="h-5 w-5 mx-auto text-blue-600 mb-1" />
                    <p className="text-2xl font-bold">{selectedCompany.stats.total_users}</p>
                    <p className="text-xs text-muted-foreground">Users</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg text-center">
                    <FileText className="h-5 w-5 mx-auto text-green-600 mb-1" />
                    <p className="text-2xl font-bold">{selectedCompany.stats.filed_reports}</p>
                    <p className="text-xs text-muted-foreground">Filings</p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg text-center">
                    <DollarSign className="h-5 w-5 mx-auto text-purple-600 mb-1" />
                    <p className="text-2xl font-bold">{formatCurrency(selectedCompany.stats.total_paid_cents)}</p>
                    <p className="text-xs text-muted-foreground">Paid</p>
                  </div>
                </div>

                {/* Contact Info */}
                <div>
                  <h4 className="font-semibold mb-3">Billing Contact</h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-muted-foreground">Name:</span> {selectedCompany.billing_contact_name || "—"}</p>
                    <p><span className="text-muted-foreground">Email:</span> {selectedCompany.billing_email || "—"}</p>
                    <p><span className="text-muted-foreground">Phone:</span> {selectedCompany.phone || "—"}</p>
                  </div>
                </div>

                {/* Billing Settings */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Billing Settings
                    </h4>
                    {!editingBilling ? (
                      <Button variant="outline" size="sm" onClick={() => setEditingBilling(true)}>
                        Edit
                      </Button>
                    ) : (
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => {
                          setEditingBilling(false)
                          if (billingSettings) {
                            setEditBillingType(billingSettings.billing_type || "invoice_only")
                            setFilingFee(String(billingSettings.filing_fee_dollars))
                            setPaymentTerms(String(billingSettings.payment_terms_days))
                            setBillingNotes(billingSettings.billing_notes || "")
                          }
                        }}>
                          Cancel
                        </Button>
                        <Button size="sm" onClick={saveBillingSettings} disabled={savingBilling}>
                          {savingBilling ? "Saving..." : "Save"}
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  {billingSettings && (
                    <div className="space-y-4">
                      {/* Billing Type */}
                      <div>
                        <Label className="text-muted-foreground text-xs">Billing Type</Label>
                        {editingBilling ? (
                          <div className="flex gap-3 mt-1">
                            <label className={`flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer text-sm ${editBillingType === "invoice_only" ? "border-blue-500 bg-blue-50" : ""}`}>
                              <input
                                type="radio"
                                name="edit_billing_type"
                                value="invoice_only"
                                checked={editBillingType === "invoice_only"}
                                onChange={() => setEditBillingType("invoice_only")}
                              />
                              Invoice Only
                            </label>
                            <label className={`flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer text-sm ${editBillingType === "hybrid" ? "border-blue-500 bg-blue-50" : ""}`}>
                              <input
                                type="radio"
                                name="edit_billing_type"
                                value="hybrid"
                                checked={editBillingType === "hybrid"}
                                onChange={() => setEditBillingType("hybrid")}
                              />
                              Hybrid
                            </label>
                          </div>
                        ) : (
                          <div className="mt-1">
                            <Badge variant={billingSettings.billing_type === "hybrid" ? "default" : "secondary"}>
                              {billingSettings.billing_type === "hybrid" ? "Hybrid" : "Invoice Only"}
                            </Badge>
                          </div>
                        )}
                        {editingBilling && editBillingType === "hybrid" && (
                          <p className="text-xs text-amber-600 mt-1">
                            ⚠️ Hybrid requires client to have card on file for auto-charge.
                          </p>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-muted-foreground text-xs">Filing Fee</Label>
                          {editingBilling ? (
                            <div className="relative mt-1">
                              <span className="absolute left-3 top-2 text-muted-foreground">$</span>
                              <Input
                                type="number"
                                step="0.01"
                                value={filingFee}
                                onChange={(e) => setFilingFee(e.target.value)}
                                className="pl-7"
                              />
                            </div>
                          ) : (
                            <p className="text-lg font-semibold">
                              ${billingSettings.filing_fee_dollars.toFixed(2)}
                            </p>
                          )}
                        </div>
                        
                        <div>
                          <Label className="text-muted-foreground text-xs">Payment Terms</Label>
                          {editingBilling ? (
                            <Select
                              value={paymentTerms}
                              onValueChange={setPaymentTerms}
                            >
                              <SelectTrigger className="mt-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {PAYMENT_TERMS_OPTIONS.map((days) => (
                                  <SelectItem key={days} value={String(days)}>Net {days}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <p className="text-lg font-semibold">
                              Net {billingSettings.payment_terms_days}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div>
                        <Label className="text-muted-foreground text-xs">Internal Billing Notes</Label>
                        {editingBilling ? (
                          <textarea
                            value={billingNotes}
                            onChange={(e) => setBillingNotes(e.target.value)}
                            rows={2}
                            className="w-full mt-1 px-3 py-2 border rounded-md text-sm resize-none"
                            placeholder="e.g., Volume discount agreement, special terms..."
                          />
                        ) : (
                          <p className="text-sm mt-1">
                            {billingSettings.billing_notes || <span className="text-muted-foreground italic">No notes</span>}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Recent Activity */}
                {selectedCompany.recent_reports && selectedCompany.recent_reports.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3">Recent Reports</h4>
                    <div className="space-y-2">
                      {selectedCompany.recent_reports.map((report) => (
                        <div key={report.id} className="flex justify-between items-center p-2 bg-slate-50 rounded">
                          <span className="text-sm truncate flex-1">{report.property_address_text}</span>
                          <Badge variant="outline" className="ml-2">{report.status}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  )
}
