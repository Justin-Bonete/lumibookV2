<?php
return [
    'secret_key' => env('PAYMONGO_SECRET_KEY'),           // sk_test_... or sk_live_...
    'webhook_secret' => env('PAYMONGO_WEBHOOK_SECRET'),    // whsk_... (one per endpoint, test and live differ)
    'mode' => env('PAYMONGO_MODE', 'test'),                // test | live
    'base_url' => env('PAYMONGO_BASE_URL', 'https://api.paymongo.com'),
    'methods' => array_values(array_filter(explode(',', env('PAYMONGO_METHODS', 'card,gcash,qrph')))),
];
