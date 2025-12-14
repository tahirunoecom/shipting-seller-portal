<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * SellerWhatsappConfig Model
 * Stores WhatsApp Business configuration for each seller
 */
class SellerWhatsappConfig extends Model
{
    use HasFactory;

    protected $table = 'seller_whatsapp_config';

    protected $fillable = [
        'wh_account_id',
        'waba_id',
        'phone_number_id',
        'business_id',
        'display_phone_number',
        'business_name',
        'verified_name',
        'access_token',
        'catalog_id',
        'last_catalog_sync',
        'catalog_product_count',
        'is_connected',
        'connection_status',
        'connected_at',
        'disconnected_at',
        'bot_settings',
        'auto_replies',
        'quick_replies',
    ];

    protected $casts = [
        'is_connected' => 'boolean',
        'connected_at' => 'datetime',
        'disconnected_at' => 'datetime',
        'last_catalog_sync' => 'datetime',
        'bot_settings' => 'array',
        'auto_replies' => 'array',
        'quick_replies' => 'array',
    ];

    protected $hidden = [
        'access_token', // Don't expose access token in API responses
    ];

    /**
     * Relationship to seller account
     */
    public function seller()
    {
        return $this->belongsTo(\App\Models\WhAccount::class, 'wh_account_id');
    }

    /**
     * Scope for connected accounts
     */
    public function scopeConnected($query)
    {
        return $query->where('is_connected', true);
    }

    /**
     * Scope for finding by phone number ID
     */
    public function scopeByPhoneNumberId($query, $phoneNumberId)
    {
        return $query->where('phone_number_id', $phoneNumberId);
    }

    /**
     * Get bot welcome message
     */
    public function getWelcomeMessageAttribute()
    {
        $settings = $this->bot_settings;
        return $settings['welcomeMessage'] ?? 'Welcome to our store! How can we help you today?';
    }

    /**
     * Get bot away message
     */
    public function getAwayMessageAttribute()
    {
        $settings = $this->bot_settings;
        return $settings['awayMessage'] ?? 'We are currently away. We will respond as soon as possible.';
    }

    /**
     * Check if within business hours
     */
    public function isWithinBusinessHours()
    {
        $settings = $this->bot_settings;

        if (!($settings['businessHoursEnabled'] ?? false)) {
            return true; // If not enabled, always available
        }

        $now = now();
        $start = $settings['businessHoursStart'] ?? '09:00';
        $end = $settings['businessHoursEnd'] ?? '18:00';

        $currentTime = $now->format('H:i');

        return $currentTime >= $start && $currentTime <= $end;
    }
}
