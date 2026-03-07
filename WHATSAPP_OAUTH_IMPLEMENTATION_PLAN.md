# WhatsApp OAuth Flow Implementation Plan

## Overview
Implement Meta's Embedded Signup flow to allow sellers to connect their WhatsApp Business accounts automatically without manual token generation.

---

## Architecture

```
┌─────────────────┐         ┌──────────────┐         ┌─────────────────┐
│  Seller Portal  │────────>│  Meta OAuth  │────────>│  Your Backend   │
│  (React)        │         │  (Facebook)  │         │  (Laravel)      │
└─────────────────┘         └──────────────┘         └─────────────────┘
        │                           │                         │
        │ 1. Click "Connect"        │                         │
        │──────────────────────────>│                         │
        │                           │                         │
        │ 2. Authorize App          │                         │
        │<──────────────────────────│                         │
        │                           │                         │
        │                           │ 3. Auth Code           │
        │                           │───────────────────────>│
        │                           │                         │
        │                           │ 4. Exchange for Token  │
        │                           │<───────────────────────│
        │                           │                         │
        │                           │ 5. Return Token        │
        │                           │───────────────────────>│
        │                           │                         │
        │ 6. Save & Redirect        │                         │
        │<──────────────────────────────────────────────────│
        │                           │                         │
        │ 7. Show Success           │                         │
```

---

## Implementation Steps

### 1. Environment Configuration

Add to `.env`:
```env
META_APP_ID=your_app_id
META_APP_SECRET=your_app_secret
META_EMBEDDED_SIGNUP_CONFIG_ID=1403441077449207
META_OAUTH_REDIRECT_URL=https://your-domain.com/api/seller/whatsapp/oauth/callback
META_API_VERSION=v21.0
```

---

### 2. Frontend: Add "Connect WhatsApp" Button

**File:** `src/pages/whatsapp/WhatsAppPage.jsx`

```jsx
const handleConnectWhatsApp = () => {
  const appId = 'YOUR_META_APP_ID'; // From backend config
  const configId = '1403441077449207';
  const redirectUri = encodeURIComponent('https://your-domain.com/api/seller/whatsapp/oauth/callback');
  const state = btoa(JSON.stringify({
    seller_id: user.seller_id,
    wh_account_id: user.wh_account_id
  }));

  const oauthUrl = `https://www.facebook.com/v21.0/dialog/oauth?` +
    `client_id=${appId}` +
    `&redirect_uri=${redirectUri}` +
    `&state=${state}` +
    `&response_type=code` +
    `&scope=whatsapp_business_management,whatsapp_business_messaging,catalog_management,business_management` +
    `&extras={"setup":{"channel":"whatsapp","business_config":{"id":"${configId}"}}}`;

  // Open in popup or redirect
  window.location.href = oauthUrl;
};
```

**UI Component:**
```jsx
{!config.is_connected ? (
  <Button
    onClick={handleConnectWhatsApp}
    className="bg-green-600 hover:bg-green-700"
  >
    <Phone className="h-4 w-4" />
    Connect WhatsApp Business
  </Button>
) : (
  <div className="flex items-center gap-2">
    <CheckCircle className="h-5 w-5 text-green-500" />
    <span>WhatsApp Connected</span>
  </div>
)}
```

---

### 3. Backend: OAuth Callback Handler

**File:** `aibot-updates/laravel/routes/api_whatsapp.php`

Add route:
```php
Route::get('/seller/whatsapp/oauth/callback',
  [WhatsAppController::class, 'handleOAuthCallback']);
```

**File:** `aibot-updates/laravel/WhatsAppController.php`

Add method:
```php
/**
 * Handle Meta OAuth callback after seller authorizes
 * GET /api/seller/whatsapp/oauth/callback
 */
