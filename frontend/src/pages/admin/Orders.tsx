import { useState } from 'react';
import { api, useFetch } from '../../api';
import { Head, Status, fmt, peso } from '../../ui';
import type { AdminOrder, Paged } from '../../types';

export default function Orders() {
  const [status, setStatus] = useState('');
  const { data, error, loading, reload } = useFetch<Paged<AdminOrder>>(`/admin/orders?status=${status}`);
  const [msg, setMsg] = useState<{ text: string; bad: boolean } | null>(null);

  async function recheck(id: number) {
    setMsg(null);
    try { await api(`/admin/orders/${id}/recheck`, { method: 'POST' }); setMsg({ text: 'Checked with PayMongo.', bad: false }); reload(); }
    catch (e) { setMsg({ text: (e as Error).message, bad: true }); }
  }
  return (
    <>
      <Head title="Orders" sub="Payments from PayMongo. Orders marked “review” were underpaid and need your decision." />
      <div className="tools">
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
          <option value="">All statuses</option><option value="paid">Paid</option><option value="pending">Pending</option><option value="review">Needs review</option><option value="expired">Expired</option>
        </select>
      </div>
      {msg && <p className={msg.bad ? 'err' : 'ok-text'} role="status">{msg.text}</p>}
      <Status loading={loading} error={error} />
      {data && <div className="tw"><table>
        <thead><tr><th>Order</th><th>Member</th><th>Plan</th><th>Amount</th><th>Status</th><th>Date</th><th /></tr></thead>
        <tbody>{data.data.map((o) => (
          <tr key={o.id}>
            <td>{o.order_number}</td><td><b>{o.user.name}</b><small>{o.user.email}</small></td><td>{o.plan.name}</td><td>{peso(o.amount)}</td>
            <td><span className={`pill ${o.status === 'paid' ? 'ok' : o.status === 'pending' ? 'warn' : 'bad'}`}>{o.status}</span>{o.review_note && <small>{o.review_note}</small>}</td>
            <td>{fmt(o.paid_at ?? o.created_at)}</td>
            <td>{o.status !== 'paid' && <button className="btn" onClick={() => recheck(o.id)}>Re-check payment</button>}</td>
          </tr>))}
          {!data.data.length && <tr><td colSpan={7}>No orders yet.</td></tr>}</tbody>
      </table></div>}
    </>
  );
}
