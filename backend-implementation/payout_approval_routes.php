<?php

/**
 * PAYOUT APPROVAL SYSTEM - Additional Routes
 *
 * Add these routes to your existing stripe_connect_routes.php file
 * OR copy them directly into your routes/api.php
 *
 * Location: Add inside the existing Route::prefix() groups
 */

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\Seller\StripeConnectController;

// ============================================
// SELLER ROUTES - Payout Approval Requests
// ============================================
// Add these inside your existing Route::prefix('seller/stripe')->group()

Route::prefix('seller/stripe')->group(function () {

    // Existing routes (already in your file)
    // Route::post('/onboard', [StripeConnectController::class, 'createConnectAccount']);
    // ... etc

    // === NEW: Payout Approval Routes ===
    Route::post('/request-payout-approval', [StripeConnectController::class, 'requestPayoutApproval']);
    Route::post('/payout-approval-requests', [StripeConnectController::class, 'getPayoutApprovalRequests']);
});

// ============================================
// ADMIN ROUTES - Payout Approval Management
// ============================================
// Add these inside your existing Route::prefix('admin/stripe')->group()

Route::prefix('admin/stripe')->group(function () {

    // Existing routes (already in your file)
    // Route::post('/sellers', [StripeConnectController::class, 'adminGetAllSellers']);
    // ... etc

    // === NEW: Payout Approval Management Routes ===
    Route::post('/payout-approval-requests', [StripeConnectController::class, 'adminGetAllPayoutApprovalRequests']);
    Route::post('/approve-payout-request', [StripeConnectController::class, 'approvePayoutRequest']);
    Route::post('/reject-payout-request', [StripeConnectController::class, 'rejectPayoutRequest']);
});

// ============================================
// COMPLETE ROUTE LIST (for reference)
// ============================================

/*
 * === SELLER ENDPOINTS ===
 *
 * Existing:
 * POST /api/seller/stripe/onboard
 * POST /api/seller/stripe/onboard-refresh
 * POST /api/seller/stripe/status
 * POST /api/seller/stripe/dashboard
 * POST /api/seller/stripe/earnings
 * POST /api/seller/stripe/transactions
 * POST /api/seller/stripe/payouts
 * POST /api/seller/stripe/request-payout (DEPRECATED - Use approval system)
 * POST /api/seller/stripe/disconnect
 *
 * NEW - Payout Approval:
 * POST /api/seller/stripe/request-payout-approval
 * POST /api/seller/stripe/payout-approval-requests
 *
 * === ADMIN ENDPOINTS ===
 *
 * Existing:
 * POST /api/admin/stripe/sellers
 * POST /api/admin/stripe/seller-detail
 * POST /api/admin/stripe/update-config
 * POST /api/admin/stripe/create-payout
 * POST /api/admin/stripe/transactions
 * POST /api/admin/stripe/add-test-balance
 *
 * NEW - Payout Approval:
 * POST /api/admin/stripe/payout-approval-requests
 * POST /api/admin/stripe/approve-payout-request
 * POST /api/admin/stripe/reject-payout-request
 */

// ============================================
// REQUEST/RESPONSE EXAMPLES
// ============================================

/*
 * === SELLER: Request Payout Approval ===
 * POST /api/seller/stripe/request-payout-approval
 *
 * Request Body:
 * {
 *   "wh_account_id": 1016,
 *   "amount": 500.00,  // Optional, null = full balance
 *   "notes": "Need funds for inventory purchase"
 * }
 *
 * Success Response (200):
 * {
 *   "status": 1,
 *   "message": "Payout approval request submitted successfully",
 *   "data": {
 *     "request_id": 123,
 *     "amount": 500.00,
 *     "status": "pending",
 *     "created_at": "2026-02-08 12:30:00"
 *   }
 * }
 *
 * Error Response (200):
 * {
 *   "status": 0,
 *   "message": "You already have a pending payout approval request"
 * }
 *
 * === SELLER: Get Approval Requests ===
 * POST /api/seller/stripe/payout-approval-requests
 *
 * Request Body:
 * {
 *   "wh_account_id": 1016,
 *   "limit": 20
 * }
 *
 * Success Response (200):
 * {
 *   "status": 1,
 *   "message": "Approval requests retrieved",
 *   "data": {
 *     "requests": [
 *       {
 *         "id": 123,
 *         "wh_account_id": 1016,
 *         "amount": "500.00",
 *         "notes": "Need funds for inventory",
 *         "status": "pending",
 *         "admin_notes": null,
 *         "rejection_reason": null,
 *         "processed_at": null,
 *         "created_at": "2026-02-08 12:30:00",
 *         "updated_at": "2026-02-08 12:30:00"
 *       }
 *     ],
 *     "stats": {
 *       "total_requests": 5,
 *       "pending": 1,
 *       "approved": 3,
 *       "rejected": 1
 *     }
 *   }
 * }
 *
 * === ADMIN: Get All Approval Requests ===
 * POST /api/admin/stripe/payout-approval-requests
 *
 * Request Body:
 * {
 *   "wh_account_id": 1016,  // Optional - filter by seller
 *   "status": "pending"     // "pending", "approved", "rejected", or "all"
 * }
 *
 * Success Response (200):
 * {
 *   "status": 1,
 *   "message": "Approval requests retrieved",
 *   "data": {
 *     "requests": [
 *       {
 *         "id": 123,
 *         "wh_account_id": 1016,
 *         "amount": "500.00",
 *         "notes": "Need funds for inventory",
 *         "status": "pending",
 *         "admin_notes": null,
 *         "rejection_reason": null,
 *         "processed_at": null,
 *         "created_at": "2026-02-08 12:30:00",
 *         "updated_at": "2026-02-08 12:30:00",
 *         "store_name": "ABC Store",
 *         "firstname": "John",
 *         "lastname": "Doe",
 *         "seller_email": "john@example.com",
 *         "stripe_connect_id": "acct_xxx",
 *         "current_balance": "1500.00"
 *       }
 *     ],
 *     "stats": {
 *       "total_requests": 50,
 *       "pending": 10,
 *       "approved": 35,
 *       "rejected": 5,
 *       "total_requested_amount": "5000.00",
 *       "total_approved_amount": "45000.00"
 *     }
 *   }
 * }
 *
 * === ADMIN: Approve Payout Request ===
 * POST /api/admin/stripe/approve-payout-request
 *
 * Request Body:
 * {
 *   "request_id": 123,
 *   "admin_notes": "Approved - all documentation verified"
 * }
 *
 * Success Response (200):
 * {
 *   "status": 1,
 *   "message": "Payout approved and created successfully",
 *   "data": {
 *     "approval_request_id": 123,
 *     "payout_id": 456,
 *     "stripe_payout_id": "po_xxx",
 *     "amount": 500.00,
 *     "status": "pending",
 *     "arrival_date": "2026-02-14"
 *   }
 * }
 *
 * Error Response (200):
 * {
 *   "status": 0,
 *   "message": "Failed to create payout: Insufficient balance in platform account"
 * }
 *
 * === ADMIN: Reject Payout Request ===
 * POST /api/admin/stripe/reject-payout-request
 *
 * Request Body:
 * {
 *   "request_id": 123,
 *   "rejection_reason": "Pending verification of business documents"
 * }
 *
 * Success Response (200):
 * {
 *   "status": 1,
 *   "message": "Payout request rejected",
 *   "data": {
 *     "request_id": 123,
 *     "status": "rejected",
 *     "rejection_reason": "Pending verification of business documents",
 *     "processed_at": "2026-02-08 14:30:00"
 *   }
 * }
 */
