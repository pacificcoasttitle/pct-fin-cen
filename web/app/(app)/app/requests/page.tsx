"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Eye } from "lucide-react";
import Link from "next/link";

const mockClientRequests = [
  { 
    id: "req-001", 
    escrowNumber: "DTE-2026-003", 
    property: "789 Pine St, Los Angeles, CA",
    buyerName: "John Smith",
    status: "pending", 
    submittedAt: "2026-01-26",
    reportId: null
  },
  { 
    id: "req-002", 
    escrowNumber: "DTE-2026-002", 
    property: "456 Oak Ave, San Diego, CA",
    buyerName: "ABC Holdings LLC",
    status: "in_progress", 
    submittedAt: "2026-01-25",
    reportId: "rpt-2026-045"
  },
  { 
    id: "req-003", 
    escrowNumber: "DTE-2026-001", 
    property: "123 Main St, San Francisco, CA",
    buyerName: "Jane Doe",
    status: "completed", 
    submittedAt: "2026-01-20",
    reportId: "rpt-2026-042"
  },
];

function getStatusBadge(status: string) {
  switch (status) {
    case "pending":
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>;
    case "in_progress":
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">In Progress</Badge>;
    case "completed":
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Completed</Badge>;
    case "cancelled":
      return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Cancelled</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export default function ClientRequestsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Requests</h1>
          <p className="text-muted-foreground">Track your FinCEN report requests</p>
        </div>
        <Button asChild>
          <Link href="/app/requests/new">
            <Plus className="mr-2 h-4 w-4" />
            New Request
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">Escrow #</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Property</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Buyer</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Submitted</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {mockClientRequests.map((req) => (
                <tr key={req.id} className="border-b hover:bg-muted/50">
                  <td className="px-4 py-3 text-sm font-medium">{req.escrowNumber}</td>
                  <td className="px-4 py-3 text-sm">{req.property}</td>
                  <td className="px-4 py-3 text-sm">{req.buyerName}</td>
                  <td className="px-4 py-3">{getStatusBadge(req.status)}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{req.submittedAt}</td>
                  <td className="px-4 py-3">
                    <Button variant="ghost" size="sm">
                      <Eye className="mr-1 h-3 w-3" />
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Help Text */}
      <Card className="bg-muted/50">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">
            <strong>How it works:</strong> Submit a request with your transaction details. 
            Our team will process the FinCEN report and may reach out to collect additional 
            information from buyers or sellers. You&apos;ll be notified when the report is filed.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
