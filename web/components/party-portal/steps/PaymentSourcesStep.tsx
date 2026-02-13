"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DollarSign, Plus, AlertTriangle } from "lucide-react";
import { PaymentSourceCard, createEmptyPaymentSource } from "../PaymentSourceCard";
import { type PartySubmissionData, type PaymentSourceData } from "../types";

interface PaymentSourcesStepProps {
  data: Partial<PartySubmissionData>;
  onChange: (data: Partial<PartySubmissionData>) => void;
  disabled?: boolean;
}

export function PaymentSourcesStep({ data, onChange, disabled }: PaymentSourcesStepProps) {
  const paymentSources = data.payment_sources || [];

  const addSource = () => {
    onChange({
      ...data,
      payment_sources: [...paymentSources, createEmptyPaymentSource()],
    });
  };

  const updateSource = (index: number, updated: PaymentSourceData) => {
    const newSources = [...paymentSources];
    newSources[index] = updated;
    onChange({ ...data, payment_sources: newSources });
  };

  const removeSource = (index: number) => {
    const newSources = paymentSources.filter((_, i) => i !== index);
    onChange({ ...data, payment_sources: newSources });
  };

  // Compute total amount
  const totalAmount = paymentSources.reduce(
    (sum, ps) => sum + (ps.amount || 0),
    0
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="px-0 pt-0">
        <CardTitle className="flex items-center gap-2 text-lg">
          <DollarSign className="w-5 h-5 text-teal-600" />
          Payment Details
        </CardTitle>
        <CardDescription>
          Please provide details about how this property purchase is being funded.
          FinCEN requires reporting of all fund sources used in the transaction.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 px-0">
        {/* Validation warning */}
        {paymentSources.length === 0 && (
          <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-medium mb-1">At least one payment source is required</p>
              <p>
                Please add information about each source of funds used for this purchase,
                including personal funds, business funds, loans, gifts, etc.
              </p>
            </div>
          </div>
        )}

        {/* Payment Source Cards */}
        <div className="space-y-4">
          {paymentSources.map((source, index) => (
            <PaymentSourceCard
              key={source.id}
              index={index}
              data={source}
              onChange={(updated) => updateSource(index, updated)}
              onRemove={() => removeSource(index)}
              disabled={disabled}
              canRemove={paymentSources.length > 1}
            />
          ))}
        </div>

        {/* Total summary */}
        {paymentSources.length > 0 && totalAmount > 0 && (
          <div className="p-3 rounded-lg text-sm font-medium bg-green-50 text-green-700 border border-green-200">
            Total from all sources: {formatCurrency(totalAmount)}
          </div>
        )}

        {/* Add button */}
        <Button
          type="button"
          variant="outline"
          onClick={addSource}
          disabled={disabled}
          className="w-full border-dashed border-2 h-12 text-muted-foreground hover:text-foreground hover:border-green-400"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Payment Source
        </Button>
      </CardContent>
    </Card>
  );
}
