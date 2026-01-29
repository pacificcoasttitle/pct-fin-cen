/**
 * Validation Utilities for Party Portal Forms
 * FinCEN-compliant validation rules
 */

import { BeneficialOwnerData, PaymentSourceData } from "./types"

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

// =============================================================================
// EIN / SSN Validation
// =============================================================================

/**
 * Validate EIN format: XX-XXXXXXX (9 digits)
 */
export const validateEIN = (ein: string): boolean => {
  const cleaned = ein.replace(/-/g, "")
  return /^\d{9}$/.test(cleaned)
}

/**
 * Validate SSN format and basic rules
 */
export const validateSSN = (ssn: string): boolean => {
  const cleaned = ssn.replace(/-/g, "")
  if (!/^\d{9}$/.test(cleaned)) return false

  // Area number can't be 000, 666, or 900-999
  const area = parseInt(cleaned.substring(0, 3))
  if (area === 0 || area === 666 || area >= 900) return false

  // Group number can't be 00
  const group = parseInt(cleaned.substring(3, 5))
  if (group === 0) return false

  // Serial number can't be 0000
  const serial = parseInt(cleaned.substring(5, 9))
  if (serial === 0) return false

  return true
}

/**
 * Format EIN as user types: XX-XXXXXXX
 */
export const formatEIN = (ein: string): string => {
  const cleaned = ein.replace(/\D/g, "")
  if (cleaned.length <= 2) return cleaned
  return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 9)}`
}

/**
 * Format SSN as user types: XXX-XX-XXXX
 */
export const formatSSN = (ssn: string): string => {
  const cleaned = ssn.replace(/\D/g, "")
  if (cleaned.length <= 3) return cleaned
  if (cleaned.length <= 5) return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`
  return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 5)}-${cleaned.slice(5, 9)}`
}

/**
 * Mask SSN for display: ***-**-1234
 */
export const maskSSN = (ssn: string): string => {
  const cleaned = ssn.replace(/\D/g, "")
  if (cleaned.length < 4) return "***-**-****"
  return `***-**-${cleaned.slice(-4)}`
}

/**
 * Mask EIN for display: **-***1234
 */
export const maskEIN = (ein: string): string => {
  const cleaned = ein.replace(/\D/g, "")
  if (cleaned.length < 4) return "**-*******"
  return `**-***${cleaned.slice(-4)}`
}

// =============================================================================
// Beneficial Owner Validation (Buyer Forms Only)
// =============================================================================

export const validateBeneficialOwners = (
  owners: BeneficialOwnerData[]
): ValidationResult => {
  const errors: string[] = []
  const warnings: string[] = []

  // Rule 1: At least one BO required
  if (owners.length === 0) {
    errors.push("At least one beneficial owner is required")
    return { valid: false, errors, warnings }
  }

  // Rule 2: Check ownership percentages
  const totalOwnership = owners.reduce(
    (sum, bo) => sum + (bo.ownership_percentage || 0),
    0
  )

  if (totalOwnership > 100) {
    errors.push("Total ownership percentage cannot exceed 100%")
  }

  if (totalOwnership > 0 && totalOwnership < 75) {
    warnings.push(
      `Only ${totalOwnership}% ownership listed. Ensure all owners with 25%+ are included.`
    )
  }

  // Rule 3: Validate each BO
  owners.forEach((bo, index) => {
    const boNum = index + 1

    // Required fields
    if (!bo.first_name?.trim()) {
      errors.push(`Beneficial Owner ${boNum}: First name is required`)
    }
    if (!bo.last_name?.trim()) {
      errors.push(`Beneficial Owner ${boNum}: Last name is required`)
    }
    if (!bo.date_of_birth) {
      errors.push(`Beneficial Owner ${boNum}: Date of birth is required`)
    }
    if (!bo.id_number?.trim()) {
      errors.push(`Beneficial Owner ${boNum}: ID number is required`)
    }

    // DOB validation
    if (bo.date_of_birth) {
      const dob = new Date(bo.date_of_birth)
      const today = new Date()

      if (dob >= today) {
        errors.push(`Beneficial Owner ${boNum}: Date of birth must be in the past`)
      }

      const age = Math.floor(
        (today.getTime() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
      )
      if (age < 18) {
        warnings.push(`Beneficial Owner ${boNum}: Owner appears to be under 18`)
      }
      if (age > 120) {
        errors.push(`Beneficial Owner ${boNum}: Date of birth seems incorrect`)
      }
    }

    // SSN format validation
    if (bo.id_type === "ssn" && bo.id_number) {
      if (!validateSSN(bo.id_number)) {
        errors.push(`Beneficial Owner ${boNum}: Invalid SSN format`)
      }
    }

    // Ownership percentage
    if (bo.ownership_percentage !== undefined) {
      if (bo.ownership_percentage < 0 || bo.ownership_percentage > 100) {
        errors.push(
          `Beneficial Owner ${boNum}: Ownership percentage must be between 0 and 100`
        )
      }
    }

    // Address validation
    if (bo.address) {
      if (!bo.address.street?.trim()) {
        errors.push(`Beneficial Owner ${boNum}: Street address is required`)
      }
      if (!bo.address.city?.trim()) {
        errors.push(`Beneficial Owner ${boNum}: City is required`)
      }
      if (!bo.address.state?.trim()) {
        errors.push(`Beneficial Owner ${boNum}: State is required`)
      }
      if (!bo.address.zip?.trim()) {
        errors.push(`Beneficial Owner ${boNum}: ZIP code is required`)
      }
    }
  })

  return { valid: errors.length === 0, errors, warnings }
}

// =============================================================================
// Payment Source Validation (Buyer Forms Only)
// =============================================================================

export const validatePaymentSources = (
  sources: PaymentSourceData[],
  purchasePrice: number // in cents
): ValidationResult => {
  const errors: string[] = []
  const warnings: string[] = []

  // Convert purchase price from cents to dollars
  const purchasePriceDollars = purchasePrice / 100

  // Rule 1: At least one payment source required
  if (sources.length === 0) {
    errors.push("At least one payment source is required")
    return { valid: false, errors, warnings }
  }

  // Rule 2: Total should approximately match purchase price
  const totalAmount = sources.reduce((sum, src) => sum + (src.amount || 0), 0)
  
  if (purchasePriceDollars > 0) {
    const difference = Math.abs(totalAmount - purchasePriceDollars)
    const differencePercent = (difference / purchasePriceDollars) * 100

    if (differencePercent > 10) {
      errors.push(
        `Payment sources total ($${totalAmount.toLocaleString()}) differs significantly from purchase price ($${purchasePriceDollars.toLocaleString()})`
      )
    } else if (differencePercent > 2) {
      warnings.push(
        `Payment sources total ($${totalAmount.toLocaleString()}) differs from purchase price ($${purchasePriceDollars.toLocaleString()})`
      )
    }
  }

  // Rule 3: Validate each payment source
  sources.forEach((source, index) => {
    const srcNum = index + 1

    // Amount required
    if (!source.amount || source.amount <= 0) {
      errors.push(`Payment Source ${srcNum}: Amount is required and must be positive`)
    }

    // Source type required
    if (!source.source_type) {
      errors.push(`Payment Source ${srcNum}: Source type is required`)
    }

    // Payment method required
    if (!source.payment_method) {
      errors.push(`Payment Source ${srcNum}: Payment method is required`)
    }

    // Wire transfers need bank info
    if (source.payment_method === "wire" && !source.institution_name?.trim()) {
      warnings.push(
        `Payment Source ${srcNum}: Bank/institution name recommended for wire transfers`
      )
    }

    // Third party payments need details
    if (source.is_third_party) {
      if (!source.third_party_name?.trim()) {
        errors.push(`Payment Source ${srcNum}: Third party name is required`)
      }
    }

    // Large cash amounts (over $10,000) get flagged
    if (
      source.amount &&
      source.amount >= 10000 &&
      (source.payment_method === "cashiers_check" ||
        source.payment_method === "money_order" ||
        source.payment_method === "other")
    ) {
      warnings.push(
        `Payment Source ${srcNum}: Large amount via ${source.payment_method.replace(/_/g, " ")} may require additional documentation`
      )
    }
  })

  return { valid: errors.length === 0, errors, warnings }
}

// =============================================================================
// Trust Date Validation
// =============================================================================

export const validateTrustDate = (
  trustDate: string,
  closingDate?: string
): ValidationResult => {
  const errors: string[] = []
  const warnings: string[] = []

  if (!trustDate) {
    errors.push("Trust execution date is required")
    return { valid: false, errors, warnings }
  }

  const executed = new Date(trustDate)
  const today = new Date()

  // Must be in the past
  if (executed >= today) {
    errors.push("Trust execution date must be in the past")
  }

  // Must be before closing date
  if (closingDate) {
    const closing = new Date(closingDate)
    if (executed >= closing) {
      errors.push("Trust must have been executed before the closing date")
    }
  }

  // Warning if very recent (potential red flag)
  const daysSinceExecution = Math.floor(
    (today.getTime() - executed.getTime()) / (24 * 60 * 60 * 1000)
  )
  if (daysSinceExecution < 30 && daysSinceExecution >= 0) {
    warnings.push("This trust was created recently (less than 30 days ago)")
  }

  // Warning if very old without recent amendments
  const yearsSinceExecution = daysSinceExecution / 365
  if (yearsSinceExecution > 50) {
    warnings.push(
      "This trust is over 50 years old. Please confirm trust is still active."
    )
  }

  return { valid: errors.length === 0, errors, warnings }
}

// =============================================================================
// Entity Form Validation
// =============================================================================

export const validateEntityForm = (data: {
  entity_name?: string
  entity_type?: string
  ein?: string
  formation_state?: string
  first_name?: string
  last_name?: string
  date_of_birth?: string
  id_type?: string
  id_number?: string
  address?: { street?: string; city?: string; state?: string; zip?: string }
}): ValidationResult => {
  const errors: string[] = []
  const warnings: string[] = []

  // Entity info
  if (!data.entity_name?.trim()) {
    errors.push("Entity legal name is required")
  }
  if (!data.entity_type) {
    errors.push("Entity type is required")
  }
  if (!data.ein?.trim()) {
    errors.push("Tax ID (EIN) is required")
  } else if (!validateEIN(data.ein)) {
    errors.push("Invalid EIN format (should be XX-XXXXXXX)")
  }
  if (!data.formation_state) {
    errors.push("State of formation is required")
  }

  // Signing individual
  if (!data.first_name?.trim()) {
    errors.push("Signing individual first name is required")
  }
  if (!data.last_name?.trim()) {
    errors.push("Signing individual last name is required")
  }
  if (!data.date_of_birth) {
    errors.push("Signing individual date of birth is required")
  }
  if (!data.id_type) {
    errors.push("Signing individual ID type is required")
  }
  if (!data.id_number?.trim()) {
    errors.push("Signing individual ID number is required")
  } else if (data.id_type === "ssn" && !validateSSN(data.id_number)) {
    errors.push("Invalid SSN format")
  }

  // Address
  if (!data.address?.street?.trim()) {
    errors.push("Business address street is required")
  }
  if (!data.address?.city?.trim()) {
    errors.push("Business address city is required")
  }
  if (!data.address?.state?.trim()) {
    errors.push("Business address state is required")
  }
  if (!data.address?.zip?.trim()) {
    errors.push("Business address ZIP is required")
  }

  return { valid: errors.length === 0, errors, warnings }
}

// =============================================================================
// Individual Form Validation
// =============================================================================

export const validateIndividualForm = (data: {
  first_name?: string
  last_name?: string
  date_of_birth?: string
  id_type?: string
  id_number?: string
  address?: { street?: string; city?: string; state?: string; zip?: string }
}): ValidationResult => {
  const errors: string[] = []
  const warnings: string[] = []

  if (!data.first_name?.trim()) {
    errors.push("First name is required")
  }
  if (!data.last_name?.trim()) {
    errors.push("Last name is required")
  }
  if (!data.date_of_birth) {
    errors.push("Date of birth is required")
  } else {
    const dob = new Date(data.date_of_birth)
    const today = new Date()
    const age = Math.floor(
      (today.getTime() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
    )
    if (age < 18) {
      warnings.push("Individual appears to be under 18")
    }
    if (age > 120) {
      errors.push("Date of birth seems incorrect")
    }
  }
  if (!data.id_type) {
    errors.push("ID type is required")
  }
  if (!data.id_number?.trim()) {
    errors.push("ID number is required")
  } else if (data.id_type === "ssn" && !validateSSN(data.id_number)) {
    errors.push("Invalid SSN format")
  }

  // Address
  if (!data.address?.street?.trim()) {
    errors.push("Street address is required")
  }
  if (!data.address?.city?.trim()) {
    errors.push("City is required")
  }
  if (!data.address?.state?.trim()) {
    errors.push("State is required")
  }
  if (!data.address?.zip?.trim()) {
    errors.push("ZIP code is required")
  }

  return { valid: errors.length === 0, errors, warnings }
}

// =============================================================================
// Trustee Validation
// =============================================================================

export const validateTrustees = (
  trustees: Array<{
    type: "individual" | "entity"
    full_name?: string
    ssn?: string
    entity_name?: string
    ein?: string
  }>
): ValidationResult => {
  const errors: string[] = []
  const warnings: string[] = []

  if (trustees.length === 0) {
    errors.push("At least one trustee is required")
    return { valid: false, errors, warnings }
  }

  trustees.forEach((trustee, index) => {
    const num = index + 1

    if (trustee.type === "individual") {
      if (!trustee.full_name?.trim()) {
        errors.push(`Trustee ${num}: Name is required`)
      }
    } else {
      if (!trustee.entity_name?.trim()) {
        errors.push(`Trustee ${num}: Entity name is required`)
      }
    }
  })

  return { valid: errors.length === 0, errors, warnings }
}
