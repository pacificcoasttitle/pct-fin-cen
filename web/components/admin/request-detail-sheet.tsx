"use client"

import { useState } from "react"
import {
  Building2,
  MapPin,
  User,
  Mail,
  Phone,
  DollarSign,
  Calendar,
  FileText,
  Clock,
  UserPlus,
  Play,
  XCircle,
  CheckCircle2,
  AlertTriangle,
  Loader2,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { RequestStatusBadge } from "./request-status-badge"
import { PriorityBadge } from "./priority-badge"

export interface PropertyAddress {
  street: string
  city: string
  state: string
  zip: string
}

export interface AssignedUser {
  id: string
  name: string
}

export interface SubmissionRequest {
  id: string
  companyId: string
  companyName: string
  requestedBy: string
  escrowNumber: string
  fileNumber: string | null
  propertyAddress: PropertyAddress
  buyerName: string
  buyerType: "individual" | "entity" | "trust"
  buyerEmail: string
  buyerPhone?: string
  sellerName: string
  sellerEmail?: string
  purchasePriceCents: number
  financingType: "cash" | "financed" | "partial_cash"
  expectedClosingDate: string
  actualClosingDate?: string
  notes: string | null
  attachments?: { filename: string; url: string }[]
  priority: "urgent" | "normal" | "low"
  status: "pending" | "assigned" | "in_progress" | "completed" | "cancelled"
  assignedTo: AssignedUser | null
  assignedAt?: string
  completedAt?: string
  submittedAt: string
  reportId: string | null
}

interface RequestDetailSheetProps {
  request: SubmissionRequest | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onAssign?: (requestId: string, userId: string) => void
  onStartWizard?: (requestId: string) => void
  onCancel?: (requestId: string) => void
  isCreatingReport?: string | null  // Request ID that is currently creating a report
}

// Mock PCT staff for assignment
const PCT_STAFF = [
  { id: "u1", name: "Sarah Mitchell" },
  { id: "u2", name: "James Rodriguez" },
  { id: "u3", name: "Emily Chen" },
  { id: "u4", name: "Michael Thompson" },
  { id: "u5", name: "Jessica Wang" },
  { id: "u6", name: "Daniel Kim" },
  { id: "u7", name: "Rachel Foster" },
]

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return "Yesterday"
  if (diffDays < 7) return `${diffDays}d ago`
  return formatDate(dateStr)
}

function formatFinancingType(type: string): string {
  const labels: Record<string, string> = {
    cash: "All Cash",
    financed: "Financed",
    partial_cash: "Partial Cash",
  }
  return labels[type] || type
}

function formatBuyerType(type: string): string {
  const labels: Record<string, string> = {
    individual: "Individual",
    entity: "Entity/LLC",
    trust: "Trust",
  }
  return labels[type] || type
}

