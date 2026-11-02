import { useState } from 'react';
import { ErrorBox, PageHeader, Pagination, Spinner } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../lib/api';
import { dateShort, money } from '../../lib/format';
import type { Customer, Paginated } from '../../lib/types';
import { useAsync, useDebounced } from '../../lib/useAsync';

export default function Customers() {
  const { isAdmin } = useAuth();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const q = useDebounced(search, 300);
  const [page, setPage] = useState(1);
  const { data, error, loading, reload } = useAsync(
    () => api<Paginated<Customer>>('/customers', { query: { search: q, page, limit: 10 } }),
    [q, page],
  );

  const toggle = async (c: Customer) => {
    const next = !c.isActive;
    if (!next && !window.confirm(`Suspend ${c.fullName}? They will no longer be able to log in.`)) return;
    try {
      await api(`/customers/${c.id}/active`, { method: 'PATCH', body: { isActive: next } });
      toast(`${c.fullName} ${next ? 'reactivated' : 'suspended'}`);
      reload();
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };

  return (
    <>
      <PageHeader
        title="Customers"
        subtitle={isAdmin ? 'Everyone who has signed up, with what they have spent.' : 'Everyone who has signed up. Only administrators can suspend accounts.'}
      />
      <div className="admin-toolbar">
        <input className="input" type="search" placeholder="Search by name or email" aria-label="Search customers" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        {data && <span className="muted">{data.total} customer{data.total === 1 ? '' : 's'}</span>}
      </div>

      {error ? <ErrorBox message={error} onRetry={reload} /> : loading && !data ? <Spinner /> : (
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Customer</th><th>Phone</th><th className="num">Orders</th><th className="num">Total spent</th><th>Last order</th><th>Account</th>{isAdmin && <th />}</tr></thead>
            <tbody>
              {data?.items.map((c) => (
                <tr key={c.id} className={c.isActive ? '' : 'faded'}>
                  <td>
                    <div className="cell-product" style={{ minWidth: 0 }}>
                      <span className="avatar" aria-hidden="true">{c.fullName.charAt(0)}</span>
                      <div><strong>{c.fullName}</strong><small>{c.email}</small></div>
                    </div>
                  </td>
                  <td>{c.phone ?? <span className="muted">—</span>}</td>
                  <td className="num">{c.orderCount}</td>
                  <td className="num">{money(c.totalSpent)}</td>
                  <td className="muted">{c.lastOrderAt ? dateShort(c.lastOrderAt) : 'No orders yet'}</td>
                  <td>{c.isActive ? 'Active' : 'Suspended'}</td>
                  {isAdmin && (
                    <td>
                      <div className="row-actions">
                        <button className={`btn btn-sm ${c.isActive ? 'btn-danger-outline' : 'btn-ghost'}`} onClick={() => toggle(c)}>
                          {c.isActive ? 'Suspend' : 'Reactivate'}
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {data?.items.length === 0 && <tr><td colSpan={isAdmin ? 7 : 6}><div className="empty">No customers match your search.</div></td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {data && <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />}
    </>
  );
}
