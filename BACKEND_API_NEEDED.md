# 🚨 Backend API Endpoints Needed for Catalog Auto-Fix

## Overview
The frontend WhatsApp catalog diagnostics requires two new backend endpoints to enable automatic catalog connection via Meta's API.

## Required Endpoints

### 1. **GET /api/seller/whatsapp/commerce-settings**

**Purpose:** Check if a catalog is actually connected in Meta's system

**Request Body:**
```json
{
  "wh_account_id": "seller_id_here"
}
```

**Backend Implementation:**
```php
// Get phone_number_id and access_token from database using wh_account_id
$phoneNumberId = $whatsappAccount->phone_number_id;
$accessToken = $whatsappAccount->access_token;

// Call Meta's WhatsApp Commerce Settings API
$response = Http::withToken($accessToken)
    ->get("https://graph.facebook.com/v21.0/{$phoneNumberId}/whatsapp_commerce_settings", [
        'fields' => 'catalog_id,is_catalog_visible'
    ]);

return [
    'status' => 1,
    'data' => [
        'catalog_id' => $response['catalog_id'] ?? null,
        'is_catalog_visible' => $response['is_catalog_visible'] ?? false,
    ]
];
```

**Success Response:**
```json
{
  "status": 1,
  "data": {
    "catalog_id": "894655139864762",
    "is_catalog_visible": true
  }
}
```

**Meta API Documentation:**
- Endpoint: `GET /{phone-number-id}/whatsapp_commerce_settings`
- Docs: https://developers.facebook.com/docs/whatsapp/cloud-api/reference/commerce-settings

---

### 2. **POST /api/seller/whatsapp/connect-catalog**

**Purpose:** Connect/link a catalog to the WhatsApp phone number via Meta's API

**Request Body:**
```json
{
  "wh_account_id": "seller_id_here",
  "catalog_id": "894655139864762"
}
```

**Backend Implementation:**
```php
// Get phone_number_id and access_token from database
$phoneNumberId = $whatsappAccount->phone_number_id;
$accessToken = $whatsappAccount->access_token;
$catalogId = $request->catalog_id;

// Call Meta's API to connect catalog
$response = Http::withToken($accessToken)
    ->post("https://graph.facebook.com/v21.0/{$phoneNumberId}/whatsapp_commerce_settings", [
        'catalog_id' => $catalogId,
        'is_catalog_visible' => true
    ]);

// Update database
$whatsappAccount->update([
    'catalog_id' => $catalogId,
]);

return [
    'status' => 1,
    'message' => 'Catalog connected successfully',
    'data' => [
        'catalog_id' => $catalogId,
        'success' => $response['success'] ?? true,
    ]
];
```

**Success Response:**
```json
{
  "status": 1,
  "message": "Catalog connected successfully",
  "data": {
    "catalog_id": "894655139864762",
    "success": true
  }
}
```

**Meta API Documentation:**
- Endpoint: `POST /{phone-number-id}/whatsapp_commerce_settings`
- Params: `catalog_id` (string), `is_catalog_visible` (boolean)
- Docs: https://developers.facebook.com/docs/whatsapp/cloud-api/reference/commerce-settings

---

## Error Handling

Both endpoints should handle:

1. **Invalid phone_number_id:** Return 400 with message
2. **Invalid access_token:** Return 401 with message
3. **Meta API errors:** Return 500 with Meta's error message
4. **Missing catalog:** Return 404 with message

**Example Error Response:**
```json
{
  "status": 0,
  "message": "Failed to connect catalog: Invalid catalog ID",
  "error": {
    "code": "CATALOG_NOT_FOUND",
    "meta_error": "Catalog does not exist or is not accessible"
  }
}
```

---

## Testing

**Test with cURL:**

```bash
# Test GET commerce-settings
curl -X POST "https://stageshipperapi.thedelivio.com/api/seller/whatsapp/commerce-settings" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"wh_account_id": "123"}'

# Test POST connect-catalog
curl -X POST "https://stageshipperapi.thedelivio.com/api/seller/whatsapp/connect-catalog" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"wh_account_id": "123", "catalog_id": "894655139864762"}'
```

---

## Current Status

❌ **NOT IMPLEMENTED** - Frontend is ready, backend endpoints return 404

Once implemented:
- Automatic catalog connection will work ✅
- One-click fix for Error 131009 ✅
- Real-time catalog health verification ✅

---

## Meta API Permissions Required

Make sure the access token has these permissions:
- `whatsapp_business_management`
- `whatsapp_business_messaging`
- `catalog_management` (if applicable)

Check permissions with:
```
GET https://graph.facebook.com/v21.0/debug_token?input_token={ACCESS_TOKEN}&access_token={APP_ACCESS_TOKEN}
```
