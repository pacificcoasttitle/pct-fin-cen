# CURSOR PROMPT: Pre-Implementation Investigation - Entity Enhancements

## 🔍 MISSION: RECONNAISSANCE BEFORE IMPLEMENTATION

**DO NOT IMPLEMENT ANYTHING YET.**

Before we add entity subtypes, indirect ownership, and document upload, we need to understand exactly what exists and where. This prompt is purely investigative.

**Output:** A comprehensive report that makes the actual implementation plug-and-play.

---

## INVESTIGATION TASKS

### TASK 1: Map the Wizard Component Structure

**Find and document:**

1. **Main wizard component file(s)**
   - Search for: `rrer-questionnaire`, `wizard`, `multi-step`, `stepper`
   - Document: File path, component name, how steps are defined

2. **How steps are organized**
   - Are steps separate components or one big file?
   - How does step navigation work?
   - What controls which step is shown?

3. **Current step definitions**
   - List all current steps by number and name
   - Which step handles "Buyer Type" selection?
   - Which step handles "Buyer Entity Information"?
   - Which step handles "Beneficial Owner" collection?

**Output format:**
```
WIZARD STRUCTURE REPORT
=======================
Main file: [path]
Step component pattern: [single file / separate files / etc]
Navigation method: [state variable / URL params / context]

STEPS:
1. [Step name] - [file if separate]
2. [Step name] - [file if separate]
...

BUYER TYPE STEP: Step [#] in [file:line]
ENTITY INFO STEP: Step [#] in [file:line]
BENEFICIAL OWNER STEP: Step [#] in [file:line]
```

---

### TASK 2: Analyze Wizard State Management

**Find and document:**

1. **How wizard data is stored**
   - Is it React state? Context? Zustand? Redux?
   - What's the shape of the wizard data object?
   - Where is the state initialized?

2. **Current buyer/entity fields**
   - List all existing fields for buyer information
   - List all existing fields for beneficial owners
   - What's the data structure for a single BO?

3. **Auto-save mechanism**
   - How does auto-save work?
   - What triggers a save?
   - What endpoint does it call?

**Output format:**
```
STATE MANAGEMENT REPORT
=======================
State solution: [useState / useContext / zustand / etc]
State location: [file:line]

WIZARD DATA SHAPE:
{
  // Document the actual structure you find
  property_address: string,
  buyer_type: string,
  // ... etc
}

BUYER FIELDS (current):
- buyer_type: [location where set]
- buyer_entity_name: [location where set]
- ... 

BENEFICIAL OWNER STRUCTURE:
{
  // Document actual BO fields
}

AUTO-SAVE:
- Trigger: [debounce / onChange / etc]
- Endpoint: [API path]
- Function location: [file:line]
```

---

### TASK 3: Examine Backend Models

**Find and document:**

1. **Report model**
   - File location
   - All columns/fields
   - Where is wizard_data stored? (JSON column? Separate fields?)

2. **Party model** (report_parties)
   - File location
   - All columns/fields
   - How is party_data structured?

3. **Beneficial Owner model** (if separate)
   - File location
   - All columns/fields
   - Relationship to parties/reports

4. **Document model** (if exists)
   - File location
   - All columns/fields
   - Is it implemented or just defined?

**Output format:**
```
BACKEND MODELS REPORT
=====================

REPORT MODEL:
File: [path]
Table name: [name]
Fields:
- id: UUID
- wizard_data: JSONB  <- is this where buyer info goes?
- ...

wizard_data structure (from code or examples):
{
  // Document actual structure
}

PARTY MODEL:
File: [path]
Table name: [name]
Fields:
- id: UUID
- party_type: string
- party_data: JSONB
- ...

party_data structure:
{
  // Document actual structure
}

BENEFICIAL OWNER MODEL:
File: [path] (or "NOT FOUND - embedded in party_data")
...

DOCUMENT MODEL:
File: [path] (or "NOT FOUND")
Status: [implemented / defined but not used / not found]
...
```

---

### TASK 4: Trace the Buyer Type Flow

**Follow the code path:**

1. **When user selects "Entity" as buyer type**
   - What happens?
   - What state changes?
   - What UI appears next?

2. **When user selects "Trust" as buyer type**
   - What happens?
   - Is there different handling vs Entity?

