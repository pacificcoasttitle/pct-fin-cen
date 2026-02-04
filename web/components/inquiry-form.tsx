"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CheckCircle, Loader2, ArrowRight } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface InquiryFormProps {
  variant?: "standalone" | "embedded" | "modal"
  onSuccess?: () => void
}

interface FormData {
  name: string
  email: string
  company: string
  phone: string
  monthlyTransactions: string
  message: string
}

interface FormErrors {
  name?: string
  email?: string
  company?: string
  phone?: string
}

export function InquiryForm({ variant = "standalone", onSuccess }: InquiryFormProps) {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    company: "",
    phone: "",
    monthlyTransactions: "",
    message: "",
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.name.trim() || formData.name.trim().length < 2) {
      newErrors.name = "Please enter your name"
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!formData.email.trim() || !emailRegex.test(formData.email.trim())) {
      newErrors.email = "Please enter a valid email"
    }

    if (!formData.company.trim() || formData.company.trim().length < 2) {
      newErrors.company = "Please enter your company name"
    }

    if (formData.phone.trim()) {
      const phoneRegex = /^[\d\s\-\(\)\+\.]+$/
      if (!phoneRegex.test(formData.phone.trim()) || formData.phone.replace(/\D/g, "").length < 7) {
        newErrors.phone = "Please enter a valid phone number"
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)

    if (!validateForm()) return

    setIsSubmitting(true)

    try {
      const response = await fetch("/api/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          company: formData.company.trim(),
          phone: formData.phone.trim() || null,
          monthly_transactions: formData.monthlyTransactions || null,
          message: formData.message.trim() || null,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to submit")
      }

      setIsSuccess(true)
      onSuccess?.()
    } catch {
      setSubmitError(
        "Something went wrong. Please try again or email us directly at clear@fincenclear.com"
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateField = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  const isFormValid =
    formData.name.trim().length >= 2 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim()) &&
    formData.company.trim().length >= 2

  // Success state
  if (isSuccess) {
    return (
      <div
        className={cn(
          "text-center",
          variant === "standalone" && "py-12",
          variant === "embedded" && "py-8",
          variant === "modal" && "py-6"
        )}
      >
        <div className="w-16 h-16 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-8 h-8 text-teal-600 dark:text-teal-400" />
        </div>
        <h3 className="text-2xl font-bold text-foreground mb-2">
          Thank you, {formData.name.split(" ")[0]}!
        </h3>
        <p className="text-muted-foreground mb-2">
          We&apos;ve received your inquiry and will be in touch within one business day.
        </p>
        <p className="text-sm text-muted-foreground mb-6">
          Keep an eye on <span className="font-medium text-foreground">{formData.email}</span> for
          our response.
        </p>
        <p className="text-sm text-muted-foreground mb-6">
          In the meantime, feel free to explore our platform demo.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild className="bg-teal-600 hover:bg-teal-700">
            <Link href="/login">
              Try the Demo
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/">Back to Home</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        variant === "standalone" && "bg-card rounded-2xl border border-border p-8 shadow-sm",
        variant === "embedded" && "",
        variant === "modal" && "p-2"
      )}
    >
      {/* Header */}
      <div className="text-center mb-8">
        <h3
          className={cn(
            "font-bold text-foreground",
            variant === "modal" ? "text-xl" : "text-2xl"
          )}
        >
          Let&apos;s Get You Started
        </h3>
        <p className="text-muted-foreground mt-2 text-sm">
          Tell us a bit about your company and we&apos;ll reach out within one business day.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="name" className="text-sm font-medium">
            Full Name
          </Label>
          <Input
            id="name"
            type="text"
            placeholder="Your name"
            value={formData.name}
            onChange={(e) => updateField("name", e.target.value)}
            className={cn(errors.name && "border-amber-500 focus-visible:ring-amber-500")}
          />
          {errors.name && <p className="text-xs text-amber-600">{errors.name}</p>}
        </div>

        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="you@yourcompany.com"
            value={formData.email}
            onChange={(e) => updateField("email", e.target.value)}
            className={cn(errors.email && "border-amber-500 focus-visible:ring-amber-500")}
          />
          {errors.email && <p className="text-xs text-amber-600">{errors.email}</p>}
        </div>

        {/* Company */}
        <div className="space-y-2">
          <Label htmlFor="company" className="text-sm font-medium">
            Company Name
          </Label>
          <Input
            id="company"
            type="text"
            placeholder="Your title company"
            value={formData.company}
            onChange={(e) => updateField("company", e.target.value)}
            className={cn(errors.company && "border-amber-500 focus-visible:ring-amber-500")}
          />
          {errors.company && <p className="text-xs text-amber-600">{errors.company}</p>}
        </div>

        {/* Phone */}
        <div className="space-y-2">
          <Label htmlFor="phone" className="text-sm font-medium">
            Phone <span className="text-muted-foreground font-normal text-xs">(Optional)</span>
          </Label>
          <Input
            id="phone"
            type="tel"
            placeholder="(555) 555-5555"
            value={formData.phone}
            onChange={(e) => updateField("phone", e.target.value)}
            className={cn(errors.phone && "border-amber-500 focus-visible:ring-amber-500")}
          />
          {errors.phone && <p className="text-xs text-amber-600">{errors.phone}</p>}
        </div>

        {/* Monthly Transactions */}
        <div className="space-y-2">
          <Label htmlFor="volume" className="text-sm font-medium">
            Estimated Monthly Transactions{" "}
            <span className="text-muted-foreground font-normal text-xs">
              (Optional — helps us recommend the right plan)
            </span>
          </Label>
          <Select
            value={formData.monthlyTransactions}
            onValueChange={(value) => updateField("monthlyTransactions", value)}
          >
            <SelectTrigger id="volume">
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1-10">1–10 transactions</SelectItem>
              <SelectItem value="11-50">11–50 transactions</SelectItem>
              <SelectItem value="51-100">51–100 transactions</SelectItem>
              <SelectItem value="100+">100+ transactions</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Message */}
        <div className="space-y-2">
          <Label htmlFor="message" className="text-sm font-medium">
            Message <span className="text-muted-foreground font-normal text-xs">(Optional)</span>
          </Label>
          <Textarea
            id="message"
            placeholder="Tell us about your compliance needs or any questions you have..."
            rows={3}
            value={formData.message}
            onChange={(e) => updateField("message", e.target.value)}
          />
        </div>

        {/* Error message */}
        {submitError && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-600 dark:text-red-400">{submitError}</p>
          </div>
        )}

        {/* Submit button */}
        <Button
          type="submit"
          className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold h-11"
          disabled={!isFormValid || isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            "Send Inquiry"
          )}
        </Button>
      </form>

      {/* Footer text */}
      <div className="mt-6 text-center space-y-1">
        <p className="text-xs text-muted-foreground">
          Or email us directly at{" "}
          <a
            href="mailto:clear@fincenclear.com"
            className="text-teal-600 hover:text-teal-700 font-medium"
          >
            clear@fincenclear.com
          </a>
        </p>
        <p className="text-xs text-muted-foreground">
          We typically respond within one business day.
        </p>
      </div>
    </div>
  )
}
