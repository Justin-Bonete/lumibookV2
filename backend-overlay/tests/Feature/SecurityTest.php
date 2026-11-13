<?php
namespace Tests\Feature;

use App\Models\{DownloadEvent, Entitlement, Plan, Title, User};
use Database\Seeders\LumibookSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Str;
use Tests\TestCase;

class SecurityTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(LumibookSeeder::class);
    }

    public function test_every_admin_route_rejects_guests_and_members(): void
    {
        $member = User::factory()->create(['role' => 'member', 'status' => 'active']);
        $checked = 0;
        foreach (Route::getRoutes() as $route) {
            if (! str_starts_with($route->uri(), 'api/admin')) continue;
            $uri = '/' . preg_replace('/\{[^}]+\}/', '1', $route->uri());
            foreach (array_diff($route->methods(), ['HEAD']) as $method) {
                $this->json($method, $uri)->assertStatus(401);
                $this->actingAs($member, 'sanctum')->json($method, $uri)->assertStatus(403);
                $checked++;
            }
        }
        $this->assertGreaterThan(10, $checked); // guard against the loop silently matching nothing
    }

    public function test_api_responses_carry_security_headers(): void
    {
        $this->getJson('/api/health')->assertOk()
            ->assertHeader('X-Content-Type-Options', 'nosniff')->assertHeader('X-Frame-Options', 'DENY')
            ->assertHeader('Referrer-Policy', 'no-referrer');
    }

    public function test_login_is_rate_limited_per_account(): void
    {
        User::factory()->create(['email' => 'victim@test.dev']);
        for ($i = 0; $i < 5; $i++) $this->postJson('/api/login', ['email' => 'victim@test.dev', 'password' => 'wrong'])->assertStatus(422);
        $this->postJson('/api/login', ['email' => 'victim@test.dev', 'password' => 'wrong'])->assertStatus(429);
    }

    public function test_unlimited_plan_still_has_an_hourly_fair_use_cap(): void
    {
        config(['lumibook.fair_use_per_hour' => 5]);
        $u = User::factory()->create(['role' => 'member', 'status' => 'active']);
        Entitlement::create(['user_id' => $u->id, 'plan_id' => Plan::where('code', 'all')->value('id'), 'status' => 'active']);
        $t = Title::create(['slug' => 'x', 'title' => 'X', 'author' => 'A', 'category' => 'C', 'private_file_key' => 'pdfs/x.pdf', 'rights_status' => 'cleared', 'visibility' => 'published']);
        for ($i = 0; $i < 5; $i++) DownloadEvent::create(['user_id' => $u->id, 'title_id' => $t->id, 'request_id' => (string) Str::uuid(), 'status' => 'completed']);
        $this->actingAs($u, 'sanctum')->postJson("/api/titles/{$t->id}/download")->assertStatus(429);
    }

    public function test_suspending_a_user_revokes_their_tokens(): void
    {
        $admin = User::where('role', 'admin')->first();
        $u = User::factory()->create(['role' => 'member', 'status' => 'active']);
        $u->createToken('web');
        $this->actingAs($admin, 'sanctum')->putJson("/api/admin/users/{$u->id}/status", ['status' => 'suspended'])->assertOk();
        $this->assertSame(0, $u->tokens()->count());
    }

    public function test_owner_cannot_be_suspended(): void
    {
        $admin = User::where('role', 'admin')->first();
        $this->actingAs($admin, 'sanctum')->putJson("/api/admin/users/{$admin->id}/status", ['status' => 'suspended'])->assertStatus(422);
    }

    public function test_public_signup_can_never_create_an_admin(): void
    {
        $this->postJson('/api/register', ['name' => 'Eve', 'email' => 'eve@test.dev', 'role' => 'admin', 'status' => 'active',
            'password' => 'Secret!12345', 'password_confirmation' => 'Secret!12345'])->assertCreated();
        $this->assertSame('member', User::where('email', 'eve@test.dev')->value('role'));
    }
}
