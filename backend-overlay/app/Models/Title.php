<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class Title extends Model
{
    protected $guarded = [];
    protected $hidden = ['private_file_key', 'cover_path']; // never expose the storage path
    protected $appends = ['cover_url'];

    public function getCoverUrlAttribute(): ?string
    {
        return $this->cover_path ? Storage::disk('public')->url($this->cover_path) : null;
    }
    public function plans() { return $this->belongsToMany(Plan::class, 'plan_titles'); }
}
