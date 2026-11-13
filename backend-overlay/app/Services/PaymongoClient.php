<?php
namespace App\Services;

use App\Models\Order;
use App\Models\User;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/** Thin wrapper over PayMongo Hosted Checkout (v2). Amounts are in centavos. */
class PaymongoClient
{
    private function http(): PendingRequest
    {
        $key = config('paymongo.secret_key');
        abort_unless($key, 503, 'Payments are not configured yet.');
        return Http::withBasicAuth($key, '')->acceptJson()->timeout(20)->baseUrl(config('paymongo.base_url'));
    }

    /** @return array{id: string, url: string} */
    public function createCheckout(Order $order, User $user): array
    {
        $front = rtrim(config('lumibook.frontend_url'), '/');
        $plan = $order->plan;
        $res = $this->http()->post('/v2/checkout_sessions', ['data' => ['attributes' => [
            'line_items' => [['name' => "LUMIBOOK {$plan->name}", 'amount' => (int) round($order->amount * 100), 'currency' => 'PHP', 'quantity' => 1]],
            'payment_method_types' => config('paymongo.methods'),
            'success_url' => "$front/app/checkout/success?order={$order->order_number}",
            'cancel_url' => "$front/app/checkout/cancel?order={$order->order_number}",
            'reference_number' => $order->order_number,
            'description' => "One-time {$plan->name} membership",
            'send_email_receipt' => true,
            'billing' => ['name' => $user->name, 'email' => $user->email],
            'metadata' => ['order_id' => (string) $order->id, 'plan' => $plan->code],
        ]]]);

        if (! $res->successful() || ! $res->json('data.attributes.checkout_url')) {
            Log::warning('paymongo.checkout_failed', ['status' => $res->status(), 'body' => $res->body(), 'order' => $order->order_number]);
            abort(502, 'Could not start checkout. Please try again.');
        }
        return ['id' => $res->json('data.id'), 'url' => $res->json('data.attributes.checkout_url')];
    }

    /** Used by the admin "re-check payment" button when a webhook was missed. */
    public function retrieve(string $sessionId): array
    {
        $res = $this->http()->get("/v2/checkout_sessions/$sessionId");
        abort_unless($res->successful(), 502, 'Could not reach PayMongo.');
        return $res->json('data') ?? [];
    }
}
