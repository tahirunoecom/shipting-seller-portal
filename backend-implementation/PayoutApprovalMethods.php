<?php

/**
 * PAYOUT APPROVAL SYSTEM - New Methods for StripeConnectController
 *
 * Add these methods to your existing StripeConnectController.php
 * (App\Http\Controllers\Api\Seller\StripeConnectController)
 *
 * Location: Insert these methods after the adminAddTestBalance() method
 * and before the HELPER METHODS section
 */

namespace App\Http\Controllers\Api\Seller;

// ============================================
// PAYOUT APPROVAL REQUESTS (New System)
// ============================================

/**
 * [SELLER] Request payout approval from admin
 * POST /seller/stripe/request-payout-approval
 *
 * Body: {
 *   wh_account_id: 1016,
 *   amount: 100.00 (optional, null = full balance),
 *   notes: "Need funds for inventory"
 * }
 */
public function requestPayoutApproval(Request $request)
{
    $wh_account_id = $request->wh_account_id;
    $amount = $request->amount; // Optional - if not provided, use full balance
    $notes = $request->notes ?? '';

    if (!$wh_account_id) {
        return response()->json([
            'status' => 0,
            'message' => 'Account ID is required'
        ]);
    }

    try {
        $seller = DB::table('wh_warehouse_user')
            ->where('wh_account_id', $wh_account_id)
            ->first();

        if (!$seller) {
            return response()->json([
                'status' => 0,
                'message' => 'Seller not found'
            ]);
        }

        if (!$seller->stripe_connect_id || !$seller->stripe_payouts_enabled) {
            return response()->json([
                'status' => 0,
                'message' => 'Stripe Connect not fully set up. Please complete onboarding first.'
            ]);
        }

        $availableBalance = $seller->Shipper_earnings ?? 0;
        $minPayout = $seller->stripe_minimum_payout ?? 50.00;

        // Check minimum payout
        if ($availableBalance < $minPayout) {
            return response()->json([
                'status' => 0,
                'message' => "Minimum payout amount is $" . $minPayout . ". Your current balance is $" . $availableBalance
            ]);
        }

        // Determine requested amount
        $requestedAmount = $amount ?? $availableBalance;

        // Validate requested amount
        if ($requestedAmount > $availableBalance) {
            return response()->json([
                'status' => 0,
                'message' => 'Requested amount exceeds available balance'
            ]);
        }

        if ($requestedAmount < $minPayout) {
            return response()->json([
                'status' => 0,
                'message' => "Minimum payout amount is $" . $minPayout
            ]);
        }

        // Check for existing pending requests
        $existingPending = DB::table('payout_approval_requests')
            ->where('wh_account_id', $wh_account_id)
            ->where('status', 'pending')
            ->count();

        if ($existingPending > 0) {
            return response()->json([
                'status' => 0,
                'message' => 'You already have a pending payout approval request. Please wait for admin to process it.'
            ]);
        }

        // Create approval request
        $requestId = DB::table('payout_approval_requests')->insertGetId([
            'wh_account_id' => $wh_account_id,
            'amount' => $requestedAmount,
            'notes' => $notes,
            'status' => 'pending',
            'created_at' => now(),
            'updated_at' => now()
        ]);

        Log::info('[PAYOUT APPROVAL] Request created', [
            'request_id' => $requestId,
            'wh_account_id' => $wh_account_id,
            'amount' => $requestedAmount,
            'notes' => $notes
        ]);

        return response()->json([
            'status' => 1,
            'message' => 'Payout approval request submitted successfully',
            'data' => [
                'request_id' => $requestId,
                'amount' => $requestedAmount,
                'status' => 'pending',
                'created_at' => now()->toDateTimeString()
            ]
        ]);

    } catch (Exception $e) {
        Log::error('[PAYOUT APPROVAL] Error creating request', [
            'error' => $e->getMessage(),
            'wh_account_id' => $wh_account_id
        ]);

        return response()->json([
            'status' => 0,
            'message' => 'Failed to submit approval request: ' . $e->getMessage()
        ]);
    }
}

