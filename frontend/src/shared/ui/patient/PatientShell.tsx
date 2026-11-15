import type { ReactNode } from 'react';
import { LayoutGroup } from 'motion/react';
import { SkyBackground, type SkyVariant } from '../sky/SkyBackground';
import { PatientNav } from './PatientNav';
import { ThemeToggle } from './ThemeToggle';

/** One persistent sky and shared-layout group for every patient screen; `nav` adds the bottom menu. */
export function PatientShell({ variant, nav = false, children }: { variant: SkyVariant; nav?: boolean; children: ReactNode }) {
  return (
    <section className="theme-patient relative min-h-screen px-6 py-12" data-reading={variant === 'veil' ? 'true' : undefined} data-nav={nav ? 'true' : undefined}>
      <SkyBackground variant={variant} />
      <ThemeToggle />
      <LayoutGroup>
        <main className="container-patient flex flex-col items-center gap-6">{children}</main>
      </LayoutGroup>
      {nav && <PatientNav />}
    </section>
  );
}
