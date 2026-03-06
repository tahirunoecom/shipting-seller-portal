# 🔒 Meta WhatsApp Permissions Guide

## Error: "(#10) Application does not have permission for this action"

This error means your Meta app or access token is missing **catalog management permissions**.

---

## Required Permissions

Your Meta App needs these permissions:

✅ **whatsapp_business_management** - Manage WhatsApp Business Account
✅ **whatsapp_business_messaging** - Send/receive messages
❌ **catalog_management** ⚠️ **MISSING - THIS IS THE ISSUE!**
✅ **business_management** - Manage business assets (optional but recommended)

---

## Solution 1: Add Permissions in Meta App Dashboard

### Step 1: Go to App Dashboard
```
https://developers.facebook.com/apps/{YOUR_APP_ID}/app-review/permissions/
```
Replace `{YOUR_APP_ID}` with your actual app ID (check WhatsAppController.php line 19)

### Step 2: Add Required Permissions
1. Click "+ Add Permission"
2. Search for: `catalog_management`
3. Click "Request"
4. Fill out the form explaining why you need it

### Step 3: For Testing (Skip App Review)
- Use **Test Users** in your Meta App
- Test users get permissions immediately without review
- Create test users: App Dashboard → Roles → Test Users

---

## Solution 2: Business Manager System Users

If you're using System Users (recommended for server-to-server):

### Step 1: Go to Business Settings
```
https://business.facebook.com/settings/system-users
```

### Step 2: Find Your System User
1. Click on the system user your app uses
2. Go to "Assets" tab
3. Click "Add Assets"

### Step 3: Grant Catalog Access
1. Select "Catalogs"
2. Find your catalog (ID: `894655139864762`)
3. Toggle "Manage Catalog" permission to **ON**
4. Click "Save Changes"

---

## Solution 3: Update Embedded Signup Permissions

The Embedded Signup flow needs to request catalog permissions:

### Update Your Embedded Signup Configuration

In your Meta App Dashboard → WhatsApp → Configuration:

1. **Configuration ID:** `4402947513364167`
2. **Requested Permissions:** Add `catalog_management` to the list
3. **Scope:** Make sure it includes:
   ```
   whatsapp_business_management,whatsapp_business_messaging,catalog_management
   ```

### Frontend Code Update

In your React app's Embedded Signup button:

```javascript
FB.login(
  function(response) {
    // handle response
  },
  {
    scope: 'whatsapp_business_management,whatsapp_business_messaging,catalog_management',
    extras: {
      feature: 'whatsapp_embedded_signup',
      setup: {
        // ... your config
      }
    }
  }
);
```

---

## Solution 4: Re-authenticate Users

If you add permissions after users have already connected:

### Backend: Check if permissions are missing

```bash
curl -X POST "https://stageshipperapi.thedelivio.com/api/seller/whatsapp/check-permissions" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"wh_account_id": "123"}'
```

Response will show:
```json
{
  "status": 1,
  "data": {
    "has_all_permissions": false,
    "missing_permissions": ["catalog_management"],
    "granted_permissions": ["whatsapp_business_management", "whatsapp_business_messaging"]
  }
}
```

### Frontend: Prompt user to reconnect

If `has_all_permissions: false`, show a banner:

```
⚠️ Additional permissions needed
Your WhatsApp connection needs catalog management permissions.
[Reconnect WhatsApp] button
```

When user clicks "Reconnect", run the Embedded Signup flow again with updated scopes.

---

## Verification

### Check Current Permissions

Use the new endpoint:
```bash
POST /api/seller/whatsapp/check-permissions
Body: { "wh_account_id": "seller_id" }
```

### Test Catalog Connection

After adding permissions:
```bash
POST /api/seller/whatsapp/connect-catalog
Body: {
  "wh_account_id": "seller_id",
  "catalog_id": "894655139864762"
}
```

Should return:
```json
{
  "status": 1,
  "message": "Catalog connected successfully in Meta"
}
```

---

## Common Issues

### 1. "Permissions Added But Still Getting Error"
- **Cause:** User's access token is old (before permissions were added)
- **Fix:** User needs to reconnect/re-authenticate

### 2. "Can't Find catalog_management Permission"
- **Cause:** Your app type might not support it
- **Fix:** Check App Type in Dashboard → Settings → Basic
  - Should be: "Business" or "Commerce"
  - Change if needed and re-submit

### 3. "Permission Requires App Review"
- **Cause:** Production apps need Meta approval
- **Fix:**
  - Use Test Users for development
  - Submit detailed App Review form for production
  - Explain use case: "Connecting seller catalogs to WhatsApp for product messaging"

---

## Quick Fix Checklist

- [ ] Check Meta App has `catalog_management` in permissions list
- [ ] Verify System User has "Manage Catalog" access
- [ ] Update Embedded Signup scope to include `catalog_management`
- [ ] Run `/check-permissions` endpoint to verify
- [ ] Have users reconnect if permissions were added after initial connection
- [ ] Test with `/connect-catalog` endpoint

---

## Need Help?

1. **Check your app:** https://developers.facebook.com/apps/
2. **Business Manager:** https://business.facebook.com/settings/
3. **Meta Docs:** https://developers.facebook.com/docs/permissions/reference

**App ID:** Check `WhatsAppController.php` line 19
**Business ID:** Check your WhatsApp config in database
**Catalog ID:** `894655139864762` (from your screenshot)
