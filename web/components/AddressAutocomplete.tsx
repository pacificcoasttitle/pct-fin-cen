/**
 * AddressAutocomplete Component
 * 
 * Google Places autocomplete + SiteX property enrichment with multi-match handling
 * 
 * Usage:
 *   <AddressAutocomplete
 *     onSelect={(address, property) => console.log(address, property)}
 *     fetchPropertyData={true}
 *   />
 */

"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { parseGooglePlace, loadGoogleMaps } from "@/lib/google-places";
import type { 
  AddressAutocompleteProps, 
  ParsedAddress, 
  PropertyData,
  PropertyMatch,
  PropertyLookupResponse 
} from "@/lib/property-types";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, MapPin, Building2, Home, Check, AlertTriangle } from "lucide-react";

export function AddressAutocomplete({
  onSelect,
  onMultiMatch,
  fetchPropertyData = false,
  placeholder = "Start typing an address...",
  defaultValue = "",
  disabled = false,
  className = "",
  inputClassName = "",
  countries = ["us"],
  propertyEndpoint = "/api/property/lookup",
  showPropertyCard = false,
  label,
  required = false,
}: AddressAutocompleteProps) {
  
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  
  const [value, setValue] = useState(defaultValue);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [propertyData, setPropertyData] = useState<PropertyData | null>(null);
  const [multiMatches, setMultiMatches] = useState<PropertyMatch[] | null>(null);

  // ---------------------------------------------------------------------------
  // Load Google Maps
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      console.warn("Google Maps API key not configured - autocomplete disabled");
      setReady(true); // Allow manual input
      return;
    }

    loadGoogleMaps(apiKey)
      .then(() => setReady(true))
      .catch((err) => {
        console.error("Failed to load Google Maps:", err);
        setReady(true); // Allow manual input
      });
  }, []);

  // ---------------------------------------------------------------------------
  // Initialize Autocomplete
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!ready || !inputRef.current || autocompleteRef.current) return;
    if (typeof window === "undefined" || !window.google?.maps?.places) return;

    const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: countries },
      types: ["address"],
      fields: ["address_components", "formatted_address", "geometry", "place_id"],
    });

    autocomplete.addListener("place_changed", () => {
      handlePlaceSelect(autocomplete);
    });

    autocompleteRef.current = autocomplete;

    return () => {
      google.maps.event.clearInstanceListeners(autocomplete);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // ---------------------------------------------------------------------------
  // Handle Selection
  // ---------------------------------------------------------------------------
  const handlePlaceSelect = useCallback(
    async (autocomplete: google.maps.places.Autocomplete) => {
      const place = autocomplete.getPlace();
      
      if (!place.address_components) {
        setError("Please select an address from the dropdown");
        return;
      }

      setError(null);
      setMultiMatches(null);
      const address = parseGooglePlace(place);
      setValue(address.formatted);
      setPropertyData(null);

      // Skip SiteX if not enabled
      if (!fetchPropertyData) {
        onSelect(address, undefined);
        return;
      }

      // Fetch property data
      setLoading(true);
      try {
        const result = await lookupProperty(address, propertyEndpoint);
        
        if (result.status === "success" && result.property) {
          setPropertyData(result.property);
          onSelect(address, result.property);
        } else if (result.status === "multi_match" && result.matches) {
          setMultiMatches(result.matches);
          onMultiMatch?.(result.matches);
          onSelect(address, undefined); // Still return address
        } else if (result.status === "not_configured") {
          // SiteX not configured - just use Google address
          console.warn("SiteX not configured");
          onSelect(address, undefined);
        } else {
          // not_found or error - still return address
          onSelect(address, undefined);
        }
      } catch (err) {
        console.error("Property lookup failed:", err);
        onSelect(address, undefined);
      } finally {
        setLoading(false);
      }
    },
    [fetchPropertyData, onSelect, onMultiMatch, propertyEndpoint]
  );

  // ---------------------------------------------------------------------------
  // Handle Multi-Match Selection
  // ---------------------------------------------------------------------------
  const handleMatchSelect = async (match: PropertyMatch) => {
    setLoading(true);
    setMultiMatches(null);
    
    try {
      // Look up by APN for more specific result
      const result = await lookupPropertyByApn(match.apn, match.fips, propertyEndpoint);
      
      if (result.status === "success" && result.property) {
        setPropertyData(result.property);
        
        // Create address from match
        const address: ParsedAddress = {
          street: match.address,
          city: match.city,
          state: match.state,
          zip: match.zip_code,
          formatted: `${match.address}, ${match.city}, ${match.state} ${match.zip_code}`,
        };
        setValue(address.formatted);
        onSelect(address, result.property);
      }
    } catch (err) {
      console.error("Match lookup failed:", err);
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className={cn("space-y-3", className)}>
      {label && (
        <Label className="text-sm font-medium">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground z-10">
          <MapPin className="h-4 w-4" />
        </div>
        <Input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
            setPropertyData(null);
            setMultiMatches(null);
          }}
          placeholder={placeholder}
          disabled={disabled || !ready}
          autoComplete="off"
          className={cn(
            "pl-10 pr-10",
            error ? "border-red-500 focus-visible:ring-red-500" : "",
            inputClassName
          )}
        />
        
        {/* Loading spinner */}
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-teal-500" />
          </div>
        )}
        
        {/* Success indicator */}
        {!loading && propertyData && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Check className="h-4 w-4 text-green-500" />
          </div>
        )}
      </div>
      
      {/* Error */}
      {error && (
        <p className="text-sm text-red-600 flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          {error}
        </p>
      )}
      
      {/* Multi-Match Selection */}
      {multiMatches && multiMatches.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-4">
            <h4 className="font-medium text-amber-900 mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Multiple properties found - please select:
            </h4>
            <div className="space-y-2">
              {multiMatches.map((match, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleMatchSelect(match)}
                  className="w-full text-left p-3 bg-white border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
                >
                  <div className="font-medium flex items-center gap-2">
                    <Home className="h-4 w-4 text-amber-600" />
                    {match.address}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {match.city}, {match.state} {match.zip_code}
                    {match.apn && <span className="ml-2">• APN: {match.apn}</span>}
                  </div>
                  {match.owner_name && (
                    <div className="text-sm text-muted-foreground">
                      Owner: {match.owner_name}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Property Data Card */}
      {showPropertyCard && propertyData && (
        <Card className="border-teal-200 bg-gradient-to-br from-teal-50 to-cyan-50">
          <CardContent className="pt-4">
            <h4 className="font-medium text-teal-900 mb-3 flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Property Details (from Title Plant)
            </h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {propertyData.apn && (
                <div>
                  <span className="text-muted-foreground">APN:</span>
                  <span className="ml-2 font-mono font-medium">{propertyData.apn}</span>
                </div>
              )}
              {propertyData.county && (
                <div>
                  <span className="text-muted-foreground">County:</span>
                  <span className="ml-2 font-medium">{propertyData.county}</span>
                </div>
              )}
              {propertyData.primary_owner?.full_name && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Owner of Record:</span>
                  <span className="ml-2 font-medium">{propertyData.primary_owner.full_name}</span>
                </div>
              )}
              {propertyData.property_type && (
                <div>
                  <span className="text-muted-foreground">Type:</span>
                  <span className="ml-2 font-medium">{propertyData.property_type}</span>
                </div>
              )}
              {propertyData.year_built && (
                <div>
                  <span className="text-muted-foreground">Year Built:</span>
                  <span className="ml-2 font-medium">{propertyData.year_built}</span>
                </div>
              )}
              {propertyData.square_feet && (
                <div>
                  <span className="text-muted-foreground">Sq Ft:</span>
                  <span className="ml-2 font-medium">{propertyData.square_feet.toLocaleString()}</span>
                </div>
              )}
              {propertyData.bedrooms !== undefined && propertyData.bathrooms !== undefined && (
                <div>
                  <span className="text-muted-foreground">Bed/Bath:</span>
                  <span className="ml-2 font-medium">{propertyData.bedrooms}/{propertyData.bathrooms}</span>
                </div>
              )}
              {propertyData.assessed_value && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Assessed Value:</span>
                  <span className="ml-2 font-medium text-green-700">
                    ${propertyData.assessed_value.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Property Lookup Helpers
// -----------------------------------------------------------------------------

async function lookupProperty(
  address: ParsedAddress,
  endpoint: string
): Promise<PropertyLookupResponse> {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "";
  const url = `${apiBase}${endpoint}`;
    
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      street: address.street,
      city: address.city,
      state: address.state,
      zip: address.zip,
    }),
  });

  if (!res.ok) {
    throw new Error("Lookup failed");
  }

  return res.json();
}

async function lookupPropertyByApn(
  apn: string,
  fips: string,
  baseEndpoint: string
): Promise<PropertyLookupResponse> {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "";
  const endpoint = baseEndpoint.replace("/lookup", "/lookup-by-apn");
  const url = `${apiBase}${endpoint}`;
    
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ apn, fips }),
  });

  if (!res.ok) {
    throw new Error("APN lookup failed");
  }

  return res.json();
}

export default AddressAutocomplete;
