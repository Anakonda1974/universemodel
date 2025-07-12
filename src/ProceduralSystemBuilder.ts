/**
 * Advanced Procedural System Builder
 * Allows dynamic creation and modification of property graphs
 */

import { PropertyDefinition, PropertyGraph } from './PropertyGraph.js';
import { ProceduralEntity } from './ProceduralEntity.js';
import { SeedManager } from './SeedManager.js';
import { getNoise01, getAdvancedNoise01 } from './ProceduralUtils.js';

/** Property template for easy creation */
export interface PropertyTemplate {
  id: string;
  name: string;
  description: string;
  group?: string;
  inputs?: string[];
  outputType: 'number' | 'string' | 'boolean' | 'discrete';
  range?: { min: number; max: number };
  options?: string[];
  formula?: string;
  noiseType?: 'hash' | 'perlin' | 'simplex' | 'worley' | 'fractal' | 'ridged';
  cache?: { maxSize?: number; ttl?: number };
}

/** System template for complete procedural systems */
export interface SystemTemplate {
  name: string;
  description: string;
  version: string;
  properties: PropertyTemplate[];
  presets?: Record<string, any>;
}

/** Dynamic property builder */
export class ProceduralSystemBuilder {
  private templates: Map<string, PropertyTemplate> = new Map();
  private systems: Map<string, SystemTemplate> = new Map();
  private customFunctions: Map<string, Function> = new Map();

  constructor() {
    this.initializeBuiltInFunctions();
  }

  /** Initialize built-in mathematical and utility functions */
  private initializeBuiltInFunctions(): void {
    const functions = {
      // Mathematical functions
      sin: Math.sin,
      cos: Math.cos,
      tan: Math.tan,
      sqrt: Math.sqrt,
      pow: Math.pow,
      abs: Math.abs,
      min: Math.min,
      max: Math.max,
      floor: Math.floor,
      ceil: Math.ceil,
      round: Math.round,
      
      // Utility functions
      clamp: (value: number, min: number, max: number) => Math.max(min, Math.min(max, value)),
      lerp: (a: number, b: number, t: number) => a + t * (b - a),
      smoothstep: (edge0: number, edge1: number, x: number) => {
        const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
        return t * t * (3 - 2 * t);
      },
      
      // Noise functions
      noise: (seed: string, label: string) => getNoise01(seed, label),
      advancedNoise: (seed: string, label: string, algorithm: string) => 
        getAdvancedNoise01(seed, label, algorithm as any),
      
      // Random utilities
      randomChoice: (seed: string, label: string, options: any[]) => {
        const noise = getNoise01(seed, label);
        const index = Math.floor(noise * options.length);
        return options[index];
      },
      
      // Range mapping
      mapRange: (value: number, inMin: number, inMax: number, outMin: number, outMax: number) => {
        return outMin + (value - inMin) * (outMax - outMin) / (inMax - inMin);
      }
    };

    Object.entries(functions).forEach(([name, func]) => {
      this.customFunctions.set(name, func);
    });
  }

  /** Add a custom function for use in formulas */
  addCustomFunction(name: string, func: Function): void {
    this.customFunctions.set(name, func);
  }

  /** Create a property template */
  createPropertyTemplate(template: PropertyTemplate): void {
    this.validatePropertyTemplate(template);
    this.templates.set(template.id, template);
  }

  /** Validate property template */
  private validatePropertyTemplate(template: PropertyTemplate): void {
    if (!template.id || !template.name) {
      throw new Error('Property template must have id and name');
    }

    if (template.inputs) {
      // Check for self-dependency
      if (template.inputs.includes(template.id)) {
        throw new Error(`Property ${template.id} cannot depend on itself`);
      }
    }

    if (template.outputType === 'number' && template.range) {
      if (template.range.min >= template.range.max) {
        throw new Error('Invalid range: min must be less than max');
      }
    }

    if (template.outputType === 'discrete' && !template.options) {
      throw new Error('Discrete properties must have options array');
    }
  }

  /** Build PropertyDefinition from template */
  buildPropertyDefinition(template: PropertyTemplate): PropertyDefinition {
    const definition: PropertyDefinition = {
      id: template.id,
      inputs: template.inputs,
      group: template.group,
      cache: template.cache,
      compute: this.createComputeFunction(template)
    };

    return definition;
  }

