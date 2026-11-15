import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { appCopy } from "@/shared/copy/app";
import { authCopy } from "@/shared/copy/auth";
import { logout, useRequireRole } from "@/features/auth/session";
import { CONSENT_VERSION, loadOverview, type Overview } from "@/features/session/remote";
import { hasConsent, saveCard } from "@/features/session/storage";
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
  staticData: { patient: "full", nav: true },
  component: HomeScreen,
});

const t = appCopy.home;
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function HomeScreen() {
  const navigate = useNavigate();
  const me = useRequireRole("PATIENT");
  // What the patient really has on the server; nothing is invented for an empty account.
  const [overview, setOverview] = useState<Overview | null>(null);
  useEffect(() => { if (me) loadOverview().then(setOverview).catch(() => setOverview({ card: null, unfinished: null })); }, [me]);

  if (!me) return null;

  const talk = async () => {
    // The first conversation starts with the consent screen.
    if (!hasConsent(CONSENT_VERSION)) { await wait(ROUTE_DELAY_MS); void navigate({ to: "/assistant" }); return; }
    // Microphone permission is requested on the tap itself; only the route change waits for the spark burst.
    const [mic] = await Promise.all([requestMic(), wait(ROUTE_DELAY_MS)]);
    if (!mic) { toast(appCopy.voice.micDenied); void navigate({ to: "/text" }); return; }
    void navigate({ to: "/call" });
  };
  const write = () => void navigate({ to: hasConsent(CONSENT_VERSION) ? "/text" : "/assistant" });
  const openCard = () => { if (overview?.card) saveCard(overview.card); void navigate({ to: "/card" }); };

  const card = overview?.card ?? null;
  return (
    <>
      <AldiTitle />
      <AldiOrb placement="start" />
      <SupportiveLine />
      <p className="card-patient w-full p-5 text-center text-text-muted">{t.lead}</p>

      {overview?.unfinished && (
        <div className="w-full">
          <Button variant="patientSecondary" size="patient" className="w-full" onClick={() => void navigate({ to: "/text" })}>{t.continueTalk}</Button>
          <Caption>{t.continueCaption}</Caption>
        </div>
      )}
      {!overview?.unfinished && card && !card.sentAt && (
        <div className="w-full">
          <Button variant="patientSecondary" size="patient" className="w-full" onClick={openCard}>{t.openCard}</Button>
          <Caption>{t.openCardCaption}</Caption>
        </div>
      )}

      <SparkPrimary caption={t.talkCaption} onClick={() => void talk()}>{t.talk}</SparkPrimary>
      <div className="w-full">
        <div className="glass-label w-full p-0">
          <Button variant="patientGhost" size="patient" className="w-full" onClick={write}>{t.write}</Button>
        </div>
        <Caption>{t.writeCaption}</Caption>
      </div>

      <div className="grid w-full gap-4 sm:grid-cols-2">
        <section className="card-patient flex flex-col gap-2 p-5">
          <h2 className="font-bold">{t.cardTitle}</h2>
          <p className="flex-1 text-base text-text-muted">{!card ? t.cardEmpty : card.sentAt ? t.cardSent : t.cardReady}</p>
          {card && <button type="button" className="back-link self-start" onClick={openCard}>{t.open}</button>}
        </section>
        <section className="card-patient flex flex-col gap-2 p-5">
          <h2 className="font-bold">{t.exercisesTitle}</h2>
          <p className="flex-1 text-base text-text-muted">{t.exercisesText}</p>
          <Link to="/exercises" className="back-link self-start">{t.open}</Link>
        </section>
      </div>

      <p className="caption mt-2">{t.footer}</p>
      <button type="button" className="caption underline" onClick={() => void logout().then(() => navigate({ to: "/login" }))}>{authCopy.logout}</button>
    </>
  );
}
