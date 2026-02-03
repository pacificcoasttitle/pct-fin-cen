"use client"

import { useState, useEffect } from "react"
import { CheckCircle2, XCircle, AlertTriangle, Loader2 } from "lucide-react"
import { Progress } from "@/components/ui/progress"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL

interface ReadinessCheck {
  key: string
  label: string
  passed: boolean
  detail: string
  required: boolean
}

interface ReadinessData {
  company_id: string
  company_name: string
  ready: boolean
  passed_count: number
  total_count: number
  percentage: number
  checks: ReadinessCheck[]
  has_filings: boolean
}

interface CompanyReadinessChecklistProps {
  companyId: string
  compact?: boolean
  onLoad?: (data: ReadinessData) => void
}

/**
 * CompanyReadinessChecklist
 * 
 * Displays a checklist of company setup progress.
 * Fetches from GET /companies/{id}/readiness
 * 
 * Visual (full):
 * ┌─────────────────────────────────────────┐
 * │ Setup Progress                    4/6   │
 * │ ■■■■■■■■■■■■■□□□□□□  67%               │
 * │                                         │
 * │ ✅ Billing email configured              │
 * │ ✅ Billing type confirmed                │
 * │ ✅ Filing fee set ($75.00)               │
 * │ ✅ Admin user created                    │
 * │ ❌ Company address not set               │
 * │ ⚠️ No card on file (required for hybrid)│
 * └─────────────────────────────────────────┘
 */
export function CompanyReadinessChecklist({
  companyId,
  compact = false,
  onLoad,
}: CompanyReadinessChecklistProps) {
  const [data, setData] = useState<ReadinessData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchReadiness = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(`${API_BASE_URL}/companies/${companyId}/readiness`)
        if (response.ok) {
          const result = await response.json()
          setData(result)
          onLoad?.(result)
        } else {
          setError("Failed to load readiness data")
        }
      } catch (err) {
        setError("Network error")
      } finally {
        setLoading(false)
      }
    }

    if (companyId) {
      fetchReadiness()
    }
  }, [companyId, onLoad])

  if (loading) {
    return (
      <div className={`${compact ? "p-3" : "p-4"} flex items-center justify-center`}>
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className={`${compact ? "p-3" : "p-4"} text-center text-muted-foreground text-sm`}>
        {error || "No data"}
      </div>
    )
  }

  const getStatusIcon = (check: ReadinessCheck) => {
    if (check.passed) {
      return <CheckCircle2 className="h-4 w-4 text-green-600" />
    }
    if (check.required) {
      return <XCircle className="h-4 w-4 text-red-500" />
    }
    return <AlertTriangle className="h-4 w-4 text-amber-500" />
  }

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Setup Progress</span>
          <span className="text-muted-foreground">
            {data.passed_count}/{data.total_count}
          </span>
        </div>
        <Progress value={data.percentage} className="h-2" />
        {!data.ready && (
          <p className="text-xs text-amber-600">
            {data.total_count - data.passed_count} item(s) need attention
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with Progress */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-semibold text-sm">Setup Progress</h4>
          <span className="text-sm text-muted-foreground">
            {data.passed_count}/{data.total_count} ({data.percentage}%)
          </span>
        </div>
        <Progress value={data.percentage} className="h-2" />
      </div>

      {/* Ready Status */}
      {data.ready ? (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <span className="text-sm text-green-800 font-medium">
            Company is ready to use
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          <span className="text-sm text-amber-800">
            Complete the items below before going live
          </span>
        </div>
      )}

      {/* Checklist */}
      <div className="space-y-2">
        {data.checks.map((check) => (
          <div
            key={check.key}
            className={`flex items-start gap-3 p-2 rounded-lg ${
              check.passed
                ? "bg-slate-50"
                : check.required
                  ? "bg-red-50"
                  : "bg-amber-50"
            }`}
          >
            <div className="mt-0.5">{getStatusIcon(check)}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{check.label}</p>
              <p className="text-xs text-muted-foreground truncate">
                {check.detail}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Filing Status */}
      {data.has_filings && (
        <p className="text-xs text-muted-foreground italic">
          This company has already submitted filings.
        </p>
      )}
    </div>
  )
}

export default CompanyReadinessChecklist
