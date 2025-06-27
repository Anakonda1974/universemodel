# Universe Model

This project provides a small set of TypeScript modules for building a
procedural universe. A single root seed is expanded into deterministic
sub-seeds that drive `PropertyGraph` evaluations for individual
`ProceduralEntity` instances.

## Building

```
npm install
npm run build
```

## Example Usage

```ts
import { SeedManager } from "./dist/SeedManager";
import { PropertyGraph, PropertyDefinition } from "./dist/PropertyGraph";
import { ProceduralEntity } from "./dist/ProceduralEntity";
import { getNoise01, mapRange01 } from "./dist/ProceduralUtils";

const seedManager = new SeedManager("GenesisAlpha42");

const planetDefs: PropertyDefinition[] = [
  {
    id: "radius",
    compute: (_, seed) => mapRange01(getNoise01(seed, "radius"), 1, 5),
  },
  {
    id: "mass",
    inputs: ["radius"],
    compute: (ctx) => ctx.radius ** 3,
  },
  {
    id: "gravity",
    inputs: ["radius", "mass"],
    compute: (ctx) => ctx.mass / ctx.radius ** 2,
  },
];

const graph = new PropertyGraph(planetDefs);
const earth = new ProceduralEntity(
  "Planet-X",
  ["MilkyWay", "System-4", "Planet-X"],
  seedManager,
  graph
);

console.log(earth.generate());
```

## Extended Planet Properties

The `createPlanetDefinitions` helper combines several subsystems such as
basic physics, atmosphere, geology and climate. The definitions can be
extended or replaced as needed to model additional effects.

```ts
import { createPlanetDefinitions } from "./dist/PlanetDefinitions";

const planetGraph = new PropertyGraph(createPlanetDefinitions());
const mars = new ProceduralEntity(
  "Mars",
  ["Solar", "System", "Mars"],
  seedManager,
  planetGraph
);

console.log(mars.generate());
```

### Grouped Output

Properties can be organised into groups by adding a `group` field to each
`PropertyDefinition`. Use `generateGrouped()` on a `ProceduralEntity` to obtain
the values structured by these groups.

```ts
const grouped = mars.generateGrouped();
console.log(grouped.basic.radius); // access values by group and id
```

## HTML Demo

After running `npm run build`, open `demo/index.html` in a browser to see a
Tailwind-powered page that lists the generated properties for a sample planet.
