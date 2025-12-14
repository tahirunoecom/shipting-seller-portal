<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration for seller_whatsapp_config table
 * Stores WhatsApp Business account configurations for each seller
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('seller_whatsapp_config', function (Blueprint $table) {
            $table->id();

            // Seller reference
            $table->unsignedBigInteger('wh_account_id')->unique();

            // WhatsApp Business Account IDs
            $table->string('waba_id')->nullable()->index();
            $table->string('phone_number_id')->nullable()->index();
            $table->string('business_id')->nullable();

            // Display info
            $table->string('display_phone_number')->nullable();
            $table->string('business_name')->nullable();
            $table->string('verified_name')->nullable();

            // Access credentials (encrypted)
            $table->text('access_token')->nullable();

            // Catalog
            $table->string('catalog_id')->nullable();
            $table->timestamp('last_catalog_sync')->nullable();
            $table->integer('catalog_product_count')->default(0);

            // Connection status
            $table->boolean('is_connected')->default(false);
            $table->enum('connection_status', [
                'disconnected',
                'connecting',
                'connected',
                'error'
            ])->default('disconnected');
            $table->timestamp('connected_at')->nullable();
            $table->timestamp('disconnected_at')->nullable();

            // Bot settings (JSON)
            $table->json('bot_settings')->nullable();

            // Auto-replies (JSON)
            $table->json('auto_replies')->nullable();

            // Quick replies (JSON)
            $table->json('quick_replies')->nullable();

            $table->timestamps();

            // Foreign key
            $table->foreign('wh_account_id')
                ->references('id')
                ->on('wh_accounts')
                ->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('seller_whatsapp_config');
    }
};
