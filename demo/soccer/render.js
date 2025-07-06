// render.js
import { gaussianFalloff, alphaHex } from "./TacticsHelper.js";
import { getDynamicZone } from "./decision-rules.js";
let fieldCache = null;
let fieldCacheWidth = 0;
let fieldCacheHeight = 0;

export function invalidateField() {
  fieldCache = null;
}
function buildFieldCache(width, height) {
  fieldCacheWidth = width;
  fieldCacheHeight = height;
  fieldCache = document.createElement('canvas');
  fieldCache.width = width;
  fieldCache.height = height;
  const c = fieldCache.getContext('2d');
  c.strokeStyle = 'white';
  c.lineWidth = 2;
  const fieldColor = window.renderOptions?.fieldColor || '#065';
  c.fillStyle = fieldColor;
  c.fillRect(0, 0, width, height);
  c.beginPath(); c.moveTo(width/2, 0); c.lineTo(width/2, height); c.stroke();
  c.beginPath(); c.arc(width/2, height/2, 91.5, 0, Math.PI*2); c.stroke();
  c.fillStyle = 'white';
  c.fillRect(0, height/2-50, 10, 100);
  c.fillRect(width-10, height/2-50, 10, 100);
}

export function drawField(ctx, width, height, flashTimer = 0, flashSide = null) {
  if (!fieldCache || fieldCacheWidth !== width || fieldCacheHeight !== height) {
    buildFieldCache(width, height);
  }
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(fieldCache, 0, 0);
  if (flashTimer > 0 && flashSide) {
    ctx.save();
    ctx.fillStyle = `rgba(255,255,0,${flashTimer})`;
    if (flashSide === 'left') {
      ctx.fillRect(0, height/2-60, 15, 120);
    } else if (flashSide === 'right') {
      ctx.fillRect(width-15, height/2-60, 15, 120);
    }
    ctx.restore();
  }
}


export function drawPlayers(ctx, players, { showFOV = false, showRunDir = false, showHeadDir = false, showTargets = false } = {}) {
  players.forEach(p => {
    // Draw body (circle)
    ctx.save();
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, 2 * Math.PI);
    ctx.fillStyle = p.color;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#222";
    ctx.stroke();

    // Draw head (smaller circle in front, based on direction)
    const headDist = p.radius * 0.85;
    const angleRad = p.bodyDirection * Math.PI / 180;
    const headX = p.x + Math.cos(angleRad) * headDist;
    const headY = p.y + Math.sin(angleRad) * headDist;
    ctx.beginPath();
    ctx.arc(headX, headY, p.radius * 0.55, 0, 2 * Math.PI);
    ctx.fillStyle = "#fff";
    ctx.fill();
    ctx.stroke();

    // Draw body orientation arrow/line
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + Math.cos(angleRad) * (p.radius * 1.8), p.y + Math.sin(angleRad) * (p.radius * 1.8));
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "#222";
    ctx.stroke();

    // Optional: show run direction
    if (showRunDir) {
      const dx = p.targetX - p.x;
      const dy = p.targetY - p.y;
      const mag = Math.hypot(dx, dy);
      if (mag > 1) {
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + (dx / mag) * p.radius * 2.2, p.y + (dy / mag) * p.radius * 2.2);
        ctx.strokeStyle = "orange";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    // Optional: show head/blick direction
    if (showHeadDir) {
      const headAngle = p.headDirection * Math.PI / 180;
      ctx.beginPath();
      ctx.moveTo(headX, headY);
      ctx.lineTo(headX + Math.cos(headAngle) * p.radius * 1.4, headY + Math.sin(headAngle) * p.radius * 1.4);
      ctx.strokeStyle = "green";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Draw target indicator
    if (showTargets) {
      ctx.save();
      ctx.strokeStyle = 'red';
      ctx.beginPath();
      ctx.moveTo(p.targetX - 4, p.targetY);
      ctx.lineTo(p.targetX + 4, p.targetY);
      ctx.moveTo(p.targetX, p.targetY - 4);
      ctx.lineTo(p.targetX, p.targetY + 4);
      ctx.stroke();
      ctx.restore();
    }

    // Draw stamina bar
    if (typeof p.stamina === "number") {
      ctx.fillStyle = "#000";
      ctx.fillRect(p.x - p.radius, p.y - p.radius - 6, p.radius * 2, 3);
      ctx.fillStyle = "#0f0";
      ctx.fillRect(p.x - p.radius, p.y - p.radius - 6, p.radius * 2 * p.stamina, 3);
    }

    if (p.highlightTimer > 0) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius + 6, 0, Math.PI * 2);
      ctx.lineWidth = 3;
      ctx.strokeStyle = `rgba(255,0,0,${Math.min(1, p.highlightTimer)})`;
      ctx.stroke();
    }

    if (p.injured) {
      ctx.fillStyle = "#ff0000";
      ctx.font = "bold 14px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("✚", p.x, p.y - p.radius - 12);
    }

    // Optionally: show number or role
    ctx.font = "bold 12px sans-serif";
    ctx.fillStyle = "#000";
    ctx.textAlign = "center";
    ctx.fillText(p.role, p.x, p.y + 4);

    // Optionally: Field of view
    if (showFOV) {
      ctx.globalAlpha = 0.14 * (window.renderOptions?.lineAlpha ?? 1);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.arc(p.x, p.y, p.perceptionRange, (angleRad - (p.fovAngle / 2) * Math.PI / 180), (angleRad + (p.fovAngle / 2) * Math.PI / 180));
      ctx.closePath();
      ctx.fillStyle = p.color;
      ctx.fill();
      ctx.globalAlpha = 1.0;
    }
    ctx.restore();
  });
}

