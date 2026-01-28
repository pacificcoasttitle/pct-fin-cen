"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Receipt, Download, Eye, DollarSign, Clock, CheckCircle, AlertTriangle, FileText, RefreshCw } from "lucide-react";
import { useDemo } from "@/hooks/use-demo";
import { format } from "date-fns";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
const FILING_FEE_CENTS = 7500; // $75 per filing

interface FiledReport {
  id: string;
  property_address_text: string | null;
  filed_at: string | null;
  receipt_id: string | null;
  status: string;
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export default function ClientInvoicesPage() {
  const { user } = useDemo();
  const [filedReports, setFiledReports] = useState<FiledReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFiledReports = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const response = await fetch(`${API_BASE_URL}/reports?status=filed&limit=50`);
      if (response.ok) {
        const data = await response.json();
        setFiledReports(data.reports || []);
      }
    } catch (error) {
      console.error("Failed to fetch filed reports:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchFiledReports();
  }, []);

  // Calculate stats from real data
  const totalFilings = filedReports.length;
  const totalBilledCents = totalFilings * FILING_FEE_CENTS;
  // For demo, assume all paid
  const totalPaidCents = totalBilledCents;
  const totalOutstandingCents = 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Billing & Invoices</h1>
          <p className="text-slate-500">View your filing charges and billing history</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => fetchFiledReports(true)}
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Paid</p>
                {loading ? (
                  <Skeleton className="h-6 w-24" />
                ) : (
                  <p className="text-xl font-bold">{formatCurrency(totalPaidCents)}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Outstanding</p>
                {loading ? (
                  <Skeleton className="h-6 w-24" />
                ) : (
                  <p className="text-xl font-bold">{formatCurrency(totalOutstandingCents)}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-lg">
                <Receipt className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Filings</p>
                {loading ? (
                  <Skeleton className="h-6 w-16" />
                ) : (
                  <p className="text-xl font-bold">{totalFilings}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filings Table */}
      <Card>
        <CardHeader>
          <CardTitle>Filing Charges</CardTitle>
          <CardDescription>
            Each completed filing is billed at {formatCurrency(FILING_FEE_CENTS)} per transaction
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between border-b pb-3">
                  <Skeleton className="h-4 w-[250px]" />
                  <Skeleton className="h-4 w-[80px]" />
                </div>
              ))}
            </div>
          ) : filedReports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No completed filings yet</p>
              <p className="text-sm">Charges will appear here once reports are filed with FinCEN</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Property</TableHead>
                    <TableHead>Filing Date</TableHead>
                    <TableHead>Receipt ID</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filedReports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell className="font-medium">
                        {report.property_address_text || "No address"}
                      </TableCell>
                      <TableCell className="text-slate-500">
                        {report.filed_at
                          ? format(new Date(report.filed_at), "MMM d, yyyy")
                          : "-"}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-slate-500">
                        {report.receipt_id || "-"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(FILING_FEE_CENTS)}
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-green-100 text-green-700">Paid</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Billing Summary */}
      {filedReports.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Billing Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-2 border-b">
                <span className="text-slate-500">Total Filings</span>
                <span className="font-medium">{totalFilings} @ {formatCurrency(FILING_FEE_CENTS)}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-slate-500">Subtotal</span>
                <span className="font-medium">{formatCurrency(totalBilledCents)}</span>
              </div>
              <div className="flex justify-between py-2 font-bold text-base">
                <span>Total Due</span>
                <span className="text-green-600">{formatCurrency(totalOutstandingCents)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Info */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-slate-600 space-y-2">
            <p>
              <strong>Payment Terms:</strong> Net 15 days from invoice date
            </p>
            <p>
              <strong>Accepted Methods:</strong> Check, ACH, Wire Transfer
            </p>
            <p>
              For questions about billing, please contact{" "}
              <a href="mailto:billing@finclear.com" className="text-blue-600 hover:underline">
                billing@finclear.com
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
