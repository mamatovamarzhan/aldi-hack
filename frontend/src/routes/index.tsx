import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useId, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { copy } from "@/shared/copy/patient";
import { authCopy } from "@/shared/copy/auth";
import { logout, useRequireRole } from "@/features/auth/session";
import { readClinic } from "@/features/session/storage";
import { requestMic } from "@/features/voice/mic";
import { AldiOrb } from "@/shared/ui/sky/AldiOrb";
import { SupportiveLine } from "@/shared/ui/sky/SupportiveLine";
import { AldiTitle } from "@/shared/ui/patient/AldiTitle";
import { Caption } from "@/shared/ui/patient/Caption";
import { SparkPrimary } from "@/shared/ui/patient/PrimaryAction";
import { ROUTE_DELAY_MS } from "@/shared/ui/patient/effects";

export const Route = createFileRoute("/")({
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
  staticData: { patient: "full" },
  component: StartScreen,
});

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function StartScreen() {
  const navigate = useNavigate();
  const me = useRequireRole("PATIENT");
  const consentId = useId();
  const helperId = useId();
  const [agreed, setAgreed] = useState(false);
  const [clinic, setClinic] = useState<string | null>(null);
  useEffect(() => setClinic(readClinic(window.location.search)), []);

  const talk = async () => {
    // Microphone permission is requested on the tap itself; only the route change waits for the spark burst.
    const [mic] = await Promise.all([requestMic(), wait(ROUTE_DELAY_MS)]);
    if (!mic) { toast(copy.start.micUnavailable); return; }
    void navigate({ to: "/call" });
  };

  if (!me) return null;

  return (
    <>
      <AldiTitle />
      <AldiOrb placement="start" />
      <SupportiveLine />
      <p className="card-patient w-full p-5 text-center text-text-muted">{copy.start.text}</p>
      <p className="caption">{clinic ? copy.start.clinicLine : copy.start.noClinicLine}</p>

      <label htmlFor={consentId} className="card-patient flex w-full cursor-pointer items-start gap-3 p-4 text-left text-base">
        <Checkbox id={consentId} checked={agreed} onCheckedChange={v => setAgreed(v === true)} aria-describedby={agreed ? undefined : helperId} className="consent-check mt-0.5" />
        <span>{copy.start.consent}</span>
      </label>
      {!agreed && <Caption id={helperId}>{copy.start.consentHelper}</Caption>}

      <SparkPrimary disabled={!agreed} caption={copy.start.talkCaption} onClick={() => void talk()}>{copy.start.talk}</SparkPrimary>
      <div className="w-full">
        <div className="glass-label w-full p-0">
          <Button variant="patientGhost" size="patient" className="w-full" disabled={!agreed} onClick={() => void navigate({ to: "/text" })}>{copy.start.write}</Button>
        </div>
        <Caption>{copy.start.writeCaption}</Caption>
      </div>

      <p className="caption mt-4">{copy.start.footer}</p>
      <button type="button" className="caption underline" onClick={() => void logout().then(() => navigate({ to: "/login" }))}>{authCopy.logout}</button>
    </>
  );
}
