import { DragEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { api, upload, useFetch } from '../../api';
import { Icon } from '../../icons';
import { coverFromPdf } from '../../pdfCover';
import { Head, Status, size } from '../../ui';
import type { AdminTitle, Paged } from '../../types';

const IMG = 'image/jpeg,image/png,image/webp';
/** "Advanced Hunting_ Detect APTs.pdf" -> "Advanced Hunting: Detect APTs" */
const cleanName = (f: string) => f.replace(/\.pdf$/i, '').replace(/_\s/g, ': ').replace(/_+/g, ' ').replace(/\s+/g, ' ').trim();

function useObjectUrl(file: File | null) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    if (!file) { setUrl(''); return; }
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return url;
}
function useEscape(fn: () => void) {
  useEffect(() => { const h = (e: KeyboardEvent) => { if (e.key === 'Escape') fn(); }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, [fn]);
}

/** Click or drag a file onto it. */
function DropZone({ accept, label, hint, file, preview, onFile }: { accept: string; label: string; hint: string; file?: File | null; preview?: string; onFile(f: File): void }) {
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const drop = (e: DragEvent) => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files?.[0]; if (f) onFile(f); };
  return (
    <div className={`drop${over ? ' over' : ''}${file ? ' has' : ''}`} role="button" tabIndex={0}
      onClick={() => input.current?.click()} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.current?.click(); } }}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={drop}>
      {preview ? <img src={preview} alt="" /> : <span className="plusbox"><Icon name="plus" /></span>}
      <div><b>{file ? file.name : label}</b><small>{file ? size(file.size) : hint}</small></div>
      <input ref={input} type="file" accept={accept} hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }} />
    </div>
  );
}

function AddDrawer({ categories, onClose, onDone }: { categories: string[]; onClose(): void; onDone(msg: string): void }) {
  const [pdf, setPdf] = useState<File | null>(null);
  const [cover, setCover] = useState<File | null>(null);
  const [f, setF] = useState({ title: '', author: '', category: '', description: '' });
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const coverUrl = useObjectUrl(cover);
  useEscape(onClose);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  async function choosePdf(file: File) {
    setPdf(file); setError('');
    setF((p) => ({ ...p, title: p.title || cleanName(file.name) }));
    if (!cover) {
      setNote('Making a cover from page 1…');
      try { setCover(await coverFromPdf(file)); setNote('Cover made from page 1. Choose a different image if you prefer.'); }
      catch { setNote('Could not make a cover automatically. Choose an image instead.'); }
    }
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!pdf) { setError('Choose the PDF first.'); return; }
    const fd = new FormData();
    fd.append('title', f.title); fd.append('author', f.author); fd.append('category', f.category);
    if (f.description) fd.append('description', f.description);
    fd.append('file', pdf);
    if (cover) fd.append('cover', cover);
    setBusy(true); setError('');
    try { await upload('/admin/titles', fd); onDone('Added as a draft. Mark rights cleared, then publish.'); }
    catch (err) { setError((err as Error).message); setBusy(false); }
  }
  return (
    <>
      <div className="scrim on" onClick={onClose} />
      <form className="drawer" onSubmit={submit} role="dialog" aria-label="Add title">
        <div className="row between"><h2>Add a title</h2><button type="button" className="btn" onClick={onClose}>Close</button></div>
        <div className="sec">1. The PDF</div>
        <DropZone accept="application/pdf" label="Choose or drop the PDF" hint="Up to 100 MB" file={pdf} onFile={choosePdf} />
        <div className="sec">2. The cover</div>
        <DropZone accept={IMG} label="Choose or drop a cover image" hint="JPG, PNG or WebP, up to 2 MB" file={cover} preview={coverUrl} onFile={(c) => { setCover(c); setNote(''); }} />
        {note && <p className="note">{note}</p>}
        <div className="sec">3. Details</div>
        <div className="form">
          <label>Title<input required maxLength={200} value={f.title} onChange={set('title')} /></label>
          <label>Author <small>(optional)</small><input maxLength={150} value={f.author} onChange={set('author')} /></label>
          <label>Category<input required maxLength={80} list="cats" value={f.category} onChange={set('category')} placeholder="e.g. Cybersecurity" /></label>
          <datalist id="cats">{categories.map((c) => <option key={c} value={c} />)}</datalist>
          <label>Description <small>(optional)</small><textarea rows={4} value={f.description} onChange={set('description')} /></label>
        </div>
        {error && <p className="err" role="alert">{error}</p>}
        <button className="btn n lg w" disabled={busy}>{busy ? 'Uploading… large files can take a minute' : 'Upload title'}</button>
      </form>
    </>
  );
}

