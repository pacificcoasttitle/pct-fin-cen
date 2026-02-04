"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Settings, Building2, Bell, Shield, Database, Clock } from "lucide-react";

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">System Settings</h1>
        <p className="text-slate-500">Configure system-wide settings for FinClear</p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="bg-slate-100">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="data" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Data
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Organization Settings
              </CardTitle>
              <CardDescription>
                Basic information about your organization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="orgName">Organization Name</Label>
                  <Input
                    id="orgName"
                    defaultValue="FinClear Solutions"
                    disabled
                    className="bg-slate-50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="orgCode">Organization Code</Label>
                  <Input
                    id="orgCode"
                    defaultValue="FC"
                    disabled
                    className="bg-slate-50"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="supportEmail">Support Email</Label>
                <Input
                  id="supportEmail"
                  type="email"
                  defaultValue="clear@fincenclear.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone">Default Timezone</Label>
                <Input
                  id="timezone"
                  defaultValue="America/Los_Angeles"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Filing Defaults
              </CardTitle>
              <CardDescription>
                Default settings for FinCEN filings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto-assign Urgent Requests</Label>
                  <p className="text-sm text-slate-500">
                    Automatically assign urgent requests to available staff
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Send Party Reminders</Label>
                  <p className="text-sm text-slate-500">
                    Automatically send reminder emails to pending parties
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Filing Review Required</Label>
                  <p className="text-sm text-slate-500">
                    Require admin approval before filing to FinCEN
                  </p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Email Notifications</CardTitle>
              <CardDescription>
                Configure when email notifications are sent
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>New Request Submitted</Label>
                  <p className="text-sm text-slate-500">
                    Notify admins when a client submits a new request
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Party Information Submitted</Label>
                  <p className="text-sm text-slate-500">
                    Notify when a party completes their portal submission
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Filing Accepted</Label>
                  <p className="text-sm text-slate-500">
                    Notify when a filing is accepted by FinCEN
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Filing Rejected</Label>
                  <p className="text-sm text-slate-500">
                    Notify when a filing is rejected by FinCEN
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>
                Configure security and access controls
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Require 2FA for Admins</Label>
                  <p className="text-sm text-slate-500">
                    Require two-factor authentication for admin users
                  </p>
                </div>
                <Switch disabled />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Session Timeout</Label>
                  <p className="text-sm text-slate-500">
                    Auto-logout after inactivity (hours)
                  </p>
                </div>
                <Input
                  type="number"
                  defaultValue="8"
                  className="w-20"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>IP Allowlist</Label>
                  <p className="text-sm text-slate-500">
                    Restrict access to specific IP addresses
                  </p>
                </div>
                <Switch disabled />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Audit Logging</CardTitle>
              <CardDescription>
                Track system activity and changes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Log All Access</Label>
                  <p className="text-sm text-slate-500">
                    Record all page views and data access
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Log Data Changes</Label>
                  <p className="text-sm text-slate-500">
                    Record all data modifications
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="space-y-2">
                <Label>Audit Log Retention</Label>
                <Input
                  type="number"
                  defaultValue="365"
                  className="w-32"
                />
                <p className="text-sm text-slate-500">Days to retain audit logs</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data Settings */}
        <TabsContent value="data" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Data Management</CardTitle>
              <CardDescription>
                Configure data retention and backup settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Report Retention</Label>
                <Input
                  type="number"
                  defaultValue="7"
                  className="w-32"
                />
                <p className="text-sm text-slate-500">Years to retain filed reports</p>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto-archive Completed Reports</Label>
                  <p className="text-sm text-slate-500">
                    Automatically archive reports 90 days after filing
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Demo Environment</CardTitle>
              <CardDescription>
                Settings specific to the demo environment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300">
                    Demo Mode
                  </Badge>
                </div>
                <p className="text-sm text-amber-700">
                  This is a demo environment. Some features are simulated and data may be reset periodically.
                </p>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Show Demo Banner</Label>
                  <p className="text-sm text-slate-500">
                    Display staging environment indicator
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button disabled>
          Save Changes
        </Button>
      </div>
    </div>
  );
}
