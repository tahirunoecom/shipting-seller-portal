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
    private $lastCatalogError = null;

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
                    'message' => 'No catalog ID configured. Please set up a catalog first.'
                ]);
            }

            // Check catalog vertical and auto-fix if needed
            $catalogCheck = $this->checkAndFixCatalogVertical($config);
            Log::info("Catalog check result: " . json_encode($catalogCheck));

            if ($catalogCheck['fixed']) {
                // Reload config with new catalog_id
                $config->refresh();
                Log::info("Catalog fixed - new catalog_id: " . $config->catalog_id);
            }

            // Store catalog info for debug
            $catalogDebug = [
                'catalog_id' => $config->catalog_id,
                'check_result' => $catalogCheck
            ];

            // Get seller's products from API
            $products = $this->getSellerProducts($whAccountId);

            if (empty($products)) {
                return response()->json([
                    'status' => 1,
                    'message' => 'No products found to sync',
                    'data' => ['synced' => 0, 'total' => 0]
                ]);
            }

            // DEBUG: Log raw product structure to understand field names
            $firstProduct = $products[0] ?? [];
            Log::info("DEBUG - First product raw data: " . json_encode($firstProduct));
            Log::info("DEBUG - Available fields: " . implode(', ', array_keys($firstProduct)));

            $synced = 0;
            $errors = [];
            $seenIds = [];
            $debugSamples = []; // Store first 2 products for debugging

            foreach ($products as $product) {
                try {
                    // Get product ID
                    $productId = $product['product_id'] ?? $product['id'] ?? null;
                    if (!$productId) {
                        Log::warning("Skipping product - no product_id");
                        continue;
                    }

                    $productId = trim((string) $productId);

                    // Skip duplicates
                    if (in_array($productId, $seenIds)) {
                        continue;
                    }
                    $seenIds[] = $productId;

                    // Clean image URL
                    $rawImage = $product['images'] ?? $product['image'] ?? '';
                    if (is_string($rawImage) && strpos($rawImage, ',') !== false) {
                        $imageUrl = trim(explode(',', $rawImage)[0]);
                    } else {
                        $imageUrl = (string) $rawImage;
                    }

                    if ($imageUrl && !str_starts_with($imageUrl, 'http')) {
                        $imageUrl = "https://stageshipperapi.thedelivio.com/{$imageUrl}";
                    }

                    // Fix double slashes in URL (except after http:// or https://)
                    $imageUrl = preg_replace('#(?<!:)//+#', '/', $imageUrl);

                    // URL encode spaces in image URL
                    $imageUrl = str_replace(' ', '%20', $imageUrl);

                    if (empty($imageUrl) || strlen($imageUrl) < 5) {
                        $imageUrl = "https://via.placeholder.com/500";
                    }

                    // Format price as "12.99 USD"
                    $rawPrice = $product['product_price'] ?? $product['price'] ?? 0;
                    $priceClean = str_replace(['$', ','], '', (string) $rawPrice);
                    $priceVal = floatval($priceClean);
                    if ($priceVal <= 0) {
                        $priceVal = 1.00;
                    }
                    $priceStr = number_format($priceVal, 2, '.', '') . ' USD';

                    // Get title
                    $title = $product['title'] ?? $product['product_name'] ?? $product['name'] ?? '';
                    if (empty($title)) {
                        $title = 'Product ' . $productId;
                    }

                    // Build batch request with retailer_id (Meta's standard field)
                    $productData = [
                        'id' => (string) $productId,
                        'retailer_id' => (string) $productId,  // Required by Meta
                        'title' => $title,
                        'name' => $title,  // Some Meta APIs use 'name' instead of 'title'
                        'description' => substr($product['description'] ?? $title, 0, 5000),
                        'availability' => 'in stock',
                        'condition' => 'new',
                        'price' => $priceStr,
                        'brand' => $product['brand'] ?? $product['store_name'] ?? 'Store',
                        'link' => 'https://shipting.com/products/' . $productId,
                        'image_link' => $imageUrl,
                        'url' => 'https://shipting.com/products/' . $productId,
                        'image_url' => $imageUrl
                    ];

                    // Log what we're sending
                    Log::info("Syncing product {$productId}: " . json_encode($productData));

                    // Store first 2 samples for debug response
                    if (count($debugSamples) < 2) {
                        $debugSamples[] = [
                            'raw_product' => $product,
                            'sent_to_meta' => $productData,
                            'meta_response' => null  // Will be filled after API call
                        ];
                    }

                    // Use DIRECT products API (synchronous, immediate feedback)
                    // Field names: retailer_id, name, description, availability, condition, price, url, image_url, brand
                    $response = Http::withToken($config->access_token)
                        ->post("https://graph.facebook.com/v21.0/{$config->catalog_id}/products", [
                            'retailer_id' => (string) $productId,
                            'name' => $title,
                            'description' => substr($product['description'] ?? $title, 0, 5000),
                            'availability' => 'in stock',
                            'condition' => 'new',
                            'price' => (int)($priceVal * 100),  // Price in cents
                            'currency' => 'USD',
                            'url' => 'https://shipting.com/products/' . $productId,
                            'image_url' => $imageUrl,
                            'brand' => $product['brand'] ?? $product['store_name'] ?? 'Store'
                        ]);

                    $metaResponse = $response->json();

                    // Log response
                    Log::info("Meta API response for {$productId}: " . json_encode($metaResponse));

                    // Update debug sample with response
                    $sampleIndex = count($debugSamples) - 1;
                    if ($sampleIndex >= 0 && $sampleIndex < 2) {
                        $debugSamples[$sampleIndex]['meta_response'] = $metaResponse;
                    }

                    if ($response->successful() && isset($metaResponse['id'])) {
                        $synced++;
                        Log::info("Product {$productId} created with FB ID: " . $metaResponse['id']);
                    } else {
                        $errorMsg = $metaResponse['error']['message'] ?? $response->body();
                        Log::error("Product {$productId} API error: {$errorMsg}");
                        $errors[] = "Product {$productId}: {$errorMsg}";
                    }

                    // Rate limiting
                    usleep(500000);

                } catch (\Exception $e) {
                    Log::error("Product sync exception: " . $e->getMessage());
                    $errors[] = "Product: " . $e->getMessage();
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
                    'total' => count($products),
                    'errors' => count($errors) > 0 ? array_slice($errors, 0, 10) : null,
                    'catalog_debug' => $catalogDebug,  // Shows catalog check info
                    'debug_samples' => $debugSamples // Shows raw data vs what was sent to Meta
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
     * Get seller's products from getMasterProducts API
     */
    private function getSellerProducts($whAccountId)
    {
        try {
            $limit = 5; // Testing limit

            $apiUrl = 'https://stageshipperapi.thedelivio.com/api/getMasterProducts';

            Log::info("Calling getMasterProducts API for wh_account_id: {$whAccountId}");

            $response = Http::post($apiUrl, [
                'wh_account_id' => (string) $whAccountId,
                'upc' => '',
                'ai_category_id' => '',
                'ai_product_id' => '',
                'product_id' => '',
                'search_string' => '',
                'zipcode' => '',
                'user_id' => '',
                'page' => '1',
                'items' => (string) $limit
            ]);

            if ($response->successful()) {
                $responseData = $response->json();
                Log::info("getMasterProducts response: " . json_encode($responseData));

                $apiData = $responseData['data'] ?? [];
                $products = $apiData['getMasterProducts'] ?? $apiData['products'] ?? [];

                if (!empty($products)) {
                    Log::info("Found " . count($products) . " products");
                    return $products;
                }
            } else {
                Log::warning('getMasterProducts API failed: ' . $response->body());
            }

            return [];
        } catch (\Exception $e) {
            Log::error('getSellerProducts error: ' . $e->getMessage());
            return [];
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
    // CATALOG MANAGEMENT
    // ============================================

    /**
     * List available catalogs for the seller's business
     * POST /api/seller/whatsapp/list-catalogs
     */
    public function listCatalogs(Request $request)
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

            if (!$config || !$config->access_token) {
                return response()->json([
                    'status' => 0,
                    'message' => 'WhatsApp not connected or no access token'
                ]);
            }

            // Get catalogs from the business
            $businessId = $config->business_id ?? $this->metaBusinessId;

            $response = Http::withToken($config->access_token)
                ->get("https://graph.facebook.com/v21.0/{$businessId}/owned_product_catalogs", [
                    'fields' => 'id,name,vertical,product_count'
                ]);

            if (!$response->successful()) {
                $error = $response->json()['error']['message'] ?? 'Unknown error';
                return response()->json([
                    'status' => 0,
                    'message' => "Failed to fetch catalogs: {$error}"
                ]);
            }

            $catalogs = $response->json()['data'] ?? [];

            // Mark commerce catalogs and current selection
            foreach ($catalogs as &$catalog) {
                $catalog['is_commerce'] = ($catalog['vertical'] ?? '') === 'commerce';
                $catalog['is_current'] = $catalog['id'] === $config->catalog_id;
            }

            return response()->json([
                'status' => 1,
                'data' => [
                    'catalogs' => $catalogs,
                    'current_catalog_id' => $config->catalog_id
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('WhatsApp listCatalogs error: ' . $e->getMessage());
            return response()->json([
                'status' => 0,
                'message' => 'Failed to list catalogs: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update catalog ID (switch to a different catalog)
     * POST /api/seller/whatsapp/update-catalog
     */
    public function updateCatalog(Request $request)
    {
        try {
            $whAccountId = $request->input('wh_account_id');
            $catalogId = $request->input('catalog_id');

            if (!$whAccountId || !$catalogId) {
                return response()->json([
                    'status' => 0,
                    'message' => 'wh_account_id and catalog_id are required'
                ]);
            }

            $config = SellerWhatsappConfig::where('wh_account_id', $whAccountId)->first();

            if (!$config) {
                return response()->json([
                    'status' => 0,
                    'message' => 'WhatsApp configuration not found'
                ]);
            }

            // Verify the catalog exists and is accessible
            $verifyResponse = Http::withToken($config->access_token)
                ->get("https://graph.facebook.com/v21.0/{$catalogId}", [
                    'fields' => 'id,name,vertical'
                ]);

            if (!$verifyResponse->successful()) {
                $error = $verifyResponse->json()['error']['message'] ?? 'Unknown error';
                return response()->json([
                    'status' => 0,
                    'message' => "Cannot access catalog: {$error}"
                ]);
            }

            $catalogInfo = $verifyResponse->json();
            $vertical = $catalogInfo['vertical'] ?? 'unknown';

            // Update the catalog_id
            $config->update([
                'catalog_id' => $catalogId
            ]);

            return response()->json([
                'status' => 1,
                'message' => 'Catalog updated successfully',
                'data' => [
                    'catalog_id' => $catalogId,
                    'catalog_name' => $catalogInfo['name'] ?? null,
                    'catalog_vertical' => $vertical,
                    'warning' => ($vertical !== 'commerce') ? "Warning: Catalog vertical is '{$vertical}', not 'commerce'. Products may not sync correctly." : null
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('WhatsApp updateCatalog error: ' . $e->getMessage());
            return response()->json([
                'status' => 0,
                'message' => 'Failed to update catalog: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create a NEW commerce catalog for seller
     * POST /api/seller/whatsapp/create-catalog
     *
     * Always creates a new commerce catalog (even if one already exists)
     */
    public function createCatalog(Request $request)
    {
        try {
            $whAccountId = $request->input('wh_account_id');
            $catalogName = $request->input('name'); // Optional custom name

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

            // Get seller/store name for catalog
            $storeName = $catalogName ?? $config->business_name ?? $config->verified_name ?? "Store_{$whAccountId}";

            // Always create a NEW commerce catalog
            $businessId = $config->business_id ?? $this->metaBusinessId;

            Log::info("Creating NEW commerce catalog for business_id: {$businessId}, name: {$storeName}");

            $response = Http::withToken($config->access_token)
                ->post("https://graph.facebook.com/v21.0/{$businessId}/owned_product_catalogs", [
                    'name' => "{$storeName} - Commerce Catalog",
                    'vertical' => 'commerce'
                ]);

            if ($response->successful()) {
                $data = $response->json();
                $catalogId = $data['id'] ?? null;

                if ($catalogId) {
                    // Update config with new catalog
                    $config->update(['catalog_id' => $catalogId]);

                    // Try to connect to WABA
                    $this->connectCatalogToWaba($config, $catalogId);

                    Log::info("Commerce catalog created: {$catalogId}");

                    return response()->json([
                        'status' => 1,
                        'message' => 'Commerce catalog created successfully!',
                        'data' => [
                            'catalog_id' => $catalogId,
                            'catalog_name' => "{$storeName} - Commerce Catalog",
                            'catalog_vertical' => 'commerce'
                        ]
                    ]);
                }
            }

            $errorBody = $response->json();
            $errorMsg = $errorBody['error']['message'] ?? $response->body();
            Log::error("Failed to create commerce catalog: {$errorMsg}");

            return response()->json([
                'status' => 0,
                'message' => 'Failed to create catalog: ' . $errorMsg
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
     * Find existing catalog or create new one (used internally during auto-setup)
     */
    private function findOrCreateCatalog($config, $storeName)
    {
        // Step 1: Check if WABA already has a catalog connected
        $existingWabaCatalog = $this->getExistingCatalogForWaba($config);
        if ($existingWabaCatalog) {
            Log::info("Using existing WABA catalog: {$existingWabaCatalog}");
            return $existingWabaCatalog;
        }

        // Step 2: Check if business has any existing catalogs we can use
        $businessCatalog = $this->getExistingCatalogForBusiness($config);
        if ($businessCatalog) {
            Log::info("Found existing business catalog: {$businessCatalog}");
            // Try to connect it to WABA
            $this->connectCatalogToWaba($config, $businessCatalog);
            return $businessCatalog;
        }

        // Step 3: Try to create a new catalog
        return $this->createNewCatalog($config, $storeName);
    }

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
                Log::info("Found " . count($catalogs) . " catalogs for WABA {$config->waba_id}");

                if (!empty($catalogs)) {
                    return $catalogs[0]['id'];
                }
            } else {
                Log::warning("Could not fetch WABA catalogs: " . $response->body());
            }

            return null;
        } catch (\Exception $e) {
            Log::error('getExistingCatalogForWaba error: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Get existing catalog from business account
     */
    private function getExistingCatalogForBusiness($config)
    {
        try {
            $businessId = $config->business_id;
            if (!$businessId) {
                return null;
            }

            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $config->access_token
            ])->get("https://graph.facebook.com/v21.0/{$businessId}/owned_product_catalogs");

            if ($response->successful()) {
                $data = $response->json();
                $catalogs = $data['data'] ?? [];
                Log::info("Found " . count($catalogs) . " catalogs for business {$businessId}");

                if (!empty($catalogs)) {
                    // Return the first commerce catalog
                    foreach ($catalogs as $catalog) {
                        if (($catalog['vertical'] ?? '') === 'commerce' || !isset($catalog['vertical'])) {
                            return $catalog['id'];
                        }
                    }
                    return $catalogs[0]['id'];
                }
            } else {
                Log::warning("Could not fetch business catalogs: " . $response->body());
            }

            return null;
        } catch (\Exception $e) {
            Log::error('getExistingCatalogForBusiness error: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Create a new catalog
     */
    private function createNewCatalog($config, $storeName)
    {
        try {
            $businessId = $config->business_id;
            if (!$businessId) {
                $this->lastCatalogError = "No business ID available";
                return null;
            }

            Log::info("Creating new catalog for business_id: {$businessId}, store: {$storeName}");

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
                    $this->connectCatalogToWaba($config, $catalogId);
                    return $catalogId;
                }
            } else {
                $errorBody = $response->json();
                $this->lastCatalogError = $errorBody['error']['message'] ?? $response->body();
                Log::error("Failed to create catalog: {$this->lastCatalogError}");
            }

            return null;
        } catch (\Exception $e) {
            Log::error('createNewCatalog error: ' . $e->getMessage());
            $this->lastCatalogError = $e->getMessage();
            return null;
        }
    }

    /**
     * Check catalog vertical and create commerce catalog if needed
     */
    private function checkAndFixCatalogVertical($config)
    {
        try {
            // Get catalog info
            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $config->access_token
            ])->get("https://graph.facebook.com/v21.0/{$config->catalog_id}", [
                'fields' => 'id,name,vertical'
            ]);

            if ($response->successful()) {
                $catalogData = $response->json();
                $vertical = $catalogData['vertical'] ?? 'unknown';

                Log::info("Current catalog vertical: {$vertical}");

                // If not commerce, create a new commerce catalog
                if ($vertical !== 'commerce') {
                    Log::warning("Catalog vertical is '{$vertical}', need 'commerce'. Creating new catalog...");

                    $storeName = $config->business_name ?? $config->verified_name ?? "Store_{$config->wh_account_id}";
                    $newCatalogId = $this->createNewCatalog($config, $storeName);

                    if ($newCatalogId) {
                        $config->update(['catalog_id' => $newCatalogId]);
                        return ['fixed' => true, 'new_catalog_id' => $newCatalogId, 'old_vertical' => $vertical];
                    }
                }
            }

            return ['fixed' => false];
        } catch (\Exception $e) {
            Log::error('checkAndFixCatalogVertical error: ' . $e->getMessage());
            return ['fixed' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Connect catalog to WhatsApp Business Account
     */
    private function connectCatalogToWaba($config, $catalogId)
    {
        try {
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
    // PHONE REGISTRATION & VERIFICATION
    // ============================================

    /**
     * Request verification code (OTP) for phone number
     * POST /api/seller/whatsapp/request-code
     *
     * @param code_method: SMS or VOICE
     * @param language: en, es, pt_BR, etc.
     *
     * Note: This is used when phone number is in PENDING registration status
     * The OTP code is sent to the phone number to verify ownership
     */
    public function requestVerificationCode(Request $request)
    {
        try {
            $whAccountId = $request->input('wh_account_id');
            $codeMethod = $request->input('code_method', 'SMS'); // SMS or VOICE
            $language = $request->input('language', 'en');

            if (!$whAccountId) {
                return response()->json([
                    'status' => 0,
                    'message' => 'wh_account_id is required'
                ]);
            }

            $config = SellerWhatsappConfig::where('wh_account_id', $whAccountId)->first();

            if (!$config) {
                return response()->json([
                    'status' => 0,
                    'message' => 'WhatsApp configuration not found'
                ]);
            }

            if (!$config->access_token) {
                return response()->json([
                    'status' => 0,
                    'message' => 'WhatsApp not connected - no access token'
                ]);
            }

            if (!$config->phone_number_id) {
                return response()->json([
                    'status' => 0,
                    'message' => 'Phone number not configured - please reconnect WhatsApp'
                ]);
            }

            Log::info("Requesting verification code for phone_number_id: {$config->phone_number_id}, method: {$codeMethod}, language: {$language}");

            // Request verification code from Meta
            // The API supports: SMS, VOICE
            $response = Http::withToken($config->access_token)
                ->post("https://graph.facebook.com/v21.0/{$config->phone_number_id}/request_code", [
                    'code_method' => strtoupper($codeMethod),
                    'language' => $language
                ]);

            $responseData = $response->json();
            Log::info("Request code response: " . json_encode($responseData));

            if ($response->successful() && ($responseData['success'] ?? false)) {
                return response()->json([
                    'status' => 1,
                    'message' => "Verification code sent via {$codeMethod}. Please check your phone.",
                    'data' => [
                        'method' => $codeMethod,
                        'phone_number' => $config->display_phone_number
                    ]
                ]);
            }

            // Extract detailed error information from Meta API response
            $errorMsg = $responseData['error']['message'] ?? 'Unknown error from Meta API';
            $errorCode = $responseData['error']['code'] ?? null;
            $errorSubcode = $responseData['error']['error_subcode'] ?? null;
            $errorType = $responseData['error']['type'] ?? null;

            Log::error("Request code failed - Code: {$errorCode}, Subcode: {$errorSubcode}, Type: {$errorType}, Message: {$errorMsg}");
            Log::error("Full error response: " . json_encode($responseData));

            // Provide user-friendly error messages based on common error codes
            $userMessage = $errorMsg;

            if ($errorCode == 100) {
                if (strpos($errorMsg, 'phone_number_id') !== false) {
                    $userMessage = 'Invalid phone number configuration. Please reconnect your WhatsApp account.';
                } elseif (strpos($errorMsg, 'code_method') !== false) {
                    $userMessage = 'Invalid verification method. Please try SMS or Voice call.';
                }
            } elseif ($errorCode == 131030 || strpos($errorMsg, 'rate limit') !== false) {
                $userMessage = 'Too many code requests. Please wait 24 hours before requesting a new code.';
            } elseif ($errorCode == 136025) {
                $userMessage = 'Phone number is not eligible for verification. It may already be registered.';
            } elseif ($errorCode == 136024) {
                // Error 136024: Phone is already registered/connected - no need for verification code
                $userMessage = 'This phone number is already registered and connected. Verification code is not needed.';
            } elseif (strpos($errorMsg, 'already registered') !== false) {
                $userMessage = 'This phone number is already registered with WhatsApp.';
            } elseif (strpos($errorMsg, 'not pending') !== false) {
                $userMessage = 'Phone number is not in pending state. Registration may already be complete.';
            }

            return response()->json([
                'status' => 0,
                'message' => $userMessage,
                'debug' => [
                    'error_code' => $errorCode,
                    'error_subcode' => $errorSubcode,
                    'original_message' => $errorMsg
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('requestVerificationCode error: ' . $e->getMessage());
            Log::error('Exception trace: ' . $e->getTraceAsString());
            return response()->json([
                'status' => 0,
                'message' => 'Request code error: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Verify the OTP code
     * POST /api/seller/whatsapp/verify-code
     */
    public function verifyCode(Request $request)
    {
        try {
            $whAccountId = $request->input('wh_account_id');
            $code = $request->input('code');

            if (!$whAccountId || !$code) {
                return response()->json([
                    'status' => 0,
                    'message' => 'wh_account_id and code are required'
                ]);
            }

            $config = SellerWhatsappConfig::where('wh_account_id', $whAccountId)->first();

            if (!$config || !$config->access_token || !$config->phone_number_id) {
                return response()->json([
                    'status' => 0,
                    'message' => 'WhatsApp not connected or phone number not configured'
                ]);
            }

            Log::info("Verifying code for phone_number_id: {$config->phone_number_id}");

            // Verify the code with Meta
            $response = Http::withToken($config->access_token)
                ->post("https://graph.facebook.com/v21.0/{$config->phone_number_id}/verify_code", [
                    'code' => $code
                ]);

            $responseData = $response->json();
            Log::info("Verify code response: " . json_encode($responseData));

            if ($response->successful() && ($responseData['success'] ?? false)) {
                // Update config to mark as verified
                $config->update([
                    'code_verified' => true,
                    'code_verified_at' => now()
                ]);

                return response()->json([
                    'status' => 1,
                    'message' => 'Phone number verified successfully!'
                ]);
            }

            $error = $responseData['error']['message'] ?? 'Invalid verification code';
            Log::error("Verify code failed: {$error}");

            return response()->json([
                'status' => 0,
                'message' => $error
            ]);
        } catch (\Exception $e) {
            Log::error('verifyCode error: ' . $e->getMessage());
            return response()->json([
                'status' => 0,
                'message' => 'Failed to verify code: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Register phone number with WhatsApp
     * POST /api/seller/whatsapp/register-phone
     *
     * This completes the phone registration process
     *
     * Meta API requires:
     * - messaging_product: "whatsapp" (always required)
     * - pin: 6-digit PIN for two-step verification (required)
     *
     * Note: The PIN will be used for 2FA on this phone number going forward
     */
    public function registerPhone(Request $request)
    {
        try {
            $whAccountId = $request->input('wh_account_id');
            $pin = $request->input('pin'); // 6-digit PIN for 2FA

            if (!$whAccountId) {
                return response()->json([
                    'status' => 0,
                    'message' => 'wh_account_id is required'
                ]);
            }

            $config = SellerWhatsappConfig::where('wh_account_id', $whAccountId)->first();

            if (!$config || !$config->access_token || !$config->phone_number_id) {
                return response()->json([
                    'status' => 0,
                    'message' => 'WhatsApp not connected or phone number not configured'
                ]);
            }

            Log::info("Registering phone_number_id: {$config->phone_number_id}");

            // Meta API requires both messaging_product AND pin for registration
            // If no PIN provided, generate a default one (user can change it later in WhatsApp Manager)
            $registrationPin = $pin;
            if (empty($registrationPin)) {
                // Generate a secure 6-digit PIN
                // Store it in config so user can retrieve it if needed
                $registrationPin = str_pad(mt_rand(0, 999999), 6, '0', STR_PAD_LEFT);
                Log::info("Generated registration PIN for phone_number_id: {$config->phone_number_id}");
            }

            // Register the phone number - BOTH fields are REQUIRED by Meta
            $payload = [
                'messaging_product' => 'whatsapp',
                'pin' => $registrationPin  // Required for 2-step verification setup
            ];

            $response = Http::withToken($config->access_token)
                ->post("https://graph.facebook.com/v21.0/{$config->phone_number_id}/register", $payload);

            $responseData = $response->json();
            Log::info("Register phone response: " . json_encode($responseData));

            if ($response->successful() && ($responseData['success'] ?? false)) {
                $config->update([
                    'is_registered' => true,
                    'registered_at' => now(),
                    // Store PIN hash for reference (don't store plain PIN for security)
                    'two_step_pin_hash' => hash('sha256', $registrationPin)
                ]);

                return response()->json([
                    'status' => 1,
                    'message' => 'Phone number registered successfully with WhatsApp!',
                    'data' => [
                        'pin_generated' => empty($pin), // Let frontend know if PIN was auto-generated
                        'note' => empty($pin) ? 'A 6-digit PIN was generated for two-step verification. You can change it in WhatsApp Manager.' : null
                    ]
                ]);
            }

            $error = $responseData['error']['message'] ?? 'Failed to register phone number';
            $errorCode = $responseData['error']['code'] ?? null;
            Log::error("Register phone failed: {$error} (code: {$errorCode})");

            // Provide helpful error messages based on common error codes
            if (strpos($error, 'already registered') !== false) {
                return response()->json([
                    'status' => 0,
                    'message' => 'This phone number is already registered with WhatsApp. Please check your WhatsApp Manager.'
                ]);
            }

            if (strpos($error, 'pin') !== false) {
                return response()->json([
                    'status' => 0,
                    'message' => 'Two-step verification PIN error. If you previously set a PIN, please provide it.'
                ]);
            }

            return response()->json([
                'status' => 0,
                'message' => $error
            ]);
        } catch (\Exception $e) {
            Log::error('registerPhone error: ' . $e->getMessage());
            return response()->json([
                'status' => 0,
                'message' => 'Failed to register phone: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update WhatsApp Business Profile
     * POST /api/seller/whatsapp/update-profile
     *
     * Updates: about, address, description, email, profile_picture_url, websites, vertical
     */
    public function updateBusinessProfile(Request $request)
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

            if (!$config || !$config->access_token || !$config->phone_number_id) {
                return response()->json([
                    'status' => 0,
                    'message' => 'WhatsApp not connected or phone number not configured'
                ]);
            }

            // Build profile data from request
            $profileData = [];

            if ($request->has('about')) {
                $profileData['about'] = substr($request->input('about'), 0, 139); // Max 139 chars
            }
            if ($request->has('address')) {
                $profileData['address'] = substr($request->input('address'), 0, 256);
            }
            if ($request->has('description')) {
                $profileData['description'] = substr($request->input('description'), 0, 512);
            }
            if ($request->has('email')) {
                $profileData['email'] = $request->input('email');
            }
            if ($request->has('websites')) {
                $websites = $request->input('websites');
                if (is_array($websites)) {
                    $profileData['websites'] = array_slice($websites, 0, 2); // Max 2 websites
                } elseif (is_string($websites)) {
                    $profileData['websites'] = [$websites];
                }
            }
            if ($request->has('vertical')) {
                // Valid verticals: UNDEFINED, OTHER, AUTO, BEAUTY, APPAREL, EDU, ENTERTAIN,
                // EVENT_PLAN, FINANCE, GROCERY, GOVT, HOTEL, HEALTH, NONPROFIT, PROF_SERVICES,
                // RETAIL, TRAVEL, RESTAURANT, NOT_A_BIZ
                $profileData['vertical'] = strtoupper($request->input('vertical'));
            }
            if ($request->has('profile_picture_handle')) {
                $profileData['profile_picture_handle'] = $request->input('profile_picture_handle');
            }

            if (empty($profileData)) {
                return response()->json([
                    'status' => 0,
                    'message' => 'No profile data provided to update'
                ]);
            }

            Log::info("Updating business profile for phone_number_id: {$config->phone_number_id}");
            Log::info("Profile data: " . json_encode($profileData));

            // IMPORTANT: messaging_product is REQUIRED by Meta API
            $profileData['messaging_product'] = 'whatsapp';

            // Update the business profile
            $response = Http::withToken($config->access_token)
                ->post("https://graph.facebook.com/v21.0/{$config->phone_number_id}/whatsapp_business_profile", $profileData);

            $responseData = $response->json();
            Log::info("Update profile response: " . json_encode($responseData));

            if ($response->successful() && ($responseData['success'] ?? false)) {
                return response()->json([
                    'status' => 1,
                    'message' => 'Business profile updated successfully!'
                ]);
            }

            $error = $responseData['error']['message'] ?? 'Failed to update profile';
            Log::error("Update profile failed: {$error}");

            return response()->json([
                'status' => 0,
                'message' => $error
            ]);
        } catch (\Exception $e) {
            Log::error('updateBusinessProfile error: ' . $e->getMessage());
            return response()->json([
                'status' => 0,
                'message' => 'Failed to update profile: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get current business profile
     * POST /api/seller/whatsapp/get-profile
     */
    public function getBusinessProfile(Request $request)
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

            if (!$config || !$config->access_token || !$config->phone_number_id) {
                return response()->json([
                    'status' => 0,
                    'message' => 'WhatsApp not connected or phone number not configured'
                ]);
            }

            // Get business profile from Meta
            $response = Http::withToken($config->access_token)
                ->get("https://graph.facebook.com/v21.0/{$config->phone_number_id}/whatsapp_business_profile", [
                    'fields' => 'about,address,description,email,profile_picture_url,websites,vertical'
                ]);

            $responseData = $response->json();
            Log::info("Get profile response: " . json_encode($responseData));

            if ($response->successful()) {
                $profileData = $responseData['data'][0] ?? [];

                return response()->json([
                    'status' => 1,
                    'data' => [
                        'about' => $profileData['about'] ?? '',
                        'address' => $profileData['address'] ?? '',
                        'description' => $profileData['description'] ?? '',
                        'email' => $profileData['email'] ?? '',
                        'profile_picture_url' => $profileData['profile_picture_url'] ?? '',
                        'websites' => $profileData['websites'] ?? [],
                        'vertical' => $profileData['vertical'] ?? 'UNDEFINED'
                    ]
                ]);
            }

            $error = $responseData['error']['message'] ?? 'Failed to get profile';
            return response()->json([
                'status' => 0,
                'message' => $error
            ]);
        } catch (\Exception $e) {
            Log::error('getBusinessProfile error: ' . $e->getMessage());
            return response()->json([
                'status' => 0,
                'message' => 'Failed to get profile: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Upload profile picture
     * POST /api/seller/whatsapp/upload-profile-picture
     *
     * Requires: file (image)
     * Returns: handle to use with updateBusinessProfile
     */
    public function uploadProfilePicture(Request $request)
    {
        try {
            $whAccountId = $request->input('wh_account_id');

            if (!$whAccountId) {
                return response()->json([
                    'status' => 0,
                    'message' => 'wh_account_id is required'
                ]);
            }

            if (!$request->hasFile('file')) {
                return response()->json([
                    'status' => 0,
                    'message' => 'Profile picture file is required'
                ]);
            }

            $config = SellerWhatsappConfig::where('wh_account_id', $whAccountId)->first();

            if (!$config || !$config->access_token) {
                return response()->json([
                    'status' => 0,
                    'message' => 'WhatsApp not connected'
                ]);
            }

            $file = $request->file('file');

            // Validate file type (must be JPEG or PNG, square, between 192x192 and 640x640)
            $allowedMimes = ['image/jpeg', 'image/png'];
            if (!in_array($file->getMimeType(), $allowedMimes)) {
                return response()->json([
                    'status' => 0,
                    'message' => 'Profile picture must be JPEG or PNG'
                ]);
            }

            Log::info("Uploading profile picture for wh_account_id: {$whAccountId}");

            // Upload to Meta using resumable upload session
            // Step 1: Create upload session
            $appId = $this->metaAppId;
            $fileSize = $file->getSize();
            $fileType = $file->getMimeType();

            $sessionResponse = Http::withToken($config->access_token)
                ->post("https://graph.facebook.com/v21.0/{$appId}/uploads", [
                    'file_length' => $fileSize,
                    'file_type' => $fileType,
                    'file_name' => 'profile_picture.' . $file->getClientOriginalExtension()
                ]);

            if (!$sessionResponse->successful()) {
                $error = $sessionResponse->json()['error']['message'] ?? 'Failed to create upload session';
                return response()->json([
                    'status' => 0,
                    'message' => $error
                ]);
            }

            $uploadSessionId = $sessionResponse->json()['id'] ?? null;

            if (!$uploadSessionId) {
                return response()->json([
                    'status' => 0,
                    'message' => 'Failed to get upload session ID'
                ]);
            }

            // Step 2: Upload the file
            $uploadResponse = Http::withToken($config->access_token)
                ->withHeaders([
                    'file_offset' => 0
                ])
                ->attach('file', file_get_contents($file->getRealPath()), $file->getClientOriginalName())
                ->post("https://graph.facebook.com/v21.0/{$uploadSessionId}");

            if (!$uploadResponse->successful()) {
                $error = $uploadResponse->json()['error']['message'] ?? 'Failed to upload file';
                return response()->json([
                    'status' => 0,
                    'message' => $error
                ]);
            }

            $handle = $uploadResponse->json()['h'] ?? null;

            if ($handle) {
                return response()->json([
                    'status' => 1,
                    'message' => 'Profile picture uploaded successfully',
                    'data' => [
                        'handle' => $handle
                    ]
                ]);
            }

            return response()->json([
                'status' => 0,
                'message' => 'Failed to get upload handle'
            ]);
        } catch (\Exception $e) {
            Log::error('uploadProfilePicture error: ' . $e->getMessage());
            return response()->json([
                'status' => 0,
                'message' => 'Failed to upload profile picture: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get available business categories/verticals
     * POST /api/seller/whatsapp/get-categories
     */
    public function getBusinessCategories(Request $request)
    {
        // Return the list of valid WhatsApp Business verticals
        $categories = [
            ['id' => 'UNDEFINED', 'name' => 'Select a category'],
            ['id' => 'AUTO', 'name' => 'Automotive'],
            ['id' => 'BEAUTY', 'name' => 'Beauty, Spa and Salon'],
            ['id' => 'APPAREL', 'name' => 'Clothing and Apparel'],
            ['id' => 'EDU', 'name' => 'Education'],
            ['id' => 'ENTERTAIN', 'name' => 'Entertainment'],
            ['id' => 'EVENT_PLAN', 'name' => 'Event Planning and Service'],
            ['id' => 'FINANCE', 'name' => 'Finance and Banking'],
            ['id' => 'GROCERY', 'name' => 'Grocery and Supermarket'],
            ['id' => 'GOVT', 'name' => 'Government and Public Service'],
            ['id' => 'HOTEL', 'name' => 'Hotel and Lodging'],
            ['id' => 'HEALTH', 'name' => 'Medical and Health'],
            ['id' => 'NONPROFIT', 'name' => 'Non-profit'],
            ['id' => 'PROF_SERVICES', 'name' => 'Professional Services'],
            ['id' => 'RETAIL', 'name' => 'Shopping and Retail'],
            ['id' => 'TRAVEL', 'name' => 'Travel and Transportation'],
            ['id' => 'RESTAURANT', 'name' => 'Restaurant'],
            ['id' => 'OTHER', 'name' => 'Other'],
        ];

        return response()->json([
            'status' => 1,
            'data' => [
                'categories' => $categories
            ]
        ]);
    }

    /**
     * Update display name (requires Meta approval)
     * POST /api/seller/whatsapp/update-display-name
     */
    public function updateDisplayName(Request $request)
    {
        try {
            $whAccountId = $request->input('wh_account_id');
            $displayName = $request->input('display_name');

            if (!$whAccountId || !$displayName) {
                return response()->json([
                    'status' => 0,
                    'message' => 'wh_account_id and display_name are required'
                ]);
            }

            // Validate display name (no special chars at start/end, 3-50 chars)
            $displayName = trim($displayName);
            if (strlen($displayName) < 3 || strlen($displayName) > 50) {
                return response()->json([
                    'status' => 0,
                    'message' => 'Display name must be between 3 and 50 characters'
                ]);
            }

            // Check for invalid characters at start/end
            if (preg_match('/^[_\-\.\s]|[_\-\.\s]$/', $displayName)) {
                return response()->json([
                    'status' => 0,
                    'message' => 'Display name cannot start or end with special characters (_, -, ., space)'
                ]);
            }

            $config = SellerWhatsappConfig::where('wh_account_id', $whAccountId)->first();

            if (!$config || !$config->access_token || !$config->waba_id) {
                return response()->json([
                    'status' => 0,
                    'message' => 'WhatsApp not connected'
                ]);
            }

            Log::info("Updating display name to: {$displayName} for WABA: {$config->waba_id}");

            // Note: Display name updates go through WABA, not phone number
            // The API endpoint is: /{WABA-ID}
            // With parameter: business_verification_display_name
            // However, this usually requires business verification

            // For now, we'll update the phone number's verified_name field
            // This triggers a review by Meta
            $response = Http::withToken($config->access_token)
                ->post("https://graph.facebook.com/v21.0/{$config->phone_number_id}", [
                    'verified_name' => $displayName
                ]);

            $responseData = $response->json();
            Log::info("Update display name response: " . json_encode($responseData));

            if ($response->successful() && ($responseData['success'] ?? false)) {
                return response()->json([
                    'status' => 1,
                    'message' => 'Display name update submitted. It may take up to 48 hours for Meta to review and approve.'
                ]);
            }

            $error = $responseData['error']['message'] ?? 'Failed to update display name';

            // Provide helpful error messages
            if (strpos($error, 'verified_name') !== false || strpos($error, 'permission') !== false) {
                return response()->json([
                    'status' => 0,
                    'message' => 'Display name cannot be updated via API. Please update it in WhatsApp Manager: business.facebook.com/wa/manage/phone'
                ]);
            }

            return response()->json([
                'status' => 0,
                'message' => $error
            ]);
        } catch (\Exception $e) {
            Log::error('updateDisplayName error: ' . $e->getMessage());
            return response()->json([
                'status' => 0,
                'message' => 'Failed to update display name: ' . $e->getMessage()
            ], 500);
        }
    }

    // ============================================
    // PHONE NUMBER STATUS
    // ============================================

    /**
     * Get phone number status from Meta API
     * POST /api/seller/whatsapp/phone-status
     *
     * AUTOMATIC DATA FETCH:
     * If waba_id or phone_number_id is missing but access_token exists,
     * this will automatically fetch and populate all missing data from Meta API.
     *
     * Returns: display_phone_number, verified_name, quality_rating, status
     * Status can be: PENDING, CONNECTED, DISCONNECTED, etc.
     */
    public function getPhoneStatus(Request $request)
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

            if (!$config || !$config->access_token) {
                return response()->json([
                    'status' => 0,
                    'message' => 'WhatsApp not connected or no access token'
                ]);
            }

            // AUTO-FETCH: If missing waba_id or phone_number_id, fetch from Meta API
            $dataFetched = false;
            if (!$config->waba_id || !$config->phone_number_id) {
                Log::info("Auto-fetching missing WhatsApp data for wh_account_id: {$whAccountId}");
                $dataFetched = $this->autoFetchWhatsAppData($config);

                if ($dataFetched) {
                    $config->refresh(); // Reload config with new data
                    Log::info("Auto-fetch successful. WABA: {$config->waba_id}, Phone: {$config->phone_number_id}");
                }
            }

            // Still no phone_number_id after auto-fetch
            if (!$config->phone_number_id) {
                return response()->json([
                    'status' => 0,
                    'message' => 'No phone number found. Please reconnect your WhatsApp Business account.',
                    'data' => [
                        'waba_id' => $config->waba_id,
                        'auto_fetch_attempted' => $dataFetched,
                        'hint' => 'The access token may not have permission to access WhatsApp Business accounts, or no phone number is registered.'
                    ]
                ]);
            }

            // Fetch phone number details from Meta API
            // Including 'status' field which shows actual registration status on WhatsApp network
            $response = Http::withToken($config->access_token)
                ->get("https://graph.facebook.com/v21.0/{$config->phone_number_id}", [
                    'fields' => 'display_phone_number,verified_name,quality_rating,code_verification_status,name_status,account_mode,status,is_official_business_account,messaging_limit_tier'
                ]);

            if (!$response->successful()) {
                $error = $response->json()['error']['message'] ?? 'Unknown error';
                Log::error("Failed to get phone status: {$error}");
                return response()->json([
                    'status' => 0,
                    'message' => "Failed to get phone status: {$error}"
                ]);
            }

            $phoneData = $response->json();
            Log::info("Phone status data: " . json_encode($phoneData));

            // Update local config with latest data from Meta
            $config->update([
                'display_phone_number' => $phoneData['display_phone_number'] ?? $config->display_phone_number,
                'verified_name' => $phoneData['verified_name'] ?? $config->verified_name,
            ]);

            // Determine the actual status
            $registrationStatus = $phoneData['status'] ?? 'UNKNOWN';
            $codeVerificationStatus = $phoneData['code_verification_status'] ?? 'UNKNOWN';
            $nameStatus = $phoneData['name_status'] ?? 'UNKNOWN';
            $accountMode = $phoneData['account_mode'] ?? 'SANDBOX';
            $messagingTier = $phoneData['messaging_limit_tier'] ?? null;

            // Derive overall status - prioritize registration status
            $overallStatus = 'PENDING';
            if ($registrationStatus === 'CONNECTED') {
                $overallStatus = 'CONNECTED';
            } elseif ($registrationStatus === 'PENDING') {
                $overallStatus = 'PENDING_REGISTRATION';
            } elseif ($registrationStatus === 'DISCONNECTED') {
                $overallStatus = 'DISCONNECTED';
            } elseif ($codeVerificationStatus === 'NOT_VERIFIED') {
                $overallStatus = 'PENDING_VERIFICATION';
            } elseif ($codeVerificationStatus === 'VERIFIED' && $accountMode === 'LIVE') {
                $overallStatus = 'API_READY';
            }

            return response()->json([
                'status' => 1,
                'data' => [
                    'phone_number' => $phoneData['display_phone_number'] ?? $config->display_phone_number,
                    'phone_number_id' => $config->phone_number_id,
                    'waba_id' => $config->waba_id,
                    'verified_name' => $phoneData['verified_name'] ?? null,
                    'quality_rating' => $phoneData['quality_rating'] ?? null,
                    'registration_status' => $registrationStatus,
                    'code_verification_status' => $codeVerificationStatus,
                    'name_status' => $nameStatus,
                    'account_mode' => $accountMode,
                    'messaging_limit_tier' => $messagingTier,
                    'overall_status' => $overallStatus,
                    'status_description' => $this->getStatusDescription($overallStatus, $registrationStatus, $codeVerificationStatus, $nameStatus, $accountMode),
                    'data_auto_fetched' => $dataFetched,
                    'webhook_configured' => $config->webhook_configured ?? false
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('WhatsApp getPhoneStatus error: ' . $e->getMessage());
            return response()->json([
                'status' => 0,
                'message' => 'Failed to get phone status: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get human-readable status description
     */
    private function getStatusDescription($overallStatus, $registrationStatus, $codeVerification, $nameStatus, $accountMode)
    {
        // Check registration status first (this is what WhatsApp Manager shows)
        if ($registrationStatus === 'PENDING') {
            return 'Your phone number is pending registration on WhatsApp. This process can take a few minutes to a few hours. Please wait for Meta to complete the registration.';
        }

        if ($registrationStatus === 'DISCONNECTED') {
            return 'Your phone number has been disconnected from WhatsApp. Please re-register the number in WhatsApp Manager.';
        }

        if ($overallStatus === 'CONNECTED' || $registrationStatus === 'CONNECTED') {
            return 'Your WhatsApp Business number is active and ready to receive messages.';
        }

        if ($codeVerification === 'NOT_VERIFIED') {
            return 'Phone number verification pending. Please complete the verification process in WhatsApp Manager.';
        }

        if ($accountMode === 'SANDBOX') {
            return 'Your account is in Sandbox mode. Complete business verification to go live.';
        }

        if ($nameStatus === 'PENDING') {
            return 'Business name verification is pending approval from Meta.';
        }

        if ($overallStatus === 'API_READY') {
            return 'API is configured but phone registration status is unknown. Check WhatsApp Manager for details.';
        }

        return 'Your WhatsApp Business number is being set up. This may take a few minutes.';
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

            return response()->json([
                'status' => 1,
                'data' => [
                    'store_id' => $config->wh_account_id,
                    'store_name' => $config->business_name,
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

    // ============================================
    // WEBHOOK CONFIGURATION
    // ============================================

    /**
     * Manually configure webhook for a WABA
     * POST /api/seller/whatsapp/configure-webhook
     *
     * Use this to:
     * - Configure webhooks for existing WABAs
     * - Retry failed webhook configurations
     * - Re-subscribe after permissions change
     */
    public function configureWebhook(Request $request)
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
                    'status' => 0,
                    'message' => 'WhatsApp configuration not found'
                ]);
            }

            if (!$config->waba_id || !$config->access_token) {
                return response()->json([
                    'status' => 0,
                    'message' => 'WABA not connected. Please complete WhatsApp connection first.'
                ]);
            }

            Log::info("Manual webhook configuration requested for wh_account_id: {$whAccountId}, WABA: {$config->waba_id}");

            $success = $this->configureWebhookForWaba($config);

            if ($success) {
                return response()->json([
                    'status' => 1,
                    'message' => 'Webhook configured successfully! Your WhatsApp bot will now receive messages.',
                    'data' => [
                        'waba_id' => $config->waba_id,
                        'webhook_configured' => true
                    ]
                ]);
            }

            return response()->json([
                'status' => 0,
                'message' => 'Failed to configure webhook. Check logs for details.',
                'data' => [
                    'waba_id' => $config->waba_id,
                    'hint' => 'Ensure the user has granted whatsapp_business_messaging permission during Meta login'
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('configureWebhook error: ' . $e->getMessage());
            return response()->json([
                'status' => 0,
                'message' => 'Failed to configure webhook: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Check webhook status for a WABA
     * POST /api/seller/whatsapp/webhook-status
     */
    public function getWebhookStatus(Request $request)
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

            if (!$config || !$config->waba_id || !$config->access_token) {
                return response()->json([
                    'status' => 0,
                    'message' => 'WhatsApp not connected'
                ]);
            }

            // Get subscribed apps for this WABA
            $response = Http::withToken($config->access_token)
                ->get("https://graph.facebook.com/v21.0/{$config->waba_id}/subscribed_apps");

            $responseData = $response->json();

            if ($response->successful()) {
                $subscribedApps = $responseData['data'] ?? [];

                return response()->json([
                    'status' => 1,
                    'data' => [
                        'waba_id' => $config->waba_id,
                        'webhook_configured' => $config->webhook_configured ?? false,
                        'webhook_configured_at' => $config->webhook_configured_at,
                        'subscribed_apps' => $subscribedApps,
                        'is_subscribed' => !empty($subscribedApps)
                    ]
                ]);
            }

            return response()->json([
                'status' => 0,
                'message' => $responseData['error']['message'] ?? 'Failed to get webhook status'
            ]);
        } catch (\Exception $e) {
            Log::error('getWebhookStatus error: ' . $e->getMessage());
            return response()->json([
                'status' => 0,
                'message' => 'Failed to get webhook status: ' . $e->getMessage()
            ], 500);
        }
    }

    // ============================================
    // HELPER METHODS
    // ============================================

    /**
     * Auto-fetch all missing WhatsApp data using access token
     * This fetches WABA ID, phone numbers, and configures webhook automatically
     *
     * Handles multiple scenarios:
     * 1. Has phone_number_id but no waba_id → Query phone to get parent WABA
     * 2. Has neither → Search through businesses/shared WABAs
     *
     * @param SellerWhatsappConfig $config
     * @return bool - Whether data was successfully fetched
     */
    private function autoFetchWhatsAppData($config)
    {
        try {
            $accessToken = $config->access_token;

            if (!$accessToken) {
                Log::warning("Cannot auto-fetch - no access token");
                return false;
            }

            Log::info("Starting auto-fetch for wh_account_id: {$config->wh_account_id}");
            Log::info("Current state - phone_number_id: {$config->phone_number_id}, waba_id: {$config->waba_id}");

            // PRIORITY PATH: If we have phone_number_id but no waba_id,
            // query the phone number to get its parent WABA
            if ($config->phone_number_id && !$config->waba_id) {
                Log::info("Have phone_number_id but missing waba_id - querying phone for parent WABA");

                $phoneResponse = Http::withToken($accessToken)
                    ->get("https://graph.facebook.com/v21.0/{$config->phone_number_id}", [
                        'fields' => 'id,display_phone_number,verified_name,quality_rating,status,whatsapp_business_account'
                    ]);

                if ($phoneResponse->successful()) {
                    $phoneData = $phoneResponse->json();
                    Log::info("Phone query response: " . json_encode($phoneData));

                    // Get the parent WABA from the phone number response
                    $wabaData = $phoneData['whatsapp_business_account'] ?? null;

                    if ($wabaData && isset($wabaData['id'])) {
                        $wabaId = $wabaData['id'];
                        Log::info("Found parent WABA {$wabaId} from phone_number_id {$config->phone_number_id}");

                        // Update config with WABA ID and phone details
                        $config->update([
                            'waba_id' => $wabaId,
                            'display_phone_number' => $phoneData['display_phone_number'] ?? $config->display_phone_number,
                            'verified_name' => $phoneData['verified_name'] ?? $config->verified_name,
                            'is_connected' => true,
                            'connection_status' => 'connected',
                            'connected_at' => $config->connected_at ?? now()
                        ]);

                        // Now try to get business info from WABA
                        $wabaDetailResponse = Http::withToken($accessToken)
                            ->get("https://graph.facebook.com/v21.0/{$wabaId}", [
                                'fields' => 'id,name,owner_business_info'
                            ]);

                        if ($wabaDetailResponse->successful()) {
                            $wabaDetails = $wabaDetailResponse->json();
                            $ownerBusiness = $wabaDetails['owner_business_info'] ?? [];

                            $config->update([
                                'business_id' => $ownerBusiness['id'] ?? $config->business_id,
                                'business_name' => $ownerBusiness['name'] ?? $wabaDetails['name'] ?? $config->business_name
                            ]);
                        }

                        // Auto-configure webhook
                        $config->refresh();
                        $webhookSuccess = $this->configureWebhookForWaba($config);
                        Log::info("Webhook configuration: " . ($webhookSuccess ? 'SUCCESS' : 'FAILED'));

                        return true;
                    } else {
                        Log::warning("Phone number {$config->phone_number_id} has no whatsapp_business_account field");
                    }
                } else {
                    $error = $phoneResponse->json()['error']['message'] ?? 'Unknown error';
                    Log::error("Failed to query phone_number_id {$config->phone_number_id}: {$error}");
                }

                // Method 2: Search through all accessible WABAs and match by phone_number_id
                // For System User tokens, we need to use the business ID directly
                Log::info("Trying to find WABA by searching all accessible WABAs for phone_number_id: {$config->phone_number_id}");

                $wabasToSearch = [];

                // First try /me/whatsapp_business_accounts (works for regular user tokens)
                $sharedWabaResponse = Http::withToken($accessToken)
                    ->get('https://graph.facebook.com/v21.0/me/whatsapp_business_accounts', [
                        'fields' => 'id,name,owner_business_info'
                    ]);

                if ($sharedWabaResponse->successful()) {
                    $wabasToSearch = $sharedWabaResponse->json()['data'] ?? [];
                    Log::info("Found " . count($wabasToSearch) . " accessible WABAs via /me endpoint");
                } else {
                    $error = $sharedWabaResponse->json()['error']['message'] ?? 'Unknown error';
                    Log::warning("Cannot get WABAs via /me endpoint (likely System User token): {$error}");
                }

                // If no WABAs found, try using the configured business ID directly (for System User tokens)
                if (empty($wabasToSearch)) {
                    $businessIdToUse = $config->business_id ?? $this->metaBusinessId;
                    Log::info("Trying to get WABAs from business ID: {$businessIdToUse}");

                    $businessWabaResponse = Http::withToken($accessToken)
                        ->get("https://graph.facebook.com/v21.0/{$businessIdToUse}/owned_whatsapp_business_accounts", [
                            'fields' => 'id,name'
                        ]);

                    if ($businessWabaResponse->successful()) {
                        $wabasToSearch = $businessWabaResponse->json()['data'] ?? [];
                        Log::info("Found " . count($wabasToSearch) . " WABAs from business {$businessIdToUse}");
                    } else {
                        $error = $businessWabaResponse->json()['error']['message'] ?? 'Unknown error';
                        Log::warning("Cannot get owned WABAs from business: {$error}");

                        // Try client_whatsapp_business_accounts (for shared WABAs)
                        $clientWabaResponse = Http::withToken($accessToken)
                            ->get("https://graph.facebook.com/v21.0/{$businessIdToUse}/client_whatsapp_business_accounts", [
                                'fields' => 'id,name'
                            ]);

                        if ($clientWabaResponse->successful()) {
                            $wabasToSearch = $clientWabaResponse->json()['data'] ?? [];
                            Log::info("Found " . count($wabasToSearch) . " client WABAs from business {$businessIdToUse}");
                        }
                    }
                }

                // Search through found WABAs for matching phone_number_id
                if (!empty($wabasToSearch)) {
                    Log::info("Searching through " . count($wabasToSearch) . " WABAs for phone_number_id: {$config->phone_number_id}");

                    foreach ($wabasToSearch as $waba) {
                        $wabaId = $waba['id'];

                        // Get phone numbers for this WABA
                        $phonesResponse = Http::withToken($accessToken)
                            ->get("https://graph.facebook.com/v21.0/{$wabaId}/phone_numbers", [
                                'fields' => 'id,display_phone_number,verified_name'
                            ]);

                        if ($phonesResponse->successful()) {
                            $phones = $phonesResponse->json()['data'] ?? [];
                            Log::info("WABA {$wabaId} has " . count($phones) . " phone numbers");

                            foreach ($phones as $phone) {
                                if ($phone['id'] === $config->phone_number_id) {
                                    Log::info("SUCCESS! Found matching WABA {$wabaId} for phone_number_id {$config->phone_number_id}");

                                    $ownerBusiness = $waba['owner_business_info'] ?? [];
                                    $config->update([
                                        'waba_id' => $wabaId,
                                        'business_id' => $ownerBusiness['id'] ?? $config->business_id ?? $this->metaBusinessId,
                                        'business_name' => $ownerBusiness['name'] ?? $waba['name'] ?? $config->business_name,
                                        'display_phone_number' => $phone['display_phone_number'] ?? $config->display_phone_number,
                                        'verified_name' => $phone['verified_name'] ?? $config->verified_name,
                                        'is_connected' => true,
                                        'connection_status' => 'connected',
                                        'connected_at' => $config->connected_at ?? now()
                                    ]);

                                    // Auto-configure webhook
                                    $config->refresh();
                                    $webhookSuccess = $this->configureWebhookForWaba($config);
                                    Log::info("Webhook configuration: " . ($webhookSuccess ? 'SUCCESS' : 'FAILED'));

                                    return true;
                                }
                            }
                        } else {
                            $error = $phonesResponse->json()['error']['message'] ?? 'Unknown error';
                            Log::warning("Cannot get phone numbers for WABA {$wabaId}: {$error}");
                        }
                    }
                    Log::warning("Could not find phone_number_id {$config->phone_number_id} in any of the " . count($wabasToSearch) . " WABAs");
                } else {
                    Log::warning("No WABAs found to search for phone_number_id");
                }
            }

            // FALLBACK PATH: Search through businesses/shared WABAs (for cases where we have neither)
            Log::info("Falling back to business/WABA search method");

            // Step 1: Debug token to get app info and scopes
            $debugResponse = Http::withToken($accessToken)
                ->get('https://graph.facebook.com/v21.0/debug_token', [
                    'input_token' => $accessToken
                ]);

            if ($debugResponse->successful()) {
                $debugData = $debugResponse->json()['data'] ?? [];
                Log::info("Token debug info: " . json_encode($debugData));

                // Get the user ID from token
                $userId = $debugData['user_id'] ?? null;
                $scopes = $debugData['scopes'] ?? [];
                Log::info("Token user_id: {$userId}, scopes: " . implode(', ', $scopes));
            }

            // Step 2: Try to get shared WABA from the user's businesses
            // First, get the user's businesses
            $businessesResponse = Http::withToken($accessToken)
                ->get('https://graph.facebook.com/v21.0/me/businesses', [
                    'fields' => 'id,name'
                ]);

            $wabaId = null;
            $businessId = null;
            $businessName = null;

            if ($businessesResponse->successful()) {
                $businesses = $businessesResponse->json()['data'] ?? [];
                Log::info("Found " . count($businesses) . " businesses");

                foreach ($businesses as $business) {
                    $businessId = $business['id'];
                    $businessName = $business['name'] ?? null;

                    // Get WABAs owned by this business
                    $wabaResponse = Http::withToken($accessToken)
                        ->get("https://graph.facebook.com/v21.0/{$businessId}/owned_whatsapp_business_accounts", [
                            'fields' => 'id,name,currency,timezone_id'
                        ]);

                    if ($wabaResponse->successful()) {
                        $wabas = $wabaResponse->json()['data'] ?? [];
                        Log::info("Business {$businessId} has " . count($wabas) . " WABAs");

                        if (!empty($wabas)) {
                            $wabaId = $wabas[0]['id'];
                            $config->update([
                                'waba_id' => $wabaId,
                                'business_id' => $businessId,
                                'business_name' => $businessName ?? $wabas[0]['name'] ?? null
                            ]);
                            Log::info("Found WABA: {$wabaId} from business: {$businessId}");
                            break;
                        }
                    }
                }
            }

            // Step 3: If still no WABA, try the shared WABAs endpoint
            if (!$wabaId) {
                $sharedWabaResponse = Http::withToken($accessToken)
                    ->get('https://graph.facebook.com/v21.0/me/whatsapp_business_accounts', [
                        'fields' => 'id,name,currency,timezone_id,owner_business_info'
                    ]);

                if ($sharedWabaResponse->successful()) {
                    $sharedWabas = $sharedWabaResponse->json()['data'] ?? [];
                    Log::info("Found " . count($sharedWabas) . " shared WABAs");

                    if (!empty($sharedWabas)) {
                        $wabaId = $sharedWabas[0]['id'];
                        $ownerBusiness = $sharedWabas[0]['owner_business_info'] ?? [];

                        $config->update([
                            'waba_id' => $wabaId,
                            'business_id' => $ownerBusiness['id'] ?? $businessId,
                            'business_name' => $ownerBusiness['name'] ?? $sharedWabas[0]['name'] ?? null
                        ]);
                        Log::info("Found shared WABA: {$wabaId}");
                    }
                }
            }

            if (!$wabaId) {
                Log::warning("No WABA found for wh_account_id: {$config->wh_account_id}");
                return false;
            }

            // Step 4: Get phone numbers for this WABA
            $phoneResponse = Http::withToken($accessToken)
                ->get("https://graph.facebook.com/v21.0/{$wabaId}/phone_numbers", [
                    'fields' => 'id,display_phone_number,verified_name,quality_rating,status,code_verification_status'
                ]);

            if ($phoneResponse->successful()) {
                $phones = $phoneResponse->json()['data'] ?? [];
                Log::info("Found " . count($phones) . " phone numbers for WABA {$wabaId}");

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

                    Log::info("Phone number configured: {$phone['display_phone_number']} (ID: {$phone['id']})");

                    // Step 5: Auto-configure webhook
                    $config->refresh();
                    $webhookSuccess = $this->configureWebhookForWaba($config);
                    Log::info("Webhook configuration: " . ($webhookSuccess ? 'SUCCESS' : 'FAILED'));

                    return true;
                }
            } else {
                $error = $phoneResponse->json()['error']['message'] ?? 'Unknown error';
                Log::error("Failed to get phone numbers: {$error}");
            }

            return false;

        } catch (\Exception $e) {
            Log::error("autoFetchWhatsAppData error: " . $e->getMessage());
            Log::error("Stack trace: " . $e->getTraceAsString());
            return false;
        }
    }

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

                    // Auto-configure webhook for this WABA
                    $config->refresh();
                    $this->configureWebhookForWaba($config);
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

        // Auto-configure webhook for this WABA after successful connection
        if ($config->waba_id && $config->access_token) {
            $this->configureWebhookForWaba($config);
        }
    }

    /**
     * Auto-configure webhook for WABA after Embedded Signup
     * This subscribes the WABA to receive webhook events (messages, statuses, etc.)
     *
     * @param SellerWhatsappConfig $config - The seller's WhatsApp configuration
     * @return bool - Whether webhook was configured successfully
     */
    private function configureWebhookForWaba($config)
    {
        try {
            $wabaId = $config->waba_id;
            $accessToken = $config->access_token;

            if (!$wabaId || !$accessToken) {
                Log::warning("Cannot configure webhook - missing WABA ID or access token");
                return false;
            }

            Log::info("Configuring webhook subscription for WABA: {$wabaId}");

            // Subscribe the app to the WABA's webhook events
            // This connects this specific WABA to receive messages via your webhook URL
            // The webhook URL itself is configured at App level in Meta Developer Portal
            $response = Http::withToken($accessToken)
                ->post("https://graph.facebook.com/v21.0/{$wabaId}/subscribed_apps", [
                    'subscribed_fields' => 'messages'
                ]);

            $responseData = $response->json();
            Log::info("Webhook subscription response for WABA {$wabaId}: " . json_encode($responseData));

            if ($response->successful() && ($responseData['success'] ?? false)) {
                Log::info("Webhook successfully configured for WABA: {$wabaId}");

                // Update config to track webhook status
                $config->update([
                    'webhook_configured' => true,
                    'webhook_configured_at' => now()
                ]);

                return true;
            }

            // Log error but don't fail the connection process
            $error = $responseData['error']['message'] ?? 'Unknown error';
            $errorCode = $responseData['error']['code'] ?? null;
            Log::error("Failed to configure webhook for WABA {$wabaId}: {$error} (code: {$errorCode})");

            // Common error handling
            if ($errorCode == 100) {
                Log::warning("WABA {$wabaId} may need additional permissions for webhook subscription");
            } elseif ($errorCode == 200) {
                Log::warning("Permission error for WABA {$wabaId} - user may need to grant whatsapp_business_messaging permission");
            }

            return false;

        } catch (\Exception $e) {
            Log::error("Exception configuring webhook for WABA: " . $e->getMessage());
            return false;
        }
    }
}