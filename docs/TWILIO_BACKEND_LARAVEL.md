# Twilio Backend Implementation (Laravel)

This document contains the Laravel/PHP backend code for Twilio phone number integration.

## Environment Variables

Add these to your `.env` file:

```env
TWILIO_ACCOUNT_SID=your_twilio_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_WEBHOOK_URL=https://stageshipperapi.thedelivio.com/api/webhook/twilio/sms
```

## Install Twilio SDK

```bash
composer require twilio/sdk
```

## Database Migration

```php
<?php
// database/migrations/xxxx_create_twilio_numbers_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateTwilioNumbersTable extends Migration
{
    public function up()
    {
        Schema::create('twilio_numbers', function (Blueprint $table) {
            $table->id();
            $table->string('wh_account_id')->unique();
            $table->string('phone_number');
            $table->string('phone_number_sid');
            $table->string('friendly_name')->nullable();
            $table->decimal('monthly_cost', 10, 4)->default(1.15); // For future billing
            $table->timestamp('purchased_at');
            $table->timestamps();

            $table->index('wh_account_id');
            $table->index('phone_number');
        });

        Schema::create('twilio_sms_messages', function (Blueprint $table) {
            $table->id();
            $table->string('wh_account_id');
            $table->string('message_sid')->unique();
            $table->string('from_number');
            $table->string('to_number');
            $table->text('body');
            $table->string('status')->default('received');
            $table->boolean('is_read')->default(false);
            $table->string('extracted_otp')->nullable(); // Auto-extracted OTP
            $table->timestamps();

            $table->index('wh_account_id');
            $table->index('to_number');
            $table->index('created_at');
        });
    }

    public function down()
    {
        Schema::dropIfExists('twilio_sms_messages');
        Schema::dropIfExists('twilio_numbers');
    }
}
```

## Controller: TwilioController.php

