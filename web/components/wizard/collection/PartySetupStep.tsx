"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  Loader2,
  CheckCircle2,
  ArrowLeft,
  Clock,
} from "lucide-react";
import { createPartyLinks } from "@/lib/api";
import { toast } from "sonner";
import type { ReportingPerson } from "../types";

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
  reportingPerson?: ReportingPerson | null;
}

export function PartySetupStep({ 
  reportId, 
  parties,
  onPartiesChange,
  reportingPerson,
}: PartySetupStepProps) {
  const router = useRouter();
  const [isAddingParty, setIsAddingParty] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [linksSent, setLinksSent] = useState(false);
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
      const partyInputs = parties.map((p) => ({
        party_role: p.party_role,
        entity_type: p.entity_type,
        display_name: p.display_name,
        email: p.email,
      }));
      
      await createPartyLinks(reportId, partyInputs);
      toast.success("Party links sent successfully!");
      setLinksSent(true);
    } catch (error: any) {
      console.error("Failed to send party links:", error);
      toast.error(error.message || "Failed to send party links");
    } finally {
      setIsSending(false);
    }
  };

  // =========================================
  // LINKS SENT — Confirmation / Done State
  // =========================================
  if (linksSent) {
    return (
      <StepCard
        title="Party Links Sent"
        description="Portal links have been sent to all parties."
      >
        <div className="space-y-6">
          {/* Success icon */}
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
          </div>
          
          <div className="text-center">
            <h3 className="text-lg font-semibold">Party links have been sent successfully</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
              Each party will receive an email with a secure link to submit their information.
            </p>
          </div>
          
          {/* List of sent parties */}
          <div className="space-y-2 max-w-md mx-auto">
            {parties.map((party, idx) => (
              <div key={idx} className="flex items-center gap-3 border rounded-lg p-3 bg-muted/30">
                <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                  {party.entity_type === "individual" ? (
                    <User className="h-4 w-4 text-green-600" />
                  ) : (
                    <Building2 className="h-4 w-4 text-green-600" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{party.display_name}</p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Mail className="h-3 w-3 shrink-0" />
                    <span className="truncate">{party.email}</span>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs shrink-0">
                  {party.party_role === "transferee" ? "Buyer" : "Seller"}
                </Badge>
              </div>
            ))}
          </div>
          
          {/* Timing message */}
          <div className="bg-muted/50 border rounded-lg p-4 text-center max-w-md mx-auto">
            <div className="flex items-center justify-center gap-2 text-muted-foreground mb-2">
              <Clock className="h-4 w-4" />
              <span className="text-sm font-medium">What happens next?</span>
            </div>
            <p className="text-sm text-muted-foreground">
              You will be notified when all parties have submitted their information. 
              This typically takes <strong>1–3 business days</strong>.
            </p>
          </div>
          
          {/* Back to Requests */}
          <div className="flex justify-center pt-2">
            <Button
              onClick={() => router.push("/app/requests")}
              size="lg"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Requests
            </Button>
          </div>
        </div>
      </StepCard>
    );
  }
  
  // =========================================
  // NORMAL STATE — Add parties & send links
  // =========================================
  return (
    <StepCard
      title="Party Setup"
      description="Add the buyers and sellers for this transaction. Each party will receive a secure link to submit their information."
    >
      <div className="space-y-6">
        {/* Filing Officer read-only card */}
        {reportingPerson && (
          <div className="border rounded-lg p-4 bg-muted/30">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Filing Officer
            </p>
            <div className="space-y-1">
              <p className="font-medium text-sm">{reportingPerson.contactName || "—"}</p>
              <p className="text-sm text-muted-foreground">{reportingPerson.companyName || "—"}</p>
              <p className="text-sm text-muted-foreground">{reportingPerson.email || "—"}</p>
            </div>
            <p className="text-xs text-muted-foreground mt-2 italic">
              If this is incorrect, update your profile in Settings.
            </p>
          </div>
        )}

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
