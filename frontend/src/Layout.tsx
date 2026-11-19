import { ReactNode, useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { api } from './api';
import { useAuth } from './auth';
import { Icon, LogoMark } from './icons';
import { Pill, initials } from './ui';

const NAV = {
  admin: [['/admin', 'Overview', 'home'], ['/admin/users', 'Users & plans', 'users'], ['/admin/orders', 'Orders', 'card'], ['/admin/titles', 'Titles', 'book'], ['/admin/collections', 'Plan collections', 'layers'], ['/admin/activity', 'Activity', 'activity'], ['/admin/security', 'Security', 'shield']],
  member: [['/app', 'My plan', 'star'], ['/app/library', 'Library', 'library'], ['/app/plans', 'Plans & billing', 'card'], ['/app/history', 'Download history', 'download'], ['/app/security', 'Security', 'shield']],
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
      <Icon name="alert" size={16} /> Please verify your email to buy a plan or download. Check your inbox for the link.
      <button className="btn sm" onClick={resend}>Resend email</button>{msg && <span>{msg}</span>}
    </div>
  );
}

function TwoFactorBanner() {
  const { me } = useAuth();
  if (!me || me.user.role !== 'admin' || me.user.two_factor_enabled) return null;
  return (
    <div className="banner" role="status">
      <Icon name="shield" size={16} /> Protect the owner account: turn on two-factor sign-in.
      <Link className="btn sm" to="/admin/security">Set up now</Link>
    </div>
  );
}

export default function Layout({ children }: { children: ReactNode }) {
  const { me, logout } = useAuth();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);
  if (!me) return null;

  const role = me.user.role;
  const items = NAV[role];
  const current = [...items].sort((a, b) => b[0].length - a[0].length).find(([to]) => pathname === to || pathname.startsWith(to + '/'));

  return (
    <div className="app">
      <a className="skip" href="#main">Skip to content</a>
      <div className={`scrim side-scrim${open ? ' on' : ''}`} onClick={() => setOpen(false)} />
      <aside className={`side${open ? ' open' : ''}`}>
        <div className="brand"><LogoMark /><span>LUMIBOOK</span></div>
        <div className="eyebrow">{role === 'admin' ? 'Owner console' : 'Member area'}</div>
        <nav aria-label="Main">
          {items.map(([to, label, icon]) => (
            <NavLink key={to} to={to} end className={({ isActive }) => 'nav' + (isActive ? ' on' : '')}><Icon name={icon} />{label}</NavLink>
          ))}
        </nav>
        <div className="who">
          <span className="av lg">{initials(me.user.name)}</span>
          <div><b>{me.user.name}</b><small>{role === 'admin' ? 'Owner / Admin' : me.user.email}</small></div>
        </div>
        <button className="btn ghost out" onClick={async () => { await logout(); window.location.assign('/welcome.html'); }}><Icon name="logout" size={16} /> Sign out</button>
      </aside>
      <div className="col">
        <header className="topbar">
          <button className="burger" aria-label="Open menu" onClick={() => setOpen(true)}><Icon name="menu" /></button>
          <span className="crumb">{role === 'admin' ? 'Owner console' : 'Member area'} <i>/</i> <b>{current?.[1]}</b></span>
          <span className="spacer" />
          {role === 'admin' ? <Pill code="all">Owner</Pill> : <Link to="/app/plans"><Pill code={me.plan.code}>{me.plan.name}</Pill></Link>}
        </header>
        <VerifyBanner />
        <TwoFactorBanner />
        <main id="main" tabIndex={-1} key={pathname}>{children}</main>
        <Footer />
      </div>
    </div>
  );
}
