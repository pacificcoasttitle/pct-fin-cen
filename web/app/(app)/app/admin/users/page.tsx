"use client"

import { useState, useEffect } from "react"
import {
  Users,
  UserPlus,
  Search,
  Shield,
  Building2,
  Clock,
  Eye,
  Activity,
  RefreshCw,
  MoreHorizontal,
  Ban,
  CheckCircle,
  UserCog,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/components/ui/use-toast"
import { format } from "date-fns"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL

interface User {
  id: string
  name: string
  email: string
  role: string
  status: string
  company_id: string | null
  company_name: string | null
  company_code: string | null
  last_login_at: string | null
  created_at: string
}

interface UserStats {
  total: number
  active: number
  disabled: number
  invited: number
  internal: number
  clients: number
  by_role: Record<string, number>
}

interface UserDetail extends User {
  settings: any
  updated_at: string
  stats: {
    reports_created: number
    reports_assigned: number
    requests_submitted: number
  }
}

interface Company {
  id: string
  name: string
  code: string
}

const roleLabels: Record<string, string> = {
  coo: "COO",
  pct_admin: "FinClear Admin",
  pct_staff: "FinClear Staff",
  client_admin: "Client Admin",
  client_user: "Client User",
}

const roleColors: Record<string, string> = {
  coo: "bg-amber-100 text-amber-800",
  pct_admin: "bg-purple-100 text-purple-800",
  pct_staff: "bg-blue-100 text-blue-800",
  client_admin: "bg-green-100 text-green-800",
  client_user: "bg-slate-100 text-slate-800",
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "Active", variant: "default" },
  invited: { label: "Invited", variant: "secondary" },
  disabled: { label: "Disabled", variant: "destructive" },
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

function getAvatarColor(name: string): string {
  const colors = [
    "from-blue-500 to-cyan-400",
    "from-purple-500 to-pink-400",
    "from-green-500 to-emerald-400",
    "from-amber-500 to-orange-400",
    "from-red-500 to-rose-400",
    "from-indigo-500 to-violet-400",
    "from-teal-500 to-cyan-400",
    "from-rose-500 to-pink-400",
  ]
  const index = name.charCodeAt(0) % colors.length
  return colors[index]
}

function formatTimeAgo(dateStr: string | null): string {
  if (!dateStr) return "Never"
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return "Yesterday"
  if (diffDays < 7) return `${diffDays}d ago`
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export default function AdminUsersPage() {
  const { toast } = useToast()
  const [users, setUsers] = useState<User[]>([])
  const [stats, setStats] = useState<UserStats | null>(null)
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  
  // Detail sheet
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(false)
  
  // Create/Invite dialog
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviting, setInviting] = useState(false)
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    role: "client_user",
    company_id: "",
  })

  // Fetch users
  const fetchUsers = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true)
    try {
      const params = new URLSearchParams()
      if (typeFilter === "internal") params.set("company_type", "internal")
      if (typeFilter === "client") params.set("company_type", "client")
      if (statusFilter !== "all") params.set("status", statusFilter)
      if (search) params.set("search", search)
      
      const response = await fetch(`${API_BASE_URL}/users?${params}`)
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users || [])
      }
    } catch (error) {
      console.error("Failed to fetch users:", error)
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Fetch stats
  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/stats/summary`)
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error)
    }
  }

  // Fetch companies for invite dropdown
  const fetchCompanies = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/companies?company_type=client`)
      if (response.ok) {
        const data = await response.json()
        setCompanies(data.companies || [])
      }
    } catch (error) {
      console.error("Failed to fetch companies:", error)
    }
  }

  // Fetch user detail
  const fetchUserDetail = async (userId: string) => {
    setLoadingDetail(true)
    try {
      const response = await fetch(`${API_BASE_URL}/users/${userId}`)
      if (response.ok) {
        const data = await response.json()
        setSelectedUser(data)
        setSheetOpen(true)
      }
    } catch (error) {
      console.error("Failed to fetch user detail:", error)
    } finally {
      setLoadingDetail(false)
    }
  }

  // Invite user
  const handleInvite = async () => {
    if (!newUser.name || !newUser.email || !newUser.company_id) {
      toast({
        title: "Validation Error",
        description: "Name, email, and company are required",
        variant: "destructive",
      })
      return
    }
    
    setInviting(true)
    try {
      const response = await fetch(`${API_BASE_URL}/users/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser),
      })
      
      if (response.ok) {
        toast({
          title: "Success",
          description: "User invited successfully",
        })
        setInviteOpen(false)
        setNewUser({ name: "", email: "", role: "client_user", company_id: "" })
        fetchUsers()
        fetchStats()
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.detail || "Failed to invite user",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to invite user",
        variant: "destructive",
      })
    } finally {
      setInviting(false)
    }
  }

  // Update user status
  const handleStatusChange = async (userId: string, newStatus: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      
      if (response.ok) {
        toast({
          title: "Success",
          description: `User ${newStatus === "disabled" ? "deactivated" : "activated"}`,
        })
        fetchUsers()
        fetchStats()
        if (selectedUser?.id === userId) {
          fetchUserDetail(userId)
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update user status",
        variant: "destructive",
      })
    }
  }

  // Update user role
  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      })
      
      if (response.ok) {
        toast({
          title: "Success",
          description: "User role updated",
        })
        fetchUsers()
        if (selectedUser?.id === userId) {
          fetchUserDetail(userId)
        }
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.detail || "Failed to update role",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update role",
        variant: "destructive",
      })
    }
  }

  useEffect(() => {
    fetchUsers()
    fetchStats()
    fetchCompanies()
  }, [statusFilter, typeFilter])

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchUsers()
    }, 300)
    return () => clearTimeout(debounce)
  }, [search])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Users</h1>
          <p className="text-slate-500">Manage team members and client users</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => { fetchUsers(true); fetchStats(); }}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-blue-600 to-cyan-500">
                <UserPlus className="mr-2 h-4 w-4" />
                Invite User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite User</DialogTitle>
                <DialogDescription>
                  Invite a new user to a client company. They'll receive access immediately (demo mode).
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label>Full Name *</Label>
                  <Input
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    placeholder="John Smith"
                  />
                </div>
                <div>
                  <Label>Email Address *</Label>
                  <Input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    placeholder="john@company.com"
                  />
                </div>
                <div>
                  <Label>Company *</Label>
                  <Select value={newUser.company_id} onValueChange={(v) => setNewUser({ ...newUser, company_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a company" />
                    </SelectTrigger>
                    <SelectContent>
                      {companies.map((company) => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name} ({company.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Role</Label>
                  <Select value={newUser.role} onValueChange={(v) => setNewUser({ ...newUser, role: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="client_admin">Client Admin</SelectItem>
                      <SelectItem value="client_user">Client User</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setInviteOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleInvite} disabled={inviting}>
                  {inviting ? "Inviting..." : "Invite User"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-slate-100 rounded-xl">
                <Users className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Total Users</p>
                <p className="text-2xl font-bold">{stats?.total ?? <Skeleton className="h-8 w-12" />}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-purple-100 rounded-xl">
                <Shield className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">FinClear Staff</p>
                <p className="text-2xl font-bold">{stats?.internal ?? <Skeleton className="h-8 w-12" />}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-100 rounded-xl">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Client Users</p>
                <p className="text-2xl font-bold">{stats?.clients ?? <Skeleton className="h-8 w-12" />}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-100 rounded-xl">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Active Users</p>
                <p className="text-2xl font-bold">{stats?.active ?? <Skeleton className="h-8 w-12" />}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle>All Users</CardTitle>
                <CardDescription>
                  {loading ? "Loading..." : `${users.length} ${users.length === 1 ? "user" : "users"}`}
                </CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search users..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 w-[200px]"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="invited">Invited</SelectItem>
                    <SelectItem value="disabled">Disabled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Type Filter Tabs */}
            <Tabs value={typeFilter} onValueChange={setTypeFilter}>
              <TabsList>
                <TabsTrigger value="all">All Users</TabsTrigger>
                <TabsTrigger value="internal">FinClear Staff</TabsTrigger>
                <TabsTrigger value="client">Client Users</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {/* Loading State */}
          {loading && (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && users.length === 0 && (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No users found</h3>
              <p className="text-muted-foreground mb-4">
                {search ? "Try adjusting your search" : "Invite your first user to get started"}
              </p>
              {!search && (
                <Button onClick={() => setInviteOpen(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite User
                </Button>
              )}
            </div>
          )}

          {/* Table */}
          {!loading && users.length > 0 && (
            <div className="overflow-x-auto -mx-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => {
                    const initials = getInitials(user.name)
                    const avatarColor = getAvatarColor(user.name)
                    const isInternal = !user.company_id
                    
                    return (
                      <TableRow 
                        key={user.id} 
                        className="cursor-pointer hover:bg-slate-50"
                        onClick={() => fetchUserDetail(user.id)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarFallback className={`bg-gradient-to-br ${avatarColor} text-white text-sm`}>
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{user.name}</p>
                              <p className="text-sm text-slate-500">{user.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {isInternal ? (
                              <Shield className="h-4 w-4 text-purple-500" />
                            ) : (
                              <Building2 className="h-4 w-4 text-slate-400" />
                            )}
                            <span className={isInternal ? "font-medium text-purple-700" : ""}>
                              {user.company_name || "FinClear"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={roleColors[user.role] || "bg-slate-100 text-slate-800"}>
                            {roleLabels[user.role] || user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusConfig[user.status]?.variant || "secondary"}>
                            {statusConfig[user.status]?.label || user.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-500 text-sm">
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" />
                            {formatTimeAgo(user.last_login_at)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); fetchUserDetail(user.id); }}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {user.status === "active" && (
                                <DropdownMenuItem
                                  onClick={(e) => { e.stopPropagation(); handleStatusChange(user.id, "disabled"); }}
                                  className="text-red-600"
                                >
                                  <Ban className="h-4 w-4 mr-2" />
                                  Deactivate
                                </DropdownMenuItem>
                              )}
                              {user.status === "disabled" && (
                                <DropdownMenuItem
                                  onClick={(e) => { e.stopPropagation(); handleStatusChange(user.id, "active"); }}
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
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Detail Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-[500px] sm:w-[600px] overflow-y-auto">
          {loadingDetail ? (
            <div className="space-y-4 pt-8">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : selectedUser ? (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className={`bg-gradient-to-br ${getAvatarColor(selectedUser.name)} text-white`}>
                      {getInitials(selectedUser.name)}
                    </AvatarFallback>
                  </Avatar>
                  {selectedUser.name}
                </SheetTitle>
                <SheetDescription>
                  {selectedUser.email} • Joined {selectedUser.created_at ? format(new Date(selectedUser.created_at), "MMMM d, yyyy") : "—"}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Status & Role */}
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Status</p>
                      <Badge variant={statusConfig[selectedUser.status]?.variant || "secondary"} className="mt-1">
                        {statusConfig[selectedUser.status]?.label || selectedUser.status}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Role</p>
                      <Badge className={`${roleColors[selectedUser.role] || "bg-slate-100 text-slate-800"} mt-1`}>
                        {roleLabels[selectedUser.role] || selectedUser.role}
                      </Badge>
                    </div>
                  </div>
                  {selectedUser.status === "active" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStatusChange(selectedUser.id, "disabled")}
                      className="text-red-600"
                    >
                      <Ban className="h-4 w-4 mr-1" />
                      Deactivate
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStatusChange(selectedUser.id, "active")}
                      className="text-green-600"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Reactivate
                    </Button>
                  )}
                </div>

                {/* Company */}
                <div>
                  <h4 className="font-semibold mb-3">Company</h4>
                  <div className="flex items-center gap-2">
                    {selectedUser.company_id ? (
                      <>
                        <Building2 className="h-4 w-4 text-slate-400" />
                        <span>{selectedUser.company_name}</span>
                        <Badge variant="outline" className="font-mono">{selectedUser.company_code}</Badge>
                      </>
                    ) : (
                      <>
                        <Shield className="h-4 w-4 text-purple-500" />
                        <span className="font-medium text-purple-700">FinClear Solutions</span>
                        <Badge variant="outline" className="bg-purple-50">Internal</Badge>
                      </>
                    )}
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg text-center">
                    <Activity className="h-5 w-5 mx-auto text-blue-600 mb-1" />
                    <p className="text-2xl font-bold">{selectedUser.stats?.reports_created || 0}</p>
                    <p className="text-xs text-muted-foreground">Reports Created</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg text-center">
                    <UserCog className="h-5 w-5 mx-auto text-green-600 mb-1" />
                    <p className="text-2xl font-bold">{selectedUser.stats?.reports_assigned || 0}</p>
                    <p className="text-xs text-muted-foreground">Assigned</p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg text-center">
                    <Users className="h-5 w-5 mx-auto text-purple-600 mb-1" />
                    <p className="text-2xl font-bold">{selectedUser.stats?.requests_submitted || 0}</p>
                    <p className="text-xs text-muted-foreground">Requests</p>
                  </div>
                </div>

                {/* Activity */}
                <div>
                  <h4 className="font-semibold mb-3">Activity</h4>
                  <div className="space-y-2 text-sm">
                    <p>
                      <span className="text-muted-foreground">Last login:</span>{" "}
                      {selectedUser.last_login_at ? format(new Date(selectedUser.last_login_at), "PPpp") : "Never"}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Created:</span>{" "}
                      {selectedUser.created_at ? format(new Date(selectedUser.created_at), "PPpp") : "—"}
                    </p>
                    {selectedUser.updated_at && (
                      <p>
                        <span className="text-muted-foreground">Updated:</span>{" "}
                        {format(new Date(selectedUser.updated_at), "PPpp")}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  )
}
