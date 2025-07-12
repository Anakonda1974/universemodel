#!/usr/bin/env node

/**
 * Debug script to find circular dependencies in planet definitions
 */

import('./dist/PlanetDefinitions.js').then(({ createPlanetDefinitions }) => {
  const definitions = createPlanetDefinitions();
  
  console.log('🔍 Analyzing property dependencies...');
  console.log(`Total properties: ${definitions.length}`);
  
  // Build dependency graph
  const graph = new Map();
  const allProperties = new Set();
  
  for (const def of definitions) {
    graph.set(def.id, def.inputs || []);
    allProperties.add(def.id);
  }
  
  console.log('\n📊 Dependency Analysis:');
  
  // Check for missing dependencies
  const missingDeps = [];
  for (const [prop, deps] of graph) {
    for (const dep of deps) {
      if (!allProperties.has(dep)) {
        missingDeps.push({ property: prop, missingDep: dep });
      }
    }
  }
  
  if (missingDeps.length > 0) {
    console.log('\n❌ Missing Dependencies:');
    missingDeps.forEach(({ property, missingDep }) => {
      console.log(`  ${property} depends on ${missingDep} (not found)`);
    });
  }
  
  // Find circular dependencies using DFS
  const visited = new Set();
  const recursionStack = new Set();
  const cycles = [];
  
  function findCycles(node, path = []) {
    if (recursionStack.has(node)) {
      // Found a cycle
      const cycleStart = path.indexOf(node);
      const cycle = path.slice(cycleStart).concat([node]);
      cycles.push(cycle);
      return;
    }
    
    if (visited.has(node)) {
      return;
    }
    
    visited.add(node);
    recursionStack.add(node);
    path.push(node);
    
    const dependencies = graph.get(node) || [];
    for (const dep of dependencies) {
      if (allProperties.has(dep)) {
        findCycles(dep, [...path]);
      }
    }
    
    recursionStack.delete(node);
    path.pop();
  }
  
  // Check all properties for cycles
  for (const prop of allProperties) {
    if (!visited.has(prop)) {
      findCycles(prop);
    }
  }
  
  if (cycles.length > 0) {
    console.log('\n🔄 Circular Dependencies Found:');
    cycles.forEach((cycle, index) => {
      console.log(`  Cycle ${index + 1}: ${cycle.join(' -> ')}`);
    });
  } else {
    console.log('\n✅ No circular dependencies found!');
  }
  
  // Show dependency tree for debugging
  console.log('\n🌳 Property Dependencies:');
  const sortedProps = Array.from(allProperties).sort();
  sortedProps.forEach(prop => {
    const deps = graph.get(prop) || [];
    if (deps.length > 0) {
      console.log(`  ${prop} <- [${deps.join(', ')}]`);
    } else {
      console.log(`  ${prop} (no dependencies)`);
    }
  });
  
}).catch(console.error);
