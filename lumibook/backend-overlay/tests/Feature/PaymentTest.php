<?php
namespace Tests\Feature;

use App\Models\{Entitlement, Order, Plan, User};
use App\Notifications\PaymentReceived;
use App\Services\PaymongoSignature;
use Database\Seeders\LumibookSeeder;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Tests\TestCase;

class PaymentTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(LumibookSeeder::class);
        config(['paymongo.secret_key' => 'sk_test_x', 'paymongo.webhook_secret' => 'whsk_test', 'paymongo.mode' => 'test']);
        Plan::where('code', 'premium')->update(['price' => 499]);
    }

    private function member(string $plan = 'free', bool $verified = true): User
    {
        $u = User::factory()->create(['role' => 'member', 'status' => 'active', 'email_verified_at' => $verified ? now() : null]);
        if ($plan !== 'free') Entitlement::create(['user_id' => $u->id, 'plan_id' => Plan::where('code', $plan)->value('id'), 'status' => 'active']);
        return $u;
    }

    private function pendingOrder(User $u, string $plan = 'premium', float $amount = 499): Order
    {
        return Order::create(['user_id' => $u->id, 'plan_id' => Plan::where('code', $plan)->value('id'), 'amount' => $amount,
            'order_number' => 'LB-TEST' . $u->id, 'status' => 'pending', 'checkout_session_id' => 'cs_123']);
    }

    private function webhook(string $orderNo, int $amount = 49900, string $eventId = 'evt_1', string $status = 'paid', string $secret = 'whsk_test')
    {
        $raw = json_encode(['data' => ['id' => $eventId, 'type' => 'event', 'attributes' => ['type' => 'checkout_session.payment.paid', 'livemode' => false,
            'data' => ['id' => 'cs_123', 'type' => 'checkout_session', 'attributes' => ['reference_number' => $orderNo,
                'payments' => [['id' => 'pay_1', 'attributes' => ['status' => $status, 'amount' => $amount]]]]]]]]);
        return $this->call('POST', '/api/webhooks/paymongo', [], [], [], [
            'CONTENT_TYPE' => 'application/json', 'HTTP_ACCEPT' => 'application/json',
            'HTTP_PAYMONGO_SIGNATURE' => PaymongoSignature::sign($raw, $secret, 'test'),
        ], $raw);
    }

    public function test_checkout_creates_pending_order_and_returns_the_hosted_url(): void
    {
        Http::fake(['api.paymongo.com/*' => Http::response(['data' => ['id' => 'cs_123', 'attributes' => ['checkout_url' => 'https://checkout.paymongo.com/cs_123']]])]);
        $u = $this->member();
        $res = $this->actingAs($u, 'sanctum')->postJson('/api/checkout', ['plan_code' => 'premium'])->assertOk();
        $this->assertSame('https://checkout.paymongo.com/cs_123', $res->json('checkout_url'));
        $this->assertDatabaseHas('orders', ['user_id' => $u->id, 'status' => 'pending', 'checkout_session_id' => 'cs_123']);
        Http::assertSent(fn ($r) => $r->url() === 'https://api.paymongo.com/v2/checkout_sessions'
            && data_get($r->data(), 'data.attributes.line_items.0.amount') === 49900
            && str_starts_with(data_get($r->data(), 'data.attributes.reference_number'), 'LB-'));
        // a second click re-uses the open checkout
        $this->actingAs($u, 'sanctum')->postJson('/api/checkout', ['plan_code' => 'premium'])->assertOk();
        $this->assertSame(1, Order::count());
    }

    public function test_checkout_rejects_unpriced_plan_free_plan_and_non_upgrades(): void
    {
        $u = $this->member();
        $this->actingAs($u, 'sanctum')->postJson('/api/checkout', ['plan_code' => 'plus'])->assertStatus(422); // no price set
        $this->actingAs($u, 'sanctum')->postJson('/api/checkout', ['plan_code' => 'free'])->assertStatus(422);
        $this->actingAs($this->member('premium'), 'sanctum')->postJson('/api/checkout', ['plan_code' => 'premium'])->assertStatus(422);
    }

    public function test_unverified_email_cannot_checkout(): void
    {
        $this->actingAs($this->member('free', false), 'sanctum')->postJson('/api/checkout', ['plan_code' => 'premium'])->assertStatus(403);
    }

    public function test_valid_paid_webhook_activates_the_plan_and_sends_a_receipt(): void
    {
        Notification::fake();
        $u = $this->member();
        $o = $this->pendingOrder($u);
        $this->webhook($o->order_number)->assertOk();
        $this->assertSame('paid', $o->fresh()->status);
        $this->assertDatabaseHas('entitlements', ['user_id' => $u->id, 'status' => 'active', 'plan_id' => $o->plan_id]);
        $this->assertDatabaseHas('payments', ['order_id' => $o->id, 'provider_reference' => 'pay_1', 'status' => 'verified']);
        Notification::assertSentTo($u, PaymentReceived::class);
    }

    public function test_replayed_or_retried_event_is_idempotent(): void
    {
        $u = $this->member();
        $o = $this->pendingOrder($u);
        $this->webhook($o->order_number)->assertOk();
        $this->webhook($o->order_number)->assertOk()->assertJsonPath('duplicate', true);
        $this->webhook($o->order_number, 49900, 'evt_2')->assertOk(); // different event id, same payment
        $this->assertSame(1, Entitlement::where('user_id', $u->id)->where('status', 'active')->count());
        $this->assertSame(1, $o->payments()->count());
    }

    public function test_bad_signature_is_rejected_and_changes_nothing(): void
    {
        $o = $this->pendingOrder($this->member());
        $this->webhook($o->order_number, 49900, 'evt_x', 'paid', 'wrong-secret')->assertStatus(400);
        $this->assertSame('pending', $o->fresh()->status);
    }

    public function test_underpayment_goes_to_review_and_does_not_activate(): void
    {
        $u = $this->member();
        $o = $this->pendingOrder($u);
        $this->webhook($o->order_number, 100)->assertOk();
        $this->assertSame('review', $o->fresh()->status);
        $this->assertDatabaseMissing('entitlements', ['user_id' => $u->id, 'status' => 'active']);
    }

    public function test_unpaid_session_does_not_activate(): void
    {
        $o = $this->pendingOrder($this->member());
        $this->webhook($o->order_number, 49900, 'evt_p', 'pending')->assertOk();
        $this->assertSame('pending', $o->fresh()->status);
    }

    public function test_admin_recheck_fulfils_a_missed_webhook(): void
    {
        $o = $this->pendingOrder($this->member());
        Http::fake(['api.paymongo.com/v2/checkout_sessions/cs_123' => Http::response(['data' => ['id' => 'cs_123', 'attributes' => [
            'reference_number' => $o->order_number, 'payments' => [['id' => 'pay_9', 'attributes' => ['status' => 'paid', 'amount' => 49900]]]]]])]);
        $admin = User::where('role', 'admin')->first();
        $this->actingAs($admin, 'sanctum')->postJson("/api/admin/orders/{$o->id}/recheck")->assertOk();
        $this->assertSame('paid', $o->fresh()->status);
    }

    public function test_register_sends_verification_email_and_blocks_downloads_until_verified(): void
    {
        Notification::fake();
        $this->postJson('/api/register', ['name' => 'New Person', 'email' => 'new@test.dev', 'password' => 'Secret!12345', 'password_confirmation' => 'Secret!12345'])->assertCreated();
        $u = User::where('email', 'new@test.dev')->first();
        Notification::assertSentTo($u, VerifyEmail::class);
        $this->assertFalse($u->hasVerifiedEmail());
    }

    public function test_password_reset_flow(): void
    {
        Notification::fake();
        $u = $this->member();
        $this->postJson('/api/forgot-password', ['email' => $u->email])->assertOk();
        Notification::assertSentTo($u, ResetPassword::class);
        $this->postJson('/api/forgot-password', ['email' => 'nobody@test.dev'])->assertOk(); // no account enumeration

        $token = Password::createToken($u);
        $this->postJson('/api/reset-password', ['token' => $token, 'email' => $u->email, 'password' => 'NewSecret!2026', 'password_confirmation' => 'NewSecret!2026'])->assertOk();
        $this->postJson('/api/login', ['email' => $u->email, 'password' => 'NewSecret!2026'])->assertOk()->assertJsonStructure(['token']);
        $this->postJson('/api/reset-password', ['token' => $token, 'email' => $u->email, 'password' => 'Another!2026x', 'password_confirmation' => 'Another!2026x'])->assertStatus(422); // token is single-use
    }
}
