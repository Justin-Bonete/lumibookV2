<?php
return [
    'frontend_url' => env('FRONTEND_URL', 'http://localhost:5173'),
    'fair_use_per_hour' => (int) env('FAIR_USE_PER_HOUR', 30), // cap for "unlimited" plans
    'require_admin_2fa' => (bool) env('REQUIRE_ADMIN_2FA', false),
    'pending_order_hours' => (int) env('PENDING_ORDER_HOURS', 48),
];
