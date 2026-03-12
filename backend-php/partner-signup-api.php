<?php
/**
 * Partner Signup API Handler
 * This file handles OTP sending, verification, and partner signup
 *
 * Required packages:
 * - Twilio PHP SDK: composer require twilio/sdk
 * - PHPMailer or use ElasticEmail API
 *
 * Environment variables needed:
 * - TWILIO_ACCOUNT_SID
 * - TWILIO_AUTH_TOKEN
 * - TWILIO_PHONE_NUMBER
 * - ELASTICEMAIL_API_KEY
 * - ADMIN_EMAIL
 * - DB_HOST, DB_NAME, DB_USER, DB_PASS
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/vendor/autoload.php'; // Composer autoload

use Twilio\Rest\Client as TwilioClient;

class PartnerSignupAPI {
    private $db;
    private $twilio;

    public function __construct() {
        $this->connectDatabase();
        $this->initTwilio();
    }

    private function connectDatabase() {
        try {
            $this->db = new PDO(
                "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME,
                DB_USER,
                DB_PASS,
                [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
            );
        } catch (PDOException $e) {
            $this->sendError('Database connection failed');
            exit;
        }
    }

    private function initTwilio() {
        $this->twilio = new TwilioClient(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    }

    public function handleRequest() {
        $uri = $_SERVER['REQUEST_URI'];

        if (strpos($uri, '/api/send-otp') !== false) {
            $this->sendOTP();
        } elseif (strpos($uri, '/api/verify-otp') !== false) {
            $this->verifyOTP();
        } elseif (strpos($uri, '/api/partner-signup') !== false) {
            $this->partnerSignup();
        } else {
            $this->sendError('Invalid endpoint');
        }
    }

    private function sendOTP() {
        $data = json_decode(file_get_contents('php://input'), true);
        $phone = $this->sanitizePhone($data['phone'] ?? '');

        if (empty($phone)) {
            $this->sendError('Phone number is required');
            return;
        }

        // Generate 6-digit OTP
        $otp = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        // Store OTP in database with expiry (10 minutes)
        $stmt = $this->db->prepare("
            INSERT INTO otp_verifications (phone, otp, expires_at, created_at)
            VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE), NOW())
            ON DUPLICATE KEY UPDATE
                otp = VALUES(otp),
                expires_at = VALUES(expires_at),
                verified = 0
        ");
        $stmt->execute([$phone, password_hash($otp, PASSWORD_DEFAULT)]);

        // Send SMS via Twilio
        try {
            $message = $this->twilio->messages->create(
                $phone,
                [
                    'from' => TWILIO_PHONE_NUMBER,
                    'body' => "Your Shipting verification code is: $otp\n\nValid for 10 minutes.\n\nDo not share this code with anyone."
                ]
            );

            $this->sendSuccess([
                'message' => 'OTP sent successfully',
                'otp' => ENVIRONMENT === 'development' ? $otp : null // Only in dev mode
            ]);
        } catch (Exception $e) {
            error_log('Twilio Error: ' . $e->getMessage());
            $this->sendError('Failed to send OTP. Please check your phone number.');
        }
    }

    private function verifyOTP() {
        $data = json_decode(file_get_contents('php://input'), true);
        $phone = $this->sanitizePhone($data['phone'] ?? '');
        $otp = $data['otp'] ?? '';

        if (empty($phone) || empty($otp)) {
            $this->sendError('Phone and OTP are required');
            return;
        }

        // Check OTP in database
        $stmt = $this->db->prepare("
            SELECT otp, expires_at, verified
            FROM otp_verifications
            WHERE phone = ? AND expires_at > NOW()
            ORDER BY created_at DESC
            LIMIT 1
        ");
        $stmt->execute([$phone]);
        $record = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$record) {
            $this->sendError('OTP expired or not found');
            return;
        }

        if ($record['verified']) {
            $this->sendError('OTP already used');
            return;
        }

        if (!password_verify($otp, $record['otp'])) {
            $this->sendError('Invalid OTP');
            return;
        }

        // Mark as verified
        $stmt = $this->db->prepare("
            UPDATE otp_verifications
            SET verified = 1
            WHERE phone = ? AND verified = 0
        ");
        $stmt->execute([$phone]);

        $this->sendSuccess(['message' => 'Phone verified successfully']);
    }

    private function partnerSignup() {
        $data = json_decode(file_get_contents('php://input'), true);

        // Validate required fields
        $required = ['businessType', 'businessName', 'phone', 'ownerName', 'email', 'deliveryTypes'];
        foreach ($required as $field) {
            if (empty($data[$field])) {
                $this->sendError("$field is required");
                return;
            }
        }

        $phone = $this->sanitizePhone($data['phone']);

        // Verify phone was verified
        $stmt = $this->db->prepare("
            SELECT verified
            FROM otp_verifications
            WHERE phone = ? AND verified = 1
            ORDER BY created_at DESC
            LIMIT 1
        ");
        $stmt->execute([$phone]);
        $verified = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$verified) {
            $this->sendError('Phone number not verified');
            return;
        }

        // Save to database
        try {
            $stmt = $this->db->prepare("
                INSERT INTO partner_signups (
                    business_type, business_name, phone, owner_name, email,
                    delivery_types, comments, status, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', NOW())
            ");

            $deliveryTypes = implode(',', $data['deliveryTypes']);

            $stmt->execute([
                $data['businessType'],
                $data['businessName'],
                $phone,
                $data['ownerName'],
                $data['email'],
                $deliveryTypes,
                $data['comments'] ?? ''
            ]);

            $signupId = $this->db->lastInsertId();

            // Send emails
            $this->sendAdminNotification($signupId, $data);
            $this->sendSellerConfirmation($data);

            $this->sendSuccess([
                'message' => 'Signup successful! Check your email for confirmation.',
                'id' => $signupId
            ]);

        } catch (PDOException $e) {
            error_log('Database Error: ' . $e->getMessage());
            $this->sendError('Signup failed. Please try again.');
        }
    }

    private function sendAdminNotification($signupId, $data) {
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
            <p><strong>Date:</strong> " . date('Y-m-d H:i:s') . "</p>

            <hr>
            <p><a href='" . BASE_URL . "/admin/partners/$signupId'>View in Dashboard</a></p>
        ";

        $this->sendEmail(ADMIN_EMAIL, 'admin@shipting.com', $subject, $body);
    }

    private function sendSellerConfirmation($data) {
        $subject = "Welcome to Shipting Partners! 🚀";

        $body = "
            <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;'>
                <div style='background: linear-gradient(135deg, #25D366 0%, #128C7E 100%); padding: 40px; text-align: center; color: white;'>
                    <h1>🎉 Welcome to Shipting!</h1>
                </div>

                <div style='padding: 40px; background: #f8f9fa;'>
                    <p>Hi {$data['ownerName']},</p>

                    <p>Thank you for signing up with <strong>Shipting Partners</strong>! We're excited to help transform <strong>{$data['businessName']}</strong> with our AI-powered WhatsApp ordering platform.</p>

                    <h3>What happens next?</h3>
                    <ol>
                        <li><strong>Team Review (24 hours)</strong> - Our team will review your application</li>
                        <li><strong>Onboarding Call</strong> - We'll schedule a 30-minute call to understand your needs</li>
                        <li><strong>Setup & Training (1-2 days)</strong> - We'll help you set up WhatsApp Business and integrate your catalog</li>
                        <li><strong>Go Live!</strong> - Start accepting orders through WhatsApp</li>
                    </ol>

                    <h3>Your Information</h3>
                    <ul style='list-style: none; padding: 0;'>
                        <li>📋 <strong>Business:</strong> {$data['businessName']} ({$data['businessType']})</li>
                        <li>📧 <strong>Email:</strong> {$data['email']}</li>
                        <li>📱 <strong>Phone:</strong> {$data['phone']}</li>
                    </ul>

                    <div style='background: white; padding: 20px; border-radius: 10px; margin: 30px 0;'>
                        <h3 style='color: #25D366;'>💡 Pro Tip</h3>
                        <p>While we're setting things up, start thinking about:
                        <ul>
                            <li>Your menu/catalog items</li>
                            <li>Product images (square format works best)</li>
                            <li>Delivery zones and fees</li>
                            <li>Special offers for launch week</li>
                        </ul>
                        </p>
                    </div>

                    <div style='text-align: center; margin: 30px 0;'>
                        <a href='https://partners.shipting.com/getting-started' style='background: #25D366; color: white; padding: 15px 30px; text-decoration: none; border-radius: 10px; display: inline-block; font-weight: bold;'>
                            📚 View Getting Started Guide
                        </a>
                    </div>

                    <p>Questions? Reply to this email or call us at <strong>+1 (555) 123-4567</strong></p>

                    <p>Looking forward to working with you!</p>

                    <p><strong>The Shipting Team</strong><br>
                    <a href='https://www.shipting.com'>www.shipting.com</a></p>
                </div>

                <div style='padding: 20px; text-align: center; font-size: 12px; color: #666;'>
                    <p>&copy; 2026 Shipting. All rights reserved.</p>
                </div>
            </div>
        ";

        $this->sendEmail($data['email'], 'partners@shipting.com', $subject, $body);
    }

    private function sendEmail($to, $from, $subject, $body) {
        // Using ElasticEmail API
        $url = 'https://api.elasticemail.com/v2/email/send';

        $data = [
            'apikey' => ELASTICEMAIL_API_KEY,
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
        curl_close($ch);

        error_log("Email sent to $to: " . $response);
    }

    private function sanitizePhone($phone) {
        // Remove all non-numeric characters except +
        return preg_replace('/[^0-9+]/', '', $phone);
    }

    private function sendSuccess($data) {
        echo json_encode(array_merge(['success' => true], $data));
        exit;
    }

    private function sendError($message) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => $message]);
        exit;
    }
}

// Handle request
$api = new PartnerSignupAPI();
$api->handleRequest();
