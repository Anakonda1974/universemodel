import { debugOptions } from './debug/debugOptions.js';

// Placeholder drawing functions; actual implementations should exist elsewhere
export function drawPlayers(ctx, players, opts = {}) {}
export function drawBall(ctx, ball) {}
export function drawRadar(ctx, players, ball, w, h) {}
export function drawZones(ctx, players, world) {}
export function drawSoftZones(ctx, players, ball, coach) {}
export function drawIntents(ctx, players) {}
export function drawFormationDebug(ctx, players) {}
export function drawPerceptionHighlights(ctx, player) {}
export function drawPasses(ctx, players, ball) {}
export function drawBallDebug(ctx, ball) {}
export function drawDribbleSide(ctx, player) {}

export function renderDebugLayers(ctx, state) {
  const { players, ball, world, coach, activePlayer } = state;

  if (debugOptions.showRadar) drawRadar(ctx.radar, players, ball, 120, 80);
  if (debugOptions.showZones) drawZones(ctx.main, players, world);
  if (debugOptions.showSoftZones) drawSoftZones(ctx.main, players, ball, coach);
  if (debugOptions.showIntents) drawIntents(ctx.main, players);
  if (debugOptions.showFormationDebug) drawFormationDebug(ctx.main, players);
  if (debugOptions.showBallDebug) drawBallDebug(ctx.main, ball);
  if (debugOptions.showDribbleSide) players.forEach(p => drawDribbleSide(ctx.main, p));
  if (debugOptions.showPerception && activePlayer) drawPerceptionHighlights(ctx.main, activePlayer);
  if (debugOptions.showPasses) drawPasses(ctx.main, players, ball);
}

export function drawDebugOverlay(ctx, state, width) {
  const { fps, players, ball } = state;
  ctx.fillStyle = 'rgba(0,0,0,0.8)';
  ctx.fillRect(0, 0, width, 32);
  ctx.fillStyle = 'white';
  ctx.font = '14px monospace';
  ctx.fillText(`FPS: ${fps} | Ball Speed: ${ball.vx.toFixed(1)},${ball.vy.toFixed(1)} | Players: ${players.length}`, 10, 20);
}
