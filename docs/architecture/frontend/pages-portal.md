# Party Portal Pages

> Public token-based pages for party data collection.

## Overview

The party portal allows transaction parties (buyers, sellers, beneficial owners) to submit their information without requiring a user account. Access is controlled via secure URL tokens.

## Party Portal

**File:** `web/app/p/[token]/page.tsx` (513 lines)

### URL Format

```
https://app.example.com/p/{token}
```

Where `token` is a 64-character secure token like:
```
abc123def456...xyz789
```

### Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    PARTY PORTAL FLOW                         │
│                                                              │
│  1. Party receives email with link                          │
│  2. Opens /p/{token}                                        │
│  3. Token validated via GET /party/{token}                  │
│  4. Form pre-filled with any existing data                  │
│  5. Party fills information                                  │
│  6. Auto-save on changes (POST /party/{token}/save)         │
│  7. Submit (POST /party/{token}/submit)                     │
│  8. Confirmation page shown                                  │
└─────────────────────────────────────────────────────────────┘
```

---

## Page States

### Loading

```tsx
if (loading) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto" />
        <p className="mt-4 text-muted-foreground">Loading your form...</p>
      </div>
    </div>
  )
}
```

### Error (Invalid Token)

```tsx
if (error) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="max-w-md">
        <CardHeader>
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto" />
          <CardTitle>Link Not Found</CardTitle>
        </CardHeader>
        <CardContent>
          <p>This link may have expired or already been used.</p>
          <p>Please contact your title company for a new link.</p>
        </CardContent>
      </Card>
    </div>
  )
}
```

### Already Submitted

```tsx
if (partyData.is_submitted) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="max-w-md">
        <CardHeader>
          <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
          <CardTitle>Already Submitted</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Your information has already been submitted.</p>
          <p>Confirmation ID: {confirmationId}</p>
        </CardContent>
      </Card>
    </div>
  )
}
```

### Form

```tsx
return (
  <div className="min-h-screen bg-slate-50 py-8">
    <div className="max-w-3xl mx-auto px-4">
      {/* Header */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Submit Your Information</CardTitle>
          <CardDescription>
            For the transaction at: {reportSummary.property_address}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Form */}
      <Card>
        <CardContent className="pt-6">
          <Form />
        </CardContent>
      </Card>
    </div>
  </div>
)
```

---

## Form Sections

### Individual Party

| Section | Fields |
|---------|--------|
| Name | First, middle, last, suffix |
| Identification | SSN, DOB, citizenship |
| Address | Street, city, state, zip |
| Contact | Phone, email |

### Entity Party

| Section | Fields |
|---------|--------|
| Entity Info | Legal name, type, EIN |
| Formation | State, date |
| Address | Principal business address |
| Beneficial Owners | List of individuals (25%+) |

### Trust Party

| Section | Fields |
|---------|--------|
| Trust Info | Name, type, TIN |
| Formation | Date, state |
| Trustees | List of trustees |
| Settlors | Grantors/settlors |
| Beneficiaries | Trust beneficiaries |

---

## Data Flow

### Initial Load

```typescript
useEffect(() => {
  const fetchParty = async () => {
    try {
      const data = await getParty(token)
      setPartyData(data)
      setFormData(data.party_data || {})
    } catch (err) {
      setError('Link not found or expired')
    }
  }
  fetchParty()
}, [token])
```

### Auto-Save

```typescript
// Debounced save
const debouncedSave = useMemo(
  () => debounce(async (data) => {
    await saveParty(token, data)
  }, 1500),
  [token]
)

// Trigger on form changes
useEffect(() => {
  if (isDirty) {
    debouncedSave(formData)
  }
}, [formData, isDirty])
```

### Submit

```typescript
const handleSubmit = async () => {
  setSubmitting(true)
  try {
    const result = await submitParty(token)
    setConfirmationId(result.confirmation_id)
    setIsSubmitted(true)
  } catch (err) {
    setError(err.message)
  } finally {
    setSubmitting(false)
  }
}
```

---

## Confirmation Page

After successful submission:

```tsx
<div className="text-center">
  <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />

  <h1 className="text-2xl font-bold mb-2">
    Thank You!
  </h1>

  <p className="text-muted-foreground mb-4">
    Your information has been submitted successfully.
  </p>

  <Card className="inline-block">
    <CardContent className="pt-4">
      <p className="text-sm text-muted-foreground">Confirmation ID</p>
      <p className="text-lg font-mono font-bold">
        {confirmationId}
      </p>
    </CardContent>
  </Card>

  <p className="mt-6 text-sm text-muted-foreground">
    You may close this window. If you need to make changes,
    please contact your title company.
  </p>
</div>
```

---

## Validation

### Required Fields

| Party Type | Required Fields |
|------------|-----------------|
| Individual | Name, SSN (last 4), DOB |
| Entity | Legal name, EIN, type |
| Trust | Trust name, TIN |

### Field Validation

```typescript
const validateSSN = (value: string) => {
  return /^\d{4}$/.test(value) // Last 4 only
}

const validateEIN = (value: string) => {
  return /^\d{2}-\d{7}$/.test(value)
}

const validateEmail = (value: string) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}
```

---

## Error Handling

### Token Errors

| Error | Display |
|-------|---------|
| 404 | "Link not found or expired" |
| Token used | "Already submitted" with confirmation |
| Token expired | "Link expired" |

### Save Errors

```typescript
// Silent retry for save errors
try {
  await saveParty(token, data)
} catch (err) {
  console.error('Auto-save failed:', err)
  // Don't show error - will retry
}
```

### Submit Errors

```typescript
try {
  await submitParty(token)
} catch (err) {
  toast.error('Failed to submit. Please try again.')
  // Keep form data for retry
}
```

---

## Security Considerations

### Token Security

- 64-character cryptographic random token
- Cannot be guessed or enumerated
- One-time use (status changes to `used`)
- Configurable expiration (default: 14 days)

### No Authentication

- Token IS the authentication
- No cookies or sessions
- No user accounts required
- Link can be shared (but discouraged)

### Data Protection

- HTTPS required
- Sensitive fields masked in URL (SSN, TIN)
- No sensitive data in URL parameters

---

## Mobile Support

```tsx
// Responsive layout
<div className="max-w-3xl mx-auto px-4 sm:px-6">

// Mobile-first form
<div className="space-y-4 sm:space-y-6">
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
    {/* Form fields */}
  </div>
</div>
```

---

## API Functions Used

```typescript
// From lib/api.ts
getParty(token)      // GET /party/{token}
saveParty(token, data)  // POST /party/{token}/save
submitParty(token)   // POST /party/{token}/submit
```

---

## Related Files

- **Backend Routes:** `api/app/routes/parties.py`
- **Model:** `api/app/models/party_link.py`
- **Types:** `web/lib/rrer-types.ts`
