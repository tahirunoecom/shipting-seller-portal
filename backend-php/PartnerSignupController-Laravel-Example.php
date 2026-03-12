<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Validator;
use Twilio\Rest\Client as TwilioClient;

/**
 * Laravel Controller Example for Partner Signup
 *
 * Installation:
 * 1. composer require twilio/sdk
 * 2. Add Twilio credentials to .env:
 *    TWILIO_ACCOUNT_SID=your_sid
 *    TWILIO_AUTH_TOKEN=your_token
 *    TWILIO_PHONE_NUMBER=your_number
 *    ELASTICEMAIL_API_KEY=your_key
 * 3. Run migrations (create migration from database-migration.sql)
 * 4. Add routes to routes/api.php
 */
class PartnerSignupController extends Controller
{
    private $twilio;

    public function __construct()
    {
        $this->twilio = new TwilioClient(
            config('services.twilio.sid'),
            config('services.twilio.token')
        );
    }

    /**
     * Send OTP to phone number
     *
     * POST /api/send-otp
     * Body: { "phone": "+1234567890" }
     */
    public function sendOTP(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'phone' => 'required|string|regex:/^\+?[0-9\s\-\(\)]+$/',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid phone number format',
                'errors' => $validator->errors()
            ], 400);
        }

        $phone = $this->sanitizePhone($request->phone);
        $otp = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        try {
            // Store OTP in database
            DB::table('otp_verifications')->updateOrInsert(
                ['phone' => $phone],
                [
                    'otp' => Hash::make($otp),
                    'expires_at' => now()->addMinutes(10),
                    'verified' => false,
                    'created_at' => now()
                ]
            );

            // Send SMS via Twilio
            $message = $this->twilio->messages->create(
                $phone,
                [
                    'from' => config('services.twilio.phone'),
                    'body' => "Your Shipting verification code is: $otp\n\nValid for 10 minutes.\n\nDo not share this code with anyone."
                ]
            );

            // Log SMS
            DB::table('sms_logs')->insert([
                'to_phone' => $phone,
                'message' => "OTP: $otp",
                'status' => 'sent',
                'provider' => 'twilio',
                'provider_message_id' => $message->sid,
                'sent_at' => now()
            ]);

            return response()->json([
                'success' => true,
                'message' => 'OTP sent successfully',
                'otp' => app()->environment('local') ? $otp : null // Only in dev
            ]);

        } catch (\Exception $e) {
            \Log::error('OTP Send Error: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to send OTP. Please check your phone number.'
            ], 500);
        }
    }

    /**
     * Verify OTP code
     *
     * POST /api/verify-otp
     * Body: { "phone": "+1234567890", "otp": "123456" }
     */
    public function verifyOTP(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'phone' => 'required|string',
            'otp' => 'required|string|size:6',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid input',
                'errors' => $validator->errors()
            ], 400);
        }

        $phone = $this->sanitizePhone($request->phone);
        $otp = $request->otp;

        // Find OTP record
        $record = DB::table('otp_verifications')
            ->where('phone', $phone)
            ->where('expires_at', '>', now())
            ->where('verified', false)
            ->orderBy('created_at', 'desc')
            ->first();

        if (!$record) {
            return response()->json([
                'success' => false,
                'message' => 'OTP expired or not found'
            ], 400);
        }

        if (!Hash::check($otp, $record->otp)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid OTP'
            ], 400);
        }

        // Mark as verified
        DB::table('otp_verifications')
            ->where('phone', $phone)
            ->update(['verified' => true]);

        return response()->json([
            'success' => true,
            'message' => 'Phone verified successfully'
        ]);
    }

    /**
     * Partner signup
     *
     * POST /api/partner-signup
     * Body: {
     *   "businessType": "restaurant",
     *   "businessName": "Joe's Pizza",
     *   "phone": "+1234567890",
     *   "ownerName": "Joe Smith",
     *   "email": "joe@example.com",
     *   "deliveryTypes": ["self-delivery", "uber-eats"],
     *   "comments": "Looking forward to partnering"
     * }
     */
    public function signup(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'businessType' => 'required|string',
            'businessName' => 'required|string|max:255',
            'phone' => 'required|string',
            'ownerName' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'deliveryTypes' => 'required|array|min:1',
            'comments' => 'nullable|string'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 400);
        }

        $phone = $this->sanitizePhone($request->phone);

        // Verify phone was verified
        $verified = DB::table('otp_verifications')
            ->where('phone', $phone)
            ->where('verified', true)
            ->exists();

        if (!$verified) {
            return response()->json([
                'success' => false,
                'message' => 'Phone number not verified'
            ], 400);
        }

        try {
            // Save to database
            $signupId = DB::table('partner_signups')->insertGetId([
                'business_type' => $request->businessType,
                'business_name' => $request->businessName,
                'phone' => $phone,
                'owner_name' => $request->ownerName,
                'email' => $request->email,
                'delivery_types' => implode(',', $request->deliveryTypes),
                'comments' => $request->comments ?? '',
                'status' => 'pending',
                'created_at' => now()
            ]);

            // Send emails
            $this->sendAdminNotification($signupId, $request->all());
            $this->sendSellerConfirmation($request->all());

            return response()->json([
                'success' => true,
                'message' => 'Signup successful! Check your email for confirmation.',
                'id' => $signupId
            ]);

        } catch (\Exception $e) {
            \Log::error('Signup Error: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Signup failed. Please try again.'
            ], 500);
        }
    }

    /**
     * Send admin notification email
     */
    private function sendAdminNotification($signupId, $data)
    {
        $subject = "🎉 New Partner Signup: {$data['businessName']}";
        $deliveryTypes = implode(', ', $data['deliveryTypes']);

        $body = "
            <h2>New Partner Signup!</h2>
            <p><strong>Signup ID:</strong> $signupId</p>
            <p><strong>Business Name:</strong> {$data['businessName']}</p>
            <p><strong>Business Type:</strong> {$data['businessType']}</p>
            <p><strong>Owner Name:</strong> {$data['ownerName']}</p>
            <p><strong>Email:</strong> {$data['email']}</p>
            <p><strong>Phone:</strong> {$data['phone']}</p>
            <p><strong>Delivery Types:</strong> $deliveryTypes</p>
            <p><strong>Comments:</strong> {$data['comments']}</p>
            <p><strong>Date:</strong> " . now()->toDateTimeString() . "</p>
        ";

        $this->sendEmail(
            config('mail.admin_email'),
            'admin@shipting.com',
            $subject,
            $body
        );
    }

    /**
     * Send seller confirmation email
     */
    private function sendSellerConfirmation($data)
    {
        $subject = "Welcome to Shipting Partners! 🚀";

        $body = view('emails.partner-welcome', compact('data'))->render();

        $this->sendEmail(
            $data['email'],
            'partners@shipting.com',
            $subject,
            $body
        );
    }

    /**
     * Send email via ElasticEmail API
     */
    private function sendEmail($to, $from, $subject, $body)
    {
        $url = 'https://api.elasticemail.com/v2/email/send';

        $data = [
            'apikey' => config('services.elasticemail.key'),
            'from' => $from,
            'fromName' => 'Shipting Partners',
            'to' => $to,
            'subject' => $subject,
            'bodyHtml' => $body,
            'isTransactional' => true
        ];

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($data));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        // Log email
        DB::table('email_logs')->insert([
            'to_email' => $to,
            'from_email' => $from,
            'subject' => $subject,
            'body' => $body,
            'status' => $httpCode == 200 ? 'sent' : 'failed',
            'response' => $response,
            'sent_at' => now()
        ]);

        \Log::info("Email sent to $to: HTTP $httpCode");
    }

    /**
     * Sanitize phone number
     */
    private function sanitizePhone($phone)
    {
        return preg_replace('/[^0-9+]/', '', $phone);
    }
}
