<?php
namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\DownloadEvent;
use App\Models\Plan;
use App\Models\Title;
use App\Services\EntitlementService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;

class MemberController extends Controller
{
    public function __construct(private EntitlementService $svc) {}

    private function catalogue()
    {
        return Title::where('visibility', 'published')->where('rights_status', 'cleared');
    }

    public function me(Request $r)
    {
        return ['user' => $r->user()->only('id', 'name', 'email', 'role') + ['email_verified' => $r->user()->hasVerifiedEmail(), 'two_factor_enabled' => $r->user()->hasTwoFactor()]] + $this->svc->summary($r->user());
    }

    public function categories()
    {
        return $this->catalogue()->selectRaw('category, COUNT(*) as total')->groupBy('category')->orderBy('category')->get();
    }

    /** Searchable catalogue; each title flagged unlocked/locked for THIS member's plan. */
    public function library(Request $r)
    {
        [$plan] = $this->svc->current($r->user());
        $open = $this->svc->titlesFor($plan)->pluck('id')->all();
        $like = $r->q ? '%' . str_replace(['%', '_'], '', mb_strtolower($r->q)) . '%' : null;

        $page = $this->catalogue()
            ->when($like, fn ($b) => $b->where(fn ($w) => $w->whereRaw('LOWER(title) LIKE ?', [$like])->orWhereRaw('LOWER(author) LIKE ?', [$like])))
            ->when($r->category, fn ($b, $c) => $b->where('category', $c))
            ->when($r->access === 'unlocked', fn ($b) => $b->whereIn('id', $open))
            ->when($r->access === 'locked', fn ($b) => $b->whereNotIn('id', $open))
            ->orderBy($r->sort === 'newest' ? 'created_at' : 'title', $r->sort === 'newest' ? 'desc' : 'asc')
            ->paginate(12);

        $page->getCollection()->transform(fn ($t) => $t->toArray() + ['unlocked' => in_array($t->id, $open)]);
        return $page;
    }

    /** Book detail: unlocked flag, the cheapest plan that includes it, and related titles. */
    public function show(Request $r, Title $title)
    {
        abort_unless($title->visibility === 'published' && $title->rights_status === 'cleared', 404);
        [$plan] = $this->svc->current($r->user());
        $unlocked = $this->svc->titlesFor($plan)->whereKey($title->id)->exists();
        $needs = $unlocked ? null : Plan::orderBy('tier')->get()
            ->first(fn ($p) => $p->ebook_limit === null || $p->titles()->whereKey($title->id)->exists())?->only('code', 'name');

        return $title->toArray() + [
            'unlocked' => $unlocked,
            'required_plan' => $needs,
            'related' => $this->catalogue()->where('category', $title->category)->whereKeyNot($title->id)->limit(4)->get(),
        ];
    }

    /** Public cover image (covers are not protected content). */
    public function cover(Title $title)
    {
        abort_unless($title->cover_path && Storage::disk('public')->exists($title->cover_path), 404);
        return Storage::disk('public')->response($title->cover_path, null, ['Cache-Control' => 'public, max-age=86400']);
    }

    public function history(Request $r)
    {
        return $r->user()->downloads()->with('title:id,title,author')->latest()->paginate(20);
    }

    /** Checks plan + quota, reserves one download, returns a 5-minute signed link. */
    public function download(Request $r, Title $title)
    {
        $event = $this->svc->reserve($r->user(), $title);
        return ['url' => URL::temporarySignedRoute('download.file', now()->addMinutes(5), ['event' => $event->id])];
    }

    /** Signed route (no bearer token needed): streams the private PDF. */
    public function file(DownloadEvent $event)
    {
        abort_unless($event->status === 'reserved', 410, 'Link already used.');
        $key = $event->title->private_file_key;
        if (! Storage::disk('local')->exists($key)) {
            $event->update(['status' => 'failed']); // failed downloads do not consume quota
            abort(404);
        }
        $event->update(['status' => 'completed', 'completed_at' => now()]);
        AuditLog::create(['actor_user_id' => $event->user_id, 'action' => 'download.completed',
            'entity_type' => 'Title', 'entity_id' => $event->title_id]);
        return Storage::disk('local')->download($key, $event->title->slug . '.pdf');
    }
}