public function handleOAuthCallback(Request $request)
{
    try {
        // 1. Get authorization code from Meta
        $code = $request->input('code');
        $state = $request->input('state');

        if (!$code) {
            return redirect(env('FRONTEND_URL') . '/whatsapp?error=no_code');
        }

        // 2. Decode state to get seller info
        $stateData = json_decode(base64_decode($state), true);
        $sellerId = $stateData['seller_id'] ?? null;
        $whAccountId = $stateData['wh_account_id'] ?? null;

        // 3. Exchange code for access token
        $tokenResponse = Http::post('https://graph.facebook.com/v21.0/oauth/access_token', [
            'client_id' => env('META_APP_ID'),
            'client_secret' => env('META_APP_SECRET'),
            'redirect_uri' => env('META_OAUTH_REDIRECT_URL'),
            'code' => $code
        ]);

        if (!$tokenResponse->successful()) {
            Log::error('Token exchange failed: ' . $tokenResponse->body());
            return redirect(env('FRONTEND_URL') . '/whatsapp?error=token_exchange_failed');
        }

        $tokenData = $tokenResponse->json();
        $accessToken = $tokenData['access_token'];

        // 4. Get WABA ID from the setup data
        $wabaId = $request->input('waba_id'); // Meta sends this
        $phoneNumberId = $request->input('phone_number_id'); // Meta sends this

        // 5. Get or create catalog
        $catalogId = $this->getOrCreateCatalog($accessToken, $wabaId);

        // 6. Save configuration to database
        $config = SellerWhatsappConfig::updateOrCreate(
            ['wh_account_id' => $whAccountId],
            [
                'seller_id' => $sellerId,
                'access_token' => $accessToken,
                'waba_id' => $wabaId,
                'phone_number_id' => $phoneNumberId,
                'catalog_id' => $catalogId,
                'is_connected' => true,
                'connected_at' => now()
            ]
        );

        // 7. Link catalog to WABA
        $this->linkCatalogToWaba($config);

        // 8. Redirect back to frontend with success
        return redirect(env('FRONTEND_URL') . '/whatsapp?connected=success');

    } catch (\Exception $e) {
        Log::error('OAuth callback error: ' . $e->getMessage());
        return redirect(env('FRONTEND_URL') . '/whatsapp?error=callback_failed');
    }
}

/**
 * Get existing catalog or create a new one
 */
private function getOrCreateCatalog($accessToken, $wabaId)
{
    // 1. Try to get existing catalog
    $response = Http::withHeaders([
        'Authorization' => 'Bearer ' . $accessToken
    ])->get("https://graph.facebook.com/v21.0/{$wabaId}/product_catalogs");

    if ($response->successful()) {
        $catalogs = $response->json()['data'] ?? [];
        if (!empty($catalogs)) {
            return $catalogs[0]['id']; // Use first catalog
        }
    }

    // 2. Create new catalog if none exists
    $createResponse = Http::withHeaders([
        'Authorization' => 'Bearer ' . $accessToken
    ])->post("https://graph.facebook.com/v21.0/{$wabaId}/product_catalogs", [
        'name' => 'Product Catalog',
        'vertical' => 'commerce'
    ]);

    if ($createResponse->successful()) {
        return $createResponse->json()['id'];
    }

    return null;
}
```

---

### 4. Database Schema (Already Exists)

Your `seller_whatsapp_config` table already has the fields:
- ✅ `access_token` - Store OAuth token
- ✅ `waba_id` - WhatsApp Business Account ID
- ✅ `phone_number_id` - Phone number ID
- ✅ `catalog_id` - Catalog ID
- ✅ `is_connected` - Connection status

---

### 5. Token Refresh Mechanism

**File:** `aibot-updates/laravel/WhatsAppController.php`

Add method:
```php
/**
 * Refresh access token before it expires
 * Meta tokens from system users don't expire, but user tokens do
 */
