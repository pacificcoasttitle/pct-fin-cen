"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Shield, CheckCircle, Printer, Download, FileText, Building2 } from "lucide-react";
import { BRAND } from "@/lib/brand";

export interface ExemptionCertificateData {
  certificateId: string;
  propertyAddress: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
  purchasePrice: number;
  buyerName: string;
  escrowNumber?: string;
  exemptionReasons: Array<{ code: string; display: string }>;
  determinationTimestamp: string;
  determinationMethod: string;
}

interface ExemptionCertificateProps {
  data: ExemptionCertificateData;
  showActions?: boolean;
  className?: string;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

function formatAddress(addr: ExemptionCertificateData["propertyAddress"]): string {
  const parts = [addr.street, addr.city, addr.state, addr.zip].filter(Boolean);
  return parts.join(", ");
}

export function ExemptionCertificate({
  data,
  showActions = true,
  className,
}: ExemptionCertificateProps) {
  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // In a real implementation, this would generate a PDF
    // For now, we'll trigger print which can save as PDF
    window.print();
  };

  return (
    <div className={className}>
      {/* Actions */}
      {showActions && (
        <div className="flex gap-3 justify-end mb-4 print:hidden">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
        </div>
      )}

      {/* Certificate Card */}
      <Card
        id="exemption-certificate"
        className="bg-white border-2 border-green-200 shadow-xl print:shadow-none print:border"
      >
        {/* Header */}
        <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-200">
          <div className="text-center space-y-3">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-green-500 text-white flex items-center justify-center shadow-lg shadow-green-500/30">
                <Shield className="h-8 w-8" />
              </div>
            </div>
            <div>
              <h1 className="text-xl font-bold text-green-800">
                FinCEN Reporting Exemption Certificate
              </h1>
              <p className="text-sm text-muted-foreground">
                Real Estate Report (RRER) - 31 CFR 1031
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 p-6">
          {/* Certificate ID - Prominent */}
          <div className="text-center py-4 bg-green-50 rounded-lg border border-green-100">
            <p className="text-sm text-muted-foreground mb-1">Certificate Number</p>
            <p className="text-2xl font-mono font-bold text-green-700 tracking-wider">
              {data.certificateId}
            </p>
          </div>

          {/* Transaction Details */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <p className="text-muted-foreground">Property Address</p>
              <p className="font-medium">{formatAddress(data.propertyAddress)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">Purchase Price</p>
              <p className="font-medium">{formatCurrency(data.purchasePrice)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">Buyer</p>
              <p className="font-medium">{data.buyerName}</p>
            </div>
            {data.escrowNumber && (
              <div className="space-y-1">
                <p className="text-muted-foreground">Escrow Number</p>
                <p className="font-medium">{data.escrowNumber}</p>
              </div>
            )}
          </div>

          <Separator />

          {/* Exemption Statement */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-green-800 flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Exemption Determination
            </h3>
            <p className="text-sm text-green-700">
              Based on the information provided, this transaction is{" "}
              <strong className="text-green-900">EXEMPT</strong> from FinCEN
              Real Estate Report filing requirements under 31 CFR 1031.
            </p>
            
            {/* Exemption Reasons */}
            <div className="space-y-2 pt-2">
              <p className="text-xs text-green-600 font-medium uppercase tracking-wide">
                Applicable Exemption(s):
              </p>
              <ul className="space-y-1.5">
                {data.exemptionReasons.map((reason, idx) => (
                  <li
                    key={idx}
                    className="text-sm text-green-700 flex items-start gap-2"
                  >
                    <CheckCircle className="h-4 w-4 mt-0.5 text-green-600 shrink-0" />
                    <span>{reason.display}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <Separator />

          {/* Footer */}
          <div className="text-center text-xs text-muted-foreground space-y-1.5 pt-2">
            <p>
              <strong>Determined:</strong>{" "}
              {formatDateTime(data.determinationTimestamp)}
            </p>
            <p>
              <strong>Method:</strong>{" "}
              {data.determinationMethod === "auto_client_form"
                ? "Automated Client Submission Form"
                : data.determinationMethod}
            </p>
            <Separator className="my-3" />
            <p className="text-muted-foreground/80">
              This certificate should be retained with transaction records for a
              minimum of 5 years.
            </p>
            <p className="font-medium text-foreground pt-2 flex items-center justify-center gap-2">
              <Building2 className="h-4 w-4" />
              {BRAND.name} • {BRAND.domain}
            </p>
          </div>
        </CardContent>
      </Card>

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
        }
      `}</style>
    </div>
  );
}

/**
 * Preview/Badge component for showing exemption status inline
 */
export function ExemptionBadge({
  certificateId,
  onClick,
}: {
  certificateId: string;
  onClick?: () => void;
}) {
  return (
    <Badge
      variant="secondary"
      className="bg-green-100 text-green-700 hover:bg-green-200 cursor-pointer gap-1.5"
      onClick={onClick}
    >
      <Shield className="h-3 w-3" />
      Exempt: {certificateId.slice(0, 16)}
    </Badge>
  );
}
