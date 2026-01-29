"use client";

import { useState, useEffect, useCallback } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Receipt, Download, Eye, DollarSign, Clock, CheckCircle2, AlertTriangle, FileText, RefreshCw, Calendar, Send, XCircle } from "lucide-react";
import { useDemo } from "@/hooks/use-demo";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

interface Invoice {
  id: string;
  invoice_number: string;
  company_id: string;
  period_start: string;
  period_end: string;
  subtotal_cents: number;
  tax_cents: number;
  discount_cents: number;
  total_cents: number;
  status: "draft" | "sent" | "paid" | "overdue" | "void";
  due_date: string;
  sent_at?: string;
  paid_at?: string;
  created_at: string;
  line_items?: {
    id: string;
    description: string;
    quantity: number;
    amount_cents: number;
    report_id?: string;
  }[];
}

const statusConfig = {
  draft: {
    label: "Draft",
    icon: FileText,
    className: "bg-slate-100 text-slate-700 border-slate-200",
  },
  sent: {
    label: "Sent",
    icon: Send,
    className: "bg-blue-100 text-blue-700 border-blue-200",
  },
  paid: {
    label: "Paid",
    icon: CheckCircle2,
    className: "bg-green-100 text-green-700 border-green-200",
  },
  overdue: {
    label: "Overdue",
    icon: AlertTriangle,
    className: "bg-red-100 text-red-700 border-red-200",
  },
  void: {
    label: "Void",
    icon: XCircle,
    className: "bg-gray-100 text-gray-700 border-gray-200",
  },
};

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function formatDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "N/A";
  }
}

export default function ClientInvoicesPage() {
  const { user } = useDemo();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  const fetchInvoices = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      // Fetch from real Invoice API - GAP 4 Fix
      const response = await fetch(`${API_BASE_URL}/invoices`);
      if (response.ok) {
        const data = await response.json();
        setInvoices(data.invoices || data || []);
      }
    } catch (error) {
      console.error("Failed to fetch invoices:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const fetchInvoiceDetail = async (invoiceId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/invoices/${invoiceId}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedInvoice(data);
        setDetailDialogOpen(true);
      }
    } catch (error) {
      console.error("Failed to fetch invoice detail:", error);
    }
  };

  // Calculate stats from real invoice data
  const paidInvoices = invoices.filter(i => i.status === "paid");
  const outstandingInvoices = invoices.filter(i => i.status === "sent" || i.status === "overdue");
  const totalPaidCents = paidInvoices.reduce((sum, i) => sum + i.total_cents, 0);
  const totalOutstandingCents = outstandingInvoices.reduce((sum, i) => sum + i.total_cents, 0);
  const overdueCount = invoices.filter(i => i.status === "overdue").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Billing & Invoices</h1>
          <p className="text-slate-500">View your invoices and billing history</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => fetchInvoices(true)}
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Receipt className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Invoices</p>
                {loading ? (
                  <Skeleton className="h-6 w-16" />
                ) : (
                  <p className="text-xl font-bold">{invoices.length}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Paid</p>
                {loading ? (
                  <Skeleton className="h-6 w-24" />
                ) : (
                  <p className="text-xl font-bold text-green-600">{formatCurrency(totalPaidCents)}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={totalOutstandingCents > 0 ? "border-amber-200" : ""}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${totalOutstandingCents > 0 ? "bg-amber-100" : "bg-slate-100"}`}>
                <Clock className={`h-5 w-5 ${totalOutstandingCents > 0 ? "text-amber-600" : "text-slate-600"}`} />
              </div>
              <div>
                <p className="text-sm text-slate-500">Outstanding</p>
                {loading ? (
                  <Skeleton className="h-6 w-24" />
                ) : (
                  <p className={`text-xl font-bold ${totalOutstandingCents > 0 ? "text-amber-600" : ""}`}>
                    {formatCurrency(totalOutstandingCents)}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={overdueCount > 0 ? "border-red-200" : ""}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${overdueCount > 0 ? "bg-red-100" : "bg-slate-100"}`}>
                <AlertTriangle className={`h-5 w-5 ${overdueCount > 0 ? "text-red-600" : "text-slate-600"}`} />
              </div>
              <div>
                <p className="text-sm text-slate-500">Overdue</p>
                {loading ? (
                  <Skeleton className="h-6 w-16" />
                ) : (
                  <p className={`text-xl font-bold ${overdueCount > 0 ? "text-red-600" : ""}`}>
                    {overdueCount}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
          <CardDescription>
            Your billing history and invoice details
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between border-b pb-3">
                  <Skeleton className="h-4 w-[200px]" />
                  <Skeleton className="h-4 w-[80px]" />
                </div>
              ))}
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No invoices yet</h3>
              <p className="text-sm">Invoices will appear here once generated</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => {
                    const status = statusConfig[invoice.status] || statusConfig.sent;
                    const StatusIcon = status.icon;
                    
                    return (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-mono font-medium">
                          {invoice.invoice_number}
                        </TableCell>
                        <TableCell className="text-slate-500">
                          {formatDate(invoice.period_start)} - {formatDate(invoice.period_end)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(invoice.total_cents)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={status.className}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className={
                              invoice.status === "overdue" ? "text-red-600 font-medium" : "text-slate-500"
                            }>
                              {formatDate(invoice.due_date)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => fetchInvoiceDetail(invoice.id)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Download className="h-4 w-4 mr-1" />
                              PDF
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

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

      {/* Invoice Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Invoice {selectedInvoice?.invoice_number}
            </DialogTitle>
            <DialogDescription>
              Invoice details and line items
            </DialogDescription>
          </DialogHeader>
          
          {selectedInvoice && (
            <div className="space-y-6">
              {/* Invoice Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Period</p>
                  <p className="font-medium">
                    {formatDate(selectedInvoice.period_start)} - {formatDate(selectedInvoice.period_end)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant="outline" className={statusConfig[selectedInvoice.status].className}>
                    {statusConfig[selectedInvoice.status].label}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Due Date</p>
                  <p className="font-medium">{formatDate(selectedInvoice.due_date)}</p>
                </div>
                {selectedInvoice.paid_at && (
                  <div>
                    <p className="text-sm text-muted-foreground">Paid On</p>
                    <p className="font-medium text-green-600">{formatDate(selectedInvoice.paid_at)}</p>
                  </div>
                )}
              </div>

              {/* Line Items */}
              {selectedInvoice.line_items && selectedInvoice.line_items.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Line Items</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-center">Qty</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedInvoice.line_items.map((item, index) => (
                        <TableRow key={item.id || index}>
                          <TableCell>{item.description}</TableCell>
                          <TableCell className="text-center">{item.quantity}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(item.amount_cents * item.quantity)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Totals */}
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(selectedInvoice.subtotal_cents)}</span>
                </div>
                {selectedInvoice.tax_cents > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax</span>
                    <span>{formatCurrency(selectedInvoice.tax_cents)}</span>
                  </div>
                )}
                {selectedInvoice.discount_cents > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span>-{formatCurrency(selectedInvoice.discount_cents)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total</span>
                  <span>{formatCurrency(selectedInvoice.total_cents)}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
