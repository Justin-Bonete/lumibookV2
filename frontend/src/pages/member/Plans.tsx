import { useState } from 'react';
import { api, useFetch } from '../../api';
import { useAuth } from '../../auth';
import { Head, Pill, Status, fmt, peso } from '../../ui';
import type { OrderRow, PublicPlan } from '../../types';

const FEATURES = (p: PublicPlan) => [
  p.ebook_limit === null ? 'Every eligible title' : `Up to ${p.ebook_limit} e-books`,
  p.download_limit === null ? 'Unlimited downloads*' : `${p.download_limit} downloads ${p.download_period === 'month' ? 'per month' : 'in total'}`,
  p.code === 'free' ? 'No payment needed' : 'One-time payment',
];

export default function Plans() {
  const { me } = useAuth();
  const plans = useFetch<PublicPlan[]>('/plans');
  const orders = useFetch<OrderRow[]>('/orders');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  async function buy(code: string) {
    setBusy(code); setError('');
    try {
      const r = await api<{ checkout_url: string }>('/checkout', { method: 'POST', body: { plan_code: code } });
      window.location.assign(r.checkout_url); // PayMongo hosted checkout
    } catch (e) { setError((e as Error).message); setBusy(''); }
  }
  const tier = me?.plan.tier ?? 0;
  return (
    <>
      <Head title="Plans & billing" sub="Pay once. Keep learning. Payments are handled securely by PayMongo (GCash, QR Ph, cards)." />
      {error && <p className="err" role="alert">{error}</p>}
      <Status loading={plans.loading} error={plans.error} />
      <div className="plans">
        {plans.data?.map((p) => {
          const current = p.tier === tier, lower = p.tier < tier;
          return (
            <div key={p.code} className={`plan${p.code === 'plus' ? ' ft' : ''}`}>
              <h3>{p.name}</h3>
              <div className="price">{p.code === 'free' ? 'Free' : p.price ? peso(p.price) : 'Coming soon'}</div>
              <ul>{FEATURES(p).map((f) => <li key={f}>{f}</li>)}</ul>
              {current ? <button className="btn" disabled>Your current plan</button>
                : lower || p.code === 'free' ? <button className="btn" disabled>Included in your plan</button>
                : !p.price ? <button className="btn" disabled>Price coming soon</button>
                : <button className="btn g" disabled={!!busy} onClick={() => buy(p.code)}>{busy === p.code ? 'Redirecting…' : `Buy ${p.name}`}</button>}
            </div>
          );
        })}
      </div>
      <p className="note">*Unlimited is subject to fair-use and rate limits. See the <a href="/refunds">refund policy</a>.</p>

      <div className="sec">Order history</div>
      <Status loading={orders.loading} error={orders.error} />
      {orders.data && <div className="tw"><table>
        <thead><tr><th>Order</th><th>Plan</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead>
        <tbody>{orders.data.map((o) => (
          <tr key={o.order_number}><td>{o.order_number}</td><td><Pill code="free">{o.plan.name}</Pill></td><td>{peso(o.amount)}</td>
            <td><span className={`pill ${o.status === 'paid' ? 'ok' : o.status === 'pending' ? 'warn' : 'bad'}`}>{o.status}</span></td><td>{fmt(o.paid_at ?? o.created_at)}</td></tr>))}
          {!orders.data.length && <tr><td colSpan={5}>No orders yet.</td></tr>}</tbody>
      </table></div>}
    </>
  );
}
