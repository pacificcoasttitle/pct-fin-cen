"use client"

import { Building2, Mail, Phone, MapPin, Users, FileText, Calendar, DollarSign } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { StatusBadge } from "./status-badge"
import { CompanyTypeBadge } from "./company-type-badge"

export interface CompanyAddress {
  street: string
  city: string
  state: string
  zip: string
}

export interface Company {
  id: string
  name: string
  code: string
  companyType: "internal" | "client"
  status: string
  billingEmail: string | null
  billingContactName: string | null
  phone: string | null
  address: CompanyAddress | null
  userCount: number
  reportCount: number
  lastActivity: string | null
  createdAt: string
}

interface CompanyDetailSheetProps {
  company: Company | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function formatTimeAgo(dateStr: string | null): string {
  if (!dateStr) return "Never"
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

export function CompanyDetailSheet({ company, open, onOpenChange }: CompanyDetailSheetProps) {
  if (!company) return null

  const address = company.address
  const addressText = address 
    ? `${address.street}, ${address.city}, ${address.state} ${address.zip}`
    : "Not provided"

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-slate-100 rounded-xl">
              <Building2 className="h-6 w-6 text-slate-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <SheetTitle className="text-xl">{company.name}</SheetTitle>
                <CompanyTypeBadge type={company.companyType} />
              </div>
              <SheetDescription className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="font-mono">{company.code}</Badge>
                <StatusBadge status={company.status} />
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <Tabs defaultValue="overview" className="mt-2">
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4 space-y-4">
            {/* Contact Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-500">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="h-4 w-4 text-slate-400" />
                  <span>{company.billingEmail || "No email provided"}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="h-4 w-4 text-slate-400" />
                  <span>{company.phone || "No phone provided"}</span>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <MapPin className="h-4 w-4 text-slate-400 mt-0.5" />
                  <span>{addressText}</span>
                </div>
                {company.billingContactName && (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-slate-500">Billing Contact</p>
                    <p className="text-sm font-medium">{company.billingContactName}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-500">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-slate-50 rounded-lg">
                    <Users className="h-5 w-5 mx-auto text-blue-600 mb-1" />
                    <p className="text-xl font-bold">{company.userCount}</p>
                    <p className="text-xs text-slate-500">Users</p>
                  </div>
                  <div className="text-center p-3 bg-slate-50 rounded-lg">
                    <FileText className="h-5 w-5 mx-auto text-emerald-600 mb-1" />
                    <p className="text-xl font-bold">{company.reportCount}</p>
                    <p className="text-xs text-slate-500">Reports</p>
                  </div>
                  <div className="text-center p-3 bg-slate-50 rounded-lg">
                    <Calendar className="h-5 w-5 mx-auto text-purple-600 mb-1" />
                    <p className="text-sm font-bold">{formatTimeAgo(company.lastActivity)}</p>
                    <p className="text-xs text-slate-500">Last Active</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Metadata */}
            <div className="text-xs text-slate-400 pt-2">
              Created {formatDate(company.createdAt)}
            </div>
          </TabsContent>

          <TabsContent value="users" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8 text-slate-500">
                  <Users className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-sm font-medium">User list coming soon</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {company.userCount} users in this company
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8 text-slate-500">
                  <FileText className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-sm font-medium">Report list coming soon</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {company.reportCount} reports filed
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="billing" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8 text-slate-500">
                  <DollarSign className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-sm font-medium">Billing info coming soon</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Invoice and payment history will appear here
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}
