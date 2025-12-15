<?php

namespace App\Http\Controllers\Api\Seller;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use App\Models\SellerWhatsappConfig;

/**
 * WhatsApp Business API Controller
 * Handles Meta Embedded Signup and multi-tenant configuration
 */
class WhatsAppController extends Controller
{
    // Meta App Configuration
    private $metaAppId = '1559645705059315';
    private $metaAppSecret = '54ff9c006e930cff8e2af6a0ee530646';
    private $metaBusinessId = '1856101791959161';
    private $metaConfigId = '4402947513364167';

    /**
     * Get WhatsApp connection status for a seller
     * POST /api/seller/whatsapp/status
     */
    public function getStatus(Request $request)
    {
        try {
            $whAccountId = $request->input('wh_account_id');

            if (!$whAccountId) {
                return response()->json([
                    'status' => 0,
                    'message' => 'wh_account_id is required'
                ]);
            }

            $config = SellerWhatsappConfig::where('wh_account_id', $whAccountId)->first();

            if (!$config) {
                return response()->json([
                    'status' => 1,
                    'data' => [
                        'is_connected' => false,
                        'connection_status' => 'disconnected'
                    ]
                ]);
            }

            return response()->json([
                'status' => 1,
                'data' => [
                    'is_connected' => $config->is_connected,
                    'connection_status' => $config->connection_status,
                    'phone_number' => $config->display_phone_number,
                    'phone_number_id' => $config->phone_number_id,
                    'waba_id' => $config->waba_id,
                    'business_id' => $config->business_id,
                    'business_name' => $config->business_name,
                    'catalog_id' => $config->catalog_id,
                    'connected_at' => $config->connected_at,
                    'bot_settings' => $config->bot_settings ? json_decode($config->bot_settings, true) : null
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('WhatsApp getStatus error: ' . $e->getMessage());
            return response()->json([
                'status' => 0,
                'message' => 'Failed to get status'
            ], 500);
        }
    }

    /**
     * Exchange OAuth code for access token
     * POST /api/seller/whatsapp/exchange-token
     */
    public function exchangeToken(Request $request)
    {
        try {
            $code = $request->input('code');
            $whAccountId = $request->input('wh_account_id');

            if (!$code || !$whAccountId) {
                return response()->json([
                    'status' => 0,
                    'message' => 'code and wh_account_id are required'
                ]);
            }

            Log::info("Exchanging OAuth code for wh_account_id: {$whAccountId}");

            // Exchange code for access token with Meta
            $response = Http::get('https://graph.facebook.com/v21.0/oauth/access_token', [
                'client_id' => $this->metaAppId,
                'client_secret' => $this->metaAppSecret,
                'code' => $code
            ]);

            if (!$response->successful()) {
                Log::error('Meta token exchange failed: ' . $response->body());
                return response()->json([
                    'status' => 0,
                    'message' => 'Failed to exchange token with Meta'
                ]);
            }

            $tokenData = $response->json();
            $accessToken = $tokenData['access_token'] ?? null;

            if (!$accessToken) {
                return response()->json([
                    'status' => 0,
                    'message' => 'No access token received from Meta'
                ]);
            }

            Log::info("Access token received for wh_account_id: {$whAccountId}");

            // Get or create seller config
            $config = SellerWhatsappConfig::updateOrCreate(
                ['wh_account_id' => $whAccountId],
                [
                    'access_token' => $accessToken,
                    'connection_status' => 'connecting',
                    'updated_at' => now()
                ]
            );

            // If we already have phone_number_id from session info (Embedded Signup flow),
            // fetch phone details and mark as connected
            if ($config->phone_number_id) {
                Log::info("Phone number ID exists, fetching details...");
                $this->fetchPhoneNumberDetails($config);
            } else {
                // Fallback: try to get WABA info (for non-Embedded Signup flow)
                $this->fetchAndSaveWabaInfo($config, $accessToken);
            }

            // Refresh config to get updated values
            $config->refresh();

            return response()->json([
                'status' => 1,
                'message' => 'Token exchanged successfully',
                'data' => [
                    'is_connected' => $config->is_connected,
                    'connection_status' => $config->connection_status
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('WhatsApp exchangeToken error: ' . $e->getMessage());
            return response()->json([
                'status' => 0,
                'message' => 'Failed to exchange token: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Save session info from Embedded Signup
     * POST /api/seller/whatsapp/session-info
     */
    public function saveSessionInfo(Request $request)
    {
        try {
            $whAccountId = $request->input('wh_account_id');
            $wabaId = $request->input('waba_id');
            $phoneNumberId = $request->input('phone_number_id');
            $businessId = $request->input('business_id');

            if (!$whAccountId) {
                return response()->json([
                    'status' => 0,
                    'message' => 'wh_account_id is required'
                ]);
            }

            Log::info("Saving session info for wh_account_id: {$whAccountId}");
            Log::info("WABA ID: {$wabaId}, Phone Number ID: {$phoneNumberId}");

            $config = SellerWhatsappConfig::updateOrCreate(
                ['wh_account_id' => $whAccountId],
                [
                    'waba_id' => $wabaId,
                    'phone_number_id' => $phoneNumberId,
                    'business_id' => $businessId,
                    'connection_status' => 'connecting',
                    'updated_at' => now()
                ]
            );

            // If we have access token, fetch phone number details
            if ($config->access_token && $phoneNumberId) {
                $this->fetchPhoneNumberDetails($config);
            }

            return response()->json([
                'status' => 1,
                'message' => 'Session info saved successfully'
            ]);
        } catch (\Exception $e) {
            Log::error('WhatsApp saveSessionInfo error: ' . $e->getMessage());
            return response()->json([
                'status' => 0,
                'message' => 'Failed to save session info'
            ], 500);
        }
    }

    /**
     * Disconnect WhatsApp
     * POST /api/seller/whatsapp/disconnect
     */
    public function disconnect(Request $request)
    {
        try {
            $whAccountId = $request->input('wh_account_id');

            if (!$whAccountId) {
                return response()->json([
                    'status' => 0,
                    'message' => 'wh_account_id is required'
                ]);
            }

            $config = SellerWhatsappConfig::where('wh_account_id', $whAccountId)->first();

            if ($config) {
                $config->update([
                    'is_connected' => false,
                    'connection_status' => 'disconnected',
                    'access_token' => null,
                    'disconnected_at' => now()
                ]);
            }

            return response()->json([
                'status' => 1,
                'message' => 'WhatsApp disconnected successfully'
            ]);
        } catch (\Exception $e) {
            Log::error('WhatsApp disconnect error: ' . $e->getMessage());
            return response()->json([
                'status' => 0,
                'message' => 'Failed to disconnect'
            ], 500);
        }
    }

    /**
     * Sync products to WhatsApp Catalog
     * POST /api/seller/whatsapp/sync-catalog
     */
    public function syncCatalog(Request $request)
    {
        try {
            $whAccountId = $request->input('wh_account_id');

            if (!$whAccountId) {
                return response()->json([
                    'status' => 0,
                    'message' => 'wh_account_id is required'
                ]);
            }

            $config = SellerWhatsappConfig::where('wh_account_id', $whAccountId)->first();

            if (!$config || !$config->is_connected) {
                return response()->json([
                    'status' => 0,
                    'message' => 'WhatsApp not connected'
                ]);
            }

            if (!$config->catalog_id) {
                return response()->json([
                    'status' => 0,
                    'message' => 'No catalog ID configured. Please set up a catalog in Meta Business Manager.'
                ]);
            }

            // Get seller's products
            $products = DB::table('products')
                ->where('wh_account_id', $whAccountId)
                ->where('status', 1)
                ->get();

            $synced = 0;
            $errors = [];

            foreach ($products as $product) {
                try {
                    // Create/update product in Meta catalog
                    $response = Http::withHeaders([
                        'Authorization' => 'Bearer ' . $config->access_token
                    ])->post("https://graph.facebook.com/v21.0/{$config->catalog_id}/products", [
                        'retailer_id' => $product->id,
                        'availability' => $product->stock > 0 ? 'in stock' : 'out of stock',
                        'brand' => $product->brand ?? '',
                        'category' => $product->category_name ?? 'Other',
                        'description' => $product->description ?? '',
                        'image_url' => $product->image ?? '',
                        'name' => $product->name,
                        'price' => ($product->price * 100) . ' ' . ($product->currency ?? 'USD'),
                        'url' => config('app.url') . '/products/' . $product->id
                    ]);

                    if ($response->successful()) {
                        $synced++;
                    } else {
                        $errors[] = "Product {$product->id}: " . $response->body();
                    }
                } catch (\Exception $e) {
                    $errors[] = "Product {$product->id}: " . $e->getMessage();
                }
            }

            $config->update([
                'last_catalog_sync' => now(),
                'catalog_product_count' => $synced
            ]);

            return response()->json([
                'status' => 1,
                'message' => "Synced {$synced} products to WhatsApp Catalog",
                'data' => [
                    'synced' => $synced,
                    'total' => $products->count(),
                    'errors' => count($errors) > 0 ? $errors : null
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('WhatsApp syncCatalog error: ' . $e->getMessage());
            return response()->json([
                'status' => 0,
                'message' => 'Failed to sync catalog: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update bot settings
     * POST /api/seller/whatsapp/bot-settings
     */
    public function updateBotSettings(Request $request)
    {
        try {
            $whAccountId = $request->input('wh_account_id');

            if (!$whAccountId) {
                return response()->json([
                    'status' => 0,
                    'message' => 'wh_account_id is required'
                ]);
            }

            $botSettings = [
                'welcomeMessage' => $request->input('welcomeMessage'),
                'awayMessage' => $request->input('awayMessage'),
                'businessHoursEnabled' => $request->input('businessHoursEnabled'),
                'businessHoursStart' => $request->input('businessHoursStart'),
                'businessHoursEnd' => $request->input('businessHoursEnd'),
                'autoReplyEnabled' => $request->input('autoReplyEnabled'),
                'orderNotificationsEnabled' => $request->input('orderNotificationsEnabled'),
                'catalogEnabled' => $request->input('catalogEnabled'),
            ];

            SellerWhatsappConfig::updateOrCreate(
                ['wh_account_id' => $whAccountId],
                ['bot_settings' => json_encode($botSettings)]
            );

            return response()->json([
                'status' => 1,
                'message' => 'Bot settings saved successfully'
            ]);
        } catch (\Exception $e) {
            Log::error('WhatsApp updateBotSettings error: ' . $e->getMessage());
            return response()->json([
                'status' => 0,
                'message' => 'Failed to save bot settings'
            ], 500);
        }
    }

    // ============================================
    // INTERNAL API ENDPOINTS (for AIBOT webhook)
    // ============================================

    /**
     * Get seller by phone_number_id (for AIBOT webhook)
     * POST /api/internal/whatsapp/get-seller-by-phone
     */
    public function getSellerByPhoneNumberId(Request $request)
    {
        try {
            $phoneNumberId = $request->input('phone_number_id');

            // Validate internal API key
            $apiKey = $request->header('X-Internal-API-Key');
            if ($apiKey !== config('services.internal_api_key')) {
                return response()->json(['status' => 0, 'message' => 'Unauthorized'], 401);
            }

            if (!$phoneNumberId) {
                return response()->json([
                    'status' => 0,
                    'message' => 'phone_number_id is required'
                ]);
            }

            $config = SellerWhatsappConfig::where('phone_number_id', $phoneNumberId)
                ->where('is_connected', true)
                ->first();

            if (!$config) {
                return response()->json([
                    'status' => 0,
                    'message' => 'Seller not found'
                ]);
            }

            // Get seller details
            $seller = DB::table('wh_accounts')
                ->where('id', $config->wh_account_id)
                ->first();

            return response()->json([
                'status' => 1,
                'data' => [
                    'store_id' => $config->wh_account_id,
                    'store_name' => $seller->business_name ?? $config->business_name,
                    'phone_number_id' => $config->phone_number_id,
                    'access_token' => $config->access_token,
                    'waba_id' => $config->waba_id,
                    'catalog_id' => $config->catalog_id,
                    'bot_settings' => $config->bot_settings ? json_decode($config->bot_settings, true) : null
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('getSellerByPhoneNumberId error: ' . $e->getMessage());
            return response()->json([
                'status' => 0,
                'message' => 'Internal error'
            ], 500);
        }
    }

    /**
     * Get seller by display phone number (legacy support)
     * POST /api/internal/whatsapp/get-seller-by-display-phone
     */
    public function getSellerByDisplayPhone(Request $request)
    {
        try {
            $displayPhone = $request->input('display_phone');

            // Validate internal API key
            $apiKey = $request->header('X-Internal-API-Key');
            if ($apiKey !== config('services.internal_api_key')) {
                return response()->json(['status' => 0, 'message' => 'Unauthorized'], 401);
            }

            if (!$displayPhone) {
                return response()->json([
                    'status' => 0,
                    'message' => 'display_phone is required'
                ]);
            }

            $config = SellerWhatsappConfig::where('display_phone_number', $displayPhone)
                ->where('is_connected', true)
                ->first();

            if (!$config) {
                return response()->json([
                    'status' => 0,
                    'message' => 'Seller not found'
                ]);
            }

            return response()->json([
                'status' => 1,
                'data' => [
                    'store_id' => $config->wh_account_id,
                    'store_name' => $config->business_name
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('getSellerByDisplayPhone error: ' . $e->getMessage());
            return response()->json([
                'status' => 0,
                'message' => 'Internal error'
            ], 500);
        }
    }

    // ============================================
    // CATALOG MANAGEMENT
    // ============================================

    /**
     * Create catalog for seller (called after WhatsApp connection)
     * POST /api/seller/whatsapp/create-catalog
     */
    public function createCatalog(Request $request)
    {
        try {
            $whAccountId = $request->input('wh_account_id');

            if (!$whAccountId) {
                return response()->json([
                    'status' => 0,
                    'message' => 'wh_account_id is required'
                ]);
            }

            $config = SellerWhatsappConfig::where('wh_account_id', $whAccountId)->first();

            if (!$config || !$config->is_connected) {
                return response()->json([
                    'status' => 0,
                    'message' => 'WhatsApp not connected'
                ]);
            }

            if ($config->catalog_id) {
                return response()->json([
                    'status' => 1,
                    'message' => 'Catalog already exists',
                    'data' => ['catalog_id' => $config->catalog_id]
                ]);
            }

            // Get seller/store name for catalog
            $storeName = $config->business_name ?? $config->verified_name ?? "Store_{$whAccountId}";

            // Create catalog using Meta Commerce API
            $this->lastCatalogError = null;
            $catalogId = $this->createMetaCatalog($config, $storeName);

            if ($catalogId) {
                $config->update(['catalog_id' => $catalogId]);

                return response()->json([
                    'status' => 1,
                    'message' => 'Catalog created successfully',
                    'data' => ['catalog_id' => $catalogId]
                ]);
            }

            return response()->json([
                'status' => 0,
                'message' => 'Failed to create catalog: ' . ($this->lastCatalogError ?? 'Unknown error')
            ]);
        } catch (\Exception $e) {
            Log::error('createCatalog error: ' . $e->getMessage());
            return response()->json([
                'status' => 0,
                'message' => 'Failed to create catalog: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create Meta Commerce Catalog
     */
    private function createMetaCatalog($config, $storeName)
    {
        try {
            // First, check if WABA already has a catalog connected
            $existingCatalog = $this->getExistingCatalogForWaba($config);
            if ($existingCatalog) {
                Log::info("Using existing catalog: {$existingCatalog}");
                return $existingCatalog;
            }

            // Create new catalog under the business
            $businessId = $config->business_id ?? $this->metaBusinessId;

            Log::info("Creating catalog for business_id: {$businessId}, store: {$storeName}");

            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $config->access_token
            ])->post("https://graph.facebook.com/v21.0/{$businessId}/owned_product_catalogs", [
                'name' => "{$storeName} - WhatsApp Catalog",
                'vertical' => 'commerce'
            ]);

            if ($response->successful()) {
                $data = $response->json();
                $catalogId = $data['id'] ?? null;

                if ($catalogId) {
                    Log::info("Created catalog: {$catalogId} for store: {$storeName}");

                    // Connect catalog to WABA
                    $this->connectCatalogToWaba($config, $catalogId);

                    return $catalogId;
                }
            } else {
                $errorBody = $response->json();
                $errorMessage = $errorBody['error']['message'] ?? $response->body();
                Log::error("Failed to create catalog: {$errorMessage}");

                // Store error for returning to frontend
                $this->lastCatalogError = $errorMessage;
            }

            return null;
        } catch (\Exception $e) {
            Log::error('createMetaCatalog error: ' . $e->getMessage());
            $this->lastCatalogError = $e->getMessage();
            return null;
        }
    }

    private $lastCatalogError = null;

    /**
     * Get existing catalog connected to WABA
     */
    private function getExistingCatalogForWaba($config)
    {
        try {
            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $config->access_token
            ])->get("https://graph.facebook.com/v21.0/{$config->waba_id}/product_catalogs");

            if ($response->successful()) {
                $data = $response->json();
                $catalogs = $data['data'] ?? [];

                if (!empty($catalogs)) {
                    return $catalogs[0]['id'];
                }
            }

            return null;
        } catch (\Exception $e) {
            Log::error('getExistingCatalogForWaba error: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Connect catalog to WhatsApp Business Account
     */
    private function connectCatalogToWaba($config, $catalogId)
    {
        try {
            // Connect catalog to WABA
            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $config->access_token
            ])->post("https://graph.facebook.com/v21.0/{$config->waba_id}/product_catalogs", [
                'catalog_id' => $catalogId
            ]);

            if ($response->successful()) {
                Log::info("Catalog {$catalogId} connected to WABA {$config->waba_id}");
                return true;
            } else {
                Log::warning('Failed to connect catalog to WABA: ' . $response->body());
            }

            return false;
        } catch (\Exception $e) {
            Log::error('connectCatalogToWaba error: ' . $e->getMessage());
            return false;
        }
    }

    // ============================================
    // HELPER METHODS
    // ============================================

    /**
     * Fetch WABA info from Meta API
     */
    private function fetchAndSaveWabaInfo($config, $accessToken)
    {
        try {
            // Get list of WABAs accessible by this token
            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $accessToken
            ])->get('https://graph.facebook.com/v21.0/debug_token', [
                'input_token' => $accessToken
            ]);

            if ($response->successful()) {
                $data = $response->json();
                Log::info('Token debug info: ' . json_encode($data));

                // Get WABA from business
                $wabaResponse = Http::withHeaders([
                    'Authorization' => 'Bearer ' . $accessToken
                ])->get("https://graph.facebook.com/v21.0/{$this->metaBusinessId}/owned_whatsapp_business_accounts");

                if ($wabaResponse->successful()) {
                    $wabas = $wabaResponse->json()['data'] ?? [];
                    if (!empty($wabas)) {
                        $waba = $wabas[0];
                        $config->update([
                            'waba_id' => $waba['id'],
                            'business_name' => $waba['name'] ?? null
                        ]);

                        // Get phone numbers for this WABA
                        $this->fetchPhoneNumbersForWaba($config, $waba['id'], $accessToken);
                    }
                }
            }
        } catch (\Exception $e) {
            Log::error('fetchAndSaveWabaInfo error: ' . $e->getMessage());
        }
    }

    /**
     * Fetch phone numbers for a WABA
     */
    private function fetchPhoneNumbersForWaba($config, $wabaId, $accessToken)
    {
        try {
            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $accessToken
            ])->get("https://graph.facebook.com/v21.0/{$wabaId}/phone_numbers");

            if ($response->successful()) {
                $phones = $response->json()['data'] ?? [];
                if (!empty($phones)) {
                    $phone = $phones[0];
                    $config->update([
                        'phone_number_id' => $phone['id'],
                        'display_phone_number' => $phone['display_phone_number'] ?? null,
                        'verified_name' => $phone['verified_name'] ?? null,
                        'is_connected' => true,
                        'connection_status' => 'connected',
                        'connected_at' => now()
                    ]);

                    Log::info("WhatsApp connected: {$phone['display_phone_number']} (ID: {$phone['id']})");
                }
            }
        } catch (\Exception $e) {
            Log::error('fetchPhoneNumbersForWaba error: ' . $e->getMessage());
        }
    }

    /**
     * Fetch phone number details
     */
    private function fetchPhoneNumberDetails($config)
    {
        try {
            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $config->access_token
            ])->get("https://graph.facebook.com/v21.0/{$config->phone_number_id}");

            if ($response->successful()) {
                $phone = $response->json();
                $config->update([
                    'display_phone_number' => $phone['display_phone_number'] ?? null,
                    'verified_name' => $phone['verified_name'] ?? null,
                    'is_connected' => true,
                    'connection_status' => 'connected',
                    'connected_at' => now()
                ]);

                Log::info("Phone number details fetched: " . ($phone['display_phone_number'] ?? 'N/A'));
            } else {
                // Even if Meta API fails, we have the essential data from session info
                // Mark as connected since we have phone_number_id, waba_id, and access_token
                Log::warning("Could not fetch phone details from Meta: " . $response->body());
                Log::info("Marking as connected with existing session info data");
                $config->update([
                    'is_connected' => true,
                    'connection_status' => 'connected',
                    'connected_at' => now()
                ]);
            }
        } catch (\Exception $e) {
            Log::error('fetchPhoneNumberDetails error: ' . $e->getMessage());
            // Still mark as connected since we have the essential data
            Log::info("Marking as connected despite error (we have essential data)");
            $config->update([
                'is_connected' => true,
                'connection_status' => 'connected',
                'connected_at' => now()
            ]);
        }
    }
}
