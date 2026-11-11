<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $t) {
            $t->string('checkout_session_id')->nullable()->index();
            $t->text('checkout_url')->nullable();
            $t->string('review_note')->nullable();   // set when a payment doesn't match the order
        });
        Schema::create('webhook_events', function (Blueprint $t) {
            $t->id();
            $t->string('event_id')->unique();         // idempotency: each event is processed once
            $t->string('type');
            $t->timestamps();
        });
    }
};