/**
 * [SELLER] Get payout approval requests for seller
 * POST /seller/stripe/payout-approval-requests
 *
 * Body: {
 *   wh_account_id: 1016,
 *   limit: 20
 * }
 */
public function getPayoutApprovalRequests(Request $request)
{
    $wh_account_id = $request->wh_account_id;
    $limit = $request->limit ?? 20;

    if (!$wh_account_id) {
        return response()->json([
            'status' => 0,
            'message' => 'Account ID is required'
        ]);
    }

    try {
        $requests = DB::table('payout_approval_requests')
            ->where('wh_account_id', $wh_account_id)
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get();

        $stats = [
            'total_requests' => DB::table('payout_approval_requests')
                ->where('wh_account_id', $wh_account_id)
                ->count(),
            'pending' => DB::table('payout_approval_requests')
                ->where('wh_account_id', $wh_account_id)
                ->where('status', 'pending')
                ->count(),
            'approved' => DB::table('payout_approval_requests')
                ->where('wh_account_id', $wh_account_id)
                ->where('status', 'approved')
                ->count(),
            'rejected' => DB::table('payout_approval_requests')
                ->where('wh_account_id', $wh_account_id)
                ->where('status', 'rejected')
                ->count()
        ];

        return response()->json([
            'status' => 1,
            'message' => 'Approval requests retrieved',
            'data' => [
                'requests' => $requests,
                'stats' => $stats
            ]
        ]);

    } catch (Exception $e) {
        Log::error('[PAYOUT APPROVAL] Error fetching requests', [
            'error' => $e->getMessage(),
            'wh_account_id' => $wh_account_id
        ]);

        return response()->json([
            'status' => 0,
            'message' => 'Failed to fetch approval requests: ' . $e->getMessage()
        ]);
    }
}

/**
 * [ADMIN] Get all payout approval requests (optionally filter by seller or status)
 * POST /admin/stripe/payout-approval-requests
 *
 * Body: {
 *   wh_account_id: 1016 (optional - filter by specific seller),
 *   status: 'pending' | 'approved' | 'rejected' | 'all'
 * }
 */
public function adminGetAllPayoutApprovalRequests(Request $request)
{
    $wh_account_id = $request->wh_account_id; // Optional filter
    $status = $request->status ?? 'all';

    try {
        $query = DB::table('payout_approval_requests as par')
            ->leftJoin('wh_warehouse_user as wu', 'wu.wh_account_id', '=', 'par.wh_account_id')
            ->select(
                'par.*',
                'wu.locationname as store_name',
                'wu.firstname',
                'wu.lastname',
                'wu.email as seller_email',
                'wu.stripe_connect_id',
                'wu.Shipper_earnings as current_balance'
            );

        // Filter by specific seller if provided
        if ($wh_account_id) {
            $query->where('par.wh_account_id', $wh_account_id);
        }

        // Filter by status if not 'all'
        if ($status !== 'all') {
            $query->where('par.status', $status);
        }

        $requests = $query
            ->orderBy('par.created_at', 'desc')
            ->get();

        // Get summary stats
        $stats = [
            'total_requests' => DB::table('payout_approval_requests')->count(),
            'pending' => DB::table('payout_approval_requests')->where('status', 'pending')->count(),
            'approved' => DB::table('payout_approval_requests')->where('status', 'approved')->count(),
            'rejected' => DB::table('payout_approval_requests')->where('status', 'rejected')->count(),
            'total_requested_amount' => DB::table('payout_approval_requests')
                ->where('status', 'pending')
                ->sum('amount'),
            'total_approved_amount' => DB::table('payout_approval_requests')
                ->where('status', 'approved')
                ->sum('amount')
        ];

        return response()->json([
            'status' => 1,
            'message' => 'Approval requests retrieved',
            'data' => [
                'requests' => $requests,
                'stats' => $stats
            ]
        ]);

    } catch (Exception $e) {
        Log::error('[PAYOUT APPROVAL ADMIN] Error fetching requests', [
            'error' => $e->getMessage()
        ]);

        return response()->json([
            'status' => 0,
            'message' => 'Failed to fetch approval requests: ' . $e->getMessage()
        ]);
    }
}

