import { deriveSeed, RNG } from './utils/rng.js';

/**
 * Generate deterministic data for a galaxy using its seed. The returned object
 * includes an array of pseudo-randomly positioned systems. Each system
 * receives its own derived seed so further generation can remain consistent.
 */
export function generateGalaxy(galaxy) {
  const rng = new RNG(deriveSeed(galaxy.seed, 'systems'));

  const systems = [];
  const count = rng.nextInt(10) + 1; // at least one system per galaxy

  for (let i = 0; i < count; i++) {
    const id = `${galaxy.id}_sys_${i}`;
    const seed = deriveSeed(galaxy.seed, id);

    systems.push({
      id,
      seed,
      position: {
        x: rng.nextFloat() * 1000 - 500,
        y: rng.nextFloat() * 1000 - 500,
        z: rng.nextFloat() * 1000 - 500,
      },
    });
  }

  return { ...galaxy, systems };
}
