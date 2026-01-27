"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  DollarSign,
  FileText,
  Building2,
  Users,
  CheckCircle,
  Clock,
  AlertTriangle,
  ArrowUpRight,
} from "lucide-react";

export default function ExecutiveDashboardPage() {
  // Executive-level KPIs
  const kpis = {
    // Revenue
    mtdRevenue: 28500,
    mtdRevenueChange: 12.5,
    projectedRevenue: 52000,
    outstandingAR: 8750,
    overdueInvoices: 2,

    // Operations
    totalFilingsThisMonth: 47,
    filingsChange: 8.3,
    acceptanceRate: 98.2,
    avgProcessingHours: 4.2,
    pendingRequests: 8,

    // Clients
    activeClients: 10,
    totalClients: 12,
    newClientsThisMonth: 2,
    clientRetention: 100,

    // Team
    activeStaff: 6,
    avgRequestsPerStaff: 7.8,
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Executive Dashboard</h1>
        <p className="text-slate-500">
          Business overview for PCT FinCEN Solutions • January 2026
        </p>
      </div>

      {/* Revenue Section */}
      <section>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-green-600" />
          Revenue & Billing
        </h2>
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Month to Date</CardDescription>
              <CardTitle className="text-3xl">
                ${kpis.mtdRevenue.toLocaleString()}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm text-green-600">
                <ArrowUpRight className="h-4 w-4 mr-1" />
                {kpis.mtdRevenueChange}% vs last month
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Projected (EOM)</CardDescription>
              <CardTitle className="text-3xl">
                ${kpis.projectedRevenue.toLocaleString()}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500">Based on current pace</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Outstanding A/R</CardDescription>
              <CardTitle className="text-3xl">
                ${kpis.outstandingAR.toLocaleString()}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500">Awaiting payment</p>
            </CardContent>
          </Card>

          <Card
            className={
              kpis.overdueInvoices > 0 ? "border-red-200 bg-red-50" : ""
            }
          >
            <CardHeader className="pb-2">
              <CardDescription>Overdue Invoices</CardDescription>
              <CardTitle className="text-3xl">{kpis.overdueInvoices}</CardTitle>
            </CardHeader>
            <CardContent>
              {kpis.overdueInvoices > 0 ? (
                <Badge variant="destructive">Needs attention</Badge>
              ) : (
                <Badge variant="secondary">All current</Badge>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Operations Section */}
      <section>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-600" />
          Operations
        </h2>
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Filings (MTD)</CardDescription>
              <CardTitle className="text-3xl">
                {kpis.totalFilingsThisMonth}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm text-green-600">
                <ArrowUpRight className="h-4 w-4 mr-1" />
                {kpis.filingsChange}% vs last month
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Acceptance Rate</CardDescription>
              <CardTitle className="text-3xl">{kpis.acceptanceRate}%</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge>Excellent</Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Avg Processing</CardDescription>
              <CardTitle className="text-3xl">
                {kpis.avgProcessingHours} hrs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500">Request → Filed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Pending Requests</CardDescription>
              <CardTitle className="text-3xl">{kpis.pendingRequests}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500">In queue</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Requests/Staff</CardDescription>
              <CardTitle className="text-3xl">
                {kpis.avgRequestsPerStaff}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500">Avg workload</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Clients & Team Row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Clients Section */}
        <section>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-purple-600" />
            Clients
          </h2>
          <div className="grid gap-4 grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Active Clients</CardDescription>
                <CardTitle className="text-3xl">{kpis.activeClients}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-500">
                  of {kpis.totalClients} total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>New This Month</CardDescription>
                <CardTitle className="text-3xl text-green-600">
                  +{kpis.newClientsThisMonth}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant="secondary">Growing</Badge>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Team Section */}
        <section>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-orange-600" />
            Team
          </h2>
          <div className="grid gap-4 grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Active Staff</CardDescription>
                <CardTitle className="text-3xl">{kpis.activeStaff}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-500">Processing requests</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Retention</CardDescription>
                <CardTitle className="text-3xl">
                  {kpis.clientRetention}%
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Badge>Perfect</Badge>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>

      {/* Alerts Section */}
      <section>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-yellow-600" />
          Items Requiring Attention
        </h2>
        <Card>
          <CardContent className="p-4">
            <div className="space-y-3">
              {kpis.overdueInvoices > 0 && (
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex items-center gap-3">
                    <DollarSign className="h-5 w-5 text-red-600" />
                    <div>
                      <p className="font-medium">
                        {kpis.overdueInvoices} Overdue Invoices
                      </p>
                      <p className="text-sm text-slate-500">
                        ${kpis.outstandingAR.toLocaleString()} outstanding
                      </p>
                    </div>
                  </div>
                  <Badge variant="destructive">Action Needed</Badge>
                </div>
              )}

              {kpis.pendingRequests > 5 && (
                <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-yellow-600" />
                    <div>
                      <p className="font-medium">
                        {kpis.pendingRequests} Pending Requests
                      </p>
                      <p className="text-sm text-slate-500">
                        Consider additional staffing
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline">Monitor</Badge>
                </div>
              )}

              {kpis.overdueInvoices === 0 && kpis.pendingRequests <= 5 && (
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium">All Systems Operational</p>
                      <p className="text-sm text-slate-500">
                        No issues requiring attention
                      </p>
                    </div>
                  </div>
                  <Badge>Healthy</Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
