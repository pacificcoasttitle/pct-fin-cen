"use client"

import {
  Building2,
  Bell,
  Palette,
  Shield,
  Lock,
  FileCheck,
  Clock,
  Mail,
  MessageSquare,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500">Manage your organization and preferences</p>
      </div>

      {/* Company Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Company Information
          </CardTitle>
          <CardDescription>Your organization details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="company-name">Company Name</Label>
              <Input
                id="company-name"
                defaultValue="FinClear Solutions"
                disabled
                className="bg-slate-50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="license-number">License Number</Label>
              <Input
                id="license-number"
                defaultValue="CA-TITLE-123456"
                disabled
                className="bg-slate-50"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Business Address</Label>
            <Input
              id="address"
              defaultValue="123 Main Street, Suite 100, Los Angeles, CA 90012"
              disabled
              className="bg-slate-50"
            />
          </div>
          <p className="text-xs text-slate-500">
            Contact support to update company information.
          </p>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
          <CardDescription>Configure how you receive updates</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 rounded-lg mt-0.5">
                <Mail className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="font-medium">Email Notifications</p>
                <p className="text-sm text-slate-500">Receive email updates for report status changes</p>
              </div>
            </div>
            <Switch disabled defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-green-100 rounded-lg mt-0.5">
                <MessageSquare className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="font-medium">Party Submission Alerts</p>
                <p className="text-sm text-slate-500">Get notified when a party submits their information</p>
              </div>
            </div>
            <Switch disabled defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-100 rounded-lg mt-0.5">
                <Clock className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <p className="font-medium">Deadline Reminders</p>
                <p className="text-sm text-slate-500">Reminders for upcoming filing deadlines</p>
              </div>
            </div>
            <Switch disabled defaultChecked />
          </div>
          <p className="text-xs text-slate-500 pt-2">
            Notification preferences are currently read-only during the demo period.
          </p>
        </CardContent>
      </Card>

      {/* Branding */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Branding
          </CardTitle>
          <CardDescription>Customize the party portal appearance</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="logo">Company Logo</Label>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-xl flex items-center justify-center">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <Button variant="outline" disabled>
                Upload Logo
              </Button>
            </div>
            <p className="text-xs text-slate-500">PNG or SVG, max 2MB. Displayed on party portal pages.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="primary-color">Brand Color</Label>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 border" />
              <Input
                id="primary-color"
                defaultValue="#3B82F6"
                disabled
                className="w-32 font-mono bg-slate-50"
              />
            </div>
          </div>
          <p className="text-xs text-slate-500">
            Branding customization will be available in a future release.
          </p>
        </CardContent>
      </Card>

      {/* Security & Compliance */}
      <Card className="border-green-200 bg-gradient-to-br from-green-50/50 to-emerald-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-800">
            <Shield className="h-5 w-5" />
            Security & Compliance
          </CardTitle>
          <CardDescription className="text-green-700">
            Your data is protected with enterprise-grade security
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex items-start gap-3 p-4 bg-white rounded-lg border border-green-200">
              <div className="p-2 bg-green-100 rounded-lg">
                <Lock className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-green-800">Encrypted</p>
                <p className="text-sm text-green-600">In transit & at rest</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-white rounded-lg border border-green-200">
              <div className="p-2 bg-green-100 rounded-lg">
                <FileCheck className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-green-800">Audit Trail</p>
                <p className="text-sm text-green-600">Complete activity logs</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-white rounded-lg border border-green-200">
              <div className="p-2 bg-green-100 rounded-lg">
                <Clock className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-green-800">5-Year Retention</p>
                <p className="text-sm text-green-600">FinCEN compliant</p>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-white rounded-lg border border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                Roadmap
              </Badge>
              <span className="font-medium text-slate-700">SOC 2 Type II</span>
            </div>
            <p className="text-sm text-slate-600">
              SOC 2 Type II certification is on our roadmap. We are committed to achieving the
              highest standards of security and compliance for our customers.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Support */}
      <Card>
        <CardHeader>
          <CardTitle>Need Help?</CardTitle>
          <CardDescription>Contact our support team</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button variant="outline" asChild>
            <a href="mailto:support@pacificcoasttitle.com">
              <Mail className="mr-2 h-4 w-4" />
              Email Support
            </a>
          </Button>
          <Button variant="outline" disabled>
            <MessageSquare className="mr-2 h-4 w-4" />
            Live Chat (Coming Soon)
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
