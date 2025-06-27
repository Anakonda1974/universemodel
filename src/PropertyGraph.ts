export type PropertyDefinition = {
  id: string;
  inputs?: string[];
  compute: (ctx: Record<string, any>, seed: string) => any;
  /** Optional group used to organize related properties */
  group?: string;
};

export type GroupedProperties = Record<string, Record<string, any>>;

export type TraceEntry = {
  value: any;
  inputs: Record<string, any>;
};
export type TraceResult = Record<string, TraceEntry>;

export class PropertyGraph {
  constructor(private definitions: PropertyDefinition[]) {}

  evaluate(seed: string, log?: (msg: string) => void): Record<string, any> {
    const pending = new Map<string, PropertyDefinition>();
    for (const def of this.definitions) {
      pending.set(def.id, def);
    }
    const context: Record<string, any> = {};
    let iterations = 0;
    const maxIterations = this.definitions.length * 2;

    while (pending.size > 0 && iterations < maxIterations) {
      for (const id of Array.from(pending.keys())) {
        const def = pending.get(id)!;
        const deps = def.inputs ?? [];
        if (deps.every((d) => d in context)) {
          const ctx = deps.reduce((obj, key) => {
            obj[key] = context[key];
            return obj;
          }, {} as Record<string, any>);
          context[id] = def.compute(ctx, seed);
          pending.delete(id);
          if (log) log(`computed ${id}`);
        }
      }
      iterations++;
    }

    if (pending.size > 0) {
      throw new Error(
        `Unresolved properties: ${Array.from(pending.keys()).join(", ")}`
      );
    }

    return context;
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
    const pending = new Map<string, PropertyDefinition>();
    for (const def of this.definitions) {
      pending.set(def.id, def);
    }
    const context: Record<string, any> = {};
    const trace: TraceResult = {};
    let iterations = 0;
    const maxIterations = this.definitions.length * 2;

    while (pending.size > 0 && iterations < maxIterations) {
      for (const id of Array.from(pending.keys())) {
        const def = pending.get(id)!;
        const deps = def.inputs ?? [];
        if (deps.every((d) => d in context)) {
          const ctx = deps.reduce((obj, key) => {
            obj[key] = context[key];
            return obj;
          }, {} as Record<string, any>);
          const value = def.compute(ctx, seed);
          context[id] = value;
          trace[id] = { value, inputs: ctx };
          pending.delete(id);
          if (log) {
            const inputs = Object.entries(ctx)
              .map(([k, v]) => `${k}: ${v}`)
              .join(", ");
            log(`computed ${id} = ${value} using ${inputs}`);
          }
        }
      }
      iterations++;
    }

    if (pending.size > 0) {
      throw new Error(
        `Unresolved properties: ${Array.from(pending.keys()).join(", ")}`
      );
    }

    return trace;
  }
}
