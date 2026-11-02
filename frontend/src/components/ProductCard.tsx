import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { money } from '../lib/format';
import type { Product } from '../lib/types';

export function StockTag({ product }: { product: Pick<Product, 'stock' | 'reorderLevel'> }) {
  if (product.stock === 0) return <span className="tag tag-out">Out of stock</span>;
  if (product.stock <= product.reorderLevel) return <span className="tag tag-low">Only {product.stock} left</span>;
  return null;
}

export default function ProductCard({ product }: { product: Product }) {
  const { add, qtyOf, setQty } = useCart();
  const toast = useToast();
  const qty = qtyOf(product.id);
  const out = product.stock === 0;

  return (
    <article className="card product-card">
      <Link to={`/product/${product.id}`} className="product-img" aria-label={product.name}>
        <img src={product.imageUrl ?? ''} alt={product.name} loading="lazy" width={400} height={400} />
        <StockTag product={product} />
      </Link>
      <div className="product-body">
        <small className="muted">{product.category.name}</small>
        <Link to={`/product/${product.id}`} className="product-name">{product.name}</Link>
        <small className="muted">{product.unit}</small>
        <div className="product-foot">
          <strong className="price">{money(product.price)}</strong>
          {qty > 0 ? (
            <div className="stepper" role="group" aria-label={`Quantity of ${product.name}`}>
              <button onClick={() => setQty(product.id, qty - 1)} aria-label="Decrease">−</button>
              <span>{qty}</span>
              <button onClick={() => setQty(product.id, qty + 1)} disabled={qty >= product.stock} aria-label="Increase">+</button>
            </div>
          ) : (
            <button className="btn btn-primary btn-sm" disabled={out} onClick={() => { add(product); toast(`${product.name} added to cart`); }}>
              {out ? 'Sold out' : 'Add'}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
