import { useEffect, useId } from 'react';
import { Button } from '@/components/ui/button';
import { copy } from '@/shared/copy/patient';

/** Delete confirmation. No sparks anywhere in this sheet. */
export function DeleteSheet({ open, onConfirm, onClose }: { open: boolean; onConfirm: () => void; onClose: () => void }) {
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
        <h2 id={titleId} className="text-xl font-bold">{copy.deleteSheet.title}</h2>
        <p className="text-text-muted">{copy.deleteSheet.text}</p>
        <Button variant="patient" size="patient" className="w-full" onClick={onConfirm} autoFocus>{copy.deleteSheet.confirm}</Button>
        <Button variant="patientGhost" size="patient" className="w-full" onClick={onClose}>{copy.deleteSheet.keep}</Button>
      </div>
    </div>
  );
}
