import { computeTotals, DELIVERY_FEE, formatOrderNumber, FREE_DELIVERY_THRESHOLD, round2 } from './pricing';
import { OrderStatus } from './order.entity';
import { canTransition } from './status-flow';

describe('computeTotals', () => {
  it('adds the flat delivery fee below the free-delivery threshold', () => {
    const t = computeTotals([{ unitPrice: 380, quantity: 2 }, { unitPrice: 120, quantity: 1 }]);
    expect(t).toEqual({ subtotal: 880, deliveryFee: DELIVERY_FEE, total: 880 + DELIVERY_FEE });
  });

  it('waives delivery at exactly the threshold', () => {
    const t = computeTotals([{ unitPrice: FREE_DELIVERY_THRESHOLD, quantity: 1 }]);
    expect(t.deliveryFee).toBe(0);
    expect(t.total).toBe(FREE_DELIVERY_THRESHOLD);
  });

  it('avoids floating point drift', () => {
    expect(round2(0.1 + 0.2)).toBe(0.3);
    expect(computeTotals([{ unitPrice: 19.99, quantity: 3 }]).subtotal).toBe(59.97);
  });
});

describe('formatOrderNumber', () => {
  it('zero-pads to six digits', () => expect(formatOrderNumber(42)).toBe('SFC-000042'));
});

describe('order status flow', () => {
  it('allows the happy path in order', () => {
    const path = [OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.PACKED, OrderStatus.OUT_FOR_DELIVERY, OrderStatus.DELIVERED];
    for (let i = 0; i < path.length - 1; i++) expect(canTransition(path[i], path[i + 1])).toBe(true);
  });

  it('allows cancelling only before the order leaves the store', () => {
    expect(canTransition(OrderStatus.PACKED, OrderStatus.CANCELLED)).toBe(true);
    expect(canTransition(OrderStatus.OUT_FOR_DELIVERY, OrderStatus.CANCELLED)).toBe(false);
  });

  it('treats DELIVERED and CANCELLED as terminal and forbids skipping steps', () => {
    expect(canTransition(OrderStatus.DELIVERED, OrderStatus.PENDING)).toBe(false);
    expect(canTransition(OrderStatus.CANCELLED, OrderStatus.CONFIRMED)).toBe(false);
    expect(canTransition(OrderStatus.PENDING, OrderStatus.DELIVERED)).toBe(false);
  });
});
