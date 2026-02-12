"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { StepCard } from "../shared";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle2, 
  Clock, 
  RefreshCw,
  Send,
  User,
  Building2,
  Loader2,
  ArrowLeft,
  Check
} from "lucide-react";
import { getReportParties, resendPartyLink, type PartyStatusItem } from "@/lib/api";
import { toast } from "sonner";

interface PartyStatusStepProps {
  reportId: string;
}

export function PartyStatusStep({ reportId }: PartyStatusStepProps) {
  const router = useRouter();
  const [parties, setParties] = useState<PartyStatusItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const fetchParties = useCallback(async () => {
    try {
      const data = await getReportParties(reportId);
      setParties(data.parties || []);
    } catch (error) {
      console.error("Failed to fetch parties:", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [reportId]);
  
  useEffect(() => {
    fetchParties();
    
    // Poll every 30 seconds
    const interval = setInterval(fetchParties, 30000);
    return () => clearInterval(interval);
  }, [fetchParties]);
  
  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchParties();
  };
  
  const [resendingPartyId, setResendingPartyId] = useState<string | null>(null);
  const [resentPartyIds, setResentPartyIds] = useState<Set<string>>(new Set());
  
  const handleResend = async (partyId: string, partyEmail?: string) => {
    setResendingPartyId(partyId);
    try {
      await resendPartyLink(reportId, partyId);
      const emailDisplay = partyEmail ? ` to ${partyEmail}` : "";
      toast.success(`Portal link resent${emailDisplay}`);
      // Show inline "Sent" confirmation
      setResentPartyIds(prev => new Set(prev).add(partyId));
      setTimeout(() => {
        setResentPartyIds(prev => {
          const next = new Set(prev);
          next.delete(partyId);
          return next;
        });
      }, 4000);
    } catch (error) {
      toast.error("Failed to resend link");
    } finally {
      setResendingPartyId(null);
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
      description="Monitor the status of party portal submissions. This page auto-refreshes every 30 seconds."
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
                onResend={() => handleResend(party.id, party.email)}
                isResending={resendingPartyId === party.id}
                wasResent={resentPartyIds.has(party.id)}
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
                onResend={() => handleResend(party.id, party.email)}
                isResending={resendingPartyId === party.id}
                wasResent={resentPartyIds.has(party.id)}
              />
            ))}
            {sellers.length === 0 && (
              <p className="text-sm text-muted-foreground italic">No sellers</p>
            )}
          </div>
        </div>

        {/* Auto-transition message */}
        {allSubmitted && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
            <p className="text-sm text-green-700">
              <strong>All parties have submitted.</strong> This report will automatically transition to 
              &quot;Ready to File&quot; status. You can proceed to the Review page to certify and submit.
            </p>
          </div>
        )}
        
        {/* Tip */}
        {!allSubmitted && parties.length > 0 && (
          <div className="text-sm text-muted-foreground bg-muted/50 p-4 rounded-lg">
            <strong>Tip:</strong> This page auto-refreshes every 30 seconds. 
            You can also manually refresh or resend links to parties who haven&apos;t responded.
            When all parties submit, the report will automatically move to &quot;Ready to File&quot;.
          </div>
        )}

        {/* No parties yet */}
        {parties.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p>No party links have been sent yet.</p>
            <p className="text-sm mt-1">Go back to Party Setup to add and send links.</p>
          </div>
        )}

        {/* Back to Requests */}
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            onClick={() => router.push("/app/requests")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Requests
          </Button>
        </div>
      </div>
    </StepCard>
  );
}

// Party Status Card
function PartyStatusCard({ 
  party, 
  onResend,
  isResending,
  wasResent,
}: { 
  party: PartyStatusItem; 
  onResend: () => void;
  isResending: boolean;
  wasResent: boolean;
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
            <p className="font-medium text-sm">{party.display_name || "Unknown"}</p>
            <p className="text-xs text-muted-foreground">{party.email || "No email"}</p>
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
              {wasResent ? (
                <span className="flex items-center gap-1 text-xs text-green-600 font-medium px-2 animate-in fade-in duration-200">
                  <Check className="h-3 w-3" />
                  Sent
                </span>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onResend}
                  disabled={isResending}
                >
                  {isResending ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-3 w-3 mr-1" />
                      Resend
                    </>
                  )}
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
