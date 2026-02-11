"use client";

import { StepCard } from "../shared";
import { ReportingPerson, ReportingPersonCategory } from "../types";
import { REPORTING_PERSON_CATEGORY_OPTIONS } from "../constants";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// US States
const US_STATES = [
  { value: "AL", label: "Alabama" },
  { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" },
  { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" },
  { value: "DE", label: "Delaware" },
  { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" },
  { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" },
  { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" },
  { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" },
  { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" },
  { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" },
  { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" },
  { value: "WY", label: "Wyoming" },
  { value: "DC", label: "District of Columbia" },
];

interface ReportingPersonStepProps {
  value: ReportingPerson | null;
  onChange: (value: ReportingPerson) => void;
}

export function ReportingPersonStep({ value, onChange }: ReportingPersonStepProps) {
  const defaultReportingPerson: ReportingPerson = {
    companyName: "",
    contactName: "",
    category: "",
    licenseNumber: "",
    address: { street: "", city: "", state: "", zip: "", country: "US" },
    phone: "",
    email: "",
    isPCTC: null,
  };
  
  const data: ReportingPerson = value || defaultReportingPerson;
  
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
        {/* Category (Required for RERX) */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Reporting Person Category
          </h3>
          
          <div>
            <Label htmlFor="category">Category *</Label>
            <Select
              value={data.category || undefined}
              onValueChange={(v) => handleChange("category", v)}
            >
              <SelectTrigger id="category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {REPORTING_PERSON_CATEGORY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.id} value={opt.id}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Required for FinCEN filing. Select the role that best describes the reporting person.
            </p>
          </div>
        </div>

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
              <Label htmlFor="rp-street">Street Address *</Label>
              <Input
                id="rp-street"
                value={data.address.street}
                onChange={(e) => handleChange("address.street", e.target.value)}
                placeholder="123 Business Ave, Suite 100"
              />
            </div>
            
            <div className="grid grid-cols-6 gap-4">
              <div className="col-span-2">
                <Label htmlFor="rp-city">City *</Label>
                <Input
                  id="rp-city"
                  value={data.address.city}
                  onChange={(e) => handleChange("address.city", e.target.value)}
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="rp-state">State *</Label>
                <Select
                  value={data.address.state}
                  onValueChange={(v) => handleChange("address.state", v)}
                >
                  <SelectTrigger id="rp-state">
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
                <Label htmlFor="rp-zip">ZIP *</Label>
                <Input
                  id="rp-zip"
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
              <Label htmlFor="rp-phone">Phone Number *</Label>
              <Input
                id="rp-phone"
                type="tel"
                value={data.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                placeholder="(555) 123-4567"
              />
            </div>
            <div>
              <Label htmlFor="rp-email">Email Address *</Label>
              <Input
                id="rp-email"
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
