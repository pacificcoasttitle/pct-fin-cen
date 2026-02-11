# Fix: Exemption Certificate Page + PDF Enhancement

## Problem

`DeterminationResultStep.tsx` navigates to `/app/reports/{id}/certificate` but that page doesn't exist → 404.

The `ExemptionCertificate` component and backend PDF endpoint both exist. We just need:
1. Create the missing page route
2. Fix `DeterminationResultStep` to pass correct data
3. Enhance the PDF template with FinClear branding and the additional fields from Step 0

---

## Part 1: Create the Certificate Page

### File: `web/app/(app)/app/reports/[id]/certificate/page.tsx` (NEW)

```tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getReport, Report, downloadCertificatePdf } from "@/lib/api";
import { Loader2, Download, ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CertificatePage() {
  const params = useParams();
  const router = useRouter();
  const reportId = params.id as string;

  const [report, setReport] = useState<Report | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadReport() {
      try {
        const data = await getReport(reportId);
        setReport(data);
      } catch (err: any) {
        setError(err.message || "Failed to load report");
      } finally {
        setIsLoading(false);
      }
    }
    loadReport();
  }, [reportId]);

  const handleDownloadPdf = async () => {
    setIsDownloading(true);
    try {
      await downloadCertificatePdf(reportId);
    } catch (err: any) {
      console.error("PDF download failed:", err);
      setError("Failed to download PDF. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

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
          <Button variant="outline" onClick={() => router.push("/app/requests")}>
            Back to Requests
          </Button>
        </div>
      </div>
    );
  }

  if (report.status !== "exempt") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">
            This report is not exempt. Certificates are only available for exempt transactions.
          </p>
          <Button variant="outline" onClick={() => router.push(`/app/reports/${reportId}/wizard`)}>
            Back to Wizard
          </Button>
        </div>
      </div>
    );
  }

  // Extract data from wizard_data
  const wd = report.wizard_data || {};
  const collection = wd.collection || {};
  const determination = wd.determination || {};
  const addr = collection.propertyAddress || {};

  const exemptionReason = wd.exemptionReason || "Exempt per FinCEN determination";

  // Build exemption reasons list from determination data
  const exemptionReasons: string[] = [];
  const transferExemptions = determination.transferExemptions || [];
  if (transferExemptions.length > 0 && !transferExemptions.includes("none")) {
    exemptionReasons.push(...transferExemptions);
  }
  if (determination.isResidential === "no" && determination.hasIntentToBuild === "no") {
    exemptionReasons.push("Non-residential property with no intent to build");
  }
  if (determination.lenderHasAml === "yes") {
    exemptionReasons.push("Financing by AML-covered lender");
  }
  if (determination.buyerType === "individual") {
    exemptionReasons.push("Individual buyer — not reportable under RRE rule");
  }
  const entityExemptions = determination.entityExemptions || [];
  if (entityExemptions.length > 0 && !entityExemptions.includes("none")) {
    exemptionReasons.push(...entityExemptions);
  }
  const trustExemptions = determination.trustExemptions || [];
  if (trustExemptions.length > 0 && !trustExemptions.includes("none")) {
    exemptionReasons.push(...trustExemptions);
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Action Bar */}
      <div className="sticky top-0 z-10 border-b bg-card">
        <div className="container max-w-4xl py-3 px-4 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/app/requests")}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
            >
              <Printer className="h-4 w-4 mr-1" />
              Print
            </Button>
            <Button
              size="sm"
              onClick={handleDownloadPdf}
              disabled={isDownloading}
            >
              {isDownloading ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-1" />
              )}
              Download PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Certificate Preview */}
      <div className="container max-w-4xl py-8 px-4">
        <div className="bg-white border rounded-lg shadow-sm overflow-hidden print:shadow-none print:border-none">

          {/* FinClear Header */}
          <div className="bg-slate-900 text-white px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">FinClear</h1>
                <p className="text-slate-300 text-sm mt-1">FinCEN Compliance Solutions</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-300">Exemption Certificate</p>
                <p className="text-xs text-slate-400 mt-1">
                  ID: {report.certificate_id || report.id.slice(0, 8).toUpperCase()}
                </p>
              </div>
            </div>
          </div>

          {/* Certificate Body */}
          <div className="px-8 py-8 space-y-8">

            {/* Status Banner */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-6 py-4 text-center">
              <p className="text-amber-800 font-semibold text-lg">
                Transaction Exempt from FinCEN Reporting
              </p>
              <p className="text-amber-600 text-sm mt-1">
                Per 31 CFR Part 1031 — Real Estate Reporting Rule
              </p>
            </div>

            {/* Property Information */}
            <div>
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Property Information
              </h2>
              <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                <div>
                  <p className="text-xs text-slate-400">Property Address</p>
                  <p className="text-sm font-medium">
                    {addr.street || "—"}
                    {addr.unit ? `, ${addr.unit}` : ""}
                  </p>
                  <p className="text-sm">
                    {addr.city || ""}{addr.city && addr.state ? ", " : ""}
                    {addr.state || ""} {addr.zip || ""}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">County</p>
                  <p className="text-sm font-medium">{addr.county || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">APN</p>
                  <p className="text-sm font-medium">{collection.apn || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Legal Description</p>
                  <p className="text-sm font-medium truncate" title={collection.legalDescription || ""}>
                    {collection.legalDescription
                      ? collection.legalDescription.length > 60
                        ? collection.legalDescription.slice(0, 60) + "..."
                        : collection.legalDescription
                      : "—"}
                  </p>
                </div>
              </div>
            </div>

            {/* Transaction Details */}
            <div>
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Transaction Details
              </h2>
              <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                <div>
                  <p className="text-xs text-slate-400">Escrow / File Number</p>
                  <p className="text-sm font-medium">{collection.escrowNumber || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Purchase Price</p>
                  <p className="text-sm font-medium">
                    {collection.purchasePrice
                      ? `$${collection.purchasePrice.toLocaleString()}`
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Closing Date</p>
                  <p className="text-sm font-medium">{collection.closingDate || "—"}</p>
                </div>
              </div>
            </div>

            {/* Exemption Determination */}
            <div>
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Exemption Determination
              </h2>
              <div className="bg-slate-50 rounded-lg px-6 py-4 space-y-2">
                <p className="text-sm font-medium text-slate-700">Reason(s):</p>
                {exemptionReasons.length > 0 ? (
                  <ul className="list-disc list-inside space-y-1">
                    {exemptionReasons.map((reason, i) => (
                      <li key={i} className="text-sm text-slate-600">{reason}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-600">{exemptionReason}</p>
                )}
              </div>
            </div>

            {/* Certification */}
            <div className="border-t pt-6">
              <p className="text-sm text-slate-600">
                This certificate confirms that the above transaction was evaluated using the FinClear
                compliance wizard on{" "}
                <span className="font-medium">
                  {report.updated_at
                    ? new Date(report.updated_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : new Date().toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                </span>
                {" "}and determined to be exempt from FinCEN Real Estate Transaction reporting
                requirements under 31 CFR Part 1031.
              </p>
            </div>

            {/* Footer */}
            <div className="border-t pt-4 flex items-center justify-between text-xs text-slate-400">
              <p>Generated by FinClear — fincenclear.com</p>
              <p>Certificate ID: {report.certificate_id || report.id.slice(0, 8).toUpperCase()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## Part 2: Update the Backend PDF Template

The backend `generate_certificate_html()` in `api/app/services/pdf_service.py` needs to be updated to match the on-screen certificate design — FinClear branding, the additional fields from Step 0, and professional styling.

### File: `api/app/services/pdf_service.py`

Find the `generate_certificate_html()` function and update it. The HTML template should match the on-screen certificate above but as a standalone HTML page suitable for PDFShift conversion. Include:

- FinClear branding header (dark slate background, white text, logo text)
- "Exemption Certificate" with certificate ID
- Amber status banner: "Transaction Exempt from FinCEN Reporting"
- Property Information section: address, county, APN, legal description
- Transaction Details section: escrow number, purchase price, closing date
- Exemption Determination section: list of reasons
- Certification statement with date
- Footer: "Generated by FinClear — fincenclear.com" + certificate ID

The function receives the report data. Pull the same fields from `wizard_data` as the frontend does:
- `wizard_data.collection.propertyAddress` (street, city, state, zip, county)
- `wizard_data.collection.apn`
- `wizard_data.collection.legalDescription`
- `wizard_data.collection.escrowNumber`
- `wizard_data.collection.purchasePrice`
- `wizard_data.collection.closingDate`
- `wizard_data.exemptionReason`
- `wizard_data.determination` (to build exemption reasons list)
- `report.certificate_id` or first 8 chars of report ID

Use inline CSS for the HTML template (PDFShift processes standalone HTML). Match the color scheme:
- Header: `background: #0f172a` (slate-900), white text
- Status banner: `background: #fffbeb; border: 1px solid #fde68a` (amber-50/200)
- Body: white background, `color: #334155` (slate-700)
- Section headers: uppercase, `color: #64748b` (slate-500), small text
- Footer: `color: #94a3b8` (slate-400), small text

