/**
 * Types for Address Autocomplete + SiteX Property Data
 */

// =============================================================================
// Address Types (from Google Places)
// =============================================================================

export interface ParsedAddress {
  street: string;        // "123 Main St"
  city: string;          // "Los Angeles"
  state: string;         // "CA"
  zip: string;           // "90001"
  county?: string;       // "Los Angeles"
  formatted: string;     // "123 Main St, Los Angeles, CA 90001"
  lat?: number;
  lng?: number;
  placeId?: string;
}

// =============================================================================
// Property Data (from SiteX)
// =============================================================================

export interface PropertyOwner {
  full_name: string;
  first_name: string;
  last_name: string;
  mailing_address: string;
  mailing_city: string;
  mailing_state: string;
  mailing_zip: string;
}

export interface PropertyData {
  // Address
  street_address: string;
  city: string;
  state: string;
  zip_code: string;
  county: string;
  
  // Identifiers
  apn: string;              // Assessor's Parcel Number
  fips: string;             // County FIPS code
  
  // Legal description
  legal_description: string;
  subdivision_name?: string;
  tract_number?: string;
  lot_number?: string;
  
  // Ownership
  primary_owner: PropertyOwner;
  secondary_owner?: PropertyOwner;
  vesting_type?: string;
  
  // Property details
  property_type?: string;   // "SFR", "Condo", etc.
  bedrooms?: number;
  bathrooms?: number;
  square_feet?: number;
  lot_size_sqft?: number;
  year_built?: number;
  stories?: number;
  
  // Valuation
  assessed_value?: number;
  land_value?: number;
  improvement_value?: number;
  market_value?: number;
  tax_amount?: number;
  tax_year?: number;
  
  // Metadata
  enrichment_source: string;
  enrichment_timestamp: string;
  confidence_score: number;
}

export interface PropertyMatch {
  address: string;
  city: string;
  state: string;
  zip_code: string;
  apn: string;
  fips: string;
  owner_name: string;
}

// =============================================================================
// Component Props
// =============================================================================

export interface AddressAutocompleteProps {
  /** Called when user selects an address */
  onSelect: (address: ParsedAddress, property?: PropertyData) => void;
  
  /** Called when multi-match occurs */
  onMultiMatch?: (matches: PropertyMatch[]) => void;
  
  /** Fetch property data from SiteX (default: false) */
  fetchPropertyData?: boolean;
  
  /** Input placeholder */
  placeholder?: string;
  
  /** Pre-fill value */
  defaultValue?: string;
  
  /** Disable input */
  disabled?: boolean;
  
  /** Container className */
  className?: string;
  
  /** Input className */
  inputClassName?: string;
  
  /** Restrict to countries (default: ["us"]) */
  countries?: string[];
  
  /** API endpoint for property lookup */
  propertyEndpoint?: string;
  
  /** Show property data card after selection */
  showPropertyCard?: boolean;
  
  /** Label for the input */
  label?: string;
  
  /** Required field indicator */
  required?: boolean;
}

// =============================================================================
// API Types
// =============================================================================

export interface PropertyLookupRequest {
  street: string;
  city?: string;
  state: string;
  zip?: string;
}

export interface PropertyLookupResponse {
  status: "success" | "multi_match" | "not_found" | "not_configured" | "error";
  property?: PropertyData;
  matches?: PropertyMatch[];
  match_count: number;
  error?: string;
}
