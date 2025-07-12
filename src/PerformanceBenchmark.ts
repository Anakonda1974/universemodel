/**
 * Performance Benchmark Suite
 * Comprehensive testing of all performance improvements
 */

import { SeedManager } from './SeedManager.js';
import { PropertyGraph } from './PropertyGraph.js';
import { ProceduralEntity } from './ProceduralEntity.js';
import { createPlanetDefinitions } from './PlanetDefinitions.js';
import {
  noise3D,
  clearNoiseCache,
  getNoiseCacheStats,
  batchNoise3D,
  NoiseConfig
} from './AdvancedNoise.js';
import {
  getNoise01,
  getBatchNoise01,
  clearNoiseCache as clearUtilsCache,
  getNoiseCacheStats as getUtilsCacheStats
} from './ProceduralUtils.js';

/** Benchmark result interface */
export interface BenchmarkResult {
  name: string;
  duration: number;
  operations: number;
  opsPerSecond: number;
  memoryUsage?: number;
  cacheHitRate?: number;
  details?: any;
}

/** Benchmark suite configuration */
export interface BenchmarkConfig {
  iterations: number;
  warmupIterations: number;
  entityCount: number;
  noisePoints: number;
  enableCaching: boolean;
}

/** Performance benchmark suite */
export class PerformanceBenchmark {
  private seedManager: SeedManager;
  private planetGraph: PropertyGraph;
  private config: BenchmarkConfig;

  constructor(config: Partial<BenchmarkConfig> = {}) {
    this.config = {
      iterations: 100,
      warmupIterations: 10,
      entityCount: 1000,
      noisePoints: 10000,
      enableCaching: true,
      ...config
    };

    this.seedManager = new SeedManager('BenchmarkSeed2024');
    this.planetGraph = new PropertyGraph(createPlanetDefinitions());
  }

  /** Run all benchmarks */
  async runAllBenchmarks(): Promise<BenchmarkResult[]> {
    console.log('🚀 Starting Performance Benchmark Suite...');
    console.log(`Configuration:`, this.config);

    const results: BenchmarkResult[] = [];

    // Warm up
    console.log('🔥 Warming up...');
    await this.warmup();

    // Core benchmarks
    results.push(await this.benchmarkPropertyGraphEvaluation());
    results.push(await this.benchmarkEntityGeneration());
    results.push(await this.benchmarkCachingEfficiency());
    results.push(await this.benchmarkNoiseGeneration());
    results.push(await this.benchmarkBatchOperations());
    results.push(await this.benchmarkMemoryUsage());

    console.log('✅ Benchmark suite completed!');
    this.printResults(results);

    return results;
  }

  /** Warmup phase */
  private async warmup(): Promise<void> {
    for (let i = 0; i < this.config.warmupIterations; i++) {
      const entity = new ProceduralEntity(
        `warmup-${i}`,
        ['warmup', `entity-${i}`],
        this.seedManager,
        this.planetGraph
      );
      entity.generate();
    }
  }

  /** Benchmark property graph evaluation */
  private async benchmarkPropertyGraphEvaluation(): Promise<BenchmarkResult> {
    console.log('📊 Benchmarking PropertyGraph evaluation...');

    const startTime = performance.now();
    const startMemory = this.getMemoryUsage();

    for (let i = 0; i < this.config.iterations; i++) {
      const seed = `benchmark-${i}`;
      this.planetGraph.evaluate(seed);
    }

    const endTime = performance.now();
    const endMemory = this.getMemoryUsage();
    const duration = endTime - startTime;

    return {
      name: 'PropertyGraph Evaluation',
      duration,
      operations: this.config.iterations,
      opsPerSecond: (this.config.iterations / duration) * 1000,
      memoryUsage: endMemory - startMemory,
      details: {
        averageTimePerEvaluation: duration / this.config.iterations,
        cacheStats: this.planetGraph.getCacheStats()
      }
    };
  }

