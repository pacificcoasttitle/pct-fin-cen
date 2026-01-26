"use client"

import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
  Loader2, 
  Plus, 
  FileText, 
  AlertTriangle, 
  RefreshCw, 
  Search,
  Filter,
  ExternalLink,
  Calendar
} from "lucide-react"
import { getReports, type ReportListItem } from "@/lib/api"

/**
 * Status mapping for display and filtering.
 * Maps backend statuses to user-friendly categories.
 */
const STATUS_MAP: Record<string, { label: string; color: string; category: string }> = {
  draft: { label: "Draft", color: "bg-slate-100 text-slate-700", category: "draft" },
  determination_complete: { label: "Determined", color: "bg-blue-100 text-blue-700", category: "draft" },
  awaiting_parties: { label: "Awaiting Parties", color: "bg-amber-100 text-amber-700", category: "awaiting" },
  collecting: { label: "Collecting", color: "bg-amber-100 text-amber-700", category: "awaiting" },
  ready_to_file: { label: "Ready to File", color: "bg-green-100 text-green-700", category: "ready" },
  filed: { label: "Filed", color: "bg-emerald-100 text-emerald-700", category: "filed" },
  exempt: { label: "Exempt", color: "bg-purple-100 text-purple-700", category: "exempt" },
}

function getStatusInfo(status: string, filingStatus?: string | null) {
  // Handle filed_mock as a special case
  if (filingStatus === "filed_mock" || status === "filed") {
    return {
      label: filingStatus === "filed_mock" ? "Filed (Demo)" : "Filed",
      color: "bg-emerald-100 text-emerald-700",
      category: "filed"
    }
  }
  return STATUS_MAP[status] || { label: status, color: "bg-slate-100 text-slate-700", category: "other" }
}

export default function ReportsPage() {
  const [reports, setReports] = useState<ReportListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  const fetchReports = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getReports()
      setReports(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reports")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReports()
  }, [])

  // Filtered reports
  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      // Search filter
      const searchLower = searchQuery.toLowerCase()
      const matchesSearch =
        !searchQuery ||
        report.property_address_text?.toLowerCase().includes(searchLower) ||
        report.id.toLowerCase().includes(searchLower)

      // Status filter
      const info = getStatusInfo(report.status, report.filing_status)
      const matchesStatus = statusFilter === "all" || info.category === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [reports, searchQuery, statusFilter])

  // Sort by updated_at descending
  const sortedReports = useMemo(() => {
    return [...filteredReports].sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    )
  }, [filteredReports])

  // Status counts for filter badges
  const statusCounts = useMemo(() => {
    return reports.reduce((acc, report) => {
      const info = getStatusInfo(report.status, report.filing_status)
      acc[info.category] = (acc[info.category] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }, [reports])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
          <p className="text-slate-500">Manage all your FinCEN reports</p>
        </div>
        <Link href="/app/reports/new">
          <Button className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600">
            <Plus className="mr-2 h-4 w-4" />
            New Report
          </Button>
        </Link>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <Button variant="outline" size="sm" onClick={fetchReports}>
            Retry
          </Button>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <CardTitle>All Reports</CardTitle>
              <CardDescription>
                {filteredReports.length} of {reports.length} reports
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="search"
                  placeholder="Search by address..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-full sm:w-64"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses ({reports.length})</SelectItem>
                  <SelectItem value="draft">Draft ({statusCounts.draft || 0})</SelectItem>
                  <SelectItem value="awaiting">Awaiting Parties ({statusCounts.awaiting || 0})</SelectItem>
                  <SelectItem value="ready">Ready to File ({statusCounts.ready || 0})</SelectItem>
                  <SelectItem value="filed">Filed ({statusCounts.filed || 0})</SelectItem>
                  <SelectItem value="exempt">Exempt ({statusCounts.exempt || 0})</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                variant="outline" 
                size="icon" 
                onClick={fetchReports} 
                disabled={loading}
                className="flex-shrink-0"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading && reports.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : sortedReports.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {searchQuery || statusFilter !== "all" ? "No reports match your filters" : "No reports yet"}
              </h3>
              <p className="text-slate-500 mb-4">
                {searchQuery || statusFilter !== "all"
                  ? "Try adjusting your search or filters"
                  : "Create your first report to get started"}
              </p>
              {!searchQuery && statusFilter === "all" && (
                <Link href="/app/reports/new">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    New Report
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto -mx-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40%]">Property Address</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Closing Date</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedReports.map((report) => {
                    const statusInfo = getStatusInfo(report.status, report.filing_status)
                    return (
                      <TableRow key={report.id} className="group">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-slate-100 rounded-lg group-hover:bg-slate-200 transition-colors">
                              <FileText className="h-4 w-4 text-slate-600" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium truncate">
                                {report.property_address_text || "Untitled Report"}
                              </p>
                              <p className="text-xs text-slate-500 font-mono">
                                {report.id.slice(0, 8)}...
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={statusInfo.color}>
                            {statusInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {report.closing_date ? (
                            <span className="flex items-center gap-1.5 text-slate-600">
                              <Calendar className="h-3.5 w-3.5" />
                              {new Date(report.closing_date).toLocaleDateString()}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-slate-500">
                          {new Date(report.updated_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Link href={`/app/reports/${report.id}/wizard`}>
                            <Button variant="ghost" size="sm">
                              Open
                              <ExternalLink className="ml-1 h-3 w-3" />
                            </Button>
                          </Link>
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
