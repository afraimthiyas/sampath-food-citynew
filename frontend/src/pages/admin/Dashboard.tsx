import { Link } from 'react-router-dom';
import { BarChart, Donut } from '../../components/Charts';
import { ErrorBox, PageHeader, Spinner, StatusBadge } from '../../components/ui';
import { api } from '../../lib/api';
import { dateTime, money, STATUS_LABEL } from '../../lib/format';
import type { DashboardSummary, OrderStatus } from '../../lib/types';
import { useAsync } from '../../lib/useAsync';

const STATUS_ORDER: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PACKED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'];
const STATUS_COLOR: Record<OrderStatus, string> = {
  PENDING: '#f2a31b', CONFIRMED: '#2f6fae', PACKED: '#6f4a9a', OUT_FOR_DELIVERY: '#1d7a76', DELIVERED: '#1f6b3a', CANCELLED: '#c1272d',
};

function Kpi({ label, value, note, tone }: { label: string; value: string; note?: string; tone?: 'lead' | 'warn' }) {
  return (
    <div className={`kpi ${tone ? `kpi-${tone}` : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {note && <small>{note}</small>}
    </div>
  );
}

export default function Dashboard() {
  const { data, error, loading, reload } = useAsync(() => api<DashboardSummary>('/dashboard/summary'), []);

  if (loading && !data) return <Spinner label="Loading dashboard…" />;
  if (error || !data) return <ErrorBox message={error ?? 'Could not load the dashboard'} onRetry={reload} />;

  const { totals } = data;
  const week = data.revenueByDay.map((d) => {
    const date = new Date(`${d.day}T00:00:00`);
    return {
      label: date.toLocaleDateString('en-GB', { weekday: 'short' }),
      sub: date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
      value: d.revenue,
    };
  });
  const weekRevenue = data.revenueByDay.reduce((s, d) => s + d.revenue, 0);
  const statusCounts = new Map(data.ordersByStatus.map((s) => [s.status, s.count]));
  const maxCount = Math.max(1, ...data.ordersByStatus.map((s) => s.count));

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="How the shop is doing right now."
        actions={<button className="btn btn-ghost btn-sm" onClick={reload}>Refresh</button>}
      />

      <div className="kpi-grid">
        <Kpi tone="lead" label="Revenue" value={money(Math.round(totals.revenue))} note="net of cancellations" />
        <Kpi label="Orders" value={String(totals.totalOrders)} note={`${totals.pendingOrders} waiting to be confirmed`} />
        <Kpi label="Average order" value={money(Math.round(totals.averageOrderValue))} />
        <Kpi label="Customers" value={String(totals.customers)} />
        <Kpi label="Products" value={String(totals.products)} note="active in the shop" />
        <Kpi tone={totals.lowStock > 0 ? 'warn' : undefined} label="Low stock" value={String(totals.lowStock)} note={totals.lowStock > 0 ? 'need restocking' : 'all well stocked'} />
      </div>

      <div className="cols cols-2-1">
        <section className="panel">
          <div className="panel-head">
            <h2>Revenue, last 7 days</h2>
            <span className="muted">{money(Math.round(weekRevenue))} total</span>
          </div>
          <BarChart data={week} />
        </section>
        <section className="panel">
          <div className="panel-head"><h2>Sales by category</h2><span className="muted">all time</span></div>
          <Donut data={data.salesByCategory.map((c) => ({ name: c.name, value: c.revenue }))} />
        </section>
      </div>

      <div className="cols cols-3">
        <section className="panel">
          <div className="panel-head"><h2>Orders by status</h2><Link to="/admin/orders" className="link">Manage</Link></div>
          <ul className="bar-list">
            {STATUS_ORDER.map((s) => {
              const n = statusCounts.get(s) ?? 0;
              return (
                <li key={s}>
                  <span>{STATUS_LABEL[s]}</span>
                  <span className="bar-track"><span style={{ width: `${(n / maxCount) * 100}%`, background: STATUS_COLOR[s] }} /></span>
                  <strong>{n}</strong>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="panel">
          <div className="panel-head"><h2>Best sellers</h2></div>
          <ul className="mini-list">
            {data.topProducts.map((p) => (
              <li key={p.id}>
                <img src={p.imageUrl ?? ''} alt="" width={42} height={42} />
                <div className="meta"><strong>{p.name}</strong><small className="muted">{p.quantity} sold</small></div>
                <div className="end"><strong>{money(Math.round(p.revenue))}</strong></div>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel">
          <div className="panel-head"><h2>Running low</h2><Link to="/admin/inventory" className="link">Restock</Link></div>
          {data.lowStock.length === 0 ? <p className="muted">Everything is above its reorder level.</p> : (
            <ul className="mini-list">
              {data.lowStock.map((p) => (
                <li key={p.id}>
                  <img src={p.imageUrl ?? ''} alt="" width={42} height={42} />
                  <div className="meta"><strong>{p.name}</strong><small className="muted">reorder at {p.reorderLevel}</small></div>
                  <div className="end"><span className={`tag ${p.stock === 0 ? 'tag-out' : 'tag-low'}`}>{p.stock === 0 ? 'Out of stock' : `${p.stock} left`}</span></div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="panel">
        <div className="panel-head"><h2>Recent orders</h2><Link to="/admin/orders" className="link">View all orders</Link></div>
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Order</th><th>Customer</th><th>Placed</th><th>Status</th><th className="num">Total</th></tr></thead>
            <tbody>
              {data.recentOrders.map((o) => (
                <tr key={o.id}>
                  <td><strong>{o.orderNumber}</strong></td>
                  <td>{o.customer}</td>
                  <td className="muted">{dateTime(o.createdAt)}</td>
                  <td><StatusBadge status={o.status} /></td>
                  <td className="num">{money(o.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
