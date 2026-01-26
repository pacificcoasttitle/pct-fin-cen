"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createReport } from "@/lib/api"

export default function NewReportPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const create = async () => {
      try {
        const report = await createReport()
        router.replace(`/app/reports/${report.id}/wizard`)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create report")
      }
    }
    create()
  }, [router])

  if (error) {
    return (
      <div className="container mx-auto py-16 px-4 max-w-md text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2">Failed to create report</h2>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={() => router.push("/app/reports")}>
          Back to Reports
        </Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-16 px-4 text-center">
      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
      <p className="text-muted-foreground">Creating new report...</p>
    </div>
  )
}