  /** Create compute function from template */
  private createComputeFunction(template: PropertyTemplate): (ctx: Record<string, any>, seed: string) => any {
    return (ctx: Record<string, any>, seed: string) => {
      try {
        if (template.formula) {
          return this.evaluateFormula(template.formula, ctx, seed, template);
        } else {
          return this.generateDefaultValue(template, ctx, seed);
        }
      } catch (error) {
        console.error(`Error computing property ${template.id}:`, error instanceof Error ? error.message : String(error));
        return this.getDefaultValue(template);
      }
    };
  }

  /** Evaluate custom formula */
  private evaluateFormula(formula: string, ctx: Record<string, any>, seed: string, template: PropertyTemplate): any {
    // Create evaluation context
    const evalContext = {
      ...ctx,
      seed,
      ...Object.fromEntries(this.customFunctions.entries())
    };

    // Simple formula evaluation (in production, use a proper expression parser)
    try {
      const func = new Function(...Object.keys(evalContext), `return ${formula}`);
      const result = func(...Object.values(evalContext));
      
      return this.processResult(result, template);
    } catch (error) {
      throw new Error(`Formula evaluation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /** Generate default value based on template type */
  private generateDefaultValue(template: PropertyTemplate, ctx: Record<string, any>, seed: string): any {
    const noiseValue = template.noiseType && template.noiseType !== 'hash' 
      ? getAdvancedNoise01(seed, template.id, template.noiseType)
      : getNoise01(seed, template.id);

    switch (template.outputType) {
      case 'number':
        if (template.range) {
          return template.range.min + noiseValue * (template.range.max - template.range.min);
        }
        return noiseValue;

      case 'boolean':
        return noiseValue > 0.5;

      case 'discrete':
        if (template.options) {
          const index = Math.floor(noiseValue * template.options.length);
          return template.options[index];
        }
        return 'unknown';

      case 'string':
      default:
        return template.options ? template.options[0] : 'generated';
    }
  }

  /** Process result according to template constraints */
  private processResult(result: any, template: PropertyTemplate): any {
    switch (template.outputType) {
      case 'number':
        const numResult = Number(result);
        if (template.range) {
          return Math.max(template.range.min, Math.min(template.range.max, numResult));
        }
        return numResult;

      case 'boolean':
        return Boolean(result);

      case 'discrete':
        if (template.options && template.options.includes(result)) {
          return result;
        }
        return template.options ? template.options[0] : 'unknown';

      case 'string':
      default:
        return String(result);
    }
  }

  /** Get default value for template type */
  private getDefaultValue(template: PropertyTemplate): any {
    switch (template.outputType) {
      case 'number':
        return template.range ? template.range.min : 0;
      case 'boolean':
        return false;
      case 'discrete':
        return template.options ? template.options[0] : 'unknown';
      case 'string':
      default:
        return 'default';
    }
  }

  /** Create a complete system from templates */
  createSystem(systemTemplate: SystemTemplate): PropertyGraph {
    const definitions: PropertyDefinition[] = [];

    for (const template of systemTemplate.properties) {
      definitions.push(this.buildPropertyDefinition(template));
    }

    this.systems.set(systemTemplate.name, systemTemplate);
    return new PropertyGraph(definitions);
  }

  /** Create a test entity for a system */
  createTestEntity(systemName: string, entityName: string = 'TestEntity'): ProceduralEntity | null {
    const system = this.systems.get(systemName);
    if (!system) {
      return null;
    }

    const graph = this.createSystem(system);
    const seedManager = new SeedManager(`${systemName}-Test`);
    
    return new ProceduralEntity(entityName, ['Test', systemName, entityName], seedManager, graph);
  }

  /** Export system template as JSON */
  exportSystem(systemName: string): string | null {
    const system = this.systems.get(systemName);
    if (!system) {
      return null;
    }

    return JSON.stringify(system, null, 2);
  }

  /** Import system template from JSON */
  importSystem(jsonData: string): SystemTemplate {
    const system: SystemTemplate = JSON.parse(jsonData);
    
    // Validate system
    if (!system.name || !system.properties) {
      throw new Error('Invalid system template: missing name or properties');
    }

    // Validate all properties
    system.properties.forEach(prop => this.validatePropertyTemplate(prop));

    this.systems.set(system.name, system);
    return system;
  }

  /** Get all available systems */
  getAvailableSystems(): string[] {
    return Array.from(this.systems.keys());
  }

  /** Get system template */
  getSystem(name: string): SystemTemplate | undefined {
    return this.systems.get(name);
  }

  /** Create a preset configuration */
  createPreset(systemName: string, presetName: string, values: Record<string, any>): void {
    const system = this.systems.get(systemName);
    if (!system) {
      throw new Error(`System ${systemName} not found`);
    }

    if (!system.presets) {
      system.presets = {};
    }

    system.presets[presetName] = values;
  }

  /** Apply preset to entity generation */
  applyPreset(entity: ProceduralEntity, systemName: string, presetName: string): Record<string, any> {
    const system = this.systems.get(systemName);
    if (!system || !system.presets || !system.presets[presetName]) {
      throw new Error(`Preset ${presetName} not found in system ${systemName}`);
    }

    // Generate base properties
    const baseProperties = entity.generate();
    
    // Apply preset overrides
    const preset = system.presets[presetName];
    const result = { ...baseProperties };
    
    Object.entries(preset).forEach(([key, value]) => {
      if (key in result) {
        result[key] = value;
      }
    });

    return result;
  }

  /** Analyze system for potential issues */
  analyzeSystem(systemName: string): {
    valid: boolean;
    issues: string[];
    suggestions: string[];
    statistics: {
      totalProperties: number;
      dependencies: number;
      maxDepth: number;
      groups: string[];
    };
  } {
    const system = this.systems.get(systemName);
    if (!system) {
      return {
        valid: false,
        issues: [`System ${systemName} not found`],
        suggestions: [],
        statistics: { totalProperties: 0, dependencies: 0, maxDepth: 0, groups: [] }
      };
    }

    const issues: string[] = [];
    const suggestions: string[] = [];
    const groups = new Set<string>();
    let totalDependencies = 0;

    // Check each property
    system.properties.forEach(prop => {
      if (prop.group) {
        groups.add(prop.group);
      }

      if (prop.inputs) {
        totalDependencies += prop.inputs.length;

        // Check for missing dependencies
        prop.inputs.forEach(input => {
          const exists = system.properties.some(p => p.id === input);
          if (!exists) {
            issues.push(`Property ${prop.id} depends on undefined property ${input}`);
          }
        });
      }

      // Check formula syntax if present
      if (prop.formula) {
        try {
          // Basic syntax check
          new Function('return ' + prop.formula);
        } catch (error) {
          issues.push(`Property ${prop.id} has invalid formula: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    });

    // Calculate dependency depth
    const maxDepth = this.calculateMaxDependencyDepth(system.properties);

    // Generate suggestions
    if (groups.size === 0) {
      suggestions.push('Consider organizing properties into groups for better structure');
    }

    if (totalDependencies === 0) {
      suggestions.push('System has no dependencies - consider adding relationships between properties');
    }

    if (maxDepth > 5) {
      suggestions.push('Deep dependency chains detected - consider simplifying for better performance');
    }

    return {
      valid: issues.length === 0,
      issues,
      suggestions,
      statistics: {
        totalProperties: system.properties.length,
        dependencies: totalDependencies,
        maxDepth,
        groups: Array.from(groups)
      }
    };
  }

  /** Calculate maximum dependency depth */
  private calculateMaxDependencyDepth(properties: PropertyTemplate[]): number {
    const depthMap = new Map<string, number>();
    const visited = new Set<string>();

    const calculateDepth = (propId: string): number => {
      if (visited.has(propId)) {
        return 0; // Circular dependency
      }

      if (depthMap.has(propId)) {
        return depthMap.get(propId)!;
      }

      visited.add(propId);

      const prop = properties.find(p => p.id === propId);
      if (!prop || !prop.inputs) {
        depthMap.set(propId, 0);
        visited.delete(propId);
        return 0;
      }

      const maxInputDepth = Math.max(0, ...prop.inputs.map(input => calculateDepth(input)));
      const depth = maxInputDepth + 1;

      depthMap.set(propId, depth);
      visited.delete(propId);
      return depth;
    };

    return Math.max(0, ...properties.map(prop => calculateDepth(prop.id)));
  }
}
