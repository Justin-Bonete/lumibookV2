import { ReactNode, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { api } from './api';
import { useAuth } from './auth';

const NAV = {
  admin: [['/admin', 'Overview'], ['/admin/users', 'Users & plans'], ['/admin/orders', 'Orders'], ['/admin/titles', 'Titles'], ['/admin/collections', 'Plan collections'], ['/admin/activity', 'Activity']],
  member: [['/app', 'My plan'], ['/app/library', 'Library'], ['/app/plans', 'Plans & billing'], ['/app/history', 'Download history']],
} as const;

export function Footer() {
  return (
    <footer className="foot">
      <span>© LUMIBOOK Digital Library</span>
      <Link to="/terms">Terms</Link><Link to="/privacy">Privacy</Link><Link to="/refunds">Refunds</Link>
    </footer>
  );
}

function VerifyBanner() {
  const { me } = useAuth();
  const [msg, setMsg] = useState('');
  if (!me || me.user.email_verified) return null;
  const resend = async () => {
    try { setMsg((await api<{ message: string }>('/email/verification-notification', { method: 'POST' })).message); }
    catch (e) { setMsg((e as Error).message); }
  };
  return (
    <div className="banner" role="status">
      Please verify your email address to buy a plan or download. Check your inbox for the link.
      <button className="btn" onClick={resend}>Resend email</button>{msg && <span>{msg}</span>}
    </div>
  );
}

export default function Layout({ children }: { children: ReactNode }) {
  const { me, logout } = useAuth();
  const nav = useNavigate();
  if (!me) return null;
  const role = me.user.role;
  return (
    <div className="app">
      <a className="skip" href="#main">Skip to content</a>
      <aside>
        <div className="logo">LUMIBOOK</div>
        <small>{role === 'admin' ? 'OWNER CONSOLE' : 'MEMBER AREA'}</small>
        <nav aria-label="Main">
          {NAV[role].map(([to, label]) => (
            <NavLink key={to} to={to} end className={({ isActive }) => 'nav' + (isActive ? ' on' : '')}>{label}</NavLink>
          ))}
        </nav>
        <div className="who">
          <b>{me.user.name}</b>{role === 'admin' ? 'Owner / Admin' : me.plan.name}
          <button className="btn" onClick={async () => { await logout(); nav('/login'); }}>Sign out</button>
        </div>
      </aside>
      <div className="col">
        <VerifyBanner />
        <main id="main" tabIndex={-1}>{children}</main>
        <Footer />
      </div>
    </div>
  );
}
