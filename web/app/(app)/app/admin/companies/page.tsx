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
  stats: {
    total_users: number
    active_users: number
    total_requests: number
    total_reports: number
    filed_reports: number
    total_billed_cents: number
    total_paid_cents: number
  }
  recent_reports: any[]
}

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
  
  // Create dialog
  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newCompany, setNewCompany] = useState({
    name: "",
    code: "",
    billing_email: "",
    billing_contact_name: "",
    phone: "",
  })

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
    try {
      const response = await fetch(`${API_BASE_URL}/companies/${companyId}`)
      if (response.ok) {
        const data = await response.json()
        setSelectedCompany(data)
        setSheetOpen(true)
      }
    } catch (error) {
      console.error("Failed to fetch company detail:", error)
    } finally {
      setLoadingDetail(false)
    }
  }

  // Create company
  const handleCreate = async () => {
    if (!newCompany.name || !newCompany.code) {
      toast({
        title: "Validation Error",
        description: "Name and code are required",
        variant: "destructive",
      })
      return
    }
    
    setCreating(true)
    try {
      const response = await fetch(`${API_BASE_URL}/companies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newCompany,
          company_type: "client",
        }),
      })
      
      if (response.ok) {
        toast({
          title: "Success",
          description: "Company created successfully",
        })
        setCreateOpen(false)
        setNewCompany({ name: "", code: "", billing_email: "", billing_contact_name: "", phone: "" })
        fetchCompanies()
        fetchStats()
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.detail || "Failed to create company",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create company",
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
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-blue-600 to-cyan-500">
                <Plus className="h-4 w-4 mr-2" />
                Add Company
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Company</DialogTitle>
                <DialogDescription>
                  Create a new client company. You can invite users after creation.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>Company Name *</Label>
                    <Input
                      value={newCompany.name}
                      onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
                      placeholder="Pacific Coast Title"
                    />
                  </div>
                  <div>
                    <Label>Company Code *</Label>
                    <Input
                      value={newCompany.code}
                      onChange={(e) => setNewCompany({ ...newCompany, code: e.target.value.toUpperCase() })}
                      placeholder="PCT"
                      maxLength={10}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Unique identifier (3-10 chars)
                    </p>
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input
                      value={newCompany.phone}
                      onChange={(e) => setNewCompany({ ...newCompany, phone: e.target.value })}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  <div>
                    <Label>Billing Contact</Label>
                    <Input
                      value={newCompany.billing_contact_name}
                      onChange={(e) => setNewCompany({ ...newCompany, billing_contact_name: e.target.value })}
                      placeholder="John Smith"
                    />
                  </div>
                  <div>
                    <Label>Billing Email</Label>
                    <Input
                      type="email"
                      value={newCompany.billing_email}
                      onChange={(e) => setNewCompany({ ...newCompany, billing_email: e.target.value })}
                      placeholder="billing@company.com"
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={creating}>
                  {creating ? "Creating..." : "Create Company"}
                </Button>
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
