import { FormEvent, useState } from 'react';
import { ErrorBox, Modal, PageHeader, Pagination, Spinner } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import { api } from '../../lib/api';
import { money } from '../../lib/format';
import type { Category, Paginated, Product } from '../../lib/types';
import { useAsync, useDebounced } from '../../lib/useAsync';

interface FormState {
  sku: string; name: string; description: string; price: string; unit: string; imageUrl: string;
  categoryId: string; stock: string; reorderLevel: string; isActive: boolean;
}

const emptyForm = (categoryId: string): FormState => ({
  sku: '', name: '', description: '', price: '', unit: '', imageUrl: '', categoryId, stock: '0', reorderLevel: '10', isActive: true,
});

const fromProduct = (p: Product): FormState => ({
  sku: p.sku, name: p.name, description: p.description ?? '', price: String(p.price), unit: p.unit, imageUrl: p.imageUrl ?? '',
  categoryId: p.category.id, stock: String(p.stock), reorderLevel: String(p.reorderLevel), isActive: p.isActive,
});

function ProductForm({ product, categories, onDone, onClose }: {
  product: Product | null; categories: Category[]; onDone: () => void; onClose: () => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState<FormState>(product ? fromProduct(product) : emptyForm(categories[0]?.id ?? ''));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof FormState) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null);
    const body = {
      sku: form.sku.trim(), name: form.name.trim(), description: form.description.trim() || undefined,
      price: Number(form.price), unit: form.unit.trim(), imageUrl: form.imageUrl.trim() || undefined,
      categoryId: form.categoryId, reorderLevel: Number(form.reorderLevel), isActive: form.isActive,
    };
    try {
      if (product) {
        // Stock is deliberately not editable here: every change goes through the inventory ledger.
        await api(`/products/${product.id}`, { method: 'PATCH', body });
        toast(`${body.name} updated`);
      } else {
        await api('/products', { method: 'POST', body: { ...body, stock: Number(form.stock) } });
        toast(`${body.name} added`);
      }
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={product ? 'Edit product' : 'Add product'} onClose={onClose}>
      <form onSubmit={submit}>
        <div className="form-grid">
          <label className="field">Name<input className="input" required minLength={2} value={form.name} onChange={set('name')} placeholder="Samba rice" /></label>
          <label className="field">SKU<input className="input" required minLength={2} value={form.sku} onChange={set('sku')} placeholder="GRN-010" /></label>
          <label className="field">Category
            <select className="input" required value={form.categoryId} onChange={set('categoryId')}>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label className="field">Pack size<input className="input" required value={form.unit} onChange={set('unit')} placeholder="5 kg" /></label>
          <label className="field">Price (Rs)<input className="input" required type="number" min={0} step="0.01" value={form.price} onChange={set('price')} /></label>
          <label className="field">Reorder level<input className="input" required type="number" min={0} step={1} value={form.reorderLevel} onChange={set('reorderLevel')} /></label>
          {product ? (
            <div className="field">Stock on hand
              <input className="input" disabled value={product.stock} />
              <span className="field-hint">Change stock from the Inventory page so it is recorded.</span>
            </div>
          ) : (
            <label className="field">Opening stock<input className="input" required type="number" min={0} step={1} value={form.stock} onChange={set('stock')} /></label>
          )}
          <label className="field">Image path<input className="input" value={form.imageUrl} onChange={set('imageUrl')} placeholder="/products/samba-rice.svg" /></label>
          <label className="field wide">Description<textarea className="input" rows={3} value={form.description} onChange={set('description')} /></label>
          <label className="check wide"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} />Show in the shop</label>
        </div>
        {error && <div className="alert alert-error" role="alert" style={{ marginTop: 16 }}>{error}</div>}
        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : product ? 'Save changes' : 'Add product'}</button>
        </div>
      </form>
    </Modal>
  );
}

export default function Products() {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const q = useDebounced(search, 300);
  const [categoryId, setCategoryId] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Product | 'new' | null>(null);

  const cats = useAsync(() => api<Category[]>('/categories'), []);
  const { data, error, loading, reload } = useAsync(
    () => api<Paginated<Product>>('/products/manage', { query: { search: q, categoryId, page, limit: 10, sort: 'name' } }),
    [q, categoryId, page],
  );

  const setActive = async (p: Product, isActive: boolean) => {
    if (!isActive && !window.confirm(`Archive “${p.name}”? It disappears from the shop but past orders keep it.`)) return;
    try {
      if (isActive) await api(`/products/${p.id}`, { method: 'PATCH', body: { isActive: true } });
      else await api(`/products/${p.id}`, { method: 'DELETE' });
      toast(isActive ? `${p.name} is back in the shop` : `${p.name} archived`);
      reload();
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };

  return (
    <>
      <PageHeader
        title="Products"
        subtitle="The catalogue customers see in the shop."
        actions={<button className="btn btn-primary" onClick={() => setEditing('new')} disabled={!cats.data}>Add product</button>}
      />

      <div className="admin-toolbar">
        <input className="input" type="search" placeholder="Search by name or SKU" aria-label="Search products" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        <select className="input select" aria-label="Filter by category" value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setPage(1); }}>
          <option value="">All categories</option>
          {cats.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {data && <span className="muted">{data.total} product{data.total === 1 ? '' : 's'}</span>}
      </div>

      {error ? <ErrorBox message={error} onRetry={reload} /> : loading && !data ? <Spinner /> : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>Product</th><th>Category</th><th className="num">Price</th><th className="num">Stock</th><th>Shop</th><th /></tr>
            </thead>
            <tbody>
              {data?.items.map((p) => (
                <tr key={p.id} className={p.isActive ? '' : 'faded'}>
                  <td>
                    <div className="cell-product">
                      <img src={p.imageUrl ?? ''} alt="" width={44} height={44} />
                      <div><strong>{p.name}</strong><small>{p.sku} · {p.unit}</small></div>
                    </div>
                  </td>
                  <td>{p.category.name}</td>
                  <td className="num">{money(p.price)}</td>
                  <td className="num">{p.stock > 0 && p.stock <= p.reorderLevel && <span className="tag tag-low">Low</span>}{p.stock === 0 && <span className="tag tag-out">Out</span>} {p.stock}</td>
                  <td>{p.isActive ? 'Visible' : 'Archived'}</td>
                  <td>
                    <div className="row-actions">
                      <button className="btn btn-ghost btn-sm" onClick={() => setEditing(p)}>Edit</button>
                      {p.isActive
                        ? <button className="btn btn-danger-outline btn-sm" onClick={() => setActive(p, false)}>Archive</button>
                        : <button className="btn btn-ghost btn-sm" onClick={() => setActive(p, true)}>Restore</button>}
                    </div>
                  </td>
                </tr>
              ))}
              {data?.items.length === 0 && <tr><td colSpan={6}><div className="empty">No products match your search.</div></td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {data && <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />}

      {editing && cats.data && (
        <ProductForm
          product={editing === 'new' ? null : editing}
          categories={cats.data}
          onClose={() => setEditing(null)}
          onDone={() => { setEditing(null); reload(); }}
        />
      )}
    </>
  );
}
