import type { Card } from './card';

const KEY = 'aldi-card';
const CLINIC_KEY = 'aldi-clinic';

export function loadCard(): Card | null {
  try { const raw = localStorage.getItem(KEY); return raw ? (JSON.parse(raw) as Card) : null; } catch { return null; }
}
export function saveCard(card: Card) {
  try { localStorage.setItem(KEY, JSON.stringify(card)); } catch { /* storage unavailable */ }
}
export function clearCard() {
  try { localStorage.removeItem(KEY); } catch { /* storage unavailable */ }
}
/** Clinic from ?clinic= (remembered for this tab). */
export function readClinic(search: string): string | null {
  const fromQuery = new URLSearchParams(search).get('clinic')?.trim();
  try {
    if (fromQuery) { sessionStorage.setItem(CLINIC_KEY, fromQuery); return fromQuery; }
    return sessionStorage.getItem(CLINIC_KEY);
  } catch { return fromQuery || null; }
}
