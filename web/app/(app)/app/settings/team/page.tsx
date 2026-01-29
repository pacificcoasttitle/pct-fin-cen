"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDemo } from "@/hooks/use-demo";
import { useToast } from "@/components/ui/use-toast";
import { getSessionCompanyId } from "@/lib/session";
import { Users, UserPlus, MoreHorizontal, RefreshCw, Ban, CheckCircle, Shield, UserCog } from "lucide-react";
import { format } from "date-fns";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  last_login_at: string | null;
  created_at: string;
}

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
  const { toast } = useToast();
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Invite dialog
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [newMember, setNewMember] = useState({
    name: "",
    email: "",
    role: "client_user",
  });

  // Get company_id using shared session utility
  const getCompanyId = () => getSessionCompanyId();

  // Fetch team members
  const fetchTeam = async (showRefresh = false) => {
    const companyId = getCompanyId();
    if (!companyId) {
      setTeam([]);
      setLoading(false);
      return;
    }
    
    if (showRefresh) setRefreshing(true);
    try {
      const response = await fetch(`${API_BASE_URL}/users/my-team?company_id=${companyId}`);
      if (response.ok) {
        const data = await response.json();
        setTeam(data.team || []);
      }
    } catch (error) {
      console.error("Failed to fetch team:", error);
      toast({
        title: "Error",
        description: "Failed to fetch team members",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Invite member
  const handleInvite = async () => {
    const companyId = getCompanyId();
    if (!companyId) {
      toast({
        title: "Error",
        description: "Company not found",
        variant: "destructive",
      });
      return;
    }

    if (!newMember.name || !newMember.email) {
      toast({
        title: "Validation Error",
        description: "Name and email are required",
        variant: "destructive",
      });
      return;
    }
    
    setInviting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/users/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newMember,
          company_id: companyId,
        }),
      });
      
      if (response.ok) {
        toast({
          title: "Success",
          description: "Team member invited successfully",
        });
        setInviteOpen(false);
        setNewMember({ name: "", email: "", role: "client_user" });
        fetchTeam();
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.detail || "Failed to invite member",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to invite member",
        variant: "destructive",
      });
    } finally {
      setInviting(false);
    }
  };

  // Update member role
  const handleRoleChange = async (memberId: string, newRole: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      
      if (response.ok) {
        toast({
          title: "Success",
          description: "Role updated successfully",
        });
        fetchTeam();
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.detail || "Failed to update role",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update role",
        variant: "destructive",
      });
    }
  };

  // Remove/disable member
  const handleRemove = async (memberId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${memberId}`, {
        method: "DELETE",
      });
      
      if (response.ok) {
        toast({
          title: "Success",
          description: "Member removed successfully",
        });
        fetchTeam();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove member",
        variant: "destructive",
      });
    }
  };

  // Reactivate member
  const handleReactivate = async (memberId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${memberId}/reactivate`, {
        method: "POST",
      });
      
      if (response.ok) {
        toast({
          title: "Success",
          description: "Member reactivated",
        });
        fetchTeam();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reactivate member",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchTeam();
  }, []);

  const activeCount = team.filter((m) => m.status === "active").length;
  const invitedCount = team.filter((m) => m.status === "invited").length;

  // If no company (internal staff), show a message
  if (!loading && !getCompanyId()) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Team Members</h1>
          <p className="text-slate-500">Manage team access</p>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <Shield className="h-12 w-12 mx-auto text-purple-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">FinClear Internal Staff</h3>
            <p className="text-muted-foreground">
              As an internal staff member, team management is handled by administrators.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

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
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => fetchTeam(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Invite User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite Team Member</DialogTitle>
                <DialogDescription>
                  Add a new member to your team. They'll get access immediately (demo mode).
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label>Full Name *</Label>
                  <Input
                    value={newMember.name}
                    onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                    placeholder="John Smith"
                  />
                </div>
                <div>
                  <Label>Email Address *</Label>
                  <Input
                    type="email"
                    value={newMember.email}
                    onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                    placeholder="john@company.com"
                  />
                </div>
                <div>
                  <Label>Role</Label>
                  <Select value={newMember.role} onValueChange={(v) => setNewMember({ ...newMember, role: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="client_admin">Admin</SelectItem>
                      <SelectItem value="client_user">User</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setInviteOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleInvite} disabled={inviting}>
                  {inviting ? "Inviting..." : "Invite Member"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
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
                <p className="text-xl font-bold">
                  {loading ? <Skeleton className="h-7 w-8" /> : team.length}
                </p>
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
                <p className="text-sm text-slate-500">Active</p>
                <p className="text-xl font-bold">
                  {loading ? <Skeleton className="h-7 w-8" /> : activeCount}
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
                  {loading ? <Skeleton className="h-7 w-8" /> : invitedCount}
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
          {/* Loading State */}
          {loading && (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && team.length === 0 && (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No team members yet</h3>
              <p className="text-muted-foreground mb-4">
                Invite your first team member to get started
              </p>
              <Button onClick={() => setInviteOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Invite User
              </Button>
            </div>
          )}

          {/* Table */}
          {!loading && team.length > 0 && (
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
                  {team.map((member) => {
                    const status = statusConfig[member.status] || statusConfig.active;
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
                          {member.last_login_at
                            ? format(new Date(member.last_login_at), "MMM d, yyyy")
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
                              {member.role === "client_user" && (
                                <DropdownMenuItem onClick={() => handleRoleChange(member.id, "client_admin")}>
                                  <UserCog className="h-4 w-4 mr-2" />
                                  Promote to Admin
                                </DropdownMenuItem>
                              )}
                              {member.role === "client_admin" && (
                                <DropdownMenuItem onClick={() => handleRoleChange(member.id, "client_user")}>
                                  <UserCog className="h-4 w-4 mr-2" />
                                  Change to User
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              {member.status === "active" && (
                                <DropdownMenuItem 
                                  onClick={() => handleRemove(member.id)}
                                  className="text-red-600"
                                >
                                  <Ban className="h-4 w-4 mr-2" />
                                  Remove
                                </DropdownMenuItem>
                              )}
                              {member.status === "disabled" && (
                                <DropdownMenuItem 
                                  onClick={() => handleReactivate(member.id)}
                                  className="text-green-600"
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Reactivate
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
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
