// src/galaxy.js
import { deriveSeed, RNG } from './utils/rng.js';

/**
 * generateGalaxy: Spiralgalaxie mit seed-basierten visuellen Parametern
 */
export function generateGalaxy(galaxyIndex, globalSeed, starCount = 1000) {
  const context = `galaxy_${galaxyIndex}`;
  const seed = deriveSeed(globalSeed, context);
  const rng = new RNG(seed);

  // ⭐ Strukturparameter
  const numArms = 2 + rng.nextInt(5); // 2–6 Arme
  const armPitch = map(rng.nextFloat(), 5 * Math.PI/180, 30 * Math.PI/180); // 5°–30° – realistisch :contentReference[oaicite:1]{index=1}
  const armTwist = map(rng.nextFloat(), 2, 8);
  const coreRadius = map(rng.nextFloat(), 10, 50);
  const diskThickness = map(rng.nextFloat(), 1, 10);
  const radiusMax = map(rng.nextFloat(), 80, 200);
  const bulgeFraction = map(rng.nextFloat(), 0.1, 0.4);

  const stars = [];
  for (let i = 0; i < starCount; i++) {
    const norm = rng.nextFloat();
    const arm = i % numArms;
    const baseAngle = (arm / numArms) * 2 * Math.PI;
    // Logarithmische Spiralform + Rauschen :contentReference[oaicite:2]{index=2}
    const theta = baseAngle +
      Math.log(norm * radiusMax + 1) * Math.tan(armPitch) * armTwist +
      (rng.nextFloat() - 0.5) * 0.5;

    const r = Math.sqrt(norm) * radiusMax;
    const x = Math.cos(theta) * r;
    const z = Math.sin(theta) * r;
    const y = (rng.nextFloat() - 0.5) * diskThickness;

    const t = norm;
    const rC = Math.min(1, t * 2);
    const bC = Math.min(1, (1 - t) * 2);
    const gC = 1 - Math.abs(0.5 - t) * 2;

    stars.push({ x, y, z, color: { r: rC, g: gC, b: bC } });
  }

  return {
    id: galaxyIndex,
    seed,
    numArms,
    armPitch,
    armTwist,
    coreRadius,
    diskThickness,
    radiusMax,
    bulgeFraction,
    stars
  };
}

// Hilfsfunktion zum Skalieren
function map(v, min, max) {
  return v * (max - min) + min;
}
