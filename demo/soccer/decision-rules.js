// decision-rules.js

export function canPass(player, world) {
    if (!world.ball || !world.ball.isLoose) return false;
    if (player.hasBall || (world.ball.owner && world.ball.owner === player)) {
        // Check if there are open teammates to pass to
        let openTeammates = world.teammates.filter(mate => {
            if (mate === player) return false; // Can't pass to self
            let d = Math.hypot(player.x - mate.x, player.y - mate.y);
            if (d < 35 || d > 320) return false; // Too close or too far
            return true;
        });
        return openTeammates.length > 0;
    }
    return false;
}

export function canShoot(player, world) {
    if (!world.ball || !world.ball.isLoose) return false;
    if (player.hasBall || (world.ball.owner && world.ball.owner === player)) {
        let dx = world.opponentGoal.x - player.x;
        let dy = world.opponentGoal.y - player.y;
        let dist = Math.hypot(dx, dy);
        return dist < 70; // Can shoot if within 70px of goal
    }
    return false;
}





function playerIsClosestToBall(player, world) {
  if (!world.ball || !world.ball.isLoose) return false;
  let d = Math.hypot(player.x - world.ball.x, player.y - world.ball.y);
    let closest = true;
    for (let p of world.players) {
        if (p === player) continue;
        let d2 = Math.hypot(p.x - world.ball.x, p.y - world.ball.y);
        if (d2 < d) {
            closest = false;
            break;
        }
    }
    return closest;
    }
  
  export { playerIsClosestToBall };


// ---- Tactical Zone Definition ----
function getAllowedZone(player, world) {
  let marginX = 20, marginY = 15;
  let width = 160, height = 180;
  switch (player.role) {
    case "TW": width = 80; height = 140; break;
    case "IV": case "LIV": case "RIV": width = 110; height = 190; break;
    case "LV": case "RV": width = 135; height = 220; break;
    case "DM": width = 170; height = 210; break;
    case "ZM": case "OM": width = 270; height = 220; break;
    case "LM": case "RM": width = 250; height = 270; break;
    case "LF": case "RF": width = 320; height = 210; break;
    case "ST": width = 320; height = 230; break;
    default: width = 170; height = 200; break;
  }
  // Widen each role's zone to ensure the team collectively covers its half
  width += 200;
  height += 80;

  // --- Defensive PUSH: If ball is in our half, push formation up ---
  let push = 0;
  if (world && world.ball) {
    const defendingLeft = player.formationX < 525;
    if (["IV", "LIV", "RIV", "LV", "RV"].includes(player.role)) {
      if (defendingLeft && world.ball.x > 350) push = 32;
      if (!defendingLeft && world.ball.x < 700) push = -32;
    }
  }
  let formationX = player.formationX + push;
  const minX = Math.max(marginX, formationX - width / 2);
  const maxX = Math.min(1050 - marginX, formationX + width / 2);
  const minY = Math.max(marginY, player.formationY - height / 2);
  const maxY = Math.min(680 - marginY, player.formationY + height / 2);

  return { minX, maxX, minY, maxY };
}
function clampToZone(x, y, zone) {
  return {
    x: Math.max(zone.minX, Math.min(zone.maxX, x)),
    y: Math.max(zone.minY, Math.min(zone.maxY, y)),
  };
}



export function decidePlayerAction(player, world, gameState) {
  if (gameState !== "Spiel läuft") return;

  // --- 1. Ballbesitz/Offense ---
  if (player.hasBall || (world.ball.owner && world.ball.owner === player)) {
    return decideBallOwnerAction(player, world);
  }

  // --- 0. If ball is loose, nearest player should chase! ---
  if (world.ball.isLoose && !player.hasBall) {
    let minDist = Infinity, closest = null;
    for (let p of world.players) {
      let d = Math.hypot(p.x - world.ball.x, p.y - world.ball.y);
      if (d < minDist) { minDist = d; closest = p; }
    }
    if (closest === player) {
      return boundedIntent(player, "chase", world.ball.x, world.ball.y, world, true);
    }
  }

  // --- 2. Defensive: Press, Tackle, and Swarm the Ball Holder! ---
  if (world.ball.owner && world.opponents.includes(world.ball.owner)) {
    const ballHolder = world.ball.owner;
    const dist = Math.hypot(player.x - ballHolder.x, player.y - ballHolder.y);

    // If defender is "touching distance" (i.e. within 18px): Tackle
    if (dist < 18) {
      return boundedIntent(player, "tackle", ballHolder.x, ballHolder.y, world, true);
    }

    // If within "swarm/press" radius (up to 40px): press (not just closest!)
    if (dist < 40) {
      return boundedIntent(player, "press", ballHolder.x, ballHolder.y, world, true);
    }

    // (Optional) The closest "DM/IV/LV/RV" defender can be even more aggressive:
    const defenders = world.teammates.filter(t => ["IV","LIV","RIV","LV","RV","DM"].includes(t.role));
    let minDist = Infinity, closest = null;
    for (const d of defenders) {
      let dDist = Math.hypot(d.x - ballHolder.x, d.y - ballHolder.y);
      if (dDist < minDist) { minDist = dDist; closest = d; }
    }
    if (closest === player && dist < 70) {
      // Closest central defender: always closes down!
      return boundedIntent(player, "close_down", ballHolder.x, ballHolder.y, world, true);
    }

    // If within "intercept" radius (up to 130px): try to cut off lane to goal
    const goal = world.opponentGoal;
    if (dist < 130) {
      const px = 0.68 * ballHolder.x + 0.32 * goal.x;
      const py = 0.68 * ballHolder.y + 0.32 * goal.y;
      return boundedIntent(player, "press", px, py, world, true);
    }
    // Not in range: cover formation
  }

  // --- 3. Marking: Stay near nearest attacking threat ---
  if (["IV", "LIV", "RIV", "LV", "RV", "DM"].includes(player.role)) {
    const threat = findNearestOpponent(player, world.opponents, ["ST", "LF", "RF", "OM", "ZM"]);
    if (threat && Math.hypot(player.x - threat.x, player.y - threat.y) < 110) {
      return boundedIntent(player, "mark", threat.x, threat.y, world);
    }
  }

  // --- 4. Midfielders & Forwards: Get Open / Offer Pass / Break Lines ---
  if (["ZM", "OM", "LM", "RM"].includes(player.role)) {
    const open = findOpenSpaceNearGoal(player, world);
    return boundedIntent(player, "offer", open.x, open.y, world);
  }
  if (["LF", "RF", "ST"].includes(player.role)) {
    const lastLine = findLastLineSpace(player, world);
    return boundedIntent(player, "break", lastLine.x, lastLine.y, world);
  }

  // --- 5. Default: Hold tactical formation spot ---
  return boundedIntent(player, "hold", player.formationX, player.formationY, world);
}


