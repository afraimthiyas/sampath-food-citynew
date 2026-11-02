import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ProductCard, { StockTag } from '../components/ProductCard';
import { ErrorBox, Spinner } from '../components/ui';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { api } from '../lib/api';
import { money } from '../lib/format';
import type { Paginated, Product } from '../lib/types';
import { useAsync } from '../lib/useAsync';

export default function ProductPage() {
  const { id } = useParams();
  const { add, setOpen } = useCart();
  const toast = useToast();
  const [qty, setQty] = useState(1);
  const { data: product, error, loading } = useAsync(() => api<Product>(`/products/${id}`), [id]);
  const related = useAsync(
    () => (product ? api<Paginated<Product>>('/products', { query: { categoryId: product.category.id, limit: 5 } }) : Promise.resolve(null)),
    [product?.id],
  );

  if (loading) return <div className="container page"><Spinner /></div>;
  if (error || !product) return <div className="container page"><ErrorBox message={error ?? 'Product not found'} /></div>;
  const out = product.stock === 0;

  return (
    <div className="container page">
      <nav className="crumbs" aria-label="Breadcrumb"><Link to="/shop">Shop</Link> / <Link to={`/shop?category=${product.category.id}`}>{product.category.name}</Link> / {product.name}</nav>
      <div className="product-detail">
        <div className="product-detail-img card"><img src={product.imageUrl ?? ''} alt={product.name} width={520} height={520} /></div>
        <div className="product-detail-info">
          <small className="muted">{product.category.name} · SKU {product.sku}</small>
          <h1>{product.name}</h1>
          <p className="muted">{product.unit}</p>
          <div className="price-row"><strong className="price big">{money(product.price)}</strong><StockTag product={product} /></div>
          <p>{product.description}</p>
          <div className="buy-row">
            <div className="stepper stepper-lg" role="group" aria-label="Quantity">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease">−</button>
              <span>{qty}</span>
              <button onClick={() => setQty((q) => Math.min(product.stock, q + 1))} disabled={qty >= product.stock} aria-label="Increase">+</button>
            </div>
            <button className="btn btn-primary btn-lg" disabled={out} onClick={() => { add(product, qty); toast(`${qty} × ${product.name} added to cart`); setOpen(true); }}>
              {out ? 'Out of stock' : `Add to cart · ${money(product.price * qty)}`}
            </button>
          </div>
        </div>
      </div>
      {related.data && related.data.items.filter((p) => p.id !== product.id).length > 0 && (
        <section className="section">
          <div className="section-head"><h2>More from {product.category.name}</h2></div>
          <div className="grid products">{related.data.items.filter((p) => p.id !== product.id).slice(0, 4).map((p) => <ProductCard key={p.id} product={p} />)}</div>
        </section>
      )}
    </div>
  );
}
