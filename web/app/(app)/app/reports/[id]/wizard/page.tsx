"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { RRERQuestionnaire, type RRERQuestionnaireProps } from "@/components/rrer-questionnaire"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ReceiptId } from "@/components/ui/ReceiptId"
import { 
  Loader2, 
  AlertTriangle, 
  ArrowLeft, 
  Check, 
  Copy, 
  ExternalLink,
  Users,
  ClipboardCheck,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  FileCheck,
  FileText,
  Building2,
  Landmark,
  DollarSign,
} from "lucide-react"
import { 
  PartyTypeBadge, 
  PartyStatusBadge, 
  PartyCompletionProgress 
} from "@/components/party"
import {
  getReport,
  saveWizard,
  determine,
  createPartyLinks,
  readyCheck,
  fileReport,
  getReportParties,
  type Report,
  type DeterminationResult,
  type PartyLink,
  type ReadyCheckResult,
  type FileResult,
  type ReportPartiesResponse,
  type PartyStatusItem,
} from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { Progress } from "@/components/ui/progress"

const AUTOSAVE_DELAY = 1500

export default function WizardPage() {
  const params = useParams()
  const router = useRouter()
  const reportId = params.id as string

  // Report state
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Save state
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastDataRef = useRef<string>("")

  // Action states
  const [determining, setDetermining] = useState(false)
  const [backendDetermination, setBackendDetermination] = useState<DeterminationResult | null>(null)
  const [generatingLinks, setGeneratingLinks] = useState(false)
  const [partyLinks, setPartyLinks] = useState<PartyLink[]>([])
  const [checkingReady, setCheckingReady] = useState(false)
  const [readyResult, setReadyResult] = useState<ReadyCheckResult | null>(null)
  const [filing, setFiling] = useState(false)
  const [fileResult, setFileResult] = useState<FileResult | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  
  // Party status tracking (real-time)
  const [partyStatus, setPartyStatus] = useState<ReportPartiesResponse | null>(null)
  const [partyStatusLoading, setPartyStatusLoading] = useState(false)
  const [lastPartyUpdate, setLastPartyUpdate] = useState<Date | null>(null)
  const { toast } = useToast()

  // Load report
  useEffect(() => {
    const loadReport = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await getReport(reportId)
        setReport(data)
        if (data.determination) {
          setBackendDetermination(data.determination)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load report")
      } finally {
        setLoading(false)
      }
    }
    loadReport()
  }, [reportId])

  // Fetch party status
  const fetchPartyStatus = useCallback(async (showToast = false) => {
    try {
      setPartyStatusLoading(true)
      const data = await getReportParties(reportId)
      
      // Check if any new submissions since last check
      if (partyStatus && showToast) {
        const prevSubmitted = partyStatus.summary.submitted
        const newSubmitted = data.summary.submitted
        if (newSubmitted > prevSubmitted) {
          toast({
            title: "Party Submitted! 🎉",
            description: `${newSubmitted} of ${data.summary.total} parties have submitted their information.`,
          })
        }
        if (data.summary.all_complete && !partyStatus.summary.all_complete) {
          toast({
            title: "All Parties Complete! ✅",
            description: "You can now proceed to file the report.",
            variant: "default",
          })
        }
      }
      
      setPartyStatus(data)
      setLastPartyUpdate(new Date())
    } catch (err) {
      console.error("Failed to fetch party status:", err)
    } finally {
      setPartyStatusLoading(false)
    }
  }, [reportId, partyStatus, toast])

  // Poll for party status when in collecting mode
  useEffect(() => {
    // Only poll if report is in collecting status
    if (report?.status === "collecting") {
      // Initial fetch
      fetchPartyStatus(false)
      
      // Poll every 15 seconds
      const interval = setInterval(() => fetchPartyStatus(true), 15000)
      return () => clearInterval(interval)
    }
  }, [report?.status, fetchPartyStatus])

  // Debounced save function
  const performSave = useCallback(async (wizardData: Record<string, unknown>, wizardStep: number) => {
    const dataString = JSON.stringify(wizardData)
    if (dataString === lastDataRef.current) return
    lastDataRef.current = dataString

    try {
      setSaveStatus("saving")
      await saveWizard(reportId, wizardStep, wizardData)
      setSaveStatus("saved")
      setTimeout(() => setSaveStatus("idle"), 2000)
    } catch (err) {
      console.error("Autosave failed:", err)
      setSaveStatus("error")
    }
  }, [reportId])

  // Handle questionnaire data changes
  const handleQuestionnaireChange: RRERQuestionnaireProps["onChange"] = useCallback((data) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    // Map phase to wizard step
    const wizardStep = data.phase === "determination" ? 1 : data.phase === "collection" ? 2 : 3

    saveTimeoutRef.current = setTimeout(() => {
      performSave({
        phase: data.phase,
        determinationStep: data.determinationStep,
        collectionStep: data.collectionStep,
        determination: data.determination,
        collection: data.collection,
      }, wizardStep)
    }, AUTOSAVE_DELAY)
  }, [performSave])

  // Cleanup timeout
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  // Handle determine
  const handleDetermine = async () => {
    try {
      setDetermining(true)
      setError(null)
      const result = await determine(reportId)
      setBackendDetermination(result)
      const updatedReport = await getReport(reportId)
      setReport(updatedReport)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Determination failed")
    } finally {
      setDetermining(false)
    }
  }

  // Handle party links
  const handleGenerateLinks = async () => {
    try {
      setGeneratingLinks(true)
      setError(null)
      const result = await createPartyLinks(reportId)
      setPartyLinks(result.links)
      const updatedReport = await getReport(reportId)
      setReport(updatedReport)
      // Fetch party status after generating links
      await fetchPartyStatus(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate links")
    } finally {
      setGeneratingLinks(false)
    }
  }

  // Handle ready check
  const handleReadyCheck = async () => {
    try {
      setCheckingReady(true)
      setError(null)
      const result = await readyCheck(reportId)
      setReadyResult(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ready check failed")
    } finally {
      setCheckingReady(false)
    }
  }

  // Handle filing
  const handleFile = async () => {
    try {
      setFiling(true)
      setError(null)
      const result = await fileReport(reportId)
      setFileResult(result)
      const updatedReport = await getReport(reportId)
      setReport(updatedReport)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Filing failed")
    } finally {
      setFiling(false)
    }
  }

  // Copy to clipboard with feedback
  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error && !report) {
    return (
      <div className="container mx-auto py-16 px-4 max-w-md text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2">Failed to load report</h2>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Link href="/app/reports">
          <Button>Back to Reports</Button>
        </Link>
      </div>
    )
  }

  // Parse initial data from report
  const wizardData = report?.wizard_data as Record<string, unknown> | undefined
  const initialData: RRERQuestionnaireProps["initialData"] = wizardData ? {
    phase: wizardData.phase as "determination" | "collection" | "summary" | undefined,
    determinationStep: wizardData.determinationStep as string | undefined,
    collectionStep: wizardData.collectionStep as string | undefined,
    determination: wizardData.determination as Record<string, unknown> | undefined,
    collection: wizardData.collection as Record<string, unknown> | undefined,
  } : undefined

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/20 via-background to-background">
      {/* Header Bar - Premium */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/app/admin/reports">
              <Button variant="ghost" size="icon" className="hover:bg-muted">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="font-semibold text-lg">
                {report?.property_address_text || "New Report"}
              </h1>
              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
                {/* Escrow Number from submission */}
                {report?.escrow_number && (
                  <span className="font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-xs">
                    {report.escrow_number}
                  </span>
                )}
                <Badge 
                  variant={report?.filing_status === "filed_mock" ? "default" : "secondary"}
                  className={report?.filing_status === "filed_mock" 
                    ? "bg-green-100 text-green-800 border-green-200" 
                    : "bg-muted"
                  }
                >
                  {report?.filing_status === "filed_mock" ? "Filed (Demo)" : report?.status.replace(/_/g, " ")}
                </Badge>
                {saveStatus === "saving" && (
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span className="text-xs">Saving...</span>
                  </span>
                )}
                {saveStatus === "saved" && (
                  <span className="flex items-center gap-1.5 text-green-600">
                    <Check className="h-3.5 w-3.5" />
                    <span className="text-xs">Saved</span>
                  </span>
                )}
                {saveStatus === "error" && (
                  <span className="flex items-center gap-1.5 text-destructive">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span className="text-xs">Save failed</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-2 p-4 bg-destructive/10 text-destructive rounded-lg">
            <AlertTriangle className="h-5 w-5" />
            <span>{error}</span>
            <Button variant="ghost" size="sm" onClick={() => setError(null)} className="ml-auto">
              Dismiss
            </Button>
          </div>
        </div>
      )}

      {/* Client Notes from Submission */}
      {initialData?.collection?.clientNotes && (
        <div className="container mx-auto px-4 py-4">
          <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-800 dark:text-amber-300 text-sm mb-1">
                  Client Notes
                </h4>
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  {initialData.collection.clientNotes as string}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Questionnaire */}
      <RRERQuestionnaire 
        initialData={initialData}
        onChange={handleQuestionnaireChange}
        saveStatus={saveStatus}
        reportId={reportId}
        partyStatus={partyStatus}
        onRefreshPartyStatus={() => fetchPartyStatus(true)}
        onSendPartyLinks={async (parties) => {
          setGeneratingLinks(true)
          try {
            const result = await createPartyLinks(reportId, parties)
            setPartyLinks(result.links)
            // Also refresh report to update status
            const updatedReport = await getReport(reportId)
            setReport(updatedReport)
          } finally {
            setGeneratingLinks(false)
          }
        }}
        onReadyCheck={async () => {
          setCheckingReady(true)
          try {
            const result = await readyCheck(reportId)
            setReadyResult(result)
            return { 
              ready: result.ready, 
              errors: result.missing.map(m => m.message) 
            }
          } finally {
            setCheckingReady(false)
          }
        }}
        onFileReport={async () => {
          setFiling(true)
          try {
            const result = await fileReport(reportId)
            setFileResult(result)
            // Refresh report to get updated status
            const updatedReport = await getReport(reportId)
            setReport(updatedReport)
            return {
              success: result.ok && result.status === "accepted",
              receipt_id: result.receipt_id,
              error: result.rejection_message || result.message,
            }
          } finally {
            setFiling(false)
          }
        }}
      />

      {/* Action Buttons Section */}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Section Divider */}
        <div className="relative my-10">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-muted" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-background px-4 text-sm text-muted-foreground flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4" />
              Backend Actions
            </span>
          </div>
        </div>
        
        <div className="space-y-6">
          {/* Determine */}
          <Card className="border-0 shadow-lg shadow-black/5 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-blue-400 to-blue-500" />
            <CardHeader className="relative">
              <CardTitle className="flex items-center gap-3 text-base">
                <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                  <ClipboardCheck className="h-5 w-5" />
                </div>
                Run Determination
              </CardTitle>
              <CardDescription>
                Submit wizard data to backend for official determination
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleDetermine} disabled={determining} className="shadow-md">
                {determining ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Determine
              </Button>
              {backendDetermination && (
                <div className={`mt-4 p-5 rounded-xl border-2 ${
                  backendDetermination.reportable 
                    ? "bg-gradient-to-br from-amber-50 to-orange-50 border-amber-300" 
                    : "bg-gradient-to-br from-green-50 to-emerald-50 border-green-300"
                }`}>
                  <p className={`font-semibold text-lg ${
                    backendDetermination.reportable ? "text-amber-900" : "text-green-900"
                  }`}>
                    {backendDetermination.reportable ? "Reportable" : "Exempt"}
                  </p>
                  <p className={`text-sm mt-1 ${
                    backendDetermination.reportable ? "text-amber-800" : "text-green-800"
                  }`}>
                    {backendDetermination.reason_text}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Party Links & Status */}
          {backendDetermination?.reportable && (
            <Card className="border-0 shadow-lg shadow-black/5 overflow-hidden">
              <div className={`absolute top-0 left-0 right-0 h-1 ${
                partyStatus?.summary.all_complete 
                  ? "bg-gradient-to-r from-green-500 via-green-400 to-green-500" 
                  : "bg-gradient-to-r from-purple-500 via-purple-400 to-purple-500"
              }`} />
              <CardHeader className="relative">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-3 text-base">
                      <div className={`p-2 rounded-lg ${
                        partyStatus?.summary.all_complete 
                          ? "bg-green-100 text-green-600" 
                          : "bg-purple-100 text-purple-600"
                      }`}>
                        <Users className="h-5 w-5" />
                      </div>
                      Party Collection Status
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {partyStatus?.summary.all_complete 
                        ? "All parties have submitted their information! ✓" 
                        : "Waiting for parties to submit their information"
                      }
                    </CardDescription>
                  </div>
                  {partyStatus && (
                    <div className="text-right">
                      <div className="text-2xl font-bold">
                        {partyStatus.summary.submitted}/{partyStatus.summary.total}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {lastPartyUpdate && `Updated ${lastPartyUpdate.toLocaleTimeString()}`}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Progress bar */}
                {partyStatus && partyStatus.summary.total > 0 && (
                  <div className="mt-4">
                    <Progress 
                      value={(partyStatus.summary.submitted / partyStatus.summary.total) * 100}
                      className={`h-3 ${partyStatus.summary.all_complete ? '[&>div]:bg-green-500' : '[&>div]:bg-purple-500'}`}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {Math.round((partyStatus.summary.submitted / partyStatus.summary.total) * 100)}% complete
                      {partyStatus.summary.pending > 0 && ` • ${partyStatus.summary.pending} pending`}
                    </p>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {!partyStatus && partyLinks.length === 0 ? (
                  <Button onClick={handleGenerateLinks} disabled={generatingLinks} className="shadow-md">
                    {generatingLinks ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Generate Party Links
                  </Button>
                ) : (
                  <div className="space-y-3">
                    {/* Use partyStatus if available, otherwise fall back to partyLinks */}
                    {(partyStatus?.parties || partyLinks.map(l => ({
                      id: l.party_id,
                      party_role: l.party_role,
                      entity_type: l.entity_type || "individual",
                      display_name: l.display_name,
                      email: null,
                      status: l.status === "submitted" ? "submitted" : "pending",
                      submitted_at: null,
                      token: l.token,
                      link: l.url,
                      link_expires_at: l.expires_at,
                      created_at: new Date().toISOString(),
                      completion_percentage: 0,
                      beneficial_owners_count: null,
                      trustees_count: null,
                      payment_sources_count: null,
                      payment_sources_total: null,
                      documents_count: 0,
                      has_validation_errors: false,
                      validation_error_count: 0,
                    }))).map((party) => {
                      const isBuyer = party.party_role === "transferee" || party.party_role === "buyer"
                      
                      return (
                        <div 
                          key={party.id || party.token}
                          className={`relative overflow-hidden rounded-xl border p-4 transition-all ${
                            party.status === "submitted" 
                              ? "bg-green-50 border-green-200" 
                              : party.has_validation_errors
                                ? "bg-amber-50 border-amber-200"
                                : "bg-gradient-to-br from-background to-muted/30"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                party.status === "submitted"
                                  ? "bg-green-500 text-white"
                                  : isBuyer
                                    ? "bg-blue-100 text-blue-600" 
                                    : "bg-purple-100 text-purple-600"
                              }`}>
                                {party.status === "submitted" ? (
                                  <CheckCircle2 className="h-5 w-5" />
                                ) : party.entity_type === "trust" ? (
                                  <Landmark className="h-5 w-5" />
                                ) : party.entity_type === "entity" || party.entity_type?.includes("llc") || party.entity_type?.includes("corp") ? (
                                  <Building2 className="h-5 w-5" />
                                ) : (
                                  <Users className="h-5 w-5" />
                                )}
                              </div>
                              <div>
                                <p className="font-medium">
                                  {party.display_name || party.party_role.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <PartyTypeBadge type={party.entity_type} className="text-xs h-5" />
                                  {party.email && (
                                    <span className="text-xs text-muted-foreground">{party.email}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex flex-col items-end gap-2">
                              <PartyStatusBadge status={party.status} />
                              
                              {/* Completion Progress - show when not yet submitted */}
                              {party.status !== "submitted" && party.completion_percentage !== undefined && (
                                <PartyCompletionProgress 
                                  percentage={party.completion_percentage}
                                  hasErrors={party.has_validation_errors}
                                  errorCount={party.validation_error_count}
                                  size="sm"
                                />
                              )}
                            </div>
                          </div>
                          
                          {/* Type-specific counts - show when available */}
                          {(party.beneficial_owners_count !== null || party.trustees_count !== null || party.payment_sources_count !== null) && (
                            <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground border-t pt-3">
                              {party.beneficial_owners_count !== null && (
                                <span className="flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  {party.beneficial_owners_count} beneficial owner{party.beneficial_owners_count !== 1 ? "s" : ""}
                                </span>
                              )}
                              {party.trustees_count !== null && (
                                <span className="flex items-center gap-1">
                                  <Landmark className="h-3 w-3" />
                                  {party.trustees_count} trustee{party.trustees_count !== 1 ? "s" : ""}
                                </span>
                              )}
                              {isBuyer && party.payment_sources_count !== null && party.payment_sources_count > 0 && (
                                <span className="flex items-center gap-1">
                                  <DollarSign className="h-3 w-3" />
                                  ${((party.payment_sources_total || 0) / 100).toLocaleString()}
                                </span>
                              )}
                            </div>
                          )}
                          
                          {/* Submitted info */}
                          {party.status === "submitted" && party.submitted_at && (
                            <p className="mt-3 text-xs text-green-600 border-t pt-3">
                              ✓ Submitted {new Date(party.submitted_at).toLocaleString()}
                            </p>
                          )}
                          
                          {/* Validation errors warning */}
                          {party.status !== "submitted" && party.has_validation_errors && party.validation_error_count && party.validation_error_count > 0 && (
                            <p className="mt-2 text-xs text-amber-600 flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              {party.validation_error_count} validation issue{party.validation_error_count !== 1 ? "s" : ""}
                            </p>
                          )}
                          
                          {/* Copy link section - only for pending */}
                          {party.status !== "submitted" && party.link && (
                            <div className="mt-4 flex items-center gap-2">
                              <input 
                                value={party.link}
                                readOnly
                                className="flex-1 px-3 py-2 text-xs font-mono bg-white/50 border rounded-lg truncate"
                              />
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => copyToClipboard(party.link!, party.token || party.id)}
                                className="shrink-0"
                              >
                                {copied === (party.token || party.id) ? (
                                  <Check className="h-4 w-4 text-green-600" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </Button>
                              <a href={party.link} target="_blank" rel="noopener noreferrer">
                                <Button variant="outline" size="sm">
                                  <ExternalLink className="h-4 w-4" />
                                </Button>
                              </a>
                            </div>
                          )}
                          
                          {/* Expiration warning */}
                          {party.status !== "submitted" && party.link_expires_at && (
                            <p className="mt-2 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3 inline mr-1" />
                              Link expires: {new Date(party.link_expires_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      )
                    })}
                    
                    {/* Refresh button */}
                    {partyStatus && (
                      <div className="flex items-center justify-between pt-2 border-t mt-4">
                        <p className="text-xs text-muted-foreground">
                          🔄 Auto-refreshes every 15 seconds
                        </p>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => fetchPartyStatus(false)}
                          disabled={partyStatusLoading}
                        >
                          {partyStatusLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-1" />
                          ) : null}
                          Refresh Now
                        </Button>
                      </div>
                    )}
                    
                    {/* Review All Submissions button - shows when all parties submitted */}
                    {partyStatus?.summary.all_complete && (
                      <div className="pt-4 border-t mt-4">
                        <Button 
                          className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-md"
                          onClick={() => router.push(`/app/reports/${reportId}/review`)}
                        >
                          <FileCheck className="h-4 w-4 mr-2" />
                          Review All Submissions
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Ready Check */}
          {backendDetermination?.reportable && partyLinks.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CheckCircle2 className="h-5 w-5" />
                  Ready Check
                </CardTitle>
                <CardDescription>
                  Verify all required information is complete
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleReadyCheck} disabled={checkingReady} variant="outline">
                  {checkingReady ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Check Readiness
                </Button>
                {readyResult && (
                  <div className={`mt-4 p-4 rounded-lg border ${
                    readyResult.ready 
                      ? "bg-green-50 border-green-200" 
                      : "bg-amber-50 border-amber-200"
                  }`}>
                    <div className="flex items-center gap-2">
                      {readyResult.ready ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-amber-600" />
                      )}
                      <span className="font-medium">
                        {readyResult.ready ? "Ready to File" : "Not Ready"}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {readyResult.summary.submitted_parties} of {readyResult.summary.total_parties} parties submitted
                    </p>
                    {readyResult.missing.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {readyResult.missing.map((item, i) => (
                          <li key={i} className="text-sm text-amber-700">• {item.message}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* File - Ready to Submit */}
          {readyResult?.ready && !fileResult && !["accepted", "submitted", "queued", "filed_mock"].includes(report?.filing_status || "") && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Send className="h-5 w-5" />
                  File to FinCEN
                </CardTitle>
                <CardDescription>
                  Submit the report to FinCEN for processing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleFile} disabled={filing}>
                  {filing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {report?.filing_status === "rejected" ? "Retry Filing" : "File Report"}
                </Button>
                {report?.filing_status === "rejected" && (
                  <p className="text-sm text-red-600 mt-2">
                    Previous filing was rejected. Click to retry.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* File Result - Accepted */}
          {(fileResult?.status === "accepted" || ["accepted", "filed_mock"].includes(report?.filing_status || "")) && (
            <Card className="border-green-200 bg-green-50/50">
              <CardContent className="pt-6">
                <div className="text-center">
                  <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-4" />
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <h3 className="text-xl font-bold text-green-800">
                      {fileResult?.is_demo ? "Filing Complete (Demo)" : "FinCEN Filing Accepted"}
                    </h3>
                    {fileResult?.is_demo ? (
                      <Badge className="bg-amber-100 text-amber-800 border-amber-200">Demo</Badge>
                    ) : (
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Live Filing</Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground mb-4">
                    {fileResult?.is_demo 
                      ? "This is a simulated filing for testing purposes."
                      : "Your report has been accepted by FinCEN."}
                  </p>
                  {(fileResult?.receipt_id || report?.receipt_id) && (
                    <div className="inline-block bg-green-100 border border-green-200 rounded-lg px-6 py-3">
                      <p className="text-xs text-green-600 font-medium uppercase mb-1">Receipt ID</p>
                      <ReceiptId 
                        value={fileResult?.receipt_id || report?.receipt_id || ""} 
                        size="lg" 
                        className="text-green-800 hover:text-green-700"
                      />
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground mt-4">
                    Filed at: {new Date(fileResult?.filed_at || report?.filed_at || "").toLocaleString()}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* File Result - Submitted (awaiting FinCEN response) */}
          {(fileResult?.status === "submitted" || report?.filing_status === "submitted") && (
            <Card className="border-blue-200 bg-blue-50/50">
              <CardContent className="pt-6">
                <div className="text-center">
                  <Clock className="h-12 w-12 text-blue-600 mx-auto mb-4 animate-pulse" />
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <h3 className="text-xl font-bold text-blue-800">Report Submitted to FinCEN</h3>
                    <Badge className="bg-blue-100 text-blue-800 border-blue-200">Awaiting Response</Badge>
                  </div>
                  <p className="text-muted-foreground mb-4">
                    Your report has been uploaded to FinCEN via SDTM.
                    FinCEN typically responds within 5 hours.
                  </p>
                  <p className="text-sm text-blue-700 bg-blue-100 rounded-lg px-4 py-2 inline-block">
                    Your BSA receipt ID will appear here once FinCEN accepts the filing.
                    Check back or view status in the reports page.
                  </p>
                  <p className="text-sm text-muted-foreground mt-4">
                    Submitted: {new Date(fileResult?.filed_at || report?.updated_at || "").toLocaleString()}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* File Result - Rejected */}
          {(fileResult?.status === "rejected" || report?.filing_status === "rejected") && (
            <Card className="border-red-200 bg-red-50/50">
              <CardContent className="pt-6">
                <div className="text-center">
                  <AlertTriangle className="h-12 w-12 text-red-600 mx-auto mb-4" />
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <h3 className="text-xl font-bold text-red-800">Filing Rejected</h3>
                    {fileResult?.is_demo ? (
                      <Badge className="bg-amber-100 text-amber-800 border-amber-200">Demo</Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-800 border-red-200">FinCEN Rejected</Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground mb-4">
                    {fileResult?.message || "FinCEN rejected this filing. Please review and correct any errors."}
                  </p>
                  {fileResult?.rejection_code && (
                    <div className="inline-block bg-red-100 border border-red-200 rounded-lg px-6 py-3">
                      <p className="text-xs text-red-600 font-medium uppercase mb-1">Rejection Code</p>
                      <p className="text-lg font-mono font-bold text-red-800">
                        {fileResult.rejection_code}
                      </p>
                      {fileResult.rejection_message && (
                        <p className="text-sm text-red-700 mt-2">{fileResult.rejection_message}</p>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* File Result - Needs Review */}
          {(fileResult?.status === "needs_review" || report?.filing_status === "needs_review") && (
            <Card className="border-amber-200 bg-amber-50/50">
              <CardContent className="pt-6">
                <div className="text-center">
                  <Clock className="h-12 w-12 text-amber-600 mx-auto mb-4" />
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <h3 className="text-xl font-bold text-amber-800">Pending Review</h3>
                    <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                      Needs Attention
                    </Badge>
                  </div>
                  <p className="text-muted-foreground mb-4">
                    {fileResult?.message || "Filing submitted but requires internal review before FinCEN acceptance"}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
