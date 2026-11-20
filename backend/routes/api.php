<?php
use App\Http\Controllers\AdminController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CheckoutController;
use App\Http\Controllers\MemberController;
use App\Http\Controllers\TwoFactorController;
use App\Http\Controllers\WebhookController;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;

// ---- Public ----
Route::get('health', function () { // for uptime monitors
    try { DB::select('select 1'); return ['status' => 'ok']; }
    catch (\Throwable) { return response()->json(['status' => 'down'], 503); }
});
Route::get('plans', [CheckoutController::class, 'plans']);
Route::post('register', [AuthController::class, 'register'])->middleware('throttle:register');
Route::post('login', [AuthController::class, 'login'])->middleware('throttle:login');
Route::post('login/two-factor', [AuthController::class, 'twoFactorLogin'])->middleware('throttle:twofactor');
Route::post('forgot-password', [AuthController::class, 'forgot'])->middleware('throttle:6,1');
Route::post('reset-password', [AuthController::class, 'reset'])->middleware('throttle:6,1');
Route::get('email/verify/{id}/{hash}', [AuthController::class, 'verify'])->name('verification.verify')->middleware(['signed', 'throttle:6,1']);
Route::post('webhooks/paymongo', [WebhookController::class, 'paymongo'])->middleware('throttle:webhooks');
// Signed, short-lived link issued by /titles/{title}/download
Route::get('files/{event}', [MemberController::class, 'file'])->name('download.file')->middleware(['signed', 'throttle:30,1']);

// ---- Signed-in (non-suspended) ----
Route::middleware(['auth:sanctum', 'role:any'])->group(function () {
    Route::post('logout', [AuthController::class, 'logout']);
    Route::post('email/verification-notification', [AuthController::class, 'resendVerification'])->middleware('throttle:6,1');
    Route::get('me', [MemberController::class, 'me']);
    Route::post('2fa/setup', [TwoFactorController::class, 'setup'])->middleware('throttle:6,1');
    Route::post('2fa/enable', [TwoFactorController::class, 'enable'])->middleware('throttle:6,1');
    Route::post('2fa/disable', [TwoFactorController::class, 'disable'])->middleware('throttle:6,1');
    Route::get('library', [MemberController::class, 'library']);
    Route::get('categories', [MemberController::class, 'categories']);
    Route::get('titles/{title}', [MemberController::class, 'show']);
    Route::get('history', [MemberController::class, 'history']);
    Route::get('orders', [CheckoutController::class, 'orders']);
    Route::get('orders/{number}', [CheckoutController::class, 'order']);
    // Buying and downloading need a verified email address.
    Route::post('checkout', [CheckoutController::class, 'start'])->middleware(['verified', 'throttle:checkout']);
    Route::post('titles/{title}/download', [MemberController::class, 'download'])->middleware(['verified', 'throttle:downloads']);

    // ---- Owner / admin only ----
    Route::prefix('admin')->middleware('role:admin')->group(function () {
        Route::get('stats', [AdminController::class, 'stats']);
        Route::get('users', [AdminController::class, 'users']);
        Route::get('users/{user}', [AdminController::class, 'user']);
        Route::put('users/{user}/plan', [AdminController::class, 'setPlan']);
        Route::put('users/{user}/status', [AdminController::class, 'setStatus']);
        Route::get('orders', [AdminController::class, 'orders']);
        Route::post('orders/{order}/recheck', [AdminController::class, 'recheck']);
        Route::get('titles', [AdminController::class, 'titles']);
        Route::post('titles', [AdminController::class, 'storeTitle']);
        Route::put('titles/{title}', [AdminController::class, 'updateTitle']);
        Route::post('titles/{title}/cover', [AdminController::class, 'setCover']);
        Route::post('titles/{title}/file', [AdminController::class, 'replaceFile']);
        Route::get('plans', [AdminController::class, 'plans']);
        Route::get('plans/{plan}', [AdminController::class, 'plan']);
        Route::put('plans/{plan}/price', [AdminController::class, 'setPrice']);
        Route::put('plans/{plan}/titles', [AdminController::class, 'syncPlanTitles']);
        Route::get('audit', [AdminController::class, 'audit']);
    });
});
