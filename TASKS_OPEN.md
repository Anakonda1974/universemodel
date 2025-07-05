# Outstanding Tasks for Soccer Project

This list summarizes open to-dos and unfinished implementations found in the `demo/soccer` project.

## Unfinished Code
- [x] **behaviorTree.js** – The base class `BTNode` now provides a default `tick()` implementation.

## Planned Features (from `demo/soccer/AGENTS.md`)
- [x] **Transition to 3D**: switch from 2D to a 3D engine with appropriate player animations and ball physics.
- [x] **3D Engine and Camera** support.
- [x] **3D Player animations** to synchronise movement with actions.
- [x] **Ball Z‑axis and enhanced physics**, potentially using Box2D, PhysX or Bullet.
- [x] **Collision physics** for player and ball interactions.
- **Machine Learning based AI** including reinforcement learning and neuroevolution approaches.
- **Multiplayer modes**: local multiplayer, online multiplayer with network synchronisation and a hotseat/coach mode.
- **Additional football rules and details** beyond those already implemented.

## Plan for Performant Physics and Full Soccer Ruleset

The soccer simulation will require a dedicated effort to model physics and rules in a way that preserves frame rate while remaining faithful to the sport. The following roadmap outlines the major tasks.

1. **Physics Engine Selection**
   - Benchmark lightweight JavaScript engines such as `planck.js` (Box2D port) or `ammo.js` (Bullet port).
   - Choose the option that offers stable collision detection and low overhead for 2D play, with a path to 3D if needed.
2. **Integration Layer**
   - Abstract current ball and player movement into physics bodies managed by the chosen library.
   - Update rendering and game logic to read positions and velocities from the physics simulation each frame.
3. **Optimized Update Loop**
   - Use fixed time steps and sub‐stepping when frame rates dip to maintain deterministic results.
   - Profile collision routines and tune for minimal allocations in the hot path.
4. **Comprehensive Rule Implementation**
   - Encode the remaining rules from FIFA, including offside, fouls, throw‑ins, goal kicks and corner kicks.
   - Add a referee subsystem to evaluate player actions and enforce stoppages or penalties.
5. **Testing and Balancing**
   - Build a suite of scenario tests (e.g. offside traps, penalty situations) to validate rule handling.
   - Stress‑test physics with multiple agents to ensure stable behavior under load.

This plan should provide a clear path to a complete and performant soccer experience.
