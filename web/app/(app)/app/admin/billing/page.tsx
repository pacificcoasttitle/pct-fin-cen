"use client"

import { useState, useMemo } from "react"
import {
  DollarSign,
  Search,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Receipt,
  Plus,
  Eye,
  Download,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { InvoiceStatusBadge } from "@/components/admin/invoice-status-badge"
import { EventTypeBadge } from "@/components/admin/event-type-badge"
import { InvoiceDetailSheet, type Invoice, type BillingEvent } from "@/components/admin/invoice-detail-sheet"
import { cn } from "@/lib/utils"

// Mock billing events data (unbilled)
const mockBillingEvents: BillingEvent[] = [
  { id: "be-001", companyId: "2", companyName: "Golden State Escrow", reportId: "rpt-089", escrowNumber: "GSE-2026-1489", eventType: "filing_accepted", description: "RRER Filing - 321 Main St", amountCents: 5000, bsaId: "31000012345678", invoiceId: null, createdAt: "2026-01-26T16:30:00Z" },
  { id: "be-002", companyId: "3", companyName: "Summit Title Services", reportId: "rpt-078", escrowNumber: "STS-2026-0756", eventType: "filing_accepted", description: "RRER Filing - 555 Park Ave", amountCents: 5000, bsaId: "31000012345679", invoiceId: null, createdAt: "2026-01-26T14:00:00Z" },
  { id: "be-003", companyId: "2", companyName: "Golden State Escrow", reportId: "rpt-077", escrowNumber: "GSE-2026-1423", eventType: "filing_accepted", description: "RRER Filing - 789 Oak St", amountCents: 5000, bsaId: "31000012345680", invoiceId: null, createdAt: "2026-01-25T11:00:00Z" },
  { id: "be-004", companyId: "5", companyName: "Coastal Closings Inc", reportId: "rpt-076", escrowNumber: "CCI-2026-0398", eventType: "filing_accepted", description: "RRER Filing - 777 Beachfront Way", amountCents: 5000, bsaId: "31000012345681", invoiceId: null, createdAt: "2026-01-25T09:30:00Z" },
  { id: "be-005", companyId: "4", companyName: "Bay Area Title Co", reportId: "rpt-075", escrowNumber: "BAT-2026-2198", eventType: "filing_accepted", description: "RRER Filing - 444 Innovation Dr", amountCents: 5000, bsaId: "31000012345682", invoiceId: null, createdAt: "2026-01-24T15:00:00Z" },
  { id: "be-006", companyId: "6", companyName: "Premier Escrow Services", reportId: "rpt-074", escrowNumber: "PES-2026-1098", eventType: "filing_accepted", description: "RRER Filing - 222 Rodeo Dr", amountCents: 5000, bsaId: "31000012345683", invoiceId: null, createdAt: "2026-01-24T11:00:00Z" },
  { id: "be-007", companyId: "7", companyName: "Valley Title Group", reportId: "rpt-073", escrowNumber: "VTG-2026-0534", eventType: "filing_accepted", description: "RRER Filing - 789 Valley View Rd", amountCents: 5000, bsaId: "31000012345684", invoiceId: null, createdAt: "2026-01-23T16:00:00Z" },
  { id: "be-008", companyId: "3", companyName: "Summit Title Services", reportId: "rpt-072", escrowNumber: "STS-2026-0712", eventType: "filing_accepted", description: "RRER Filing - 432 Summit Dr", amountCents: 5000, bsaId: "31000012345685", invoiceId: null, createdAt: "2026-01-23T14:00:00Z" },
  { id: "be-009", companyId: "2", companyName: "Golden State Escrow", reportId: "rpt-071", escrowNumber: "GSE-2026-1401", eventType: "expedite_fee", description: "Rush Processing - 321 Main St", amountCents: 2500, bsaId: null, invoiceId: null, createdAt: "2026-01-23T10:00:00Z" },
  { id: "be-010", companyId: "8", companyName: "Sunrise Settlement Co", reportId: "rpt-070", escrowNumber: "SSC-2026-0198", eventType: "filing_accepted", description: "RRER Filing - 234 Morning Glory Ln", amountCents: 5000, bsaId: "31000012345686", invoiceId: null, createdAt: "2026-01-22T15:30:00Z" },
  { id: "be-011", companyId: "10", companyName: "Cornerstone Escrow", reportId: "rpt-069", escrowNumber: "CSE-2026-0745", eventType: "filing_accepted", description: "RRER Filing - 567 Stone Canyon Rd", amountCents: 5000, bsaId: "31000012345687", invoiceId: null, createdAt: "2026-01-22T11:00:00Z" },
  { id: "be-012", companyId: "5", companyName: "Coastal Closings Inc", reportId: "rpt-068", escrowNumber: "CCI-2026-0367", eventType: "filing_accepted", description: "RRER Filing - 888 Coastal Hwy", amountCents: 5000, bsaId: "31000012345688", invoiceId: null, createdAt: "2026-01-21T16:00:00Z" },
  { id: "be-013", companyId: "4", companyName: "Bay Area Title Co", reportId: "rpt-067", escrowNumber: "BAT-2026-2145", eventType: "filing_accepted", description: "RRER Filing - 456 Silicon Ave", amountCents: 5000, bsaId: "31000012345689", invoiceId: null, createdAt: "2026-01-21T09:30:00Z" },
  { id: "be-014", companyId: "6", companyName: "Premier Escrow Services", reportId: "rpt-066", escrowNumber: "PES-2026-1067", eventType: "expedite_fee", description: "Rush Processing - 111 Sunset Blvd", amountCents: 2500, bsaId: null, invoiceId: null, createdAt: "2026-01-20T14:00:00Z" },
  { id: "be-015", companyId: "3", companyName: "Summit Title Services", reportId: "rpt-065", escrowNumber: "STS-2026-0698", eventType: "filing_accepted", description: "RRER Filing - 321 Ocean Ave", amountCents: 5000, bsaId: "31000012345690", invoiceId: null, createdAt: "2026-01-20T10:00:00Z" },
  { id: "be-016", companyId: "2", companyName: "Golden State Escrow", reportId: "rpt-064", escrowNumber: "GSE-2026-1389", eventType: "filing_accepted", description: "RRER Filing - 555 Market St", amountCents: 5000, bsaId: "31000012345691", invoiceId: null, createdAt: "2026-01-19T15:00:00Z" },
  { id: "be-017", companyId: "7", companyName: "Valley Title Group", reportId: "rpt-063", escrowNumber: "VTG-2026-0512", eventType: "filing_accepted", description: "RRER Filing - 123 Valley Rd", amountCents: 5000, bsaId: "31000012345692", invoiceId: null, createdAt: "2026-01-19T11:00:00Z" },
]

// Mock invoices data
const mockInvoices: Invoice[] = [
  {
    id: "inv-001",
    invoiceNumber: "INV-2026-0001",
    companyId: "2",
    companyName: "Golden State Escrow",
    periodStart: "2025-12-01",
    periodEnd: "2025-12-31",
    itemCount: 18,
    subtotalCents: 9000000,
    taxCents: 0,
    totalCents: 9000000,
    status: "paid",
    sentAt: "2026-01-05T09:00:00Z",
    paidAt: "2026-01-12T14:30:00Z",
    paymentMethod: "check",
    paymentReference: "Check #4521"
  },
  {
    id: "inv-002",
    invoiceNumber: "INV-2026-0002",
    companyId: "3",
    companyName: "Summit Title Services",
    periodStart: "2025-12-01",
    periodEnd: "2025-12-31",
    itemCount: 14,
    subtotalCents: 7000000,
    taxCents: 0,
    totalCents: 7000000,
    status: "paid",
    sentAt: "2026-01-05T09:00:00Z",
    paidAt: "2026-01-15T10:00:00Z",
    paymentMethod: "ach",
    paymentReference: "ACH-789456"
  },
  {
    id: "inv-003",
    invoiceNumber: "INV-2026-0003",
    companyId: "5",
    companyName: "Coastal Closings Inc",
    periodStart: "2025-12-01",
    periodEnd: "2025-12-31",
    itemCount: 8,
    subtotalCents: 4000000,
    taxCents: 0,
    totalCents: 4000000,
    status: "sent",
    dueDate: "2026-02-04",
    sentAt: "2026-01-05T09:00:00Z",
    paidAt: null
  },
  {
    id: "inv-004",
    invoiceNumber: "INV-2026-0004",
    companyId: "6",
    companyName: "Premier Escrow Services",
    periodStart: "2025-12-01",
    periodEnd: "2025-12-31",
    itemCount: 11,
    subtotalCents: 5500000,
    taxCents: 0,
    totalCents: 5500000,
    status: "overdue",
    dueDate: "2026-01-20",
    sentAt: "2026-01-05T09:00:00Z",
    paidAt: null
  },
  {
    id: "inv-005",
    invoiceNumber: "INV-2026-0005",
    companyId: "4",
    companyName: "Bay Area Title Co",
    periodStart: "2026-01-01",
    periodEnd: "2026-01-31",
    itemCount: 5,
    subtotalCents: 2500000,
    taxCents: 0,
    totalCents: 2500000,
    status: "draft",
    sentAt: null,
    paidAt: null
  },
  {
    id: "inv-006",
    invoiceNumber: "INV-2026-0006",
    companyId: "7",
    companyName: "Valley Title Group",
    periodStart: "2025-12-01",
    periodEnd: "2025-12-31",
    itemCount: 6,
    subtotalCents: 3000000,
    taxCents: 0,
    totalCents: 3000000,
    status: "paid",
    sentAt: "2026-01-05T09:00:00Z",
    paidAt: "2026-01-18T11:00:00Z",
    paymentMethod: "wire",
    paymentReference: "WIRE-20260118-001"
  },
  {
    id: "inv-007",
    invoiceNumber: "INV-2026-0007",
    companyId: "8",
    companyName: "Sunrise Settlement Co",
    periodStart: "2025-12-01",
    periodEnd: "2025-12-31",
    itemCount: 4,
    subtotalCents: 2000000,
    taxCents: 0,
    totalCents: 2000000,
    status: "paid",
    sentAt: "2026-01-05T09:00:00Z",
    paidAt: "2026-01-10T09:00:00Z",
    paymentMethod: "ach",
    paymentReference: "ACH-456123"
  },
  {
    id: "inv-008",
    invoiceNumber: "INV-2026-0008",
    companyId: "10",
    companyName: "Cornerstone Escrow",
    periodStart: "2025-12-01",
    periodEnd: "2025-12-31",
    itemCount: 5,
    subtotalCents: 2500000,
    taxCents: 0,
    totalCents: 2500000,
    status: "sent",
    dueDate: "2026-02-04",
    sentAt: "2026-01-05T09:00:00Z",
    paidAt: null
  },
]

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(cents / 100)
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function formatPeriod(start: string, end: string): string {
  const startDate = new Date(start)
  const endDate = new Date(end)
  const startMonth = startDate.toLocaleDateString("en-US", { month: "short" })
  const endMonth = endDate.toLocaleDateString("en-US", { month: "short" })
  const year = endDate.getFullYear()
  
  if (startMonth === endMonth) {
    return `${startMonth} ${startDate.getDate()}-${endDate.getDate()}, ${year}`
  }
  return `${startMonth} ${startDate.getDate()} - ${endMonth} ${endDate.getDate()}, ${year}`
}

export default function AdminBillingPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("unbilled")
  const [selectedEvents, setSelectedEvents] = useState<string[]>([])
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  // Calculate stats
  const stats = useMemo(() => {
    const unbilledTotal = mockBillingEvents
      .filter(e => !e.invoiceId)
      .reduce((sum, e) => sum + e.amountCents, 0)
    
    const pendingTotal = mockInvoices
      .filter(i => i.status === "sent")
      .reduce((sum, i) => sum + i.totalCents, 0)
    
    const paidThisMonth = mockInvoices
      .filter(i => i.status === "paid" && i.paidAt && new Date(i.paidAt).getMonth() === new Date().getMonth())
      .reduce((sum, i) => sum + i.totalCents, 0)
    
    const outstanding = mockInvoices
      .filter(i => i.status === "overdue")
      .reduce((sum, i) => sum + i.totalCents, 0)
    
    return {
      unbilled: unbilledTotal,
      pending: pendingTotal,
      paidThisMonth,
      outstanding,
    }
  }, [])

  // Filter unbilled events
  const filteredEvents = useMemo(() => {
    return mockBillingEvents.filter(event => {
      if (event.invoiceId) return false // Only unbilled
      const matchesSearch = 
        event.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.escrowNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.description.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesSearch
    })
  }, [searchQuery])

  // Filter invoices
  const filteredInvoices = useMemo(() => {
    return mockInvoices.filter(invoice => {
      const matchesSearch = 
        invoice.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesSearch
    })
  }, [searchQuery])

  const handleSelectEvent = (eventId: string) => {
    setSelectedEvents(prev => 
      prev.includes(eventId) 
        ? prev.filter(id => id !== eventId)
        : [...prev, eventId]
    )
  }

  const handleSelectAllEvents = () => {
    if (selectedEvents.length === filteredEvents.length) {
      setSelectedEvents([])
    } else {
      setSelectedEvents(filteredEvents.map(e => e.id))
    }
  }

  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    setSheetOpen(true)
  }

  const selectedTotal = useMemo(() => {
    return filteredEvents
      .filter(e => selectedEvents.includes(e.id))
      .reduce((sum, e) => sum + e.amountCents, 0)
  }, [selectedEvents, filteredEvents])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Billing</h1>
          <p className="text-slate-500">Manage invoices and billing events</p>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button disabled className="bg-gradient-to-r from-blue-600 to-cyan-500">
                <Plus className="mr-2 h-4 w-4" />
                Generate Invoices
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
              <div className="p-2.5 bg-amber-100 rounded-xl">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Unbilled Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.unbilled)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-100 rounded-xl">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Pending Invoices</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.pending)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-100 rounded-xl">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Paid This Month</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.paidThisMonth)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-red-100 rounded-xl">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Outstanding</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.outstanding)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Billing Management</CardTitle>
              <CardDescription>Track billing events and invoices</CardDescription>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-[200px]"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="unbilled" className="gap-1.5">
                Unbilled Events
                <Badge variant="secondary" className="h-5 px-1.5 bg-amber-100 text-amber-700">
                  {mockBillingEvents.filter(e => !e.invoiceId).length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="invoices">Invoices</TabsTrigger>
              <TabsTrigger value="activity">All Activity</TabsTrigger>
            </TabsList>

            {/* Unbilled Events Tab */}
            <TabsContent value="unbilled">
              {selectedEvents.length > 0 && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-700">
                      {selectedEvents.length} events selected ({formatCurrency(selectedTotal)})
                    </span>
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button size="sm" disabled>
                          <Receipt className="h-4 w-4 mr-1" />
                          Create Invoice
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Coming soon</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              )}

              <div className="overflow-x-auto -mx-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]">
                        <Checkbox 
                          checked={selectedEvents.length === filteredEvents.length && filteredEvents.length > 0}
                          onCheckedChange={handleSelectAllEvents}
                        />
                      </TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Escrow #</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>BSA ID</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEvents.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                          No unbilled events found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredEvents.map((event) => (
                        <TableRow key={event.id}>
                          <TableCell>
                            <Checkbox 
                              checked={selectedEvents.includes(event.id)}
                              onCheckedChange={() => handleSelectEvent(event.id)}
                            />
                          </TableCell>
                          <TableCell className="text-sm text-slate-500">
                            {formatDate(event.createdAt)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-slate-400" />
                              <span className="font-medium text-sm">{event.companyName}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-slate-600">
                            {event.escrowNumber || "—"}
                          </TableCell>
                          <TableCell>
                            <EventTypeBadge type={event.eventType} />
                          </TableCell>
                          <TableCell className="font-mono text-xs text-slate-500">
                            {event.bsaId || "—"}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatCurrency(event.amountCents)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* Invoices Tab */}
            <TabsContent value="invoices">
              <div className="overflow-x-auto -mx-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead className="text-center">Items</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Sent</TableHead>
                      <TableHead>Paid</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvoices.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-slate-500">
                          No invoices found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredInvoices.map((invoice) => (
                        <TableRow 
                          key={invoice.id}
                          className={cn(
                            "cursor-pointer hover:bg-slate-50",
                            invoice.status === "overdue" && "bg-red-50/50"
                          )}
                          onClick={() => handleViewInvoice(invoice)}
                        >
                          <TableCell>
                            <Badge variant="outline" className="font-mono">
                              {invoice.invoiceNumber}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-slate-400" />
                              <span className="font-medium text-sm">{invoice.companyName}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-slate-600">
                            {formatPeriod(invoice.periodStart, invoice.periodEnd)}
                          </TableCell>
                          <TableCell className="text-center text-sm">
                            {invoice.itemCount}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatCurrency(invoice.totalCents)}
                          </TableCell>
                          <TableCell>
                            <InvoiceStatusBadge status={invoice.status} />
                          </TableCell>
                          <TableCell className="text-sm text-slate-500">
                            {invoice.sentAt ? formatDate(invoice.sentAt) : "—"}
                          </TableCell>
                          <TableCell className="text-sm text-slate-500">
                            {invoice.paidAt ? formatDate(invoice.paidAt) : "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleViewInvoice(invoice)
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
            </TabsContent>

            {/* All Activity Tab */}
            <TabsContent value="activity">
              <div className="overflow-x-auto -mx-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Invoice</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockBillingEvents.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell className="text-sm text-slate-500">
                          {formatDate(event.createdAt)}
                        </TableCell>
                        <TableCell>
                          <span className="font-medium text-sm">{event.companyName}</span>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm">{event.description}</p>
                            <p className="text-xs text-slate-500">{event.escrowNumber}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <EventTypeBadge type={event.eventType} />
                        </TableCell>
                        <TableCell>
                          {event.invoiceId ? (
                            <Badge variant="outline" className="font-mono text-xs">
                              {event.invoiceId}
                            </Badge>
                          ) : (
                            <span className="text-sm text-slate-400">Unbilled</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(event.amountCents)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>

          {/* Demo Notice */}
          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-700 flex items-center gap-2">
              <span className="text-lg">📋</span>
              <span>
                <strong>Demo data</strong> — This is sample billing data for demonstration purposes.
                Invoice generation and payment tracking will be available post-launch.
              </span>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Invoice Detail Sheet */}
      <InvoiceDetailSheet
        invoice={selectedInvoice}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </div>
  )
}
