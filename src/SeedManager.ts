export class SeedManager {
  private cache = new Map<string, string>();

  constructor(public rootSeed: string) {}

  /**
   * Creates a deterministic sub-seed for a given path.
   * The path order matters and will be joined with the root seed
   * using "::" as a separator before hashing.
   */
  getSubSeed(path: string[]): string {
    const key = path.join("::");
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }
    const data = [...path, this.rootSeed].join("::");
    const hash = this.hashString(data);
    this.cache.set(key, hash);
    return hash;
  }

  private hashString(value: string): string {
    let hash = 0xcbf29ce484222325n;
    const prime = 0x100000001b3n;
    for (let i = 0; i < value.length; i++) {
      hash ^= BigInt(value.charCodeAt(i));
      hash = (hash * prime) & 0xffffffffffffffffn;
    }
    return hash.toString(16).padStart(16, "0");
  }
}
