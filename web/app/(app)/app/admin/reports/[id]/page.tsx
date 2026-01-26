"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Users,
  FileText,
  RefreshCw,
  RotateCcw,
  Calendar,
  Send,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  getAdminReportDetail,
  retryFiling,
  fileReport,
  setFilingOutcome,
  type AdminReportDetail,
} from "@/lib/api"

const isStaging = process.env.NEXT_PUBLIC_ENV_LABEL === "STAGING"

const FILING_STATUS_MAP: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  not_started: { label: "Not Started", color: "bg-slate-100 text-slate-600", icon: Clock },
  queued: { label: "Queued", color: "bg-blue-100 text-blue-700", icon: Clock },
  submitted: { label: "Submitted", color: "bg-blue-100 text-blue-700", icon: Send },
  accepted: { label: "Accepted", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-700", icon: XCircle },
  needs_review: { label: "Needs Review", color: "bg-amber-100 text-amber-700", icon: AlertCircle },
}

const REJECTION_CODES = [
  { value: "MISSING_FIELD", label: "Missing Field" },
  { value: "BAD_FORMAT", label: "Bad Format" },
  { value: "INVALID_DATA", label: "Invalid Data" },
  { value: "DUPLICATE_REPORT", label: "Duplicate Report" },
  { value: "SYSTEM_ERROR", label: "System Error" },
]

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—"
  return new Date(dateStr).toLocaleDateString()
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return "—"
  return new Date(dateStr).toLocaleString()
}

