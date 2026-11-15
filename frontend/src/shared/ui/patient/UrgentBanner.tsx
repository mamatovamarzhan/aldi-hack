import { copy } from '@/shared/copy/patient';

/** Safety text is never softened or restyled. */
export function UrgentBanner() {
  return (
    <div role="alert" className="banner-urgent w-full space-y-3 p-4">
      <p className="font-bold">{copy.urgent.text}</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <a href="tel:103" className="btn btn-hangup rounded-full text-lg font-bold">{copy.urgent.call103}</a>
        <a href="tel:112" className="btn btn-hangup rounded-full text-lg font-bold">{copy.urgent.call112}</a>
      </div>
    </div>
  );
}