3. **Current exemption check flow**
   - What exemption options exist for Entities?
   - What exemption options exist for Trusts?
   - Where is this logic defined?

**Output format:**
```
BUYER TYPE FLOW REPORT
======================

USER SELECTS "ENTITY":
1. State change: wizardData.buyer_type = "entity" [file:line]
2. UI change: Shows exemption check [file:line]
3. Next step: [step name]

ENTITY EXEMPTION OPTIONS (current):
□ Securities reporting issuer
□ Governmental authority
□ ...
Location: [file:line]

USER SELECTS "TRUST":
1. State change: [describe]
2. UI change: [describe]
3. Next step: [step name]

TRUST EXEMPTION OPTIONS (current):
□ ...
Location: [file:line]

KEY FINDING: [Is there currently ANY entity subtype selection? Yes/No]
```

---

### TASK 5: Examine Beneficial Owner Collection

**Find and document:**

1. **BO collection UI**
   - Where is the "Add Beneficial Owner" functionality?
   - How are multiple BOs handled? (array in state?)
   - What fields are collected per BO?

2. **BO validation**
   - What validation exists?
   - Minimum required BOs?
   - Required fields per BO?

3. **Current BO data structure**
   - Document exact field names
   - Types for each field
   - Any existing role/type fields?

**Output format:**
```
BENEFICIAL OWNER COLLECTION REPORT
==================================

UI LOCATION: [file:line]
ADD BO FUNCTION: [function name, file:line]
BO ARRAY STATE: [variable name, location]

CURRENT BO FIELDS:
- full_name: string (required)
- date_of_birth: string (required)
- address: object { street, city, state, zip }
- ...

EXISTING ROLE/TYPE FIELDS: [Yes: field name / No]
EXISTING INDIRECT OWNERSHIP FIELD: [Yes: field name / No]

VALIDATION:
- Min BOs required: [number or "none"]
- Required fields: [list]
- Validation function: [file:line]
```

---

### TASK 6: Check Party Portal Structure

**Find and document:**

1. **Party portal route/page**
   - File location for `/p/[token]` or similar
   - Component structure

2. **Party portal steps**
   - What steps exist currently?
   - Is there a document upload step?
   - What's the step flow?

3. **Party submission endpoint**
   - What API endpoint receives party data?
   - What data structure does it expect?

**Output format:**
```
PARTY PORTAL REPORT
===================

ROUTE: /p/[token]
FILE: [path]

CURRENT STEPS:
1. Verification
2. Information Form
3. Certification
4. Confirmation

DOCUMENT UPLOAD STEP EXISTS: [Yes/No]

SUBMISSION ENDPOINT: [POST /api/parties/submit or similar]
EXPECTED PAYLOAD:
{
  // Document structure
}

RELEVANT FILES:
- [file1]
- [file2]
```

---

### TASK 7: Check for Existing Document Handling

**Find and document:**

1. **Document model/table**
   - Does `documents` table exist in migrations?
   - Is there a Document model in code?

2. **Upload infrastructure**
   - Any existing file upload components?
   - Any storage service configured? (S3, local, etc.)
   - Any upload API endpoints?

3. **Document references**
   - Search for: `document`, `upload`, `file`, `attachment`
   - Any TODO comments about document upload?

**Output format:**
```
DOCUMENT HANDLING REPORT
========================

DOCUMENT TABLE:
- Migration exists: [Yes: path / No]
- Model exists: [Yes: path / No]

DOCUMENT MODEL FIELDS (if exists):
- id
- report_id
- document_type
- file_url
- ...

UPLOAD COMPONENTS:
- File input component: [Yes: path / No]
- Dropzone component: [Yes: path / No]
- react-dropzone installed: [Yes/No]

STORAGE SERVICE:
- S3 configured: [Yes/No]
- Storage service file: [path or "not found"]
- Upload endpoint: [path or "not found"]

EXISTING UPLOAD FUNCTIONALITY: [Implemented / Partial / Not found]
```

---

### TASK 8: Identify Integration Points

**Find the exact locations where we need to add code:**

1. **Entity subtype selector**
   - Which file?
   - After which existing element?
   - What state variable to add?

