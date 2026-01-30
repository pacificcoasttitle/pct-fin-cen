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
import { Label } from "@/components/ui/label";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Receipt,
  DollarSign,
  Clock,
  CheckCircle2,
  FileText,
  RefreshCw,
  AlertCircle,
  Send,
  Plus,
  Building2,
  MoreHorizontal,
  Eye,
  XCircle,
  Edit,
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
  companies_count: number;
}

interface Invoice {
  id: string;
  company_id: string;
  company_name: string;
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
  company_id: string;
  company_name: string;
  event_type: string;
  description: string;
  amount_cents: number;
  amount_dollars: number;
  quantity: number;
  total_cents: number;
  total_dollars: float;
  status: string;
  invoice_number?: string;
  created_at: string;
}

interface CompanyRate {
  company_id: string;
  company_name: string;
  company_code: string;
  filing_fee_cents: number;
  filing_fee_dollars: number;
  payment_terms_days: number;
  billing_notes: string | null;
  total_billed_cents: number;
  total_billed_dollars: number;
  filings_count: number;
}

interface CompanyOption {
  id: string;
  name: string;
}

const statusConfig: Record<string, { label: string; icon: any; className: string }> = {
  draft: { label: "Draft", icon: FileText, className: "bg-slate-100 text-slate-700" },
  sent: { label: "Sent", icon: Send, className: "bg-blue-100 text-blue-700" },
  paid: { label: "Paid", icon: CheckCircle2, className: "bg-green-100 text-green-700" },
  overdue: { label: "Overdue", icon: AlertCircle, className: "bg-red-100 text-red-700" },
  void: { label: "Void", icon: XCircle, className: "bg-gray-100 text-gray-500" },
  pending: { label: "Pending", icon: Clock, className: "bg-amber-100 text-amber-700" },
  invoiced: { label: "Invoiced", icon: Receipt, className: "bg-blue-100 text-blue-700" },
};

