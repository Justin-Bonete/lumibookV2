<?php
namespace App\Services;

use App\Models\AuditLog;
use App\Models\Entitlement;
use App\Models\Order;
use App\Notifications\PaymentReceived;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/** Turns a PAID checkout session into an active entitlement. Safe to call repeatedly. */
class OrderFulfillment
{
    /** @param array $session PayMongo checkout_session resource ({id, attributes:{reference_number, payments:[...]}}) */
    public function fulfill(array $session): ?Order
    {
        $attrs = $session['attributes'] ?? [];
        $ref = $attrs['reference_number'] ?? null;
        $order = $ref
            ? Order::where('order_number', $ref)->first()
            : (isset($session['id']) ? Order::where('checkout_session_id', $session['id'])->first() : null);
        if (! $order) {
            Log::warning('paymongo.unknown_order', ['reference' => $ref, 'session' => $session['id'] ?? null]);
            return null;
        }

        $pay = collect($attrs['payments'] ?? [])->first(fn ($p) => ($p['attributes']['status'] ?? null) === 'paid');
        if (! $pay) return null; // session exists but nothing is paid yet

        $paid = (int) ($pay['attributes']['amount'] ?? 0);
        $expected = (int) round($order->amount * 100);
        if ($paid < $expected) { // never activate on an underpayment; an admin decides
            $order->update(['status' => 'review', 'review_note' => "Paid $paid centavos, expected $expected."]);
            AuditLog::create(['action' => 'order.review', 'entity_type' => 'Order', 'entity_id' => $order->id, 'metadata' => ['paid' => $paid, 'expected' => $expected]]);
            return $order;
        }

        $fresh = false;
        $result = DB::transaction(function () use ($order, $pay, &$fresh) {
            $o = Order::whereKey($order->id)->lockForUpdate()->first();
            if ($o->status === 'paid') return $o; // already fulfilled (retry / duplicate)
            $o->update(['status' => 'paid', 'paid_at' => now(), 'review_note' => null]);
            $o->payments()->create(['provider' => 'paymongo', 'provider_reference' => $pay['id'] ?? null, 'status' => 'verified', 'verified_at' => now()]);
            Entitlement::where('user_id', $o->user_id)->where('status', 'active')->update(['status' => 'replaced', 'ends_at' => now()]);
            Entitlement::create(['user_id' => $o->user_id, 'plan_id' => $o->plan_id, 'order_id' => $o->id, 'status' => 'active']);
            AuditLog::create(['action' => 'order.paid', 'entity_type' => 'Order', 'entity_id' => $o->id, 'metadata' => ['payment' => $pay['id'] ?? null]]);
            $fresh = true;
            return $o;
        });

        if ($fresh) $result->user->notify(new PaymentReceived($result->load('plan')));
        return $result;
    }
}
