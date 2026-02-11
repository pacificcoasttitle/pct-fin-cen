/**
 * AddressPropertyLookup Component for FinCEN
 * ============================================
 * 
 * Google Places autocomplete → Backend SiteX lookup → Returns 5 fields:
 *   Address, APN, Legal Description, Subdivision Type, Owner Names
 * 
 * REQUIRES:
 *   - NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env.local
 *   - Backend running with /api/property/lookup endpoint
 * 
 * USAGE:
 *   <AddressPropertyLookup
 *     onPropertyFound={(property) => {
 *       console.log(property.apn);
 *       console.log(property.owner_names);
 *       console.log(property.legal_description);
 *     }}
 *     apiBaseUrl="http://localhost:8000"
 *   />
 */

"use client";

import { useEffect, useRef, useState, useCallback } from "react";

// =============================================================================
// Types
// =============================================================================

export interface ParsedAddress {
  street: string;
  city: string;
  state: string;
  zip: string;
  formatted: string;
}

export interface PropertyResult {
  address: string;
  apn: string;
  legal_description: string;
  subdivision_type: string;
  owner_names: string;
  county?: string;
  property_type?: string;
  assessed_value?: number | null;
  year_built?: number | null;
}

export interface LookupResult {
  success: boolean;
  status: "success" | "multi_match" | "not_found" | "error";
  property?: PropertyResult;
  matches?: Array<{
    address: string;
    city: string;
    state: string;
    apn: string;
    owner: string;
  }>;
  message?: string;
}

interface AddressPropertyLookupProps {
  onPropertyFound: (property: PropertyResult) => void;
  onAddressSelected?: (address: ParsedAddress) => void;
  onError?: (error: string) => void;
  onMultiMatch?: (matches: any[]) => void;
  apiBaseUrl?: string;
  placeholder?: string;
  defaultValue?: string;
  disabled?: boolean;
  className?: string;
  fetchPropertyData?: boolean;
}

// =============================================================================
// Google Maps Script Loader
// =============================================================================

let googleMapsPromise: Promise<void> | null = null;

function loadGoogleMaps(): Promise<void> {
  if (googleMapsPromise) return googleMapsPromise;

  googleMapsPromise = new Promise((resolve, reject) => {
    if (window.google?.maps?.places) {
      resolve();
      return;
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      reject(new Error("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY not set"));
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(script);
  });

  return googleMapsPromise;
}

// =============================================================================
// Address Parser
// =============================================================================

function parseGooglePlace(place: google.maps.places.PlaceResult): ParsedAddress {
  const components = place.address_components || [];

  const get = (type: string, short = false): string => {
    const comp = components.find((c) => c.types.includes(type));
    return comp ? (short ? comp.short_name : comp.long_name) : "";
  };

  const streetNumber = get("street_number");
  const route = get("route");
  const street = streetNumber ? `${streetNumber} ${route}` : route;

  return {
    street,
    city: get("locality") || get("sublocality"),
    state: get("administrative_area_level_1", true), // "CA" not "California"
    zip: get("postal_code"),
    formatted: place.formatted_address || street,
  };
}

// =============================================================================
// Component
// =============================================================================

export default function AddressPropertyLookup({
  onPropertyFound,
  onAddressSelected,
  onError,
  onMultiMatch,
  apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  placeholder = "Start typing an address...",
  defaultValue = "",
  disabled = false,
  className = "",
  fetchPropertyData = true,
}: AddressPropertyLookupProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [inputValue, setInputValue] = useState(defaultValue);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [propertyData, setPropertyData] = useState<PropertyResult | null>(null);

  // Load Google Maps
  useEffect(() => {
    loadGoogleMaps()
      .then(() => {
        if (!inputRef.current || autocompleteRef.current) return;

        const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
          componentRestrictions: { country: "us" },
          types: ["address"],
          fields: ["address_components", "formatted_address", "geometry", "place_id"],
        });

        autocomplete.addListener("place_changed", () => handlePlaceSelect(autocomplete));
        autocompleteRef.current = autocomplete;
      })
      .catch((err) => {
        setError(err.message);
        onError?.(err.message);
      });

    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, []);

  // Handle Place Selection
  const handlePlaceSelect = useCallback(
    async (autocomplete: google.maps.places.Autocomplete) => {
      const place = autocomplete.getPlace();

      if (!place.address_components) {
        setError("Please select an address from the dropdown");
        return;
      }

      setError(null);
      const parsed = parseGooglePlace(place);
      setInputValue(parsed.formatted);
      onAddressSelected?.(parsed);

      if (!fetchPropertyData) return;

      // Call your backend → SiteX
      setIsLoading(true);
      setPropertyData(null);

      try {
        const res = await fetch(`${apiBaseUrl}/api/property/lookup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            street: parsed.street,
            city: parsed.city,
            state: parsed.state,
            zip: parsed.zip,
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`API error ${res.status}: ${errText}`);
        }

        const data: LookupResult = await res.json();

        if (data.status === "success" && data.property) {
          setPropertyData(data.property);
          onPropertyFound(data.property);
        } else if (data.status === "multi_match" && data.matches) {
          onMultiMatch?.(data.matches);
          setError(`Found ${data.matches.length} matches - please be more specific`);
        } else if (data.status === "not_found") {
          setError("No property data found for this address");
        } else {
          setError(data.message || "Lookup failed");
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Property lookup failed";
        setError(msg);
        onError?.(msg);
      } finally {
        setIsLoading(false);
      }
    },
    [apiBaseUrl, fetchPropertyData, onPropertyFound, onAddressSelected, onError, onMultiMatch]
  );

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Address Input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={placeholder}
          disabled={disabled || isLoading}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                     disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {/* Property Data Preview (optional - shows the 5 fields) */}
      {propertyData && (
        <div className="bg-gray-50 border rounded-md p-3 text-sm space-y-1">
          <div className="font-medium text-gray-900">Property Found</div>
          <div><span className="text-gray-500">APN:</span> {propertyData.apn || "N/A"}</div>
          <div><span className="text-gray-500">Owner:</span> {propertyData.owner_names || "N/A"}</div>
          <div><span className="text-gray-500">Legal:</span> {propertyData.legal_description || "N/A"}</div>
          <div><span className="text-gray-500">Subdivision:</span> {propertyData.subdivision_type || "N/A"}</div>
        </div>
      )}
    </div>
  );
}
