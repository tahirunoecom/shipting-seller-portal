# How to Reset Facebook Permissions Before Recording

## Problem
When recording the video for Meta App Review, you need to show the **permission dialog** where user grants `whatsapp_business_management` permission.

However, if you've already connected the app before, Facebook won't show the dialog again!

## Solution: Revoke App Permissions First

### Method 1: Via Facebook Settings (Recommended)

1. **Open Facebook Settings:**
   - Go to: https://www.facebook.com/settings?tab=business_tools
   - OR: Facebook > Settings & Privacy > Settings > Business Integrations

2. **Find Your App:**
   - Look for "Shipting" or your app name in the list
   - App ID: `1559645705059315`

3. **Remove App:**
   - Click "View and Edit" next to your app
   - Scroll down and click "Remove"
   - Confirm removal

4. **Verify Removal:**
   - Refresh the page
   - Your app should no longer be in the list

### Method 2: Via Business Settings

1. **Open Facebook Business Manager:**
   - Go to: https://business.facebook.com/settings/

2. **Navigate to Apps:**
   - Click "Apps" in left sidebar
   - Find your app (Shipting)

3. **Remove App:**
   - Click on the app
   - Click "Remove App"
   - Confirm

### Method 3: Use a Different Facebook Account

**Easiest option for recording:**

- Create a new Facebook Business Account for testing
- Create a new WhatsApp Business Account
- Use this fresh account for recording
- First-time users will ALWAYS see the permission dialog

## After Revoking Permissions

### Test the Flow:

1. **Go to your Shipting seller portal**
2. **Log in** with your demo seller account
3. **Navigate to WhatsApp page**
4. **Click "Connect WhatsApp"**
5. **Facebook login dialog appears** ✅
6. **Permission dialog appears** ✅ (showing all 4 permissions)
7. **Point out** `whatsapp_business_management` in the list
8. **Click "Continue"** to grant permissions
9. **Redirects back** to your app
10. **Connection successful** ✅

## During Recording

### What You'll See in Permission Dialog:

The dialog will show:
- **App name:** Shipting (or your app name)
- **App icon:** Your app's logo
- **Permissions requested:**
  - ✅ Manage your WhatsApp Business Account
  - ✅ Send WhatsApp messages
  - ✅ Manage product catalogs
  - ✅ Manage business assets

### What to Do:

1. **PAUSE** when dialog appears (keep it on screen 10-15 seconds)
2. **POINT** to the permissions with mouse cursor
3. **SAY:** "Facebook is now asking to grant whatsapp_business_management permission to our app"
4. **CLICK** "Continue" or "Confirm"
5. **WAIT** for redirect back to your app
6. **SHOW** success message

## Tips

- Use **incognito/private window** for clean recording
- **Log out from Facebook** completely before starting
- **Use zoom** to make permission text more visible
- **Add text annotation** highlighting the permission (optional)
- **Speak clearly** when explaining what's happening

## Verification Checklist

Before recording the final video, verify:
- [ ] App removed from Facebook Business Integrations
- [ ] Logged out from Facebook completely
- [ ] Fresh browser session (incognito)
- [ ] Permission dialog appears when connecting
- [ ] All 4 permissions visible in dialog
- [ ] Can successfully grant and connect
- [ ] Catalog sync works after connection

## Need Help?

If permission dialog still doesn't appear:
1. Check if using different Facebook account
2. Clear browser cache and cookies
3. Try different browser
4. Contact Meta Support for App Review questions
