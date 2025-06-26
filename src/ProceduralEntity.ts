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
}
