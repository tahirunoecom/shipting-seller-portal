<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SellerWhatsappConfig extends Model
{
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
    ];

    protected $hidden = [
        'access_token',
    ];
}
