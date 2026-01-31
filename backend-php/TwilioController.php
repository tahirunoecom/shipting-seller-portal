<?php
namespace App\Http\Controllers\Api\Seller;

use App\Http\Controllers\Controller;
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
                // FIX: capabilities is an object, not an array
                // Access properties using -> instead of ['']
                $capabilities = $number->capabilities;

                $result[] = [
                    'phone_number' => $number->phoneNumber,
                    'friendly_name' => $number->friendlyName,
                    'locality' => $number->locality,
                    'region' => $number->region,
                    'postal_code' => $number->postalCode,
                    'capabilities' => [
                        'sms' => $capabilities->sms ?? false,
                        'voice' => $capabilities->voice ?? false,
                        'mms' => $capabilities->mms ?? false,
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
                'twilio_sid' => $purchased->sid,
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
                    'sid' => $number->twilio_sid,
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
            $this->twilio->incomingPhoneNumbers($number->twilio_sid)->delete();

            // Delete from database
            DB::table('twilio_numbers')
                ->where('wh_account_id', $wh_account_id)
                ->delete();

            // Also delete SMS messages for this number
            DB::table('twilio_sms_messages')
                ->where('twilio_number_id', $number->id)
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

        // First get the user's twilio number
        $twilioNumber = DB::table('twilio_numbers')
            ->where('wh_account_id', $wh_account_id)
            ->first();

        if (!$twilioNumber) {
            return response()->json([
                'status' => 0,
                'message' => 'No Twilio number found for this account'
            ]);
        }

        $messages = DB::table('twilio_sms_messages')
            ->where('twilio_number_id', $twilioNumber->id)
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

        // First get the user's twilio number
        $twilioNumber = DB::table('twilio_numbers')
            ->where('wh_account_id', $wh_account_id)
            ->first();

        if (!$twilioNumber) {
            return response()->json([
                'status' => 0,
                'message' => 'No Twilio number found for this account'
            ]);
        }

        // Get latest message with extracted OTP
        $message = DB::table('twilio_sms_messages')
            ->where('twilio_number_id', $twilioNumber->id)
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
            ->where('twilio_number_id', $twilioNumber->id)
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

    /**
     * Mark SMS as read
     * POST /seller/twilio/mark-read
     */
    public function markSmsRead(Request $request)
    {
        $message_id = $request->message_id;

        if (!$message_id) {
            return response()->json([
                'status' => 0,
                'message' => 'Message ID is required'
            ]);
        }

        DB::table('twilio_sms_messages')
            ->where('id', $message_id)
            ->update(['is_read' => true, 'updated_at' => now()]);

        return response()->json([
            'status' => 1,
            'message' => 'Message marked as read'
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
            'twilio_number_id' => $numberRecord->id,
            'from_number' => $from,
            'to_number' => $to,
            'body' => $body,
            'twilio_message_sid' => $messageSid,
            'extracted_otp' => $extractedOtp,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        Log::info('SMS saved for twilio_number_id: ' . $numberRecord->id);

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
            ->leftJoin('wh_warehouse_user AS u', 'u.id', '=', 't.wh_account_id')
            ->select(
                't.*',
                'u.email',
                'u.firstname',
                'u.lastname'
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
        // Add admin authentication check here if needed
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
            // Get our database stats
            $totalNumbers = DB::table('twilio_numbers')->count();
            $totalMonthlyCost = DB::table('twilio_numbers')->sum('monthly_cost');
            $totalMessages = DB::table('twilio_sms_messages')->count();

            // Try to get Twilio usage (may fail if no permissions)
            $twilioUsage = null;
            try {
                $usage = $this->twilio->usage->records
                    ->read(['category' => 'phonenumbers'], 1);
                $twilioUsage = $usage[0] ?? null;
            } catch (\Exception $e) {
                Log::warning('Could not fetch Twilio usage: ' . $e->getMessage());
            }

            return response()->json([
                'status' => 1,
                'message' => 'Usage summary',
                'data' => [
                    'total_numbers' => $totalNumbers,
                    'total_monthly_cost' => $totalMonthlyCost,
                    'total_messages_received' => $totalMessages,
                    'twilio_usage' => $twilioUsage,
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
