<?php
namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\Order;
use App\Models\Plan;
use App\Services\EntitlementService;
use App\Services\PaymongoClient;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CheckoutController extends Controller
{
    /** Public pricing for the plans page. */
    public function plans()
    {
        return Plan::where('active', true)->orderBy('tier')
            ->get(['code', 'name', 'tier', 'price', 'currency', 'ebook_limit', 'download_limit', 'download_period']);
    }

    public function start(Request $r, PaymongoClient $pm, EntitlementService $svc)
    {
        $d = $r->validate(['plan_code' => 'required|exists:plans,code']);
        $plan = Plan::where('code', $d['plan_code'])->where('active', true)->firstOrFail();
        abort_if($plan->code === 'free', 422, 'The Free plan does not need a payment.');
        abort_if($plan->price === null || $plan->price <= 0, 422, 'This plan has no price yet.');
        [$current] = $svc->current($r->user());
        abort_if($plan->tier <= $current->tier, 422, 'You already have this plan or a higher one.');

        // Re-use a recent open checkout for the same plan instead of creating duplicates.
        $order = Order::where('user_id', $r->user()->id)->where('plan_id', $plan->id)->where('status', 'pending')
            ->whereNotNull('checkout_url')->where('created_at', '>=', now()->subMinutes(30))->latest()->first();

        if (! $order) {
            $order = Order::create(['user_id' => $r->user()->id, 'plan_id' => $plan->id, 'amount' => $plan->price,
                'order_number' => 'LB-' . strtoupper(Str::random(10)), 'status' => 'pending']);
            $s = $pm->createCheckout($order->load('plan'), $r->user());
            $order->update(['checkout_session_id' => $s['id'], 'checkout_url' => $s['url']]);
            AuditLog::record('order.created', $order, ['plan' => $plan->code]);
        }
        return ['checkout_url' => $order->checkout_url, 'order_number' => $order->order_number];
    }

    public function orders(Request $r)
    {
        return $r->user()->orders()->with('plan:id,name')->latest()
            ->get(['id', 'plan_id', 'order_number', 'amount', 'status', 'paid_at', 'created_at']);
    }

    /** Polled by the "payment successful" page until the webhook has activated the plan. */
    public function order(Request $r, string $number)
    {
        $o = $r->user()->orders()->with('plan:id,name')->where('order_number', $number)->firstOrFail();
        return $o->only('order_number', 'amount', 'status', 'paid_at') + ['plan' => $o->plan->name];
    }
}
