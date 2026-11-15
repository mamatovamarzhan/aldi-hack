import { useEffect, useState } from 'react';
import { hourAt, parseOverride, phaseAt, type TimeOverride } from './time';
import type { Phase } from '../patient/effects';
import { readTheme } from './theme';

function initialPhase(): Phase {
  let override: TimeOverride | undefined = parseOverride(window.location.search);
  if (!override) {
    try { const saved = sessionStorage.getItem('aldi-sky-time'); if (saved) override = JSON.parse(saved) as TimeOverride; } catch { /* ignore */ }
  }
  const chosen = readTheme();
  if (!override && chosen) override = { time: chosen };
  return phaseAt(hourAt(override, 0, new Date()));
}

/** Current sky phase: follows the sky canvas's data-sky-phase signal, with a clock fallback before it loads. */
export function useSkyPhase(): Phase {
  const [phase, setPhase] = useState<Phase>('day');
  useEffect(() => {
    const patient = document.querySelector<HTMLElement>('.theme-patient');
    const read = () => {
      const p = patient?.dataset['skyPhase'];
      setPhase(p === 'dawn' || p === 'day' || p === 'sunset' || p === 'night' ? p : initialPhase());
    };
    read();
    if (!patient) return;
    const observer = new MutationObserver(read);
    observer.observe(patient, { attributes: true, attributeFilter: ['data-sky-phase'] });
    return () => observer.disconnect();
  }, []);
  return phase;
}
