"use client"

import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, Loader2, Shield, Building2, User, Users, UserCog } from "lucide-react"
import { cn } from "@/lib/utils"

// Demo credentials for quick access
const demoCredentials = [
  { 
    role: "PCT Admin", 
    email: "admin@pctfincen.com", 
    description: "Full admin access",
    icon: UserCog,
    color: "from-purple-500 to-indigo-500",
    bgColor: "bg-purple-500/10 border-purple-500/30 hover:border-purple-500/50",
  },
  { 
    role: "PCT Staff", 
    email: "staff@pctfincen.com", 
    description: "Process requests & filings",
    icon: Users,
    color: "from-blue-500 to-cyan-500",
    bgColor: "bg-blue-500/10 border-blue-500/30 hover:border-blue-500/50",
  },
  { 
    role: "Client Admin", 
    email: "admin@demotitle.com", 
    description: "Submit requests, view company reports",
    icon: Building2,
    color: "from-emerald-500 to-teal-500",
    bgColor: "bg-emerald-500/10 border-emerald-500/30 hover:border-emerald-500/50",
  },
  { 
    role: "Client User", 
    email: "user@demotitle.com", 
    description: "Submit requests, view status",
    icon: User,
    color: "from-amber-500 to-orange-500",
    bgColor: "bg-amber-500/10 border-amber-500/30 hover:border-amber-500/50",
  },
]

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState("")
  const [selectedRole, setSelectedRole] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const nextUrl = searchParams.get("next") || "/app/dashboard"

  const handleSelectCredential = (credential: typeof demoCredentials[0]) => {
    setEmail(credential.email)
    setSelectedRole(credential.role)
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (response.ok && data.ok) {
        router.push(nextUrl)
        router.refresh()
      } else {
        setError(data.message || "Invalid credentials")
      }
    } catch {
      setError("Login failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Login Card */}
      <Card className="border-slate-700 bg-slate-800/50 backdrop-blur">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-white">Sign in to your account</CardTitle>
          <CardDescription className="text-slate-400">
            Select a demo account or enter your email
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Demo Mode Badge */}
          <div className="flex justify-center mb-6">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              Demo Mode
            </span>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-300">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Select a demo account below"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setSelectedRole(null)
                }}
                required
                className="bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-medium"
              disabled={loading || !email}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Demo Accounts Card */}
      <Card className="border-slate-700 bg-slate-800/50 backdrop-blur">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-lg">Demo Accounts</CardTitle>
          <CardDescription className="text-slate-400">
            Click to select an account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {demoCredentials.map((cred) => {
            const Icon = cred.icon
            const isSelected = selectedRole === cred.role
            return (
              <button
                key={cred.email}
                onClick={() => handleSelectCredential(cred)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left",
                  cred.bgColor,
                  isSelected && "ring-2 ring-white/20"
                )}
              >
                <div className={cn(
                  "p-2 rounded-lg bg-gradient-to-br",
                  cred.color
                )}>
                  <Icon className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">{cred.role}</span>
                    {isSelected && (
                      <span className="text-xs bg-white/20 text-white px-1.5 py-0.5 rounded">
                        Selected
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-400 truncate">{cred.email}</p>
                  <p className="text-xs text-slate-500">{cred.description}</p>
                </div>
              </button>
            )
          })}
        </CardContent>
      </Card>

      <p className="text-center text-xs text-slate-500">
        This is a demo environment. Data may be reset periodically.
      </p>
    </div>
  )
}

function LoginFormFallback() {
  return (
    <Card className="border-slate-700 bg-slate-800/50 backdrop-blur">
      <CardContent className="py-12">
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      </CardContent>
    </Card>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-2xl mb-4">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">PCT FinCEN Solutions</h1>
          <p className="text-slate-400 mt-1">Compliance made simple</p>
        </div>

        <Suspense fallback={<LoginFormFallback />}>
          <LoginForm />
        </Suspense>

        <p className="mt-6 text-center text-xs text-slate-500">
          © 2026 Pacific Coast Title. All rights reserved.
        </p>
      </div>
    </div>
  )
}
