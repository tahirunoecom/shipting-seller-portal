<?php

/**
 * Add Test Balance to PLATFORM Account
 *
 * This script helps you add test funds to the PLATFORM's Stripe account
 * so you can test payouts to sellers in development.
 *
 * The correct flow:
 * 1. Platform receives payments from customers (this script simulates that)
 * 2. Platform pays out sellers from platform balance
 *
 * Usage:
 *   php add-test-balance.php <amount_in_dollars>
 *
 * Example:
 *   php add-test-balance.php 500
 */

require __DIR__ . '/../../vendor/autoload.php';

// Load environment variables
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/../../');
$dotenv->load();

\Stripe\Stripe::setApiKey($_ENV['STRIPE_SECRET_KEY']);

// Get command line arguments
$amountInDollars = $argv[1] ?? 500;

echo "🔄 Adding test balance to PLATFORM account...\n";
echo "Amount: $$amountInDollars\n\n";

try {
    // Create a test charge on the PLATFORM account (simulates customer payment)
    echo "📝 Creating test charge on platform account...\n";

    $charge = \Stripe\Charge::create([
        'amount' => (int)($amountInDollars * 100), // Convert to cents
        'currency' => 'usd',
        'source' => 'tok_visa', // Stripe test token
        'description' => "Test platform balance for seller payouts - $" . $amountInDollars,
        'metadata' => [
            'test_balance' => 'true',
            'added_at' => date('Y-m-d H:i:s'),
        ],
    ]);

    echo "✅ Success! Test charge created:\n";
    echo "   Charge ID: " . $charge->id . "\n";
    echo "   Amount: $" . ($charge->amount / 100) . "\n";
    echo "   Status: " . $charge->status . "\n\n";

    // Check the PLATFORM balance
    echo "💰 Checking platform account balance...\n";
    $balance = \Stripe\Balance::retrieve();

    $availableBalance = 0;
    if (isset($balance->available) && count($balance->available) > 0) {
        $availableBalance = $balance->available[0]->amount / 100;
    }

    $pendingBalance = 0;
    if (isset($balance->pending) && count($balance->pending) > 0) {
        $pendingBalance = $balance->pending[0]->amount / 100;
    }

    echo "   Available Balance: $" . number_format($availableBalance, 2) . "\n";
    echo "   Pending Balance: $" . number_format($pendingBalance, 2) . "\n\n";

    if ($availableBalance >= 50) {
        echo "✅ Platform account now has sufficient balance for seller payouts!\n";
        echo "   Minimum payout: $50.00\n";
        echo "   Available: $" . number_format($availableBalance, 2) . "\n\n";
        echo "🎉 You can now pay sellers from your app!\n";
    } else {
        echo "⚠️  Warning: Balance is still below minimum payout amount ($50.00)\n";
        echo "   Run this script again to add more funds.\n";
    }

} catch (\Stripe\Exception\InvalidRequestException $e) {
    echo "❌ Error: " . $e->getMessage() . "\n\n";
    echo "Possible causes:\n";
    echo "  - Invalid API key\n";
    echo "  - Using live API key in test mode (or vice versa)\n\n";
    exit(1);
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    exit(1);
}
