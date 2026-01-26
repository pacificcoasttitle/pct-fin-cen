"use client"

import { useState, useMemo } from "react"
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
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { StatusBadge } from "@/components/admin/status-badge"
import { CompanyTypeBadge } from "@/components/admin/company-type-badge"
import { CompanyDetailSheet, type Company } from "@/components/admin/company-detail-sheet"

// Mock data - realistic companies
const mockCompanies: Company[] = [
  {
    id: "1",
    name: "Pacific Coast Title Company",
    code: "PCT",
    companyType: "internal",
    status: "active",
    billingEmail: "billing@pacificcoasttitle.com",
    billingContactName: "Sarah Johnson",
    phone: "(555) 123-4567",
    address: { street: "123 Main St", city: "Los Angeles", state: "CA", zip: "90001" },
    userCount: 8,
    reportCount: 156,
    lastActivity: "2026-01-26T14:30:00Z",
    createdAt: "2025-06-15T00:00:00Z"
  },
  {
    id: "2", 
    name: "Golden State Escrow",
    code: "GSE",
    companyType: "client",
    status: "active",
    billingEmail: "ap@goldenescrow.com",
    billingContactName: "Mike Chen",
    phone: "(555) 234-5678",
    address: { street: "456 Oak Ave", city: "San Francisco", state: "CA", zip: "94102" },
    userCount: 4,
    reportCount: 89,
    lastActivity: "2026-01-26T10:15:00Z",
    createdAt: "2025-08-01T00:00:00Z"
  },
  {
    id: "3",
    name: "Summit Title Services",
    code: "STS",
    companyType: "client", 
    status: "active",
    billingEmail: "billing@summittitle.com",
    billingContactName: "Jennifer Walsh",
    phone: "(555) 345-6789",
    address: { street: "789 Pine Blvd", city: "San Diego", state: "CA", zip: "92101" },
    userCount: 6,
    reportCount: 67,
    lastActivity: "2026-01-25T16:45:00Z",
    createdAt: "2025-09-10T00:00:00Z"
  },
  {
    id: "4",
    name: "Bay Area Title Co",
    code: "BAT",
    companyType: "client",
    status: "active",
    billingEmail: "invoices@bayareatitle.com",
    billingContactName: "David Park",
    phone: "(555) 456-7890",
    address: { street: "321 Market St", city: "Oakland", state: "CA", zip: "94612" },
    userCount: 3,
    reportCount: 45,
    lastActivity: "2026-01-26T09:00:00Z",
    createdAt: "2025-10-05T00:00:00Z"
  },
  {
    id: "5",
    name: "Coastal Closings Inc",
    code: "CCI",
    companyType: "client",
    status: "active",
    billingEmail: "accounting@coastalclosings.com",
    billingContactName: "Amanda Torres",
    phone: "(555) 567-8901",
    address: { street: "555 Beach Dr", city: "Santa Monica", state: "CA", zip: "90401" },
    userCount: 5,
    reportCount: 38,
    lastActivity: "2026-01-24T14:20:00Z",
    createdAt: "2025-10-20T00:00:00Z"
  },
  {
    id: "6",
    name: "Premier Escrow Services",
    code: "PES",
    companyType: "client",
    status: "active",
    billingEmail: "billing@premierescrow.com",
    billingContactName: "Robert Kim",
    phone: "(555) 678-9012",
    address: { street: "888 Wilshire Blvd", city: "Beverly Hills", state: "CA", zip: "90210" },
    userCount: 4,
    reportCount: 52,
    lastActivity: "2026-01-26T11:30:00Z",
    createdAt: "2025-11-01T00:00:00Z"
  },
  {
    id: "7",
    name: "Valley Title Group",
    code: "VTG",
    companyType: "client",
    status: "active",
    billingEmail: "ap@valleytitle.com",
    billingContactName: "Lisa Martinez",
    phone: "(555) 789-0123",
    address: { street: "999 Van Nuys Blvd", city: "Van Nuys", state: "CA", zip: "91401" },
    userCount: 3,
    reportCount: 29,
    lastActivity: "2026-01-25T08:45:00Z",
    createdAt: "2025-11-15T00:00:00Z"
  },
  {
    id: "8",
    name: "Sunrise Settlement Co",
    code: "SSC",
    companyType: "client",
    status: "active",
    billingEmail: "finance@sunrisesettlement.com",
    billingContactName: "Kevin O'Brien",
    phone: "(555) 890-1234",
    address: { street: "111 Sunrise Ave", city: "Pasadena", state: "CA", zip: "91101" },
    userCount: 2,
    reportCount: 18,
    lastActivity: "2026-01-23T15:00:00Z",
    createdAt: "2025-12-01T00:00:00Z"
  },
  {
    id: "9",
    name: "Heritage Title Partners",
    code: "HTP",
    companyType: "client",
    status: "pending",
    billingEmail: "setup@heritagetitle.com",
    billingContactName: "Nancy Wilson",
    phone: "(555) 901-2345",
    address: { street: "222 Heritage Way", city: "Irvine", state: "CA", zip: "92618" },
    userCount: 1,
    reportCount: 0,
    lastActivity: null,
    createdAt: "2026-01-20T00:00:00Z"
  },
  {
    id: "10",
    name: "Cornerstone Escrow",
    code: "CSE",
    companyType: "client",
    status: "active",
    billingEmail: "billing@cornerstoneescrow.com",
    billingContactName: "James Lee",
    phone: "(555) 012-3456",
    address: { street: "333 Stone St", city: "Long Beach", state: "CA", zip: "90802" },
    userCount: 3,
    reportCount: 24,
    lastActivity: "2026-01-26T13:15:00Z",
    createdAt: "2025-12-10T00:00:00Z"
  },
  {
    id: "11",
    name: "Pacific Rim Title",
    code: "PRT",
    companyType: "client",
    status: "suspended",
    billingEmail: "accounts@pacificrimtitle.com",
    billingContactName: "Tom Nakamura",
    phone: "(555) 123-4567",
    address: { street: "444 Pacific Hwy", city: "Torrance", state: "CA", zip: "90503" },
    userCount: 2,
    reportCount: 12,
    lastActivity: "2026-01-10T10:00:00Z",
    createdAt: "2025-12-20T00:00:00Z"
  },
  {
    id: "12",
    name: "Westside Settlements",
    code: "WSS",
    companyType: "client",
    status: "pending",
    billingEmail: null,
    billingContactName: null,
    phone: "(555) 234-5678",
    address: { street: "555 West Blvd", city: "Culver City", state: "CA", zip: "90232" },
    userCount: 0,
    reportCount: 0,
    lastActivity: null,
    createdAt: "2026-01-25T00:00:00Z"
  }
]

