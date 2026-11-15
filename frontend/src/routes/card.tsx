import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Pencil } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { copy } from "@/shared/copy/patient";
import { FIELDS, displayValue, doctorPhrase, editField, markSent, MISSING, type Card, type FieldId } from "@/features/session/card";
import { clearCard, loadCard, saveCard } from "@/features/session/storage";
import { DeleteSheet } from "@/shared/ui/patient/DeleteSheet";
import { SparkPrimary } from "@/shared/ui/patient/PrimaryAction";
import { UrgentBanner } from "@/shared/ui/patient/UrgentBanner";
import { ROUTE_DELAY_MS } from "@/shared/ui/patient/effects";

export const Route = createFileRoute("/card")({
  head: () => ({
    meta: [
      { title: "Aldi" },
      { name: "description", content: "Aldi" },
      { property: "og:title", content: "Aldi" },
      { property: "og:description", content: "Aldi" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  staticData: { patient: "veil" },
  component: CardScreen,
});

function CardScreen() {
  const navigate = useNavigate();
  const [card, setCard] = useState<Card | null>(null);
  const [editing, setEditing] = useState<FieldId | null>(null);
  const [draft, setDraft] = useState("");
  const [showTranscript, setShowTranscript] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    const saved = loadCard();
    if (!saved) { void navigate({ to: "/", replace: true }); return; }
    setCard(saved);
  }, [navigate]);

  if (!card) return null;

  const update = (next: Card) => { setCard(next); saveCard(next); };
  const startEdit = (id: FieldId) => { setEditing(id); setDraft(card.fields[id].value ?? ""); };
  const commit = () => { if (editing) update(editField(card, editing, draft)); setEditing(null); };
  const phrase = doctorPhrase(card);

  const copyPhrase = async () => {
    try { await navigator.clipboard.writeText(phrase); toast(copy.card.copied); } catch { /* clipboard unavailable */ }
  };
  const send = () => {
    update(markSent(card));
    toast(copy.card.sent);
    setTimeout(() => void navigate({ to: "/done" }), ROUTE_DELAY_MS);
  };
  const remove = () => {
    clearCard();
    setConfirmDelete(false);
    toast(copy.deleteSheet.deleted);
    void navigate({ to: "/" });
  };

  return (
    <>
      {card.urgent && <UrgentBanner />}
      <header className="w-full space-y-3">
        <h1 className="screen-title">{copy.card.title}</h1>
        <p className="text-text-muted">{copy.card.subtitle}</p>
      </header>

      <ul className="card-patient w-full divide-y divide-border p-0">
        {FIELDS.map(({ id, label }) => {
          const field = card.fields[id];
          return (
            <li key={id} className="flex items-start gap-3 p-4">
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-sm text-text-faint">{label}</p>
                {editing === id ? (
                  <textarea autoFocus value={draft} onChange={e => setDraft(e.target.value)} onBlur={commit} onKeyDown={e => { if (e.key === "Escape") setEditing(null); if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); commit(); } }} rows={2} aria-label={label} className="patient-textarea w-full rounded-xl border border-border p-2" />
                ) : (
                  <p className={field.value ? "text-quote" : "text-missing"}>{displayValue(field)}</p>
                )}
                {field.quote && <p className="text-sm italic text-text-muted">«{field.quote}»</p>}
                {field.uncertain && <span className="inline-block rounded-full border border-warn px-3 py-1 text-sm font-bold text-uncertain-foreground">{copy.card.uncertain}</span>}
                {field.edited && <p className="text-sm text-text-faint">{copy.card.edited}</p>}
              </div>
              {editing !== id && (
                <button type="button" className="icon-button no-print" aria-label={`${label}: исправить`} onClick={() => startEdit(id)}><Pencil aria-hidden="true" className="size-5" /></button>
              )}
            </li>
          );
        })}
      </ul>

      <section className="card-patient w-full space-y-3 p-5">
        <h2 className="font-bold">{copy.card.sayTitle}</h2>
        <p className={phrase === MISSING ? "text-missing" : "text-quote"}>{phrase}</p>
        <Button variant="patientSecondary" size="patient" className="no-print w-full" disabled={phrase === MISSING} onClick={() => void copyPhrase()}>{copy.card.copy}</Button>
      </section>

      <section className="card-patient w-full space-y-3 p-5">
        <h2 className="font-bold">{copy.card.questionsTitle}</h2>
        {card.questions.length ? <ul className="list-disc space-y-1 pl-5">{card.questions.map(q => <li key={q}>{q}</li>)}</ul> : <p className="text-missing">{MISSING}</p>}
      </section>

      <div className="glass-label no-print w-full p-0">
        <Button variant="patientGhost" size="patient" className="w-full" aria-expanded={showTranscript} onClick={() => setShowTranscript(v => !v)}>{copy.card.transcriptToggle}</Button>
      </div>
      {showTranscript && <p className="card-patient w-full whitespace-pre-wrap p-5 text-quote">{card.transcript || MISSING}</p>}

      <div className="no-print flex w-full flex-col items-center gap-3">
        <SparkPrimary caption={copy.card.sendCaption} onClick={send}>{copy.card.send}</SparkPrimary>
        <div className="glass-label w-full p-0">
          <Button variant="patientGhost" size="patient" className="w-full" onClick={() => window.print()}>{copy.card.savePdf}</Button>
        </div>
        <div className="glass-label w-full p-0">
          <Button variant="patientGhost" size="patient" className="w-full" onClick={() => setConfirmDelete(true)}>{copy.card.deleteAll}</Button>
        </div>
      </div>

      <DeleteSheet open={confirmDelete} onConfirm={remove} onClose={() => setConfirmDelete(false)} />
    </>
  );
}
