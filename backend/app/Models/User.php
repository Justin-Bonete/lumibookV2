<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable implements MustVerifyEmail
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $guarded = [];
    protected $hidden = ['password', 'remember_token', 'two_factor_secret', 'two_factor_recovery_codes'];

    protected function casts(): array
    {
        return ['email_verified_at' => 'datetime', 'password' => 'hashed', 'two_factor_secret' => 'encrypted', 'two_factor_confirmed_at' => 'datetime'];
    }

    public function hasTwoFactor(): bool { return $this->two_factor_confirmed_at !== null; }
    public function isAdmin(): bool { return $this->role === 'admin'; }
    public function entitlements() { return $this->hasMany(Entitlement::class); }
    public function orders() { return $this->hasMany(Order::class); }
    public function downloads() { return $this->hasMany(DownloadEvent::class); }
}