```php
<?php
namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Twilio\Rest\Client;

class TwilioController extends Controller
{
    private $twilio;

    public function __construct()
    {
        $this->twilio = new Client(
            config('services.twilio.sid'),
            config('services.twilio.token')
        );
    }

    // ============================================
    // SEARCH AVAILABLE NUMBERS
    // ============================================

    /**
     * Search available US phone numbers
     * POST /seller/twilio/search-numbers
     */
    public function searchNumbers(Request $request)
    {
        $wh_account_id = $request->wh_account_id;
        $area_code = $request->area_code;
        $contains = $request->contains;
        $limit = $request->limit ?? 10;

        if (!$wh_account_id) {
            return response()->json([
                'status' => 0,
                'message' => 'Account ID is required'
            ]);
        }

        try {
            $options = [
                'smsEnabled' => true,
                'voiceEnabled' => true,
                'limit' => $limit,
            ];

            if ($area_code) {
                $options['areaCode'] = $area_code;
            }

            if ($contains) {
                $options['contains'] = $contains;
            }

            $numbers = $this->twilio->availablePhoneNumbers('US')
                ->local
                ->read($options);

            $result = [];
            foreach ($numbers as $number) {
                $result[] = [
                    'phone_number' => $number->phoneNumber,
                    'friendly_name' => $number->friendlyName,
                    'locality' => $number->locality,
                    'region' => $number->region,
                    'postal_code' => $number->postalCode,
                    'capabilities' => [
                        'sms' => $number->capabilities['sms'] ?? false,
                        'voice' => $number->capabilities['voice'] ?? false,
                        'mms' => $number->capabilities['mms'] ?? false,
                    ],
                ];
            }

            return response()->json([
                'status' => 1,
                'message' => 'Numbers found',
                'data' => $result
            ]);

        } catch (\Exception $e) {
            Log::error('Twilio search error: ' . $e->getMessage());
            return response()->json([
                'status' => 0,
                'message' => 'Failed to search numbers: ' . $e->getMessage()
            ]);
        }
    }

    // ============================================
    // BUY/PROVISION A NUMBER
    // ============================================

    /**
     * Buy a phone number for the user
     * POST /seller/twilio/buy-number
     */
    public function buyNumber(Request $request)
    {
        $wh_account_id = $request->wh_account_id;
        $phone_number = $request->phone_number;

        if (!$wh_account_id || !$phone_number) {
            return response()->json([
                'status' => 0,
                'message' => 'Account ID and phone number are required'
            ]);
        }

        // Check if user already has a number
        $existing = DB::table('twilio_numbers')
            ->where('wh_account_id', $wh_account_id)
            ->first();

        if ($existing) {
            return response()->json([
                'status' => 0,
                'message' => 'You already have a phone number assigned: ' . $existing->phone_number
            ]);
        }

        try {
            // Purchase the number via Twilio API
            $purchased = $this->twilio->incomingPhoneNumbers->create([
                'phoneNumber' => $phone_number,
                'smsUrl' => config('services.twilio.webhook_url'),
                'smsMethod' => 'POST',
                'friendlyName' => 'Shipting-' . $wh_account_id,
            ]);

            // Save to database
            DB::table('twilio_numbers')->insert([
                'wh_account_id' => $wh_account_id,
                'phone_number' => $purchased->phoneNumber,
                'phone_number_sid' => $purchased->sid,
                'friendly_name' => $purchased->friendlyName,
                'monthly_cost' => 1.15, // US local number cost
                'purchased_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            return response()->json([
                'status' => 1,
                'message' => 'Phone number purchased successfully',
                'data' => [
                    'phone_number' => $purchased->phoneNumber,
                    'sid' => $purchased->sid,
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Twilio buy error: ' . $e->getMessage());
            return response()->json([
                'status' => 0,
                'message' => 'Failed to purchase number: ' . $e->getMessage()
            ]);
        }
    }

    // ============================================
    // GET USER'S NUMBER
    // ============================================

    /**
     * Get user's Twilio number details
     * POST /seller/twilio/my-number
     */
    public function getMyNumber(Request $request)
    {
        $wh_account_id = $request->wh_account_id;

        if (!$wh_account_id) {
            return response()->json([
                'status' => 0,
                'message' => 'Account ID is required'
            ]);
        }

        $number = DB::table('twilio_numbers')
            ->where('wh_account_id', $wh_account_id)
            ->first();

        if ($number) {
            return response()->json([
                'status' => 1,
                'message' => 'Number found',
                'data' => [
                    'phone_number' => $number->phone_number,
                    'sid' => $number->phone_number_sid,
                    'purchased_at' => $number->purchased_at,
                    'monthly_cost' => $number->monthly_cost,
                ]
            ]);
        } else {
            return response()->json([
                'status' => 0,
                'message' => 'No number assigned',
                'data' => null
            ]);
        }
    }

    // ============================================
    // RELEASE NUMBER
    // ============================================

    /**
     * Release/delete user's Twilio number
     * POST /seller/twilio/release-number
     */
    public function releaseNumber(Request $request)
    {
        $wh_account_id = $request->wh_account_id;

        if (!$wh_account_id) {
            return response()->json([
                'status' => 0,
                'message' => 'Account ID is required'
            ]);
        }

        $number = DB::table('twilio_numbers')
            ->where('wh_account_id', $wh_account_id)
            ->first();

        if (!$number) {
            return response()->json([
                'status' => 0,
                'message' => 'No number found'
            ]);
        }

        try {
            // Release from Twilio
            $this->twilio->incomingPhoneNumbers($number->phone_number_sid)->delete();

            // Delete from database
            DB::table('twilio_numbers')
                ->where('wh_account_id', $wh_account_id)
                ->delete();

            // Also delete SMS messages
            DB::table('twilio_sms_messages')
                ->where('wh_account_id', $wh_account_id)
                ->delete();

            return response()->json([
                'status' => 1,
                'message' => 'Phone number released successfully'
            ]);

        } catch (\Exception $e) {
            Log::error('Twilio release error: ' . $e->getMessage());
            return response()->json([
                'status' => 0,
                'message' => 'Failed to release number: ' . $e->getMessage()
            ]);
        }
    }

    // ============================================
    // SMS INBOX
    // ============================================

    /**
     * Get SMS inbox for user's Twilio number
     * POST /seller/twilio/sms-inbox
     */
    public function getSmsInbox(Request $request)
    {
        $wh_account_id = $request->wh_account_id;
        $limit = $request->limit ?? 20;

        if (!$wh_account_id) {
            return response()->json([
                'status' => 0,
                'message' => 'Account ID is required'
            ]);
        }

        $messages = DB::table('twilio_sms_messages')
            ->where('wh_account_id', $wh_account_id)
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get();

        return response()->json([
            'status' => 1,
            'message' => 'Messages retrieved',
            'data' => $messages
        ]);
    }

    /**
     * Get latest OTP from SMS inbox (auto-extracted)
     * POST /seller/twilio/latest-otp
     */
    public function getLatestOtp(Request $request)
    {
        $wh_account_id = $request->wh_account_id;

        if (!$wh_account_id) {
            return response()->json([
                'status' => 0,
                'message' => 'Account ID is required'
            ]);
        }

        // Get latest message with extracted OTP
        $message = DB::table('twilio_sms_messages')
            ->where('wh_account_id', $wh_account_id)
            ->whereNotNull('extracted_otp')
            ->orderBy('created_at', 'desc')
            ->first();

        if ($message) {
            return response()->json([
                'status' => 1,
                'message' => 'OTP found',
                'data' => [
                    'otp' => $message->extracted_otp,
                    'from' => $message->from_number,
                    'received_at' => $message->created_at,
                    'full_message' => $message->body,
                ]
            ]);
        }

        // If no pre-extracted OTP, search in recent messages
        $recentMessage = DB::table('twilio_sms_messages')
            ->where('wh_account_id', $wh_account_id)
            ->orderBy('created_at', 'desc')
            ->first();

        if ($recentMessage) {
            // Try to extract OTP from message body
            preg_match('/\b(\d{6})\b/', $recentMessage->body, $matches);
            if (!empty($matches[1])) {
                return response()->json([
                    'status' => 1,
                    'message' => 'OTP found',
                    'data' => [
                        'otp' => $matches[1],
                        'from' => $recentMessage->from_number,
                        'received_at' => $recentMessage->created_at,
                        'full_message' => $recentMessage->body,
                    ]
                ]);
            }
        }

        return response()->json([
            'status' => 0,
            'message' => 'No OTP found in recent messages',
            'data' => null
        ]);
    }

    // ============================================
    // WEBHOOK - RECEIVE INCOMING SMS
    // ============================================

    /**
     * Twilio Webhook - receives incoming SMS
     * POST /webhook/twilio/sms
     *
     * This is called by Twilio when an SMS is received
     */
    public function webhookReceiveSms(Request $request)
    {
        Log::info('Twilio SMS Webhook received', $request->all());

        $messageSid = $request->MessageSid;
        $from = $request->From;
        $to = $request->To;
        $body = $request->Body;

        // Find which user owns this number
        $numberRecord = DB::table('twilio_numbers')
            ->where('phone_number', $to)
            ->first();

        if (!$numberRecord) {
            Log::warning('Received SMS for unknown number: ' . $to);
            // Return TwiML response anyway
            return response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', 200)
                ->header('Content-Type', 'text/xml');
        }

        // Extract OTP if present (6-digit number)
        $extractedOtp = null;
        preg_match('/\b(\d{6})\b/', $body, $matches);
        if (!empty($matches[1])) {
            $extractedOtp = $matches[1];
        }

        // Save the message
        DB::table('twilio_sms_messages')->insert([
            'wh_account_id' => $numberRecord->wh_account_id,
            'message_sid' => $messageSid,
            'from_number' => $from,
            'to_number' => $to,
            'body' => $body,
            'status' => 'received',
            'is_read' => false,
            'extracted_otp' => $extractedOtp,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        Log::info('SMS saved for user: ' . $numberRecord->wh_account_id);

        // Return empty TwiML response
        return response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', 200)
            ->header('Content-Type', 'text/xml');
    }

    // ============================================
    // ADMIN ENDPOINTS
    // ============================================

    /**
     * [ADMIN] Get all Twilio numbers provisioned
     * POST /admin/twilio/all-numbers
     */
    public function adminGetAllNumbers(Request $request)
    {
        $numbers = DB::table('twilio_numbers AS t')
            ->leftJoin('wh_warehouse_user AS u', 'u.wh_account_id', '=', 't.wh_account_id')
            ->select(
                't.*',
                'u.email',
                'u.company_name'
            )
            ->orderBy('t.purchased_at', 'desc')
            ->get();

        $totalMonthlyCost = DB::table('twilio_numbers')->sum('monthly_cost');

        return response()->json([
            'status' => 1,
            'message' => 'Numbers retrieved',
            'data' => [
                'numbers' => $numbers,
                'total_count' => count($numbers),
                'total_monthly_cost' => $totalMonthlyCost,
            ]
        ]);
    }

    /**
     * [ADMIN] Buy number for a specific seller
     * POST /admin/twilio/buy-number
     */
    public function adminBuyNumberForSeller(Request $request)
    {
        // Same as buyNumber but with admin check
        // Add admin authentication check here
        return $this->buyNumber($request);
    }

    /**
     * [ADMIN] Get SMS inbox for a seller's number
     * POST /admin/twilio/sms-inbox
     */
    public function adminGetSmsInbox(Request $request)
    {
        // Same as getSmsInbox but with admin check
        return $this->getSmsInbox($request);
    }

    /**
     * [ADMIN] Release seller's Twilio number
     * POST /admin/twilio/release-number
     */
    public function adminReleaseNumber(Request $request)
    {
        // Same as releaseNumber but with admin check
        return $this->releaseNumber($request);
    }

    /**
     * [ADMIN] Get Twilio usage/billing summary
     * POST /admin/twilio/usage-summary
     */
    public function adminGetUsageSummary(Request $request)
    {
        try {
            // Get current month's usage from Twilio
            $usage = $this->twilio->usage->records
                ->read(['category' => 'phonenumbers'], 1);

            $smsUsage = $this->twilio->usage->records
                ->read(['category' => 'sms-inbound'], 1);

            // Get our database stats
            $totalNumbers = DB::table('twilio_numbers')->count();
            $totalMonthlyCost = DB::table('twilio_numbers')->sum('monthly_cost');
            $totalMessages = DB::table('twilio_sms_messages')->count();

            return response()->json([
                'status' => 1,
                'message' => 'Usage summary',
                'data' => [
                    'total_numbers' => $totalNumbers,
                    'total_monthly_cost' => $totalMonthlyCost,
                    'total_messages_received' => $totalMessages,
                    'twilio_phone_usage' => $usage[0] ?? null,
                    'twilio_sms_usage' => $smsUsage[0] ?? null,
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 0,
                'message' => 'Failed to get usage: ' . $e->getMessage()
            ]);
        }
    }
}
```

