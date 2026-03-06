#!/bin/bash

# Test connecting catalog to WABA
# Run this: bash connect-catalog-command.sh

echo "🔗 Connecting Catalog to WABA..."
echo "================================"

# Method 1: Direct Meta API call
echo ""
echo "Method 1: Direct Meta API"
echo "-------------------------"

curl -X POST "https://graph.facebook.com/v21.0/765231639686531/product_catalogs" \
  -H "Authorization: Bearer EAAWKfVA5uZCMBQwmREZAu93O1ZBECdeoTjoW4k8xUkuXZCrBhbOPjZBwzZBRMyRuKSrSodgZBTlP8pK6wTCKrW05mPos67DrnxoJzoT4ICCLsVZAUyYtuetZBRzSZBf6qa36H0JRzVy6KrAQsMVUCMtvpMZCwZAf0laXwaFltqprBxtA9pZCiIla5keUASZCZCu1aWMLmssjDUSjPdnDxKQ3UNUJlKMArb5FZBxYuxTmzyBUZAOEg16SED4RBJq5Di91djr7IQKBLdHg0g40JfYKg4NgYTZAlxUSH3YzO6Yc5CdaOB" \
  -H "Content-Type: application/json" \
  -d '{"catalog_id":"894655139864702"}' | jq .

echo ""
echo "Method 2: Via Your Laravel Backend API"
echo "---------------------------------------"

# Replace with your actual API URL and credentials
API_URL="https://stageshipperapi.thedelivio.com/api/seller/whatsapp/connect-catalog"

curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -u "5:your_basic_auth_password_here" \
  -d '{
    "wh_account_id": "YOUR_WH_ACCOUNT_ID",
    "catalog_id": "894655139864702"
  }' | jq .

echo ""
echo "================================"
echo "✅ If successful, you'll see:"
echo '   {"success": true}'
echo ""
echo "❌ If it fails with permission error:"
echo "   User needs to DISCONNECT and RECONNECT WhatsApp"
echo "   to get fresh access token with catalog_management permission"
echo ""
