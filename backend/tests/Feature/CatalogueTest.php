<?php
namespace Tests\Feature;

use App\Models\{Entitlement, Plan, Title, User};
use Database\Seeders\LumibookSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class CatalogueTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(LumibookSeeder::class);
    }

    private function title(string $name, string $cat, array $plans = [], array $over = []): Title
    {
        $t = Title::create($over + ['slug' => str($name)->slug(), 'title' => $name, 'author' => 'Ada Lovelace', 'category' => $cat,
            'private_file_key' => "pdfs/$name.pdf", 'rights_status' => 'cleared', 'visibility' => 'published']);
        foreach ($plans as $c) Plan::where('code', $c)->first()->titles()->attach($t->id);
        return $t;
    }

    private function member(string $plan = 'free'): User
    {
        $u = User::factory()->create(['role' => 'member', 'status' => 'active']);
        if ($plan !== 'free') Entitlement::create(['user_id' => $u->id, 'plan_id' => Plan::where('code', $plan)->value('id'), 'status' => 'active']);
        return $u;
    }

    private function admin(): User { return User::where('role', 'admin')->first(); }

    public function test_library_search_and_category_filter_and_unlocked_flag(): void
    {
        $this->title('Learning Maths', 'Science', ['free']);
        $this->title('Premium Physics', 'Science', ['premium']);
        $this->title('Cooking Basics', 'Food', ['free']);
        $this->title('Hidden Draft', 'Science', [], ['visibility' => 'draft']);
        $u = $this->member('free');

        $r = $this->actingAs($u, 'sanctum')->getJson('/api/library?category=Science')->assertOk();
        $this->assertCount(2, $r->json('data')); // draft excluded
        $this->assertSame([true, false], collect($r->json('data'))->sortBy('title')->pluck('unlocked')->values()->all());

        $this->actingAs($u, 'sanctum')->getJson('/api/library?q=cooking')->assertOk()->assertJsonCount(1, 'data');
        $this->actingAs($u, 'sanctum')->getJson('/api/library?access=locked')->assertOk()->assertJsonCount(1, 'data');
        $this->actingAs($u, 'sanctum')->getJson('/api/library?access=unlocked')->assertOk()->assertJsonCount(2, 'data');
    }

    public function test_categories_count_only_published_cleared_titles(): void
    {
        $this->title('A', 'Science', ['free']);
        $this->title('B', 'Science', [], ['rights_status' => 'pending']);
        $res = $this->actingAs($this->member(), 'sanctum')->getJson('/api/categories')->assertOk();
        $this->assertSame(1, (int) $res->json('0.total'));
    }

    public function test_detail_shows_required_plan_for_locked_title_and_hides_storage_path(): void
    {
        $t = $this->title('Premium Only', 'Science', ['premium']);
        $res = $this->actingAs($this->member('free'), 'sanctum')->getJson("/api/titles/{$t->id}")->assertOk();
        $this->assertFalse($res->json('unlocked'));
        $this->assertSame('premium', $res->json('required_plan.code'));
        $this->assertArrayNotHasKey('private_file_key', $res->json());
        $this->actingAs($this->member('premium'), 'sanctum')->getJson("/api/titles/{$t->id}")->assertJsonPath('unlocked', true);
    }

    public function test_admin_upload_creates_private_draft_pending_title(): void
    {
        Storage::fake('local'); Storage::fake('public');
        $res = $this->actingAs($this->admin(), 'sanctum')->post('/api/admin/titles', [
            'title' => 'New Book', 'author' => 'Z', 'category' => 'Science',
            'file' => UploadedFile::fake()->createWithContent('b.pdf', "%PDF-1.4\n%fake"),
            'cover' => UploadedFile::fake()->image('c.jpg'),
        ], ['Accept' => 'application/json'])->assertCreated();

        $t = Title::find($res->json('id'));
        $this->assertSame('draft', $t->visibility);
        $this->assertSame('pending', $t->rights_status);
        Storage::disk('local')->assertExists($t->private_file_key);
        Storage::disk('public')->assertExists($t->cover_path);
        $this->assertNotNull($res->json('cover_url'));
        $this->assertArrayNotHasKey('private_file_key', $res->json());
    }

    public function test_upload_rejects_non_pdf_and_fake_pdf_extension(): void
    {
        Storage::fake('local');
        $base = ['title' => 'X', 'author' => 'Z', 'category' => 'S'];
        $h = ['Accept' => 'application/json'];
        $this->actingAs($this->admin(), 'sanctum')->post('/api/admin/titles', $base + ['file' => UploadedFile::fake()->createWithContent('b.pdf', 'not a pdf at all')], $h)->assertStatus(422);
        $this->actingAs($this->admin(), 'sanctum')->post('/api/admin/titles', $base + ['file' => UploadedFile::fake()->create('b.exe', 10)], $h)->assertStatus(422);
    }

    public function test_member_cannot_upload_and_cannot_publish_uncleared(): void
    {
        $h = ['Accept' => 'application/json'];
        $this->actingAs($this->member(), 'sanctum')->post('/api/admin/titles', [], $h)->assertStatus(403);

        $t = $this->title('Pending', 'S', [], ['rights_status' => 'pending', 'visibility' => 'draft']);
        $this->actingAs($this->admin(), 'sanctum')->putJson("/api/admin/titles/{$t->id}", ['visibility' => 'published'])->assertStatus(422);
        $this->actingAs($this->admin(), 'sanctum')->putJson("/api/admin/titles/{$t->id}", ['rights_status' => 'cleared', 'visibility' => 'published'])->assertOk();
    }

    public function test_plan_collection_cannot_exceed_ebook_limit(): void
    {
        $free = Plan::where('code', 'free')->first(); // limit 5
        $ids = collect(range(1, 6))->map(fn ($i) => $this->title("T$i", 'S')->id)->all();
        $this->actingAs($this->admin(), 'sanctum')->putJson("/api/admin/plans/{$free->id}/titles", ['title_ids' => $ids])->assertStatus(422);
        $this->actingAs($this->admin(), 'sanctum')->putJson("/api/admin/plans/{$free->id}/titles", ['title_ids' => array_slice($ids, 0, 5)])->assertOk();
        $this->actingAs($this->admin(), 'sanctum')->getJson("/api/admin/plans/{$free->id}")->assertJsonCount(5, 'title_ids');
    }
}
