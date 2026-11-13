<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('titles', function (Blueprint $t) {
            $t->string('cover_path')->nullable();           // public disk: covers are not protected content
            $t->unsignedBigInteger('file_size')->nullable(); // bytes
            $t->index(['visibility', 'rights_status']);
        });
    }
};
