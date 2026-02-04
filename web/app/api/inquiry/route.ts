import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Validate required fields
    const { name, email, company } = body
    if (!name || !email || !company) {
      return NextResponse.json(
        { error: "Name, email, and company are required" },
        { status: 400 }
      )
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Please provide a valid email address" },
        { status: 400 }
      )
    }

    // Forward to backend
    const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL
    
    if (API_URL) {
      try {
        const response = await fetch(`${API_URL}/inquiries`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })

        if (!response.ok) {
          console.error("Backend inquiry error:", response.status)
          // Fallback: still return success to user, log for manual follow-up
          // We don't want a backend glitch to lose a lead
        }
      } catch (backendError) {
        console.error("Backend inquiry error:", backendError)
        // Don't fail the request - we still want to acknowledge the user
      }
    } else {
      // No backend URL configured - log the inquiry for manual follow-up
      console.log("INQUIRY RECEIVED (no backend):", {
        name,
        email,
        company,
        phone: body.phone,
        monthly_transactions: body.monthly_transactions,
        message: body.message,
        timestamp: new Date().toISOString(),
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Inquiry submission error:", error)
    return NextResponse.json(
      { error: "Failed to submit inquiry" },
      { status: 500 }
    )
  }
}
