"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Inbox, Clock, FileText, ArrowRight, CheckCircle, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useDemo } from "@/hooks/use-demo";

// Mock queue data for this staff member
const mockMyQueue = [
  {
    id: "req-010",
    companyName: "Golden State Escrow",
    escrowNumber: "GSE-2026-1489",
    propertyAddress: "321 Main St, San Francisco, CA",
    buyerName: "Tech Ventures LLC",
    priority: "normal",
    status: "in_progress",
    assignedAt: "2026-01-25T14:00:00Z",
    reportId: "rpt-089",
  },
  {
    id: "req-011",
    companyName: "Summit Title Services",
    escrowNumber: "STS-2026-0893",
    propertyAddress: "456 Oak Ave, San Diego, CA",
    buyerName: "John Smith",
    priority: "urgent",
    status: "in_progress",
    assignedAt: "2026-01-26T09:00:00Z",
    reportId: "rpt-090",
  },
  {
    id: "req-012",
    companyName: "Bay Area Title Co",
    escrowNumber: "BAT-2026-2235",
    propertyAddress: "789 Pine Blvd, Oakland, CA",
    buyerName: "ABC Holdings LLC",
    priority: "normal",
    status: "assigned",
    assignedAt: "2026-01-26T11:30:00Z",
    reportId: null,
  },
];

const statusConfig: Record<string, { label: string; color: string }> = {
  assigned: { label: "Assigned", color: "bg-blue-100 text-blue-700" },
  in_progress: { label: "In Progress", color: "bg-amber-100 text-amber-700" },
  awaiting_parties: { label: "Awaiting Parties", color: "bg-purple-100 text-purple-700" },
  ready_to_file: { label: "Ready to File", color: "bg-green-100 text-green-700" },
};

export default function StaffQueuePage() {
  const { user } = useDemo();

  // Stats
  const stats = {
    assigned: mockMyQueue.filter((r) => r.status === "assigned").length,
    inProgress: mockMyQueue.filter((r) => r.status === "in_progress").length,
    urgent: mockMyQueue.filter((r) => r.priority === "urgent").length,
    total: mockMyQueue.length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Queue</h1>
        <p className="text-slate-500">
          Welcome back, {user?.name?.split(" ")[0]}. You have {stats.total} requests assigned.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Inbox className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">New Assigned</p>
                <p className="text-xl font-bold">{stats.assigned}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">In Progress</p>
                <p className="text-xl font-bold">{stats.inProgress}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={stats.urgent > 0 ? "border-red-200 bg-red-50" : ""}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Urgent</p>
                <p className="text-xl font-bold">{stats.urgent}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-lg">
                <FileText className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Assigned</p>
                <p className="text-xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Queue Table */}
      <Card>
        <CardHeader>
          <CardTitle>Assigned Requests</CardTitle>
          <CardDescription>Requests assigned to you for processing</CardDescription>
        </CardHeader>
        <CardContent>
          {mockMyQueue.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <p className="text-lg font-medium text-slate-900">Queue is empty!</p>
              <p className="text-slate-500">No requests currently assigned to you.</p>
              <Button asChild className="mt-4">
                <Link href="/app/admin/requests">Pick up new requests</Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Escrow #</TableHead>
                    <TableHead>Property</TableHead>
                    <TableHead>Buyer</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockMyQueue.map((req) => {
                    const status = statusConfig[req.status] || {
                      label: req.status,
                      color: "bg-slate-100 text-slate-700",
                    };
                    return (
                      <TableRow
                        key={req.id}
                        className={req.priority === "urgent" ? "bg-red-50" : ""}
                      >
                        <TableCell className="font-medium">{req.companyName}</TableCell>
                        <TableCell>{req.escrowNumber}</TableCell>
                        <TableCell className="max-w-xs truncate">
                          {req.propertyAddress}
                        </TableCell>
                        <TableCell>{req.buyerName}</TableCell>
                        <TableCell>
                          {req.priority === "urgent" ? (
                            <Badge variant="destructive">Urgent</Badge>
                          ) : (
                            <Badge variant="outline">Normal</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={status.color}>{status.label}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {req.reportId ? (
                            <Button size="sm" asChild>
                              <Link href={`/app/reports/${req.reportId}/wizard`}>
                                Continue
                                <ArrowRight className="ml-1 h-4 w-4" />
                              </Link>
                            </Button>
                          ) : (
                            <Button size="sm">
                              Start Wizard
                              <ArrowRight className="ml-1 h-4 w-4" />
                            </Button>
                          )}
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

      {/* Quick Links */}
      <div className="flex gap-4">
        <Button variant="outline" asChild>
          <Link href="/app/admin/requests">View All Requests</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/app/staff/reports">My Reports</Link>
        </Button>
      </div>
    </div>
  );
}
