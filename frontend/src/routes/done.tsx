import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { copy } from "@/shared/copy/patient";
import { loadCard } from "@/features/session/storage";
import { useRequireRole } from "@/features/auth/session";

export const Route = createFileRoute("/done")({
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
  component: DoneScreen,
});

function DoneScreen() {
  const navigate = useNavigate();
  const me = useRequireRole("PATIENT");
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!loadCard()) { void navigate({ to: "/", replace: true }); return; }
    setReady(true);
  }, [navigate]);
  if (!ready || !me) return null;

  return (
    <>
      <header className="w-full space-y-3">
        <h1 className="screen-title">{copy.done.title}</h1>
        <p className="text-text-muted">{copy.done.text}</p>
      </header>
      <section className="card-patient w-full space-y-3 p-5">
        <h2 className="font-bold">{copy.done.nextTitle}</h2>
        <ul className="list-disc space-y-2 pl-5">{copy.done.next.map(item => <li key={item}>{item}</li>)}</ul>
      </section>
      <Button variant="patientSecondary" size="patient" className="w-full" onClick={() => void navigate({ to: "/card" })}>{copy.done.openCard}</Button>
      <div className="glass-label w-full p-0">
        <Button variant="patientGhost" size="patient" className="w-full" onClick={() => void navigate({ to: "/" })}>{copy.done.another}</Button>
      </div>
    </>
  );
}
