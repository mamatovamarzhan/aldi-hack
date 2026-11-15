import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";

import { copy } from "@/shared/copy/patient";
import { buildCardFromText } from "@/features/session/remote";
import { saveCard } from "@/features/session/storage";
import { useRequireRole } from "@/features/auth/session";
import { Caption } from "@/shared/ui/patient/Caption";
import { SparkPrimary } from "@/shared/ui/patient/PrimaryAction";
import { ROUTE_DELAY_MS } from "@/shared/ui/patient/effects";

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
  staticData: { patient: "veil" },
  component: TextScreen,
});

/** Sample wording the user can insert; working text until the final example is provided. */
const EXAMPLE = "Последние две недели по вечерам тянет внизу живота. Сплю плохо, просыпаюсь уставшей.";

function TextScreen() {
  const navigate = useNavigate();
  const fieldId = useId();
  const me = useRequireRole("PATIENT");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const empty = text.trim().length === 0;

  const build = async () => {
    setBusy(true);
    try {
      const [card] = await Promise.all([buildCardFromText(text), new Promise(resolve => setTimeout(resolve, ROUTE_DELAY_MS))]);
      saveCard(card);
      void navigate({ to: "/card" });
    } catch {
      // The text stays in the field, so nothing is lost and the patient can try again.
      toast(copy.call.error);
      setBusy(false);
    }
  };

  if (!me) return null;

  return (
    <>
      <Link to="/" className="back-link self-start"><ChevronLeft aria-hidden="true" className="size-5" />{copy.text.back}</Link>
      <h1 className="screen-title w-full">{copy.text.title}</h1>
      <label htmlFor={fieldId} className="w-full text-text-muted">{copy.text.hint}</label>
      <textarea id={fieldId} disabled={busy} value={text} onChange={e => setText(e.target.value)} rows={7} className="card-patient patient-textarea w-full p-5" />
      <div className="w-full">
        <button type="button" className="example-chip w-full" onClick={() => setText(EXAMPLE)}>«{EXAMPLE}»</button>
        <Caption>{copy.text.exampleCaption}</Caption>
      </div>
      <SparkPrimary disabled={empty || busy} caption={busy ? copy.call.ending : copy.text.buildCaption} onClick={() => void build()}>{copy.text.build}</SparkPrimary>
    </>
  );
}
