import { SeedManager } from "./SeedManager";
import { PropertyGraph } from "./PropertyGraph";

export class ProceduralEntity {
  constructor(
    public name: string,
    public path: string[],
    public seedManager: SeedManager,
    public graph: PropertyGraph
  ) {}

  get fullSeed(): string {
    return this.seedManager.getSubSeed(this.path);
  }

  generate(log?: (msg: string) => void): Record<string, any> {
    return this.graph.evaluate(this.fullSeed, log);
  }

  /** Generate grouped property results using PropertyGraph.evaluateGrouped */
  generateGrouped(log?: (msg: string) => void) {

    if (!this.graph.evaluateGrouped) {
      throw new Error("PropertyGraph does not support grouped evaluation");
    }
    return this.graph.evaluateGrouped(this.fullSeed, log);
  }

  /** Generate detailed traces for each property using PropertyGraph.evaluateWithTrace */
  generateTrace(log?: (msg: string) => void) {
    if (!(this.graph as any).evaluateWithTrace) {
      throw new Error("PropertyGraph does not support trace evaluation");
    }
    // Type assertion because evaluateWithTrace is defined on PropertyGraph
    return (this.graph as any).evaluateWithTrace(this.fullSeed, log);
  }
}
