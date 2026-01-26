import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

/**
 * Middleware to protect /app/* routes with demo session cookie.
 * 
 * Rules:
 * - /app/* requires pct_demo_session cookie
 * - /login redirects to appropriate home page if already logged in
 * - /p/* is public (party portal)
 * - / and marketing routes are public
 * - /api/* is not affected
 * 
 * Role-based redirects:
 * - PCT staff (pct_admin, pct_staff) → /app/admin/overview
 * - Clients (client_admin, client_user) → /app/dashboard
 * - PCT staff cannot access client routes, clients cannot access admin routes
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const sessionCookie = request.cookies.get("pct_demo_session")
  const sessionValue = sessionCookie?.value
  const isLoggedIn = sessionValue && sessionValue.length > 0

  // Parse user role from session if available
  let userRole: string | null = null
  let isPCTStaff = false

  if (sessionValue && sessionValue !== "1") {
    try {
      const decoded = Buffer.from(sessionValue, "base64").toString("utf-8")
      const userData = JSON.parse(decoded)
      userRole = userData.role
      isPCTStaff = userRole === "pct_admin" || userRole === "pct_staff"
    } catch {
      // Invalid session, treat as not logged in
    }
  } else if (sessionValue === "1") {
    // Legacy session - assume PCT admin
    isPCTStaff = true
    userRole = "pct_admin"
  }

  // Protect /app/* routes
  if (pathname.startsWith("/app")) {
    if (!isLoggedIn) {
      const loginUrl = new URL("/login", request.url)
      loginUrl.searchParams.set("next", pathname)
      return NextResponse.redirect(loginUrl)
    }

    // Role-based redirects
    if (isPCTStaff) {
      // PCT staff trying to access client dashboard → redirect to admin overview
      if (pathname === "/app/dashboard") {
        return NextResponse.redirect(new URL("/app/admin/overview", request.url))
      }
      // PCT staff trying to access client routes → redirect to admin overview
      if (
        pathname.startsWith("/app/requests") ||
        pathname.startsWith("/app/invoices") ||
        pathname.startsWith("/app/settings/company") ||
        pathname.startsWith("/app/settings/team")
      ) {
        return NextResponse.redirect(new URL("/app/admin/overview", request.url))
      }
    } else {
      // Client trying to access admin routes → redirect to client dashboard
      if (pathname.startsWith("/app/admin")) {
        return NextResponse.redirect(new URL("/app/dashboard", request.url))
      }
      // Client trying to access demo-tools → redirect to dashboard
      if (pathname.startsWith("/app/demo-tools")) {
        return NextResponse.redirect(new URL("/app/dashboard", request.url))
      }
    }
  }

  // Redirect logged-in users away from login page to appropriate home
  if (pathname === "/login" && isLoggedIn) {
    const redirectUrl = isPCTStaff ? "/app/admin/overview" : "/app/dashboard"
    return NextResponse.redirect(new URL(redirectUrl, request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     * - api routes (handled separately)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
