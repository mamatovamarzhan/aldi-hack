import { describe, expect, it } from 'vitest';
import { ROUTE_DELAY_MS, sparkGlow, titleGradient } from './effects';

describe('patient effects', () => {
  it('route change after a primary tap waits 220 ms', () => {
    expect(ROUTE_DELAY_MS).toBe(220);
  });
  it('sparks glow 0.6 by day and 0.9 at night', () => {
    expect(sparkGlow('day')).toBe(0.6);
    expect(sparkGlow('night')).toBe(0.9);
  });
  it('title uses the day palette and glow 0.25 outside night', () => {
    expect(titleGradient('sunset')).toEqual({ colors: ['#4A3B8C', '#0F56BE', '#1A6E4C'], glow: 0.25 });
  });
  it('title uses the night palette and glow 0.5 at night', () => {
    expect(titleGradient('night')).toEqual({ colors: ['#D9CCFF', '#8CCBFF', '#A8E6CF'], glow: 0.5 });
  });
});
