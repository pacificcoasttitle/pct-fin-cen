"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDemo } from "@/hooks/use-demo";
import { Building2, Save } from "lucide-react";

export default function CompanySettingsPage() {
  const { user } = useDemo();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Company Settings</h1>
        <p className="text-slate-500">Manage your company information</p>
      </div>

      {/* Company Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Company Information
          </CardTitle>
          <CardDescription>
            Basic details about your company
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="companyName">Company Name</Label>
            <Input
              id="companyName"
              defaultValue={user?.companyName || "Demo Title & Escrow"}
              disabled
            />
            <p className="text-xs text-slate-500">
              Contact FinClear to update your company name
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" type="tel" defaultValue="(555) 987-6543" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fax">Fax Number</Label>
              <Input id="fax" type="tel" placeholder="Optional" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Street Address</Label>
            <Input id="address" defaultValue="100 Escrow Blvd" />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" defaultValue="San Diego" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input id="state" defaultValue="CA" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zip">ZIP Code</Label>
              <Input id="zip" defaultValue="92101" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Billing Contact */}
      <Card>
        <CardHeader>
          <CardTitle>Billing Contact</CardTitle>
          <CardDescription>
            Where we send invoices and billing communications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="billingEmail">Billing Email</Label>
            <Input
              id="billingEmail"
              type="email"
              defaultValue="billing@demotitle.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="billingContact">Billing Contact Name</Label>
            <Input id="billingContact" defaultValue="Jane Billing" />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={() => alert("Settings saved! (Demo)")}>
          <Save className="mr-2 h-4 w-4" />
          Save Changes
        </Button>
      </div>
    </div>
  );
}
