import { describe, expect, it } from 'vitest';
import { CLOUD_GROUPS, driftCloud } from './cloud-motion';

describe('cloud wind', () => {
  it('moves left to right at 0.15 units per second', () => {
    expect(driftCloud(0, 10, 100)).toBe(1.5);
  });
  it('wraps only past the offscreen boundary', () => {
    expect(driftCloud(99, 1, 100)).toBe(99.15);
    expect(driftCloud(100, 1, 100)).toBeCloseTo(-99.85);
  });
  it('contains seven unique seeds at distances 20–70', () => {
    expect(CLOUD_GROUPS).toHaveLength(7);
    expect(new Set(CLOUD_GROUPS.map(c => c.seed)).size).toBe(7);
    expect(CLOUD_GROUPS.every(c => c.z >= -70 && c.z <= -20)).toBe(true);
  });
});