# WhatsApp Business Management - Video Recording Script
## For Meta App Review Submission

**Duration:** 5-7 minutes
**Resolution:** 1920x1080 (Full HD)
**Audio:** English narration (required)
**Permissions to demonstrate:** `whatsapp_business_management`

---

## Pre-Recording Setup ✅

### 1. Reset Permissions
- [ ] Remove app from Facebook Business Integrations
- [ ] Log out from Facebook completely
- [ ] Use incognito/private browser window

### 2. Prepare Demo Data
- [ ] Demo seller account credentials ready
- [ ] Demo Facebook account credentials ready
- [ ] Products in demo account (10+ products recommended)
- [ ] Test the complete flow once before recording

### 3. Recording Software
- [ ] OBS Studio / Loom / QuickTime installed
- [ ] Resolution set to 1920x1080
- [ ] Microphone tested (clear audio)
- [ ] Script notes ready (this file)

### 4. Browser Setup
- [ ] Incognito/private window
- [ ] Browser zoom at 100%
- [ ] Bookmarks bar hidden
- [ ] All other tabs closed
- [ ] No browser extensions visible

---

## 🎬 Recording Script - Scene by Scene

---

### **Scene 1: Introduction (30 seconds)**

**Screen:** Your app login page (logged out)
**URL:** https://your-app-url.com (or localhost)

**🎤 Narration:**
> "Hello, I'm demonstrating how our e-commerce platform uses the whatsapp_business_management permission to help sellers integrate their products with WhatsApp Business. I'll show the complete authorization flow from login through catalog synchronization."

**Actions:**
1. Show the URL in browser address bar
2. Show login page (user is logged out)
3. Show "Login" or "Sign In" button

**Duration:** ~20-30 seconds

---

### **Scene 2: User Login (30 seconds)**

**Screen:** Login page

**🎤 Narration:**
> "A seller first logs into our platform using their credentials."

**Actions:**
1. Enter demo email address
2. Enter demo password
3. Click "Login" or "Sign In" button
4. **WAIT** for login to complete
5. Show dashboard after successful login

**🎤 Narration (after login):**
> "After logging in, the seller can access their dashboard where they manage their e-commerce operations."

**Duration:** ~30 seconds

---

### **Scene 3: Navigate to WhatsApp Integration (20 seconds)**

**Screen:** Dashboard → WhatsApp page

**🎤 Narration:**
> "To integrate WhatsApp Business, the seller navigates to the WhatsApp section."

**Actions:**
1. Click "WhatsApp" in the navigation menu (or sidebar)
2. **WAIT** for page to load
3. Show WhatsApp integration page

**Duration:** ~20 seconds

---

### **Scene 4: Initiate Connection (20 seconds)**

**Screen:** WhatsApp integration page (disconnected state)

**🎤 Narration:**
> "The seller clicks 'Connect WhatsApp' to begin the Meta Embedded Signup flow."

**Actions:**
1. Show the "Connect WhatsApp" or "Connect Account" button
2. **POINT** to the button with cursor
3. Click the button
4. **WAIT** for Facebook dialog to appear

**Duration:** ~20 seconds

---

### **Scene 5: Facebook Login Dialog ⭐⭐⭐ CRITICAL (1 minute)**

**Screen:** Facebook login popup/dialog
**URL:** Should show `facebook.com` in address bar or popup title

**🎤 Narration:**
> "The seller is now redirected to Facebook to authenticate. This is the official Meta OAuth authorization flow."

**Actions:**
1. **SHOW** Facebook login screen (blue Facebook UI)
2. **VERIFY** facebook.com domain is visible
3. Enter Facebook email address (OR show "Continue as [Name]" if already logged in)
4. Enter Facebook password (if needed)
5. Click "Login" or "Continue"
6. **WAIT** for permission dialog

**Duration:** ~30 seconds

---

### **Scene 6: Permission Dialog ⭐⭐⭐ MOST CRITICAL (1.5 minutes)**

**Screen:** Facebook permission request dialog

