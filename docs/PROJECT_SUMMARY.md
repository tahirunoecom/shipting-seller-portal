# Shipting WhatsApp Bot Integration - Project Summary

## Quick Links

### Claude Code Session Links
1. **Current Session (Setup Guide & UI)**: https://claude.ai/code/session_018fYN3jyArmtKGTbf4wPpHQ
2. **Previous Sessions** (from context):
   - Session with webhook architecture, GreenEarth debugging, documentation creation
   - Session with Meta Embedded Signup customization (Config ID changes)

### GitHub Repository
- **Repo**: `tahirunoecom/shipting-seller-portal`
- **Branch**: `claude/whatsapp-bot-verification-gTN6y`

### External Links
- **Meta App Dashboard**: https://developers.facebook.com/apps/1559645705059315/
- **WhatsApp Manager**: https://business.facebook.com/wa/manage/home/
- **Meta Business Suite**: https://business.facebook.com/

---

## Project Overview

**Shipting** is a delivery platform where sellers can connect WhatsApp Business to enable automated ordering via a chatbot. Customers message the seller's WhatsApp number, browse products, place orders, and track deliveries - all automated.

### Architecture
```
Customer WhatsApp → Meta Webhook → Rasa Bot → Shipting Backend → Response to Customer
```

### Key Concept: Single Webhook for All Sellers
- ONE webhook URL configured at Meta App level
- Bot identifies sellers by `phone_number_id` in webhook payload
- Multi-tenant architecture with seller lookup via `store_config.py`

---

## Configuration & Credentials

### Meta App Configuration
| Item | Value |
|------|-------|
| Meta App ID | `1559645705059315` |
| Meta Config ID | `1403441077449207` |
| App Name | AnythingInstantly |

### Config ID Details
The new Config ID `1403441077449207` was created to simplify the Embedded Signup flow:
- **Includes**: WhatsApp Business Accounts, Catalogs
- **Excludes**: Facebook Pages, Instagram, Ad Accounts, Pixels

### Permissions Status (Meta App Review)
| Permission | Status |
|------------|--------|
| `whatsapp_business_messaging` | **APPROVED** |
| `whatsapp_business_management` | **NOT APPROVED** |

> **Note**: Because `whatsapp_business_management` is not approved, new WABAs must be manually subscribed to webhooks using System User token.

### WABA Subscription (Manual Fix for New Sellers)
```bash
curl -X POST "https://graph.facebook.com/v21.0/{WABA_ID}/subscribed_apps" \
  -H "Authorization: Bearer {SYSTEM_USER_TOKEN}"
```

---

## Database Tables

### `wh_accounts` (WhatsApp Accounts)
```sql
- id (PK)
- seller_id (FK to sellers)
- phone_number
- phone_number_id (Meta's ID)
- waba_id (WhatsApp Business Account ID)
- business_id
- access_token
- catalog_id
- status (active/inactive)
- created_at, updated_at
```

### `wh_conversations` (Chat History)
```sql
- id (PK)
- wh_account_id (FK)
- customer_phone
- customer_name
- last_message
- last_message_at
- status
```

### `wh_messages` (Individual Messages)
```sql
- id (PK)
- conversation_id (FK)
- direction (inbound/outbound)
- message_type (text/image/order/etc)
- content
- metadata (JSON)
- created_at
```

---

## Key Files Modified/Created

### Frontend (React)
| File | Description |
|------|-------------|
| `src/pages/whatsapp/WhatsAppPage.jsx` | Main WhatsApp config page with Embedded Signup, setup guide |

### Backend (Laravel) - in `aibot-updates/` folder
| File | Description |
|------|-------------|
| `WhatsAppController.php` | Handles Meta callbacks, token exchange, WABA setup |
| `WhatsAppWebhookController.php` | Receives webhook events from Meta |

### Bot (Python/Rasa) - in `aibot-updates/` folder
| File | Description |
|------|-------------|
| `store_config.py` | Multi-tenant seller lookup with caching |
| `whatsapp_business_connector.py` | Rasa WhatsApp channel connector |
| `actions.py` | Custom Rasa actions for ordering |

### Documentation
| File | Description |
|------|-------------|
| `docs/SHIPTING_USER_GUIDE.md` | Comprehensive user guide (Seller, Customer, Admin, Driver journeys) |
| `docs/PROJECT_SUMMARY.md` | This file - project summary for continuity |

