<?php
namespace Tests\Feature;

use App\Models\User;
use App\Services\Totp;
use Database\Seeders\LumibookSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Crypt;
use Tests\TestCase;

class TwoFactorTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(LumibookSeeder::class);
    }

    /** @return array{0:string,1:array} secret and recovery codes */
    private function enable(User $u): array
    {
        $secret = $this->actingAs($u, 'sanctum')->postJson('/api/2fa/setup')->assertOk()->json('secret');
        $codes = $this->actingAs($u, 'sanctum')->postJson('/api/2fa/enable', ['code' => Totp::code($secret)])->assertOk()->json('recovery_codes');
        return [$secret, $codes];
    }

    private function member(): User
    {
        return User::factory()->create(['email' => 'tf@test.dev', 'password' => 'Secret!12345', 'role' => 'member', 'status' => 'active']);
    }

    private function challenge(): string
    {
        return $this->postJson('/api/login', ['email' => 'tf@test.dev', 'password' => 'Secret!12345'])
            ->assertOk()->assertJsonPath('two_factor', true)->assertJsonMissingPath('token')->json('challenge');
    }

    public function test_totp_matches_the_rfc_6238_test_vector(): void
    {
        $this->assertSame('287082', Totp::code('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ', 59));
        $this->assertSame('081804', Totp::code('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ', 1111111109)); // RFC 6238: 8-digit 07081804 -> last 6 digits
    }

    public function test_enable_rejects_a_wrong_code(): void
    {
        $u = $this->member();
        $this->actingAs($u, 'sanctum')->postJson('/api/2fa/setup')->assertOk();
        $this->actingAs($u, 'sanctum')->postJson('/api/2fa/enable', ['code' => 'abcdef'])->assertStatus(422);
        $this->assertFalse($u->fresh()->hasTwoFactor());
    }

    public function test_secret_is_encrypted_at_rest_and_hidden_from_json(): void
    {
        $u = $this->member();
        [$secret] = $this->enable($u);
        $this->assertNotSame($secret, \DB::table('users')->where('id', $u->id)->value('two_factor_secret'));
        $this->assertArrayNotHasKey('two_factor_secret', $u->fresh()->toArray());
    }

    public function test_login_needs_a_second_step_once_enabled(): void
    {
        $u = $this->member();
        [$secret] = $this->enable($u);
        $ch = $this->challenge();
        $this->postJson('/api/login/two-factor', ['challenge' => $ch, 'code' => Totp::code($secret, time() + 30)])
            ->assertOk()->assertJsonStructure(['token']);
    }

    public function test_wrong_code_and_expired_challenge_are_refused(): void
    {
        $u = $this->member();
        $this->enable($u);
        $this->postJson('/api/login/two-factor', ['challenge' => $this->challenge(), 'code' => 'abcdef'])->assertStatus(422);
        $old = Crypt::encryptString(json_encode(['id' => $u->id, 'exp' => time() - 10]));
        $this->postJson('/api/login/two-factor', ['challenge' => $old, 'code' => '123456'])->assertStatus(422);
        $this->postJson('/api/login/two-factor', ['challenge' => 'garbage', 'code' => '123456'])->assertStatus(422);
    }

    public function test_a_code_cannot_be_used_twice(): void
    {
        $u = $this->member();
        [$secret] = $this->enable($u);
        $code = Totp::code($secret, time() + 30);
        $this->postJson('/api/login/two-factor', ['challenge' => $this->challenge(), 'code' => $code])->assertOk();
        $this->postJson('/api/login/two-factor', ['challenge' => $this->challenge(), 'code' => $code])->assertStatus(422);
    }

    public function test_recovery_code_works_exactly_once(): void
    {
        $u = $this->member();
        [, $codes] = $this->enable($u);
        $this->postJson('/api/login/two-factor', ['challenge' => $this->challenge(), 'recovery_code' => $codes[0]])->assertOk()->assertJsonStructure(['token']);
        $this->postJson('/api/login/two-factor', ['challenge' => $this->challenge(), 'recovery_code' => $codes[0]])->assertStatus(422);
        $this->postJson('/api/login/two-factor', ['challenge' => $this->challenge(), 'recovery_code' => $codes[1]])->assertOk();
    }

    public function test_owner_is_locked_out_of_admin_routes_until_2fa_is_on_when_required(): void
    {
        config(['lumibook.require_admin_2fa' => true]);
        $admin = User::where('role', 'admin')->first();
        $this->actingAs($admin, 'sanctum')->getJson('/api/admin/stats')->assertStatus(403);
        $this->enable($admin);
        $this->actingAs($admin->fresh(), 'sanctum')->getJson('/api/admin/stats')->assertOk();
    }

    public function test_disabling_needs_password_and_a_fresh_code(): void
    {
        $u = $this->member();
        [$secret] = $this->enable($u);
        $code = Totp::code($secret, time() + 30);
        $this->actingAs($u, 'sanctum')->postJson('/api/2fa/disable', ['password' => 'wrong', 'code' => $code])->assertStatus(422);
        $this->actingAs($u, 'sanctum')->postJson('/api/2fa/disable', ['password' => 'Secret!12345', 'code' => $code])->assertOk();
        $this->assertFalse($u->fresh()->hasTwoFactor());
        $this->postJson('/api/login', ['email' => 'tf@test.dev', 'password' => 'Secret!12345'])->assertOk()->assertJsonStructure(['token']);
    }
}
