import { createFileRoute, Link } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { appCopy } from "@/shared/copy/app";
import { useRequireRole } from "@/features/auth/session";
import { listExercises } from "@/features/exercises/api";
import type { Exercise } from "@/features/exercises/types";

export const Route = createFileRoute("/exercises/")({
  head: () => ({ meta: [{ title: "Aldi" }, { name: "description", content: "Aldi" }] }),
  staticData: { patient: "veil", nav: true },
  component: ExercisesScreen,
});

const t = appCopy.exercises;

/** General catalog: open without a conversation, and never marked as chosen for this patient. */
function ExercisesScreen() {
  const me = useRequireRole("PATIENT");
  const [items, setItems] = useState<Exercise[] | null>(null);
  const [failed, setFailed] = useState(false);
  const load = useCallback(() => { setFailed(false); listExercises().then(setItems).catch(() => setFailed(true)); }, []);
  useEffect(() => { if (me) load(); }, [me, load]);

  if (!me) return null;

  return (
    <>
      <header className="w-full space-y-3">
        <h1 className="screen-title">{t.title}</h1>
        <p className="text-text-muted">{t.lead}</p>
      </header>

      {failed && (
        <div className="card-patient w-full space-y-3 p-5" role="alert">
          <p>{t.loadFailed}</p>
          <Button variant="patientSecondary" size="patient" className="w-full" onClick={load}>{appCopy.common.retry}</Button>
        </div>
      )}

      {items?.map(exercise => (
        <article key={exercise.id} className="card-patient w-full space-y-3 p-5">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-xl font-bold">{exercise.title ?? exercise.id}</h2>
            <span className="shrink-0 text-sm text-text-muted">{t.min(exercise.durationSec)}</span>
          </div>
          {exercise.available ? <p className="text-text-muted">{exercise.description}</p> : <p className="text-missing">{t.unavailable}</p>}
          {!exercise.reviewed && <p className="text-sm text-text-muted">{t.demoBadge}</p>}
          {exercise.locked ? (
            <div className="space-y-1 rounded-xl border border-border p-3">
              <p className="flex items-center gap-2 font-bold"><Lock aria-hidden="true" className="size-4" />{t.locked}</p>
              {exercise.unlockNote && <p className="text-text-muted">{exercise.unlockNote}</p>}
            </div>
          ) : exercise.available && (
            <Button asChild variant="patientSecondary" size="patient" className="w-full">
              <Link to="/exercises/$id" params={{ id: exercise.id }}>{t.watch}</Link>
            </Button>
          )}
        </article>
      ))}
    </>
  );
}
