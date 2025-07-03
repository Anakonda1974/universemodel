// src/system.js
import { deriveSeed, RNG } from './utils/rng.js';

export function generateSystem(galaxySeed, systemIndex, maxPlanets = 8) {
  const context = `system_${systemIndex}`;
  const seed = deriveSeed(galaxySeed, context);
  const rng = new RNG(seed);

  const numPlanets = 1 + Math.floor(rng.nextFloat() * maxPlanets);
  const planets = [];

  for (let i = 0; i < numPlanets; i++) {
    const pContext = `planet_${systemIndex}_${i}`;
    const pSeed = deriveSeed(seed, pContext);
    const prng = new RNG(pSeed);

    // Orbitalparameter
    const distance = 2 + prng.nextFloat() * 20; // willkürliche Skala
    const angle = prng.nextFloat() * Math.PI * 2;
    const size = 1.15 + prng.nextFloat() * 3;

    const x = Math.cos(angle) * distance;
    const y = 0;
    const z = Math.sin(angle) * distance;

    // Beispiel für planetentrojen Farbe
    const color = `hsl(${Math.floor(prng.nextFloat() * 360)}, 70%, 10%)`;

    planets.push({ index: i, seed: pSeed, position: { x, y, z }, size, color });
  }

  return { seed, numPlanets, planets };
}