---

## Features Implemented

### Seller Features
- [x] Meta Embedded Signup integration
- [x] WhatsApp Business Account connection
- [x] Phone number verification
- [x] Catalog linking
- [x] QR Code generation for WhatsApp
- [x] Business profile management
- [x] Setup guide with step-by-step instructions
- [x] Collapsible setup guide UI

### Customer Features (via WhatsApp Bot)
- [x] Browse products by category
- [x] View product details
- [x] Add to cart
- [x] Place orders
- [x] Track order status
- [x] Receive order notifications

### Admin Features
- [x] View all sellers with WhatsApp status
- [x] Monitor webhook activity

---

## Setup Guide Instructions (Added to UI)

The WhatsApp page now includes a collapsible setup guide with 6 steps:

1. **Log in with Facebook** - Authenticate with Meta
2. **Create/Select WhatsApp Business Account** - New or existing
3. **Create Catalog - Select "Commerce" Vertical** (Amber highlight - IMPORTANT)
4. **Add Your Phone Number** (Blue highlight - IMPORTANT)
   - Must select "Use a new or existing WhatsApp number"
   - NOT "Display name only" or "Add later"
   - Includes troubleshooting for number conflict errors
5. **Verify Phone Number** - SMS or Voice call
6. **Complete Setup** - Review and finish

---

## Known Issues & Solutions

### Issue 1: New Seller WhatsApp Not Responding
**Cause**: WABA not subscribed to webhook (needs `whatsapp_business_management` permission)
**Solution**: Manually subscribe WABA using System User token:
```bash
curl -X POST "https://graph.facebook.com/v21.0/{WABA_ID}/subscribed_apps" \
  -H "Authorization: Bearer {SYSTEM_USER_TOKEN}"
```

### Issue 2: Phone Number Already Registered
**Error**: "To use this phone number, you'll need to delete an existing one from WhatsApp Manager"
**Solution**:
- Go to WhatsApp Manager
- Delete the existing number
- Or use a different phone number

### Issue 3: Cannot Auto-Select Commerce Vertical
**Attempted**: `extras.setup.business.vertical: 'ECOMMERCE'`
**Result**: Meta ignores this parameter
**Solution**: Added clear instructions in setup guide for users to manually select "Commerce"

---

## Twilio Integration (Optional Phone Numbers)

For sellers without a business phone number, Twilio integration provides:
- Search for available US phone numbers by area code
- Purchase numbers ($1.15/mo)
- SMS inbox for verification codes
- Number release functionality

---

## Next Steps: Stripe Connect Integration

### Overview
Stripe Connect will enable:
- Sellers receive payments directly to their Stripe accounts
- Platform takes commission per transaction
- Automated payouts to sellers

### Estimated Effort (from previous discussion)
- **Total**: ~3-4 weeks
- Backend API: 1-1.5 weeks
- Frontend dashboard: 1 week
- Testing & compliance: 1-1.5 weeks

### Key Components Needed
1. Stripe Connect onboarding flow for sellers
2. Payment intent creation with `transfer_data`
3. Commission/fee calculation
4. Payout dashboard for sellers
5. Webhook handlers for payment events

---

## Git Commits (This Session)

```
9147417 Add phone number conflict troubleshooting to setup guide
1bf9384 Add phone number selection requirement to setup guide
ceb2e54 Add collapsible show/hide toggle to setup guide
b6e539a Add step-by-step setup guide for Meta Embedded Signup flow
dcb5292 Revert business prefill experiment - vertical cannot be pre-selected
```

---

## Environment Details

- **Platform**: Linux
- **Frontend**: React + Vite
- **Backend**: Laravel (PHP)
- **Bot**: Rasa (Python)
- **Database**: MySQL/PostgreSQL
- **Messaging**: Meta WhatsApp Business API

---

## How to Continue This Project

1. Start a new Claude Code session
2. Share this summary file or paste its contents
3. Reference the session links above for context
4. Specify what you want to work on (e.g., "Let's implement Stripe Connect")

---

## Contact / Support

For issues with:
- **Meta App**: Check Meta Developer Dashboard
- **Webhooks**: Check Rasa logs at `/var/log/rasa/rasa.log`
- **Database**: Check Laravel logs

---

*Last Updated: February 7, 2026*
*Session: https://claude.ai/code/session_018fYN3jyArmtKGTbf4wPpHQ*
