import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { api } from '../lib/api';
import { money } from '../lib/format';
import type { Order, PaymentMethod } from '../lib/types';

export default function Checkout() {
  const { user } = useAuth();
  const cart = useCart();
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState({ phone: user?.phone ?? '', deliveryAddress: '', deliveryCity: 'Colombo', note: '' });
  const [payment, setPayment] = useState<PaymentMethod>('CASH_ON_DELIVERY');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  if (cart.lines.length === 0) {
    return (
      <div className="container page"><div className="empty"><p>Your cart is empty.</p><Link className="btn btn-primary" to="/shop">Browse products</Link></div></div>
    );
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const order = await api<Order>('/orders', {
        method: 'POST',
        body: {
          items: cart.lines.map((l) => ({ productId: l.product.id, quantity: l.qty })),
          paymentMethod: payment, note: form.note || undefined,
          deliveryAddress: form.deliveryAddress, deliveryCity: form.deliveryCity, phone: form.phone,
        },
      });
      cart.clear();
      toast(`Order ${order.orderNumber} placed!`);
      navigate(`/orders/${order.id}`, { state: { placed: true } });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container page">
      <h1>Checkout</h1>
      <form className="checkout" onSubmit={submit}>
        <div className="card pad stack">
          <h2>Delivery details</h2>
          <label className="field">Full name<input className="input" value={user?.fullName ?? ''} disabled /></label>
          <div className="row2">
            <label className="field">Phone<input className="input" required value={form.phone} onChange={set('phone')} placeholder="077 123 4567" inputMode="tel" /></label>
            <label className="field">City<input className="input" required value={form.deliveryCity} onChange={set('deliveryCity')} /></label>
          </div>
          <label className="field">Delivery address<input className="input" required minLength={5} value={form.deliveryAddress} onChange={set('deliveryAddress')} placeholder="No. / street / area" /></label>
          <label className="field">Note for the rider (optional)<textarea className="input" rows={2} value={form.note} onChange={set('note')} placeholder="e.g. Call at the gate" /></label>

          <h2>Payment</h2>
          <div className="radio-cards">
            <label className={payment === 'CASH_ON_DELIVERY' ? 'selected' : ''}>
              <input type="radio" name="pay" checked={payment === 'CASH_ON_DELIVERY'} onChange={() => setPayment('CASH_ON_DELIVERY')} />
              <strong>Cash on delivery</strong><small>Pay the rider when your order arrives</small>
            </label>
            <label className={payment === 'CARD' ? 'selected' : ''}>
              <input type="radio" name="pay" checked={payment === 'CARD'} onChange={() => setPayment('CARD')} />
              <strong>Card on delivery</strong><small>Rider brings a card machine (demo — no payment is taken)</small>
            </label>
          </div>
        </div>

        <aside className="card pad summary">
          <h2>Order summary</h2>
          <ul className="summary-lines">
            {cart.lines.map(({ product, qty }) => (
              <li key={product.id}><img src={product.imageUrl ?? ''} alt="" width={44} height={44} /><span>{qty} × {product.name}</span><strong>{money(product.price * qty)}</strong></li>
            ))}
          </ul>
          <dl className="totals">
            <div><dt>Subtotal</dt><dd>{money(cart.subtotal)}</dd></div>
            <div><dt>Delivery</dt><dd>{cart.deliveryFee === 0 ? 'Free' : money(cart.deliveryFee)}</dd></div>
            <div className="grand"><dt>Total</dt><dd>{money(cart.total)}</dd></div>
          </dl>
          {error && <div className="alert alert-error" role="alert">{error}</div>}
          <button className="btn btn-primary btn-lg btn-block" disabled={busy}>{busy ? 'Placing order…' : `Place order · ${money(cart.total)}`}</button>
        </aside>
      </form>
    </div>
  );
}
