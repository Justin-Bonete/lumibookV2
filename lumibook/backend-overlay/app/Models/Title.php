<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Title extends Model
{
    use SoftDeletes;

    protected $guarded = [];
    protected $hidden = ['private_file_key', 'cover_path']; // never expose the storage path
    protected $appends = ['cover_url'];

    /** Covers are served through the API (/api/covers/{id}), so they work on any host and need no storage:link. */
    public function getCoverUrlAttribute(): ?string
    {
        return $this->cover_path ? "/api/covers/{$this->id}?v=" . ($this->updated_at?->timestamp ?? 0) : null;
    }
    public function plans() { return $this->belongsToMany(Plan::class, 'plan_titles'); }
}
