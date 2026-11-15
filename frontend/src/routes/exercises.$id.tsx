import { ClientOnly, createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { appCopy } from "@/shared/copy/app";
import { useRequireRole } from "@/features/auth/session";
import { getExercise } from "@/features/exercises/api";
import { ExercisePlayer, Steps } from "@/features/exercises/player/ExercisePlayer";
import type { Exercise } from "@/features/exercises/types";

export const Route = createFileRoute("/exercises/$id")({
  head: () => ({ meta: [{ title: "Aldi" }, { name: "description", content: "Aldi" }] }),
  staticData: { patient: "veil", nav: true },
  component: ExerciseScreen,
});

const t = appCopy.exercises;

function ExerciseScreen() {
  const { id } = Route.useParams();
  const me = useRequireRole("PATIENT");
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [failed, setFailed] = useState(false);
  const load = useCallback(() => { setFailed(false); getExercise(id).then(setExercise).catch(() => setFailed(true)); }, [id]);
  useEffect(() => { if (me) load(); }, [me, load]);

  if (!me) return null;

  return (
    <>
      <Link to="/exercises" className="back-link self-start">{t.back}</Link>

      {failed && (
        <div className="card-patient w-full space-y-3 p-5" role="alert">
          <p>{t.loadFailed}</p>
          <Button variant="patientSecondary" size="patient" className="w-full" onClick={load}>{appCopy.common.retry}</Button>
        </div>
      )}

      {exercise && (
        <>
          <header className="w-full space-y-2">
            <h1 className="screen-title">{exercise.title ?? exercise.id}</h1>
            {!exercise.reviewed && <p className="text-sm text-text-muted">{t.demoBadge}</p>}
            {exercise.machineTranslated && <p className="text-sm text-text-muted">{t.draftBadge}</p>}
          </header>

          {exercise.locked ? (
            <div className="card-patient w-full space-y-2 p-5">
              <p className="font-bold">{t.locked}</p>
              {exercise.unlockNote && <p className="text-text-muted">{exercise.unlockNote}</p>}
            </div>
          ) : !exercise.available ? (
            <p className="card-patient w-full p-5 text-missing">{t.unavailable}</p>
          ) : (
            // The player needs the browser (WebGL, animation clock); until it mounts the text steps are shown.
            <ClientOnly fallback={<div className="card-patient w-full p-0"><Steps steps={exercise.steps} /></div>}>
              <ExercisePlayer key={exercise.id} exercise={exercise} />
            </ClientOnly>
          )}
        </>
      )}
    </>
  );
}
