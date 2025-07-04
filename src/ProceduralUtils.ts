export function getNoise01(seed: string, label: string): number {
  const data = `${seed}::${label}`;
  const hash = fnv1a(data);
  // convert to float in range [0,1]
  return Number(BigInt(`0x${hash}`) % 0x100000000n) / 0xffffffff;
}

export function mapRange01(value: number, min: number, max: number): number {
  return min + (max - min) * value;
}

export function mapExp(value: number, base: number, range?: [number, number]): number {
  const result = Math.pow(base, value);
  if (range) {
    const [min, max] = range;
    return min + (max - min) * result;
  }
  return result;
}

/**
 * Generate fractal noise by summing multiple {@link getNoise01} calls.
 *
 * @param seed Base seed used for the first octave
 * @param label Context label for the noise function
 * @param octaves Number of noise layers to combine
 * @param persistence Amplitude reduction per octave
 */
export function getFractalNoise01(
  seed: string,
  label: string,
  octaves = 4,
  persistence = 0.5,
): number {
  let amplitude = 1;
  let total = 0;
  let max = 0;
  for (let i = 0; i < octaves; i++) {
    const octaveSeed = `${seed}:${i}`;
    total += getNoise01(octaveSeed, label) * amplitude;
    max += amplitude;
    amplitude *= persistence;
  }
  return total / max;
}

export function resolveDiscrete<T>(value: number, thresholds: [number, T][]): T {
  for (const [thr, val] of thresholds) {
    if (value < thr) return val;
  }
  return thresholds[thresholds.length - 1][1];
}

function fnv1a(str: string): string {
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  for (let i = 0; i < str.length; i++) {
    hash ^= BigInt(str.charCodeAt(i));
    hash = (hash * prime) & 0xffffffffffffffffn;
  }
  return hash.toString(16).padStart(16, "0");
}
