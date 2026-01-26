"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Loader2, 
  AlertTriangle, 
  RefreshCw, 
  Plus,
  CheckCircle2,
  Beaker,
  ExternalLink
} from "lucide-react"
import { createReport } from "@/lib/api"

const ENV_LABEL = process.env.NEXT_PUBLIC_ENV_LABEL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'

// Demo API functions with secret header
async function resetDemoData(secret: string): Promise<{ ok: boolean; reports_created: number; timestamp: string }> {
  const response = await fetch(`${API_BASE_URL}/demo/reset`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'X-DEMO-SECRET': secret,
    },
  })
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Invalid secret or endpoint not available')
    }
    throw new Error('Failed to reset demo data')
  }
  return response.json()
}

async function createDemoReport(secret: string): Promise<{ ok: boolean; report_id: string; wizard_url: string }> {
  const response = await fetch(`${API_BASE_URL}/demo/create-report`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'X-DEMO-SECRET': secret,
    },
  })
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Invalid secret or endpoint not available')
    }
    throw new Error('Failed to create demo report')
  }
  return response.json()
}

export default function DemoToolsPage() {
  const router = useRouter()
  const [secret, setSecret] = useState("")
  const [resetting, setResetting] = useState(false)
  const [resetResult, setResetResult] = useState<{ reports_created: number } | null>(null)
  const [creating, setCreating] = useState(false)
  const [createResult, setCreateResult] = useState<{ report_id: string; wizard_url: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Only show in staging
  if (ENV_LABEL !== "STAGING") {
    return (
      <div className="container mx-auto py-16 px-4 max-w-md text-center">
        <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2">Not Available</h2>
        <p className="text-muted-foreground">Demo tools are only available in staging environment.</p>
      </div>
    )
  }

  const handleReset = async () => {
    if (!secret.trim()) {
      setError("Please enter the demo secret")
      return
    }
    try {
      setResetting(true)
      setError(null)
      setResetResult(null)
      setCreateResult(null)
      const result = await resetDemoData(secret)
      setResetResult({ reports_created: result.reports_created })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset demo data")
    } finally {
      setResetting(false)
    }
  }

  const handleCreateAndOpen = async () => {
    if (!secret.trim()) {
      setError("Please enter the demo secret")
      return
    }
    try {
      setCreating(true)
      setError(null)
      setCreateResult(null)
      const result = await createDemoReport(secret)
      setCreateResult({ report_id: result.report_id, wizard_url: result.wizard_url })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create report")
    } finally {
      setCreating(false)
    }
  }

  const handleQuickCreate = async () => {
    try {
      setCreating(true)
      setError(null)
      const report = await createReport()
      router.push(`/app/reports/${report.id}/wizard`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create report")
      setCreating(false)
    }
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Beaker className="h-8 w-8 text-amber-500" />
        <div>
          <h1 className="text-2xl font-bold">Demo Tools</h1>
          <p className="text-muted-foreground">Staging environment utilities</p>
        </div>
        <Badge variant="outline" className="ml-auto bg-amber-500/10 text-amber-600 border-amber-500/30">
          STAGING ONLY
        </Badge>
      </div>

      {/* Secret Input */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Demo Secret</CardTitle>
          <CardDescription>
            Enter the X-DEMO-SECRET to access protected demo operations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              type="password"
              placeholder="Enter demo secret..."
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              className="font-mono"
            />
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="flex items-center gap-2 p-4 bg-destructive/10 text-destructive rounded-lg mb-6">
          <AlertTriangle className="h-5 w-5" />
          <span>{error}</span>
          <Button variant="ghost" size="sm" onClick={() => setError(null)} className="ml-auto">
            Dismiss
          </Button>
        </div>
      )}

      <div className="space-y-6">
        {/* Reset Demo Data */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Reset Demo Data
            </CardTitle>
            <CardDescription>
              Clear all reports and re-seed with fresh demo data (6 reports: 3 exempt, 3 reportable)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleReset} disabled={resetting || !secret.trim()} variant="outline">
              {resetting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Reset Demo Data
            </Button>
            {resetResult && (
              <div className="mt-4 p-4 rounded-lg bg-green-50 border border-green-200 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="text-green-800">
                  Demo data reset successfully. {resetResult.reports_created} reports created.
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create Demo Report (via demo endpoint) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Create Demo Report
            </CardTitle>
            <CardDescription>
              Create a pre-configured demo report via the secure demo endpoint
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleCreateAndOpen} disabled={creating || !secret.trim()}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Create Demo Report
            </Button>
            {createResult && (
              <div className="mt-4 p-4 rounded-lg bg-green-50 border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span className="text-green-800 font-medium">Report created successfully</span>
                </div>
                <div className="text-sm text-muted-foreground mb-2">
                  ID: <code className="bg-muted px-1 rounded">{createResult.report_id}</code>
                </div>
                <Button 
                  size="sm" 
                  onClick={() => router.push(`/app/reports/${createResult.report_id}/wizard`)}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Wizard
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Create (no secret needed) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Quick Create (No Secret)
            </CardTitle>
            <CardDescription>
              Create a blank report using the regular API endpoint
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleQuickCreate} disabled={creating} variant="outline">
              {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Create &amp; Open Wizard
            </Button>
          </CardContent>
        </Card>

        {/* Quick Links */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Links</CardTitle>
            <CardDescription>Jump to key pages</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => router.push("/app/reports")}>
              Reports List
            </Button>
            <Button variant="outline" size="sm" onClick={() => router.push("/")}>
              Marketing Home
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
