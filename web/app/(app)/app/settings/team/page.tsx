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
import { useDemo } from "@/hooks/use-demo";
import { Users, UserPlus, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Mock team members
const mockTeamMembers = [
  {
    id: "u50",
    name: "Demo Client Admin",
    email: "admin@demotitle.com",
    role: "client_admin",
    status: "active",
    lastLogin: "2026-01-26T14:30:00Z",
  },
  {
    id: "u51",
    name: "Demo Client User",
    email: "user@demotitle.com",
    role: "client_user",
    status: "active",
    lastLogin: "2026-01-25T09:00:00Z",
  },
  {
    id: "u52",
    name: "Sarah Escrow",
    email: "sarah@demotitle.com",
    role: "client_user",
    status: "active",
    lastLogin: "2026-01-24T16:00:00Z",
  },
  {
    id: "u53",
    name: "Mike Title",
    email: "mike@demotitle.com",
    role: "client_user",
    status: "invited",
    lastLogin: null,
  },
];

const roleLabels: Record<string, string> = {
  client_admin: "Admin",
  client_user: "User",
};

const statusConfig: Record<string, { label: string; color: string }> = {
  active: { label: "Active", color: "bg-green-100 text-green-700" },
  invited: { label: "Invited", color: "bg-blue-100 text-blue-700" },
  disabled: { label: "Disabled", color: "bg-slate-100 text-slate-500" },
};

export default function TeamSettingsPage() {
  const { user } = useDemo();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Team Members</h1>
          <p className="text-slate-500">
            Manage who has access to {user?.companyName || "your company"}
          </p>
        </div>
        <Button onClick={() => alert("Invite user feature coming soon! (Demo)")}>
          <UserPlus className="mr-2 h-4 w-4" />
          Invite User
        </Button>
      </div>

      {/* Team Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-lg">
                <Users className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Members</p>
                <p className="text-xl font-bold">{mockTeamMembers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Active</p>
                <p className="text-xl font-bold">
                  {mockTeamMembers.filter((m) => m.status === "active").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <UserPlus className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Pending Invites</p>
                <p className="text-xl font-bold">
                  {mockTeamMembers.filter((m) => m.status === "invited").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Members Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Members</CardTitle>
          <CardDescription>
            Users who can access your company's FinCEN reports
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockTeamMembers.map((member) => {
                  const status = statusConfig[member.status];
                  const isCurrentUser = member.email === user?.email;
                  return (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {member.name}
                          {isCurrentUser && (
                            <Badge variant="outline" className="text-xs">
                              You
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{member.email}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {roleLabels[member.role] || member.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={status.color}>{status.label}</Badge>
                      </TableCell>
                      <TableCell className="text-slate-500">
                        {member.lastLogin
                          ? new Date(member.lastLogin).toLocaleDateString()
                          : "Never"}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={isCurrentUser}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>Edit Role</DropdownMenuItem>
                            <DropdownMenuItem>Resend Invite</DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600">
                              Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Role Permissions Info */}
      <Card>
        <CardHeader>
          <CardTitle>Role Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div>
              <p className="font-medium">Admin</p>
              <p className="text-slate-500">
                Full access: submit requests, view all reports, manage team, view invoices, company settings
              </p>
            </div>
            <div>
              <p className="font-medium">User</p>
              <p className="text-slate-500">
                Limited access: submit requests, view reports, view invoices
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
