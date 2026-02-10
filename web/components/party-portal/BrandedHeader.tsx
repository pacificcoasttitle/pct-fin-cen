"use client";

import { Building, Shield, Clock } from "lucide-react";

interface BrandedHeaderProps {
  companyName: string;
  companyLogo?: string | null;
  propertyAddress: string;
  closingDate?: string | null;
}

export function BrandedHeader({ companyName, companyLogo, propertyAddress, closingDate }: BrandedHeaderProps) {
  return (
    <div className="border-b bg-white sticky top-0 z-10 shadow-sm">
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo/Company */}
          <div className="flex items-center gap-3">
            {companyLogo ? (
              <img
                src={companyLogo}
                alt={companyName}
                className="w-12 h-12 rounded object-contain"
              />
            ) : (
              <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg shadow-teal-500/25">
                <Building className="w-6 h-6 text-white" />
              </div>
            )}
            <div>
              <p className="font-semibold text-gray-900">{companyName}</p>
              <p className="text-sm text-gray-500 flex items-center gap-1">
                <Shield className="w-3 h-3 text-teal-500" />
                Secure Portal
              </p>
            </div>
          </div>

          {/* Property Badge */}
          <div className="hidden sm:block text-right">
            <p className="text-xs text-gray-500">Property</p>
            <p className="text-sm font-medium text-gray-700 max-w-xs truncate">
              {propertyAddress}
            </p>
            {closingDate && (
              <p className="text-xs text-gray-400 flex items-center justify-end gap-1 mt-0.5">
                <Clock className="w-3 h-3" />
                Closing: {new Date(closingDate).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