---

## Part 3: Fix DeterminationResultStep Navigation

The `router.push` is fine now that the page will exist. But verify the exempt flow also calls the backend `determine` endpoint to set the status before navigating.

In `web/components/wizard/determination/DeterminationResultStep.tsx`, the `handleViewCertificate` function should:

1. Call `determine(reportId)` to set backend status to `exempt`
2. Navigate to `/app/reports/${reportId}/certificate`

This is already what the code does (from the diagnostic). Just confirm it's still:

```tsx
const handleViewCertificate = async () => {
  setIsLoading(true);
  try {
    await determine(reportId);
    router.push(`/app/reports/${reportId}/certificate`);
  } catch (error) {
    console.error("Failed:", error);
  } finally {
    setIsLoading(false);
  }
};
```

No change needed here if that's what it already says.

---

## Summary

| File | Action |
|------|--------|
| `web/app/(app)/app/reports/[id]/certificate/page.tsx` | **CREATE** — New page rendering on-screen certificate with Download PDF button |
| `api/app/services/pdf_service.py` | **UPDATE** — `generate_certificate_html()` to match FinClear branding + new fields |
| `web/components/wizard/determination/DeterminationResultStep.tsx` | **VERIFY** — No change needed if `handleViewCertificate` already calls determine + router.push |

## DO NOT

- ❌ Use a Dialog/modal — we want a dedicated page with a shareable URL
- ❌ Remove the existing `ExemptionCertificate` component — other pages may still reference it
- ❌ Change the backend route (`GET /reports/{id}/certificate/pdf`) — it already exists
- ❌ Change the `downloadCertificatePdf` function in `api.ts` — it already works
- ❌ Remove FinClear branding from the certificate