**🎤 Narration:**
> "Facebook now displays the permission request dialog. Our application is requesting the whatsapp_business_management permission along with related permissions to manage the seller's WhatsApp Business Account on their behalf."

**Actions:**
1. **PAUSE** when dialog appears (keep on screen 10-15 seconds)
2. **SLOW DOWN** - this is the most important part!
3. **POINT** with cursor to the permission list
4. **SHOW** the following in the dialog:
   - Your app name and icon at top
   - List of permissions being requested
   - Business Manager or WABA selection dropdown

**🎤 Narration (while showing dialog):**
> "As you can see, the dialog shows four permissions:
> - Manage WhatsApp Business Account - this is the whatsapp_business_management permission
> - Send WhatsApp messages - for messaging capabilities
> - Manage product catalogs - for syncing products
> - Manage business assets - for profile management
>
> The seller selects their WhatsApp Business Account from the dropdown."

**Actions (continued):**
5. **SELECT** WhatsApp Business Account from dropdown (if shown)
6. **POINT** to "Continue" or "Confirm" button
7. **CLICK** "Continue" or "Confirm" to grant permissions

**🎤 Narration (after clicking):**
> "The seller has now granted our application permission to manage their WhatsApp Business Account."

**Duration:** ~60-90 seconds (TAKE YOUR TIME!)

---

### **Scene 7: Redirect and Connection Success (30 seconds)**

**Screen:** Redirect back to your app

**🎤 Narration:**
> "After granting permissions, Facebook redirects the seller back to our platform with an authorization code. Our backend exchanges this code for an access token."

**Actions:**
1. **SHOW** redirect happening (URL changes back to your domain)
2. **SHOW** loading indicator (if any)
3. **WAIT** for connection to complete
4. **SHOW** success message: "WhatsApp Connected Successfully" (or similar)

**Duration:** ~30 seconds

---

### **Scene 8: Connection Status Display (30 seconds)**

**Screen:** WhatsApp integration page (connected state)

**🎤 Narration:**
> "The connection is now established. Using the whatsapp_business_management permission, our app can now access and manage the seller's WhatsApp Business Account information."

**Actions:**
1. Show connection status: "CONNECTED" or "VERIFIED"
2. Show WABA ID (if visible)
3. Show Phone Number (if visible)
4. Show Business Profile section
5. Point to "Edit Profile" button
6. Point to "Sync Catalog" button

**Duration:** ~30 seconds

---

### **Scene 9: Business Profile Management (1 minute)**

**Screen:** Business Profile section

**🎤 Narration:**
> "With the whatsapp_business_management permission, we can read and update the seller's WhatsApp Business profile on their behalf. Let me demonstrate."

**Actions:**
1. Click "Edit Profile" button
2. **SHOW** profile form with fields:
   - Business Description
   - Category
   - Email
   - Address
   - Website
3. **MODIFY** one field (e.g., update description)
4. **CLICK** "Save" or "Update"
5. **WAIT** for API call to complete
6. **SHOW** success message: "Profile updated successfully"

**🎤 Narration (during update):**
> "I'll update the business description to demonstrate the API call. Our backend uses the access token to call the Meta Graph API on behalf of the seller."

**Duration:** ~60 seconds

---

### **Scene 10: Product Catalog Sync ⭐⭐ CORE FEATURE (2 minutes)**

**Screen:** Product Catalog section

**🎤 Narration:**
> "The primary use of whatsapp_business_management is product catalog synchronization. Sellers can sync their entire e-commerce inventory to WhatsApp Business Catalog with one click."

**Actions - Part 1: Show Current State:**
1. Show "Catalog ID" field
2. Show "Load Catalogs" button (if you have this)
3. Click "Load Catalogs"
4. **SHOW** list of available catalogs

**🎤 Narration:**
> "Our app retrieves the seller's existing WhatsApp Business Catalogs using the Graph API."

