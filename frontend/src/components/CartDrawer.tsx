import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { FREE_DELIVERY_THRESHOLD, money } from '../lib/format';

export default function CartDrawer() {
  const { lines, open, setOpen, setQty, remove, subtotal, deliveryFee, total, count } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, setOpen]);

  const remaining = Math.max(0, FREE_DELIVERY_THRESHOLD - subtotal);
  const progress = Math.min(100, (subtotal / FREE_DELIVERY_THRESHOLD) * 100);

  const checkout = () => {
    setOpen(false);
    navigate(user ? '/checkout' : '/login', { state: { from: '/checkout' } });
  };

  return (
    <>
      <div className={`overlay ${open ? 'show' : ''}`} onClick={() => setOpen(false)} aria-hidden="true" />
      <aside className={`drawer ${open ? 'open' : ''}`} aria-label="Shopping cart" aria-hidden={!open}>
        <div className="drawer-head">
          <h2>Your cart <span className="muted">({count})</span></h2>
          <button className="icon-btn" onClick={() => setOpen(false)} aria-label="Close cart">✕</button>
        </div>

        {lines.length === 0 ? (
          <div className="empty">
            <img src="/products/bananas-ambul.svg" alt="" width={120} height={120} />
            <p>Your cart is empty.</p>
            <Link to="/shop" className="btn btn-primary" onClick={() => setOpen(false)}>Start shopping</Link>
          </div>
        ) : (
          <>
            <div className="free-ship">
              {remaining > 0 ? <span>Add <strong>{money(remaining)}</strong> more for <strong>free delivery</strong></span> : <span>🎉 You've unlocked <strong>free delivery</strong></span>}
              <div className="progress"><span style={{ width: `${progress}%` }} /></div>
            </div>
            <ul className="cart-lines">
              {lines.map(({ product, qty }) => (
                <li key={product.id} className="cart-line">
                  <img src={product.imageUrl ?? ''} alt="" width={64} height={64} />
                  <div className="cart-line-body">
                    <strong>{product.name}</strong>
                    <small className="muted">{product.unit} · {money(product.price)}</small>
                    <div className="stepper" role="group" aria-label={`Quantity of ${product.name}`}>
                      <button onClick={() => setQty(product.id, qty - 1)} aria-label="Decrease">−</button>
                      <span>{qty}</span>
                      <button onClick={() => setQty(product.id, qty + 1)} disabled={qty >= product.stock} aria-label="Increase">+</button>
                    </div>
                  </div>
                  <div className="cart-line-end">
                    <strong>{money(product.price * qty)}</strong>
                    <button className="link-btn danger" onClick={() => remove(product.id)}>Remove</button>
                  </div>
                </li>
              ))}
            </ul>
            <div className="drawer-foot">
              <dl className="totals">
                <div><dt>Subtotal</dt><dd>{money(subtotal)}</dd></div>
                <div><dt>Delivery</dt><dd>{deliveryFee === 0 ? 'Free' : money(deliveryFee)}</dd></div>
                <div className="grand"><dt>Total</dt><dd>{money(total)}</dd></div>
              </dl>
              <button className="btn btn-primary btn-block" onClick={checkout}>{user ? 'Checkout' : 'Log in to checkout'}</button>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
