"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Receipt, Download, Eye, DollarSign, Clock, CheckCircle, AlertTriangle } from "lucide-react";
import { useDemo } from "@/hooks/use-demo";

// Mock invoices for client
const mockInvoices = [
  {
    id: "inv-001",
    invoiceNumber: "INV-2026-0015",
    periodStart: "2026-01-01",
    periodEnd: "2026-01-31",
    itemCount: 3,
    totalCents: 22500, // $225
    status: "sent",
    dueDate: "2026-02-15",
    sentAt: "2026-01-26T09:00:00Z",
  },
  {
    id: "inv-002",
    invoiceNumber: "INV-2025-0089",
    periodStart: "2025-12-01",
    periodEnd: "2025-12-31",
    itemCount: 5,
    totalCents: 37500, // $375
    status: "paid",
    dueDate: "2026-01-15",
    paidAt: "2026-01-10T14:30:00Z",
  },
  {
    id: "inv-003",
    invoiceNumber: "INV-2025-0078",
    periodStart: "2025-11-01",
    periodEnd: "2025-11-30",
    itemCount: 4,
    totalCents: 30000, // $300
    status: "paid",
    dueDate: "2025-12-15",
    paidAt: "2025-12-12T10:00:00Z",
  },
];

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  draft: { label: "Draft", color: "bg-slate-100 text-slate-700", icon: Clock },
  sent: { label: "Sent", color: "bg-blue-100 text-blue-700", icon: Clock },
  paid: { label: "Paid", color: "bg-green-100 text-green-700", icon: CheckCircle },
  overdue: { label: "Overdue", color: "bg-red-100 text-red-700", icon: AlertTriangle },
};

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function formatPeriod(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  return `${startDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${endDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
}

export default function ClientInvoicesPage() {
  const { user } = useDemo();

  // Calculate stats
  const totalPaid = mockInvoices
    .filter((inv) => inv.status === "paid")
    .reduce((acc, inv) => acc + inv.totalCents, 0);
  const totalOutstanding = mockInvoices
    .filter((inv) => inv.status === "sent" || inv.status === "overdue")
    .reduce((acc, inv) => acc + inv.totalCents, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Invoices</h1>
        <p className="text-slate-500">View and download your billing invoices</p>
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
                <p className="text-xl font-bold">{formatCurrency(totalPaid)}</p>
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
                <p className="text-xl font-bold">{formatCurrency(totalOutstanding)}</p>
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
                <p className="text-sm text-slate-500">Total Invoices</p>
                <p className="text-xl font-bold">{mockInvoices.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle>Invoice History</CardTitle>
          <CardDescription>All invoices for {user?.companyName || "your company"}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockInvoices.map((invoice) => {
                  const status = statusConfig[invoice.status];
                  return (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                      <TableCell>{formatPeriod(invoice.periodStart, invoice.periodEnd)}</TableCell>
                      <TableCell>{invoice.itemCount} filings</TableCell>
                      <TableCell className="font-medium">{formatCurrency(invoice.totalCents)}</TableCell>
                      <TableCell>
                        <Badge className={status.color}>{status.label}</Badge>
                      </TableCell>
                      <TableCell className="text-slate-500">
                        {new Date(invoice.dueDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="mr-1 h-4 w-4" />
                            View
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Download className="mr-1 h-4 w-4" />
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
              <a href="mailto:billing@pacificcoasttitle.com" className="text-blue-600 hover:underline">
                billing@pacificcoasttitle.com
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
