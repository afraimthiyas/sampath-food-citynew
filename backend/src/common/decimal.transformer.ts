import { ValueTransformer } from 'typeorm';

/** Postgres returns NUMERIC as string; expose it as a JS number. */
export const decimalTransformer: ValueTransformer = {
  to: (value?: number | null) => value,
  from: (value?: string | null) => (value === null || value === undefined ? value : parseFloat(value)),
};
