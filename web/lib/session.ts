/**
 * Session management utilities for demo authentication.
 * 
 * The demo session cookie contains base64-encoded JSON with user data.
 * Browsers may URL-encode the cookie value, so we need to:
 * 1. URL decode (decodeURIComponent)
 * 2. Base64 decode (atob)
 * 3. JSON parse
 */

export interface DemoSession {
  id: string;
  email: string;
  name: string;
  role: "coo" | "pct_admin" | "pct_staff" | "client_admin" | "client_user";
  companyId: string | null;
  companyName: string;
}

const COOKIE_NAME = "pct_demo_session";

/**
 * Safely parse the demo session cookie.
 * Handles URL encoding and base64 decoding with proper error handling.
 * 
 * @returns DemoSession object or null if cookie is missing/invalid
 */
export function parseSessionCookie(): DemoSession | null {
  if (typeof document === "undefined") return null;
  
  const cookie = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${COOKIE_NAME}=`));
  
  if (!cookie) return null;
  
  try {
    const cookieValue = cookie.split("=")[1];
    if (!cookieValue) return null;
    
    // Handle legacy "1" session value
    if (cookieValue === "1") {
      return {
        id: "demo-legacy",
        email: "admin@pctfincen.com",
        name: "Demo User",
        role: "pct_admin",
        companyId: null,
        companyName: "FinClear Solutions",
      };
    }
    
    // Step 1: URL decode (handles %3D, %2B, etc.)
    const urlDecoded = decodeURIComponent(cookieValue);
    
    // Step 2: Base64 decode
    const base64Decoded = atob(urlDecoded);
    
    // Step 3: JSON parse
    const data = JSON.parse(base64Decoded);
    
    return {
      id: data.id || "",
      email: data.email || "",
      name: data.name || "",
      role: data.role || "client_user",
      companyId: data.companyId || null,
      companyName: data.companyName || "",
    };
  } catch (e) {
    console.error("Failed to parse session cookie:", e);
    return null;
  }
}

/**
 * Get just the role from session (common use case)
 */
export function getSessionRole(): DemoSession["role"] {
  const session = parseSessionCookie();
  return session?.role || "client_user";
}

/**
 * Get company ID from session
 */
export function getSessionCompanyId(): string | null {
  const session = parseSessionCookie();
  return session?.companyId || null;
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return parseSessionCookie() !== null;
}

/**
 * Check if user is internal staff (not a client)
 */
export function isInternalUser(): boolean {
  const session = parseSessionCookie();
  return session?.role === "coo" || 
         session?.role === "pct_admin" || 
         session?.role === "pct_staff";
}

/**
 * Check if user is a client user (admin or regular)
 */
export function isClientUser(): boolean {
  const session = parseSessionCookie();
  return session?.role === "client_admin" || 
         session?.role === "client_user";
}

/**
 * Check if user has admin privileges (any admin role)
 */
export function isAdmin(): boolean {
  const session = parseSessionCookie();
  return session?.role === "coo" || 
         session?.role === "pct_admin" || 
         session?.role === "client_admin";
}
