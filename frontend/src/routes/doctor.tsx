import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { authCopy } from "@/shared/copy/auth";
import { FIELDS, MISSING } from "@/features/session/card";
import { logout, useRequireRole } from "@/features/auth/session";
import { getShared, listShared, markReviewed, type SharedCard, type SharedRow } from "@/features/doctor/api";

// Minimal working cabinet: the list of cards patients chose to send, one card, «Просмотрено».
// Doctor theme only; nothing here borrows patient styles.
export const Route = createFileRoute("/doctor")({
  head: () => ({ meta: [{ title: "Aldi · Кабинет врача" }, { name: "description", content: "Aldi" }] }),
  component: DoctorCabinet,
});

const t = authCopy.doctor;
const when = (iso: string) => new Date(iso).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

function StatusBadge({ row }: { row: { urgent: boolean; status: string } }) {
  if (row.urgent) return <span className="bg-destructive px-2 py-0.5 font-semibold text-destructive-foreground">{t.urgent}</span>;
  return <span className="border px-2 py-0.5 text-muted-foreground">{row.status === "REVIEWED" ? t.reviewed : t.fresh}</span>;
}

function DoctorCabinet() {
  const navigate = useNavigate();
  const me = useRequireRole("DOCTOR");
  const [rows, setRows] = useState<SharedRow[]>([]);
  const [open, setOpen] = useState<SharedCard | null>(null);

  const refresh = useCallback(() => { listShared().then(setRows).catch(() => undefined); }, []);
  // New cards appear without a reload.
  useEffect(() => {
    if (!me) return;
    refresh();
    const timer = setInterval(refresh, 5000);
    return () => clearInterval(timer);
  }, [me, refresh]);

  if (!me) return null;

  const review = async () => {
    if (!open) return;
    setOpen(await markReviewed(open.intakeId));
    refresh();
  };

  return (
    <section className="theme-doctor min-h-screen px-8 py-6">
      <header className="mb-6 flex items-baseline justify-between border-b pb-3">
        <h1 className="text-lg font-semibold">Aldi · {t.title}</h1>
        <p className="text-muted-foreground">
          {me.doctor?.displayName} · {me.doctor?.clinic} ·{" "}
          <button type="button" className="underline" onClick={() => void logout().then(() => navigate({ to: "/login" }))}>{authCopy.logout}</button>
        </p>
      </header>

      {!open && (
        <>
          <h2 className="mb-2 font-semibold">{t.listTitle} <span className="font-normal text-muted-foreground">· {t.auto}</span></h2>
          {rows.length === 0 ? <p className="text-muted-foreground">{t.empty}</p> : (
            <table className="w-full border-collapse text-left">
              <tbody>
                {rows.map(row => (
                  <tr key={row.intakeId} tabIndex={0} role="button" className={`cursor-pointer border-b hover:bg-accent ${row.urgent ? "bg-destructive/10" : ""}`}
                    onClick={() => void getShared(row.intakeId).then(setOpen)} onKeyDown={e => { if (e.key === "Enter") void getShared(row.intakeId).then(setOpen); }}>
                    <td className="w-28 py-2 pr-4 text-muted-foreground">{when(row.sharedAt)}</td>
                    <td className="w-56 py-2 pr-4 font-medium">{row.patient.displayName}</td>
                    <td className="py-2 pr-4">{row.summary ?? MISSING}</td>
                    <td className="w-32 py-2 text-right"><StatusBadge row={row} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}

      {open && (
        <article className="max-w-3xl">
          <button type="button" className="mb-4 underline" onClick={() => { setOpen(null); refresh(); }}>{t.back}</button>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-base font-semibold">{open.patient.displayName} <span className="font-normal text-muted-foreground">· {when(open.sharedAt)}</span></h2>
            <StatusBadge row={open} />
          </div>
          {open.urgent && <p role="alert" className="mb-3 border border-destructive p-2 font-semibold">{t.urgentNote}</p>}
          {open.newerDraftExists && <p className="mb-3 border p-2 text-muted-foreground">{t.newerDraft}</p>}

          <dl className="border-t">
            {FIELDS.map(({ id, label }) => {
              const f = open.card.fields[id];
              return (
                <div key={id} className="grid grid-cols-[14rem_1fr] gap-4 border-b py-2">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd>
                    <p className={f?.value ? "" : "text-muted-foreground"}>{f?.value ?? MISSING}</p>
                    {f?.quote && <p className="italic text-muted-foreground">«{f.quote}»</p>}
                    {f?.editedByPatient && <p className="text-muted-foreground">{t.edited}</p>}
                    {f?.value && f.quote && !f.quoteVerified && !f.editedByPatient && <p className="font-semibold">⚠ {t.unverified}</p>}
                  </dd>
                </div>
              );
            })}
          </dl>

          {open.card.doctorQuestions.length > 0 && (
            <>
              <h3 className="mt-4 font-semibold">{t.questions}</h3>
              <ul className="list-disc pl-5">{open.card.doctorQuestions.map(q => <li key={q}>{q}</li>)}</ul>
            </>
          )}

          <div className="mt-6">
            <Button disabled={open.status === "REVIEWED"} onClick={() => void review()}>{open.status === "REVIEWED" ? t.reviewed : t.markReviewed}</Button>
          </div>
        </article>
      )}
    </section>
  );
}
