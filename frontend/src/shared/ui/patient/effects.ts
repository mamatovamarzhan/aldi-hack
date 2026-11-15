// Visual rules for the title and spark effects, kept pure so they can be tested.
export type Phase = 'dawn' | 'day' | 'sunset' | 'night';

/** Route changes wait this long after a primary tap so the spark burst is visible. */
export const ROUTE_DELAY_MS = 220;

export function titleGradient(phase: Phase) {
  return phase === 'night'
    ? { colors: ['#D9CCFF', '#8CCBFF', '#A8E6CF'], glow: 0.5 }
    : { colors: ['#4A3B8C', '#0F56BE', '#1A6E4C'], glow: 0.25 };
}

export function sparkGlow(phase: Phase) {
  return phase === 'night' ? 0.9 : 0.6;
}

export const SPARK_COLORS = ['#FFFFFF', '#8EC5F5', '#C9B8F2', '#A8E6CF'];