public function refreshAccessToken($whAccountId)
{
    $config = SellerWhatsappConfig::where('wh_account_id', $whAccountId)->first();

    if (!$config) {
        return false;
    }

    // Check if token is still valid
    $debugResponse = Http::get('https://graph.facebook.com/v21.0/debug_token', [
        'input_token' => $config->access_token,
        'access_token' => $config->access_token
    ]);

    if (!$debugResponse->successful()) {
        // Token is invalid, seller needs to reconnect
        $config->update(['is_connected' => false]);
        return false;
    }

    $tokenInfo = $debugResponse->json()['data'] ?? [];

    // If token expires soon (within 7 days), trigger reconnection
    if (isset($tokenInfo['expires_at']) && $tokenInfo['expires_at'] > 0) {
        $expiresIn = $tokenInfo['expires_at'] - time();
        if ($expiresIn < 7 * 24 * 60 * 60) { // 7 days
            // Notify seller to reconnect
            return false;
        }
    }

    return true;
}
```

---

### 6. Meta App Configuration Steps

**In Meta for Developers (https://developers.facebook.com):**

1. Go to your app (Anythinginstantly)
2. **WhatsApp → Configuration:**
   - Add callback URL: `https://your-domain.com/api/seller/whatsapp/oauth/callback`
3. **App Settings → Basic:**
   - Copy App ID and App Secret
   - Add to `.env`
4. **WhatsApp → Embedded Signup:**
   - Use configuration ID: `1403441077449207`
   - Set up business verification

---

## Testing Flow

### 1. Seller Perspective:
1. Login to seller portal
2. Go to WhatsApp Bot page
3. Click "Connect WhatsApp Business"
4. Redirected to Meta → Login → Select business → Authorize
5. Redirected back → Shows "Connected ✅"
6. Can now sync catalog and send messages

### 2. What Happens Behind the Scenes:
1. Seller clicks connect
2. OAuth URL generated with state (seller_id, wh_account_id)
3. Meta shows authorization screen
4. Seller authorizes
5. Meta redirects to callback with code
6. Backend exchanges code for access_token
7. Backend gets WABA ID, phone_number_id from Meta
8. Backend creates/finds catalog
9. Backend saves everything to database
10. Backend links catalog to WABA
11. Redirects seller back with success

---

## Benefits

✅ **Scalable** - Each seller connects their own WhatsApp
✅ **Automatic** - No manual token generation
✅ **Secure** - Tokens stored per seller
✅ **Compliant** - Uses official Meta OAuth flow
✅ **User-friendly** - One-click connection
✅ **Maintainable** - Standard OAuth pattern

---

## Migration Strategy

### For Existing Seller (wh_account_id = 1035):
- ✅ Already has token (keep it for now)
- Later: Ask them to reconnect via OAuth
- This ensures their setup is migrated to the new flow

### For New Sellers:
- ✅ Must use OAuth flow
- No manual token generation needed

---

## Required Permissions

When seller authorizes, request these permissions:
- `whatsapp_business_management` ✅
- `whatsapp_business_messaging` ✅
- `catalog_management` ✅
- `business_management` ✅

These are automatically granted when using Embedded Signup!

---

## Error Handling

### Common Issues:
1. **Token expired** → Show "Reconnect WhatsApp" button
2. **Catalog not linked** → Auto-fix in sync function
3. **WABA suspended** → Show error message
4. **Permissions revoked** → Request reconnection

---

## Next Steps

1. ✅ Get Meta App ID and Secret from your app
2. ✅ Add environment variables
3. ✅ Implement OAuth callback endpoint
4. ✅ Update frontend with "Connect WhatsApp" button
5. ✅ Test with a new seller account
6. ✅ Document the process for sellers

---

## Estimated Development Time

- Backend OAuth handler: **2-3 hours**
- Frontend UI updates: **1-2 hours**
- Testing & debugging: **2-3 hours**
- **Total: 5-8 hours**

---

## Security Considerations

1. **Validate state parameter** - Prevent CSRF attacks
2. **Use HTTPS only** - OAuth requires secure connection
3. **Store tokens encrypted** - Use Laravel encryption
4. **Validate webhooks** - Verify Meta webhook signatures
5. **Rate limiting** - Prevent abuse

---

## Alternative: System User Per Seller

If OAuth is too complex initially, you could:
1. Create a system user per seller programmatically
2. Use Meta Graph API to generate tokens
3. Still requires Meta app access but more automated

But **OAuth is the proper solution** and what Meta recommends!
