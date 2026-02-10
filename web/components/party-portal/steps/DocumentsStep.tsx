"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FileUp } from "lucide-react";
import { DocumentUpload, DOCUMENT_TYPES } from "../DocumentUpload";

interface DocumentsStepProps {
  entityType: "individual" | "entity" | "trust";
  partyId?: string;
  disabled?: boolean;
}

export function DocumentsStep({ entityType, partyId, disabled }: DocumentsStepProps) {
  const documentTypes = DOCUMENT_TYPES[entityType] || DOCUMENT_TYPES.individual;

  if (!partyId) {
    return (
      <Card className="border-0 shadow-none">
        <CardHeader className="px-0 pt-0">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileUp className="w-5 h-5 text-teal-600" />
            Identification Documents
          </CardTitle>
          <CardDescription>
            Document upload will be available once your information is saved.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <div className="text-center py-8 text-gray-500">
            <FileUp className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">Save your information first to enable document upload.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <h3 className="flex items-center gap-2 text-lg font-semibold">
          <FileUp className="w-5 h-5 text-teal-600" />
          Identification Documents
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          Upload required documents for identity verification. All files are securely encrypted.
        </p>
      </div>
      <DocumentUpload
        partyId={partyId}
        documentTypes={documentTypes}
      />
    </div>
  );
}
