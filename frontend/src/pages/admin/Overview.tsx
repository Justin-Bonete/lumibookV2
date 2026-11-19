import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useFetch } from '../../api';
import { Icon } from '../../icons';
import { Head, Status, peso } from '../../ui';
import type { Stats } from '../../types';

const NAMES: Record<string, string> = { free: 'Free', premium: 'Premium', plus: 'Premium Plus', all: 'All Access' };

function Stat({ icon, value, label, tone = '' }: { icon: string; value: ReactNode; label: string; tone?: string }) {
  return <div className={`card stat ${tone}`}><span className="ico"><Icon name={icon} /></span><b>{value}</b><span>{label}</span></div>;
}

export default function Overview() {
  const { data, error, loading } = useFetch<Stats>('/admin/stats');
  const attention = data ? data.review_orders + data.at_limit : 0;
  return (
    <>
      <div className="row between pagehead"><Head title="Overview" sub="Everyone on the platform, at a glance." />
        <div className="row"><Link className="btn" to="/admin/titles"><Icon name="plus" size={16} /> Add title</Link><Link className="btn n" to="/admin/orders">View orders</Link></div></div>
      <Status loading={loading} error={error} />
      {data && (
        <>
          <div className="cards">
            <Stat icon="users" value={data.members} label="Members" />
            <Stat icon="star" value={data.members - (data.by_plan.free ?? 0)} label="On a paid plan" />
            <Stat icon="coins" value={peso(data.revenue)} label="Paid orders (total)" />
            <Stat icon="download" value={data.downloads_30d} label="Downloads, last 30 days" />
            <Stat icon="activity" value={data.at_limit} label="At their download limit" tone={data.at_limit ? 'warn' : ''} />
            <Stat icon="alert" value={data.review_orders} label="Orders needing review" tone={data.review_orders ? 'bad' : ''} />
            <Stat icon="ban" value={data.suspended} label="Suspended" />
          </div>
          <div className="two">
            <div className="card">
              <h3>Members by plan</h3>
              <div className="bars">
                {Object.keys(NAMES).map((k) => {
                  const n = data.by_plan[k] ?? 0, pct = data.members ? Math.round((n / data.members) * 100) : 0;
                  return <div key={k}><span>{NAMES[k]}</span><span className="bar"><i style={{ width: `${pct}%` }} /></span><b>{n} <small>· {pct}%</small></b></div>;
                })}
              </div>
            </div>
            <div className="card">
              <h3>Needs your attention</h3>
              {attention === 0
                ? <p className="muted allgood"><Icon name="check" size={16} /> All clear. Nothing needs review right now.</p>
                : <ul className="todo">
                    {data.review_orders > 0 && <li><Link to="/admin/orders">{data.review_orders} order(s) need review</Link><small>Underpaid or mismatched payments</small></li>}
                    {data.at_limit > 0 && <li><Link to="/admin/users">{data.at_limit} member(s) hit their download limit</Link><small>A good moment to suggest an upgrade</small></li>}
                  </ul>}
            </div>
          </div>
        </>
      )}
    </>
  );
}
