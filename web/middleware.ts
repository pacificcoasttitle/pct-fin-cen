import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

/**
 * Middleware for role-based access control.
 * 
 * Role Hierarchy:
 * - COO: FULL ACCESS - Executive dashboard + all admin pages
 * - PCT Admin: Admin pages (no executive dashboard, no billing)
 * - PCT Staff: Queue, Requests, Filings only
 * - Client Admin: Company data + billing + team
 * - Client User: Basic request/report tracking
 */
export function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get("pct_demo_session")
  const sessionValue = sessionCookie?.value
  const pathname = request.nextUrl.pathname

  // Public routes - no auth required
  if (
    pathname === "/" ||
    pathname === "/login" ||
    pathname.startsWith("/p/") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return NextResponse.next()
  }

  // Require auth for /app routes
  if (pathname.startsWith("/app") && !sessionValue) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("next", pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (sessionValue) {
    // Parse user data from session
    let userRole: string | null = null

    if (sessionValue !== "1") {
      try {
        const decoded = Buffer.from(sessionValue, "base64").toString("utf-8")
        const userData = JSON.parse(decoded)
        userRole = userData.role
      } catch {
        // Invalid session
      }
    }

    // Determine role flags
    const isCOO = userRole === "coo"
    const isPCTAdmin = userRole === "pct_admin"
    const isPCTStaff = userRole === "pct_staff"
    const isClientAdmin = userRole === "client_admin"
    const isClientUser = userRole === "client_user"
    const isClient = isClientAdmin || isClientUser

    // ========== HOME REDIRECTS ==========
    if (pathname === "/app" || pathname === "/app/") {
      if (isCOO) return NextResponse.redirect(new URL("/app/executive", request.url))
      if (isPCTAdmin) return NextResponse.redirect(new URL("/app/admin/overview", request.url))
      if (isPCTStaff) return NextResponse.redirect(new URL("/app/staff/queue", request.url))
      return NextResponse.redirect(new URL("/app/dashboard", request.url))
    }

    // ========== COO - FULL ACCESS ==========
    // COO can access EVERYTHING - no restrictions
    if (isCOO) {
      return NextResponse.next()
    }

    // ========== PCT ADMIN RESTRICTIONS ==========
    if (isPCTAdmin) {
      // Cannot access executive dashboard
      if (pathname.startsWith("/app/executive")) {
        return NextResponse.redirect(new URL("/app/admin/overview", request.url))
      }
      // Cannot access billing (that's COO + client-facing)
      if (pathname.startsWith("/app/admin/billing")) {
        return NextResponse.redirect(new URL("/app/admin/overview", request.url))
      }
      // Redirect from client dashboard to admin overview
      if (pathname === "/app/dashboard") {
        return NextResponse.redirect(new URL("/app/admin/overview", request.url))
      }
      // Redirect from staff pages to admin overview
      if (pathname.startsWith("/app/staff")) {
        return NextResponse.redirect(new URL("/app/admin/overview", request.url))
      }
    }

    // ========== PCT STAFF RESTRICTIONS ==========
    if (isPCTStaff) {
      // Staff allowed paths
      const staffAllowedPaths = [
        "/app/staff",
        "/app/admin/requests",
        "/app/admin/filings",
        "/app/reports", // Can view reports they're working on
      ]
      
      // Check if path is allowed
      const isAllowed = staffAllowedPaths.some((allowed) => pathname.startsWith(allowed))
      
      // Block admin pages except allowed ones
      if (!isAllowed && pathname.startsWith("/app/admin")) {
        return NextResponse.redirect(new URL("/app/staff/queue", request.url))
      }
      
      // Block executive dashboard
      if (pathname.startsWith("/app/executive")) {
        return NextResponse.redirect(new URL("/app/staff/queue", request.url))
      }
      
      // Redirect client dashboard to staff queue
      if (pathname === "/app/dashboard") {
        return NextResponse.redirect(new URL("/app/staff/queue", request.url))
      }
      
      // Block demo-tools for staff
      if (pathname.startsWith("/app/demo-tools")) {
        return NextResponse.redirect(new URL("/app/staff/queue", request.url))
      }
    }

    // ========== CLIENT RESTRICTIONS ==========
    // Clients cannot access admin, staff, executive, or wizard routes
    // Clients submit REQUESTS - PCT staff use the WIZARD
    if (isClient) {
      if (pathname.startsWith("/app/admin")) {
        return NextResponse.redirect(new URL("/app/dashboard", request.url))
      }
      if (pathname.startsWith("/app/staff")) {
        return NextResponse.redirect(new URL("/app/dashboard", request.url))
      }
      if (pathname.startsWith("/app/executive")) {
        return NextResponse.redirect(new URL("/app/dashboard", request.url))
      }
      if (pathname.startsWith("/app/demo-tools")) {
        return NextResponse.redirect(new URL("/app/dashboard", request.url))
      }
      // CLIENT-DRIVEN FLOW: Clients now create reports directly via wizard
      // No restrictions on /app/reports/new or wizard routes
    }

    // ========== CLIENT USER SPECIFIC RESTRICTIONS ==========
    if (isClientUser) {
      // Cannot access billing/invoices
      if (pathname.startsWith("/app/invoices")) {
        return NextResponse.redirect(new URL("/app/dashboard", request.url))
      }
      // Cannot access team or company settings
      if (pathname === "/app/settings/team") {
        return NextResponse.redirect(new URL("/app/dashboard", request.url))
      }
      if (pathname === "/app/settings/company") {
        return NextResponse.redirect(new URL("/app/dashboard", request.url))
      }
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
