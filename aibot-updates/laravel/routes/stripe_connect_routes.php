<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\Seller\StripeConnectController;
use App\Http\Controllers\StripeWebhookController;

/**
 * Stripe Connect API Routes
 *
 * Add these routes to your routes/api.php file:
 *
 * // Include Stripe Connect routes
 * require __DIR__.'/stripe_connect_routes.php';
 *
 * OR copy the routes below directly into your routes/api.php
 */

// ============================================
// STRIPE WEBHOOK (existing + new Connect events)
// ============================================

/**
 * Main Stripe webhook endpoint
 * Handles both customer payments AND Stripe Connect events
 *
 * URL: POST /api/webhook/stripe/connect
 * OR:  POST /api/stripe/webhook (if using existing)
 */
Route::post('/webhook/stripe/connect', [StripeWebhookController::class, 'handleWebhook']);

// If you want to keep existing webhook route, this will work too:
// Route::post('/stripe/webhook', [StripeWebhookController::class, 'handleWebhook']);

// ============================================
// SELLER ROUTES (requires auth)
// ============================================

Route::middleware(['auth:sanctum'])->prefix('seller/stripe')->group(function () {

    // Onboarding
    Route::post('/onboard', [StripeConnectController::class, 'createConnectAccount']);
    Route::post('/onboard-refresh', [StripeConnectController::class, 'refreshOnboardingLink']);
    Route::post('/status', [StripeConnectController::class, 'getConnectStatus']);
    Route::post('/dashboard', [StripeConnectController::class, 'getDashboardLink']);
    Route::post('/disconnect', [StripeConnectController::class, 'disconnect']);

    // Earnings & Transactions
    Route::post('/earnings', [StripeConnectController::class, 'getEarnings']);
    Route::post('/transactions', [StripeConnectController::class, 'getTransactions']);
    Route::post('/payouts', [StripeConnectController::class, 'getPayouts']);

    // Manual payout request
    Route::post('/request-payout', [StripeConnectController::class, 'requestPayout']);
});

// ============================================
// ADMIN ROUTES (requires admin auth)
// ============================================

Route::middleware(['auth:sanctum', 'admin'])->prefix('admin/stripe')->group(function () {

    // Seller management
    Route::post('/sellers', [StripeConnectController::class, 'adminGetAllSellers']);
    Route::post('/seller-detail', [StripeConnectController::class, 'adminGetSellerDetail']);
    Route::post('/update-config', [StripeConnectController::class, 'adminUpdateSellerConfig']);

    // Payouts
    Route::post('/create-payout', [StripeConnectController::class, 'adminCreatePayout']);

    // Transactions (platform-wide)
    Route::post('/transactions', [StripeConnectController::class, 'adminGetAllTransactions']);
});

// ============================================
// ALTERNATIVE: Without middleware (for testing)
// ============================================

/*
 * If you don't have middleware set up yet, use these routes for testing:
 *
 * SELLER ROUTES (no auth)
 */

// Route::prefix('seller/stripe')->group(function () {
//     Route::post('/onboard', [StripeConnectController::class, 'createConnectAccount']);
//     Route::post('/onboard-refresh', [StripeConnectController::class, 'refreshOnboardingLink']);
//     Route::post('/status', [StripeConnectController::class, 'getConnectStatus']);
//     Route::post('/dashboard', [StripeConnectController::class, 'getDashboardLink']);
//     Route::post('/earnings', [StripeConnectController::class, 'getEarnings']);
//     Route::post('/transactions', [StripeConnectController::class, 'getTransactions']);
//     Route::post('/payouts', [StripeConnectController::class, 'getPayouts']);
//     Route::post('/request-payout', [StripeConnectController::class, 'requestPayout']);
//     Route::post('/disconnect', [StripeConnectController::class, 'disconnect']);
// });

/*
 * ADMIN ROUTES (no auth)
 */

// Route::prefix('admin/stripe')->group(function () {
//     Route::post('/sellers', [StripeConnectController::class, 'adminGetAllSellers']);
//     Route::post('/seller-detail', [StripeConnectController::class, 'adminGetSellerDetail']);
//     Route::post('/update-config', [StripeConnectController::class, 'adminUpdateSellerConfig']);
//     Route::post('/create-payout', [StripeConnectController::class, 'adminCreatePayout']);
//     Route::post('/transactions', [StripeConnectController::class, 'adminGetAllTransactions']);
// });

// ============================================
// ROUTE LIST (for reference)
// ============================================

/*
 * WEBHOOK:
 * POST /api/webhook/stripe/connect
 *
 * SELLER ENDPOINTS:
 * POST /api/seller/stripe/onboard
 * POST /api/seller/stripe/onboard-refresh
 * POST /api/seller/stripe/status
 * POST /api/seller/stripe/dashboard
 * POST /api/seller/stripe/earnings
 * POST /api/seller/stripe/transactions
 * POST /api/seller/stripe/payouts
 * POST /api/seller/stripe/request-payout
 * POST /api/seller/stripe/disconnect
 *
 * ADMIN ENDPOINTS:
 * POST /api/admin/stripe/sellers
 * POST /api/admin/stripe/seller-detail
 * POST /api/admin/stripe/update-config
 * POST /api/admin/stripe/create-payout
 * POST /api/admin/stripe/transactions
 */

// ============================================
// REQUEST/RESPONSE EXAMPLES
// ============================================

/*
 * Example: Start Onboarding
 * POST /api/seller/stripe/onboard
 * Body: { "wh_account_id": 1016 }
 * Response: {
 *   "status": 1,
 *   "message": "Onboarding link created",
 *   "data": {
 *     "stripe_account_id": "acct_xxx",
 *     "onboarding_url": "https://connect.stripe.com/...",
 *     "expires_at": 1234567890
 *   }
 * }
 *
 * Example: Get Earnings
 * POST /api/seller/stripe/earnings
 * Body: { "wh_account_id": 1016 }
 * Response: {
 *   "status": 1,
 *   "message": "Earnings retrieved",
 *   "data": {
 *     "total_earned": 1500.00,
 *     "total_paid_out": 500.00,
 *     "pending_earnings": 1000.00,
 *     "available_balance": 1000.00,
 *     "total_orders": 45,
 *     "commission_percentage": 5.00,
 *     "can_request_payout": true,
 *     "recent_transactions": [...]
 *   }
 * }
 *
 * Example: Request Payout
 * POST /api/seller/stripe/request-payout
 * Body: { "wh_account_id": 1016, "amount": 100.00 }
 * Response: {
 *   "status": 1,
 *   "message": "Payout requested successfully",
 *   "data": {
 *     "payout_id": 123,
 *     "stripe_payout_id": "po_xxx",
 *     "amount": 100.00,
 *     "status": "pending",
 *     "arrival_date": "2026-02-14"
 *   }
 * }
 *
 * Example: Admin - Get All Sellers
 * POST /api/admin/stripe/sellers
 * Body: { "status": "connected" }
 * Response: {
 *   "status": 1,
 *   "message": "Sellers retrieved",
 *   "data": {
 *     "sellers": [...],
 *     "stats": {
 *       "total_sellers": 100,
 *       "connected": 45,
 *       "pending": 10,
 *       "not_connected": 45,
 *       "total_pending_earnings": 50000.00,
 *       "total_paid_out": 25000.00
 *     }
 *   }
 * }
 */
