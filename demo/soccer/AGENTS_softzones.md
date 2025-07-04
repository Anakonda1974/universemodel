# Soft Zone Visualization To-Do List

This file collects upcoming tasks for implementing dynamic "soft zones" for the soccer demo. The goal is to replace the current rectangular influence areas with smooth, context-sensitive fields around each player.

## Visualization
- [ ] Draw round influence zones using radial gradients around each player's tactical center.
- [ ] Support ellipse deformation so zones stretch toward the ball or according to role.
- [ ] Add optional heatmap overlay or contour lines to highlight core movement areas.

## Dynamic Behavior
- [ ] Decrease influence with distance via `Math.exp` or a Gaussian falloff.
- [ ] Shift zones in real time based on ball position, tactics and pressing intensity.
- [ ] Allow coach instructions to modify zone size (e.g. defenders compact when under pressure).

## Architecture
- [ ] Provide zone parameters from the coach/tactics level (e.g. via `Coach.js` or `Team.js`).
- [ ] Implement `getTargetZoneCenter(player, gameState)` in a tactics manager.
- [ ] In `Player.js`, compute `getDynamicTargetZone(gameState)` that merges coach data with local goals.
- [ ] Add helper functions in `TacticsHelper.js` for interpolating positions and computing ellipse radii.

## Emergence
- [ ] Ensure players can temporarily leave their zone based on decision rules, leading to natural movement.

