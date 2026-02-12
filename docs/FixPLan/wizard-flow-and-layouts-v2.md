Wizard Flow Fix + Step Layout Improvements

FIVE ITEMS:

====================================================================
ITEM 1: Property Type Step - 2 Column Card Layout
====================================================================

Diagnose:
  grep -rn "PropertyType\|property.*type\|propertyType\|isResidential" web/components/wizard/determination/ | head -10

Apply the same 2-column card layout pattern used on the Transfer Type step:
- Options in grid grid-cols-2 gap-3
- Each option is a bordered card: border rounded-lg p-3 cursor-pointer hover:bg-muted/50
- Selected state: border-primary bg-primary/5

====================================================================
ITEM 2: Financing Step - 2 Column Card Layout
====================================================================

Diagnose:
  grep -rn "Financing\|financing\|lender\|AML\|aml" web/components/wizard/determination/ | head -10

Same 2-column card layout pattern. Apply consistently.

====================================================================
ITEM 3: Entity Exemption Check - 2 Column Card Layout
====================================================================

Diagnose:
  grep -rn "EntityExemption\|entity.*exempt\|exemption.*check" web/components/wizard/determination/ | head -10

Same 2-column card layout pattern as Transfer Type.

====================================================================
ITEM 4: Post-Link-Send Flow - CRITICAL
====================================================================

The wizard flow after sending party links is wrong.

Current broken flow:
  Send Links -> Continue -> Party Status -> Reporting Person -> Submit Filing

Correct flow:
  Send Links -> Confirmation/Done (STOP - wait for parties)

After the user sends party portal links, the wizard should show a confirmation and STOP. The real-world process has a multi-day wait while parties fill out their portals.

Diagnose first:
  grep -n "party-setup\|party-status\|reporting-person\|file-report\|send.*link" web/components/wizard/WizardContainer.tsx | head -20
  grep -n "party-setup\|party-status\|reporting-person\|file-report" web/components/wizard/hooks/useWizardNavigation.ts | head -20

What needs to change:

A) After links are sent successfully, show a completion state:
   - Success message: "Party links have been sent successfully"
   - List of parties with their names, roles, and email addresses
   - Message: "You will be notified when all parties have submitted their information. This typically takes 1-3 business days."
   - A "Back to Requests" button that navigates to /app/requests
   - Do NOT show Continue/Next button after links are sent

B) Remove "file-report" from the visible wizard steps entirely. Filing happens on the Review page (/app/reports/{id}/review) which already has certifications, signature, and the submit button.

C) The wizard collection phase visible steps should be:
   - party-setup (send links, then shows confirmation)
   - party-status (read-only monitoring view - for when user comes back to check progress)
   That is it. No file-report step.

D) The party-status step should be read-only monitoring:
   - Shows each party name, role, submission status
   - Resend link option if needed
   - Message about auto-transition to ready_to_file when all parties complete
   - "Back to Requests" button

====================================================================
ITEM 5: Reporting Person - Auto-Populate, Not Manual Entry
====================================================================

The reporting person IS the logged-in user and their company. They should NOT manually fill out their info in the wizard every time.

Diagnose:
  grep -rn "ReportingPerson\|reporting.*person\|reportingPerson" web/components/wizard/ | head -15
  grep -n "reporting-person" web/components/wizard/hooks/useWizardNavigation.ts | head -5

What needs to change:

A) Remove "reporting-person" as a separate wizard step from the collection phase visible steps in useWizardNavigation.ts. It should not appear in the step list.

B) Instead, auto-populate reportingPerson data in wizard_data.collection when the wizard loads, pulling from the session/user data:
   - The session cookie has user_id, company_id, user name, user email
   - The company record has company name, address, phone

Diagnose the session data available:
  grep -n "session\|cookie\|getSession\|user_id\|company_id\|X-User\|X-Company" web/lib/api.ts | head -15
  grep -n "session\|cookie\|getSession\|user_name\|company_name" web/middleware.ts | head -10

C) On the party-setup step (or at wizard load), silently populate:
   wizard_data.collection.reportingPerson = {
     companyName: from company record,
     contactName: from user profile (full name),
     email: from user profile,
     phone: from company record,
     address: from company record,
     licenseNumber: from company record (if available)
   }

D) If the data is not available from the session (pre-auth), use the demo user data. Look at what the demo seed provides:
  grep -A 10 "Jennifer Walsh\|admin@demotitle\|Pacific Coast" api/app/services/demo_seed.py | head -20

E) Show reporting person info as a read-only review card on the party-setup step BEFORE the party links section. Something like:

   Filing Officer
   +-----------------------------------------+
   | Jennifer Walsh                          |
   | Pacific Coast Title                     |
   | admin@demotitle.com                     |
   | If this is incorrect, update your       |
   | profile in Settings.                    |
   +-----------------------------------------+

This is informational only - not editable in the wizard.

====================================================================
DO NOT
====================================================================

- Do not change determination step logic or options
- Do not change wizard_data structure schema (reportingPerson fields stay the same)
- Do not change the party portal or party submission endpoints
- Do not change the review page (/review with certifications + signature)
- Do not change the filing endpoint or lifecycle
- Do not remove the party-setup step - just change what happens AFTER links are sent
- Do not remove auto-save functionality
- Do not create new API endpoints for user/company data - use what is in the session
