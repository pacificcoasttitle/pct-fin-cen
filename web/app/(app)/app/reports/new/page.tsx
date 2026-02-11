"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createReport } from "@/lib/api";
import { Loader2 } from "lucide-react";

export default function NewReportPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function initReport() {
      try {
        // Create blank report — wizard Step 0 will collect everything
        const report = await createReport();

        // Redirect to wizard
        router.replace(`/app/reports/${report.id}/wizard`);
      } catch (err) {
        console.error("Failed to create report:", err);
        setError(err instanceof Error ? err.message : "Failed to create report");
      }
    }

    initReport();
  }, [router]);

  if (error) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-destructive">{error}</p>
          <button
            onClick={() => router.push("/app/requests")}
            className="text-primary hover:underline text-sm"
          >
            Back to Requests
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[400px] flex items-center justify-center">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
        <p className="text-muted-foreground">Creating new report...</p>
      </div>
    </div>
  );
}
