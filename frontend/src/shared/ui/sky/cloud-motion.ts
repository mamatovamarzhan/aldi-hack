export const CLOUD_WIND_SPEED = 0.15;
export const CLOUD_GROUPS = [
  { seed: 11, x: -10, y: 7, z: -20, segments: 32, bounds: [8, 2, 2], volume: 8 },
  { seed: 37, x: 12, y: 12, z: -28, segments: 36, bounds: [10, 2.3, 2.4], volume: 9 },
  { seed: 83, x: -22, y: 15, z: -36, segments: 40, bounds: [11, 2.5, 2.5], volume: 10 },
  { seed: 127, x: 23, y: 19, z: -44, segments: 44, bounds: [12, 2.8, 2.7], volume: 11 },
  { seed: 193, x: -28, y: 17, z: -53, segments: 46, bounds: [13, 3, 3], volume: 12 },
  { seed: 251, x: 8, y: 25, z: -62, segments: 48, bounds: [14, 3, 3], volume: 14 },
  { seed: 317, x: 33, y: 18, z: -70, segments: 50, bounds: [12, 2.5, 3], volume: 13 },
] as const;

export function driftCloud(x: number, delta: number, edge: number): number {
  const next = x + CLOUD_WIND_SPEED * delta;
  return next > edge ? -edge + (next - edge) : next;
}