export default function AdminBillingPage() {
  const { toast } = useToast();
  const [stats, setStats] = useState<BillingStats | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [events, setEvents] = useState<BillingEvent[]>([]);
  const [rates, setRates] = useState<CompanyRate[]>([]);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("invoices");

  // Filters
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState("all");
  const [eventStatusFilter, setEventStatusFilter] = useState("all");
  const [companyFilter, setCompanyFilter] = useState("all");

  // Invoice detail
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Generate Invoice Dialog
  const [generateOpen, setGenerateOpen] = useState(false);
  const [generateCompanyId, setGenerateCompanyId] = useState("");
  const [generateStart, setGenerateStart] = useState("");
  const [generateEnd, setGenerateEnd] = useState("");
  const [generating, setGenerating] = useState(false);

  // Add Event Dialog
  const [eventOpen, setEventOpen] = useState(false);
  const [eventCompanyId, setEventCompanyId] = useState("");
  const [eventType, setEventType] = useState("manual_adjustment");
  const [eventDescription, setEventDescription] = useState("");
  const [eventAmount, setEventAmount] = useState("");
  const [isCredit, setIsCredit] = useState(false);
  const [creatingEvent, setCreatingEvent] = useState(false);

  // Edit Rate Dialog
  const [editRateOpen, setEditRateOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<CompanyRate | null>(null);
  const [editFilingFee, setEditFilingFee] = useState("");
  const [editPaymentTerms, setEditPaymentTerms] = useState("");
  const [editBillingNotes, setEditBillingNotes] = useState("");
  const [savingRate, setSavingRate] = useState(false);

  // Fetch functions
  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/billing/admin/stats`);
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
      const params = new URLSearchParams();
      if (invoiceStatusFilter !== "all") params.set("status", invoiceStatusFilter);
      if (companyFilter !== "all") params.set("company_id", companyFilter);
      
      const response = await fetch(`${API_BASE_URL}/billing/admin/invoices?${params}`);
      if (response.ok) {
        const data = await response.json();
        setInvoices(data.invoices || []);
      }
    } catch (error) {
      console.error("Failed to fetch invoices:", error);
    }
  }, [invoiceStatusFilter, companyFilter]);

  const fetchEvents = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (eventStatusFilter !== "all") params.set("status", eventStatusFilter);
      if (companyFilter !== "all") params.set("company_id", companyFilter);
      
      const response = await fetch(`${API_BASE_URL}/billing/admin/events?${params}`);
      if (response.ok) {
        const data = await response.json();
        setEvents(data.events || []);
      }
    } catch (error) {
      console.error("Failed to fetch events:", error);
    }
  }, [eventStatusFilter, companyFilter]);

  const fetchRates = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/billing/admin/rates`);
      if (response.ok) {
        const data = await response.json();
        setRates(data.rates || []);
        // Build companies list from rates
        setCompanies(data.rates.map((r: CompanyRate) => ({ id: r.company_id, name: r.company_name })));
      }
    } catch (error) {
      console.error("Failed to fetch rates:", error);
    }
  }, []);

  const fetchInvoiceDetail = async (invoiceId: string) => {
    setLoadingDetail(true);
    try {
      const response = await fetch(`${API_BASE_URL}/billing/admin/invoices/${invoiceId}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedInvoice(data);
        setDetailOpen(true);
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to load invoice", variant: "destructive" });
    } finally {
      setLoadingDetail(false);
    }
  };

  // Actions
  const updateInvoiceStatus = async (invoiceId: string, status: string) => {
    setActionLoading(invoiceId);
    try {
      const response = await fetch(`${API_BASE_URL}/billing/admin/invoices/${invoiceId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (response.ok) {
        toast({ title: "Success", description: `Invoice marked as ${status}` });
        fetchInvoices();
        fetchStats();
        if (selectedInvoice?.id === invoiceId) {
          setSelectedInvoice({ ...selectedInvoice, status });
        }
      } else {
        const err = await response.json();
        toast({ title: "Error", description: err.detail || "Failed", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleGenerateInvoice = async () => {
    if (!generateCompanyId || !generateStart || !generateEnd) return;
    setGenerating(true);
    try {
      const response = await fetch(`${API_BASE_URL}/billing/admin/invoices/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id: generateCompanyId,
          period_start: generateStart,
          period_end: generateEnd,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        toast({ title: "Invoice Generated", description: `${data.invoice_number} - ${formatCurrency(data.total_cents)}` });
        setGenerateOpen(false);
        setGenerateCompanyId("");
        setGenerateStart("");
        setGenerateEnd("");
        fetchInvoices();
        fetchStats();
        fetchEvents();
      } else {
        const err = await response.json();
        toast({ title: "Error", description: err.detail || "Failed to generate", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to generate invoice", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const handleCreateEvent = async () => {
    if (!eventCompanyId || !eventDescription || !eventAmount) return;
    setCreatingEvent(true);
    try {
      const amountCents = Math.round(parseFloat(eventAmount) * 100);
      const finalAmount = isCredit ? -Math.abs(amountCents) : Math.abs(amountCents);
      
      const response = await fetch(`${API_BASE_URL}/billing/admin/events`, {
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
        toast({ title: isCredit ? "Credit Applied" : "Event Created", description: eventDescription });
        setEventOpen(false);
        setEventCompanyId("");
        setEventDescription("");
        setEventAmount("");
        setIsCredit(false);
        fetchEvents();
        fetchStats();
      } else {
        const err = await response.json();
        toast({ title: "Error", description: err.detail || "Failed", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to create event", variant: "destructive" });
    } finally {
      setCreatingEvent(false);
    }
  };

  const handleSaveRate = async () => {
    if (!editingRate) return;
    setSavingRate(true);
    try {
      const response = await fetch(`${API_BASE_URL}/billing/admin/rates/${editingRate.company_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filing_fee_cents: Math.round(parseFloat(editFilingFee) * 100),
          payment_terms_days: parseInt(editPaymentTerms),
          billing_notes: editBillingNotes || null,
        }),
      });
      if (response.ok) {
        toast({ title: "Success", description: "Rate updated" });
        setEditRateOpen(false);
        fetchRates();
      } else {
        const err = await response.json();
        toast({ title: "Error", description: err.detail || "Failed", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to update rate", variant: "destructive" });
    } finally {
      setSavingRate(false);
    }
  };

  const openEditRate = (rate: CompanyRate) => {
    setEditingRate(rate);
    setEditFilingFee(String(rate.filing_fee_dollars));
    setEditPaymentTerms(String(rate.payment_terms_days));
    setEditBillingNotes(rate.billing_notes || "");
    setEditRateOpen(true);
  };

  // Load data
  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([fetchStats(), fetchRates()]);
      setLoading(false);
    };
    loadAll();
  }, [fetchStats, fetchRates]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return "N/A";
    }
  };

  const refresh = () => {
    fetchStats();
    fetchInvoices();
    fetchEvents();
    fetchRates();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Billing Management</h1>
          <p className="text-slate-500">Manage invoices, billing events, and company rates</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setEventOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Event
          </Button>
          <Button size="sm" onClick={() => setGenerateOpen(true)}>
            <Receipt className="h-4 w-4 mr-2" />
            Generate Invoice
          </Button>
          <Button variant="ghost" size="icon" onClick={refresh}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
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
                {loading ? <Skeleton className="h-7 w-20 mt-1" /> : (
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
                <p className="text-xs text-slate-500 uppercase tracking-wide">Collected (Month)</p>
                {loading ? <Skeleton className="h-7 w-20 mt-1" /> : (
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
                <p className="text-xs text-slate-500 uppercase tracking-wide">Pending Events</p>
                {loading ? <Skeleton className="h-7 w-16 mt-1" /> : (
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
                <Building2 className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Companies</p>
                {loading ? <Skeleton className="h-7 w-12 mt-1" /> : (
                  <p className="text-2xl font-bold">{stats?.companies_count || 0}</p>
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <TabsList>
                <TabsTrigger value="invoices">Invoices</TabsTrigger>
                <TabsTrigger value="events">Billing Events</TabsTrigger>
                <TabsTrigger value="rates">Company Rates</TabsTrigger>
              </TabsList>
              
              {/* Filters */}
              {(activeTab === "invoices" || activeTab === "events") && (
                <div className="flex items-center gap-2">
                  <Select value={companyFilter} onValueChange={setCompanyFilter}>
                    <SelectTrigger className="w-[180px]">
                      <Building2 className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="All Companies" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Companies</SelectItem>
                      {companies.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {activeTab === "invoices" && (
                    <Select value={invoiceStatusFilter} onValueChange={setInvoiceStatusFilter}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="All Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="sent">Sent</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="overdue">Overdue</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  
                  {activeTab === "events" && (
                    <Select value={eventStatusFilter} onValueChange={setEventStatusFilter}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="All Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="invoiced">Invoiced</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}
            </div>

            {/* Invoices Tab */}
            <TabsContent value="invoices">
              {invoices.length === 0 ? (
                <div className="text-center py-12">
                  <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No invoices found</h3>
                  <p className="text-muted-foreground">Generate an invoice to get started.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Due</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((inv) => {
                      const StatusIcon = statusConfig[inv.status]?.icon || FileText;
                      return (
                        <TableRow key={inv.id}>
                          <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                          <TableCell>{inv.company_name}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {formatDate(inv.period_start)} - {formatDate(inv.period_end)}
                          </TableCell>
                          <TableCell className="font-semibold">{formatCurrency(inv.total_cents)}</TableCell>
                          <TableCell>
                            <Badge className={statusConfig[inv.status]?.className || ""}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {statusConfig[inv.status]?.label || inv.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {inv.due_date ? formatDate(inv.due_date) : "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => fetchInvoiceDetail(inv.id)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                {inv.status === "draft" && (
                                  <DropdownMenuItem onClick={() => updateInvoiceStatus(inv.id, "sent")}>
                                    <Send className="h-4 w-4 mr-2" />
                                    Mark as Sent
                                  </DropdownMenuItem>
                                )}
                                {(inv.status === "sent" || inv.status === "overdue") && (
                                  <DropdownMenuItem onClick={() => updateInvoiceStatus(inv.id, "paid")}>
                                    <CheckCircle2 className="h-4 w-4 mr-2" />
                                    Mark as Paid
                                  </DropdownMenuItem>
                                )}
                                {inv.status !== "void" && inv.status !== "paid" && (
                                  <DropdownMenuItem 
                                    onClick={() => updateInvoiceStatus(inv.id, "void")}
                                    className="text-red-600"
                                  >
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Void
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            {/* Events Tab */}
            <TabsContent value="events">
              {events.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No billing events</h3>
                  <p className="text-muted-foreground">Events are created when filings are accepted.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell className="text-muted-foreground">{formatDate(event.created_at)}</TableCell>
                        <TableCell>{event.company_name}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{event.description}</TableCell>
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

            {/* Rates Tab */}
            <TabsContent value="rates">
              {rates.length === 0 ? (
                <div className="text-center py-12">
                  <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No companies</h3>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Filing Fee</TableHead>
                      <TableHead>Payment Terms</TableHead>
                      <TableHead>Total Billed</TableHead>
                      <TableHead>Filings</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rates.map((rate) => (
                      <TableRow key={rate.company_id}>
                        <TableCell className="font-medium">{rate.company_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono">{rate.company_code}</Badge>
                        </TableCell>
                        <TableCell className="font-semibold text-green-600">
                          {formatCurrency(rate.filing_fee_cents)}
                        </TableCell>
                        <TableCell>Net {rate.payment_terms_days}</TableCell>
                        <TableCell>{formatCurrency(rate.total_billed_cents)}</TableCell>
                        <TableCell>{rate.filings_count}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => openEditRate(rate)}>
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
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
            <DialogDescription>{selectedInvoice?.company_name}</DialogDescription>
          </DialogHeader>
          {loadingDetail ? (
            <Skeleton className="h-32 w-full" />
          ) : selectedInvoice ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge className={statusConfig[selectedInvoice.status]?.className || ""}>
                    {statusConfig[selectedInvoice.status]?.label || selectedInvoice.status}
                  </Badge>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Due Date</p>
                  <p className="font-medium">{selectedInvoice.due_date ? formatDate(selectedInvoice.due_date) : "—"}</p>
                </div>
              </div>
              
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
                            <TableCell className="text-right">{formatCurrency(item.total_cents)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
              
              <div className="flex justify-between items-center p-3 bg-primary/5 rounded-lg border-2 border-primary/20">
                <span className="font-semibold">Total</span>
                <span className="text-xl font-bold">{formatCurrency(selectedInvoice.total_cents)}</span>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOpen(false)}>Close</Button>
            {selectedInvoice?.status === "draft" && (
              <Button onClick={() => { updateInvoiceStatus(selectedInvoice.id, "sent"); setDetailOpen(false); }}>
                <Send className="h-4 w-4 mr-2" />Send
              </Button>
            )}
            {(selectedInvoice?.status === "sent" || selectedInvoice?.status === "overdue") && (
              <Button className="bg-green-600 hover:bg-green-700" onClick={() => { updateInvoiceStatus(selectedInvoice.id, "paid"); setDetailOpen(false); }}>
                <CheckCircle2 className="h-4 w-4 mr-2" />Mark Paid
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generate Invoice Dialog */}
      <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Invoice</DialogTitle>
            <DialogDescription>Create an invoice from unbilled events.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Company</Label>
              <Select value={generateCompanyId} onValueChange={setGenerateCompanyId}>
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Period Start</Label>
                <Input type="date" value={generateStart} onChange={e => setGenerateStart(e.target.value)} />
              </div>
              <div>
                <Label>Period End</Label>
                <Input type="date" value={generateEnd} onChange={e => setGenerateEnd(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenerateOpen(false)}>Cancel</Button>
            <Button onClick={handleGenerateInvoice} disabled={!generateCompanyId || !generateStart || !generateEnd || generating}>
              {generating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Event Dialog */}
      <Dialog open={eventOpen} onOpenChange={setEventOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Billing Event</DialogTitle>
            <DialogDescription>Add a charge, credit, or adjustment.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Company</Label>
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
            <div>
              <Label>Type</Label>
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
            <div>
              <Label>Amount</Label>
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                  <Input type="number" step="0.01" value={eventAmount} onChange={e => setEventAmount(e.target.value)} className="pl-7" placeholder="0.00" />
                </div>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={isCredit} onChange={e => setIsCredit(e.target.checked)} className="rounded" />
                  <span className="text-sm">Credit</span>
                </label>
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <textarea value={eventDescription} onChange={e => setEventDescription(e.target.value)} rows={2} className="w-full px-3 py-2 border rounded-md text-sm resize-none" placeholder="Reason for charge or credit..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEventOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateEvent} disabled={!eventCompanyId || !eventDescription || !eventAmount || creatingEvent}>
              {creatingEvent && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isCredit ? "Apply Credit" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Rate Dialog */}
      <Dialog open={editRateOpen} onOpenChange={setEditRateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Billing Rate</DialogTitle>
            <DialogDescription>{editingRate?.company_name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Filing Fee</Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                <Input type="number" step="0.01" value={editFilingFee} onChange={e => setEditFilingFee(e.target.value)} className="pl-7" />
              </div>
            </div>
            <div>
              <Label>Payment Terms</Label>
              <div className="flex items-center gap-2">
                <Input type="number" value={editPaymentTerms} onChange={e => setEditPaymentTerms(e.target.value)} className="w-24" />
                <span className="text-muted-foreground">days</span>
              </div>
            </div>
            <div>
              <Label>Billing Notes (Internal)</Label>
              <textarea value={editBillingNotes} onChange={e => setEditBillingNotes(e.target.value)} rows={2} className="w-full px-3 py-2 border rounded-md text-sm resize-none" placeholder="Volume discount, special terms..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRateOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveRate} disabled={savingRate}>
              {savingRate && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
