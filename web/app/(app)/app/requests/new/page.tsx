"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDemo } from "@/hooks/use-demo";
import { ArrowLeft, Send, Loader2 } from "lucide-react";
import Link from "next/link";

export default function NewRequestPage() {
  const router = useRouter();
  const { user } = useDemo();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [financingType, setFinancingType] = useState("");
  const [buyerType, setBuyerType] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // In real app, this would POST to API
    alert("Request submitted successfully! (Demo)");
    router.push("/app/requests");
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/app/requests">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Submit New Request</h1>
          <p className="text-slate-500">
            Provide transaction details for FinCEN reporting
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Transaction Information */}
        <Card>
          <CardHeader>
            <CardTitle>Transaction Information</CardTitle>
            <CardDescription>
              Basic details about the real estate transaction
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="escrowNumber">Escrow Number *</Label>
                <Input
                  id="escrowNumber"
                  placeholder="e.g., DTE-2026-001"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fileNumber">File Number</Label>
                <Input id="fileNumber" placeholder="Optional internal reference" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="propertyAddress">Property Address *</Label>
              <Input id="propertyAddress" placeholder="Street address" required />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input id="city" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State *</Label>
                <Input id="state" defaultValue="CA" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zip">ZIP *</Label>
                <Input id="zip" required />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="closingDate">Expected Closing Date *</Label>
                <Input id="closingDate" type="date" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="purchasePrice">Purchase Price *</Label>
                <Input
                  id="purchasePrice"
                  type="number"
                  placeholder="e.g., 1250000"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="financingType">Financing Type *</Label>
              <Select value={financingType} onValueChange={setFinancingType} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select financing type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">All Cash</SelectItem>
                  <SelectItem value="financed">Financed</SelectItem>
                  <SelectItem value="partial_cash">
                    Partial Cash / Partial Financed
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Buyer Information */}
        <Card>
          <CardHeader>
            <CardTitle>Buyer Information</CardTitle>
            <CardDescription>
              Details about the buyer in this transaction
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="buyerName">Buyer Name *</Label>
              <Input id="buyerName" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="buyerType">Buyer Type *</Label>
              <Select value={buyerType} onValueChange={setBuyerType} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select buyer type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Individual</SelectItem>
                  <SelectItem value="entity">Entity (LLC, Corp, etc.)</SelectItem>
                  <SelectItem value="trust">Trust</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="buyerEmail">Buyer Email</Label>
                <Input id="buyerEmail" type="email" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="buyerPhone">Buyer Phone</Label>
                <Input id="buyerPhone" type="tel" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Seller Information */}
        <Card>
          <CardHeader>
            <CardTitle>Seller Information</CardTitle>
            <CardDescription>
              Details about the seller in this transaction
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sellerName">Seller Name *</Label>
              <Input id="sellerName" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sellerEmail">Seller Email</Label>
              <Input id="sellerEmail" type="email" />
            </div>
          </CardContent>
        </Card>

        {/* Additional Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Notes</CardTitle>
            <CardDescription>
              Any special instructions or additional information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Any additional information or special instructions..."
              rows={4}
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Submit Request
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
