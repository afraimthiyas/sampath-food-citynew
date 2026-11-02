import type { OrderStatus, StockReason } from './types';

export const FREE_DELIVERY_THRESHOLD = 5000; // mirrors the API rule; the server is the source of truth
export const DELIVERY_FEE = 350;

export function money(n: number): string {
  const whole = Number.isInteger(n);
  return `Rs ${n.toLocaleString('en-US', { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 })}`;
}

export const dateShort = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

export const dateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

export const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: 'Pending', CONFIRMED: 'Confirmed', PACKED: 'Packed',
  OUT_FOR_DELIVERY: 'Out for delivery', DELIVERED: 'Delivered', CANCELLED: 'Cancelled',
};

export const STATUS_FLOW: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PACKED', 'OUT_FOR_DELIVERY', 'DELIVERED'];

/** Next happy-path step (mirrors the API's transition table). */
export const nextStatus = (s: OrderStatus): OrderStatus | null => {
  const i = STATUS_FLOW.indexOf(s);
  return i >= 0 && i < STATUS_FLOW.length - 1 ? STATUS_FLOW[i + 1] : null;
};
export const canCancel = (s: OrderStatus) => s === 'PENDING' || s === 'CONFIRMED' || s === 'PACKED';

export const REASON_LABEL: Record<StockReason, string> = {
  PURCHASE: 'Stock received', SALE: 'Sale', ADJUSTMENT: 'Adjustment', DAMAGE: 'Damaged / expired', CANCELLATION: 'Order cancelled',
};
