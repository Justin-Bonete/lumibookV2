<?php
namespace App\Http\Controllers;

use App\Models\WebhookEvent;
use App\Services\OrderFulfillment;
use App\Services\PaymongoSignature;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\Request;

class WebhookController extends Controller
{
    /** PayMongo -> POST /api/webhooks/paymongo. Verify, dedupe, fulfil, answer 200 fast. */
    public function paymongo(Request $r, OrderFulfillment $fulfil)
    {
        $raw = $r->getContent(); // verify against the RAW body, before any parsing
        abort_unless(PaymongoSignature::valid($raw, $r->header('Paymongo-Signature'), config('paymongo.webhook_secret'), config('paymongo.mode')), 400, 'Invalid signature.');

        $d = (json_decode($raw, true) ?: [])['data'] ?? [];
        $type = $d['attributes']['type'] ?? $d['type'] ?? null;
        $live = $d['attributes']['livemode'] ?? $d['livemode'] ?? null;
        if ($live !== null && $live !== (config('paymongo.mode') === 'live')) return ['ok' => true, 'ignored' => 'mode'];
        if ($type !== 'checkout_session.payment.paid') return ['ok' => true, 'ignored' => 'type']; // never error on unknown events

        $session = $d['attributes']['data'] ?? $d['data'] ?? [];
        $eventId = $d['id'] ?? (($session['id'] ?? 'unknown') . '|' . $type);

        try {
            $evt = WebhookEvent::create(['event_id' => $eventId, 'type' => $type]);
        } catch (UniqueConstraintViolationException) {
            return ['ok' => true, 'duplicate' => true];
        }
        try {
            $fulfil->fulfill($session);
        } catch (\Throwable $e) {
            $evt->delete(); // let PayMongo's retry try again
            throw $e;
        }
        return ['ok' => true];
    }
}
