<?php

namespace App\Http\Controllers\Api\Seller;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Stripe\Stripe;
use Stripe\Account;
use Stripe\AccountLink;
use Stripe\Transfer;
use Stripe\Payout;
use Exception;

class StripeConnectController extends Controller
{
    public function __construct()
    {
        Stripe::setApiKey(config('stripe-connect.secret_key'));
    }

    // ============================================
    // SELLER ONBOARDING
    // ============================================

    /**
     * Create Stripe Connect account and return onboarding link
     * POST /seller/stripe/onboard
     *
     * Body: { wh_account_id: 1016 }
     */
    public function createConnectAccount(Request $request)
    {
        $wh_account_id = $request->wh_account_id;

        if (!$wh_account_id) {
            return response()->json([
                'status' => 0,
                'message' => 'Account ID is required'
            ]);
        }

        try {
            // Get seller details
            $seller = DB::table('wh_warehouse_user')
                ->where('wh_account_id', $wh_account_id)
                ->first();

            if (!$seller) {
                return response()->json([
                    'status' => 0,
                    'message' => 'Seller not found'
                ]);
            }

            // Check if already has Stripe account
            if ($seller->stripe_connect_id) {
                // Check if account still exists in Stripe
                try {
                    $account = Account::retrieve($seller->stripe_connect_id);

                    // Check if onboarding is incomplete
                    $details_submitted = $account->details_submitted ?? false;
                    $charges_enabled = $account->charges_enabled ?? false;
                    $payouts_enabled = $account->payouts_enabled ?? false;

                    Log::info('[STRIPE CONNECT] Checking account status', [
                        'wh_account_id' => $wh_account_id,
                        'stripe_account_id' => $seller->stripe_connect_id,
                        'details_submitted' => $details_submitted,
                        'charges_enabled' => $charges_enabled,
                        'payouts_enabled' => $payouts_enabled
                    ]);

                    // Update database with current Stripe status (sync in case webhook missed it)
                    DB::table('wh_warehouse_user')
                        ->where('wh_account_id', $wh_account_id)
                        ->update([
                            'stripe_onboarding_completed' => $details_submitted ? 1 : 0,
                            'stripe_charges_enabled' => $charges_enabled ? 1 : 0,
                            'stripe_payouts_enabled' => $payouts_enabled ? 1 : 0,
                            'stripe_connect' => ($details_submitted && $payouts_enabled) ? 1 : 0,
                            'updated_at' => now()
                        ]);

                    Log::info('[STRIPE CONNECT] Database updated with Stripe status');

                    // If account exists but onboarding not complete, return refresh link
                    if (!$details_submitted || !$payouts_enabled) {
                        Log::info('[STRIPE CONNECT] Account incomplete, providing refresh link');
                        return $this->refreshOnboardingLink($request);
                    }

                    // Account is fully connected and active
                    Log::info('[STRIPE CONNECT] Account fully connected');
                    return response()->json([
                        'status' => 1,
                        'message' => 'Stripe account already connected and active',
                        'data' => [
                            'stripe_account_id' => $seller->stripe_connect_id,
                            'onboarding_completed' => 1,
                            'charges_enabled' => 1,
                            'payouts_enabled' => 1,
                            'already_connected' => true
                        ]
                    ]);
                } catch (Exception $e) {
                    // Account doesn't exist anymore, create new one
                    Log::warning('[STRIPE CONNECT] Previous account not found, creating new', [
                        'wh_account_id' => $wh_account_id,
                        'old_account_id' => $seller->stripe_connect_id
                    ]);
                }
            }

            // Create Stripe Connect Account
            $account = Account::create([
                'type' => config('stripe-connect.account_type', 'express'),
                'country' => config('stripe-connect.default_country', 'US'),
                'email' => $seller->email,
                'capabilities' => config('stripe-connect.capabilities'),
                'business_type' => 'individual', // or 'company'
                'metadata' => [
                    'wh_account_id' => $wh_account_id,
                    'store_name' => $seller->locationname ?? $seller->firstname . ' ' . $seller->lastname,
                    'platform' => 'shipting'
                ]
            ]);

            Log::info('[STRIPE CONNECT] Account created', [
                'wh_account_id' => $wh_account_id,
                'stripe_account_id' => $account->id
            ]);

            // Update database
            DB::table('wh_warehouse_user')
                ->where('wh_account_id', $wh_account_id)
                ->update([
                    'stripe_connect_id' => $account->id,
                    'stripe_account_type' => $account->type,
                    'stripe_connect' => 0, // Not fully connected yet
                    'stripe_onboarding_completed' => 0,
                    'stripe_charges_enabled' => 0,
                    'stripe_payouts_enabled' => 0,
                    'updated_at' => now()
                ]);

            // Create account link for onboarding
            $accountLink = AccountLink::create([
                'account' => $account->id,
                'refresh_url' => config('stripe-connect.refresh_url'),
                'return_url' => config('stripe-connect.return_url'),
                'type' => 'account_onboarding',
            ]);

            // Store account in cache table
            DB::table('stripe_connect_accounts')->insert([
                'wh_account_id' => $wh_account_id,
                'stripe_account_id' => $account->id,
                'account_type' => $account->type,
                'country' => $account->country,
                'email' => $account->email,
                'charges_enabled' => false,
                'payouts_enabled' => false,
                'details_submitted' => false,
                'full_stripe_response' => json_encode($account),
                'last_synced_at' => now(),
                'created_at' => now(),
                'updated_at' => now()
            ]);

            return response()->json([
                'status' => 1,
                'message' => 'Onboarding link created',
                'data' => [
                    'stripe_account_id' => $account->id,
                    'onboarding_url' => $accountLink->url,
                    'expires_at' => $accountLink->expires_at
                ]
            ]);

        } catch (Exception $e) {
            Log::error('[STRIPE CONNECT] Error creating account', [
                'error' => $e->getMessage(),
                'wh_account_id' => $wh_account_id
            ]);

            return response()->json([
                'status' => 0,
                'message' => 'Failed to create Stripe account: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * Refresh onboarding link for incomplete onboarding
     * POST /seller/stripe/onboard-refresh
     *
     * Body: { wh_account_id: 1016 }
     */
    public function refreshOnboardingLink(Request $request)
    {
        $wh_account_id = $request->wh_account_id;

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

            if (!$seller || !$seller->stripe_connect_id) {
                return response()->json([
                    'status' => 0,
                    'message' => 'No Stripe account found. Please start onboarding first.'
                ]);
            }

            // Create new account link
            $accountLink = AccountLink::create([
                'account' => $seller->stripe_connect_id,
                'refresh_url' => config('stripe-connect.refresh_url'),
                'return_url' => config('stripe-connect.return_url'),
                'type' => 'account_onboarding',
            ]);

            Log::info('[STRIPE CONNECT] Onboarding link refreshed', [
                'wh_account_id' => $wh_account_id,
                'stripe_account_id' => $seller->stripe_connect_id
            ]);

            return response()->json([
                'status' => 1,
                'message' => 'Onboarding link refreshed',
                'data' => [
                    'onboarding_url' => $accountLink->url,
                    'expires_at' => $accountLink->expires_at
                ]
            ]);

        } catch (Exception $e) {
            Log::error('[STRIPE CONNECT] Error refreshing link', [
                'error' => $e->getMessage(),
                'wh_account_id' => $wh_account_id
            ]);

            return response()->json([
                'status' => 0,
                'message' => 'Failed to refresh onboarding link: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * Get Stripe Connect status for seller
     * POST /seller/stripe/status
     *
     * Body: { wh_account_id: 1016 }
     */
    public function getConnectStatus(Request $request)
    {
        $wh_account_id = $request->wh_account_id;

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

            // If no Stripe account, return not connected
            if (!$seller->stripe_connect_id) {
                return response()->json([
                    'status' => 1,
                    'message' => 'Not connected',
                    'data' => [
                        'connected' => false,
                        'stripe_connect_id' => null,
                        'onboarding_completed' => false,
                        'charges_enabled' => false,
                        'payouts_enabled' => false
                    ]
                ]);
            }

            // Fetch latest status from Stripe
            $account = Account::retrieve($seller->stripe_connect_id);

            // Update local database
            $this->syncAccountToDatabase($wh_account_id, $account);

            $requirements = [
                'currently_due' => $account->requirements->currently_due ?? [],
                'eventually_due' => $account->requirements->eventually_due ?? [],
                'past_due' => $account->requirements->past_due ?? [],
                'disabled_reason' => $account->requirements->disabled_reason ?? null
            ];

            return response()->json([
                'status' => 1,
                'message' => 'Status retrieved',
                'data' => [
                    'connected' => $seller->stripe_connect == 1,
                    'stripe_connect_id' => $seller->stripe_connect_id,
                    'onboarding_completed' => $account->details_submitted,
                    'charges_enabled' => $account->charges_enabled,
                    'payouts_enabled' => $account->payouts_enabled,
                    'payment_model' => $seller->stripe_payment_model ?? 'separate',
                    'payout_frequency' => $seller->stripe_payout_frequency ?? 'monthly',
                    'commission_percentage' => $seller->stripe_commission_percentage ?? 5.00,
                    'minimum_payout' => $seller->stripe_minimum_payout ?? 50.00,
                    'requirements' => $requirements,
                    'account_type' => $account->type,
                    'country' => $account->country,
                    'default_currency' => $account->default_currency
                ]
            ]);

        } catch (Exception $e) {
            Log::error('[STRIPE CONNECT] Error getting status', [
                'error' => $e->getMessage(),
                'wh_account_id' => $wh_account_id
            ]);

            return response()->json([
                'status' => 0,
                'message' => 'Failed to get status: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * Get Stripe Express Dashboard link
     * POST /seller/stripe/dashboard
     *
     * Body: { wh_account_id: 1016 }
     */
    public function getDashboardLink(Request $request)
    {
        $wh_account_id = $request->wh_account_id;

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

            if (!$seller || !$seller->stripe_connect_id) {
                return response()->json([
                    'status' => 0,
                    'message' => 'Stripe account not found'
                ]);
            }

            // Create login link for Express dashboard
            $loginLink = \Stripe\Account::createLoginLink($seller->stripe_connect_id);

            Log::info('[STRIPE CONNECT] Dashboard link created', [
                'wh_account_id' => $wh_account_id,
                'stripe_account_id' => $seller->stripe_connect_id
            ]);

            return response()->json([
                'status' => 1,
                'message' => 'Dashboard link created',
                'data' => [
                    'dashboard_url' => $loginLink->url
                ]
            ]);

        } catch (Exception $e) {
            Log::error('[STRIPE CONNECT] Error creating dashboard link', [
                'error' => $e->getMessage(),
                'wh_account_id' => $wh_account_id
            ]);

            return response()->json([
                'status' => 0,
                'message' => 'Failed to create dashboard link: ' . $e->getMessage()
            ]);
        }
    }

    // ============================================
    // EARNINGS & TRANSACTIONS
    // ============================================

    /**
     * Get seller's earnings summary
     * POST /seller/stripe/earnings
     *
     * Body: { wh_account_id: 1016 }
     */
    public function getEarnings(Request $request)
    {
        $wh_account_id = $request->wh_account_id;

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

            // Get transaction summaries
            $totalEarned = DB::table('stripe_transactions')
                ->where('wh_account_id', $wh_account_id)
                ->where('transaction_type', 'charge')
                ->where('status', 'succeeded')
                ->sum('seller_earnings');

            $totalPaidOut = DB::table('stripe_transactions')
                ->where('wh_account_id', $wh_account_id)
                ->where('transaction_type', 'payout')
                ->where('status', 'succeeded')
                ->sum('amount');

            $pendingEarnings = $seller->Shipper_earnings ?? 0;

            $totalOrders = DB::table('stripe_transactions')
                ->where('wh_account_id', $wh_account_id)
                ->where('transaction_type', 'charge')
                ->where('status', 'succeeded')
                ->count();

            // Recent transactions
            $recentTransactions = DB::table('stripe_transactions')
                ->where('wh_account_id', $wh_account_id)
                ->orderBy('created_at', 'desc')
                ->limit(10)
                ->get();

            return response()->json([
                'status' => 1,
                'message' => 'Earnings retrieved',
                'data' => [
                    'total_earned' => (float) $totalEarned,
                    'total_paid_out' => (float) $totalPaidOut,
                    'pending_earnings' => (float) $pendingEarnings,
                    'available_balance' => (float) ($pendingEarnings), // Same as pending for now
                    'total_orders' => $totalOrders,
                    'commission_percentage' => $seller->stripe_commission_percentage ?? 5.00,
                    'minimum_payout' => $seller->stripe_minimum_payout ?? 50.00,
                    'can_request_payout' => $pendingEarnings >= ($seller->stripe_minimum_payout ?? 50.00),
                    'recent_transactions' => $recentTransactions,
                    'payment_model' => $seller->stripe_payment_model ?? 'separate',
                    'payout_frequency' => $seller->stripe_payout_frequency ?? 'monthly'
                ]
            ]);

        } catch (Exception $e) {
            Log::error('[STRIPE CONNECT] Error getting earnings', [
                'error' => $e->getMessage(),
                'wh_account_id' => $wh_account_id
            ]);

            return response()->json([
                'status' => 0,
                'message' => 'Failed to get earnings: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * Get transaction history
     * POST /seller/stripe/transactions
     *
     * Body: { wh_account_id: 1016, limit: 50, offset: 0, type: 'charge' }
     */
    public function getTransactions(Request $request)
    {
        $wh_account_id = $request->wh_account_id;
        $limit = $request->limit ?? 50;
        $offset = $request->offset ?? 0;
        $type = $request->type; // Optional filter

        if (!$wh_account_id) {
            return response()->json([
                'status' => 0,
                'message' => 'Account ID is required'
            ]);
        }

        try {
            $query = DB::table('stripe_transactions')
                ->where('wh_account_id', $wh_account_id);

            if ($type) {
                $query->where('transaction_type', $type);
            }

            $total = $query->count();

            $transactions = $query
                ->orderBy('created_at', 'desc')
                ->limit($limit)
                ->offset($offset)
                ->get();

            return response()->json([
                'status' => 1,
                'message' => 'Transactions retrieved',
                'data' => [
                    'transactions' => $transactions,
                    'total' => $total,
                    'limit' => $limit,
                    'offset' => $offset
                ]
            ]);

        } catch (Exception $e) {
            Log::error('[STRIPE CONNECT] Error getting transactions', [
                'error' => $e->getMessage(),
                'wh_account_id' => $wh_account_id
            ]);

            return response()->json([
                'status' => 0,
                'message' => 'Failed to get transactions: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * Get payout history
     * POST /seller/stripe/payouts
     *
     * Body: { wh_account_id: 1016, limit: 20 }
     */
    public function getPayouts(Request $request)
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
            $payouts = DB::table('stripe_payouts')
                ->where('wh_account_id', $wh_account_id)
                ->orderBy('created_at', 'desc')
                ->limit($limit)
                ->get();

            $totalPaid = DB::table('stripe_payouts')
                ->where('wh_account_id', $wh_account_id)
                ->where('status', 'paid')
                ->sum('amount');

            return response()->json([
                'status' => 1,
                'message' => 'Payouts retrieved',
                'data' => [
                    'payouts' => $payouts,
                    'total_paid' => (float) $totalPaid
                ]
            ]);

        } catch (Exception $e) {
            Log::error('[STRIPE CONNECT] Error getting payouts', [
                'error' => $e->getMessage(),
                'wh_account_id' => $wh_account_id
            ]);

            return response()->json([
                'status' => 0,
                'message' => 'Failed to get payouts: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * Request manual payout
     * POST /seller/stripe/request-payout
     *
     * Body: { wh_account_id: 1016, amount: 100.00 (optional) }
     */
    public function requestPayout(Request $request)
    {
        $wh_account_id = $request->wh_account_id;
        $amount = $request->amount; // Optional - if not provided, payout full balance

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

            // Determine payout amount
            $payoutAmount = $amount ?? $availableBalance;

            if ($payoutAmount > $availableBalance) {
                return response()->json([
                    'status' => 0,
                    'message' => 'Insufficient balance'
                ]);
            }

            // Create payout via Stripe
            try {
                $payout = $this->createStripePayout($seller->stripe_connect_id, $payoutAmount, $wh_account_id);

                // Record in database
                $payoutId = DB::table('stripe_payouts')->insertGetId([
                    'wh_account_id' => $wh_account_id,
                    'stripe_payout_id' => $payout->id,
                    'stripe_connect_account_id' => $seller->stripe_connect_id,
                    'amount' => $payoutAmount,
                    'currency' => 'USD',
                    'status' => $payout->status,
                    'payout_type' => 'manual',
                    'method' => $payout->method ?? 'standard',
                    'arrival_date' => isset($payout->arrival_date) ? date('Y-m-d', $payout->arrival_date) : null,
                    'stripe_response' => json_encode($payout),
                    'created_by' => 'seller',
                    'created_at' => now(),
                    'updated_at' => now()
                ]);

                // Update seller balance
                DB::table('wh_warehouse_user')
                    ->where('wh_account_id', $wh_account_id)
                    ->update([
                        'Shipper_earnings' => DB::raw("Shipper_earnings - $payoutAmount"),
                        'updated_at' => now()
                    ]);

                Log::info('[STRIPE CONNECT] Payout requested', [
                    'wh_account_id' => $wh_account_id,
                    'amount' => $payoutAmount,
                    'stripe_payout_id' => $payout->id
                ]);

                return response()->json([
                    'status' => 1,
                    'message' => 'Payout requested successfully',
                    'data' => [
                        'payout_id' => $payoutId,
                        'stripe_payout_id' => $payout->id,
                        'amount' => $payoutAmount,
                        'status' => $payout->status,
                        'arrival_date' => isset($payout->arrival_date) ? date('Y-m-d', $payout->arrival_date) : null
                    ]
                ]);
            } catch (Exception $payoutException) {
                // Return the specific error message from Stripe
                return response()->json([
                    'status' => 0,
                    'message' => $payoutException->getMessage()
                ]);
            }

        } catch (Exception $e) {
            Log::error('[STRIPE CONNECT] Error requesting payout', [
                'error' => $e->getMessage(),
                'wh_account_id' => $wh_account_id
            ]);

            return response()->json([
                'status' => 0,
                'message' => 'Failed to request payout: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * Disconnect Stripe account
     * POST /seller/stripe/disconnect
     *
     * Body: { wh_account_id: 1016 }
     */
    public function disconnect(Request $request)
    {
        $wh_account_id = $request->wh_account_id;

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

            if (!$seller || !$seller->stripe_connect_id) {
                return response()->json([
                    'status' => 0,
                    'message' => 'No Stripe account found'
                ]);
            }

            // Check if there are pending earnings
            if ($seller->Shipper_earnings > 0) {
                return response()->json([
                    'status' => 0,
                    'message' => 'Cannot disconnect with pending earnings. Please withdraw all funds first.'
                ]);
            }

            // Delete Stripe account (disconnect)
            // Note: This doesn't delete the account, just revokes authorization
            try {
                $account = Account::retrieve($seller->stripe_connect_id);
                $account->delete();
            } catch (Exception $e) {
                // Account may already be deleted
                Log::warning('[STRIPE CONNECT] Account already deleted or not found', [
                    'stripe_account_id' => $seller->stripe_connect_id
                ]);
            }

            // Update database
            DB::table('wh_warehouse_user')
                ->where('wh_account_id', $wh_account_id)
                ->update([
                    'stripe_connect' => 0,
                    'stripe_connect_id' => null,
                    'stripe_onboarding_completed' => 0,
                    'stripe_charges_enabled' => 0,
                    'stripe_payouts_enabled' => 0,
                    'updated_at' => now()
                ]);

            // Mark account as disconnected in cache
            DB::table('stripe_connect_accounts')
                ->where('wh_account_id', $wh_account_id)
                ->delete();

            Log::info('[STRIPE CONNECT] Account disconnected', [
                'wh_account_id' => $wh_account_id,
                'stripe_account_id' => $seller->stripe_connect_id
            ]);

            return response()->json([
                'status' => 1,
                'message' => 'Stripe account disconnected successfully'
            ]);

        } catch (Exception $e) {
            Log::error('[STRIPE CONNECT] Error disconnecting', [
                'error' => $e->getMessage(),
                'wh_account_id' => $wh_account_id
            ]);

            return response()->json([
                'status' => 0,
                'message' => 'Failed to disconnect: ' . $e->getMessage()
            ]);
        }
    }

    // ============================================
    // ADMIN ENDPOINTS
    // ============================================

    /**
     * [ADMIN] Get all sellers with Stripe Connect status
     * POST /admin/stripe/sellers
     *
     * Body: { status: 'all' | 'connected' | 'pending' | 'not_connected' }
     */
    public function adminGetAllSellers(Request $request)
    {
        $statusFilter = $request->status ?? 'all';

        try {
            $query = DB::table('wh_warehouse_user')
                ->select(
                    'wh_account_id',
                    'locationname as store_name',
                    'firstname',
                    'lastname',
                    'email',
                    'stripe_connect',
                    'stripe_connect_id',
                    'stripe_onboarding_completed',
                    'stripe_charges_enabled',
                    'stripe_payouts_enabled',
                    'stripe_payment_model',
                    'stripe_payout_frequency',
                    'stripe_commission_percentage',
                    'Shipper_earnings as pending_earnings',
                    'paid_shipper_earnings as total_paid',
                    'created_at'
                );

            // Apply status filter
            switch ($statusFilter) {
                case 'connected':
                    $query->where('stripe_connect', 1)
                          ->where('stripe_payouts_enabled', 1);
                    break;
                case 'pending':
                    $query->whereNotNull('stripe_connect_id')
                          ->where('stripe_onboarding_completed', 0);
                    break;
                case 'not_connected':
                    $query->whereNull('stripe_connect_id');
                    break;
            }

            $sellers = $query->orderBy('created_at', 'desc')->get();

            // Get summary stats
            $stats = [
                'total_sellers' => DB::table('wh_warehouse_user')->count(),
                'connected' => DB::table('wh_warehouse_user')->where('stripe_connect', 1)->count(),
                'pending' => DB::table('wh_warehouse_user')
                    ->whereNotNull('stripe_connect_id')
                    ->where('stripe_onboarding_completed', 0)
                    ->count(),
                'not_connected' => DB::table('wh_warehouse_user')->whereNull('stripe_connect_id')->count(),
                'total_pending_earnings' => DB::table('wh_warehouse_user')->sum('Shipper_earnings'),
                'total_paid_out' => DB::table('wh_warehouse_user')->sum('paid_shipper_earnings')
            ];

            return response()->json([
                'status' => 1,
                'message' => 'Sellers retrieved',
                'data' => [
                    'sellers' => $sellers,
                    'stats' => $stats
                ]
            ]);

        } catch (Exception $e) {
            Log::error('[STRIPE CONNECT ADMIN] Error getting sellers', [
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'status' => 0,
                'message' => 'Failed to get sellers: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * [ADMIN] Get seller's Stripe details
     * POST /admin/stripe/seller-detail
     *
     * Body: { wh_account_id: 1016 }
     */
    public function adminGetSellerDetail(Request $request)
    {
        $wh_account_id = $request->wh_account_id;

        if (!$wh_account_id) {
            return response()->json([
                'status' => 0,
                'message' => 'Account ID is required'
            ]);
        }

        // Just call the seller's getConnectStatus method
        return $this->getConnectStatus($request);
    }

    /**
     * [ADMIN] Update seller's Stripe config
     * POST /admin/stripe/update-config
     *
     * Body: {
     *   wh_account_id: 1016,
     *   payment_model: 'separate',
     *   payout_frequency: 'monthly',
     *   commission_percentage: 5.00,
     *   minimum_payout: 50.00,
     *   auto_payout_enabled: true
     * }
     */
    public function adminUpdateSellerConfig(Request $request)
    {
        $wh_account_id = $request->wh_account_id;

        if (!$wh_account_id) {
            return response()->json([
                'status' => 0,
                'message' => 'Account ID is required'
            ]);
        }

        try {
            $updates = [];

            if ($request->has('payment_model')) {
                $updates['stripe_payment_model'] = $request->payment_model;
            }

            if ($request->has('payout_frequency')) {
                $updates['stripe_payout_frequency'] = $request->payout_frequency;
            }

            if ($request->has('commission_percentage')) {
                $updates['stripe_commission_percentage'] = $request->commission_percentage;
            }

            if ($request->has('minimum_payout')) {
                $updates['stripe_minimum_payout'] = $request->minimum_payout;
            }

            if ($request->has('auto_payout_enabled')) {
                $updates['stripe_auto_payout_enabled'] = $request->auto_payout_enabled;
            }

            if ($request->has('config_notes')) {
                $updates['stripe_config_notes'] = $request->config_notes;
            }

            $updates['updated_at'] = now();

            DB::table('wh_warehouse_user')
                ->where('wh_account_id', $wh_account_id)
                ->update($updates);

            Log::info('[STRIPE CONNECT ADMIN] Config updated', [
                'wh_account_id' => $wh_account_id,
                'updates' => $updates
            ]);

            return response()->json([
                'status' => 1,
                'message' => 'Configuration updated successfully'
            ]);

        } catch (Exception $e) {
            Log::error('[STRIPE CONNECT ADMIN] Error updating config', [
                'error' => $e->getMessage(),
                'wh_account_id' => $wh_account_id
            ]);

            return response()->json([
                'status' => 0,
                'message' => 'Failed to update configuration: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * [ADMIN] Create payout for seller
     * POST /admin/stripe/create-payout
     *
     * Body: { wh_account_id: 1016, amount: 100.00 }
     */
    public function adminCreatePayout(Request $request)
    {
        // Same as seller requestPayout but created by admin
        return $this->requestPayout($request);
    }

    /**
     * [TESTING/DEV] Add test balance to PLATFORM account
     * POST /admin/stripe/add-test-balance
     *
     * Body: { wh_account_id: 1016, amount: 500.00 }
     *
     * NOTE: Only works in TEST mode. Adds balance to platform (not seller).
     */
    public function adminAddTestBalance(Request $request)
    {
        $wh_account_id = $request->wh_account_id;
        $amount = $request->amount ?? 500.00;

        if (!$wh_account_id) {
            return response()->json([
                'status' => 0,
                'message' => 'Account ID is required'
            ]);
        }

        // Check if in test mode
        $secretKey = config('stripe-connect.secret_key');
        if (!str_starts_with($secretKey, 'sk_test_')) {
            return response()->json([
                'status' => 0,
                'message' => 'This endpoint only works in TEST mode. Cannot add test balance in production.'
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

            // Create a test charge on the PLATFORM account (not connected account)
            // This simulates a customer payment to the platform
            $charge = \Stripe\Charge::create([
                'amount' => (int)($amount * 100),
                'currency' => 'usd',
                'source' => 'tok_visa', // Stripe test token
                'description' => "Test platform balance for seller payouts - $$amount",
                'metadata' => [
                    'wh_account_id' => $wh_account_id,
                    'test_balance' => 'true',
                    'added_at' => now()->toDateTimeString(),
                ],
            ]);

            // Get updated PLATFORM balance
            $platformBalance = \Stripe\Balance::retrieve();

            $availableBalance = 0;
            if (isset($platformBalance->available) && count($platformBalance->available) > 0) {
                $availableBalance = $platformBalance->available[0]->amount / 100;
            }

            // Also update the seller's pending earnings in database
            DB::table('wh_warehouse_user')
                ->where('wh_account_id', $wh_account_id)
                ->update([
                    'Shipper_earnings' => DB::raw("Shipper_earnings + $amount"),
                    'updated_at' => now()
                ]);

            Log::info('[STRIPE CONNECT TEST] Test balance added to PLATFORM', [
                'wh_account_id' => $wh_account_id,
                'amount_added' => $amount,
                'new_platform_balance' => $availableBalance
            ]);

            return response()->json([
                'status' => 1,
                'message' => "Test balance of $$amount added to platform account",
                'data' => [
                    'charge_id' => $charge->id,
                    'amount_added' => $amount,
                    'platform_balance' => $availableBalance,
                    'seller_pending_earnings' => $seller->Shipper_earnings + $amount,
                    'can_create_payout' => $availableBalance >= 50.00
                ]
            ]);

        } catch (Exception $e) {
            Log::error('[STRIPE CONNECT TEST] Error adding test balance', [
                'error' => $e->getMessage(),
                'wh_account_id' => $wh_account_id
            ]);

            return response()->json([
                'status' => 0,
                'message' => 'Failed to add test balance: ' . $e->getMessage()
            ]);
        }
    }

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

    /**
     * [ADMIN] Get all transactions (platform-wide)
     * POST /admin/stripe/transactions
     *
     * Body: { limit: 100, offset: 0, type: 'charge' }
     */
    public function adminGetAllTransactions(Request $request)
    {
        $limit = $request->limit ?? 100;
        $offset = $request->offset ?? 0;
        $type = $request->type;

        try {
            $query = DB::table('stripe_transactions as st')
                ->leftJoin('wh_warehouse_user as wu', 'wu.id', '=', 'st.wh_account_id')
                ->select(
                    'st.*',
                    'wu.locationname as store_name',
                    'wu.email as seller_email'
                );

            if ($type) {
                $query->where('st.transaction_type', $type);
            }

            $total = $query->count();

            $transactions = $query
                ->orderBy('st.created_at', 'desc')
                ->limit($limit)
                ->offset($offset)
                ->get();

            // Get summary stats
            $stats = [
                'total_charges' => DB::table('stripe_transactions')
                    ->where('transaction_type', 'charge')
                    ->where('status', 'succeeded')
                    ->sum('amount'),
                'total_platform_fees' => DB::table('stripe_transactions')
                    ->where('transaction_type', 'charge')
                    ->where('status', 'succeeded')
                    ->sum('platform_fee'),
                'total_seller_earnings' => DB::table('stripe_transactions')
                    ->where('transaction_type', 'charge')
                    ->where('status', 'succeeded')
                    ->sum('seller_earnings'),
                'total_payouts' => DB::table('stripe_transactions')
                    ->where('transaction_type', 'payout')
                    ->where('status', 'succeeded')
                    ->sum('amount')
            ];

            return response()->json([
                'status' => 1,
                'message' => 'Transactions retrieved',
                'data' => [
                    'transactions' => $transactions,
                    'stats' => $stats,
                    'total' => $total,
                    'limit' => $limit,
                    'offset' => $offset
                ]
            ]);

        } catch (Exception $e) {
            Log::error('[STRIPE CONNECT ADMIN] Error getting transactions', [
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'status' => 0,
                'message' => 'Failed to get transactions: ' . $e->getMessage()
            ]);
        }
    }

    // ============================================
    // HELPER METHODS
    // ============================================

    /**
     * Sync Stripe account data to local database
     */
    private function syncAccountToDatabase($wh_account_id, $account)
    {
        try {
            // Update wh_warehouse_user
            DB::table('wh_warehouse_user')
                ->where('wh_account_id', $wh_account_id)
                ->update([
                    'stripe_connect' => $account->charges_enabled && $account->payouts_enabled ? 1 : 0,
                    'stripe_onboarding_completed' => $account->details_submitted ? 1 : 0,
                    'stripe_charges_enabled' => $account->charges_enabled ? 1 : 0,
                    'stripe_payouts_enabled' => $account->payouts_enabled ? 1 : 0,
                    'stripe_details_submitted' => $account->details_submitted ? 1 : 0,
                    'stripe_currently_due' => json_encode($account->requirements->currently_due ?? []),
                    'stripe_last_sync' => now(),
                    'updated_at' => now()
                ]);

            // Update or insert stripe_connect_accounts cache
            DB::table('stripe_connect_accounts')->updateOrInsert(
                ['wh_account_id' => $wh_account_id],
                [
                    'stripe_account_id' => $account->id,
                    'account_type' => $account->type,
                    'country' => $account->country,
                    'email' => $account->email,
                    'business_type' => $account->business_type,
                    'charges_enabled' => $account->charges_enabled,
                    'payouts_enabled' => $account->payouts_enabled,
                    'details_submitted' => $account->details_submitted,
                    'currently_due' => json_encode($account->requirements->currently_due ?? []),
                    'eventually_due' => json_encode($account->requirements->eventually_due ?? []),
                    'past_due' => json_encode($account->requirements->past_due ?? []),
                    'disabled_reason' => $account->requirements->disabled_reason ?? null,
                    'default_currency' => $account->default_currency,
                    'capabilities' => json_encode($account->capabilities ?? []),
                    'full_stripe_response' => json_encode($account),
                    'last_synced_at' => now(),
                    'updated_at' => now()
                ]
            );

            Log::info('[STRIPE CONNECT] Account synced to database', [
                'wh_account_id' => $wh_account_id,
                'stripe_account_id' => $account->id
            ]);

        } catch (Exception $e) {
            Log::error('[STRIPE CONNECT] Error syncing account', [
                'error' => $e->getMessage(),
                'wh_account_id' => $wh_account_id
            ]);
        }
    }

    /**
     * Create a Stripe transfer from platform to seller's connected account
     * Then optionally trigger a payout from connected account to seller's bank
     */
    private function createStripePayout($stripeAccountId, $amount, $wh_account_id)
    {
        try {
            // First, check PLATFORM balance (not connected account balance)
            $platformBalance = \Stripe\Balance::retrieve();

            // Get platform's available balance in cents
            $availableBalance = 0;
            if (isset($platformBalance->available) && count($platformBalance->available) > 0) {
                $availableBalance = $platformBalance->available[0]->amount;
            }

            Log::info('[STRIPE CONNECT] Checking PLATFORM balance before payout', [
                'wh_account_id' => $wh_account_id,
                'stripe_account_id' => $stripeAccountId,
                'platform_available_balance_cents' => $availableBalance,
                'requested_amount_dollars' => $amount
            ]);

            // Convert to cents
            $amountInCents = (int) ($amount * 100);

            // Check if platform has sufficient balance
            if ($availableBalance < $amountInCents) {
                $availableInDollars = number_format($availableBalance / 100, 2);
                Log::warning('[STRIPE CONNECT] Insufficient PLATFORM balance', [
                    'wh_account_id' => $wh_account_id,
                    'platform_available_balance' => $availableInDollars,
                    'requested_amount' => $amount
                ]);

                throw new Exception("Insufficient balance in platform account. Available: $$availableInDollars, Requested: $$amount. Platform needs funds before paying sellers.");
            }

            // Step 1: Transfer from platform to connected account
            $transfer = Transfer::create([
                'amount' => $amountInCents,
                'currency' => 'usd',
                'destination' => $stripeAccountId,
                'description' => "Payout to seller (wh_account_id: $wh_account_id)",
                'metadata' => [
                    'wh_account_id' => $wh_account_id,
                    'platform' => 'shipting',
                    'type' => 'seller_payout'
                ]
            ]);

            Log::info('[STRIPE CONNECT] Transfer created from platform to seller', [
                'wh_account_id' => $wh_account_id,
                'transfer_id' => $transfer->id,
                'amount' => $amount
            ]);

            // Step 2: Create payout from connected account to seller's bank (optional)
            // The transfer already moved money to their Stripe balance
            // Stripe will handle automatic payouts based on their schedule,
            // but we can trigger immediate payout if needed
            try {
                $payout = Payout::create(
                    [
                        'amount' => $amountInCents,
                        'currency' => 'usd',
                        'description' => "Payout for seller $wh_account_id",
                        'method' => 'standard', // Free, takes 2-3 business days
                        'metadata' => [
                            'wh_account_id' => $wh_account_id,
                            'platform' => 'shipting',
                            'transfer_id' => $transfer->id
                        ]
                    ],
                    ['stripe_account' => $stripeAccountId]
                );

                Log::info('[STRIPE CONNECT] Payout created to seller bank', [
                    'wh_account_id' => $wh_account_id,
                    'payout_id' => $payout->id,
                    'transfer_id' => $transfer->id,
                    'amount' => $amount
                ]);

                // Return payout object
                return $payout;
            } catch (Exception $payoutError) {
                // If payout fails (e.g., no bank account), just log it
                // The transfer still succeeded, money is in their Stripe balance
                Log::warning('[STRIPE CONNECT] Payout to bank failed, but transfer succeeded', [
                    'wh_account_id' => $wh_account_id,
                    'transfer_id' => $transfer->id,
                    'payout_error' => $payoutError->getMessage()
                ]);

                // Return a mock payout object with the transfer info
                return (object)[
                    'id' => $transfer->id,
                    'status' => 'transferred',
                    'arrival_date' => null
                ];
            }

        } catch (Exception $e) {
            Log::error('[STRIPE CONNECT] Error creating payout', [
                'error' => $e->getMessage(),
                'stripe_account_id' => $stripeAccountId,
                'amount' => $amount
            ]);

            throw $e;
        }
    }
}
