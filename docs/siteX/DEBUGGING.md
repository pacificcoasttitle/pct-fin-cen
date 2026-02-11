# SiteX Outbound Call Debugging Guide

## The 3 Most Common Failures

### 1. OAuth Token Request Fails (401)

**Symptom:** `SiteXAuthError: Invalid SiteX credentials`

**Check:**
```bash
# Verify your env vars are actually set
python -c "import os; print('ID:', bool(os.getenv('SITEX_CLIENT_ID'))); print('SECRET:', bool(os.getenv('SITEX_CLIENT_SECRET')))"
```

**Common causes:**
- `SITEX_CLIENT_ID` or `SITEX_CLIENT_SECRET` has leading/trailing whitespace
- Credentials are URL-encoded when they shouldn't be
- Wrong token URL path

**The token request MUST be:**
```
POST {base_url}/ls/apigwy/oauth2/v1/token
Authorization: Basic {base64(client_id:client_secret)}
Content-Type: application/x-www-form-urlencoded
Body: grant_type=client_credentials
```

**NOT this (common mistake):**
```
❌ Content-Type: application/json
❌ Body: {"grant_type": "client_credentials"}   ← WRONG, must be form data
❌ Authorization: Bearer {client_id}             ← WRONG, must be Basic
```

---

### 2. Property Search Returns Empty/Error (403 or 404)

**Symptom:** Search returns error or empty results for known addresses

**Check the search URL:**
```
GET {base_url}/ls/publicsearch/v1/{feed_id}/property?address1={street}&lastLine={city, state zip}
```

**Common causes:**
- `SITEX_FEED_ID` is wrong or not set
- Search URL path is wrong (varies by SiteX product)
- Using POST instead of GET
- Missing `lastLine` parameter (city/state/zip)
- Bearer token not being passed

**Debug steps:**
```python
# Add to your route temporarily:
@router.get("/api/property/debug")
async def debug_sitex():
    """Test the outbound call step by step."""
    results = {}
    
    # Step 1: Check config
    results["config"] = {
        "base_url": sitex_service.base_url,
        "feed_id": sitex_service.feed_id,
        "client_id_set": bool(sitex_service.client_id),
        "client_secret_set": bool(sitex_service.client_secret),
        "token_url": f"{sitex_service.base_url}/ls/apigwy/oauth2/v1/token",
        "search_url": f"{sitex_service.base_url}/ls/publicsearch/v1/{sitex_service.feed_id}/property",
    }
    
    # Step 2: Try to get token
    try:
        token = await sitex_service.token_manager.get_token()
        results["token"] = {"status": "success", "token_prefix": token[:20] + "..."}
    except Exception as e:
        results["token"] = {"status": "error", "message": str(e)}
        return results  # Can't continue without token
    
    # Step 3: Try a test search
    try:
        result = await sitex_service.search_property(
            address="100 Main St",
            city="Los Angeles", 
            state="CA",
            zip_code="90012",
            use_cache=False,
        )
        results["search"] = {
            "status": result.status,
            "has_data": result.data is not None,
            "message": result.message,
        }
        if result.data:
            results["search"]["fincen_fields"] = result.data.to_fincen_dict()
    except Exception as e:
        results["search"] = {"status": "error", "message": str(e)}
    
    return results
```

---

### 3. Data Comes Back But Fields Are Empty

**Symptom:** `status: "success"` but APN, legal description, etc. are all empty

**Cause:** SiteX field names vary by feed. Your feed might use different field names.

**Debug: Log the raw response**
```bash
# Set env var to enable debug logging
SITEX_DEBUG=true
```

Then check logs for `SiteX raw response:` — look at the actual field names in the JSON.

**Then update the field mappings** in `_parse_property()`. For example, if your feed uses `ParcelNum` instead of `APN`:

```python
# In sitex_service.py _parse_property method, add your feed's field names:
apn = self._try_fields(prop, [
    "APN", "ParcelNumber", "ParcelNum",  # ← Add your feed's field name
    "AssessorParcelNumber", "apn", "TaxID",
]) or ""
```

---

## Quick Test from Command Line

```bash
# Test token acquisition
curl -X POST "https://api.bkiconnect.com/ls/apigwy/oauth2/v1/token" \
  -H "Authorization: Basic $(echo -n 'YOUR_ID:YOUR_SECRET' | base64)" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials"

# Test property search (replace TOKEN with the access_token from above)
curl "https://api.bkiconnect.com/ls/publicsearch/v1/YOUR_FEED_ID/property?address1=100+Main+St&lastLine=Los+Angeles,+CA+90012" \
  -H "Authorization: Bearer TOKEN" \
  -H "Accept: application/json"
```

---

## Environment Variables Checklist

```env
SITEX_BASE_URL=https://api.bkiconnect.com     # No trailing slash
SITEX_CLIENT_ID=your_client_id                  # No quotes, no whitespace
SITEX_CLIENT_SECRET=your_client_secret          # No quotes, no whitespace  
SITEX_FEED_ID=your_feed_id                      # The feed identifier from SiteX
SITEX_DEBUG=true                                 # Set to true while debugging
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_key        # Frontend only
NEXT_PUBLIC_API_URL=http://localhost:8000        # Your backend URL
```