**Actions - Part 2: Sync Products:**
5. **POINT** to "Sync Products" or "Sync Catalog" button
6. **CLICK** the button
7. **SHOW** loading indicator
8. **WAIT** for sync to complete (show the actual API call happening)
9. **SHOW** success message: "Successfully synced 15 products to WhatsApp Catalog" (or your actual count)

**🎤 Narration:**
> "Our application just created or updated the product catalog on WhatsApp Business using the whatsapp_business_management permission. The API call sends product data including names, descriptions, prices, and images to Meta's servers."

**Duration:** ~90 seconds

---

### **Scene 11: Verify on Meta's Platform (1.5 minutes)**

**Screen:** Open new tab → Facebook Commerce Manager

**🎤 Narration:**
> "Let me verify the products are now live on Meta's platform."

**Actions:**
1. **OPEN NEW TAB** (keep recording)
2. Go to: `https://business.facebook.com/commerce/catalogs`
3. **LOG IN** to Facebook Business Manager (if not logged in)
4. **SHOW** the Catalogs page
5. **CLICK** on the catalog that was just synced
6. **SHOW** products in the catalog:
   - Product images
   - Product names
   - Product prices
   - Product descriptions
7. **CLICK** on one product to show details

**🎤 Narration:**
> "As you can see, the products are now live in the WhatsApp Business Catalog on Meta's Commerce Manager. These are the exact products we just synced from our platform. Customers can now browse these products directly in WhatsApp conversations with the seller."

**Actions (continued):**
8. **CLOSE** the tab or go back to your app

**Duration:** ~90 seconds

---

### **Scene 12: Additional Management Features (1 minute)**

**Screen:** Back to your app - WhatsApp management page

**🎤 Narration:**
> "We also use whatsapp_business_management for additional account management features."

**Actions:**
1. **SCROLL** to show different sections:

   **Phone Number Management:**
   - Show phone number status
   - Show messaging tier (Standard / Tier 1 / etc.)
   - Show quality rating (if visible)

   **Message Templates (if you have this):**
   - Show template list
   - Point out template status

   **Analytics (if you have this):**
   - Show message metrics
   - Show conversation stats

2. **POINT OUT** key features as you scroll

**🎤 Narration:**
> "The platform provides comprehensive WhatsApp Business management including phone number status monitoring, messaging tier information, and analytics - all powered by the whatsapp_business_management permission."

**Duration:** ~60 seconds

---

### **Scene 13: Closing Summary (30 seconds)**

**Screen:** Dashboard or catalog sync success view

**🎤 Narration:**
> "To summarize: sellers connect their WhatsApp Business Account through the Facebook OAuth flow, granting our app the whatsapp_business_management permission. This allows our platform to manage their business profiles, sync product catalogs, and configure account settings on their behalf - all without requiring technical knowledge or direct API access. This integration provides significant value to small and medium-sized e-commerce businesses who want to leverage WhatsApp as a sales channel. Thank you for reviewing our application."

**Actions:**
1. Show the dashboard one final time
2. Pan through key sections
3. Show your app logo or company name
4. Fade out or stop recording

**Duration:** ~30 seconds

---

## Post-Recording Checklist ✅

### 1. Review the Video
- [ ] Watch the entire video start to finish
- [ ] Verify audio is clear and audible
- [ ] Check that permission dialog is clearly visible (10+ seconds)
- [ ] Confirm `whatsapp_business_management` text is readable
- [ ] Verify resolution is 1920x1080 or higher
- [ ] Check total duration (should be 5-7 minutes)

### 2. Verify Key Moments
- [ ] Shows logged-out state at start ✅
- [ ] Shows user login to your app ✅
- [ ] Shows "Connect WhatsApp" button click ✅
- [ ] Shows Facebook login dialog (facebook.com URL visible) ✅
- [ ] Shows permission request dialog for 10+ seconds ✅
- [ ] Shows `whatsapp_business_management` permission text ✅
- [ ] Shows user clicking "Confirm" / "Continue" ✅
- [ ] Shows redirect back to your app ✅
- [ ] Shows connection success message ✅
- [ ] Shows catalog sync working ✅
- [ ] Shows verification on Meta Commerce Manager ✅

