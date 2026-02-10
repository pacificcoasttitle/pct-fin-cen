# 🔧 FIX: Backend Determination Override Bug + Verify RERX

## Part 1: Apply the Fix

### File: `api/app/routes/reports.py`

Find the `determine_report` endpoint (around line 648-680) and **replace the entire function**:

```python
@router.post("/reports/{report_id}/determine")
async def determine_report(
    report_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update report status based on frontend's determination result.
    
    The frontend wizard computes determination using wizard_data.determination.*
    We read from those same fields rather than the legacy step1/step2/step3/step4
    structure that determination.py expects.
    """
    
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Access control
    if current_user.role in ["client_user", "client_admin"]:
        if str(report.company_id) != str(current_user.company_id):
            raise HTTPException(status_code=403, detail="Access denied")
    
    wizard_data = report.wizard_data or {}
    determination = wizard_data.get("determination", {})
    
    # Use frontend's determination logic (same field names)
    is_exempt, exemption_reason = _check_frontend_determination(determination)
    
    # Update status
    if is_exempt:
        report.status = "exempt"
        logger.info(f"Report {report_id} determined EXEMPT: {exemption_reason}")
    else:
        report.status = "determination_complete"
        logger.info(f"Report {report_id} determined REPORTABLE")
    
    db.commit()
    db.refresh(report)
    
    return {
        "id": str(report.id),
        "status": report.status,
        "is_reportable": not is_exempt,
        "exemption_reason": exemption_reason if is_exempt else None,
    }


def _check_frontend_determination(determination: dict) -> tuple[bool, str | None]:
    """
    Check if the frontend's determination indicates exemption.
    
    Returns (is_exempt: bool, reason: str | None)
    
    This mirrors the frontend's determinationResult useMemo logic exactly.
    """
    
    # Check 1: Non-residential with no intent to build
    is_residential = determination.get("isResidential")
    has_intent_to_build = determination.get("hasIntentToBuild")
    
    if is_residential == "no" and has_intent_to_build == "no":
        return True, "Non-residential property with no intent to build residential"
    
    # Check 2: Lender has AML program
    lender_has_aml = determination.get("lenderHasAml")
    if lender_has_aml == "yes":
        return True, "Lender has AML program - reporting handled by lender"
    
    # Check 3: Buyer type exemptions
    buyer_type = determination.get("buyerType")
    
    if buyer_type == "individual":
        exemptions = determination.get("individualExemptions", [])
        # If any exemption selected (other than "none"), it's exempt
        if exemptions and "none" not in exemptions and len(exemptions) > 0:
            return True, f"Individual buyer exemption: {', '.join(exemptions)}"
        # If "none" selected, it's reportable
        if "none" in exemptions:
            return False, None  # REPORTABLE
    
    elif buyer_type == "entity":
        exemptions = determination.get("entityExemptions", [])
        if exemptions and "none" not in exemptions and len(exemptions) > 0:
            return True, f"Entity buyer exemption: {', '.join(exemptions)}"
        if "none" in exemptions:
            return False, None  # REPORTABLE
    
    elif buyer_type == "trust":
        exemptions = determination.get("trustExemptions", [])
        if exemptions and "none" not in exemptions and len(exemptions) > 0:
            return True, f"Trust buyer exemption: {', '.join(exemptions)}"
        if "none" in exemptions:
            return False, None  # REPORTABLE
    
    # If we get here, determination is incomplete
    # Don't guess - raise an error
    logger.warning(f"Incomplete determination: {determination}")
    raise HTTPException(
        status_code=400,
        detail="Determination incomplete. Please complete all determination steps in the wizard."
    )
```

### Also add the import if not present:

At the top of `reports.py`, ensure `logger` is available:

```python
import logging
logger = logging.getLogger(__name__)
```

---

## Part 2: Verify RERX Builder Still Works

After applying the fix, run the RERX dry-run script to verify XML generation:

### Step 1: Create a test report via API or use existing

If you have a report with complete `wizard_data.collection` data, note its ID.

### Step 2: Run dry-run

```bash
# From api/ directory
python -m app.scripts.rerx_dry_run --show-data
```

If no suitable report exists, the script will tell you.

### Step 3: Validate the generated XML

```bash
python -m app.scripts.rerx_validate_xsd rerx_dry_run_output.xml --structural-only
```

### Expected Result

```
✅ 18/18 structural checks passed
```

---

## Part 3: End-to-End Verification Checklist

After deploying the fix:

### Test 1: Reportable Flow
- [ ] Start new report
- [ ] Determination: Residential=Yes, Non-financed=Yes, Entity, "None of the above"
- [ ] Verify shows "REPORTABLE" on result screen
- [ ] Click "Begin Data Collection"
- [ ] **Check database:** `SELECT status FROM reports WHERE id = 'xxx'` → should be `determination_complete`
- [ ] Complete Step 2A (Transaction Details)
- [ ] Go to Step 2B (Party Setup)
- [ ] Add a seller (Individual, name, email)
- [ ] Add a buyer (Entity, name, email)
- [ ] Click "Send Party Links"
- [ ] **Should succeed** (no 400 error)

### Test 2: Exempt Flow (Lender has AML)
- [ ] Start new report
- [ ] Determination: Residential=Yes, Non-financed=No, Lender has AML=Yes
- [ ] Verify shows "EXEMPT" on result screen
- [ ] **Check database:** status = `exempt`
- [ ] Verify cannot send party links (correct behavior)

### Test 3: Exempt Flow (Entity exemption)
- [ ] Start new report
- [ ] Determination: Residential=Yes, Non-financed=Yes, Entity, select "Bank or credit union"
- [ ] Verify shows "EXEMPT" on result screen
- [ ] **Check database:** status = `exempt`

### Test 4: RERX Generation (if you have complete data)
- [ ] Find a report with parties and collection data
- [ ] Run: `python -m app.scripts.rerx_dry_run --report-id "UUID"`
- [ ] Verify XML generates without errors
- [ ] Run structural validation
- [ ] Verify all parties present (35, 37, 67, 69)

---

## Part 4: Quick Database Check Query

Run this after testing to see results:

```sql
SELECT 
    id,
    status,
    wizard_data->'determination'->>'isResidential' as residential,
    wizard_data->'determination'->>'isNonFinanced' as non_financed,
    wizard_data->'determination'->>'lenderHasAml' as lender_aml,
    wizard_data->'determination'->>'buyerType' as buyer_type,
    wizard_data->'determination'->'entityExemptions' as entity_exemptions,
    created_at
FROM reports
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

Expected:
- Reportable transactions: `status = 'determination_complete'`
- Exempt transactions: `status = 'exempt'`

---

## Summary

| Change | Risk | Impact |
|--------|------|--------|
| Replace `determine_report()` | Low | Reads same fields frontend writes |
| Add `_check_frontend_determination()` | Low | Pure function, no side effects |
| RERX Builder | None | Unchanged - already reads `determination.buyerType` |
| Party Data Sync | None | Unchanged |
| Filing Flow | None | Unchanged - actually now ENABLED |

**This fix unblocks everything downstream.**
