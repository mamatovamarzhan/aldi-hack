import { useEffect, useId, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';

/** Bottom sheet that asks for one explicit decision. No sparks here. */
export function ConfirmSheet({ open, title, children, confirm, cancel, busy = false, onConfirm, onClose }: {
  open: boolean; title: string; children: ReactNode; confirm: string; cancel: string; busy?: boolean; onConfirm: () => void; onClose: () => void;
}) {
  const titleId = useId();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="sheet-scrim" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} className="sheet-bottom sheet-panel" onClick={e => e.stopPropagation()}>
        <h2 id={titleId} className="text-xl font-bold">{title}</h2>
        <div className="space-y-2 text-text-muted">{children}</div>
        <Button variant="patient" size="patient" className="w-full" disabled={busy} onClick={onConfirm} autoFocus>{confirm}</Button>
        <Button variant="patientGhost" size="patient" className="w-full" onClick={onClose}>{cancel}</Button>
      </div>
    </div>
  );
}
