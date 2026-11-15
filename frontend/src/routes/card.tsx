import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Pencil } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { appCopy } from "@/shared/copy/app";
import { authCopy } from "@/shared/copy/auth";
import { copy } from "@/shared/copy/patient";
import { FIELDS, displayValue, doctorPhrase, mentionsPelvicFloor, MISSING, type Card, type FieldId } from "@/features/session/card";
import { fetchTranslation, loadOverview, removeIntake, saveField, sendToDoctor, type CardTranslation } from "@/features/session/remote";
import { clearCard, loadCard, saveCard } from "@/features/session/storage";
import { useRequireRole } from "@/features/auth/session";
import { ConfirmSheet } from "@/shared/ui/patient/ConfirmSheet";
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
  staticData: { patient: "veil", nav: true },
  component: CardScreen,
});

const t = appCopy.card;

function CardScreen() {
  const navigate = useNavigate();
  const me = useRequireRole("PATIENT");
  // undefined: still loading; null: the patient has no card yet.
  const [card, setCard] = useState<Card | null | undefined>(undefined);
  const [translation, setTranslation] = useState<CardTranslation | null>(null);
  const [editing, setEditing] = useState<FieldId | null>(null);
  const [draft, setDraft] = useState("");
  const [showTranscript, setShowTranscript] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmSend, setConfirmSend] = useState(false);
  const [busy, setBusy] = useState(false);

  // The browser copy only paints the screen at once; the card shown is always the latest one on the server.
  useEffect(() => {
    if (!me) return;
    let alive = true;
    const cached = loadCard();
    if (cached?.intakeId) setCard(cached);
    loadOverview()
      .then(o => o.card)
      .then(result => {
        if (!alive) return;
        setCard(result && result.version > 0 ? result : null);
        if (result && result.version > 0) saveCard(result); else clearCard();
      })
      .catch(() => { if (alive && !cached?.intakeId) setCard(null); });
    return () => { alive = false; };
  }, [me]);

  // A translation is shown only when the conversation was not in the interface language.
  useEffect(() => {
    setTranslation(null);
    if (card) fetchTranslation(card).then(setTranslation).catch(() => undefined);
  }, [card?.intakeId, card?.version]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!me || card === undefined) return null;

  if (card === null) {
    return (
      <>
        <header className="w-full space-y-3">
          <h1 className="screen-title">{t.emptyTitle}</h1>
          <p className="text-text-muted">{t.emptyText}</p>
        </header>
        <Button variant="patient" size="patient" className="w-full" onClick={() => void navigate({ to: "/assistant" })}>{appCopy.home.talk}</Button>
      </>
    );
  }

  const update = (next: Card) => { setCard(next); saveCard(next); };
  const startEdit = (id: FieldId) => { setEditing(id); setDraft(card.fields[id].value ?? ""); };
  const commit = () => {
    const id = editing;
    setEditing(null);
    if (!id || (card.fields[id].value ?? "") === draft.trim()) return;
    saveField(card, id, draft).then(update).catch(() => toast(authCopy.saveFailed));
  };
  const phrase = doctorPhrase(card);
  const doctor = me.doctors?.[0];

  const copyPhrase = async () => {
    try { await navigator.clipboard.writeText(phrase); toast(copy.card.copied); } catch { /* clipboard unavailable */ }
  };
  // «Отправлено» appears only after the server confirmed the share.
  const send = async () => {
    if (!doctor) return;
    setBusy(true);
    try {
      update(await sendToDoctor(card, doctor.id));
      setConfirmSend(false);
      toast(copy.card.sent);
      setTimeout(() => void navigate({ to: "/done" }), ROUTE_DELAY_MS);
    } catch {
      setConfirmSend(false);
      toast(authCopy.saveFailed);
    } finally {
      setBusy(false);
    }
  };
  const keep = () => { toast(t.kept); void navigate({ to: "/" }); };
  const remove = async () => {
    try {
      await removeIntake(card);
      clearCard();
      setConfirmDelete(false);
      toast(copy.deleteSheet.deleted);
      void navigate({ to: "/" });
    } catch {
      setConfirmDelete(false);
      toast(authCopy.saveFailed);
    }
  };

  return (
    <>
      {card.urgent && <UrgentBanner />}
      <header className="w-full space-y-3">
        <div className="flex items-start justify-between gap-3">
          <h1 className="screen-title">{copy.card.title}</h1>
          {card.sentAt && <span className="status-sent shrink-0">{t.sentStatus}</span>}
        </div>
        <p className="text-text-muted">{copy.card.subtitle}</p>
        {card.changedAfterSend && <p className="card-patient p-4 text-base">{t.changedAfterSend}</p>}
      </header>

      <ul className="card-patient w-full divide-y divide-border p-0">
        {FIELDS.map(({ id, label }) => {
          const field = card.fields[id];
          const translated = translation?.fields[id];
          return (
            <li key={id} className="flex items-start gap-3 p-4">
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-sm text-text-faint">{label}</p>
                {editing === id ? (
                  <textarea autoFocus value={draft} onChange={e => setDraft(e.target.value)} onBlur={commit} onKeyDown={e => { if (e.key === "Escape") setEditing(null); if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); commit(); } }} rows={2} aria-label={label} className="patient-textarea w-full rounded-xl border border-border p-2" />
                ) : (
                  <p className={field.value ? "text-quote" : "text-missing"}>{displayValue(field)}</p>
                )}
                {/* Quotes stay in the language the patient spoke. */}
                {field.quote && <p className="card-quote">«{field.quote}»</p>}
                {translated?.value && (
                  <p className="text-sm text-text-muted"><span className="font-bold">{t.translation}:</span> {translated.value}{translated.quoteTranslation ? ` — «${translated.quoteTranslation}»` : ""}</p>
                )}
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
        {translation && translation.doctorQuestions.length > 0 && (
          <div className="text-sm text-text-muted">
            <p className="font-bold">{t.translation}</p>
            <ul className="list-disc space-y-1 pl-5">{translation.doctorQuestions.map(q => <li key={q}>{q}</li>)}</ul>
          </div>
        )}
      </section>

      {/* A link to the general catalog, never a recommendation chosen for this patient; hidden when urgent. */}
      {mentionsPelvicFloor(card) && (
        <section className="card-patient no-print w-full space-y-3 p-5">
          <h2 className="font-bold">{t.exercisesBanner}</h2>
          <p className="text-base text-text-muted">{t.exercisesBannerText}</p>
          <Button asChild variant="patientSecondary" size="patient" className="w-full"><Link to="/exercises">{t.exercisesOpen}</Link></Button>
        </section>
      )}

      <div className="glass-label no-print w-full p-0">
        <Button variant="patientGhost" size="patient" className="w-full" aria-expanded={showTranscript} onClick={() => setShowTranscript(v => !v)}>{copy.card.transcriptToggle}</Button>
      </div>
      {showTranscript && <p className="card-patient w-full whitespace-pre-wrap p-5 text-quote">{card.transcript || MISSING}</p>}

      <div className="no-print flex w-full flex-col items-center gap-3">
        <Button variant="patientSecondary" size="patient" className="w-full" onClick={() => { startEdit(FIELDS[0].id); window.scrollTo({ top: 0, behavior: "smooth" }); }}>{t.edit}</Button>
        <SparkPrimary disabled={busy || card.sentAt !== null || !doctor} caption={card.sentAt ? copy.card.sent : doctor ? copy.card.sendCaption : authCopy.noDoctor} onClick={() => setConfirmSend(true)}>{copy.card.send}</SparkPrimary>
        {!card.sentAt && (
          <div className="glass-label w-full p-0">
            <Button variant="patientGhost" size="patient" className="w-full" onClick={keep}>{t.keep}</Button>
          </div>
        )}
        <div className="glass-label w-full p-0">
          <Button variant="patientGhost" size="patient" className="w-full" onClick={() => window.print()}>{copy.card.savePdf}</Button>
        </div>
        <div className="glass-label w-full p-0">
          <Button variant="patientGhost" size="patient" className="w-full" onClick={() => setConfirmDelete(true)}>{copy.card.deleteAll}</Button>
        </div>
      </div>

      {/* Separate consent to share: the recipient is named before anything is sent. */}
      <ConfirmSheet open={confirmSend} title={t.sendTitle} confirm={t.sendConfirm} cancel={t.sendCancel} busy={busy} onConfirm={() => void send()} onClose={() => setConfirmSend(false)}>
        <p><span className="font-bold">{t.sendTo}:</span> {doctor?.displayName}{doctor?.clinic ? `, ${doctor.clinic}` : ""}</p>
        <p>{t.sendText}</p>
      </ConfirmSheet>
      <DeleteSheet open={confirmDelete} onConfirm={() => void remove()} onClose={() => setConfirmDelete(false)} />
    </>
  );
}
