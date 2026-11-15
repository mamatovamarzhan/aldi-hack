// 3D exercise player: scene, play / pause / replay, progress and breathing cues.
// Scenes (Hammock, Mannequin) and the clock come from the exercises repository unchanged;
// this file only lays them out in the patient design and feeds them data from the API.
import { lazy, memo, Suspense, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { appCopy } from '@/shared/copy/app';
import type { CuePhase, Exercise } from '../types';
import type { MannequinExercise } from './Mannequin';
import { liftForPhase, progressForPhase } from './phaseLift';
import { cueIndexAt, repetitionAt } from './timeline';
import { useTimelineClock } from './useTimelineClock';
import { WebGLBoundary } from './WebGLBoundary';

// three.js and the scenes are downloaded only when a player actually shows a canvas.
const Hammock = lazy(() => import('./Hammock').then(m => ({ default: m.Hammock })));
const Mannequin = lazy(() => import('./Mannequin').then(m => ({ default: m.Mannequin })));

const t = appCopy.exercises;

function detectWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

const isMannequinExercise = (id: string): id is MannequinExercise => id === 'pelvic-tilt' || id === 'bridge';

/** Text instructions: always shown under the player, and instead of it when 3D is unavailable. */
export function Steps({ steps, notice = false }: { steps: string[]; notice?: boolean }) {
  return (
    <div className="w-full space-y-2 p-5">
      {notice && <p className="font-bold">{t.no3d}</p>}
      <h2 className="font-bold">{t.steps}</h2>
      <ol className="list-decimal space-y-2 pl-6">{steps.map(step => <li key={step}>{step}</li>)}</ol>
    </div>
  );
}

/** Memoized so the clock's frequent re-renders do not touch the canvas unless the phase changes. */
const Visual = memo(function Visual({ exercise, phase, paused, steps }: { exercise: Exercise; phase: CuePhase | null; paused: boolean; steps: string[] }) {
  const fallback = <Steps steps={steps} notice />;
  if (exercise.visual === 'mannequin' && isMannequinExercise(exercise.id)) {
    return <Mannequin className="exercise-canvas" exercise={exercise.id} progress={phase ? progressForPhase(phase) : 0} paused={paused} label={t.visualMannequin} fallback={fallback} />;
  }
  return <Hammock className="exercise-canvas" lift={phase ? liftForPhase(phase) : 0} paused={paused} label={t.visualHammock} fallback={fallback} />;
});

export function ExercisePlayer({ exercise }: { exercise: Exercise }) {
  // WebGL is checked in the browser only; the first render (and the server) shows the loading state.
  const [webgl, setWebgl] = useState<boolean | null>(null);
  useEffect(() => setWebgl(detectWebGL()), []);
  const clock = useTimelineClock(exercise.durationSec);

  const { cues, steps } = exercise;
  const index = cueIndexAt(cues, clock.elapsed);
  const cue = cues[index];
  const rep = repetitionAt(cues, index);
  const active = clock.status === 'running' || clock.status === 'paused';
  const percent = Math.round((clock.elapsed / exercise.durationSec) * 100);
  // Before the start the first instruction is shown so the user knows what is coming.
  const cueText = clock.status === 'finished' ? t.finished : (cue?.text ?? '');
  const mainLabel = clock.status === 'running' ? t.pause : clock.status === 'paused' ? t.resume : t.play;
  const loading = <div className="exercise-canvas grid place-items-center text-text-muted">{t.loading}</div>;
  const has3d = exercise.has3d && exercise.visual !== null;

  return (
    <>
      <div className="card-patient w-full overflow-hidden p-0">
        {!has3d || webgl === false ? (
          <Steps steps={steps} notice />
        ) : webgl === null ? loading : (
          <WebGLBoundary fallback={<Steps steps={steps} notice />}>
            <Suspense fallback={loading}>
              <Visual exercise={exercise} phase={active ? (cue?.phase ?? null) : null} paused={clock.status === 'paused'} steps={steps} />
            </Suspense>
          </WebGLBoundary>
        )}
      </div>

      {/* Always visible and readable without sound. */}
      <p className="call-status min-h-[3.2em] w-full" aria-live="polite" aria-atomic="true">{cueText}</p>

      <div className="flex w-full items-center gap-3">
        <div className="exercise-progress" role="progressbar" aria-label={t.progress} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
          <div className="exercise-progress-fill" style={{ width: `${percent}%` }} />
        </div>
        <p className="min-w-[4ch] text-right tabular-nums text-text-muted" aria-label={t.repetition(rep.current, rep.total)}>{rep.current} / {rep.total}</p>
      </div>

      <div className="flex w-full gap-3">
        <Button variant="patient" size="patient" className="flex-1" onClick={clock.status === 'running' ? clock.pause : clock.play}>{mainLabel}</Button>
        <Button variant="patientSecondary" size="patient" className="flex-1" onClick={clock.replay}>{t.replay}</Button>
      </div>

      {has3d && webgl !== false && <div className="card-patient w-full p-0"><Steps steps={steps} /></div>}
    </>
  );
}
