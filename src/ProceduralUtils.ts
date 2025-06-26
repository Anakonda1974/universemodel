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
