<?php
namespace App\Providers;

use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class LumibookServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        // Password-reset emails link to the React app, not the API.
        ResetPassword::createUrlUsing(fn ($user, string $token) => rtrim(config('lumibook.frontend_url'), '/')
            . "/reset-password?token=$token&email=" . urlencode($user->getEmailForPasswordReset()));

        RateLimiter::for('login', fn (Request $r) => [
            Limit::perMinute(5)->by(strtolower((string) $r->input('email')) . '|' . $r->ip()), // slows password guessing per account
            Limit::perMinute(20)->by($r->ip()),
        ]);
        RateLimiter::for('twofactor', fn (Request $r) => [
            Limit::perMinute(5)->by(sha1((string) $r->input('challenge')) . '|' . $r->ip()), // guessing codes
            Limit::perMinute(20)->by($r->ip()),
        ]);
        RateLimiter::for('register', fn (Request $r) => Limit::perHour(10)->by($r->ip()));
        RateLimiter::for('downloads', fn (Request $r) => Limit::perMinute(20)->by($r->user()?->id ?: $r->ip()));
        RateLimiter::for('checkout', fn (Request $r) => Limit::perMinute(6)->by($r->user()?->id ?: $r->ip()));
        RateLimiter::for('webhooks', fn (Request $r) => Limit::perMinute(120)->by($r->ip()));

        $this->app->booted(function () {
            $s = $this->app->make(Schedule::class);
            $s->command('lumibook:expire-orders')->daily();
            $s->command('sanctum:prune-expired --hours=24')->daily();
        });
    }
}
