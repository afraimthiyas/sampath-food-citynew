import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ErrorBox, Spinner, StatusBadge } from '../components/ui';
import { OrderTimeline } from '../components/OrderParts';
import { useToast } from '../context/ToastContext';
import { api } from '../lib/api';
import { dateTime, money } from '../lib/format';
import type { Order } from '../lib/types';
import { useAsync } from '../lib/useAsync';

export default function OrderDetail() {
  const { id } = useParams();
  const placed = (useLocation().state as { placed?: boolean } | null)?.placed;
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const { data: order, error, loading, reload } = useAsync(() => api<Order>(`/orders/${id}`), [id]);

  if (loading && !order) return <div className="container page"><Spinner /></div>;
  if (error || !order) return <div className="container page"><ErrorBox message={error ?? 'Order not found'} /></div>;

  const cancel = async () => {
    if (!window.confirm('Cancel this order?')) return;
    setBusy(true);
    try { await api(`/orders/${order.id}/cancel`, { method: 'POST' }); toast('Order cancelled'); reload(); }
    catch (e) { toast((e as Error).message, 'error'); }
    finally { setBusy(false); }
  };

  return (
    <div className="container page">
      {placed && (
        <div className="alert alert-success">
          <strong>Thank you! Your order has been placed.</strong> We'll confirm it shortly and keep you updated here.
        </div>
      )}
      <div className="page-header">
        <div><h1>{order.orderNumber}</h1><p className="muted">Placed {dateTime(order.createdAt)}</p></div>
        <StatusBadge status={order.status} />
      </div>

      <div className="card pad"><OrderTimeline status={order.status} /></div>

      <div className="detail-grid">
        <div className="card pad">
          <h2>Items</h2>
          <ul className="summary-lines">
            {order.items.map((i) => (
              <li key={i.id}>
                <img src={i.imageUrl ?? ''} alt="" width={52} height={52} />
                <span>{i.quantity} × {i.productName}<small className="muted block">{money(i.unitPrice)} each</small></span>
                <strong>{money(i.lineTotal)}</strong>
              </li>
            ))}
          </ul>
          <dl className="totals">
            <div><dt>Subtotal</dt><dd>{money(order.subtotal)}</dd></div>
            <div><dt>Delivery</dt><dd>{order.deliveryFee === 0 ? 'Free' : money(order.deliveryFee)}</dd></div>
            <div className="grand"><dt>Total</dt><dd>{money(order.total)}</dd></div>
          </dl>
        </div>
        <div className="card pad stack">
          <h2>Delivery</h2>
          <p>{order.deliveryAddress}<br />{order.deliveryCity}<br />{order.phone}</p>
          <h3>Payment</h3>
          <p>{order.paymentMethod === 'CASH_ON_DELIVERY' ? 'Cash on delivery' : 'Card on delivery'}</p>
          {order.note && <><h3>Note</h3><p>{order.note}</p></>}
          {(order.status === 'PENDING' || order.status === 'CONFIRMED') && (
            <button className="btn btn-danger-outline" onClick={cancel} disabled={busy}>Cancel order</button>
          )}
          <Link to="/orders" className="link">← All orders</Link>
        </div>
      </div>
    </div>
  );
}
