# 🦈 Wizard Rebuild — Day 3: Collection Phase

## Mission
Build the 5 collection step components. These collect data for the FinCEN report and connect to party links/portal.

**Prerequisites:** Day 1 + Day 2 complete.

**IMPORTANT:** Transaction details (address, escrow #, price, date) are already collected in Step 0 (Transaction Reference) which was built in Day 1. The collection phase now focuses on:
- Party setup (buyers/sellers)
- Party status monitoring
- Reporting person
- Review & file

---

## Architecture Context

### Collection Steps

```
(Step 0: Transaction Reference — already done in determination phase)
                             ↓
Step 1: Party Setup → Add buyers/sellers, send portal links
Step 2: Party Status → Monitor portal submissions
Step 3: Reporting Person → Who is filing the report
Step 4: Review & File → Final review, certify, submit
```

### Data Output

Collection steps write to `wizard_data.collection`:

```typescript
collection: {
  propertyAddress: { street, city, state, zip, county },
  purchasePrice: number,
  closingDate: string,
  propertyType?: string,
  apn?: string,
  legalDescription?: string,
  
  sellers: [...],           // Synced from party portal
  buyerEntity?: {...},       // Synced from party portal
  buyerTrust?: {...},        // Synced from party portal
  paymentSources: [...],     // Collected in portal
  reportingPerson: {...},
  
  siteXData?: object,        // Auto-filled from property lookup
}
```

### API Endpoints Used

| Endpoint | Purpose |
|----------|---------|
| `POST /reports/{id}/party-links` | Create party links |
| `GET /reports/{id}/parties` | Get party status |
| `POST /reports/{id}/determine` | Trigger status change |
| `POST /reports/{id}/file` | Submit filing |

---

## File Structure

```
web/components/wizard/
├── collection/
│   ├── index.ts
│   ├── PartySetupStep.tsx
│   ├── PartyStatusStep.tsx
│   ├── ReportingPersonStep.tsx
│   └── ReviewAndFileStep.tsx
```

**Note:** No TransactionDetailsStep needed — that data is collected in Step 0 (TransactionReferenceStep) which lives in `shared/`.

---

## Step 1: PartySetupStep.tsx

```tsx
"use client";

import { useState } from "react";
import { StepCard } from "../shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Send, 
  User, 
  Building2, 
  Mail,
  Trash2,
  Loader2 
} from "lucide-react";
import { createPartyLinks, PartyInput } from "@/lib/api";
import { toast } from "sonner";

interface Party {
  id?: string;
  party_role: "transferee" | "transferor";
  entity_type: "individual" | "entity";
  display_name: string;
  email: string;
}

interface PartySetupStepProps {
  reportId: string;
  parties: Party[];
  onPartiesChange: (parties: Party[]) => void;
}

export function PartySetupStep({ 
  reportId, 
  parties,
  onPartiesChange,
}: PartySetupStepProps) {
  const [isAddingParty, setIsAddingParty] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [newParty, setNewParty] = useState<Party>({
    party_role: "transferor",
    entity_type: "individual",
    display_name: "",
    email: "",
  });
  
  const buyers = parties.filter((p) => p.party_role === "transferee");
  const sellers = parties.filter((p) => p.party_role === "transferor");
  
  const handleAddParty = () => {
    if (!newParty.display_name || !newParty.email) {
      toast.error("Please fill in name and email");
      return;
    }
    
    onPartiesChange([...parties, { ...newParty }]);
    setNewParty({
      party_role: "transferor",
      entity_type: "individual",
      display_name: "",
      email: "",
    });
    setIsAddingParty(false);
  };
  
  const handleRemoveParty = (index: number) => {
    const updated = parties.filter((_, i) => i !== index);
    onPartiesChange(updated);
  };
  
  const handleSendLinks = async () => {
    if (parties.length === 0) {
      toast.error("Add at least one party before sending links");
      return;
    }
    
    if (buyers.length === 0) {
      toast.error("Add at least one buyer");
      return;
    }
    
    if (sellers.length === 0) {
      toast.error("Add at least one seller");
      return;
    }
    
    setIsSending(true);
    try {
      const partyInputs: PartyInput[] = parties.map((p) => ({
        party_role: p.party_role,
        entity_type: p.entity_type,
        display_name: p.display_name,
        email: p.email,
      }));
      
      await createPartyLinks(reportId, partyInputs, 7);
      toast.success("Party links sent successfully!");
    } catch (error: any) {
      console.error("Failed to send party links:", error);
      toast.error(error.message || "Failed to send party links");
    } finally {
      setIsSending(false);
    }
  };
  
  return (
    <StepCard
      title="Party Setup"
      description="Add the buyers and sellers for this transaction. Each party will receive a secure link to submit their information."
    >
      <div className="space-y-6">
        {/* Buyers Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium">Buyers (Transferees)</h3>
            <Badge variant="outline">{buyers.length} added</Badge>
          </div>
          
          <div className="space-y-2">
            {buyers.map((party, idx) => (
              <PartyCard
                key={idx}
                party={party}
                onRemove={() => {
                  const globalIdx = parties.findIndex((p) => p === party);
                  handleRemoveParty(globalIdx);
                }}
              />
            ))}
            
            {buyers.length === 0 && (
              <div className="text-sm text-muted-foreground italic p-4 border border-dashed rounded-lg text-center">
                No buyers added yet
              </div>
            )}
          </div>
        </div>
        
        {/* Sellers Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium">Sellers (Transferors)</h3>
            <Badge variant="outline">{sellers.length} added</Badge>
          </div>
          
          <div className="space-y-2">
            {sellers.map((party, idx) => (
              <PartyCard
                key={idx}
                party={party}
                onRemove={() => {
                  const globalIdx = parties.findIndex((p) => p === party);
                  handleRemoveParty(globalIdx);
                }}
              />
            ))}
            
            {sellers.length === 0 && (
              <div className="text-sm text-muted-foreground italic p-4 border border-dashed rounded-lg text-center">
                No sellers added yet
              </div>
            )}
          </div>
        </div>
        
        {/* Add Party Dialog */}
        <Dialog open={isAddingParty} onOpenChange={setIsAddingParty}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Party
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Party</DialogTitle>
              <DialogDescription>
                Add a buyer or seller to this transaction.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Role</Label>
                  <Select
                    value={newParty.party_role}
                    onValueChange={(v) => 
                      setNewParty({ ...newParty, party_role: v as any })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="transferee">Buyer</SelectItem>
                      <SelectItem value="transferor">Seller</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Type</Label>
                  <Select
                    value={newParty.entity_type}
                    onValueChange={(v) => 
                      setNewParty({ ...newParty, entity_type: v as any })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">Individual</SelectItem>
                      <SelectItem value="entity">Entity/Trust</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label>
                  {newParty.entity_type === "individual" ? "Full Name" : "Company Name"}
                </Label>
                <Input
                  value={newParty.display_name}
                  onChange={(e) => 
                    setNewParty({ ...newParty, display_name: e.target.value })
                  }
                  placeholder={
                    newParty.entity_type === "individual" 
                      ? "John Smith" 
                      : "Acme Holdings LLC"
                  }
                />
              </div>
              
              <div>
                <Label>Email Address</Label>
                <Input
                  type="email"
                  value={newParty.email}
                  onChange={(e) => 
                    setNewParty({ ...newParty, email: e.target.value })
                  }
                  placeholder="email@example.com"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  A secure link will be sent to this email.
                </p>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddingParty(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddParty}>
                Add Party
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Send Links Button */}
        {parties.length > 0 && (
          <Button
            onClick={handleSendLinks}
            disabled={isSending || buyers.length === 0 || sellers.length === 0}
            className="w-full"
          >
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Party Links
              </>
            )}
          </Button>
        )}
      </div>
    </StepCard>
  );
}

// Party Card Component
function PartyCard({ party, onRemove }: { party: Party; onRemove: () => void }) {
  return (
    <Card className="p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
            {party.entity_type === "individual" ? (
              <User className="h-4 w-4" />
            ) : (
              <Building2 className="h-4 w-4" />
            )}
          </div>
          <div>
            <p className="font-medium text-sm">{party.display_name}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Mail className="h-3 w-3" />
              {party.email}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {party.party_role === "transferee" ? "Buyer" : "Seller"}
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={onRemove}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
```

---

## Step 2: PartyStatusStep.tsx

```tsx
"use client";

import { useEffect, useState } from "react";
import { StepCard } from "../shared";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  RefreshCw,
  Send,
  User,
  Building2,
  Loader2
} from "lucide-react";
import { getReportParties, resendPartyLink } from "@/lib/api";
import { toast } from "sonner";

interface ReportParty {
  id: string;
  party_role: string;
  entity_type: string;
  display_name: string;
  email: string;
  status: string;
  submitted_at?: string;
}

interface PartyStatusStepProps {
  reportId: string;
}

export function PartyStatusStep({ reportId }: PartyStatusStepProps) {
  const [parties, setParties] = useState<ReportParty[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const fetchParties = async () => {
    try {
      const data = await getReportParties(reportId);
      setParties(data);
    } catch (error) {
      console.error("Failed to fetch parties:", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };
  
  useEffect(() => {
    fetchParties();
    
    // Poll every 30 seconds
    const interval = setInterval(fetchParties, 30000);
    return () => clearInterval(interval);
  }, [reportId]);
  
  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchParties();
  };
  
  const handleResend = async (partyId: string) => {
    try {
      await resendPartyLink(partyId);
      toast.success("Link resent successfully");
    } catch (error) {
      toast.error("Failed to resend link");
    }
  };
  
  const buyers = parties.filter((p) => p.party_role === "transferee");
  const sellers = parties.filter((p) => p.party_role === "transferor");
  
  const allSubmitted = parties.length > 0 && 
    parties.every((p) => p.status === "submitted");
  const pendingCount = parties.filter((p) => p.status !== "submitted").length;
  
  if (isLoading) {
    return (
      <StepCard title="Party Status">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </StepCard>
    );
  }
  
  return (
    <StepCard
      title="Party Status"
      description="Monitor the status of party portal submissions."
    >
      <div className="space-y-6">
        {/* Summary */}
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div>
            {allSubmitted ? (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">All parties have submitted</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-amber-600">
                <Clock className="h-5 w-5" />
                <span className="font-medium">
                  Waiting for {pendingCount} {pendingCount === 1 ? "party" : "parties"}
                </span>
              </div>
            )}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
        
        {/* Buyers */}
        <div>
          <h3 className="font-medium mb-3">Buyers</h3>
          <div className="space-y-2">
            {buyers.map((party) => (
              <PartyStatusCard 
                key={party.id} 
                party={party}
                onResend={() => handleResend(party.id)}
              />
            ))}
            {buyers.length === 0 && (
              <p className="text-sm text-muted-foreground italic">No buyers</p>
            )}
          </div>
        </div>
        
        {/* Sellers */}
        <div>
          <h3 className="font-medium mb-3">Sellers</h3>
          <div className="space-y-2">
            {sellers.map((party) => (
              <PartyStatusCard 
                key={party.id} 
                party={party}
                onResend={() => handleResend(party.id)}
              />
            ))}
            {sellers.length === 0 && (
              <p className="text-sm text-muted-foreground italic">No sellers</p>
            )}
          </div>
        </div>
        
        {/* Tip */}
        {!allSubmitted && (
          <div className="text-sm text-muted-foreground bg-muted/50 p-4 rounded-lg">
            <strong>Tip:</strong> This page auto-refreshes every 30 seconds. 
            You can also manually refresh or resend links to parties who haven't responded.
          </div>
        )}
      </div>
    </StepCard>
  );
}

// Party Status Card
function PartyStatusCard({ 
  party, 
  onResend 
}: { 
  party: ReportParty; 
  onResend: () => void;
}) {
  const isSubmitted = party.status === "submitted";
  
  return (
    <Card className="p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
            isSubmitted ? "bg-green-100" : "bg-amber-100"
          }`}>
            {party.entity_type === "individual" ? (
              <User className={`h-4 w-4 ${isSubmitted ? "text-green-600" : "text-amber-600"}`} />
            ) : (
              <Building2 className={`h-4 w-4 ${isSubmitted ? "text-green-600" : "text-amber-600"}`} />
            )}
          </div>
          <div>
            <p className="font-medium text-sm">{party.display_name}</p>
            <p className="text-xs text-muted-foreground">{party.email}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {isSubmitted ? (
            <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Submitted
            </Badge>
          ) : (
            <>
              <Badge variant="outline" className="text-amber-600 border-amber-300">
                <Clock className="h-3 w-3 mr-1" />
                Pending
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={onResend}
              >
                <Send className="h-3 w-3 mr-1" />
                Resend
              </Button>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
```

---

## Step 3: ReportingPersonStep.tsx

```tsx
"use client";

import { StepCard } from "../shared";
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

interface ReportingPerson {
  companyName: string;
  contactName: string;
  licenseNumber?: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  phone: string;
  email: string;
}

interface ReportingPersonStepProps {
  value: ReportingPerson | null;
  onChange: (value: ReportingPerson) => void;
}

const US_STATES = [
  { value: "AL", label: "Alabama" },
  { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" },
  // ... (same list as TransactionDetailsStep)
  { value: "WY", label: "Wyoming" },
];

export function ReportingPersonStep({ value, onChange }: ReportingPersonStepProps) {
  const data = value || {
    companyName: "",
    contactName: "",
    licenseNumber: "",
    address: { street: "", city: "", state: "", zip: "" },
    phone: "",
    email: "",
  };
  
  const handleChange = (field: string, fieldValue: string) => {
    if (field.startsWith("address.")) {
      const addressField = field.replace("address.", "");
      onChange({
        ...data,
        address: { ...data.address, [addressField]: fieldValue },
      });
    } else {
      onChange({ ...data, [field]: fieldValue });
    }
  };
  
  return (
    <StepCard
      title="Reporting Person"
      description="The reporting person is typically the title company, escrow agent, or attorney handling the transaction."
    >
      <div className="space-y-6">
        {/* Company Information */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Company Information
          </h3>
          
          <div className="grid gap-4">
            <div>
              <Label htmlFor="companyName">Company Name *</Label>
              <Input
                id="companyName"
                value={data.companyName}
                onChange={(e) => handleChange("companyName", e.target.value)}
                placeholder="Pacific Coast Title Company"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contactName">Contact Name *</Label>
                <Input
                  id="contactName"
                  value={data.contactName}
                  onChange={(e) => handleChange("contactName", e.target.value)}
                  placeholder="Jane Smith"
                />
              </div>
              <div>
                <Label htmlFor="licenseNumber">License Number</Label>
                <Input
                  id="licenseNumber"
                  value={data.licenseNumber || ""}
                  onChange={(e) => handleChange("licenseNumber", e.target.value)}
                  placeholder="Optional"
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Address */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Business Address
          </h3>
          
          <div className="grid gap-4">
            <div>
              <Label htmlFor="street">Street Address *</Label>
              <Input
                id="street"
                value={data.address.street}
                onChange={(e) => handleChange("address.street", e.target.value)}
                placeholder="123 Business Ave, Suite 100"
              />
            </div>
            
            <div className="grid grid-cols-6 gap-4">
              <div className="col-span-2">
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  value={data.address.city}
                  onChange={(e) => handleChange("address.city", e.target.value)}
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="state">State *</Label>
                <Select
                  value={data.address.state}
                  onValueChange={(v) => handleChange("address.state", v)}
                >
                  <SelectTrigger id="state">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {US_STATES.map((state) => (
                      <SelectItem key={state.value} value={state.value}>
                        {state.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label htmlFor="zip">ZIP *</Label>
                <Input
                  id="zip"
                  value={data.address.zip}
                  onChange={(e) => handleChange("address.zip", e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Contact */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Contact Information
          </h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                type="tel"
                value={data.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                placeholder="(555) 123-4567"
              />
            </div>
            <div>
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={data.email}
                onChange={(e) => handleChange("email", e.target.value)}
                placeholder="contact@company.com"
              />
            </div>
          </div>
        </div>
      </div>
    </StepCard>
  );
}
```

---

## Step 4: ReviewAndFileStep.tsx

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StepCard } from "../shared";
import { WizardState } from "../types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  FileText, 
  MapPin, 
  DollarSign, 
  Calendar,
  Users,
  Building2,
  AlertCircle,
  Loader2,
  CheckCircle2
} from "lucide-react";
import { fileReport } from "@/lib/api";
import { toast } from "sonner";

interface ReviewAndFileStepProps {
  reportId: string;
  wizardData: WizardState;
}

export function ReviewAndFileStep({ reportId, wizardData }: ReviewAndFileStepProps) {
  const router = useRouter();
  const [isCertified, setIsCertified] = useState(false);
  const [isFiling, setIsFiling] = useState(false);
  const [filingResult, setFilingResult] = useState<{
    success: boolean;
    receiptId?: string;
    message?: string;
  } | null>(null);
  
  const collection = wizardData.collection;
  const determination = wizardData.determination;
  
  const handleFile = async () => {
    if (!isCertified) {
      toast.error("Please certify the information before filing");
      return;
    }
    
    setIsFiling(true);
    try {
      const result = await fileReport(reportId);
      
      if (result.ok) {
        setFilingResult({
          success: true,
          receiptId: result.receipt_id,
          message: result.message,
        });
        toast.success("Report filed successfully!");
      } else {
        setFilingResult({
          success: false,
          message: result.message || "Filing failed",
        });
        toast.error(result.message || "Filing failed");
      }
    } catch (error: any) {
      setFilingResult({
        success: false,
        message: error.message || "An error occurred",
      });
      toast.error("Failed to file report");
    } finally {
      setIsFiling(false);
    }
  };
  
  // Filing Success View
  if (filingResult?.success) {
    return (
      <StepCard title="Filing Complete">
        <div className="text-center space-y-6 py-8">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold">Report Submitted Successfully</h3>
            <p className="text-muted-foreground mt-2">
              Your FinCEN Real Estate Report has been submitted for processing.
            </p>
          </div>
          
          {filingResult.receiptId && (
            <div className="bg-muted/50 rounded-lg p-4 max-w-md mx-auto">
              <p className="text-sm text-muted-foreground">Receipt ID</p>
              <p className="font-mono font-semibold">{filingResult.receiptId}</p>
            </div>
          )}
          
          <Button onClick={() => router.push("/app/requests")}>
            Back to Requests
          </Button>
        </div>
      </StepCard>
    );
  }
  
  return (
    <StepCard
      title="Review & File"
      description="Review the information below and submit your FinCEN Real Estate Report."
    >
      <div className="space-y-6">
        {/* Transaction Summary */}
        <Card className="p-4">
          <h3 className="font-medium mb-4 flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Transaction Summary
          </h3>
          
          <div className="grid gap-4 text-sm">
            <div className="flex items-start gap-3">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Property</p>
                <p className="text-muted-foreground">
                  {collection.propertyAddress?.street}, {collection.propertyAddress?.city}, {collection.propertyAddress?.state} {collection.propertyAddress?.zip}
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <DollarSign className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Purchase Price</p>
                <p className="text-muted-foreground">
                  ${collection.purchasePrice?.toLocaleString() || "N/A"}
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Closing Date</p>
                <p className="text-muted-foreground">
                  {collection.closingDate || "N/A"}
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Users className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Buyer Type</p>
                <p className="text-muted-foreground capitalize">
                  {determination.buyerType || "N/A"}
                  {determination.isStatutoryTrust && " (Statutory Trust)"}
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Reporting Person</p>
                <p className="text-muted-foreground">
                  {collection.reportingPerson?.companyName || "N/A"}
                </p>
              </div>
            </div>
          </div>
        </Card>
        
        {/* Filing Error */}
        {filingResult && !filingResult.success && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {filingResult.message || "Filing failed. Please try again."}
            </AlertDescription>
          </Alert>
        )}
        
        {/* Certification */}
        <div className="border rounded-lg p-4 space-y-4">
          <div className="flex items-start space-x-3">
            <Checkbox
              id="certify"
              checked={isCertified}
              onCheckedChange={(checked) => setIsCertified(!!checked)}
            />
            <div className="space-y-1">
              <Label htmlFor="certify" className="cursor-pointer font-medium">
                I certify this information is accurate
              </Label>
              <p className="text-xs text-muted-foreground">
                By checking this box, I certify that to the best of my knowledge, 
                the information provided is complete and accurate. I understand that 
                filing false information with FinCEN may result in civil or criminal penalties.
              </p>
            </div>
          </div>
        </div>
        
        {/* File Button */}
        <Button
          onClick={handleFile}
          disabled={!isCertified || isFiling}
          className="w-full"
          size="lg"
        >
          {isFiling ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Filing Report...
            </>
          ) : (
            <>
              <FileText className="h-4 w-4 mr-2" />
              Submit FinCEN Report
            </>
          )}
        </Button>
        
        <p className="text-xs text-center text-muted-foreground">
          Reports are submitted securely via FinCEN's SDTM system.
        </p>
      </div>
    </StepCard>
  );
}
```

---

## Step 5: Create Index Export

### File: `web/components/wizard/collection/index.ts`

```typescript
export { PartySetupStep } from "./PartySetupStep";
export { PartyStatusStep } from "./PartyStatusStep";
export { ReportingPersonStep } from "./ReportingPersonStep";
export { ReviewAndFileStep } from "./ReviewAndFileStep";
```

---

## Step 7: Update Main Index

### File: `web/components/wizard/index.ts` (update)

```typescript
// Types
export * from "./types";

// Constants
export * from "./constants";

// Shared components
export * from "./shared";

// Hooks
export * from "./hooks";

// Determination steps
export * from "./determination";

// Collection steps
export * from "./collection";
```

---

## Testing Checklist (Day 3)

### 1. TypeScript Compiles
```bash
cd web && npx tsc --noEmit
```

### 2. Each Step Renders
```tsx
import { 
  PartySetupStep,
  PartyStatusStep,
  ReportingPersonStep,
  ReviewAndFileStep,
} from "@/components/wizard";
```

### 3. Party Setup
- [ ] Can add buyer
- [ ] Can add seller
- [ ] Can remove party
- [ ] Type selector works (individual/entity)
- [ ] Email validation

### 4. Party Status
- [ ] Shows pending vs submitted
- [ ] Auto-refreshes
- [ ] Resend button works
- [ ] Shows all parties

### 5. Reporting Person
- [ ] All fields save
- [ ] State selector works

### 6. Review & File
- [ ] Shows summary correctly (including address/escrow/price from Step 0)
- [ ] Certification checkbox works
- [ ] File button disabled until certified
- [ ] Success state shows receipt ID
- [ ] Error state shows message

### 7. API Integration
- [ ] `createPartyLinks()` called correctly
- [ ] `getReportParties()` returns data
- [ ] `fileReport()` called correctly

---

## Success Criteria

✅ All 4 collection steps created  
✅ TypeScript compiles  
✅ Party setup creates links  
✅ Party status shows submissions  
✅ Filing submits to API  
✅ All styling matches app  

---

## DO NOT

- ❌ Touch old `rrer-questionnaire.tsx`
- ❌ Proceed to Day 4 until all tests pass

---

## Next: Day 4

Once Day 3 passes all tests, proceed to Day 4 where we wire everything together and replace the old wizard.
