import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../api';
import { useAuth } from '../../auth';
import { Head } from '../../ui';

interface OrderStatus { order_number: string; status: string; plan: string }

/** PayMongo sends the customer back here; the webhook (not this page) is what activates the plan, so we poll. */
export function CheckoutSuccess() {
  const [params] = useSearchParams();
  const { refresh } = useAuth();
  const order = params.get('order');
  const [o, setO] = useState<OrderStatus | null>(null);
  const tries = useRef(0);

  useEffect(() => {
    if (!order) return;
    let stop = false;
    const tick = async () => {
      try {
        const r = await api<OrderStatus>(`/orders/${order}`);
        if (stop) return;
        setO(r);
        if (r.status === 'paid') { refresh(); return; }
      } catch { /* keep trying */ }
      if (++tries.current < 30 && !stop) setTimeout(tick, 2000);
    };
    tick();
    return () => { stop = true; };
  }, [order, refresh]);

  const paid = o?.status === 'paid';
  return (
    <>
      <Head title={paid ? 'Payment received' : 'Confirming your payment…'} sub={order ? `Order ${order}` : undefined} />
      <div className="card" role="status">
        {paid
          ? <><h3>Your {o?.plan} plan is active.</h3><p className="note">A receipt was sent to your email. Enjoy your library.</p><Link className="btn g" to="/app/library">Open library</Link></>
          : <><h3>Waiting for confirmation</h3><p className="note">This usually takes a few seconds. If you paid, your plan will activate automatically, even if you close this page. Questions? Contact support with your order number.</p><Link className="btn" to="/app/plans">Back to plans</Link></>}
      </div>
    </>
  );
}

export function CheckoutCancel() {
  return (
    <>
      <Head title="Checkout cancelled" sub="You have not been charged." />
      <div className="card"><p className="note">You can pick a plan again whenever you are ready.</p><Link className="btn n" to="/app/plans">See plans</Link></div>
    </>
  );
}
