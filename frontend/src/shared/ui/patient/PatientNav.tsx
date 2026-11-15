import { Link, useRouterState } from '@tanstack/react-router';
import { Activity, FileText, Home, MessageCircle } from 'lucide-react';
import { appCopy } from '@/shared/copy/app';

const TABS = [
  { to: '/', label: appCopy.nav.home, icon: Home, match: (p: string) => p === '/' },
  { to: '/assistant', label: appCopy.nav.assistant, icon: MessageCircle, match: (p: string) => p.startsWith('/assistant') || p.startsWith('/text') || p.startsWith('/call') },
  { to: '/card', label: appCopy.nav.card, icon: FileText, match: (p: string) => p.startsWith('/card') || p.startsWith('/done') },
  { to: '/exercises', label: appCopy.nav.exercises, icon: Activity, match: (p: string) => p.startsWith('/exercises') },
] as const;

/** Bottom menu of the patient app. Fixed above the phone's safe area; screens reserve room for it. */
export function PatientNav() {
  const path = useRouterState({ select: state => state.location.pathname });
  return (
    <nav className="patient-nav no-print" aria-label={appCopy.nav.label}>
      {TABS.map(({ to, label, icon: Icon, match }) => {
        const active = match(path);
        return (
          <Link key={to} to={to} className="patient-nav-tab" data-active={active ? 'true' : undefined} aria-current={active ? 'page' : undefined}>
            <Icon aria-hidden="true" className="size-6" strokeWidth={active ? 2.6 : 2} />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
