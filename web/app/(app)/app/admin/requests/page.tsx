"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  Inbox,
  Search,
  Clock,
  Play,
  CheckCircle2,
  Timer,
  Filter,
  Eye,
  UserPlus,
  Building2,
  MapPin,
  AlertTriangle,
  Loader2,
  FileText,
  RefreshCw,
  ArrowRight,
  Shield,
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RequestStatusBadge } from "@/components/admin/request-status-badge"
import { PriorityBadge } from "@/components/admin/priority-badge"
import { RequestDetailSheet, type SubmissionRequest } from "@/components/admin/request-detail-sheet"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000"

// Extended SubmissionRequest with determination fields
interface ExtendedSubmissionRequest extends SubmissionRequest {
  determinationResult?: string | null
  exemptionReasons?: string[] | null
  exemptionCertificateId?: string | null
}

// Transform API response to match our SubmissionRequest interface
function transformApiResponse(apiData: ApiSubmissionRequest): ExtendedSubmissionRequest {
  return {
    id: apiData.id,
    companyId: apiData.company_id || "",
    companyName: apiData.company_name || "Unknown Company",
    requestedBy: apiData.requested_by_name || apiData.requested_by_email || "Unknown",
    escrowNumber: apiData.escrow_number || "",
    fileNumber: "",
    propertyAddress: apiData.property_address || { street: "", city: "", state: "", zip: "" },
    buyerName: apiData.buyer_name || "",
    buyerType: (apiData.buyer_type as "individual" | "entity" | "trust") || "individual",
    buyerEmail: apiData.buyer_email || "",
    sellerName: apiData.seller_name || "",
    purchasePriceCents: apiData.purchase_price_cents || 0,
    financingType: apiData.financing_type || "unknown",
    expectedClosingDate: apiData.expected_closing_date || "",
    notes: apiData.notes || null,
    priority: "normal" as const, // Default priority
    status: mapApiStatus(apiData.status),
    assignedTo: apiData.assigned_to_name ? { name: apiData.assigned_to_name, id: apiData.assigned_to_id || "" } : null,
    submittedAt: apiData.created_at,
    completedAt: apiData.completed_at || undefined,
    reportId: apiData.report_id || null,
    // Early determination fields
    determinationResult: apiData.determination_result,
    exemptionReasons: apiData.exemption_reasons,
    exemptionCertificateId: apiData.exemption_certificate_id,
  }
}

// Map API status to our local status type
function mapApiStatus(apiStatus: string): "pending" | "in_progress" | "completed" | "cancelled" | "exempt" | "reportable" {
  const statusMap: Record<string, "pending" | "in_progress" | "completed" | "cancelled" | "exempt" | "reportable"> = {
    pending: "pending",
    assigned: "in_progress",
    in_progress: "in_progress",
    completed: "completed",
    cancelled: "cancelled",
    exempt: "exempt",
    reportable: "reportable",
  }
  return statusMap[apiStatus] || "pending"
}

// API response type
interface ApiSubmissionRequest {
  id: string
  status: string
  property_address: { street: string; city: string; state: string; zip: string } | null
  purchase_price_cents: number | null
  expected_closing_date: string | null
  escrow_number: string | null
  financing_type: string | null
  buyer_name: string | null
  buyer_email: string | null
  buyer_type: string | null
  seller_name: string | null
  seller_email: string | null
  notes: string | null
  report_id: string | null
  created_at: string
  updated_at: string
  completed_at: string | null
  // Company and user info (real data from backend)
  company_id: string | null
  company_name: string | null
  requested_by_name: string | null
  requested_by_email: string | null
  assigned_to_name: string | null
  assigned_to_id: string | null
  // Early determination fields
  determination_result: string | null
  exemption_reasons: string[] | null
  exemption_certificate_id: string | null
}

