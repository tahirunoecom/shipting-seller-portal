<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;
use Stripe\Stripe;
use Stripe\Webhook;
use Exception;

class StripeWebhookController extends Controller
{
    /**
     * Handle payment status page (browser redirect after Stripe payment)
     * Route: GET /api/bot-payment-status?session_id=xxx&status=success
     */
    public function handlePaymentStatus(Request $request)
    {
        $session_id = $request->query('session_id');
        $status = $request->query('status', 'success');

        $whatsapp_number = null;
        $store_name = 'Store';

        if ($session_id) {
            try {
                Stripe::setApiKey(env('STRIPE_SECRET_KEY'));

                // Retrieve the Stripe session to get store_id from metadata
                $session = \Stripe\Checkout\Session::retrieve($session_id);
                $store_id = $session->metadata->store_id ?? null;

                Log::info('[BOT-PAYMENT] Session retrieved', [
                    'session_id' => $session_id,
                    'store_id' => $store_id,
                    'payment_status' => $session->payment_status
                ]);

                if ($store_id) {
                    // Look up WhatsApp config for this store
                    $config = \DB::table('seller_whatsapp_config')
                        ->where('wh_account_id', $store_id)
                        ->where('is_connected', 1)
                        ->first();

                    if ($config) {
                        // Remove + from phone number for wa.me link
                        $whatsapp_number = ltrim($config->display_phone_number, '+');
                        $store_name = $config->business_name ?? $config->verified_name ?? 'Store';

                        Log::info('[BOT-PAYMENT] WhatsApp config found', [
                            'store_id' => $store_id,
                            'whatsapp_number' => $whatsapp_number,
                            'store_name' => $store_name
                        ]);
                    }
                }
            } catch (Exception $e) {
                Log::error('[BOT-PAYMENT] Error retrieving session', [
                    'session_id' => $session_id,
                    'error' => $e->getMessage()
                ]);
            }
        }

        // Choose view based on status
        $view = ($status === 'success') ? 'payment-success' : 'payment-cancelled';

        return view($view, [
            'whatsapp_number' => $whatsapp_number,
            'store_name' => $store_name,
            'session_id' => $session_id
        ]);
    }