// ---- Ball Owner Behavior ----
function decideBallOwnerAction(player, world) {
  // 1. If can shoot, sometimes shoot
  if (canShoot(player, world) && Math.random() < 0.5) {
    return boundedIntent(player, "shoot", world.opponentGoal.x, world.opponentGoal.y, world);
  }
  // 2. Pass to open teammate, prefer if pressured
  const mate = findBestPass(player, world.teammates, world);
  if (mate && Math.random() < 0.7) {
    return boundedIntent(player, "pass", mate.x, mate.y, world);
  }
  // 3. Otherwise: Dribble to open space towards goal
  const open = findOpenSpaceNearGoal(player, world);
  return boundedIntent(player, "dribble", open.x, open.y, world);
}

// ---- Intent Resolver (bounds action to zone) ----
function boundedIntent(player, intent, tx, ty, world, allowOutside = false) {
  const zone = getAllowedZone(player, world);
  const target = allowOutside ? { x: tx, y: ty } : clampToZone(tx, ty, zone);
  player.targetX = target.x;
  player.targetY = target.y;
  player.currentAction = intent;
  avoidTeammateClumping(player, world.teammates, 18);
  return { type: intent, targetX: target.x, targetY: target.y };
}

// ---- Smarter Passing: Only to open/less-marked players ----
export function findBestPass(player, teammates, world) {
  let minMark = Infinity, best = null;
  teammates.forEach(mate => {
    if (mate === player) return;
    let d = Math.hypot(player.x - mate.x, player.y - mate.y);
    if (d > 35 && d < 320) {
      // "Mark" = closest opponent to this mate (smaller mark worse)
      let mark = Math.min(...world.opponents.map(opp => Math.hypot(mate.x - opp.x, mate.y - opp.y)));
      let score = mark - Math.abs(mate.y - player.y); // favor wide-open laterals
      if (score > minMark) {
        minMark = score;
        best = mate;
      }
    }
  });
  return best;
}

// ---- Open Space Navigation for Ball Holder & Attackers ----
function findOpenSpaceNearGoal(player, world) {
  const steps = 8;
  const RADIUS = 48;
  let bestScore = -Infinity, best = { x: player.x, y: player.y };
  let dx = world.opponentGoal.x - player.x;
  let dy = world.opponentGoal.y - player.y;
  let baseAngle = Math.atan2(dy, dx);
  for (let i = -2; i <= 2; i++) {
    let angle = baseAngle + (i * Math.PI / steps);
    let tx = player.x + Math.cos(angle) * RADIUS;
    let ty = player.y + Math.sin(angle) * RADIUS;
    let zone = getAllowedZone(player, world);
    const { x: cx, y: cy } = clampToZone(tx, ty, zone);
    let minOpponentDist = Math.min(
      ...world.opponents.map(opp => Math.hypot(cx - opp.x, cy - opp.y))
    );
    let toGoal = 200 - Math.hypot(world.opponentGoal.x - cx, world.opponentGoal.y - cy);
    let score = minOpponentDist + toGoal;
    if (score > bestScore) {
      bestScore = score;
      best = { x: cx, y: cy };
    }
  }
  return best;
}
function findLastLineSpace(player, world) {
  let zone = getAllowedZone(player, world);
  let x = Math.max(zone.minX, Math.min(zone.maxX, world.opponentGoal.x - 35));
  let y = Math.max(zone.minY, Math.min(zone.maxY, player.y));
  return { x, y };
}

// ---- Marking/Support/Helpers ----
function avoidTeammateClumping(player, teammates, minDist = 18) {
  for (const mate of teammates) {
    if (mate === player) continue;
    let d = Math.hypot(player.x - mate.x, player.y - mate.y);
    if (d < minDist) {
      player.targetX += (player.x - mate.x) * 0.35;
      player.targetY += (player.y - mate.y) * 0.35;
    }
  }
}

function findNearestOpponent(player, opponents, roles = []) {
  let filtered = roles.length ? opponents.filter(p => roles.includes(p.role)) : opponents;
  let minDist = Infinity, best = null;
  for (let opp of filtered) {
    let d = Math.hypot(player.x - opp.x, player.y - opp.y);
    if (d < minDist) { minDist = d; best = opp; }
  }
  return best;
}


