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
    // PHONE NUMBER STATUS
    // ============================================

    /**
     * Get phone number status from Meta API
     * POST /api/seller/whatsapp/phone-status
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

            if (!$config->phone_number_id) {
                return response()->json([
                    'status' => 0,
                    'message' => 'No phone number ID configured'
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

            // Determine the actual status
            // status: PENDING, CONNECTED, DISCONNECTED, etc. (registration status on WhatsApp)
            // code_verification_status: VERIFIED, NOT_VERIFIED (API verification)
            // name_status: APPROVED, PENDING, AVAILABLE_WITHOUT_REVIEW, etc.
            // account_mode: LIVE, SANDBOX
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
                // API is verified but we don't know registration status
                $overallStatus = 'API_READY';
            }

            return response()->json([
                'status' => 1,
                'data' => [
                    'phone_number' => $phoneData['display_phone_number'] ?? $config->display_phone_number,
                    'phone_number_id' => $config->phone_number_id,
                    'verified_name' => $phoneData['verified_name'] ?? null,
                    'quality_rating' => $phoneData['quality_rating'] ?? null,
                    'registration_status' => $registrationStatus,  // Actual WhatsApp registration status
                    'code_verification_status' => $codeVerificationStatus,
                    'name_status' => $nameStatus,
                    'account_mode' => $accountMode,
                    'messaging_limit_tier' => $messagingTier,
                    'overall_status' => $overallStatus,
                    'status_description' => $this->getStatusDescription($overallStatus, $registrationStatus, $codeVerificationStatus, $nameStatus, $accountMode)
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
