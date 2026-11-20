<?php
namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Services\Totp;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class TwoFactorController extends Controller
{
    /** Step 1: create a secret (not active yet) and give the app what it needs to show a QR code. */
    public function setup(Request $r)
    {
        $u = $r->user();
        abort_if($u->hasTwoFactor(), 422, 'Two-factor sign-in is already on.');
        $secret = Totp::secret();
        $u->forceFill(['two_factor_secret' => $secret])->save();
        $label = rawurlencode('LUMIBOOK:' . $u->email);
        return ['secret' => $secret,
            'otpauth_url' => "otpauth://totp/{$label}?secret={$secret}&issuer=LUMIBOOK&algorithm=SHA1&digits=6&period=30"];
    }

    /** Step 2: prove the authenticator works, then turn it on and hand out one-time recovery codes. */
    public function enable(Request $r)
    {
        $r->validate(['code' => 'required|string']);
        $u = $r->user();
        abort_unless($u->two_factor_secret && ! $u->hasTwoFactor(), 422, 'Start the setup first.');
        abort_unless(Totp::verifyOnce($u->id, $u->two_factor_secret, $r->code), 422, 'That code is not correct.');

        $codes = collect(range(1, 8))->map(fn () => Str::lower(Str::random(5)) . '-' . Str::lower(Str::random(5)))->all();
        $u->forceFill([
            'two_factor_confirmed_at' => now(),
            'two_factor_recovery_codes' => json_encode(array_map(fn ($c) => hash('sha256', $c), $codes)),
        ])->save();
        AuditLog::record('2fa.enabled', $u);
        return ['recovery_codes' => $codes]; // shown once; only hashes are stored
    }

    public function disable(Request $r)
    {
        $r->validate(['password' => 'required|string', 'code' => 'required|string']);
        $u = $r->user();
        abort_unless(Hash::check($r->password, $u->password), 422, 'Password is incorrect.');
        abort_unless($u->hasTwoFactor() && Totp::verifyOnce($u->id, $u->two_factor_secret, $r->code), 422, 'That code is not correct.');
        $u->forceFill(['two_factor_secret' => null, 'two_factor_confirmed_at' => null, 'two_factor_recovery_codes' => null])->save();
        AuditLog::record('2fa.disabled', $u);
        return ['message' => 'Two-factor sign-in turned off.'];
    }
}
