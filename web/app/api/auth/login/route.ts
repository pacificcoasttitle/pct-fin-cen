import { NextRequest, NextResponse } from "next/server"

/**
 * Demo login endpoint.
 * 
 * Validates credentials against environment variables:
 * - DEMO_LOGIN_EMAIL (server-side) or NEXT_PUBLIC_DEMO_LOGIN_EMAIL (fallback)
 * - DEMO_LOGIN_PASSWORD (server-side) or NEXT_PUBLIC_DEMO_LOGIN_PASSWORD (fallback)
 * 
 * On success, sets httpOnly cookie for session.
 */
export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    // Get credentials from server-side env vars (preferred) or public fallback
    const validEmail = process.env.DEMO_LOGIN_EMAIL || process.env.NEXT_PUBLIC_DEMO_LOGIN_EMAIL
    const validPassword = process.env.DEMO_LOGIN_PASSWORD || process.env.NEXT_PUBLIC_DEMO_LOGIN_PASSWORD

    // Check if demo login is configured
    if (!validEmail || !validPassword) {
      return NextResponse.json(
        { ok: false, message: "Demo login not configured" },
        { status: 500 }
      )
    }

    // Validate credentials
    if (email === validEmail && password === validPassword) {
      const response = NextResponse.json({ ok: true })

      // Determine if we're in production/staging (secure cookies)
      const isProduction = process.env.NODE_ENV === "production"

      // Set session cookie
      response.cookies.set("pct_demo_session", "1", {
        httpOnly: true,
        sameSite: "lax",
        secure: isProduction,
        path: "/",
        maxAge: 60 * 60 * 8, // 8 hours
      })

      return response
    }

    return NextResponse.json(
      { ok: false, message: "Invalid email or password" },
      { status: 401 }
    )
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid request" },
      { status: 400 }
    )
  }
}
