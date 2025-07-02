import { deriveSeed, RNG } from './utils/rng.js';

const params = new URLSearchParams(window.location.search);
export const globalSeed = BigInt(params.get('seed') || 1);

export function getGalaxies(seed = globalSeed, num = 1) {
  const baseSeed = deriveSeed(seed, 'universe');
  const rng = new RNG(baseSeed);
  const galaxies = [];
  for (let i = 0; i < num; i++) {
    const id = `galaxy_${i}`;
    const gSeed = deriveSeed(seed, id);
    galaxies.push({
      id,
      seed: gSeed,
      position: {
        x: rng.nextFloat() * 1000 - 500,
        y: rng.nextFloat() * 1000 - 500,
        z: rng.nextFloat() * 1000 - 500
      }
    });
  }
  return galaxies;
}
