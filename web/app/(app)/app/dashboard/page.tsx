"use client";

import { useDemo } from "@/hooks/use-demo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Send, Clock, CheckCircle, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function ClientDashboardPage() {
  const { user } = useDemo();
  const isClientAdmin = user?.role === "client_admin";

  const stats = {
    pendingRequests: 3,
    inProgress: 2,
    completedThisMonth: 8,
    totalReports: 45,
  };

  const recentActivity = [
    { id: 1, type: "request_submitted", description: "Request DTE-2026-003 submitted", time: "2 hours ago" },
    { id: 2, type: "report_filed", description: "Report for 123 Main St filed with FinCEN", time: "1 day ago" },
    { id: 3, type: "party_submitted", description: "Buyer info received for 456 Oak Ave", time: "2 days ago" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Welcome back, {user?.name?.split(" ")[0] || "User"}</h1>
          <p className="text-muted-foreground">{user?.companyName || "Your Company"}</p>
        </div>
        {/* Only New Request button - NO New Report/Wizard button */}
        <Button asChild size="lg">
          <Link href="/app/requests/new">
            <Send className="mr-2 h-4 w-4" />
            New Request
          </Link>
        </Button>
      </div>

      {/* Quick Action Card */}
      <Card className="border-primary bg-primary/5">
        <CardHeader>
          <CardTitle>Need a FinCEN Report?</CardTitle>
          <CardDescription>
            Submit a request and our team will handle the compliance filing for you.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/app/requests/new">
              <Send className="mr-2 h-4 w-4" />
              Submit New Request
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingRequests}</div>
            <p className="text-xs text-muted-foreground">Awaiting processing</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <AlertCircle className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inProgress}</div>
            <p className="text-xs text-muted-foreground">Being processed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedThisMonth}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalReports}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Updates on your requests and reports</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivity.map((item) => (
              <div key={item.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`h-2 w-2 rounded-full ${
                    item.type === "report_filed" ? "bg-green-500" :
                    item.type === "request_submitted" ? "bg-blue-500" : "bg-yellow-500"
                  }`} />
                  <span className="text-sm">{item.description}</span>
                </div>
                <span className="text-xs text-muted-foreground">{item.time}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Billing Summary - Client Admin Only */}
      {isClientAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Billing Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">Current Balance</p>
                <p className="text-2xl font-bold">$450.00</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Last Invoice</p>
                <p className="text-lg font-medium">INV-2026-0012</p>
                <p className="text-xs text-muted-foreground">Paid Jan 15, 2026</p>
              </div>
              <div className="flex items-end">
                <Button variant="outline" asChild>
                  <Link href="/app/invoices">View All Invoices</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
