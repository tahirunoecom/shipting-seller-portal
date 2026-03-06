# 🔧 WhatsApp Catalog Connection Fix Guide

## Problem Summary

You're getting **Error 131009**: "catalog_management permission required" when trying to send product messages.

### Why This Happens

Even though:
- ✅ `catalog_management` permission is **APPROVED** in your Meta app (Dec 25, 2025)
- ✅ App is in **LIVE mode** (Jan 12, 2026)
- ✅ Catalog exists (ID: `894655139864702`)
- ✅ User was created yesterday (Mar 5, 2026)

**BUT**: The catalog is **NOT CONNECTED** to your WABA (WhatsApp Business Account)

---

## Your Setup

```
WABA ID:          765231639686531
Phone Number ID:  1042564822270979
Business ID:      1236154922033242
Catalog ID:       894655139864702
Display Phone:    +1 619-853-3981
```

---

## Solution (3 Methods)

### Method 1: Use Admin Panel UI (Easiest) ⭐

1. **Login** to your seller portal as admin
2. **Navigate**: Admin Panel → Shipper Details
3. Find **"WhatsApp Catalog Issues"** section
4. Click **"⚡ Fix Automatically (One Click)"** button
5. Done! ✅

**Code location**: `src/pages/admin/AdminShipperDetailPage.jsx:3064`
**Backend endpoint**: `/api/seller/whatsapp/connect-catalog`

---

### Method 2: Run Direct API Test

On YOUR machine (not this environment), run:

```bash
curl -X POST "https://graph.facebook.com/v21.0/765231639686531/product_catalogs" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"catalog_id":"894655139864702"}'
```

**Success Response:**
```json
{"success": true}
```

**Error Response (Permission):**
```json
{
  "error": {
    "code": 10,
    "message": "Application does not have permission..."
  }
}
```

---

### Method 3: Via Laravel Backend API

```bash
curl -X POST "https://stageshipperapi.thedelivio.com/api/seller/whatsapp/connect-catalog" \
  -H "Content-Type: application/json" \
  -u "5:your_password" \
  -d '{
    "wh_account_id": "YOUR_WH_ACCOUNT_ID",
    "catalog_id": "894655139864702"
  }'
```

---

## If You Get Permission Error (Code 10)

**Symptom**:
```json
{
  "error": {
    "code": 10,
    "message": "Application does not have permission for this action"
  }
}
```

**Root Cause**: Access token was generated BEFORE `catalog_management` was approved

**Fix**:
1. User needs to **DISCONNECT** WhatsApp from your app
2. **RECONNECT** WhatsApp again
3. New access token will include `catalog_management` permission
4. Try connecting catalog again

---

## Verify Connection

After connecting, verify with:

```bash
curl -X GET "https://graph.facebook.com/v21.0/765231639686531?fields=product_catalogs" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Expected Response:**
```json
{
  "product_catalogs": {
    "data": [
      {
        "id": "894655139864702",
        "name": "Dear Delhi - Restaurant, Bar & Lounge Catalog"
      }
    ]
  }
}
```

---

## Test Product Message

After catalog is connected, test sending a product message:

```python
# Python (Rasa bot)
await send_product_list(
    recipient_id="1234567890",
    catalog_id="894655139864702",
    sections=[
        {
            "title": "Menu Items",
            "product_items": [
                {"product_retailer_id": "product_1"},
                {"product_retailer_id": "product_2"}
            ]
        }
    ],
    body_text="Check out our menu!",
    header_text="🍽️ Restaurant Menu"
)
```

---

## Code References

### Frontend Service
- **File**: `src/services/whatsapp.js`
- **Method**: `connectCatalogInMeta(wh_account_id, catalog_id)` (line 93)

### Backend Controller
- **File**: `aibot-updates/laravel/WhatsAppController.php`
- **Method**: `connectCatalog(Request $request)` (line 564)
- **API Call**: Line 605

### Python Bot
- **File**: `aibot-updates/whatsapp_business_connector.py`
- **Method**: `send_product_list()` (line 219)

---

## Additional Checks

### 1. Check Token Permissions
```bash
curl "https://graph.facebook.com/v21.0/debug_token?input_token=YOUR_TOKEN&access_token=APP_ID|APP_SECRET"
```

Look for `catalog_management` in the `scopes` array.

### 2. Check WABA Details
```bash
curl "https://graph.facebook.com/v21.0/765231639686531?fields=id,name,timezone_id,message_template_namespace,on_behalf_of_business_info,product_catalogs" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 3. List All Products in Catalog
```bash
curl "https://graph.facebook.com/v21.0/894655139864702/products?fields=id,name,description,image_url,price,retailer_id" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Status: READY TO FIX ✅

All infrastructure is in place:
- ✅ Backend API implemented
- ✅ Frontend UI ready
- ✅ Permissions approved
- ✅ Catalog created
- ✅ User connected

**Just need to connect catalog to WABA!**

---

## Questions?

Check these files:
- `META_PERMISSIONS_GUIDE.md` - Permission details
- `BACKEND_API_NEEDED.md` - API documentation
- Test script: `test-connect-catalog.php`
- Shell script: `connect-catalog-command.sh`
