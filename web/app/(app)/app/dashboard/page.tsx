"use client"

import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  FileText,
  Users,
  CheckCircle2,
  Send,
  Clock,
  ArrowRight,
  Loader2,
  AlertTriangle,
  Plus,
  Search,
  Filter,
  ExternalLink,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
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

function getStatusInfo(status: string) {
  return STATUS_MAP[status] || { label: status, color: "bg-slate-100 text-slate-700", category: "other" }
}

interface DashboardStats {
  total: number
  awaitingParties: number
  readyToFile: number
  filed: number
}

function computeStats(reports: ReportListItem[]): DashboardStats {
  return reports.reduce(
    (acc, report) => {
      acc.total++
      const info = getStatusInfo(report.status)
      if (info.category === "awaiting") acc.awaitingParties++
      if (info.category === "ready") acc.readyToFile++
      if (info.category === "filed") acc.filed++
      return acc
    },
    { total: 0, awaitingParties: 0, readyToFile: 0, filed: 0 }
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const [reports, setReports] = useState<ReportListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  useEffect(() => {
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
    fetchReports()
  }, [])

  const stats = useMemo(() => computeStats(reports), [reports])

  // Find most recent draft for "Continue Draft" card
  const recentDraft = useMemo(() => {
    return reports
      .filter((r) => r.status === "draft" || r.status === "determination_complete")
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0]
  }, [reports])

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
      const info = getStatusInfo(report.status)
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Failed to load dashboard</h2>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500">Overview of your FinCEN reporting activity</p>
        </div>
        <Link href="/app/reports/new">
          <Button className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600">
            <Plus className="mr-2 h-4 w-4" />
            New Report
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-slate-100 rounded-xl">
                <FileText className="h-6 w-6 text-slate-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Reports</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-100 rounded-xl">
                <Users className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Awaiting Parties</p>
                <p className="text-2xl font-bold">{stats.awaitingParties}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-xl">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Ready to File</p>
                <p className="text-2xl font-bold">{stats.readyToFile}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-100 rounded-xl">
                <Send className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Filed</p>
                <p className="text-2xl font-bold">{stats.filed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Continue Draft Card */}
      {recentDraft && (
        <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-cyan-50">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-white rounded-xl shadow-sm">
                  <Clock className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-600 mb-1">Continue where you left off</p>
                  <p className="font-semibold text-slate-900">
                    {recentDraft.property_address_text || "Untitled Report"}
                  </p>
                  <p className="text-sm text-slate-500">
                    Last updated {new Date(recentDraft.updated_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <Link href={`/app/reports/${recentDraft.id}/wizard`}>
                <Button>
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Reports */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Recent Reports</CardTitle>
              <CardDescription>All your FinCEN reports</CardDescription>
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
                <SelectTrigger className="w-full sm:w-40">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="awaiting">Awaiting Parties</SelectItem>
                  <SelectItem value="ready">Ready to File</SelectItem>
                  <SelectItem value="filed">Filed</SelectItem>
                  <SelectItem value="exempt">Exempt</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {sortedReports.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">
                {searchQuery || statusFilter !== "all"
                  ? "No reports match your filters"
                  : "No reports yet. Create your first report!"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Property Address</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Closing Date</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedReports.slice(0, 10).map((report) => {
                    const statusInfo = getStatusInfo(report.status)
                    return (
                      <TableRow key={report.id}>
                        <TableCell className="font-medium max-w-xs truncate">
                          {report.property_address_text || "Untitled Report"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={statusInfo.color}>
                            {statusInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {report.closing_date
                            ? new Date(report.closing_date).toLocaleDateString()
                            : "—"}
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

          {sortedReports.length > 10 && (
            <div className="text-center pt-4 border-t mt-4">
              <Link href="/app/reports">
                <Button variant="outline">
                  View all {sortedReports.length} reports
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
