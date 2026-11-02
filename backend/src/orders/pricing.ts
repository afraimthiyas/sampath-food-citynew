export const FREE_DELIVERY_THRESHOLD = 5000; // LKR
export const DELIVERY_FEE = 350; // LKR

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export interface PricedLine {
  unitPrice: number;
  quantity: number;
}

/** Pure pricing rules: subtotal + flat delivery fee, waived above the free-delivery threshold. */
export function computeTotals(lines: PricedLine[]) {
  const subtotal = round2(lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0));
  const deliveryFee = subtotal === 0 || subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
  return { subtotal, deliveryFee, total: round2(subtotal + deliveryFee) };
}

export const formatOrderNumber = (seq: number) => `SFC-${String(seq).padStart(6, '0')}`;
