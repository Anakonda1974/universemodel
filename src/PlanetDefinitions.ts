import { PropertyDefinition } from "./PropertyGraph";
import { getNoise01, mapRange01, resolveDiscrete } from "./ProceduralUtils";

/** Base physical properties of the planet */
export function createBasicSubsystem(): PropertyDefinition[] {
  return [
    {
      id: "radius",
      compute: (_, seed) => mapRange01(getNoise01(seed, "radius"), 0.5, 3),
    },
    {
      id: "density",
      compute: (_, seed) => mapRange01(getNoise01(seed, "density"), 0.5, 5),
    },
    {
      id: "mass",
      inputs: ["radius", "density"],
      compute: (ctx) => ctx.radius ** 3 * ctx.density,
    },
    {
      id: "gravity",
      inputs: ["mass", "radius"],
      compute: (ctx) => ctx.mass / ctx.radius ** 2,
    },
    {
      id: "axialTilt",
      compute: (_, seed) => mapRange01(getNoise01(seed, "tilt"), 0, 45),
    },
    {
      id: "dayLength",
      compute: (_, seed) => mapRange01(getNoise01(seed, "day"), 8, 40),
    },
    {
      id: "yearLength",
      compute: (_, seed) => mapRange01(getNoise01(seed, "year"), 200, 800),
    },
    {
      id: "waterCoverage",
      compute: (_, seed) => getNoise01(seed, "water"),
    },
    {
      id: "baseTemperature",
      compute: (_, seed) => mapRange01(getNoise01(seed, "temp"), 150, 350),
    },
  ];
}

/** Atmosphere related properties */
export function createAtmosphereSubsystem(): PropertyDefinition[] {
  return [
    {
      id: "atmosphereDensity",
      compute: (_, seed) => mapRange01(getNoise01(seed, "atm_density"), 0, 10),
    },
    {
      id: "atmosphereType",
      inputs: ["atmosphereDensity"],
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
      compute: (ctx, seed) => {
        if (ctx.atmosphereType === "none") return "vacuum";
        return resolveDiscrete(getNoise01(seed, "atm_mix"), [
          [0.5, "nitrogen-oxygen"],
          [0.7, "carbon-dioxide"],
          [0.9, "methane"],
          [1.0, "exotic"],
        ]);
      },
    },
  ];
}

/** Geology related properties */
export function createGeologySubsystem(): PropertyDefinition[] {
  return [
    {
      id: "crustType",
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
      compute: (_, seed) =>
        resolveDiscrete(getNoise01(seed, "core"), [
          [0.5, "solid"],
          [0.8, "molten"],
          [1.0, "exotic"],
        ]),
    },
    {
      id: "tectonicActivity",
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
      compute: (ctx, seed) => {
        const base = ctx.coreType === "molten" ? 1 : ctx.coreType === "solid" ? 0.5 : 1.5;
        return base * mapRange01(getNoise01(seed, "magfield"), 0.1, 3);
      },
    },
  ];
}

/** Climate and biosphere related properties */
export function createClimateSubsystem(): PropertyDefinition[] {
  return [
    {
      id: "weatherPattern",
      inputs: ["baseTemperature", "waterCoverage"],
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
  ];
}

/**
 * Returns a set of property definitions describing a planet by combining
 * the individual subsystems. Consumers may extend or replace these
 * definitions as needed.
 */
export function createPlanetDefinitions(): PropertyDefinition[] {
  return [
    ...createBasicSubsystem(),
    ...createAtmosphereSubsystem(),
    ...createGeologySubsystem(),
    ...createClimateSubsystem(),
  ];
}
