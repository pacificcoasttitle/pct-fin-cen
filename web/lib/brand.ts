/**
 * Central brand configuration for FinClear
 * Import this to use brand assets and constants consistently across the app
 */

export const BRAND = {
  // Brand names
  name: "FinClear",
  legalName: "FinClear Solutions",
  tagline: "FinCEN Compliance Made Simple",
  
  // Domain
  domain: "fincenclear.com",
  
  // Contact
  supportEmail: "clear@fincenclear.com",
  
  // Logo paths - use these consistently:
  // - logo: Full logo with dark text (for light backgrounds)
  // - logoWhite: Full logo with white text (for dark backgrounds)
  // - logoIcon: Compact "FC" icon (for sidebar, favicon, small spaces)
  logo: "/logo.png",
  logoWhite: "/logo-white.png",
  logoIcon: "/logo-icon.png",
  
  // Social (placeholders - update when available)
  twitter: "@finclear",
  linkedin: "finclear",
} as const;

export type Brand = typeof BRAND;

// Helper to get the appropriate logo based on background
export function getLogoForBackground(isDark: boolean): string {
  return isDark ? BRAND.logoWhite : BRAND.logo;
}
