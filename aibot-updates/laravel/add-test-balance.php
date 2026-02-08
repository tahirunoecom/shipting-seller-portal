<?php

/**
 * Add Test Balance to Stripe Connected Account
 *
 * This script helps you add test funds to a seller's connected Stripe account
 * so you can test payouts in development.
 *
 * Usage:
 *   php add-test-balance.php <connected_account_id> <amount_in_dollars>
 *
 * Example:
 *   php add-test-balance.php acct_1234567890 500
 */

require __DIR__ . '/../../vendor/autoload.php';

// Load environment variables
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/../../');
$dotenv->load();

\Stripe\Stripe::setApiKey($_ENV['STRIPE_SECRET_KEY']);

// Get command line arguments
$connectedAccountId = $argv[1] ?? null;
$amountInDollars = $argv[2] ?? 500;

if (!$connectedAccountId) {
    echo "❌ Error: Connected account ID is required\n\n";
    echo "Usage: php add-test-balance.php <connected_account_id> <amount>\n";
    echo "Example: php add-test-balance.php acct_1234567890 500\n\n";
    echo "To find connected account IDs, check your database:\n";
    echo "  SELECT wh_account_id, stripe_connect_id, locationname FROM wh_warehouse_user WHERE stripe_connect_id IS NOT NULL;\n\n";
    exit(1);
}

echo "🔄 Adding test balance to connected account...\n";
echo "Connected Account ID: $connectedAccountId\n";
echo "Amount: $$amountInDollars\n\n";

try {
    // Method 1: Create a test charge directly on the connected account
    echo "📝 Creating test charge on connected account...\n";

    $charge = \Stripe\Charge::create([
        'amount' => (int)($amountInDollars * 100), // Convert to cents
        'currency' => 'usd',
        'source' => 'tok_visa', // Stripe test token
        'description' => "Test charge for payout testing - $" . $amountInDollars,
        'metadata' => [
            'test_balance' => 'true',
            'added_at' => date('Y-m-d H:i:s'),
        ],
    ], [
        'stripe_account' => $connectedAccountId // Create charge on connected account
    ]);

    echo "✅ Success! Test charge created:\n";
    echo "   Charge ID: " . $charge->id . "\n";
    echo "   Amount: $" . ($charge->amount / 100) . "\n";
    echo "   Status: " . $charge->status . "\n\n";

    // Check the balance
    echo "💰 Checking connected account balance...\n";
    $balance = \Stripe\Balance::retrieve(['stripe_account' => $connectedAccountId]);

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
        echo "✅ Connected account now has sufficient balance for payouts!\n";
        echo "   Minimum payout: $50.00\n";
        echo "   Available: $" . number_format($availableBalance, 2) . "\n\n";
        echo "🎉 You can now test payouts in your app!\n";
    } else {
        echo "⚠️  Warning: Balance is still below minimum payout amount ($50.00)\n";
        echo "   Run this script again to add more funds.\n";
    }

} catch (\Stripe\Exception\InvalidRequestException $e) {
    echo "❌ Error: " . $e->getMessage() . "\n\n";
    echo "Possible causes:\n";
    echo "  - Invalid connected account ID\n";
    echo "  - Account doesn't exist\n";
    echo "  - Using live API key with test account ID (or vice versa)\n\n";
    exit(1);
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    exit(1);
}
