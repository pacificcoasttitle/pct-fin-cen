"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  Building2,
  ArrowLeft,
  Users,
  FileText,
  DollarSign,
  Edit,
  Ban,
  CheckCircle,
  UserPlus,
  Loader2,
  Clock,
  Mail,
  Phone,
  MapPin,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"
import { CompanyReadinessChecklist } from "@/components/CompanyReadinessChecklist"
import { format } from "date-fns"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL

const PAYMENT_TERMS_OPTIONS = [10, 15, 30, 45, 60]

interface CompanyDetail {
  id: string
  name: string
  code: string
  company_type: string
  status: string
  billing_email: string | null
  billing_contact_name: string | null
  billing_type: string
  filing_fee_cents: number
  filing_fee_dollars: number
  payment_terms_days: number
  billing_notes: string | null
  stripe_customer_id: string | null
  address: any
  phone: string | null
  settings: any
  created_at: string
  updated_at: string
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
  recent_reports: Array<{
    id: string
    property_address_text: string
    status: string
    created_at: string
  }>
}

interface CompanyUser {
  id: string
  name: string
  email: string
  role: string
  status: string
  last_login_at: string | null
  created_at: string
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  active: { label: "Active", variant: "default" },
  suspended: { label: "Suspended", variant: "destructive" },
  inactive: { label: "Inactive", variant: "secondary" },
}

const roleLabels: Record<string, string> = {
  client_admin: "Admin",
  client_user: "User",
}

