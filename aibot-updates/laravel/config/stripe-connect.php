<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Stripe Connect Configuration
    |--------------------------------------------------------------------------
    |
    | Configuration for Stripe Connect integration with seller payouts.
    | Allows flexible payment models and payout frequencies per seller.
    |
    */

    // Enable/disable Stripe Connect features
    'enabled' => env('STRIPE_CONNECT_ENABLED', true),

    // Stripe API credentials
    'secret_key' => env('STRIPE_SECRET_KEY'),
    'publishable_key' => env('STRIPE_KEY'),
    'webhook_secret' => env('STRIPE_CONNECT_WEBHOOK_SECRET'),

    // Default commission percentage (can be overridden per seller)
    'default_commission_percentage' => env('STRIPE_DEFAULT_COMMISSION', 5.00),

    // Minimum payout amount (USD)
    'minimum_payout_amount' => env('STRIPE_MIN_PAYOUT', 50.00),

    // Default payment model for new sellers
    // Options: 'direct', 'destination', 'separate'
    'default_payment_model' => env('STRIPE_DEFAULT_PAYMENT_MODEL', 'separate'),

    // Default payout frequency for new sellers
    // Options: 'daily', 'weekly', 'monthly', 'manual'
    'default_payout_frequency' => env('STRIPE_DEFAULT_PAYOUT_FREQUENCY', 'monthly'),

    // Auto-enable payouts for sellers by default
    'auto_payout_enabled' => env('STRIPE_AUTO_PAYOUT_ENABLED', true),

    // Stripe Connect account type
    // Options: 'express', 'standard', 'custom'
    'account_type' => env('STRIPE_CONNECT_ACCOUNT_TYPE', 'express'),

    // Business branding for Connect onboarding page
    'business_name' => env('STRIPE_BUSINESS_NAME', 'Shipting'),
    'business_logo_url' => env('STRIPE_BUSINESS_LOGO_URL', null),
    'business_icon_url' => env('STRIPE_BUSINESS_ICON_URL', null),
    'business_primary_color' => env('STRIPE_BUSINESS_COLOR', null),

    // Refresh URL after onboarding completion
    'refresh_url' => env('APP_URL') . '/earnings/stripe-connect',

    // Return URL after onboarding completion
    'return_url' => env('APP_URL') . '/earnings/stripe-connect?success=true',

    /*
    |--------------------------------------------------------------------------
    | Payment Model Descriptions
    |--------------------------------------------------------------------------
    */

    'payment_models' => [
        'direct' => [
            'name' => 'Direct Charge',
            'description' => 'Customer pays seller directly. Platform collects application fee.',
            'suitable_for' => 'High-trust sellers with established businesses',
        ],
        'destination' => [
            'name' => 'Destination Charge',
            'description' => 'Platform collects payment, automatically transfers to seller minus commission.',
            'suitable_for' => 'Most marketplace sellers',
        ],
        'separate' => [
            'name' => 'Separate Charge & Transfer',
            'description' => 'Platform holds funds, transfers on payout schedule or manual request.',
            'suitable_for' => 'New sellers or those requiring payment approval',
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Payout Frequency Options
    |--------------------------------------------------------------------------
    */

    'payout_frequencies' => [
        'daily' => [
            'name' => 'Daily',
            'description' => 'Automatic payouts every day',
            'schedule' => '00:00 UTC daily',
        ],
        'weekly' => [
            'name' => 'Weekly',
            'description' => 'Automatic payouts every Monday',
            'schedule' => '00:00 UTC every Monday',
        ],
        'monthly' => [
            'name' => 'Monthly',
            'description' => 'Automatic payouts on 1st of each month',
            'schedule' => '00:00 UTC on 1st of month',
        ],
        'manual' => [
            'name' => 'Manual',
            'description' => 'Seller requests payout when ready',
            'schedule' => 'On-demand',
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Stripe Connect Required Capabilities
    |--------------------------------------------------------------------------
    */

    'capabilities' => [
        'card_payments' => [
            'requested' => true,
        ],
        'transfers' => [
            'requested' => true,
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Country Settings
    |--------------------------------------------------------------------------
    */

    'default_country' => 'US',
    'default_currency' => 'USD',

    /*
    |--------------------------------------------------------------------------
    | Webhook Events to Listen
    |--------------------------------------------------------------------------
    */

    'webhook_events' => [
        // Account events
        'account.updated',
        'account.application.authorized',
        'account.application.deauthorized',
        'capability.updated',

        // Payout events
        'payout.created',
        'payout.paid',
        'payout.failed',
        'payout.canceled',
        'payout.updated',

        // Transfer events
        'transfer.created',
        'transfer.updated',
        'transfer.reversed',

        // Charge/refund events
        'charge.refunded',
        'charge.refund.updated',
        'charge.succeeded',

        // Payment events
        'checkout.session.completed',
        'payment_intent.succeeded',
        'payment_intent.payment_failed',
    ],

    /*
    |--------------------------------------------------------------------------
    | Transaction Status Mapping
    |--------------------------------------------------------------------------
    */

    'transaction_statuses' => [
        'pending' => 'Pending',
        'processing' => 'Processing',
        'succeeded' => 'Completed',
        'failed' => 'Failed',
        'cancelled' => 'Cancelled',
        'refunded' => 'Refunded',
    ],

    /*
    |--------------------------------------------------------------------------
    | Logging
    |--------------------------------------------------------------------------
    */

    'logging' => [
        'enabled' => env('STRIPE_CONNECT_LOGGING', true),
        'channel' => env('LOG_CHANNEL', 'stack'),
        'level' => env('STRIPE_CONNECT_LOG_LEVEL', 'info'),
    ],

];