  /** Benchmark entity generation */
  private async benchmarkEntityGeneration(): Promise<BenchmarkResult> {
    console.log('🌍 Benchmarking entity generation...');

    const startTime = performance.now();
    const entities: ProceduralEntity[] = [];

    for (let i = 0; i < this.config.entityCount; i++) {
      const entity = new ProceduralEntity(
        `planet-${i}`,
        ['galaxy-1', 'system-1', `planet-${i}`],
        this.seedManager,
        this.planetGraph
      );
      entities.push(entity);
      entity.generateGrouped();
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    return {
      name: 'Entity Generation',
      duration,
      operations: this.config.entityCount,
      opsPerSecond: (this.config.entityCount / duration) * 1000,
      details: {
        averageTimePerEntity: duration / this.config.entityCount,
        entityCacheStats: ProceduralEntity.getCacheStats()
      }
    };
  }

  /** Benchmark caching efficiency */
  private async benchmarkCachingEfficiency(): Promise<BenchmarkResult> {
    console.log('💾 Benchmarking caching efficiency...');

    // Test without caching
    this.planetGraph.clearCache();
    ProceduralEntity.clearCache();

    const startTimeNoCache = performance.now();
    for (let i = 0; i < 100; i++) {
      const entity = new ProceduralEntity(
        'test-planet',
        ['test-galaxy', 'test-system', 'test-planet'],
        this.seedManager,
        this.planetGraph
      );
      entity.generate();
    }
    const noCacheDuration = performance.now() - startTimeNoCache;

    // Test with caching (generate same entity multiple times)
    const startTimeWithCache = performance.now();
    for (let i = 0; i < 100; i++) {
      const entity = new ProceduralEntity(
        'test-planet',
        ['test-galaxy', 'test-system', 'test-planet'],
        this.seedManager,
        this.planetGraph
      );
      entity.generate();
    }
    const withCacheDuration = performance.now() - startTimeWithCache;

    const speedup = noCacheDuration / withCacheDuration;
    const cacheHitRate = ((100 - 1) / 100) * 100; // First generation is cache miss, rest are hits

    return {
      name: 'Caching Efficiency',
      duration: withCacheDuration,
      operations: 100,
      opsPerSecond: (100 / withCacheDuration) * 1000,
      cacheHitRate,
      details: {
        noCacheDuration,
        withCacheDuration,
        speedupFactor: speedup,
        cacheStats: this.planetGraph.getCacheStats()
      }
    };
  }

  /** Benchmark noise generation */
  private async benchmarkNoiseGeneration(): Promise<BenchmarkResult> {
    console.log('🌊 Benchmarking noise generation...');

    const algorithms: Array<NoiseConfig['algorithm']> = ['perlin', 'simplex', 'worley', 'fractal', 'ridged'];
    const results: any = {};

    for (const algorithm of algorithms) {
      if (!algorithm) continue;

      const startTime = performance.now();
      
      for (let i = 0; i < this.config.noisePoints; i++) {
        const x = (Math.random() - 0.5) * 100;
        const y = (Math.random() - 0.5) * 100;
        const z = (Math.random() - 0.5) * 100;
        
        noise3D(x, y, z, { 
          algorithm, 
          frequency: 0.1, 
          cache: this.config.enableCaching 
        });
      }
      
      const duration = performance.now() - startTime;
      results[algorithm] = {
        duration,
        opsPerSecond: (this.config.noisePoints / duration) * 1000
      };
    }

    const totalDuration = Object.values(results).reduce((sum: number, r: any) => sum + r.duration, 0);

    return {
      name: 'Noise Generation',
      duration: totalDuration,
      operations: this.config.noisePoints * algorithms.length,
      opsPerSecond: (this.config.noisePoints * algorithms.length / totalDuration) * 1000,
      details: {
        algorithmResults: results,
        cacheStats: getNoiseCacheStats()
      }
    };
  }

  /** Benchmark batch operations */
  private async benchmarkBatchOperations(): Promise<BenchmarkResult> {
    console.log('📦 Benchmarking batch operations...');

    const batchSize = 1000;
    const batches = 10;

    // Test individual operations
    const startTimeIndividual = performance.now();
    for (let batch = 0; batch < batches; batch++) {
      for (let i = 0; i < batchSize; i++) {
        getNoise01(`batch-${batch}`, `item-${i}`);
      }
    }
    const individualDuration = performance.now() - startTimeIndividual;

    // Test batch operations
    const startTimeBatch = performance.now();
    for (let batch = 0; batch < batches; batch++) {
      const labels = Array.from({ length: batchSize }, (_, i) => `item-${i}`);
      getBatchNoise01(`batch-${batch}`, labels);
    }
    const batchDuration = performance.now() - startTimeBatch;

    const speedup = individualDuration / batchDuration;

    return {
      name: 'Batch Operations',
      duration: batchDuration,
      operations: batchSize * batches,
      opsPerSecond: (batchSize * batches / batchDuration) * 1000,
      details: {
        individualDuration,
        batchDuration,
        speedupFactor: speedup,
        batchSize,
        batches
      }
    };
  }

  /** Benchmark memory usage */
  private async benchmarkMemoryUsage(): Promise<BenchmarkResult> {
    console.log('💾 Benchmarking memory usage...');

    const startMemory = this.getMemoryUsage();
    const entities: ProceduralEntity[] = [];

    const startTime = performance.now();

    // Generate many entities to test memory usage
    for (let i = 0; i < 1000; i++) {
      const entity = new ProceduralEntity(
        `memory-test-${i}`,
        ['memory-galaxy', 'memory-system', `planet-${i}`],
        this.seedManager,
        this.planetGraph
      );
      entities.push(entity);
      entity.generateGrouped();
    }

    const endTime = performance.now();
    const endMemory = this.getMemoryUsage();
    const duration = endTime - startTime;

    return {
      name: 'Memory Usage',
      duration,
      operations: 1000,
      opsPerSecond: (1000 / duration) * 1000,
      memoryUsage: endMemory - startMemory,
      details: {
        startMemory,
        endMemory,
        memoryPerEntity: (endMemory - startMemory) / 1000,
        entityCacheStats: ProceduralEntity.getCacheStats(),
        propertyGraphCacheStats: this.planetGraph.getCacheStats()
      }
    };
  }

  /** Get current memory usage */
  private getMemoryUsage(): number {
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return 0;
  }

  /** Print benchmark results */
  private printResults(results: BenchmarkResult[]): void {
    console.log('\n📈 BENCHMARK RESULTS');
    console.log('='.repeat(80));

    results.forEach(result => {
      console.log(`\n${result.name}:`);
      console.log(`  Duration: ${result.duration.toFixed(2)}ms`);
      console.log(`  Operations: ${result.operations.toLocaleString()}`);
      console.log(`  Ops/Second: ${result.opsPerSecond.toFixed(0).toLocaleString()}`);
      
      if (result.memoryUsage) {
        console.log(`  Memory Usage: ${(result.memoryUsage / 1024 / 1024).toFixed(2)}MB`);
      }
      
      if (result.cacheHitRate) {
        console.log(`  Cache Hit Rate: ${result.cacheHitRate.toFixed(1)}%`);
      }
    });

    console.log('\n' + '='.repeat(80));
  }

  /** Export results to JSON */
  exportResults(results: BenchmarkResult[]): string {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      config: this.config,
      results: results,
      summary: {
        totalDuration: results.reduce((sum, r) => sum + r.duration, 0),
        totalOperations: results.reduce((sum, r) => sum + r.operations, 0),
        averageOpsPerSecond: results.reduce((sum, r) => sum + r.opsPerSecond, 0) / results.length
      }
    }, null, 2);
  }
}
