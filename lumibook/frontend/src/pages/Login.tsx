import { FormEvent, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth';
import { BrandPanel } from '../ui';

export default function Login() {
  const { login, verifyTwoFactor } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [challenge, setChallenge] = useState('');
  const [code, setCode] = useState('');
  const [recovery, setRecovery] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      if (challenge) { await verifyTwoFactor(challenge, code, recovery); nav('/'); }
      else { const r = await login(email, password); if (r.challenge) setChallenge(r.challenge); else nav('/'); }
    }
    catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  }
  return (
    <div className="auth">
      <BrandPanel />
      <div className="authform">
        <form className="lc" onSubmit={submit}>
          <h1>Welcome back</h1>
          <p className="muted">Sign in to your LUMIBOOK account.</p>
          {params.get('verified') && <p className="ok-text" role="status">Email verified. Please sign in.</p>}
          {params.get('reset') && <p className="ok-text" role="status">Password updated. Please sign in.</p>}
          {!challenge ? (
            <>
              <label>Email<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" placeholder="you@example.com" /></label>
              <label>Password<input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" placeholder="Your password" /></label>
            </>
          ) : (
            <>
              <p className="ok-text">Password accepted. One more step.</p>
              <label>{recovery ? 'Recovery code' : 'Authenticator code'}
                <input required autoFocus value={code} onChange={(e) => setCode(e.target.value)} autoComplete="one-time-code" inputMode={recovery ? 'text' : 'numeric'} placeholder={recovery ? 'xxxxx-xxxxx' : '6-digit code'} />
              </label>
              <p className="alt"><button type="button" className="linkbtn" onClick={() => { setRecovery(!recovery); setCode(''); }}>{recovery ? 'Use my authenticator app' : 'Use a recovery code instead'}</button> · <button type="button" className="linkbtn" onClick={() => { setChallenge(''); setCode(''); setError(''); }}>Back</button></p>
            </>
          )}
          {error && <p className="err" role="alert">{error}</p>}
          <button className="btn n w lg" disabled={busy}>{busy ? 'Checking…' : challenge ? 'Verify and sign in' : 'Sign in'}</button>
          {!challenge && <p className="alt"><Link to="/forgot-password">Forgot password?</Link> · <Link to="/register">Create account</Link></p>}
        </form>
      </div>
    </div>
  );
}
