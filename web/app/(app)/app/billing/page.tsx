"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Receipt,
  DollarSign,
  Clock,
  CheckCircle2,
  FileText,
  RefreshCw,
  AlertCircle,
  Send,
  Eye,
  Download,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

interface BillingStats {
  outstanding_cents: number;
  outstanding_dollars: number;
  paid_cents: number;
  paid_dollars: number;
  pending_events_count: number;
  pending_events_cents: number;
  filing_fee_cents: number;
  filing_fee_dollars: number;
}

interface Invoice {
  id: string;
  invoice_number: string;
  period_start: string;
  period_end: string;
  total_cents: number;
  total_dollars: number;
  status: string;
  due_date: string;
  line_items_count: number;
  created_at: string;
  line_items?: BillingEvent[];
}

interface BillingEvent {
  id: string;
  event_type: string;
  description: string;
  amount_cents: number;
  amount_dollars: number;
  quantity: number;
  total_cents: number;
  total_dollars: number;
  status: string;
  invoice_number?: string;
  created_at: string;
}

const statusConfig: Record<string, { label: string; icon: any; className: string }> = {
  draft: { label: "Draft", icon: FileText, className: "bg-slate-100 text-slate-700" },
  sent: { label: "Sent", icon: Send, className: "bg-blue-100 text-blue-700" },
  paid: { label: "Paid", icon: CheckCircle2, className: "bg-green-100 text-green-700" },
  overdue: { label: "Overdue", icon: AlertCircle, className: "bg-red-100 text-red-700" },
  pending: { label: "Pending", icon: Clock, className: "bg-amber-100 text-amber-700" },
  invoiced: { label: "Invoiced", icon: Receipt, className: "bg-blue-100 text-blue-700" },
};

