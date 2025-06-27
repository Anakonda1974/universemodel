import { PropertyDefinition } from "./PropertyGraph";
import { getNoise01, mapRange01, resolveDiscrete } from "./ProceduralUtils.js";

/*****************************************************************************
 * EXTENDED PLANET PROPERTY SUBSYSTEMS
 * --------------------------------------------------------------------------
 * This module augments the original four‑subsystem design (basic, atmosphere,
 * geology, climate) with richer, inter‑dependent properties and three brand‑
 * new subsystems: orbital, hydrology and biosphere.
 *
 * ‑ All numerical ranges are deliberately broad so you can re‑tune them to
 *   the tone of your simulation (hard‑SF vs space‑opera).
 * ‑ Dependencies reference other calculated properties and are resolved by
 *   the PropertyGraph engine at runtime, so ordering inside arrays is not
 *   critical provided all inputs exist somewhere in the merged definition
 *   set returned by `createPlanetDefinitions()`.
 *****************************************************************************/

/** ------------------------------------------------------------------------
 * 1. BASIC PHYSICAL PROPERTIES (extended)
 * --------------------------------------------------------------------- */
export function createBasicSubsystem(): PropertyDefinition[] {
  return [
    /* --- Original basic props --------------------------------------- */
    {
      id: "radius", // Earth radii
      group: "basic",
      compute: (_, seed) => mapRange01(getNoise01(seed, "radius"), 0.5, 3),
    },
    {
      id: "density", // Earth = 1 ⇒ ~5.51 g/cc
      group: "basic",
      compute: (_, seed) => mapRange01(getNoise01(seed, "density"), 0.5, 5),
    },
    {
      id: "mass", // Earth masses
      inputs: ["radius", "density"],
      group: "basic",
      compute: (ctx) => ctx.radius ** 3 * ctx.density,
    },
    {
      id: "gravity", // g (Earth = 1)
      inputs: ["mass", "radius"],
      group: "basic",
      compute: (ctx) => ctx.mass / ctx.radius ** 2,
    },
    {
      id: "escapeVelocity", // relative to Earth (11.2 km/s = 1)
      inputs: ["mass", "radius"],
      group: "basic",
      compute: (ctx) => Math.sqrt((2 * ctx.mass) / ctx.radius),
    },
    {
      id: "axialTilt", // degrees
      group: "basic",
      compute: (_, seed) => mapRange01(getNoise01(seed, "tilt"), 0, 45),
    },
    {
      id: "dayLength", // hours
      group: "basic",
      compute: (_, seed) => mapRange01(getNoise01(seed, "day"), 8, 40),
    },
    {
      id: "yearLength", // Earth days – left here for backwards compatibility
      group: "basic",
      compute: (_, seed) => mapRange01(getNoise01(seed, "year"), 200, 800),
    },
    {
      id: "waterCoverage", // 0‑1 fraction of surface area
      group: "basic",
      compute: (_, seed) => getNoise01(seed, "water"),
    },
    {
      id: "baseTemperature", // Kelvin (before greenhouse/albedo mods)
      group: "basic",
      compute: (_, seed) => mapRange01(getNoise01(seed, "temp"), 150, 350),
    },
    /* --- New basic props -------------------------------------------- */
    {
      id: "albedo", // 0‑1 average planetary albedo
      inputs: ["waterCoverage"],
      group: "basic",
      compute: (ctx, seed) => {
        // Water‑rich worlds tend to be darker; icy ones brighter
        const baseline = ctx.waterCoverage > 0.6 ? 0.06 : 0.15;
        return mapRange01(getNoise01(seed, "albedo"), baseline, baseline + 0.25);
      },
    },
  ];
}

/** ------------------------------------------------------------------------
 * 2. ATMOSPHERE (extended)
 * --------------------------------------------------------------------- */
export function createAtmosphereSubsystem(): PropertyDefinition[] {
  return [
    /* Existing simple properties */
    {
      id: "atmosphereDensity", // relative to Earth sea‑level density
      group: "atmosphere",
      compute: (_, seed) => mapRange01(getNoise01(seed, "atm_density"), 0, 10),
    },
    {
      id: "atmosphereType",
      inputs: ["atmosphereDensity"],
      group: "atmosphere",
      compute: (ctx, seed) =>
        resolveDiscrete(getNoise01(seed, "atm_type"), [
          [0.1, ctx.atmosphereDensity < 0.1 ? "none" : "thin"],
          [0.4, "thin"],
          [0.7, "breathable"],
          [0.9, "thick"],
          [1.0, "toxic"],
        ]),
    },
    {
      id: "atmosphereComposition",
      inputs: ["atmosphereType"],
      group: "atmosphere",
      compute: (ctx, seed) => {
        if (ctx.atmosphereType === "none") return "vacuum";
        return resolveDiscrete(getNoise01(seed, "atm_mix"), [
          [0.5, "nitrogen‑oxygen"],
          [0.7, "carbon‑dioxide"],
          [0.9, "methane"],
          [1.0, "exotic"],
        ]);
      },
    },

    /* New detailed properties */
    {
      id: "surfacePressure", // bars (Earth ≈ 1)
      inputs: ["atmosphereDensity", "gravity"],
      group: "atmosphere",
      compute: (ctx) => ctx.atmosphereDensity * ctx.gravity,
    },
    {
      id: "greenhouseEffect", // Kelvin boost
      inputs: ["atmosphereComposition", "atmosphereDensity"],
      group: "atmosphere",
      compute: (ctx) => {
        const potency = ctx.atmosphereComposition === "carbon‑dioxide" ? 1.5 : ctx.atmosphereComposition === "methane" ? 2 : 1;
        return ctx.atmosphereDensity * potency * 5; // simple model
      },
    },
    {
      id: "cloudCoverage", // 0‑1
      inputs: ["waterCoverage", "atmosphereDensity"],
      group: "atmosphere",
      compute: (ctx, seed) => {
        if (ctx.atmosphereDensity < 0.1) return 0;
        const base = ctx.waterCoverage;
        return mapRange01(getNoise01(seed, "cloud"), base * 0.4, Math.min(1, base + 0.2));
      },
    },
  ];
}

