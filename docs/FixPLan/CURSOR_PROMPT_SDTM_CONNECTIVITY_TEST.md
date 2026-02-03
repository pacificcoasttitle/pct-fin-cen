# CURSOR PROMPT: SDTM Sandbox Connectivity Test

## Context

We are testing FinCEN SDTM (Secure Direct Transfer Mode) connectivity to the **sandbox** environment before our March 1, 2026 launch. This is the first real connection attempt. We need to confirm SFTP access works before attempting any filing submission.

---

## STEP 1: Set Up Environment Variables (Local)

Create or update your local `.env` file in the `api/` directory with the following SDTM sandbox credentials:

```env
# FinCEN SDTM Sandbox Configuration
FINCEN_TRANSPORT=sdtm
FINCEN_ENV=sandbox

# SDTM SFTP Credentials (sandbox)
SDTM_USERNAME=sdtmjan0726a
SDTM_PASSWORD=ma1iI1LnFahOFnIbEHkHjK0g3eochNH

# Transmitter Identity
# NOTE: TRANSMITTER_TIN must be a 9-digit EIN (e.g., 953456789)
# Verify this is Pacific Coast Title's actual EIN before filing.
# For connectivity test only, this value is not transmitted.
TRANSMITTER_TIN=952569776
TRANSMITTER_TCC=TBSATEST
```

### ⚠️ CRITICAL SECURITY RULES
- **NEVER** commit `.env` to git
- Confirm `api/.env` is in `.gitignore`
- These are real FinCEN sandbox credentials — treat them like production secrets

---

## STEP 2: Verify Configuration Loads

Before testing SFTP, confirm the app reads the env vars correctly.

Run this from the `api/` directory:

```bash
cd api
python -c "
from app.config import settings
print('=== SDTM Configuration Check ===')
print(f'FINCEN_TRANSPORT: {settings.FINCEN_TRANSPORT}')
print(f'FINCEN_ENV: {settings.FINCEN_ENV}')
print(f'SDTM_HOST: {settings.SDTM_HOST}')
print(f'SDTM_PORT: {settings.SDTM_PORT}')
print(f'SDTM_USERNAME: {settings.SDTM_USERNAME}')
print(f'SDTM_PASSWORD: {\"SET\" if settings.SDTM_PASSWORD else \"MISSING\"}')
print(f'TRANSMITTER_TIN: {settings.TRANSMITTER_TIN}')
print(f'TRANSMITTER_TCC: {settings.TRANSMITTER_TCC}')
print(f'sdtm_configured: {settings.sdtm_configured}')
print(f'transmitter_configured: {settings.transmitter_configured}')
print()
if settings.sdtm_configured:
    print('✅ SDTM configuration looks complete')
else:
    print('❌ SDTM configuration incomplete — check missing values above')
"
```

### Expected Output
```
=== SDTM Configuration Check ===
FINCEN_TRANSPORT: sdtm
FINCEN_ENV: sandbox
SDTM_HOST: bsaefiling-direct-transfer-sandbox.fincen.gov
SDTM_PORT: 2222
SDTM_USERNAME: sdtmjan0726a
SDTM_PASSWORD: SET
TRANSMITTER_TIN: PLACEHOLDER_NEED_REAL_EIN
TRANSMITTER_TCC: TBSATEST
sdtm_configured: True
✅ SDTM configuration looks complete
```

### If This Fails
- Check that `python-dotenv` is loading the `.env` file
- Check that `app/config.py` reads these variables
- Check the auto-host resolution logic for `FINCEN_ENV=sandbox`

---

## STEP 3: Run the SDTM Ping Test

This is the real connectivity test. It connects via SFTP (paramiko) to the FinCEN sandbox and attempts to list the `/submissions` and `/acks` directories.

```bash
cd api
python -m app.scripts.fincen_sdtm_ping
```

### Expected Success Output
```
Connecting to bsaefiling-direct-transfer-sandbox.fincen.gov:2222...
Connected successfully.
Listing /submissions... OK (X files)
Listing /acks... OK (X files)
SDTM connectivity test PASSED ✅
```

### Possible Failures and What They Mean

| Error | Likely Cause | Fix |
|-------|-------------|-----|
| `Connection refused` | Wrong host/port, or firewall blocking | Verify host resolves, check if your IP needs whitelisting with FinCEN |
| `Authentication failed` | Wrong username or password | Double-check credentials, they may be case-sensitive |
| `Connection timed out` | Firewall, network issue, or FinCEN sandbox down | Try from a different network; check if port 2222 is open outbound |
| `No such file or directory` | SFTP connected but directory names wrong | Check `SDTM_SUBMISSIONS_DIR` and `SDTM_ACKS_DIR` values |
| `Host key verification failed` | paramiko strict host key checking | May need to accept/add the sandbox host key |
| `ModuleNotFoundError: paramiko` | paramiko not installed | `pip install paramiko>=3.4.0` |

