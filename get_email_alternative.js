#!/usr/bin/env node

/**
 * Alternative method to get email from Business Account
 *
 * Usage: node get_email_alternative.js YOUR_ACCESS_TOKEN
 */

const https = require('https');

const BUSINESS_ID = '1856101791959161';
const USER_ID = '122114931851659';  // Tahir's user ID from your screenshot
const ACCESS_TOKEN = process.argv[2] || process.env.ACCESS_TOKEN;

if (!ACCESS_TOKEN || ACCESS_TOKEN === 'YOUR_ACCESS_TOKEN') {
  console.error('❌ Please provide access token');
  console.error('Usage: node get_email_alternative.js YOUR_ACCESS_TOKEN');
  process.exit(1);
}

function graphRequest(path) {
  return new Promise((resolve, reject) => {
    const url = `https://graph.facebook.com/v21.0${path}${path.includes('?') ? '&' : '?'}access_token=${ACCESS_TOKEN}`;

    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) {
            reject(new Error(parsed.error.message));
          } else {
            resolve(parsed);
          }
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function main() {
  console.log('\n🔍 Trying alternative methods to get email...\n');

  // Method 1: Try with more fields
  console.log('Method 1: Requesting all available user fields...');
  try {
    const user = await graphRequest(`/${USER_ID}?fields=id,name,email,first_name,last_name,link,locale,timezone,verified`);
    console.log('✅ Response:', JSON.stringify(user, null, 2));
    if (user.email) {
      console.log(`\n✅ EMAIL FOUND: ${user.email}\n`);
    } else {
      console.log('\n⚠️  Email not available in user profile\n');
    }
  } catch (err) {
    console.log(`❌ ${err.message}\n`);
  }

  // Method 2: Get from business admin list
  console.log('Method 2: Getting business admins with email...');
  try {
    const admins = await graphRequest(`/${BUSINESS_ID}/business_users?fields=id,name,email,role`);
    console.log('✅ Business Admins:');
    console.log(JSON.stringify(admins, null, 2));

    if (admins.data) {
      const tahir = admins.data.find(u => u.name === 'Tahir' || u.id === USER_ID);
      if (tahir && tahir.email) {
        console.log(`\n✅ EMAIL FOUND: ${tahir.email}\n`);
      }
    }
  } catch (err) {
    console.log(`❌ ${err.message}\n`);
  }

  // Method 3: Get system users (may have email)
  console.log('Method 3: Getting system users...');
  try {
    const systemUsers = await graphRequest(`/${BUSINESS_ID}/system_users?fields=id,name,email`);
    console.log('✅ System Users:');
    console.log(JSON.stringify(systemUsers, null, 2));
  } catch (err) {
    console.log(`❌ ${err.message}\n`);
  }

  // Method 4: Get owned businesses (may have owner info)
  console.log('Method 4: Getting owned businesses...');
  try {
    const businesses = await graphRequest(`/${USER_ID}/businesses?fields=id,name,primary_page`);
    console.log('✅ Owned Businesses:');
    console.log(JSON.stringify(businesses, null, 2));
  } catch (err) {
    console.log(`❌ ${err.message}\n`);
  }

  // Method 5: Get accounts (may have account info)
  console.log('Method 5: Getting accounts...');
  try {
    const accounts = await graphRequest(`/${USER_ID}/accounts?fields=id,name,email,username`);
    console.log('✅ Accounts:');
    console.log(JSON.stringify(accounts, null, 2));
  } catch (err) {
    console.log(`❌ ${err.message}\n`);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('💡 If none of these methods return email, you need to:');
  console.log('   1. Check Meta Business Suite at https://business.facebook.com/');
  console.log('   2. Go to Business Settings → People → Users');
  console.log('   3. Look for "Tahir" - email will be displayed there');
  console.log('\n');
}

main();
