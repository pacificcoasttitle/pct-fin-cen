"use client"

import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import {
  FileText,
  Search,
  Filter,
  Calendar,
  Loader2,
  AlertTriangle,
  Eye,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  RotateCcw,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { getAdminReports, retryFiling, type AdminReportItem } from "@/lib/api"

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  draft: { label: "Draft", color: "bg-slate-100 text-slate-700" },
  determination_complete: { label: "Determined", color: "bg-blue-100 text-blue-700" },
  awaiting_parties: { label: "Awaiting Parties", color: "bg-amber-100 text-amber-700" },
  collecting: { label: "Collecting", color: "bg-amber-100 text-amber-700" },
  ready_to_file: { label: "Ready to File", color: "bg-green-100 text-green-700" },
  filed: { label: "Filed", color: "bg-emerald-100 text-emerald-700" },
  exempt: { label: "Exempt", color: "bg-purple-100 text-purple-700" },
}

const FILING_STATUS_MAP: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  not_started: { label: "Not Started", color: "bg-slate-100 text-slate-600", icon: Clock },
  queued: { label: "Queued", color: "bg-blue-100 text-blue-700", icon: Clock },
  submitted: { label: "Submitted", color: "bg-blue-100 text-blue-700", icon: Clock },
  accepted: { label: "Accepted", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-700", icon: XCircle },
  needs_review: { label: "Needs Review", color: "bg-amber-100 text-amber-700", icon: AlertCircle },
  filed_mock: { label: "Filed (Demo)", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
}

function getStatusInfo(status: string) {
  return STATUS_MAP[status] || { label: status, color: "bg-slate-100 text-slate-700" }
}

function getFilingStatusInfo(status: string | null) {
  if (!status) return FILING_STATUS_MAP.not_started
  return FILING_STATUS_MAP[status] || FILING_STATUS_MAP.not_started
}

export default function AdminReportsPage() {
  const [reports, setReports] = useState<AdminReportItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [filingStatusFilter, setFilingStatusFilter] = useState("all")
  const [retrying, setRetrying] = useState<string | null>(null)

  const fetchReports = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getAdminReports({
        status: statusFilter !== "all" ? statusFilter : undefined,
        filing_status: filingStatusFilter !== "all" ? filingStatusFilter : undefined,
        q: searchQuery || undefined,
        limit: 100,
      })
      setReports(data.items)
      setTotal(data.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reports")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReports()
  }, [statusFilter, filingStatusFilter])

  // Local search filter (in addition to server-side)
  const filteredReports = useMemo(() => {
    if (!searchQuery) return reports
    const lower = searchQuery.toLowerCase()
    return reports.filter((r) =>
      r.property_address_text?.toLowerCase().includes(lower) ||
      r.id.toLowerCase().includes(lower)
    )
  }, [reports, searchQuery])

  const handleRetry = async (reportId: string) => {
    try {
      setRetrying(reportId)
      await retryFiling(reportId)
      await fetchReports()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to retry filing")
    } finally {
      setRetrying(null)
    }
  }

  if (loading && reports.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    )
  }

  if (error && reports.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Failed to load reports</h2>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={fetchReports}>Retry</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Admin Reports</h1>
          <p className="text-slate-500">View and manage all reports with filing status</p>
        </div>
        <Button variant="outline" onClick={fetchReports} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <Button variant="ghost" size="sm" onClick={() => setError(null)}>
            Dismiss
          </Button>
        </div>
      )}

      {/* Filters & Table */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <CardTitle>All Reports</CardTitle>
              <CardDescription>
                {filteredReports.length} of {total} reports
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="search"
                  placeholder="Search reports..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-full sm:w-64"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="collecting">Collecting</SelectItem>
                  <SelectItem value="ready_to_file">Ready</SelectItem>
                  <SelectItem value="filed">Filed</SelectItem>
                  <SelectItem value="exempt">Exempt</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filingStatusFilter} onValueChange={setFilingStatusFilter}>
                <SelectTrigger className="w-full sm:w-44">
                  <SelectValue placeholder="Filing Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Filing</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="needs_review">Needs Review</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredReports.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500">No reports match your criteria</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Property Address</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Filing</TableHead>
                    <TableHead>Parties</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReports.map((report) => {
                    const statusInfo = getStatusInfo(report.status)
                    const filingInfo = getFilingStatusInfo(report.filing_status)
                    const FilingIcon = filingInfo.icon
                    const canRetry = report.filing_status === "rejected" || report.filing_status === "needs_review"
                    
                    return (
                      <TableRow key={report.id}>
                        <TableCell className="max-w-xs">
                          <div>
                            <p className="font-medium truncate">
                              {report.property_address_text || "Untitled Report"}
                            </p>
                            <p className="text-xs text-slate-500 font-mono">
                              {report.id.slice(0, 8)}...
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={statusInfo.color}>
                            {statusInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge variant="secondary" className={filingInfo.color}>
                              <FilingIcon className="h-3 w-3 mr-1" />
                              {filingInfo.label}
                            </Badge>
                            {report.receipt_id && (
                              <span className="text-xs font-mono text-slate-500">
                                {report.receipt_id}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {report.parties_submitted}/{report.parties_total}
                          </span>
                        </TableCell>
                        <TableCell className="text-slate-500 text-sm">
                          {new Date(report.updated_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Link href={`/app/admin/reports/${report.id}`}>
                                    <Button variant="ghost" size="sm">
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  </Link>
                                </TooltipTrigger>
                                <TooltipContent>View Details</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            
                            {canRetry && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleRetry(report.id)}
                                      disabled={retrying === report.id}
                                    >
                                      {retrying === report.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <RotateCcw className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Retry Filing</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
