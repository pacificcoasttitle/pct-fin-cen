import { NextRequest, NextResponse } from "next/server"

/**
 * Demo login endpoint.
 * 
 * Calls the backend to get REAL user data from the database.
 * Stores real UUIDs in the session cookie.
 * 
 * Demo accounts (defined in backend demo_seed.py):
 * - coo@pct.com → COO (executive dashboard only)
 * - admin@pctfincen.com → PCT Admin (internal operations)
 * - staff@pctfincen.com → PCT Staff (assigned work)
 * - admin@demotitle.com → Client Admin (company data + billing + team)
 * - user@demotitle.com → Client User (basic tracking)
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://pct-fin-cen-staging.onrender.com"

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    // Normalize email
    const normalizedEmail = email?.toLowerCase().trim()

    if (!normalizedEmail) {
      return NextResponse.json(
        { ok: false, message: "Email is required" },
        { status: 400 }
      )
    }

    // Call backend to get REAL user data from database
    const backendResponse = await fetch(`${API_BASE_URL}/auth/demo-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: normalizedEmail }),
    })

    if (!backendResponse.ok) {
      const errorData = await backendResponse.json().catch(() => ({}))
      const errorMessage = errorData.detail || "User not found"
      console.error("Demo login failed:", errorMessage)
      return NextResponse.json(
        { ok: false, message: errorMessage },
        { status: 401 }
      )
    }

    const userData = await backendResponse.json()

    // Build response with real user data from backend
    const response = NextResponse.json({ 
      ok: true,
      user: {
        id: userData.user_id,           // REAL UUID from database
        email: userData.email,
        name: userData.name,
        role: userData.role,
        companyId: userData.company_id, // REAL UUID from database (or null)
        companyName: userData.company_name,
      }
    })

    // Determine if we're in production/staging (secure cookies)
    const isProduction = process.env.NODE_ENV === "production"

    // Encode REAL user data for cookie (base64)
    const sessionData = Buffer.from(JSON.stringify({
      id: userData.user_id,             // REAL UUID
      email: userData.email,
      name: userData.name,
      role: userData.role,
      companyId: userData.company_id,   // REAL UUID (or null)
      companyName: userData.company_name || "",
    })).toString("base64")

    // Set session cookie with REAL user data
    // Note: httpOnly is false so client-side JS can read user info for sidebar
    // This is acceptable for demo purposes - production should use server components
    response.cookies.set("pct_demo_session", sessionData, {
      httpOnly: false,
      sameSite: "lax",
      secure: isProduction,
      path: "/",
      maxAge: 60 * 60 * 8, // 8 hours
    })

    return response
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json(
      { ok: false, message: "Login failed. Please try again." },
      { status: 500 }
    )
  }
}
