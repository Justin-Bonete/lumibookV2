<?php
namespace Tests\Feature;

use App\Models\{DownloadEvent, Entitlement, Plan, Title, User};
use Database\Seeders\LumibookSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\TestCase;

class AccessRulesTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(LumibookSeeder::class); // plans + owner account
    }

    private function title(string $slug, array $plans, array $over = []): Title
    {
        $t = Title::create($over + ['slug' => $slug, 'title' => $slug, 'author' => 'A', 'category' => 'X',
            'private_file_key' => "pdfs/$slug.pdf", 'rights_status' => 'cleared', 'visibility' => 'published']);
        foreach ($plans as $code) Plan::where('code', $code)->first()->titles()->attach($t->id);
        return $t;
    }

    private function member(string $plan = 'free'): User
    {
        $u = User::factory()->create(['role' => 'member', 'status' => 'active']);
        if ($plan !== 'free') {
            Entitlement::create(['user_id' => $u->id, 'plan_id' => Plan::where('code', $plan)->value('id'), 'status' => 'active']);
        }
        return $u;
    }

    private function dl(User $u, Title $t)
    {
        return $this->actingAs($u, 'sanctum')->postJson("/api/titles/{$t->id}/download");
    }

    public function test_free_member_cannot_download_a_premium_title(): void
    {
        $t = $this->title('premium-only', ['premium']);
        $this->dl($this->member('free'), $t)->assertStatus(403);
    }

    public function test_free_plan_allows_three_downloads_per_month_then_blocks(): void
    {
        $u = $this->member('free');
        $t = $this->title('free-book', ['free']);
        for ($i = 0; $i < 3; $i++) $this->dl($u, $t)->assertOk()->assertJsonStructure(['url']);
        $this->dl($u, $t)->assertStatus(429);
    }

    public function test_premium_lifetime_limit_of_ten_is_enforced(): void
    {
        $u = $this->member('premium');
        $t = $this->title('prem', ['premium']);
        for ($i = 0; $i < 10; $i++) {
            DownloadEvent::create(['user_id' => $u->id, 'title_id' => $t->id, 'request_id' => (string) Str::uuid(), 'status' => 'completed']);
        }
        $this->dl($u, $t)->assertStatus(429);
    }

    public function test_all_access_has_no_download_cap(): void
    {
        $u = $this->member('all');
        $t = $this->title('any', []); // not in any plan_titles: All Access still gets it
        for ($i = 0; $i < 40; $i++) {
            DownloadEvent::create(['user_id' => $u->id, 'title_id' => $t->id, 'request_id' => (string) Str::uuid(),
                'status' => 'completed', 'created_at' => now()->subDays(2)]); // old enough to be outside the fair-use hour
        }
        $this->dl($u, $t)->assertOk();
    }

    public function test_unpublished_or_uncleared_titles_are_not_downloadable(): void
    {
        $u = $this->member('all');
        $this->dl($u, $this->title('draft', [], ['visibility' => 'draft']))->assertStatus(404);
        $this->dl($u, $this->title('blocked', [], ['rights_status' => 'blocked']))->assertStatus(404);
    }

    public function test_member_cannot_reach_admin_routes_but_admin_can(): void
    {
        $this->actingAs($this->member(), 'sanctum')->getJson('/api/admin/users')->assertStatus(403);
        $admin = User::where('role', 'admin')->first();
        $this->actingAs($admin, 'sanctum')->getJson('/api/admin/users')->assertOk();
    }

    public function test_suspended_member_is_blocked(): void
    {
        $u = $this->member();
        $u->update(['status' => 'suspended']);
        $this->actingAs($u, 'sanctum')->getJson('/api/me')->assertStatus(403);
    }

    public function test_admin_plan_change_unlocks_titles_and_is_audited(): void
    {
        $admin = User::where('role', 'admin')->first();
        $u = $this->member('free');
        $t = $this->title('prem-book', ['premium']);
        $this->dl($u, $t)->assertStatus(403);

        $this->actingAs($admin, 'sanctum')->putJson("/api/admin/users/{$u->id}/plan", ['plan_code' => 'premium'])->assertOk();

        $this->dl($u->fresh(), $t)->assertOk();
        $this->assertDatabaseHas('audit_logs', ['action' => 'plan.assigned', 'entity_id' => $u->id]);
    }

    public function test_signed_link_serves_the_pdf_and_marks_completed(): void
    {
        Storage::fake('local');
        $u = $this->member('free');
        $t = $this->title('real-file', ['free']);
        Storage::disk('local')->put($t->private_file_key, '%PDF-1.4');
        $url = $this->dl($u, $t)->json('url');
        $this->get($url)->assertOk();
        $this->assertDatabaseHas('download_events', ['user_id' => $u->id, 'status' => 'completed']);
        $this->get($url)->assertStatus(410); // single-use
    }

    public function test_tampered_link_is_rejected(): void
    {
        $u = $this->member('free');
        $t = $this->title('tamper', ['free']);
        $e = DownloadEvent::create(['user_id' => $u->id, 'title_id' => $t->id, 'request_id' => (string) Str::uuid(), 'status' => 'reserved']);
        $this->get("/api/files/{$e->id}")->assertStatus(403); // no signature
    }

    public function test_login_works_without_a_session_and_returns_token(): void
    {
        User::factory()->create(['email' => 'm@test.dev', 'password' => 'Secret!12345', 'role' => 'member']);
        $this->postJson('/api/login', ['email' => 'm@test.dev', 'password' => 'Secret!12345'])->assertOk()->assertJsonStructure(['token']);
        $this->postJson('/api/login', ['email' => 'm@test.dev', 'password' => 'wrong'])->assertStatus(422);
    }
}
