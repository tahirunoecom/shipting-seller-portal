# Stripe Connect Integration - Complete Guide

**Date:** February 2026
**Version:** 1.0
**Status:** ✅ Backend Complete, Frontend Pending

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [What's Been Implemented](#whats-been-implemented)
3. [Database Setup](#database-setup)
4. [Environment Configuration](#environment-configuration)
5. [Laravel Integration](#laravel-integration)
6. [API Endpoints](#api-endpoints)
7. [Webhook Configuration](#webhook-configuration)
8. [Testing Guide](#testing-guide)
9. [Frontend Integration (TODO)](#frontend-integration-todo)
10. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

This Stripe Connect integration enables sellers on the Shipting platform to:
- Connect their Stripe accounts via Express onboarding
- Receive automatic or manual payouts
- Track earnings and transactions
- View payout history
- Manage their payment settings

**Payment Flow:**
```
Customer pays → Platform collects → Commission calculated →
Seller earnings added to balance → Payout (auto/manual) →
Seller receives money in bank account
```

---

## ✅ What's Been Implemented

### **Backend (Complete)**
- ✅ Stripe Connect configuration file
- ✅ StripeConnectController with 15+ API endpoints
- ✅ Extended StripeWebhookController with Connect event handlers
- ✅ API routes for sellers and admins
- ✅ Database tables for transactions, payouts, accounts
- ✅ Webhook handlers for all Stripe Connect events
- ✅ Earnings calculation and balance tracking
- ✅ Manual and automatic payout support

### **Database (Complete)**
- ✅ `wh_warehouse_user` table updated with Stripe fields
- ✅ `stripe_transactions` table created
- ✅ `stripe_payouts` table created
- ✅ `stripe_webhook_logs` table created
- ✅ `stripe_connect_accounts` table created
- ✅ Migration SQL for existing unpaid earnings

### **Frontend (TODO)**
- ⏳ Seller earnings dashboard page
- ⏳ Stripe Connect onboarding UI
- ⏳ Transaction history page
- ⏳ Payout history page
- ⏳ Admin Stripe management panel

---

## 🗄️ Database Setup

### Tables Already Created

You've already run these:

```sql
-- 1. ALTER wh_warehouse_user (adds Stripe Connect fields)
-- 2. CREATE stripe_transactions
-- 3. CREATE stripe_payouts
-- 4. CREATE stripe_webhook_logs
-- 5. CREATE stripe_connect_accounts
```

### Migration of Existing Earnings

You've already migrated existing unpaid earnings:

**Results:**
- 10 sellers with unpaid earnings totaling **~$59,500**
- All balances now in `Shipper_earnings` field
- Ready for payout via Stripe Connect

---

## ⚙️ Environment Configuration

### Your `.env` File (Already Set Up)

```env
# Stripe API Keys (use your actual test keys from Stripe Dashboard)
STRIPE_KEY=pk_test_your_publishable_key_here
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Stripe Connect
STRIPE_CONNECT_WEBHOOK_SECRET=whsec_your_connect_webhook_secret_here
STRIPE_CONNECT_ENABLED=true

# Default Stripe Connect Settings
STRIPE_DEFAULT_COMMISSION=5.00
STRIPE_MIN_PAYOUT=50.00
STRIPE_DEFAULT_PAYMENT_MODEL=separate
STRIPE_DEFAULT_PAYOUT_FREQUENCY=monthly
STRIPE_CONNECT_ACCOUNT_TYPE=express

# API Base
API_BASE=https://stageshipperapi.thedelivio.com/api
```

### ⚠️ Important: Switch to LIVE Keys for Production

When going live, change these:
```env
STRIPE_KEY=pk_live_your_live_publishable_key_here
STRIPE_SECRET_KEY=sk_live_your_live_secret_key_here
```

---

## 🔧 Laravel Integration

### Step 1: Add Routes

Add this line to your `routes/api.php`:

```php
// Stripe Connect routes
require __DIR__.'/stripe_connect_routes.php';
```

OR copy routes directly from `aibot-updates/laravel/routes/stripe_connect_routes.php`

### Step 2: Copy Controllers

Copy these files to your Laravel app:

```
From: aibot-updates/laravel/StripeConnectController.php
To:   app/Http/Controllers/Api/Seller/StripeConnectController.php

From: aibot-updates/laravel/StripeWebhookController.php
To:   app/Http/Controllers/StripeWebhookController.php (REPLACE existing)

From: aibot-updates/laravel/config/stripe-connect.php
To:   config/stripe-connect.php
```

### Step 3: Install Stripe PHP SDK (if not installed)

```bash
composer require stripe/stripe-php
```

### Step 4: Clear Cache

```bash
php artisan config:clear
php artisan route:clear
php artisan cache:clear
```

---

## 📡 API Endpoints

### Seller Endpoints

All require `wh_account_id` in request body.

#### **Onboarding**

```
POST /api/seller/stripe/onboard
Body: { "wh_account_id": 1016 }
Response: { "status": 1, "data": { "onboarding_url": "https://connect.stripe.com/..." } }
```

#### **Get Status**

```
POST /api/seller/stripe/status
Body: { "wh_account_id": 1016 }
Response: {
  "status": 1,
  "data": {
    "connected": true,
    "onboarding_completed": true,
    "charges_enabled": true,
    "payouts_enabled": true,
    "payment_model": "separate",
    "payout_frequency": "monthly",
    "commission_percentage": 5.00
  }
}
```

#### **Get Earnings**

```
POST /api/seller/stripe/earnings
Body: { "wh_account_id": 1016 }
Response: {
  "status": 1,
  "data": {
    "total_earned": 5000.00,
    "total_paid_out": 2000.00,
    "pending_earnings": 3000.00,
    "available_balance": 3000.00,
    "total_orders": 120,
    "commission_percentage": 5.00,
    "minimum_payout": 50.00,
    "can_request_payout": true,
    "recent_transactions": [...]
  }
}
```

#### **Request Payout**

```
POST /api/seller/stripe/request-payout
Body: { "wh_account_id": 1016, "amount": 100.00 }
Response: {
  "status": 1,
  "data": {
    "payout_id": 123,
    "stripe_payout_id": "po_xxx",
    "amount": 100.00,
    "status": "pending",
    "arrival_date": "2026-02-14"
  }
}
```

#### **Get Transactions**

```
POST /api/seller/stripe/transactions
Body: { "wh_account_id": 1016, "limit": 50, "offset": 0, "type": "charge" }
Response: {
  "status": 1,
  "data": {
    "transactions": [...],
    "total": 250
  }
}
```

#### **Get Payouts**

```
POST /api/seller/stripe/payouts
Body: { "wh_account_id": 1016, "limit": 20 }
Response: {
  "status": 1,
  "data": {
    "payouts": [...],
    "total_paid": 5000.00
  }
}
```

#### **Get Dashboard Link**

```
POST /api/seller/stripe/dashboard
Body: { "wh_account_id": 1016 }
Response: { "status": 1, "data": { "dashboard_url": "https://connect.stripe.com/..." } }
```

#### **Disconnect**

```
POST /api/seller/stripe/disconnect
Body: { "wh_account_id": 1016 }
Response: { "status": 1, "message": "Stripe account disconnected successfully" }
```

### Admin Endpoints

#### **Get All Sellers**

```
POST /api/admin/stripe/sellers
Body: { "status": "connected" }  // Options: all, connected, pending, not_connected
Response: {
  "status": 1,
  "data": {
    "sellers": [...],
    "stats": {
      "total_sellers": 100,
      "connected": 45,
      "pending": 10,
      "not_connected": 45,
      "total_pending_earnings": 50000.00,
      "total_paid_out": 25000.00
    }
  }
}
```

#### **Get Seller Detail**

```
POST /api/admin/stripe/seller-detail
Body: { "wh_account_id": 1016 }
Response: (same as seller /status endpoint)
```

#### **Update Seller Config**

```
POST /api/admin/stripe/update-config
Body: {
  "wh_account_id": 1016,
  "payment_model": "separate",
  "payout_frequency": "monthly",
  "commission_percentage": 5.00,
  "minimum_payout": 50.00,
  "auto_payout_enabled": true,
  "config_notes": "High volume seller"
}
Response: { "status": 1, "message": "Configuration updated successfully" }
```

#### **Create Payout for Seller**

```
POST /api/admin/stripe/create-payout
Body: { "wh_account_id": 1016, "amount": 100.00 }
Response: (same as seller request-payout)
```

#### **Get All Transactions (Platform-wide)**

```
POST /api/admin/stripe/transactions
Body: { "limit": 100, "offset": 0, "type": "charge" }
Response: {
  "status": 1,
  "data": {
    "transactions": [...],
    "stats": {
      "total_charges": 150000.00,
      "total_platform_fees": 7500.00,
      "total_seller_earnings": 142500.00,
      "total_payouts": 100000.00
    },
    "total": 5000
  }
}
```

---

## 🔗 Webhook Configuration

### Webhook URL

```
https://stageshipperapi.thedelivio.com/api/webhook/stripe/connect
```

### Webhook Secret (Already Set)

```
whsec_0o0JpDjqY3aSDnVUyEgFHn1LI1d6ZeKH
```

### Events Listened To

Your webhook is configured to listen to these events:

**Account Events:**
- `account.updated` - When seller completes onboarding
- `account.application.authorized` - When account is first created
- `account.application.deauthorized` - When seller disconnects

**Payout Events:**
- `payout.created` - Payout initiated
- `payout.updated` - Payout status changed
- `payout.paid` - Payout succeeded
- `payout.failed` - Payout failed
- `payout.canceled` - Payout cancelled

**Transfer Events:**
- `transfer.created` - Transfer to seller created
- `transfer.updated` - Transfer status changed
- `transfer.reversed` - Transfer cancelled/reversed

**Refund Events:**
- `charge.refunded` - Payment refunded

**Payment Events (existing):**
- `checkout.session.completed`
- `payment_intent.succeeded`
- `payment_intent.payment_failed`

### Webhook Handler Logic

The `StripeWebhookController` automatically:
1. Verifies webhook signature
2. Logs event to `stripe_webhook_logs` table
3. Updates seller account status
4. Records transactions
5. Updates seller balances
6. Sends notifications (if implemented)

---

## 🧪 Testing Guide

### Test Onboarding Flow

1. **Create Connect Account:**
```bash
curl -X POST https://stageshipperapi.thedelivio.com/api/seller/stripe/onboard \
  -H "Content-Type: application/json" \
  -d '{"wh_account_id": 1016}'
```

2. **Open returned `onboarding_url` in browser**
3. **Complete Stripe Express onboarding**
4. **Check status:**
```bash
curl -X POST https://stageshipperapi.thedelivio.com/api/seller/stripe/status \
  -H "Content-Type: application/json" \
  -d '{"wh_account_id": 1016}'
```

### Test Payout Flow

1. **Check earnings:**
```bash
curl -X POST https://stageshipperapi.thedelivio.com/api/seller/stripe/earnings \
  -H "Content-Type: application/json" \
  -d '{"wh_account_id": 1016}'
```

2. **Request payout:**
```bash
curl -X POST https://stageshipperapi.thedelivio.com/api/seller/stripe/request-payout \
  -H "Content-Type: application/json" \
  -d '{"wh_account_id": 1016, "amount": 100.00}'
```

3. **Check payout status:**
```bash
curl -X POST https://stageshipperapi.thedelivio.com/api/seller/stripe/payouts \
  -H "Content-Type: application/json" \
  -d '{"wh_account_id": 1016}'
```

### Test Webhook Events

1. **Go to Stripe Dashboard → Webhooks**
2. **Click your webhook endpoint**
3. **Click "Send test webhook"**
4. **Select event type** (e.g., `account.updated`)
5. **Check Laravel logs** for webhook processing

---

## 🎨 Frontend Integration (TODO)

### Pages to Create

#### **1. Seller Earnings Dashboard**

**File:** `src/pages/earnings/EarningsOverview.jsx`

**Should display:**
- Total earned
- Pending earnings
- Paid out amount
- Recent transactions table
- Payout button
- Stripe Connect status

**API Calls:**
- `POST /api/seller/stripe/status`
- `POST /api/seller/stripe/earnings`

#### **2. Stripe Connect Onboarding**

**File:** `src/pages/earnings/StripeConnectOnboarding.jsx`

**Should have:**
- "Connect with Stripe" button
- Onboarding progress indicator
- Requirements checklist
- Link to Stripe dashboard

**API Calls:**
- `POST /api/seller/stripe/onboard`
- `POST /api/seller/stripe/status`
- `POST /api/seller/stripe/dashboard`

#### **3. Transaction History**

**File:** `src/pages/earnings/TransactionHistory.jsx`

**Should display:**
- Filterable transaction table
- Transaction type badges
- Amount columns
- Date range picker
- Export CSV button

**API Calls:**
- `POST /api/seller/stripe/transactions`

#### **4. Payout History**

**File:** `src/pages/earnings/PayoutHistory.jsx`

**Should display:**
- Payout history table
- Payout status badges
- Arrival dates
- Bank account (last 4)
- Request new payout button

**API Calls:**
- `POST /api/seller/stripe/payouts`
- `POST /api/seller/stripe/request-payout`

#### **5. Admin Stripe Management**

**File:** `src/pages/admin/stripe/StripeOverview.jsx`

**Should display:**
- All sellers with Stripe status
- Platform earnings stats
- Pending payouts count
- Configure button per seller

**API Calls:**
- `POST /api/admin/stripe/sellers`
- `POST /api/admin/stripe/transactions`

### API Service File

**File:** `src/services/stripeConnectService.js`

```javascript
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export const stripeConnectService = {
  // Onboarding
  createConnectAccount: (wh_account_id) =>
    axios.post(`${API_BASE}/seller/stripe/onboard`, { wh_account_id }),

  refreshOnboardingLink: (wh_account_id) =>
    axios.post(`${API_BASE}/seller/stripe/onboard-refresh`, { wh_account_id }),

  getConnectStatus: (wh_account_id) =>
    axios.post(`${API_BASE}/seller/stripe/status`, { wh_account_id }),

  getDashboardLink: (wh_account_id) =>
    axios.post(`${API_BASE}/seller/stripe/dashboard`, { wh_account_id }),

  // Earnings
  getEarnings: (wh_account_id) =>
    axios.post(`${API_BASE}/seller/stripe/earnings`, { wh_account_id }),

  getTransactions: (wh_account_id, limit = 50, offset = 0, type = null) =>
    axios.post(`${API_BASE}/seller/stripe/transactions`, { wh_account_id, limit, offset, type }),

  getPayouts: (wh_account_id, limit = 20) =>
    axios.post(`${API_BASE}/seller/stripe/payouts`, { wh_account_id, limit }),

  requestPayout: (wh_account_id, amount = null) =>
    axios.post(`${API_BASE}/seller/stripe/request-payout`, { wh_account_id, amount }),

  disconnect: (wh_account_id) =>
    axios.post(`${API_BASE}/seller/stripe/disconnect`, { wh_account_id }),

  // Admin
  adminGetAllSellers: (status = 'all') =>
    axios.post(`${API_BASE}/admin/stripe/sellers`, { status }),

  adminGetSellerDetail: (wh_account_id) =>
    axios.post(`${API_BASE}/admin/stripe/seller-detail`, { wh_account_id }),

  adminUpdateConfig: (wh_account_id, config) =>
    axios.post(`${API_BASE}/admin/stripe/update-config`, { wh_account_id, ...config }),

  adminCreatePayout: (wh_account_id, amount) =>
    axios.post(`${API_BASE}/admin/stripe/create-payout`, { wh_account_id, amount }),

  adminGetTransactions: (limit = 100, offset = 0, type = null) =>
    axios.post(`${API_BASE}/admin/stripe/transactions`, { limit, offset, type }),
};
```

---

## 🐛 Troubleshooting

### Common Issues

#### **1. Webhook Not Receiving Events**

**Problem:** Stripe webhook not firing or failing

**Solution:**
- Check webhook URL is correct: `https://stageshipperapi.thedelivio.com/api/webhook/stripe/connect`
- Verify webhook secret in `.env` matches Stripe dashboard
- Check Laravel logs: `tail -f storage/logs/laravel.log | grep STRIPE`
- Test webhook in Stripe dashboard with "Send test webhook"

#### **2. Onboarding Link Not Working**

**Problem:** Seller can't complete onboarding

**Solution:**
- Check `APP_URL` in `.env` is correct
- Verify `refresh_url` and `return_url` in config
- Check Stripe account is in test mode if using test keys
- Try refreshing link: `POST /api/seller/stripe/onboard-refresh`

#### **3. Payout Fails**

**Problem:** Payout request fails or gets stuck

**Solution:**
- Check seller has completed onboarding: `stripe_payouts_enabled = 1`
- Verify minimum payout met: balance >= `stripe_minimum_payout`
- Check Stripe account has valid bank account
- Review `stripe_webhook_logs` table for payout.failed events

#### **4. Balance Not Updating**

**Problem:** `Shipper_earnings` not increasing after order

**Solution:**
- Check webhook is receiving `checkout.session.completed` events
- Verify order creation succeeds in webhook handler
- Check `stripe_transactions` table for recorded charges
- Review Laravel logs for webhook processing errors

#### **5. Commission Not Calculating Correctly**

**Problem:** Wrong commission amount deducted

**Solution:**
- Check `stripe_commission_percentage` in `wh_warehouse_user` table
- Verify calculation in `ai_order_payment_calculation_data` table
- Review per-order metadata in `calculated_orderMetaData` JSON field

### Debug Checklist

- [ ] Check `.env` file has all Stripe keys
- [ ] Verify webhook URL is reachable (test with curl)
- [ ] Check database tables exist and have correct structure
- [ ] Review Laravel logs for errors
- [ ] Check `stripe_webhook_logs` table for failed events
- [ ] Verify seller's `stripe_connect_id` is set
- [ ] Check Stripe dashboard for account status
- [ ] Test with Stripe test mode first

---

## 📞 Support

For issues or questions:
- Review Laravel logs: `storage/logs/laravel.log`
- Check webhook logs: `SELECT * FROM stripe_webhook_logs ORDER BY created_at DESC LIMIT 20`
- Test API endpoints with curl/Postman
- Review Stripe dashboard event logs

---

## ✅ Next Steps

1. **Test Backend APIs** - Use curl/Postman to test all endpoints
2. **Build Frontend Pages** - Create React components for seller/admin
3. **Test Complete Flow** - Onboard test seller → Make payment → Request payout
4. **Switch to Live Keys** - When ready for production
5. **Monitor Webhooks** - Watch `stripe_webhook_logs` table for issues

---

**Integration Complete! 🎉**

Backend is fully functional and ready for testing. Frontend implementation pending.
