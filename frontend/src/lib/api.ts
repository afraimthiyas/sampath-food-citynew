const BASE = import.meta.env.VITE_API_URL ?? '/api';
export const TOKEN_KEY = 'sfc_token';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

let onUnauthorized: (() => void) | null = null;
export const setUnauthorizedHandler = (fn: (() => void) | null) => { onUnauthorized = fn; };

export const getToken = () => {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
};
export const setToken = (token: string | null) => {
  try { token ? localStorage.setItem(TOKEN_KEY, token) : localStorage.removeItem(TOKEN_KEY); } catch { /* storage unavailable */ }
};

type Query = Record<string, string | number | boolean | undefined | null>;

export async function api<T>(path: string, opts: { method?: string; body?: unknown; query?: Query } = {}): Promise<T> {
  const qs = new URLSearchParams();
  Object.entries(opts.query ?? {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
  });
  const token = getToken();
  const res = await fetch(`${BASE}${path}${qs.size ? `?${qs}` : ''}`, {
    method: opts.method ?? 'GET',
    headers: {
      ...(opts.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    // A 401 on a protected call means the session expired; the login endpoint itself returns 401 for bad credentials.
    if (res.status === 401 && token && !path.startsWith('/auth/login')) onUnauthorized?.();
    const msg = Array.isArray(data?.message) ? data.message.join('. ') : data?.message ?? res.statusText;
    throw new ApiError(res.status, msg || 'Something went wrong');
  }
  return data as T;
}
