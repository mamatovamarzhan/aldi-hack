import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Send } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";

import { Button } from "@/components/ui/button";
import { appCopy } from "@/shared/copy/app";
import { newId } from "@/shared/api/client";
import { useRequireRole } from "@/features/auth/session";
import { completeChat, CONSENT_VERSION, loadOverview, resumeChat, sendChatMessage, startChat } from "@/features/session/remote";
import { hasConsent, saveCard } from "@/features/session/storage";
import { UrgentBanner } from "@/shared/ui/patient/UrgentBanner";

export const Route = createFileRoute("/text")({
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
  component: ChatScreen,
});

const t = appCopy.chat;

// `key` is the clientMessageId: a retry reuses it, so neither the screen nor the server gets a second copy.
type Line = { key: string; role: "patient" | "assistant"; text: string; state?: "sending" | "failed" };

function ChatScreen() {
  const navigate = useNavigate();
  const me = useRequireRole("PATIENT");
  const [lines, setLines] = useState<Line[]>([]);
  const [draft, setDraft] = useState("");
  const [urgent, setUrgent] = useState(false);
  const [ready, setReady] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [prepareFailed, setPrepareFailed] = useState(false);
  const intakeId = useRef<string | null>(null);
  const end = useRef<HTMLDivElement>(null);

  // Consent first; then pick up an unfinished conversation if there is one.
  useEffect(() => {
    if (!me) return;
    if (!hasConsent(CONSENT_VERSION)) { void navigate({ to: "/assistant", replace: true }); return; }
    let alive = true;
    loadOverview()
      .then(overview => (overview.unfinished ? resumeChat(overview.unfinished.intakeId) : null))
      .then(chat => {
        if (!alive || !chat) return;
        intakeId.current = chat.intakeId;
        setUrgent(chat.urgent);
        setLines(chat.messages.map(m => ({ key: m.id, role: m.role, text: m.text })));
      })
      .catch(() => undefined)
      .finally(() => { if (alive) setReady(true); });
    return () => { alive = false; };
  }, [me, navigate]);

  useEffect(() => { end.current?.scrollIntoView({ block: "end", behavior: "smooth" }); }, [lines.length, preparing]);

  if (!me || !ready) return null;

  const busy = lines.some(l => l.state === "sending");
  const said = lines.some(l => l.role === "patient" && !l.state);

  const deliver = async (key: string, text: string) => {
    setLines(prev => prev.map(l => (l.key === key ? { ...l, state: "sending" } : l)));
    try {
      intakeId.current ??= await startChat();
      const res = await sendChatMessage(intakeId.current, text, key);
      setUrgent(res.urgent);
      setLines(prev => [
        ...prev.map(l => (l.key === key ? { key, role: "patient" as const, text } : l)),
        { key: res.assistantMessage.id, role: "assistant" as const, text: res.assistantMessage.text },
      ]);
    } catch {
      setLines(prev => prev.map(l => (l.key === key ? { ...l, state: "failed" } : l)));
    }
  };

  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    const text = draft.trim();
    if (!text || busy || preparing) return;
    const key = newId();
    setDraft("");
    setLines(prev => [...prev, { key, role: "patient", text, state: "sending" }]);
    void deliver(key, text);
  };
  const onKey = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); submit(); }
  };

  const finish = async () => {
    if (!intakeId.current) return;
    setPreparing(true);
    setPrepareFailed(false);
    try {
      saveCard(await completeChat(intakeId.current));
      void navigate({ to: "/card" });
    } catch {
      setPreparing(false);
      setPrepareFailed(true);
    }
  };

  return (
    <>
      <h1 className="screen-title w-full">{t.title}</h1>
      {urgent && <UrgentBanner />}

      <div className="flex w-full flex-col gap-3" role="log" aria-live="polite">
        {lines.length === 0 && <p className="card-patient w-full p-5 text-text-muted">{t.empty}</p>}
        {lines.map(line => (
          <div key={line.key} className={line.role === "patient" ? "chat-bubble chat-bubble-me" : "chat-bubble chat-bubble-aldi"}>
            <p className="whitespace-pre-wrap">{line.text}</p>
            {line.state === "failed" && (
              <p className="mt-2 flex flex-wrap items-center gap-3 text-sm" role="alert">
                <span className="font-bold">{t.failed}</span>
                <button type="button" className="font-bold underline" onClick={() => void deliver(line.key, line.text)}>{t.retry}</button>
              </p>
            )}
          </div>
        ))}
        {busy && <p className="chat-bubble chat-bubble-aldi text-text-muted" role="status">{t.waiting}</p>}
        {preparing && <p className="call-status w-full" role="status">{t.preparing}…</p>}
        {prepareFailed && <p className="card-patient w-full p-4 font-bold" role="alert">{t.prepareFailed}</p>}
        <div ref={end} />
      </div>

      {!preparing && (
        <div className="chat-dock">
          <form onSubmit={submit} className="card-patient flex w-full items-end gap-2 p-2">
            <textarea value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={onKey} rows={2} placeholder={t.placeholder} aria-label={t.placeholder} className="patient-textarea min-h-14 flex-1 rounded-xl p-3" />
            <button type="submit" className="icon-button" aria-label={t.send} disabled={!draft.trim() || busy}><Send aria-hidden="true" className="size-6" /></button>
          </form>
          {said && (
            <Button variant="patientSecondary" size="patient" className="mt-3 w-full" disabled={busy} onClick={() => void finish()}>
              {prepareFailed ? appCopy.common.retry : t.finish}
            </Button>
          )}
        </div>
      )}
    </>
  );
}
