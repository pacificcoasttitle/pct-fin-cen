"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { PartyStatusBadge } from "./PartyStatusBadge"
import { PartyTypeBadge, PartyRoleBadge } from "./PartyTypeBadge"
import { 
  Building2, 
  User, 
  Landmark, 
  MapPin, 
  Phone, 
  Mail,
  Calendar,
  CreditCard,
  Users,
  FileText,
  AlertCircle,
  CheckCircle2,
  Shield,
  Download,
  Eye,
  FileImage
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { format } from "date-fns"

// Mask sensitive data
function maskSSN(ssn: string): string {
  if (!ssn) return "—"
  const cleaned = ssn.replace(/\D/g, "")
  if (cleaned.length < 4) return "***-**-****"
  return `***-**-${cleaned.slice(-4)}`
}

function maskEIN(ein: string): string {
  if (!ein) return "—"
  const cleaned = ein.replace(/\D/g, "")
  if (cleaned.length < 4) return "**-*******"
  return `**-***${cleaned.slice(-4)}`
}

function formatAddress(address: any): string {
  if (!address) return "—"
  const parts = [
    address.street,
    address.unit ? `Unit ${address.unit}` : null,
    address.city,
    address.state,
    address.zip
  ].filter(Boolean)
  return parts.join(", ") || "—"
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

interface DataRowProps {
  label: string
  value: string | number | null | undefined
  masked?: boolean
  className?: string
}

function DataRow({ label, value, masked = false, className }: DataRowProps) {
  return (
    <div className={cn("flex justify-between py-1", className)}>
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={cn("text-sm font-medium", masked && "font-mono")}>
        {value ?? "—"}
      </span>
    </div>
  )
}

interface SectionProps {
  title: string
  icon?: typeof Building2
  children: React.ReactNode
  className?: string
}

function Section({ title, icon: Icon, children, className }: SectionProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <h4 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wide">
        {Icon && <Icon className="h-4 w-4" />}
        {title}
      </h4>
      <div className="pl-6">{children}</div>
    </div>
  )
}

interface Document {
  id: string
  document_type: string
  file_name: string
  mime_type: string
  size_bytes?: number
  download_url?: string
  uploaded_at?: string
  verified_at?: string | null
}

interface PartyDetailCardProps {
  party: {
    id: string
    party_role: string
    entity_type: string
    display_name: string
    status: string
    party_data?: Record<string, any>
    submitted_at?: string | null
  }
  documents?: Document[]
  showSensitive?: boolean
  className?: string
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
}

function getDocumentTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    government_id: "Government ID (Front)",
    government_id_back: "Government ID (Back)",
    trust_agreement: "Trust Agreement",
    formation_docs: "Formation Documents",
    operating_agreement: "Operating Agreement",
    articles_of_incorporation: "Articles of Incorporation",
    beneficial_owner_id: "Beneficial Owner ID",
    other: "Other Document",
  }
  return labels[type] || type.replace(/_/g, " ")
}

