#!/usr/bin/env node

/**
 * Script to retrieve Facebook account email from WhatsApp Business API IDs
 *
 * Usage:
 * node get_facebook_account.js YOUR_ACCESS_TOKEN
 *
 * Or set ACCESS_TOKEN environment variable:
 * ACCESS_TOKEN=your_token node get_facebook_account.js
 */

const https = require('https');

// Your WhatsApp Business Account details
const BUSINESS_ID = '1856101791959161';
const WABA_ID = '1659914091647877';
const PHONE_NUMBER_ID = '850008814869854';

// Get access token from argument or environment
const ACCESS_TOKEN = process.argv[2] || process.env.ACCESS_TOKEN;

if (!ACCESS_TOKEN || ACCESS_TOKEN === 'YOUR_ACCESS_TOKEN') {
  console.error('❌ Error: Please provide an access token');
  console.error('');
  console.error('Usage:');
  console.error('  node get_facebook_account.js YOUR_ACCESS_TOKEN');
  console.error('');
  console.error('Or:');
  console.error('  ACCESS_TOKEN=your_token node get_facebook_account.js');
  console.error('');
  console.error('💡 Tip: Your access token is stored in the database (seller_whatsapp_config table)');
  process.exit(1);
}

// Helper function to make Graph API requests
function graphRequest(path) {
  return new Promise((resolve, reject) => {
    const url = `https://graph.facebook.com/v21.0${path}${path.includes('?') ? '&' : '?'}access_token=${ACCESS_TOKEN}`;

    https.get(url, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) {
            reject(new Error(`API Error: ${parsed.error.message}`));
          } else {
            resolve(parsed);
          }
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

async function main() {
  console.log('\n🔍 Retrieving Facebook Account Information...\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // Method 1: Get current token owner (YOU)
    console.log('📧 Method 1: Getting token owner info...');
    try {
      const me = await graphRequest('/me?fields=id,name,email');
      console.log('✅ Token Owner:');
      console.log(`   Name:  ${me.name}`);
      console.log(`   Email: ${me.email || '(not available - may need additional permissions)'}`);
      console.log(`   ID:    ${me.id}`);
      console.log('');
    } catch (err) {
      console.log(`❌ ${err.message}\n`);
    }

    // Method 2: Get business users/admins
    console.log('👥 Method 2: Getting business users...');
    try {
      const businessUsers = await graphRequest(`/${BUSINESS_ID}/business_users?fields=id,name,email`);
      if (businessUsers.data && businessUsers.data.length > 0) {
        console.log('✅ Business Users/Admins:');
        businessUsers.data.forEach((user, index) => {
          console.log(`   ${index + 1}. ${user.name}`);
          console.log(`      Email: ${user.email || '(not available)'}`);
          console.log(`      ID:    ${user.id}`);
        });
        console.log('');
      } else {
        console.log('⚠️  No business users found\n');
      }
    } catch (err) {
      console.log(`❌ ${err.message}\n`);
    }

    // Method 3: Get WABA assigned users
    console.log('👤 Method 3: Getting WABA assigned users...');
    try {
      const wabaUsers = await graphRequest(`/${WABA_ID}/assigned_users?fields=name,email`);
      if (wabaUsers.data && wabaUsers.data.length > 0) {
        console.log('✅ WABA Assigned Users:');
        wabaUsers.data.forEach((user, index) => {
          console.log(`   ${index + 1}. ${user.name}`);
          console.log(`      Email: ${user.email || '(not available)'}`);
        });
        console.log('');
      } else {
        console.log('⚠️  No assigned users found\n');
      }
    } catch (err) {
      console.log(`❌ ${err.message}\n`);
    }

    // Method 4: Debug token
    console.log('🔐 Method 4: Debug token information...');
    try {
      const debugInfo = await graphRequest(`/debug_token?input_token=${ACCESS_TOKEN}`);
      if (debugInfo.data) {
        console.log('✅ Token Info:');
        console.log(`   User ID:    ${debugInfo.data.user_id}`);
        console.log(`   App ID:     ${debugInfo.data.app_id}`);
        console.log(`   Valid:      ${debugInfo.data.is_valid}`);
        console.log(`   Expires:    ${debugInfo.data.expires_at ? new Date(debugInfo.data.expires_at * 1000).toLocaleString() : 'Never'}`);
        console.log('');

        // Get user details from user_id
        if (debugInfo.data.user_id) {
          console.log('📧 Fetching user details from token user_id...');
          try {
            const user = await graphRequest(`/${debugInfo.data.user_id}?fields=id,name,email`);
            console.log('✅ User Details:');
            console.log(`   Name:  ${user.name}`);
            console.log(`   Email: ${user.email || '(not available - may need additional permissions)'}`);
            console.log(`   ID:    ${user.id}`);
            console.log('');
          } catch (err) {
            console.log(`❌ ${err.message}\n`);
          }
        }
      }
    } catch (err) {
      console.log(`❌ ${err.message}\n`);
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('✨ Done!\n');

  } catch (error) {
    console.error(`\n❌ Error: ${error.message}\n`);
    process.exit(1);
  }
}

main();
