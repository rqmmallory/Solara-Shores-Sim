/** Injectable RNG so engines are deterministic under test. */
export type Rng = () => number;

export const defaultRng: Rng = Math.random;

/** mulberry32 — tiny seeded PRNG for tests */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randBetween(rng: Rng, min: number, max: number): number {
  return min + rng() * (max - min);
}

export function pick<T>(rng: Rng, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

export function shuffle<T>(rng: Rng, arr: T[]): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Round a sampled value to a "human" increment so problems read cleanly. */
export function roundNice(x: number): number {
  const ax = Math.abs(x);
  if (ax === 0) return 0;
  const mag = Math.pow(10, Math.floor(Math.log10(ax)));
  const step = mag / 10 >= 1 ? mag / 10 : mag / 10; // one significant decade below
  const rounded = Math.round(x / step) * step;
  return Number(rounded.toPrecision(12));
}
