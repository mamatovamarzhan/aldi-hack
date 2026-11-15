// Shape of GET /api/exercises (docs/API_CONTRACTS.md). Field names match the 3D player's own types.
export type ExerciseId = 'pf-slow' | 'pelvic-tilt' | 'bridge';
export type ExerciseVisual = 'hammock' | 'mannequin';
export type CuePhase = 'inhale' | 'squeeze' | 'hold' | 'release' | 'rest';

/** One point on the timeline. A cue lasts until the next cue's atSec (or durationSec). */
export interface Cue {
  atSec: number;
  phase: CuePhase;
  text: string;
}

export interface Exercise {
  id: string;
  durationSec: number;
  visual: ExerciseVisual | null;
  locked: boolean;
  has3d: boolean;
  /** false: there is no text in the requested language. */
  available: boolean;
  title: string | null;
  description: string | null;
  steps: string[];
  cues: Cue[];
  machineTranslated: boolean;
  unlockNote: string | null;
  /** false: demonstration only, not reviewed by a specialist. */
  reviewed: boolean;
}
