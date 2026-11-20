import { FormEvent, useState } from 'react';
import QRCode from 'qrcode';
import { api } from '../api';
import { useAuth } from '../auth';
import { Head } from '../ui';

interface Setup { secret: string; otpauth_url: string }

export default function Security() {
  const { me, refresh } = useAuth();
  const [setup, setSetup] = useState<Setup | null>(null);
  const [qr, setQr] = useState('');
  const [code, setCode] = useState('');
  const [codes, setCodes] = useState<string[] | null>(null);
  const [pw, setPw] = useState('');
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  if (!me) return null;
  const on = me.user.two_factor_enabled;

  async function start() {
    setError(''); setOk('');
    try {
      const s = await api<Setup>('/2fa/setup', { method: 'POST' });
      setSetup(s); setQr(await QRCode.toDataURL(s.otpauth_url, { margin: 1, width: 200 }));
    } catch (e) { setError((e as Error).message); }
  }
  async function enable(e: FormEvent) {
    e.preventDefault(); setError('');
    try {
      const r = await api<{ recovery_codes: string[] }>('/2fa/enable', { method: 'POST', body: { code } });
      setCodes(r.recovery_codes); setSetup(null); setCode(''); await refresh();
    } catch (err) { setError((err as Error).message); }
  }
  async function disable(e: FormEvent) {
    e.preventDefault(); setError(''); setOk('');
    try {
      await api('/2fa/disable', { method: 'POST', body: { password: pw, code } });
      setPw(''); setCode(''); setOk('Two-factor sign-in is now off.'); await refresh();
    } catch (err) { setError((err as Error).message); }
  }

  return (
    <>
      <Head title="Security" sub="Protect your account with a one-time code from an authenticator app." />
      {error && <p className="err" role="alert">{error}</p>}{ok && <p className="ok-text" role="status">{ok}</p>}

      {codes && (
        <div className="card box">
          <h3>Save your recovery codes</h3>
          <p className="note">Each code works once if you lose your phone. They are shown only now. Store them somewhere safe, like a password manager.</p>
          <div className="codes">{codes.map((c) => <code key={c}>{c}</code>)}</div>
          <div className="row"><button className="btn" onClick={() => navigator.clipboard?.writeText(codes.join('\n'))}>Copy codes</button>
            <button className="btn n" onClick={() => setCodes(null)}>I have saved them</button></div>
        </div>
      )}

      {!on && !setup && !codes && (
        <div className="card box">
          <h3>Two-factor sign-in is off</h3>
          <p className="note">{me.user.role === 'admin' ? 'Strongly recommended for the owner account: anyone with your password could otherwise change plans and access every title.' : 'Adds a second step when you sign in.'}</p>
          <button className="btn n" onClick={start}>Set up</button>
        </div>
      )}

      {setup && (
        <form className="card box" onSubmit={enable}>
          <h3>1. Scan this with your authenticator app</h3>
          <p className="note">Google Authenticator, Microsoft Authenticator, Authy, 1Password and similar apps all work.</p>
          {qr && <img className="qr" src={qr} alt="QR code to add LUMIBOOK to your authenticator app" />}
          <p className="note">Can’t scan? Enter this key manually: <code>{setup.secret}</code></p>
          <h3>2. Enter the 6-digit code it shows</h3>
          <input required inputMode="numeric" autoComplete="one-time-code" placeholder="123456" value={code} onChange={(e) => setCode(e.target.value)} />
          <div className="row" style={{ marginTop: 12 }}><button className="btn n">Turn on</button><button type="button" className="btn" onClick={() => setSetup(null)}>Cancel</button></div>
        </form>
      )}

      {on && !codes && (
        <form className="card box" onSubmit={disable}>
          <h3>Two-factor sign-in is on</h3>
          <p className="note">To turn it off, confirm your password and a current code from your app.</p>
          <div className="form">
            <label>Password<input type="password" required value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" /></label>
            <label>Authenticator code<input required inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value)} autoComplete="one-time-code" /></label>
          </div>
          <button className="btn d">Turn off</button>
        </form>
      )}
    </>
  );
}
