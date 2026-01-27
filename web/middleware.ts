import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

/**
 * Middleware for role-based access control.
 * 
 * Role Hierarchy:
 * - COO: Executive dashboard only
 * - PCT Admin: Internal operations (no billing)
 * - PCT Staff: Assigned work only
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
    let userEmail: string | null = null
    let userRole: string | null = null

    if (sessionValue !== "1") {
      try {
        const decoded = Buffer.from(sessionValue, "base64").toString("utf-8")
        const userData = JSON.parse(decoded)
        userEmail = userData.email
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
    const isPCTInternal = isCOO || isPCTAdmin || isPCTStaff

    // ========== HOME REDIRECTS ==========
    if (pathname === "/app" || pathname === "/app/") {
      if (isCOO) return NextResponse.redirect(new URL("/app/executive", request.url))
      if (isPCTAdmin) return NextResponse.redirect(new URL("/app/admin/overview", request.url))
      if (isPCTStaff) return NextResponse.redirect(new URL("/app/staff/queue", request.url))
      return NextResponse.redirect(new URL("/app/dashboard", request.url))
    }

    // ========== COO RESTRICTIONS ==========
    // COO only sees executive dashboard
    if (isCOO && !pathname.startsWith("/app/executive")) {
      return NextResponse.redirect(new URL("/app/executive", request.url))
    }

    // ========== CLIENT RESTRICTIONS ==========
    // Clients cannot access admin, staff, or executive routes
    if (isClient && pathname.startsWith("/app/admin")) {
      return NextResponse.redirect(new URL("/app/dashboard", request.url))
    }
    if (isClient && pathname.startsWith("/app/staff")) {
      return NextResponse.redirect(new URL("/app/dashboard", request.url))
    }
    if (isClient && pathname.startsWith("/app/executive")) {
      return NextResponse.redirect(new URL("/app/dashboard", request.url))
    }
    if (isClient && pathname.startsWith("/app/demo-tools")) {
      return NextResponse.redirect(new URL("/app/dashboard", request.url))
    }

    // Client User cannot access billing/invoices
    if (isClientUser && pathname.startsWith("/app/invoices")) {
      return NextResponse.redirect(new URL("/app/dashboard", request.url))
    }

    // Client User cannot access team or company settings
    if (isClientUser && pathname === "/app/settings/team") {
      return NextResponse.redirect(new URL("/app/dashboard", request.url))
    }
    if (isClientUser && pathname === "/app/settings/company") {
      return NextResponse.redirect(new URL("/app/dashboard", request.url))
    }

    // ========== PCT STAFF RESTRICTIONS ==========
    if (isPCTStaff) {
      const staffBlockedPaths = [
        "/app/admin/companies",
        "/app/admin/users",
        "/app/admin/billing",
        "/app/admin/notifications",
        "/app/admin/overview",
        "/app/executive",
      ]
      if (staffBlockedPaths.some((blocked) => pathname.startsWith(blocked))) {
        return NextResponse.redirect(new URL("/app/staff/queue", request.url))
      }
      // Staff going to client dashboard should go to their queue
      if (pathname === "/app/dashboard") {
        return NextResponse.redirect(new URL("/app/staff/queue", request.url))
      }
    }

    // ========== PCT ADMIN RESTRICTIONS ==========
    if (isPCTAdmin) {
      // PCT Admin cannot access billing (that's client-facing)
      if (pathname.startsWith("/app/admin/billing")) {
        return NextResponse.redirect(new URL("/app/admin/overview", request.url))
      }
      // PCT Admin cannot access executive dashboard
      if (pathname.startsWith("/app/executive")) {
        return NextResponse.redirect(new URL("/app/admin/overview", request.url))
      }
      // PCT Admin going to client dashboard should go to admin overview
      if (pathname === "/app/dashboard") {
        return NextResponse.redirect(new URL("/app/admin/overview", request.url))
      }
      // PCT Admin cannot access staff-specific pages
      if (pathname.startsWith("/app/staff")) {
        return NextResponse.redirect(new URL("/app/admin/overview", request.url))
      }
    }
  }

  // Redirect logged-in users away from login page
  if (pathname === "/login" && sessionValue) {
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

    if (userRole === "coo") {
      return NextResponse.redirect(new URL("/app/executive", request.url))
    } else if (userRole === "pct_admin") {
      return NextResponse.redirect(new URL("/app/admin/overview", request.url))
    } else if (userRole === "pct_staff") {
      return NextResponse.redirect(new URL("/app/staff/queue", request.url))
    } else {
      return NextResponse.redirect(new URL("/app/dashboard", request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
