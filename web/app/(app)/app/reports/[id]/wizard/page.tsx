"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useParams, useSearchParams } from "next/navigation"
import Link from "next/link"
import { RRERQuestionnaire, type RRERQuestionnaireProps } from "@/components/rrer-questionnaire"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Loader2, 
  AlertTriangle, 
  ArrowLeft, 
  Check, 
  FileText,
} from "lucide-react"
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
  type ReportPartiesResponse,
} from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import type { CollectionStepId } from "@/lib/rrer-types"

const AUTOSAVE_DELAY = 1500

export default function WizardPage() {
  const params = useParams()
  const searchParams = useSearchParams()
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
  const [checkingReady, setCheckingReady] = useState(false)
  const [filing, setFiling] = useState(false)
  
  // Party status tracking (real-time)
  const [partyStatus, setPartyStatus] = useState<ReportPartiesResponse | null>(null)
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
    } catch {
      // Party status fetch failed silently - will retry on next poll
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
      // Autosave failed silently - UI shows error state
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
  
  // Determine the correct step based on: URL param > report status > saved wizard data
  const urlStep = searchParams.get("step") as CollectionStepId | null
  
  const getAutoDetectedStep = (): { phase?: "determination" | "collection" | "summary"; collectionStep?: CollectionStepId } => {
    // 1. URL param takes highest priority
    if (urlStep) {
      return { phase: "collection", collectionStep: urlStep }
    }
    
    // 2. Auto-detect based on report status
    if (report) {
      switch (report.status) {
        case "draft":
          return { phase: "determination" }
        case "determination_complete":
          return { phase: "collection", collectionStep: "party-setup" }
        case "collecting":
          // They're waiting for parties — show party-setup so they can manage
          return { phase: "collection", collectionStep: "party-setup" }
        case "ready_to_file":
          return { phase: "collection", collectionStep: "file-report" }
        case "filed":
          return { phase: "summary" }
        case "exempt":
          return { phase: "determination" } // Show the determination result
      }
    }
    
    // 3. Fall back to saved wizard data
    return {}
  }
  
  const autoStep = getAutoDetectedStep()
  
  const initialData: RRERQuestionnaireProps["initialData"] = wizardData ? {
    phase: autoStep.phase || wizardData.phase as "determination" | "collection" | "summary" | undefined,
    determinationStep: wizardData.determinationStep as string | undefined,
    collectionStep: autoStep.collectionStep || wizardData.collectionStep as string | undefined,
    determination: wizardData.determination as Record<string, unknown> | undefined,
    collection: wizardData.collection as Record<string, unknown> | undefined,
  } : autoStep.phase ? {
    phase: autoStep.phase,
    collectionStep: autoStep.collectionStep,
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
            await createPartyLinks(reportId, parties)
            // Refresh report to update status
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
            return { 
              ready: result.ready, 
              errors: result.missing.map(m => m.message) 
            }
          } finally {
            setCheckingReady(false)
          }
        }}
        onDetermine={handleDetermine}
        onFileReport={async () => {
          setFiling(true)
          try {
            const result = await fileReport(reportId)
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

    </div>
  )
}
