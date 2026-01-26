"use client"

import { useParams } from "next/navigation"
import { redirect } from "next/navigation"
import { useEffect } from "react"

export default function WizardRedirect() {
  const params = useParams()
  const id = params.id as string
  
  useEffect(() => {
    // Client-side redirect for dynamic routes
    window.location.href = `/app/reports/${id}/wizard`
  }, [id])
  
  return null
}
