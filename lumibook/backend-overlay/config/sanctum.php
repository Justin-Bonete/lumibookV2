<?php
// Tokens expire (default 7 days) so a stolen token does not live forever.
return [
    'stateful' => explode(',', env('SANCTUM_STATEFUL_DOMAINS', '')),
    'guard' => ['web'],
    'expiration' => (int) env('SANCTUM_TOKEN_EXPIRATION', 10080), // minutes
    'token_prefix' => env('SANCTUM_TOKEN_PREFIX', ''),
    'middleware' => [
        'authenticate_session' => Laravel\Sanctum\Http\Middleware\AuthenticateSession::class,
        'encrypt_cookies' => Illuminate\Cookie\Middleware\EncryptCookies::class,
        'validate_csrf_token' => Illuminate\Foundation\Http\Middleware\ValidateCsrfToken::class,
    ],
];
