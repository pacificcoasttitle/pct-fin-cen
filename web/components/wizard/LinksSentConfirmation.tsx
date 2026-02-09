"use client";

import { CheckCircle, Mail, Clock, ArrowRight, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

interface Party {
  name: string;
  email: string;
  type: string;
}

interface LinksSentConfirmationProps {
  sellers: Party[];
  buyers: Party[];
  propertyAddress: string;
  onViewStatus: () => void;
}

export function LinksSentConfirmation({
  sellers,
  buyers,
  propertyAddress,
  onViewStatus,
}: LinksSentConfirmationProps) {
  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      {/* Success Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Party Links Sent Successfully!
        </h1>
        <p className="text-gray-600">
          Secure portal links have been emailed for{" "}
          <span className="font-medium">{propertyAddress}</span>
        </p>
      </div>

      {/* Parties List */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Mail className="w-5 h-5 text-blue-600" />
            <h2 className="font-semibold">Emails Sent To:</h2>
          </div>

          {buyers.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-500 mb-2">BUYERS</p>
              {buyers.map((party, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium">{party.name}</p>
                    <p className="text-sm text-gray-500">{party.email}</p>
                  </div>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                    ✓ Link Sent
                  </span>
                </div>
              ))}
            </div>
          )}

          {sellers.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-500 mb-2">SELLERS</p>
              {sellers.map((party, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium">{party.name}</p>
                    <p className="text-sm text-gray-500">{party.email}</p>
                  </div>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                    ✓ Link Sent
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* What Happens Next */}
      <Card className="mb-6 border-amber-200 bg-amber-50">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-5 h-5 text-amber-600" />
            <h2 className="font-semibold text-amber-900">What Happens Next</h2>
          </div>
          <ol className="space-y-3 text-sm text-amber-900">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-amber-200 rounded-full flex items-center justify-center text-xs font-bold">1</span>
              <span>Each party receives an email with a secure link to their portal</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-amber-200 rounded-full flex items-center justify-center text-xs font-bold">2</span>
              <span>They fill out their required information (typically 5-10 minutes each)</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-amber-200 rounded-full flex items-center justify-center text-xs font-bold">3</span>
              <span><strong>You&apos;ll receive an email</strong> when all parties have submitted</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-amber-200 rounded-full flex items-center justify-center text-xs font-bold">4</span>
              <span>Return here to review their submissions and file with FinCEN</span>
            </li>
          </ol>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          variant="outline"
          className="flex-1"
          asChild
        >
          <Link href="/app/dashboard">
            <Home className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
        </Button>
        
        <Button
          className="flex-1 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700"
          onClick={onViewStatus}
        >
          View Party Status
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>

      {/* Reassurance */}
      <p className="text-center text-sm text-gray-500 mt-6">
        You can safely close this page. We&apos;ll email you when all parties complete their submissions.
      </p>
    </div>
  );
}
