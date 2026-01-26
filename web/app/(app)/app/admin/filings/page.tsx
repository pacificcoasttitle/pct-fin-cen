"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  Send,
  Search,
  Filter,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  RefreshCw,
  Eye,
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
import { getAdminFilings, retryFiling, type AdminFilingItem } from "@/lib/api"

const FILING_STATUS_MAP: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  not_started: { label: "Not Started", color: "bg-slate-100 text-slate-600", icon: Clock },
  queued: { label: "Queued", color: "bg-blue-100 text-blue-700", icon: Clock },
  submitted: { label: "Submitted", color: "bg-blue-100 text-blue-700", icon: Send },
  accepted: { label: "Accepted", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-700", icon: XCircle },
  needs_review: { label: "Needs Review", color: "bg-amber-100 text-amber-700", icon: AlertCircle },
}

function getFilingStatusInfo(status: string) {
  return FILING_STATUS_MAP[status] || FILING_STATUS_MAP.not_started
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString()
}

export default function AdminFilingsPage() {
  const [filings, setFilings] = useState<AdminFilingItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [retrying, setRetrying] = useState<string | null>(null)

  const fetchFilings = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getAdminFilings({
        status: statusFilter !== "all" ? statusFilter : undefined,
        limit: 100,
      })
      setFilings(data.items)
      setTotal(data.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load filings")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFilings()
  }, [statusFilter])

  const filteredFilings = searchQuery
    ? filings.filter((f) =>
        f.property_address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.receipt_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.report_id.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : filings

  const handleRetry = async (reportId: string) => {
    try {
      setRetrying(reportId)
      await retryFiling(reportId)
      await fetchFilings()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to retry")
    } finally {
      setRetrying(null)
    }
  }

  if (loading && filings.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Filing Queue</h1>
          <p className="text-slate-500">All filing submissions and their status</p>
        </div>
        <Button variant="outline" onClick={fetchFilings} disabled={loading}>
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

      {/* Stats Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {Object.entries(FILING_STATUS_MAP).map(([key, info]) => {
          const count = filings.filter((f) => f.status === key).length
          const Icon = info.icon
          return (
            <Card key={key} className={statusFilter === key ? "ring-2 ring-blue-500" : ""}>
              <CardContent className="pt-4 pb-4">
                <button
                  className="w-full flex items-center gap-3 text-left"
                  onClick={() => setStatusFilter(statusFilter === key ? "all" : key)}
                >
                  <Icon className={`h-5 w-5 ${info.color.split(" ")[1]}`} />
                  <div>
                    <p className="text-xs text-slate-500 uppercase">{info.label}</p>
                    <p className="text-xl font-bold">{count}</p>
                  </div>
                </button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <CardTitle>Submissions</CardTitle>
              <CardDescription>
                {filteredFilings.length} of {total} submissions
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="search"
                  placeholder="Search filings..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-full sm:w-64"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-44">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="queued">Queued</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="needs_review">Needs Review</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredFilings.length === 0 ? (
            <div className="text-center py-12">
              <Send className="h-12 w-12 mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500">No filings match your criteria</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Receipt / Report</TableHead>
                    <TableHead>Property</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Rejection</TableHead>
                    <TableHead>Attempts</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFilings.map((filing) => {
                    const statusInfo = getFilingStatusInfo(filing.status)
                    const StatusIcon = statusInfo.icon
                    const canRetry = filing.status === "rejected" || filing.status === "needs_review"

                    return (
                      <TableRow key={filing.id}>
                        <TableCell>
                          {filing.receipt_id ? (
                            <span className="font-mono font-medium text-emerald-600">
                              {filing.receipt_id}
                            </span>
                          ) : (
                            <span className="font-mono text-xs text-slate-500">
                              {filing.report_id.slice(0, 8)}...
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {filing.property_address || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={statusInfo.color}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {filing.rejection_code ? (
                            <div className="text-sm">
                              <p className="text-red-600 font-medium">{filing.rejection_code}</p>
                              {filing.rejection_message && (
                                <p className="text-xs text-slate-500 truncate max-w-[150px]">
                                  {filing.rejection_message}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{filing.attempts}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-slate-500">
                          {formatDateTime(filing.updated_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Link href={`/app/admin/reports/${filing.report_id}`}>
                                    <Button variant="ghost" size="sm">
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  </Link>
                                </TooltipTrigger>
                                <TooltipContent>View Report</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            {canRetry && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleRetry(filing.report_id)}
                                      disabled={retrying === filing.report_id}
                                    >
                                      {retrying === filing.report_id ? (
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
