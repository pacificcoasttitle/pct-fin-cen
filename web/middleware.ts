import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

/**
 * Middleware to protect /app/* routes with demo session cookie.
 * 
 * Rules:
 * - /app/* requires pct_demo_session cookie
 * - /login redirects to /app/dashboard if already logged in
 * - /p/* is public (party portal)
 * - / and marketing routes are public
 * - /api/* is not affected
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const sessionCookie = request.cookies.get("pct_demo_session")
  const isLoggedIn = sessionCookie?.value === "1"

  // Protect /app/* routes
  if (pathname.startsWith("/app")) {
    if (!isLoggedIn) {
      const loginUrl = new URL("/login", request.url)
      loginUrl.searchParams.set("next", pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  // Redirect logged-in users away from login page
  if (pathname === "/login" && isLoggedIn) {
    return NextResponse.redirect(new URL("/app/dashboard", request.url))
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