/** ------------------------------------------------------------------------
 * 3. GEOLOGY (extended)
 * --------------------------------------------------------------------- */
export function createGeologySubsystem(): PropertyDefinition[] {
  return [
    /* Original geology */
    {
      id: "crustType",
      group: "geology",
      compute: (_, seed) =>
        resolveDiscrete(getNoise01(seed, "crust"), [
          [0.5, "rocky"],
          [0.7, "icy"],
          [0.9, "oceanic"],
          [1.0, "metallic"],
        ]),
    },
    {
      id: "coreType",
      group: "geology",
      compute: (_, seed) =>
        resolveDiscrete(getNoise01(seed, "core"), [
          [0.5, "solid"],
          [0.8, "molten"],
          [1.0, "exotic"],
        ]),
    },
    {
      id: "tectonicActivity",
      group: "geology",
      compute: (_, seed) =>
        resolveDiscrete(getNoise01(seed, "tectonic"), [
          [0.3, "none"],
          [0.6, "minor"],
          [1.0, "major"],
        ]),
    },
    {
      id: "magneticFieldStrength",
      inputs: ["coreType", "radius"],
      group: "geology",
      compute: (ctx, seed) => {
        const base = ctx.coreType === "molten" ? 1 : ctx.coreType === "solid" ? 0.5 : 1.5;
        return base * mapRange01(getNoise01(seed, "magfield"), 0.1, 3);
      },
    },

    /* New geology */
    {
      id: "volcanicActivity",
      inputs: ["coreType", "tectonicActivity"],
      group: "geology",
      compute: (ctx, seed) => {
        const base = ctx.coreType === "molten" ? 1 : 0.2;
        const tectonicFactor = ctx.tectonicActivity === "major" ? 1 : ctx.tectonicActivity === "minor" ? 0.5 : 0;
        return mapRange01(getNoise01(seed, "volcano"), 0, 1) * (base + tectonicFactor);
      },
    },
    {
      id: "mineralRichness", // 0‑1 indicator
      inputs: ["crustType", "tectonicActivity"],
      group: "geology",
      compute: (ctx, seed) => {
        const crustBonus = ctx.crustType === "metallic" ? 0.3 : ctx.crustType === "rocky" ? 0.1 : -0.1;
        const tectonicBonus = ctx.tectonicActivity === "major" ? 0.2 : ctx.tectonicActivity === "minor" ? 0.05 : 0;
        return Math.min(1, Math.max(0, mapRange01(getNoise01(seed, "minerals"), 0, 1) + crustBonus + tectonicBonus));
      },
    },
  ];
}

/** ------------------------------------------------------------------------
 * 4. CLIMATE (extended) – now depends on greenhouse + albedo
 * --------------------------------------------------------------------- */
export function createClimateSubsystem(): PropertyDefinition[] {
  return [
    {
      id: "weatherPattern",
      inputs: ["baseTemperature", "waterCoverage"],
      group: "climate",
      compute: (ctx, seed) => {
        const noise = getNoise01(seed, "weather");
        if (ctx.waterCoverage < 0.2) {
          return noise < 0.5 ? "dry" : "windy";
        }
        if (ctx.baseTemperature > 310) {
          return noise < 0.5 ? "stormy" : "humid";
        }
        return noise < 0.5 ? "temperate" : "variable";
      },
    },
    {
      id: "dominantBiome",
      inputs: ["baseTemperature", "waterCoverage"],
      group: "climate",
      compute: (ctx, seed) => {
        const noise = getNoise01(seed, "biome");
        if (ctx.waterCoverage > 0.6) {
          return noise < 0.5 ? "ocean" : "swamp";
        }
        if (ctx.baseTemperature < 250) {
          return noise < 0.5 ? "tundra" : "glacier";
        }
        if (ctx.baseTemperature > 320) {
          return noise < 0.5 ? "desert" : "volcanic";
        }
        return noise < 0.5 ? "forest" : "plains";
      },
    },

    /* New climate outputs */
    {
      id: "surfaceTemperature", // Kelvin including greenhouse & albedo
      inputs: ["baseTemperature", "greenhouseEffect", "albedo"],
      group: "climate",
      compute: (ctx) => ctx.baseTemperature + ctx.greenhouseEffect - ctx.albedo * 60,
    },
    {
      id: "seasonSeverity", // qualitative
      inputs: ["axialTilt", "eccentricity"],
      group: "climate",
      compute: (ctx) => {
        const index = ctx.axialTilt / 45 + ctx.eccentricity;
        if (index < 0.3) return "mild";
        if (index < 0.7) return "moderate";
        return "extreme";
      },
    },
  ];
}