    public function handleWebhook(Request $request)
    {
        Stripe::setApiKey(env('STRIPE_SECRET_KEY'));
        $endpoint_secret = env('STRIPE_WEBHOOK_SECRET');
        
        $payload = $request->getContent();
        $sig_header = $request->header('Stripe-Signature');
        
        Log::info('[STRIPE WEBHOOK] Received webhook', ['payload_length' => strlen($payload)]);
        
        try {
            $event = Webhook::constructEvent($payload, $sig_header, $endpoint_secret);
            Log::info('[STRIPE WEBHOOK] Event verified', ['type' => $event->type, 'id' => $event->id]);
            
            switch ($event->type) {
                // Customer payment events (existing)
                case 'checkout.session.completed':
                    $this->handleCheckoutSessionCompleted($event->data->object);
                    break;
                case 'payment_intent.succeeded':
                    $this->handlePaymentIntentSucceeded($event->data->object);
                    break;
                case 'payment_intent.payment_failed':
                    $this->handlePaymentIntentFailed($event->data->object);
                    break;

                // ✅ NEW: Stripe Connect events
                case 'account.updated':
                    $this->handleAccountUpdated($event->data->object);
                    break;
                case 'account.application.authorized':
                    $this->handleAccountAuthorized($event->data->object);
                    break;
                case 'account.application.deauthorized':
                    $this->handleAccountDeauthorized($event->data->object);
                    break;
                case 'payout.created':
                case 'payout.updated':
                    $this->handlePayoutCreated($event->data->object);
                    break;
                case 'payout.paid':
                    $this->handlePayoutPaid($event->data->object);
                    break;
                case 'payout.failed':
                case 'payout.canceled':
                    $this->handlePayoutFailed($event->data->object);
                    break;
                case 'transfer.created':
                    $this->handleTransferCreated($event->data->object);
                    break;
                case 'transfer.updated':
                    $this->handleTransferUpdated($event->data->object);
                    break;
                case 'transfer.reversed':
                    $this->handleTransferReversed($event->data->object);
                    break;
                case 'charge.refunded':
                    $this->handleChargeRefunded($event->data->object);
                    break;

                default:
                    Log::info('[STRIPE WEBHOOK] Unhandled event type', ['type' => $event->type]);
            }
            
            return response()->json(['status' => 'success'], 200);
            
        } catch (\UnexpectedValueException $e) {
            Log::error('[STRIPE WEBHOOK] Invalid payload', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Invalid payload'], 400);
        } catch (\Stripe\Exception\SignatureVerificationException $e) {
            Log::error('[STRIPE WEBHOOK] Invalid signature', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Invalid signature'], 400);
        }
    }
    
	private function handleCheckoutSessionCompleted($session)
	{
		Log::info('[STRIPE] ========== CHECKOUT SESSION COMPLETED ==========');
		Log::info('[STRIPE] Session ID: ' . $session->id);
		
		// ✅ ADD THIS DEBUG LOG
		Log::info('[STRIPE] Full metadata debug', [
			'metadata_object' => $session->metadata,
			'metadata_json' => json_encode($session->metadata),
			'has_whatsapp' => isset($session->metadata->whatsapp_number),
			'whatsapp_value' => $session->metadata->whatsapp_number ?? 'NULL'
		]);
		
		$user_id = $session->metadata->user_id ?? null;
		$channel = $session->metadata->channel ?? 'website';
		$whatsapp_number = $session->metadata->whatsapp_number ?? null;
		$store_id = $session->metadata->store_id ?? null;  
		$wh_account_id = $session->metadata->wh_account_id ?? null; 
		
		if (!$user_id) {
			Log::error('[STRIPE] No user_id in metadata');
			return;
		}
		
		Log::info('[STRIPE] Metadata', [
			'user_id' => $user_id,
			'channel' => $channel,
			'whatsapp_number' => $whatsapp_number,
			'store_id' => $store_id,  // ✅ LOG IT
			'wh_account_id' => $wh_account_id
		]);
		
		// Get user details
		$user = $this->getUserDetails($user_id);
		
		if (!$user) {
			Log::error('[STRIPE] Failed to fetch user details', ['user_id' => $user_id]);
			return;
		}
		
		Log::info('[STRIPE] User found', [
			'name' => $user['name'],
			'email' => $user['email'],
			'phone' => $user['phone']
		]);
		
		// Get cart and address (pass store_id for multi-tenant filtering)
		$cart = $this->getCartData($user_id, $store_id);
		if (!$cart) {
			Log::error('[STRIPE] Failed to fetch cart', ['user_id' => $user_id, 'store_id' => $store_id]);
			return;
		}
		
		$address = $this->getAddress($user_id);
		if (!$address) {
			Log::warning('[STRIPE] No address found');
			$address = [
				'name' => $user['name'],
				'phone' => $whatsapp_number ?? $user['phone'],
				'email' => $user['email'],
				'address' => 'N/A',
				'city' => 'N/A',
				'state' => 'N/A',
				'country' => 'United States',
				'zip' => '00000',
				'address_id' => 0
			];
		}
		
		Log::info('[STRIPE] Address phone: ' . ($address['phone'] ?? 'NULL'));
		
		// Prepare order data
		$order_data = [
			'user_id' => $user_id,
			'name' => $address['name'],
			'email' => $address['email'] ?? $user['email'],
			'phone' => $whatsapp_number ?? $address['phone'],
			'address' => $address['address'],
			'city' => $address['city'],
			'state' => $address['state'],
			'country' => $address['country'],
			'zip_code' => $address['zip'],
			'customer_address_id' => $address['address_id'],
			'total_payable_amount' => $session->amount_total / 100,
			'payment_id' => $session->payment_intent,
			'payment_status' => 1,
			'payment_method' => 'stripe',
			'coupon_id' => $cart['coupon_id'] ?? null,
			'discounted_amount_after_coupon' => $cart['orderMetaData']['total'] ?? 0,
			'orderMetaData' => $cart['orderMetaData'] ?? [],
			'reference' => 1
		];
		
		Log::info('[STRIPE] Creating order');
		
		$order_response = $this->createOrder($order_data);
		
		if ($order_response && isset($order_response['status']) && $order_response['status'] == 1) {
			$order_id = $order_response['data']['order_id'] ?? $order_response['order_id'] ?? null;
			
			Log::info('[STRIPE] ✅ Order created successfully', ['order_id' => $order_id]);
			
			// ✅ IMPROVED: Send WhatsApp with better error handling
			//if ($channel === 'whatsapp') {
			if ($channel === 'whatsapp' || $channel === 'whatsapp_native_cart') {

				$profile_phone = $user['phone'] ?? $address['phone'] ?? null;
				
				Log::info('[STRIPE] Phone numbers available', [
					'whatsapp_from_metadata' => $whatsapp_number ?? 'NULL',
					'profile_phone' => $profile_phone ?? 'NULL'
				]);
				
				// Collect unique phone numbers
				$phones_to_notify = [];
				
				// Priority: WhatsApp number from chat
				if ($whatsapp_number && !empty($whatsapp_number)) {
					$phones_to_notify[] = $whatsapp_number;
					Log::info('[STRIPE] ✅ Using WhatsApp chat number', ['number' => $whatsapp_number]);
				} else {
					Log::warning('[STRIPE] ⚠️ No WhatsApp number in metadata, will use profile phone only');
				}
				
				// Add profile phone if different
				if ($profile_phone && $this->normalizePhone($profile_phone) !== $this->normalizePhone($whatsapp_number)) {
					$phones_to_notify[] = $profile_phone;
					Log::info('[STRIPE] ✅ Adding profile phone', ['number' => $profile_phone]);
				}
				
				// If we have no numbers at all, log error
				if (empty($phones_to_notify)) {
					Log::error('[STRIPE] ❌ No phone numbers available to send WhatsApp!');
				} else {
					// Remove duplicates
					$phones_to_notify = array_unique($phones_to_notify);
					
					Log::info('[STRIPE] 📤 Final phones to notify', [
						'count' => count($phones_to_notify),
						'numbers' => $phones_to_notify
					]);
					
					foreach ($phones_to_notify as $phone) {
						Log::info('[STRIPE] Sending WhatsApp to: ' . $phone);
						$this->sendWhatsAppConfirmation($phone, $order_id, $session->amount_total / 100, $store_id,$wh_account_id);
						sleep(1); // Small delay between messages
					}
				}
			} else {
				Log::warning('[STRIPE] WhatsApp not sent - channel is: ' . $channel);
			}
		} else {
			Log::error('[STRIPE] ❌ Order creation failed');
		}
		
		Log::info('[STRIPE] ========== END CHECKOUT SESSION ==========');
	}

	/**
	 * Normalize phone number for comparison
	 */
	private function normalizePhone($phone)
	{
		if (!$phone) return '';
		
		// Remove all non-numeric characters except +
		$clean = preg_replace('/[^0-9+]/', '', $phone);
		
		// Remove leading + for comparison
		return ltrim($clean, '+');
	}
    
    private function handlePaymentIntentSucceeded($paymentIntent)
    {
        Log::info('[STRIPE] Payment intent succeeded', ['payment_intent' => $paymentIntent->id]);
    }
    
    private function handlePaymentIntentFailed($paymentIntent)
    {
        Log::error('[STRIPE] Payment intent failed', [
            'payment_intent' => $paymentIntent->id,
            'failure_message' => $paymentIntent->last_payment_error->message ?? 'Unknown'
        ]);
    }
    
    private function getUserDetails($user_id)
    {
        try {
            // ✅ FIXED: Correct endpoint
            $api_url = env('API_BASE') . '/view-customer-profile';
            
            Log::info('[STRIPE] Calling getUserDetails API', [
                'url' => $api_url,
                'user_id' => $user_id
            ]);
            
            $response = Http::timeout(10)->post($api_url, [
                'id' => $user_id
            ]);
            
            $data = $response->json();
            
            Log::info('[STRIPE] getUserDetails response', [
                'status_code' => $response->status(),
                'response' => $data
            ]);
            
            if (isset($data['status']) && $data['status'] == 1 && isset($data['data'])) {
                return [
                    'name' => $data['data']['name'] ?? 'Guest',
                    'email' => $data['data']['email'] ?? '',
                    'phone' => $data['data']['phone'] ?? '',
                    'country_code' => $data['data']['country_code'] ?? '+1',
                ];
            }
            
            Log::error('[STRIPE] getUserDetails failed - invalid response', ['response' => $data]);
            return null;
            
        } catch (Exception $e) {
            Log::error('[STRIPE] getUserDetails exception', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return null;
        }
    }
    
    private function getCartData($user_id, $store_id = null)
    {
        try {
            $payload = [
                'user_id' => $user_id,
                'coupon_id' => ''
            ];

            // Add shipper_id filter for multi-tenant support
            if ($store_id) {
                $payload['shipper_id'] = $store_id;
            }

            Log::info('[STRIPE] Fetching cart', ['user_id' => $user_id, 'store_id' => $store_id, 'payload' => $payload]);

            $response = Http::timeout(10)->post(env('API_BASE') . '/cart-list', $payload);

            $data = $response->json();

            Log::info('[STRIPE] Cart response', ['status' => $data['status'] ?? 'unknown', 'has_data' => isset($data['data'])]);

            if (isset($data['status']) && $data['status'] == 1 && isset($data['data'])) {
                return $data['data'];
            }

            return null;
        } catch (Exception $e) {
            Log::error('[STRIPE] Error fetching cart', ['error' => $e->getMessage(), 'store_id' => $store_id]);
            return null;
        }
    }
    
    private function getAddress($user_id)
    {
        try {
            $response = Http::timeout(10)->post(env('API_BASE') . '/getAddress', [
                'user_id' => $user_id,
                'shipper_id' => '',
                'address_id' => ''
            ]);
            
            $data = $response->json();
            
            if (isset($data['status']) && $data['status'] == 1 && isset($data['data']['addressList'])) {
                $addresses = $data['data']['addressList'];
                
                if (!empty($addresses) && is_array($addresses)) {
                    $addr = $addresses[0];
                    
                    return [
                        'name' => $addr['name'] ?? 'Guest',
                        'phone' => $addr['phone'] ?? '',
                        'email' => $addr['email'] ?? '',
                        'address' => $addr['address'] ?? '',
                        'city' => $addr['city'] ?? '',
                        'state' => $addr['state'] ?? '',
                        'country' => $addr['country_name'] ?? 'United States',
                        'zip' => $addr['zip'] ?? '',
                        'address_id' => $addr['address_id'] ?? 0
                    ];
                }
            }
            
            return null;
        } catch (Exception $e) {
            Log::error('[STRIPE] Error fetching address', ['error' => $e->getMessage()]);
            return null;
        }
    }
    
    private function createOrder($order_data)
    {
        try {
            Log::info('[STRIPE] Calling create-order API', ['url' => env('API_BASE') . '/create-order']);
            
            $response = Http::timeout(30)->post(env('API_BASE') . '/create-order', $order_data);
            
            $result = $response->json();
            
            Log::info('[STRIPE] Create-order response', ['response' => $result]);
            
            return $result;
        } catch (Exception $e) {
            Log::error('[STRIPE] Error creating order', ['error' => $e->getMessage()]);
            return null;
        }
    }
    
	/**
	 * Send WhatsApp confirmation using WhatsApp Business Cloud API (same as bot)
	 * Sends interactive buttons so user can take next action
	 */
	private function sendWhatsAppConfirmation($phone, $order_id, $total, $store_id = null , $wh_account_id = null)
	{
		try {
			Log::info('[WHATSAPP] Starting WhatsApp Business API send', [
				'phone' => $phone,
				'order_id' => $order_id,
				'total' => $total,
				'store_id' => $store_id,
				'wh_account_id' => $wh_account_id
			]);
			
			// ✅ Get store-specific WhatsApp credentials
			$whatsapp_config = $this->getStoreWhatsAppConfig($store_id,$wh_account_id);
			
			$phone_number_id = $whatsapp_config['phone_number_id'];
			$access_token = $whatsapp_config['access_token'];
			$store_name = $whatsapp_config['store_name'] ?? 'Store';
			
			Log::info('[WHATSAPP] Using credentials for store', [
				'store_id' => $store_id,
				'wh_account_id' => $wh_account_id,
				'store_name' => $store_name,
				'phone_number_id' => $phone_number_id,
				'has_token' => !empty($access_token)
			]);
			
			
			// WhatsApp Business API credentials (same as your bot)
			//$phone_number_id = env('WHATSAPP_PHONE_NUMBER_ID');
			//$access_token = env('WHATSAPP_ACCESS_TOKEN');
			
			 if (!$phone_number_id || !$access_token) {
				Log::error('[WHATSAPP] Missing WhatsApp credentials for store', ['store_id' => $store_id]);
				return;
			}
	 
			// Clean phone - just remove any non-numeric chars except +
			$clean_phone = preg_replace('/[^0-9]/', '', $phone);
			
			Log::info('[WHATSAPP] Phone number', [
				'original' => $phone,
				'clean' => $clean_phone
			]);
			
			$message_text = "✅ *Payment Successful!*\n\n"
						  . "🎉 Thank you for your payment!\n\n"
						  . "📦 Order: #{$order_id}\n"
						  . "💰 Amount: $" . number_format($total, 2) . " USD\n\n"
						  . "Your order is being processed.\n"
						  . "What would you like to do next?";
			
			
			// WhatsApp Business API payload with interactive buttons
			$payload = [
				'messaging_product' => 'whatsapp',
				'recipient_type' => 'individual',
				'to' => $clean_phone,
				'type' => 'interactive',
				'interactive' => [
					'type' => 'button',
					'body' => [
						'text' => $message_text
					],
					'action' => [
						'buttons' => [
							[
								'type' => 'reply',
								'reply' => [
									'id' => 'track_order',
									'title' => '📦 Track Order'
								]
							],
							[
								'type' => 'reply',
								'reply' => [
									'id' => 'continue_shopping',
									'title' => '🛍️ Shop More'
								]
							]
						]
					]
				]
			];
			
			$api_url = "https://graph.facebook.com/v18.0/{$phone_number_id}/messages";
        
			$response = Http::withHeaders([
				'Authorization' => 'Bearer ' . $access_token,
				'Content-Type' => 'application/json'
			])->post($api_url, $payload);
			
			$result = $response->json();
			
			if ($response->successful() && isset($result['messages'])) {
				Log::info('[WHATSAPP] ✅ Message sent successfully', [
					'message_id' => $result['messages'][0]['id'] ?? 'unknown',
					'phone' => $clean_phone,
					'order_id' => $order_id,
					'sent_from_store' => $store_name
				]);
			} else {
				Log::error('[WHATSAPP] ❌ API error', [
					'status' => $response->status(),
					'response' => $result,
					'phone' => $clean_phone,
					'store_id' => $store_id
				]);
			}
			
		} catch (Exception $e) {
			Log::error('[WHATSAPP] Failed to send message', [
				'error' => $e->getMessage(),
				'trace' => $e->getTraceAsString()
			]);
		}
	}
	
	private function getStoreWhatsAppConfig($store_id,$wh_account_id)
	{
		// Default fallback (Dear Delhi - for backwards compatibility)
		$default_config = [
			'phone_number_id' => env('WHATSAPP_PHONE_NUMBER_ID'),
			'access_token' => env('WHATSAPP_ACCESS_TOKEN'),
			'store_name' => 'Default Store'
		];
		
		if (!$store_id) {
			Log::warning('[WHATSAPP] No store_id provided, using default credentials');
			return $default_config;
		}
		
		try {
			// ✅ Call your API to get store's WhatsApp config
			$api_url = env('API_BASE') . '/whatsapp-config-by-store-id';
			
			Log::info('[WHATSAPP] Fetching store WhatsApp config', [
				'url' => $api_url,
				'store_id' => $store_id
			]);
			
			$response = Http::timeout(10)->post($api_url, [
				'wh_account_id' => $store_id
			]);
			
			$data = $response->json();
			
			if (isset($data['status']) && $data['status'] == 1 && isset($data['data'])) {
				$config = $data['data'];
				
				// Check if store has valid WhatsApp credentials
				if (!empty($config['access_token']) && !empty($config['phone_number_id'])) {
					Log::info('[WHATSAPP] ✅ Found store WhatsApp config', [
						'store_id' => $store_id,
						'store_name' => $config['business_name'] ?? 'Unknown',
						'phone_number_id' => $config['phone_number_id']
					]);
					
					return [
						'phone_number_id' => $config['phone_number_id'],
						'access_token' => $config['access_token'],
						'store_name' => $config['business_name'] ?? $config['verified_name'] ?? 'Store'
					];
				}
			}
			
			Log::warning('[WHATSAPP] Store config not found or incomplete, using default', [
				'store_id' => $store_id,
				'response' => $data
			]);
			
		} catch (Exception $e) {
			Log::error('[WHATSAPP] Error fetching store config', [
				'store_id' => $store_id,
				'error' => $e->getMessage()
			]);
		}
		
		return $default_config;
	}
	
	private function sendWhatsAppConfirmation_Twilio($phone, $order_id, $total)
	{
		try {
			Log::info('[TWILIO] Starting WhatsApp send', [
				'phone' => $phone,
				'order_id' => $order_id,
				'total' => $total
			]);
			
			$twilio_sid = env('TWILIO_ACCOUNT_SID');
			$twilio_token = env('TWILIO_AUTH_TOKEN');
			$twilio_whatsapp = env('TWILIO_WHATSAPP_NUMBER');
			
			if (!$twilio_sid || !$twilio_token || !$twilio_whatsapp) {
				Log::error('[TWILIO] Missing Twilio credentials in .env');
				return;
			}
			
			// ✅ Smart phone formatting
			$clean_phone = preg_replace('/[^0-9+]/', '', $phone);
			
			if (str_starts_with($clean_phone, '+')) {
				$formatted_phone = $clean_phone;
			} else if (str_starts_with($clean_phone, '91')) {
				$formatted_phone = '+' . $clean_phone;
			} else if (strlen($clean_phone) == 10) {
				$formatted_phone = '+91' . $clean_phone;
			} else {
				$formatted_phone = '+1' . $clean_phone;
			}
			
			Log::info('[TWILIO] Formatted phone', [
				'original' => $phone,
				'formatted' => $formatted_phone
			]);
			
			$message = "✅ *Payment Successful!*\n\n"
					 . "Order #{$order_id} confirmed\n"
					 . "Total: $" . number_format($total, 2) . "\n\n"
					 //. "Estimated delivery: 2-3 hours\n"
					 . "Track: https://stage.anythinginstantly.com/my-orders\n\n"
					 . "Thank you for shopping with AnythingInstantly! 🛍️";
			
			$client = new \Twilio\Rest\Client($twilio_sid, $twilio_token);
			
			$result = $client->messages->create(
				"whatsapp:{$formatted_phone}",
				[
					'from' => $twilio_whatsapp,
					'body' => $message
				]
			);
			
			Log::info('[TWILIO] ✅ WhatsApp message sent successfully', [
				'sid' => $result->sid,
				'status' => $result->status,
				'phone' => $formatted_phone,
				'order_id' => $order_id
			]);
			
		} catch (\Twilio\Exceptions\RestException $e) {
			Log::error('[TWILIO] Twilio API error', [
				'code' => $e->getCode(),
				'message' => $e->getMessage(),
				'status' => $e->getStatusCode(),
				'more_info' => $e->getMoreInfo()
			]);
		} catch (Exception $e) {
			Log::error('[TWILIO] Failed to send WhatsApp message', [
				'error' => $e->getMessage(),
				'trace' => $e->getTraceAsString()
			]);
		}
	}

    // ============================================
    // STRIPE CONNECT EVENT HANDLERS (NEW)
    // ============================================

    /**
     * Handle account.updated event - When seller completes onboarding
     */
    private function handleAccountUpdated($account)
    {
        Log::info('[STRIPE CONNECT] ========== ACCOUNT UPDATED ==========');
        Log::info('[STRIPE CONNECT] Account ID: ' . $account->id);

        try {
            // Find seller by Stripe account ID
            $seller = \DB::table('wh_warehouse_user')
                ->where('stripe_connect_id', $account->id)
                ->first();

            if (!$seller) {
                Log::warning('[STRIPE CONNECT] Seller not found for account', ['account_id' => $account->id]);
                return;
            }

            Log::info('[STRIPE CONNECT] Updating seller', [
                'wh_account_id' => $seller->id,
                'charges_enabled' => $account->charges_enabled,
                'payouts_enabled' => $account->payouts_enabled,
                'details_submitted' => $account->details_submitted
            ]);

            // Update seller status
            \DB::table('wh_warehouse_user')
                ->where('id', $seller->id)
                ->update([
                    'stripe_connect' => ($account->charges_enabled && $account->payouts_enabled) ? 1 : 0,
                    'stripe_onboarding_completed' => $account->details_submitted ? 1 : 0,
                    'stripe_charges_enabled' => $account->charges_enabled ? 1 : 0,
                    'stripe_payouts_enabled' => $account->payouts_enabled ? 1 : 0,
                    'stripe_details_submitted' => $account->details_submitted ? 1 : 0,
                    'stripe_currently_due' => json_encode($account->requirements->currently_due ?? []),
                    'stripe_last_sync' => now(),
                    'updated_at' => now()
                ]);

            // Update cache table
            \DB::table('stripe_connect_accounts')->updateOrInsert(
                ['wh_account_id' => $seller->id],
                [
                    'stripe_account_id' => $account->id,
                    'account_type' => $account->type,
                    'charges_enabled' => $account->charges_enabled,
                    'payouts_enabled' => $account->payouts_enabled,
                    'details_submitted' => $account->details_submitted,
                    'currently_due' => json_encode($account->requirements->currently_due ?? []),
                    'eventually_due' => json_encode($account->requirements->eventually_due ?? []),
                    'past_due' => json_encode($account->requirements->past_due ?? []),
                    'disabled_reason' => $account->requirements->disabled_reason ?? null,
                    'full_stripe_response' => json_encode($account),
                    'last_synced_at' => now(),
                    'updated_at' => now()
                ]
            );

            // Log webhook event
            \DB::table('stripe_webhook_logs')->insert([
                'event_id' => 'account.updated_' . time(),
                'event_type' => 'account.updated',
                'wh_account_id' => $seller->id,
                'stripe_connect_account_id' => $account->id,
                'payload' => json_encode($account),
                'processed' => 1,
                'processed_at' => now(),
                'created_at' => now(),
                'updated_at' => now()
            ]);

            Log::info('[STRIPE CONNECT] ✅ Account updated successfully');

        } catch (Exception $e) {
            Log::error('[STRIPE CONNECT] Error handling account.updated', [
                'error' => $e->getMessage(),
                'account_id' => $account->id
            ]);

            // Log error
            \DB::table('stripe_webhook_logs')->insert([
                'event_id' => 'account.updated_error_' . time(),
                'event_type' => 'account.updated',
                'stripe_connect_account_id' => $account->id,
                'payload' => json_encode($account),
                'processed' => 0,
                'error_message' => $e->getMessage(),
                'created_at' => now(),
                'updated_at' => now()
            ]);
        }

        Log::info('[STRIPE CONNECT] ========== END ACCOUNT UPDATED ==========');
    }

    /**
     * Handle account.application.authorized - When account is first created
     */
    private function handleAccountAuthorized($account)
    {
        Log::info('[STRIPE CONNECT] Account authorized', ['account_id' => $account->id]);
        // Same as account.updated
        $this->handleAccountUpdated($account);
    }

    /**
     * Handle account.application.deauthorized - When seller disconnects
     */
    private function handleAccountDeauthorized($account)
    {
        Log::info('[STRIPE CONNECT] ========== ACCOUNT DEAUTHORIZED ==========');
        Log::info('[STRIPE CONNECT] Account ID: ' . $account->id);

        try {
            // Find seller
            $seller = \DB::table('wh_warehouse_user')
                ->where('stripe_connect_id', $account->id)
                ->first();

            if (!$seller) {
                Log::warning('[STRIPE CONNECT] Seller not found', ['account_id' => $account->id]);
                return;
            }

            // Mark as disconnected
            \DB::table('wh_warehouse_user')
                ->where('id', $seller->id)
                ->update([
                    'stripe_connect' => 0,
                    'stripe_onboarding_completed' => 0,
                    'stripe_charges_enabled' => 0,
                    'stripe_payouts_enabled' => 0,
                    'updated_at' => now()
                ]);

            // Remove from cache
            \DB::table('stripe_connect_accounts')
                ->where('wh_account_id', $seller->id)
                ->delete();

            Log::info('[STRIPE CONNECT] ✅ Account deauthorized', ['wh_account_id' => $seller->id]);

        } catch (Exception $e) {
            Log::error('[STRIPE CONNECT] Error handling deauthorization', [
                'error' => $e->getMessage(),
                'account_id' => $account->id
            ]);
        }

        Log::info('[STRIPE CONNECT] ========== END ACCOUNT DEAUTHORIZED ==========');
    }

    /**
     * Handle payout.created - When payout is initiated
     */
    private function handlePayoutCreated($payout)
    {
        Log::info('[STRIPE CONNECT] Payout created', [
            'payout_id' => $payout->id,
            'amount' => $payout->amount / 100,
            'status' => $payout->status
        ]);

        try {
            $wh_account_id = $payout->metadata->wh_account_id ?? null;

            if (!$wh_account_id) {
                // Try to find by Stripe account
                $account = $payout->destination ?? null;
                if ($account) {
                    $seller = \DB::table('wh_warehouse_user')
                        ->where('stripe_connect_id', $account)
                        ->first();
                    $wh_account_id = $seller->id ?? null;
                }
            }

            if (!$wh_account_id) {
                Log::warning('[STRIPE CONNECT] Cannot find seller for payout', ['payout_id' => $payout->id]);
                return;
            }

            // Check if already exists
            $exists = \DB::table('stripe_payouts')
                ->where('stripe_payout_id', $payout->id)
                ->exists();

            if (!$exists) {
                \DB::table('stripe_payouts')->insert([
                    'wh_account_id' => $wh_account_id,
                    'stripe_payout_id' => $payout->id,
                    'stripe_connect_account_id' => $payout->destination ?? '',
                    'amount' => $payout->amount / 100,
                    'currency' => strtoupper($payout->currency),
                    'status' => $payout->status,
                    'payout_type' => 'automatic',
                    'method' => $payout->method ?? 'standard',
                    'arrival_date' => isset($payout->arrival_date) ? date('Y-m-d', $payout->arrival_date) : null,
                    'stripe_response' => json_encode($payout),
                    'created_by' => 'system',
                    'created_at' => now(),
                    'updated_at' => now()
                ]);

                Log::info('[STRIPE CONNECT] ✅ Payout recorded', ['payout_id' => $payout->id]);
            }

        } catch (Exception $e) {
            Log::error('[STRIPE CONNECT] Error handling payout.created', [
                'error' => $e->getMessage(),
                'payout_id' => $payout->id
            ]);
        }
    }

    /**
     * Handle payout.paid - When payout succeeds
     */
    private function handlePayoutPaid($payout)
    {
        Log::info('[STRIPE CONNECT] ========== PAYOUT PAID ==========');
        Log::info('[STRIPE CONNECT] Payout ID: ' . $payout->id);

        try {
            // Update payout status
            \DB::table('stripe_payouts')
                ->where('stripe_payout_id', $payout->id)
                ->update([
                    'status' => 'paid',
                    'arrived_at' => now(),
                    'stripe_response' => json_encode($payout),
                    'updated_at' => now()
                ]);

            // Get payout record to find seller
            $payoutRecord = \DB::table('stripe_payouts')
                ->where('stripe_payout_id', $payout->id)
                ->first();

            if ($payoutRecord) {
                // Update seller's paid earnings
                \DB::table('wh_warehouse_user')
                    ->where('id', $payoutRecord->wh_account_id)
                    ->update([
                        'paid_shipper_earnings' => \DB::raw("paid_shipper_earnings + {$payoutRecord->amount}"),
                        'updated_at' => now()
                    ]);

                Log::info('[STRIPE CONNECT] ✅ Payout marked as paid', [
                    'payout_id' => $payout->id,
                    'wh_account_id' => $payoutRecord->wh_account_id,
                    'amount' => $payoutRecord->amount
                ]);
            }

        } catch (Exception $e) {
            Log::error('[STRIPE CONNECT] Error handling payout.paid', [
                'error' => $e->getMessage(),
                'payout_id' => $payout->id
            ]);
        }

        Log::info('[STRIPE CONNECT] ========== END PAYOUT PAID ==========');
    }

    /**
     * Handle payout.failed - When payout fails
     */
    private function handlePayoutFailed($payout)
    {
        Log::error('[STRIPE CONNECT] ========== PAYOUT FAILED ==========');
        Log::error('[STRIPE CONNECT] Payout ID: ' . $payout->id);
        Log::error('[STRIPE CONNECT] Failure code: ' . ($payout->failure_code ?? 'unknown'));
        Log::error('[STRIPE CONNECT] Failure message: ' . ($payout->failure_message ?? 'No message'));

        try {
            // Update payout status
            \DB::table('stripe_payouts')
                ->where('stripe_payout_id', $payout->id)
                ->update([
                    'status' => 'failed',
                    'failure_code' => $payout->failure_code ?? null,
                    'failure_message' => $payout->failure_message ?? null,
                    'stripe_response' => json_encode($payout),
                    'updated_at' => now()
                ]);

            // Get payout record
            $payoutRecord = \DB::table('stripe_payouts')
                ->where('stripe_payout_id', $payout->id)
                ->first();

            if ($payoutRecord) {
                // Return money to seller's balance
                \DB::table('wh_warehouse_user')
                    ->where('id', $payoutRecord->wh_account_id)
                    ->update([
                        'Shipper_earnings' => \DB::raw("Shipper_earnings + {$payoutRecord->amount}"),
                        'updated_at' => now()
                    ]);

                Log::error('[STRIPE CONNECT] ❌ Payout failed, funds returned to balance', [
                    'payout_id' => $payout->id,
                    'wh_account_id' => $payoutRecord->wh_account_id,
                    'amount' => $payoutRecord->amount
                ]);
            }

        } catch (Exception $e) {
            Log::error('[STRIPE CONNECT] Error handling payout.failed', [
                'error' => $e->getMessage(),
                'payout_id' => $payout->id
            ]);
        }

        Log::error('[STRIPE CONNECT] ========== END PAYOUT FAILED ==========');
    }

    /**
     * Handle transfer.created - When platform transfers to seller
     */
    private function handleTransferCreated($transfer)
    {
        Log::info('[STRIPE CONNECT] Transfer created', [
            'transfer_id' => $transfer->id,
            'amount' => $transfer->amount / 100,
            'destination' => $transfer->destination
        ]);

        try {
            $wh_account_id = $transfer->metadata->wh_account_id ?? null;
            $order_id = $transfer->metadata->order_id ?? null;

            if (!$wh_account_id && $transfer->destination) {
                // Find seller by Stripe account
                $seller = \DB::table('wh_warehouse_user')
                    ->where('stripe_connect_id', $transfer->destination)
                    ->first();
                $wh_account_id = $seller->id ?? null;
            }

            if (!$wh_account_id) {
                Log::warning('[STRIPE CONNECT] Cannot find seller for transfer', ['transfer_id' => $transfer->id]);
                return;
            }

            // Record transaction
            \DB::table('stripe_transactions')->insert([
                'wh_account_id' => $wh_account_id,
                'order_id' => $order_id,
                'stripe_transfer_id' => $transfer->id,
                'transaction_type' => 'transfer',
                'payment_model' => 'destination', // or from metadata
                'amount' => $transfer->amount / 100,
                'currency' => strtoupper($transfer->currency),
                'seller_earnings' => $transfer->amount / 100,
                'status' => 'succeeded',
                'description' => $transfer->description ?? 'Transfer to seller',
                'metadata' => json_encode($transfer->metadata ?? []),
                'stripe_response' => json_encode($transfer),
                'processed_at' => now(),
                'created_at' => now(),
                'updated_at' => now()
            ]);

            Log::info('[STRIPE CONNECT] ✅ Transfer recorded', ['transfer_id' => $transfer->id]);

        } catch (Exception $e) {
            Log::error('[STRIPE CONNECT] Error handling transfer.created', [
                'error' => $e->getMessage(),
                'transfer_id' => $transfer->id
            ]);
        }
    }

    /**
     * Handle transfer.updated - When transfer status changes
     */
    private function handleTransferUpdated($transfer)
    {
        Log::info('[STRIPE CONNECT] Transfer updated', [
            'transfer_id' => $transfer->id,
            'status' => $transfer->status ?? 'unknown'
        ]);

        try {
            \DB::table('stripe_transactions')
                ->where('stripe_transfer_id', $transfer->id)
                ->update([
                    'stripe_response' => json_encode($transfer),
                    'updated_at' => now()
                ]);

        } catch (Exception $e) {
            Log::error('[STRIPE CONNECT] Error updating transfer', [
                'error' => $e->getMessage(),
                'transfer_id' => $transfer->id
            ]);
        }
    }

    /**
     * Handle transfer.reversed - When transfer is cancelled/reversed
     */
    private function handleTransferReversed($transfer)
    {
        Log::warning('[STRIPE CONNECT] ========== TRANSFER REVERSED ==========');
        Log::warning('[STRIPE CONNECT] Transfer ID: ' . $transfer->id);

        try {
            // Mark transaction as reversed
            \DB::table('stripe_transactions')
                ->where('stripe_transfer_id', $transfer->id)
                ->update([
                    'status' => 'cancelled',
                    'stripe_response' => json_encode($transfer),
                    'updated_at' => now()
                ]);

            // Get transaction to find seller
            $transaction = \DB::table('stripe_transactions')
                ->where('stripe_transfer_id', $transfer->id)
                ->first();

            if ($transaction) {
                // Return funds to seller balance
                \DB::table('wh_warehouse_user')
                    ->where('id', $transaction->wh_account_id)
                    ->update([
                        'Shipper_earnings' => \DB::raw("Shipper_earnings + {$transaction->seller_earnings}"),
                        'updated_at' => now()
                    ]);

                Log::warning('[STRIPE CONNECT] ⚠️ Transfer reversed, funds returned', [
                    'transfer_id' => $transfer->id,
                    'wh_account_id' => $transaction->wh_account_id,
                    'amount' => $transaction->seller_earnings
                ]);
            }

        } catch (Exception $e) {
            Log::error('[STRIPE CONNECT] Error handling transfer.reversed', [
                'error' => $e->getMessage(),
                'transfer_id' => $transfer->id
            ]);
        }

        Log::warning('[STRIPE CONNECT] ========== END TRANSFER REVERSED ==========');
    }

    /**
     * Handle charge.refunded - When payment is refunded
     */
    private function handleChargeRefunded($charge)
    {
        Log::info('[STRIPE CONNECT] ========== CHARGE REFUNDED ==========');
        Log::info('[STRIPE CONNECT] Charge ID: ' . $charge->id);

        try {
            $refunds = $charge->refunds->data ?? [];
            $totalRefunded = 0;

            foreach ($refunds as $refund) {
                $totalRefunded += $refund->amount;
            }

            $refundAmount = $totalRefunded / 100;

            Log::info('[STRIPE CONNECT] Refund amount: $' . $refundAmount);

            // Find transaction by charge ID
            $transaction = \DB::table('stripe_transactions')
                ->where('stripe_charge_id', $charge->id)
                ->first();

            if ($transaction) {
                // Update transaction
                \DB::table('stripe_transactions')
                    ->where('id', $transaction->id)
                    ->update([
                        'status' => 'refunded',
                        'refunded_amount' => $refundAmount,
                        'stripe_response' => json_encode($charge),
                        'updated_at' => now()
                    ]);

                // Return refunded earnings to seller
                $refundedEarnings = ($refundAmount / $transaction->amount) * $transaction->seller_earnings;

                \DB::table('wh_warehouse_user')
                    ->where('id', $transaction->wh_account_id)
                    ->update([
                        'Shipper_earnings' => \DB::raw("Shipper_earnings - {$refundedEarnings}"),
                        'updated_at' => now()
                    ]);

                Log::info('[STRIPE CONNECT] ✅ Refund processed', [
                    'charge_id' => $charge->id,
                    'wh_account_id' => $transaction->wh_account_id,
                    'refund_amount' => $refundAmount,
                    'seller_deduction' => $refundedEarnings
                ]);
            }

        } catch (Exception $e) {
            Log::error('[STRIPE CONNECT] Error handling refund', [
                'error' => $e->getMessage(),
                'charge_id' => $charge->id
            ]);
        }

        Log::info('[STRIPE CONNECT] ========== END CHARGE REFUNDED ==========');
    }
}