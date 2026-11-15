import type { ReactNode } from 'react';

/** Small text under a button: 15px, muted, centered, 6px below. */
export function Caption({ children, id }: { children: ReactNode; id?: string }) {
  return <p id={id} className="caption">{children}</p>;
}