function EditDrawer({ t, categories, onClose, onChanged, onDeleted }: { t: AdminTitle; categories: string[]; onClose(): void; onChanged(): void; onDeleted(): void }) {
  const [f, setF] = useState({ title: t.title, author: t.author === 'Unknown' ? '' : t.author, category: t.category, description: t.description ?? '', rights_status: t.rights_status, visibility: t.visibility });
  const [msg, setMsg] = useState<{ text: string; bad: boolean } | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState('');
  useEscape(onClose);
  const say = (text: string, bad = false) => setMsg({ text, bad });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value } as typeof f);

  async function save(e: FormEvent) {
    e.preventDefault(); setBusy('save'); setMsg(null);
    try { await api(`/admin/titles/${t.id}`, { method: 'PUT', body: f }); say('Saved.'); onChanged(); }
    catch (err) { say((err as Error).message, true); } // e.g. "Clear the rights before publishing."
    finally { setBusy(''); }
  }
  async function replace(part: 'cover' | 'file', file: File) {
    const fd = new FormData(); fd.append(part, file);
    setBusy(part); setMsg(null);
    try { await upload(`/admin/titles/${t.id}/${part}`, fd); say(part === 'cover' ? 'Cover replaced.' : 'PDF replaced.'); onChanged(); }
    catch (err) { say((err as Error).message, true); }
    finally { setBusy(''); }
  }
  async function remove() {
    setBusy('delete');
    try { await api(`/admin/titles/${t.id}`, { method: 'DELETE' }); onDeleted(); }
    catch (err) { say((err as Error).message, true); setBusy(''); }
  }
  return (
    <>
      <div className="scrim on" onClick={onClose} />
      <div className="drawer" role="dialog" aria-label="Edit title">
        <div className="row between"><h2>Edit title</h2><button className="btn" onClick={onClose}>Close</button></div>
        {msg && <p className={msg.bad ? 'err' : 'ok-text'} role="status">{msg.text}</p>}

        <div className="sec">Cover</div>
        <DropZone accept={IMG} label={busy === 'cover' ? 'Uploading…' : 'Replace cover image'} hint="Click or drop. JPG, PNG or WebP, up to 2 MB" preview={t.cover_url ?? undefined} onFile={(c) => replace('cover', c)} />

        <form onSubmit={save}>
          <div className="sec">Details</div>
          <div className="form">
            <label>Title<input required maxLength={200} value={f.title} onChange={set('title')} /></label>
            <label>Author <small>(optional)</small><input maxLength={150} value={f.author} onChange={set('author')} /></label>
            <label>Category<input required maxLength={80} list="cats2" value={f.category} onChange={set('category')} /></label>
            <datalist id="cats2">{categories.map((c) => <option key={c} value={c} />)}</datalist>
            <label>Description<textarea rows={4} value={f.description} onChange={set('description')} /></label>
            <div className="two2">
              <label>Rights<select value={f.rights_status} onChange={set('rights_status')}><option value="pending">Pending</option><option value="cleared">Cleared</option><option value="blocked">Blocked</option></select></label>
              <label>Visibility<select value={f.visibility} onChange={set('visibility')}><option value="draft">Draft (hidden)</option><option value="published">Published</option></select></label>
            </div>
          </div>
          <button className="btn n w" disabled={busy === 'save'}>{busy === 'save' ? 'Saving…' : 'Save changes'}</button>
        </form>

        <div className="sec">PDF file</div>
        <DropZone accept="application/pdf" label={busy === 'file' ? 'Uploading…' : 'Replace the PDF'} hint={`Current file: ${size(t.file_size)}`} onFile={(p) => replace('file', p)} />

        <div className="sec">Danger zone</div>
        <div className="danger">
          {!confirm
            ? <><p>Deleting removes the book from the library and plans and erases its files. Past download history keeps its name.</p><button className="btn d" onClick={() => setConfirm(true)}><Icon name="ban" size={16} /> Delete this title</button></>
            : <><p><b>Delete “{t.title}” permanently?</b> This cannot be undone.</p>
                <div className="row"><button className="btn d" onClick={remove} disabled={busy === 'delete'}>{busy === 'delete' ? 'Deleting…' : 'Yes, delete'}</button><button className="btn" onClick={() => setConfirm(false)}>Cancel</button></div></>}
        </div>
      </div>
    </>
  );
}

