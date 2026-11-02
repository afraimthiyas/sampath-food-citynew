import { STATUS_FLOW, STATUS_LABEL } from '../lib/format';
import type { OrderStatus } from '../lib/types';

/** Horizontal progress tracker for the order lifecycle. */
export function OrderTimeline({ status }: { status: OrderStatus }) {
  if (status === 'CANCELLED') {
    return <div className="alert alert-error">This order was cancelled. Any reserved stock has been released.</div>;
  }
  const current = STATUS_FLOW.indexOf(status);
  return (
    <ol className="timeline" aria-label="Order progress">
      {STATUS_FLOW.map((s, i) => (
        <li key={s} className={i < current ? 'done' : i === current ? 'current' : ''}>
          <span className="dot">{i < current ? '✓' : i + 1}</span>
          <span className="label">{STATUS_LABEL[s]}</span>
        </li>
      ))}
    </ol>
  );
}
