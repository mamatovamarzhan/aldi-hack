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

export const fetchMe = () => api<Me>('GET', '/api/auth/me');

export async function login(loginName: string, password: string): Promise<Role> {
  const res = await api<{ user: { role: Role }; token?: string }>('POST', '/api/auth/login', { login: loginName, password });
  setToken(res.token ?? null);
  return res.user.role;
}

export async function logout() {
  await api('POST', '/api/auth/logout').catch(() => undefined);
  setToken(null);
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
        if (alive && error instanceof ApiError) void navigate({ to: '/login', replace: true });
      });
    return () => { alive = false; };
  }, [navigate, role]);
  return me;
}
