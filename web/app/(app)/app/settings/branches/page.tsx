"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Building,
  Plus,
  Users,
  MapPin,
  Phone,
  Mail,
  MoreHorizontal,
  Pencil,
  Trash2,
  Star,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { getSessionCompanyId } from "@/lib/session";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

interface Branch {
  id: string;
  name: string;
  code: string | null;
  street: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
  email: string | null;
  manager_name: string | null;
  manager_email: string | null;
  is_active: boolean;
  is_headquarters: boolean;
  user_count: number;
  created_at: string;
}

const emptyForm = {
  name: "",
  code: "",
  street: "",
  city: "",
  state: "",
  zip: "",
  phone: "",
  email: "",
  manager_name: "",
  manager_email: "",
  is_headquarters: false,
};

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ ...emptyForm });

  const companyId = getSessionCompanyId();

  const fetchBranches = useCallback(async (showRefresh = false) => {
    if (!companyId) {
      setLoading(false);
      return;
    }
    if (showRefresh) setRefreshing(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/branches?company_id=${companyId}`,
        { credentials: "include" }
      );
      if (res.ok) {
        setBranches(await res.json());
      } else {
        toast.error("Failed to load branches");
      }
    } catch {
      toast.error("Failed to load branches");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  const resetForm = () => {
    setFormData({ ...emptyForm });
    setEditingBranch(null);
  };

  const openEditDialog = (branch: Branch) => {
    setEditingBranch(branch);
    setFormData({
      name: branch.name,
      code: branch.code || "",
      street: branch.street || "",
      city: branch.city || "",
      state: branch.state || "",
      zip: branch.zip || "",
      phone: branch.phone || "",
      email: branch.email || "",
      manager_name: branch.manager_name || "",
      manager_email: branch.manager_email || "",
      is_headquarters: branch.is_headquarters,
    });
    setShowDialog(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error("Branch name is required");
      return;
    }

    setSaving(true);
    try {
      const url = editingBranch
        ? `${API_BASE_URL}/branches/${editingBranch.id}?company_id=${companyId}`
        : `${API_BASE_URL}/branches?company_id=${companyId}`;

      const res = await fetch(url, {
        method: editingBranch ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast.success(editingBranch ? "Branch updated" : "Branch created");
        setShowDialog(false);
        resetForm();
        fetchBranches();
      } else {
        const err = await res.json().catch(() => ({ detail: "Failed to save" }));
        toast.error(err.detail || "Failed to save branch");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (branch: Branch) => {
    if (!confirm(`Delete "${branch.name}"? All users will be unassigned from this branch.`)) {
      return;
    }
    try {
      const res = await fetch(
        `${API_BASE_URL}/branches/${branch.id}?company_id=${companyId}`,
        { method: "DELETE", credentials: "include" }
      );
      if (res.ok) {
        toast.success(`Branch "${branch.name}" deleted`);
        fetchBranches();
      } else {
        toast.error("Failed to delete branch");
      }
    } catch {
      toast.error("Failed to delete branch");
    }
  };

  // No company — internal staff
  if (!loading && !companyId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Branches & Offices</h1>
          <p className="text-slate-500">Manage your company locations</p>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto text-amber-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Company Found</h3>
            <p className="text-muted-foreground">
              Branch management is available for client companies.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hqCount = branches.filter((b) => b.is_headquarters).length;
  const totalMembers = branches.reduce((sum, b) => sum + b.user_count, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Branches & Offices</h1>
          <p className="text-slate-500">Manage your company&apos;s locations</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => fetchBranches(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Dialog
            open={showDialog}
            onOpenChange={(open) => {
              setShowDialog(open);
              if (!open) resetForm();
            }}
          >
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Branch
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingBranch ? "Edit Branch" : "Add New Branch"}
                </DialogTitle>
                <DialogDescription>
                  {editingBranch
                    ? "Update the branch details below."
                    : "Enter the details for the new branch office."}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                {/* Name + Code */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Branch Name *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Downtown Office"
                    />
                  </div>
                  <div>
                    <Label>Branch Code</Label>
                    <Input
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      placeholder="DT-01"
                    />
                  </div>
                </div>

                {/* Street */}
                <div>
                  <Label>Street Address</Label>
                  <Input
                    value={formData.street}
                    onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                    placeholder="123 Main Street, Suite 100"
                  />
                </div>

                {/* City / State / ZIP */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>City</Label>
                    <Input
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="Los Angeles"
                    />
                  </div>
                  <div>
                    <Label>State</Label>
                    <Input
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      placeholder="CA"
                    />
                  </div>
                  <div>
                    <Label>ZIP</Label>
                    <Input
                      value={formData.zip}
                      onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                      placeholder="90001"
                    />
                  </div>
                </div>

                {/* Phone / Email */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Phone</Label>
                    <Input
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="downtown@company.com"
                    />
                  </div>
                </div>

                {/* Manager */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Branch Manager</Label>
                    <Input
                      value={formData.manager_name}
                      onChange={(e) => setFormData({ ...formData, manager_name: e.target.value })}
                      placeholder="Jane Smith"
                    />
                  </div>
                  <div>
                    <Label>Manager Email</Label>
                    <Input
                      value={formData.manager_email}
                      onChange={(e) => setFormData({ ...formData, manager_email: e.target.value })}
                      placeholder="jane@company.com"
                    />
                  </div>
                </div>

                {/* Headquarters checkbox */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_headquarters}
                    onChange={(e) => setFormData({ ...formData, is_headquarters: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">This is the headquarters / main office</span>
                </label>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={!formData.name.trim() || saving}>
                  {saving
                    ? "Saving..."
                    : editingBranch
                      ? "Save Changes"
                      : "Create Branch"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-teal-100 rounded-lg">
                <Building className="h-5 w-5 text-teal-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Branches</p>
                <p className="text-xl font-bold">
                  {loading ? <Skeleton className="h-7 w-8" /> : branches.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Star className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Headquarters</p>
                <p className="text-xl font-bold">
                  {loading ? <Skeleton className="h-7 w-8" /> : hqCount}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Members</p>
                <p className="text-xl font-bold">
                  {loading ? <Skeleton className="h-7 w-8" /> : totalMembers}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Branches Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Branches</CardTitle>
          <CardDescription>Office locations and their team assignments</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Loading */}
          {loading && (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          )}

          {/* Empty */}
          {!loading && branches.length === 0 && (
            <div className="text-center py-12">
              <Building className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No branches yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first branch office to get started.
              </p>
              <Button onClick={() => setShowDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Branch
              </Button>
            </div>
          )}

          {/* Table */}
          {!loading && branches.length > 0 && (
            <div className="overflow-x-auto -mx-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Branch</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Manager</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {branches.map((branch) => (
                    <TableRow key={branch.id}>
                      {/* Branch name + code */}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center shrink-0">
                            <Building className="w-5 h-5 text-teal-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{branch.name}</span>
                              {branch.is_headquarters && (
                                <Badge variant="secondary" className="text-xs">
                                  <Star className="w-3 h-3 mr-1" />
                                  HQ
                                </Badge>
                              )}
                            </div>
                            {branch.code && (
                              <span className="text-sm text-gray-500">{branch.code}</span>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* Location */}
                      <TableCell>
                        {branch.city && branch.state ? (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <MapPin className="w-4 h-4 shrink-0" />
                            <div>
                              {branch.street && <p className="text-xs text-gray-400">{branch.street}</p>}
                              <p>{branch.city}, {branch.state} {branch.zip}</p>
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </TableCell>

                      {/* Contact */}
                      <TableCell>
                        <div className="text-sm space-y-1">
                          {branch.phone && (
                            <div className="flex items-center gap-1.5 text-gray-600">
                              <Phone className="w-3.5 h-3.5" />
                              {branch.phone}
                            </div>
                          )}
                          {branch.email && (
                            <div className="flex items-center gap-1.5 text-gray-600">
                              <Mail className="w-3.5 h-3.5" />
                              {branch.email}
                            </div>
                          )}
                          {!branch.phone && !branch.email && (
                            <span className="text-gray-400">—</span>
                          )}
                        </div>
                      </TableCell>

                      {/* Manager */}
                      <TableCell>
                        {branch.manager_name ? (
                          <div className="text-sm">
                            <p className="font-medium">{branch.manager_name}</p>
                            {branch.manager_email && (
                              <p className="text-gray-500">{branch.manager_email}</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </TableCell>

                      {/* Team count */}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-gray-400" />
                          <span>{branch.user_count} {branch.user_count === 1 ? "member" : "members"}</span>
                        </div>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(branch)}>
                              <Pencil className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(branch)}
                              className="text-red-600"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
