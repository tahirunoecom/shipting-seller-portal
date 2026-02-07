# WhatsApp Multi-Tenant Integration Setup Guide

This folder contains all the code updates needed to enable multi-tenant WhatsApp Business integration for the seller portal.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         META WHATSAPP                               │
│  (Each seller has their own WhatsApp Business Account)              │
└─────────────────────────┬───────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    AIBOT WEBHOOK                                     │
│  https://stagebot.anythinginstantly.com/webhooks/whatsapp_business   │
│                                                                      │
│  1. Receives message with phone_number_id                           │
│  2. Calls Laravel API to get seller's credentials                   │
│  3. Routes message to Rasa with seller context                      │
│  4. Sends reply using seller's access_token                         │
└─────────────────────────┬───────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    LARAVEL API                                       │
│  https://stageshipperapi.thedelivio.com/api                          │
│                                                                      │
│  - Stores seller WhatsApp configs in database                       │
│  - Provides internal API for AIBOT to lookup sellers                │
│  - Handles OAuth token exchange from Embedded Signup                │
└─────────────────────────────────────────────────────────────────────┘
```

## Setup Steps

### Step 1: Laravel Backend Setup

#### 1.1 Copy Files
Copy these files to your Laravel project:

```
laravel/
├── WhatsAppController.php          → app/Http/Controllers/Api/Seller/
├── Models/SellerWhatsappConfig.php → app/Models/
├── migrations/                      → database/migrations/
└── routes/api_whatsapp.php         → (merge into routes/api.php)
```

#### 1.2 Run Migration
```bash
php artisan migrate
```

#### 1.3 Add Routes
Add to your `routes/api.php`:
```php
// Include WhatsApp routes
require __DIR__.'/api_whatsapp.php';

// OR copy the route definitions directly
```

#### 1.4 Configure Internal API Key
Add to your `.env`:
```env
INTERNAL_API_KEY=your_secure_random_key_here
```

Add to `config/services.php`:
```php
'internal_api_key' => env('INTERNAL_API_KEY'),
```

### Step 2: AIBOT Webhook Update

#### 2.1 Copy Files
Copy these files to your AIBOT server (`/var/www/html/stagebot.anythinginstantly.com/actions/`):

```
store_config.py                    → actions/store_config.py (REPLACE)
whatsapp_business_connector.py     → actions/whatsapp_business_connector.py (REPLACE)
```

#### 2.2 Update Environment
Add to AIBOT's `.env`:
```env
SELLER_API_URL=https://stageshipperapi.thedelivio.com/api
SELLER_API_KEY=your_secure_random_key_here
```

#### 2.3 Restart Rasa
```bash
sudo systemctl restart rasa
# or
rasa run --enable-api
```

### Step 3: Meta App Configuration

Your Meta App is already configured with:
- **App ID**: 1559645705059315
- **Config ID**: 1403441077449207
- **Business ID**: 1856101791959161

Ensure webhook is pointing to:
```
https://stagebot.anythinginstantly.com/webhooks/whatsapp_business/webhook
```

## How It Works

### Seller Connection Flow
1. Seller goes to WhatsApp page in portal
2. Clicks "Login with Facebook"
3. Meta Embedded Signup flow opens
4. Seller connects/creates WhatsApp Business account
5. OAuth code sent to Laravel `/exchange-token`
6. Session info (WABA ID, Phone Number ID) saved
7. Seller's WhatsApp is now connected

### Message Flow (Multi-Tenant)
1. Customer sends message to seller's WhatsApp number
2. Meta sends webhook to AIBOT with `phone_number_id`
3. AIBOT calls Laravel API: `POST /internal/whatsapp/get-seller-by-phone`
4. Laravel returns seller's `access_token` and config
5. AIBOT processes message with seller context
6. AIBOT sends reply using seller's `access_token`

## API Endpoints Reference

### Seller Portal APIs (require auth)
| Endpoint | Description |
|----------|-------------|
| `POST /seller/whatsapp/status` | Get connection status |
| `POST /seller/whatsapp/exchange-token` | Exchange OAuth code |
| `POST /seller/whatsapp/session-info` | Save WABA/Phone IDs |
| `POST /seller/whatsapp/disconnect` | Disconnect WhatsApp |
| `POST /seller/whatsapp/sync-catalog` | Sync products to catalog |
| `POST /seller/whatsapp/bot-settings` | Update bot settings |

### Internal APIs (for AIBOT)
| Endpoint | Description |
|----------|-------------|
| `POST /internal/whatsapp/get-seller-by-phone` | Get seller by phone_number_id |
| `POST /internal/whatsapp/get-seller-by-display-phone` | Get seller by display phone |

## Database Schema

```sql
CREATE TABLE seller_whatsapp_config (
    id BIGINT PRIMARY KEY,
    wh_account_id BIGINT UNIQUE,          -- Seller ID
    waba_id VARCHAR(255),                  -- WhatsApp Business Account ID
    phone_number_id VARCHAR(255),          -- Phone Number ID
    display_phone_number VARCHAR(255),     -- +1 (234) 567-8900
    business_name VARCHAR(255),
    access_token TEXT,                     -- Seller's Meta access token
    catalog_id VARCHAR(255),               -- Meta Catalog ID
    is_connected BOOLEAN DEFAULT FALSE,
    connection_status ENUM('disconnected','connecting','connected','error'),
    bot_settings JSON,                     -- Welcome message, etc.
    connected_at TIMESTAMP,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

## Troubleshooting

### Issue: "No seller found for phone_number_id"
- Check if seller completed Embedded Signup
- Verify `phone_number_id` is saved in database
- Check Laravel logs for API errors

### Issue: Messages not sending
- Verify seller's `access_token` is valid
- Check AIBOT logs: `tail -f /var/log/rasa/rasa.log`
- Ensure correct `phone_number_id` is used for API calls

### Issue: Catalog sync failing
- Seller needs to create a Catalog in Meta Business Manager
- Link catalog to WhatsApp Business Account
- Save `catalog_id` in seller config
