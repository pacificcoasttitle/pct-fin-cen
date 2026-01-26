"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { RRERQuestionnaire, type RRERQuestionnaireProps } from "@/components/rrer-questionnaire"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
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
  Clock
} from "lucide-react"
import {
  getReport,
  saveWizard,
  determine,
  createPartyLinks,
  readyCheck,
  fileReport,
  type Report,
  type DeterminationResult,
  type PartyLink,
  type ReadyCheckResult,
  type FileResult,
} from "@/lib/api"

const AUTOSAVE_DELAY = 1500

export default function WizardPage() {
  const params = useParams()
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
    <div className="min-h-screen bg-background">
      {/* Header Bar */}
      <div className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/app/reports">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="font-semibold">
                {report?.property_address_text || "New Report"}
              </h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge 
                  variant={report?.filing_status === "filed_mock" ? "default" : "secondary"}
                  className={report?.filing_status === "filed_mock" ? "bg-green-100 text-green-800" : ""}
                >
                  {report?.filing_status === "filed_mock" ? "Filed (Demo)" : report?.status.replace(/_/g, " ")}
                </Badge>
                {saveStatus === "saving" && (
                  <span className="flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Saving...
                  </span>
                )}
                {saveStatus === "saved" && (
                  <span className="flex items-center gap-1 text-green-600">
                    <Check className="h-3 w-3" />
                    Saved
                  </span>
                )}
                {saveStatus === "error" && (
                  <span className="flex items-center gap-1 text-destructive">
                    <AlertTriangle className="h-3 w-3" />
                    Save failed
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

      {/* Questionnaire */}
      <RRERQuestionnaire 
        initialData={initialData}
        onChange={handleQuestionnaireChange}
        saveStatus={saveStatus}
      />

      {/* Action Buttons Section */}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Separator className="my-8" />
        
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Backend Actions</h2>

          {/* Determine */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ClipboardCheck className="h-5 w-5" />
                Run Determination
              </CardTitle>
              <CardDescription>
                Submit wizard data to backend for official determination
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleDetermine} disabled={determining}>
                {determining ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Determine
              </Button>
              {backendDetermination && (
                <div className={`mt-4 p-4 rounded-lg border ${
                  backendDetermination.reportable 
                    ? "bg-amber-50 border-amber-200" 
                    : "bg-green-50 border-green-200"
                }`}>
                  <p className="font-medium">
                    {backendDetermination.reportable ? "Reportable" : "Exempt"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {backendDetermination.reason_text}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Party Links */}
          {backendDetermination?.reportable && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="h-5 w-5" />
                  Party Links
                </CardTitle>
                <CardDescription>
                  Generate secure links for parties to submit their information
                </CardDescription>
              </CardHeader>
              <CardContent>
                {partyLinks.length === 0 ? (
                  <Button onClick={handleGenerateLinks} disabled={generatingLinks}>
                    {generatingLinks ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Generate Party Links
                  </Button>
                ) : (
                  <div className="space-y-3">
                    {partyLinks.map((link) => (
                      <div 
                        key={link.token}
                        className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium capitalize">{link.party_role}</span>
                            <Badge variant={link.status === "submitted" ? "default" : "secondary"}>
                              {link.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground truncate mt-1">{link.url}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            <Clock className="h-3 w-3 inline mr-1" />
                            Expires: {new Date(link.expires_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => copyToClipboard(link.url, link.token)}
                          >
                            {copied === link.token ? (
                              <Check className="h-4 w-4 text-green-600" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                          <a href={link.url} target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" size="sm">
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </a>
                        </div>
                      </div>
                    ))}
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

          {/* File */}
          {readyResult?.ready && !fileResult && !["accepted", "filed_mock"].includes(report?.filing_status || "") && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Send className="h-5 w-5" />
                  File to FinCEN (Demo)
                </CardTitle>
                <CardDescription>
                  Submit the report to FinCEN (demo mode - no live filing)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleFile} disabled={filing}>
                  {filing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {report?.filing_status === "rejected" ? "Retry Filing (Demo)" : "File Report (Demo)"}
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
                    <h3 className="text-xl font-bold text-green-800">Successfully Filed!</h3>
                    <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                      Demo
                    </Badge>
                  </div>
                  <p className="text-muted-foreground mb-4">
                    {fileResult?.message || "Report has been filed (demo mode)"}
                  </p>
                  <div className="inline-block bg-green-100 border border-green-200 rounded-lg px-6 py-3">
                    <p className="text-xs text-green-600 font-medium uppercase mb-1">Receipt ID</p>
                    <p className="text-xl font-mono font-bold text-green-800">
                      {fileResult?.receipt_id || report?.receipt_id}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground mt-4">
                    Filed at: {new Date(fileResult?.filed_at || report?.filed_at || "").toLocaleString()}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* File Result - Rejected */}
          {(fileResult?.status === "rejected") && (
            <Card className="border-red-200 bg-red-50/50">
              <CardContent className="pt-6">
                <div className="text-center">
                  <AlertTriangle className="h-12 w-12 text-red-600 mx-auto mb-4" />
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <h3 className="text-xl font-bold text-red-800">Filing Rejected</h3>
                    <Badge className="bg-red-100 text-red-800 border-red-200">
                      Demo
                    </Badge>
                  </div>
                  <p className="text-muted-foreground mb-4">
                    {fileResult?.message}
                  </p>
                  {fileResult.rejection_code && (
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
                      Demo
                    </Badge>
                  </div>
                  <p className="text-muted-foreground mb-4">
                    {fileResult?.message || "Filing submitted but requires internal review"}
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
