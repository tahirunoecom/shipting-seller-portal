<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\Seller\WhatsAppController;

/**
 * WhatsApp Business API Routes
 * Add these routes to your api.php file
 */

// ============================================
// SELLER PORTAL ROUTES (requires auth)
// ============================================
Route::middleware(['auth:sanctum'])->prefix('seller/whatsapp')->group(function () {

    // Connection management
    Route::post('/status', [WhatsAppController::class, 'getStatus']);
    Route::post('/exchange-token', [WhatsAppController::class, 'exchangeToken']);
    Route::post('/session-info', [WhatsAppController::class, 'saveSessionInfo']);
    Route::post('/disconnect', [WhatsAppController::class, 'disconnect']);

    // Phone registration & verification (100% self-service)
    Route::post('/request-code', [WhatsAppController::class, 'requestVerificationCode']);
    Route::post('/verify-code', [WhatsAppController::class, 'verifyCode']);
    Route::post('/register-phone', [WhatsAppController::class, 'registerPhone']);
    Route::post('/phone-status', [WhatsAppController::class, 'getPhoneStatus']);

    // Business profile management
    Route::post('/get-profile', [WhatsAppController::class, 'getBusinessProfile']);
    Route::post('/update-profile', [WhatsAppController::class, 'updateBusinessProfile']);
    Route::post('/upload-profile-picture', [WhatsAppController::class, 'uploadProfilePicture']);
    Route::post('/get-categories', [WhatsAppController::class, 'getBusinessCategories']);
    Route::post('/update-display-name', [WhatsAppController::class, 'updateDisplayName']);

    // Catalog management
    Route::post('/create-catalog', [WhatsAppController::class, 'createCatalog']);
    Route::post('/list-catalogs', [WhatsAppController::class, 'listCatalogs']);
    Route::post('/update-catalog', [WhatsAppController::class, 'updateCatalog']);
    Route::post('/sync-catalog', [WhatsAppController::class, 'syncCatalog']);

    // Webhook configuration (auto-configured on connection, but can be done manually)
    Route::post('/configure-webhook', [WhatsAppController::class, 'configureWebhook']);
    Route::post('/webhook-status', [WhatsAppController::class, 'getWebhookStatus']);

    // Bot settings
    Route::post('/bot-settings', [WhatsAppController::class, 'updateBotSettings']);
    Route::post('/bot-settings/get', [WhatsAppController::class, 'getBotSettings']);

    // Auto-replies
    Route::post('/auto-replies', [WhatsAppController::class, 'getAutoReplies']);
    Route::post('/auto-replies/save', [WhatsAppController::class, 'saveAutoReply']);
    Route::post('/auto-replies/delete', [WhatsAppController::class, 'deleteAutoReply']);
    Route::post('/auto-replies/toggle', [WhatsAppController::class, 'toggleAutoReply']);

    // Quick replies
    Route::post('/quick-replies', [WhatsAppController::class, 'getQuickReplies']);
    Route::post('/quick-replies/save', [WhatsAppController::class, 'saveQuickReply']);
    Route::post('/quick-replies/delete', [WhatsAppController::class, 'deleteQuickReply']);

    // Analytics
    Route::post('/analytics', [WhatsAppController::class, 'getAnalytics']);
});

// ============================================
// INTERNAL API ROUTES (for AIBOT webhook)
// These use X-Internal-API-Key header authentication
// ============================================
Route::prefix('internal/whatsapp')->group(function () {

    // Get seller by phone_number_id (used by AIBOT webhook)
    Route::post('/get-seller-by-phone', [WhatsAppController::class, 'getSellerByPhoneNumberId']);

    // Get seller by display phone number (legacy support)
    Route::post('/get-seller-by-display-phone', [WhatsAppController::class, 'getSellerByDisplayPhone']);

});