export default function Titles() {
  const { data, error, loading, reload } = useFetch<Paged<AdminTitle>>('/admin/titles?per_page=200');
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'all' | 'published' | 'draft' | 'review'>('all');
  const [adding, setAdding] = useState(false);
  const [selId, setSelId] = useState<number | null>(null);
  const [flash, setFlash] = useState<{ text: string; bad: boolean } | null>(null);

  const all = data?.data ?? [];
  const categories = useMemo(() => [...new Set(all.map((t) => t.category))].sort(), [all]);
  const rows = useMemo(() => all.filter((t) =>
    (filter === 'all' || (filter === 'published' && t.visibility === 'published') || (filter === 'draft' && t.visibility === 'draft') || (filter === 'review' && t.rights_status !== 'cleared'))
    && `${t.title} ${t.author} ${t.category}`.toLowerCase().includes(q.toLowerCase())), [all, q, filter]);
  const sel = all.find((t) => t.id === selId) ?? null;
  const counts = { all: all.length, published: all.filter((t) => t.visibility === 'published').length, draft: all.filter((t) => t.visibility === 'draft').length, review: all.filter((t) => t.rights_status !== 'cleared').length };

  async function patch(t: AdminTitle, body: Partial<AdminTitle>) {
    setFlash(null);
    try { await api(`/admin/titles/${t.id}`, { method: 'PUT', body }); reload(); }
    catch (e) { setFlash({ text: (e as Error).message, bad: true }); }
  }
  return (
    <>
      <div className="row between pagehead">
        <Head title="Titles" sub="Add books, edit their details, and control who can see them." />
        <button className="btn n" onClick={() => setAdding(true)}><Icon name="plus" size={16} /> Add title</button>
      </div>
      {flash && <p className={flash.bad ? 'err' : 'ok-text'} role="status">{flash.text}</p>}
      <div className="tools">
        <input placeholder="Search title, author or category…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search titles" />
      </div>
      <div className="chips">
        {([['all', 'All'], ['published', 'Published'], ['draft', 'Drafts'], ['review', 'Rights not cleared']] as const).map(([k, l]) => (
          <button key={k} className={`chip${filter === k ? ' on' : ''}`} onClick={() => setFilter(k)}>{l} · {counts[k]}</button>
        ))}
      </div>
      <Status loading={loading} error={error} />
      {data && (
        <div className="tw"><table>
          <thead><tr><th>Title</th><th>Category</th><th>In plans</th><th>Status</th><th /></tr></thead>
          <tbody>{rows.map((t) => (
            <tr key={t.id}>
              <td className="tcell">
                {t.cover_url ? <img className="thumb" src={t.cover_url} alt="" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} /> : <span className="thumb ph"><Icon name="book" size={16} /></span>}
                <span className="tname"><b>{t.title}</b><small>{t.author}{t.file_size ? ` · ${size(t.file_size)}` : ''}</small></span>
              </td>
              <td>{t.category}</td>
              <td>{t.plans_count}</td>
              <td><div className="row">
                <span className={`pill ${t.rights_status === 'cleared' ? 'ok' : t.rights_status === 'pending' ? 'warn' : 'bad'}`}>{t.rights_status === 'cleared' ? 'rights cleared' : `rights ${t.rights_status}`}</span>
                <span className={`pill ${t.visibility === 'published' ? 'ok' : 'free'}`}>{t.visibility}</span>
              </div></td>
              <td><div className="row end">
                <button className="btn sm" onClick={() => patch(t, { visibility: t.visibility === 'published' ? 'draft' : 'published' })}>{t.visibility === 'published' ? 'Unpublish' : 'Publish'}</button>
                <button className="btn sm n" onClick={() => setSelId(t.id)}>Edit</button>
              </div></td>
            </tr>))}
            {!rows.length && <tr><td colSpan={5}>{all.length ? 'No titles match.' : 'No titles yet. Click “Add title” to upload your first book.'}</td></tr>}</tbody>
        </table></div>
      )}
      {adding && <AddDrawer categories={categories} onClose={() => setAdding(false)} onDone={(text) => { setAdding(false); setFlash({ text, bad: false }); reload(); }} />}
      {sel && <EditDrawer key={sel.id} t={sel} categories={categories} onClose={() => setSelId(null)} onChanged={reload} onDeleted={() => { setSelId(null); setFlash({ text: 'Title deleted.', bad: false }); reload(); }} />}
    </>
  );
}