/**
 * [ADMIN] Approve payout request and create payout
 * POST /admin/stripe/approve-payout-request
 *
 * Body: {
 *   request_id: 123,
 *   admin_notes: "Approved by admin"
 * }
 */
public function approvePayoutRequest(Request $request)
{
    $request_id = $request->request_id;
    $admin_notes = $request->admin_notes ?? '';
    $admin_id = $request->admin_id ?? null; // Optional: logged-in admin ID

    if (!$request_id) {
        return response()->json([
            'status' => 0,
            'message' => 'Request ID is required'
        ]);
    }

    try {
        // Get the approval request
        $approvalRequest = DB::table('payout_approval_requests')
            ->where('id', $request_id)
            ->first();

        if (!$approvalRequest) {
            return response()->json([
                'status' => 0,
                'message' => 'Approval request not found'
            ]);
        }

        // Check if already processed
        if ($approvalRequest->status !== 'pending') {
            return response()->json([
                'status' => 0,
                'message' => 'This request has already been ' . $approvalRequest->status
            ]);
        }

        // Get seller details
        $seller = DB::table('wh_warehouse_user')
            ->where('wh_account_id', $approvalRequest->wh_account_id)
            ->first();

        if (!$seller) {
            return response()->json([
                'status' => 0,
                'message' => 'Seller not found'
            ]);
        }

        if (!$seller->stripe_connect_id || !$seller->stripe_payouts_enabled) {
            return response()->json([
                'status' => 0,
                'message' => 'Seller Stripe account not properly configured'
            ]);
        }

        // Verify seller still has sufficient balance
        $availableBalance = $seller->Shipper_earnings ?? 0;
        if ($approvalRequest->amount > $availableBalance) {
            return response()->json([
                'status' => 0,
                'message' => "Insufficient balance. Requested: $" . $approvalRequest->amount . ", Available: $" . $availableBalance
            ]);
        }

        // Create the actual Stripe payout
        try {
            $payout = $this->createStripePayout(
                $seller->stripe_connect_id,
                $approvalRequest->amount,
                $seller->wh_account_id
            );

            // Record payout in database
            $payoutId = DB::table('stripe_payouts')->insertGetId([
                'wh_account_id' => $seller->wh_account_id,
                'stripe_payout_id' => $payout->id,
                'stripe_connect_account_id' => $seller->stripe_connect_id,
                'amount' => $approvalRequest->amount,
                'currency' => 'USD',
                'status' => $payout->status,
                'payout_type' => 'admin_approved',
                'method' => $payout->method ?? 'standard',
                'arrival_date' => isset($payout->arrival_date) ? date('Y-m-d', $payout->arrival_date) : null,
                'stripe_response' => json_encode($payout),
                'created_by' => 'admin',
                'created_at' => now(),
                'updated_at' => now()
            ]);

            // Update seller balance
            DB::table('wh_warehouse_user')
                ->where('wh_account_id', $seller->wh_account_id)
                ->update([
                    'Shipper_earnings' => DB::raw("Shipper_earnings - " . $approvalRequest->amount),
                    'updated_at' => now()
                ]);

            // Update approval request status
            DB::table('payout_approval_requests')
                ->where('id', $request_id)
                ->update([
                    'status' => 'approved',
                    'admin_notes' => $admin_notes,
                    'approved_by_admin_id' => $admin_id,
                    'stripe_payout_id' => $payoutId,
                    'processed_at' => now(),
                    'updated_at' => now()
                ]);

            Log::info('[PAYOUT APPROVAL] Request approved and payout created', [
                'request_id' => $request_id,
                'wh_account_id' => $seller->wh_account_id,
                'amount' => $approvalRequest->amount,
                'payout_id' => $payoutId,
                'stripe_payout_id' => $payout->id
            ]);

            return response()->json([
                'status' => 1,
                'message' => 'Payout approved and created successfully',
                'data' => [
                    'approval_request_id' => $request_id,
                    'payout_id' => $payoutId,
                    'stripe_payout_id' => $payout->id,
                    'amount' => $approvalRequest->amount,
                    'status' => $payout->status,
                    'arrival_date' => isset($payout->arrival_date) ? date('Y-m-d', $payout->arrival_date) : null
                ]
            ]);

        } catch (Exception $payoutException) {
            // Payout creation failed - log but don't mark as approved
            Log::error('[PAYOUT APPROVAL] Payout creation failed', [
                'request_id' => $request_id,
                'error' => $payoutException->getMessage()
            ]);

            return response()->json([
                'status' => 0,
                'message' => 'Failed to create payout: ' . $payoutException->getMessage()
            ]);
        }

    } catch (Exception $e) {
        Log::error('[PAYOUT APPROVAL] Error approving request', [
            'error' => $e->getMessage(),
            'request_id' => $request_id
        ]);

        return response()->json([
            'status' => 0,
            'message' => 'Failed to approve request: ' . $e->getMessage()
        ]);
    }
}

