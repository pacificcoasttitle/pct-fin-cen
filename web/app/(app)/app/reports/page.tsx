"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, FileText, CheckCircle, Clock, AlertTriangle } from "lucide-react";

const mockClientReports = [
  { 
    id: "rpt-2026-045", 
    escrowNumber: "DTE-2026-002",
    property: "456 Oak Ave, San Diego, CA",
    status: "collecting",
    determination: "reportable",
    partiesComplete: "1/2",
    createdAt: "2026-01-25"
  },
  { 
    id: "rpt-2026-042", 
    escrowNumber: "DTE-2026-001",
    property: "123 Main St, San Francisco, CA",
    status: "filed",
    determination: "reportable",
    bsaId: "31000012345678",
    filedAt: "2026-01-22"
  },
  { 
    id: "rpt-2026-038", 
    escrowNumber: "DTE-2025-089",
    property: "999 Beach Blvd, Santa Monica, CA",
    status: "exempt",
    determination: "exempt",
    exemptReason: "Financed transaction",
    createdAt: "2026-01-15"
  },
];

function getStatusBadge(status: string) {
  switch (status) {
    case "collecting":
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Collecting Info</Badge>;
    case "ready":
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Ready to File</Badge>;
    case "filed":
      return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Filed</Badge>;
    case "accepted":
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Accepted</Badge>;
    case "exempt":
      return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Exempt</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export default function ClientReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Report Status</h1>
        <p className="text-muted-foreground">Track the status of your FinCEN reports</p>
      </div>

      {/* No "New Report" button for clients! */}

      <Card>
        <CardContent className="p-0">
          <table className="w-full">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">Report ID</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Property</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Determination</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Details</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {mockClientReports.map((rpt) => (
                <tr key={rpt.id} className="border-b hover:bg-muted/50">
                  <td className="px-4 py-3 text-sm font-mono">{rpt.id}</td>
                  <td className="px-4 py-3 text-sm">{rpt.property}</td>
                  <td className="px-4 py-3">
                    <Badge variant={rpt.determination === "reportable" ? "default" : "secondary"}>
                      {rpt.determination}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">{getStatusBadge(rpt.status)}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {rpt.bsaId ? `BSA ID: ${rpt.bsaId}` : 
                     rpt.partiesComplete ? `Parties: ${rpt.partiesComplete}` :
                     rpt.exemptReason || "-"}
                  </td>
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

      {/* Status Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Status Guide</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              <span className="text-sm"><strong>Collecting:</strong> Gathering info from parties</span>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-600" />
              <span className="text-sm"><strong>Ready:</strong> All info received, ready to file</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-purple-600" />
              <span className="text-sm"><strong>Filed:</strong> Submitted to FinCEN</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm"><strong>Accepted:</strong> Confirmed by FinCEN</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
