import { deriveSeed, RNG } from './utils/rng.js';

export function generatePlates(seed, count = 10) {
  const rng = new RNG(deriveSeed(seed, 'plates'));
  const plates = [];
  for (let i = 0; i < count; i++) {
    const u = rng.nextFloat();
    const v = rng.nextFloat();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    const center = {
      x: Math.sin(phi) * Math.cos(theta),
      y: Math.sin(phi) * Math.sin(theta),
      z: Math.cos(phi),
    };
    const motion = {
      x: rng.nextFloat() * 2 - 1,
      y: rng.nextFloat() * 2 - 1,
      z: rng.nextFloat() * 2 - 1,
    };
    plates.push({ id: `plate_${i}`, center, motion });
  }
  return plates;
}