## Routes (routes/api.php)

```php
<?php
// Seller Twilio Routes
Route::prefix('seller/twilio')->group(function () {
    Route::post('search-numbers', [TwilioController::class, 'searchNumbers']);
    Route::post('buy-number', [TwilioController::class, 'buyNumber']);
    Route::post('my-number', [TwilioController::class, 'getMyNumber']);
    Route::post('release-number', [TwilioController::class, 'releaseNumber']);
    Route::post('sms-inbox', [TwilioController::class, 'getSmsInbox']);
    Route::post('latest-otp', [TwilioController::class, 'getLatestOtp']);
    Route::post('mark-read', [TwilioController::class, 'markSmsRead']);
});

// Admin Twilio Routes
Route::prefix('admin/twilio')->group(function () {
    Route::post('search-numbers', [TwilioController::class, 'searchNumbers']);
    Route::post('buy-number', [TwilioController::class, 'adminBuyNumberForSeller']);
    Route::post('seller-number', [TwilioController::class, 'getMyNumber']);
    Route::post('release-number', [TwilioController::class, 'adminReleaseNumber']);
    Route::post('sms-inbox', [TwilioController::class, 'adminGetSmsInbox']);
    Route::post('all-numbers', [TwilioController::class, 'adminGetAllNumbers']);
    Route::post('usage-summary', [TwilioController::class, 'adminGetUsageSummary']);
});

// Twilio Webhook (NO AUTH - called by Twilio)
Route::post('webhook/twilio/sms', [TwilioController::class, 'webhookReceiveSms']);
```

