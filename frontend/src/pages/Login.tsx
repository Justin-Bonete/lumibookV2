import { FormEvent, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth';
<<<<<<< HEAD
import { BrandPanel } from '../ui';
=======
>>>>>>> 1a41738b43c9d03c4732a7bc1df60272dac1c62a

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError('');
    try { await login(email, password); nav('/'); }
    catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  }
  return (
<<<<<<< HEAD
    <div className="auth">
      <BrandPanel />
      <div className="authform">
        <form className="lc" onSubmit={submit}>
          <h1>Welcome back</h1>
          <p className="muted">Sign in to your LUMIBOOK account.</p>
          {params.get('verified') && <p className="ok-text" role="status">Email verified. Please sign in.</p>}
          {params.get('reset') && <p className="ok-text" role="status">Password updated. Please sign in.</p>}
          <label>Email<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" placeholder="you@example.com" /></label>
          <label>Password<input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" placeholder="Your password" /></label>
          {error && <p className="err" role="alert">{error}</p>}
          <button className="btn n w lg" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
          <p className="alt"><Link to="/forgot-password">Forgot password?</Link> · <Link to="/register">Create account</Link></p>
        </form>
      </div>
=======
    <div className="login">
      <form className="lc" onSubmit={submit}>
        <div className="logo dark">LUMIBOOK</div>
        <h1>Welcome back.</h1>
        {params.get('verified') && <p className="ok-text" role="status">Email verified. Please sign in.</p>}
        {params.get('reset') && <p className="ok-text" role="status">Password updated. Please sign in.</p>}
        <label>Email<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" /></label>
        <label>Password<input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" /></label>
        {error && <p className="err" role="alert">{error}</p>}
        <button className="btn n w" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        <p className="alt"><Link to="/forgot-password">Forgot password?</Link> · <Link to="/register">Create account</Link></p>
      </form>
>>>>>>> 1a41738b43c9d03c4732a7bc1df60272dac1c62a
    </div>
  );
}
