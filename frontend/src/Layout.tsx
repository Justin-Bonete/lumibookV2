<<<<<<< HEAD
import { ReactNode, useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { api } from './api';
import { useAuth } from './auth';
import { Icon, LogoMark } from './icons';
import { Pill, initials } from './ui';

const NAV = {
  admin: [['/admin', 'Overview', 'home'], ['/admin/users', 'Users & plans', 'users'], ['/admin/orders', 'Orders', 'card'], ['/admin/titles', 'Titles', 'book'], ['/admin/collections', 'Plan collections', 'layers'], ['/admin/activity', 'Activity', 'activity']],
  member: [['/app', 'My plan', 'star'], ['/app/library', 'Library', 'library'], ['/app/plans', 'Plans & billing', 'card'], ['/app/history', 'Download history', 'download']],
=======
import { ReactNode, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { api } from './api';
import { useAuth } from './auth';

const NAV = {
  admin: [['/admin', 'Overview'], ['/admin/users', 'Users & plans'], ['/admin/orders', 'Orders'], ['/admin/titles', 'Titles'], ['/admin/collections', 'Plan collections'], ['/admin/activity', 'Activity']],
  member: [['/app', 'My plan'], ['/app/library', 'Library'], ['/app/plans', 'Plans & billing'], ['/app/history', 'Download history']],
>>>>>>> 1a41738b43c9d03c4732a7bc1df60272dac1c62a
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
<<<<<<< HEAD
      <Icon name="alert" size={16} /> Please verify your email to buy a plan or download. Check your inbox for the link.
      <button className="btn sm" onClick={resend}>Resend email</button>{msg && <span>{msg}</span>}
=======
      Please verify your email address to buy a plan or download. Check your inbox for the link.
      <button className="btn" onClick={resend}>Resend email</button>{msg && <span>{msg}</span>}
>>>>>>> 1a41738b43c9d03c4732a7bc1df60272dac1c62a
    </div>
  );
}

export default function Layout({ children }: { children: ReactNode }) {
  const { me, logout } = useAuth();
  const nav = useNavigate();
<<<<<<< HEAD
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
        <button className="btn ghost out" onClick={async () => { await logout(); nav('/login'); }}><Icon name="logout" size={16} /> Sign out</button>
      </aside>
      <div className="col">
        <header className="topbar">
          <button className="burger" aria-label="Open menu" onClick={() => setOpen(true)}><Icon name="menu" /></button>
          <span className="crumb">{role === 'admin' ? 'Owner console' : 'Member area'} <i>/</i> <b>{current?.[1]}</b></span>
          <span className="spacer" />
          {role === 'admin' ? <Pill code="all">Owner</Pill> : <Link to="/app/plans"><Pill code={me.plan.code}>{me.plan.name}</Pill></Link>}
        </header>
        <VerifyBanner />
        <main id="main" tabIndex={-1} key={pathname}>{children}</main>
=======
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
>>>>>>> 1a41738b43c9d03c4732a7bc1df60272dac1c62a
        <Footer />
      </div>
    </div>
  );
}
