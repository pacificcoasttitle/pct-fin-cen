"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { Plus, Search, Filter, Eye, Clock, FileText, CheckCircle, XCircle } from "lucide-react";
import Link from "next/link";
import { useState, useMemo } from "react";
import { useDemo } from "@/hooks/use-demo";

// Mock client requests
const mockClientRequests = [
  {
    id: "req-001",
    escrowNumber: "DTE-2026-001",
    propertyAddress: "123 Main St, Los Angeles, CA 90001",
    buyerName: "John Smith",
    status: "pending",
    priority: "normal",
    submittedAt: "2026-01-26T14:30:00Z",
    reportId: null,
  },
  {
    id: "req-002",
    escrowNumber: "DTE-2026-002",
    propertyAddress: "456 Oak Ave, San Diego, CA 92101",
    buyerName: "ABC Holdings LLC",
    status: "in_progress",
    priority: "urgent",
    submittedAt: "2026-01-25T10:15:00Z",
    reportId: "rpt-089",
  },
  {
    id: "req-003",
    escrowNumber: "DTE-2025-089",
    propertyAddress: "789 Pine Blvd, San Francisco, CA 94102",
    buyerName: "Jane Doe",
    status: "completed",
    priority: "normal",
    submittedAt: "2026-01-20T08:00:00Z",
    reportId: "rpt-078",
  },
  {
    id: "req-004",
    escrowNumber: "DTE-2025-088",
    propertyAddress: "321 Cedar Lane, Oakland, CA 94612",
    buyerName: "Smith Family Trust",
    status: "completed",
    priority: "normal",
    submittedAt: "2026-01-18T11:30:00Z",
    reportId: "rpt-077",
  },
  {
    id: "req-005",
    escrowNumber: "DTE-2025-087",
    propertyAddress: "555 Elm St, Pasadena, CA 91101",
    buyerName: "Tech Ventures LLC",
    status: "cancelled",
    priority: "normal",
    submittedAt: "2026-01-15T09:00:00Z",
    reportId: null,
  },
];

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: "Pending", color: "bg-amber-100 text-amber-700", icon: Clock },
  in_progress: { label: "In Progress", color: "bg-blue-100 text-blue-700", icon: FileText },
  completed: { label: "Completed", color: "bg-green-100 text-green-700", icon: CheckCircle },
  cancelled: { label: "Cancelled", color: "bg-slate-100 text-slate-500", icon: XCircle },
};

export default function ClientRequestsPage() {
  const { user } = useDemo();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredRequests = useMemo(() => {
    return mockClientRequests.filter((req) => {
      const matchesSearch =
        !searchQuery ||
        req.escrowNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.propertyAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.buyerName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || req.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [searchQuery, statusFilter]);

  // Stats
  const stats = {
    pending: mockClientRequests.filter((r) => r.status === "pending").length,
    inProgress: mockClientRequests.filter((r) => r.status === "in_progress").length,
    completed: mockClientRequests.filter((r) => r.status === "completed").length,
    total: mockClientRequests.length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Requests</h1>
          <p className="text-slate-500">Track your FinCEN report requests</p>
        </div>
        <Button asChild>
          <Link href="/app/requests/new">
            <Plus className="mr-2 h-4 w-4" />
            New Request
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Pending</p>
                <p className="text-xl font-bold">{stats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">In Progress</p>
                <p className="text-xl font-bold">{stats.inProgress}</p>
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
                <p className="text-sm text-slate-500">Completed</p>
                <p className="text-xl font-bold">{stats.completed}</p>
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
                <p className="text-sm text-slate-500">Total</p>
                <p className="text-xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Requests Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>All Requests</CardTitle>
              <CardDescription>Your submitted FinCEN report requests</CardDescription>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="search"
                  placeholder="Search requests..."
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
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
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
                  <TableHead>Escrow #</TableHead>
                  <TableHead>Property Address</TableHead>
                  <TableHead>Buyer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((req) => {
                  const status = statusConfig[req.status];
                  return (
                    <TableRow key={req.id}>
                      <TableCell className="font-medium">{req.escrowNumber}</TableCell>
                      <TableCell className="max-w-xs truncate">{req.propertyAddress}</TableCell>
                      <TableCell>{req.buyerName}</TableCell>
                      <TableCell>
                        <Badge className={status.color}>{status.label}</Badge>
                        {req.priority === "urgent" && (
                          <Badge variant="destructive" className="ml-1">
                            Urgent
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-slate-500">
                        {new Date(req.submittedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          <Eye className="mr-1 h-4 w-4" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          {filteredRequests.length === 0 && (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No requests match your search</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