export default function CompanyDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const companyId = params.id as string

  const [company, setCompany] = useState<CompanyDetail | null>(null)
  const [users, setUsers] = useState<CompanyUser[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingUsers, setLoadingUsers] = useState(true)

  // Billing edit state
  const [editingBilling, setEditingBilling] = useState(false)
  const [savingBilling, setSavingBilling] = useState(false)
  const [editBillingType, setEditBillingType] = useState("invoice_only")
  const [editFilingFee, setEditFilingFee] = useState("")
  const [editPaymentTerms, setEditPaymentTerms] = useState("")
  const [editBillingNotes, setEditBillingNotes] = useState("")

  // Invite user dialog
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteName, setInviteName] = useState("")
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState("client_user")
  const [inviting, setInviting] = useState(false)

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100)
  }

  const fetchCompany = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/companies/${companyId}`)
      if (response.ok) {
        const data = await response.json()
        setCompany(data)
        setEditBillingType(data.billing_type || "invoice_only")
        setEditFilingFee(String(data.filing_fee_dollars || 75))
        setEditPaymentTerms(String(data.payment_terms_days || 30))
        setEditBillingNotes(data.billing_notes || "")
      } else {
        toast({
          title: "Error",
          description: "Company not found",
          variant: "destructive",
        })
        router.push("/app/admin/companies")
      }
    } catch (error) {
      console.error("Failed to fetch company:", error)
    } finally {
      setLoading(false)
    }
  }, [companyId, router, toast])

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true)
    try {
      const response = await fetch(`${API_BASE_URL}/companies/${companyId}/users`)
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users || [])
      }
    } catch (error) {
      console.error("Failed to fetch users:", error)
    } finally {
      setLoadingUsers(false)
    }
  }, [companyId])

  useEffect(() => {
    fetchCompany()
    fetchUsers()
  }, [fetchCompany, fetchUsers])

  const handleStatusChange = async (newStatus: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/companies/${companyId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      if (response.ok) {
        toast({ title: "Success", description: `Company ${newStatus}` })
        fetchCompany()
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to update status", variant: "destructive" })
    }
  }

  const handleSaveBilling = async () => {
    setSavingBilling(true)
    try {
      const response = await fetch(`${API_BASE_URL}/billing/admin/rates/${companyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          billing_type: editBillingType,
          filing_fee_cents: Math.round(parseFloat(editFilingFee) * 100),
          payment_terms_days: parseInt(editPaymentTerms),
          billing_notes: editBillingNotes || null,
        }),
      })
      if (response.ok) {
        toast({ title: "Success", description: "Billing settings updated" })
        setEditingBilling(false)
        fetchCompany()
      } else {
        const err = await response.json()
        toast({ title: "Error", description: err.detail || "Failed to update", variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "Error", description: "Network error", variant: "destructive" })
    } finally {
      setSavingBilling(false)
    }
  }

  const handleInviteUser = async () => {
    if (!inviteName.trim() || !inviteEmail.trim()) {
      toast({ title: "Error", description: "Name and email are required", variant: "destructive" })
      return
    }
    setInviting(true)
    try {
      const response = await fetch(`${API_BASE_URL}/users/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: inviteName.trim(),
          email: inviteEmail.trim().toLowerCase(),
          role: inviteRole,
          company_id: companyId,
        }),
      })
      if (response.ok) {
        toast({ title: "Success", description: `User ${inviteEmail} invited` })
        setInviteOpen(false)
        setInviteName("")
        setInviteEmail("")
        setInviteRole("client_user")
        fetchUsers()
      } else {
        const err = await response.json()
        toast({ title: "Error", description: err.detail || "Failed to invite", variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "Error", description: "Network error", variant: "destructive" })
    } finally {
      setInviting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (!company) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/app/admin/companies"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Companies
        </Link>
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-slate-100 rounded-xl">
              <Building2 className="h-6 w-6 text-slate-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{company.name}</h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="outline" className="font-mono">{company.code}</Badge>
                <span>•</span>
                <Badge variant={statusConfig[company.status]?.variant || "secondary"}>
                  {statusConfig[company.status]?.label || company.status}
                </Badge>
                <span>•</span>
                <span>Since {company.created_at ? format(new Date(company.created_at), "MMM d, yyyy") : "—"}</span>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            {company.status === "active" ? (
              <Button variant="outline" onClick={() => handleStatusChange("suspended")} className="text-amber-600">
                <Ban className="h-4 w-4 mr-2" />
                Suspend
              </Button>
            ) : (
              <Button variant="outline" onClick={() => handleStatusChange("active")} className="text-green-600">
                <CheckCircle className="h-4 w-4 mr-2" />
                Reactivate
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-100 rounded-xl">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase">Users</p>
                <p className="text-2xl font-bold">{company.stats.total_users}</p>
                <p className="text-xs text-muted-foreground">{company.stats.active_users} active</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-green-100 rounded-xl">
                <FileText className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase">Filings</p>
                <p className="text-2xl font-bold">{company.stats.filed_reports}</p>
                <p className="text-xs text-muted-foreground">{company.stats.total_reports} total reports</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-purple-100 rounded-xl">
                <DollarSign className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase">Billed</p>
                <p className="text-2xl font-bold">{formatCurrency(company.stats.total_billed_cents)}</p>
                <p className="text-xs text-muted-foreground">{formatCurrency(company.stats.total_paid_cents)} paid</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Setup Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Setup Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <CompanyReadinessChecklist companyId={companyId} />
              </CardContent>
            </Card>

            {/* Contact Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">{company.billing_email || "—"}</p>
                    <p className="text-xs text-muted-foreground">Billing Email</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Users className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">{company.billing_contact_name || "—"}</p>
                    <p className="text-xs text-muted-foreground">Billing Contact</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">{company.phone || "—"}</p>
                    <p className="text-xs text-muted-foreground">Phone</p>
                  </div>
                </div>
                {company.address?.street && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">
                        {company.address.street}<br />
                        {company.address.city}, {company.address.state} {company.address.zip}
                      </p>
                      <p className="text-xs text-muted-foreground">Address</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Billing Configuration</CardTitle>
                {!editingBilling ? (
                  <Button variant="outline" size="sm" onClick={() => setEditingBilling(true)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => {
                      setEditingBilling(false)
                      setEditBillingType(company.billing_type || "invoice_only")
                      setEditFilingFee(String(company.filing_fee_dollars || 75))
                      setEditPaymentTerms(String(company.payment_terms_days || 30))
                      setEditBillingNotes(company.billing_notes || "")
                    }}>
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleSaveBilling} disabled={savingBilling}>
                      {savingBilling && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Save
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Billing Type */}
                <div>
                  <Label className="text-muted-foreground text-xs">Billing Type</Label>
                  {editingBilling ? (
                    <div className="flex gap-3 mt-2">
                      <label className={`flex items-center gap-2 px-4 py-3 border rounded-lg cursor-pointer ${editBillingType === "invoice_only" ? "border-blue-500 bg-blue-50" : ""}`}>
                        <input
                          type="radio"
                          name="billing_type"
                          value="invoice_only"
                          checked={editBillingType === "invoice_only"}
                          onChange={() => setEditBillingType("invoice_only")}
                        />
                        <div>
                          <p className="font-medium">Invoice Only</p>
                          <p className="text-xs text-muted-foreground">Invoices on your terms</p>
                        </div>
                      </label>
                      <label className={`flex items-center gap-2 px-4 py-3 border rounded-lg cursor-pointer ${editBillingType === "hybrid" ? "border-blue-500 bg-blue-50" : ""}`}>
                        <input
                          type="radio"
                          name="billing_type"
                          value="hybrid"
                          checked={editBillingType === "hybrid"}
                          onChange={() => setEditBillingType("hybrid")}
                        />
                        <div>
                          <p className="font-medium">Hybrid</p>
                          <p className="text-xs text-muted-foreground">Auto-charge if unpaid</p>
                        </div>
                      </label>
                    </div>
                  ) : (
                    <div className="mt-1">
                      <Badge variant={company.billing_type === "hybrid" ? "default" : "secondary"} className="text-sm">
                        {company.billing_type === "hybrid" ? "Hybrid" : "Invoice Only"}
                      </Badge>
                      {company.billing_type === "hybrid" && !company.stripe_customer_id && (
                        <p className="text-xs text-amber-600 mt-1">
                          ⚠️ No card on file — required for hybrid billing
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <Label className="text-muted-foreground text-xs">Filing Fee</Label>
                    {editingBilling ? (
                      <div className="relative mt-1">
                        <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                        <Input
                          type="number"
                          step="0.01"
                          value={editFilingFee}
                          onChange={(e) => setEditFilingFee(e.target.value)}
                          className="pl-7"
                        />
                      </div>
                    ) : (
                      <p className="text-2xl font-bold mt-1">{formatCurrency(company.filing_fee_cents)}</p>
                    )}
                  </div>

                  <div>
                    <Label className="text-muted-foreground text-xs">Payment Terms</Label>
                    {editingBilling ? (
                      <Select value={editPaymentTerms} onValueChange={setEditPaymentTerms}>
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
                      <p className="text-2xl font-bold mt-1">Net {company.payment_terms_days}</p>
                    )}
                  </div>
                </div>

                <div>
                  <Label className="text-muted-foreground text-xs">Billing Notes (Internal)</Label>
                  {editingBilling ? (
                    <textarea
                      value={editBillingNotes}
                      onChange={(e) => setEditBillingNotes(e.target.value)}
                      rows={3}
                      className="w-full mt-1 px-3 py-2 border rounded-md text-sm resize-none"
                      placeholder="Volume discount, special terms..."
                    />
                  ) : (
                    <p className="text-sm mt-1">
                      {company.billing_notes || <span className="text-muted-foreground italic">No notes</span>}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Users</CardTitle>
                <Button size="sm" onClick={() => setInviteOpen(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite User
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingUsers ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : users.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-2">No users yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Invite the first user to get started
                  </p>
                  <Button onClick={() => setInviteOpen(true)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Invite User
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Login</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{roleLabels[user.role] || user.role}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.status === "active" ? "default" : "secondary"}>
                            {user.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {user.last_login_at
                            ? format(new Date(user.last_login_at), "MMM d, yyyy")
                            : "Never"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {company.recent_reports.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-2">No activity yet</h3>
                  <p className="text-sm text-muted-foreground">
                    Reports and filings will appear here
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {company.recent_reports.map((report) => (
                    <div key={report.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm">{report.property_address_text}</p>
                          <p className="text-xs text-muted-foreground">
                            {report.created_at ? format(new Date(report.created_at), "MMM d, yyyy") : "—"}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline">{report.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Invite User Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite User</DialogTitle>
            <DialogDescription>
              Add a new user to {company.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Name *</Label>
              <Input
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="John Doe"
              />
            </div>
            <div>
              <Label>Email *</Label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="john@company.com"
              />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="client_admin">Administrator</SelectItem>
                  <SelectItem value="client_user">User</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleInviteUser} disabled={inviting}>
              {inviting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
