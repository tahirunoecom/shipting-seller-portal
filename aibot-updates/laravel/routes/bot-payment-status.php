<?php

/**
 * Bot Payment Status Route
 *
 * Add this to your Laravel routes/web.php or routes/api.php:
 *
 * Route::get('/bot-payment-status', [App\Http\Controllers\BotPaymentController::class, 'handlePaymentStatus']);
 *
 * OR copy the closure version below directly into your routes file.
 */

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * OPTION 1: Add this route directly to your routes/api.php
 */
Route::get('/bot-payment-status', function (Request $request) {
    $session_id = $request->query('session_id');
    $status = $request->query('status', 'success');

    // Default values
    $whatsapp_number = null;
    $store_name = 'Store';

    if ($session_id) {
        try {
            // Set your Stripe secret key
            \Stripe\Stripe::setApiKey(config('services.stripe.secret'));

            // Retrieve the Stripe session
            $session = \Stripe\Checkout\Session::retrieve($session_id);

            // Get store_id from metadata (set when creating checkout session in Rasa)
            $store_id = $session->metadata->store_id ?? null;

            Log::info("[BOT-PAYMENT] Session retrieved", [
                'session_id' => $session_id,
                'store_id' => $store_id,
                'payment_status' => $session->payment_status
            ]);

            if ($store_id) {
                // Look up WhatsApp config for this store
                $config = DB::table('seller_whatsapp_config')
                    ->where('wh_account_id', $store_id)
                    ->where('is_connected', 1)
                    ->first();

                if ($config) {
                    // Remove the + from phone number for wa.me link
                    $whatsapp_number = ltrim($config->display_phone_number, '+');
                    $store_name = $config->business_name ?? $config->verified_name ?? 'Store';

                    Log::info("[BOT-PAYMENT] WhatsApp config found", [
                        'store_id' => $store_id,
                        'whatsapp_number' => $whatsapp_number,
                        'store_name' => $store_name
                    ]);
                } else {
                    Log::warning("[BOT-PAYMENT] No WhatsApp config found for store", [
                        'store_id' => $store_id
                    ]);
                }
            }
        } catch (\Exception $e) {
            Log::error("[BOT-PAYMENT] Error retrieving session", [
                'session_id' => $session_id,
                'error' => $e->getMessage()
            ]);
        }
    }

    // Choose view based on status
    $view = ($status === 'success') ? 'payment-success' : 'payment-cancelled';

    return view($view, [
        'whatsapp_number' => $whatsapp_number,
        'store_name' => $store_name,
        'session_id' => $session_id
    ]);
});


/**
 * OPTION 2: If you prefer a Controller, create this file at:
 * app/Http/Controllers/BotPaymentController.php
 *
 * Then add to routes/api.php:
 * Route::get('/bot-payment-status', [BotPaymentController::class, 'handlePaymentStatus']);
 */

/*

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class BotPaymentController extends Controller
{
    public function handlePaymentStatus(Request $request)
    {
        $session_id = $request->query('session_id');
        $status = $request->query('status', 'success');

        $whatsapp_number = null;
        $store_name = 'Store';

        if ($session_id) {
            try {
                \Stripe\Stripe::setApiKey(config('services.stripe.secret'));
                $session = \Stripe\Checkout\Session::retrieve($session_id);
                $store_id = $session->metadata->store_id ?? null;

                if ($store_id) {
                    $config = DB::table('seller_whatsapp_config')
                        ->where('wh_account_id', $store_id)
                        ->where('is_connected', 1)
                        ->first();

                    if ($config) {
                        $whatsapp_number = ltrim($config->display_phone_number, '+');
                        $store_name = $config->business_name ?? $config->verified_name ?? 'Store';
                    }
                }
            } catch (\Exception $e) {
                Log::error("[BOT-PAYMENT] Error: " . $e->getMessage());
            }
        }

        $view = ($status === 'success') ? 'payment-success' : 'payment-cancelled';

        return view($view, [
            'whatsapp_number' => $whatsapp_number,
            'store_name' => $store_name,
            'session_id' => $session_id
        ]);
    }
}

*/
