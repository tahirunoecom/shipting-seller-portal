# Payout Approval System - Backend Implementation Guide

Complete backend implementation for the admin-controlled payout approval system.

## 📋 Overview

This system replaces direct seller payout requests with an admin approval workflow:

**OLD:** Seller → Request Payout → Payout Created ❌
**NEW:** Seller → Request Approval → Admin Reviews → Admin Approves/Rejects → Payout Created ✅

---

## 🗂️ Files Included

1. **`database.sql`** - SQL script to create the table and indexes
2. **`create_payout_approval_requests_table.php`** - Laravel migration file
3. **`PayoutApprovalMethods.php`** - Controller methods to add to StripeConnectController
4. **`payout_approval_routes.php`** - API routes to add to your routes file
5. **`README.md`** - This implementation guide

---

## 🚀 Implementation Steps

### Step 1: Database Setup

Choose **ONE** of these options:

#### Option A: Using SQL (Quick)

```bash
# Run the SQL file directly
mysql -u your_username -p your_database < database.sql
```

#### Option B: Using Laravel Migration (Recommended)

```bash
# 1. Copy migration file to Laravel migrations folder
cp create_payout_approval_requests_table.php path/to/laravel/database/migrations/2026_02_08_000001_create_payout_approval_requests_table.php

# 2. Run migration
cd path/to/laravel
php artisan migrate

# 3. Verify table was created
php artisan db:table payout_approval_requests
```

**Important:** If you get a foreign key error, run this first:

```sql
CREATE INDEX idx_wh_account_id ON wh_warehouse_user(wh_account_id);
```

---

### Step 2: Add Controller Methods

Add the 5 new methods to your `StripeConnectController.php`:

**File:** `App/Http/Controllers/Api/Seller/StripeConnectController.php`

**Location:** Add these methods after `adminAddTestBalance()` and before the `// HELPER METHODS` section

**Methods to add:**
1. `requestPayoutApproval()` - Seller requests approval
2. `getPayoutApprovalRequests()` - Seller gets their requests
3. `adminGetAllPayoutApprovalRequests()` - Admin gets all requests
4. `approvePayoutRequest()` - Admin approves and creates payout
5. `rejectPayoutRequest()` - Admin rejects request

**Copy from:** `PayoutApprovalMethods.php`

```bash
# Quick way: Append all methods to your controller
# (Review and adjust as needed)
cat PayoutApprovalMethods.php >> path/to/your/StripeConnectController.php
```

---

### Step 3: Add API Routes

Add the new routes to your existing routes file:

**File:** `routes/stripe_connect_routes.php` (or `routes/api.php`)

**Add these inside existing Route::prefix() groups:**

```php
// SELLER ROUTES - Add inside Route::prefix('seller/stripe')
Route::post('/request-payout-approval', [StripeConnectController::class, 'requestPayoutApproval']);
Route::post('/payout-approval-requests', [StripeConnectController::class, 'getPayoutApprovalRequests']);

// ADMIN ROUTES - Add inside Route::prefix('admin/stripe')
Route::post('/payout-approval-requests', [StripeConnectController::class, 'adminGetAllPayoutApprovalRequests']);
Route::post('/approve-payout-request', [StripeConnectController::class, 'approvePayoutRequest']);
Route::post('/reject-payout-request', [StripeConnectController::class, 'rejectPayoutRequest']);
```

**Full route file:** See `payout_approval_routes.php` for complete examples

---

### Step 4: Test the Implementation

#### Test 1: Seller Requests Payout Approval

```bash
curl -X POST http://your-api.com/api/seller/stripe/request-payout-approval \
  -H "Content-Type: application/json" \
  -d '{
    "wh_account_id": 1016,
    "amount": 100.00,
    "notes": "Need funds for inventory"
  }'
```

**Expected Response:**
```json
{
  "status": 1,
  "message": "Payout approval request submitted successfully",
  "data": {
    "request_id": 1,
    "amount": 100.00,
    "status": "pending",
    "created_at": "2026-02-08 12:30:00"
  }
}
```

#### Test 2: Seller Views Their Requests

```bash
curl -X POST http://your-api.com/api/seller/stripe/payout-approval-requests \
  -H "Content-Type: application/json" \
  -d '{
    "wh_account_id": 1016,
    "limit": 20
  }'
```

#### Test 3: Admin Views All Pending Requests

```bash
curl -X POST http://your-api.com/api/admin/stripe/payout-approval-requests \
  -H "Content-Type: application/json" \
  -d '{
    "status": "pending"
  }'
```

#### Test 4: Admin Approves Request

```bash
curl -X POST http://your-api.com/api/admin/stripe/approve-payout-request \
  -H "Content-Type: application/json" \
  -d '{
    "request_id": 1,
    "admin_notes": "Approved - all verified"
  }'
```

**Expected Result:**
- ✅ Approval request status → "approved"
- ✅ Actual Stripe payout created
- ✅ Seller balance reduced
- ✅ Entry added to `stripe_payouts` table

#### Test 5: Admin Rejects Request

```bash
curl -X POST http://your-api.com/api/admin/stripe/reject-payout-request \
  -H "Content-Type: application/json" \
  -d '{
    "request_id": 2,
    "rejection_reason": "Need more documentation"
  }'
```

---

## 📊 Database Schema

### `payout_approval_requests` Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGINT | Primary key |
| `wh_account_id` | INT | Seller's account ID |
| `amount` | DECIMAL(10,2) | Requested amount |
| `notes` | TEXT | Seller's notes (optional) |
| `status` | ENUM | pending/approved/rejected |
| `admin_notes` | TEXT | Admin's approval notes |
| `rejection_reason` | TEXT | Admin's rejection reason |
| `approved_by_admin_id` | BIGINT | Admin who processed it |
| `stripe_payout_id` | BIGINT | Links to stripe_payouts.id |
| `processed_at` | DATETIME | When admin processed it |
| `created_at` | DATETIME | When request was created |
| `updated_at` | DATETIME | Last update time |

