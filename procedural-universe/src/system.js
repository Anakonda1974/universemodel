import { deriveSeed, RNG } from './utils/rng.js';
import { generatePlanet } from './planet.js';

export function generateSystem(system) {
  const baseSeed = system.seed ?? 0n;
  const rng = new RNG(deriveSeed(baseSeed, 'planets'));

  const planetCount = rng.nextInt(8) + 1;
  const planets = [];
  for (let i = 0; i < planetCount; i++) {
    const id = `${system.id || 'sys'}_planet_${i}`;
    const pSeed = deriveSeed(baseSeed, id);
    const angle = rng.nextFloat() * Math.PI * 2;
    const distance = (i + 1) * 10 + rng.nextFloat() * 5;
    const planetData = generatePlanet({
      id,
      seed: pSeed,
      position: {
        x: Math.cos(angle) * distance,
        y: 0,
        z: Math.sin(angle) * distance,
      },
      orbit: { distance, angle },
    });
    planets.push(planetData);
  }

  return {
    ...system,
    star: { seed: deriveSeed(baseSeed, 'star'), radius: 1 + rng.nextFloat() },
    planets,
  };
}

