export function interpolate(a, b, t) {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

export function gaussianFalloff(dist, radius) {
  if (radius <= 0) return 0;
  const norm = dist / radius;
  return Math.exp(-0.5 * norm * norm);
}

export function alphaHex(v) {
  const clamped = Math.max(0, Math.min(1, v));
  return Math.round(clamped * 255).toString(16).padStart(2, '0');
}

const baseRadii = {
  TW: { rx: 70, ry: 60 },
  IV: { rx: 90, ry: 80 },
  LIV: { rx: 90, ry: 80 },
  RIV: { rx: 90, ry: 80 },
  LV: { rx: 100, ry: 90 },
  RV: { rx: 100, ry: 90 },
  DM: { rx: 110, ry: 100 },
  ZM: { rx: 130, ry: 110 },
  OM: { rx: 130, ry: 110 },
  LM: { rx: 140, ry: 120 },
  RM: { rx: 140, ry: 120 },
  LF: { rx: 150, ry: 110 },
  RF: { rx: 150, ry: 110 },
  ST: { rx: 160, ry: 120 }
};

export function computeEllipseRadii(role, pressing = 1, custom = null) {
  let base = baseRadii[role] || { rx: 120, ry: 100 };
  if (custom) {
    base = {
      rx: custom.rx ?? custom.radius ?? base.rx,
      ry: custom.ry ?? custom.radius ?? base.ry,
    };
  }
  const factor = 1 / pressing; // higher pressing => smaller zones
  return { rx: base.rx * factor, ry: base.ry * factor };
}

export function getTargetZoneCenter(player, ball, pressing = 1) {
  const base = { x: player.formationX, y: player.formationY };
  if (!ball) return base;
  // move slightly toward the ball based on pressing
  return interpolate(base, { x: ball.x, y: ball.y }, 0.15 * pressing);
}
