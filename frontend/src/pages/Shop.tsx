import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { ErrorBox, Pagination, Spinner } from '../components/ui';
import { api } from '../lib/api';
import type { Category, Paginated, Product } from '../lib/types';
import { useAsync, useDebounced } from '../lib/useAsync';

export default function Shop() {
  const [params, setParams] = useSearchParams();
  const category = params.get('category') ?? '';
  const sort = params.get('sort') ?? 'name';
  const inStock = params.get('inStock') === 'true';
  const page = Number(params.get('page') ?? 1);
  const urlQ = params.get('q') ?? '';

  const [search, setSearch] = useState(urlQ);
  const debounced = useDebounced(search, 350);
  useEffect(() => setSearch(urlQ), [urlQ]);

  const update = (next: Record<string, string | null>) => {
    const p = new URLSearchParams(params);
    Object.entries(next).forEach(([k, v]) => (v ? p.set(k, v) : p.delete(k)));
    if (!('page' in next)) p.delete('page');
    setParams(p, { replace: true });
  };

  // keep the URL in sync with the (debounced) search box
  useEffect(() => { if (debounced !== urlQ) update({ q: debounced || null }); /* eslint-disable-next-line */ }, [debounced]);

  const cats = useAsync(() => api<Category[]>('/categories'), []);
  const { data, error, loading, reload } = useAsync(
    () => api<Paginated<Product>>('/products', { query: { search: urlQ, categoryId: category, sort, inStock: inStock || undefined, page, limit: 12 } }),
    [urlQ, category, sort, inStock, page],
  );
  const activeCat = cats.data?.find((c) => c.id === category);

  return (
    <div className="container page">
      <div className="shop-layout">
        <aside className="filters" aria-label="Filters">
          <h3>Categories</h3>
          <ul className="filter-list">
            <li><button className={!category ? 'active' : ''} onClick={() => update({ category: null })}>All products</button></li>
            {cats.data?.map((c) => (
              <li key={c.id}>
                <button className={category === c.id ? 'active' : ''} onClick={() => update({ category: c.id })}>
                  {c.name}<span>{c.productCount}</span>
                </button>
              </li>
            ))}
          </ul>
          <label className="check">
            <input type="checkbox" checked={inStock} onChange={(e) => update({ inStock: e.target.checked ? 'true' : null })} />
            In stock only
          </label>
        </aside>

        <div>
          <div className="toolbar">
            <div>
              <h1>{activeCat?.name ?? (urlQ ? `Results for “${urlQ}”` : 'All products')}</h1>
              <p className="muted">{data ? `${data.total} product${data.total === 1 ? '' : 's'}` : ' '}</p>
            </div>
            <div className="toolbar-controls">
              <input className="input" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search in shop" aria-label="Search in shop" />
              <select className="input" value={sort} onChange={(e) => update({ sort: e.target.value })} aria-label="Sort by">
                <option value="name">Name A–Z</option>
                <option value="price_asc">Price: low to high</option>
                <option value="price_desc">Price: high to low</option>
                <option value="newest">Newest</option>
              </select>
            </div>
          </div>

          {error ? <ErrorBox message={error} onRetry={reload} /> : loading && !data ? <Spinner /> : data && data.items.length === 0 ? (
            <div className="empty"><p>No products match your filters.</p><button className="btn btn-ghost" onClick={() => setParams({})}>Clear filters</button></div>
          ) : (
            <div className={`grid products ${loading ? 'dim' : ''}`}>{data?.items.map((p) => <ProductCard key={p.id} product={p} />)}</div>
          )}
          {data && <Pagination page={data.page} totalPages={data.totalPages} onChange={(p) => { update({ page: String(p) }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />}
        </div>
      </div>
    </div>
  );
}
