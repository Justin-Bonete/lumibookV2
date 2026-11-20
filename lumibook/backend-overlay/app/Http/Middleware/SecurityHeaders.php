<?php
namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

/** Defensive headers on every API response. */
class SecurityHeaders
{
    public function handle(Request $request, Closure $next)
    {
        $res = $next($request);
        $h = [
            'X-Content-Type-Options' => 'nosniff',
            'X-Frame-Options' => 'DENY',
            'Referrer-Policy' => 'no-referrer',
            'Permissions-Policy' => 'camera=(), microphone=(), geolocation=()',
            'Content-Security-Policy' => "default-src 'none'; frame-ancestors 'none'",
        ];
        if ($request->isSecure()) $h['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains';
        foreach ($h as $k => $v) $res->headers->set($k, $v);
        return $res;
    }
}