### 3. Technical Quality
- [ ] Resolution: 1920x1080 minimum ✅
- [ ] Audio: Clear English narration ✅
- [ ] Duration: 5-7 minutes ✅
- [ ] File format: MP4 or MOV ✅
- [ ] File size: Under 500MB ✅
- [ ] UI language: English ✅

### 4. Optional Enhancements
- [ ] Add text annotations (optional but helpful):
  - "Facebook OAuth Login" when dialog appears
  - "Permission Request: whatsapp_business_management" on permission dialog
  - "Granting Permission" when clicking confirm
  - "Catalog Sync in Progress" during sync
- [ ] Add cursor highlighting (optional)
- [ ] Edit out mistakes (if any)
- [ ] Add intro/outro screens (optional)

---

## Submission

Once video is ready:

1. **Upload to a stable host:**
   - Direct file upload to Meta (recommended)
   - OR: Upload to Google Drive / Dropbox (unlisted, public link)
   - OR: Upload to YouTube (unlisted)

2. **Go to Meta App Dashboard:**
   - Use cases > Customize
   - Click "+ Add to App Review" for `whatsapp_business_management`
   - Fill out the form
   - Upload video
   - Write use case description (use template from previous guide)

3. **Add submission notes:**
   ```
   We are resubmitting after addressing the previous feedback. This video now includes:

   1. Complete Meta OAuth login flow from logged-out state
   2. OAuth authorization and permission grant dialog showing whatsapp_business_management
   3. End-to-end user experience from login through catalog sync
   4. Verification of synced products in Facebook Commerce Manager

   The video demonstrates the complete integration from the end-user's perspective as requested by the reviewer.

   Timestamp reference:
   - 0:00-1:00: User login to our platform
   - 1:00-3:00: Facebook OAuth flow and permission grant (whatsapp_business_management visible at 2:15)
   - 3:00-5:00: Business profile management and catalog sync
   - 5:00-6:30: Verification on Meta Commerce Manager
   - 6:30-7:00: Summary
   ```

4. **Submit for Review**
   - Check all boxes
   - Click "Submit"
   - Wait 3-7 business days for response

---

## Tips for Success

### During Recording:
✅ **DO:**
- Speak slowly and clearly
- Pause briefly between actions
- Show mouse cursor
- Keep permission dialog on screen for 10-15 seconds
- Use zoom/highlight for important elements
- Explain what's happening at each step
- Show actual API responses and success messages
- Demonstrate real functionality (not mockups)

❌ **DON'T:**
- Rush through the permission dialog
- Skip the Facebook login flow
- Start from inside the app (must start logged out)
- Use developer tools or technical views (show end-user UI only)
- Show sensitive data (tokens, API keys)
- Edit out the OAuth flow
- Use languages other than English

### Common Mistakes to Avoid:
- ❌ Starting the video from dashboard (must show login)
- ❌ Not showing Facebook permission dialog
- ❌ Permission dialog appearing too briefly (< 5 seconds)
- ❌ Not explaining what permission is being requested
- ❌ No audio narration
- ❌ Resolution too low (< 1080p)
- ❌ Video too short (< 3 minutes)
- ❌ Not showing actual results (catalog in Meta's platform)

---

## Need Help?

If you encounter issues:
1. Review this script again
2. Test the flow multiple times before recording
3. Check RESET-PERMISSIONS-GUIDE.md if dialog doesn't appear
4. Read Meta's feedback again carefully
5. Ask for help if stuck

## Meta Resources

- [Screen Recording Guide](https://developers.facebook.com/docs/app-review/screencast)
- [Permissions and Features Reference](https://developers.facebook.com/docs/permissions/reference)
- [App Review Process](https://developers.facebook.com/docs/app-review)

---

**Good luck with your recording!** 🎥🚀

Remember: The most important part is showing the **Facebook permission dialog** where `whatsapp_business_management` is clearly visible!
