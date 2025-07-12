#!/usr/bin/env node

/**
 * Benchmark Runner Script
 * Runs performance benchmarks and generates reports
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mock performance API for Node.js
if (typeof performance === 'undefined') {
  global.performance = {
    now: () => Date.now(),
    memory: {
      get usedJSHeapSize() {
        return process.memoryUsage().heapUsed;
      }
    }
  };
}

async function runBenchmarks() {
  console.log('🚀 Starting Procedural Universe Performance Benchmarks');
  console.log('=' .repeat(60));

  try {
    // Import the benchmark module
    const { PerformanceBenchmark } = await import('../dist/PerformanceBenchmark.js');

    // Create benchmark instance with different configurations
    const configs = [
      {
        name: 'Quick Test',
        config: {
          iterations: 50,
          warmupIterations: 5,
          entityCount: 100,
          noisePoints: 1000,
          enableCaching: true
        }
      },
      {
        name: 'Standard Test',
        config: {
          iterations: 100,
          warmupIterations: 10,
          entityCount: 500,
          noisePoints: 5000,
          enableCaching: true
        }
      },
      {
        name: 'No Cache Test',
        config: {
          iterations: 50,
          warmupIterations: 5,
          entityCount: 100,
          noisePoints: 1000,
          enableCaching: false
        }
      }
    ];

    const allResults = [];

    for (const { name, config } of configs) {
      console.log(`\n🧪 Running ${name}...`);
      console.log('-'.repeat(40));

      const benchmark = new PerformanceBenchmark(config);
      const results = await benchmark.runAllBenchmarks();
      
      allResults.push({
        configName: name,
        config,
        results,
        timestamp: new Date().toISOString()
      });

      // Save individual results
      const filename = `benchmark-${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.json`;
      const filepath = path.join(__dirname, '..', 'benchmark-results', filename);
      
      // Ensure directory exists
      const dir = path.dirname(filepath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(filepath, benchmark.exportResults(results));
      console.log(`📄 Results saved to: ${filename}`);
    }

    // Generate comparison report
    generateComparisonReport(allResults);

  } catch (error) {
    console.error('❌ Benchmark failed:', error);
    process.exit(1);
  }
}

function generateComparisonReport(allResults) {
  console.log('\n📊 PERFORMANCE COMPARISON REPORT');
  console.log('='.repeat(80));

  // Find cached vs non-cached results
  const cachedResults = allResults.find(r => r.config.enableCaching === true);
  const nonCachedResults = allResults.find(r => r.config.enableCaching === false);

  if (cachedResults && nonCachedResults) {
    console.log('\n🔄 Cache Performance Impact:');
    console.log('-'.repeat(40));

    const cachedEntity = cachedResults.results.find(r => r.name === 'Entity Generation');
    const nonCachedEntity = nonCachedResults.results.find(r => r.name === 'Entity Generation');

    if (cachedEntity && nonCachedEntity) {
      const speedup = nonCachedEntity.duration / cachedEntity.duration;
      console.log(`Entity Generation Speedup: ${speedup.toFixed(2)}x faster with caching`);
      console.log(`Cached: ${cachedEntity.opsPerSecond.toFixed(0)} ops/sec`);
      console.log(`Non-cached: ${nonCachedEntity.opsPerSecond.toFixed(0)} ops/sec`);
    }
  }

  // Performance summary
  console.log('\n📈 Performance Summary:');
  console.log('-'.repeat(40));

  allResults.forEach(({ configName, results }) => {
    console.log(`\n${configName}:`);
    results.forEach(result => {
      console.log(`  ${result.name}: ${result.opsPerSecond.toFixed(0)} ops/sec`);
    });
  });

  // Save comparison report
  const reportPath = path.join(__dirname, '..', 'benchmark-results', `comparison-report-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    summary: 'Performance comparison across different configurations',
    results: allResults
  }, null, 2));

  console.log(`\n📄 Comparison report saved to: ${path.basename(reportPath)}`);
}

// Performance tips
function printPerformanceTips() {
  console.log('\n💡 PERFORMANCE OPTIMIZATION TIPS');
  console.log('='.repeat(80));
  console.log('1. ✅ Enable caching for repeated property evaluations');
  console.log('2. ✅ Use batch operations for multiple noise generations');
  console.log('3. ✅ Implement LOD systems for large-scale rendering');
  console.log('4. ✅ Use GPU instancing for rendering many similar objects');
  console.log('5. ✅ Monitor memory usage and clear caches when needed');
  console.log('6. ✅ Use appropriate noise algorithms for different use cases');
  console.log('7. ✅ Profile your specific use case to identify bottlenecks');
}

// Run benchmarks
runBenchmarks()
  .then(() => {
    printPerformanceTips();
    console.log('\n✅ All benchmarks completed successfully!');
  })
  .catch(error => {
    console.error('❌ Benchmark suite failed:', error);
    process.exit(1);
  });
