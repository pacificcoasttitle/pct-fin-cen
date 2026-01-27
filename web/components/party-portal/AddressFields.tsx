"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { US_STATES, type AddressData } from "./types"

interface AddressFieldsProps {
  value: AddressData
  onChange: (value: AddressData) => void
  label?: string
  required?: boolean
  disabled?: boolean
  showUnit?: boolean
  showCountry?: boolean
}

export function AddressFields({
  value,
  onChange,
  label = "Address",
  required = false,
  disabled = false,
  showUnit = true,
  showCountry = false,
}: AddressFieldsProps) {
  const update = (field: keyof AddressData, val: string) => {
    onChange({ ...value, [field]: val })
  }

  return (
    <div className="space-y-4">
      {label && (
        <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
          {label} {required && "*"}
        </h4>
      )}
      
      <div className="space-y-3">
        <div>
          <Label htmlFor="address-street">Street Address {required && "*"}</Label>
          <Input
            id="address-street"
            value={value.street || ""}
            onChange={(e) => update("street", e.target.value)}
            placeholder="123 Main Street"
            disabled={disabled}
            required={required}
          />
        </div>
        
        {showUnit && (
          <div>
            <Label htmlFor="address-unit">Unit / Apt</Label>
            <Input
              id="address-unit"
              value={value.unit || ""}
              onChange={(e) => update("unit", e.target.value)}
              placeholder="Apt 4B"
              disabled={disabled}
            />
          </div>
        )}
        
        <div className="grid grid-cols-6 gap-3">
          <div className="col-span-3">
            <Label htmlFor="address-city">City {required && "*"}</Label>
            <Input
              id="address-city"
              value={value.city || ""}
              onChange={(e) => update("city", e.target.value)}
              placeholder="Los Angeles"
              disabled={disabled}
              required={required}
            />
          </div>
          <div className="col-span-1">
            <Label htmlFor="address-state">State {required && "*"}</Label>
            <Select
              value={value.state || ""}
              onValueChange={(val) => update("state", val)}
              disabled={disabled}
            >
              <SelectTrigger id="address-state">
                <SelectValue placeholder="State" />
              </SelectTrigger>
              <SelectContent>
                {US_STATES.map((state) => (
                  <SelectItem key={state.value} value={state.value}>
                    {state.value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label htmlFor="address-zip">ZIP {required && "*"}</Label>
            <Input
              id="address-zip"
              value={value.zip || ""}
              onChange={(e) => update("zip", e.target.value)}
              placeholder="90210"
              maxLength={10}
              disabled={disabled}
              required={required}
            />
          </div>
        </div>
        
        {showCountry && (
          <div>
            <Label htmlFor="address-country">Country {required && "*"}</Label>
            <Input
              id="address-country"
              value={value.country || "United States"}
              onChange={(e) => update("country", e.target.value)}
              placeholder="United States"
              disabled={disabled}
            />
          </div>
        )}
      </div>
    </div>
  )
}
