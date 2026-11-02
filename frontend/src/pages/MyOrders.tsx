import { Link } from 'react-router-dom';
import { ErrorBox, Pagination, Spinner, StatusBadge } from '../components/ui';
import { api } from '../lib/api';
import { dateTime, money } from '../lib/format';
import type { Order, Paginated } from '../lib/types';
import { useAsync } from '../lib/useAsync';
import { useState } from 'react';

export default function MyOrders() {
  const [page, setPage] = useState(1);
  const { data, error, loading, reload } = useAsync(() => api<Paginated<Order>>('/orders/my', { query: { page, limit: 8 } }), [page]);

  return (
    <div className="container page">
      <h1>My orders</h1>
      {error ? <ErrorBox message={error} onRetry={reload} /> : loading && !data ? <Spinner /> : data && data.items.length === 0 ? (
        <div className="empty"><p>You haven't placed any orders yet.</p><Link to="/shop" className="btn btn-primary">Start shopping</Link></div>
      ) : (
        <div className="stack">
          {data?.items.map((o) => (
            <Link key={o.id} to={`/orders/${o.id}`} className="card order-card">
              <div className="order-card-head">
                <div><strong>{o.orderNumber}</strong><small className="muted"> · {dateTime(o.createdAt)}</small></div>
                <StatusBadge status={o.status} />
              </div>
              <div className="thumbs">
                {o.items.slice(0, 6).map((i) => <img key={i.id} src={i.imageUrl ?? ''} alt={i.productName} title={i.productName} width={48} height={48} />)}
                {o.items.length > 6 && <span className="more">+{o.items.length - 6}</span>}
              </div>
              <div className="order-card-foot"><span className="muted">{o.items.reduce((s, i) => s + i.quantity, 0)} items</span><strong>{money(o.total)}</strong></div>
            </Link>
          ))}
        </div>
      )}
      {data && <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />}
    </div>
  );
}
