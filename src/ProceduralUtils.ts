/** LRU Cache for noise values */
class NoiseCache {
  private cache = new Map<string, number>();
  private maxSize: number;

  constructor(maxSize: number = 10000) {
    this.maxSize = maxSize;
  }

  get(key: string): number | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: string, value: number): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Evict oldest entry
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// Global noise cache instance
const noiseCache = new NoiseCache(10000);

export function getNoise01(seed: string, label: string): number {
  const cacheKey = `${seed}::${label}`;

  // Check cache first
  const cached = noiseCache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  // Compute and cache
  const hash = fnv1a(cacheKey);
  const value = Number(BigInt(`0x${hash}`) % 0x100000000n) / 0xffffffff;
  noiseCache.set(cacheKey, value);

  return value;
}

/** Enhanced noise function with algorithm selection */
export function getAdvancedNoise01(
  seed: string,
  label: string,
  algorithm: 'hash' | 'perlin' | 'simplex' | 'worley' | 'fractal' | 'ridged' = 'hash'
): number {
  if (algorithm === 'hash') {
    return getNoise01(seed, label);
  }

  // For spatial noise algorithms, we need coordinates
  // Use hash to generate pseudo-random coordinates from seed+label
  const hash = fnv1a(`${seed}::${label}`);
  const hashNum = Number(BigInt(`0x${hash}`) % 0x100000000n);

  const x = ((hashNum & 0xFF) / 255.0) * 100;
  const y = (((hashNum >> 8) & 0xFF) / 255.0) * 100;
  const z = (((hashNum >> 16) & 0xFF) / 255.0) * 100;

  // Use a simple fallback noise implementation to avoid circular dependencies
  // This will be replaced with proper advanced noise in a future update
  const simpleNoise = Math.sin(x * 0.1) * Math.cos(y * 0.1) * Math.sin(z * 0.1);

  // Normalize to [0,1] range
  return (simpleNoise + 1) * 0.5;
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

/** Batch noise generation for better performance */
export function getBatchNoise01(seed: string, labels: string[]): number[] {
  const results: number[] = [];
  const uncachedLabels: string[] = [];
  const uncachedIndices: number[] = [];

  // Check cache for all labels first
  for (let i = 0; i < labels.length; i++) {
    const cacheKey = `${seed}::${labels[i]}`;
    const cached = noiseCache.get(cacheKey);
    if (cached !== undefined) {
      results[i] = cached;
    } else {
      uncachedLabels.push(labels[i]);
      uncachedIndices.push(i);
    }
  }

  // Compute uncached values in batch
  for (let i = 0; i < uncachedLabels.length; i++) {
    const label = uncachedLabels[i];
    const index = uncachedIndices[i];
    const cacheKey = `${seed}::${label}`;

    const hash = fnv1a(cacheKey);
    const value = Number(BigInt(`0x${hash}`) % 0x100000000n) / 0xffffffff;

    noiseCache.set(cacheKey, value);
    results[index] = value;
  }

  return results;
}

/** Clear noise cache */
export function clearNoiseCache(): void {
  noiseCache.clear();
}

/** Get noise cache statistics */
export function getNoiseCacheStats(): { size: number; maxSize: number } {
  return {
    size: noiseCache.size(),
    maxSize: 10000
  };
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
