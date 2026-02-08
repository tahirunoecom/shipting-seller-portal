<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration: Create payout_approval_requests table
 *
 * This migration creates the table for managing seller payout approval requests.
 * Sellers request payouts, admins approve/reject them.
 *
 * To run: php artisan migrate
 * To rollback: php artisan migrate:rollback
 */
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('payout_approval_requests', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('wh_account_id');
            $table->decimal('amount', 10, 2);
            $table->text('notes')->nullable();
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->text('admin_notes')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->unsignedBigInteger('approved_by_admin_id')->nullable();
            $table->unsignedBigInteger('stripe_payout_id')->nullable(); // Links to stripe_payouts.id
            $table->timestamp('processed_at')->nullable();
            $table->timestamps();

            // Indexes for performance
            $table->index('wh_account_id', 'idx_wh_account_id');
            $table->index('status', 'idx_status');
            $table->index('created_at', 'idx_created_at');
            $table->index(['wh_account_id', 'status'], 'idx_wh_status');

            // Foreign key constraint (only if wh_warehouse_user has proper index)
            // Uncomment this if you created the index: CREATE INDEX idx_wh_account_id ON wh_warehouse_user(wh_account_id);
            // $table->foreign('wh_account_id', 'fk_payout_wh_account')
            //     ->references('wh_account_id')
            //     ->on('wh_warehouse_user')
            //     ->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payout_approval_requests');
    }
};
