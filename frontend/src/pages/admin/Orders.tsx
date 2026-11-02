import { useState } from 'react';
import { OrderTimeline } from '../../components/OrderParts';
import { ErrorBox, Modal, PageHeader, Pagination, Spinner, StatusBadge } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import { api } from '../../lib/api';
import { canCancel, dateTime, money, nextStatus, STATUS_LABEL } from '../../lib/format';
import type { Order, OrderStatus, Paginated } from '../../lib/types';
import { useAsync, useDebounced } from '../../lib/useAsync';

const FILTERS: (OrderStatus | '')[] = ['', 'PENDING', 'CONFIRMED', 'PACKED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'];
const ACTION: Partial<Record<OrderStatus, string>> = {
  CONFIRMED: 'Confirm order', PACKED: 'Mark as packed', OUT_FOR_DELIVERY: 'Send out for delivery', DELIVERED: 'Mark as delivered',
};

function OrderModal({ order, busy, onAdvance, onCancel, onClose }: {
  order: Order; busy: boolean; onAdvance: (s: OrderStatus) => void; onCancel: () => void; onClose: () => void;
}) {
  const next = nextStatus(order.status);
  return (
    <Modal title={`Order ${order.orderNumber}`} onClose={onClose} wide>
      <div className="stack">
        <OrderTimeline status={order.status} />
        <div className="cols cols-1-1" style={{ marginBottom: 0 }}>
          <div>
            <h3>Items</h3>
            <ul className="summary-lines" style={{ marginTop: 12 }}>
              {order.items.map((i) => (
                <li key={i.id}>
                  <img src={i.imageUrl ?? ''} alt="" width={48} height={48} />
                  <span>{i.quantity} × {i.productName}<small className="muted block">{money(i.unitPrice)} each</small></span>
                  <strong>{money(i.lineTotal)}</strong>
                </li>
              ))}
            </ul>
            <dl className="totals" style={{ marginTop: 16 }}>
              <div><dt>Subtotal</dt><dd>{money(order.subtotal)}</dd></div>
              <div><dt>Delivery</dt><dd>{order.deliveryFee === 0 ? 'Free' : money(order.deliveryFee)}</dd></div>
              <div className="grand"><dt>Total</dt><dd>{money(order.total)}</dd></div>
            </dl>
          </div>
          <div className="stack">
            <h3>Customer and delivery</h3>
            <dl className="kv">
              <dt>Name</dt><dd>{order.customer?.fullName}</dd>
              <dt>Email</dt><dd>{order.customer?.email}</dd>
              <dt>Phone</dt><dd>{order.phone}</dd>
              <dt>Address</dt><dd>{order.deliveryAddress}, {order.deliveryCity}</dd>
              <dt>Payment</dt><dd>{order.paymentMethod === 'CASH_ON_DELIVERY' ? 'Cash on delivery' : 'Card on delivery'}</dd>
              <dt>Placed</dt><dd>{dateTime(order.createdAt)}</dd>
              {order.note && <><dt>Note</dt><dd>{order.note}</dd></>}
            </dl>
          </div>
        </div>
        {(next || canCancel(order.status)) && (
          <div className="form-actions" style={{ marginTop: 4 }}>
            {canCancel(order.status) && <button className="btn btn-danger-outline" disabled={busy} onClick={onCancel}>Cancel order</button>}
            {next && <button className="btn btn-primary" disabled={busy} onClick={() => onAdvance(next)}>{ACTION[next]}</button>}
          </div>
        )}
      </div>
    </Modal>
  );
}

export default function Orders() {
  const toast = useToast();
  const [status, setStatus] = useState<OrderStatus | ''>('');
  const [search, setSearch] = useState('');
  const q = useDebounced(search, 300);
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<Order | null>(null);
  const [busy, setBusy] = useState(false);

  const { data, error, loading, reload } = useAsync(
    () => api<Paginated<Order>>('/orders', { query: { status, search: q, page, limit: 10 } }),
    [status, q, page],
  );

  const move = async (order: Order, next: OrderStatus) => {
    if (next === 'CANCELLED' && !window.confirm(`Cancel ${order.orderNumber}? The reserved stock goes back on the shelf.`)) return;
    setBusy(true);
    try {
      const updated = await api<Order>(`/orders/${order.id}/status`, { method: 'PATCH', body: { status: next } });
      toast(`${order.orderNumber} is now ${STATUS_LABEL[next].toLowerCase()}`);
      setOpen((cur) => (cur && cur.id === order.id ? { ...updated, customer: updated.customer ?? cur.customer } : cur));
      reload();
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="Orders" subtitle="Move orders through confirmation, packing and delivery." />

      <div className="tabs" role="tablist" aria-label="Filter by status">
        {FILTERS.map((s) => (
          <button key={s || 'all'} role="tab" aria-selected={status === s} className={status === s ? 'active' : ''} onClick={() => { setStatus(s); setPage(1); }}>
            {s ? STATUS_LABEL[s] : 'All orders'}
          </button>
        ))}
      </div>
      <div className="admin-toolbar">
        <input className="input" type="search" placeholder="Search order number, name or email" aria-label="Search orders" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        {data && <span className="muted">{data.total} order{data.total === 1 ? '' : 's'}</span>}
      </div>

      {error ? <ErrorBox message={error} onRetry={reload} /> : loading && !data ? <Spinner /> : (
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Order</th><th>Customer</th><th>Placed</th><th className="num">Items</th><th className="num">Total</th><th>Status</th><th /></tr></thead>
            <tbody>
              {data?.items.map((o) => {
                const next = nextStatus(o.status);
                return (
                  <tr key={o.id} className="clickable" onClick={() => setOpen(o)}>
                    <td><strong>{o.orderNumber}</strong></td>
                    <td><div className="cell-product" style={{ minWidth: 0 }}><div><strong>{o.customer?.fullName}</strong><small>{o.deliveryCity}</small></div></div></td>
                    <td className="muted" style={{ whiteSpace: 'nowrap' }}>{dateTime(o.createdAt)}</td>
                    <td className="num">{o.items.reduce((s, i) => s + i.quantity, 0)}</td>
                    <td className="num">{money(o.total)}</td>
                    <td><StatusBadge status={o.status} /></td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="row-actions">
                        {next && <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => move(o, next)}>{ACTION[next]}</button>}
                        <button className="btn btn-ghost btn-sm" onClick={() => setOpen(o)}>View</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {data?.items.length === 0 && <tr><td colSpan={7}><div className="empty">No orders match these filters.</div></td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {data && <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />}

      {open && (
        <OrderModal
          order={open}
          busy={busy}
          onClose={() => setOpen(null)}
          onAdvance={(s) => move(open, s)}
          onCancel={() => move(open, 'CANCELLED')}
        />
      )}
    </>
  );
}
