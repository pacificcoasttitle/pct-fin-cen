/**
 * Google Places Utilities
 */

import type { ParsedAddress } from "./property-types";

/**
 * Parse Google Places result into our address format
 */
export function parseGooglePlace(place: google.maps.places.PlaceResult): ParsedAddress {
  const components = place.address_components || [];
  
  const get = (type: string, short = false): string => {
    const comp = components.find((c) => c.types.includes(type));
    return comp ? (short ? comp.short_name : comp.long_name) : "";
  };

  const streetNumber = get("street_number");
  const route = get("route");
  const street = streetNumber ? `${streetNumber} ${route}` : route;
  
  const city = get("locality") || get("sublocality") || get("administrative_area_level_2");
  const state = get("administrative_area_level_1", true);
  const zip = get("postal_code");
  const county = get("administrative_area_level_2");

  const formatted = [street, city, state, zip].filter(Boolean).join(", ");

  return {
    street,
    city,
    state,
    zip,
    county,
    formatted,
    lat: place.geometry?.location?.lat(),
    lng: place.geometry?.location?.lng(),
    placeId: place.place_id,
  };
}

/**
 * Load Google Maps script dynamically
 */
export function loadGoogleMaps(apiKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Window not available"));
      return;
    }
    
    if (window.google?.maps?.places) {
      resolve();
      return;
    }

    const existing = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existing) {
      existing.addEventListener("load", () => resolve());
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(script);
  });
}