2. **Indirect ownership checkbox**
   - Which file?
   - Inside which component/section?
   - What state changes needed?

3. **Trust BO roles**
   - Which file?
   - Inside BO form where?

4. **BOI status question**
   - Which file?
   - After entity info where?

5. **Document upload in party portal**
   - Which file?
   - Between which steps?

**Output format:**
```
INTEGRATION POINTS REPORT
=========================

1. ENTITY SUBTYPE SELECTOR
   File: [path]
   Insert after: [component/element name, line number]
   Add state: wizardData.buyer_entity_subtype
   
2. INDIRECT OWNERSHIP (BO form)
   File: [path]
   Insert in: [BO form component, approximate line]
   Add state: bo.is_indirect_owner, bo.indirect_entity_name

3. TRUST BO ROLES
   File: [path]
   Insert in: [BO form, after which field]
   Add state: bo.trust_role
   Condition: Only show when buyer_type === "trust"

4. BOI STATUS
   File: [path]
   Insert after: [entity info fields]
   Add state: wizardData.buyer_boi_status, wizardData.buyer_fincen_id

5. DOCUMENT UPLOAD (Party Portal)
   File: [path]
   Insert between: [Step X] and [Step Y]
   New step needed: Yes/No
```

---

### TASK 9: Check for Potential Conflicts

**Look for:**

1. **Existing entity_subtype or entity_type fields**
   - Any existing field that might conflict?
   
2. **Existing document upload code**
   - Anything half-implemented that might conflict?

3. **TypeScript interfaces**
   - Find all interfaces for wizard data, BO, party
   - Document locations for updates

4. **API schema validation**
   - Pydantic models that validate wizard data?
   - Will new fields fail validation?

**Output format:**
```
CONFLICT CHECK REPORT
=====================

EXISTING CONFLICTING FIELDS: [None / List them]

PARTIAL IMPLEMENTATIONS FOUND:
- [Description and location]

TYPESCRIPT INTERFACES TO UPDATE:
- WizardData: [file:line]
- BeneficialOwner: [file:line]
- PartyData: [file:line]

PYDANTIC MODELS TO UPDATE:
- [Model name]: [file:line]

VALIDATION CONCERNS:
- [List any strict validation that might reject new fields]
```

---

## FINAL OUTPUT: IMPLEMENTATION ROADMAP

After completing all tasks, produce a summary:

```
IMPLEMENTATION ROADMAP
======================

PRE-REQUISITES:
□ [Any packages to install]
□ [Any migrations to create first]
□ [Any models to update first]

PHASE 1: ENTITY SUBTYPE (estimated changes)
- [ ] Update TypeScript interface: [file]
- [ ] Add state field: [file:line]
- [ ] Add UI component: [file:line, after X]
- [ ] Update Pydantic model: [file] (if needed)

PHASE 2: INDIRECT OWNERSHIP (estimated changes)
- [ ] Update BO interface: [file]
- [ ] Add fields to BO form: [file:line]
- [ ] Update BO state handling: [file:line]

PHASE 3: TRUST BO ROLES (estimated changes)
- [ ] Add trust_role field: [file]
- [ ] Add conditional UI: [file:line]

PHASE 4: BOI STATUS (estimated changes)
- [ ] Add state fields: [file]
- [ ] Add UI section: [file:line]

PHASE 5: DOCUMENT UPLOAD (estimated changes)
- [ ] Create/verify Document model: [file]
- [ ] Create migration: [new file]
- [ ] Create upload endpoint: [file]
- [ ] Create upload component: [new file]
- [ ] Add to party portal: [file:line]

RISK AREAS:
1. [Describe any tricky areas found]
2. [Describe any unclear code]

QUESTIONS FOR DEVELOPER:
1. [Any ambiguities that need clarification]
```

---

## EXECUTION INSTRUCTIONS

1. **Run each task sequentially**
2. **Document findings in the specified format**
3. **Be thorough - check actual code, not assumptions**
4. **Note line numbers for all key locations**
5. **Output the complete report at the end**

**DO NOT MAKE ANY CODE CHANGES DURING THIS INVESTIGATION.**

This is reconnaissance only. The implementation will come after we review this report.

---

**🔍 START INVESTIGATION. REPORT EVERYTHING.**
