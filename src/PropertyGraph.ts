export type PropertyDefinition = {
  id: string;
  inputs?: string[];
  compute: (ctx: Record<string, any>, seed: string) => any;
  /** Optional group used to organize related properties */
  group?: string;
  /** Optional caching configuration */
  cache?: {
    /** Maximum number of cached results for this property */
    maxSize?: number;
    /** Time-to-live in milliseconds (0 = no expiration) */
    ttl?: number;
  };
};

export type GroupedProperties = Record<string, Record<string, any>>;

export type TraceEntry = {
  value: any;
  inputs: Record<string, any>;
};
export type TraceResult = Record<string, TraceEntry>;

/** LRU Cache implementation for property results */
class LRUCache<K, V> {
  private cache = new Map<K, { value: V; timestamp: number }>();
  private maxSize: number;
  private ttl: number;

  constructor(maxSize: number = 1000, ttl: number = 0) {
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  get(key: K): V | undefined {
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

  set(key: K, value: V): void {
    // Remove if already exists
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
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

export class PropertyGraph {
  private dependencyOrder: string[] | null = null;
  private evaluationCache = new LRUCache<string, Record<string, any>>(500);
  private propertyCache = new Map<string, LRUCache<string, any>>();

  constructor(private definitions: PropertyDefinition[]) {
    this.precomputeDependencyOrder();
    this.initializePropertyCaches();
  }

  /** Precompute dependency order using topological sort for O(n) evaluation */
  private precomputeDependencyOrder(): void {
    const graph = new Map<string, string[]>();
    const inDegree = new Map<string, number>();
    const allNodes = new Set<string>();

    // Build dependency graph and collect all nodes
    for (const def of this.definitions) {
      graph.set(def.id, def.inputs || []);
      allNodes.add(def.id);
      inDegree.set(def.id, 0);
    }

    // Calculate in-degrees (how many dependencies each node has)
    for (const def of this.definitions) {
      for (const input of def.inputs || []) {
        if (allNodes.has(input)) {
          inDegree.set(def.id, (inDegree.get(def.id) || 0) + 1);
        } else {
          throw new Error(`Property '${def.id}' depends on undefined property '${input}'`);
        }
      }
    }

    // Topological sort using Kahn's algorithm
    const queue: string[] = [];
    const result: string[] = [];

    // Find nodes with no incoming edges (no dependencies)
    for (const [id, degree] of inDegree) {
      if (degree === 0) {
        queue.push(id);
      }
    }

    while (queue.length > 0) {
      const current = queue.shift()!;
      result.push(current);

      // For each node that depends on current, reduce its in-degree
      for (const def of this.definitions) {
        if (def.inputs?.includes(current)) {
          const newDegree = inDegree.get(def.id)! - 1;
          inDegree.set(def.id, newDegree);
          if (newDegree === 0) {
            queue.push(def.id);
          }
        }
      }
    }

    if (result.length !== this.definitions.length) {
      // Debug information
      const remaining = this.definitions.filter(def => !result.includes(def.id));
      const remainingWithDeps = remaining.map(def => ({
        id: def.id,
        inputs: def.inputs || [],
        inDegree: inDegree.get(def.id)
      }));

      throw new Error(
        `Circular dependency detected in property graph. ` +
        `Remaining nodes: ${JSON.stringify(remainingWithDeps, null, 2)}`
      );
    }

    this.dependencyOrder = result;
  }

  /** Initialize individual property caches based on their configuration */
  private initializePropertyCaches(): void {
    for (const def of this.definitions) {
      if (def.cache) {
        const cache = new LRUCache<string, any>(
          def.cache.maxSize || 100,
          def.cache.ttl || 0
        );
        this.propertyCache.set(def.id, cache);
      }
    }
  }

  evaluate(seed: string, log?: (msg: string) => void): Record<string, any> {
    // Check full evaluation cache first
    const cacheKey = seed;
    const cached = this.evaluationCache.get(cacheKey);
    if (cached) {
      if (log) log(`cache hit for full evaluation with seed ${seed}`);
      return cached;
    }

    const context: Record<string, any> = {};
    const defMap = new Map(this.definitions.map(def => [def.id, def]));

    // Use precomputed dependency order for O(n) evaluation
    for (const propertyId of this.dependencyOrder!) {
      const def = defMap.get(propertyId)!;

      // Check individual property cache
      const propCache = this.propertyCache.get(propertyId);
      if (propCache) {
        const propCacheKey = this.createPropertyCacheKey(seed, def.inputs || [], context);
        const cachedValue = propCache.get(propCacheKey);
        if (cachedValue !== undefined) {
          context[propertyId] = cachedValue;
          if (log) log(`cache hit for property ${propertyId}`);
          continue;
        }
      }

      // Compute property value
      const deps = def.inputs || [];
      const ctx = deps.reduce((obj, key) => {
        obj[key] = context[key];
        return obj;
      }, {} as Record<string, any>);

      const value = def.compute(ctx, seed);
      context[propertyId] = value;

      // Cache individual property result
      if (propCache) {
        const propCacheKey = this.createPropertyCacheKey(seed, deps, context);
        propCache.set(propCacheKey, value);
      }

      if (log) log(`computed ${propertyId} = ${value}`);
    }

    // Cache full evaluation result
    this.evaluationCache.set(cacheKey, context);
    return context;
  }

  /** Create a cache key for individual property based on seed and input values */
  private createPropertyCacheKey(seed: string, inputs: string[], context: Record<string, any>): string {
    const inputValues = inputs.map(key => `${key}:${context[key]}`).join('|');
    return `${seed}::${inputValues}`;
  }

  /**
   * Evaluates all properties and groups the resulting values by the
   * {@link PropertyDefinition.group} field.
   */
  evaluateGrouped(seed: string, log?: (msg: string) => void): GroupedProperties {
    const flat = this.evaluate(seed, log);
    const grouped: GroupedProperties = {};
    for (const def of this.definitions) {
      const group = def.group ?? "default";
      if (!(group in grouped)) {
        grouped[group] = {};
      }
      grouped[group][def.id] = flat[def.id];
    }
    return grouped;
  }

  /**
   * Evaluates all properties and returns detailed trace information for each
   * value, including the exact inputs used during computation.
   */
  evaluateWithTrace(seed: string, log?: (msg: string) => void): TraceResult {
    const context: Record<string, any> = {};
    const trace: TraceResult = {};
    const defMap = new Map(this.definitions.map(def => [def.id, def]));

    // Use precomputed dependency order for O(n) evaluation
    for (const propertyId of this.dependencyOrder!) {
      const def = defMap.get(propertyId)!;
      const deps = def.inputs || [];

      const ctx = deps.reduce((obj, key) => {
        obj[key] = context[key];
        return obj;
      }, {} as Record<string, any>);

      const value = def.compute(ctx, seed);
      context[propertyId] = value;
      trace[propertyId] = { value, inputs: ctx };

      if (log) {
        const inputs = Object.entries(ctx)
          .map(([k, v]) => `${k}: ${v}`)
          .join(", ");
        log(`computed ${propertyId} = ${value} using ${inputs}`);
      }
    }

    return trace;
  }

  /** Clear all caches */
  clearCache(): void {
    this.evaluationCache.clear();
    for (const cache of this.propertyCache.values()) {
      cache.clear();
    }
  }

  /** Get cache statistics for monitoring */
  getCacheStats(): {
    evaluationCache: { size: number; maxSize: number };
    propertyCache: Record<string, { size: number; maxSize: number }>;
  } {
    const stats = {
      evaluationCache: {
        size: this.evaluationCache.size(),
        maxSize: 500
      },
      propertyCache: {} as Record<string, { size: number; maxSize: number }>
    };

    for (const [propertyId, cache] of this.propertyCache) {
      const def = this.definitions.find(d => d.id === propertyId);
      stats.propertyCache[propertyId] = {
        size: cache.size(),
        maxSize: def?.cache?.maxSize || 100
      };
    }

    return stats;
  }

  /** Retrieve a property definition by id */
  getDefinition(id: string): PropertyDefinition | undefined {
    return this.definitions.find((d) => d.id === id);
  }

  /** Return all property definitions */
  getDefinitions(): PropertyDefinition[] {
    return this.definitions;
  }
}