export function drawActivePlayer(ctx, player) {
  if (!player) return;
  ctx.save();
  ctx.strokeStyle = 'yellow';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.radius + 6, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

export function drawPasses(ctx, allPlayers, ball) {
  // Optionally: draw only if ball is loose and moving
  if (ball.isLoose && (Math.abs(ball.vx) > 0.5 || Math.abs(ball.vy) > 0.5)) {
    ctx.save();
    ctx.strokeStyle = "#00bfff";
    ctx.setLineDash([5, 5]);
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.7 * (window.renderOptions?.lineAlpha ?? 1);
    // Draw pass vector from where pass was started to where it's going
    ctx.beginPath();
    ctx.moveTo(ball.x - ball.vx * 8, ball.y - ball.vy * 8); // previous location (approx)
    ctx.lineTo(ball.x + ball.vx * 12, ball.y + ball.vy * 12); // direction
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }
}

export function drawBall(ctx, ball) {
    // draw subtle shadow for depth perception
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(ball.x, ball.y + ball.radius * 0.6, ball.radius * 0.9, ball.radius * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    if (ball.isLoose) {
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius + 5, 0, Math.PI * 2);
        ctx.strokeStyle = 'orange';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI*2);
    ctx.fillStyle = 'white';
    ctx.fill();
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 1.5;
    ctx.stroke();
}
export function drawOverlay(ctx, text, width) {
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, width, 40);
    ctx.fillStyle = '#fff';
    ctx.font = '20px Arial';
    ctx.fillText(text, 20, 28);
}

export function drawZones(ctx, players, world, offsets = { home: {x:0,y:0}, away: {x:0,y:0} }) {
  ctx.save();
  players.forEach(p => {
    const zone = getDynamicZone(p, world);
    const off = (p.color === '#0000ff') ? offsets.home : offsets.away;
    zone.x += off.x; zone.y += off.y;
    ctx.globalAlpha = 0.15 * (window.renderOptions?.lineAlpha ?? 1);
    ctx.strokeStyle = p.color;
    ctx.fillStyle = p.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.rect(zone.x, zone.y, zone.width, zone.height);
    ctx.stroke();
    ctx.globalAlpha = 0.08 * (window.renderOptions?.lineAlpha ?? 1);
    ctx.fill();
    ctx.globalAlpha = 1.0;
  });
  ctx.restore();
}

export function drawIntents(ctx, players) {
  if (!players) return;
  ctx.save();
  ctx.strokeStyle = 'yellow';
  ctx.fillStyle = 'yellow';
  ctx.lineWidth = 1;
  ctx.font = '11px Arial';
  players.forEach(p => {
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.targetX, p.targetY);
    ctx.stroke();
    if (p.currentAction) {
      ctx.fillText(p.currentAction, p.x + 6, p.y - 6);
    }
  });
  ctx.restore();
}

export function drawSoftZones(ctx, players, ball, coach, options = {}) {
  const { heatmap = false } = options;
  ctx.save();
  players.forEach(p => {
    const zone = p.constructor.getDynamicTargetZone ?
      p.constructor.getDynamicTargetZone(p, ball, coach) : null;
    if (!zone) return;
    ctx.translate(zone.x, zone.y);
    ctx.scale(zone.rx, zone.ry);
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    if (heatmap) {
      const mid = alphaHex(gaussianFalloff(0.6, 1));
      grad.addColorStop(0, `${p.color}aa`);
      grad.addColorStop(0.6, `${p.color}${mid}`);
      grad.addColorStop(1, `${p.color}00`);
    } else {
      grad.addColorStop(0, `${p.color}66`);
      grad.addColorStop(1, `${p.color}00`);
    }
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  });
  ctx.restore();
}