export function PartyDetailCard({ 
  party, 
  documents = [],
  showSensitive = false,
  className 
}: PartyDetailCardProps) {
  const data = party.party_data || {}
  const isBuyer = party.party_role === "buyer" || party.party_role === "transferee"
  
  const beneficialOwners = data.beneficial_owners || []
  const trustees = data.trustees || []
  const paymentSources = data.payment_sources || []
  
  const totalPayments = paymentSources.reduce((sum: number, ps: any) => sum + (ps.amount || 0), 0)

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <PartyTypeBadge type={party.entity_type} />
            <CardTitle className="text-lg">{party.display_name}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <PartyRoleBadge role={party.party_role} />
            <PartyStatusBadge status={party.status} />
          </div>
        </div>
        {party.submitted_at && (
          <p className="text-sm text-muted-foreground">
            Submitted {format(new Date(party.submitted_at), "MMM d, yyyy 'at' h:mm a")}
          </p>
        )}
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* INDIVIDUAL */}
        {party.entity_type === "individual" && (
          <>
            <Section title="Personal Information" icon={User}>
              <DataRow label="Full Name" value={[data.first_name, data.middle_name, data.last_name, data.suffix].filter(Boolean).join(" ")} />
              <DataRow label="Date of Birth" value={data.date_of_birth ? format(new Date(data.date_of_birth), "MMM d, yyyy") : null} />
              <DataRow label="Citizenship" value={data.citizenship?.replace(/_/g, " ")} />
              <DataRow label="ID Type" value={data.id_type?.toUpperCase()} />
              <DataRow 
                label="ID Number" 
                value={showSensitive ? data.id_number : maskSSN(data.id_number)} 
                masked 
              />
            </Section>
            
            <Separator />
            
            <Section title="Address" icon={MapPin}>
              <p className="text-sm">{formatAddress(data.address)}</p>
            </Section>
            
            <Separator />
            
            <Section title="Contact" icon={Phone}>
              <DataRow label="Phone" value={data.phone} />
              <DataRow label="Email" value={data.email} />
            </Section>
          </>
        )}

        {/* ENTITY (LLC, Corp, etc.) */}
        {(party.entity_type === "entity" || party.entity_type?.includes("llc") || party.entity_type?.includes("corporation") || party.entity_type?.includes("partnership")) && (
          <>
            <Section title="Entity Information" icon={Building2}>
              <DataRow label="Legal Name" value={data.entity_name} />
              <DataRow label="DBA" value={data.entity_dba} />
              <DataRow label="Entity Type" value={data.entity_type?.replace(/_/g, " ")} />
              <DataRow 
                label="EIN" 
                value={showSensitive ? data.ein : maskEIN(data.ein)} 
                masked 
              />
              <DataRow label="State of Formation" value={data.formation_state} />
              <DataRow label="Date of Formation" value={data.formation_date ? format(new Date(data.formation_date), "MMM d, yyyy") : null} />
            </Section>
            
            <Separator />
            
            <Section title="Business Address" icon={MapPin}>
              <p className="text-sm">{formatAddress(data.address)}</p>
            </Section>
            
            {/* Signing Individual */}
            {(data.signer_name || data.first_name) && (
              <>
                <Separator />
                <Section title="Signing Individual" icon={User}>
                  <DataRow label="Name" value={data.signer_name || [data.first_name, data.middle_name, data.last_name].filter(Boolean).join(" ")} />
                  <DataRow label="Title" value={data.signer_title} />
                  <DataRow label="Date of Birth" value={data.date_of_birth ? format(new Date(data.date_of_birth), "MMM d, yyyy") : data.signer_dob ? format(new Date(data.signer_dob), "MMM d, yyyy") : null} />
                  {data.signer_address && (
                    <DataRow label="Address" value={formatAddress(data.signer_address)} />
                  )}
                </Section>
              </>
            )}
            
            {/* Beneficial Owners (for buyers) */}
            {isBuyer && beneficialOwners.length > 0 && (
              <>
                <Separator />
                <Section title={`Beneficial Owners (${beneficialOwners.length})`} icon={Users}>
                  <div className="space-y-3">
                    {beneficialOwners.map((bo: any, index: number) => (
                      <div key={bo.id || index} className="p-3 bg-muted/50 rounded-lg space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-sm">
                            {[bo.first_name, bo.middle_name, bo.last_name, bo.suffix].filter(Boolean).join(" ")}
                          </span>
                          {bo.ownership_percentage && (
                            <Badge variant="outline">{bo.ownership_percentage}%</Badge>
                          )}
                        </div>
                        <DataRow label="DOB" value={bo.date_of_birth ? format(new Date(bo.date_of_birth), "MMM d, yyyy") : null} />
                        <DataRow 
                          label="SSN" 
                          value={showSensitive ? bo.id_number : maskSSN(bo.id_number)} 
                          masked 
                        />
                        <DataRow label="Address" value={formatAddress(bo.address)} />
                      </div>
                    ))}
                  </div>
                </Section>
              </>
            )}
          </>
        )}

        {/* TRUST */}
        {party.entity_type === "trust" && (
          <>
            <Section title="Trust Information" icon={Landmark}>
              <DataRow label="Trust Name" value={data.trust_name} />
              <DataRow label="Trust Type" value={data.trust_type?.replace(/_/g, " ")} />
              <DataRow label="Date Executed" value={data.trust_date ? format(new Date(data.trust_date), "MMM d, yyyy") : null} />
              <DataRow 
                label="TIN" 
                value={showSensitive ? data.trust_ein : maskEIN(data.trust_ein)} 
                masked 
              />
              {data.is_revocable !== undefined && (
                <DataRow label="Type" value={data.is_revocable ? "Revocable" : "Irrevocable"} />
              )}
            </Section>
            
            {/* Trustees */}
            {trustees.length > 0 && (
              <>
                <Separator />
                <Section title={`Trustees (${trustees.length})`} icon={Users}>
                  <div className="space-y-3">
                    {trustees.map((trustee: any, index: number) => (
                      <div key={trustee.id || index} className="p-3 bg-muted/50 rounded-lg space-y-1">
                        <Badge variant="outline" className="mb-2">
                          {trustee.type === "individual" ? "Individual" : "Entity"}
                        </Badge>
                        {trustee.type === "individual" ? (
                          <>
                            <DataRow label="Name" value={trustee.full_name} />
                            <DataRow 
                              label="SSN" 
                              value={showSensitive ? trustee.ssn : maskSSN(trustee.ssn)} 
                              masked 
                            />
                          </>
                        ) : (
                          <>
                            <DataRow label="Entity Name" value={trustee.entity_name} />
                            <DataRow 
                              label="EIN" 
                              value={showSensitive ? trustee.ein : maskEIN(trustee.ein)} 
                              masked 
                            />
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </Section>
              </>
            )}
          </>
        )}

        {/* Payment Sources (for all buyers) */}
        {isBuyer && paymentSources.length > 0 && (
          <>
            <Separator />
            <Section title={`Payment Sources (${paymentSources.length})`} icon={CreditCard}>
              <div className="space-y-3">
                {paymentSources.map((ps: any, index: number) => (
                  <div key={ps.id || index} className="p-3 bg-muted/50 rounded-lg space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-sm">{ps.source_type?.replace(/_/g, " ")}</span>
                      <span className="font-bold">{formatCurrency(ps.amount || 0)}</span>
                    </div>
                    <DataRow label="Method" value={ps.payment_method?.replace(/_/g, " ")} />
                    {ps.institution_name && (
                      <DataRow label="Institution" value={ps.institution_name} />
                    )}
                    {ps.is_third_party && ps.third_party_name && (
                      <DataRow label="Third Party" value={ps.third_party_name} />
                    )}
                  </div>
                ))}
                <div className="pt-2 border-t flex justify-between items-center">
                  <span className="font-medium">Total</span>
                  <span className="text-lg font-bold">{formatCurrency(totalPayments)}</span>
                </div>
              </div>
            </Section>
          </>
        )}

        {/* Certification */}
        {data.certified && (
          <>
            <Separator />
            <Section title="Certification" icon={Shield}>
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="font-medium">Certified</span>
                </div>
                {data.certification_signature && (
                  <p className="text-sm mt-2">
                    Electronically signed by <strong>{data.certification_signature}</strong>
                  </p>
                )}
                {data.certification_date && (
                  <p className="text-xs text-green-600 mt-1">
                    {data.certification_date}
                  </p>
                )}
              </div>
            </Section>
          </>
        )}

        {/* Documents */}
        {documents.length > 0 && (
          <>
            <Separator />
            <Section title={`Documents (${documents.length})`} icon={FileText}>
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div 
                    key={doc.id} 
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {doc.mime_type?.startsWith("image/") ? (
                        <FileImage className="h-4 w-4 text-blue-500 shrink-0" />
                      ) : (
                        <FileText className="h-4 w-4 text-red-500 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{doc.file_name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{getDocumentTypeLabel(doc.document_type)}</span>
                          {doc.size_bytes && (
                            <>
                              <span>•</span>
                              <span>{formatFileSize(doc.size_bytes)}</span>
                            </>
                          )}
                          {doc.verified_at && (
                            <Badge variant="default" className="text-[10px] px-1 py-0 h-4 bg-green-600">
                              Verified
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    {doc.download_url && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 h-8 w-8"
                        onClick={() => window.open(doc.download_url, "_blank")}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          </>
        )}
      </CardContent>
    </Card>
  )
}
