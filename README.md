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
basic physics, atmosphere, geology and climate. It also includes
orbital, hydrology, biosphere and a visual subsystem that outputs values
useful for rendering. The definitions can be extended or replaced as
needed to model additional effects.

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

### Tracing Property Dependencies

Sometimes it's helpful to see exactly how a value was produced. Each
`ProceduralEntity` exposes `generateTrace()` which returns the computed value
for every property along with the inputs used. This can be useful for debugging
or for building more communicative UI elements.

```ts
const trace = mars.generateTrace(console.log);
console.log(trace.mass.inputs); // { radius: 1.5, density: 2 }
console.log(trace.mass.value);  // result of compute function
```

## HTML Demo

After running `npm run build`, open `demo/index.html` in a browser to see a
Tailwind-powered page that lists the generated properties for a sample planet.

For an interactive view that visualises property dependencies, open

`demo/visual.html`. This demo displays each subsystem in a draggable card with
input ports on the left and output ports on the right. Connections can be
dragged between ports and removed by double‑clicking the connection label. Each
connection also shows a label indicating which property values are linked. You
can double‑click on a connection itself to add hidden anchor points that shape
the line without altering its curve.