export function drawPerceptionHighlights(ctx, player) {
  if (!player) return;
  ctx.save();
  ctx.lineWidth = 2;
  // highlight selected player
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.radius + 4, 0, Math.PI * 2);
  ctx.strokeStyle = "yellow";
  ctx.stroke();

  for (const label in player.perceived) {
    const obj = player.perceived[label];
    let color = "yellow";
    if (label === "ball") color = "orange";
    else if (label.toLowerCase().includes("goal") || label.toLowerCase().includes("far")) color = "purple";

    ctx.beginPath();
    ctx.arc(obj.x, obj.y, (obj.radius || 10) + 4, 0, Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.stroke();
  }
  ctx.restore();
}

export function drawPassIndicator(ctx, indicator) {
  if (!indicator) return;
  ctx.save();
  ctx.strokeStyle = 'yellow';
  ctx.setLineDash([4, 4]);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(indicator.from.x, indicator.from.y);
  ctx.lineTo(indicator.to.x, indicator.to.y);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(indicator.to.x, indicator.to.y, 12, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

export function drawRadar(ctx, players, ball, width, height) {
  ctx.clearRect(0, 0, width, height);
  const fieldColor = window.renderOptions?.fieldColor || '#065';
  ctx.fillStyle = fieldColor;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1;
  ctx.strokeRect(0, 0, width, height);
  ctx.beginPath();
  ctx.moveTo(width / 2, 0);
  ctx.lineTo(width / 2, height);
  ctx.stroke();
  const scaleX = width / 1050;
  const scaleY = height / 680;
  players.forEach(p => {
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x * scaleX, p.y * scaleY, 3, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.arc(ball.x * scaleX, ball.y * scaleY, 2, 0, Math.PI * 2);
  ctx.fill();
}

export function drawGoalHighlight(ctx, text, timer, width, height) {
  if (timer <= 0) return;
  ctx.save();
  ctx.globalAlpha = Math.min(1, timer / 2) * (window.renderOptions?.lineAlpha ?? 1);
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.fillRect(0, height / 2 - 60, width, 120);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 48px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(text, width / 2, height / 2 + 16);
  ctx.restore();
}


export function drawBallDebug(ctx, ball) {
  if (!ball) return;
  ctx.save();
  ctx.strokeStyle = 'blue';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(ball.x, ball.y);
  ctx.lineTo(ball.x + ball.vx * 8, ball.y + ball.vy * 8);
  ctx.stroke();
  if (Math.abs(ball.angularVelocity) > 0.001) {
    ctx.strokeStyle = 'red';
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius + 4, 0, Math.sign(ball.angularVelocity) * Math.min(2*Math.PI, Math.abs(ball.angularVelocity) * 20));
    ctx.stroke();
  }
  ctx.restore();
}

export function drawFormationDebug(ctx, players) {
  if (!players) return;
  ctx.save();
  ctx.strokeStyle = 'cyan';
  ctx.fillStyle = 'cyan';
  ctx.font = '11px Arial';
  players.forEach(p => {
    const fx = p.formationX;
    const fy = p.formationY;
    ctx.beginPath();
    ctx.moveTo(fx - 4, fy);
    ctx.lineTo(fx + 4, fy);
    ctx.moveTo(fx, fy - 4);
    ctx.lineTo(fx, fy + 4);
    ctx.stroke();
    const dist = Math.hypot(p.x - fx, p.y - fy);
    if (dist > 2) {
      const txt = `${dist.toFixed(0)} | ${p.currentAction || 'none'}`;
      ctx.fillText(txt, p.x + 8, p.y - 8);
    }
  });
  ctx.restore();
}

export function drawDribbleSide(ctx, player) {
  if (!player.hasBall) return;
  const offset = 10;
  const angleRad = player.bodyDirection * Math.PI / 180;
  const sign = player.dribbleSide === "left" ? -1 : 1;

  const sideX = player.x + Math.cos(angleRad + sign * Math.PI / 2) * offset;
  const sideY = player.y + Math.sin(angleRad + sign * Math.PI / 2) * offset;

  ctx.beginPath();
  ctx.arc(sideX, sideY, 4, 0, Math.PI * 2);
  ctx.fillStyle = "orange";
  ctx.fill();
}