export default function ClientBillingPage() {
  const { toast } = useToast();
  const [stats, setStats] = useState<BillingStats | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [activity, setActivity] = useState<BillingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("invoices");
  
  // Invoice detail
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  
  // PDF download
  const [downloadingPdf, setDownloadingPdf] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/billing/my/stats`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  }, []);

  const fetchInvoices = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/billing/my/invoices`);
      if (response.ok) {
        const data = await response.json();
        setInvoices(data.invoices || []);
      }
    } catch (error) {
      console.error("Failed to fetch invoices:", error);
    }
  }, []);

  const fetchActivity = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/billing/my/activity`);
      if (response.ok) {
        const data = await response.json();
        setActivity(data.events || []);
      }
    } catch (error) {
      console.error("Failed to fetch activity:", error);
    }
  }, []);

  const fetchInvoiceDetail = async (invoiceId: string) => {
    setLoadingDetail(true);
    try {
      const response = await fetch(`${API_BASE_URL}/billing/my/invoices/${invoiceId}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedInvoice(data);
        setDetailOpen(true);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load invoice details",
        variant: "destructive",
      });
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([fetchStats(), fetchInvoices(), fetchActivity()]);
      setLoading(false);
    };
    loadAll();
  }, [fetchStats, fetchInvoices, fetchActivity]);

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "N/A";
    }
  };

  const handleDownloadPdf = async (invoiceId: string, invoiceNumber: string) => {
    setDownloadingPdf(invoiceId);
    try {
      const response = await fetch(`${API_BASE_URL}/billing/my/invoices/${invoiceId}/pdf`);
      if (response.ok) {
        const contentType = response.headers.get("content-type");
        if (contentType?.includes("application/pdf")) {
          // Real PDF - download it
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${invoiceNumber}.pdf`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          toast({ title: "PDF Downloaded", description: `${invoiceNumber}.pdf` });
        } else {
          // HTML fallback - open in new tab for preview
          const html = await response.text();
          const newWindow = window.open();
          if (newWindow) {
            newWindow.document.write(html);
            newWindow.document.close();
          }
          toast({ 
            title: "Invoice Preview", 
            description: "Displaying invoice preview",
          });
        }
      } else {
        const err = await response.json();
        toast({ title: "Error", description: err.detail || "Failed to download PDF", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to download PDF", variant: "destructive" });
    } finally {
      setDownloadingPdf(null);
    }
  };

  const refresh = () => {
    fetchStats();
    fetchInvoices();
    fetchActivity();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Billing</h1>
          <p className="text-slate-500">View your invoices and billing activity</p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-100 rounded-xl">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Outstanding</p>
                {loading ? (
                  <Skeleton className="h-7 w-20 mt-1" />
                ) : (
                  <p className="text-2xl font-bold">{formatCurrency(stats?.outstanding_cents || 0)}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-green-100 rounded-xl">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Paid (YTD)</p>
                {loading ? (
                  <Skeleton className="h-7 w-20 mt-1" />
                ) : (
                  <p className="text-2xl font-bold">{formatCurrency(stats?.paid_cents || 0)}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-100 rounded-xl">
                <Receipt className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Pending Charges</p>
                {loading ? (
                  <Skeleton className="h-7 w-16 mt-1" />
                ) : (
                  <p className="text-2xl font-bold">{stats?.pending_events_count || 0}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-purple-100 rounded-xl">
                <DollarSign className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Your Rate</p>
                {loading ? (
                  <Skeleton className="h-7 w-16 mt-1" />
                ) : (
                  <p className="text-2xl font-bold">{formatCurrency(stats?.filing_fee_cents || 7500)}/filing</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Card>
        <CardContent className="pt-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="invoices" className="flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                Invoices
              </TabsTrigger>
              <TabsTrigger value="activity" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Activity
              </TabsTrigger>
            </TabsList>

            {/* Invoices Tab */}
            <TabsContent value="invoices">
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : invoices.length === 0 ? (
                <div className="text-center py-12">
                  <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No invoices yet</h3>
                  <p className="text-muted-foreground">
                    Invoices will appear here once your filings are billed.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice) => {
                      const StatusIcon = statusConfig[invoice.status]?.icon || FileText;
                      return (
                        <TableRow key={invoice.id}>
                          <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDate(invoice.period_start)} - {formatDate(invoice.period_end)}
                          </TableCell>
                          <TableCell className="font-semibold">
                            {formatCurrency(invoice.total_cents)}
                          </TableCell>
                          <TableCell>
                            <Badge className={statusConfig[invoice.status]?.className || ""}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {statusConfig[invoice.status]?.label || invoice.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {invoice.due_date ? formatDate(invoice.due_date) : "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDownloadPdf(invoice.id, invoice.invoice_number)}
                                disabled={downloadingPdf === invoice.id}
                              >
                                {downloadingPdf === invoice.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Download className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => fetchInvoiceDetail(invoice.id)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            {/* Activity Tab */}
            <TabsContent value="activity">
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : activity.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No billing activity</h3>
                  <p className="text-muted-foreground">
                    Billing events will appear here as filings are completed.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activity.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell className="text-muted-foreground">
                          {formatDate(event.created_at)}
                        </TableCell>
                        <TableCell>{event.description}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {event.event_type.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className={event.amount_cents < 0 ? "text-green-600" : "font-semibold"}>
                          {event.amount_cents < 0 ? "-" : ""}{formatCurrency(Math.abs(event.total_cents))}
                        </TableCell>
                        <TableCell>
                          <Badge className={statusConfig[event.status]?.className || ""}>
                            {statusConfig[event.status]?.label || event.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Invoice Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Invoice {selectedInvoice?.invoice_number}</DialogTitle>
            <DialogDescription>
              {selectedInvoice && `${formatDate(selectedInvoice.period_start)} - ${formatDate(selectedInvoice.period_end)}`}
            </DialogDescription>
          </DialogHeader>
          
          {loadingDetail ? (
            <div className="space-y-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : selectedInvoice ? (
            <div className="space-y-4">
              {/* Status and Due */}
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge className={statusConfig[selectedInvoice.status]?.className || ""}>
                    {statusConfig[selectedInvoice.status]?.label || selectedInvoice.status}
                  </Badge>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Due Date</p>
                  <p className="font-medium">
                    {selectedInvoice.due_date ? formatDate(selectedInvoice.due_date) : "—"}
                  </p>
                </div>
              </div>

              {/* Line Items */}
              {selectedInvoice.line_items && selectedInvoice.line_items.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Line Items</h4>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedInvoice.line_items.map((item, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="text-sm">{item.description}</TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(item.total_cents)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Total */}
              <div className="flex justify-between items-center p-3 bg-primary/5 rounded-lg border-2 border-primary/20">
                <span className="font-semibold">Total</span>
                <span className="text-xl font-bold">
                  {formatCurrency(selectedInvoice.total_cents)}
                </span>
              </div>
              
              {/* Download PDF Button */}
              <div className="flex justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => handleDownloadPdf(selectedInvoice.id, selectedInvoice.invoice_number)}
                  disabled={downloadingPdf === selectedInvoice.id}
                >
                  {downloadingPdf === selectedInvoice.id ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Download PDF
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
