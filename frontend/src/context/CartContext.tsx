import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DELIVERY_FEE, FREE_DELIVERY_THRESHOLD } from '../lib/format';
import type { Product } from '../lib/types';

export interface CartLine {
  product: Pick<Product, 'id' | 'name' | 'price' | 'unit' | 'imageUrl' | 'stock'>;
  qty: number;
}

interface CartState {
  lines: CartLine[];
  count: number;
  subtotal: number;
  deliveryFee: number;
  total: number;
  open: boolean;
  setOpen: (open: boolean) => void;
  qtyOf: (productId: string) => number;
  add: (product: Product, qty?: number) => void;
  setQty: (productId: string, qty: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
}

const CART_KEY = 'sfc_cart';
const CartContext = createContext<CartState | null>(null);

const load = (): CartLine[] => {
  try { return JSON.parse(localStorage.getItem(CART_KEY) ?? '[]'); } catch { return []; }
};

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(load);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try { localStorage.setItem(CART_KEY, JSON.stringify(lines)); } catch { /* ignore */ }
  }, [lines]);

  const setQty = useCallback((id: string, qty: number) => {
    setLines((ls) => ls
      .map((l) => (l.product.id === id ? { ...l, qty: Math.min(qty, l.product.stock, 99) } : l))
      .filter((l) => l.qty > 0));
  }, []);

  const add = useCallback((p: Product, qty = 1) => {
    setLines((ls) => {
      const found = ls.find((l) => l.product.id === p.id);
      const snap = { id: p.id, name: p.name, price: p.price, unit: p.unit, imageUrl: p.imageUrl, stock: p.stock };
      if (found) return ls.map((l) => (l.product.id === p.id ? { product: snap, qty: Math.min(l.qty + qty, p.stock, 99) } : l));
      return [...ls, { product: snap, qty: Math.min(qty, p.stock, 99) }];
    });
  }, []);

  const value = useMemo<CartState>(() => {
    const subtotal = Math.round(lines.reduce((s, l) => s + l.product.price * l.qty, 0) * 100) / 100;
    const deliveryFee = subtotal === 0 || subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
    return {
      lines, subtotal, deliveryFee, total: subtotal + deliveryFee,
      count: lines.reduce((s, l) => s + l.qty, 0),
      open, setOpen, add, setQty,
      qtyOf: (id) => lines.find((l) => l.product.id === id)?.qty ?? 0,
      remove: (id) => setLines((ls) => ls.filter((l) => l.product.id !== id)),
      clear: () => setLines([]),
    };
  }, [lines, open, add, setQty]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
}
