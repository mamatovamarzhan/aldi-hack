import type { Card } from './card';

const KEY = 'aldi-card';
const CLINIC_KEY = 'aldi-clinic';
const CONSENT_KEY = 'aldi-consent';

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

/** Consent to processing for the conversation (not to sharing with the doctor — that is asked separately). */
export function hasConsent(version: string): boolean {
  try { return localStorage.getItem(CONSENT_KEY) === version; } catch { return false; }
}
export function giveConsent(version: string) {
  try { localStorage.setItem(CONSENT_KEY, version); } catch { /* storage unavailable */ }
}
