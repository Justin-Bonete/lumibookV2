<?php
namespace App\Services;

/** Paymongo-Signature header: "t=<timestamp>,te=<test sig>,li=<live sig>"; sig = HMAC-SHA256("<t>.<raw body>", webhook secret). */
class PaymongoSignature
{
    public static function valid(string $raw, ?string $header, ?string $secret, string $mode = 'test'): bool
    {
        if (! $header || ! $secret) return false;
        $parts = [];
        foreach (explode(',', $header) as $p) {
            [$k, $v] = array_pad(explode('=', $p, 2), 2, null);
            $parts[trim((string) $k)] = $v;
        }
        $t = $parts['t'] ?? null;
        $sig = $parts[$mode === 'live' ? 'li' : 'te'] ?? null;
        if (! $t || ! $sig) return false;
        return hash_equals(hash_hmac('sha256', "$t.$raw", $secret), $sig);
    }

    /** Used by tests to build a valid header. */
    public static function sign(string $raw, string $secret, string $mode = 'test', ?int $t = null): string
    {
        $t ??= time();
        $sig = hash_hmac('sha256', "$t.$raw", $secret);
        return $mode === 'live' ? "t=$t,te=,li=$sig" : "t=$t,te=$sig,li=";
    }
}
