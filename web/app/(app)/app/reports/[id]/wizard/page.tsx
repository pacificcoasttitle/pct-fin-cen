"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getReport, Report } from "@/lib/api";
import { WizardContainer } from "@/components/wizard";
import { Loader2 } from "lucide-react";

export default function WizardPage() {
  const params = useParams();
  const router = useRouter();
  const reportId = params.id as string;
  
  const [report, setReport] = useState<Report | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    async function loadReport() {
      try {
        const data = await getReport(reportId);
        setReport(data);
      } catch (err: any) {
        console.error("Failed to load report:", err);
        setError(err.message || "Failed to load report");
      } finally {
        setIsLoading(false);
      }
    }
    
    loadReport();
  }, [reportId]);
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  if (error || !report) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-destructive">{error || "Report not found"}</p>
          <button
            onClick={() => router.push("/app/requests")}
            className="text-primary hover:underline"
          >
            Back to Requests
          </button>
        </div>
      </div>
    );
  }
  
  // If report is already filed, redirect
  if (report.status === "filed") {
    router.push(`/app/reports/${reportId}`);
    return null;
  }
  
  return (
    <WizardContainer
      report={report}
      onUpdate={(data) => {
        setReport((prev) => prev ? { ...prev, ...data } : prev);
      }}
    />
  );
}
