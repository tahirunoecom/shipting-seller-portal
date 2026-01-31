<?php
// app/Helpers/WhatsAppHelper.php (or wherever you keep helpers)
namespace App\Helpers;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;

class WhatsAppHelper
{
    private $phone_number_id;
    private $access_token;
    private $api_version = 'v18.0';
    
    public function __construct($phone_number_id = null, $access_token = null)
    {
        $this->phone_number_id = $phone_number_id ?? env('WHATSAPP_PHONE_NUMBER_ID');
        $this->access_token = $access_token ?? env('WHATSAPP_ACCESS_TOKEN');
    }
    
	    /**
     * Static factory method - create instance from wh_account_id
     */
    public static function forSeller($wh_account_id)
    {
        // Fetch config from your seller_whatsapp_config table
        $config = \DB::table('seller_whatsapp_config')
            ->where('wh_account_id', $wh_account_id)
            ->where('is_connected', 1)
            ->first();
        
        if (!$config) {
            Log::warning('[WHATSAPP] No config found for wh_account_id: ' . $wh_account_id);
            // Fall back to default env credentials
            return new self();
        }
        
        Log::info('[WHATSAPP] Using seller config', [
            'wh_account_id' => $wh_account_id,
            'phone_number_id' => $config->phone_number_id
        ]);
        
        return new self($config->phone_number_id, $config->access_token);
    }
	
    /**
     * Send a simple text message
     */
    public function sendTextMessage($to_phone, $message)
    {
        $phone = $this->formatPhone($to_phone);
        
        $payload = [
            'messaging_product' => 'whatsapp',
            'recipient_type' => 'individual',
            'to' => $phone,
            'type' => 'text',
            'text' => [
                'preview_url' => false,
                'body' => $message
            ]
        ];
        
        return $this->sendRequest($payload);
    }
    
    /**
     * Send message with interactive buttons (max 3 buttons)
     */
    public function sendButtonMessage($to_phone, $message, $buttons = [])
    {
        $phone = $this->formatPhone($to_phone);
        
        // Format buttons for WhatsApp API
        $formatted_buttons = [];
        foreach (array_slice($buttons, 0, 3) as $btn) {  // Max 3 buttons
            $formatted_buttons[] = [
                'type' => 'reply',
                'reply' => [
                    'id' => $btn['id'],
                    'title' => substr($btn['title'], 0, 20)  // Max 20 chars
                ]
            ];
        }
        
        $payload = [
            'messaging_product' => 'whatsapp',
            'recipient_type' => 'individual',
            'to' => $phone,
            'type' => 'interactive',
            'interactive' => [
                'type' => 'button',
                'body' => [
                    'text' => $message
                ],
                'action' => [
                    'buttons' => $formatted_buttons
                ]
            ]
        ];
        
        return $this->sendRequest($payload);
    }
    
    /**
     * Send order status update with tracking button
     */
    public function sendOrderStatusUpdate($to_phone, $order_id, $status_title, $status_message, $include_track_button = true)
    {
        $phone = $this->formatPhone($to_phone);
        
        $full_message = "📦 *{$status_title}*\n\n"
                      . "Order: #{$order_id}\n"
                      . "{$status_message}";
        
        if ($include_track_button) {
            return $this->sendButtonMessage($phone, $full_message, [
                ['id' => 'track_order', 'title' => '📍 Track Order'],
                ['id' => 'continue_shopping', 'title' => '🛍️ Shop More']
            ]);
        } else {
            return $this->sendTextMessage($phone, $full_message);
        }
    }
    
    /**
     * Format phone number for WhatsApp API
     */
    private function formatPhone($phone)
	{
		// Remove all non-numeric characters
		$clean = preg_replace('/[^0-9]/', '', $phone);
		
		// If starts with 0, remove it
		if (str_starts_with($clean, '0')) {
			$clean = substr($clean, 1);
		}
		
		// Fix double country code issue
		// If number starts with 1 followed by 91 (India), remove the 1
		if (str_starts_with($clean, '191') && strlen($clean) > 12) {
			$clean = substr($clean, 1);  // Remove leading 1
		}
		
		// If number starts with 1 followed by another 1, it's likely wrong
		if (str_starts_with($clean, '11')) {
			$clean = substr($clean, 1);  // Remove one 1
		}
		
		\Log::info('[WHATSAPP] Phone formatted', ['original' => $phone, 'clean' => $clean]);
		
		return $clean;
	}

    
    /**
     * Send request to WhatsApp API
     */
    private function sendRequest($payload)
    {
        try {
            $url = "https://graph.facebook.com/{$this->api_version}/{$this->phone_number_id}/messages";
            
            $ch = curl_init($url);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Authorization: Bearer ' . $this->access_token,
                'Content-Type: application/json'
            ]);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 30);
            
            $response = curl_exec($ch);
            $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            
            $result = json_decode($response, true);
            
            if ($http_code == 200 && isset($result['messages'])) {
                \Log::info('[WHATSAPP] ✅ Message sent', [
                    'to' => $payload['to'],
                    'message_id' => $result['messages'][0]['id'] ?? 'unknown'
                ]);
                return ['success' => true, 'message_id' => $result['messages'][0]['id'] ?? null];
            } else {
                \Log::error('[WHATSAPP] ❌ Failed to send', [
                    'to' => $payload['to'],
                    'http_code' => $http_code,
                    'response' => $result
                ]);
                return ['success' => false, 'error' => $result];
            }
            
        } catch (\Exception $e) {
            \Log::error('[WHATSAPP] Exception', ['error' => $e->getMessage()]);
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }
}
