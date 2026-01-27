import { NextRequest, NextResponse } from "next/server"

/**
 * Demo login endpoint.
 * 
 * For the demo, we accept specific demo email addresses without password.
 * Each email maps to a specific role and company.
 * 
 * Demo accounts:
 * - coo@pct.com → COO (executive dashboard only)
 * - admin@pctfincen.com → PCT Admin (internal operations)
 * - staff@pctfincen.com → PCT Staff (assigned work)
 * - admin@demotitle.com → Client Admin (company data + billing + team)
 * - user@demotitle.com → Client User (basic tracking)
 */

interface DemoUser {
  id: string
  email: string
  name: string
  role: "coo" | "pct_admin" | "pct_staff" | "client_admin" | "client_user"
  companyId: string | null
  companyName: string
}

// Demo users configuration
const DEMO_USERS: Record<string, DemoUser> = {
  "coo@pct.com": {
    id: "demo-coo",
    email: "coo@pct.com",
    name: "Patricia Chen",
    role: "coo",
    companyId: null,
    companyName: "PCT FinCEN Solutions",
  },
  "admin@pctfincen.com": {
    id: "demo-pct-admin",
    email: "admin@pctfincen.com",
    name: "Sarah Mitchell",
    role: "pct_admin",
    companyId: null,
    companyName: "PCT FinCEN Solutions",
  },
  "staff@pctfincen.com": {
    id: "demo-pct-staff",
    email: "staff@pctfincen.com",
    name: "Emily Chen",
    role: "pct_staff",
    companyId: null,
    companyName: "PCT FinCEN Solutions",
  },
  "admin@demotitle.com": {
    id: "demo-client-admin",
    email: "admin@demotitle.com",
    name: "Mike Thompson",
    role: "client_admin",
    companyId: "demo-client-company",
    companyName: "Demo Title & Escrow",
  },
  "user@demotitle.com": {
    id: "demo-client-user",
    email: "user@demotitle.com",
    name: "Lisa Garcia",
    role: "client_user",
    companyId: "demo-client-company",
    companyName: "Demo Title & Escrow",
  },
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    // Normalize email
    const normalizedEmail = email?.toLowerCase().trim()

    // Check if this is a valid demo user
    const demoUser = DEMO_USERS[normalizedEmail]

    if (demoUser) {
      const response = NextResponse.json({ 
        ok: true,
        user: {
          id: demoUser.id,
          email: demoUser.email,
          name: demoUser.name,
          role: demoUser.role,
          companyId: demoUser.companyId,
          companyName: demoUser.companyName,
        }
      })

      // Determine if we're in production/staging (secure cookies)
      const isProduction = process.env.NODE_ENV === "production"

      // Encode user data for cookie (simple base64 for demo)
      const sessionData = Buffer.from(JSON.stringify({
        id: demoUser.id,
        email: demoUser.email,
        name: demoUser.name,
        role: demoUser.role,
        companyId: demoUser.companyId,
        companyName: demoUser.companyName,
      })).toString("base64")

      // Set session cookie with user data
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
    }

    // Fallback: Check legacy env var credentials
    const validEmail = process.env.DEMO_LOGIN_EMAIL || process.env.NEXT_PUBLIC_DEMO_LOGIN_EMAIL

    if (validEmail && normalizedEmail === validEmail.toLowerCase()) {
      const response = NextResponse.json({ ok: true })
      const isProduction = process.env.NODE_ENV === "production"

      response.cookies.set("pct_demo_session", "1", {
        httpOnly: false,
        sameSite: "lax",
        secure: isProduction,
        path: "/",
        maxAge: 60 * 60 * 8,
      })

      return response
    }

    return NextResponse.json(
      { ok: false, message: "Invalid email. Use a demo account email." },
      { status: 401 }
    )
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid request" },
      { status: 400 }
    )
  }
}
