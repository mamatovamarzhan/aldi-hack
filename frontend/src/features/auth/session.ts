import { useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { api, ApiError, setToken } from '@/shared/api/client';

export type Role = 'PATIENT' | 'DOCTOR' | 'ADMIN';
export type Me = {
  user: { id: string; role: Role; locale: string };
  patient?: { id: string; displayName: string; clinic: string };
  /** Doctors the patient may send a card to. */
  doctors?: { id: string; displayName: string; clinic: string }[];
  doctor?: { id: string; displayName: string; clinic: string };
};

const SIGNED_IN_KEY = 'aldi-signed-in';
const REASON_KEY = 'aldi-login-reason';
const flag = {
  set: (key: string, value: string | null) => { try { if (value) localStorage.setItem(key, value); else localStorage.removeItem(key); } catch { /* storage unavailable */ } },
  get: (key: string) => { try { return localStorage.getItem(key); } catch { return null; } },
};

export const fetchMe = () => api<Me>('GET', '/api/auth/me');

type SessionResponse = { user: { role: Role }; token?: string };
function opened(res: SessionResponse): Role {
  setToken(res.token ?? null);
  flag.set(SIGNED_IN_KEY, '1');
  flag.set(REASON_KEY, null);
  return res.user.role;
}

export const login = async (loginName: string, password: string) =>
  opened(await api<SessionResponse>('POST', '/api/auth/login', { login: loginName, password }));

/** First sign-in: the patient sets her own login and password from the doctor's invitation. */
export const acceptInvitation = async (token: string, loginName: string, password: string) =>
  opened(await api<SessionResponse>('POST', '/api/auth/invitations/accept', { token, login: loginName, password }));

export async function logout() {
  await api('POST', '/api/auth/logout').catch(() => undefined);
  setToken(null);
  flag.set(SIGNED_IN_KEY, null);
}

/** Why the visitor landed on the sign-in screen; read once. */
export function takeLoginReason(): 'expired' | null {
  const reason = flag.get(REASON_KEY);
  flag.set(REASON_KEY, null);
  return reason === 'expired' ? 'expired' : null;
}

export const homeFor = (role: Role) => (role === 'DOCTOR' ? '/doctor' : '/');

/** Loads the signed-in user; sends visitors to /login and wrong roles to their own home. */
export function useRequireRole(role: Role): Me | null {
  const navigate = useNavigate();
  const [me, setMe] = useState<Me | null>(null);
  useEffect(() => {
    let alive = true;
    fetchMe()
      .then(result => {
        if (!alive) return;
        if (result.user.role !== role) { void navigate({ to: homeFor(result.user.role), replace: true }); return; }
        setMe(result);
      })
      .catch(error => {
        if (!alive || !(error instanceof ApiError)) return;
        // Someone who was signed in before and is not any more: the session ended.
        if (error.status === 401 && flag.get(SIGNED_IN_KEY)) { flag.set(REASON_KEY, 'expired'); flag.set(SIGNED_IN_KEY, null); setToken(null); }
        void navigate({ to: '/login', replace: true });
      });
    return () => { alive = false; };
  }, [navigate, role]);
  return me;
}
