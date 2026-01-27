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
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDemo } from "@/hooks/use-demo";
import { 
  ArrowLeft, 
  Send, 
  Loader2, 
  MapPin, 
  DollarSign, 
  User, 
  Users, 
  FileText,
  Calendar,
  Building2,
  Shield,
  CheckCircle,
  HelpCircle,
  AlertCircle,
  Home
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function NewRequestPage() {
  const router = useRouter();
  const { user } = useDemo();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [requestId, setRequestId] = useState("");
  const [financingType, setFinancingType] = useState("");
  const [buyerType, setBuyerType] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Generate mock request ID
    const mockId = `REQ-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
    setRequestId(mockId);
    setIsSuccess(true);
  };

  // Success overlay
  if (isSuccess) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
        <div className="text-center space-y-6 p-8 max-w-md">
          {/* Animated checkmark */}
          <div className="relative mx-auto w-24 h-24">
            <div className="absolute inset-0 rounded-full bg-green-500/20 animate-ping" />
            <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-xl shadow-green-500/30">
              <CheckCircle className="h-12 w-12 text-white" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Request Submitted!</h2>
            <p className="text-muted-foreground">
              Your FinCEN report request has been received. Our team will begin 
              processing and you&apos;ll receive updates on the status.
            </p>
          </div>
          
          <div className="bg-muted rounded-xl p-4 inline-block">
            <p className="text-sm text-muted-foreground">Request ID</p>
            <p className="text-xl font-mono font-bold">{requestId}</p>
          </div>
          
          <div className="flex gap-3 justify-center pt-2">
            <Button variant="outline" asChild>
              <Link href="/app/requests">View All Requests</Link>
            </Button>
            <Button asChild>
              <Link href="/app/requests/new" onClick={() => {
                setIsSuccess(false);
                setRequestId("");
              }}>Submit Another</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/30 via-background to-background -m-6">
      {/* Sticky Header */}
      <div className="border-b bg-background/95 backdrop-blur-sm sticky top-0 z-40">
        <div className="container max-w-4xl py-4 px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" asChild className="hover:bg-muted">
                <Link href="/app/requests">
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
              <div>
                <h1 className="font-semibold text-lg">New FinCEN Request</h1>
                <p className="text-sm text-muted-foreground">{user?.companyName || "Your Company"}</p>
              </div>
            </div>
            
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
              <FileText className="h-3 w-3 mr-1" />
              Draft
            </Badge>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container max-w-4xl py-8 px-6">
        {/* Progress Steps */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            {[
              { icon: Home, label: "Property", color: "blue" },
              { icon: DollarSign, label: "Transaction", color: "green" },
              { icon: Users, label: "Parties", color: "purple" },
              { icon: FileText, label: "Notes", color: "slate" },
            ].map((step, index) => (
              <div key={index} className="flex flex-col items-center relative">
                {index > 0 && (
                  <div className="absolute right-[calc(50%+20px)] top-5 w-[calc(100%-40px)] h-0.5 bg-muted -z-10 hidden sm:block" />
                )}
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                  "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20"
                )}>
                  <step.icon className="h-4 w-4" />
                </div>
                <span className="text-xs mt-2 font-medium text-primary hidden sm:block">
                  {step.label}
                </span>
              </div>
            ))}
          </div>
          <div className="relative h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-primary/80 rounded-full transition-all duration-500 ease-out"
              style={{ width: '100%' }}
            />
          </div>
        </div>

        {/* Info Callout */}
        <div className="relative overflow-hidden rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-sky-50 p-5 mb-8">
          <div className="flex gap-4">
            <div className="shrink-0">
              <div className="w-11 h-11 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/30">
                <HelpCircle className="h-5 w-5" />
              </div>
            </div>
            <div className="space-y-1">
              <h4 className="font-semibold text-blue-900">Why do we need this information?</h4>
              <p className="text-sm text-blue-800">
                FinCEN requires detailed information about all-cash real estate transactions 
                over $300,000 to prevent money laundering. We&apos;ll guide you through the process 
                and handle the compliance filing.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Property & Transaction Information */}
          <Card className="relative overflow-hidden border-0 shadow-xl shadow-black/5">
            <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/20 pointer-events-none" />
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-blue-400 to-blue-500/60" />
            
            <CardHeader className="relative pb-4">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-blue-500/10 text-blue-600 shrink-0">
                  <MapPin className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <CardTitle className="text-xl flex items-center gap-2">
                    Property & Transaction
                    <Badge variant="outline" className="text-xs font-normal">Required</Badge>
                  </CardTitle>
                  <CardDescription>
                    Details about the property and transaction
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="relative space-y-6">
              {/* Escrow / File Numbers */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="escrowNumber" className="text-sm font-medium flex items-center gap-1">
                    Escrow Number <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      <FileText className="h-4 w-4" />
                    </div>
                    <Input
                      id="escrowNumber"
                      placeholder="e.g., DTE-2026-001"
                      required
                      className={cn(
                        "pl-10 h-11 transition-all duration-200",
                        "border-muted-foreground/20",
                        "hover:border-primary/50",
                        "focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      )}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Your internal reference number</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fileNumber" className="text-sm font-medium text-muted-foreground">
                    File Number <span className="text-xs">(optional)</span>
                  </Label>
                  <Input 
                    id="fileNumber" 
                    placeholder="Optional internal reference" 
                    className={cn(
                      "h-11 transition-all duration-200",
                      "border-muted-foreground/20",
                      "hover:border-primary/50",
                      "focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    )}
                  />
                </div>
              </div>

              {/* Property Address Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  Property Address
                </div>
                
                <div className="relative p-5 rounded-xl border border-muted-foreground/10 bg-muted/30 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="propertyAddress" className="text-sm">Street Address *</Label>
                    <Input 
                      id="propertyAddress" 
                      placeholder="123 Main Street" 
                      required 
                      className="bg-background"
                    />
                  </div>
                  
                  <div className="grid gap-4 sm:grid-cols-6">
                    <div className="sm:col-span-3 space-y-2">
                      <Label htmlFor="city" className="text-sm">City *</Label>
                      <Input id="city" placeholder="Los Angeles" required className="bg-background" />
                    </div>
                    <div className="sm:col-span-1 space-y-2">
                      <Label htmlFor="state" className="text-sm">State *</Label>
                      <Select defaultValue="CA">
                        <SelectTrigger className="bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CA">CA</SelectItem>
                          <SelectItem value="NV">NV</SelectItem>
                          <SelectItem value="AZ">AZ</SelectItem>
                          <SelectItem value="OR">OR</SelectItem>
                          <SelectItem value="WA">WA</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="sm:col-span-2 space-y-2">
                      <Label htmlFor="zip" className="text-sm">ZIP Code *</Label>
                      <Input id="zip" placeholder="90001" required className="bg-background" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Closing Date & Price */}
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="closingDate" className="text-sm font-medium flex items-center gap-1">
                    Expected Closing Date <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <Input 
                      id="closingDate" 
                      type="date" 
                      required 
                      className={cn(
                        "pl-10 h-11 transition-all duration-200",
                        "hover:border-primary/50",
                        "focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      )}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="purchasePrice" className="text-sm font-medium flex items-center gap-1">
                    Purchase Price <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      <DollarSign className="h-4 w-4" />
                    </div>
                    <Input
                      id="purchasePrice"
                      type="text"
                      inputMode="numeric"
                      placeholder="1,500,000"
                      required
                      className={cn(
                        "pl-9 h-12 text-lg font-semibold tracking-wide",
                        "transition-all duration-200",
                        "hover:border-primary/50",
                        "focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      )}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">
                      USD
                    </div>
                  </div>
                </div>
              </div>

              {/* Financing Type */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-1">
                  Financing Type <span className="text-destructive">*</span>
                </Label>
                <Select value={financingType} onValueChange={setFinancingType} required>
                  <SelectTrigger className={cn(
                    "h-11 transition-all duration-200",
                    "border-muted-foreground/20",
                    "hover:border-primary/50",
                    "focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  )}>
                    <SelectValue placeholder="Select financing type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash" className="py-3">
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 rounded bg-green-100 text-green-600">
                          <DollarSign className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <p className="font-medium">All Cash</p>
                          <p className="text-xs text-muted-foreground">No financing involved</p>
                        </div>
                      </div>
                    </SelectItem>
                    <SelectItem value="financed" className="py-3">
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 rounded bg-blue-100 text-blue-600">
                          <Building2 className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <p className="font-medium">Financed</p>
                          <p className="text-xs text-muted-foreground">Mortgage or loan financing</p>
                        </div>
                      </div>
                    </SelectItem>
                    <SelectItem value="partial_cash" className="py-3">
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 rounded bg-amber-100 text-amber-600">
                          <DollarSign className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <p className="font-medium">Partial Cash</p>
                          <p className="text-xs text-muted-foreground">Cash + financing combination</p>
                        </div>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Cash Transaction Warning */}
              {financingType === "cash" && (
                <div className="relative overflow-hidden rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-4">
                  <div className="flex gap-4">
                    <div className="shrink-0">
                      <div className="w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center">
                        <AlertCircle className="h-5 w-5" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-semibold text-amber-900">Cash Transaction Detected</h4>
                      <p className="text-sm text-amber-800">
                        All-cash transactions typically require FinCEN reporting. We&apos;ll determine 
                        the exact requirements after reviewing the details.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Buyer Information */}
          <Card className="relative overflow-hidden border-0 shadow-xl shadow-black/5">
            <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/20 pointer-events-none" />
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-purple-400 to-purple-500/60" />
            
            <CardHeader className="relative pb-4">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-purple-500/10 text-purple-600 shrink-0">
                  <User className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <CardTitle className="text-xl flex items-center gap-2">
                    Buyer Information
                    <Badge variant="outline" className="text-xs font-normal">Required</Badge>
                  </CardTitle>
                  <CardDescription>
                    Details about the buyer in this transaction
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="relative space-y-6">
              <div className="space-y-2">
                <Label htmlFor="buyerName" className="text-sm font-medium flex items-center gap-1">
                  Buyer Name <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <User className="h-4 w-4" />
                  </div>
                  <Input 
                    id="buyerName" 
                    placeholder="Full legal name or entity name"
                    required 
                    className={cn(
                      "pl-10 h-11 transition-all duration-200",
                      "border-muted-foreground/20",
                      "hover:border-primary/50",
                      "focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    )}
                  />
                </div>
              </div>

              {/* Buyer Type Selection Cards */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">
                  Buyer Type <span className="text-destructive">*</span>
                </Label>
                
                <div className="grid gap-3 md:grid-cols-3">
                  {[
                    { 
                      value: "individual", 
                      icon: User, 
                      label: "Individual", 
                      description: "Person buying property",
                      bgSelected: "bg-blue-500",
                      bgUnselected: "bg-blue-100",
                      textSelected: "text-white",
                      textUnselected: "text-blue-600",
                      borderSelected: "border-blue-500",
                    },
                    { 
                      value: "entity", 
                      icon: Building2, 
                      label: "Entity", 
                      description: "LLC, Corp, Partnership",
                      bgSelected: "bg-purple-500",
                      bgUnselected: "bg-purple-100",
                      textSelected: "text-white",
                      textUnselected: "text-purple-600",
                      borderSelected: "border-purple-500",
                    },
                    { 
                      value: "trust", 
                      icon: Shield, 
                      label: "Trust", 
                      description: "Trust or estate",
                      bgSelected: "bg-amber-500",
                      bgUnselected: "bg-amber-100",
                      textSelected: "text-white",
                      textUnselected: "text-amber-600",
                      borderSelected: "border-amber-500",
                    },
                  ].map((option) => {
                    const isSelected = buyerType === option.value;
                    return (
                      <label
                        key={option.value}
                        className={cn(
                          "relative flex flex-col items-center p-5 rounded-xl border-2 cursor-pointer",
                          "transition-all duration-200 ease-out",
                          "hover:shadow-md hover:scale-[1.02]",
                          isSelected 
                            ? `${option.borderSelected} bg-gradient-to-br from-background to-muted/50 shadow-lg` 
                            : "border-muted hover:border-muted-foreground/30"
                        )}
                      >
                        <input
                          type="radio"
                          name="buyerType"
                          value={option.value}
                          checked={isSelected}
                          onChange={(e) => setBuyerType(e.target.value)}
                          className="sr-only"
                        />
                        
                        {/* Selection indicator */}
                        <div className={cn(
                          "absolute top-3 right-3 w-5 h-5 rounded-full border-2 flex items-center justify-center",
                          "transition-all duration-200",
                          isSelected 
                            ? `${option.borderSelected} ${option.bgSelected}` 
                            : "border-muted-foreground/30"
                        )}>
                          {isSelected && <CheckCircle className="h-3 w-3 text-white" />}
                        </div>
                        
                        {/* Icon */}
                        <div className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center mb-3",
                          "transition-all duration-200",
                          isSelected 
                            ? `${option.bgSelected} ${option.textSelected}` 
                            : `${option.bgUnselected} ${option.textUnselected}`
                        )}>
                          <option.icon className="h-6 w-6" />
                        </div>
                        
                        {/* Label */}
                        <span className="font-semibold">{option.label}</span>
                        <span className="text-xs text-muted-foreground text-center mt-1">
                          {option.description}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="buyerEmail" className="text-sm font-medium text-muted-foreground">
                    Buyer Email <span className="text-xs">(optional)</span>
                  </Label>
                  <Input 
                    id="buyerEmail" 
                    type="email" 
                    placeholder="buyer@example.com"
                    className={cn(
                      "h-11 transition-all duration-200",
                      "border-muted-foreground/20",
                      "hover:border-primary/50",
                      "focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="buyerPhone" className="text-sm font-medium text-muted-foreground">
                    Buyer Phone <span className="text-xs">(optional)</span>
                  </Label>
                  <Input 
                    id="buyerPhone" 
                    type="tel" 
                    placeholder="(555) 123-4567"
                    className={cn(
                      "h-11 transition-all duration-200",
                      "border-muted-foreground/20",
                      "hover:border-primary/50",
                      "focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    )}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Seller Information */}
          <Card className="relative overflow-hidden border-0 shadow-xl shadow-black/5">
            <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/20 pointer-events-none" />
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 via-orange-400 to-orange-500/60" />
            
            <CardHeader className="relative pb-4">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-orange-500/10 text-orange-600 shrink-0">
                  <Users className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <CardTitle className="text-xl flex items-center gap-2">
                    Seller Information
                    <Badge variant="outline" className="text-xs font-normal">Required</Badge>
                  </CardTitle>
                  <CardDescription>
                    Details about the seller in this transaction
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="relative space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sellerName" className="text-sm font-medium flex items-center gap-1">
                  Seller Name <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <User className="h-4 w-4" />
                  </div>
                  <Input 
                    id="sellerName" 
                    placeholder="Full legal name or entity name"
                    required 
                    className={cn(
                      "pl-10 h-11 transition-all duration-200",
                      "border-muted-foreground/20",
                      "hover:border-primary/50",
                      "focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    )}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sellerEmail" className="text-sm font-medium text-muted-foreground">
                  Seller Email <span className="text-xs">(optional)</span>
                </Label>
                <Input 
                  id="sellerEmail" 
                  type="email" 
                  placeholder="seller@example.com"
                  className={cn(
                    "h-11 transition-all duration-200",
                    "border-muted-foreground/20",
                    "hover:border-primary/50",
                    "focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Additional Notes */}
          <Card className="relative overflow-hidden border-0 shadow-xl shadow-black/5">
            <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/20 pointer-events-none" />
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-slate-500 via-slate-400 to-slate-500/60" />
            
            <CardHeader className="relative pb-4">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-slate-500/10 text-slate-600 shrink-0">
                  <FileText className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <CardTitle className="text-xl">Additional Notes</CardTitle>
                  <CardDescription>
                    Any special circumstances or information we should know about
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="relative">
              <div className="space-y-2">
                <Textarea
                  placeholder="e.g., Rush closing needed, buyer is relocating from overseas, multiple beneficial owners expected..."
                  rows={4}
                  maxLength={1000}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className={cn(
                    "resize-none transition-all duration-200",
                    "hover:border-primary/50",
                    "focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  )}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Optional but helpful for our team</span>
                  <span>{notes.length}/1000</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sticky Submit Footer */}
          <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t mt-8 -mx-6 px-6 py-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => router.back()}
                className="order-2 sm:order-1"
              >
                Cancel
              </Button>
              
              <div className="flex items-center gap-4 order-1 sm:order-2">
                <div className="hidden md:block text-right">
                  <p className="text-sm font-medium">Ready to submit?</p>
                  <p className="text-xs text-muted-foreground">We&apos;ll review and begin processing</p>
                </div>
                
                <Button
                  type="submit"
                  size="lg"
                  disabled={isSubmitting}
                  className={cn(
                    "min-w-[160px] h-12 w-full sm:w-auto",
                    "bg-gradient-to-r from-primary to-primary/90",
                    "hover:from-primary/90 hover:to-primary/80",
                    "shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30",
                    "transition-all duration-200"
                  )}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      Submit Request
                      <Send className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
