export function deriveSeed(globalSeed, context) {
  let hash = 0xcbf29ce484222325n;
  for (let i = 0; i < context.length; i++) {
    hash ^= BigInt(context.charCodeAt(i));
    hash = BigInt.asUintN(64, hash * 0x100000001b3n);
  }
  return BigInt.asUintN(64, (BigInt(globalSeed) ^ hash));
}

export class RNG {
  constructor(seed) {
    this.state = BigInt.asUintN(64, BigInt(seed));
  }

  next() {
    this.state = BigInt.asUintN(64, this.state * 6364136223846793005n + 1442695040888963407n);
    return this.state;
  }

  nextFloat() {
    return Number(this.next() >> 11n) / 9007199254740992;
  }

  nextInt(max) {
    return Math.floor(this.nextFloat() * max);
  }
}