function formatTimeAgo(dateStr: string | null): string {
  if (!dateStr) return "Never"
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return "Yesterday"
  if (diffDays < 7) return `${diffDays}d ago`
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export default function AdminCompaniesPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  // Calculate stats
  const stats = useMemo(() => ({
    total: mockCompanies.length,
    active: mockCompanies.filter(c => c.status === "active").length,
    pending: mockCompanies.filter(c => c.status === "pending").length,
    thisMonthFilings: mockCompanies.reduce((sum, c) => sum + Math.floor(c.reportCount * 0.3), 0), // ~30% this month
  }), [])

  // Filter companies
  const filteredCompanies = useMemo(() => {
    return mockCompanies.filter(company => {
      const matchesSearch = 
        company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        company.code.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = statusFilter === "all" || company.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [searchQuery, statusFilter])

  const handleViewCompany = (company: Company) => {
    setSelectedCompany(company)
    setSheetOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Companies</h1>
          <p className="text-slate-500">Manage client companies and their access</p>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button disabled className="bg-gradient-to-r from-blue-600 to-cyan-500">
                <Plus className="mr-2 h-4 w-4" />
                Add Company
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Coming soon</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
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
                <p className="text-xs text-slate-500 uppercase tracking-wide">Total Companies</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-100 rounded-xl">
                <Building2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Active</p>
                <p className="text-2xl font-bold">{stats.active}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-100 rounded-xl">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Pending Setup</p>
                <p className="text-2xl font-bold">{stats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-100 rounded-xl">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">This Month's Filings</p>
                <p className="text-2xl font-bold">{stats.thisMonthFilings}</p>
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
                {filteredCompanies.length} {filteredCompanies.length === 1 ? "company" : "companies"}
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search companies..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
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
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Users</TableHead>
                  <TableHead className="text-center">Reports</TableHead>
                  <TableHead>Last Activity</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCompanies.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                      No companies found matching your search
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCompanies.map((company) => (
                    <TableRow 
                      key={company.id} 
                      className="cursor-pointer hover:bg-slate-50"
                      onClick={() => handleViewCompany(company)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-slate-100 rounded-lg">
                            <Building2 className="h-4 w-4 text-slate-600" />
                          </div>
                          <div>
                            <p className="font-medium">{company.name}</p>
                            <CompanyTypeBadge type={company.companyType} className="mt-0.5" />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">{company.code}</Badge>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={company.status} />
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-slate-400" />
                          {company.userCount}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <FileText className="h-3.5 w-3.5 text-slate-400" />
                          {company.reportCount}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-500 text-sm">
                        {formatTimeAgo(company.lastActivity)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleViewCompany(company)
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Demo Notice */}
          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-700 flex items-center gap-2">
              <span className="text-lg">📋</span>
              <span>
                <strong>Demo data</strong> — This is sample company data for demonstration purposes.
                Company management features will be available post-launch.
              </span>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Company Detail Sheet */}
      <CompanyDetailSheet
        company={selectedCompany}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </div>
  )
}
