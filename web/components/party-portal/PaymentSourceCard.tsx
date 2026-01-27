"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { ChevronDown, ChevronUp, Trash2, CreditCard } from "lucide-react"
import { type PaymentSourceData, PAYMENT_SOURCE_TYPES, PAYMENT_METHODS } from "./types"

interface PaymentSourceCardProps {
  index: number
  data: PaymentSourceData
  onChange: (data: PaymentSourceData) => void
  onRemove: () => void
  disabled?: boolean
  canRemove?: boolean
}

export function PaymentSourceCard({
  index,
  data,
  onChange,
  onRemove,
  disabled = false,
  canRemove = true,
}: PaymentSourceCardProps) {
  const [isOpen, setIsOpen] = useState(true)

  const update = <K extends keyof PaymentSourceData>(
    field: K,
    value: PaymentSourceData[K]
  ) => {
    onChange({ ...data, [field]: value })
  }

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(cents / 100)
  }

  const sourceLabel = PAYMENT_SOURCE_TYPES.find((t) => t.value === data.source_type)?.label || `Payment Source ${index + 1}`

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="relative">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                  <CreditCard className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <CardTitle className="text-base">{sourceLabel}</CardTitle>
                  {data.amount > 0 && (
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(data.amount * 100)}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {canRemove && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      onRemove()
                    }}
                    disabled={disabled}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
                {isOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Source Type *</Label>
                <Select
                  value={data.source_type || ""}
                  onValueChange={(val) => update("source_type", val as any)}
                  disabled={disabled}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_SOURCE_TYPES.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {data.source_type === "other" && (
                <div>
                  <Label>Specify Other *</Label>
                  <Input
                    value={data.source_other || ""}
                    onChange={(e) => update("source_other", e.target.value)}
                    placeholder="Describe source"
                    disabled={disabled}
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Amount *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={data.amount || ""}
                    onChange={(e) => update("amount", parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="pl-7"
                    disabled={disabled}
                  />
                </div>
              </div>
              
              <div>
                <Label>Payment Method *</Label>
                <Select
                  value={data.payment_method || ""}
                  onValueChange={(val) => update("payment_method", val as any)}
                  disabled={disabled}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {data.payment_method === "other" && (
                <div className="col-span-2">
                  <Label>Specify Other Method *</Label>
                  <Input
                    value={data.method_other || ""}
                    onChange={(e) => update("method_other", e.target.value)}
                    placeholder="Describe payment method"
                    disabled={disabled}
                  />
                </div>
              )}
            </div>

            {/* Account Info (for wire/check) */}
            {(data.payment_method === "wire" || 
              data.payment_method === "cashiers_check" || 
              data.payment_method === "certified_check") && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Financial Institution Name</Label>
                  <Input
                    value={data.institution_name || ""}
                    onChange={(e) => update("institution_name", e.target.value)}
                    placeholder="Bank of America"
                    disabled={disabled}
                  />
                </div>
                <div>
                  <Label>Account Number (last 4 digits)</Label>
                  <Input
                    value={data.account_last_four || ""}
                    onChange={(e) => update("account_last_four", e.target.value.slice(0, 4))}
                    placeholder="1234"
                    maxLength={4}
                    disabled={disabled}
                  />
                </div>
              </div>
            )}

            {/* Third Party */}
            <div>
              <Label>Is this from a third party?</Label>
              <RadioGroup
                value={data.is_third_party ? "yes" : "no"}
                onValueChange={(val) => update("is_third_party", val === "yes")}
                className="flex gap-6 mt-2"
                disabled={disabled}
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="no" id={`third-party-no-${index}`} />
                  <Label htmlFor={`third-party-no-${index}`} className="font-normal cursor-pointer">No</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="yes" id={`third-party-yes-${index}`} />
                  <Label htmlFor={`third-party-yes-${index}`} className="font-normal cursor-pointer">Yes</Label>
                </div>
              </RadioGroup>
            </div>

            {data.is_third_party && (
              <div className="grid grid-cols-1 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <Label>Third Party Name *</Label>
                  <Input
                    value={data.third_party_name || ""}
                    onChange={(e) => update("third_party_name", e.target.value)}
                    placeholder="Name of person/entity providing funds"
                    disabled={disabled}
                  />
                </div>
                <div>
                  <Label>Third Party Address</Label>
                  <Input
                    value={data.third_party_address || ""}
                    onChange={(e) => update("third_party_address", e.target.value)}
                    placeholder="Full address"
                    disabled={disabled}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}

// Helper to create a new empty payment source
export function createEmptyPaymentSource(): PaymentSourceData {
  return {
    id: crypto.randomUUID(),
    source_type: "personal_funds",
    amount: 0,
    payment_method: "wire",
    is_third_party: false,
  }
}
