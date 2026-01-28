"use client"

import { useState, useMemo } from "react"
import {
  Users,
  UserPlus,
  Search,
  Shield,
  Building2,
  Clock,
  Filter,
  Eye,
  Activity,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { StatusBadge } from "@/components/admin/status-badge"
import { RoleBadge } from "@/components/admin/role-badge"
import { UserDetailSheet, type UserData } from "@/components/admin/user-detail-sheet"

// Mock users data - 41 users across 12 companies
const mockUsers: UserData[] = [
  // PCT Staff (8 users)
  { id: "u1", name: "Sarah Mitchell", email: "sarah.mitchell@finclear.com", companyId: null, companyName: "FinClear", role: "pct_admin", status: "active", lastLogin: "2026-01-26T14:30:00Z" },
  { id: "u2", name: "James Rodriguez", email: "james.rodriguez@finclear.com", companyId: null, companyName: "FinClear", role: "pct_admin", status: "active", lastLogin: "2026-01-26T13:45:00Z" },
  { id: "u3", name: "Emily Chen", email: "emily.chen@finclear.com", companyId: null, companyName: "FinClear", role: "pct_staff", status: "active", lastLogin: "2026-01-26T15:00:00Z" },
  { id: "u4", name: "Michael Thompson", email: "michael.t@finclear.com", companyId: null, companyName: "FinClear", role: "pct_staff", status: "active", lastLogin: "2026-01-26T12:30:00Z" },
  { id: "u5", name: "Jessica Wang", email: "jessica.wang@finclear.com", companyId: null, companyName: "FinClear", role: "pct_staff", status: "active", lastLogin: "2026-01-26T11:15:00Z" },
  { id: "u6", name: "Daniel Kim", email: "daniel.kim@finclear.com", companyId: null, companyName: "FinClear", role: "pct_staff", status: "active", lastLogin: "2026-01-25T16:00:00Z" },
  { id: "u7", name: "Rachel Foster", email: "rachel.f@finclear.com", companyId: null, companyName: "FinClear", role: "pct_staff", status: "active", lastLogin: "2026-01-26T09:30:00Z" },
  { id: "u8", name: "Andrew Park", email: "andrew.park@finclear.com", companyId: null, companyName: "FinClear", role: "pct_staff", status: "invited", lastLogin: null },
  
  // Golden State Escrow (4 users)
  { id: "u9", name: "Mike Chen", email: "mike.chen@goldenescrow.com", companyId: "2", companyName: "Golden State Escrow", role: "client_admin", status: "active", lastLogin: "2026-01-26T10:15:00Z" },
  { id: "u10", name: "Linda Tran", email: "linda.tran@goldenescrow.com", companyId: "2", companyName: "Golden State Escrow", role: "client_user", status: "active", lastLogin: "2026-01-26T09:00:00Z" },
  { id: "u11", name: "Steve Martinez", email: "steve.m@goldenescrow.com", companyId: "2", companyName: "Golden State Escrow", role: "client_user", status: "active", lastLogin: "2026-01-25T14:30:00Z" },
  { id: "u12", name: "Karen Lee", email: "karen.lee@goldenescrow.com", companyId: "2", companyName: "Golden State Escrow", role: "client_user", status: "disabled", lastLogin: "2025-12-15T10:00:00Z" },
  
  // Summit Title Services (6 users)
  { id: "u13", name: "Jennifer Walsh", email: "jennifer.walsh@summittitle.com", companyId: "3", companyName: "Summit Title Services", role: "client_admin", status: "active", lastLogin: "2026-01-25T16:45:00Z" },
  { id: "u14", name: "Brian Cooper", email: "brian.cooper@summittitle.com", companyId: "3", companyName: "Summit Title Services", role: "client_admin", status: "active", lastLogin: "2026-01-26T08:30:00Z" },
  { id: "u15", name: "Maria Santos", email: "maria.santos@summittitle.com", companyId: "3", companyName: "Summit Title Services", role: "client_user", status: "active", lastLogin: "2026-01-26T10:00:00Z" },
  { id: "u16", name: "Chris Johnson", email: "chris.j@summittitle.com", companyId: "3", companyName: "Summit Title Services", role: "client_user", status: "active", lastLogin: "2026-01-24T15:20:00Z" },
  { id: "u17", name: "Amy Wilson", email: "amy.wilson@summittitle.com", companyId: "3", companyName: "Summit Title Services", role: "client_user", status: "active", lastLogin: "2026-01-25T11:00:00Z" },
  { id: "u18", name: "Tom Brown", email: "tom.brown@summittitle.com", companyId: "3", companyName: "Summit Title Services", role: "client_user", status: "invited", lastLogin: null },
  
  // Bay Area Title (3 users)
  { id: "u19", name: "David Park", email: "david.park@bayareatitle.com", companyId: "4", companyName: "Bay Area Title Co", role: "client_admin", status: "active", lastLogin: "2026-01-26T09:00:00Z" },
  { id: "u20", name: "Susan Miller", email: "susan.m@bayareatitle.com", companyId: "4", companyName: "Bay Area Title Co", role: "client_user", status: "active", lastLogin: "2026-01-25T14:00:00Z" },
  { id: "u21", name: "Greg Thompson", email: "greg.t@bayareatitle.com", companyId: "4", companyName: "Bay Area Title Co", role: "client_user", status: "active", lastLogin: "2026-01-24T16:30:00Z" },
  
  // Coastal Closings (5 users)
  { id: "u22", name: "Amanda Torres", email: "amanda.torres@coastalclosings.com", companyId: "5", companyName: "Coastal Closings Inc", role: "client_admin", status: "active", lastLogin: "2026-01-24T14:20:00Z" },
  { id: "u23", name: "Ryan Garcia", email: "ryan.garcia@coastalclosings.com", companyId: "5", companyName: "Coastal Closings Inc", role: "client_user", status: "active", lastLogin: "2026-01-26T08:00:00Z" },
  { id: "u24", name: "Nicole Adams", email: "nicole.a@coastalclosings.com", companyId: "5", companyName: "Coastal Closings Inc", role: "client_user", status: "active", lastLogin: "2026-01-25T10:30:00Z" },
  { id: "u25", name: "Jason Wright", email: "jason.w@coastalclosings.com", companyId: "5", companyName: "Coastal Closings Inc", role: "client_user", status: "active", lastLogin: "2026-01-23T15:45:00Z" },
  { id: "u26", name: "Melissa Scott", email: "melissa.s@coastalclosings.com", companyId: "5", companyName: "Coastal Closings Inc", role: "client_user", status: "invited", lastLogin: null },
  
  // Premier Escrow (4 users)
  { id: "u27", name: "Robert Kim", email: "robert.kim@premierescrow.com", companyId: "6", companyName: "Premier Escrow Services", role: "client_admin", status: "active", lastLogin: "2026-01-26T11:30:00Z" },
  { id: "u28", name: "Patricia Nguyen", email: "patricia.n@premierescrow.com", companyId: "6", companyName: "Premier Escrow Services", role: "client_user", status: "active", lastLogin: "2026-01-26T10:00:00Z" },
  { id: "u29", name: "Mark Davis", email: "mark.d@premierescrow.com", companyId: "6", companyName: "Premier Escrow Services", role: "client_user", status: "active", lastLogin: "2026-01-25T13:00:00Z" },
  { id: "u30", name: "Laura Chen", email: "laura.chen@premierescrow.com", companyId: "6", companyName: "Premier Escrow Services", role: "client_user", status: "active", lastLogin: "2026-01-24T09:30:00Z" },
  
  // Valley Title (3 users)
  { id: "u31", name: "Lisa Martinez", email: "lisa.martinez@valleytitle.com", companyId: "7", companyName: "Valley Title Group", role: "client_admin", status: "active", lastLogin: "2026-01-25T08:45:00Z" },
  { id: "u32", name: "Eric Johnson", email: "eric.j@valleytitle.com", companyId: "7", companyName: "Valley Title Group", role: "client_user", status: "active", lastLogin: "2026-01-26T07:30:00Z" },
  { id: "u33", name: "Diana Ross", email: "diana.r@valleytitle.com", companyId: "7", companyName: "Valley Title Group", role: "client_user", status: "active", lastLogin: "2026-01-24T14:00:00Z" },
  
  // Sunrise Settlement (2 users)
  { id: "u34", name: "Kevin O'Brien", email: "kevin.obrien@sunrisesettlement.com", companyId: "8", companyName: "Sunrise Settlement Co", role: "client_admin", status: "active", lastLogin: "2026-01-23T15:00:00Z" },
  { id: "u35", name: "Samantha Lee", email: "samantha.l@sunrisesettlement.com", companyId: "8", companyName: "Sunrise Settlement Co", role: "client_user", status: "active", lastLogin: "2026-01-22T11:00:00Z" },
  
  // Heritage Title (1 user)
  { id: "u36", name: "Nancy Wilson", email: "nancy.wilson@heritagetitle.com", companyId: "9", companyName: "Heritage Title Partners", role: "client_admin", status: "invited", lastLogin: null },
  
  // Cornerstone Escrow (3 users)
  { id: "u37", name: "James Lee", email: "james.lee@cornerstoneescrow.com", companyId: "10", companyName: "Cornerstone Escrow", role: "client_admin", status: "active", lastLogin: "2026-01-26T13:15:00Z" },
  { id: "u38", name: "Michelle Park", email: "michelle.p@cornerstoneescrow.com", companyId: "10", companyName: "Cornerstone Escrow", role: "client_user", status: "active", lastLogin: "2026-01-25T16:00:00Z" },
  { id: "u39", name: "Brandon Taylor", email: "brandon.t@cornerstoneescrow.com", companyId: "10", companyName: "Cornerstone Escrow", role: "client_user", status: "active", lastLogin: "2026-01-24T10:30:00Z" },
  
  // Pacific Rim Title (2 users - suspended company)
  { id: "u40", name: "Tom Nakamura", email: "tom.nakamura@pacificrimtitle.com", companyId: "11", companyName: "Pacific Rim Title", role: "client_admin", status: "disabled", lastLogin: "2026-01-10T10:00:00Z" },
  { id: "u41", name: "Helen Chang", email: "helen.chang@pacificrimtitle.com", companyId: "11", companyName: "Pacific Rim Title", role: "client_user", status: "disabled", lastLogin: "2026-01-08T14:00:00Z" },
]

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

// Check if user was active today
function isActiveToday(lastLogin: string | null): boolean {
  if (!lastLogin) return false
  const today = new Date().toDateString()
  return new Date(lastLogin).toDateString() === today
}

export default function AdminUsersPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  // Calculate stats
  const stats = useMemo(() => {
    const pctStaff = mockUsers.filter(u => !u.companyId)
    const clientUsers = mockUsers.filter(u => u.companyId)
    const activeToday = mockUsers.filter(u => isActiveToday(u.lastLogin))
    return {
      total: mockUsers.length,
      pctStaff: pctStaff.length,
      clientUsers: clientUsers.length,
      activeToday: activeToday.length,
    }
  }, [])

  // Filter users
  const filteredUsers = useMemo(() => {
    return mockUsers.filter(user => {
      const matchesSearch = 
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.companyName.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = statusFilter === "all" || user.status === statusFilter
      const matchesType = 
        typeFilter === "all" ||
        (typeFilter === "pct" && !user.companyId) ||
        (typeFilter === "client" && user.companyId)
      return matchesSearch && matchesStatus && matchesType
    })
  }, [searchQuery, statusFilter, typeFilter])

  const handleViewUser = (user: UserData) => {
    setSelectedUser(user)
    setSheetOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Users</h1>
          <p className="text-slate-500">Manage team members and client users</p>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button disabled className="bg-gradient-to-r from-blue-600 to-cyan-500">
                <UserPlus className="mr-2 h-4 w-4" />
                Invite User
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Coming soon</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
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
                <p className="text-2xl font-bold">{stats.total}</p>
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
                <p className="text-xs text-slate-500 uppercase tracking-wide">PCT Staff</p>
                <p className="text-2xl font-bold">{stats.pctStaff}</p>
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
                <p className="text-2xl font-bold">{stats.clientUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-100 rounded-xl">
                <Activity className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Active Today</p>
                <p className="text-2xl font-bold">{stats.activeToday}</p>
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
                  {filteredUsers.length} {filteredUsers.length === 1 ? "user" : "users"}
                </CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
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
                <TabsTrigger value="pct">PCT Staff</TabsTrigger>
                <TabsTrigger value="client">Client Users</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
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
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                      No users found matching your search
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => {
                    const initials = getInitials(user.name)
                    const avatarColor = getAvatarColor(user.name)
                    const isPCTStaff = !user.companyId
                    
                    return (
                      <TableRow 
                        key={user.id} 
                        className="cursor-pointer hover:bg-slate-50"
                        onClick={() => handleViewUser(user)}
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
                            {isPCTStaff ? (
                              <Shield className="h-4 w-4 text-purple-500" />
                            ) : (
                              <Building2 className="h-4 w-4 text-slate-400" />
                            )}
                            <span className={isPCTStaff ? "font-medium text-purple-700" : ""}>
                              {user.companyName}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <RoleBadge role={user.role} />
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={user.status} />
                        </TableCell>
                        <TableCell className="text-slate-500 text-sm">
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" />
                            {formatTimeAgo(user.lastLogin)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleViewUser(user)
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Demo Notice */}
          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-700 flex items-center gap-2">
              <span className="text-lg">📋</span>
              <span>
                <strong>Demo data</strong> — This is sample user data for demonstration purposes.
                User management features will be available post-launch.
              </span>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* User Detail Sheet */}
      <UserDetailSheet
        user={selectedUser}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </div>
  )
}
