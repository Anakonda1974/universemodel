import { SeedManager } from "./SeedManager";
import { PropertyGraph } from "./PropertyGraph";

/** LRU Cache for entity results */
class EntityCache<T> {
  private cache = new Map<string, { value: T; timestamp: number }>();
  private maxSize: number;
  private ttl: number;

  constructor(maxSize: number = 1000, ttl: number = 0) {
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    // Check TTL expiration
    if (this.ttl > 0 && Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return undefined;
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value;
  }

  set(key: string, value: T): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, { value, timestamp: Date.now() });
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

export class ProceduralEntity {
  private static entityCache = new EntityCache<Record<string, any>>(500);
  private static groupedCache = new EntityCache<any>(500);
  private static traceCache = new EntityCache<any>(500);

  constructor(
    public name: string,
    public path: string[],
    public seedManager: SeedManager,
    public graph: PropertyGraph
  ) {}

  get fullSeed(): string {
    return this.seedManager.getSubSeed(this.path);
  }

  /** Create a unique cache key for this entity */
  private getCacheKey(suffix: string = ""): string {
    return `${this.fullSeed}::${this.graph.constructor.name}${suffix}`;
  }

  generate(log?: (msg: string) => void): Record<string, any> {
    const cacheKey = this.getCacheKey();
    const cached = ProceduralEntity.entityCache.get(cacheKey);

    if (cached) {
      if (log) log(`entity cache hit for ${this.name}`);
      return cached;
    }

    const result = this.graph.evaluate(this.fullSeed, log);
    ProceduralEntity.entityCache.set(cacheKey, result);
    return result;
  }

  /** Generate grouped property results using PropertyGraph.evaluateGrouped */
  generateGrouped(log?: (msg: string) => void) {
    if (!this.graph.evaluateGrouped) {
      throw new Error("PropertyGraph does not support grouped evaluation");
    }

    const cacheKey = this.getCacheKey("::grouped");
    const cached = ProceduralEntity.groupedCache.get(cacheKey);

    if (cached) {
      if (log) log(`grouped cache hit for ${this.name}`);
      return cached;
    }

    const result = this.graph.evaluateGrouped(this.fullSeed, log);
    ProceduralEntity.groupedCache.set(cacheKey, result);
    return result;
  }

  /** Generate detailed traces for each property using PropertyGraph.evaluateWithTrace */
  generateTrace(log?: (msg: string) => void) {
    if (!(this.graph as any).evaluateWithTrace) {
      throw new Error("PropertyGraph does not support trace evaluation");
    }

    const cacheKey = this.getCacheKey("::trace");
    const cached = ProceduralEntity.traceCache.get(cacheKey);

    if (cached) {
      if (log) log(`trace cache hit for ${this.name}`);
      return cached;
    }

    const result = (this.graph as any).evaluateWithTrace(this.fullSeed, log);
    ProceduralEntity.traceCache.set(cacheKey, result);
    return result;
  }

  /** Clear all entity caches */
  static clearCache(): void {
    ProceduralEntity.entityCache.clear();
    ProceduralEntity.groupedCache.clear();
    ProceduralEntity.traceCache.clear();
  }

  /** Get cache statistics */
  static getCacheStats(): {
    entity: { size: number; maxSize: number };
    grouped: { size: number; maxSize: number };
    trace: { size: number; maxSize: number };
  } {
    return {
      entity: { size: ProceduralEntity.entityCache.size(), maxSize: 500 },
      grouped: { size: ProceduralEntity.groupedCache.size(), maxSize: 500 },
      trace: { size: ProceduralEntity.traceCache.size(), maxSize: 500 }
    };
  }
}
