import { drawZones, drawIntents } from './render.js';

export class DebugManager {
  constructor(ctx, infoEl) {
    this.ctx = ctx;
    this.infoEl = infoEl;
    this.showZones = true;
    this.showIntents = false;
    this.showInspector = false;
    this.selectedPlayer = null;
    window.addEventListener('keydown', e => this.onKey(e));
  }

  onKey(e) {
    if (e.code === 'KeyZ') this.showZones = !this.showZones;
    else if (e.code === 'KeyI') this.showIntents = !this.showIntents;
    else if (e.code === 'KeyM') this.showInspector = !this.showInspector;
  }

  setSelectedPlayer(p) {
    this.selectedPlayer = p;
    if (!p && this.infoEl) this.infoEl.style.display = 'none';
  }

  draw(world) {
    const ctx = this.ctx;
    if (!ctx) return;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    if (this.showZones) drawZones(ctx, world.players, { ball: world.ball, tactic: world.tactic });
    if (this.showIntents) drawIntents(ctx, world.players);
    if (this.showInspector && this.selectedPlayer) this.drawInspector(this.selectedPlayer);
  }

  drawInspector(player) {
    if (!this.infoEl) return;
    this.infoEl.style.display = 'block';
    this.infoEl.style.left = `${player.x + 15}px`;
    this.infoEl.style.top = `${player.y - 10}px`;
    const speed = Math.hypot(player.vx, player.vy).toFixed(2);
    const energy = Math.round((player.stamina ?? 1) * 100);
    this.infoEl.innerHTML = `<strong>#${player.role}</strong><br>` +
      `intent: ${player.currentAction || 'none'}<br>` +
      `speed: ${speed}<br>` +
      `energy: ${energy}%`;
  }
}
