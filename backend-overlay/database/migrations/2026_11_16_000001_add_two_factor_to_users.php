<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('users', function (Blueprint $t) {
            $t->text('two_factor_secret')->nullable();          // encrypted at rest (model cast)
            $t->timestamp('two_factor_confirmed_at')->nullable(); // set once the user proves the app works
            $t->text('two_factor_recovery_codes')->nullable();    // JSON list of SHA-256 hashes
        });
    }
};