/**
 * [ADMIN] Reject payout request
 * POST /admin/stripe/reject-payout-request
 *
 * Body: {
 *   request_id: 123,
 *   rejection_reason: "Insufficient documentation"
 * }
 */
public function rejectPayoutRequest(Request $request)
{
    $request_id = $request->request_id;
    $rejection_reason = $request->rejection_reason ?? '';
    $admin_id = $request->admin_id ?? null; // Optional: logged-in admin ID

    if (!$request_id) {
        return response()->json([
            'status' => 0,
            'message' => 'Request ID is required'
        ]);
    }

    if (!$rejection_reason) {
        return response()->json([
            'status' => 0,
            'message' => 'Rejection reason is required'
        ]);
    }

    try {
        // Get the approval request
        $approvalRequest = DB::table('payout_approval_requests')
            ->where('id', $request_id)
            ->first();

        if (!$approvalRequest) {
            return response()->json([
                'status' => 0,
                'message' => 'Approval request not found'
            ]);
        }

        // Check if already processed
        if ($approvalRequest->status !== 'pending') {
            return response()->json([
                'status' => 0,
                'message' => 'This request has already been ' . $approvalRequest->status
            ]);
        }

        // Update approval request status
        DB::table('payout_approval_requests')
            ->where('id', $request_id)
            ->update([
                'status' => 'rejected',
                'rejection_reason' => $rejection_reason,
                'approved_by_admin_id' => $admin_id,
                'processed_at' => now(),
                'updated_at' => now()
            ]);

        Log::info('[PAYOUT APPROVAL] Request rejected', [
            'request_id' => $request_id,
            'wh_account_id' => $approvalRequest->wh_account_id,
            'amount' => $approvalRequest->amount,
            'rejection_reason' => $rejection_reason
        ]);

        return response()->json([
            'status' => 1,
            'message' => 'Payout request rejected',
            'data' => [
                'request_id' => $request_id,
                'status' => 'rejected',
                'rejection_reason' => $rejection_reason,
                'processed_at' => now()->toDateTimeString()
            ]
        ]);

    } catch (Exception $e) {
        Log::error('[PAYOUT APPROVAL] Error rejecting request', [
            'error' => $e->getMessage(),
            'request_id' => $request_id
        ]);

        return response()->json([
            'status' => 0,
            'message' => 'Failed to reject request: ' . $e->getMessage()
        ]);
    }
}