---

## STEP 4: If Ping Fails — Manual SFTP Debug

If the script fails, try a raw SFTP connection to isolate the issue:

```bash
sftp -P 2222 sdtmjan0726a@bsaefiling-direct-transfer-sandbox.fincen.gov
```

If prompted for password, enter: `ma1iI1LnFahOFnIbEHkHjK0g3eochNH`

Once connected:
```
sftp> ls
sftp> cd submissions
sftp> ls
sftp> cd ../acks
sftp> ls
sftp> quit
```

If raw SFTP works but the script doesn't, the issue is in paramiko configuration (host keys, timeout settings, etc.).

---

## STEP 5: If Ping Succeeds — Document Results

If the connectivity test passes, capture the output and update your status:

1. **Take a screenshot or copy the terminal output**
2. **Note the sandbox host fingerprint** (for host key pinning later)
3. **Confirm directory structure** — what's in `/submissions` and `/acks`?

Then move to the next phase: submitting a test RERX XML filing.

---

## STEP 6: Pre-Filing Readiness Check (After Ping Passes)

Before attempting an actual filing submission, verify these additional items:

```bash
cd api
python -c "
from app.config import settings

print('=== Pre-Filing Readiness ===')
print()

# TIN check
tin = settings.TRANSMITTER_TIN or ''
if tin.isdigit() and len(tin) == 9:
    print(f'✅ TRANSMITTER_TIN: {tin[:2]}*****{tin[-2:]} (valid format)')
elif 'PLACEHOLDER' in tin:
    print(f'❌ TRANSMITTER_TIN: Still placeholder — need real 9-digit EIN')
else:
    print(f'❌ TRANSMITTER_TIN: \"{tin}\" is not a valid 9-digit number')

# TCC check  
tcc = settings.TRANSMITTER_TCC or ''
if tcc == 'TBSATEST':
    print(f'✅ TRANSMITTER_TCC: TBSATEST (correct for sandbox)')
elif tcc.startswith('P') and len(tcc) == 8:
    print(f'⚠️  TRANSMITTER_TCC: {tcc} (production TCC — NOT for sandbox!)')
else:
    print(f'❌ TRANSMITTER_TCC: \"{tcc}\" is invalid')

# Transport check
if settings.FINCEN_ENV == 'sandbox':
    print(f'✅ FINCEN_ENV: sandbox')
else:
    print(f'⚠️  FINCEN_ENV: {settings.FINCEN_ENV} — are you sure?')

print()
print('To submit a test filing, you still need:')
print('  1. ✅ SDTM connectivity (ping passed)')
print('  2. ❓ Valid 9-digit TRANSMITTER_TIN (Pacific Coast Title EIN)')
print('  3. ❓ A test report in the system with complete wizard_data')
print('  4. ❓ RERX builder generating valid XML')
"
```

---

## TROUBLESHOOTING REFERENCE

### Port 2222 Blocked?
Some corporate networks and cloud providers block non-standard ports. If you're running from Render:
- Render does allow outbound on port 2222, but verify with a test
- If blocked, you may need to contact Render support or use a different deployment

### FinCEN Sandbox Availability
- The sandbox is NOT 24/7 guaranteed
- Maintenance windows happen
- If you get timeouts during business hours, try again later
- FinCEN help desk: 1-866-346-9478 (BSA E-Filing)

### Host Key Issues with Paramiko
If paramiko rejects the host key, check your `sdtm_client.py` for the host key policy. For sandbox testing, `AutoAddPolicy` is acceptable. For production, you should pin the known host key.

---

## WHAT COMES AFTER THIS TEST

Once connectivity is confirmed:

1. **Get your real EIN** → set as `TRANSMITTER_TIN`
2. **Generate a test RERX XML** → from an existing report with complete wizard data
3. **Submit to sandbox** → via the filing endpoint or a direct script
4. **Poll for MESSAGES.XML** → check acceptance/rejection
5. **Poll for ACKED** → extract BSA ID
6. **Celebrate** 🎉

---

## DO NOT
- ❌ Do not attempt a real filing submission until ping passes
- ❌ Do not set `FINCEN_ENV=production` during testing
- ❌ Do not commit credentials to git
- ❌ Do not modify the RERX builder or SDTM client during this test — this is connectivity validation only
