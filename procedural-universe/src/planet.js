import { deriveSeed } from './utils/rng.js';
import { perlinNoise } from './utils/noise.js';

function noise01(seed, label) {
  return (perlinNoise(0, 0, 0, deriveSeed(seed, label)) + 1) / 2;
}

export function generatePlanet(planet) {
  const seed = planet.seed ?? 0n;

  const radius = 0.5 + noise01(seed, 'radius') * 2.5;
  const density = 0.5 + noise01(seed, 'density') * 4.5;
  const mass = radius ** 3 * density;
  const gravity = mass / radius ** 2;
  const atmosphere = noise01(seed, 'atmosphere');

  return {
    ...planet,
    radius,
    density,
    mass,
    gravity,
    atmosphere,
  };
}