export function RequestDetailSheet({ 
  request, 
  open, 
  onOpenChange,
  onAssign,
  onStartWizard,
  onCancel,
  isCreatingReport,
}: RequestDetailSheetProps) {
  const [selectedStaff, setSelectedStaff] = useState<string>("")

  if (!request) return null

  const address = request.propertyAddress
  const addressText = `${address.street}, ${address.city}, ${address.state} ${address.zip}`
  const canAssign = request.status === "pending"
  const canStartWizard = request.status === "pending" || request.status === "assigned"
  const canCancel = request.status !== "completed" && request.status !== "cancelled"

  const handleAssign = () => {
    if (selectedStaff && onAssign) {
      onAssign(request.id, selectedStaff)
    }
  }

  const handleStartWizard = () => {
    if (onStartWizard) {
      onStartWizard(request.id)
    }
  }

  const handleCancel = () => {
    if (onCancel) {
      onCancel(request.id)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Building2 className="h-4 w-4" />
                {request.companyName}
              </div>
              <SheetTitle className="text-xl mt-1">
                Request {request.id.toUpperCase()}
              </SheetTitle>
              <SheetDescription className="flex items-center gap-2 mt-2">
                <RequestStatusBadge status={request.status} />
                <PriorityBadge priority={request.priority} showIcon />
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-4">
          {/* Property & Transaction */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-500">Property & Transaction</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-slate-400 mt-0.5" />
                <div>
                  <p className="font-medium">{addressText}</p>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-500">Purchase Price</p>
                  <p className="font-semibold text-lg">{formatCurrency(request.purchasePriceCents)}</p>
                </div>
                <div>
                  <p className="text-slate-500">Financing</p>
                  <p className="font-medium">{formatFinancingType(request.financingType)}</p>
                </div>
                <div>
                  <p className="text-slate-500">Escrow #</p>
                  <p className="font-mono">{request.escrowNumber}</p>
                </div>
                <div>
                  <p className="text-slate-500">File #</p>
                  <p className="font-mono">{request.fileNumber || "—"}</p>
                </div>
                <div>
                  <p className="text-slate-500">Expected Closing</p>
                  <p className="font-medium">{formatDate(request.expectedClosingDate)}</p>
                </div>
                <div>
                  <p className="text-slate-500">Submitted</p>
                  <p className="font-medium">{formatTimeAgo(request.submittedAt)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Buyer & Seller */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-500">Parties</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Buyer */}
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-xs font-medium text-blue-600 uppercase mb-2">Buyer</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-slate-400" />
                    <span className="font-medium">{request.buyerName}</span>
                    <span className="text-xs text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded">
                      {formatBuyerType(request.buyerType)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Mail className="h-3.5 w-3.5 text-slate-400" />
                    {request.buyerEmail}
                  </div>
                  {request.buyerPhone && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Phone className="h-3.5 w-3.5 text-slate-400" />
                      {request.buyerPhone}
                    </div>
                  )}
                </div>
              </div>

              {/* Seller */}
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xs font-medium text-slate-500 uppercase mb-2">Seller</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-slate-400" />
                    <span className="font-medium">{request.sellerName}</span>
                  </div>
                  {request.sellerEmail && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Mail className="h-3.5 w-3.5 text-slate-400" />
                      {request.sellerEmail}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {request.notes && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-500">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{request.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Assignment */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-500">Assignment</CardTitle>
            </CardHeader>
            <CardContent>
              {request.assignedTo ? (
                <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg">
                  <div className="p-2 bg-emerald-100 rounded-full">
                    <User className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-medium">{request.assignedTo.name}</p>
                    <p className="text-xs text-slate-500">
                      Assigned {request.assignedAt ? formatTimeAgo(request.assignedAt) : ""}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-slate-500">Not yet assigned</p>
                  {canAssign && (
                    <div className="flex gap-2">
                      <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Select staff member" />
                        </SelectTrigger>
                        <SelectContent>
                          {PCT_STAFF.map((staff) => (
                            <SelectItem key={staff.id} value={staff.id}>
                              {staff.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button onClick={handleAssign} disabled={!selectedStaff}>
                        <UserPlus className="h-4 w-4 mr-1" />
                        Assign
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activity Timeline */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-500">Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {request.completedAt && (
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 bg-emerald-100 rounded-full">
                      <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Completed</p>
                      <p className="text-xs text-slate-500">{formatTimeAgo(request.completedAt)}</p>
                    </div>
                  </div>
                )}
                {request.assignedAt && request.assignedTo && (
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 bg-blue-100 rounded-full">
                      <UserPlus className="h-3 w-3 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Assigned to {request.assignedTo.name}</p>
                      <p className="text-xs text-slate-500">{formatTimeAgo(request.assignedAt)}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <div className="p-1.5 bg-slate-100 rounded-full">
                    <FileText className="h-3 w-3 text-slate-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Request submitted by {request.requestedBy}</p>
                    <p className="text-xs text-slate-500">{formatTimeAgo(request.submittedAt)}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-col gap-2 pt-2">
            {canStartWizard && (
              <Button 
                onClick={handleStartWizard} 
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-500"
                disabled={isCreatingReport === request.id}
              >
                {isCreatingReport === request.id ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating Report...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Start Wizard
                  </>
                )}
              </Button>
            )}
            
            {request.reportId && (
              <Button variant="outline" className="w-full" asChild>
                <a href={`/app/reports/${request.reportId}/wizard`}>
                  <FileText className="h-4 w-4 mr-2" />
                  View Report
                </a>
              </Button>
            )}

            {canCancel && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" className="w-full text-red-600 hover:text-red-700 hover:bg-red-50">
                    <XCircle className="h-4 w-4 mr-2" />
                    Cancel Request
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancel this request?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will mark the request as cancelled. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep Request</AlertDialogCancel>
                    <AlertDialogAction onClick={handleCancel} className="bg-red-600 hover:bg-red-700">
                      Cancel Request
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