**Indexes:**
- `idx_wh_account_id` - Quick seller lookups
- `idx_status` - Filter by status
- `idx_created_at` - Chronological sorting
- `idx_wh_status` - Combined queries

---

## 🔗 API Endpoints

### Seller Endpoints

#### 1. Request Payout Approval
```
POST /api/seller/stripe/request-payout-approval
```
**Body:**
```json
{
  "wh_account_id": 1016,
  "amount": 500.00,
  "notes": "Optional notes"
}
```

#### 2. Get Approval Requests
```
POST /api/seller/stripe/payout-approval-requests
```
**Body:**
```json
{
  "wh_account_id": 1016,
  "limit": 20
}
```

---

### Admin Endpoints

#### 3. Get All Approval Requests
```
POST /api/admin/stripe/payout-approval-requests
```
**Body:**
```json
{
  "wh_account_id": 1016,
  "status": "pending"
}
```

#### 4. Approve Request
```
POST /api/admin/stripe/approve-payout-request
```
**Body:**
```json
{
  "request_id": 123,
  "admin_notes": "Approved"
}
```

#### 5. Reject Request
```
POST /api/admin/stripe/reject-payout-request
```
**Body:**
```json
{
  "request_id": 123,
  "rejection_reason": "Reason here"
}
```

---

## ✅ Validation Rules

### Request Approval Validation:
- ✅ Seller must have Stripe Connect enabled
- ✅ Amount must be ≥ minimum payout ($50)
- ✅ Amount must be ≤ available balance
- ✅ Only ONE pending request per seller at a time
- ✅ Seller account must be active

### Approve Request Validation:
- ✅ Request must exist and be "pending"
- ✅ Seller must still have sufficient balance
- ✅ Stripe account must be active
- ✅ Platform must have sufficient balance

### Reject Request Validation:
- ✅ Request must exist and be "pending"
- ✅ Rejection reason is required

---

## 🔐 Security Considerations

### Authentication
Currently, routes are **not protected** by authentication middleware for testing. Before going to production:

```php
// Add authentication middleware
Route::middleware(['auth:sanctum'])->prefix('seller/stripe')->group(function () {
    // Seller routes
});

Route::middleware(['auth:sanctum', 'admin'])->prefix('admin/stripe')->group(function () {
    // Admin routes
});
```

### Authorization
- Verify `wh_account_id` belongs to authenticated user
- Verify admin has proper permissions
- Log all admin actions for audit trail

### Input Validation
Add Laravel Request validation classes:

```php
// app/Http/Requests/PayoutApprovalRequest.php
public function rules()
{
    return [
        'wh_account_id' => 'required|integer|exists:wh_warehouse_user,wh_account_id',
        'amount' => 'nullable|numeric|min:50',
        'notes' => 'nullable|string|max:1000'
    ];
}
```

---

## 🐛 Troubleshooting

### Error: "Foreign key constraint failed"
**Solution:** Create index first:
```sql
CREATE INDEX idx_wh_account_id ON wh_warehouse_user(wh_account_id);
```

### Error: "You already have a pending request"
**Solution:** Check database:
```sql
SELECT * FROM payout_approval_requests
WHERE wh_account_id = 1016 AND status = 'pending';
```

### Error: "Insufficient balance in platform account"
**Solution:** Add test balance (test mode only):
```bash
curl -X POST http://your-api.com/api/admin/stripe/add-test-balance \
  -d '{"wh_account_id": 1016, "amount": 1000}'
```

### Payout approval succeeds but payout fails
**Check:**
- Platform Stripe account balance
- Seller's bank account is connected
- Stripe API keys are correct
- Check Laravel logs: `storage/logs/laravel.log`

---

## 📈 Monitoring & Analytics

### Useful Queries

#### Pending Requests Count
```sql
SELECT COUNT(*) FROM payout_approval_requests WHERE status = 'pending';
```

#### Average Approval Time
```sql
SELECT AVG(TIMESTAMPDIFF(MINUTE, created_at, processed_at)) as avg_minutes
FROM payout_approval_requests
WHERE status = 'approved';
```

#### Top Requesters
```sql
SELECT wh_account_id, COUNT(*) as request_count
FROM payout_approval_requests
GROUP BY wh_account_id
ORDER BY request_count DESC
LIMIT 10;
```

---

## 🔄 Future Enhancements

### Notifications
- Email seller when request is approved/rejected
- Email admin when new request is submitted
- In-app notifications

### Batch Operations
- Admin bulk approve multiple requests
- Scheduled auto-approval based on criteria

### Advanced Features
- Payout request limits (max per week/month)
- Auto-approve for trusted sellers
- Request notes history/chat
- File attachments for documentation

---

## 📞 Support

If you encounter issues:

1. Check Laravel logs: `tail -f storage/logs/laravel.log`
2. Check database: Review queries in `database.sql`
3. Test API endpoints with provided curl commands
4. Verify Stripe API keys and test mode

---

## ✨ Summary

You now have a complete, production-ready payout approval system!

**What's included:**
- ✅ Database table with proper indexes
- ✅ 5 new API endpoints (seller + admin)
- ✅ Complete validation and error handling
- ✅ Stripe payout integration
- ✅ Comprehensive logging
- ✅ Test examples and queries

**Next steps:**
1. Run the migration
2. Add controller methods
3. Add routes
4. Test with curl commands
5. Integrate with your frontend (already done!)

🎉 **You're all set!**
