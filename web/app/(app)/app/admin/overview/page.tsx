"use client"

import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import {
  FileText,
  Users,
  CheckCircle2,
  Send,
  TrendingUp,
  Clock,
  AlertTriangle,
  Loader2,
  ArrowRight,
  XCircle,
  AlertCircle,
  RefreshCw,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { 
  getAdminStats, 
  getAdminFilings, 
  getAdminActivity,
  type AdminStats,
  type AdminFilingItem,
  type AdminActivityItem,
} from "@/lib/api"

const FILING_STATUS_STYLES: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  not_started: { label: "Not Started", color: "bg-slate-100 text-slate-700", icon: Clock },
  queued: { label: "Queued", color: "bg-blue-100 text-blue-700", icon: Clock },
  submitted: { label: "Submitted", color: "bg-blue-100 text-blue-700", icon: Send },
  accepted: { label: "Accepted", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-700", icon: XCircle },
  needs_review: { label: "Needs Review", color: "bg-amber-100 text-amber-700", icon: AlertCircle },
}

function getFilingStatusInfo(status: string) {
  return FILING_STATUS_STYLES[status] || FILING_STATUS_STYLES.not_started
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
  return `${diffDays}d ago`
}

const ACTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "report.created": FileText,
  "report.determined": TrendingUp,
  "report.filed": Send,
  "party_links.created": Users,
  "party.submitted": CheckCircle2,
  "filing_queued": Clock,
  "filing_submitted": Send,
  "filing_accepted": CheckCircle2,
  "filing_rejected": XCircle,
  "filing_needs_review": AlertCircle,
  "filing_retry": RefreshCw,
  "demo_outcome_set": AlertTriangle,
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [filings, setFilings] = useState<AdminFilingItem[]>([])
  const [activity, setActivity] = useState<AdminActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      const [statsData, filingsData, activityData] = await Promise.all([
        getAdminStats(),
        getAdminFilings({ limit: 10 }),
        getAdminActivity(10),
      ])
      setStats(statsData)
      setFilings(filingsData.items)
      setActivity(activityData.items)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

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
        <h2 className="text-xl font-semibold mb-2">Failed to load admin dashboard</h2>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={fetchData}>Retry</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Admin Overview</h1>
          <p className="text-slate-500">Monitor compliance activity and filing status</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-slate-100 rounded-xl">
                <FileText className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Reports</p>
                <p className="text-xl font-bold">{stats?.total_reports || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-100 rounded-xl">
                <Users className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Pending Parties</p>
                <p className="text-xl font-bold">{stats?.pending_parties || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-green-100 rounded-xl">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Ready to File</p>
                <p className="text-xl font-bold">{stats?.ready_to_file || 0}</p>
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
                <p className="text-xs text-slate-500 uppercase tracking-wide">Accepted</p>
                <p className="text-xl font-bold">{stats?.filings_accepted || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-red-100 rounded-xl">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Rejected</p>
                <p className="text-xl font-bold">{stats?.filings_rejected || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-100 rounded-xl">
                <AlertCircle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Needs Review</p>
                <p className="text-xl font-bold">{stats?.filings_needs_review || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Filing Queue */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle>Filing Queue</CardTitle>
              <CardDescription>Recent submission activity</CardDescription>
            </div>
            <Link href="/app/admin/filings">
              <Button variant="ghost" size="sm">
                View All
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {filings.length === 0 ? (
              <p className="text-slate-500 text-center py-8">No filing submissions yet</p>
            ) : (
              <div className="overflow-x-auto -mx-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Property</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Attempts</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filings.slice(0, 5).map((filing) => {
                      const statusInfo = getFilingStatusInfo(filing.status)
                      const StatusIcon = statusInfo.icon
                      return (
                        <TableRow key={filing.id}>
                          <TableCell className="font-medium max-w-[200px] truncate">
                            {filing.property_address || "—"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={statusInfo.color}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {statusInfo.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">{filing.attempts}</TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest actions across the platform</CardDescription>
          </CardHeader>
          <CardContent>
            {activity.length === 0 ? (
              <p className="text-slate-500 text-center py-8">No recent activity</p>
            ) : (
              <div className="space-y-4">
                {activity.map((item) => {
                  const Icon = ACTION_ICONS[item.action] || FileText
                  return (
                    <div key={item.id} className="flex items-start gap-3">
                      <div className="p-2 bg-slate-100 rounded-lg">
                        <Icon className="h-4 w-4 text-slate-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{item.action.replace(/[._]/g, " ")}</p>
                        {item.report?.property_address && (
                          <p className="text-xs text-slate-500 truncate">
                            {item.report.property_address}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-slate-400 whitespace-nowrap">
                        {formatTimeAgo(item.created_at)}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Link href="/app/admin/reports">
            <Button variant="outline">
              View All Reports
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link href="/app/admin/filings">
            <Button variant="outline">
              Filing Queue
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link href="/app/reports/new">
            <Button>
              Create New Report
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