/** ------------------------------------------------------------------------
 * 5. ORBITAL SUBSYSTEM
 * --------------------------------------------------------------------- */
export function createOrbitalSubsystem(): PropertyDefinition[] {
  return [
    {
      id: "semiMajorAxis", // AU; derived from yearLength (Kepler's 3rd)
      inputs: ["yearLength"],
      group: "orbital",
      compute: (ctx) => Math.cbrt((ctx.yearLength / 365) ** 2),
    },
    {
      id: "eccentricity", // 0 (circular)‑>0.6 (very elliptical)
      group: "orbital",
      compute: (_, seed) => mapRange01(getNoise01(seed, "ecc"), 0, 0.6),
    },
    {
      id: "orbitalPeriod", // Alias to yearLength (Earth days)
      inputs: ["yearLength"],
      group: "orbital",
      compute: (ctx) => ctx.yearLength,
    },
  ];
}

/** ------------------------------------------------------------------------
 * 6. HYDROLOGY SUBSYSTEM
 * --------------------------------------------------------------------- */
export function createHydrologySubsystem(): PropertyDefinition[] {
  return [
    {
      id: "averageOceanDepth", // km
      inputs: ["waterCoverage", "gravity"],
      group: "hydrology",
      compute: (ctx, seed) => {
        if (ctx.waterCoverage < 0.1) return 0;
        const raw = mapRange01(getNoise01(seed, "oceanDepth"), 1, 20); // km
        return raw / ctx.gravity; // heavier gravity compresses depth
      },
    },
    {
      id: "salinity", // PSU (0‑40)
      inputs: ["waterCoverage"],
      group: "hydrology",
      compute: (ctx, seed) => {
        if (ctx.waterCoverage < 0.1) return 0;
        return mapRange01(getNoise01(seed, "salinity"), 10, 40);
      },
    },
    {
      id: "iceCoverage", // 0‑1
      inputs: ["surfaceTemperature", "waterCoverage"],
      group: "hydrology",
      compute: (ctx) => {
        if (ctx.waterCoverage < 0.1) return 0;
        if (ctx.surfaceTemperature > 273) return 0; // no permanent ice
        const freezeFactor = (273 - ctx.surfaceTemperature) / 80; // 193‑273 K
        return Math.min(1, freezeFactor + (1 - ctx.waterCoverage) * 0.5);
      },
    },
  ];
}

/** ------------------------------------------------------------------------
 * 7. BIOSPHERE SUBSYSTEM (simple starter)
 * --------------------------------------------------------------------- */
export function createBiosphereSubsystem(): PropertyDefinition[] {
  return [
    {
      id: "lifePresence", // none | microbial | complex | intelligent
      inputs: ["surfaceTemperature", "waterCoverage", "atmosphereType"],
      group: "biosphere",
      compute: (ctx, seed) => {
        if (ctx.atmosphereType === "toxic" || ctx.atmosphereType === "none") return "none";
        if (ctx.surfaceTemperature < 240 || ctx.surfaceTemperature > 350) return "none";
        const noise = getNoise01(seed, "life");
        return resolveDiscrete(noise, [
          [0.5, "microbial"],
          [0.8, "complex"],
          [1.0, "intelligent"],
        ]);
      },
    },
    {
      id: "biodiversityIndex", // 0‑1
      inputs: ["lifePresence", "dominantBiome", "surfaceTemperature"],
      group: "biosphere",
      compute: (ctx, seed) => {
        if (ctx.lifePresence === "none") return 0;
        const biomeBonus = ctx.dominantBiome === "forest" || ctx.dominantBiome === "ocean" ? 0.2 : 0;
        const tempFactor = 1 - Math.abs(ctx.surfaceTemperature - 288) / 100;
        return Math.max(0, Math.min(1, mapRange01(getNoise01(seed, "biodiv"), 0, 1) + biomeBonus + tempFactor * 0.2));
      },
    },
  ];
}

/** ------------------------------------------------------------------------
 * 8. COMBINED EXPORT
 * --------------------------------------------------------------------- */
export function createPlanetDefinitions(): PropertyDefinition[] {
  return [
    ...createBasicSubsystem(),
    ...createAtmosphereSubsystem(),
    ...createGeologySubsystem(),
    ...createClimateSubsystem(),
    ...createOrbitalSubsystem(),
    ...createHydrologySubsystem(),
    ...createBiosphereSubsystem(),
  ];
}
