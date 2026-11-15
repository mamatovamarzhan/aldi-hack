// One place that talks to the backend. Contracts: docs/API_CONTRACTS.md.
// Dev: requests go to /api on the same origin and Vite proxies them to the backend,
// so the session cookie is first-party. Production on another domain: set VITE_API_URL.
const BASE = (import.meta.env['VITE_API_URL'] as string | undefined) ?? '';
const TOKEN_KEY = 'aldi-token';

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

/** Only used when the backend returns a token (cross-domain setups where the cookie is blocked). */
export function setToken(token: string | null) {
  try { if (token) sessionStorage.setItem(TOKEN_KEY, token); else sessionStorage.removeItem(TOKEN_KEY); } catch { /* storage unavailable */ }
}
function getToken(): string | null {
  try { return sessionStorage.getItem(TOKEN_KEY); } catch { return null; }
}

export async function api<T>(method: 'GET' | 'POST' | 'PATCH' | 'DELETE', path: string, body?: unknown, headers: Record<string, string> = {}): Promise<T> {
  const token = getToken();
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      credentials: 'include',
      headers: {
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
        ...(token && { Authorization: `Bearer ${token}` }),
        ...headers,
      },
      body: body === undefined ? null : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'NETWORK', 'Нет связи с сервером');
  }
  const json = (await res.json().catch(() => ({}))) as { data?: T; error?: { code?: string; message?: string } };
  if (!res.ok) throw new ApiError(res.status, json.error?.code ?? 'UNKNOWN', json.error?.message ?? 'Ошибка сервера');
  return json.data as T;
}

export const newId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
