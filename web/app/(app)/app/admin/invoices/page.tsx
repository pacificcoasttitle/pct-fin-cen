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
import { Input } from "@/components/ui/input";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Receipt,
  Search,
  RefreshCw,
  Download,
  Send,
  CheckCircle2,
  Clock,
  AlertCircle,
  MoreHorizontal,
  Eye,
  FileText,
  DollarSign,
  Building2,
  Calendar,
  Loader2,
  XCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

interface Invoice {
  id: string;
  invoice_number: string;
  company_id: string;
  company_name?: string;
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

interface InvoiceStats {
  total_invoices: number;
  total_outstanding: number;
  paid_this_month: number;
  overdue_count: number;
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
    icon: AlertCircle,
    className: "bg-red-100 text-red-700 border-red-200",
  },
  void: {
    label: "Void",
    icon: XCircle,
    className: "bg-gray-100 text-gray-700 border-gray-200",
  },
};

interface CompanyOption {
  id: string;
  name: string;
}

export default function AdminInvoicesPage() {
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState<InvoiceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // Generate Invoice Dialog State
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [periodStart, setPeriodStart] = useState<string>("");
  const [periodEnd, setPeriodEnd] = useState<string>("");
  const [unbilledCount, setUnbilledCount] = useState<number>(0);
  const [unbilledTotal, setUnbilledTotal] = useState<number>(0);
  const [generating, setGenerating] = useState(false);
  
  // Manual Billing Event Dialog State
  const [showBillingEventDialog, setShowBillingEventDialog] = useState(false);
  const [eventCompanyId, setEventCompanyId] = useState<string>("");
  const [eventType, setEventType] = useState<string>("manual_adjustment");
  const [eventDescription, setEventDescription] = useState<string>("");
  const [eventAmount, setEventAmount] = useState<string>("");
  const [isCredit, setIsCredit] = useState(false);
  const [creatingEvent, setCreatingEvent] = useState(false);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/invoices`);
      if (!response.ok) throw new Error("Failed to fetch invoices");
      const data = await response.json();
      setInvoices(data.invoices || data);
      
      // Calculate stats
      const stats: InvoiceStats = {
        total_invoices: (data.invoices || data).length,
        total_outstanding: (data.invoices || data)
          .filter((i: Invoice) => i.status === "sent" || i.status === "overdue")
          .reduce((sum: number, i: Invoice) => sum + i.total_cents, 0),
        paid_this_month: (data.invoices || data)
          .filter((i: Invoice) => i.status === "paid" && i.paid_at && 
            new Date(i.paid_at).getMonth() === new Date().getMonth())
          .reduce((sum: number, i: Invoice) => sum + i.total_cents, 0),
        overdue_count: (data.invoices || data)
          .filter((i: Invoice) => i.status === "overdue").length,
      };
      setStats(stats);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      toast({
        title: "Error",
        description: "Failed to load invoices",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchInvoices();
    fetchCompanies();
  }, [fetchInvoices]);
  
  // Fetch companies for dropdown
  const fetchCompanies = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/companies?company_type=client`);
      if (response.ok) {
        const data = await response.json();
        setCompanies(data.companies || []);
      }
    } catch (error) {
      console.error("Failed to fetch companies:", error);
    }
  };
  
  // Check unbilled events when company/dates selected
  useEffect(() => {
    if (selectedCompanyId && periodStart && periodEnd) {
      checkUnbilledEvents();
    }
  }, [selectedCompanyId, periodStart, periodEnd]);
  
  const checkUnbilledEvents = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/invoices/billing-events?company_id=${selectedCompanyId}&unbilled_only=true`
      );
      if (response.ok) {
        const data = await response.json();
        // Filter by date range client-side for now
        const events = data.billing_events || [];
        const start = new Date(periodStart);
        const end = new Date(periodEnd);
        end.setHours(23, 59, 59, 999);
        
        const filtered = events.filter((e: any) => {
          const eventDate = new Date(e.created_at);
          return eventDate >= start && eventDate <= end;
        });
        
        setUnbilledCount(filtered.length);
        setUnbilledTotal(filtered.reduce((sum: number, e: any) => sum + (e.amount_cents * e.quantity), 0));
      }
    } catch (error) {
      console.error("Failed to check unbilled events:", error);
    }
  };
  
  // Generate invoice
  const generateInvoice = async () => {
    if (!selectedCompanyId || !periodStart || !periodEnd) return;
    
    setGenerating(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/invoices/generate?company_id=${selectedCompanyId}&period_start=${periodStart}&period_end=${periodEnd}`,
        { method: "POST" }
      );
      
      if (response.ok) {
        const data = await response.json();
        toast({
          title: "Invoice Generated",
          description: `Invoice ${data.invoice_number} created for ${formatCurrency(data.total_cents)}`,
        });
        setShowGenerateDialog(false);
        setSelectedCompanyId("");
        setPeriodStart("");
        setPeriodEnd("");
        setUnbilledCount(0);
        setUnbilledTotal(0);
        fetchInvoices();
      } else {
        const data = await response.json();
        toast({
          title: "Error",
          description: data.detail || "Failed to generate invoice",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate invoice",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };
  
  // Create manual billing event
  const createBillingEvent = async () => {
    if (!eventCompanyId || !eventDescription || !eventAmount) return;
    
    setCreatingEvent(true);
    try {
      const amountCents = Math.round(parseFloat(eventAmount) * 100);
      const finalAmount = isCredit ? -Math.abs(amountCents) : Math.abs(amountCents);
      
      const response = await fetch(`${API_BASE_URL}/invoices/billing-events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id: eventCompanyId,
          event_type: eventType,
          description: eventDescription,
          amount_cents: finalAmount,
        }),
      });
      
      if (response.ok) {
        toast({
          title: isCredit ? "Credit Applied" : "Billing Event Created",
          description: `${eventDescription} - ${formatCurrency(Math.abs(finalAmount))}`,
        });
        setShowBillingEventDialog(false);
        setEventCompanyId("");
        setEventDescription("");
        setEventAmount("");
        setIsCredit(false);
      } else {
        const data = await response.json();
        toast({
          title: "Error",
          description: data.detail || "Failed to create billing event",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create billing event",
        variant: "destructive",
      });
    } finally {
      setCreatingEvent(false);
    }
  };

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

  const updateInvoiceStatus = async (invoiceId: string, status: string) => {
    setActionLoading(invoiceId);
    try {
      const response = await fetch(`${API_BASE_URL}/invoices/${invoiceId}/status?status=${status}`, {
        method: "PATCH",
      });
      if (!response.ok) throw new Error("Failed to update invoice");
      
      toast({
        title: "Invoice Updated",
        description: `Invoice marked as ${status}`,
      });
      
      fetchInvoices();
      setDetailDialogOpen(false);
    } catch (error) {
      console.error("Error updating invoice:", error);
      toast({
        title: "Error",
        description: "Failed to update invoice",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const fetchInvoiceDetail = async (invoiceId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/invoices/${invoiceId}`);
      if (!response.ok) throw new Error("Failed to fetch invoice detail");
      const data = await response.json();
      setSelectedInvoice(data);
      setDetailDialogOpen(true);
    } catch (error) {
      console.error("Error fetching invoice detail:", error);
      toast({
        title: "Error",
        description: "Failed to load invoice details",
        variant: "destructive",
      });
    }
  };

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch =
      invoice.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (invoice.company_name || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Invoice Management</h1>
          <p className="text-slate-500">Manage billing and invoices for client companies</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowBillingEventDialog(true)}>
            <DollarSign className="h-4 w-4 mr-2" />
            Add Billing Event
          </Button>
          <Button size="sm" onClick={() => setShowGenerateDialog(true)}>
            <Receipt className="h-4 w-4 mr-2" />
            Generate Invoice
          </Button>
          <Button variant="ghost" size="icon" onClick={fetchInvoices}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/10 rounded-xl">
                <Receipt className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Total Invoices</p>
                {loading ? (
                  <Skeleton className="h-7 w-16 mt-1" />
                ) : (
                  <p className="text-2xl font-bold">{stats?.total_invoices || 0}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-100 rounded-xl">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Outstanding</p>
                {loading ? (
                  <Skeleton className="h-7 w-24 mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-amber-600">
                    {formatCurrency(stats?.total_outstanding || 0)}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-green-100 rounded-xl">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Paid This Month</p>
                {loading ? (
                  <Skeleton className="h-7 w-24 mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(stats?.paid_this_month || 0)}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={stats?.overdue_count ? "border-red-200" : ""}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${stats?.overdue_count ? "bg-red-100" : "bg-slate-100"}`}>
                <AlertCircle className={`h-5 w-5 ${stats?.overdue_count ? "text-red-600" : "text-slate-600"}`} />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Overdue</p>
                {loading ? (
                  <Skeleton className="h-7 w-16 mt-1" />
                ) : (
                  <p className={`text-2xl font-bold ${stats?.overdue_count ? "text-red-600" : ""}`}>
                    {stats?.overdue_count || 0}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoice List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Invoices</CardTitle>
              <CardDescription>
                {filteredInvoices.length} {filteredInvoices.length === 1 ? "invoice" : "invoices"}
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search invoices..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-[200px]"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="void">Void</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-[200px]" />
                    <Skeleton className="h-4 w-[150px]" />
                  </div>
                  <Skeleton className="h-8 w-24" />
                </div>
              ))}
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="text-center py-12">
              <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No invoices found</h3>
              <p className="text-muted-foreground">
                {searchQuery || statusFilter !== "all"
                  ? "Try adjusting your search or filters"
                  : "Invoices will appear here when billing events are generated"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((invoice) => {
                  const status = statusConfig[invoice.status] || statusConfig.draft;
                  const StatusIcon = status.icon;
                  
                  return (
                    <TableRow key={invoice.id}>
                      <TableCell>
                        <div className="font-mono font-medium">{invoice.invoice_number}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span>{invoice.company_name || "Client Company"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {formatDate(invoice.period_start)} - {formatDate(invoice.period_end)}
                        </div>
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
                            invoice.status === "overdue" ? "text-red-600 font-medium" : ""
                          }>
                            {formatDate(invoice.due_date)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => fetchInvoiceDetail(invoice.id)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            {invoice.status === "draft" && (
                              <DropdownMenuItem onClick={() => updateInvoiceStatus(invoice.id, "sent")}>
                                <Send className="h-4 w-4 mr-2" />
                                Mark as Sent
                              </DropdownMenuItem>
                            )}
                            {(invoice.status === "sent" || invoice.status === "overdue") && (
                              <DropdownMenuItem onClick={() => updateInvoiceStatus(invoice.id, "paid")}>
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Mark as Paid
                              </DropdownMenuItem>
                            )}
                            {invoice.status !== "void" && invoice.status !== "paid" && (
                              <DropdownMenuItem 
                                onClick={() => updateInvoiceStatus(invoice.id, "void")}
                                className="text-red-600"
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Void Invoice
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem>
                              <Download className="h-4 w-4 mr-2" />
                              Download PDF
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
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
                  <p className="text-sm text-muted-foreground">Company</p>
                  <p className="font-medium">{selectedInvoice.company_name || "Client Company"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant="outline" className={statusConfig[selectedInvoice.status].className}>
                    {statusConfig[selectedInvoice.status].label}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Period</p>
                  <p className="font-medium">
                    {formatDate(selectedInvoice.period_start)} - {formatDate(selectedInvoice.period_end)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Due Date</p>
                  <p className="font-medium">{formatDate(selectedInvoice.due_date)}</p>
                </div>
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
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>
              Close
            </Button>
            {selectedInvoice?.status === "draft" && (
              <Button 
                onClick={() => updateInvoiceStatus(selectedInvoice.id, "sent")}
                disabled={actionLoading === selectedInvoice.id}
              >
                {actionLoading === selectedInvoice.id && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                <Send className="h-4 w-4 mr-2" />
                Send Invoice
              </Button>
            )}
            {(selectedInvoice?.status === "sent" || selectedInvoice?.status === "overdue") && (
              <Button 
                onClick={() => updateInvoiceStatus(selectedInvoice.id, "paid")}
                disabled={actionLoading === selectedInvoice.id}
                className="bg-green-600 hover:bg-green-700"
              >
                {actionLoading === selectedInvoice.id && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Mark as Paid
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Generate Invoice Dialog */}
      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Invoice</DialogTitle>
            <DialogDescription>
              Create an invoice from unbilled events for a billing period.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Company Select */}
            <div>
              <label className="block text-sm font-medium mb-1">Company</label>
              <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select company..." />
                </SelectTrigger>
                <SelectContent>
                  {companies.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Period Start</label>
                <Input
                  type="date"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Period End</label>
                <Input
                  type="date"
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                />
              </div>
            </div>
            
            {/* Preview */}
            {selectedCompanyId && periodStart && periodEnd && (
              <div className="p-3 bg-slate-50 rounded-lg border">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium">{unbilledCount} unbilled events</p>
                    <p className="text-xs text-muted-foreground">in selected period</p>
                  </div>
                  <p className="text-lg font-bold">{formatCurrency(unbilledTotal)}</p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGenerateDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={generateInvoice}
              disabled={!selectedCompanyId || !periodStart || !periodEnd || unbilledCount === 0 || generating}
            >
              {generating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Generate Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Manual Billing Event Dialog */}
      <Dialog open={showBillingEventDialog} onOpenChange={setShowBillingEventDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Billing Event</DialogTitle>
            <DialogDescription>
              Add a manual charge, credit, or adjustment.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Company Select */}
            <div>
              <label className="block text-sm font-medium mb-1">Company</label>
              <Select value={eventCompanyId} onValueChange={setEventCompanyId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select company..." />
                </SelectTrigger>
                <SelectContent>
                  {companies.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Event Type */}
            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <Select value={eventType} onValueChange={setEventType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual_adjustment">Manual Adjustment</SelectItem>
                  <SelectItem value="credit">Credit</SelectItem>
                  <SelectItem value="expedite_fee">Expedite Fee</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Amount */}
            <div>
              <label className="block text-sm font-medium mb-1">Amount</label>
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                  <Input
                    type="number"
                    step="0.01"
                    value={eventAmount}
                    onChange={(e) => setEventAmount(e.target.value)}
                    className="pl-7"
                    placeholder="0.00"
                  />
                </div>
                <label className="flex items-center gap-2 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={isCredit}
                    onChange={(e) => setIsCredit(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">Credit (negative)</span>
                </label>
              </div>
            </div>
            
            {/* Description */}
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                value={eventDescription}
                onChange={(e) => setEventDescription(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border rounded-md text-sm resize-none"
                placeholder="Reason for this charge or credit..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBillingEventDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={createBillingEvent}
              disabled={!eventCompanyId || !eventDescription || !eventAmount || creatingEvent}
            >
              {creatingEvent && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isCredit ? "Apply Credit" : "Create Event"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
