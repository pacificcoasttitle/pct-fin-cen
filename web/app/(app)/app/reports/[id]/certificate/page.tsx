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
      const blob = await downloadCertificatePdf(reportId);

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `exemption-certificate-${reportId.slice(0, 8)}.pdf`;

      // Trigger download
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
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
  const wd = (report.wizard_data || {}) as Record<string, any>;
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

  // Certificate ID from determination result or fallback
  const certificateId = report.determination?.certificate_id || report.id.slice(0, 8).toUpperCase();

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
        <div
          id="exemption-certificate"
          className="bg-white border rounded-lg shadow-sm overflow-hidden print:shadow-none print:border-none"
        >

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
                  ID: {certificateId}
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
                      ? `$${Number(collection.purchasePrice).toLocaleString()}`
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
              <p>Certificate ID: {certificateId}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Print-specific styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #exemption-certificate,
          #exemption-certificate * {
            visibility: visible;
          }
          #exemption-certificate {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 20px;
          }
          .sticky {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
