"use client"

import {
  Users,
  UserPlus,
  Mail,
  Shield,
  Clock,
  MoreHorizontal,
  Edit,
  Trash2,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

// Mock users data for demo
const MOCK_USERS = [
  {
    id: "1",
    name: "Demo User",
    email: "demo@example.com",
    role: "Admin",
    status: "active",
    lastActive: "Just now",
    initials: "DU",
    color: "from-blue-500 to-cyan-400",
  },
  {
    id: "2",
    name: "Sarah Johnson",
    email: "sarah.johnson@pct.com",
    role: "Escrow Officer",
    status: "active",
    lastActive: "2 hours ago",
    initials: "SJ",
    color: "from-purple-500 to-pink-400",
  },
  {
    id: "3",
    name: "Michael Chen",
    email: "michael.chen@pct.com",
    role: "Escrow Officer",
    status: "active",
    lastActive: "Yesterday",
    initials: "MC",
    color: "from-green-500 to-emerald-400",
  },
  {
    id: "4",
    name: "Emily Rodriguez",
    email: "emily.rodriguez@pct.com",
    role: "Compliance Manager",
    status: "active",
    lastActive: "3 days ago",
    initials: "ER",
    color: "from-amber-500 to-orange-400",
  },
  {
    id: "5",
    name: "David Kim",
    email: "david.kim@pct.com",
    role: "Escrow Officer",
    status: "invited",
    lastActive: "Never",
    initials: "DK",
    color: "from-slate-500 to-slate-400",
  },
]

const ROLE_BADGES: Record<string, string> = {
  Admin: "bg-purple-100 text-purple-700",
  "Escrow Officer": "bg-blue-100 text-blue-700",
  "Compliance Manager": "bg-green-100 text-green-700",
}

const STATUS_BADGES: Record<string, { label: string; color: string }> = {
  active: { label: "Active", color: "bg-green-100 text-green-700" },
  invited: { label: "Invited", color: "bg-amber-100 text-amber-700" },
  inactive: { label: "Inactive", color: "bg-slate-100 text-slate-700" },
}

export default function AdminUsersPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Users</h1>
          <p className="text-slate-500">Manage team members and their permissions</p>
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
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-xl">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Users</p>
                <p className="text-2xl font-bold">{MOCK_USERS.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-xl">
                <Shield className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Active Users</p>
                <p className="text-2xl font-bold">
                  {MOCK_USERS.filter((u) => u.status === "active").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-100 rounded-xl">
                <Mail className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Pending Invites</p>
                <p className="text-2xl font-bold">
                  {MOCK_USERS.filter((u) => u.status === "invited").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>Manage your organization's users and their access levels</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MOCK_USERS.map((user) => {
                  const statusInfo = STATUS_BADGES[user.status] || STATUS_BADGES.inactive
                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className={`bg-gradient-to-br ${user.color} text-white text-sm`}>
                              {user.initials}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{user.name}</p>
                            <p className="text-sm text-slate-500">{user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={ROLE_BADGES[user.role] || "bg-slate-100"}>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={statusInfo.color}>
                          {statusInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-500">
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          {user.lastActive}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" disabled>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem disabled>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem disabled className="text-red-600">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          {/* Demo Notice */}
          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-700 flex items-center gap-2">
              <span className="text-lg">📋</span>
              <span>
                <strong>Demo data</strong> — This is sample user data for demonstration purposes.
                User management features will be available in a future release.
              </span>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
