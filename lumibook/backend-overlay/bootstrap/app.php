<?php
use App\Http\Middleware\EnsureRole;
use App\Http\Middleware\SecurityHeaders;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Routing\Middleware\SubstituteBindings;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(api: __DIR__ . '/../routes/api.php', commands: __DIR__ . '/../routes/console.php', health: '/up')
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->alias(['role' => EnsureRole::class]);
        $middleware->api(append: [SecurityHeaders::class]);
        // Role check must run before route-model binding so members get 403, not 404, on admin URLs.
        $middleware->prependToPriorityList(before: SubstituteBindings::class, prepend: EnsureRole::class);
        $middleware->trustProxies(at: '*'); // behind Caddy/nginx; restrict to your proxy IPs if you prefer
    })
    ->withExceptions(function (Exceptions $exceptions) {
        $exceptions->shouldRenderJsonWhen(fn ($request, $e) => $request->is('api/*') || $request->expectsJson());
    })->create();
