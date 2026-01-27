"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileText, Search, Filter, ExternalLink, CheckCircle, Clock, Send } from "lucide-react";
import Link from "next/link";
import { useState, useMemo } from "react";
import { useDemo } from "@/hooks/use-demo";

// Mock reports assigned to this staff member
const mockMyReports = [
  {
    id: "rpt-089",
    companyName: "Golden State Escrow",
    escrowNumber: "GSE-2026-1489",
    propertyAddress: "321 Main St, San Francisco, CA",
    status: "awaiting_parties",
    createdAt: "2026-01-25T14:00:00Z",
    updatedAt: "2026-01-26T10:30:00Z",
  },
  {
    id: "rpt-090",
    companyName: "Summit Title Services",
    escrowNumber: "STS-2026-0893",
    propertyAddress: "456 Oak Ave, San Diego, CA",
    status: "draft",
    createdAt: "2026-01-26T09:00:00Z",
    updatedAt: "2026-01-26T14:00:00Z",
  },
  {
    id: "rpt-078",
    companyName: "Summit Title Services",
    escrowNumber: "STS-2026-0756",
    propertyAddress: "555 Park Ave, San Diego, CA",
    status: "filed",
    createdAt: "2026-01-20T08:00:00Z",
    updatedAt: "2026-01-25T16:30:00Z",
  },
  {
    id: "rpt-077",
    companyName: "Bay Area Title Co",
    escrowNumber: "BAT-2026-2200",
    propertyAddress: "123 Market St, Oakland, CA",
    status: "ready_to_file",
    createdAt: "2026-01-18T10:00:00Z",
    updatedAt: "2026-01-24T11:00:00Z",
  },
  {
    id: "rpt-075",
    companyName: "Golden State Escrow",
    escrowNumber: "GSE-2026-1400",
    propertyAddress: "789 Union St, San Francisco, CA",
    status: "filed",
    createdAt: "2026-01-15T09:00:00Z",
    updatedAt: "2026-01-22T15:00:00Z",
  },
];

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  draft: { label: "Draft", color: "bg-slate-100 text-slate-700", icon: FileText },
  awaiting_parties: { label: "Awaiting Parties", color: "bg-amber-100 text-amber-700", icon: Clock },
  ready_to_file: { label: "Ready to File", color: "bg-green-100 text-green-700", icon: CheckCircle },
  filed: { label: "Filed", color: "bg-emerald-100 text-emerald-700", icon: Send },
  exempt: { label: "Exempt", color: "bg-purple-100 text-purple-700", icon: FileText },
};

export default function StaffReportsPage() {
  const { user } = useDemo();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredReports = useMemo(() => {
    return mockMyReports.filter((report) => {
      const matchesSearch =
        !searchQuery ||
        report.escrowNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        report.propertyAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
        report.companyName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || report.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [searchQuery, statusFilter]);

  // Stats
  const stats = {
    draft: mockMyReports.filter((r) => r.status === "draft").length,
    awaitingParties: mockMyReports.filter((r) => r.status === "awaiting_parties").length,
    readyToFile: mockMyReports.filter((r) => r.status === "ready_to_file").length,
    filed: mockMyReports.filter((r) => r.status === "filed").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Reports</h1>
        <p className="text-slate-500">Reports you&apos;ve created or are working on</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-lg">
                <FileText className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Draft</p>
                <p className="text-xl font-bold">{stats.draft}</p>
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
                <p className="text-sm text-slate-500">Awaiting Parties</p>
                <p className="text-xl font-bold">{stats.awaitingParties}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Ready to File</p>
                <p className="text-xl font-bold">{stats.readyToFile}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <Send className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Filed</p>
                <p className="text-xl font-bold">{stats.filed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reports Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>All My Reports</CardTitle>
              <CardDescription>Reports assigned to you</CardDescription>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="search"
                  placeholder="Search reports..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-full sm:w-64"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="awaiting_parties">Awaiting Parties</SelectItem>
                  <SelectItem value="ready_to_file">Ready to File</SelectItem>
                  <SelectItem value="filed">Filed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Escrow #</TableHead>
                  <TableHead>Property Address</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReports.map((report) => {
                  const status = statusConfig[report.status] || {
                    label: report.status,
                    color: "bg-slate-100 text-slate-700",
                  };
                  return (
                    <TableRow key={report.id}>
                      <TableCell className="font-medium">{report.companyName}</TableCell>
                      <TableCell>{report.escrowNumber}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {report.propertyAddress}
                      </TableCell>
                      <TableCell>
                        <Badge className={status.color}>{status.label}</Badge>
                      </TableCell>
                      <TableCell className="text-slate-500">
                        {new Date(report.updatedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/app/reports/${report.id}/wizard`}>
                            Open
                            <ExternalLink className="ml-1 h-3 w-3" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          {filteredReports.length === 0 && (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No reports match your search</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
