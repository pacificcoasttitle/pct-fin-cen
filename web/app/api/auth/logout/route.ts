import { NextResponse } from "next/server"

/**
 * Logout endpoint.
 * Clears the demo session cookie.
 */
export async function POST() {
  const response = NextResponse.json({ ok: true })

  // Clear the session cookie by setting maxAge to 0
  response.cookies.set("pct_demo_session", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  })

  return response
}

// Also support GET for simple redirects
export async function GET() {
  const response = NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"))

  response.cookies.set("pct_demo_session", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  })

  return response
}
