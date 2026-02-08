"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

/**
 * Legacy Request Form Redirect
 * 
 * The old "Submit Request → Staff Queue" flow has been replaced with
 * the new client-driven "Start New Report → Wizard" flow.
 * 
 * This page redirects old bookmarks/links to the new flow.
 */
export default function LegacyRequestRedirect() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect old URLs to new client-driven flow
    router.replace("/app/reports/new");
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      <p className="text-muted-foreground">Redirecting to new report form...</p>
    </div>
  );
}