## Config (config/services.php)

```php
<?php
// Add to config/services.php

'twilio' => [
    'sid' => env('TWILIO_ACCOUNT_SID'),
    'token' => env('TWILIO_AUTH_TOKEN'),
    'webhook_url' => env('TWILIO_WEBHOOK_URL'),
],
```

## Twilio Webhook Configuration

After deploying, configure your Twilio webhook:

1. Go to: https://console.twilio.com/us1/develop/phone-numbers/manage/incoming
2. Click on each phone number you provision
3. Set the **SMS & MMS > A MESSAGE COMES IN** webhook to:
   ```
   https://stageshipperapi.thedelivio.com/api/webhook/twilio/sms
   ```
4. Method: **HTTP POST**

**Note:** The webhook is automatically set when buying a number via `smsUrl` parameter.

## Testing

### Test Search Numbers
```bash
curl -X POST https://stageshipperapi.thedelivio.com/api/seller/twilio/search-numbers \
  -H "Content-Type: application/json" \
  -d '{"wh_account_id": "123", "area_code": "415", "limit": 5}'
```

### Test Buy Number
```bash
curl -X POST https://stageshipperapi.thedelivio.com/api/seller/twilio/buy-number \
  -H "Content-Type: application/json" \
  -d '{"wh_account_id": "123", "phone_number": "+14155551234"}'
```

### Test Webhook (simulate incoming SMS)
```bash
curl -X POST https://stageshipperapi.thedelivio.com/api/webhook/twilio/sms \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "MessageSid=test123&From=+14155556789&To=+14155551234&Body=Your verification code is 123456"
```

## Cost Tracking for Future Billing

The `twilio_numbers` table includes a `monthly_cost` column. You can:

1. Run a monthly cron job to calculate total costs per user
2. Create an invoice or charge based on the accumulated costs
3. Track SMS message counts for per-message billing if needed

Example monthly billing query:
```sql
SELECT
    wh_account_id,
    COUNT(*) as number_count,
    SUM(monthly_cost) as total_monthly_cost,
    (SELECT COUNT(*) FROM twilio_sms_messages WHERE twilio_sms_messages.wh_account_id = twilio_numbers.wh_account_id) as message_count
FROM twilio_numbers
GROUP BY wh_account_id;
```
