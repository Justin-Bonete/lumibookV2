import { FormEvent, ReactNode, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
<<<<<<< HEAD
import { BrandPanel } from '../ui';

function Shell({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  return <div className="auth"><BrandPanel /><div className="authform"><div className="lc"><h1>{title}</h1>{sub && <p className="muted">{sub}</p>}{children}</div></div></div>;
=======

function Shell({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  return <div className="login"><div className="lc"><div className="logo dark">LUMIBOOK</div><h1>{title}</h1>{sub && <p className="muted">{sub}</p>}{children}</div></div>;
>>>>>>> 1a41738b43c9d03c4732a7bc1df60272dac1c62a
}

export function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState({ name: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError('');
    try { await register(f.name, f.email, f.password, f.confirm); nav('/'); }
    catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  }
  return (
    <Shell title="Create your account" sub="Start free. Upgrade any time.">
      <form onSubmit={submit}>
        <label>Name<input required value={f.name} onChange={set('name')} autoComplete="name" /></label>
        <label>Email<input type="email" required value={f.email} onChange={set('email')} autoComplete="email" /></label>
        <label>Password<input type="password" required minLength={10} value={f.password} onChange={set('password')} autoComplete="new-password" /></label>
        <small className="hint">At least 10 characters, with upper and lower case letters and a number.</small>
        <label>Confirm password<input type="password" required value={f.confirm} onChange={set('confirm')} autoComplete="new-password" /></label>
        {error && <p className="err" role="alert">{error}</p>}
        <button className="btn n w" disabled={busy}>{busy ? 'Creating…' : 'Create account'}</button>
        <p className="alt">By signing up you agree to the <Link to="/terms">Terms</Link> and <Link to="/privacy">Privacy Policy</Link>.</p>
        <p className="alt">Already have an account? <Link to="/login">Sign in</Link></p>
      </form>
    </Shell>
  );
}

export function Forgot() {
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  async function submit(e: FormEvent) {
    e.preventDefault(); setError('');
    try { setMsg((await api<{ message: string }>('/forgot-password', { method: 'POST', body: { email } })).message); }
    catch (err) { setError((err as Error).message); }
  }
  return (
    <Shell title="Reset your password" sub="Enter your email and we will send you a reset link.">
      <form onSubmit={submit}>
        <label>Email<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        {msg && <p className="ok-text" role="status">{msg}</p>}{error && <p className="err" role="alert">{error}</p>}
        <button className="btn n w">Send reset link</button>
        <p className="alt"><Link to="/login">Back to sign in</Link></p>
      </form>
    </Shell>
  );
}

export function Reset() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [error, setError] = useState('');
  async function submit(e: FormEvent) {
    e.preventDefault(); setError('');
    try {
      await api('/reset-password', { method: 'POST', body: { token: params.get('token'), email: params.get('email'), password: pw, password_confirmation: pw2 } });
      nav('/login?reset=1');
    } catch (err) { setError((err as Error).message); }
  }
  return (
    <Shell title="Choose a new password">
      <form onSubmit={submit}>
        <label>New password<input type="password" required minLength={10} value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" /></label>
        <label>Confirm password<input type="password" required value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" /></label>
        {error && <p className="err" role="alert">{error}</p>}
        <button className="btn n w">Update password</button>
      </form>
    </Shell>
  );
}
