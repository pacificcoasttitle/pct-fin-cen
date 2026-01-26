"use client"

import {
  Building2,
  Calendar,
  FileText,
  DollarSign,
  CreditCard,
  Send,
  CheckCircle2,
  Download,
  XCircle,
  Receipt,
} from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { InvoiceStatusBadge } from "./invoice-status-badge"
import { EventTypeBadge } from "./event-type-badge"

export interface BillingEvent {
  id: string
  companyId: string
  companyName: string
  reportId: string | null
  escrowNumber: string | null
  eventType: string
  description: string
  amountCents: number
  bsaId: string | null
  invoiceId: string | null
  createdAt: string
}

export interface Invoice {
  id: string
  invoiceNumber: string
  companyId: string
  companyName: string
  periodStart: string
  periodEnd: string
  itemCount: number
  subtotalCents: number
  taxCents: number
  discountCents?: number
  totalCents: number
  status: "draft" | "sent" | "paid" | "overdue" | "void"
  dueDate?: string
  sentAt: string | null
  paidAt: string | null
  paymentMethod?: string
  paymentReference?: string
  lineItems?: BillingEvent[]
}

interface InvoiceDetailSheetProps {
  invoice: Invoice | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSend?: (invoiceId: string) => void
  onMarkPaid?: (invoiceId: string) => void
  onVoid?: (invoiceId: string) => void
  onDownload?: (invoiceId: string) => void
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(cents / 100)
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function formatPeriod(start: string, end: string): string {
  const startDate = new Date(start)
  const endDate = new Date(end)
  const startMonth = startDate.toLocaleDateString("en-US", { month: "short" })
  const endMonth = endDate.toLocaleDateString("en-US", { month: "short" })
  const year = endDate.getFullYear()
  
  if (startMonth === endMonth) {
    return `${startMonth} ${startDate.getDate()}-${endDate.getDate()}, ${year}`
  }
  return `${startMonth} ${startDate.getDate()} - ${endMonth} ${endDate.getDate()}, ${year}`
}

function formatPaymentMethod(method?: string): string {
  if (!method) return "—"
  const labels: Record<string, string> = {
    check: "Check",
    ach: "ACH Transfer",
    wire: "Wire Transfer",
    intercompany: "Intercompany",
  }
  return labels[method] || method
}

// Mock line items for demo
function getMockLineItems(invoice: Invoice): BillingEvent[] {
  const items: BillingEvent[] = []
  const baseDate = new Date(invoice.periodStart)
  
  for (let i = 0; i < invoice.itemCount; i++) {
    const date = new Date(baseDate)
    date.setDate(date.getDate() + Math.floor(i * 2))
    
    items.push({
      id: `be-${invoice.id}-${i}`,
      companyId: invoice.companyId,
      companyName: invoice.companyName,
      reportId: `rpt-${Math.floor(Math.random() * 1000).toString().padStart(3, "0")}`,
      escrowNumber: `${invoice.companyName.substring(0, 3).toUpperCase()}-2025-${(1000 + i).toString()}`,
      eventType: "filing_accepted",
      description: `RRER Filing - ${100 + i * 10} Sample St`,
      amountCents: 5000,
      bsaId: `3100001234${(5678 + i).toString()}`,
      invoiceId: invoice.id,
      createdAt: date.toISOString(),
    })
  }
  
  return items
}

export function InvoiceDetailSheet({ 
  invoice, 
  open, 
  onOpenChange,
  onSend,
  onMarkPaid,
  onVoid,
  onDownload,
}: InvoiceDetailSheetProps) {
  if (!invoice) return null

  const lineItems = invoice.lineItems || getMockLineItems(invoice)
  const canSend = invoice.status === "draft"
  const canMarkPaid = invoice.status === "sent" || invoice.status === "overdue"
  const canVoid = invoice.status !== "void" && invoice.status !== "paid"
  const canDownload = invoice.status !== "draft"

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                <Building2 className="h-4 w-4" />
                {invoice.companyName}
              </div>
              <SheetTitle className="text-xl flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                {invoice.invoiceNumber}
              </SheetTitle>
              <SheetDescription className="flex items-center gap-2 mt-2">
                <InvoiceStatusBadge status={invoice.status} />
                <span className="text-slate-500">•</span>
                <span>{formatPeriod(invoice.periodStart, invoice.periodEnd)}</span>
              </SheetDescription>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">{formatCurrency(invoice.totalCents)}</p>
              <p className="text-sm text-slate-500">{invoice.itemCount} items</p>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-4">
          {/* Summary Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-500">Invoice Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Subtotal</span>
                <span>{formatCurrency(invoice.subtotalCents)}</span>
              </div>
              {invoice.discountCents && invoice.discountCents > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Discount</span>
                  <span className="text-emerald-600">-{formatCurrency(invoice.discountCents)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Tax</span>
                <span>{formatCurrency(invoice.taxCents)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span>{formatCurrency(invoice.totalCents)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Dates Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-500">Dates</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-500">Billing Period</p>
                <p className="font-medium">{formatPeriod(invoice.periodStart, invoice.periodEnd)}</p>
              </div>
              {invoice.dueDate && (
                <div>
                  <p className="text-slate-500">Due Date</p>
                  <p className="font-medium">{formatDate(invoice.dueDate)}</p>
                </div>
              )}
              {invoice.sentAt && (
                <div>
                  <p className="text-slate-500">Sent</p>
                  <p className="font-medium">{formatDate(invoice.sentAt)}</p>
                </div>
              )}
              {invoice.paidAt && (
                <div>
                  <p className="text-slate-500">Paid</p>
                  <p className="font-medium">{formatDate(invoice.paidAt)}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Info (if paid) */}
          {invoice.status === "paid" && invoice.paymentMethod && (
            <Card className="bg-emerald-50 border-emerald-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-emerald-700 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Payment Received
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-emerald-600">Method</p>
                  <p className="font-medium text-emerald-800">{formatPaymentMethod(invoice.paymentMethod)}</p>
                </div>
                {invoice.paymentReference && (
                  <div>
                    <p className="text-emerald-600">Reference</p>
                    <p className="font-medium text-emerald-800">{invoice.paymentReference}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Line Items */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-500">Line Items</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>BSA ID</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lineItems.slice(0, 10).map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="text-sm text-slate-500">
                          {formatDate(item.createdAt)}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium">{item.description}</p>
                            <p className="text-xs text-slate-500">{item.escrowNumber}</p>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-slate-500">
                          {item.bsaId || "—"}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(item.amountCents)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {lineItems.length > 10 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-sm text-slate-500">
                          ... and {lineItems.length - 10} more items
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-col gap-2 pt-2">
            {canSend && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      disabled
                      className="w-full bg-gradient-to-r from-blue-600 to-cyan-500"
                      onClick={() => onSend?.(invoice.id)}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Send Invoice
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Coming soon</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            
            {canMarkPaid && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      disabled
                      variant="outline" 
                      className="w-full"
                      onClick={() => onMarkPaid?.(invoice.id)}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Mark as Paid
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Coming soon</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {canDownload && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      disabled
                      variant="outline" 
                      className="w-full"
                      onClick={() => onDownload?.(invoice.id)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download PDF
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Coming soon</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {canVoid && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" className="w-full text-red-600 hover:text-red-700 hover:bg-red-50" disabled>
                    <XCircle className="h-4 w-4 mr-2" />
                    Void Invoice
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Void this invoice?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will mark the invoice as void. The billing events will become unbilled again.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={() => onVoid?.(invoice.id)} 
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Void Invoice
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
