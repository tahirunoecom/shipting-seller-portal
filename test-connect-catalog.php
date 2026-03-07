<?php
/**
 * Test script to connect WhatsApp Catalog to WABA
 * Run this file directly: php test-connect-catalog.php
 */

// Your credentials
$WABA_ID = '765231639686531';
$CATALOG_ID = '894655139864702';
$ACCESS_TOKEN = 'EAAWKfVA5uZCMBQwmREZAu93O1ZBECdeoTjoW4k8xUkuXZCrBhbOPjZBwzZBRMyRuKSrSodgZBTlP8pK6wTCKrW05mPos67DrnxoJzoT4ICCLsVZAUyYtuetZBRzSZBf6qa36H0JRzVy6KrAQsMVUCMtvpMZCwZAf0laXwaFltqprBxtA9pZCiIla5keUASZCZCu1aWMLmssjDUSjPdnDxKQ3UNUJlKMArb5FZBxYuxTmzyBUZAOEg16SED4RBJq5Di91djr7IQKBLdHg0g40JfYKg4NgYTZAlxUSH3YzO6Yc5CdaOB';

echo "🔗 Connecting Catalog to WABA...\n";
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
echo "WABA ID: {$WABA_ID}\n";
echo "Catalog ID: {$CATALOG_ID}\n";
echo "\n";

// Step 1: Connect catalog to WABA
echo "Step 1: Connecting catalog to WABA...\n";
$url = "https://graph.facebook.com/v21.0/{$WABA_ID}/product_catalogs";
$payload = json_encode(['catalog_id' => $CATALOG_ID]);

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer ' . $ACCESS_TOKEN,
    'Content-Type: application/json'
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);

$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

$result = json_decode($response, true);

echo "HTTP Status: {$http_code}\n";
echo "Response:\n";
echo json_encode($result, JSON_PRETTY_PRINT) . "\n\n";

if ($http_code == 200 && isset($result['success']) && $result['success']) {
    echo "✅ SUCCESS! Catalog connected to WABA!\n\n";

    // Step 2: Verify connection - Check WABA catalogs
    echo "Step 2: Verifying connection...\n";
    $verifyUrl = "https://graph.facebook.com/v21.0/{$WABA_ID}?fields=product_catalogs";

    $ch2 = curl_init($verifyUrl);
    curl_setopt($ch2, CURLOPT_HTTPHEADER, [
        'Authorization: Bearer ' . $ACCESS_TOKEN
    ]);
    curl_setopt($ch2, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch2, CURLOPT_TIMEOUT, 30);

    $verifyResponse = curl_exec($ch2);
    $verifyHttpCode = curl_getinfo($ch2, CURLINFO_HTTP_CODE);
    curl_close($ch2);

    $verifyResult = json_decode($verifyResponse, true);

    echo "Verification Response:\n";
    echo json_encode($verifyResult, JSON_PRETTY_PRINT) . "\n\n";

    if (isset($verifyResult['product_catalogs']['data']) && !empty($verifyResult['product_catalogs']['data'])) {
        echo "✅ Verified! Catalog is connected!\n";
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
        echo "🎉 You can now send product messages!\n";
    } else {
        echo "⚠️ Connection created but catalog not showing in WABA yet. Wait 30 seconds and check again.\n";
    }

} else {
    echo "❌ FAILED to connect catalog!\n";
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";

    if (isset($result['error'])) {
        $errorCode = $result['error']['code'] ?? 'unknown';
        $errorMsg = $result['error']['message'] ?? 'Unknown error';
        $errorType = $result['error']['type'] ?? '';

        echo "Error Code: {$errorCode}\n";
        echo "Error Type: {$errorType}\n";
        echo "Error Message: {$errorMsg}\n\n";

        // Provide specific fixes
        if ($errorCode == 10 || strpos($errorMsg, 'permission') !== false) {
            echo "🔧 FIX: Permission denied!\n";
            echo "   → Your app needs 'catalog_management' permission\n";
            echo "   → It's already approved in your app review\n";
            echo "   → But your access token was generated BEFORE approval\n";
            echo "   → Solution: User needs to DISCONNECT and RECONNECT WhatsApp\n";
        } elseif ($errorCode == 100) {
            echo "🔧 FIX: Invalid parameter\n";
            echo "   → Check if catalog_id and waba_id are correct\n";
        } elseif ($errorCode == 190) {
            echo "🔧 FIX: Invalid access token\n";
            echo "   → Token expired or revoked\n";
            echo "   → User needs to reconnect WhatsApp\n";
        }
    }
}

echo "\n";
