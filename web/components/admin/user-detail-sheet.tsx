"use client"

import { User, Mail, Building2, Clock, Calendar, Shield } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { StatusBadge } from "./status-badge"
import { RoleBadge } from "./role-badge"

export interface UserData {
  id: string
  name: string
  email: string
  companyId: string | null
  companyName: string
  role: string
  status: string
  lastLogin: string | null
  createdAt?: string
}

interface UserDetailSheetProps {
  user: UserData | null
  open: boolean
  onOpenChange: (open: boolean) => void
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
  ]
  const index = name.charCodeAt(0) % colors.length
  return colors[index]
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
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
  if (diffMins < 60) return `${diffMins} minutes ago`
  if (diffHours < 24) return `${diffHours} hours ago`
  if (diffDays === 1) return "Yesterday"
  if (diffDays < 7) return `${diffDays} days ago`
  return formatDate(dateStr)
}

export function UserDetailSheet({ user, open, onOpenChange }: UserDetailSheetProps) {
  if (!user) return null

  const initials = getInitials(user.name)
  const avatarColor = getAvatarColor(user.name)
  const isPCTStaff = !user.companyId

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-start gap-4">
            <Avatar className="h-14 w-14">
              <AvatarFallback className={`bg-gradient-to-br ${avatarColor} text-white text-lg`}>
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <SheetTitle className="text-xl">{user.name}</SheetTitle>
              <SheetDescription className="flex items-center gap-1 mt-0.5">
                <Mail className="h-3.5 w-3.5" />
                {user.email}
              </SheetDescription>
              <div className="flex items-center gap-2 mt-2">
                <RoleBadge role={user.role} />
                <StatusBadge status={user.status} />
              </div>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-4 mt-4">
          {/* Company Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-500">Organization</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                {isPCTStaff ? (
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Shield className="h-5 w-5 text-purple-600" />
                  </div>
                ) : (
                  <div className="p-2 bg-slate-100 rounded-lg">
                    <Building2 className="h-5 w-5 text-slate-600" />
                  </div>
                )}
                <div>
                  <p className="font-medium">{user.companyName}</p>
                  <p className="text-xs text-slate-500">
                    {isPCTStaff ? "Internal Staff" : "Client Company"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Activity */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-500">Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Last Login
                </span>
                <span className="font-medium">{formatTimeAgo(user.lastLogin)}</span>
              </div>
              {user.createdAt && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Member Since
                  </span>
                  <span className="font-medium">{formatDate(user.createdAt)}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions placeholder */}
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-4 text-slate-500">
                <User className="h-6 w-6 mx-auto mb-2 text-slate-300" />
                <p className="text-sm">User management coming soon</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  )
}
