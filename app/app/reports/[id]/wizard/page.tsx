"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Users,
  ClipboardCheck,
  Send,
  Copy,
  ExternalLink,
  Clock,
  XCircle,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  getReport,
  saveWizard,
  determine,
  createPartyLinks,
  readyCheck,
  fileReport,
  type Report,
  type DeterminationResult,
  type PartyLink,
  type ReadyCheckResult,
  type FileResult,
} from "@/lib/api";

const AUTOSAVE_DELAY = 1500; // 1.5 seconds debounce

interface WizardData {
  // Transaction Info
  property_address?: string;
  property_city?: string;
  property_state?: string;
  property_zip?: string;
  closing_date?: string;
  purchase_price?: number;
  
  // Determination Questions
  cash_purchase?: boolean;
  transfer_type?: string;
  buyer_type?: string;
  has_power_of_attorney?: boolean;
  is_trust_or_llc?: boolean;
  
  // Certifications
  agree_to_terms?: boolean;
  certify_accurate?: boolean;
}

export default function WizardPage() {
  const params = useParams();
  const router = useRouter();
  const reportId = params.id as string;

  // State
  const [report, setReport] = useState<Report | null>(null);
  const [wizardData, setWizardData] = useState<WizardData>({});
  const [wizardStep, setWizardStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Determination
  const [determining, setDetermining] = useState(false);
  const [determination, setDetermination] = useState<DeterminationResult | null>(null);
  
  // Party Links
  const [generatingLinks, setGeneratingLinks] = useState(false);
  const [partyLinks, setPartyLinks] = useState<PartyLink[]>([]);
  
  // Ready Check & Filing
  const [checkingReady, setCheckingReady] = useState(false);
  const [readyResult, setReadyResult] = useState<ReadyCheckResult | null>(null);
  const [filing, setFiling] = useState(false);
  const [fileResult, setFileResult] = useState<FileResult | null>(null);

  // Autosave timer ref
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load report
  useEffect(() => {
    const loadReport = async () => {
      try {
        setLoading(true);
        const data = await getReport(reportId);
        setReport(data);
        setWizardData((data.wizard_data as WizardData) || {});
        setWizardStep(data.wizard_step || 1);
        if (data.determination) {
          setDetermination(data.determination);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load report");
      } finally {
        setLoading(false);
      }
    };
    loadReport();
  }, [reportId]);

  // Autosave function
  const performSave = useCallback(async (data: WizardData, step: number) => {
    try {
      setSaving(true);
      setSaved(false);
      await saveWizard(reportId, step, data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error("Autosave failed:", err);
    } finally {
      setSaving(false);
    }
  }, [reportId]);

  // Debounced save on data change
  const updateWizardData = useCallback((updates: Partial<WizardData>) => {
    setWizardData((prev) => {
      const newData = { ...prev, ...updates };
      
      // Clear existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      // Set new timeout for autosave
      saveTimeoutRef.current = setTimeout(() => {
        performSave(newData, wizardStep);
      }, AUTOSAVE_DELAY);
      
      return newData;
    });
  }, [performSave, wizardStep]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Handle determination
  const handleDetermine = async () => {
    try {
      setDetermining(true);
      setError(null);
      const result = await determine(reportId);
      setDetermination(result);
      // Refresh report to get updated status
      const updatedReport = await getReport(reportId);
      setReport(updatedReport);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Determination failed");
    } finally {
      setDetermining(false);
    }
  };

  // Handle party links generation
  const handleGenerateLinks = async () => {
    try {
      setGeneratingLinks(true);
      setError(null);
      const result = await createPartyLinks(reportId);
      setPartyLinks(result.links);
      // Refresh report to get updated status
      const updatedReport = await getReport(reportId);
      setReport(updatedReport);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate party links");
    } finally {
      setGeneratingLinks(false);
    }
  };

  // Handle ready check
  const handleReadyCheck = async () => {
    try {
      setCheckingReady(true);
      setError(null);
      const result = await readyCheck(reportId);
      setReadyResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ready check failed");
    } finally {
      setCheckingReady(false);
    }
  };

  // Handle filing
  const handleFile = async () => {
    try {
      setFiling(true);
      setError(null);
      const result = await fileReport(reportId);
      setFileResult(result);
      // Refresh report to get updated status
      const updatedReport = await getReport(reportId);
      setReport(updatedReport);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Filing failed");
    } finally {
      setFiling(false);
    }
  };

  // Copy link to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="p-6 lg:p-8">
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 mx-auto text-destructive mb-4" />
          <h2 className="text-xl font-bold mb-2">Report Not Found</h2>
          <p className="text-muted-foreground mb-4">{error || "The report could not be loaded"}</p>
          <Link href="/app/reports">
            <Button>Back to Reports</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/app/reports">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">
            {report.property_address_text || "New Report"}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={report.status === "filed" ? "default" : "secondary"}>
              {report.status.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
            </Badge>
            {saving && (
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Saving...
              </span>
            )}
            {saved && (
              <span className="text-sm text-green-600 flex items-center gap-1">
                <Check className="h-3 w-3" />
                Saved
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-destructive/10 text-destructive rounded-lg mb-6">
          <AlertTriangle className="h-5 w-5" />
          <span>{error}</span>
          <Button variant="ghost" size="sm" onClick={() => setError(null)} className="ml-auto">
            Dismiss
          </Button>
        </div>
      )}

      {/* Step 1: Transaction Information */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Transaction Information
          </CardTitle>
          <CardDescription>Basic details about the real estate transaction</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="property_address">Property Address</Label>
              <Input
                id="property_address"
                value={wizardData.property_address || ""}
                onChange={(e) => updateWizardData({ property_address: e.target.value })}
                placeholder="123 Main Street"
              />
            </div>
            <div>
              <Label htmlFor="property_city">City</Label>
              <Input
                id="property_city"
                value={wizardData.property_city || ""}
                onChange={(e) => updateWizardData({ property_city: e.target.value })}
                placeholder="Los Angeles"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="property_state">State</Label>
                <Input
                  id="property_state"
                  value={wizardData.property_state || ""}
                  onChange={(e) => updateWizardData({ property_state: e.target.value })}
                  placeholder="CA"
                  maxLength={2}
                />
              </div>
              <div>
                <Label htmlFor="property_zip">ZIP Code</Label>
                <Input
                  id="property_zip"
                  value={wizardData.property_zip || ""}
                  onChange={(e) => updateWizardData({ property_zip: e.target.value })}
                  placeholder="90210"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="closing_date">Closing Date</Label>
              <Input
                id="closing_date"
                type="date"
                value={wizardData.closing_date || ""}
                onChange={(e) => updateWizardData({ closing_date: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="purchase_price">Purchase Price</Label>
              <Input
                id="purchase_price"
                type="number"
                value={wizardData.purchase_price || ""}
                onChange={(e) => updateWizardData({ purchase_price: parseFloat(e.target.value) || undefined })}
                placeholder="500000"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step 2: Determination Questions */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" />
            Reportability Determination
          </CardTitle>
          <CardDescription>Answer these questions to determine if this transaction is reportable</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Checkbox
                id="cash_purchase"
                checked={wizardData.cash_purchase || false}
                onCheckedChange={(checked) => updateWizardData({ cash_purchase: !!checked })}
              />
              <Label htmlFor="cash_purchase" className="cursor-pointer">
                This is an all-cash purchase (no financing)
              </Label>
            </div>

            <div>
              <Label htmlFor="transfer_type">Transfer Type</Label>
              <Select
                value={wizardData.transfer_type || ""}
                onValueChange={(value) => updateWizardData({ transfer_type: value })}
              >
                <SelectTrigger id="transfer_type">
                  <SelectValue placeholder="Select transfer type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="residential_purchase">Residential Purchase</SelectItem>
                  <SelectItem value="commercial_purchase">Commercial Purchase</SelectItem>
                  <SelectItem value="refinance">Refinance</SelectItem>
                  <SelectItem value="gift">Gift/Transfer</SelectItem>
                  <SelectItem value="inheritance">Inheritance</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="buyer_type">Buyer Type</Label>
              <Select
                value={wizardData.buyer_type || ""}
                onValueChange={(value) => updateWizardData({ buyer_type: value })}
              >
                <SelectTrigger id="buyer_type">
                  <SelectValue placeholder="Select buyer type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Individual</SelectItem>
                  <SelectItem value="llc">LLC</SelectItem>
                  <SelectItem value="corporation">Corporation</SelectItem>
                  <SelectItem value="trust">Trust</SelectItem>
                  <SelectItem value="partnership">Partnership</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-3">
              <Checkbox
                id="has_power_of_attorney"
                checked={wizardData.has_power_of_attorney || false}
                onCheckedChange={(checked) => updateWizardData({ has_power_of_attorney: !!checked })}
              />
              <Label htmlFor="has_power_of_attorney" className="cursor-pointer">
                A power of attorney is being used for signing
              </Label>
            </div>

            <div className="flex items-center space-x-3">
              <Checkbox
                id="is_trust_or_llc"
                checked={wizardData.is_trust_or_llc || false}
                onCheckedChange={(checked) => updateWizardData({ is_trust_or_llc: !!checked })}
              />
              <Label htmlFor="is_trust_or_llc" className="cursor-pointer">
                Buyer is a trust, LLC, or other legal entity
              </Label>
            </div>
          </div>

          <div className="pt-4 border-t border-border">
            <Button 
              onClick={handleDetermine} 
              disabled={determining}
              className="w-full sm:w-auto"
            >
              {determining ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <ClipboardCheck className="h-4 w-4 mr-2" />
              )}
              Run Determination
            </Button>
          </div>

          {/* Determination Result */}
          {determination && (
            <div className={`mt-4 p-4 rounded-lg border ${
              determination.reportable 
                ? "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800" 
                : "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800"
            }`}>
              <div className="flex items-start gap-3">
                {determination.reportable ? (
                  <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                )}
                <div>
                  <h4 className={`font-semibold ${determination.reportable ? "text-amber-800 dark:text-amber-200" : "text-green-800 dark:text-green-200"}`}>
                    {determination.reportable ? "Reportable Transaction" : "Exempt Transaction"}
                  </h4>
                  <p className={`text-sm mt-1 ${determination.reportable ? "text-amber-700 dark:text-amber-300" : "text-green-700 dark:text-green-300"}`}>
                    {determination.reason_text}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Code: {determination.reason_code}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 3: Party Links (only show if reportable) */}
      {determination?.reportable && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Party Information Links
            </CardTitle>
            <CardDescription>Generate secure links for buyers and sellers to submit their information</CardDescription>
          </CardHeader>
          <CardContent>
            {partyLinks.length === 0 ? (
              <div className="text-center py-6">
                <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground mb-4">
                  Generate secure links to send to the transaction parties
                </p>
                <Button onClick={handleGenerateLinks} disabled={generatingLinks}>
                  {generatingLinks ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Users className="h-4 w-4 mr-2" />
                  )}
                  Generate Party Links
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {partyLinks.map((link) => (
                  <div 
                    key={link.token}
                    className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/30"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium capitalize">{link.party_role}</span>
                        <Badge variant={link.status === "submitted" ? "default" : "secondary"}>
                          {link.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate mt-1">
                        {link.url}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        <Clock className="h-3 w-3 inline mr-1" />
                        Expires: {new Date(link.expires_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(link.url)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <a href={link.url} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 4: Ready Check & Filing (only show if reportable) */}
      {determination?.reportable && partyLinks.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Submit Filing
            </CardTitle>
            <CardDescription>Check readiness and file the report</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Ready Check Button */}
              <Button 
                onClick={handleReadyCheck} 
                disabled={checkingReady}
                variant="outline"
                className="w-full sm:w-auto"
              >
                {checkingReady ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <ClipboardCheck className="h-4 w-4 mr-2" />
                )}
                Check Readiness
              </Button>

              {/* Ready Check Result */}
              {readyResult && (
                <div className={`p-4 rounded-lg border ${
                  readyResult.ready 
                    ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800" 
                    : "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800"
                }`}>
                  <div className="flex items-start gap-3">
                    {readyResult.ready ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                    ) : (
                      <XCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                    )}
                    <div>
                      <h4 className={`font-semibold ${readyResult.ready ? "text-green-800 dark:text-green-200" : "text-amber-800 dark:text-amber-200"}`}>
                        {readyResult.ready ? "Ready to File" : "Not Ready to File"}
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {readyResult.summary.submitted_parties} of {readyResult.summary.total_parties} parties submitted
                      </p>
                      {readyResult.missing.length > 0 && (
                        <ul className="mt-2 space-y-1">
                          {readyResult.missing.map((item, i) => (
                            <li key={i} className="text-sm text-amber-700 dark:text-amber-300">
                              • {item.message}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* File Button */}
              {readyResult?.ready && !fileResult && (
                <Button 
                  onClick={handleFile} 
                  disabled={filing}
                  className="w-full sm:w-auto bg-[#C9A227] hover:bg-[#B8911F] text-[#1E293B] font-semibold"
                >
                  {filing ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Submit Filing
                </Button>
              )}

              {/* File Result */}
              {fileResult && (
                <div className="p-6 rounded-lg border bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800 text-center">
                  <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-green-800 dark:text-green-200 mb-2">
                    Successfully Filed!
                  </h3>
                  <p className="text-green-700 dark:text-green-300 mb-4">
                    {fileResult.message}
                  </p>
                  <div className="inline-block bg-white dark:bg-green-900/50 rounded-lg px-4 py-2">
                    <p className="text-sm text-muted-foreground">Confirmation Number</p>
                    <p className="text-lg font-mono font-bold text-green-800 dark:text-green-200">
                      {fileResult.confirmation_number}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground mt-4">
                    Filed at: {new Date(fileResult.filed_at).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Exempt Transaction UI */}
      {determination && !determination.reportable && (
        <Card className="mb-6 border-green-200 dark:border-green-800">
          <CardContent className="pt-6">
            <div className="text-center py-6">
              <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-green-800 dark:text-green-200 mb-2">
                Transaction is Exempt
              </h3>
              <p className="text-muted-foreground max-w-md mx-auto mb-6">
                Based on the information provided, this transaction does not require a FinCEN report.
                Please retain this determination for your records.
              </p>
              <div className="bg-muted/50 rounded-lg p-4 max-w-md mx-auto">
                <p className="text-sm font-medium mb-2">Exemption Reason</p>
                <p className="text-sm text-muted-foreground">{determination.reason_text}</p>
                <p className="text-xs text-muted-foreground mt-2">Code: {determination.reason_code}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
