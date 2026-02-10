"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * /app/reports now redirects to /app/requests (unified requests page).
 * Individual report routes (/app/reports/[id]/wizard, /app/reports/new) still work.
 */
export default function ReportsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/app/requests");
  }, [router]);

  return null;
}