function formatTimeAgo(dateStr: string): string {
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

function truncateAddress(address: { street: string; city: string; state: string }): string {
  const full = `${address.street}, ${address.city}`
  return full.length > 30 ? full.substring(0, 30) + "..." : full
}

export default function AdminRequestsPage() {
  const router = useRouter()
  const { toast } = useToast()
  
  // State
  const [requests, setRequests] = useState<ExtendedSubmissionRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [priorityFilter, setPriorityFilter] = useState<string>("all")
  const [selectedRequest, setSelectedRequest] = useState<ExtendedSubmissionRequest | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [isCreatingReport, setIsCreatingReport] = useState<string | null>(null)

  // Fetch requests from API
  const fetchRequests = useCallback(async () => {
    try {
      setError(null)
      const response = await fetch(`${API_BASE_URL}/submission-requests`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch requests: ${response.status}`)
      }
      
      const data: ApiSubmissionRequest[] = await response.json()
      const transformedData = data.map(transformApiResponse)
      setRequests(transformedData)
    } catch (err) {
      console.error("Failed to fetch requests:", err)
      setError(err instanceof Error ? err.message : "Failed to load requests")
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial fetch and polling
  useEffect(() => {
    fetchRequests()
    
    // Poll every 30 seconds for updates
    const interval = setInterval(fetchRequests, 30000)
    return () => clearInterval(interval)
  }, [fetchRequests])

  // Calculate stats from real data
  const stats = useMemo(() => {
    const pending = requests.filter(r => r.status === "pending" || r.status === "reportable").length
    const inProgress = requests.filter(r => r.status === "in_progress").length
    const exempt = requests.filter(r => r.status === "exempt" || r.determinationResult === "exempt").length
    const today = new Date().toDateString()
    const completedToday = requests.filter(
      r => r.status === "completed" && r.completedAt && new Date(r.completedAt).toDateString() === today
    ).length
    
    // Calculate average processing hours from completed requests
    const completedRequests = requests.filter(r => r.status === "completed" && r.completedAt && r.submittedAt)
    let avgProcessingHours = 0
    if (completedRequests.length > 0) {
      const totalHours = completedRequests.reduce((sum, r) => {
        const submitted = new Date(r.submittedAt).getTime()
        const completed = new Date(r.completedAt!).getTime()
        return sum + (completed - submitted) / (1000 * 60 * 60)
      }, 0)
      avgProcessingHours = Math.round((totalHours / completedRequests.length) * 10) / 10
    }
    
    return {
      pending,
      inProgress,
      completedToday,
      exempt,
      avgProcessingHours,
    }
  }, [requests])

  // Filter requests
  const filteredRequests = useMemo(() => {
    return requests.filter(request => {
      const matchesSearch = 
        request.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.buyerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.escrowNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.propertyAddress.street.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (request.exemptionCertificateId || "").toLowerCase().includes(searchQuery.toLowerCase())
      
      // Status filter logic - handle exempt specially
      let matchesStatus = false
      if (statusFilter === "all") {
        matchesStatus = true
      } else if (statusFilter === "exempt") {
        matchesStatus = request.status === "exempt" || request.determinationResult === "exempt"
      } else if (statusFilter === "pending") {
        // Show both pending and reportable (needs staff action)
        matchesStatus = request.status === "pending" || request.status === "reportable"
      } else {
        matchesStatus = request.status === statusFilter
      }
      
      const matchesPriority = priorityFilter === "all" || request.priority === priorityFilter
      return matchesSearch && matchesStatus && matchesPriority
    })
  }, [requests, searchQuery, statusFilter, priorityFilter])

  const handleViewRequest = (request: ExtendedSubmissionRequest) => {
    setSelectedRequest(request)
    setSheetOpen(true)
  }

  const handleAssign = (requestId: string, userId: string) => {
    console.log("Assign request", requestId, "to user", userId)
    // TODO: Implement assignment API call
  }

  const handleStartWizard = async (requestId: string) => {
    // Find the request to get its reportId
    const request = requests.find(r => r.id === requestId)
    
    if (request?.reportId) {
      // Navigate to existing report wizard
      router.push(`/app/reports/${request.reportId}/wizard`)
      return
    }
    
    // Create a new report from this submission
    setIsCreatingReport(requestId)
    
    try {
      const response = await fetch(`${API_BASE_URL}/submission-requests/${requestId}/create-report`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || `Failed to create report: ${response.status}`)
      }
      
      const result = await response.json()
      
      toast({
        title: "Report Created",
        description: "Opening wizard...",
      })
      
      // Navigate to the wizard with the REAL report ID
      router.push(result.redirect_url)
      setSheetOpen(false)
      
      // Refresh the list to show updated status
      fetchRequests()
      
    } catch (error) {
      console.error("Failed to create report:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create report. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsCreatingReport(null)
    }
  }

  const handleCancel = (requestId: string) => {
    console.log("Cancel request", requestId)
    // TODO: Implement cancel API call
    setSheetOpen(false)
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading requests...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Failed to Load Requests</h3>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={fetchRequests}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Submission Requests</h1>
          <p className="text-slate-500">Process incoming FinCEN filing requests from clients</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchRequests}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
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
                <p className="text-xs text-slate-500 uppercase tracking-wide">Pending</p>
                <p className="text-2xl font-bold">{stats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-100 rounded-xl">
                <Play className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">In Progress</p>
                <p className="text-2xl font-bold">{stats.inProgress}</p>
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
                <p className="text-xs text-slate-500 uppercase tracking-wide">Completed Today</p>
                <p className="text-2xl font-bold">{stats.completedToday}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-green-100 rounded-xl">
                <Shield className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Auto-Exempt</p>
                <p className="text-2xl font-bold text-green-600">{stats.exempt}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Requests Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle>Request Queue</CardTitle>
                <CardDescription>
                  {filteredRequests.length} {filteredRequests.length === 1 ? "request" : "requests"}
                </CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search or enter Certificate ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 w-[280px]"
                  />
                  {searchQuery.toUpperCase().startsWith("EXM-") && (
                    <Badge className="absolute right-2 top-1/2 -translate-y-1/2 bg-green-100 text-green-700 border-green-200">
                      <Shield className="h-3 w-3 mr-1" />
                      Cert Search
                    </Badge>
                  )}
                </div>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priority</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Status Filter Tabs */}
            <Tabs value={statusFilter} onValueChange={setStatusFilter}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="pending" className="gap-1.5">
                  Needs Action
                  <Badge variant="secondary" className="h-5 px-1.5 bg-amber-100 text-amber-700">
                    {requests.filter(r => r.status === "pending" || r.status === "reportable").length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="in_progress">In Progress</TabsTrigger>
                <TabsTrigger value="exempt" className="gap-1.5">
                  Exempt
                  <Badge variant="secondary" className="h-5 px-1.5 bg-green-100 text-green-700">
                    {requests.filter(r => r.status === "exempt" || r.determinationResult === "exempt").length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
                <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Request</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Buyer</TableHead>
                  <TableHead>Escrow #</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Assigned</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-slate-500">
                      {requests.length === 0 
                        ? "No submission requests yet. They will appear here when clients submit new requests."
                        : "No requests found matching your filters"
                      }
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRequests.map((request) => (
                    <TableRow 
                      key={request.id} 
                      className={cn(
                        "cursor-pointer hover:bg-slate-50",
                        request.priority === "urgent" && "border-l-2 border-l-red-400"
                      )}
                      onClick={() => handleViewRequest(request)}
                    >
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">
                          {request.id.slice(0, 8).toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-slate-400" />
                          <span className="font-medium text-sm">{request.companyName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm text-slate-600">
                          <MapPin className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                          <span className="truncate max-w-[180px]">
                            {request.propertyAddress?.street 
                              ? truncateAddress(request.propertyAddress)
                              : "—"
                            }
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-sm">
                        {request.buyerName || "—"}
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-xs text-slate-600">
                          {request.escrowNumber || "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <PriorityBadge priority={request.priority} showIcon />
                      </TableCell>
                      <TableCell>
                        <RequestStatusBadge status={request.status} />
                      </TableCell>
                      <TableCell className="text-sm text-slate-500">
                        {formatTimeAgo(request.submittedAt)}
                      </TableCell>
                      <TableCell>
                        {request.assignedTo ? (
                          <span className="text-sm font-medium">{request.assignedTo.name}</span>
                        ) : (
                          <span className="text-sm text-slate-400">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* PRIMARY ACTION based on status */}
                          {request.status === "pending" && (
                            <Button 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleStartWizard(request.id)
                              }}
                              disabled={isCreatingReport === request.id}
                            >
                              {isCreatingReport === request.id ? (
                                <>
                                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                  Starting...
                                </>
                              ) : (
                                <>
                                  <Play className="h-3 w-3 mr-1" />
                                  Start Wizard
                                </>
                              )}
                            </Button>
                          )}
                          
                          {request.status === "in_progress" && request.reportId && (
                            <Button 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                router.push(`/app/reports/${request.reportId}/wizard`)
                              }}
                            >
                              <ArrowRight className="h-3 w-3 mr-1" />
                              Continue
                            </Button>
                          )}
                          
                          {/* SECONDARY: View details */}
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleViewRequest(request)
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Connection status */}
          {requests.length > 0 && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-700 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                <span>
                  Connected to live data • Auto-refreshes every 30 seconds
                </span>
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Request Detail Sheet */}
      <RequestDetailSheet
        request={selectedRequest}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onAssign={handleAssign}
        onStartWizard={handleStartWizard}
        onCancel={handleCancel}
        isCreatingReport={isCreatingReport}
      />
    </div>
  )
}