export default function AdminReportDetailPage() {
  const params = useParams()
  const router = useRouter()
  const reportId = params.id as string

  const [data, setData] = useState<AdminReportDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  
  // Demo controls state
  const [demoSecret, setDemoSecret] = useState("")
  const [selectedOutcome, setSelectedOutcome] = useState<string>("accept")
  const [rejectionCode, setRejectionCode] = useState("MISSING_FIELD")
  const [rejectionMessage, setRejectionMessage] = useState("")
  const [outcomeStatus, setOutcomeStatus] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await getAdminReportDetail(reportId)
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load report")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    // Load demo secret from localStorage
    const savedSecret = localStorage.getItem("demo_secret")
    if (savedSecret) setDemoSecret(savedSecret)
  }, [reportId])

  const handleRetry = async () => {
    try {
      setActionLoading(true)
      await retryFiling(reportId)
      await fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to retry")
    } finally {
      setActionLoading(false)
    }
  }

  const handleFile = async () => {
    try {
      setActionLoading(true)
      setError(null)
      await fileReport(reportId)
      await fetchData()
    } catch (err: any) {
      // Filing rejection comes as an error
      if (err.status === 400 && err.detail?.status === "rejected") {
        setError(`Filing rejected: ${err.detail.rejection_code} - ${err.detail.rejection_message}`)
      } else {
        setError(err instanceof Error ? err.message : "Filing failed")
      }
      await fetchData()
    } finally {
      setActionLoading(false)
    }
  }

  const handleSetOutcome = async () => {
    if (!demoSecret) {
      setOutcomeStatus("Please enter the demo secret")
      return
    }

    try {
      setActionLoading(true)
      setOutcomeStatus(null)
      localStorage.setItem("demo_secret", demoSecret)
      
      await setFilingOutcome(
        reportId,
        {
          outcome: selectedOutcome as "accept" | "reject" | "needs_review",
          code: selectedOutcome === "reject" ? rejectionCode : undefined,
          message: selectedOutcome === "reject" ? rejectionMessage : undefined,
        },
        demoSecret
      )
      
      setOutcomeStatus("Outcome set successfully!")
      await fetchData()
    } catch (err: any) {
      if (err.status === 404) {
        setOutcomeStatus("Invalid demo secret or not in staging")
      } else {
        setOutcomeStatus(err instanceof Error ? err.message : "Failed to set outcome")
      }
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Failed to load report</h2>
        <p className="text-muted-foreground mb-4">{error}</p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.back()}>Go Back</Button>
          <Button onClick={fetchData}>Retry</Button>
        </div>
      </div>
    )
  }

  if (!data) return null

  const { report, parties, submission, audit_log } = data
  const submissionStatus = submission?.status || "not_started"
  const filingInfo = FILING_STATUS_MAP[submissionStatus] || FILING_STATUS_MAP.not_started
  const FilingIcon = filingInfo.icon
  const canRetry = submissionStatus === "rejected" || submissionStatus === "needs_review"
  const canFile = report.status === "ready_to_file" && submissionStatus !== "accepted"
  const isReportable = report.determination?.final_result === "reportable"

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/app/admin/reports">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900 truncate">
            {report.property_address_text || "Untitled Report"}
          </h1>
          <p className="text-slate-500 font-mono text-sm">{report.id}</p>
        </div>
        <Button variant="outline" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <Button variant="ghost" size="sm" onClick={() => setError(null)}>Dismiss</Button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-slate-100 rounded-xl">
                <FileText className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase">Determination</p>
                <Badge className={isReportable ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}>
                  {isReportable ? "Reportable" : report.determination ? "Exempt" : "Pending"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-100 rounded-xl">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase">Parties</p>
                <p className="text-lg font-bold">
                  {parties.filter(p => p.status === "submitted").length}/{parties.length}
                  <span className="text-sm font-normal text-slate-500 ml-1">submitted</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${filingInfo.color.replace("text-", "bg-").split(" ")[0]}`}>
                <FilingIcon className={`h-5 w-5 ${filingInfo.color.split(" ")[1]}`} />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase">Filing Status</p>
                <Badge className={filingInfo.color}>{filingInfo.label}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-purple-100 rounded-xl">
                <Calendar className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase">Closing Date</p>
                <p className="font-medium">{formatDate(report.closing_date)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Submission Details */}
        <Card>
          <CardHeader>
            <CardTitle>Filing Submission</CardTitle>
            <CardDescription>Current filing status and details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {submission ? (
              <>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500">Status</p>
                    <Badge className={filingInfo.color}>{filingInfo.label}</Badge>
                  </div>
                  <div>
                    <p className="text-slate-500">Attempts</p>
                    <p className="font-medium">{submission.attempts}</p>
                  </div>
                  {submission.receipt_id && (
                    <div className="col-span-2">
                      <p className="text-slate-500">Receipt ID</p>
                      <p className="font-mono font-medium">{submission.receipt_id}</p>
                    </div>
                  )}
                  {submission.rejection_code && (
                    <>
                      <div>
                        <p className="text-slate-500">Rejection Code</p>
                        <p className="font-medium text-red-600">{submission.rejection_code}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Rejection Message</p>
                        <p className="text-red-600">{submission.rejection_message}</p>
                      </div>
                    </>
                  )}
                  <div>
                    <p className="text-slate-500">Created</p>
                    <p>{formatDateTime(submission.created_at)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Updated</p>
                    <p>{formatDateTime(submission.updated_at)}</p>
                  </div>
                </div>
                <Separator />
                <div className="flex gap-2">
                  {canFile && (
                    <Button onClick={handleFile} disabled={actionLoading}>
                      {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                      File (Demo)
                    </Button>
                  )}
                  {canRetry && (
                    <Button variant="outline" onClick={handleRetry} disabled={actionLoading}>
                      {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RotateCcw className="h-4 w-4 mr-2" />}
                      Retry Filing
                    </Button>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-4 text-slate-500">
                <p>No submission yet</p>
                {canFile && (
                  <Button className="mt-4" onClick={handleFile} disabled={actionLoading}>
                    {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    File Report (Demo)
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Parties */}
        <Card>
          <CardHeader>
            <CardTitle>Parties</CardTitle>
            <CardDescription>{parties.length} parties on this report</CardDescription>
          </CardHeader>
          <CardContent>
            {parties.length === 0 ? (
              <p className="text-slate-500 text-center py-4">No parties added yet</p>
            ) : (
              <div className="space-y-3">
                {parties.map((party) => (
                  <div key={party.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <p className="font-medium">{party.display_name || party.party_role}</p>
                      <p className="text-xs text-slate-500 capitalize">{party.party_role} • {party.entity_type}</p>
                    </div>
                    <Badge variant="secondary" className={
                      party.status === "submitted" 
                        ? "bg-emerald-100 text-emerald-700" 
                        : "bg-amber-100 text-amber-700"
                    }>
                      {party.status === "submitted" ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <Clock className="h-3 w-3 mr-1" />}
                      {party.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Demo Controls - only in staging */}
      {isStaging && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Demo Controls
            </CardTitle>
            <CardDescription>
              Set the filing outcome before filing to simulate different scenarios
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Demo Secret (X-DEMO-SECRET)</Label>
                <Input
                  type="password"
                  placeholder="Enter demo secret..."
                  value={demoSecret}
                  onChange={(e) => setDemoSecret(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Filing Outcome</Label>
                <Select value={selectedOutcome} onValueChange={setSelectedOutcome}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="accept">Accept (Success)</SelectItem>
                    <SelectItem value="reject">Reject (Error)</SelectItem>
                    <SelectItem value="needs_review">Needs Review</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {selectedOutcome === "reject" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Rejection Code</Label>
                  <Select value={rejectionCode} onValueChange={setRejectionCode}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {REJECTION_CODES.map((code) => (
                        <SelectItem key={code.value} value={code.value}>
                          {code.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Rejection Message</Label>
                  <Input
                    placeholder="Enter rejection message..."
                    value={rejectionMessage}
                    onChange={(e) => setRejectionMessage(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="flex items-center gap-4">
              <Button onClick={handleSetOutcome} disabled={actionLoading || !demoSecret}>
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Set Demo Outcome
              </Button>
              {outcomeStatus && (
                <span className={outcomeStatus.includes("success") ? "text-green-600" : "text-amber-600"}>
                  {outcomeStatus}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Audit Log */}
      <Card>
        <CardHeader>
          <CardTitle>Submission Timeline</CardTitle>
          <CardDescription>Activity log for this report</CardDescription>
        </CardHeader>
        <CardContent>
          {audit_log.length === 0 ? (
            <p className="text-slate-500 text-center py-4">No activity recorded yet</p>
          ) : (
            <div className="space-y-4">
              {audit_log.map((entry, idx) => (
                <div key={entry.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 bg-slate-300 rounded-full" />
                    {idx < audit_log.length - 1 && (
                      <div className="w-0.5 flex-1 bg-slate-200 mt-1" />
                    )}
                  </div>
                  <div className="flex-1 pb-4">
                    <p className="font-medium text-sm">{entry.action.replace(/[._]/g, " ")}</p>
                    <p className="text-xs text-slate-500">{formatDateTime(entry.created_at)}</p>
                    {Object.keys(entry.details).length > 0 && (
                      <pre className="mt-1 text-xs bg-slate-100 p-2 rounded overflow-x-auto">
                        {JSON.stringify(entry.details, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
