import { Moon, Sun } from 'lucide-react';
import { appCopy } from '@/shared/copy/app';
import { setTheme } from '../sky/theme';
import { useSkyPhase } from '../sky/useSkyPhase';

/** Switches the patient sky between day and night. The choice is remembered on this device. */
export function ThemeToggle() {
  const night = useSkyPhase() === 'night';
  const label = night ? appCopy.theme.toDay : appCopy.theme.toNight;
  return (
    <button type="button" className="theme-toggle no-print" aria-label={label} title={label} onClick={() => setTheme(night ? 'day' : 'night')}>
      {night ? <Sun aria-hidden="true" className="size-5" /> : <Moon aria-hidden="true" className="size-5" />}
    </button>
  );
}
