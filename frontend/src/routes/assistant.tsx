import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useId, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { appCopy } from "@/shared/copy/app";
import { useRequireRole } from "@/features/auth/session";
import { CONSENT_VERSION } from "@/features/session/remote";
import { giveConsent, hasConsent } from "@/features/session/storage";
import { requestMic } from "@/features/voice/mic";
import { AldiOrb } from "@/shared/ui/sky/AldiOrb";
import { Caption } from "@/shared/ui/patient/Caption";
import { SparkPrimary } from "@/shared/ui/patient/PrimaryAction";
import { ROUTE_DELAY_MS } from "@/shared/ui/patient/effects";

export const Route = createFileRoute("/assistant")({
  head: () => ({ meta: [{ title: "Aldi" }, { name: "description", content: "Aldi" }] }),
  staticData: { patient: "full", nav: true },
  component: AssistantScreen,
});

const t = appCopy.consent;
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/** Entry to the conversation: consent to processing first, then the choice between voice and text. */
function AssistantScreen() {
  const navigate = useNavigate();
  const me = useRequireRole("PATIENT");
  const consentId = useId();
  const helperId = useId();
  const [known, setKnown] = useState(false);
  const [agreed, setAgreed] = useState(false);
  useEffect(() => { const given = hasConsent(CONSENT_VERSION); setKnown(given); setAgreed(given); }, []);

  if (!me) return null;

  const speak = async () => {
    giveConsent(CONSENT_VERSION);
    const [mic] = await Promise.all([requestMic(), wait(ROUTE_DELAY_MS)]);
    if (!mic) { toast(appCopy.voice.micDenied); void navigate({ to: "/text" }); return; }
    void navigate({ to: "/call" });
  };
  const write = () => { giveConsent(CONSENT_VERSION); void navigate({ to: "/text" }); };

  return (
    <>
      <AldiOrb placement="start" />

      {!known && (
        <>
          <section className="card-patient w-full space-y-3 p-5">
            <h1 className="text-xl font-bold">{t.title}</h1>
            <ul className="list-disc space-y-2 pl-5 text-base text-text-muted">{t.points.map(point => <li key={point}>{point}</li>)}</ul>
          </section>
          <label htmlFor={consentId} className="card-patient flex w-full cursor-pointer items-start gap-3 p-4 text-left text-base">
            <Checkbox id={consentId} checked={agreed} onCheckedChange={v => setAgreed(v === true)} aria-describedby={agreed ? undefined : helperId} className="consent-check mt-0.5" />
            <span>{t.check}</span>
          </label>
          {!agreed && <Caption id={helperId}>{t.helper}</Caption>}
        </>
      )}

      <SparkPrimary disabled={!agreed} caption={appCopy.home.talkCaption} onClick={() => void speak()}>{t.voice}</SparkPrimary>
      <div className="w-full">
        <div className="glass-label w-full p-0">
          <Button variant="patientGhost" size="patient" className="w-full" disabled={!agreed} onClick={write}>{t.text}</Button>
        </div>
        <Caption>{appCopy.home.writeCaption}</Caption>
      </div>
    </>
  );
}
