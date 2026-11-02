import { FormEvent, useState } from 'react';
import { ErrorBox, Modal, PageHeader, Pagination, Spinner } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import { api } from '../../lib/api';
import { dateTime, REASON_LABEL } from '../../lib/format';
import type { Paginated, Product, StockMovement, StockReason } from '../../lib/types';
import { useAsync } from '../../lib/useAsync';

type Direction = 'add' | 'remove';
const REASONS: Record<Direction, StockReason[]> = {
  add: ['PURCHASE', 'ADJUSTMENT'],
  remove: ['DAMAGE', 'ADJUSTMENT'],
};

function AdjustModal({ products, initialId, onClose, onDone }: {
  products: Product[]; initialId: string; onClose: () => void; onDone: () => void;
}) {
  const toast = useToast();
  const [productId, setProductId] = useState(initialId || products[0]?.id || '');
  const [direction, setDirection] = useState<Direction>('add');
  const [reason, setReason] = useState<StockReason>('PURCHASE');
  const [qty, setQty] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const product = products.find((p) => p.id === productId);
  const amount = Number(qty) || 0;
  const after = product ? product.stock + (direction === 'add' ? amount : -amount) : 0;

  const pickDirection = (d: Direction) => { setDirection(d); setReason(REASONS[d][0]); };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      await api('/inventory/adjust', {
        method: 'POST',
        body: { productId, delta: direction === 'add' ? amount : -amount, reason, note: note.trim() || undefined },
      });
      toast(`${product?.name}: stock is now ${after}`);
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Adjust stock" onClose={onClose}>
      <form className="stack" onSubmit={submit}>
        <label className="field">Product
          <select className="input" value={productId} onChange={(e) => setProductId(e.target.value)}>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.unit}) — {p.stock} in stock</option>)}
          </select>
        </label>
        <div className="seg" role="group" aria-label="Direction">
          <button type="button" className={direction === 'add' ? 'on-add' : ''} onClick={() => pickDirection('add')}>Add stock</button>
          <button type="button" className={direction === 'remove' ? 'on-remove' : ''} onClick={() => pickDirection('remove')}>Remove stock</button>
        </div>
        <div className="row2">
          <label className="field">Quantity<input className="input" type="number" min={1} step={1} required value={qty} onChange={(e) => setQty(e.target.value)} autoFocus /></label>
          <label className="field">Reason
            <select className="input" value={reason} onChange={(e) => setReason(e.target.value as StockReason)}>
              {REASONS[direction].map((r) => <option key={r} value={r}>{REASON_LABEL[r]}</option>)}
            </select>
          </label>
        </div>
        <label className="field">Note (optional)<input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Weekly supplier delivery" maxLength={200} /></label>
        {product && amount > 0 && (
          <p className="muted">Stock will change from <strong>{product.stock}</strong> to <strong className={after < 0 ? 'neg' : ''}>{after}</strong>.</p>
        )}
        {error && <div className="alert alert-error" role="alert">{error}</div>}
        <div className="form-actions" style={{ marginTop: 0 }}>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={busy || amount < 1 || after < 0}>{busy ? 'Saving…' : 'Save adjustment'}</button>
        </div>
      </form>
    </Modal>
  );
}

export default function Inventory() {
  const [tab, setTab] = useState<'low' | 'ledger'>('low');
  const [page, setPage] = useState(1);
  const [adjust, setAdjust] = useState<string | null>(null); // product id ('' = no preselection)

  const low = useAsync(() => api<Product[]>('/inventory/low-stock'), []);
  const ledger = useAsync(() => api<Paginated<StockMovement>>('/inventory/movements', { query: { page, limit: 12 } }), [page]);
  const all = useAsync(() => api<Paginated<Product>>('/products/manage', { query: { limit: 100, sort: 'name' } }), []);

  const done = () => { setAdjust(null); low.reload(); ledger.reload(); all.reload(); };

  return (
    <>
      <PageHeader
        title="Inventory"
        subtitle="Every stock change is recorded, so you can always see who changed what and why."
        actions={<button className="btn btn-primary" disabled={!all.data} onClick={() => setAdjust('')}>Adjust stock</button>}
      />

      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'low'} className={tab === 'low' ? 'active' : ''} onClick={() => setTab('low')}>
          Running low{low.data ? ` (${low.data.length})` : ''}
        </button>
        <button role="tab" aria-selected={tab === 'ledger'} className={tab === 'ledger' ? 'active' : ''} onClick={() => setTab('ledger')}>Stock history</button>
      </div>

      {tab === 'low' ? (
        low.error ? <ErrorBox message={low.error} onRetry={low.reload} /> : low.loading && !low.data ? <Spinner /> : (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Product</th><th>Category</th><th className="num">In stock</th><th className="num">Reorder at</th><th /></tr></thead>
              <tbody>
                {low.data?.map((p) => (
                  <tr key={p.id}>
                    <td><div className="cell-product"><img src={p.imageUrl ?? ''} alt="" width={44} height={44} /><div><strong>{p.name}</strong><small>{p.sku} · {p.unit}</small></div></div></td>
                    <td>{p.category.name}</td>
                    <td className="num"><span className={`tag ${p.stock === 0 ? 'tag-out' : 'tag-low'}`}>{p.stock === 0 ? 'Out of stock' : `${p.stock} left`}</span></td>
                    <td className="num">{p.reorderLevel}</td>
                    <td><div className="row-actions"><button className="btn btn-primary btn-sm" onClick={() => setAdjust(p.id)}>Restock</button></div></td>
                  </tr>
                ))}
                {low.data?.length === 0 && <tr><td colSpan={5}><div className="empty">Nothing is running low. Every product is above its reorder level.</div></td></tr>}
              </tbody>
            </table>
          </div>
        )
      ) : (
        ledger.error ? <ErrorBox message={ledger.error} onRetry={ledger.reload} /> : ledger.loading && !ledger.data ? <Spinner /> : (
          <>
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>When</th><th>Product</th><th>Reason</th><th className="num">Change</th><th className="num">Balance</th><th>By</th><th>Note</th></tr></thead>
                <tbody>
                  {ledger.data?.items.map((m) => (
                    <tr key={m.id}>
                      <td className="muted" style={{ whiteSpace: 'nowrap' }}>{dateTime(m.createdAt)}</td>
                      <td><div className="cell-product"><img src={m.product.imageUrl ?? ''} alt="" width={44} height={44} /><strong>{m.product.name}</strong></div></td>
                      <td>{REASON_LABEL[m.reason]}</td>
                      <td className={`num ${m.delta > 0 ? 'pos' : 'neg'}`}>{m.delta > 0 ? `+${m.delta}` : m.delta}</td>
                      <td className="num">{m.balanceAfter}</td>
                      <td>{m.createdBy?.fullName ?? <span className="muted">System</span>}</td>
                      <td className="muted">{m.note ?? ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {ledger.data && <Pagination page={ledger.data.page} totalPages={ledger.data.totalPages} onChange={setPage} />}
          </>
        )
      )}

      {adjust !== null && all.data && (
        <AdjustModal products={all.data.items.filter((p) => p.isActive)} initialId={adjust} onClose={() => setAdjust(null)} onDone={done} />
      )}
    </>
  );
}
