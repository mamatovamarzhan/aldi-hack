// The patient's own choice between the day and the night sky. Without a choice the sky follows the clock.
export type ThemeChoice = 'day' | 'night';

const KEY = 'aldi-theme';
const EVENT = 'aldi-theme-change';
// Demo override of the sky time (?time= / ?hour=), kept for the tab by SkyBackground.
const DEMO_KEY = 'aldi-sky-time';

export function readTheme(): ThemeChoice | null {
  try {
    const saved = localStorage.getItem(KEY);
    return saved === 'day' || saved === 'night' ? saved : null;
  } catch {
    return null;
  }
}

export function setTheme(choice: ThemeChoice) {
  try {
    localStorage.setItem(KEY, choice);
    // An explicit choice wins over a demo time left in this tab.
    sessionStorage.removeItem(DEMO_KEY);
  } catch { /* storage unavailable: the choice still applies until reload */ }
  window.dispatchEvent(new CustomEvent<ThemeChoice>(EVENT, { detail: choice }));
}

export function onThemeChange(listener: (choice: ThemeChoice) => void): () => void {
  const handler = (event: Event) => listener((event as CustomEvent<ThemeChoice>).detail);
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}
