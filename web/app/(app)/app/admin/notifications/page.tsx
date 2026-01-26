"use client"

import { useState, useMemo } from "react"
import {
  Mail,
  Send,
  Bell,
  FileCheck,
  Search,
  Filter,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Clock,
  User,
  FileText,
  AlertTriangle,
  Loader2,
  Inbox,
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000"

interface NotificationEvent {
  id: string
  created_at: string
  report_id: string | null
  party_id: string | null
  party_token: string | null
  type: string
  to_email: string | null
  subject: string | null
  body_preview: string | null
  meta: Record<string, unknown>
}

const TYPE_CONFIG: Record<string, { label: string; color: string; icon: typeof Mail }> = {
  party_invite: {
    label: "Party Invite",
    color: "bg-blue-100 text-blue-700",
    icon: Send,
  },
  party_submitted: {
    label: "Party Submitted",
    color: "bg-green-100 text-green-700",
    icon: FileCheck,
  },
  internal_alert: {
    label: "Internal Alert",
    color: "bg-amber-100 text-amber-700",
    icon: Bell,
  },
  filing_receipt: {
    label: "Filing Receipt",
    color: "bg-purple-100 text-purple-700",
    icon: FileText,
  },
}

function getTypeConfig(type: string) {
  return TYPE_CONFIG[type] || { label: type, color: "bg-slate-100 text-slate-700", icon: Mail }
}

export default function AdminNotificationsPage() {
  const [secret, setSecret] = useState("")
  const [notifications, setNotifications] = useState<NotificationEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const fetchNotifications = async () => {
    if (!secret.trim()) {
      setError("Please enter the demo secret")
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`${API_BASE_URL}/demo/notifications?limit=100`, {
        headers: {
          "X-DEMO-SECRET": secret,
        },
      })

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Invalid secret or endpoint not available")
        }
        throw new Error("Failed to fetch notifications")
      }

      const data = await response.json()
      setNotifications(data.items)
      setLoaded(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch notifications")
    } finally {
      setLoading(false)
    }
  }

  // Filtered notifications
  const filteredNotifications = useMemo(() => {
    if (typeFilter === "all") return notifications
    return notifications.filter((n) => n.type === typeFilter)
  }, [notifications, typeFilter])

  // Type counts
  const typeCounts = useMemo(() => {
    return notifications.reduce((acc, n) => {
      acc[n.type] = (acc[n.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }, [notifications])

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedRows(newExpanded)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Notification Outbox</h1>
        <p className="text-slate-500">Demo outbox — no actual emails are sent</p>
      </div>

      {/* Demo Notice */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <p className="text-sm text-amber-700 flex items-center gap-2">
          <span className="text-lg">📧</span>
          <span>
            <strong>Demo Outbox</strong> — This shows what notifications WOULD be sent in production.
            No actual emails are delivered.
          </span>
        </p>
      </div>

      {/* Secret Input */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Load Notifications</CardTitle>
          <CardDescription>Enter your demo secret to view the outbox</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              type="password"
              placeholder="Enter X-DEMO-SECRET..."
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              className="font-mono max-w-xs"
              onKeyDown={(e) => e.key === "Enter" && fetchNotifications()}
            />
            <Button onClick={fetchNotifications} disabled={loading || !secret.trim()}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              {loaded ? "Refresh" : "Load"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
          <Button variant="ghost" size="sm" onClick={() => setError(null)} className="ml-auto">
            Dismiss
          </Button>
        </div>
      )}

      {loaded && (
        <>
          {/* Stats */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-slate-100 rounded-xl">
                    <Inbox className="h-6 w-6 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Total Events</p>
                    <p className="text-2xl font-bold">{notifications.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 rounded-xl">
                    <Send className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Party Invites</p>
                    <p className="text-2xl font-bold">{typeCounts.party_invite || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-100 rounded-xl">
                    <FileCheck className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Submissions</p>
                    <p className="text-2xl font-bold">{typeCounts.party_submitted || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-100 rounded-xl">
                    <FileText className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Filing Receipts</p>
                    <p className="text-2xl font-bold">{typeCounts.filing_receipt || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={typeFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setTypeFilter("all")}
            >
              All ({notifications.length})
            </Button>
            {Object.entries(TYPE_CONFIG).map(([type, config]) => {
              const count = typeCounts[type] || 0
              return (
                <Button
                  key={type}
                  variant={typeFilter === type ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTypeFilter(type)}
                  className={typeFilter === type ? "" : config.color}
                >
                  <config.icon className="h-3.5 w-3.5 mr-1" />
                  {config.label} ({count})
                </Button>
              )
            })}
          </div>

          {/* Notifications Table */}
          <Card>
            <CardHeader>
              <CardTitle>Events</CardTitle>
              <CardDescription>
                {filteredNotifications.length} notification events
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredNotifications.length === 0 ? (
                <div className="text-center py-12">
                  <Inbox className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-500">No notifications yet</p>
                  <p className="text-sm text-slate-400">
                    Create party links or submit party data to see events here
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10"></TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>To</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Report</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredNotifications.map((notif) => {
                        const config = getTypeConfig(notif.type)
                        const isExpanded = expandedRows.has(notif.id)
                        return (
                          <Collapsible key={notif.id} asChild open={isExpanded}>
                            <>
                              <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => toggleRow(notif.id)}>
                                <TableCell>
                                  <CollapsibleTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-6 w-6">
                                      {isExpanded ? (
                                        <ChevronDown className="h-4 w-4" />
                                      ) : (
                                        <ChevronRight className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </CollapsibleTrigger>
                                </TableCell>
                                <TableCell className="whitespace-nowrap">
                                  <span className="flex items-center gap-1.5 text-slate-600">
                                    <Clock className="h-3.5 w-3.5" />
                                    {new Date(notif.created_at).toLocaleString()}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="secondary" className={config.color}>
                                    <config.icon className="h-3 w-3 mr-1" />
                                    {config.label}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {notif.to_email ? (
                                    <span className="flex items-center gap-1.5">
                                      <User className="h-3.5 w-3.5 text-slate-400" />
                                      {notif.to_email}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400">—</span>
                                  )}
                                </TableCell>
                                <TableCell className="max-w-xs truncate">
                                  {notif.subject || "—"}
                                </TableCell>
                                <TableCell>
                                  {notif.report_id ? (
                                    <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">
                                      {notif.report_id.slice(0, 8)}...
                                    </code>
                                  ) : (
                                    <span className="text-slate-400">—</span>
                                  )}
                                </TableCell>
                              </TableRow>
                              <CollapsibleContent asChild>
                                <TableRow className="bg-slate-50">
                                  <TableCell colSpan={6} className="p-4">
                                    <div className="space-y-3">
                                      {notif.body_preview && (
                                        <div>
                                          <p className="text-xs font-medium text-slate-500 uppercase mb-1">
                                            Preview
                                          </p>
                                          <p className="text-sm text-slate-700 bg-white p-3 rounded border">
                                            {notif.body_preview}
                                          </p>
                                        </div>
                                      )}
                                      {notif.meta && Object.keys(notif.meta).length > 0 && (
                                        <div>
                                          <p className="text-xs font-medium text-slate-500 uppercase mb-1">
                                            Metadata
                                          </p>
                                          <pre className="text-xs text-slate-600 bg-white p-3 rounded border overflow-x-auto">
                                            {JSON.stringify(notif.meta, null, 2)}
                                          </pre>
                                        </div>
                                      )}
                                      <div className="flex gap-4 text-xs text-slate-500">
                                        <span>ID: {notif.id}</span>
                                        {notif.party_id && <span>Party: {notif.party_id.slice(0, 8)}...</span>}
                                        {notif.party_token && <span>Token: {notif.party_token.slice(0, 8)}...</span>}
                                      </div>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              </CollapsibleContent>
                            </>
                          </Collapsible>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
