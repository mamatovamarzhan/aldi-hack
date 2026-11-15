import type { ReactNode } from 'react';
import { LayoutGroup } from 'motion/react';
import { SkyBackground, type SkyVariant } from '../sky/SkyBackground';

/** One persistent sky and shared-layout group for every patient screen. */
export function PatientShell({ variant, children }: { variant: SkyVariant; children: ReactNode }) {
  return (
    <section className="theme-patient relative min-h-screen px-6 py-12" data-reading={variant === 'veil' ? 'true' : undefined}>
      <SkyBackground variant={variant} />
      <LayoutGroup>
        <main className="container-patient flex flex-col items-center gap-6">{children}</main>
      </LayoutGroup>
    </section>
  );
}
